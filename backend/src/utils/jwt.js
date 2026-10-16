// JWT utility — sign and verify access tokens, check TokenRevocation blacklist

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authError } from './errors.js';

/**
 * Sign a JWT access token for the given user payload.
 */
export const signToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Generate a unique JWT ID (jti) for token tracking.
 */
export const generateJti = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Verify a JWT token and return the decoded payload; throws AppError on failure.
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw authError('Token has expired');
    }
    throw authError('Invalid token');
  }
};

/**
 * Extract Bearer token from Authorization header; throws if missing.
 */
export const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw authError('Authorization header missing or malformed');
  }
  return authHeader.slice(7);
};