import { getUserPrisma } from "../src/config/dynamicPrisma";
import { prisma } from "../src/config/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: "kapish", mode: "insensitive" } },
  });
  console.log("User:", user?.id, user?.email, user?.name);
  if (!user) return;

  const userPrisma = await getUserPrisma(user.id);
  const piUserPrisma = await userPrisma.placementIntelligence.findMany({
    where: { userId: user.id },
  }).catch((e: any) => ({ error: e.message }));
  console.log("userPrisma.placementIntelligence:", JSON.stringify(piUserPrisma, null, 2));

  const piMaster = await (prisma as any).placementIntelligence?.findMany({
    where: { userId: user.id },
  }).catch((e: any) => ({ error: e.message }));
  console.log("prisma.placementIntelligence:", JSON.stringify(piMaster, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
