import pg from "pg";
import { readFileSync, appendFileSync } from "fs";

const LOG = "/tmp/migration_apply.log";
function log(msg) { appendFileSync(LOG, msg + "\n"); }

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, statement_timeout: 15000 });

const sql = readFileSync(
  "prisma/migrations/20260815034500_genshin_good_import_inventory/migration.sql",
  "utf8",
);
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

async function main() {
  log("connecting...");
  await client.connect();
  log("connected");
  for (const stmt of statements) {
    log("RUNNING: " + stmt.slice(0, 70).replace(/\n/g, " "));
    await client.query(stmt);
    log("  OK");
  }
  await client.end();
  log("DONE");
}

main().catch((e) => {
  log("FAILED: " + e.message);
  process.exitCode = 1;
});
