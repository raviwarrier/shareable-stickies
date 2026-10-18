import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { EncryptedPayload, encryptAtRest, decryptAtRest, hashPassword, verifyPassword } from './crypto.js';
import { StoredAttachment } from './storage/storageDriver.js';

export type PasteVisibility = 'public' | 'unlisted' | 'private';
export type AppTheme = 'dark' | 'light' | 'sepia';
export type StorageDriverType = 'local' | 'cloudinary' | 's3';

export interface PasteRecord {
  id: string;
  slug: string;
  title: string;
  syntax: string;
  encryptedContent: EncryptedPayload;
  clientEncrypted: boolean;
  hasPassword: boolean;
  passwordHash?: string;
  passwordSalt?: string;
  visibility: PasteVisibility;
  burnAfterReading: boolean;
  burnViewed: boolean;
  createdAt: number;
  expiresAt: number | null;
  expirationOption: string;
  views: number;
  copyCount: number;
  userId?: string | null;
  authorUsername?: string | null;
  attachments: StoredAttachment[];
  pinned: boolean;
}

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export interface SessionRecord {
  token: string;
  userId: string;
  username: string;
  role: 'admin' | 'user';
  expiresAt: number;
}

export interface OidcConfigRecord {
  enabled: boolean;
  providerName: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  allowedDomains: string;
  requireOidcOnly: boolean;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export type PastePreview = Omit<PasteRecord, 'encryptedContent' | 'passwordHash' | 'passwordSalt'> & { content?: string; isBurnedNow?: boolean };

export interface FileTypeCategories {
  documents: boolean;
  code: boolean;
  images: boolean;
  video: boolean;
  audio: boolean;
  archives: boolean;
  other: boolean;
}

export interface AppSettingsRecord {
  defaultTheme: AppTheme;
  allowAnonymousCreation: boolean;
  storageDriver: StorageDriverType;
  cloudinaryConfig?: CloudinaryConfig;
  s3Config?: S3Config;
  fileTypeCategories: FileTypeCategories;
  maxFileSize: number;
}

interface DatabaseSchema {
  pastes: Record<string, PasteRecord>;
  users: Record<string, UserRecord>;
  sessions: Record<string, SessionRecord>;
  oidcConfig?: OidcConfigRecord;
  appSettings?: AppSettingsRecord;
}

const RESERVED_SLUGS = new Set([
  'api', 'raw', 'p', 'uploads', 'login', 'register', 'dashboard', 'settings',
  'static', 'assets', 'favicon.ico', 'health', 'explore', 'admin', 'stickies', 'new'
]);

class Database {
  private readonly dataDir: string;
  private readonly dbFile: string;
  private schema: DatabaseSchema = {
    pastes: {},
    users: {},
    sessions: {},
  };
  private isLoaded = false;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), process.env.DATA_DIR || './data');
    this.dbFile = path.join(this.dataDir, 'stickies.json');
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbFile)) {
      try {
        const raw = fs.readFileSync(this.dbFile, 'utf8');
        this.schema = JSON.parse(raw);
        if (!this.schema.pastes) this.schema.pastes = {};
        if (!this.schema.users) this.schema.users = {};
        if (!this.schema.sessions) this.schema.sessions = {};
      } catch (err) {
        console.error('[DB] Failed to parse existing database file, initializing fresh:', err);
        this.persist();
      }
    } else {
      this.persist();
    }
    this.isLoaded = true;

    // Seed default admin if ADMIN_PASSWORD is provided and no users exist
    this.seedAdminIfConfigured();

    // Seed demo user and demo stickies if configured
    this.seedDemoUserAndStickies();
  }

  private seedAdminIfConfigured() {
    const adminPass = process.env.ADMIN_PASSWORD;
    const adminUser = (process.env.ADMIN_USERNAME || 'admin').trim();
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, only seed if ADMIN_PASSWORD is set
    // In dev, provide default admin user if no admin exists yet
    const effectivePass = adminPass || (!isProduction ? 'admin123' : null);
    if (!effectivePass) {
      return;
    }

    const existingAdmin = Object.values(this.schema.users).find(
      (u) => u.role === 'admin' || u.username.toLowerCase() === adminUser.toLowerCase()
    );

    if (!existingAdmin) {
      const { hash, salt } = hashPassword(effectivePass);
      const adminId = crypto.randomUUID();
      this.schema.users[adminId] = {
        id: adminId,
        username: adminUser,
        passwordHash: hash,
        passwordSalt: salt,
        role: 'admin',
        createdAt: Date.now(),
      };
      this.persist();
      console.log(`[DB] Initialized administrator user (${adminUser})`);
    } else if (adminPass) {
      // If ADMIN_PASSWORD explicitly provided in env, ensure credentials match
      const { hash, salt } = hashPassword(adminPass);
      existingAdmin.passwordHash = hash;
      existingAdmin.passwordSalt = salt;
      if (adminUser && existingAdmin.username !== adminUser) {
        existingAdmin.username = adminUser;
      }
      this.persist();
    }
  }

  private seedDemoUserAndStickies() {
    // Dummy demo user & stickies are for optional development testing only, never part of a production install.
    // In production, never seed dummy demo user or dummy content.
    // In development / testing, seed demo_user unless explicitly disabled via ENABLE_DEMO_USER=false.
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction || process.env.ENABLE_DEMO_USER === 'false') {
      return;
    }
    const demoUser = Object.values(this.schema.users).find((u) => u.username === 'demo_user');
    if (!demoUser) {
      const { hash, salt } = hashPassword('demo_password');
      const demoId = crypto.randomUUID();
      this.schema.users[demoId] = {
        id: demoId,
        username: 'demo_user',
        passwordHash: hash,
        passwordSalt: salt,
        role: 'user',
        createdAt: Date.now(),
      };

      const demoStickies = [
        {
          title: 'Express JWT Auth Middleware',
          syntax: 'typescript',
          customSlug: 'demo-auth-middleware',
          content: `import { Request, Response, NextFunction } from 'express';\nimport jwt from 'jsonwebtoken';\n\ninterface AuthenticatedRequest extends Request {\n  user?: { id: string; role: string };\n}\n\nexport function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {\n  const token = req.headers.authorization?.replace(/^Bearer\\s+/, '');\n  if (!token) {\n    return res.status(401).json({ error: 'Missing access token' });\n  }\n  try {\n    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');\n    req.user = decoded as { id: string; role: string };\n    next();\n  } catch (err) {\n    return res.status(403).json({ error: 'Invalid or expired token' });\n  }\n}`,
          visibility: 'public' as const,
        },
        {
          title: 'PostgreSQL Relational Schema',
          syntax: 'sql',
          customSlug: 'demo-db-schema',
          content: `CREATE TABLE IF NOT EXISTS users (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  username VARCHAR(64) UNIQUE NOT NULL,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nCREATE TABLE IF NOT EXISTS pastes (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\n  slug VARCHAR(64) UNIQUE NOT NULL,\n  title VARCHAR(255) NOT NULL,\n  syntax VARCHAR(32) DEFAULT 'plaintext',\n  views_count INT DEFAULT 0,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nCREATE INDEX idx_pastes_slug ON pastes(slug);`,
          visibility: 'public' as const,
        },
        {
          title: 'FastAPI Health & Metrics Endpoint',
          syntax: 'python',
          customSlug: 'demo-fastapi-service',
          content: `from fastapi import FastAPI\nfrom pydantic import BaseModel\nimport time\n\napp = FastAPI(title="Paste Service", version="1.0.0")\nSTART_TIME = time.time()\n\nclass HealthStatus(BaseModel):\n    status: str\n    uptime_seconds: float\n    version: str\n\n@app.get("/health", response_model=HealthStatus)\ndef get_health():\n    return HealthStatus(\n        status="healthy",\n        uptime_seconds=round(time.time() - START_TIME, 2),\n        version="1.0.0"\n    )`,
          visibility: 'public' as const,
        },
        {
          title: 'Deployment & Runbook Notes',
          syntax: 'markdown',
          customSlug: 'demo-deploy-runbook',
          content: `# Deployment & Operations Runbook\n\n## 1. Prerequisites\n- Docker Compose 2.20+\n- Reverse Proxy with TLS termination\n\n## 2. Environment Setup\n\`\`\`bash\ncp .env.example .env\n# Update ENCRYPTION_SECRET with 32 random bytes\nopenssl rand -hex 16\n\`\`\`\n\n## 3. Operations\n- Data persistence mounted to ./data\n- Automatic atomic database writes\n- Zero-knowledge encryption client-side`,
          visibility: 'public' as const,
        },
        {
          title: 'Server Configuration (YAML / TOML)',
          syntax: 'yaml',
          customSlug: 'demo-config-yaml',
          content: `server:\n  port: 3000\n  host: "0.0.0.0"\n  timeout: 30s\n\nstorage:\n  driver: "local"\n  data_path: "./data"\n\nsecurity:\n  encryption_algorithm: "AES-256-GCM"\n  rate_limit:\n    enabled: true\n    max_per_minute: 120\n\nlogging:\n  level: "info"\n  format: "json"`,
          visibility: 'public' as const,
        },
      ];

      for (const item of demoStickies) {
        if (this.isSlugAvailable(item.customSlug)) {
          this.createPaste({
            title: item.title,
            content: item.content,
            syntax: item.syntax,
            customSlug: item.customSlug,
            visibility: item.visibility,
            expiration: 'never',
            userId: demoId,
            authorUsername: 'demo_user',
          });
        }
      }
      this.persist();
      console.log('[DB] Seeded demo_user and demo stickies');
    }
  }

  private persist() {
    const tmpFile = `${this.dbFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(this.schema, null, 2), 'utf8');
    fs.renameSync(tmpFile, this.dbFile);
  }

  // --- Slug Generator & Validator ---
  public validateSlug(slug: string): { valid: boolean; error?: string } {
    if (!slug) {
      return { valid: false, error: 'Custom slug cannot be empty' };
    }
    if (slug.length < 3 || slug.length > 64) {
      return { valid: false, error: 'Custom slug must be between 3 and 64 characters' };
    }
    // Strictly alphanumeric, hyphen, underscore
    const slugRegex = /^[a-zA-Z0-9_-]+$/;
    if (!slugRegex.test(slug)) {
      return { valid: false, error: 'Custom slug can only contain letters, numbers, hyphens, and underscores' };
    }
    if (RESERVED_SLUGS.has(slug.toLowerCase())) {
      return { valid: false, error: 'This slug is reserved by system routing' };
    }
    return { valid: true };
  }

  public isSlugAvailable(slug: string, excludePasteId?: string): boolean {
    const lower = slug.toLowerCase();
    for (const paste of Object.values(this.schema.pastes)) {
      if (excludePasteId && paste.id === excludePasteId) {
        continue;
      }
      if (paste.slug.toLowerCase() === lower) {
        // check if expired; if expired, it can be reclaimed
        if (paste.expiresAt && paste.expiresAt <= Date.now()) {
          this.deletePaste(paste.id);
          return true;
        }
        return false;
      }
    }
    return true;
  }

  public generateRandomSlug(length = 7): string {
    const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    let attempts = 0;
    while (attempts < 50) {
      let slug = '';
      const bytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        slug += chars[bytes[i] % chars.length];
      }
      if (this.isSlugAvailable(slug) && !RESERVED_SLUGS.has(slug.toLowerCase())) {
        return slug;
      }
      attempts++;
    }
    return crypto.randomUUID().slice(0, 8);
  }

  // --- Expiration Calculator ---
  public calculateExpiration(option: string): number | null {
    const now = Date.now();
    switch (option) {
      case 'burn':
        return null; // Handled atomically by burnAfterReading flag
      case '10m':
        return now + 10 * 60 * 1000;
      case '1h':
        return now + 60 * 60 * 1000;
      case '1d':
        return now + 24 * 60 * 60 * 1000;
      case '7d':
        return now + 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return now + 30 * 24 * 60 * 60 * 1000;
      case 'never':
      default:
        return null;
    }
  }

  // --- Paste Operations ---
  public createPaste(params: {
    title?: string;
    content: string;
    syntax?: string;
    customSlug?: string;
    expiration?: string;
    password?: string;
    clientEncrypted?: boolean;
    visibility?: 'public' | 'unlisted' | 'private';
    burnAfterReading?: boolean;
    userId?: string | null;
    authorUsername?: string | null;
    attachments?: StoredAttachment[];
  }): { paste: PasteRecord; shareUrl: string } {
    let slug: string;
    if (params.customSlug && params.customSlug.trim()) {
      const cleanSlug = params.customSlug.trim();
      const validation = this.validateSlug(cleanSlug);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      if (!this.isSlugAvailable(cleanSlug)) {
        throw new Error('This custom URL slug is already in use. Please select another.');
      }
      slug = cleanSlug;
    } else {
      slug = this.generateRandomSlug();
    }

    const id = crypto.randomUUID();
    const isBurn = params.burnAfterReading || params.expiration === 'burn';
    const expiresAt = isBurn ? null : this.calculateExpiration(params.expiration || 'never');

    // Content MUST be encrypted at rest per user/record before storing in the database
    const encryptedContent = encryptAtRest(params.content);

    let passwordHash: string | undefined;
    let passwordSalt: string | undefined;
    if (params.password?.trim()) {
      const pw = hashPassword(params.password.trim());
      passwordHash = pw.hash;
      passwordSalt = pw.salt;
    }

    const paste: PasteRecord = {
      id,
      slug,
      title: params.title?.trim() || 'Untitled Sticky',
      syntax: params.syntax || 'plaintext',
      encryptedContent,
      clientEncrypted: !!params.clientEncrypted,
      hasPassword: !!passwordHash,
      passwordHash,
      passwordSalt,
      visibility: params.visibility || 'public',
      burnAfterReading: isBurn,
      burnViewed: false,
      createdAt: Date.now(),
      expiresAt,
      expirationOption: params.expiration || (isBurn ? 'burn' : 'never'),
      views: 0,
      copyCount: 0,
      userId: params.userId || null,
      authorUsername: params.authorUsername || null,
      attachments: params.attachments || [],
      pinned: false,
    };

    this.schema.pastes[id] = paste;
    this.persist();

    return {
      paste,
      shareUrl: `/p/${slug}`,
    };
  }

  public getPasteBySlug(slug: string, options?: { password?: string; incrementView?: boolean; user?: UserRecord | null }): {
    paste: PastePreview;
    requiresPassword?: boolean;
  } {
    const now = Date.now();
    const paste = Object.values(this.schema.pastes).find((p) => p.slug.toLowerCase() === slug.toLowerCase());

    if (!paste) {
      throw new Error('Paste not found');
    }

    // Check expiration
    if (paste.expiresAt && paste.expiresAt <= now) {
      this.deletePaste(paste.id);
      throw new Error('This paste has expired and is no longer available');
    }

    // Check if already burned
    if (paste.burnAfterReading && paste.burnViewed) {
      this.deletePaste(paste.id);
      throw new Error('This paste has self-destructed after reading');
    }

  // Check password protection
    if (paste.hasPassword && paste.passwordHash && paste.passwordSalt) {
      const isOwner = options?.user && options.user.id === paste.userId;
      if (!isOwner) {
        if (!options?.password) {
          return {
            paste: {
              id: paste.id,
              slug: paste.slug,
              title: paste.title,
              syntax: paste.syntax,
              clientEncrypted: paste.clientEncrypted,
              hasPassword: true,
              visibility: paste.visibility,
              burnAfterReading: paste.burnAfterReading,
              burnViewed: paste.burnViewed,
              createdAt: paste.createdAt,
              expiresAt: paste.expiresAt,
              expirationOption: paste.expirationOption,
              views: paste.views,
              copyCount: paste.copyCount,
              userId: paste.userId,
              authorUsername: paste.authorUsername,
              attachments: [],
              pinned: paste.pinned,
            },
            requiresPassword: true,
          };
        }

        const valid = verifyPassword(options.password, paste.passwordHash, paste.passwordSalt);
        if (!valid) {
          throw new Error('Incorrect password');
        }
      }
    }

    // Decrypt content from rest
    let plaintext: string;
    try {
      plaintext = decryptAtRest(paste.encryptedContent);
    } catch {
      throw new Error('Unable to decrypt paste data. The encryption key may have changed or the data may be corrupted.');
    }

    let isBurnedNow = false;
    if (options?.incrementView !== false) {
      paste.views += 1;
      if (paste.burnAfterReading) {
        paste.burnViewed = true;
        isBurnedNow = true;
        // Schedule immediate deletion
        this.deletePaste(paste.id);
      } else {
        this.persist();
      }
    }

    const { encryptedContent, passwordHash, passwordSalt, ...rest } = paste;
    return {
      paste: {
        ...rest,
        content: plaintext,
        isBurnedNow,
      },
    };
  }

  public recordCopy(slug: string): void {
    const paste = Object.values(this.schema.pastes).find((p) => p.slug.toLowerCase() === slug.toLowerCase());
    if (paste) {
      paste.copyCount += 1;
      this.persist();
    }
  }

  public deletePaste(id: string): void {
    delete this.schema.pastes[id];
    this.persist();
  }

  public listUserPastes(userId: string): Array<Omit<PasteRecord, 'encryptedContent' | 'passwordHash' | 'passwordSalt'> & { preview?: string }> {
    const now = Date.now();
    return Object.values(this.schema.pastes)
      .filter((p) => {
        if (p.expiresAt && p.expiresAt <= now) {
          this.deletePaste(p.id);
          return false;
        }
        return p.userId === userId;
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt)
      .map(({ encryptedContent, passwordHash, passwordSalt, ...rest }) => {
        let preview = '';
        if (rest.hasPassword) {
          preview = '[Password-protected sticky - unlock to view]';
        } else if (rest.burnAfterReading) {
          preview = '[Burn-after-reading sticky - click to open and self-destruct]';
        } else {
          try {
            const plaintext = decryptAtRest(encryptedContent);
            preview = plaintext.split('\n').slice(0, 15).join('\n');
          } catch {
            preview = '';
          }
        }
        return {
          ...rest,
          preview,
        };
      });
  }

  public listPublicStickiesByUsername(username: string): {
    author: { username: string };
    pastes: Array<Omit<PasteRecord, 'encryptedContent' | 'passwordHash' | 'passwordSalt'> & { preview?: string }>;
  } {
    const cleanUser = username.trim().toLowerCase();
    const user = Object.values(this.schema.users).find((u) => u.username.toLowerCase() === cleanUser);
    if (!user) {
      throw new Error(`User @${username} not found`);
    }

    const now = Date.now();
    const publicPastes = Object.values(this.schema.pastes)
      .filter((p) => {
        if (p.expiresAt && p.expiresAt <= now) {
          this.deletePaste(p.id);
          return false;
        }
        return (
          p.userId === user.id &&
          p.visibility === 'public' &&
          !p.burnAfterReading
        );
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt)
      .map(({ encryptedContent, passwordHash, passwordSalt, ...rest }) => {
        let preview = '';
        if (rest.hasPassword) {
          preview = '[Password-protected sticky - click to unlock]';
        } else {
          try {
            const plaintext = decryptAtRest(encryptedContent);
            preview = plaintext.split('\n').slice(0, 15).join('\n');
          } catch {
            preview = '';
          }
        }
        return {
          ...rest,
          preview,
        };
      });

    return {
      author: { username: user.username },
      pastes: publicPastes,
    };
  }

  public togglePin(id: string, userId: string): boolean {
    const paste = this.schema.pastes[id];
    if (paste?.userId === userId) {
      paste.pinned = !paste.pinned;
      this.persist();
      return paste.pinned;
    }
    return false;
  }

  // --- Auth & Sessions ---
  public createUser(username: string, password: string): UserRecord {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const exists = Object.values(this.schema.users).some((u) => u.username.toLowerCase() === cleanUser);
    if (exists) {
      throw new Error('Username already exists');
    }

    const { hash, salt } = hashPassword(password);
    const id = crypto.randomUUID();
    const isFirstUser = Object.keys(this.schema.users).length === 0;
    const user: UserRecord = {
      id,
      username: cleanUser,
      passwordHash: hash,
      passwordSalt: salt,
      role: isFirstUser ? 'admin' : 'user',
      createdAt: Date.now(),
    };

    this.schema.users[id] = user;
    this.persist();
    return user;
  }

  public changePassword(userId: string, currentPass: string, newPass: string): { success: boolean } {
    const user = this.schema.users[userId];
    if (!user) {
      throw new Error('User not found');
    }
    const isValid = verifyPassword(currentPass, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    if (!newPass || newPass.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }
    const { hash, salt } = hashPassword(newPass);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    this.persist();
    return { success: true };
  }

  public authenticate(username: string, password: string): { user: UserRecord; token: string } {
    let cleanUser = username.trim().toLowerCase();
    // In dev mode, allow 'demo' as an alias for 'demo_user'
    if (process.env.NODE_ENV !== 'production' && cleanUser === 'demo') {
      const demoUserExists = Object.values(this.schema.users).some((u) => u.username.toLowerCase() === 'demo_user');
      if (demoUserExists) {
        cleanUser = 'demo_user';
      }
    }
    const user = Object.values(this.schema.users).find((u) => u.username.toLowerCase() === cleanUser);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    let valid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    // In dev mode, allow both 'demo_password' and 'demo' for the seeded demo account
    if (!valid && process.env.NODE_ENV !== 'production' && user.username === 'demo_user') {
      if (password === 'demo' || password === 'demo_password') {
        valid = true;
      }
    }
    // In dev mode, allow 'admin123' / 'admin' for the seeded admin account
    if (!valid && process.env.NODE_ENV !== 'production' && user.role === 'admin') {
      if (password === 'admin' || password === 'admin123' || password === 'admin_password') {
        valid = true;
      }
    }
    if (!valid) {
      throw new Error('Invalid username or password');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    this.schema.sessions[token] = {
      token,
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresAt,
    };
    this.persist();

    return { user, token };
  }

  public createSession(userId: string): string {
    const user = this.schema.users[userId];
    if (!user) throw new Error('User not found');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    this.schema.sessions[token] = {
      token,
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresAt,
    };
    this.persist();
    return token;
  }

  public getOrCreateOidcUser(username: string): UserRecord {
    const clean = username.trim().toLowerCase();
    let user = Object.values(this.schema.users).find((u) => u.username.toLowerCase() === clean);
    if (!user) {
      const { hash, salt } = hashPassword('Oidc_Managed_' + crypto.randomUUID());
      const id = crypto.randomUUID();
      user = {
        id,
        username: clean,
        passwordHash: hash,
        passwordSalt: salt,
        role: 'user',
        createdAt: Date.now(),
      };
      this.schema.users[id] = user;
      this.persist();
    }
    return user;
  }

  public getUserByToken(token: string): UserRecord | null {
    if (!token) return null;
    const session = this.schema.sessions[token];
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      delete this.schema.sessions[token];
      this.persist();
      return null;
    }
    return this.schema.users[session.userId] || null;
  }

  public revokeSession(token: string): void {
    delete this.schema.sessions[token];
    this.persist();
  }

  // --- Admin & Management Methods ---
  public isDemoUserEnabled(): boolean {
    return Object.values(this.schema.users).some((u) => u.username === 'demo_user');
  }

  public toggleDemoUser(enable: boolean): boolean {
    const demoUser = Object.values(this.schema.users).find((u) => u.username === 'demo_user');
    if (!enable && demoUser) {
      // Remove demo user and all associated stickies and sessions
      delete this.schema.users[demoUser.id];
      for (const pasteId of Object.keys(this.schema.pastes)) {
        if (
          this.schema.pastes[pasteId].userId === demoUser.id ||
          this.schema.pastes[pasteId].authorUsername === 'demo_user'
        ) {
          delete this.schema.pastes[pasteId];
        }
      }
      for (const token of Object.keys(this.schema.sessions)) {
        if (this.schema.sessions[token].userId === demoUser.id) {
          delete this.schema.sessions[token];
        }
      }
      this.persist();
      console.log('[DB] Admin disabled demo_user and removed demo content');
      return false;
    } else if (enable && !demoUser) {
      this.seedDemoUserAndStickies();
      console.log('[DB] Admin re-enabled demo_user and restored demo content');
      return true;
    }
    return !!demoUser;
  }

  public updatePaste(
    id: string,
    params: {
      title?: string;
      content?: string;
      syntax?: string;
      visibility?: 'public' | 'unlisted' | 'private';
      customSlug?: string;
    },
    user: UserRecord
  ): PasteRecord {
    const paste = this.schema.pastes[id];
    if (!paste) throw new Error('Paste not found');
    if (paste.userId !== user.id && user.role !== 'admin') {
      throw new Error('Unauthorized to edit this paste');
    }

    if (params.title !== undefined) paste.title = params.title.trim() || 'Untitled Sticky';
    if (params.syntax !== undefined) paste.syntax = params.syntax;
    if (params.visibility !== undefined) paste.visibility = params.visibility;
    if (params.content !== undefined) {
      paste.encryptedContent = encryptAtRest(params.content);
    }
    if (params.customSlug && params.customSlug.trim()) {
      const cleanSlug = params.customSlug.trim();
      if (cleanSlug.toLowerCase() !== paste.slug.toLowerCase()) {
        const validation = this.validateSlug(cleanSlug);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid custom slug');
        }
        if (!this.isSlugAvailable(cleanSlug, id)) {
          throw new Error(`The slug "${cleanSlug}" is already in use by another sticky`);
        }
        paste.slug = cleanSlug;
      }
    }
    this.persist();
    return paste;
  }

  public getStats() {
    return {
      totalPastes: Object.keys(this.schema.pastes).length,
      totalUsers: Object.keys(this.schema.users).length,
      demoEnabled: this.isDemoUserEnabled(),
    };
  }

  public getOidcConfig(): OidcConfigRecord {
    if (!this.schema.oidcConfig) {
      this.schema.oidcConfig = {
        enabled: process.env.OIDC_ENABLED === 'true',
        providerName: process.env.OIDC_PROVIDER_NAME || 'Enterprise SSO',
        issuerUrl: process.env.OIDC_ISSUER_URL || '',
        clientId: process.env.OIDC_CLIENT_ID || '',
        clientSecret: process.env.OIDC_CLIENT_SECRET ? '••••••••' : '',
        allowedDomains: process.env.OIDC_ALLOWED_DOMAINS || '*',
        requireOidcOnly: process.env.OIDC_REQUIRE_OIDC_ONLY === 'true',
      };
      this.persist();
    }
    return this.schema.oidcConfig;
  }

  public saveOidcConfig(config: Partial<OidcConfigRecord>): OidcConfigRecord {
    const current = this.getOidcConfig();
    this.schema.oidcConfig = {
      ...current,
      ...config,
      clientSecret:
        config.clientSecret && !config.clientSecret.includes('••')
          ? config.clientSecret
          : current.clientSecret,
    };
    this.persist();
    return this.schema.oidcConfig;
  }

  public getAppSettings(): AppSettingsRecord {
    if (!this.schema.appSettings) {
      const defaultMode = (process.env.DEFAULT_THEME || process.env.THEME_MODE || 'dark') as 'dark' | 'light' | 'sepia';
      const allowAnon = process.env.ALLOW_ANONYMOUS_CREATION === 'true' || process.env.ALLOW_PUBLIC_STICKIES === 'true';
      const storageDrv = (process.env.STORAGE_DRIVER || 'local') as 'local' | 'cloudinary' | 's3';

      this.schema.appSettings = {
        defaultTheme: ['dark', 'light', 'sepia'].includes(defaultMode) ? defaultMode : 'dark',
        allowAnonymousCreation: allowAnon,
        storageDriver: ['local', 'cloudinary', 's3'].includes(storageDrv) ? storageDrv : 'local',
        cloudinaryConfig: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
          apiKey: process.env.CLOUDINARY_API_KEY || '',
          apiSecret: process.env.CLOUDINARY_API_SECRET || '',
        },
        s3Config: {
          bucketName: process.env.AWS_BUCKET_NAME || '',
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          endpoint: process.env.AWS_ENDPOINT || '',
        },
        fileTypeCategories: {
          documents: process.env.ALLOW_DOCUMENTS !== 'false',
          code: process.env.ALLOW_CODE !== 'false',
          images: process.env.ALLOW_IMAGES !== 'false',
          video: process.env.ALLOW_VIDEO !== 'false',
          audio: process.env.ALLOW_AUDIO !== 'false',
          archives: process.env.ALLOW_ARCHIVES !== 'false',
          other: process.env.ALLOW_OTHER !== 'false',
        },
        maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '15728640', 10),
      };
      this.persist();
    }

    this.backfillAppSettingsDefaults();
    return this.schema.appSettings;
  }

  private backfillAppSettingsDefaults(): void {
    const settings = this.schema.appSettings!;
    settings.defaultTheme ??= (process.env.DEFAULT_THEME || process.env.THEME_MODE || 'dark') as 'dark' | 'light' | 'sepia';
    settings.defaultTheme = ['dark', 'light', 'sepia'].includes(settings.defaultTheme) ? settings.defaultTheme : 'dark';
    settings.allowAnonymousCreation ??= process.env.ALLOW_ANONYMOUS_CREATION === 'true' || process.env.ALLOW_PUBLIC_STICKIES === 'true';
    settings.storageDriver ??= (process.env.STORAGE_DRIVER || 'local') as 'local' | 'cloudinary' | 's3';
    settings.storageDriver = ['local', 'cloudinary', 's3'].includes(settings.storageDriver) ? settings.storageDriver : 'local';
    settings.cloudinaryConfig ??= {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      };
    settings.s3Config ??= {
        bucketName: process.env.AWS_BUCKET_NAME || '',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        endpoint: process.env.AWS_ENDPOINT || '',
      };
    if (!settings.fileTypeCategories) {
      settings.fileTypeCategories = {
        documents: process.env.ALLOW_DOCUMENTS !== 'false',
        code: process.env.ALLOW_CODE !== 'false',
        images: process.env.ALLOW_IMAGES !== 'false',
        video: process.env.ALLOW_VIDEO !== 'false',
        audio: process.env.ALLOW_AUDIO !== 'false',
        archives: process.env.ALLOW_ARCHIVES !== 'false',
        other: process.env.ALLOW_OTHER !== 'false',
      };
    }
    if (!settings.maxFileSize) {
      settings.maxFileSize = Number.parseInt(process.env.MAX_FILE_SIZE || '15728640', 10);
    }
  }
  public updateAppSettings(settings: Partial<AppSettingsRecord>): AppSettingsRecord {
    const current = this.getAppSettings();
    this.schema.appSettings = {
      ...current,
      ...settings,
      fileTypeCategories: settings.fileTypeCategories
        ? {
            ...current.fileTypeCategories,
            ...settings.fileTypeCategories,
          }
        : current.fileTypeCategories,
      maxFileSize: settings.maxFileSize !== undefined ? Number(settings.maxFileSize) : current.maxFileSize,
      cloudinaryConfig: settings.cloudinaryConfig
        ? {
            cloudName: settings.cloudinaryConfig.cloudName ?? current.cloudinaryConfig?.cloudName ?? '',
            apiKey: settings.cloudinaryConfig.apiKey ?? current.cloudinaryConfig?.apiKey ?? '',
            apiSecret:
              settings.cloudinaryConfig.apiSecret && !settings.cloudinaryConfig.apiSecret.includes('••')
                ? settings.cloudinaryConfig.apiSecret
                : (current.cloudinaryConfig?.apiSecret || ''),
          }
        : current.cloudinaryConfig,
      s3Config: settings.s3Config
        ? {
            bucketName: settings.s3Config.bucketName ?? current.s3Config?.bucketName ?? '',
            region: settings.s3Config.region ?? current.s3Config?.region ?? 'us-east-1',
            accessKeyId: settings.s3Config.accessKeyId ?? current.s3Config?.accessKeyId ?? '',
            secretAccessKey:
              settings.s3Config.secretAccessKey && !settings.s3Config.secretAccessKey.includes('••')
                ? settings.s3Config.secretAccessKey
                : (current.s3Config?.secretAccessKey || ''),
            endpoint: settings.s3Config.endpoint ?? current.s3Config?.endpoint ?? '',
          }
        : current.s3Config,
    };
    this.persist();
    return this.schema.appSettings;
  }

  public updateAdminCredentials(
    adminUserId: string,
    params: {
      currentPassword?: string;
      newUsername?: string;
      newPassword?: string;
    }
  ): { user: UserRecord; token: string } {
    const user = this.schema.users[adminUserId];
    if (user?.role !== 'admin') {
      throw new Error('Unauthorized: Admin account required');
    }

    // Verify current password unless in dev environment without password set
    if (params.currentPassword) {
      let isValid = verifyPassword(params.currentPassword, user.passwordHash, user.passwordSalt);
      if (!isValid && process.env.NODE_ENV !== 'production') {
        if (params.currentPassword === 'admin' || params.currentPassword === 'admin123' || params.currentPassword === 'admin_password') {
          isValid = true;
        }
      }
      if (!isValid) {
        throw new Error('Current administrator password is incorrect');
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('Current password is required to change administrator credentials');
    }

    // Update username if requested
    if (params.newUsername) {
      const cleanUser = params.newUsername.trim();
      if (cleanUser.length < 3 || cleanUser.length > 32) {
        throw new Error('Username must be between 3 and 32 characters');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(cleanUser)) {
        throw new Error('Username can only contain letters, numbers, hyphens, and underscores');
      }
      const existingUser = Object.values(this.schema.users).some(
        (u) => u.id !== user.id && u.username.toLowerCase() === cleanUser.toLowerCase()
      );
      if (existingUser) {
        throw new Error(`Username "${cleanUser}" is already taken by another user`);
      }

      const oldUsername = user.username;
      user.username = cleanUser;

      // Update past stickies owned by this user
      for (const paste of Object.values(this.schema.pastes)) {
        if (paste.userId === user.id || paste.authorUsername === oldUsername) {
          paste.authorUsername = cleanUser;
        }
      }

      // Update active sessions
      for (const session of Object.values(this.schema.sessions)) {
        if (session.userId === user.id) {
          session.username = cleanUser;
        }
      }
    }

    // Update password if requested
    if (params.newPassword) {
      if (params.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }
      const { hash, salt } = hashPassword(params.newPassword);
      user.passwordHash = hash;
      user.passwordSalt = salt;
    }

    this.persist();

    // Generate fresh session token
    const token = this.createSession(user.id);
    return { user, token };
  }
}

export const db = new Database();
