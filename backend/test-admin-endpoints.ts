const base = "http://localhost:5000/api";

async function req(path: string, opts: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const res = await fetch(base + path, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function main() {
  // 1. Admin login
  const login = await req("/auth/admin-login", {
    method: "POST",
    body: { email: "ashish@aaa.com", password: "Adyapan@12345" },
  });
  console.log("LOGIN", login.status, JSON.stringify(login.json)?.slice(0, 200));
  if (login.status !== 200 || !login.json?.token) {
    console.error("Login failed — cannot continue. Possible wrong password.");
    return;
  }
  const token = login.json.token;

  // 2. Hit every admin endpoint
  const endpoints = [
    "/admin/dashboard",
    "/admin/activity",
    "/admin/users",
    "/admin/users?page=1&limit=5",
    "/admin/analytics/ai",
    "/admin/analytics/revenue",
    "/admin/analytics/bi",
    "/admin/system-health",
    "/admin/modules",
    "/admin/security",
    "/admin/jobs",
    "/admin/settings",
    "/admin/performance",
    "/admin/databases/aggregated",
    "/admin/databases",
    "/admin/databases/stats",
  ];

  for (const ep of endpoints) {
    const t0 = Date.now();
    const r = await req(ep, { token });
    const dt = Date.now() - t0;
    const body = r.json && r.json.success !== undefined
      ? JSON.stringify(r.json).slice(0, 140)
      : JSON.stringify(r.json)?.slice(0, 140) ?? "(non-json)";
    console.log(`${r.status} ${ep} (${dt}ms) -> ${body}`);
  }

  // 3. Non-admin should be rejected
  const unauth = await req("/admin/dashboard");
  console.log("UNAUTH /admin/dashboard:", unauth.status);

  // 4. Regular user token should be rejected (403)
  const regLogin = await req("/auth/login", { method: "POST", body: { email: "ashish@aaa.com", password: "password" } });
  console.log("REG LOGIN (same admin):", regLogin.status);
}

main().catch((e) => { console.error("TEST ERROR:", e); process.exit(1); });
