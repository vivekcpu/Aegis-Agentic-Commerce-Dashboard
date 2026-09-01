import { withTransaction } from "../config/db.js";
import { GuardrailError } from "../middleware/errorHandler.js";

/**
 * Reserve stock for an order inside a transaction using
 * `SELECT ... FOR UPDATE`. This is context.md's "Row-Locking Check":
 * while this transaction holds the row lock, no other concurrent request
 * can read-then-write the same product row, which is what prevents two
 * AI buyers from both "winning" the last unit of stock.
 *
 * The lock is only held for the few milliseconds this function takes —
 * it does NOT stay locked while we wait for Razorpay/webhooks. That's
 * why `orders.reserved_until` exists: it's a soft, application-level hold
 * (not a DB lock) that reservationCleanup.js can safely release later.
 */
export async function reserveStock({ productId, quantity }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM products WHERE id = $1 FOR UPDATE`,
      [productId]
    );
    const product = rows[0];
    if (!product) {
      throw new GuardrailError("PRODUCT_NOT_FOUND", "This product does not exist.", 404);
    }
    if (product.stock_qty < quantity) {
      throw new GuardrailError(
        "OUT_OF_STOCK",
        `Only ${product.stock_qty} units of ${product.title} are available.`,
        409
      );
    }

    // Soft-reserve: decrement immediately so a second concurrent buyer
    // sees accurate stock, but the order stays reversible until payment
    // confirms (see releaseReservation / confirmStock below).
    await client.query(`UPDATE products SET stock_qty = stock_qty - $1, updated_at = now() WHERE id = $2`, [
      quantity,
      productId,
    ]);

    return product;
  });
}

/** Called when a webhook confirms payment. The reservation becomes permanent. */
export async function confirmStock(orderId) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE orders SET status = 'confirmed', reserved_until = NULL, updated_at = now() WHERE id = $1`,
      [orderId]
    );
  });
}

/**
 * Releases a reservation — used both by the "Simulate stock drop" demo
 * button and by reservationCleanup.js when a webhook never arrives.
 * Restores stock_qty so the graceful-failure path leaves inventory
 * exactly as it was before the attempted order.
 */
export async function releaseReservation(orderId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
    const order = rows[0];
    if (!order || order.status !== "pending_confirmation") {
      return null; // already resolved one way or another — nothing to roll back
    }

    await client.query(`UPDATE products SET stock_qty = stock_qty + $1, updated_at = now() WHERE id = $2`, [
      order.quantity,
      order.product_id,
    ]);
    const { rows: updatedRows } = await client.query(
      `UPDATE orders SET status = 'rolled_back', reserved_until = NULL, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [orderId]
    );
    // Return the post-update row, not the pre-update snapshot fetched
    // above — callers (like the simulate-stock-drop endpoint) display
    // this status directly, and showing stale 'pending_confirmation'
    // after the rollback already happened would be confusing/wrong.
    return updatedRows[0];
  });
}
