import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const file = ".env.local";
const text = existsSync(file) ? readFileSync(file, "utf8") : "";
if (!/^JWT_SECRET=/m.test(text)) {
  const secret = randomBytes(32).toString("hex");
  appendFileSync(file, `${text.endsWith("\n") || text.length === 0 ? "" : "\n"}JWT_SECRET=${secret}\n`);
  console.log("JWT_SECRET written to .env.local");
} else {
  console.log("JWT_SECRET already in .env.local");
}
