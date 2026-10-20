import { ensureSchema, getSql, mapCategory } from "../../lib/db.js";
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
      SELECT id, name, type FROM categories WHERE id = ${id} AND user_id = ${user.id} LIMIT 1
    `;
    if (!existing.length) {
      return send(res, 404, { error: "Категория не найдена" });
    }

    if (req.method === "DELETE") {
      const used = await db`
        SELECT id FROM transactions WHERE category_id = ${id} AND user_id = ${user.id} LIMIT 1
      `;
      if (used.length) {
        return send(res, 409, { error: "Нельзя удалить категорию: есть связанные операции" });
      }
      await db`DELETE FROM categories WHERE id = ${id} AND user_id = ${user.id}`;
      return send(res, 200, { ok: true });
    }

    const body = await readJson(req);
    const name = String(body.name || "").trim();
    const type = body.type;
    if (!name) return send(res, 400, { error: "Введите название категории" });
    if (type !== "income" && type !== "expense") {
      return send(res, 400, { error: "Некорректный тип категории" });
    }
    if (existing[0].type !== type) {
      const used = await db`
        SELECT id FROM transactions WHERE category_id = ${id} AND user_id = ${user.id} LIMIT 1
      `;
      if (used.length) {
        return send(res, 409, { error: "Нельзя сменить тип: категория уже используется в операциях" });
      }
    }
    const updated = await db`
      UPDATE categories
      SET name = ${name}, type = ${type}
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id, name, type
    `;
    send(res, 200, mapCategory(updated[0]));
  } catch (error) {
    send(res, 500, { error: error.message || "Ошибка сервера" });
  }
}
