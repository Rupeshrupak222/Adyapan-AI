import { prisma } from "./config/prisma";

async function run() {
  const invoices = await (prisma as any).invoice.findMany({
    orderBy: { issuedAt: "asc" },
  });

  console.log(`Total invoice records found: ${invoices.length}`);

  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  for (const inv of invoices) {
    const dateKey = inv.issuedAt ? new Date(inv.issuedAt).toISOString().slice(0, 10) : "";
    const key = `${inv.userId}_${inv.plan}_${inv.amount}_${dateKey}`;
    if (seen.has(key)) {
      duplicateIds.push(inv.id);
    } else {
      seen.add(key);
    }
  }

  console.log(`Identified ${duplicateIds.length} duplicate invoice records.`);

  if (duplicateIds.length > 0) {
    const deleted = await (prisma as any).invoice.deleteMany({
      where: { id: { in: duplicateIds } },
    });
    console.log(`Cleaned up ${deleted.count} duplicate invoice records from database.`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
