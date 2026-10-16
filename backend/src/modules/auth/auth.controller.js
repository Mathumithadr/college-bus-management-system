// Authentication controller delegating HTTP requests to authentication service layer

import { sendSuccess } from '../../utils/response.js';
import {
  authenticateUser,
  revokeSessionToken,
  getUserProfile,
  updateUserPassword,
} from './auth.service.js';

// Handle user login request and return JWT session token with profile
export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser({
      email,
      password,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// Handle user logout request and invalidate session token
export const logoutController = async (req, res, next) => {
  try {
    const result = await revokeSessionToken({
      tokenDecoded: req.tokenDecoded,
      userId: req.user._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// Handle request to retrieve profile for authenticated session user
export const meController = async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user._id);
    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

// Handle password change request for authenticated user
export const changePasswordController = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await updateUserPassword({
      userId: req.user._id,
      oldPassword,
      newPassword,
      ip: req.ip,
      correlationId: req.correlationId,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
