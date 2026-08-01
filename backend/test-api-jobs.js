require("dotenv").config();
const jwt = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET;
const token = jwt.sign(
  { userId: "cmrixcdln0000ngfgn9qal4da", email: "test@example.com", role: "USER" },
  jwtSecret,
  { expiresIn: "7d", algorithm: "HS256" }
);

const adminToken = jwt.sign(
  { userId: "admin-123", id: "admin-123", email: "admin@adyapan.ai", role: "ADMIN" },
  jwtSecret,
  { expiresIn: "7d", algorithm: "HS256" }
);

async function test() {
  console.log("=== 1. Testing GET /api/discovery/jobs ===");
  try {
    const res = await fetch("http://localhost:5000/api/discovery/jobs", {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    console.log("Discovery Jobs Status:", res.status, "Success:", data.success, "Total:", data.total, "Count:", data.jobs?.length);
  } catch (e) {
    console.error("Discovery jobs error:", e.message);
  }

  console.log("\n=== 2. Testing GET /api/job-listing ===");
  try {
    const res = await fetch("http://localhost:5000/api/job-listing", {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    console.log("Job-Listing Status:", res.status, "Success:", data.success, "Total:", data.total, "Count:", data.jobs?.length);
  } catch (e) {
    console.error("Job listing error:", e.message);
  }

  console.log("\n=== 3. Testing GET /api/admin/jobs ===");
  try {
    const res = await fetch("http://localhost:5000/api/admin/jobs", {
      headers: { Authorization: "Bearer " + adminToken },
    });
    const data = await res.json();
    console.log("Admin Jobs Status:", res.status, "Success:", data.success, "Total:", data.pagination?.total, "Count:", data.jobs?.length);
  } catch (e) {
    console.error("Admin jobs error:", e.message);
  }

  process.exit(0);
}

test().catch((e) => console.error("Error:", e));
