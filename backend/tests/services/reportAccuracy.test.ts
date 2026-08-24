import { describe, it, expect } from "@jest/globals";

function buildQuestionPairs(messages: Array<{ role: string; content: string }>) {
  const pairs: Array<{ questionNumber: number; question: string; answer: string }> = [];
  let currentQuestion: string | null = null;
  let currentAnswers: string[] = [];

  for (const msg of messages) {
    if (msg.role === "interviewer") {
      if (currentQuestion !== null) {
        pairs.push({
          questionNumber: pairs.length + 1,
          question: currentQuestion,
          answer: currentAnswers.join("\n\n").trim() || "No answer provided",
        });
      }
      currentQuestion = msg.content;
      currentAnswers = [];
    } else if (msg.role === "candidate" || msg.role === "user") {
      if (currentQuestion !== null) {
        currentAnswers.push(msg.content);
      }
    }
  }
  if (currentQuestion !== null) {
    pairs.push({
      questionNumber: pairs.length + 1,
      question: currentQuestion,
      answer: currentAnswers.join("\n\n").trim() || "No answer provided",
    });
  }

  return pairs;
}

describe("Report Accuracy Question-Answer Pair Alignment", () => {
  it("should correctly pair questions with answers when answers are provided sequentially", () => {
    const messages = [
      { role: "interviewer", content: "Tell me about yourself." },
      { role: "candidate", content: "I am a full stack developer with 5 years experience." },
      { role: "interviewer", content: "What is your experience with React?" },
      { role: "candidate", content: "I have built large Next.js applications." },
    ];

    const pairs = buildQuestionPairs(messages);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].question).toBe("Tell me about yourself.");
    expect(pairs[0].answer).toBe("I am a full stack developer with 5 years experience.");
    expect(pairs[1].question).toBe("What is your experience with React?");
    expect(pairs[1].answer).toBe("I have built large Next.js applications.");
  });

  it("should handle skipped questions cleanly without offsetting subsequent answers", () => {
    const messages = [
      { role: "interviewer", content: "Question 1" },
      { role: "candidate", content: "Answer 1" },
      { role: "interviewer", content: "Question 2 (Skipped)" },
      { role: "interviewer", content: "Question 3" },
      { role: "candidate", content: "Answer 3" },
    ];

    const pairs = buildQuestionPairs(messages);
    expect(pairs).toHaveLength(3);
    expect(pairs[0].question).toBe("Question 1");
    expect(pairs[0].answer).toBe("Answer 1");
    expect(pairs[1].question).toBe("Question 2 (Skipped)");
    expect(pairs[1].answer).toBe("No answer provided");
    expect(pairs[2].question).toBe("Question 3");
    expect(pairs[2].answer).toBe("Answer 3");
  });

  it("should concatenate multi-part candidate responses for the same question", () => {
    const messages = [
      { role: "interviewer", content: "Explain microservices." },
      { role: "candidate", content: "Microservices decompose monoliths." },
      { role: "candidate", content: "They communicate via HTTP or gRPC." },
    ];

    const pairs = buildQuestionPairs(messages);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].answer).toBe("Microservices decompose monoliths.\n\nThey communicate via HTTP or gRPC.");
  });
});
