# Daily Automatic Test Generation Guide

**Created:** September 13, 2026  
**Purpose:** Setup and manage automatic daily test generation for all topics/companies

---

## 📋 Overview

This system automatically generates new tests every day for:
- **AI Aptitude Engine:** 38 topics + 5 companies = 43 test sets
- **Technical MCQs:** 43 technologies + 16 companies = 59 test sets
- **Total:** 102 test sets × 1 new test/day = **102 new tests daily!**

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install node-cron cron-parser @types/node-cron
```

### 2. Generate Test #2 (One-Time Setup)

Run this once to create Test #2 for all topics:

```bash
npm run generate:test2
```

**Expected Output:**
```
======================================================================
  GENERATING TEST #2 FOR ALL TOPICS AND COMPANIES
======================================================================

📚 PART 1: AI APTITUDE ENGINE
──────────────────────────────────────────────────────────────────────

📂 Category: QUANTITATIVE

[Aptitude] Generating Test #2 for: Number System (quantitative)
  Found 30 existing questions from Test #1
  Generated 30 unique questions
  ✓ Created Test #2 (ID: apt-xyz) with 30 questions
  
... (continues for all topics)

📊 SUMMARY:
  ✓ Aptitude tests generated: 43
  ✓ Technical tests generated: 59
  ✓ Total tests: 102
✅ All Test #2 generation complete!
```

### 3. Enable Daily Auto-Generation

Add this to your `backend/src/index.ts` (main server file):

```typescript
import { startTestGenerationScheduler } from "./jobs/test-generation-scheduler";

// ... your existing code ...

// Start the daily test generation scheduler
if (process.env.ENABLE_DAILY_TEST_GENERATION !== "false") {
  startTestGenerationScheduler();
  console.log("✓ Daily test generation scheduler activated");
}
```

### 4. Configure Schedule (Optional)

Set environment variables in `.env`:

```env
# Daily test generation configuration
ENABLE_DAILY_TEST_GENERATION=true
TEST_GENERATION_CRON=0 2 * * *  # 2:00 AM daily
TZ=Asia/Kolkata  # Timezone for scheduling
```

### 5. Test the Scheduler (Dry Run)

```bash
npm run generate:dry-run
```

This shows what would be generated without actually creating tests.

---

## 📂 File Structure

```
backend/
├── scripts/
│   ├── generate-test-2.ts          # One-time Test #2 generation
│   └── daily-test-generator.ts     # Daily auto-generation script
├── src/
│   └── jobs/
│       └── test-generation-scheduler.ts  # Cron scheduler
├── logs/
│   ├── daily-test-generation.log   # Auto-generated logs
│   └── scheduler-errors.log         # Error logs
└── package.json                     # Updated with new scripts
```

---

## 🛠️ Available Scripts

### `npm run generate:test2`
**Purpose:** Generate Test #2 for ALL topics/companies (one-time)  
**When to use:** Initial setup or if Test #2 is missing  
**Duration:** ~30-45 minutes (102 tests with AI generation)  
**Output:** Creates Test #2 in database for all topics

### `npm run generate:daily`
**Purpose:** Generate next test for ALL topics/companies (manual trigger)  
**When to use:** Test the daily generation manually  
**Duration:** ~30-45 minutes  
**Output:** Creates Test #3, #4, #5, etc. (incremental)

### `npm run generate:dry-run`
**Purpose:** Preview what would be generated without creating  
**When to use:** Testing/debugging  
**Duration:** ~2-3 minutes (fast, no DB writes)  
**Output:** Console log only, no database changes

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_DAILY_TEST_GENERATION` | `true` | Enable/disable scheduler |
| `TEST_GENERATION_CRON` | `0 2 * * *` | Cron schedule (2 AM daily) |
| `TZ` | `Asia/Kolkata` | Timezone for scheduler |
| `DRY_RUN` | `false` | Preview mode (no DB writes) |

### Cron Schedule Examples

```bash
# Every day at 2:00 AM
0 2 * * *

# Every day at 12:00 PM (noon)
0 12 * * *

# Every day at 9:00 PM
0 21 * * *

# Every 6 hours
0 */6 * * *

# Every Monday at 3:00 AM
0 3 * * 1

# Every day at midnight
0 0 * * *
```

**Format:** `minute hour day month weekday`

### Maximum Tests Limit

Default limit: **100 tests per topic**

Change in `backend/scripts/daily-test-generator.ts`:

```typescript
const CONFIG = {
  MAX_TESTS_PER_TOPIC: 100,  // Change this value
  // ...
};
```

---

## 📊 How It Works

### Test Generation Logic

