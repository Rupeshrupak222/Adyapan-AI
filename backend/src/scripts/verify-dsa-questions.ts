import { prisma } from "../config/prisma";

async function verify() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Connection attempt ${attempt}...`);
      const total = await prisma.codingQuestion.count();
      const curated = await prisma.codingQuestion.count({ where: { source: "curated_dsa" } });
      const oldCodeforces = await prisma.codingQuestion.count({ where: { source: { not: "curated_dsa" } } });
      
      console.log(`Total Questions: ${total}`);
      console.log(`Curated DSA Questions: ${curated}`);
      console.log(`Old Codeforces Questions: ${oldCodeforces}`);

      const sample = await prisma.codingQuestion.findFirst({ where: { externalId: "DSA-001" } });
      if (sample) {
        console.log("Sample DSA-001:", {
          title: sample.title,
          topic: sample.topic,
          difficulty: sample.difficulty,
          statementSnippet: sample.statement?.slice(0, 100),
          examples: sample.examples,
          visibleTestCases: sample.visibleTestCases,
          hiddenTestCases: sample.hiddenTestCases,
        });
      }

      if (oldCodeforces > 0) {
        console.log(`Removing ${oldCodeforces} old Codeforces questions from database...`);
        const deleted = await prisma.codingQuestion.deleteMany({
          where: { source: { not: "curated_dsa" } }
        });
        console.log(`Deleted ${deleted.count} old Codeforces questions.`);
      }

      await prisma.$disconnect();
      return;
    } catch (err: any) {
      console.warn(`Attempt ${attempt} error:`, err.message);
      if (attempt < 3) {
        await new Promise(res => setTimeout(res, 3000));
      } else {
        throw err;
      }
    }
  }
}

verify().catch(console.error);

