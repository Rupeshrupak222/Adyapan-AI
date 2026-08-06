type ProfileCompletionInput = {
  username?: string | null;
  phone?: string | null;
  college?: string | null;
  branch?: string | null;
  year?: string | null;
  degree?: string | null;
  graduationYear?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  department?: string | null;
  course?: string | null;
  semester?: string | null;
  studentId?: string | null;
  referralCode?: string | null;
  photoUrl?: string | null;
  github?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  careerGoal?: string | null;
  targetRole?: string | null;
  aboutMe?: string | null;
  careerObjective?: string | null;
  location?: string | null;
  skills?: string[];
  interestedDomains?: string[];
};

const STRING_FIELDS: ReadonlyArray<keyof ProfileCompletionInput> = [
  "username",
  "phone",
  "college",
  "branch",
  "year",
  "degree",
  "graduationYear",
  "country",
  "state",
  "city",
  "department",
  "course",
  "semester",
  "studentId",
  "referralCode",
  "photoUrl",
  "github",
  "linkedin",
  "portfolio",
  "careerGoal",
  "targetRole",
  "aboutMe",
  "careerObjective",
  "location",
];

export function calculateProfileCompletion(profile: ProfileCompletionInput): number {
  const total = STRING_FIELDS.length + 2;
  let filled = 0;

  for (const field of STRING_FIELDS) {
    const value = profile[field];
    if (typeof value === "string" && value.trim()) filled += 1;
  }

  if (Array.isArray(profile.skills) && profile.skills.length > 0) filled += 1;
  if (Array.isArray(profile.interestedDomains) && profile.interestedDomains.length > 0) filled += 1;

  return Math.round((filled / total) * 100);
}
