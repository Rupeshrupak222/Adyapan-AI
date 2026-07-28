require("dotenv").config();
const jwt = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET;
const token = jwt.sign(
  { userId: "cmrixcdln0000ngfgn9qal4da", email: "test@example.com", role: "USER" },
  jwtSecret,
  { expiresIn: "7d", algorithm: "HS256" }
);

async function test() {
  console.log("Testing GET http://localhost:5000/api/discovery/jobs ...");
  const res = await fetch("http://localhost:5000/api/discovery/jobs", {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await res.json();
  console.log("Response Status:", res.status);
  console.log("Response Success:", data.success);
  console.log("Total Jobs:", data.total);
  console.log("Returned Jobs Count:", data.jobs ? data.jobs.length : 0);
  if (data.jobs && data.jobs.length > 0) {
    console.log("First Job Title:", data.jobs[0].title);
    console.log("First Job Company:", data.jobs[0].company);
  }
  process.exit(0);
}

test().catch((e) => console.error("Error:", e));