```
┌─────────────────────────────────────────────┐
│  1. CHECK EXISTING TESTS                    │
│     - Find highest test number (e.g., #5)   │
│     - Calculate next: #6                    │
│     - Check if reached max limit (100)      │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  2. COLLECT EXISTING QUESTIONS              │
│     - Fetch all previous test questions     │
│     - Build existingQuestionTexts Set       │
│     - Used for anti-duplication             │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  3. GENERATE NEW QUESTIONS                  │
│     - Call AI with anti-duplication context │
│     - Filter duplicates post-generation     │
│     - Ensure 30 unique questions            │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  4. CREATE TEST IN DATABASE                 │
│     - Save with sequential test number      │
│     - Log success/failure                   │
│     - Continue to next topic                │
└─────────────────────────────────────────────┘
```

### Anti-Duplication Integration

The daily generator uses the same anti-duplication system:
- ✅ Topic-level tracking (all previous test questions)
- ✅ AI-aware generation (sends existing questions to AI)
- ✅ Post-generation filtering (removes any duplicates)
- ✅ Guaranteed 30 unique questions per test

---

## 📝 Logs & Monitoring

### Log Files

**Daily Generation Log:** `backend/logs/daily-test-generation.log`

```
[2026-09-13T02:00:01.123Z] [INFO] ======================================================================
[2026-09-13T02:00:01.234Z] [INFO] DAILY AUTOMATIC TEST GENERATION STARTED
[2026-09-13T02:00:01.345Z] [INFO] ======================================================================
[2026-09-13T02:00:02.456Z] [INFO] Generating Aptitude Test #3 for: Number System (quantitative)
[2026-09-13T02:00:02.567Z] [INFO]   Found 60 existing questions
[2026-09-13T02:00:15.678Z] [SUCCESS]   Created Test #3 (ID: apt-abc-123) with 30 questions
... (continues)
[2026-09-13T02:32:45.789Z] [INFO] ======================================================================
[2026-09-13T02:32:45.890Z] [INFO] DAILY GENERATION COMPLETE
[2026-09-13T02:32:45.901Z] [INFO] ======================================================================
[2026-09-13T02:32:46.012Z] [INFO] 📊 Aptitude Tests: 43 created, 0 skipped
[2026-09-13T02:32:46.123Z] [INFO] 📊 Technical Tests: 59 created, 0 skipped
[2026-09-13T02:32:46.234Z] [INFO] 📊 Total: 102 new tests created
```

**Scheduler Error Log:** `backend/logs/scheduler-errors.log`

```
[2026-09-13T02:00:01.123Z] ERROR: Failed to generate test for Python
Error: AI generation timeout
...
```

### Monitoring Commands

```bash
# Check if scheduler is running
ps aux | grep "node.*index.js"

# View recent logs (last 50 lines)
tail -n 50 backend/logs/daily-test-generation.log

# View errors only
grep "ERROR" backend/logs/daily-test-generation.log

# Count tests generated today
grep "Created Test" backend/logs/daily-test-generation.log | grep "$(date +%Y-%m-%d)" | wc -l

# Check scheduler status in server logs
tail -f backend/logs/server.log | grep "\[Scheduler\]"
```

### Database Queries

```typescript
// Check test count per topic
const aptitudeTestCounts = await masterPrisma.aptitudeTopicTest.groupBy({
  by: ['topic'],
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } }
});

console.log(aptitudeTestCounts);
// Output: [{ topic: 'Percentages', _count: { id: 15 } }, ...]

// Find latest test number for a topic
const latestTest = await masterPrisma.aptitudeTopicTest.findFirst({
  where: { topic: 'Percentages' },
  orderBy: { testNumber: 'desc' }
});

console.log(`Latest test: #${latestTest.testNumber}`);
```

---

## 🧪 Testing

### Manual Testing

```bash
# Step 1: Dry run to preview
npm run generate:dry-run

# Step 2: Generate actual tests (careful!)
npm run generate:daily

# Step 3: Check logs
tail -n 100 backend/logs/daily-test-generation.log

# Step 4: Verify in database
# (Use your DB client to check test counts)
```

### Automated Testing

Create `backend/tests/daily-generator.test.ts`:

```typescript
import { describe, test, expect } from '@jest/globals';
import { masterPrisma } from '../src/utils/prisma';

describe('Daily Test Generator', () => {
  test('should not create duplicate questions', async () => {
    const tests = await masterPrisma.aptitudeTopicTest.findMany({
      where: { topic: 'Percentages' },
      orderBy: { testNumber: 'asc' }
    });
    
    const allQuestions = tests.flatMap(t => 
      (t.questionsJson as any[]).map(q => q.text.toLowerCase().trim())
    );
    
    const uniqueQuestions = new Set(allQuestions);
    
    expect(allQuestions.length).toBe(uniqueQuestions.size);
  });
  
  test('should generate sequential test numbers', async () => {
    const tests = await masterPrisma.aptitudeTopicTest.findMany({
      where: { topic: 'Percentages' },
      orderBy: { testNumber: 'asc' }
    });
    
    const testNumbers = tests.map(t => t.testNumber);
    const expected = Array.from({ length: tests.length }, (_, i) => i + 1);
    
    expect(testNumbers).toEqual(expected);
  });
});
```

Run tests:
```bash
npm test -- daily-generator.test.ts
```

---

## 🚨 Troubleshooting

### Issue: Scheduler not running

**Diagnosis:**
```bash
# Check if scheduler is imported in main file
grep "startTestGenerationScheduler" backend/src/index.ts

