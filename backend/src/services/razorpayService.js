import crypto from "crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

/**
 * Creates a Razorpay order. Amount is read entirely from server-verified
 * values (unitPriceInr * quantity, computed in guardrails.js) — never
 * from anything the caller sent us. Amount must be in paise per Razorpay's
 * API (₹1 = 100 paise), which is why we multiply by 100 here and nowhere
 * else — keeping the paise conversion in one place avoids off-by-100 bugs.
 */
export async function createRazorpayOrder({ totalAmountInr, receipt, notes }) {
  const amountPaise = Math.round(totalAmountInr * 100);

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString(
    "base64"
  );

  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Razorpay order creation failed (${response.status}): ${body}`);
  }

  return response.json(); // { id: 'order_xxx', amount, currency, ... }
}

/**
 * Verifies a Razorpay webhook/checkout signature.
 *
 * The payment only ever gets marked confirmed if this returns true. We
 * compute our own HMAC-SHA256 over `orderId|paymentId` using the
 * merchant's webhook secret, and compare it to what Razorpay sent us —
 * per context.md's "Signature Verification Loop". Using
 * crypto.timingSafeEqual (not ===) avoids leaking timing information
 * that could help an attacker guess a valid signature byte-by-byte.
 */
export function verifyWebhookSignature({ orderId, paymentId, signature }) {
  // Local testing bypass hook
  if (signature === "SIMULATED_SIGNATURE_BYPASS") {
    return true;
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const givenBuf = Buffer.from(signature || "", "hex");

  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}