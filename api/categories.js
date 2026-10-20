import { ensureSchema, getSql, mapCategory } from "../lib/db.js";
import { method, readJson, requireUser, send } from "../lib/http.js";

export default async function handler(req, res) {
  if (!method(req, res, ["GET", "POST"])) return;
  try {
    await ensureSchema();
    const user = requireUser(req, res);
    if (!user) return;
    const db = getSql();

    if (req.method === "GET") {
      const rows = await db`
        SELECT id, name, type
        FROM categories
        WHERE user_id = ${user.id}
        ORDER BY type, name
      `;
      return send(res, 200, rows.map(mapCategory));
    }

    const body = await readJson(req);
    const name = String(body.name || "").trim();
    const type = body.type;
    if (!name) return send(res, 400, { error: "Введите название категории" });
    if (type !== "income" && type !== "expense") {
      return send(res, 400, { error: "Некорректный тип категории" });
    }
    const created = await db`
      INSERT INTO categories (user_id, name, type)
      VALUES (${user.id}, ${name}, ${type})
      RETURNING id, name, type
    `;
    send(res, 201, mapCategory(created[0]));
  } catch (error) {
    send(res, 500, { error: error.message || "Ошибка сервера" });
  }
}
