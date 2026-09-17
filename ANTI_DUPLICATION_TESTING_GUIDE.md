# Anti-Duplication Testing Guide

**Created:** September 13, 2026  
**Purpose:** Verify that all test generation modules now have zero question duplication

---

## ✅ Modules with Anti-Duplication

1. **AI Aptitude Engine** ✅ (Already implemented)
2. **Technical MCQs** ✅ (Already implemented)
3. **Placement Service** ✅ (NEW - Just implemented)
4. **Reasoning Service** ✅ (NEW - Just implemented)

---

## 🔍 How Anti-Duplication Works

### Two-Layer Defense System

#### Layer 1: Topic/Category Level Tracking
- Tracks all questions ever generated for each topic
- Prevents same question appearing in different tests for same topic
- Storage: In-memory `topicQuestionHistory` Map

#### Layer 2: User Level Tracking  
- Tracks last 100 questions each user has seen
- Prevents same question appearing across different topics for same user
- Storage: In-memory `userQuestionHistory` Map
- Auto-trimmed to last 100 questions per user

### AI-Powered Prevention
- Existing questions (up to 30) sent to AI in prompt
- AI instructed with "CRITICAL ANTI-DUPLICATION REQUIREMENT"
- Post-generation filtering removes any duplicates that slip through

### Deduplication Algorithm
```typescript
// Normalize question text (lowercase, remove special chars, first 100 chars)
const normalized = text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").slice(0, 100);

// Check against combined set
const allExisting = new Set([
  ...topicQuestions,      // All questions for this topic
  ...userSeenQuestions,   // Last 100 user saw
  ...existingTestQuestions // Current test questions
]);

// Filter unique
const unique = generated.filter(q => !allExisting.has(normalize(q.text)));
```

---

## 🧪 Testing Instructions

### Test 1: Placement Service - Same Topic, Multiple Sessions

**Endpoint:** `POST /api/placement/practice/start`

**Test Steps:**
```bash
# Test 1: Generate first practice session
curl -X POST http://localhost:5000/api/placement/practice/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Percentages",
    "category": "aptitude",
    "count": 10
  }'

# Save question texts from response

# Test 2: Generate second session (same topic, same user)
curl -X POST http://localhost:5000/api/placement/practice/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Percentages",
    "category": "aptitude",
    "count": 10
  }'

# Test 3: Generate third session (same topic, same user)
curl -X POST http://localhost:5000/api/placement/practice/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Percentages",
    "category": "aptitude",
    "count": 10
  }'
```

**Expected Result:**
- ✅ All 30 questions (10 × 3 sessions) should be COMPLETELY UNIQUE
- ✅ No duplicate question texts across sessions
- ✅ Backend logs should show: `[Placement] Found X existing questions to avoid duplicates`

---

### Test 2: Placement Service - Mock Test (Cross-Section)

**Endpoint:** `POST /api/placement/mock-test`

**Test Steps:**
```bash
# Generate mock test with multiple sections
curl -X POST http://localhost:5000/api/placement/mock-test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "TCS",
    "sections": [
      {"name": "Aptitude", "topic": "Percentages", "questionCount": 10},
      {"name": "Reasoning", "topic": "Puzzles", "questionCount": 10},
      {"name": "Technical", "topic": "Data Structures", "questionCount": 10}
    ]
  }'

# Generate another mock test (same company, same user)
curl -X POST http://localhost:5000/api/placement/mock-test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "TCS",
    "sections": [
      {"name": "Aptitude", "topic": "Percentages", "questionCount": 15},
      {"name": "Reasoning", "topic": "Puzzles", "questionCount": 10},
      {"name": "Technical", "topic": "Data Structures", "questionCount": 10}
    ]
  }'
```

**Expected Result:**
- ✅ No duplicates WITHIN each mock test (across sections)
- ✅ No duplicates BETWEEN mock tests for same topic
- ✅ Total unique questions across both tests

---

### Test 3: Reasoning Service - AI Generated Questions

