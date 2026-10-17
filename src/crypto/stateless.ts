import LZString from 'lz-string';

export interface StatelessPasteData {
  title: string;
  content: string;
  syntax: string;
  createdAt: number;
  clientEncrypted?: boolean;
}

const HASH_PREFIX = '#s=';

/**
 * Compresses paste payload into a URL fragment string
 */
export function encodeStatelessPaste(data: StatelessPasteData): string {
  const jsonStr = JSON.stringify(data);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return `${HASH_PREFIX}${compressed}`;
}

/**
 * Reads and decompresses stateless payload from URL fragment
 */
export function decodeStatelessPaste(hash: string): StatelessPasteData | null {
  if (!hash) return null;
  let compressed = '';
  if (hash.startsWith(HASH_PREFIX)) {
    compressed = hash.substring(HASH_PREFIX.length);
  } else if (hash.startsWith('#')) {
    compressed = hash.substring(1);
  } else {
    compressed = hash;
  }

  if (!compressed) return null;

  try {
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressed);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.content === 'string') {
      return {
        title: parsed.title || 'Stateless Sticky',
        content: parsed.content,
        syntax: parsed.syntax || 'plaintext',
        createdAt: parsed.createdAt || Date.now(),
        clientEncrypted: !!parsed.clientEncrypted,
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to decode stateless fragment:', err);
    return null;
  }
}
