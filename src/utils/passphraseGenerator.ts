/**
 * Passphrase & Slug Generator
 * Passwords should always be 5 dictionary words with a digit separated by a hyphen.
 * Example: 'velvet-glacier-falcon-timber-summit-7'
 */

const DICTIONARY_WORDS = [
  'amber', 'anchor', 'anthem', 'apollo', 'arrow', 'aspect', 'atlas', 'aurora',
  'bamboo', 'beacon', 'breeze', 'bridge', 'bronze', 'canyon', 'castle', 'cedar',
  'cipher', 'clarity', 'clover', 'cobalt', 'comet', 'copper', 'coral', 'cosmos',
  'crater', 'crystal', 'current', 'delta', 'drift', 'eagle', 'echo', 'ember',
  'falcon', 'flint', 'forest', 'fossil', 'galaxy', 'garnet', 'glacier', 'granite',
  'grove', 'harbor', 'haven', 'hawk', 'helix', 'horizon', 'island', 'jasper',
  'jungle', 'jupiter', 'lagoon', 'lantern', 'laurel', 'legacy', 'lotus', 'lunar',
  'meadow', 'mercury', 'meteor', 'mineral', 'monarch', 'nebula', 'nexus', 'oasis',
  'ocean', 'onyx', 'opal', 'orbit', 'origin', 'pathway', 'peak', 'petal',
  'pioneer', 'planet', 'portal', 'prism', 'pulsar', 'quartz', 'quarry', 'radar',
  'radiant', 'ranger', 'ravine', 'reef', 'ridge', 'ripple', 'river', 'rover',
  'ruby', 'saffron', 'sage', 'saturn', 'shadow', 'shield', 'sierra', 'silver',
  'solace', 'solar', 'spark', 'spruce', 'summit', 'temple', 'tether', 'timber',
  'topaz', 'trail', 'tundra', 'valiant', 'valley', 'vector', 'velvet', 'vortex',
  'voyage', 'willow', 'winter', 'zenith', 'zephyr'
];

/**
 * Generates a memorable passphrase composed of 5 dictionary words and a digit,
 * all separated by hyphens.
 */
export function generatePassphrase(): string {
  const chosenWords: string[] = [];
  const wordsPool = [...DICTIONARY_WORDS];

  for (let i = 0; i < 5; i++) {
    const buf = crypto.getRandomValues(new Uint32Array(1));
    const idx = buf[0] % wordsPool.length;
    const word = wordsPool[idx];
    // Ensure at least one character of every word is capitalized
    const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
    chosenWords.push(capitalized);
    wordsPool.splice(idx, 1);
  }

  const digitBuf = crypto.getRandomValues(new Uint32Array(1));
  const digit = (digitBuf[0] % 10).toString();
  chosenWords.push(digit);

  return chosenWords.join('-');
}

/**
 * Generates a clean, readable short slug (e.g. 2 short words or 7 alphanumeric chars)
 */
export function generateSlug(): string {
  const wordsPool = ['quick', 'note', 'code', 'draft', 'doc', 'memo', 'clip', 'share', 'paste', 'text', 'snap', 'byte', 'log'];
  const buf1 = crypto.getRandomValues(new Uint32Array(1));
  const w1 = wordsPool[buf1[0] % wordsPool.length];
  const buf2 = crypto.getRandomValues(new Uint32Array(1));
  const w2 = wordsPool[buf2[0] % wordsPool.length];
  const buf3 = crypto.getRandomValues(new Uint32Array(1));
  const num = 100 + (buf3[0] % 900);
  return `${w1}-${w2}-${num}`;
}
