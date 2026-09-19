import "dotenv/config";
import { masterPrisma } from "../src/utils/prisma";

async function cleanPrefixes() {
  console.log("===============================================================");
  console.log("Stripping [Topic Test X • QY] Prefixes from Database Questions");
  console.log("===============================================================");

  // 1. Clean aptitudeTopicTest
  const topicTests = await masterPrisma.aptitudeTopicTest.findMany();
  console.log(`Found ${topicTests.length} tests in aptitudeTopicTest.`);

  let testsUpdated = 0;
  let totalQuestionsCleaned = 0;

  for (const t of topicTests) {
    const qs = Array.isArray(t.questionsJson) ? t.questionsJson : [];
    let modified = false;

    const cleaned = qs.map((q: any) => {
      const orig = q.text || "";
      const stripped = orig.replace(/^\[[^\]]*\]\s*/, "").trim();
      if (stripped !== orig) {
        modified = true;
        totalQuestionsCleaned++;
      }
      return {
        ...q,
        text: stripped,
      };
    });

    if (modified) {
      await masterPrisma.aptitudeTopicTest.update({
        where: { id: t.id },
        data: {
          questionsJson: cleaned as any,
        },
      });
      testsUpdated++;
    }
  }

  console.log(`✓ Updated ${testsUpdated} tests in aptitudeTopicTest.`);
  console.log(`✓ Stripped prefixes from ${totalQuestionsCleaned} questions.`);

  // 2. Clean any existing user sessions in aptitudeSession
  const sessions = await masterPrisma.aptitudeSession.findMany({
    select: { id: true, questionsJson: true },
  });
  console.log(`\nFound ${sessions.length} sessions in aptitudeSession.`);
  let sessionsUpdated = 0;

  for (const s of sessions) {
    const qs = Array.isArray(s.questionsJson) ? s.questionsJson : [];
    let modified = false;

    const cleaned = qs.map((q: any) => {
      const orig = q?.text || "";
      const stripped = orig.replace(/^\[[^\]]*\]\s*/, "").trim();
      if (stripped !== orig) {
        modified = true;
      }
      return {
        ...q,
        text: stripped,
      };
    });

    if (modified) {
      await masterPrisma.aptitudeSession.update({
        where: { id: s.id },
        data: {
          questionsJson: cleaned as any,
        },
      });
      sessionsUpdated++;
    }
  }

  console.log(`✓ Updated ${sessionsUpdated} user sessions in aptitudeSession.`);
  console.log("===============================================================");
  console.log("Done! All question texts are now completely clean without prefixes.");
}

cleanPrefixes()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());
