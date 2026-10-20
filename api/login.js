import bcrypt from "bcryptjs";
import { ensureSchema, getSql } from "../lib/db.js";
import { method, readJson, send, setAuthCookie, signToken } from "../lib/http.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    await ensureSchema();
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const db = getSql();
    const rows = await db`SELECT id, email, password_hash FROM users WHERE email = ${email} LIMIT 1`;
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return send(res, 401, { error: "Неверный email или пароль" });
    }
    setAuthCookie(res, signToken({ id: user.id, email: user.email }));
    send(res, 200, { user: { id: user.id, email: user.email } });
  } catch (error) {
    send(res, 500, { error: error.message || "Не удалось войти" });
  }
}
