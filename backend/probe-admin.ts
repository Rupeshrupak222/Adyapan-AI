import { prisma } from "./src/config/prisma";

async function main() {
  const p: any = prisma;

  const [users, admins, payments, paidPayments, adminUsers, adminNotifications, adminLoginHistory, jobs, codingQuestions, plans] =
    await Promise.all([
      p.user.count(),
      p.user.count({ where: { role: "ADMIN" } }),
      p.payment.count(),
      p.payment.count({ where: { status: "paid" } }),
      p.adminUser.count().catch((e: any) => `ERR adminUser: ${e.message}`),
      p.adminNotification.count().catch((e: any) => `ERR adminNotification: ${e.message}`),
      p.adminLoginHistory.count().catch((e: any) => `ERR adminLoginHistory: ${e.message}`),
      p.discoveryJob.count().catch((e: any) => `ERR discoveryJob: ${e.message}`),
      p.codingQuestion.count().catch((e: any) => `ERR codingQuestion: ${e.message}`),
      p.plan.count().catch((e: any) => `ERR plan: ${e.message}`),
    ]);

  console.log(JSON.stringify({
    users, admins, payments, paidPayments, adminUsers, adminNotifications, adminLoginHistory, jobs, codingQuestions, plans,
  }, null, 2));

  const adminsList = await p.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true } });
  console.log("ADMIN USERS:", JSON.stringify(adminsList, null, 2));

  try {
    await p.adminUser.findUnique({ where: { id: undefined } });
    console.log("findUnique id=undefined: OK (no throw)");
  } catch (e: any) {
    console.log("findUnique id=undefined THREW:", e.message?.slice(0, 200));
  }
}

main().catch((e) => { console.error("PROBE ERROR:", e); process.exit(1); });
