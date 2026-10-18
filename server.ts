import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import dotenv from 'dotenv';
import { db, UserRecord, FileTypeCategories } from './server/db.js';
import { getStorageDriver } from './server/storage/storageDriver.js';

dotenv.config();

// ---------------------------------------------------------------------------
// Input Sanitization â€” Defense-in-depth for all form fields
// (This app uses a JSON file store, not SQL, so traditional SQL injection
//  is not possible. These helpers are added as a best-practice layer to
//  neutralize any injection-style payloads in user-submitted text.)
// ---------------------------------------------------------------------------

/**
 * Strips control characters and null bytes from a string.
 * Prevents injection-style payloads in form fields.
 */
function sanitizeInput(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String.prototype.toString.call(value);
  return value
    .replaceAll(String.raw`\0`, '')                      // remove null bytes
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '');   // remove control characters
}

/**
 * Sanitizes a username: alphanumeric, hyphens, underscores only, 3â€“32 chars.
 */
function sanitizeUsername(value: unknown): string {
  const s = sanitizeInput(value);
  return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

/**
 * Sanitizes a paste slug: alphanumeric, hyphens, underscores only, 3â€“64 chars.
 */
function sanitizeSlug(value: unknown): string {
  const s = sanitizeInput(value);
  return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;
const storageDriver = getStorageDriver();

// Increase JSON payload limit for large code snippets
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Maximum file size per attachment (configurable via .env, default 15MB)
const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_SIZE || '15728640', 10);

// Executable file extensions to block
const EXECUTABLE_EXTENSIONS = new Set([
  '.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1', '.psm1', '.psd1',
  '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.hta', '.cpl', '.jar',
  '.app', '.deb', '.rpm', '.dmg', '.pkg', '.run', '.bin', '.sh', '.cgi',
  '.fcgi', '.is', '.msu', '.gadget', '.inf', '.reg', '.scf', '.lnk',
]);

// Executable MIME types to block
const EXECUTABLE_MIME_TYPES = new Set([
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-executable',
  'application/x-sh',
  'application/x-shellscript',
  'text/x-sh',
  'application/x-java',
  'application/java-archive',
  'application/vnd.microsoft.portable-executable',
  'application/octet-stream',
]);

function isExecutable(filename: string, mimetype: string): boolean {
  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx >= 0 ? filename.toLowerCase().substring(dotIdx) : '';
  if (ext && EXECUTABLE_EXTENSIONS.has(ext)) {
    return true;
  }
  if (EXECUTABLE_MIME_TYPES.has(mimetype)) {
    return true;
  }
  return false;
}

// Configure multer in memory so driver can handle destination (unlimited files per paste)
// File type and max size validation is done dynamically in the create-paste route using DB settings
// Max file size is capped at 10MB as a hard upper bound for upload buffer safety
const MAX_UPLOAD_BUFFER = 10 * 1024 * 1024; // 10MB hard cap for multer buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BUFFER,
  },
});

// File type category extensions for admin-configurable filtering
const FILE_TYPE_EXTENSIONS: Record<string, string[]> = {
  documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.pages'],
  code: ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
    '.cs', '.go', '.rb', '.php', '.rs', '.swift', '.kt', '.scala', '.r', '.m', '.mm', '.sh', '.bat', '.ps1',
    '.sql', '.html', '.css', '.xml', '.json', '.yaml', '.yml', '.toml', '.md', '.rst'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif', '.heic'],
  video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v', '.3gp', '.ogv'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.aiff'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.cab', '.iso'],
};