# Check environment variable
grep "ENABLE_DAILY_TEST_GENERATION" backend/.env
```

**Fix:**
1. Add scheduler import to `backend/src/index.ts`
2. Set `ENABLE_DAILY_TEST_GENERATION=true` in `.env`
3. Restart server

### Issue: Tests not being generated

**Diagnosis:**
```bash
# Check logs for errors
tail -n 100 backend/logs/daily-test-generation.log | grep "ERROR"

# Check if max limit reached
# (Run query to count tests per topic)
```

**Fix:**
1. Check logs for specific error messages
2. Verify AI API keys are valid (OpenRouter)
3. Increase `MAX_TESTS_PER_TOPIC` if needed
4. Check database connection

### Issue: Duplicate questions appearing

**Diagnosis:**
```bash
# Run duplicate check query
npx tsx -e "
const { masterPrisma } = require('./src/utils/prisma');
(async () => {
  const tests = await masterPrisma.aptitudeTopicTest.findMany({ 
    where: { topic: 'Percentages' } 
  });
  const questions = tests.flatMap(t => t.questionsJson.map(q => q.text));
  const duplicates = questions.filter((q, i) => questions.indexOf(q) !== i);
  console.log('Duplicates found:', duplicates.length);
})();
"
```

**Fix:**
1. Verify anti-duplication system is working (check service files)
2. Re-run generation with clean database
3. Check if `existingQuestionTexts` is being passed correctly

### Issue: Generation taking too long

**Expected Time:** ~30-45 minutes for 102 tests

**Optimizations:**
1. Reduce `DELAY_BETWEEN_REQUESTS_MS` (default 500ms)
2. Run in parallel (requires code modification)
3. Use faster AI model (already using MODELS.FAST)
4. Skip topics that reached max limit

### Issue: AI generation failures

**Symptoms:** Many "AI generation failed, using fallback" logs

**Fix:**
1. Check OpenRouter API key validity
2. Check API rate limits
3. Increase timeout in AI generation
4. Fallback system ensures tests are still created

---

## 📈 Performance & Scaling

### Resource Usage

| Metric | Value |
|--------|-------|
| Generation time | ~30-45 min/day |
| API calls | ~102 calls/day |
| Database writes | ~102 tests/day |
| Log file growth | ~5-10KB/day |

### Scaling Considerations

**10K users scenario:**
- Tests generated: 102/day
- User queries: ~1K-10K/day
- Tests consumed: ~500-1K/day
- Test growth rate: 102/day (37,230/year)
- Safe for 10 years: 372,300 tests

**Storage:**
- Per test: ~50KB (30 questions × ~1.5KB)
- Daily storage: 102 tests × 50KB = 5.1MB/day
- Yearly storage: 5.1MB × 365 = 1.86GB/year

**Conclusion:** Sustainable for long-term growth ✅

---

## 🔄 Maintenance

### Weekly Tasks

- [ ] Review logs for errors
- [ ] Check test generation success rate
- [ ] Monitor database growth
- [ ] Verify scheduler is running

### Monthly Tasks

- [ ] Analyze test usage patterns
- [ ] Review duplicate complaints (should be zero)
- [ ] Optimize slow-generating topics
- [ ] Archive old logs (>30 days)

### Yearly Tasks

- [ ] Review max test limit (increase if needed)
- [ ] Performance optimization review
- [ ] Database cleanup (if needed)
- [ ] Update topic/company lists

---

## 📞 Support

### Common Questions

**Q: Can I change the generation time?**  
A: Yes, update `TEST_GENERATION_CRON` in `.env`

**Q: Can I generate tests for specific topics only?**  
A: Yes, modify the topic arrays in `daily-test-generator.ts`

**Q: What happens if generation fails?**  
A: Error is logged, script continues with next topic. Retry next day.

**Q: Can I run generation multiple times per day?**  
A: Yes, but not recommended. Tests are sequential and cumulative.

**Q: How do I stop daily generation?**  
A: Set `ENABLE_DAILY_TEST_GENERATION=false` in `.env` and restart server

---

## ✅ Setup Checklist

- [ ] Dependencies installed (`node-cron`, `cron-parser`)
- [ ] Test #2 generated for all topics (`npm run generate:test2`)
- [ ] Scheduler added to main server file
- [ ] Environment variables configured
- [ ] Dry run tested successfully
- [ ] Logs directory created
- [ ] Monitoring set up
- [ ] Team trained on maintenance

---

## 🎉 Success Metrics

After setup, you should see:

✅ **102 new tests** generated daily  
✅ **Zero duplicate questions** across all tests  
✅ **Zero manual intervention** required  
✅ **Logs showing success** every morning  
✅ **Happy students** with fresh practice questions!

---

**Status:** Ready for Deployment  
**Last Updated:** September 13, 2026  
**Maintainer:** Dev Team
