import { databaseService } from "./src/services/database.service";
import { prisma } from "./src/config/prisma";

async function main() {
  const dbs = await databaseService.listDatabases();
  const userDbs = dbs.filter((d) => d.name.startsWith("user_"));
  console.log("Total DBs:", dbs.length, "| user DBs:", userDbs.length);
  userDbs.slice(0, 10).forEach((d) => console.log(" -", d.name));

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log("Users in master:", users.length);
  users.slice(0, 10).forEach((u) => console.log("  user id:", u.id, u.email));
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
