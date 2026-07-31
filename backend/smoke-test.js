process.env.NODE_ENV = process.env.NODE_ENV || "development";
require("dotenv").config();
const request = require("supertest");
const { createApp } = require("./dist/app.js");

const app = createApp();

const checks = [
  ["GET", "/", "root"],
  ["GET", "/api/health", "health"],
  ["GET", "/api/config", "config"],
  ["GET", "/api/blog", "blogs"],
  ["GET", "/api/search", "search"],
  ["GET", "/api/notifications", "notifications"],
  ["POST", "/api/auth/login", "login"],
  ["POST", "/api/auth/forgot-password", "forgot-password"],
  ["POST", "/api/auth/reset-password", "reset-password"],
  ["GET", "/api/profile", "profile"],
  ["GET", "/api/admin", "admin"],
  ["GET", "/api/analytics", "analytics"],
  ["GET", "/api/placement", "placement"],
  ["GET", "/api/productivity", "productivity"],
  ["GET", "/api/job", "job"],
  ["GET", "/api/coding", "coding"],
  ["GET", "/api/streak", "streak"],
];

(async () => {
  for (const [method, url, name] of checks) {
    try {
      const res = await request(app)[method.toLowerCase()](url).set("Origin", "http://localhost:3000");
      const body = typeof res.body === "object" ? JSON.stringify(res.body).slice(0, 160) : String(res.body).slice(0, 160);
      console.log(`${res.statusCode} ${method} ${url} [${name}] -> ${body}`);
    } catch (e) {
      console.log(`ERR  ${method} ${url} [${name}] -> ${e.message}`);
    }
  }
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
