import { clearAuthCookie, method, send } from "../lib/http.js";

export default async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  clearAuthCookie(res);
  send(res, 200, { ok: true });
}
