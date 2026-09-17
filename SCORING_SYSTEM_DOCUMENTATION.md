# Scoring System Documentation

**Platform:** Adyapan AI  
**Last Updated:** September 13, 2026  
**Version:** 1.0

---

## 📊 Overview

This document explains how scoring works across all test modules in the Adyapan AI platform.

---

## 🎯 Test Modules & Scoring

### **1. AI Aptitude Engine** ✅

#### **Basic Scoring**
```typescript
// Per Question Scoring
correctAnswer = selectedIdx === question.correctIdx

// XP/Points Earned
if (correctAnswer) {
  xpEarned = 25 points
} else {
  xpEarned = 5 points  // Partial credit for attempt
}
```

#### **Session/Test Score**
```typescript
// Calculate total score
correctCount = answers.filter(a => a.correct).length
totalQuestions = session.totalQuestions

sessionScore = (correctCount / totalQuestions) * 100
// Example: 24 correct out of 30 = (24/30) * 100 = 80%
```

#### **Accuracy Calculation**
```typescript
// Overall accuracy across all sessions
totalCorrect = sum of all correct answers
totalAttempted = sum of all questions attempted

overallAccuracy = Math.round((totalCorrect / totalAttempted) * 100)
```

#### **Topic-Wise Mastery**
```typescript
// Per Topic
topicMastery = {
  topic: "Percentages",
  correct: 45,        // Correct answers
  totalAttempted: 60, // Total questions attempted
  accuracy: 75,       // (45/60) * 100 = 75%
  avgTimeSec: 42      // Average time per question
}
```

#### **Difficulty-Based Scoring**
No bonus/penalty for difficulty. All questions weighted equally:
- Easy question correct = 1 point
- Medium question correct = 1 point
- Hard question correct = 1 point

**Rationale:** Encourages practice across all difficulty levels without fear of penalty.

---

### **2. Technical MCQs** ✅

#### **Basic Scoring**
```typescript
// Per Question Scoring
isCorrect = selectedIdx === question.correctIdx

// XP Earned
if (isCorrect) {
  xpEarned = 30 points  // Higher than Aptitude (more technical)
} else {
  xpEarned = 5 points   // Partial credit for attempt
}
```

#### **Test Score**
```typescript
// Calculate test score
correctCount = answers.filter(a => a.isCorrect).length
totalQuestions = test.totalQuestions

testScore = (correctCount / totalQuestions) * 100
// Example: 22 correct out of 30 = (22/30) * 100 = 73.33%
```

#### **Topic Mastery**
```typescript
// Per Technology/Company
topicMastery = {
  topic: "React",
  correct: 156,
  totalAttempted: 200,
  accuracy: 78,       // (156/200) * 100
  masteryScore: 78    // Same as accuracy
}
```

#### **Streak Tracking**
```typescript
// Daily streak
if (lastActiveDate === yesterday) {
  currentStreak += 1
} else if (lastActiveDate < yesterday) {
  currentStreak = 1  // Reset streak
}

maxStreak = Math.max(maxStreak, currentStreak)
```

---

### **3. Placement Service** ✅

#### **Practice Session Scoring**
```typescript
// Per Question
isCorrect = selectedIdx === question.correctIdx

// Session Score
correctCount = answers.filter(a => a.isCorrect).length
score = correctCount  // Stored as count, not percentage

// When displaying
scorePercentage = (correctCount / totalQuestions) * 100
```

#### **Mock Test Scoring**
```typescript
// Multi-section scoring
sections = [
  { name: "Aptitude", correct: 12, total: 15, score: 80% },
  { name: "Reasoning", correct: 7, total: 10, score: 70% },
  { name: "Technical", correct: 8, total: 10, score: 80% }
]

// Overall Score
totalCorrect = sum of correct across sections = 27
totalQuestions = sum of total across sections = 35

overallScore = (27 / 35) * 100 = 77.14%
```

