import { prisma } from "../config/prisma";
import { executeCode, runTestCases } from "./piston.service";
import { callAIRobust } from "../lib/ai/openrouter";

async function analyzeComplexityAI(code: string, language: string): Promise<{ timeComplexity: string; spaceComplexity: string; efficiency: number; optimizations: string[] }> {
  try {
    const prompt = `Analyze this ${language} code and return a JSON object with:
{
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "efficiency": number (0-100 rating),
  "optimizations": ["suggestion1", "suggestion2"]
}
Only return valid JSON, no markdown.

Code:
\`\`\`${language}
${code.slice(0, 3000)}
\`\`\``;

    const response = await callAIRobust(
      [{ role: "user", content: prompt }],
      { model: "deepseek-ai/deepseek-r1", responseFormat: { type: "json_object" }, maxTokens: 500 }
    );
    const parsed = JSON.parse(response.replace(/```json|```/g, "").trim());
    return {
      timeComplexity: parsed.timeComplexity || "O(N)",
      spaceComplexity: parsed.spaceComplexity || "O(1)",
      efficiency: parsed.efficiency || 70,
      optimizations: parsed.optimizations || []
    };
  } catch {
    return analyzeComplexityFallback(code, language);
  }
}

function analyzeComplexityFallback(code: string, _language: string) {
  let timeComplexity = "O(N)";
  let spaceComplexity = "O(1)";

  const loops = (code.match(/for|while|forEach/g) || []).length;
  const hasRecursion = code.includes("recurse") || /\breturn\s+\w+\s*\(/.test(code);
  const hasNestedLoops = /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/.test(code) || /while\s*\([^)]*\)\s*\{[^}]*while\s*\(/.test(code);

  if (hasNestedLoops || loops >= 3) timeComplexity = "O(N^3)";
  else if (loops >= 2 || hasRecursion) timeComplexity = "O(N^2)";
  else if (code.includes("log") || code.includes("mid") || code.includes("binary")) timeComplexity = "O(N log N)";
  else if (loops === 1) timeComplexity = "O(N)";

  if (code.includes("Map") || code.includes("Set") || code.includes("dict") || code.includes("unordered_map") || code.includes("HashMap")) spaceComplexity = "O(N)";
  else if (code.includes("2D") || code.includes("[][]") || code.includes("[[],") || /new Array\(.*new Array/.test(code)) spaceComplexity = "O(N^2)";

  return { timeComplexity, spaceComplexity, efficiency: 70, optimizations: ["Consider optimizing time/space complexity"] };
}

async function reviewCodeAI(code: string, language: string, title: string, testPassed: boolean): Promise<any> {
  try {
    const prompt = `You are a FAANG senior engineer reviewing a candidate's coding assessment submission.
Question: ${title}
Language: ${language}
Test Cases Passed: ${testPassed ? "Yes" : "No"}

Analyze this code and return a JSON object:
{
  "summary": "Brief review summary (2-3 sentences)",
  "qualityScore": number (0-100),
  "readabilityScore": number (0-100),
  "optimizationScore": number (0-100),
  "optimizations": ["specific suggestion 1", "specific suggestion 2"],
  "interviewPerspective": "What an interviewer would think",
  "recruiterPerspective": "How a recruiter would rate this",
  "productionReadiness": "Is this production-ready code?",
  "alternativeApproach": "Brief description of an alternative approach"
}
Only return valid JSON, no markdown.

Code:
\`\`\`${language}
${code.slice(0, 4000)}
\`\`\``;

    const response = await callAIRobust(
      [{ role: "user", content: prompt }],
      { model: "deepseek-ai/deepseek-r1", responseFormat: { type: "json_object" }, maxTokens: 800 }
    );
    return JSON.parse(response.replace(/```json|```/g, "").trim());
  } catch {
    return {
      summary: `Code for "${title}" written in ${language}. ${testPassed ? "Passes visible test cases." : "Needs improvement to pass all test cases."}`,
      qualityScore: testPassed ? 82 : 55,
      readabilityScore: 75,
      optimizationScore: 70,
      optimizations: ["Consider edge cases", "Add comments for clarity"],
      interviewPerspective: testPassed ? "Shows solid problem-solving skills" : "Needs more practice with edge cases",
      recruiterPerspective: testPassed ? "Good coding fundamentals" : "Shows effort but needs improvement",
      productionReadiness: testPassed ? "Needs error handling for production" : "Not ready for production",
      alternativeApproach: "Consider using built-in language features for cleaner code"
    };
  }
}

// ─── Company & Type Presets Definition ────────────────────────────────────────

export interface CompanyPreset {
  id: string;
  name: string;
  category: "service" | "product" | "faang" | "startup";
  questionCount: number;
  timeLimitMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  focusTopics: string[];
  description: string;
  passingScore: number;
}

export const COMPANY_PRESETS: Record<string, CompanyPreset> = {
  tcs: {
    id: "tcs",
    name: "TCS (Ninja & Digital)",
    category: "service",
    questionCount: 2,
    timeLimitMinutes: 45,
    difficulty: "Easy",
    focusTopics: ["Arrays", "Strings", "Basic Math", "Loops"],
    description: "Focuses on fundamental problem solving, string manipulation, and array logic.",
    passingScore: 70
  },
  infosys: {
    id: "infosys",
    name: "Infosys (DSE & SP)",
    category: "service",
    questionCount: 3,
    timeLimitMinutes: 60,
    difficulty: "Mixed",
    focusTopics: ["Greedy", "Dynamic Programming", "Strings", "Bit Manipulation"],
    description: "Evaluates algorithm efficiency, problem formulation, and optimal solutions.",
    passingScore: 75
  },
  wipro: {
    id: "wipro",
    name: "Wipro (Elite & Turbo)",
    category: "service",
    questionCount: 2,
    timeLimitMinutes: 45,
    difficulty: "Easy",
    focusTopics: ["Pattern Printing", "Arrays", "Recursion", "Searching"],
    description: "Assesses syntax fluency, edge-case validation, and clean logic flow.",
    passingScore: 70
  },
  accenture: {
    id: "accenture",
    name: "Accenture",
    category: "service",
    questionCount: 2,
    timeLimitMinutes: 45,
    difficulty: "Easy",
    focusTopics: ["Basic Data Structures", "Strings", "Math", "Arrays"],
    description: "Assesses rapid coding ability, basic data structures, and debugging.",
    passingScore: 70
  },
  capgemini: {
    id: "capgemini",
    name: "Capgemini",
    category: "service",
    questionCount: 2,
    timeLimitMinutes: 40,
    difficulty: "Easy",
    focusTopics: ["Pseudocode Debugging", "Strings", "Array Manipulation"],
    description: "Focuses on pseudocode execution, logic correction, and basic algorithms.",
    passingScore: 65
  },
  cognizant: {
    id: "cognizant",
    name: "Cognizant (GenC & GenC Next)",
    category: "service",
    questionCount: 2,
    timeLimitMinutes: 50,
    difficulty: "Easy",
    focusTopics: ["Arrays", "Strings", "Sorting", "SQL Basics"],
    description: "Evaluates standard coding concepts, SQL queries, and basic optimization.",
    passingScore: 70
  },
  google: {
    id: "google",
    name: "Google",
    category: "faang",
    questionCount: 3,
    timeLimitMinutes: 90,
    difficulty: "Hard",
    focusTopics: ["Graphs", "Trees", "Dynamic Programming", "Segment Trees", "Advanced Algorithms"],
    description: "High-bar assessment testing time/space complexity limits, graph theory, and optimal architecture.",
    passingScore: 85
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    category: "faang",
    questionCount: 3,
    timeLimitMinutes: 75,
    difficulty: "Hard",
    focusTopics: ["Trees", "LinkedList", "DP", "System Design Logic", "Strings"],
    description: "Emphasizes production-ready code, data structure choice, and edge case handling.",
    passingScore: 80
  },
  amazon: {
    id: "amazon",
    name: "Amazon",
    category: "faang",
    questionCount: 2,
    timeLimitMinutes: 70,
    difficulty: "Hard",
    focusTopics: ["BFS/DFS", "Heaps", "Hash Tables", "Sliding Window", "Leadership Principles Logic"],
    description: "Tests optimal time complexity, graph traversals, heap queues, and maintainability.",
    passingScore: 80
  },
  adobe: {
    id: "adobe",
    name: "Adobe",
    category: "product",
    questionCount: 2,
    timeLimitMinutes: 60,
    difficulty: "Medium",
    focusTopics: ["Arrays", "Strings", "Trees", "Binary Search"],
    description: "Focuses on mathematical reasoning, tree structures, and efficient data processing.",
    passingScore: 75
  },
  uber: {
    id: "uber",
    name: "Uber",
    category: "faang",
    questionCount: 3,
    timeLimitMinutes: 80,
    difficulty: "Hard",
    focusTopics: ["Graph Algorithms", "Concurrency Logic", "Intervals", "Dynamic Programming"],
    description: "Rigorous test focusing on scalable data structures, spatial queries, and graph algorithms.",
    passingScore: 85
  },
  startup: {
    id: "startup",
    name: "High-Growth Startup",
    category: "startup",
    questionCount: 3,
    timeLimitMinutes: 60,
    difficulty: "Medium",
    focusTopics: ["API Logic", "Fullstack Logic", "Debugging", "Algorithms", "Async Processing"],
    description: "Practical assessment testing fullstack problem solving, API handling, and clean refactoring.",
    passingScore: 75
  },
  custom: {
    id: "custom",
    name: "Custom Company Round",
    category: "product",
    questionCount: 3,
    timeLimitMinutes: 60,
    difficulty: "Mixed",
    focusTopics: ["DSA", "SQL", "Frontend Logic", "Backend Logic"],
    description: "Configurable company simulation matching customized placement criteria.",
    passingScore: 70
  }
};

// ─── Assessment Question Bank ────────────────────────────────────────────────

export interface AssessmentQuestion {
  id: string;
  title: string;
  type: "Algorithm" | "Data Structures" | "Debugging" | "SQL" | "API Design" | "Frontend Logic" | "Backend Logic" | "Code Completion" | "Output Prediction";
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  testCases: Array<{ input: string; expectedOutput: string; isHidden?: boolean }>;
  starterTemplates: Record<string, string>;
  topics: string[];
}

const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // ─── EASY ───────────────────────────────────────────────────────────────────
  {
    id: "q_two_sum_pl",
    title: "Optimal Target Pair Sum",
    type: "Algorithm",
    difficulty: "Easy",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    inputFormat: "First line contains space-separated integers for nums array.\nSecond line contains integer target.",
    outputFormat: "Print two space-separated indices sorted in ascending order.",
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Exactly one valid answer exists."],
    examples: [
      { input: "2 7 11 15\n9", output: "0 1", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
      { input: "3 2 4\n6", output: "1 2", explanation: "nums[1] + nums[2] = 2 + 4 = 6" }
    ],
    testCases: [
      { input: "2 7 11 15\n9", expectedOutput: "0 1", isHidden: false },
      { input: "3 2 4\n6", expectedOutput: "1 2", isHidden: false },
      { input: "3 3\n6", expectedOutput: "0 1", isHidden: true },
      { input: "1 5 9 14 22\n23", expectedOutput: "2 3", isHidden: true },
      { input: "-1 -2 -3 -4 -5\n-8", expectedOutput: "2 4", isHidden: true }
    ],
    topics: ["Hash Map", "Arrays", "Two Sum"],
    starterTemplates: {
      javascript: `// Optimal Target Pair Sum\nfunction solve(input) {\n  const lines = input.trim().split('\\n');\n  const nums = lines[0].trim().split(/\\s+/).map(Number);\n  const target = parseInt(lines[1].trim(), 10);\n  \n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) {\n      console.log(map.get(diff) + " " + i);\n      return;\n    }\n    map.set(nums[i], i);\n  }\n}\n\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `# Optimal Target Pair Sum\nimport sys\n\ndef solve():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2: return\n    nums = list(map(int, lines[0].strip().split()))\n    target = int(lines[1].strip())\n    \n    seen = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in seen:\n            print(f"{seen[diff]} {i}")\n            return\n        seen[n] = i\n\nif __name__ == '__main__':\n    solve()`,
      cpp: `// Optimal Target Pair Sum\n#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    vector<int> nums;\n    int val, target;\n    string line;\n    getline(cin, line);\n    istringstream iss(line);\n    while (iss >> val) nums.push_back(val);\n    cin >> target;\n    unordered_map<int, int> mp;\n    for (int i = 0; i < nums.size(); i++) {\n        int diff = target - nums[i];\n        if (mp.count(diff)) {\n            cout << mp[diff] << " " << i << endl;\n            return 0;\n        }\n        mp[nums[i]] = i;\n    }\n    return 0;\n}`,
      java: `// Optimal Target Pair Sum\nimport java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().trim().split("\\\\s+");\n        int[] nums = new int[parts.length];\n        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n        int target = sc.nextInt();\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) {\n                System.out.println(map.get(diff) + " " + i);\n                return;\n            }\n            map.put(nums[i], i);\n        }\n    }\n}`
    }
  },
  {
    id: "q_valid_parentheses_pl",
    title: "Balanced Expression Validator",
    type: "Data Structures",
    difficulty: "Easy",
    description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets in correct order.",
    inputFormat: "Single line containing string s.",
    outputFormat: "Print 'true' if valid, otherwise 'false'.",
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only."],
    examples: [
      { input: "()[]{}", output: "true" },
      { input: "(]", output: "false" }
    ],
    testCases: [
      { input: "()[]{}", expectedOutput: "true", isHidden: false },
      { input: "(]", expectedOutput: "false", isHidden: false },
      { input: "([{}])", expectedOutput: "true", isHidden: true },
      { input: "((((", expectedOutput: "false", isHidden: true },
      { input: "({[]})", expectedOutput: "true", isHidden: true }
    ],
    topics: ["Stack", "Strings", "Validation"],
    starterTemplates: {
      javascript: `// Balanced Expression Validator\nfunction solve(input) {\n  const s = input.trim();\n  const stack = [];\n  const pairs = { ')': '(', '}': '{', ']': '[' };\n  for (let char of s) {\n    if (pairs[char]) {\n      if (stack.pop() !== pairs[char]) {\n        console.log("false"); return;\n      }\n    } else stack.push(char);\n  }\n  console.log(stack.length === 0 ? "true" : "false");\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `# Balanced Expression Validator\nimport sys\n\ndef solve():\n    s = sys.stdin.read().strip()\n    stack = []\n    pairs = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in pairs:\n            if not stack or stack.pop() != pairs[char]:\n                print("false")\n                return\n        else:\n            stack.append(char)\n    print("true" if not stack else "false")\n\nif __name__ == '__main__':\n    solve()`,
      cpp: `// Balanced Expression Validator\n#include <iostream>\n#include <string>\n#include <stack>\n#include <unordered_map>\nusing namespace std;\nint main() {\n    string s; cin >> s;\n    stack<char> st;\n    unordered_map<char, char> mp = {{')','('},{'},{'}'},{']','['}};\n    for (char c : s) {\n        if (mp.count(c)) {\n            if (st.empty() || st.top() != mp[c]) { cout << "false" << endl; return 0; }\n            st.pop();\n        } else st.push(c);\n    }\n    cout << (st.empty() ? "true" : "false") << endl;\n    return 0;\n}`,
      java: `// Balanced Expression Validator\nimport java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNext() ? sc.next() : "";\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == ')') { if (stack.isEmpty() || stack.pop() != '(') { System.out.println("false"); return; } }\n            else if (c == '}') { if (stack.isEmpty() || stack.pop() != '{') { System.out.println("false"); return; } }\n            else if (c == ']') { if (stack.isEmpty() || stack.pop() != '[') { System.out.println("false"); return; } }\n            else stack.push(c);\n        }\n        System.out.println(stack.isEmpty() ? "true" : "false");\n    }\n}`
    }
  },
  {
    id: "q_reverse_string_pl",
    title: "Reverse Words in a String",
    type: "Algorithm",
    difficulty: "Easy",
    description: "Given an input string `s`, reverse the order of the words. A word is defined as a sequence of non-space characters. The input string may contain leading or trailing spaces.",
    inputFormat: "Single line containing string s with words separated by spaces.",
    outputFormat: "Print the reversed string with single spaces between words.",
    constraints: ["1 <= s.length <= 10^4", "s consists of English letters and digits.", "Words are separated by at least one space."],
    examples: [
      { input: "the sky is blue", output: "blue is sky the" },
      { input: "  hello world  ", output: "world hello" }
    ],
    testCases: [
      { input: "the sky is blue", expectedOutput: "blue is sky the", isHidden: false },
      { input: "  hello world  ", expectedOutput: "world hello", isHidden: false },
      { input: "a good   example", expectedOutput: "example good a", isHidden: true },
      { input: "single", expectedOutput: "single", isHidden: true },
      { input: "  one two three  four  ", expectedOutput: "four three two one", isHidden: true }
    ],
    topics: ["Strings", "Two Pointers", "Parsing"],
    starterTemplates: {
      javascript: `// Reverse Words in a String\nfunction solve(input) {\n  const result = input.trim().split(/\\s+/).reverse().join(' ');\n  console.log(result);\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `# Reverse Words in a String\nimport sys\nline = sys.stdin.read().strip()\nprint(' '.join(line.split()[::-1]))`,
      cpp: `// Reverse Words in a String\n#include <iostream>\n#include <string>\n#include <sstream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string s; getline(cin, s);\n    stringstream ss(s);\n    vector<string> words;\n    string w;\n    while (ss >> w) words.push_back(w);\n    reverse(words.begin(), words.end());\n    for (int i = 0; i < words.size(); i++) cout << (i ? " " : "") << words[i];\n    cout << endl;\n    return 0;\n}`,
      java: `// Reverse Words in a String\nimport java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine().trim();\n        String[] words = s.split("\\\\\\\\s+");\n        StringBuilder sb = new StringBuilder();\n        for (int i = words.length - 1; i >= 0; i--) {\n            if (sb.length() > 0) sb.append(" ");\n            sb.append(words[i]);\n        }\n        System.out.println(sb.toString());\n    }\n}`
    }
  },

  // ─── MEDIUM ─────────────────────────────────────────────────────────────────
  {
    id: "q_longest_sub_pl",
    title: "Longest Substring Without Repeating Characters",
    type: "Algorithm",
    difficulty: "Medium",
    description: "Given a string `s`, find the length of the longest substring without repeating characters using an optimal sliding window approach.",
    inputFormat: "Single line containing string s.",
    outputFormat: "Print single integer representing longest substring length.",
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
    examples: [
      { input: "abcabcbb", output: "3", explanation: "The answer is 'abc', with length 3." },
      { input: "bbbbb", output: "1", explanation: "The answer is 'b', with length 1." }
    ],
    testCases: [
      { input: "abcabcbb", expectedOutput: "3", isHidden: false },
      { input: "bbbbb", expectedOutput: "1", isHidden: false },
      { input: "pwwkew", expectedOutput: "3", isHidden: true },
      { input: "au", expectedOutput: "2", isHidden: true },
      { input: "", expectedOutput: "0", isHidden: true }
    ],
    topics: ["Sliding Window", "Hash Set", "Strings"],
    starterTemplates: {
      javascript: `// Longest Substring Without Repeating Characters\nfunction solve(input) {\n  const s = input.replace(/\\r?\\n$/, '');\n  let maxLen = 0, left = 0;\n  const set = new Set();\n  for (let right = 0; right < s.length; right++) {\n    while (set.has(s[right])) {\n      set.delete(s[left]);\n      left++;\n    }\n    set.add(s[right]);\n    maxLen = Math.max(maxLen, right - left + 1);\n  }\n  console.log(maxLen);\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `# Longest Substring Without Repeating Characters\nimport sys\n\ndef solve():\n    s = sys.stdin.read().rstrip('\\r\\n')\n    seen = set()\n    left = max_len = 0\n    for right in range(len(s)):\n        while s[right] in seen:\n            seen.remove(s[left])\n            left += 1\n        seen.add(s[right])\n        max_len = max(max_len, right - left + 1)\n    print(max_len)\n\nif __name__ == '__main__':\n    solve()`,
      cpp: `// Longest Substring Without Repeating Characters\n#include <iostream>\n#include <string>\n#include <unordered_set>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string s; getline(cin, s);\n    unordered_set<char> st;\n    int left = 0, maxLen = 0;\n    for (int right = 0; right < s.length(); right++) {\n        while (st.count(s[right])) { st.erase(s[left]); left++; }\n        st.insert(s[right]);\n        maxLen = max(maxLen, right - left + 1);\n    }\n    cout << maxLen << endl;\n    return 0;\n}`,
      java: `// Longest Substring Without Repeating Characters\nimport java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNextLine() ? sc.nextLine() : "";\n        Set<Character> set = new HashSet<>();\n        int left = 0, maxLen = 0;\n        for (int right = 0; right < s.length(); right++) {\n            while (set.contains(s.charAt(right))) { set.remove(s.charAt(left)); left++; }\n            set.add(s.charAt(right));\n            maxLen = Math.max(maxLen, right - left + 1);\n        }\n        System.out.println(maxLen);\n    }\n}`
    }
  },
  {
    id: "q_sql_employee_salary_pl",
    title: "SQL Query: High Salary Department Aggregation",
    type: "SQL",
    difficulty: "Medium",
    description: "Write SQL query logic to select the top-earning employees in each department. (Represented as a JSON data transformation problem for test execution accuracy).\n\nGiven a list of employee records with id, department, and salary, find the highest-paid employee in each department.",
    inputFormat: "JSON array of employee objects with fields: id, department, salary.",
    outputFormat: "JSON array of employee objects (highest salary per department), sorted by department name.",
    constraints: ["At least 1 employee per department.", "All salaries are positive integers."],
    examples: [
      { input: '[{"id":1,"department":"Engineering","salary":70000},{"id":2,"department":"Engineering","salary":90000},{"id":3,"department":"Sales","salary":60000}]', output: '[{"id":2,"department":"Engineering","salary":90000},{"id":3,"department":"Sales","salary":60000}]' }
    ],
    testCases: [
      { input: '[{"id":1,"department":"Engineering","salary":70000},{"id":2,"department":"Engineering","salary":90000},{"id":3,"department":"Sales","salary":60000}]', expectedOutput: '[{"id":2,"department":"Engineering","salary":90000},{"id":3,"department":"Sales","salary":60000}]', isHidden: false },
      { input: '[{"id":1,"department":"HR","salary":50000},{"id":2,"department":"HR","salary":55000}]', expectedOutput: '[{"id":2,"department":"HR","salary":55000}]', isHidden: true },
      { input: '[{"id":1,"department":"Eng","salary":100},{"id":2,"department":"Eng","salary":100}]', expectedOutput: '[{"id":1,"department":"Eng","salary":100},{"id":2,"department":"Eng","salary":100}]', isHidden: true }
    ],
    topics: ["SQL", "Grouping", "Aggregation", "JSON"],
    starterTemplates: {
      javascript: `// SQL: High Salary Department Aggregation\nfunction solve(input) {\n  const data = JSON.parse(input.trim());\n  const deptMap = {};\n  for (const emp of data) {\n    if (!deptMap[emp.department] || emp.salary > deptMap[emp.department].salary) {\n      deptMap[emp.department] = emp;\n    }\n  }\n  const result = Object.values(deptMap).sort((a, b) => a.department.localeCompare(b.department));\n  console.log(JSON.stringify(result));\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `import sys, json\ndata = json.loads(sys.stdin.read().strip())\ndept = {}\nfor e in data:\n    d = e['department']\n    if d not in dept or e['salary'] > dept[d]['salary']:\n        dept[d] = e\nresult = sorted(dept.values(), key=lambda x: x['department'])\nprint(json.dumps(result))`,
      cpp: `// SQL: High Salary Department Aggregation\n#include <iostream>\n#include <string>\n#include <map>\n#include <algorithm>\nusing namespace std;\nint main() {\n    cout << "[]"; return 0;\n}`,
      java: `// SQL: High Salary Department Aggregation\nimport java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("[]");\n    }\n}`
    }
  },
  {
    id: "q_coin_change_pl",
    title: "Minimum Coin Change",
    type: "Algorithm",
    difficulty: "Medium",
    description: "Given a list of coin denominations `coins` and a target amount `amount`, return the minimum number of coins needed to make the amount. If it's not possible to make the amount with the given coins, return -1.",
    inputFormat: "First line contains space-separated coin denominations.\nSecond line contains the target amount.",
    outputFormat: "Print the minimum number of coins, or -1 if impossible.",
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
    examples: [
      { input: "1 2 5\n11", output: "3", explanation: "5 + 5 + 1 = 11" },
      { input: "2\n3", output: "-1", explanation: "Cannot make 3 with only 2-coins." }
    ],
    testCases: [
      { input: "1 2 5\n11", expectedOutput: "3", isHidden: false },
      { input: "2\n3", expectedOutput: "-1", isHidden: false },
      { input: "1\n0", expectedOutput: "0", isHidden: true },
      { input: "1 5 10 25\n30", expectedOutput: "2", isHidden: true },
      { input: "3 7\n11", expectedOutput: "3", isHidden: true }
    ],
    topics: ["Dynamic Programming", "Greedy", "Coins"],
    starterTemplates: {
      javascript: `// Minimum Coin Change\nfunction solve(input) {\n  const lines = input.trim().split('\\n');\n  const coins = lines[0].trim().split(/\\s+/).map(Number);\n  const amount = parseInt(lines[1].trim(), 10);\n  const dp = new Array(amount + 1).fill(Infinity);\n  dp[0] = 0;\n  for (let i = 1; i <= amount; i++) {\n    for (const c of coins) {\n      if (c <= i && dp[i - c] + 1 < dp[i]) dp[i] = dp[i - c] + 1;\n    }\n  }\n  console.log(dp[amount] === Infinity ? -1 : dp[amount]);\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `import sys\ndef solve():\n    lines = sys.stdin.read().strip().split('\\n')\n    coins = list(map(int, lines[0].split()))\n    amount = int(lines[1])\n    dp = [float('inf')] * (amount + 1)\n    dp[0] = 0\n    for i in range(1, amount + 1):\n        for c in coins:\n            if c <= i and dp[i - c] + 1 < dp[i]:\n                dp[i] = dp[i - c] + 1\n    print(-1 if dp[amount] == float('inf') else dp[amount])\nsolve()`,
      cpp: `// Minimum Coin Change\n#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    vector<int> coins; int val, amount;\n    string line; getline(cin, line);\n    istringstream iss(line);\n    while (iss >> val) coins.push_back(val);\n    cin >> amount;\n    vector<int> dp(amount + 1, 1e9);\n    dp[0] = 0;\n    for (int i = 1; i <= amount; i++)\n        for (int c : coins)\n            if (c <= i && dp[i - c] + 1 < dp[i]) dp[i] = dp[i - c] + 1;\n    cout << (dp[amount] >= 1e9 ? -1 : dp[amount]) << endl;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().trim().split("\\\\\\\\s+");\n        int[] coins = Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();\n        int amount = sc.nextInt();\n        int[] dp = new int[amount + 1];\n        Arrays.fill(dp, amount + 1);\n        dp[0] = 0;\n        for (int i = 1; i <= amount; i++)\n            for (int c : coins)\n                if (c <= i && dp[i - c] + 1 < dp[i]) dp[i] = dp[i - c] + 1;\n        System.out.println(dp[amount] > amount ? -1 : dp[amount]);\n    }\n}`
    }
  },
  {
    id: "q_merge_intervals_pl",
    title: "Merge Overlapping Intervals",
    type: "Data Structures",
    difficulty: "Medium",
    description: "Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals and return an array of the non-overlapping intervals.",
    inputFormat: "Each line contains a pair: start end (space-separated).",
    outputFormat: "Print merged intervals, one per line: start end.",
    constraints: ["1 <= intervals.length <= 10^4", "intervals[i].length == 2", "0 <= start_i <= end_i <= 10^4"],
    examples: [
      { input: "1 3\n2 6\n8 10\n15 18", output: "1 6\n8 10\n15 18" },
      { input: "1 4\n4 5", output: "1 5" }
    ],
    testCases: [
      { input: "1 3\n2 6\n8 10\n15 18", expectedOutput: "1 6\n8 10\n15 18", isHidden: false },
      { input: "1 4\n4 5", expectedOutput: "1 5", isHidden: false },
      { input: "1 4\n2 3", expectedOutput: "1 4", isHidden: true },
      { input: "0 0\n1 1\n2 2", expectedOutput: "0 0\n1 1\n2 2", isHidden: true },
      { input: "1 10\n2 3\n5 7", expectedOutput: "1 10", isHidden: true }
    ],
    topics: ["Sorting", "Intervals", "Arrays"],
    starterTemplates: {
      javascript: `// Merge Overlapping Intervals\nfunction solve(input) {\n  const intervals = input.trim().split('\\n').map(l => l.trim().split(/\\s+/).map(Number));\n  intervals.sort((a, b) => a[0] - b[0]);\n  const merged = [intervals[0]];\n  for (let i = 1; i < intervals.length; i++) {\n    const last = merged[merged.length - 1];\n    if (intervals[i][0] <= last[1]) {\n      last[1] = Math.max(last[1], intervals[i][1]);\n    } else merged.push(intervals[i]);\n  }\n  merged.forEach(m => console.log(m[0] + " " + m[1]));\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `import sys\ndef solve():\n    intervals = [list(map(int, l.split())) for l in sys.stdin.read().strip().split('\\n')]\n    intervals.sort()\n    merged = [intervals[0]]\n    for s, e in intervals[1:]:\n        if s <= merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], e)\n        else:\n            merged.append([s, e])\n    for m in merged:\n        print(f"{m[0]} {m[1]}")\nsolve()`,
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    vector<pair<int,int>> v;\n    int a, b;\n    while (cin >> a >> b) v.push_back({a, b});\n    sort(v.begin(), v.end());\n    vector<pair<int,int>> m = {v[0]};\n    for (int i = 1; i < v.size(); i++) {\n        if (v[i].first <= m.back().second) m.back().second = max(m.back().second, v[i].second);\n        else m.push_back(v[i]);\n    }\n    for (auto& p : m) cout << p.first << " " << p.second << endl;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<int[]> list = new ArrayList<>();\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) break;\n            String[] p = line.split("\\\\\\\\s+");\n            list.add(new int[]{Integer.parseInt(p[0]), Integer.parseInt(p[1])});\n        }\n        list.sort(Comparator.comparingInt(a -> a[0]));\n        List<int[]> merged = new ArrayList<>();\n        merged.add(list.get(0));\n        for (int i = 1; i < list.size(); i++) {\n            int[] last = merged.get(merged.size() - 1);\n            if (list.get(i)[0] <= last[1]) last[1] = Math.max(last[1], list.get(i)[1]);\n            else merged.add(list.get(i));\n        }\n        for (int[] m : merged) System.out.println(m[0] + " " + m[1]);\n    }\n}`
    }
  },

  // ─── HARD ───────────────────────────────────────────────────────────────────
  {
    id: "q_bfs_grid_pl",
    title: "Shortest Path in Binary Matrix",
    type: "Algorithm",
    difficulty: "Hard",
    description: "Given an n x n binary matrix `grid`, return the length of the shortest clear path from top-left to bottom-right. A clear path is a path where all visited cells are 0 (unblocked). You may move in 8 directions. If no path exists, return -1.",
    inputFormat: "n lines, each containing n space-separated integers (0 or 1).",
    outputFormat: "Print the shortest path length, or -1.",
    constraints: ["n == grid.length == grid[i].length", "1 <= n <= 100", "grid[i][j] is 0 or 1"],
    examples: [
      { input: "0 1\n1 0", output: "2", explanation: "Path: (0,0) -> (1,1)" },
      { input: "0 0 0\n1 1 0\n1 1 0", output: "4" }
    ],
    testCases: [
      { input: "0 1\n1 0", expectedOutput: "2", isHidden: false },
      { input: "0 0 0\n1 1 0\n1 1 0", expectedOutput: "4", isHidden: false },
      { input: "1 0 0\n1 1 0\n1 1 0", expectedOutput: "-1", isHidden: true },
      { input: "0", expectedOutput: "1", isHidden: true },
      { input: "0 0\n0 0", expectedOutput: "3", isHidden: true }
    ],
    topics: ["BFS", "Graph", "Matrix", "Shortest Path"],
    starterTemplates: {
      javascript: `// Shortest Path in Binary Matrix\nfunction solve(input) {\n  const grid = input.trim().split('\\n').map(l => l.trim().split(/\\s+/).map(Number));\n  const n = grid.length;\n  if (grid[0][0] === 1 || grid[n-1][n-1] === 1) { console.log(-1); return; }\n  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];\n  const q = [[0, 0, 1]];\n  const visited = new Set();\n  visited.add("0,0");\n  while (q.length) {\n    const [r, c, d] = q.shift();\n    if (r === n-1 && c === n-1) { console.log(d); return; }\n    for (const [dr, dc] of dirs) {\n      const nr = r + dr, nc = c + dc;\n      if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] === 0 && !visited.has(nr+","+nc)) {\n        visited.add(nr+","+nc);\n        q.push([nr, nc, d+1]);\n      }\n    }\n  }\n  console.log(-1);\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `import sys\nfrom collections import deque\ndef solve():\n    grid = [list(map(int, l.split())) for l in sys.stdin.read().strip().split('\\n')]\n    n = len(grid)\n    if grid[0][0] == 1 or grid[n-1][n-1] == 1:\n        print(-1); return\n    q = deque([(0, 0, 1)])\n    vis = {(0, 0)}\n    dirs = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]\n    while q:\n        r, c, d = q.popleft()\n        if r == n-1 and c == n-1:\n            print(d); return\n        for dr, dc in dirs:\n            nr, nc = r+dr, c+dc\n            if 0 <= nr < n and 0 <= nc < n and grid[nr][nc] == 0 and (nr, nc) not in vis:\n                vis.add((nr, nc))\n                q.append((nr, nc, d+1))\n    print(-1)\nsolve()`,
      cpp: `#include <iostream>\n#include <vector>\n#include <queue>\n#include <tuple>\nusing namespace std;\nint main() {\n    vector<vector<int>> grid;\n    string line;\n    while (getline(cin, line) && !line.empty()) {\n        vector<int> row; int v; istringstream iss(line);\n        while (iss >> v) row.push_back(v);\n        grid.push_back(row);\n    }\n    int n = grid.size();\n    if (grid[0][0] == 1 || grid[n-1][n-1] == 1) { cout << -1 << endl; return 0; }\n    int dirs[8][2] = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};\n    queue<tuple<int,int,int>> q;\n    q.push({0,0,1});\n    vector<vector<bool>> vis(n, vector<bool>(n, false));\n    vis[0][0] = true;\n    while (!q.empty()) {\n        auto [r,c,d] = q.front(); q.pop();\n        if (r == n-1 && c == n-1) { cout << d << endl; return 0; }\n        for (auto& [dr,dc] : dirs) {\n            int nr = r+dr, nc = c+dc;\n            if (nr>=0 && nr<n && nc>=0 && nc<n && grid[nr][nc]==0 && !vis[nr][nc]) {\n                vis[nr][nc] = true;\n                q.push({nr,nc,d+1});\n            }\n        }\n    }\n    cout << -1 << endl;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        List<int[]> rows = new ArrayList<>();\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) break;\n            String[] parts = line.split("\\\\\\\\s+");\n            int[] row = new int[parts.length];\n            for (int i = 0; i < parts.length; i++) row[i] = Integer.parseInt(parts[i]);\n            rows.add(row);\n        }\n        int n = rows.size();\n        int[][] grid = rows.toArray(new int[0][]);\n        if (grid[0][0] == 1 || grid[n-1][n-1] == 1) { System.out.println(-1); return; }\n        int[][] dirs = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};\n        Queue<int[]> q = new LinkedList<>();\n        q.offer(new int[]{0, 0, 1});\n        boolean[][] vis = new boolean[n][n];\n        vis[0][0] = true;\n        while (!q.isEmpty()) {\n            int[] cur = q.poll();\n            if (cur[0] == n-1 && cur[1] == n-1) { System.out.println(cur[2]); return; }\n            for (int[] d : dirs) {\n                int nr = cur[0]+d[0], nc = cur[1]+d[1];\n                if (nr>=0 && nr<n && nc>=0 && nc<n && grid[nr][nc]==0 && !vis[nr][nc]) {\n                    vis[nr][nc] = true;\n                    q.offer(new int[]{nr, nc, cur[2]+1});\n                }\n            }\n        }\n        System.out.println(-1);\n    }\n}`
    }
  },
  {
    id: "q_lru_cache_pl",
    title: "LRU Cache Implementation",
    type: "Data Structures",
    difficulty: "Hard",
    description: "Design and implement a data structure that follows the Least Recently Used (LRU) cache eviction policy. Implement the `LRUCache` class with `get` and `put` operations.\n\nSimulate operations: `GET key` and `PUT key value`. Output the result of each GET operation.",
    inputFormat: "Each line is a command: GET key or PUT key value.",
    outputFormat: "For each GET command, print the value or -1 if not found. One result per line.",
    constraints: ["1 <= capacity <= 3000", "0 <= key <= 10^4", "0 <= value <= 10^5", "At most 2 * 10^4 calls"],
    examples: [
      { input: "PUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2", output: "1\n-1" },
      { input: "PUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3", output: "1\n-1\n3" }
    ],
    testCases: [
      { input: "PUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2", expectedOutput: "1\n-1", isHidden: false },
      { input: "PUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3", expectedOutput: "1\n-1\n3", isHidden: true },
      { input: "GET 1", expectedOutput: "-1", isHidden: true },
      { input: "PUT 1 10\nPUT 2 20\nPUT 3 30\nGET 1\nGET 2\nGET 3", expectedOutput: "10\n20\n30", isHidden: true }
    ],
    topics: ["Hash Map", "Linked List", "LRU Cache", "Design"],
    starterTemplates: {
      javascript: `// LRU Cache Implementation\nclass Node { constructor(k, v) { this.key = k; this.val = v; this.prev = null; this.next = null; } }\nclass LRUCache {\n  constructor(cap) { this.cap = cap; this.map = new Map(); this.head = new Node(0,0); this.tail = new Node(0,0); this.head.next = this.tail; this.tail.prev = this.head; }\n  _remove(node) { node.prev.next = node.next; node.next.prev = node.prev; }\n  _addFront(node) { node.next = this.head.next; node.prev = this.head; this.head.next.prev = node; this.head.next = node; }\n  get(key) {\n    if (!this.map.has(key)) return -1;\n    const node = this.map.get(key);\n    this._remove(node); this._addFront(node);\n    return node.val;\n  }\n  put(key, val) {\n    if (this.map.has(key)) this._remove(this.map.get(key));\n    const node = new Node(key, val);\n    this.map.set(key, node); this._addFront(node);\n    if (this.map.size > this.cap) { const lru = this.tail.prev; this._remove(lru); this.map.delete(lru.key); }\n  }\n}\nfunction solve(input) {\n  const lines = input.trim().split('\\n');\n  const lru = new LRUCache(2);\n  const outputs = [];\n  for (const line of lines) {\n    const parts = line.trim().split(/\\s+/);\n    if (parts[0] === 'PUT') { lru.put(parseInt(parts[1]), parseInt(parts[2])); }\n    else if (parts[0] === 'GET') { outputs.push(String(lru.get(parseInt(parts[1])))); }\n  }\n  console.log(outputs.join('\\n'));\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `import sys\nfrom collections import OrderedDict\nclass LRUCache:\n    def __init__(self, cap):\n        self.cap = cap\n        self.cache = OrderedDict()\n    def get(self, key):\n        if key not in self.cache: return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    def put(self, key, val):\n        if key in self.cache: self.cache.move_to_end(key)\n        self.cache[key] = val\n        if len(self.cache) > self.cap: self.cache.popitem(last=False)\ndef solve():\n    lines = sys.stdin.read().strip().split('\\n')\n    lru = LRUCache(2)\n    out = []\n    for line in lines:\n        parts = line.split()\n        if parts[0] == 'PUT': lru.put(int(parts[1]), int(parts[2]))\n        elif parts[0] == 'GET': out.append(str(lru.get(int(parts[1]))))\n    print('\\n'.join(out))\nsolve()`,
      cpp: `#include <iostream>\n#include <list>\n#include <unordered_map>\nusing namespace std;\nclass LRUCache {\n    int cap;\n    list<pair<int,int>> lru;\n    unordered_map<int, list<pair<int,int>>::iterator> mp;\npublic:\n    LRUCache(int c) : cap(c) {}\n    int get(int key) {\n        if (!mp.count(key)) return -1;\n        lru.splice(lru.begin(), lru, mp[key]);\n        return mp[key]->second;\n    }\n    void put(int key, int val) {\n        if (mp.count(key)) { lru.splice(lru.begin(), lru, mp[key]); mp[key]->second = val; return; }\n        if (lru.size() == cap) { auto last = lru.back(); mp.erase(last.first); lru.pop_back(); }\n        lru.emplace_front(key, val); mp[key] = lru.begin();\n    }\n};\nint main() {\n    LRUCache lru(2);\n    string line;\n    while (getline(cin, line) && !line.empty()) {\n        istringstream iss(line); string cmd; iss >> cmd;\n        if (cmd == "PUT") { int k, v; iss >> k >> v; lru.put(k, v); }\n        else if (cmd == "GET") { int k; iss >> k; cout << lru.get(k) << endl; }\n    }\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    static class LRUCache extends LinkedHashMap<Integer, Integer> {\n        int cap;\n        public LRUCache(int cap) { super(cap, 0.75f, true); this.cap = cap; }\n        public int get(int key) { return super.getOrDefault(key, -1); }\n        public void put(int key, int val) { super.put(key, val); }\n        protected boolean removeEldestEntry(Map.Entry e) { return size() > cap; }\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        LRUCache lru = new LRUCache(2);\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine().trim();\n            if (line.isEmpty()) break;\n            String[] p = line.split("\\\\\\\\s+");\n            if (p[0].equals("PUT")) lru.put(Integer.parseInt(p[1]), Integer.parseInt(p[2]));\n            else if (p[0].equals("GET")) System.out.println(lru.get(Integer.parseInt(p[1])));\n        }\n    }\n}`
    }
  },
  {
    id: "q_debugging_pl",
    title: "Bug Hunt: Fix the Broken Sort",
    type: "Debugging",
    difficulty: "Medium",
    description: "The following function is supposed to sort an array of integers in ascending order, but it has a bug. Find and fix the bug.\n\n```javascript\nfunction buggySort(arr) {\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = 0; j < arr.length; j++) {\n      if (arr[i] < arr[j]) {\n        let temp = arr[i];\n        arr[i] = arr[j];\n        arr[j] = temp;\n      }\n    }\n  }\n  return arr;\n}\n```\n\nFix the sorting algorithm so it correctly sorts the input array.",
    inputFormat: "First line: number of elements n.\nSecond line: n space-separated integers.",
    outputFormat: "Print sorted array as space-separated integers.",
    constraints: ["1 <= n <= 1000", "-10^4 <= arr[i] <= 10^4"],
    examples: [
      { input: "5\n3 1 4 1 5", output: "1 1 3 4 5" },
      { input: "3\n5 2 7", output: "2 5 7" }
    ],
    testCases: [
      { input: "5\n3 1 4 1 5", expectedOutput: "1 1 3 4 5", isHidden: false },
      { input: "3\n5 2 7", expectedOutput: "2 5 7", isHidden: false },
      { input: "1\n42", expectedOutput: "42", isHidden: true },
      { input: "4\n4 3 2 1", expectedOutput: "1 2 3 4", isHidden: true },
      { input: "6\n-3 0 -1 5 2 8", expectedOutput: "-3 -1 0 2 5 8", isHidden: true }
    ],
    topics: ["Debugging", "Sorting", "Bubble Sort"],
    starterTemplates: {
      javascript: `// Bug Hunt: Fix the Broken Sort\n// Fix: change arr[i] < arr[j] to arr[i] > arr[j]\nfunction solve(input) {\n  const lines = input.trim().split('\\n');\n  const arr = lines[1].trim().split(/\\s+/).map(Number);\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i + 1; j < arr.length; j++) {\n      if (arr[i] > arr[j]) {\n        let temp = arr[i];\n        arr[i] = arr[j];\n        arr[j] = temp;\n      }\n    }\n  }\n  console.log(arr.join(' '));\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `import sys\ndef solve():\n    lines = sys.stdin.read().strip().split('\\n')\n    arr = list(map(int, lines[1].split()))\n    arr.sort()\n    print(' '.join(map(str, arr)))\nsolve()`,
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    vector<int> arr(n);\n    for (int i = 0; i < n; i++) cin >> arr[i];\n    sort(arr.begin(), arr.end());\n    for (int i = 0; i < n; i++) cout << (i ? " " : "") << arr[i];\n    cout << endl;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] arr = new int[n];\n        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();\n        Arrays.sort(arr);\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) { if (i > 0) sb.append(" "); sb.append(arr[i]); }\n        System.out.println(sb);\n    }\n}`
    }
  },
  {
    id: "q_api_design_pl",
    title: "API Response Rate Limiter",
    type: "Backend Logic",
    difficulty: "Hard",
    description: "Implement a simple sliding window rate limiter. Given a series of timestamped requests and a limit of `maxRequests` per `windowMs` milliseconds, determine which requests are allowed and which are rejected.\n\nInput format: First line has `maxRequests windowMs`. Subsequent lines have timestamps in milliseconds.",
    inputFormat: "First line: maxRequests windowMs\nRemaining lines: one timestamp per line (integer ms).",
    outputFormat: "For each timestamp, print 'ALLOWED' or 'REJECTED'.",
    constraints: ["1 <= maxRequests <= 1000", "1000 <= windowMs <= 60000", "Timestamps are non-decreasing"],
    examples: [
      { input: "3 1000\n1000\n2000\n3000\n4000", output: "ALLOWED\nALLOWED\nALLOWED\nALLOWED" },
      { input: "2 1000\n1000\n1000\n1000\n2000", output: "ALLOWED\nALLOWED\nREJECTED\nALLOWED" }
    ],
    testCases: [
      { input: "3 1000\n1000\n2000\n3000\n4000", expectedOutput: "ALLOWED\nALLOWED\nALLOWED\nALLOWED", isHidden: false },
      { input: "2 1000\n1000\n1000\n1000\n2000", expectedOutput: "ALLOWED\nALLOWED\nREJECTED\nALLOWED", isHidden: false },
      { input: "1 1000\n5000\n5000\n6000", expectedOutput: "ALLOWED\nREJECTED\nALLOWED", isHidden: true },
      { input: "2 2000\n1000\n1500\n3000", expectedOutput: "ALLOWED\nALLOWED\nALLOWED", isHidden: true }
    ],
    topics: ["Rate Limiting", "Sliding Window", "Backend Systems"],
    starterTemplates: {
      javascript: `// API Response Rate Limiter\nfunction solve(input) {\n  const lines = input.trim().split('\\n');\n  const [maxReq, windowMs] = lines[0].trim().split(/\\s+/).map(Number);\n  const timestamps = lines.slice(1).map(Number);\n  const window = [];\n  for (const ts of timestamps) {\n    while (window.length > 0 && window[0] <= ts - windowMs) window.shift();\n    if (window.length < maxReq) { window.push(ts); console.log("ALLOWED"); }\n    else console.log("REJECTED");\n  }\n}\nconst fs = require('fs');\nsolve(fs.readFileSync('/dev/stdin', 'utf-8'));`,
      python: `import sys\ndef solve():\n    lines = sys.stdin.read().strip().split('\\n')\n    max_req, window_ms = map(int, lines[0].split())\n    timestamps = list(map(int, lines[1:]))\n    window = []\n    for ts in timestamps:\n        while window and window[0] <= ts - window_ms:\n            window.pop(0)\n        if len(window) < max_req:\n            window.append(ts)\n            print("ALLOWED")\n        else:\n            print("REJECTED")\nsolve()`,
      cpp: `#include <iostream>\n#include <deque>\nusing namespace std;\nint main() {\n    int maxReq, windowMs;\n    cin >> maxReq >> windowMs;\n    deque<long long> window;\n    long long ts;\n    while (cin >> ts) {\n        while (!window.empty() && window.front() <= ts - windowMs) window.pop_front();\n        if (window.size() < maxReq) { window.push_back(ts); cout << "ALLOWED" << endl; }\n        else cout << "REJECTED" << endl;\n    }\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int maxReq = sc.nextInt(), windowMs = sc.nextInt();\n        Deque<Long> window = new ArrayDeque<>();\n        while (sc.hasNextLong()) {\n            long ts = sc.nextLong();\n            while (!window.isEmpty() && window.peekFirst() <= ts - windowMs) window.pollFirst();\n            if (window.size() < maxReq) { window.offerLast(ts); System.out.println("ALLOWED"); }\n            else System.out.println("REJECTED");\n        }\n    }\n}`
    }
  },
  {
    id: "q_output_predict_pl",
    title: "Output Prediction: Recursive Fibonacci",
    type: "Output Prediction",
    difficulty: "Easy",
    description: "Predict the output of the following code without running it:\n\n```javascript\nfunction fib(n) {\n  if (n <= 1) return n;\n  return fib(n-1) + fib(n-2);\n}\nconsole.log(fib(6));\n```\n\nWrite a program that computes and prints the value of fib(6).",
    inputFormat: "No input required.",
    outputFormat: "Print the output of fib(6).",
    constraints: ["0 <= n <= 30"],
    examples: [
      { input: "", output: "8" },
      { input: "", output: "8", explanation: "fib(6) = 8 (sequence: 0,1,1,2,3,5,8)" }
    ],
    testCases: [
      { input: "", expectedOutput: "8", isHidden: false },
      { input: "", expectedOutput: "8", isHidden: true }
    ],
    topics: ["Recursion", "Fibonacci", "Output Prediction"],
    starterTemplates: {
      javascript: `function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }\nconsole.log(fib(6));`,
      python: `def fib(n): return n if n <= 1 else fib(n-1) + fib(n-2)\nprint(fib(6))`,
      cpp: `#include <iostream>\nusing namespace std;\nint fib(int n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }\nint main() { cout << fib(6) << endl; return 0; }`,
      java: `public class Main {\n    static int fib(int n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }\n    public static void main(String[] args) { System.out.println(fib(6)); }\n}`
    }
  }
];

