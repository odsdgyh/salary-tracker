import { ensureSchema } from "../lib/db.js";
import { method, requireUser, send } from "../lib/http.js";

export default async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  try {
    await ensureSchema();
    const user = requireUser(req, res);
    if (!user) return;
    send(res, 200, { user: { id: user.id, email: user.email } });
  } catch (error) {
    send(res, 500, { error: error.message || "Ошибка сервера" });
  }
}