#### **Readiness Report Scoring**
```typescript
// Weighted average across categories
aptitudeScore = avgScore(aptitudeSessions)     // Weight: 35%
reasoningScore = avgScore(reasoningSessions)   // Weight: 30%
technicalScore = avgScore(technicalSessions)   // Weight: 35%

overallReadiness = 
  (aptitudeScore * 0.35) + 
  (reasoningScore * 0.30) + 
  (technicalScore * 0.35)

// Example:
// Aptitude: 75% × 0.35 = 26.25
// Reasoning: 80% × 0.30 = 24.00
// Technical: 70% × 0.35 = 24.50
// Total: 74.75%
```

#### **Company Readiness**
```typescript
// Per company
companyReadiness = {
  company: "TCS",
  score: overallReadiness - (companyIndex * 2) + (strongTopics.length * 3)
}

// Example:
// TCS (index 0): 75 - 0 + (5 * 3) = 90%
// Infosys (index 1): 75 - 2 + (5 * 3) = 88%
```

---

### **4. Reasoning Service** ✅

#### **Basic Scoring**
```typescript
// Per Question
isCorrect = selectedIdx === question.correctIdx

// XP Earned
if (isCorrect) {
  xpEarned = 25 points
} else {
  xpEarned = 5 points
}
```

#### **Accuracy Tracking**
```typescript
// User stats
userState = {
  solvedCount: 18,
  correctCount: 15,
  accuracy: Math.round((15 / 18) * 100) = 83%
}
```

#### **Topic Strength Analysis**
```typescript
// Strong topics (accuracy >= 70%)
strongTopics = [
  { topic: "Coding-Decoding", accuracy: 90 },
  { topic: "Blood Relations", accuracy: 85 },
  { topic: "Direction Sense", accuracy: 88 }
]

// Weak topics (accuracy < 50%)
weakTopics = [
  { topic: "Data Sufficiency", accuracy: 40 },
  { topic: "Cubes & Dice", accuracy: 45 },
  { topic: "Syllogisms", accuracy: 55 }
]
```

---

### **5. Interview Hub** ✅

#### **Overall Interview Score**
```typescript
// Multi-dimensional scoring
evaluation = {
  overallScore: 75,           // Weighted average
  communicationScore: 80,      // Weight: 30%
  technicalScore: 70,          // Weight: 40%
  confidenceScore: 75,         // Weight: 15%
  fluencyScore: 85,            // Weight: 10%
  bodyLanguageScore: 70        // Weight: 5%
}

// Calculation
overallScore = 
  (communicationScore * 0.30) +
  (technicalScore * 0.40) +
  (confidenceScore * 0.15) +
  (fluencyScore * 0.10) +
  (bodyLanguageScore * 0.05)

// Example:
// (80 * 0.30) + (70 * 0.40) + (75 * 0.15) + (85 * 0.10) + (70 * 0.05)
// = 24 + 28 + 11.25 + 8.5 + 3.5 = 75.25%
```

#### **HR Interview Scoring**
```typescript
// HR-specific scoring
hrEvaluation = {
  overallScore: 78,
  communicationScore: 80,
  leadershipScore: 75,
  starScore: 85,              // STAR method usage
  confidenceScore: 80,
  teamworkScore: 75,
  ownershipScore: 70,
  adaptabilityScore: 80,
  emotionalIntelligence: 75,
  professionalism: 85
}

// Overall calculated as average of all dimensions
overallScore = average(all dimension scores)
```

#### **STAR Analysis Scoring**
```typescript
// Situation-Task-Action-Result framework
starAnalysis = {
  hasSituation: true,
  hasTask: true,
  hasAction: true,
  hasResult: true,
  score: 85,  // Based on completeness and quality
  feedback: "Excellent STAR structure with clear results"
}
```

---

## 📈 Grading Scale

### **Universal Grading**
```
90-100%: Excellent ⭐⭐⭐⭐⭐
80-89%:  Very Good ⭐⭐⭐⭐
70-79%:  Good ⭐⭐⭐
60-69%:  Average ⭐⭐
50-59%:  Below Average ⭐
<50%:    Needs Improvement ⚠️
```

