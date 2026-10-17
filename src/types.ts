export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface Paste {
  id: string;
  slug: string;
  title: string;
  syntax: string;
  content?: string;
  preview?: string;
  clientEncrypted: boolean;
  hasPassword: boolean;
  visibility: 'public' | 'unlisted' | 'private';
  burnAfterReading: boolean;
  burnViewed: boolean;
  isBurnedNow?: boolean;
  createdAt: number;
  expiresAt: number | null;
  expirationOption: string;
  views: number;
  copyCount: number;
  userId?: string | null;
  authorUsername?: string | null;
  attachments: Attachment[];
  pinned: boolean;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface CreatePastePayload {
  title?: string;
  content: string;
  syntax?: string;
  customSlug?: string;
  expiration?: string;
  password?: string;
  clientEncrypted?: boolean;
  visibility?: 'public' | 'unlisted' | 'private';
  burnAfterReading?: boolean;
  attachments?: File[];
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

export interface OidcConfig {
  enabled: boolean;
  providerName: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  allowedDomains: string;
  requireOidcOnly: boolean;
}

export interface FileTypeCategories {
  documents: boolean;
  code: boolean;
  images: boolean;
  video: boolean;
  audio: boolean;
  archives: boolean;
  other: boolean;
}

export interface AdminSystemSettings {
  defaultTheme: 'dark' | 'light' | 'sepia';
  allowAnonymousCreation: boolean;
  storageDriver: 'local' | 'cloudinary' | 's3';
  cloudinaryConfig: CloudinaryConfig;
  s3Config: S3Config;
  oidcConfig: OidcConfig;
  fileTypeCategories: FileTypeCategories;
  maxFileSize: number;
  adminUser?: {
    id: string;
    username: string;
    role: string;
  };
}
