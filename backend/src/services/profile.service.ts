import { prisma } from "../config/prisma";

type ProfileInput = {
  username?: string;
  phone?: string;
  location?: string;
  aboutMe?: string;
  college?: string;
  branch?: string;
  degree?: string;
  year?: string;
  graduationYear?: string;
  skills?: unknown;
  interestedDomains?: unknown;
  targetRole?: string;
  careerGoal?: string;
  careerObjective?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  resumeName?: string;
};

function normalizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((s) => String(s).trim()).filter(Boolean);
}

export async function getProfile(userId: string) {
  let profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      },
    },
  });

  if (!profile && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (user) {
      profile = await prisma.profile.create({
        data: {
          userId,
          username: user.name ? user.name.toLowerCase().replace(/\s+/g, "") : `user_${userId.slice(0, 6)}`,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, createdAt: true },
          },
        },
      });
    }
  }

  return profile;
}

import { autoRegisterOrgFromProfile } from "./organization.service";

export async function upsertProfile(userId: string, input: ProfileInput) {
  if (input.college) {
    autoRegisterOrgFromProfile(input.college).catch(() => {});
  }

  const data = {
    username: input.username,
    phone: input.phone,
    location: input.location,
    aboutMe: input.aboutMe,
    college: input.college,
    branch: input.branch,
    degree: input.degree,
    year: input.year,
    graduationYear: input.graduationYear,
    skills: normalizeStringArray(input.skills),
    interestedDomains: normalizeStringArray(input.interestedDomains),
    targetRole: input.targetRole,
    careerGoal: input.careerGoal,
    careerObjective: input.careerObjective,
    linkedin: input.linkedin,
    github: input.github,
    portfolio: input.portfolio,
    ...(input.resumeUrl !== undefined && { resumeUrl: input.resumeUrl }),
    ...(input.resumeName !== undefined && { resumeName: input.resumeName }),
  };

  return prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export function clearResume(userId: string) {
  return prisma.profile.update({
    where: { userId },
    data: { resumeUrl: null, resumeName: null },
  });
}
