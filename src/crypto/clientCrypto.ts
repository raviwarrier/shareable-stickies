/**
 * Pure client-side zero-knowledge encryption using Web Crypto API (AES-GCM 256-bit + PBKDF2)
 * Ensures the server never receives unencrypted plaintext when client encryption is used.
 */

const PBKDF2_ITERATIONS = 100000;
const PREFIX = 'ENC:v1:';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext in the browser before sending to server.
 * Format: ENC:v1:<salt_b64>:<iv_b64>:<ciphertext_b64>
 */
export async function encryptClientSide(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const key = await deriveKey(passphrase, salt);

  const encoder = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    encoder.encode(plaintext)
  );

  const saltB64 = arrayBufferToBase64(salt.buffer);
  const ivB64 = arrayBufferToBase64(iv.buffer);
  const cipherB64 = arrayBufferToBase64(ciphertextBuffer);

  return `${PREFIX}${saltB64}:${ivB64}:${cipherB64}`;
}

/**
 * Decrypts in-browser using user passphrase.
 */
export async function decryptClientSide(serialized: string, passphrase: string): Promise<string> {
  if (!serialized.startsWith(PREFIX)) {
    throw new Error('Not a valid zero-knowledge encrypted payload');
  }

  const parts = serialized.substring(PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted payload format');
  }

  const [saltB64, ivB64, cipherB64] = parts;
  const salt = new Uint8Array(base64ToArrayBuffer(saltB64));
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  const ciphertext = base64ToArrayBuffer(cipherB64);

  const key = await deriveKey(passphrase, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as any,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    throw new Error('Incorrect decryption passphrase');
  }
}

export function isClientEncrypted(text: string): boolean {
  return typeof text === 'string' && text.startsWith(PREFIX);
}
