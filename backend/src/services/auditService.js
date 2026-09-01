import { pool } from "../config/db.js";

/**
 * The one and only way anything in this codebase writes to audit_log.
 * Centralizing it here means we can guarantee every entry always has a
 * correlation ID and a merchant ID, which is the whole point of an
 * audit trail — a log you have to remember to fill in correctly every
 * time isn't reliable.
 */
export async function logEvent({ merchantId, orderId = null, correlationId, eventType, message, metadata = {} }) {
  await pool.query(
    `INSERT INTO audit_log (merchant_id, order_id, correlation_id, event_type, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [merchantId, orderId, correlationId, eventType, message, metadata]
  );
}

export async function getRecentAuditLog(merchantId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT event_type, message, metadata, created_at
     FROM audit_log
     WHERE merchant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [merchantId, limit]
  );
  return rows;
}
