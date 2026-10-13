import { getUserPrisma } from "../src/config/dynamicPrisma";
import { prisma } from "../src/config/prisma";
import { adminDbService } from "../src/services/admin-db.service";

async function test() {
  const users = await prisma.user.findMany({
    where: { email: { contains: "kapish", mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      createdAt: true,
      updatedAt: true,
      profile: { select: { college: true, branch: true, year: true, targetRole: true, skills: true, profileCompletion: true } },
    },
  });

  const userIds = users.map(u => u.id);
  const userPrisma = await getUserPrisma();
  const placementRecords = await (userPrisma.placementIntelligence || (prisma as any).placementIntelligence)?.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, placementScore: true, subScores: true },
  }).catch(() => []);

  console.log("placementRecords found:", placementRecords);
  const placementMap = new Map((placementRecords || []).map((p: any) => [p.userId, p]));
  const plRec = placementMap.get(users[0].id);
  console.log("For user", users[0].email, ":");
  console.log("placementScore:", plRec?.placementScore);
  console.log("subScores:", plRec?.subScores);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
