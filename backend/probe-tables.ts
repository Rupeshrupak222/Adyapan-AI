import { prisma } from "./src/config/prisma";

async function main() {
  const tables: { table_name: string }[] =
    await prisma.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
  console.log("TABLES IN MASTER DB:");
  console.log(tables.map((t) => t.table_name).join("\n"));
}

main().catch((e) => { console.error("ERR:", e); process.exit(1); });
