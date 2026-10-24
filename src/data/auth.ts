const ITERATIONS = 120_000;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

export function createSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bytesToHex(bytes);
}

export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(salt), iterations: ITERATIONS,
  }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = await hashPassword(password, salt);
  if (actual.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  return mismatch === 0;
}
