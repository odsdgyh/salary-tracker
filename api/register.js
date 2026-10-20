import bcrypt from "bcryptjs";
import { ensureSchema, getSql } from "../lib/db.js";
import { method, readJson, send, setAuthCookie, signToken } from "../lib/http.js";

const DEFAULT_CATEGORIES = [
  { name: "Зарплата", type: "income" },
  { name: "Фриланс", type: "income" },
  { name: "Прочие доходы", type: "income" },
  { name: "Еда", type: "expense" },
  { name: "Транспорт", type: "expense" },
  { name: "Жильё", type: "expense" },
  { name: "Прочие расходы", type: "expense" },
];

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    await ensureSchema();
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return send(res, 400, { error: "Введите корректный email" });
    }
    if (password.length < 6) {
      return send(res, 400, { error: "Пароль должен быть не короче 6 символов" });
    }

    const db = getSql();
    const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.length) {
      return send(res, 409, { error: "Этот email уже зарегистрирован" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await db`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${passwordHash})
      RETURNING id, email
    `;
    const user = created[0];
    for (const category of DEFAULT_CATEGORIES) {
      await db`
        INSERT INTO categories (user_id, name, type)
        VALUES (${user.id}, ${category.name}, ${category.type})
      `;
    }

    setAuthCookie(res, signToken(user));
    send(res, 201, { user: { id: user.id, email: user.email } });
  } catch (error) {
    send(res, 500, { error: error.message || "Не удалось зарегистрироваться" });
  }
}
