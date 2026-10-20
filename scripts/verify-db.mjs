import { loadEnv } from "./load-env.mjs";
import { ensureSchema, getSql } from "../lib/db.js";

loadEnv();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "local-dev-secret-not-for-production";
}

await ensureSchema();
const sql = getSql();
const ping = await sql`SELECT 1 AS ok, current_database() AS db`;
const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('users', 'categories', 'transactions')
  ORDER BY table_name
`;
if (ping[0]?.ok !== 1) {
  throw new Error("SELECT 1 failed");
}
if (tables.length !== 3) {
  throw new Error(`Expected 3 tables, got ${tables.map((t) => t.table_name).join(", ")}`);
}
console.log(`postgres ok database=${ping[0].db} tables=${tables.map((t) => t.table_name).join(",")}`);
