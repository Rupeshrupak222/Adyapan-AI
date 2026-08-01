import bcrypt from "bcrypt";
import { prisma } from "./src/config/prisma";

async function main() {
  const p: any = prisma;
  const email = "testadmin@adyapan.dev";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Test admin user already exists:", existing.id);
  } else {
    const hash = await bcrypt.hash("TestAdmin@123", 12);
    const user = await prisma.user.create({
      data: { name: "Test Admin", email, password: hash, role: "ADMIN", profile: { create: {} } },
    });
    console.log("Created test user:", user.id);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("no user");

  const role = await p.adminRole.upsert({
    where: { name: "Super Admin" },
    update: {},
    create: { name: "Super Admin", description: "Full platform access", isSystem: true },
  });

  await p.adminUser.upsert({
    where: { email },
    update: { status: "ACTIVE", roleId: role.id, password: user.password },
    create: { id: user.id, name: user.name, email, password: user.password, roleId: role.id, status: "ACTIVE" },
  });

  await p.adminPreference.upsert({
    where: { adminId: user.id },
    update: {},
    create: { adminId: user.id, theme: "dark", dashboardConfig: {} },
  });

  console.log("Test admin ready:", email, "/ TestAdmin@123");
}

main().catch((e) => { console.error("SEED ERROR:", e); process.exit(1); });
