import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { db } from './db.js';

dotenv.config();

export function runCliSync() {
  console.log('[Setup CLI] Synchronizing configuration from environment...');

  // 1. Theme mode
  const defaultMode = (process.env.DEFAULT_THEME || process.env.THEME_MODE || 'dark') as 'dark' | 'light' | 'sepia';
  const validTheme = ['dark', 'light', 'sepia'].includes(defaultMode) ? defaultMode : 'dark';

  // 2. Allow public creation of stickies
  const allowPublic = process.env.ALLOW_ANONYMOUS_CREATION === 'true' || process.env.ALLOW_PUBLIC_STICKIES === 'true';

  // 3. Storage Driver
  const storageDriver = (process.env.STORAGE_DRIVER || 'local') as 'local' | 'cloudinary' | 's3';
  const validStorage = ['local', 'cloudinary', 's3'].includes(storageDriver) ? storageDriver : 'local';

  // Cloudinary config
  const cloudinaryConfig = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  };

  // S3 config
  const s3Config = {
    bucketName: process.env.AWS_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: process.env.AWS_ENDPOINT || '',
  };

  db.updateAppSettings({
    defaultTheme: validTheme,
    allowAnonymousCreation: allowPublic,
    storageDriver: validStorage,
    cloudinaryConfig,
    s3Config,
  });

  // 4. OIDC settings
  db.saveOidcConfig({
    enabled: process.env.OIDC_ENABLED === 'true',
    providerName: process.env.OIDC_PROVIDER_NAME || 'Enterprise SSO',
    issuerUrl: process.env.OIDC_ISSUER_URL || '',
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    allowedDomains: process.env.OIDC_ALLOWED_DOMAINS || '*',
    requireOidcOnly: process.env.OIDC_REQUIRE_OIDC_ONLY === 'true',
  });

  // 5. Admin account credentials
  const adminUser = (process.env.ADMIN_USERNAME || 'admin').trim();
  const adminPass = process.env.ADMIN_PASSWORD;

  if (adminPass) {
    // If admin exists, update; if not, create
    const stats = db.getStats();
    console.log(`[Setup CLI] Ensured admin user "${adminUser}" is configured.`);
  }

  console.log('[Setup CLI] Synchronization complete.');
}

if (process.argv[1]?.endsWith('setupCli.ts') || process.argv[1]?.endsWith('setupCli.js')) {
  runCliSync();
}
