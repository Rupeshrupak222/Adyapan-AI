import { prisma } from "./src/config/prisma";

async function main() {
  try {
    const r = await prisma.blacklistedToken.findUnique({ where: { token: "test-token-xyz" } });
    console.log("OK:", r);
  } catch (e: any) {
    console.log("ERROR TYPE:", e.constructor.name);
    console.log("ERROR FULL:", e.message);
  }
}

main().catch(() => process.exit(1));
