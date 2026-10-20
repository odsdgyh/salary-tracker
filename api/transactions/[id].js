import { ensureSchema, getSql, mapTransaction } from "../../lib/db.js";
import { method, readJson, requireUser, send } from "../../lib/http.js";

export default async function handler(req, res) {
  if (!method(req, res, ["PUT", "DELETE"])) return;
  try {
    await ensureSchema();
    const user = requireUser(req, res);
    if (!user) return;
    const id = req.query.id;
    const db = getSql();
    const existing = await db`
      SELECT id FROM transactions WHERE id = ${id} AND user_id = ${user.id} LIMIT 1
    `;
    if (!existing.length) {
      return send(res, 404, { error: "Операция не найдена" });
    }

    if (req.method === "DELETE") {
      await db`DELETE FROM transactions WHERE id = ${id} AND user_id = ${user.id}`;
      return send(res, 200, { ok: true });
    }

    const body = await readJson(req);
    const amount = Number(body.amount);
    const type = body.type;
    const date = body.date;
    const categoryId = body.categoryId;
    const comment = String(body.comment || "").trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      return send(res, 400, { error: "Введите сумму больше нуля" });
    }
    if (type !== "income" && type !== "expense") {
      return send(res, 400, { error: "Некорректный тип операции" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      return send(res, 400, { error: "Укажите дату операции" });
    }
    const category = await db`
      SELECT id, type FROM categories WHERE id = ${categoryId} AND user_id = ${user.id} LIMIT 1
    `;
    if (!category.length || category[0].type !== type) {
      return send(res, 400, { error: "Выберите категорию, которая соответствует типу операции" });
    }
    const updated = await db`
      UPDATE transactions
      SET category_id = ${categoryId}, type = ${type}, amount = ${amount}, date = ${date}, comment = ${comment}
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id, type, amount, category_id, date, comment
    `;
    send(res, 200, mapTransaction(updated[0]));
  } catch (error) {
    send(res, 500, { error: error.message || "Ошибка сервера" });
  }
}
