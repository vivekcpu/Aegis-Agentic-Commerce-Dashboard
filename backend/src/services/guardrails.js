import { GuardrailError } from "../middleware/errorHandler.js";

/**
 * Velocity check — throttles an agent hammering the endpoint.
 *
 * Implemented as an in-memory sliding window here for local dev/demo
 * simplicity. In production this MUST be backed by Redis (INCR + EXPIRE
 * on a key like `velocity:{agentId}`), because this in-memory Map is
 * per-process — it resets on restart and doesn't work once you run more
 * than one backend replica. Swapping it out is a one-file change since
 * everything else calls `checkVelocity(agentId)` and doesn't know how
 * it's implemented.
 */
const requestLog = new Map(); // agentId -> array of timestamps (ms)
const VELOCITY_WINDOW_MS = 10_000;
const VELOCITY_MAX_REQUESTS = 5;

export function checkVelocity(agentId) {
  const now = Date.now();
  const timestamps = (requestLog.get(agentId) || []).filter((t) => now - t < VELOCITY_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(agentId, timestamps);

  if (timestamps.length > VELOCITY_MAX_REQUESTS) {
    throw new GuardrailError(
      "VELOCITY_LIMIT",
      `Too many requests from ${agentId} in a short window. Slow down and try again.`,
      429
    );
  }
}

/**
 * Price lock verification — the buyer's claimed price is NEVER trusted.
 * The only price that matters is the one just read from our own database
 * (`dbProduct`), per context.md's "Server-to-Server Lock" requirement.
 * This function doesn't even need a "buyer-claimed price" parameter,
 * which is itself the point: there's nothing for an attacker to mutate.
 */
export function verifyPrice(dbProduct, quantity) {
  if (!dbProduct) {
    throw new GuardrailError("PRODUCT_NOT_FOUND", "This product does not exist.", 404);
  }
  const totalAmountInr = Number(dbProduct.price_inr) * quantity;
  return { unitPriceInr: Number(dbProduct.price_inr), totalAmountInr };
}

/**
 * Stock availability check — read-only pre-check before we attempt the
 * row-locked reservation in services/inventory.js. This just gives a
 * fast, clean rejection for the common case (buyer wants more than
 * exists) without opening a transaction at all.
 */
export function verifyStock(dbProduct, quantity) {
  if (dbProduct.stock_qty < quantity) {
    throw new GuardrailError(
      "OUT_OF_STOCK",
      `Only ${dbProduct.stock_qty} units of ${dbProduct.title} are available.`,
      409
    );
  }
}
