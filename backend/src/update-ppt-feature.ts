import { prisma } from "./config/prisma";

async function run() {
  await (prisma as any).featureAccess.upsert({
    where: { featureKey: "ppt-generator" },
    create: {
      featureKey: "ppt-generator",
      name: "PPT Generator",
      description: "Generate presentation decks from notes.",
      category: "Learning Hub",
      requiredPlan: "free",
      routePattern: "/api/ppt",
      gated: false,
    },
    update: {
      requiredPlan: "free",
      gated: false,
    },
  });
  console.log("PPT Generator feature permissions updated to Enabled/All in database!");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
