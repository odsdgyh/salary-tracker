import jwt from "jsonwebtoken";

const COOKIE = "st_token";

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function readCookie(req, name = COOKIE) {
  const header = req.headers.cookie || "";
  const parts = header.split(";").map((item) => item.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

export function setAuthCookie(res, token) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`
  );
}

export function clearAuthCookie(res) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`);
}

export function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Не задана переменная JWT_SECRET");
  }
  return jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "7d" });
}

export function requireUser(req, res) {
  const token = readCookie(req);
  if (!token) {
    send(res, 401, { error: "Нужно войти в аккаунт" });
    return null;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    send(res, 401, { error: "Сессия истекла, войдите снова" });
    return null;
  }
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export function method(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    send(res, 405, { error: "Метод не поддерживается" });
    return false;
  }
  return true;
}
