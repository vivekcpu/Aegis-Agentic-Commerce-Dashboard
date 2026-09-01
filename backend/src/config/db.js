import pg from "pg";
import "dotenv/config";

// A single shared connection pool. Every query in the app goes through
// this — it's what makes `SELECT ... FOR UPDATE` row locking (used in
// services/inventory.js) actually work: the lock only holds for the
// duration of a transaction on one client checked out from this pool.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // A background/idle client errored (e.g. connection dropped). Log and
  // let the pool recover rather than crashing the whole process.
  console.error(JSON.stringify({ level: "error", msg: "Unexpected DB pool error", error: err.message }));
});

/**
 * Run `fn` inside a transaction. Commits on success, rolls back on any
 * thrown error, and always releases the client back to the pool.
 * Used anywhere we need atomicity — e.g. reserve stock + create order.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
