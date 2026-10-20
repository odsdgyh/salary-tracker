import { neon } from "@neondatabase/serverless";

let sql;
let schemaSql;
let schemaReady = false;

function requireUrl(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Не задана переменная ${name}`);
  }
  return value;
}

/** Pooled DATABASE_URL for app traffic (Vercel serverless + Neon HTTP driver). */
export function getSql() {
  if (!sql) {
    sql = neon(requireUrl("DATABASE_URL"));
  }
  return sql;
}

/** Direct DATABASE_URL_UNPOOLED for DDL / schema setup. */
export function getSchemaSql() {
  if (!schemaSql) {
    schemaSql = neon(process.env.DATABASE_URL_UNPOOLED || requireUrl("DATABASE_URL"));
  }
  return schemaSql;
}

export async function ensureSchema() {
  if (schemaReady) return;
  const db = getSchemaSql();
  await db`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await db`CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(user_id, date)`;
  schemaReady = true;
}

export function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
  };
}

export function mapTransaction(row) {
  const date =
    row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10);
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.category_id,
    date,
    comment: row.comment || "",
  };
}
