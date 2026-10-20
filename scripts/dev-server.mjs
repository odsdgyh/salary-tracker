import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { loadEnv } from "./load-env.mjs";

loadEnv();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "local-dev-secret-not-for-production";
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const routes = {
  "POST /api/register": () => import("../api/register.js"),
  "POST /api/login": () => import("../api/login.js"),
  "POST /api/logout": () => import("../api/logout.js"),
  "GET /api/me": () => import("../api/me.js"),
  "GET /api/categories": () => import("../api/categories.js"),
  "POST /api/categories": () => import("../api/categories.js"),
  "PUT /api/categories/": () => import("../api/categories/[id].js"),
  "DELETE /api/categories/": () => import("../api/categories/[id].js"),
  "GET /api/transactions": () => import("../api/transactions.js"),
  "POST /api/transactions": () => import("../api/transactions.js"),
  "PUT /api/transactions/": () => import("../api/transactions/[id].js"),
  "DELETE /api/transactions/": () => import("../api/transactions/[id].js"),
};

function matchRoute(method, url) {
  const path = url.split("?")[0];
  const exact = routes[`${method} ${path}`];
  if (exact) return { load: exact, query: {} };
  const cat = path.match(/^\/api\/categories\/([^/]+)$/);
  if (cat && routes[`${method} /api/categories/`]) {
    return { load: routes[`${method} /api/categories/`], query: { id: decodeURIComponent(cat[1]) } };
  }
  const tx = path.match(/^\/api\/transactions\/([^/]+)$/);
  if (tx && routes[`${method} /api/transactions/`]) {
    return { load: routes[`${method} /api/transactions/`], query: { id: decodeURIComponent(tx[1]) } };
  }
  return null;
}

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
  res.end(readFileSync(filePath));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const route = matchRoute(req.method, url.pathname);
    if (route) {
      const mod = await route.load();
      req.query = route.query;
      await mod.default(req, res);
      return;
    }
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const full = normalize(join(process.cwd(), path));
    if (!full.startsWith(process.cwd()) || !existsSync(full) || statSync(full).isDirectory()) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    sendFile(res, full);
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: error.message || "Server error" }));
    }
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => {
  console.log(`Serving HTTP on http://127.0.0.1:${port}/`);
});