**Endpoint:** `POST /api/reasoning/generate`

**Test Steps:**
```bash
# Test 1: Generate Blood Relations questions
curl -X POST http://localhost:5000/api/reasoning/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate Blood Relations questions for TCS placement",
    "topic": "Blood Relations",
    "company": "TCS",
    "count": 5
  }'

# Test 2: Generate more Blood Relations (same user, same topic)
curl -X POST http://localhost:5000/api/reasoning/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate Blood Relations questions for TCS placement",
    "topic": "Blood Relations",
    "company": "TCS",
    "count": 5
  }'

# Test 3: Generate third batch
curl -X POST http://localhost:5000/api/reasoning/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate Blood Relations questions for TCS placement",
    "topic": "Blood Relations",
    "company": "TCS",
    "count": 5
  }'
```

**Expected Result:**
- ✅ All 15 questions should be unique
- ✅ Backend logs: `[Reasoning] Found X existing questions to avoid duplicates`
- ✅ Backend logs: `[Reasoning] Generated X questions, Y unique after filtering`

---

### Test 4: User-Level Cross-Topic Tracking

**Purpose:** Verify user never sees same question even across different topics

**Test Steps:**
```bash
# User generates Percentages questions
curl -X POST http://localhost:5000/api/placement/practice/start \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Percentages", "category": "aptitude", "count": 10}'

# Same user generates Profit & Loss questions
curl -X POST http://localhost:5000/api/placement/practice/start \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Profit & Loss", "category": "aptitude", "count": 10}'

# User goes back to Percentages
curl -X POST http://localhost:5000/api/placement/practice/start \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Percentages", "category": "aptitude", "count": 10}'
```

**Expected Result:**
- ✅ User A never sees same question across all 3 sessions
- ✅ Even when returning to "Percentages", old questions are avoided
- ✅ User history tracked: last 100 questions

---

### Test 5: Multi-User Isolation

**Purpose:** Verify different users can get same questions (topic-level tracking independent)

**Test Steps:**
```bash
# User A generates questions
curl -X POST http://localhost:5000/api/placement/practice/start \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Percentages", "category": "aptitude", "count": 10}'

# User B generates questions (same topic)
curl -X POST http://localhost:5000/api/placement/practice/start \
  -H "Authorization: Bearer USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Percentages", "category": "aptitude", "count": 10}'
```

**Expected Result:**
- ✅ User A and User B can have SOME overlapping questions (this is OK!)
- ✅ Each user's subsequent tests avoid THEIR OWN history
- ✅ Topic-level pool shared, but user-level tracking is isolated

---

## 📊 Backend Logs to Monitor

When testing, watch for these log messages:

### Success Indicators ✅
```
[Placement] Generating 10 questions for Percentages (aptitude)
[Placement] Found 23 existing questions to avoid duplicates
[Placement] Generated 10 questions, 10 unique after filtering
[Placement] Updated user user123 history: 45 questions tracked

[Reasoning] Generating 5 questions for Blood Relations (TCS)
[Reasoning] Found 18 existing questions to avoid duplicates
[Reasoning] Generated 5 questions, 5 unique after filtering
[Reasoning] Updated user user123 history: 28 questions tracked
```

### Warning Indicators ⚠️
```
[Placement] Only 7/10 unique questions from AI. Generating 3 fallback questions.
[Reasoning] AI generation fallback to seeded template
```
- These are OK if rare - means AI accidentally duplicated
- Fallback system ensures count is always met

---

## 🔧 Manual Verification Script

Save this as `test-duplication.js`:

```javascript
const questions1 = [/* paste questions from Test 1 */];
const questions2 = [/* paste questions from Test 2 */];
const questions3 = [/* paste questions from Test 3 */];

const allQuestions = [...questions1, ...questions2, ...questions3];
const allTexts = allQuestions.map(q => q.text.toLowerCase().trim());
const uniqueTexts = new Set(allTexts);

console.log(`Total questions: ${allQuestions.length}`);
console.log(`Unique questions: ${uniqueTexts.size}`);
console.log(`Duplicates found: ${allQuestions.length - uniqueTexts.size}`);

if (allTexts.length === uniqueTexts.size) {
  console.log('✅ PASS: All questions are unique!');
} else {
  console.log('❌ FAIL: Duplicates detected!');
  
  // Find duplicates
  const seen = new Set();
  const duplicates = [];
  allTexts.forEach((text, idx) => {
    if (seen.has(text)) {
      duplicates.push({ index: idx, text: text.slice(0, 80) });
    }
    seen.add(text);
  });
  
  console.log('Duplicate questions:', duplicates);
}
```

---

## 🎯 Success Criteria

### ✅ All Tests Pass If:

1. **Zero duplicates within single test generation**
   - Mock tests have unique questions across sections
   - Practice sessions have all unique questions

2. **Zero duplicates across multiple tests (same user, same topic)**
   - User generating 3+ consecutive tests gets unique questions each time

3. **Zero duplicates across user's question history**
   - User sees unique questions even after 50+ practice sessions
   - User-level tracking prevents cross-topic duplicates

4. **Backend logs confirm tracking**
   - "Found X existing questions" logs appear
   - "Updated user history" logs appear
   - Question counts increase progressively

5. **Performance acceptable**
   - API response time < 5 seconds for 10 questions
   - Memory usage reasonable (22KB × active users)

---

## 🐛 Troubleshooting

### Issue: Duplicates still appearing

**Diagnosis:**
1. Check backend logs for "Found X existing questions" - if 0, tracking not working
2. Verify userId is being passed correctly from controller to service
3. Check if questions are being normalized differently

**Fix:**
```typescript
// Add debug logging to service
console.log('[DEBUG] userId:', userId);
console.log('[DEBUG] topicKey:', topicKey);
console.log('[DEBUG] existingTexts.size:', allExistingTexts.size);
```

### Issue: Too many fallback questions

**Diagnosis:**
- AI is generating duplicates frequently
- Existing question set is too large (>500 questions)

**Fix:**
- Increase AI prompt strictness
- Add more variation templates to fallback
- Consider reducing tracked history from 100 to 50 per user

### Issue: Memory usage high

**Diagnosis:**
- Too many users tracked in memory
- History not being trimmed properly

**Fix:**
```typescript
// Add cleanup for inactive users (optional)
setInterval(() => {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [userId, history] of userQuestionHistory.entries()) {
    if (userLastActive[userId] < oneWeekAgo) {
      userQuestionHistory.delete(userId);
    }
  }
}, 24 * 60 * 60 * 1000); // Daily cleanup
```

---

## 📝 Test Report Template

After testing, fill this out:

```
=== ANTI-DUPLICATION TEST REPORT ===
Date: __________
Tester: __________

Module: Placement Service
[ ] Test 1: Same Topic Multiple Sessions - PASS/FAIL
[ ] Test 2: Mock Test Cross-Section - PASS/FAIL
Notes: __________

Module: Reasoning Service  
[ ] Test 3: AI Generated Questions - PASS/FAIL
[ ] Test 4: User Cross-Topic Tracking - PASS/FAIL
Notes: __________

Module: AI Aptitude Engine
[ ] Already tested previously - PASS/FAIL

Module: Technical MCQs
[ ] Already tested previously - PASS/FAIL

Overall Result: PASS/FAIL
Duplicates Found: __________
Performance: __________
Recommendations: __________
```

---

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] All 5 test scenarios pass with zero duplicates
- [ ] Backend logs confirm tracking working
- [ ] Memory usage monitored (should be < 50MB for 1000 users)
- [ ] API response times < 5 seconds
- [ ] Documentation updated
- [ ] Team trained on how to monitor logs
- [ ] Monitoring alerts set up for "fallback generation" warnings

---

**Status:** Ready for Testing  
**Next Step:** Run Test 1-5 and verify zero duplicates  
**Expected Outcome:** 100% unique questions across all test scenarios
