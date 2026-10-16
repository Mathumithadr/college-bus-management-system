// Idempotency middleware — deduplicate write operations using Idempotency-Key header

import crypto from 'crypto';
import IdempotencyRecord from '../models/IdempotencyRecord.js';
import { idempotencyKeyRequiredError, idempotencyMismatchError } from '../utils/errors.js';

/**
 * Compute a SHA-256 hash of the request body for idempotency fingerprinting.
 */
const hashBody = (body) =>
  crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

/**
 * Middleware factory: enforce idempotency for a given operation type.
 * Pass { required: false } to make the header optional.
 */
export const idempotencyCheck = (operationType, opts = {}) => async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) {
    if (opts.required !== false) return next(idempotencyKeyRequiredError());
    return next(); // Optional idempotency — skip check
  }

  const requestHash = hashBody(req.body);

  try {
    // Look for an existing record with this key + operationType
    const existing = await IdempotencyRecord.findOne({ idempotencyKey: key, operationType });

    if (existing) {
      // Same key, different body — mismatch
      if (existing.requestHash !== requestHash) return next(idempotencyMismatchError());

      // Still processing — return 202 or wait (return cached response if completed)
      if (existing.status === 'completed' && existing.responseBody) {
        return res.status(existing.responseStatus || 200).json(existing.responseBody);
      }
      // If still processing, let the request proceed but client should retry later
      return res.status(202).json({ success: true, data: { status: 'processing' } });
    }

    // Create a processing record so parallel requests see it
    const record = await IdempotencyRecord.create({
      actorId: req.user?._id || null,
      clientIdentifier: req.ip,
      operationType,
      idempotencyKey: key,
      requestHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour TTL
    });

    // Attach record for controller to finalize
    req.idempotencyRecord = record;
    next();
  } catch (err) {
    // If duplicate key error (race condition), fetch the existing record and replay
    if (err.code === 11000) {
      const existing = await IdempotencyRecord.findOne({ idempotencyKey: key, operationType });
      if (existing?.status === 'completed' && existing.responseBody) {
        return res.status(existing.responseStatus || 200).json(existing.responseBody);
      }
      return res.status(202).json({ success: true, data: { status: 'processing' } });
    }
    next(err);
  }
};

/**
 * Helper: mark an idempotency record as completed and cache the response.
 */
export const finalizeIdempotency = async (record, statusCode, responseBody) => {
  if (!record) return;
  await IdempotencyRecord.findByIdAndUpdate(record._id, {
    status: 'completed',
    responseStatus: statusCode,
    responseBody,
  });
};