function getAllowedExtensions(categories: FileTypeCategories): Set<string> {
  const allowed = new Set<string>();
  if (categories.documents) FILE_TYPE_EXTENSIONS.documents.forEach(ext => allowed.add(ext));
  if (categories.code) FILE_TYPE_EXTENSIONS.code.forEach(ext => allowed.add(ext));
  if (categories.images) FILE_TYPE_EXTENSIONS.images.forEach(ext => allowed.add(ext));
  if (categories.video) FILE_TYPE_EXTENSIONS.video.forEach(ext => allowed.add(ext));
  if (categories.audio) FILE_TYPE_EXTENSIONS.audio.forEach(ext => allowed.add(ext));
  if (categories.archives) FILE_TYPE_EXTENSIONS.archives.forEach(ext => allowed.add(ext));
  if (categories.other) {
    // 'other' means allow anything not in another category or executable
  }
  return allowed;
}

function isFileTypeAllowed(filename: string, categories: FileTypeCategories): boolean {
  // Executables are always blocked regardless of category
  if (isExecutable(filename, '')) return false;

  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx >= 0 ? filename.toLowerCase().substring(dotIdx) : '';

  if (!ext) return categories.other; // no extension = other category

  const allowed = getAllowedExtensions(categories);

  if (allowed.size === 0) return false; // no categories enabled = nothing allowed

  if (categories.other) return true; // 'other' category allows everything non-executable

  return allowed.has(ext);
}

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user?: UserRecord | null;
}

// Auth Middleware
function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const sessionHeader = req.headers['x-session-token'] as string;
  let token = '';

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (sessionHeader) {
    token = sessionHeader;
  }

  if (token) {
    req.user = db.getUserByToken(token);
  } else {
    req.user = null;
  }
  next();
}

app.use(authMiddleware);

// --- Static Uploads Endpoint ---
app.get('/api/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = storageDriver.getAttachmentPath(filename);
  if (!filePath) {
    return res.status(404).json({ error: 'Attachment file not found' });
  }
  res.sendFile(filePath);
});

// --- Auth Endpoints ---
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const safeUsername = sanitizeUsername(username);
    if (!safeUsername || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const { user, token } = db.authenticate(safeUsername, password);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body;
    const safeUsername = sanitizeUsername(username);
    if (!safeUsername || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = db.createUser(safeUsername, password);
    const { token } = db.authenticate(username, password);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization;
  const sessionHeader = req.headers['x-session-token'] as string;
  const token = authHeader?.replace('Bearer ', '') || sessionHeader;
  if (token) {
    db.revokeSession(token);
  }
  res.json({ ok: true });
});

app.post('/api/auth/change-password', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required' });
  }
  try {
    db.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to change password' });
  }
});

// --- Custom Slug Validation Preflight ---
app.get('/api/validate-slug/:slug', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  const excludePasteId = (req.query.excludePasteId as string) || undefined;
  const validation = db.validateSlug(slug);
  if (!validation.valid) {
    return res.json({ valid: false, message: validation.error });
  }
  const available = db.isSlugAvailable(slug, excludePasteId);
  if (!available) {
    return res.json({ valid: false, message: 'Slug is already taken' });
  }
  res.json({ valid: true, message: 'Slug is available' });
});

