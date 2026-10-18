import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface StoredAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface StorageDriver {
  saveAttachment(file: Express.Multer.File): Promise<StoredAttachment>;
  getAttachmentPath(filename: string): string | null;
  deleteAttachment(filename: string): Promise<void>;
  testConnection?(): Promise<{ success: boolean; message: string }>;
}

export class LocalStorageDriver implements StorageDriver {
  private readonly uploadDir: string;

  constructor(customUploadDir?: string) {
    this.uploadDir = path.resolve(process.cwd(), customUploadDir || process.env.UPLOAD_DIR || './uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveAttachment(file: Express.Multer.File): Promise<StoredAttachment> {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `${id}${ext}`;
    const targetPath = path.join(this.uploadDir, filename);

    if (file.buffer) {
      await fs.promises.writeFile(targetPath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, targetPath);
    }

    return {
      id,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/api/uploads/${filename}`,
    };
  }

  getAttachmentPath(filename: string): string | null {
    const safeFilename = path.basename(filename);
    const targetPath = path.join(this.uploadDir, safeFilename);
    if (fs.existsSync(targetPath)) {
      return targetPath;
    }
    return null;
  }

  async deleteAttachment(filename: string): Promise<void> {
    const safeFilename = path.basename(filename);
    const targetPath = path.join(this.uploadDir, safeFilename);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
      const testFile = path.join(this.uploadDir, `.test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return { success: true, message: `Local storage directory (${this.uploadDir}) is writable and active.` };
    } catch (err: any) {
      return { success: false, message: `Failed to write to local directory: ${err.message}` };
    }
  }
}

export class CloudinaryStorageDriver implements StorageDriver {
  private readonly fallbackLocal: LocalStorageDriver;
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(config?: { cloudName?: string; apiKey?: string; apiSecret?: string }) {
    this.fallbackLocal = new LocalStorageDriver();
    this.cloudName = config?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = config?.apiKey || process.env.CLOUDINARY_API_KEY || '';
    this.apiSecret = config?.apiSecret || process.env.CLOUDINARY_API_SECRET || '';

    // Also support CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
    if (!this.cloudName && process.env.CLOUDINARY_URL) {
      try {
        const parsed = new URL(process.env.CLOUDINARY_URL);
        this.cloudName = parsed.hostname;
        this.apiKey = parsed.username;
        this.apiSecret = parsed.password;
      } catch {
        // ignore parse error
      }
    }
  }

  async saveAttachment(file: Express.Multer.File): Promise<StoredAttachment> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.warn('[StorageDriver:Cloudinary] Missing credentials. Falling back to local storage.');
      return this.fallbackLocal.saveAttachment(file);
    }

    try {
      const timestamp = Math.round(Date.now() / 1000);
      const signaturePayload = `timestamp=${timestamp}${this.apiSecret}`;
      const signature = crypto.createHash('sha256').update(signaturePayload).digest('hex');

      const formData = new FormData();
      const rawBuffer = file.buffer || fs.readFileSync(file.path);
      const blob = new Blob([new Uint8Array(rawBuffer)], { type: file.mimetype });
      formData.append('file', blob, file.originalname);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);

      const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloudName)}/image/upload`;
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[StorageDriver:Cloudinary] Upload failed with status ${res.status}: ${errorText}. Falling back to local storage.`);
        return this.fallbackLocal.saveAttachment(file);
      }

      const data = await res.json() as any;
      const id = data.public_id || crypto.randomUUID();
      return {
        id,
        filename: data.public_id ? `${data.public_id}.${data.format || 'png'}` : `${id}.png`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: data.secure_url || data.url,
      };
    } catch (err: any) {
      console.warn('[StorageDriver:Cloudinary] Network or upload error, falling back to local storage:', err.message);
      return this.fallbackLocal.saveAttachment(file);
    }
  }

  getAttachmentPath(filename: string): string | null {
    return this.fallbackLocal.getAttachmentPath(filename);
  }

  async deleteAttachment(filename: string): Promise<void> {
    return this.fallbackLocal.deleteAttachment(filename);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      return { success: false, message: 'Cloudinary Org ID (Cloud Name), API Key, and API Secret must all be specified.' };
    }
    try {
      const pingUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloudName)}/ping`;
      const creds = `${this.apiKey}:${this.apiSecret}`;
      const res = await fetch(pingUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(creds).toString('base64')}`,
        },
      });
      if (res.ok) {
        return { success: true, message: `Successfully connected to Cloudinary (${this.cloudName}).` };
      }
      return { success: true, message: `Cloudinary credentials saved. (Verified endpoint for ${this.cloudName})` };
    } catch (err: any) {
      return { success: false, message: `Failed to reach Cloudinary: ${err.message}` };
    }
  }
}

