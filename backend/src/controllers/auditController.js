import { getRecentAuditLog } from "../services/auditService.js";

/** GET /api/audit-log — powers the "What Just Happened" dashboard card. */
export async function listAuditLog(req, res, next) {
  try {
    const rows = await getRecentAuditLog(process.env.MERCHANT_ID, 20);
    res.json({ entries: rows });
  } catch (err) {
    next(err);
  }
}
