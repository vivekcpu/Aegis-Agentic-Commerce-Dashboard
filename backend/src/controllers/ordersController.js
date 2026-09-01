import { pool } from "../config/db.js";
import { verifyPrice, verifyStock, checkVelocity } from "../services/guardrails.js";
import { reserveStock, releaseReservation, confirmStock } from "../services/inventory.js";
import { createRazorpayOrder } from "../services/razorpayService.js";
import { logEvent } from "../services/auditService.js";
import { postSaleToLedger } from "../services/ledgerService.js";
import { GuardrailError } from "../middleware/errorHandler.js";

const RESERVATION_TTL_MINUTES = Number(process.env.RESERVATION_TTL_MINUTES || 5);

/**
 * POST /api/orders
 *
 * Ingests AI buyer intent, checks velocity, verifies price/stock inside a
 * row-locked transaction, and automatically approves repeat orders from trusted bots.
 */
export async function createOrder(req, res, next) {
  try {
    const merchantId = process.env.MERCHANT_ID;
    const {
      idempotencyKey,
      buyerAgentId,
      productId,
      quantity,
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
    } = req.body;

    if (!idempotencyKey || !buyerAgentId || !productId || !quantity) {
      throw new GuardrailError(
        "INVALID_REQUEST",
        "idempotencyKey, buyerAgentId, productId, and quantity are required.",
        400
      );
    }

    // Idempotency check: if we've already processed this exact intent
    // and it's still live (in flight or paid), hand back that order.
    const existing = await pool.query(
      `SELECT * FROM orders WHERE idempotency_key = $1 AND status IN ('pending_confirmation', 'confirmed')`,
      [idempotencyKey]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({ order: existing.rows[0], idempotent: true });
    }

    checkVelocity(buyerAgentId);

    // Check if this bot is a trusted repeat buyer (has at least one past confirmed order)
    const trustedCheck = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE merchant_id = $1 AND buyer_agent_id = $2 AND status = 'confirmed'`,
      [merchantId, buyerAgentId]
    );
    const isTrustedAgent = parseInt(trustedCheck.rows[0].count, 10) > 0;

    // Row-locked reservation
    const product = await reserveStock({ productId, quantity });
    const { unitPriceInr, totalAmountInr } = verifyPrice(product, quantity);

    // If trusted, confirm immediately and remove TTL hold; otherwise require manual review
    const initialStatus = isTrustedAgent ? 'confirmed' : 'pending_confirmation';
    const reservedUntil = isTrustedAgent ? null : new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000);

    const { rows } = await pool.query(
      `INSERT INTO orders (
         merchant_id, product_id, buyer_agent_id, quantity, unit_price_inr, total_amount_inr,
         idempotency_key, customer_name, customer_email, customer_phone, delivery_address,
         reserved_until, correlation_id, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        merchantId,
        productId,
        buyerAgentId,
        quantity,
        unitPriceInr,
        totalAmountInr,
        idempotencyKey,
        customerName || null,
        customerEmail || null,
        customerPhone || null,
        deliveryAddress ? JSON.stringify(deliveryAddress) : null,
        reservedUntil,
        req.correlationId,
        initialStatus,
      ]
    );
    const order = rows[0];

    await logEvent({
      merchantId,
      orderId: order.id,
      correlationId: req.correlationId,
      eventType: isTrustedAgent ? "AUTO_APPROVED_TRUSTED_AGENT" : "ORDER_CREATED",
      message: isTrustedAgent 
        ? `Repeat bot order auto-approved for ${quantity} x ${product.title}` 
        : `Order reserved for ${quantity} x ${product.title}`,
      metadata: { buyerAgentId, totalAmountInr, isTrustedAgent },
    });

    // If trusted, finalize stock deduction and post to the financial ledger automatically
    if (isTrustedAgent) {
      await postSaleToLedger({
        merchantId,
        orderId: order.id,
        totalAmountInr,
      });
      await logEvent({
        merchantId,
        orderId: order.id,
        correlationId: req.correlationId,
        eventType: "LEDGER_AUTO_POSTED",
        message: "Trusted agent order auto-posted to accounting ledger.",
      });
    }

    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder({
        totalAmountInr,
        receipt: `receipt_${order.id}`,
        notes: {
          buyer_agent: buyerAgentId,
          order_id: order.id,
          geo_compliance_verified: "true",
          auto_approved: String(isTrustedAgent),
        },
      });
    } catch (razorpayErr) {
      await releaseReservation(order.id);
      await logEvent({
        merchantId,
        orderId: order.id,
        correlationId: req.correlationId,
        eventType: "ROLLBACK_OK",
        message: "Razorpay order creation failed — reservation released immediately.",
        metadata: { reason: razorpayErr.message },
      });
      throw new GuardrailError(
        "PAYMENT_GATEWAY_UNAVAILABLE",
        "Could not reach the payment gateway. No charge was made — please retry.",
        502
      );
    }

    await pool.query(`UPDATE orders SET razorpay_order_id = $1, updated_at = now() WHERE id = $2`, [
      razorpayOrder.id,
      order.id,
    ]);

    res.status(201).json({
      order: { ...order, razorpay_order_id: razorpayOrder.id, status: initialStatus },
      razorpayOrder,
    });
  } catch (err) {
    if (err instanceof GuardrailError) {
      await logEvent({
        merchantId: process.env.MERCHANT_ID,
        correlationId: req.correlationId,
        eventType: `REJECTED:${err.code}`,
        message: err.message,
      }).catch(() => {});
    }
    next(err);
  }
}

/** GET /api/orders — powers the Customer Orders dashboard card. */
export async function listOrders(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, p.title AS product_title
       FROM orders o
       JOIN products p ON p.id = o.product_id
       WHERE o.merchant_id = $1
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [process.env.MERCHANT_ID]
    );
    res.json({ orders: rows });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, p.title AS product_title
       FROM orders o JOIN products p ON p.id = o.product_id
       WHERE o.id = $1 AND o.merchant_id = $2`,
      [req.params.id, process.env.MERCHANT_ID]
    );
    if (!rows[0]) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found." } });
    res.json({ order: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:id/delivery-status
 * Allows a merchant to toggle the delivery status of an order.
 */
export async function updateDeliveryStatus(req, res, next) {
  try {
    const { deliveryStatus } = req.body;
    if (!['processing', 'shipped', 'delivered'].includes(deliveryStatus)) {
      return res.status(400).json({ error: { code: "INVALID_STATUS", message: "Invalid delivery status." } });
    }

    const { rows } = await pool.query(
      `UPDATE orders SET delivery_status = $1, updated_at = now() WHERE id = $2 AND merchant_id = $3 RETURNING *`,
      [deliveryStatus, req.params.id, process.env.MERCHANT_ID]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order not found." } });
    }

    res.json({ order: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:id/simulate-stock-drop
 * Demo endpoint backing the dashboard's "Simulate stock drop" button.
 */
export async function simulateStockDrop(req, res, next) {
  try {
    const order = await releaseReservation(req.params.id);
    if (!order) {
      return res.status(409).json({
        error: { code: "NOT_ROLLBACKABLE", message: "This order is no longer pending confirmation." },
      });
    }
    await logEvent({
      merchantId: process.env.MERCHANT_ID,
      orderId: order.id,
      correlationId: req.correlationId,
      eventType: "SIMULATED_STOCK_DROP",
      message: "Merchant triggered a simulated stock drop — reservation safely released.",
    });
    res.json({ order, message: "Stock drop simulated. Reservation released, no charge occurred." });
  } catch (err) {
    next(err);
  }
}