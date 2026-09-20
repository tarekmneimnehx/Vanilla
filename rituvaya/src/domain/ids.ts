/**
 * Stable identifiers. UUID v4 layout so records can be merged with a future
 * sync service without renumbering. Uses the platform CSPRNG when available.
 */
function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  const cryptoObj = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < n; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

export function newId(): string {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
