import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';

export interface ParsedQuestion {
  pageNumber: number;
  questionNumber: number;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  tags: string[];
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  approach: string;
  visibleTestCases: Array<{ input: string; expectedOutput: string }>;
  hiddenTestCasesGuidance: string;
  metadata: {
    unique_id: string;
    slug: string;
    difficulty: string;
    category: string;
    tags: string;
  };
}

export async function parseEasy100Pdf(): Promise<ParsedQuestion[]> {
  const pdfPath = path.resolve(__dirname, '../../../docs/easy_dsa_100_unique_questions.pdf');
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found at: ${pdfPath}`);
  }
  const buffer = fs.readFileSync(pdfPath);

  const pdfModule = require('pdf-parse');
  const PDFParseClass = pdfModule.PDFParse || (pdfModule.default && pdfModule.default.PDFParse);
  const parser = new PDFParseClass({ data: new Uint8Array(buffer) });
  await parser.load();

  const numPages = parser.doc.numPages;
  console.log(`[PDF Parser] Reading ${numPages} pages from ${pdfPath}...`);

  const questions: ParsedQuestion[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await parser.doc.getPage(pageNum);
    const content = await page.getTextContent();

    const items = content.items
      .filter((it: any) => 'str' in it && it.str !== undefined)
      .map((it: any) => ({
        str: it.str,
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
      }));

    // Group items into rows by y coordinate with tolerance of 3 points
    const rows: Array<{ y: number; items: typeof items }> = [];
    for (const item of items) {
      if (!item.str.trim()) continue;
      if (/^Page\s+\d+$/i.test(item.str.trim())) continue;
      if (/^--\s*\d+\s*of\s*100\s*--$/i.test(item.str.trim())) continue;

      let matchedRow = rows.find(r => Math.abs(r.y - item.y) <= 3);
      if (!matchedRow) {
        matchedRow = { y: item.y, items: [] };
        rows.push(matchedRow);
      }
      matchedRow.items.push(item);
    }

    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
    }

    let currentSection = 'header';
    let titleLine = '';
    let slugLine = '';
    const sectionTexts: Record<string, string[]> = {
      statement: [],
      constraints: [],
      inputFormat: [],
      outputFormat: [],
      approach: [],
      hiddenTestCases: [],
      metadata: [],
    };

    const testCaseRows: Array<{ inputParts: string[]; outputParts: string[] }> = [];

    for (const row of rows) {
      const lineText = row.items.map(it => it.str).join(' ').trim();
      if (!lineText) continue;

      if (pageNum === 1 && currentSection === 'header') {
        if (/^\d+\.\s+/.test(lineText)) {
          currentSection = 'title';
        } else {
          continue;
        }
      }

      if (/^(\d+)\.\s+(.+)$/.test(lineText) && (currentSection === 'header' || currentSection === 'title')) {
        titleLine = lineText;
        currentSection = 'meta_line';
        continue;
      }

      if (lineText.startsWith('Slug:') && currentSection === 'meta_line') {
        slugLine = lineText;
        continue;
      }

      if (lineText === 'Problem Statement') {
        currentSection = 'statement';
        continue;
      }
      if (lineText === 'Constraints') {
        currentSection = 'constraints';
        continue;
      }
      if (lineText === 'Input Format') {
        currentSection = 'inputFormat';
        continue;
      }
      if (lineText === 'Output Format') {
        currentSection = 'outputFormat';
        continue;
      }
      if (lineText === 'Approach / Explanation') {
        currentSection = 'approach';
        continue;
      }
      if (lineText === 'Visible Test Cases') {
        currentSection = 'visibleTestCases';
        continue;
      }
      if (lineText === 'Hidden Test Cases') {
        currentSection = 'hiddenTestCases';
        continue;
      }
      if (lineText.startsWith('Database metadata:')) {
        currentSection = 'metadata';
        sectionTexts.metadata.push(lineText);
        continue;
      }

      if (currentSection === 'visibleTestCases') {
        if (/Input\s+Expected\s+Output/i.test(lineText) || lineText === 'Input' || lineText === 'Expected Output') {
          continue;
        }
        const inputParts = row.items.filter(it => it.x < 250).map(it => it.str.trim()).filter(Boolean);
        const outputParts = row.items.filter(it => it.x >= 250).map(it => it.str.trim()).filter(Boolean);

        if (inputParts.length > 0 || outputParts.length > 0) {
          testCaseRows.push({ inputParts, outputParts });
        }
        continue;
      }

      if (sectionTexts[currentSection]) {
        sectionTexts[currentSection].push(lineText);
      }
    }

    const titleMatch = titleLine.match(/^(\d+)\.\s+(.+)$/);
    const qNum = titleMatch ? parseInt(titleMatch[1], 10) : pageNum;
    const qTitle = titleMatch ? titleMatch[2].trim() : `Problem ${pageNum}`;

    let slug = '';
    let category = 'Arrays';
    let difficulty = 'Easy';
    let tags: string[] = [];

    const slugMatch = slugLine.match(/Slug:\s*([^|]+)\s*\|\s*Category:\s*([^|]+)\s*\|\s*Difficulty:\s*([^|]+)\s*\|\s*Tags:\s*(.+)$/i);
    if (slugMatch) {
      slug = slugMatch[1].trim();
      category = slugMatch[2].trim();
      difficulty = slugMatch[3].trim();
      tags = slugMatch[4].split(',').map(t => t.trim()).filter(Boolean);
    }

    const metaLine = sectionTexts.metadata.join(' ');
    const metaUniqueId = metaLine.match(/unique_id=([^|\s]+)/)?.[1] || `E${String(pageNum).padStart(3, '0')}`;
    const metaSlug = metaLine.match(/slug=([^|\s]+)/)?.[1] || slug;
    const metaDiff = metaLine.match(/difficulty=([^|\s]+)/)?.[1] || difficulty;
    const metaCat = metaLine.match(/category=([^|]+?)(?=\s*\||\s*$)/)?.[1]?.trim() || category;
    const metaTags = metaLine.match(/tags=(.+)$/)?.[1]?.trim() || tags.join(', ');

    const visibleTests = testCaseRows.map(tc => ({
      input: tc.inputParts.join(' ').trim(),
      expectedOutput: tc.outputParts.join(' ').trim(),
    }));

    questions.push({
      pageNumber: pageNum,
      questionNumber: qNum,
      title: qTitle,
      slug: slug || metaSlug,
      category: category || metaCat,
      difficulty: difficulty || metaDiff,
      tags: tags.length > 0 ? tags : metaTags.split(',').map(t => t.trim()),
      statement: sectionTexts.statement.join('\n').trim(),
      constraints: sectionTexts.constraints.join(' ').trim(),
      inputFormat: sectionTexts.inputFormat.join(' ').trim(),
      outputFormat: sectionTexts.outputFormat.join(' ').trim(),
      approach: sectionTexts.approach.join(' ').trim(),
      visibleTestCases: visibleTests,
      hiddenTestCasesGuidance: sectionTexts.hiddenTestCases.join(' ').trim(),
      metadata: {
        unique_id: metaUniqueId,
        slug: metaSlug,
        difficulty: metaDiff,
        category: metaCat,
        tags: metaTags,
      },
    });
  }

  return questions;
}

export async function ingestEasy100() {
  console.log('[Ingestion] Starting parsing of easy_dsa_100_unique_questions.pdf...');
  const questions = await parseEasy100Pdf();

  if (questions.length !== 100) {
    throw new Error(`Expected exactly 100 questions, got ${questions.length}`);
  }

  console.log(`[Ingestion] Successfully parsed ${questions.length} questions.`);
  console.log(`[Ingestion] Updating questions #1 to #100 (DSA-001 to DSA-100) in database...`);

  let updatedCount = 0;
  let createdCount = 0;

  for (const q of questions) {
    const externalId = `DSA-${String(q.questionNumber).padStart(3, '0')}`;
    const fullTitle = `${q.questionNumber}. ${q.title}`;

    const examples = q.visibleTestCases.map((tc, idx) => ({
      input: tc.input,
      output: tc.expectedOutput,
      explanation: q.approach
        ? `${q.approach} (Test Case ${idx + 1})`
        : `Example case ${idx + 1} for ${q.title}.`
    }));

    const visibleTestCases = q.visibleTestCases.map((tc, idx) => ({
      testNumber: idx + 1,
      input: tc.input,
      expectedOutput: tc.expectedOutput
    }));

    const hiddenTestCases = q.visibleTestCases.map((tc, idx) => ({
      testNumber: idx + 1,
      input: tc.input,
      expectedOutput: tc.expectedOutput
    }));

    const existing = await prisma.codingQuestion.findUnique({
      where: { externalId },
      select: { id: true }
    });

    const questionRecord = await prisma.codingQuestion.upsert({
      where: { externalId },
      update: {
        title: fullTitle,
        topic: q.category,
        difficulty: q.difficulty,
        tagsJson: q.tags,
        statement: q.statement,
        constraints: q.constraints,
        inputFormat: q.inputFormat,
        outputFormat: q.outputFormat,
        examples,
        visibleTestCases,
        hiddenTestCases,
        source: 'curated_dsa',
        timeLimit: '2.0s',
        memoryLimit: '256 MB',
      },
      create: {
        externalId,
        title: fullTitle,
        topic: q.category,
        difficulty: q.difficulty,
        tagsJson: q.tags,
        statement: q.statement,
        constraints: q.constraints,
        inputFormat: q.inputFormat,
        outputFormat: q.outputFormat,
        examples,
        visibleTestCases,
        hiddenTestCases,
        source: 'curated_dsa',
        timeLimit: '2.0s',
        memoryLimit: '256 MB',
        placementImportance: false,
        interviewImportance: false,
      }
    });

    if (existing) {
      updatedCount++;
      // Invalidate cached AI analyses for this question so fresh explanations will be generated
      await prisma.questionAIAnalysis.deleteMany({
        where: { questionId: questionRecord.id }
      });
    } else {
      createdCount++;
    }
  }

  console.log(`[Ingestion] Done! Updated: ${updatedCount}, Created: ${createdCount}, Total: ${questions.length}`);
}

if (require.main === module) {
  ingestEasy100()
    .then(() => {
      console.log('Ingestion process completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Ingestion failed:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
