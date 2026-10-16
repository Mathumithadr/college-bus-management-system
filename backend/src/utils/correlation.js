// Correlation ID utility — attach a unique request ID to each incoming request

import { randomUUID } from 'crypto';

/**
 * Middleware: generate a unique X-Correlation-ID for every request and attach to res.locals.
 */
export const correlationMiddleware = (req, res, next) => {
  const id = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = id;
  res.setHeader('X-Correlation-ID', id);
  next();
};
