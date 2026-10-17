import crypto from 'crypto';

// Default fallback secret for development if none configured
const DEFAULT_SECRET = 'shareable-stickies-default-secure-key-32bytes!';

function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || DEFAULT_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts string content at rest using AES-256-GCM
 */
export function encryptAtRest(text: string): EncryptedPayload {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);

  let ciphertext = cipher.update(text, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const tag = cipher.getAuthTag().toString('base64');

  return {
    ciphertext,
    iv: iv.toString('base64'),
    tag,
  };
}

/**
 * Decrypts string content at rest using AES-256-GCM
 */
export function decryptAtRest(payload: EncryptedPayload): string {
  const masterKey = getMasterKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(payload.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}

/**
 * Hashes a password with salt using PBKDF2
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verifies a password against hash and salt
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}
