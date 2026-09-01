import { pool } from "../config/db.js";
import { releaseReservation } from "./inventory.js";
import { logEvent } from "./auditService.js";

/**
 * Fixes the race between "row lock released after reserveStock()" and
 * "webhook may never arrive". Without this, a dropped webhook leaves an
 * order permanently stuck in pending_confirmation and its stock
 * permanently deducted from what's sellable — a slow inventory leak.
 *
 * Runs on a simple interval rather than a cron/queue system, which is
 * the right amount of infrastructure for this project's scale; swap for
 * a proper job queue (BullMQ, etc.) if this ever needs to run across
 * multiple backend replicas without double-processing the same order.
 */
export function startReservationCleanup({ intervalMs = 60_000 } = {}) {
  const timer = setInterval(async () => {
    try {
      const { rows: expired } = await pool.query(
        `SELECT id, merchant_id, correlation_id FROM orders
         WHERE status = 'pending_confirmation' AND reserved_until < now()`
      );

      for (const order of expired) {
        try {
          await releaseReservation(order.id);
          await logEvent({
            merchantId: order.merchant_id,
            orderId: order.id,
            correlationId: order.correlation_id,
            eventType: "ROLLBACK_OK",
            message: "Reservation expired with no payment confirmation — stock released automatically.",
          });
        } catch (orderErr) {
          // Prevents one failing order from stopping the rest of the cleanup batch
          console.error(
            JSON.stringify({
              level: "error",
              msg: `Failed to release reservation for order ${order.id}`,
              error: orderErr instanceof Error ? orderErr.message : String(orderErr),
              stack: orderErr instanceof Error ? orderErr.stack : undefined,
            })
          );
        }
      }
    } catch (err) {
      // Catches top-level issues like database connection failures
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Reservation cleanup cron query failed",
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        })
      );
    }
  }, intervalMs);

  // Let the process exit naturally in tests/scripts instead of hanging on this timer.
  timer.unref();
  return timer;
}