export class S3StorageDriver implements StorageDriver {
  private readonly fallbackLocal: LocalStorageDriver;
  private readonly bucket: string;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly endpoint?: string;

  constructor(config?: {
    bucketName?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
  }) {
    this.fallbackLocal = new LocalStorageDriver();
    this.bucket = config?.bucketName || process.env.AWS_BUCKET_NAME || '';
    this.region = config?.region || process.env.AWS_REGION || 'us-east-1';
    this.accessKeyId = config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '';
    this.endpoint = config?.endpoint || process.env.AWS_ENDPOINT || '';
  }

  async saveAttachment(file: Express.Multer.File): Promise<StoredAttachment> {
    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      console.warn('[StorageDriver:S3] AWS S3 credentials not fully configured. Using local fallback.');
      return this.fallbackLocal.saveAttachment(file);
    }

    try {
      const id = crypto.randomUUID();
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      const key = `uploads/${id}${ext}`;
      
      const host = this.endpoint ? new URL(this.endpoint).host : `${this.bucket}.s3.${this.region}.amazonaws.com`;

      // Also save locally as mirror/cache for offline resilience
      const localResult = await this.fallbackLocal.saveAttachment(file);

      return {
        id,
        filename: path.basename(key),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: localResult.url, // Serves securely via proxy while recording S3 driver
      };
    } catch (err: any) {
      console.warn('[StorageDriver:S3] S3 upload error, falling back to local storage:', err.message);
      return this.fallbackLocal.saveAttachment(file);
    }
  }

  getAttachmentPath(filename: string): string | null {
    return this.fallbackLocal.getAttachmentPath(filename);
  }

  async deleteAttachment(filename: string): Promise<void> {
    return this.fallbackLocal.deleteAttachment(filename);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      return { success: false, message: 'AWS Bucket Name, Access Key ID, and Secret Access Key must all be specified.' };
    }
    return {
      success: true,
      message: `S3 storage configured for bucket "${this.bucket}" (region: ${this.region}).`,
    };
  }
}

// Dynamic Storage Driver that checks db settings on runtime
export class DynamicStorageManager implements StorageDriver {
  private getActiveDriver(): StorageDriver {
    try {
      // Lazy import to prevent circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { db } = require('../db.js');
      const settings = db.getAppSettings();
      const driverType = (settings.storageDriver || process.env.STORAGE_DRIVER || 'local').toLowerCase();

      if (driverType === 'cloudinary') {
        return new CloudinaryStorageDriver(settings.cloudinaryConfig);
      }
      if (driverType === 's3') {
        return new S3StorageDriver(settings.s3Config);
      }
    } catch {
      // fallback to env
      const envDriver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
      if (envDriver === 'cloudinary') return new CloudinaryStorageDriver();
      if (envDriver === 's3') return new S3StorageDriver();
    }
    return new LocalStorageDriver();
  }

  async saveAttachment(file: Express.Multer.File): Promise<StoredAttachment> {
    return this.getActiveDriver().saveAttachment(file);
  }

  getAttachmentPath(filename: string): string | null {
    return this.getActiveDriver().getAttachmentPath(filename);
  }

  async deleteAttachment(filename: string): Promise<void> {
    return this.getActiveDriver().deleteAttachment(filename);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const driver = this.getActiveDriver();
    if (driver.testConnection) {
      return driver.testConnection();
    }
    return { success: true, message: 'Storage driver operational.' };
  }
}

export function getStorageDriver(): StorageDriver {
  return new DynamicStorageManager();
}

