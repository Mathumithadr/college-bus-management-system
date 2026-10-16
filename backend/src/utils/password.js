// Password utilities — hash and compare passwords using bcryptjs

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password using bcrypt with 12 salt rounds.
 */
export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

/**
 * Compare a plain-text password against a stored bcrypt hash.
 */
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);
