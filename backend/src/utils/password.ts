import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Validates password meets security requirements:
 * - Minimum 8 characters
 * - Must include letters, numbers, and symbols
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLetter) {
    return { valid: false, error: 'Password must include at least one letter' };
  }

  if (!hasNumber) {
    return { valid: false, error: 'Password must include at least one number' };
  }

  if (!hasSymbol) {
    return { valid: false, error: 'Password must include at least one symbol' };
  }

  return { valid: true };
}

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain password with a hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
