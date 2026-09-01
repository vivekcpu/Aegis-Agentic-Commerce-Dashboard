import { getLedgerSummary } from "../services/ledgerService.js";
import { pool } from "../config/db.js";

/** GET /api/ledger/summary — powers the "Today's Spending Limit" card. */
export async function getSummary(req, res, next) {
  try {
    const merchantId = process.env.MERCHANT_ID;
    const summary = await getLedgerSummary(merchantId);
    const { rows } = await pool.query(`SELECT daily_spend_cap_inr FROM merchants WHERE id = $1`, [merchantId]);
    res.json({
      spentToday: summary.spentToday,
      dailyCapInr: Number(rows[0]?.daily_spend_cap_inr || 0),
      totals: summary.totals,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/ledger/entries — raw ledger rows, for a future full accounting view. */
export async function listEntries(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM ledger_entries WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [process.env.MERCHANT_ID]
    );
    res.json({ entries: rows });
  } catch (err) {
    next(err);
  }
}
