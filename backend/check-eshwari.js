const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'eshwari', mode: 'insensitive' } },
    include: {
      profile: true,
      _count: true,
    },
  });

  if (!user) {
    console.log('No user found');
    return;
  }

  console.log('User found:', {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    counts: user._count,
  });

  const interviews = await prisma.interviewSession.findMany({
    where: { userId: user.id },
    include: { evaluations: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${interviews.length} interviews (showing up to 10):`);
  interviews.forEach((iv, idx) => {
    console.log(`[${idx + 1}] ID: ${iv.id}, Status: ${iv.status}, Role: ${iv.role}, Evaluations:`, iv.evaluations, 'Feedback:', iv.feedback);
  });

  const quizzes = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
  });
  console.log(`Found ${quizzes.length} quiz attempts:`, quizzes);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