### **Color Coding**
```typescript
function getScoreColor(score: number) {
  if (score >= 80) return "green"    // Excellent/Very Good
  if (score >= 60) return "amber"    // Good/Average
  return "red"                       // Below Average/Needs Work
}
```

---

## 🎓 XP (Experience Points) System

### **XP Earned Per Module**

| Module | Correct Answer | Incorrect Answer |
|--------|----------------|------------------|
| Aptitude Engine | 25 XP | 5 XP |
| Technical MCQs | 30 XP | 5 XP |
| Placement Service | 20 XP | 5 XP |
| Reasoning Service | 25 XP | 5 XP |
| Interview (per question) | 50 XP | 10 XP |

### **Bonus XP**
```typescript
// Streak bonus
if (currentStreak >= 7) {
  bonusXP = 100  // 7-day streak bonus
}

// First attempt bonus
if (isFirstAttempt && isCorrect) {
  bonusXP = 10
}

// Speed bonus (answered in < 30 seconds)
if (timeTaken < 30 && isCorrect) {
  bonusXP = 5
}
```

---

## 📊 Analytics & Insights

### **1. Performance Metrics**

#### **Accuracy**
```typescript
accuracy = (totalCorrect / totalAttempted) * 100
```

#### **Average Time Per Question**
```typescript
avgTime = totalTimeSeconds / totalQuestions
```

#### **Success Rate (by difficulty)**
```typescript
easySuccessRate = (easyCorrect / easyTotal) * 100
mediumSuccessRate = (mediumCorrect / mediumTotal) * 100
hardSuccessRate = (hardCorrect / hardTotal) * 100
```

### **2. Topic Mastery Calculation**
```typescript
topicMastery = {
  topic: "DBMS",
  correct: 45,
  totalAttempted: 60,
  accuracy: 75,
  
  // Mastery level based on accuracy
  masteryLevel: 
    accuracy >= 90 ? "Expert" :
    accuracy >= 75 ? "Advanced" :
    accuracy >= 60 ? "Intermediate" :
    accuracy >= 40 ? "Beginner" :
    "Needs Practice"
}
```

### **3. Trend Analysis**
```typescript
// Weekly progress
weeklyTrend = {
  week: "Week 1",
  attempted: 150,
  correct: 120,
  accuracy: 80,
  trend: "improving" | "declining" | "stable"
}

// Trend calculation
if (thisWeekAccuracy > lastWeekAccuracy + 5) {
  trend = "improving"
} else if (thisWeekAccuracy < lastWeekAccuracy - 5) {
  trend = "declining"
} else {
  trend = "stable"
}
```

---

## 🏆 Leaderboard Scoring

### **Ranking Calculation**
```typescript
// Primary: Total XP
// Secondary: Accuracy
// Tertiary: Streak

rankingScore = totalXP + (accuracy * 10) + (currentStreak * 50)

// Example:
// User A: 5000 XP, 85% accuracy, 10-day streak
// Score = 5000 + (85 * 10) + (10 * 50) = 6350

// User B: 5500 XP, 75% accuracy, 5-day streak
// Score = 5500 + (75 * 10) + (5 * 50) = 6500
// User B ranks higher
```

---

## 🎯 Recommendations Engine

### **Study Recommendations Based on Score**

#### **Score < 50%** (Needs Improvement)
```
- Focus on fundamentals
- Start with easy-level questions
- Use AI explanations for every wrong answer
- Practice 1-2 hours daily
- Target: 10 questions/day minimum
```

#### **Score 50-69%** (Average)
```
- Strengthen weak topics (accuracy < 60%)
- Mix of easy and medium questions
- Review wrong answers weekly
- Practice 30-45 minutes daily
- Target: 15-20 questions/day
```

#### **Score 70-79%** (Good)
```
- Practice medium and hard questions
- Focus on speed (reduce time per question)
- Advanced concepts and edge cases
- Practice 30 minutes daily
- Target: 20-25 questions/day
```

