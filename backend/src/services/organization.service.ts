import { prisma } from "../config/prisma";
import bcrypt from "bcrypt";

export async function autoRegisterOrgFromProfile(orgName?: string | null) {
  if (!orgName || !orgName.trim()) return;
  const trimmed = orgName.trim();
  try {
    const existing = await prisma.organization.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (!existing) {
      const isCompany = /inc|ltd|corp|llc|tech|software|solutions|services|systems|gmbh|pvt|co\./i.test(trimmed);
      await prisma.organization.create({
        data: {
          name: trimmed,
          type: isCompany ? "COMPANY" : "UNIVERSITY",
          status: "ACTIVE",
        },
      });
    }
  } catch {
    // Best effort - skip duplicate race conditions
  }
}

export async function getAdminOrganizationsService() {
  let orgs: any[] = [];
  try {
    orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[getAdminOrganizationsService] organization table query error:", err);
    orgs = [];
  }

  let profilesWithCollege: any[] = [];
  try {
    profilesWithCollege = await prisma.profile.findMany({
      where: { AND: [{ college: { not: null } }, { college: { not: "" } }] },
      select: { college: true, userId: true, branch: true, degree: true },
    });
  } catch (err) {
    console.error("[getAdminOrganizationsService] profile query error:", err);
    profilesWithCollege = [];
  }

  // Map college name -> count & student IDs
  const profileMap = new Map<string, { count: number; userIds: Set<string> }>();
  for (const p of profilesWithCollege) {
    if (!p.college || !p.college.trim()) continue;
    const name = p.college.trim();
    const existing = profileMap.get(name.toLowerCase()) || { count: 0, userIds: new Set<string>() };
    existing.count += 1;
    existing.userIds.add(p.userId);
    profileMap.set(name.toLowerCase(), existing);
  }

  // Auto-sync any un-registered colleges from profiles into database (or virtual fallback)
  for (const [key, val] of profileMap.entries()) {
    const matched = orgs.find(o => o.name.toLowerCase() === key);
    if (!matched) {
      const isCompany = /inc|ltd|corp|llc|tech|software|solutions|services|systems|gmbh|pvt|co\./i.test(key);
      const rawName = profilesWithCollege.find(p => p.college?.toLowerCase() === key)?.college?.trim() || key;
      let createdOrg: any = null;
      try {
        createdOrg = await prisma.organization.create({
          data: {
            name: rawName,
            type: isCompany ? "COMPANY" : "UNIVERSITY",
            status: "ACTIVE",
          },
        });
      } catch {
        createdOrg = {
          id: `virtual_${key}`,
          name: rawName,
          type: isCompany ? "COMPANY" : "UNIVERSITY",
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };
      }
      orgs.push(createdOrg);
    }
  }

  // Compute student counts per organization
  const enrichedOrgs = orgs.map(org => {
    const key = org.name.toLowerCase();
    const profileStats = profileMap.get(key);
    const studentCount = profileStats ? profileStats.count : 0;
    return {
      ...org,
      studentCount,
    };
  });

  const totalUniversities = enrichedOrgs.filter(o => o.type === "UNIVERSITY").length;
  const totalCompanies = enrichedOrgs.filter(o => o.type === "COMPANY").length;
  const totalStudents = Array.from(profileMap.values()).reduce((sum, v) => sum + v.count, 0);

  return {
    organizations: enrichedOrgs,
    stats: {
      total: enrichedOrgs.length,
      totalUniversities,
      totalCompanies,
      totalStudents,
    },
  };
}

export async function createOrganizationService(data: {
  name: string;
  type?: string;
  code?: string;
  location?: string;
  domain?: string;
  contactEmail?: string;
}) {
  const trimmedName = data.name.trim();
  const existing = await prisma.organization.findFirst({
    where: { name: { equals: trimmedName, mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`Organization "${trimmedName}" already exists.`);
  }

  return prisma.organization.create({
    data: {
      name: trimmedName,
      type: (data.type || "UNIVERSITY").toUpperCase(),
      code: data.code?.trim() || null,
      location: data.location?.trim() || null,
      domain: data.domain?.trim() || null,
      contactEmail: data.contactEmail?.trim() || null,
      status: "ACTIVE",
    },
  });
}

export async function updateOrganizationService(id: string, data: {
  name?: string;
  type?: string;
  code?: string;
  location?: string;
  domain?: string;
  contactEmail?: string;
  status?: string;
}) {
  return prisma.organization.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.type && { type: data.type.toUpperCase() }),
      ...(data.code !== undefined && { code: data.code?.trim() || null }),
      ...(data.location !== undefined && { location: data.location?.trim() || null }),
      ...(data.domain !== undefined && { domain: data.domain?.trim() || null }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail?.trim() || null }),
      ...(data.status && { status: data.status.toUpperCase() }),
    },
  });
}

export async function deleteOrganizationService(id: string) {
  return prisma.organization.delete({
    where: { id },
  });
}

export async function getOrganizationStudentsService(orgIdOrName: string) {
  let orgName = orgIdOrName;
  let org: any = null;
  try {
    org = await prisma.organization.findFirst({
      where: { OR: [{ id: orgIdOrName }, { name: { equals: orgIdOrName, mode: "insensitive" } }] },
    });
    if (org) orgName = org.name;
  } catch {
    org = null;
  }

  const profiles = await prisma.profile.findMany({
    where: { college: { equals: orgName, mode: "insensitive" } },
    select: {
      userId: true,
      college: true,
      branch: true,
      degree: true,
      graduationYear: true,
      location: true,
      phone: true,
    },
  });

  const userIds = profiles.map(p => p.userId);
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          createdAt: true,
        },
      })
    : [];

  const profileMap = new Map(profiles.map(p => [p.userId, p]));
  const students = users.map(user => ({
    ...user,
    profile: profileMap.get(user.id) || null,
  }));

  return {
    orgName,
    organization: org || null,
    totalStudents: students.length,
    students,
  };
}

export async function bulkRegisterStudentsService(orgName: string, studentsInput: Array<{ email: string; name?: string; branch?: string; degree?: string }>) {
  await autoRegisterOrgFromProfile(orgName);

  const registered: any[] = [];
  const errors: string[] = [];

  for (const s of studentsInput) {
    if (!s.email || !s.email.trim()) continue;
    const email = s.email.trim().toLowerCase();
    const name = s.name?.trim() || email.split("@")[0] || "Student";

    try {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const hashedPassword = await bcrypt.hash("Password123!", 10);
        user = await prisma.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            role: "USER",
            plan: "free",
          },
        });
      }

      // Upsert profile with college
      await prisma.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          college: orgName,
          branch: s.branch?.trim() || null,
          degree: s.degree?.trim() || null,
        },
        update: {
          college: orgName,
          ...(s.branch && { branch: s.branch.trim() }),
          ...(s.degree && { degree: s.degree.trim() }),
        },
      });

      registered.push({ id: user.id, name: user.name, email: user.email });
    } catch (err: any) {
      errors.push(`Failed to register ${email}: ${err.message}`);
    }
  }

  return {
    success: true,
    orgName,
    registeredCount: registered.length,
    registered,
    errors,
  };
}