// --- Create Paste Endpoint ---
app.post('/api/pastes', upload.array('attachments'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.getAppSettings();
    if (!settings.allowAnonymousCreation && !req.user) {
      return res.status(401).json({
        error: 'Creating stickies without signing in is disabled on this server. Please sign in or register to create stickies.',
        requiresAuth: true,
      });
    }

    const {
      title,
      content,
      syntax,
      customSlug,
      expiration,
      password,
      clientEncrypted,
      visibility,
      burnAfterReading,
    } = req.body;

    const safeCustomSlug = customSlug ? sanitizeSlug(customSlug) : undefined;
    const safeSyntax = sanitizeInput(syntax || 'plaintext') as 'plaintext' | 'markdown' | 'javascript' | 'typescript' | 'python' | 'rust' | 'go' | 'java' | 'c' | 'cpp' | 'csharp' | 'php' | 'ruby' | 'bash' | 'powershell' | 'sql' | 'yaml' | 'json' | 'html' | 'csv' | 'diff';
    const safeExpiration = sanitizeInput(expiration || 'never');
    const safeVisibility = sanitizeInput(visibility || 'public') as 'public' | 'unlisted' | 'private';

    if (!content && content !== '') {
      return res.status(400).json({ error: 'Paste content cannot be empty' });
    }

    // Process uploaded attachments with dynamic file type validation
    const categories = settings.fileTypeCategories || {
      documents: true, code: true, images: true, video: true,
      audio: true, archives: true, other: true,
    };
    const maxFileSize = settings.maxFileSize || MAX_FILE_SIZE;

    const files = (req.files as Express.Multer.File[]) || [];
    const savedAttachments = await Promise.all(files.map(async (file) => {
      if (file.size > maxFileSize) {
        throw new Error(`File "${file.originalname}" exceeds maximum size of ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      }
      if (!isFileTypeAllowed(file.originalname, categories)) {
        throw new Error(`File type not allowed: "${file.originalname}". Contact administrator to enable this file type.`);
      }
      return storageDriver.saveAttachment(file);
    }));

    const result = db.createPaste({
      title,
      content,
      syntax: safeSyntax,
      customSlug: safeCustomSlug,
      expiration: safeExpiration,
      password,
      clientEncrypted: clientEncrypted === 'true' || clientEncrypted === true,
      visibility: safeVisibility,
      burnAfterReading: burnAfterReading === 'true' || burnAfterReading === true,
      userId: req.user?.id || null,
      authorUsername: req.user?.username || null,
      attachments: savedAttachments,
    });

    res.status(201).json({
      success: true,
      paste: {
        id: result.paste.id,
        slug: result.paste.slug,
        title: result.paste.title,
        syntax: result.paste.syntax,
        visibility: result.paste.visibility,
        expiresAt: result.paste.expiresAt,
        burnAfterReading: result.paste.burnAfterReading,
        shareUrl: result.shareUrl,
        attachments: result.paste.attachments,
        createdAt: result.paste.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[API] Create paste error:', err);
    res.status(400).json({ error: err.message || 'Failed to create paste' });
  }
});

// --- Get Paste Endpoint ---
app.get('/api/pastes/:slug', (req: AuthenticatedRequest, res: Response) => {
  try {
    const slug = req.params.slug;
    const password = (req.query.password as string) || '';
    const incrementView = req.query.incrementView !== 'false';

    const result = db.getPasteBySlug(slug, {
      password,
      incrementView,
      user: req.user,
    });

    if (result.requiresPassword) {
      return res.status(403).json({
        requiresPassword: true,
        paste: result.paste,
      });
    }

    res.json({
      success: true,
      paste: result.paste,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Paste not found' });
  }
});

// --- Record Copy Count ---
app.post('/api/pastes/:slug/copy', (req, res) => {
  db.recordCopy(req.params.slug);
  res.json({ ok: true });
});

// --- Raw Plaintext Endpoint ---
app.get('/raw/:slug', (req: AuthenticatedRequest, res: Response) => {
  try {
    const slug = req.params.slug;
    const password = (req.query.password as string) || '';
    const result = db.getPasteBySlug(slug, { password, incrementView: true, user: req.user });

    if (result.requiresPassword) {
      return res.status(403).send('Error: This paste is password-protected. Provide ?password= in URL.');
    }

    if (!result.paste.content) {
      return res.status(404).send('Paste content unavailable.');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(result.paste.content);
  } catch (err: any) {
    res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8').send(err.message || 'Paste not found');
  }
});

// --- User Pastes Dashboard List ---
app.get('/api/user/pastes', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const pastes = db.listUserPastes(req.user.id);
  res.json({ pastes });
});

// --- Public Stickies by Username ---
app.get('/api/public-stickies/:username', (req, res) => {
  try {
    const { username } = req.params;
    const safeUsername = sanitizeUsername(username);
    const result = db.listPublicStickiesByUsername(safeUsername);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Public stickies not found' });
  }
});

// --- Toggle Pin ---
app.post('/api/pastes/:id/pin', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const pinned = db.togglePin(req.params.id, req.user.id);
  res.json({ pinned });
});

// --- Delete Paste ---
app.delete('/api/pastes/:id', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  db.deletePaste(req.params.id);
  res.json({ ok: true });
});

// --- Update Paste (Author or Admin) ---
app.put('/api/pastes/:id', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const { title, content, syntax, visibility, customSlug } = req.body;
    const safeTitle = sanitizeInput(title || '');
    const safeSyntax = sanitizeInput(syntax || 'plaintext') as 'plaintext' | 'markdown' | 'javascript' | 'typescript' | 'python' | 'rust' | 'go' | 'java' | 'c' | 'cpp' | 'csharp' | 'php' | 'ruby' | 'bash' | 'powershell' | 'sql' | 'yaml' | 'json' | 'html' | 'csv' | 'diff';
    const safeVisibility = sanitizeInput(visibility || 'public') as 'public' | 'unlisted' | 'private';
    const safeCustomSlug = customSlug ? sanitizeSlug(customSlug) : undefined;
    const updated = db.updatePaste(req.params.id, { title: safeTitle, content, syntax: safeSyntax, visibility: safeVisibility, customSlug: safeCustomSlug }, req.user);
    res.json({
      success: true,
      paste: {
        id: updated.id,
        slug: updated.slug,
        title: updated.title,
        syntax: updated.syntax,
        visibility: updated.visibility,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update paste' });
  }
});

// --- Admin Controls ---
app.get('/api/admin/stats', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json(db.getStats());
});

app.post('/api/admin/toggle-demo', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { enable } = req.body;
  const isEnabled = db.toggleDemoUser(!!enable);
  res.json({ success: true, demoEnabled: isEnabled });
});

app.get('/api/admin/oidc', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json(db.getOidcConfig());
});

app.post('/api/admin/oidc', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const updated = db.saveOidcConfig(req.body);
  res.json({ success: true, oidc: updated });
});

// --- OIDC Client Login Endpoint ---
app.post('/api/auth/oidc/login', (req, res) => {
  const oidc = db.getOidcConfig();
  if (!oidc.enabled) {
    return res.status(400).json({ error: 'OIDC Single Sign-On is not currently enabled by the administrator' });
  }
  const email = (req.body.email || 'user@domain.com').trim().toLowerCase();
  
  // Validate allowed domains
  if (oidc.allowedDomains && oidc.allowedDomains.trim() !== '*') {
    const allowed = oidc.allowedDomains.split(',').map((d: string) => d.trim().toLowerCase());
    const domain = email.split('@')[1];
    if (!domain || !allowed.includes(domain)) {
      return res.status(403).json({ error: `Email domain is not permitted by OIDC policy. Allowed: ${oidc.allowedDomains}` });
    }
  }

  // Provision or retrieve user
  const username = email.split('@')[0] || 'oidc_user';
  const user = db.getOrCreateOidcUser(username);
  const token = db.createSession(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

app.get('/api/admin/settings', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const settings = db.getAppSettings();
  const oidc = db.getOidcConfig();

  res.json({
    defaultTheme: settings.defaultTheme || 'dark',
    allowAnonymousCreation: !!settings.allowAnonymousCreation,
    storageDriver: settings.storageDriver || 'local',
    cloudinaryConfig: {
      cloudName: settings.cloudinaryConfig?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: settings.cloudinaryConfig?.apiKey || process.env.CLOUDINARY_API_KEY || '',
      apiSecret: settings.cloudinaryConfig?.apiSecret ? 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' : '',
    },
    s3Config: {
      bucketName: settings.s3Config?.bucketName || process.env.AWS_BUCKET_NAME || '',
      region: settings.s3Config?.region || process.env.AWS_REGION || 'us-east-1',
      accessKeyId: settings.s3Config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: settings.s3Config?.secretAccessKey ? 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' : '',
      endpoint: settings.s3Config?.endpoint || process.env.AWS_ENDPOINT || '',
    },
    oidcConfig: oidc,
    fileTypeCategories: settings.fileTypeCategories || {
      documents: true,
      code: true,
      images: true,
      video: true,
      audio: true,
      archives: true,
      other: true,
    },
    maxFileSize: settings.maxFileSize || Number.parseInt(process.env.MAX_FILE_SIZE || '15728640', 10),
    adminUser: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

app.post('/api/admin/settings', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const {
      defaultTheme,
      allowAnonymousCreation,
      storageDriver,
      cloudinaryConfig,
      s3Config,
      oidcConfig,
      fileTypeCategories,
      maxFileSize,
    } = req.body;

    const updatedSettings = db.updateAppSettings({
      ...(defaultTheme ? { defaultTheme } : {}),
      ...(allowAnonymousCreation !== undefined ? { allowAnonymousCreation: Boolean(allowAnonymousCreation) } : {}),
      ...(storageDriver ? { storageDriver } : {}),
      ...(cloudinaryConfig ? { cloudinaryConfig } : {}),
      ...(s3Config ? { s3Config } : {}),
      ...(fileTypeCategories ? { fileTypeCategories } : {}),
      ...(maxFileSize !== undefined ? { maxFileSize: Number(maxFileSize) } : {}),
    });

    if (oidcConfig) {
      db.saveOidcConfig(oidcConfig);
    }

    res.json({ success: true, settings: updatedSettings });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update settings' });
  }
});

// Admin change username and password
app.post('/api/admin/change-admin-credentials', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { currentPassword, newUsername, newPassword } = req.body;
    const result = db.updateAdminCredentials(req.user.id, {
      currentPassword,
      newUsername,
      newPassword,
    });

    res.json({
      success: true,
      message: 'Admin credentials updated successfully',
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
      },
      token: result.token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update admin credentials' });
  }
});

// Admin test storage connection
app.post('/api/admin/test-storage', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { driver, cloudinaryConfig, s3Config } = req.body;
  try {
    if (driver === 'cloudinary') {
      const { CloudinaryStorageDriver } = await import('./server/storage/storageDriver.js');
      const testDriver = new CloudinaryStorageDriver(cloudinaryConfig);
      const test = await testDriver.testConnection();
      return res.json(test);
    } else if (driver === 's3') {
      const { S3StorageDriver } = await import('./server/storage/storageDriver.js');
      const testDriver = new S3StorageDriver(s3Config);
      const test = await testDriver.testConnection();
      return res.json(test);
    } else {
      const { LocalStorageDriver } = await import('./server/storage/storageDriver.js');
      const testDriver = new LocalStorageDriver();
      const test = await testDriver.testConnection();
      return res.json(test);
    }
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to test storage' });
  }
});

// --- System Configuration Info ---
app.get('/api/config', (_req, res) => {
  const oidc = db.getOidcConfig();
  const settings = db.getAppSettings();
  res.json({
    defaultTheme: settings.defaultTheme || 'dark',
    allowPublicPastes: process.env.ALLOW_PUBLIC_PASTES !== 'false',
    storageDriver: settings.storageDriver || 'local',
    allowAnonymousCreation: !!settings.allowAnonymousCreation,
    oidcEnabled: !!oidc.enabled,
    oidcProviderName: oidc.providerName || 'Single Sign-On',
    requireOidcOnly: !!oidc.requireOidcOnly,
    allowedDomains: oidc.allowedDomains || '*',
    fileTypeCategories: settings.fileTypeCategories || {
      documents: true, code: true, images: true, video: true,
      audio: true, archives: true, other: true,
    },
    maxFileSize: settings.maxFileSize || MAX_FILE_SIZE,
  });
});

// --- Vite / Static Integration ---
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // In dev mode, mount Vite middleware with HMR disabled
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Serve transformed index.html for SPA routes (e.g., /, /p/:slug, /dashboard)
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/raw')) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // In prod mode, serve static dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await new Promise<void>((resolve) => {
    app.listen(PORT, () => {
      console.log(`[Shareable Stickies] Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
      resolve();
    });
  });
}

await startServer();
