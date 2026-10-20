import { ensureSchema, getSql, mapTransaction } from "../lib/db.js";
import { method, readJson, requireUser, send } from "../lib/http.js";

async function validatePayload(db, userId, body) {
  const amount = Number(body.amount);
  const type = body.type;
  const date = body.date;
  const categoryId = body.categoryId;
  const comment = String(body.comment || "").trim();
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Введите сумму больше нуля" };
  }
  if (type !== "income" && type !== "expense") {
    return { error: "Некорректный тип операции" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return { error: "Укажите дату операции" };
  }
  const category = await db`
    SELECT id, type FROM categories WHERE id = ${categoryId} AND user_id = ${userId} LIMIT 1
  `;
  if (!category.length || category[0].type !== type) {
    return { error: "Выберите категорию, которая соответствует типу операции" };
  }
  return { amount, type, date, categoryId, comment };
}

export default async function handler(req, res) {
  if (!method(req, res, ["GET", "POST"])) return;
  try {
    await ensureSchema();
    const user = requireUser(req, res);
    if (!user) return;
    const db = getSql();

    if (req.method === "GET") {
      const rows = await db`
        SELECT id, type, amount, category_id, date, comment
        FROM transactions
        WHERE user_id = ${user.id}
        ORDER BY date DESC, created_at DESC
      `;
      return send(res, 200, rows.map(mapTransaction));
    }

    const payload = await validatePayload(db, user.id, await readJson(req));
    if (payload.error) return send(res, 400, { error: payload.error });
    const created = await db`
      INSERT INTO transactions (user_id, category_id, type, amount, date, comment)
      VALUES (${user.id}, ${payload.categoryId}, ${payload.type}, ${payload.amount}, ${payload.date}, ${payload.comment})
      RETURNING id, type, amount, category_id, date, comment
    `;
    send(res, 201, mapTransaction(created[0]));
  } catch (error) {
    send(res, 500, { error: error.message || "Ошибка сервера" });
  }
}
