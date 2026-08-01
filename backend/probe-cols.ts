import { prisma } from "./src/config/prisma";

async function main() {
  const cols: { table_name: string; column_name: string; data_type: string }[] =
    await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('blacklisted_tokens','users','payments','profiles','password_reset_tokens')
      ORDER BY table_name, ordinal_position
    `);
  console.log(JSON.stringify(cols, null, 2));
}

main().catch((e) => { console.error("ERR:", e); process.exit(1); });
