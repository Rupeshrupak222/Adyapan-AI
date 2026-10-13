import jwt from "jsonwebtoken";

const token = jwt.sign(
  { id: "admin-id", email: "admin@adyapan.com", role: "ADMIN" },
  "492c89245a51881e8e240d9b0a7428b5e5502a9d5caf7521032d79a5506b0b3fda7d1591510446eabafcc1ccc180effccf9cb26aa4df599ab652b132c318f097",
  { expiresIn: "1h" }
);

async function test() {
  const res = await fetch("http://localhost:5000/api/admin/users/progress-reports?search=kapish", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("Success:", data.success);
  if (data.users && data.users[0]) {
    const u = data.users[0];
    console.log("User:", u.name, u.email);
    console.log("overallProgress:", u.progress?.overallProgress);
    console.log("subScores:", u.progress?.subScores);
    console.log("readinessStatus:", u.progress?.readinessStatus);
    console.log("learningLevel:", u.progress?.learningLevel);
  } else {
    console.log("No user found:", data);
  }
}

test().catch(console.error);