// ─── Question Selection Logic ────────────────────────────────────────────────

function selectQuestionsForPreset(preset: CompanyPreset, assessmentType: string): AssessmentQuestion[] {
  const count = preset.questionCount;
  let pool = [...ASSESSMENT_QUESTIONS];

  if (assessmentType === "dsa") pool = pool.filter(q => q.type === "Algorithm" || q.type === "Data Structures");
  else if (assessmentType === "sql") pool = pool.filter(q => q.type === "SQL");
  else if (assessmentType === "frontend") pool = pool.filter(q => q.type === "Frontend Logic" || q.type === "Output Prediction");
  else if (assessmentType === "backend") pool = pool.filter(q => q.type === "Backend Logic" || q.type === "API Design");
  else if (assessmentType === "debugging") pool = pool.filter(q => q.type === "Debugging");

  if (pool.length === 0) pool = [...ASSESSMENT_QUESTIONS];

  if (preset.difficulty === "Easy") pool.sort((a, b) => { const d = { Easy: 0, Medium: 1, Hard: 2 }; return (d[a.difficulty] || 0) - (d[b.difficulty] || 0); });
  else if (preset.difficulty === "Hard") pool.sort((a, b) => { const d = { Easy: 0, Medium: 1, Hard: 2 }; return (d[b.difficulty] || 0) - (d[a.difficulty] || 0); });

  return pool.slice(0, Math.min(count, pool.length));
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export class CodingAssessmentService {

  getPresets() {
    return {
      presets: Object.values(COMPANY_PRESETS),
      assessmentTypes: [
        { id: "practice", label: "Practice Assessment", desc: "Untimed, step-by-step feedback with hints." },
        { id: "company", label: "Company Assessment", desc: "Simulates exact company placement pattern." },
        { id: "timed", label: "Timed Coding Round", desc: "Strict exam conditions with auto-submission." },
        { id: "dsa", label: "DSA Assessment", desc: "Focuses on Data Structures & Algorithms depth." },
        { id: "sql", label: "SQL Assessment", desc: "Focuses on database queries and schema logic." },
        { id: "frontend", label: "Frontend Logic", desc: "Focuses on DOM manipulation and JS algorithms." },
        { id: "backend", label: "Backend Logic", desc: "Focuses on API logic, JSON parsing, and async ops." },
        { id: "fullstack", label: "Full Stack Assessment", desc: "Mixed coding assessment across all layers." },
        { id: "custom", label: "Custom Assessment", desc: "Configurable question count and time limit." }
      ]
    };
  }

  async startAssessment(userId: string, payload: {
    assessmentType?: string;
    companyId?: string;
    language?: string;
    durationMinutes?: number;
  }) {
    const companyId = payload.companyId || "custom";
    const preset = COMPANY_PRESETS[companyId] || COMPANY_PRESETS.custom;
    const assessmentType = payload.assessmentType || "company";
    const language = payload.language || "javascript";

    const questions = selectQuestionsForPreset(preset, assessmentType);

    const assessment = await prisma.codingAssessment.create({
      data: {
        userId,
        assessmentType,
        company: preset.name,
        language,
        status: "in_progress",
        reportJson: {
          companyId,
          timeLimitMinutes: payload.durationMinutes || preset.timeLimitMinutes,
          passingScore: preset.passingScore,
          questions: questions.map(q => ({
            id: q.id,
            title: q.title,
            type: q.type,
            difficulty: q.difficulty,
            topics: q.topics,
            description: q.description,
            inputFormat: q.inputFormat,
            outputFormat: q.outputFormat,
            constraints: q.constraints,
            examples: q.examples,
            testCasesCount: q.testCases.length,
            starterCode: q.starterTemplates[language] || q.starterTemplates.javascript
          }))
        }
      }
    });

    return {
      id: assessment.id,
      company: preset.name,
      companyId,
      assessmentType,
      language,
      timeLimitMinutes: payload.durationMinutes || preset.timeLimitMinutes,
      passingScore: preset.passingScore,
      questions: questions.map(q => ({
        id: q.id,
        title: q.title,
        type: q.type,
        difficulty: q.difficulty,
        topics: q.topics,
        description: q.description,
        inputFormat: q.inputFormat,
        outputFormat: q.outputFormat,
        constraints: q.constraints,
        examples: q.examples,
        starterCode: q.starterTemplates[language] || q.starterTemplates.javascript
      }))
    };
  }

  async runSampleCode(language: string, code: string, stdin: string) {
    return await executeCode(language, code, stdin);
  }

  async submitQuestion(userId: string, payload: {
    assessmentId: string;
    questionId: string;
    code: string;
    language: string;
  }) {
    const question = ASSESSMENT_QUESTIONS.find(q => q.id === payload.questionId) || ASSESSMENT_QUESTIONS[0];
    const testResults = await runTestCases(payload.language, payload.code, question.testCases);

    let complexity: any;
    let aiFeedback: any;
    try {
      [complexity, aiFeedback] = await Promise.all([
        analyzeComplexityAI(payload.code, payload.language),
        reviewCodeAI(payload.code, payload.language, question.title, testResults.allPassed)
      ]);
    } catch {
      complexity = analyzeComplexityFallback(payload.code, payload.language);
      aiFeedback = {
        summary: `Code for "${question.title}" written in ${payload.language}.`,
        qualityScore: testResults.allPassed ? 82 : 55,
        optimizations: ["Consider edge cases"]
      };
    }

    const verdict = testResults.allPassed ? "Accepted" : testResults.passedTests > 0 ? "Partial Success" : "Wrong Answer";

    const existing = await prisma.codingSubmission.findFirst({
      where: { assessmentId: payload.assessmentId, questionId: payload.questionId }
    });

    const reviewData = {
      complexity: { timeComplexity: complexity.timeComplexity, spaceComplexity: complexity.spaceComplexity, efficiency: complexity.efficiency },
      aiFeedback,
      testResults: testResults.testResults
    };

    if (existing) {
      await prisma.codingSubmission.update({
        where: { id: existing.id },
        data: { code: payload.code, runtime: testResults.executionTime, memory: testResults.memory, verdict, passedTests: testResults.passedTests, totalTests: testResults.totalTests, aiReviewJson: reviewData }
      });
    } else {
      await prisma.codingSubmission.create({
        data: { assessmentId: payload.assessmentId, questionId: payload.questionId, code: payload.code, runtime: testResults.executionTime, memory: testResults.memory, verdict, passedTests: testResults.passedTests, totalTests: testResults.totalTests, aiReviewJson: reviewData }
      });
    }

    return {
      verdict,
      allPassed: testResults.allPassed,
      passedTests: testResults.passedTests,
      totalTests: testResults.totalTests,
      executionTime: testResults.executionTime,
      memory: testResults.memory,
      complexity: { timeComplexity: complexity.timeComplexity, spaceComplexity: complexity.spaceComplexity },
      aiFeedback,
      testDetails: testResults.testResults.map((r, i) => ({
        testNumber: i + 1,
        passed: r.passed,
        actualOutput: r.actualOutput,
        expectedOutput: r.expectedOutput,
        isHidden: question.testCases[i]?.isHidden || false
      }))
    };
  }

  async submitAssessment(userId: string, payload: {
    assessmentId: string;
    submissions: Array<{ questionId: string; code: string; language: string }>;
    timeSpentSeconds: number;
  }) {
    const assessment = await prisma.codingAssessment.findUnique({
      where: { id: payload.assessmentId },
      include: { submissions: true }
    });

    if (!assessment) throw new Error("Assessment session not found.");

    let totalPassedTestcases = 0;
    let totalTestcases = 0;
    const evaluatedQuestions: any[] = [];

    for (const sub of payload.submissions) {
      const q = ASSESSMENT_QUESTIONS.find(item => item.id === sub.questionId) || ASSESSMENT_QUESTIONS[0];
      const res = await runTestCases(sub.language, sub.code, q.testCases);
      totalPassedTestcases += res.passedTests;
      totalTestcases += res.totalTests;
      let comp;
      try { comp = await analyzeComplexityAI(sub.code, sub.language); } catch { comp = analyzeComplexityFallback(sub.code, sub.language); }

      evaluatedQuestions.push({
        questionId: q.id,
        title: q.title,
        type: q.type,
        difficulty: q.difficulty,
        topics: q.topics,
        passed: res.allPassed,
        passedTests: res.passedTests,
        totalTests: res.totalTests,
        runtimeMs: res.executionTime,
        timeComplexity: comp.timeComplexity,
        spaceComplexity: comp.spaceComplexity,
        efficiency: comp.efficiency || 70
      });
    }

    const accuracyScore = totalTestcases > 0 ? Math.round((totalPassedTestcases / totalTestcases) * 100) : 0;
    const speedScore = Math.max(30, Math.min(100, Math.round(100 - (payload.timeSpentSeconds / 1800) * 20)));
    const avgEfficiency = evaluatedQuestions.length > 0
      ? Math.round(evaluatedQuestions.reduce((a, q) => a + (q.efficiency || 70), 0) / evaluatedQuestions.length)
      : 70;

    const prompt = `You are an expert FAANG Senior Principal Assessment Architect. Analyze this completed candidate coding assessment:

Company Target: ${assessment.company}
Assessment Type: ${assessment.assessmentType}
Language: ${assessment.language}
Passed Test Cases: ${totalPassedTestcases} / ${totalTestcases} (${accuracyScore}%)
Time Spent: ${Math.round(payload.timeSpentSeconds / 60)} minutes
Question Results: ${JSON.stringify(evaluatedQuestions)}

Return a strict JSON object with:
{
  "overallScore": number (0-100),
  "codingReadiness": number (0-100),
  "companyReadiness": number (0-100),
  "interviewReadiness": number (0-100),
  "placementConfidence": number (0-100),
  "codeQualityGrade": string ("A+" | "A" | "B+" | "B" | "C" | "D"),
  "summary": string (2-3 sentences overall assessment),
  "weakTopics": string[],
  "strongTopics": string[],
  "recommendedCompanies": string[],
  "aiCoachAdvice": string (detailed coaching advice, 3-4 sentences),
  "suggestedChallenges": string[] (3 specific DSA challenge topics),
  "suggestedInterviews": string[] (2-3 interview types to practice),
  "xpAwarded": number (100-500 based on performance),
  "badgesEarned": string[] (relevant badges like "Speed Demon", "Perfect Score", "First Assessment", etc.),
  "skillBreakdown": {
    "problemSolving": number (0-100),
    "codeEfficiency": number (0-100),
    "codeQuality": number (0-100),
    "edgeCaseHandling": number (0-100),
    "timeManagement": number (0-100)
  }
}`;

    let aiReport: any = null;
    try {
      const aiResponse = await callAIRobust(
        [{ role: "user", content: prompt }],
        { model: "deepseek-ai/deepseek-r1", responseFormat: { type: "json_object" } }
      );
      aiReport = JSON.parse(aiResponse.replace(/```json|```/g, "").trim());
    } catch {
      aiReport = {
        overallScore: accuracyScore,
        codingReadiness: Math.min(95, accuracyScore + 5),
        companyReadiness: Math.min(90, accuracyScore),
        interviewReadiness: Math.min(88, accuracyScore - 5),
        placementConfidence: Math.min(92, accuracyScore),
        codeQualityGrade: accuracyScore >= 90 ? "A+" : accuracyScore >= 80 ? "A" : accuracyScore >= 65 ? "B" : "C",
        summary: `Demonstrated ${accuracyScore}% test accuracy in ${assessment.company} assessment round.`,
        weakTopics: ["Dynamic Programming", "Graph Edge Cases"],
        strongTopics: ["Array Manipulation", "Sliding Window"],
        recommendedCompanies: [assessment.company, "TCS", "Accenture", "Infosys"],
        aiCoachAdvice: "Focus on optimizing time complexity. Practice more edge cases and consider using hash maps for O(1) lookups.",
        suggestedChallenges: ["Two Pointer Optimization", "Tree Traversal Mastery", "Graph BFS/DFS Patterns"],
        suggestedInterviews: ["Technical Mock Interview", "System Design Practice", "Coding Speed Round"],
        xpAwarded: Math.round(accuracyScore * 3 + speedScore),
        badgesEarned: accuracyScore === 100 ? ["Perfect Score"] : accuracyScore >= 80 ? ["Strong Performer"] : [],
        skillBreakdown: {
          problemSolving: accuracyScore,
          codeEfficiency: avgEfficiency,
          codeQuality: accuracyScore >= 80 ? 85 : 65,
          edgeCaseHandling: Math.round(accuracyScore * 0.85),
          timeManagement: speedScore
        }
      };
    }

    const finalReport = {
      score: aiReport.overallScore || accuracyScore,
      passedTestcases: totalPassedTestcases,
      totalTestcases,
      accuracyScore,
      speedScore,
      avgEfficiency,
      timeSpentSeconds: payload.timeSpentSeconds,
      codeQualityGrade: aiReport.codeQualityGrade || "B",
      codingReadiness: aiReport.codingReadiness || 75,
      companyReadiness: aiReport.companyReadiness || 70,
      interviewReadiness: aiReport.interviewReadiness || 72,
      placementConfidence: aiReport.placementConfidence || 78,
      summary: aiReport.summary,
      weakTopics: aiReport.weakTopics || [],
      strongTopics: aiReport.strongTopics || [],
      recommendedCompanies: aiReport.recommendedCompanies || [],
      aiCoachAdvice: aiReport.aiCoachAdvice,
      suggestedChallenges: aiReport.suggestedChallenges || [],
      suggestedInterviews: aiReport.suggestedInterviews || [],
      xpAwarded: aiReport.xpAwarded || Math.round(accuracyScore * 2),
      badgesEarned: aiReport.badgesEarned || [],
      skillBreakdown: aiReport.skillBreakdown || {
        problemSolving: accuracyScore,
        codeEfficiency: avgEfficiency,
        codeQuality: 70,
        edgeCaseHandling: Math.round(accuracyScore * 0.85),
        timeManagement: speedScore
      },
      evaluatedQuestions
    };

    await prisma.codingAssessment.update({
      where: { id: payload.assessmentId },
      data: { score: finalReport.score, passedTestcases: totalPassedTestcases, totalTestcases, status: "completed", reportJson: finalReport }
    });

    try {
      await prisma.careerDashboardSnapshot.upsert({
        where: { userId },
        update: { codingScore: finalReport.score, overallReadiness: Math.round((finalReport.score + 70) / 2) },
        create: { userId, overallReadiness: Math.round((finalReport.score + 70) / 2), codingScore: finalReport.score, learningScore: 75, resumeScore: 80, atsScore: 78, linkedinScore: 70, dashboardJson: {} }
      });
    } catch { /* Ignore if user snapshot schema differs */ }

    return { assessmentId: payload.assessmentId, report: finalReport };
  }

  async getAssessmentResult(assessmentId: string) {
    const assessment = await prisma.codingAssessment.findUnique({
      where: { id: assessmentId },
      include: { submissions: true }
    });
    if (!assessment) throw new Error("Assessment result not found.");
    return {
      id: assessment.id, company: assessment.company, assessmentType: assessment.assessmentType,
      language: assessment.language, score: assessment.score, passedTestcases: assessment.passedTestcases,
      totalTestcases: assessment.totalTestcases, status: assessment.status, createdAt: assessment.createdAt,
      report: assessment.reportJson, submissions: assessment.submissions
    };
  }

  async getAssessmentHistory(userId: string) {
    return await prisma.codingAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  }

  async getRecommendations(userId: string) {
    const history = await this.getAssessmentHistory(userId);
    const avgScore = history.length > 0
      ? Math.round(history.reduce((acc, h) => acc + h.score, 0) / history.length)
      : 72;

    const allWeak = history.flatMap(h => {
      const r = h.reportJson as any;
      return r?.weakTopics || [];
    });
    const weakTopicCounts: Record<string, number> = {};
    allWeak.forEach(t => { weakTopicCounts[t] = (weakTopicCounts[t] || 0) + 1; });
    const weakTopics = Object.entries(weakTopicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

    const allStrong = history.flatMap(h => {
      const r = h.reportJson as any;
      return r?.strongTopics || [];
    });
    const strongTopicCounts: Record<string, number> = {};
    allStrong.forEach(t => { strongTopicCounts[t] = (strongTopicCounts[t] || 0) + 1; });
    const strongTopics = Object.entries(strongTopicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

    return {
      codingReadinessScore: avgScore,
      totalAssessmentsCompleted: history.length,
      recommendedCompanies: avgScore >= 80 ? ["Google", "Microsoft", "Amazon"] : avgScore >= 65 ? ["TCS", "Infosys", "Wipro"] : ["Startup", "Capgemini", "Cognizant"],
      weakTopics: weakTopics.length > 0 ? weakTopics : ["Graph Algorithms", "Dynamic Programming", "System Architecture"],
      strongTopics: strongTopics.length > 0 ? strongTopics : ["Arrays", "Strings", "Sliding Window"],
      suggestedNextSteps: [
        { title: "Google Timed DSA Assessment", type: "assessment" },
        { title: "Technical Mock Interview", type: "interview" },
        { title: weakTopics[0] ? `${weakTopics[0]} Masterclass` : "Sliding Window Masterclass", type: "learning" }
      ]
    };
  }
}

export const codingAssessmentService = new CodingAssessmentService();
