import { prisma } from "./src/config/prisma";

async function main() {
  const p: any = prisma;

  const role = await p.adminRole.upsert({
    where: { name: "Super Admin" },
    update: {},
    create: {
      name: "Super Admin",
      description: "Full platform access",
      isSystem: true,
    },
  });

  const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!user) {
    console.log("No ADMIN user found in users table.");
    return;
  }

  const admin = await p.adminUser.upsert({
    where: { email: user.email },
    update: { status: "ACTIVE", roleId: role.id, password: user.password },
    create: {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      roleId: role.id,
      status: "ACTIVE",
    },
  });

  await p.adminPreference.upsert({
    where: { adminId: admin.id },
    update: {},
    create: { adminId: admin.id, theme: "dark", dashboardConfig: {} },
  });

  console.log("Seeded admin:", JSON.stringify({ id: admin.id, name: admin.name, email: admin.email, role: role.name }));
}

main().catch((e) => { console.error("SEED ERROR:", e); process.exit(1); });
