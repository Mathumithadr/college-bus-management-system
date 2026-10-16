// Standard response helpers — enforce the { success, data } / { success, code, message, errors } envelope

/**
 * Send a successful API response with the standard success envelope.
 */
export const sendSuccess = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

/**
 * Send a paginated list response with standard pagination metadata.
 */
export const sendPaginated = (res, data, pagination) => {
  return res.status(200).json({
    success: true,
    data,
    pagination,
  });
};

/**
 * Send an error response using the canonical error envelope.
 */
export const sendError = (res, statusCode, code, message, errors = []) => {
  const body = { success: false, code, message };
  if (errors.length > 0) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Build a pagination object for list endpoints.
 */
export const buildPagination = (page, limit, total) => ({
  page: Number(page),
  limit: Number(limit),
  total,
  pages: Math.ceil(total / limit),
});
