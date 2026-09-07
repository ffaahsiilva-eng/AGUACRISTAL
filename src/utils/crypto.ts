/**
 * Utility functions for cryptographic operations, password hashing and security
 */

export function generateSalt(): string {
  const chars = 'abcdef0123456789';
  let salt = '';
  for (let i = 0; i < 16; i++) {
    salt += chars[Math.floor(Math.random() * chars.length)];
  }
  return salt;
}

export function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36)
  );
}

/**
 * Hash a password with salt using SHA-256
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}:aguacristalsul2026`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Web Crypto API unavailable, using fallback hash:', e);
  }

  // Fallback hash implementation (FNV-1a / Jenkins mix)
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c64e6d ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

/**
 * Verify password against stored hash or fallback default password
 */
export async function verifyPassword(
  passwordAttempt: string,
  salt: string = '',
  expectedHash?: string,
  fallbackPassword?: string
): Promise<boolean> {
  if (fallbackPassword && passwordAttempt === fallbackPassword) {
    return true;
  }
  if (!expectedHash) {
    return false;
  }
  const attemptHash = await hashPassword(passwordAttempt, salt);
  return attemptHash === expectedHash;
}
