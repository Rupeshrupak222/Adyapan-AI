import { prisma } from '../config/prisma';

async function verify() {
  const ids = ['DSA-001', 'DSA-010', 'DSA-025', 'DSA-050', 'DSA-075', 'DSA-100'];
  const qs = await prisma.codingQuestion.findMany({
    where: { externalId: { in: ids } },
    orderBy: { externalId: 'asc' }
  });

  console.log(`Fetched ${qs.length} sampled questions from database:`);
  for (const q of qs) {
    console.log(`\n======================================================`);
    console.log(`ID: ${q.externalId} | Title: ${q.title}`);
    console.log(`Topic: ${q.topic} | Difficulty: ${q.difficulty}`);
    console.log(`Tags:`, q.tagsJson);
    console.log(`Statement: ${q.statement}`);
    console.log(`Constraints: ${q.constraints}`);
    console.log(`Input Format: ${q.inputFormat}`);
    console.log(`Output Format: ${q.outputFormat}`);
    console.log(`Examples:`, JSON.stringify(q.examples, null, 2));
    console.log(`Visible Test Cases:`, JSON.stringify(q.visibleTestCases, null, 2));
    console.log(`Hidden Test Cases:`, JSON.stringify(q.hiddenTestCases, null, 2));
  }

  // Also verify total count of DSA questions
  const totalCount = await prisma.codingQuestion.count({
    where: { externalId: { startsWith: 'DSA-' } }
  });
  console.log(`\nTotal DSA questions in database: ${totalCount}`);
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
