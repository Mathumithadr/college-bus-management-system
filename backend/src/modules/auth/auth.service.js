// Authentication service handling credentials validation, JWT issuance, account lockout, and token invalidation

import User from '../../models/User.js';
import TokenRevocation from '../../models/TokenRevocation.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import { signToken, generateJti } from '../../utils/jwt.js';
import { writeAuditLog } from '../../middleware/audit.js';
import { AUTH } from '../../config/constants.js';
import { ERROR_CODES } from '../../utils/errorCodes.js';
import { authError, forbiddenError, rateLimitedError, validationError } from '../../utils/errors.js';

// Authenticate user credentials, check lockout status, issue JWT, and record audit log
export const authenticateUser = async ({ email, password, ip, userAgent, correlationId }) => {
  const user = await User.findOne({ email }).select('+passwordHash');

  // Enforce account lockout if consecutive failed attempts exceeded threshold
  if (user && user.lockUntil && user.lockUntil > Date.now()) {
    const retryAfterSeconds = Math.ceil((user.lockUntil - Date.now()) / 1000);
    throw rateLimitedError(retryAfterSeconds);
  }

  const isPasswordValid = user && (await comparePassword(password, user.passwordHash));

  // Handle failed login attempt and increment failure counter
  if (!user || !isPasswordValid) {
    if (user) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= AUTH.MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + AUTH.LOCKOUT_DURATION_MS);
      }
      await user.save();
    }
    throw authError('Invalid email or password');
  }

  // Reject inactive user accounts with 403
  if (!user.isActive) {
    throw forbiddenError('Account is deactivated. Contact system administrator.');
  }

  // Reset lockout counters upon successful authentication
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  // Create JWT with unique jti for revocation tracking
  const jti = generateJti();
  const token = signToken({
    userId: user._id.toString(),
    role: user.role,
    jti,
  });

  // Record successful login audit log
  await writeAuditLog({
    actorId: user._id,
    action: 'USER_LOGIN',
    resourceType: 'User',
    resourceId: user._id,
    ipAddress: ip,
    userAgent,
    correlationId,
  });

  const userObj = user.toObject();
  delete userObj.passwordHash;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;

  return { token, user: userObj };
};

// Revoke current session token in TokenRevocation collection idempotently
export const revokeSessionToken = async ({ tokenDecoded, userId, ip, userAgent, correlationId }) => {
  if (tokenDecoded?.jti) {
    const existing = await TokenRevocation.findOne({ jti: tokenDecoded.jti });
    if (!existing) {
      const expiresAt = tokenDecoded.exp
        ? new Date(tokenDecoded.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await TokenRevocation.create({
        jti: tokenDecoded.jti,
        userId,
        reason: 'logout',
        expiresAt,
      });
    }
  }

  // Record user logout in audit log
  await writeAuditLog({
    actorId: userId,
    action: 'USER_LOGOUT',
    resourceType: 'User',
    resourceId: userId,
    ipAddress: ip,
    userAgent,
    correlationId,
  });

  return { message: 'Logged out successfully' };
};

// Retrieve user profile sanitized of security fields
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user || !user.isActive) {
    throw authError('User not found or deactivated');
  }
  return user.toObject();
};

// Change authenticated user password with old password verification
export const updateUserPassword = async ({ userId, oldPassword, newPassword, ip, correlationId }) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw authError('User not found');

  const matches = await comparePassword(oldPassword, user.passwordHash);
  if (!matches) throw validationError('Current password does not match');

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  // Audit password change event
  await writeAuditLog({
    actorId: userId,
    action: 'PASSWORD_CHANGED',
    resourceType: 'User',
    resourceId: userId,
    ipAddress: ip,
    correlationId,
  });

  return { message: 'Password updated successfully' };
};
