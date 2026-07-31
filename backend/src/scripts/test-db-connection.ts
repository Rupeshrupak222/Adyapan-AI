import { prisma } from "../config/prisma";

async function testConnection() {
  try {
    console.log("Testing PostgreSQL query via Prisma Client...");
    const userCount = await prisma.user.count();
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const paymentCount = await prisma.payment.count();

    console.log("\n==========================================");
    console.log("SUCCESS: PostgreSQL Database Connected!");
    console.log("==========================================");
    console.log(`- Total Users: ${userCount}`);
    console.log(`- Admin Users: ${adminCount}`);
    console.log(`- Total Payments: ${paymentCount}`);
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Database connection failure:", error);
    process.exit(1);
  }
}

testConnection();
