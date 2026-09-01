import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { pool } from "../config/db.js";

// Deliberately simple: this project doesn't need a full migration
// framework, it needs schema.sql applied idempotently (every statement in
// it uses IF NOT EXISTS / ON CONFLICT DO NOTHING). Run with `npm run migrate`.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  console.log("Applying schema.sql ...");
  await pool.query(sql);
  console.log("Done.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
