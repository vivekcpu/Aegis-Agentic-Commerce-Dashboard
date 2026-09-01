import { Router } from "express";
import { getSummary, listEntries } from "../controllers/ledgerController.js";
import { listAuditLog } from "../controllers/auditController.js";
import { pool } from "../config/db.js";

const router = Router();

router.get("/ledger/summary", getSummary);
router.get("/ledger/entries", listEntries);
router.get("/audit-log", listAuditLog);

// Database table inspector endpoint for the account lookup feature
router.get("/db/inspect/:table", async (req, res, next) => {
  try {
    const { table } = req.params;
    const allowedTables = ["orders", "products", "merchants", "ledger_entries", "audit_log"];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: { code: "INVALID_TABLE", message: "Table not allowed or does not exist." } });
    }
    const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 50`);
    res.json({ table, rows });
  } catch (err) {
    next(err);
  }
});

export default router;