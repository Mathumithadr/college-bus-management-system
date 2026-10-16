// Authentication middleware — verify JWT Bearer token and populate req.user

import { verifyToken, extractBearerToken } from '../utils/jwt.js';
import { authError } from '../utils/errors.js';
import TokenRevocation from '../models/TokenRevocation.js';
import User from '../models/User.js';

/**
 * Verify the Bearer JWT in the Authorization header and attach the full user to req.user.
 * Checks the TokenRevocation blacklist to reject logged-out tokens.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const decoded = verifyToken(token);

    // Check blacklist: if this jti is revoked, reject
    if (decoded.jti) {
      const revoked = await TokenRevocation.findOne({ jti: decoded.jti });
      if (revoked) return next(authError('Token has been revoked'));
    }

    // Load full user document (without passwordHash)
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user || !user.isActive) {
      return next(authError('User account not found or deactivated'));
    }

    req.user = user;
    req.token = token;
    req.tokenDecoded = decoded;
    next();
  } catch (err) {
    next(err);
  }
};
