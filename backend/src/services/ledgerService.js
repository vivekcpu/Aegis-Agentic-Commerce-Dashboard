import { pool } from "../config/db.js";

/**
 * Accounting service.
 *
 * This is what turns "we processed a payment" into "we have real books."
 * It's deliberately separate from the orders table: orders answers
 * "what happened", ledger_entries answers "what do our accounts say" —
 * the two questions have different audiences (support/ops vs. finance)
 * and different lifecycles (an order is a snapshot, a ledger is
 * append-only history).
 *
 * Called from webhookController.js right after a payment is confirmed,
 * and this is also the exact function the LangGraph "accounting node"
 * (Part 3) will call — the AI agent doesn't touch the database directly,
 * it goes through this same service so bookkeeping logic lives in
 * exactly one place regardless of who triggered the sale.
 *
 * Simplified fee model for this project: Razorpay test-mode charges a
 * flat 2% platform fee, no separate tax line. Swap PLATFORM_FEE_RATE or
 * add a tax entry_type if your real numbers differ.
 */
const PLATFORM_FEE_RATE = 0.02;

export async function postSaleToLedger({ merchantId, orderId, totalAmountInr }) {
  const feeInr = round2(totalAmountInr * PLATFORM_FEE_RATE);
  const netPayoutInr = round2(totalAmountInr - feeInr);

  const entries = [
    { entry_type: "sale", direction: "credit", amount_inr: totalAmountInr, description: "Order total collected" },
    { entry_type: "platform_fee", direction: "debit", amount_inr: feeInr, description: "Razorpay platform fee (2%)" },
    { entry_type: "net_payout", direction: "credit", amount_inr: netPayoutInr, description: "Net amount owed to merchant" },
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const entry of entries) {
      await client.query(
        `INSERT INTO ledger_entries (merchant_id, order_id, entry_type, direction, amount_inr, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [merchantId, orderId, entry.entry_type, entry.direction, entry.amount_inr, entry.description]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { feeInr, netPayoutInr };
}

/**
 * Merchant-facing summary: today's spend (used by the "Today's Spending
 * Limit" dashboard card), plus running totals. This is intentionally a
 * read-only aggregate query, not a cached counter, so it's always
 * correct even if a webhook retried or a process restarted mid-order.
 */
export async function getLedgerSummary(merchantId) {
  const { rows: spendRows } = await pool.query(
    `SELECT COALESCE(SUM(amount_inr), 0) AS spent_today
     FROM ledger_entries
     WHERE merchant_id = $1
       AND entry_type = 'sale'
       AND created_at >= date_trunc('day', now())`,
    [merchantId]
  );

  const { rows: totalsRows } = await pool.query(
    `SELECT entry_type, direction, COALESCE(SUM(amount_inr), 0) AS total
     FROM ledger_entries
     WHERE merchant_id = $1
     GROUP BY entry_type, direction`,
    [merchantId]
  );

  return {
    spentToday: Number(spendRows[0].spent_today),
    totals: totalsRows.map((r) => ({
      entryType: r.entry_type,
      direction: r.direction,
      total: Number(r.total),
    })),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