#### **Score 80-89%** (Very Good)
```
- Master hard-level questions
- Focus on company-specific patterns
- Take full mock tests
- Maintain consistency
- Target: 25-30 questions/day
```

#### **Score 90%+** (Excellent)
```
- Challenge mode (timed tests)
- Help others / peer teaching
- Focus on interview preparation
- Mock tests for top companies
- Target: Maintain consistency
```

---

## 📝 Score Display Formats

### **1. Percentage Score**
```
85% (25/30 questions correct)
```

### **2. Letter Grade**
```
A+ (90-100%)
A  (85-89%)
B+ (80-84%)
B  (75-79%)
C+ (70-74%)
C  (65-69%)
D  (60-64%)
F  (<60%)
```

### **3. Proficiency Level**
```
Expert (90-100%)
Advanced (75-89%)
Intermediate (60-74%)
Beginner (40-59%)
Needs Practice (<40%)
```

---

## 🔍 Score Breakdown Example

### **Sample Test Result**
```
User: John Doe
Test: TCS Aptitude Mock Test
Date: September 13, 2026

Overall Score: 78% (23/30)

Section Breakdown:
├─ Quantitative: 80% (12/15)
├─ Logical: 70% (7/10)
└─ Verbal: 80% (4/5)

Performance:
├─ Easy: 100% (5/5)
├─ Medium: 75% (15/20)
└─ Hard: 60% (3/5)

Time Analysis:
├─ Total Time: 28 minutes
├─ Avg per Question: 56 seconds
└─ Time Management: Good ✓

XP Earned: 600 XP
Streak: 5 days 🔥

Recommendations:
1. Practice more Logical Reasoning (70% accuracy)
2. Work on hard-level questions (60% accuracy)
3. Focus on Seating Arrangement and Puzzles
```

---

## ⚙️ Configuration

### **Scoring Weights (Customizable)**
```typescript
// In backend/src/config/scoring.ts (if you want to change)
export const SCORING_CONFIG = {
  aptitude: {
    correctXP: 25,
    incorrectXP: 5,
    streakBonus: 100,
    speedBonusThreshold: 30  // seconds
  },
  technical: {
    correctXP: 30,
    incorrectXP: 5,
    streakBonus: 150
  },
  interview: {
    weights: {
      communication: 0.30,
      technical: 0.40,
      confidence: 0.15,
      fluency: 0.10,
      bodyLanguage: 0.05
    }
  }
}
```

---

## 🚀 Implementation Status

| Module | Scoring | XP System | Analytics | Status |
|--------|---------|-----------|-----------|--------|
| AI Aptitude Engine | ✅ | ✅ | ✅ | Production |
| Technical MCQs | ✅ | ✅ | ✅ | Production |
| Placement Service | ✅ | ⚠️ | ✅ | Production |
| Reasoning Service | ✅ | ✅ | ⚠️ | Production |
| Interview Hub | ✅ | ✅ | ✅ | Production |

**Legend:**
- ✅ Fully Implemented
- ⚠️ Partially Implemented
- ❌ Not Implemented

---

## 📞 FAQs

### **Q: Why do incorrect answers give 5 XP?**
**A:** To encourage practice and reduce fear of failure. Every attempt contributes to learning.

### **Q: Are all questions weighted equally?**
**A:** Yes. Easy, medium, and hard questions all count as 1 point. This encourages balanced practice.

### **Q: How is the leaderboard ranked?**
**A:** Primary: Total XP. Secondary: Accuracy. Tertiary: Current streak.

### **Q: Can I see my wrong answers?**
**A:** Yes. All modules store your attempts and show detailed explanations for wrong answers.

### **Q: How often should I practice?**
**A:** Consistency matters more than duration. 30 minutes daily is better than 3 hours once a week.

### **Q: What's a good target score for placements?**
**A:** 70%+ is good. 80%+ is very competitive. 90%+ puts you in the top tier.

---

**Last Updated:** September 13, 2026  
**Contact:** Dev Team for questions or customizations
