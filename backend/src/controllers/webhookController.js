import { pool } from "../config/db.js";
import { verifyWebhookSignature } from "../services/razorpayService.js";
import { confirmStock } from "../services/inventory.js";
import { postSaleToLedger } from "../services/ledgerService.js";
import { logEvent } from "../services/auditService.js";

/**
 * POST /api/webhooks/razorpay
 *
 * The entire trust boundary of the payment flow collapses to this one
 * check: if the signature doesn't match, NOTHING downstream happens —
 * no stock deduction, no ledger entry, just an audit log entry and a
 * 400. This is context.md's "Signature Verification Loop".
 */
export async function handleRazorpayWebhook(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const { rows } = await pool.query(`SELECT * FROM orders WHERE razorpay_order_id = $1`, [
      razorpay_order_id,
    ]);
    const order = rows[0];
    if (!order) {
      // Don't error loudly on unknown orders — could be a webhook for a
      // different environment/merchant. Acknowledge and move on.
      return res.status(200).json({ received: true, matched: false });
    }

    const valid = verifyWebhookSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!valid) {
      await logEvent({
        merchantId: order.merchant_id,
        orderId: order.id,
        correlationId: order.correlation_id,
        eventType: "REJECTED:SIGNATURE_MISMATCH",
        message: "Webhook signature did not match — payment NOT confirmed.",
      });
      return res.status(400).json({ error: { code: "SIGNATURE_MISMATCH", message: "Invalid signature." } });
    }

    await pool.query(`UPDATE orders SET razorpay_payment_id = $1, updated_at = now() WHERE id = $2`, [
      razorpay_payment_id,
      order.id,
    ]);
    await confirmStock(order.id);

    await logEvent({
      merchantId: order.merchant_id,
      orderId: order.id,
      correlationId: order.correlation_id,
      eventType: "WEBHOOK_RECV",
      message: "Payment confirmed, signature verified.",
    });

    // Accounting: post the sale to the ledger right after confirmation.
    // This is the same call the LangGraph accounting node (Part 3) makes.
    const { feeInr, netPayoutInr } = await postSaleToLedger({
      merchantId: order.merchant_id,
      orderId: order.id,
      totalAmountInr: Number(order.total_amount_inr),
    });

    await logEvent({
      merchantId: order.merchant_id,
      orderId: order.id,
      correlationId: order.correlation_id,
      eventType: "LEDGER_POSTED",
      message: `Ledger updated: fee ₹${feeInr}, net payout ₹${netPayoutInr}`,
    });

    res.status(200).json({ received: true, matched: true });
  } catch (err) {
    next(err);
  }
}
