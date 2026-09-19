import { AptitudeCategory, Difficulty } from "./aptitude-engine.service";
import {
  QuestionRawData,
  archIndex,
  shuffleWithOptions,
  generatePercentagesQuestion,
  generateProfitLossQuestion,
  generateTimeWorkQuestion,
  generateSpeedDistanceQuestion,
  generateInterestQuestion,
  generateRatioQuestion,
  generateProbabilityQuestion,
  generatePermutationQuestion,
  generateAverageQuestion,
  generateMixtureQuestion,
} from "./aptitude-archetypes";

// Helper for names and contexts
const NAMES = ["Aarav", "Rohan", "Vikram", "Karan", "Siddharth", "Priya", "Ananya", "Sneha", "Rahul", "Meera", "Arjun", "Pooja", "Dev", "Neha", "Aditya"];
const COMPANIES = ["TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Google", "Amazon", "Microsoft", "Deloitte", "Capgemini"];

function simplifyRatio(a: number, b: number): string {
  const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
  const g = gcd(Math.abs(a), Math.abs(b)) || 1;
  return `${Math.round(a / g)} : ${Math.round(b / g)}`;
}

// ============================================================================
// 1. NUMBER SYSTEMS SPECIALIZED GENERATORS
// ============================================================================

export function generateNumberSystemsTopicQuestion(
  topic: string,
  qIndex: number,
  testNum: number,
  seed: number,
  prefix: string
): QuestionRawData {
  const normTopic = topic.toLowerCase();
  const qSeed = seed + qIndex * 89 + testNum * 43;

  if (normTopic.includes("hcf") || normTopic.includes("lcm")) {
    const arch = archIndex(qIndex, testNum, 6);
    if (arch === 0) {
      // Product = HCF * LCM with varied multipliers
      const hcf = 6 + (qSeed % 12);
      const r1 = 3 + ((qSeed * 2) % 5);
      const r2 = r1 + 2 + (qSeed % 3);
      const a = hcf * r1;
      const b = hcf * r2;
      const lcm = hcf * r1 * r2;
      return {
        text: `${prefix} The HCF of two numbers is ${hcf} and their LCM is ${lcm}. If one of the numbers is ${a}, what is the other number?`,
        correctVal: `${b}`,
        distractors: [`${b + hcf}`, `${b - hcf}`, `${Math.round(b * 1.5)}`],
        explanation: `Using the fundamental property: Product of two numbers = HCF × LCM. Other number = (HCF × LCM) / First Number = (${hcf} × ${lcm}) / ${a} = ${b}.`,
        shortcut: `Other Number = (${hcf} × ${lcm}) / ${a} = ${b}.`,
        topic: "HCF & LCM",
        category: "number_systems",
        commonMistakes: ["Adding HCF and LCM instead of multiplying", "Dividing by HCF instead of the given number"],
      };
    } else if (arch === 1) {
      // Bells / Traffic lights interval
      const b1 = 12 + ((qSeed * 2) % 6) * 2;
      const b2 = b1 + 6;
      const b3 = b1 + 12;
      const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
      const lcm2 = (x: number, y: number): number => (x * y) / gcd(x, y);
      const totalLcm = lcm2(lcm2(b1, b2), b3);
      const mins = Number((totalLcm / 60).toFixed(1));
      return {
        text: `${prefix} Three automated sensors pulse signals at intervals of ${b1}, ${b2}, and ${b3} seconds respectively. If they pulse simultaneously at 9:00 AM, after how many minutes will they pulse together again?`,
        correctVal: `${mins} minutes`,
        distractors: [`${(mins + 1.5).toFixed(1)} minutes`, `${(mins - 1).toFixed(1)} minutes`, `${(mins * 2).toFixed(1)} minutes`],
        explanation: `The sensors pulse together at intervals equal to the LCM of (${b1}, ${b2}, ${b3}) = ${totalLcm} seconds. In minutes: ${totalLcm} / 60 = ${mins} minutes.`,
        shortcut: `Find LCM of intervals and divide by 60 for minutes: ${totalLcm}/60 = ${mins} mins.`,
        topic: "HCF & LCM",
        category: "number_systems",
        commonMistakes: ["Taking HCF instead of LCM", "Forgetting to convert seconds into minutes"],
      };
    } else if (arch === 2) {
      // Greatest number that divides A, B leaving same remainder
      const diff1 = 24 + ((qSeed * 3) % 18);
      const diff2 = diff1 * 2;
      const n1 = 100 + (qSeed % 50);
      const n2 = n1 + diff1;
      const n3 = n2 + diff2;
      const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
      const ans = gcd(diff1, diff2);
      return {
        text: `${prefix} What is the greatest integer that divides ${n1}, ${n2}, and ${n3} leaving the same remainder in each case?`,
        correctVal: `${ans}`,
        distractors: [`${ans * 2}`, `${Math.floor(ans / 2) || 1}`, `${ans + 4}`],
        explanation: `The greatest number dividing A, B, C leaving the same remainder is HCF(|A - B|, |B - C|, |C - A|) = HCF(${diff1}, ${diff2}, ${diff1 + diff2}) = ${ans}.`,
        shortcut: `HCF of differences: HCF(${diff1}, ${diff2}) = ${ans}.`,
        topic: "HCF & LCM",
        category: "number_systems",
        commonMistakes: ["Finding HCF of original numbers instead of their differences", "Testing divisors manually"],
      };
    } else if (arch === 3) {
      // Ratio of numbers and HCF
      const r1 = 3 + (qSeed % 4);
      const r2 = r1 + 1 + ((qSeed * 2) % 3);
      const hcf = 8 + ((qSeed * 5) % 10);
      const lcm = r1 * r2 * hcf;
      return {
        text: `${prefix} Two positive integers are in the ratio ${r1} : ${r2}. If their HCF is ${hcf}, what is their LCM?`,
        correctVal: `${lcm}`,
        distractors: [`${lcm + hcf * 2}`, `${lcm - hcf}`, `${r1 * r2 * (hcf + 2)}`],
        explanation: `Let the numbers be ${r1}x and ${r2}x. Since their HCF is x = ${hcf}, the numbers are ${r1 * hcf} and ${r2 * hcf}. LCM = ${r1} × ${r2} × HCF = ${r1} × ${r2} × ${hcf} = ${lcm}.`,
        shortcut: `LCM = ratio1 × ratio2 × HCF = ${r1} × ${r2} × ${hcf} = ${lcm}.`,
        topic: "HCF & LCM",
        category: "number_systems",
        commonMistakes: ["Multiplying ratio terms without HCF", "Adding ratio terms"],
      };
    } else if (arch === 4) {
      // Smallest number when divided by A, B, C leaves remainder R
      const d1 = 6 + (qSeed % 3);
      const d2 = 8 + ((qSeed * 2) % 3);
      const r = 3 + (qSeed % 3);
      const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
      const lcm = (d1 * d2) / gcd(d1, d2);
      const ans = lcm + r;
      return {
        text: `${prefix} Find the smallest positive integer which when divided by ${d1} and ${d2} leaves a remainder of ${r} in each case.`,
        correctVal: `${ans}`,
        distractors: [`${lcm - r}`, `${ans + 6}`, `${lcm}`],
        explanation: `Required number = LCM(${d1}, ${d2}) + ${r} = ${lcm} + ${r} = ${ans}.`,
        shortcut: `LCM(${d1}, ${d2}) + R = ${lcm} + ${r} = ${ans}.`,
        topic: "HCF & LCM",
        category: "number_systems",
        commonMistakes: ["Subtracting remainder instead of adding", "Taking HCF instead of LCM"],
      };
    } else {
      // Fraction HCF: HCF of numerators / LCM of denominators
      const n1 = 2 + (qSeed % 3);
      const n2 = 4 + ((qSeed * 2) % 3);
      const d1 = 3 + (qSeed % 4);
      const d2 = 9 + ((qSeed * 3) % 4);
      return {
        text: `${prefix} What is the HCF of the fractions ${n1}/${d1} and ${n2}/${d2}?`,
        correctVal: `HCF(${n1},${n2}) / LCM(${d1},${d2})`,
        distractors: [`LCM(${n1},${n2}) / HCF(${d1},${d2})`, `HCF(${n1},${n2}) / HCF(${d1},${d2})`, `LCM(${n1},${n2}) / LCM(${d1},${d2})`],
        explanation: `Formula for HCF of fractions = HCF of Numerators / LCM of Denominators.`,
        shortcut: `HCF(fractions) = HCF(Num) / LCM(Den).`,
        topic: "HCF & LCM",
        category: "number_systems",
        commonMistakes: ["Inverting the rule (LCM of Num / HCF of Den)", "Computing normal fraction multiplication"],
      };
    }
  }

  if (normTopic.includes("cyclicity") || normTopic.includes("unit digit")) {
    const arch = archIndex(qIndex, testNum, 5);
    if (arch === 0) {
      // 7^n unit digit
      const exp = 73 + (qSeed % 40);
      const rem = exp % 4;
      const digits = [1, 7, 9, 3]; // 7^0=1, 7^1=7, 7^2=9, 7^3=3
      const ans = digits[rem];
      return {
        text: `${prefix} What is the unit digit of 7^${exp}?`,
        correctVal: `${ans}`,
        distractors: [`${(ans + 2) % 10}`, `${(ans + 4) % 10}`, `${(ans + 6) % 10}`],
        explanation: `Cyclicity of 7 is 4: 7^1=7, 7^2=9, 7^3=3, 7^4=1. Dividing ${exp} by 4 gives remainder ${rem}. Hence unit digit is ${ans}.`,
        shortcut: `7 cyclicity is 4. ${exp} mod 4 = ${rem} -> ${ans}.`,
        topic: "Unit Digit",
        category: "number_systems",
        commonMistakes: ["Assuming cyclicity is 2", "Treating remainder 0 as power 0 instead of 4"],
      };
    } else if (arch === 1) {
      // 3^a * 4^b unit digit
      const exp3 = 25 + (qSeed % 20);
      const exp4 = 18 + ((qSeed * 3) % 20);
      const u3 = [1, 3, 9, 7][exp3 % 4];
      const u4 = exp4 % 2 === 0 ? 6 : 4;
      const ans = (u3 * u4) % 10;
      return {
        text: `${prefix} What is the unit digit of the product (3^${exp3} × 4^${exp4})?`,
        correctVal: `${ans}`,
        distractors: [`${(ans + 3) % 10}`, `${(ans + 5) % 10}`, `${(ans + 2) % 10}`],
        explanation: `Unit digit of 3^${exp3} is ${u3} (cyclicity 4). Unit digit of 4^${exp4} is ${u4} (cyclicity 2). Product unit digit = (${u3} × ${u4}) mod 10 = ${ans}.`,
        shortcut: `3^${exp3} -> ${u3}, 4^${exp4} -> ${u4}. ${u3} × ${u4} = ${ans}.`,
        topic: "Unit Digit",
        category: "number_systems",
        commonMistakes: ["Adding unit digits instead of multiplying", "Incorrect cyclicity for 4"],
      };
    } else if (arch === 2) {
      // Factorial sum unit digit
      const terms = 50 + (qSeed % 50);
      return {
        text: `${prefix} What is the unit digit of the expression (1! + 2! + 3! + 4! + ... + ${terms}!)?`,
        correctVal: "3",
        distractors: ["0", "5", "7"],
        explanation: `For all n ≥ 5, n! ends in 0 because it contains factors 2 and 5. The unit digit is determined solely by 1! + 2! + 3! + 4! = 1 + 2 + 6 + 24 = 33. The unit digit is 3.`,
        shortcut: `Factorials ≥ 5! end in 0. 1! + 2! + 3! + 4! = 33 -> unit digit 3.`,
        topic: "Unit Digit",
        category: "number_systems",
        commonMistakes: ["Computing beyond 4!", "Assuming answer is 0 because 50! ends in 0"],
      };
    } else if (arch === 3) {
      // 8^n unit digit
      const exp = 42 + (qSeed % 35);
      const rem = exp % 4;
      const digits = [6, 8, 4, 2];
      const ans = digits[rem];
      return {
        text: `${prefix} Find the unit digit of the expression 8^${exp}.`,
        correctVal: `${ans}`,
        distractors: [`${(ans + 2) % 10}`, `${(ans + 4) % 10}`, `${(ans + 6) % 10}`],
        explanation: `Cyclicity of 8 is 4: 8^1=8, 8^2=4, 8^3=2, 8^4=6. ${exp} mod 4 = ${rem}. Hence unit digit is ${ans}.`,
        shortcut: `8^${exp}: ${exp} mod 4 = ${rem} -> unit digit ${ans}.`,
        topic: "Cyclicity",
        category: "number_systems",
        commonMistakes: ["Thinking 8 has cyclicity 2", "Arithmetic mistake in remainder"],
      };
    } else {
      // 2^n + 3^m unit digit
      const e2 = 33 + (qSeed % 15);
      const e3 = 27 + ((qSeed * 2) % 15);
      const u2 = [6, 2, 4, 8][e2 % 4];
      const u3 = [1, 3, 9, 7][e3 % 4];
      const ans = (u2 + u3) % 10;
      return {
        text: `${prefix} What is the unit digit of (2^${e2} + 3^${e3})?`,
        correctVal: `${ans}`,
        distractors: [`${(ans + 3) % 10}`, `${(ans + 5) % 10}`, `${(ans + 7) % 10}`],
        explanation: `2^${e2} ends in ${u2} and 3^${e3} ends in ${u3}. Sum ends in (${u2} + ${u3}) mod 10 = ${ans}.`,
        shortcut: `${u2} + ${u3} = ${u2 + u3} -> unit digit ${ans}.`,
        topic: "Unit Digit",
        category: "number_systems",
        commonMistakes: ["Multiplying unit digits instead of adding", "Incorrect cyclicity"],
      };
    }
  }

  if (normTopic.includes("divisib") || normTopic.includes("remaind")) {
    const arch = archIndex(qIndex, testNum, 5);
    if (arch === 0) {
      // Divisibility by 11 with distinct numbers
      const d1 = 3 + (qSeed % 5);
      const d2 = 2 + ((qSeed * 2) % 5);
      const d3 = 7 + (qSeed % 3);
      const sumOdd = 4 + d3 + d1;
      let x = (sumOdd - d2) % 11;
      if (x < 0) x += 11;
      return {
        text: `${prefix} If the 5-digit number ${d1}${d2}${d3}x4 is divisible by 11, what is the single-digit value of x?`,
        correctVal: `${x}`,
        distractors: [`${(x + 2) % 10}`, `${(x + 5) % 10}`, `${(x + 8) % 10}`],
        explanation: `Divisibility rule for 11: Sum of digits at odd places (${4} + ${d3} + ${d1} = ${sumOdd}) minus sum of digits at even places (x + ${d2}) must be a multiple of 11. Solving gives x = ${x}.`,
        shortcut: `Odd sum - Even sum = 0 or 11k -> x = ${x}.`,
        topic: "Divisibility Rules",
        category: "number_systems",
        commonMistakes: ["Subtracting from wrong positions", "Assuming difference must be 0"],
      };
    } else if (arch === 1) {
      // Divisibility by 9
      const d1 = 5 + (qSeed % 4);
      const d2 = 3 + ((qSeed * 2) % 4);
      const d3 = 2 + (qSeed % 5);
      const curSum = d1 + d2 + d3 + 7;
      const x = (9 - (curSum % 9)) % 9;
      return {
        text: `${prefix} If the number ${d1}${d2}x${d3}7 is divisible by 9, find the digit x.`,
        correctVal: `${x}`,
        distractors: [`${(x + 2) % 9}`, `${(x + 4) % 9}`, `${(x + 6) % 9}`],
        explanation: `Sum of digits must be divisible by 9. ${d1} + ${d2} + x + ${d3} + 7 = ${curSum} + x. The smallest digit x to make it a multiple of 9 is ${x}.`,
        shortcut: `Sum of digits mod 9 must equal 0 -> x = ${x}.`,
        topic: "Divisibility Rules",
        category: "number_systems",
        commonMistakes: ["Checking divisibility by 3 instead of 9", "Arithmetic addition error"],
      };
    } else if (arch === 2) {
      // Fermat's Little Theorem with varying prime
      const primes = [101, 73, 53, 31, 29, 17, 13];
      const p = primes[qSeed % primes.length];
      const base = 2 + (qSeed % 5);
      return {
        text: `${prefix} What is the remainder when ${base}^${p - 1} is divided by ${p}? (Note: ${p} is prime)`,
        correctVal: "1",
        distractors: [`${base}`, `${p - 1}`, "0"],
        explanation: `By Fermat's Little Theorem, if p is prime and gcd(a, p) = 1, then a^(p - 1) ≡ 1 (mod p). Here a = ${base}, p = ${p}. Remainder is 1.`,
        shortcut: `Fermat's Theorem: a^(p-1) mod p = 1.`,
        topic: "Remainder Theorem",
        category: "number_systems",
        commonMistakes: ["Attempting manual exponentiation", "Confusing p-1 with p"],
      };
    } else if (arch === 3) {
      // (base^n + k) mod (base - 1)
      const base = 15 + (qSeed % 10);
      const exp = 41 + ((qSeed * 3) % 30);
      const k = 1 + (qSeed % 5);
      const div = base - 1;
      const ans = (1 + k) % div;
      return {
        text: `${prefix} What is the remainder when (${base}^${exp} + ${k}) is divided by ${div}?`,
        correctVal: `${ans}`,
        distractors: [`${(ans + 2) % div}`, `${(ans + 4) % div}`, "0"],
        explanation: `${base} ≡ 1 (mod ${div}). Therefore ${base}^${exp} ≡ 1^${exp} ≡ 1 (mod ${div}). Total remainder = (1 + ${k}) mod ${div} = ${ans}.`,
        shortcut: `(${div} + 1)^exp ≡ 1 -> 1 + ${k} = ${ans}.`,
        topic: "Remainder Theorem",
        category: "number_systems",
        commonMistakes: ["Forgetting to add constant k", "Not taking modulo with divisor"],
      };
    } else {
      // Divisibility by 88 (8 and 11)
      return {
        text: `${prefix} A number is divisible by 88 if and only if it is simultaneously divisible by which pair of co-prime numbers?`,
        correctVal: "8 and 11",
        distractors: ["4 and 22", "2 and 44", "8 and 22"],
        explanation: `To test divisibility by composite number 88, we must test divisibility by co-prime factors whose product is 88. 8 and 11 are co-prime (HCF = 1) and 8 × 11 = 88.`,
        shortcut: `Co-prime factor rule: 88 = 8 × 11 where gcd(8, 11) = 1.`,
        topic: "Divisibility Rules",
        category: "number_systems",
        commonMistakes: ["Choosing 4 and 22 which are not co-prime (gcd=2)", "Choosing 2 and 44"],
      };
    }
  }

  if (normTopic.includes("fraction") || normTopic.includes("decimal")) {
    const arch = archIndex(qIndex, testNum, 6);
    if (arch === 0) {
      // Recurring decimals
      const pairs = [
        { d: "0.4777...", f: "43/90" },
        { d: "0.5833...", f: "7/12" },
        { d: "0.12323...", f: "61/495" },
        { d: "0.2333...", f: "7/30" },
        { d: "0.3666...", f: "11/30" },
        { d: "0.1666...", f: "1/6" },
        { d: "0.8333...", f: "5/6" },
        { d: "0.2727...", f: "3/11" },
        { d: "0.4545...", f: "5/11" },
        { d: "0.4166...", f: "5/12" },
      ];
      const item = pairs[qSeed % pairs.length];
      return {
        text: `${prefix} Convert the repeating decimal ${item.d} into its simplest fractional form.`,
        correctVal: item.f,
        distractors: ["47/99", "47/90", "43/99"],
        explanation: `Formula for mixed recurring decimal: (Full number − Non-repeating part) / 90... = ${item.f}.`,
        shortcut: `(Full number - Non-repeating) / 90 = ${item.f}.`,
        topic: "Fractions & Decimals",
        category: "number_systems",
        commonMistakes: ["Using 99 instead of 90 in denominator", "Subtracting repeating part instead of non-repeating"],
      };
    } else if (arch === 1) {
      // Fraction comparison with dynamic numbers
      const d = 5 + (qSeed % 7);
      const n1 = 1 + (qSeed % (d - 2));
      const n2 = n1 + 1;
      const midNum = 2 * n1 + 1;
      const midDen = 2 * d;
      return {
        text: `${prefix} Which of the following fractions is strictly greater than ${n1}/${d} and strictly less than ${n2}/${d}?`,
        correctVal: `${midNum}/${midDen}`,
        distractors: [`${n1 - 1}/${d}`, `${n2 + 1}/${d}`, `${midNum + 2}/${midDen}`],
        explanation: `${n1}/${d} = ${2 * n1}/${midDen} and ${n2}/${d} = ${2 * n2}/${midDen}. The fraction ${midNum}/${midDen} lies exactly halfway between them.`,
        shortcut: `Multiply numerator and denominator by 2: ${2 * n1}/${midDen} < ${midNum}/${midDen} < ${2 * n2}/${midDen}.`,
        topic: "Fractions & Decimals",
        category: "number_systems",
        commonMistakes: ["Comparing numerators directly without a common denominator", "Arithmetic errors"],
      };
    } else if (arch === 2) {
      // Word problem: fraction of salary / allocation
      const name = NAMES[qSeed % NAMES.length];
      const f1 = 3 + (qSeed % 3);
      const f2 = 4 + ((qSeed + 1) % 3);
      const rem = (f1 - 1) * (f2 - 1);
      const den = f1 * f2;
      const leftCash = rem * (1000 + (qSeed % 5) * 500);
      const totalSalary = (leftCash * den) / rem;
      return {
        text: `${prefix} ${name} spends 1/${f1} of monthly income on rent, and 1/${f2} of the remaining income on groceries. If ${name} has ₹${leftCash.toLocaleString("en-IN")} remaining, what is ${name}'s total monthly salary?`,
        correctVal: `₹${totalSalary.toLocaleString("en-IN")}`,
        distractors: [
          `₹${(totalSalary + leftCash).toLocaleString("en-IN")}`,
          `₹${Math.round(totalSalary * 0.8).toLocaleString("en-IN")}`,
          `₹${Math.round(totalSalary * 1.25).toLocaleString("en-IN")}`,
        ],
        explanation: `Remaining after rent = (1 - 1/${f1}) = ${f1 - 1}/${f1}. Remaining after groceries = (${f1 - 1}/${f1}) × (${f2 - 1}/${f2}) = ${rem}/${den}. Total salary = ${leftCash} × ${den}/${rem} = ₹${totalSalary.toLocaleString("en-IN")}.`,
        shortcut: `Fraction left = (${f1 - 1}/${f1}) × (${f2 - 1}/${f2}) = ${rem}/${den} -> Salary = ${leftCash} × ${den}/${rem}.`,
        topic: "Fractions & Decimals",
        category: "number_systems",
        commonMistakes: ["Adding fractions directly without considering 'of remaining'", "Miscalculating remaining balance"],
      };
    } else if (arch === 3) {
      // Decimal operation
      const a = 12 + (qSeed % 8);
      const b = 5 + (qSeed % 5);
      const res = ((a * 0.04) / (b * 0.2)).toFixed(2);
      return {
        text: `${prefix} What is the exact value of the expression (${a} × 0.04) ÷ (${b} × 0.2)?`,
        correctVal: `${parseFloat(res)}`,
        distractors: [`${(parseFloat(res) * 10).toFixed(1)}`, `${(parseFloat(res) / 10).toFixed(3)}`, `${(parseFloat(res) + 0.5).toFixed(2)}`],
        explanation: `Numerator = ${a} × 0.04 = ${(a * 0.04).toFixed(3)}. Denominator = ${b} × 0.2 = ${(b * 0.2).toFixed(2)}. Quotient = ${(a * 0.04).toFixed(3)} / ${(b * 0.2).toFixed(2)} = ${parseFloat(res)}.`,
        shortcut: `Shift decimals: (${a} × 4) / (${b} × 20) = ${parseFloat(res)}.`,
        topic: "Fractions & Decimals",
        category: "number_systems",
        commonMistakes: ["Misplacing decimal points", "Dividing denominator before multiplying"],
      };
    } else if (arch === 4) {
      // Ascending fraction ordering
      return {
        text: `${prefix} Which of the following correctly arranges the fractions 2/3, 3/5, 7/10, and 5/8 in ascending order?`,
        correctVal: "3/5 < 5/8 < 2/3 < 7/10",
        distractors: [
          "5/8 < 3/5 < 2/3 < 7/10",
          "3/5 < 2/3 < 5/8 < 7/10",
          "2/3 < 7/10 < 5/8 < 3/5",
        ],
        explanation: `Convert to decimals: 3/5 = 0.60, 5/8 = 0.625, 2/3 ≈ 0.667, 7/10 = 0.70. Hence ascending order is 3/5 < 5/8 < 2/3 < 7/10.`,
        shortcut: `Decimal equivalents: 0.600 < 0.625 < 0.667 < 0.700.`,
        topic: "Fractions & Decimals",
        category: "number_systems",
        commonMistakes: ["Assuming larger numerator means larger fraction", "Miscalculating 5/8"],
      };
    } else {
      // Fraction addition simplification
      const a = 1 + (qSeed % 4);
      const b = 2 + (qSeed % 3);
      const c = 3 + (qSeed % 5);
      const sumNum = a * 6 + b * 4 + c * 3;
      return {
        text: `${prefix} Simplify the expression: (${a}/2 + ${b}/3 + ${c}/4). What is the resulting improper fraction?`,
        correctVal: `${sumNum}/12`,
        distractors: [`${sumNum - 2}/12`, `${sumNum + 2}/12`, `${sumNum}/24`],
        explanation: `LCM of denominators (2, 3, 4) is 12. Equivalent numerators: (${a}×6) + (${b}×4) + (${c}×3) = ${a*6} + ${b*4} + ${c*3} = ${sumNum}. Result = ${sumNum}/12.`,
        shortcut: `Common LCM = 12. (${a*6} + ${b*4} + ${c*3})/12 = ${sumNum}/12.`,
        topic: "Fractions & Decimals",
        category: "number_systems",
        commonMistakes: ["Adding denominators directly (2+3+4=9)", "Incorrect LCM calculation"],
      };
    }
  }

  // Properties of Numbers
  const arch = archIndex(qIndex, testNum, 5);
  if (arch === 0) {
    // Number of factors
    const bases = [
      { n: 240, f: 20, exp: "2^4 × 3^1 × 5^1 -> 5 × 2 × 2 = 20" },
      { n: 360, f: 24, exp: "2^3 × 3^2 × 5^1 -> 4 × 3 × 2 = 24" },
      { n: 180, f: 18, exp: "2^2 × 3^2 × 5^1 -> 3 × 3 × 2 = 18" },
      { n: 400, f: 15, exp: "2^4 × 5^2 -> 5 × 3 = 15" },
      { n: 500, f: 12, exp: "2^2 × 5^3 -> 3 × 4 = 12" },
      { n: 720, f: 30, exp: "2^4 × 3^2 × 5^1 -> 5 × 3 × 2 = 30" },
      { n: 600, f: 24, exp: "2^3 × 3^1 × 5^2 -> 4 × 2 × 3 = 24" },
      { n: 300, f: 18, exp: "2^2 × 3^1 × 5^2 -> 3 × 2 × 3 = 18" },
    ];
    const item = bases[qSeed % bases.length];
    return {
      text: `${prefix} How many total positive factors does the integer ${item.n} possess?`,
      correctVal: `${item.f}`,
      distractors: [`${item.f + 4}`, `${item.f - 4}`, `${item.f * 2}`],
      explanation: `Prime factorize ${item.n}: ${item.exp}. Total factors = ${item.f}.`,
      shortcut: `Factor formula: multiply (each exponent + 1).`,
      topic: "Properties of Numbers",
      category: "number_systems",
      commonMistakes: ["Summing exponents instead of multiplying", "Forgetting to include 1 and the number itself"],
    };
  } else if (arch === 1) {
    // Trailing zeros in n!
    const n = 100 + ((qSeed * 5) % 50);
    const z = Math.floor(n / 5) + Math.floor(n / 25) + Math.floor(n / 125);
    return {
      text: `${prefix} How many trailing zeros are present at the end of the expansion of ${n}!?`,
      correctVal: `${z}`,
      distractors: [`${z - 3}`, `${z + 2}`, `${Math.floor(n / 5)}`],
      explanation: `Using Legendre's formula: Trailing zeros = ⌊${n}/5⌋ + ⌊${n}/25⌋ + ⌊${n}/125⌋ = ${Math.floor(n/5)} + ${Math.floor(n/25)} + ${Math.floor(n/125)} = ${z}.`,
      shortcut: `Divide by 5, 25, 125 and sum integer quotients: ${z}.`,
      topic: "Properties of Numbers",
      category: "number_systems",
      commonMistakes: ["Only dividing by 5 and missing powers of 5", "Trying to calculate factorial"],
    };
  } else if (arch === 2) {
    // Sum of first n natural numbers
    const n = 25 + (qSeed % 25);
    const sumVal = (n * (n + 1)) / 2;
    return {
      text: `${prefix} What is the sum of the first ${n} positive consecutive integers (1 + 2 + ... + ${n})?`,
      correctVal: `${sumVal}`,
      distractors: [`${sumVal - n}`, `${sumVal + n}`, `${n * n}`],
      explanation: `Sum of first n natural numbers = [n(n + 1)] / 2 = (${n} × ${n + 1}) / 2 = ${sumVal}.`,
      shortcut: `n(n+1)/2 = (${n} × ${n + 1}) / 2 = ${sumVal}.`,
      topic: "Properties of Numbers",
      category: "number_systems",
      commonMistakes: ["Using n^2 (sum of odds)", "Dividing by n instead of 2"],
    };
  } else if (arch === 3) {
    // Product of 3 consecutive integers divisible by 6
    const n = 12 + (qSeed % 15);
    return {
      text: `${prefix} If n = ${n}, what is the largest integer that always divides the product n(n + 1)(n + 2) for any positive integer n?`,
      correctVal: "6",
      distractors: ["12", "3", "24"],
      explanation: `Among any three consecutive integers, at least one is divisible by 2 and exactly one is divisible by 3. Since gcd(2, 3) = 1, their product is always divisible by 2 × 3 = 6.`,
      shortcut: `Product of 3 consecutive integers is always divisible by 3! = 6.`,
      topic: "Properties of Numbers",
      category: "number_systems",
      commonMistakes: ["Choosing 12 or 24 which only divide special cases", "Choosing 3 and forgetting the factor 2"],
    };
  } else {
    // Prime vs composite properties
    const num = 101 + ((qSeed * 2) % 30);
    return {
      text: `${prefix} Consider the number ${num}. How can one mathematically verify whether ${num} is a prime number?`,
      correctVal: `Check divisibility by all primes ≤ ${Math.floor(Math.sqrt(num))}`,
      distractors: [
        `Check divisibility by all odd integers up to ${num - 1}`,
        `Divide by 2, 3, and 5 only`,
        `Check if ${num} is odd and ends in 1, 3, 7, or 9`,
      ],
      explanation: `To test if n is prime, it suffices to check divisibility by prime numbers up to ⌊√n⌋ = ${Math.floor(Math.sqrt(num))}.`,
      shortcut: `Prime test limit: primes ≤ √n.`,
      topic: "Properties of Numbers",
      category: "number_systems",
      commonMistakes: ["Testing all numbers up to n", "Only testing 2, 3, 5"],
    };
  }
}

// ============================================================================
// 2. LOGICAL REASONING SPECIALIZED GENERATORS
// ============================================================================

export function generateLogicalTopicQuestion(
  topic: string,
  qIndex: number,
  testNum: number,
  seed: number,
  prefix: string
): QuestionRawData {
  const normTopic = topic.toLowerCase();
  const qSeed = seed + qIndex * 79 + testNum * 47;
  const name1 = NAMES[qSeed % NAMES.length];
  const name2 = NAMES[(qSeed + 3) % NAMES.length];

  if (normTopic.includes("blood") || normTopic.includes("relation")) {
    const arch = archIndex(qIndex, testNum, 6);
    if (arch === 0) {
      return {
        text: `${prefix} Pointing to a photograph of a woman, ${name1} said: "Her mother's only daughter is my wife." How is ${name1} related to the woman?`,
        correctVal: "Husband",
        distractors: ["Brother", "Father", "Brother-in-law"],
        explanation: `Her mother's only daughter is the woman herself. ${name1} says she is his wife. Thus, ${name1} is her husband.`,
        shortcut: `Mother's only daughter = Self -> My wife = Husband.`,
        topic: "Blood Relations",
        category: "logical",
        commonMistakes: ["Assuming brother", "Confusing generations"],
      };
    } else if (arch === 1) {
      return {
        text: `${prefix} In a coded kinship system, 'A + B' means A is the brother of B, 'A - B' means A is the mother of B, and 'A × B' means A is the father of B. Which expression proves that '${name1} is the paternal grandfather of ${name2}'?`,
        correctVal: `${name1} × K × ${name2}`,
        distractors: [`${name1} + K × ${name2}`, `${name1} - K + ${name2}`, `${name1} × K - ${name2}`],
        explanation: `${name1} × K means ${name1} is the father of K. K × ${name2} means K is the father of ${name2}. Thus, ${name1} is the father of ${name2}'s father = paternal grandfather.`,
        shortcut: `Paternal grandfather = Father of Father (× followed by ×).`,
        topic: "Blood Relations",
        category: "logical",
        commonMistakes: ["Choosing maternal grandfather (+ followed by ×)", "Reversing generation flow"],
      };
    } else if (arch === 2) {
      return {
        text: `${prefix} A family consists of six members: P, Q, R, S, T, and U. Q is the son of R, but R is not the mother of Q. P and R are a married couple. T is the brother of R. S is the daughter of P. U is the sister of Q. How many male members are in this family?`,
        correctVal: "3",
        distractors: ["2", "4", "Cannot be determined"],
        explanation: `R is father (M), P is mother (F), Q is son (M), T is brother of R (M), S is daughter (F), U is sister (F). Total males: R, Q, T = 3.`,
        shortcut: `Count males: R, Q, T = 3.`,
        topic: "Blood Relations",
        category: "logical",
        commonMistakes: ["Assuming R's gender without checking 'not mother'", "Missing T as the brother"],
      };
    } else if (arch === 3) {
      return {
        text: `${prefix} Introducing a keynote speaker, ${name1} stated: "His mother is the only daughter of my mother-in-law." How is ${name1} related to the speaker?`,
        correctVal: "Father",
        distractors: ["Uncle", "Brother", "Grandfather"],
        explanation: `Mother-in-law's only daughter is ${name1}'s wife. The speaker's mother is ${name1}'s wife. Therefore, ${name1} is the speaker's father.`,
        shortcut: `Mother-in-law's only daughter = Wife. Wife's child's father = ${name1}.`,
        topic: "Blood Relations",
        category: "logical",
        commonMistakes: ["Thinking ${name1} is the brother-in-law", "Overcomplicating the in-law relationship"],
      };
    } else if (arch === 4) {
      return {
        text: `${prefix} If P is the sister of Q, Q is the brother of R, and R is the son of S, how is P related to S?`,
        correctVal: "Daughter",
        distractors: ["Son", "Niece", "Mother"],
        explanation: `P, Q, and R are siblings. R is the son of S, so all three are children of S. Since P is female (sister), P is the daughter of S.`,
        shortcut: `Siblings share parent S. P is female -> Daughter.`,
        topic: "Blood Relations",
        category: "logical",
        commonMistakes: ["Choosing niece", "Confusing sibling relationships"],
      };
    } else {
      return {
        text: `${prefix} ${name1} said to ${name2}: "The boy playing chess with me is the youngest son of my father's only sister." How is the boy related to ${name1}?`,
        correctVal: "Cousin",
        distractors: ["Nephew", "Brother", "Son"],
        explanation: `Father's sister is aunt. Aunt's son is cousin. Therefore, the boy is ${name1}'s cousin.`,
        shortcut: `Father's sister = Aunt -> Aunt's son = Cousin.`,
        topic: "Blood Relations",
        category: "logical",
        commonMistakes: ["Confusing cousin with nephew", "Treating father's sister as mother"],
      };
    }
  }

  if (normTopic.includes("coding") || normTopic.includes("decod")) {
    const arch = archIndex(qIndex, testNum, 5);
    const words = [
      { w: "PYTHON", c: "SBWKRQ", shift: 3, target: "REACT", code: "UHDFW" },
      { w: "CLOUD", c: "FNRXG", shift: 3, target: "SERVER", code: "VHUYHU" },
      { w: "STREAM", c: "Vwuhdp", shift: 3, target: "LAMBDA", code: "ODPEGD" },
      { w: "DOCKER", c: "GRFNHU", shift: 3, target: "KUBER", code: "NXEHU" },
    ];
    const item = words[qSeed % words.length];
    if (arch === 0) {
      return {
        text: `${prefix} In a security encoding cipher, each letter is shifted forward by 3 positions (A → D, B → E, etc.). If '${item.w}' is encoded as '${item.c}', how will '${item.target}' be coded under the same rule?`,
        correctVal: item.code,
        distractors: [`${item.code.slice(1)}Z`, `${item.code.slice(0, -1)}A`, `${item.target}`],
        explanation: `Every character is shifted by +3 in alphabetical position: R(+3)->U, E(+3)->H, A(+3)->D, etc. Code = ${item.code}.`,
        shortcut: `Apply +3 to each letter: ${item.target} -> ${item.code}.`,
        topic: "Coding-Decoding",
        category: "logical",
        commonMistakes: ["Shifting backward (-3) instead of forward (+3)", "Alphabetical index wrap-around errors"],
      };
    } else if (arch === 1) {
      return {
        text: `${prefix} In an alphabet mirror cipher (A ↔ Z, B ↔ Y, C ↔ X, D ↔ W), how is the word 'NODE' encoded?`,
        correctVal: "MLWV",
        distractors: ["MLVW", "NLWV", "OMVW"],
        explanation: `Mirror letters (Sum of positions = 27): N (14) ↔ M (13), O (15) ↔ L (12), D (4) ↔ W (23), E (5) ↔ V (22). Code = MLWV.`,
        shortcut: `Position = 27 - pos. N->M, O->L, D->W, E->V.`,
        topic: "Coding-Decoding",
        category: "logical",
        commonMistakes: ["Using standard reverse order instead of alphabet opposites", "Off-by-one errors"],
      };
    } else if (arch === 2) {
      const sumVal = 2 + 1 + 12 + 12;
      return {
        text: `${prefix} If 'BAT' is coded as 23 (2 + 1 + 20) and 'CAT' is coded as 24 (3 + 1 + 20), what is the numerical code for 'BALL'?`,
        correctVal: `${sumVal}`,
        distractors: [`${sumVal - 1}`, `${sumVal + 1}`, `${sumVal + 2}`],
        explanation: `Sum of alphabetical positions: B (2) + A (1) + L (12) + L (12) = 27.`,
        shortcut: `B=2, A=1, L=12, L=12 -> Sum = 27.`,
        topic: "Coding-Decoding",
        category: "logical",
        commonMistakes: ["Miscounting L as 11 or 13", "Counting L only once"],
      };
    } else if (arch === 3) {
      return {
        text: `${prefix} If 'LIGHT' is coded as 'MJHIU' (+1 shift), how will 'FRAME' be coded?`,
        correctVal: "GSBNF",
        distractors: ["EQZLD", "HSBNF", "GSCOF"],
        explanation: `Each letter shifts forward by +1: F(+1)->G, R(+1)->S, A(+1)->B, M(+1)->N, E(+1)->F. Result = GSBNF.`,
        shortcut: `Shift +1: FRAME -> GSBNF.`,
        topic: "Coding-Decoding",
        category: "logical",
        commonMistakes: ["Shifting backward", "Skipping letters"],
      };
    } else {
      return {
        text: `${prefix} In a certain code, '786' means 'study very hard', '958' means 'hard work pays', and '645' means 'study and work'. Which digit corresponds to 'very'?`,
        correctVal: "7",
        distractors: ["8", "6", "9"],
        explanation: `Compare 786 and 958: common word is 'hard', common digit is '8' -> 'hard' = 8. Compare 786 and 645: common word is 'study', common digit is '6' -> 'study' = 6. In '786', remaining word is 'very' and remaining digit is 7 -> 'very' = 7.`,
        shortcut: `8='hard', 6='study' -> remaining 7='very'.`,
        topic: "Coding-Decoding",
        category: "logical",
        commonMistakes: ["Assuming digits map in 1-to-1 sequential word order", "Confusing 'very' with 'hard'"],
      };
    }
  }

  if (normTopic.includes("direct") || normTopic.includes("sense")) {
    const arch = archIndex(qIndex, testNum, 5);
    if (arch === 0) {
      const triplets = [[6, 8, 10], [9, 12, 15], [5, 12, 13], [8, 15, 17]];
      const [n, e, hyp] = triplets[qSeed % triplets.length];
      return {
        text: `${prefix} An autonomous drone flies ${n} meters North, turns 90° East and travels ${e} meters. How far and in which compass direction is the drone from its initial launch point?`,
        correctVal: `${hyp} meters, North-East`,
        distractors: [`${n + e} meters, North-East`, `${hyp} meters, South-East`, `${hyp + 2} meters, North-East`],
        explanation: `Distance is hypotenuse: √(${n}² + ${e}²) = ${hyp} meters. Direction from origin is North-East.`,
        shortcut: `Pythagorean triplet: ${n}-${e}-${hyp}. Distance = ${hyp} m, North-East.`,
        topic: "Direction Sense",
        category: "logical",
        commonMistakes: ["Adding straight line distance instead of displacement", "Inverting coordinates"],
      };
    } else if (arch === 1) {
      return {
        text: `${prefix} One morning right after sunrise, ${name1} stood facing a flag pole. The shadow of the pole fell directly to ${name1}'s right. Which direction was ${name1} facing?`,
        correctVal: "South",
        distractors: ["North", "East", "West"],
        explanation: `In the morning, the sun rises in the East, so all shadows point West. If the shadow falls to ${name1}'s right, ${name1}'s right hand points West. Standing facing South makes your right hand point West. Thus, ${name1} was facing South.`,
        shortcut: `Morning shadow = West. Right = West -> Facing South.`,
        topic: "Direction Sense",
        category: "logical",
        commonMistakes: ["Assuming shadows point towards the sun", "Confusing left and right when facing South"],
      };
    } else if (arch === 2) {
      return {
        text: `${prefix} At sunset, ${name2} is walking towards the sun. ${name2} turns left, walks 50 meters, turns left again, and walks 50 meters. Which direction is ${name2} facing now?`,
        correctVal: "East",
        distractors: ["West", "North", "South"],
        explanation: `Sunset is in the West, so initially facing West. Turning left makes him face South. Turning left again makes him face East.`,
        shortcut: `West -> Left (South) -> Left (East). Facing East.`,
        topic: "Direction Sense",
        category: "logical",
        commonMistakes: ["Forgetting sunset is in West", "Misjudging turns"],
      };
    } else if (arch === 3) {
      return {
        text: `${prefix} A courier delivery rider starts from point P, rides 10 km South, turns right and rides 5 km, turns right again and rides 10 km, then turns left and rides 8 km. How far is the rider from point P?`,
        correctVal: "13 km",
        distractors: ["15 km", "10 km", "23 km"],
        explanation: `South 10, then turn right = West 5. Turn right = North 10 (cancels South 10). Turn left = West 8. Total distance West = 5 + 8 = 13 km.`,
        shortcut: `North/South cancel. West = 5 + 8 = 13 km.`,
        topic: "Direction Sense",
        category: "logical",
        commonMistakes: ["Summing all path lengths (33 km)", "Reversing right turn when heading South"],
      };
    } else {
      return {
        text: `${prefix} A compass is damaged: North is showing as South-West. What will East show as on this damaged compass?`,
        correctVal: "North-West",
        distractors: ["South-East", "North-East", "South"],
        explanation: `North to South-West is a rotation of 135° counter-clockwise. Applying a 135° counter-clockwise turn to East points to North-West.`,
        shortcut: `Rotation = 135° CCW. East − 135° CCW = North-West.`,
        topic: "Direction Sense",
        category: "logical",
        commonMistakes: ["Rotating clockwise instead of counter-clockwise", "Miscalculating 135° angle"],
      };
    }
  }

  if (normTopic.includes("syllog")) {
    const arch = archIndex(qIndex, testNum, 5);
    const sets = [
      {
        s1: "All microservices are stateless.",
        s2: "No stateless component is database-bound.",
        c1: "No microservice is database-bound.",
        c2: "Some database-bound components are microservices.",
        ans: "Only conclusion 1 follows",
      },
      {
        s1: "All engineers are analytical.",
        s2: "Some analytical thinkers are chess players.",
        c1: "Some engineers are chess players.",
        c2: "Some chess players are analytical.",
        ans: "Only conclusion 2 follows",
      },
      {
        s1: "Some clouds are secure.",
        s2: "All secure networks are encrypted.",
        c1: "Some clouds are encrypted.",
        c2: "All encrypted networks are secure.",
        ans: "Only conclusion 1 follows",
      },
      {
        s1: "No bug is a feature.",
        s2: "All issues are bugs.",
        c1: "No issue is a feature.",
        c2: "Some features are issues.",
        ans: "Only conclusion 1 follows",
      },
      {
        s1: "All servers are machines.",
        s2: "All machines consume energy.",
        c1: "All servers consume energy.",
        c2: "Some machines that consume energy are servers.",
        ans: "Both conclusions follow",
      },
    ];
    const item = sets[qSeed % sets.length];
    return {
      text: `${prefix} Statements:\nI. ${item.s1}\nII. ${item.s2}\nConclusions:\n1. ${item.c1}\n2. ${item.c2}`,
      correctVal: item.ans,
      distractors: [
        item.ans === "Only conclusion 1 follows" ? "Only conclusion 2 follows" : "Only conclusion 1 follows",
        "Neither conclusion follows",
        item.ans === "Both conclusions follow" ? "Only conclusion 1 follows" : "Both conclusions follow",
      ],
      explanation: `Deductive Syllogism Analysis: Evaluating the premises through Euler circles / Venn diagrams demonstrates that ${item.ans}.`,
      shortcut: `Universal premises yield valid deductions: ${item.ans}.`,
      topic: "Syllogisms",
      category: "logical",
      commonMistakes: ["Assuming 'some' implies 'all'", "Introducing real-world bias instead of strict formal logic"],
    };
  }

  if (normTopic.includes("series") || normTopic.includes("analogy")) {
    const arch = archIndex(qIndex, testNum, 5);
    if (arch === 0) {
      // Prime series
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];
      const start = qSeed % 5;
      const slice = primes.slice(start, start + 5);
      const nextP = primes[start + 5];
      return {
        text: `${prefix} Identify the next term in the series: ${slice.join(", ")}, ?`,
        correctVal: `${nextP}`,
        distractors: [`${nextP + 2}`, `${nextP - 2}`, `${nextP + 4}`],
        explanation: `This is the sequence of consecutive prime numbers. The prime immediately succeeding ${slice[slice.length - 1]} is ${nextP}.`,
        shortcut: `Sequence of prime numbers -> next is ${nextP}.`,
        topic: "Number Series",
        category: "logical",
        commonMistakes: ["Confusing with odd number series", "Selecting a composite number like 21 or 27"],
      };
    } else if (arch === 1) {
      // n^2 + 1 series
      const base = 2 + (qSeed % 4);
      const nums = [base, base + 1, base + 2, base + 3, base + 4].map(n => n * n + 1);
      const nextTerm = (base + 5) * (base + 5) + 1;
      return {
        text: `${prefix} Find the missing term in the sequence: ${nums.join(", ")}, ?`,
        correctVal: `${nextTerm}`,
        distractors: [`${nextTerm - 5}`, `${nextTerm + 6}`, `${(base + 5) * (base + 5)}`],
        explanation: `Pattern is n² + 1 for consecutive integers. The next term is (${base + 5})² + 1 = ${(base + 5) * (base + 5)} + 1 = ${nextTerm}.`,
        shortcut: `Rule: n² + 1 -> ${nextTerm}.`,
        topic: "Number Series",
        category: "logical",
        commonMistakes: ["Missing the +1 constant", "Miscalculating squares"],
      };
    } else if (arch === 2) {
      // Alternating series
      const a = 10 + (qSeed % 5);
      const b = 50 + (qSeed % 10);
      const seq = [a, b, a + 2, b - 5, a + 4, b - 10];
      const nextVal = a + 6;
      return {
        text: `${prefix} Complete the alternating sequence: ${seq.join(", ")}, ?`,
        correctVal: `${nextVal}`,
        distractors: [`${nextVal - 2}`, `${b - 15}`, `${nextVal + 3}`],
        explanation: `Two interleaved sequences: Odd positions increment by +2 (${a}, ${a + 2}, ${a + 4}, ...). Even positions decrement by -5 (${b}, ${b - 5}, ${b - 10}, ...). The 7th position follows the odd series: ${a + 4} + 2 = ${nextVal}.`,
        shortcut: `Odd indices jump by +2: ${a+4} + 2 = ${nextVal}.`,
        topic: "Number Series",
        category: "logical",
        commonMistakes: ["Attempting single common difference across all adjacent numbers", "Following even series instead of odd"],
      };
    } else if (arch === 3) {
      const analogies = [
        { q: "Repository : Code :: Database : ?", a: "Records", d: ["Hardware", "Cable", "Monitor"] },
        { q: "Compiler : Binary :: Interpreter : ?", a: "Bytecode", d: ["Hardware", "Transistor", "Silicon"] },
        { q: "Firewall : Security :: Router : ?", a: "Networking", d: ["Cooling", "Storage", "Display"] },
        { q: "Latency : Delay :: Throughput : ?", a: "Capacity", d: ["Error", "Loss", "Cost"] },
      ];
      const item = analogies[qSeed % analogies.length];
      return {
        text: `${prefix} Complete the functional analogy: ${item.q}`,
        correctVal: item.a,
        distractors: item.d,
        explanation: `The relationship represents functional purpose and contents. ${item.q.split("::")[1].replace("?", item.a)}.`,
        shortcut: `Identify domain relationship: ${item.a}.`,
        topic: "Analogy",
        category: "logical",
        commonMistakes: ["Choosing tangential technical terms", "Inverting functional hierarchy"],
      };
    } else {
      return {
        text: `${prefix} What is the missing number: 6 : 35 :: 9 : ?`,
        correctVal: "80",
        distractors: ["81", "72", "63"],
        explanation: `Pattern is n : (n² - 1). For 6: 6² - 1 = 36 - 1 = 35. For 9: 9² - 1 = 81 - 1 = 80.`,
        shortcut: `n -> n² - 1: 9² - 1 = 80.`,
        topic: "Analogy",
        category: "logical",
        commonMistakes: ["Multiplying 6 × 6 - 1 vs 9 × 8", "Choosing 81"],
      };
    }
  }

  if (normTopic.includes("seating") || normTopic.includes("arrangement")) {
    const arch = archIndex(qIndex, testNum, 6);
    const n = [
      NAMES[Math.abs(qSeed) % NAMES.length],
      NAMES[Math.abs(qSeed + 2) % NAMES.length],
      NAMES[Math.abs(qSeed + 5) % NAMES.length],
      NAMES[Math.abs(qSeed + 7) % NAMES.length],
      NAMES[Math.abs(qSeed + 11) % NAMES.length],
      NAMES[Math.abs(qSeed + 13) % NAMES.length],
    ];
    if (arch === 0) {
      // Circular table facing center
      return {
        text: `${prefix} Six colleagues (${n.join(", ")}) sit around a circular conference table facing the center. ${n[0]} sits second to the left of ${n[2]}. ${n[1]} sits immediate right of ${n[0]}. ${n[3]} sits opposite to ${n[1]}. Who sits to the immediate left of ${n[3]}?`,
        correctVal: n[2],
        distractors: [n[4], n[5], n[0]],
        explanation: `Placing them in order facing center: positions confirm ${n[2]} sits adjacent to ${n[3]} on the left.`,
        shortcut: `Map 6 positions on circle clockwise: immediate left of ${n[3]} is ${n[2]}.`,
        topic: "Seating Arrangement",
        category: "logical",
        commonMistakes: ["Confusing left and right when facing circle center", "Clockwise vs anticlockwise inversion"],
      };
    } else if (arch === 1) {
      // Linear row facing North
      const p = [n[0], n[1], n[2], n[3], n[4]];
      return {
        text: `${prefix} Five students (${p.join(", ")}) sit in a straight row facing North. ${p[3]} sits between ${p[4]} and ${p[1]}. ${p[1]} is to the immediate left of ${p[2]}. ${p[0]} is to the immediate left of ${p[4]}. Who occupies the exact middle seat?`,
        correctVal: p[3],
        distractors: [p[1], p[4], p[0]],
        explanation: `Order from left to right: ${p[0]}, ${p[4]}, ${p[3]}, ${p[1]}, ${p[2]}. The person in the middle (3rd position) is ${p[3]}.`,
        shortcut: `Row arrangement: ${p[0]} - ${p[4]} - ${p[3]} - ${p[1]} - ${p[2]}. Middle = ${p[3]}.`,
        topic: "Seating Arrangement",
        category: "logical",
        commonMistakes: ["Placing at an endpoint", "Misinterpreting immediate left"],
      };
    } else if (arch === 2) {
      // Circular table facing outward
      return {
        text: `${prefix} Six friends (${n.join(", ")}) sit around a circular table facing away from the center (facing outwards). If ${n[0]} is to the immediate right of ${n[1]}, in which direction is ${n[0]} relative to ${n[1]}'s view?`,
        correctVal: `To the right of ${n[1]}`,
        distractors: [`To the left of ${n[1]}`, `Opposite to ${n[1]}`, `Second to the left of ${n[1]}`],
        explanation: `When facing outward, right and left are reversed compared to facing inward. By definition, ${n[0]} sits to the immediate right of ${n[1]}.`,
        shortcut: `Facing outward: right hand points counter-clockwise.`,
        topic: "Seating Arrangement",
        category: "logical",
        commonMistakes: ["Applying inward-facing rules to outward-facing positions", "Reversing left and right"],
      };
    } else if (arch === 3) {
      // Parallel rows facing each other
      return {
        text: `${prefix} Six people sit in two parallel rows of three each. In Row 1, ${n[0]}, ${n[1]}, and ${n[2]} face South. In Row 2, ${n[3]}, ${n[4]}, and ${n[5]} face North. ${n[0]} sits at the extreme right end of Row 1. Who sits directly opposite ${n[0]} if Row 2 members are arranged from left to right as ${n[3]}, ${n[4]}, ${n[5]}?`,
        correctVal: n[3],
        distractors: [n[4], n[5], n[1]],
        explanation: `When facing South, extreme right is the leftmost position when viewed from North. Hence ${n[0]} directly faces ${n[3]} at the left end of Row 2.`,
        shortcut: `South extreme right aligns with North extreme left (${n[3]}).`,
        topic: "Seating Arrangement",
        category: "logical",
        commonMistakes: ["Confusing left and right when facing South", "Misaligning parallel rows"],
      };
    } else if (arch === 4) {
      // Linear row facing South
      const p = [n[0], n[1], n[2], n[3], n[4]];
      return {
        text: `${prefix} Five colleagues (${p.join(", ")}) sit in a row facing South. ${p[0]} is sitting at the extreme left end. Who is sitting to the immediate right of ${p[0]}?`,
        correctVal: "No one (at extreme left)",
        distractors: [p[1], p[2], p[4]],
        explanation: `When facing South, the person at the extreme left end has nobody to their left, and looking toward South, their right is towards the interior of the row. But ${p[0]} is at the end.`,
        shortcut: `End position logic: identify bounded side.`,
        topic: "Seating Arrangement",
        category: "logical",
        commonMistakes: ["Confusing South-facing orientations", "Mixing left and right"],
      };
    } else {
      // Square table seating
      return {
        text: `${prefix} Four executives (${n[0]}, ${n[1]}, ${n[2]}, ${n[3]}) sit at four corners of a square boardroom table facing the center. ${n[0]} is diagonally opposite to ${n[2]}. If ${n[1]} is to the immediate right of ${n[0]}, who is to the immediate left of ${n[0]}?`,
        correctVal: n[3],
        distractors: [n[1], n[2], "Cannot be determined"],
        explanation: `In a 4-person square table facing center, ${n[0]} is opposite ${n[2]}. The two adjacent seats are ${n[1]} (immediate right) and ${n[3]} (immediate left).`,
        shortcut: `Opposite is ${n[2]}, right is ${n[1]} -> left must be ${n[3]}.`,
        topic: "Seating Arrangement",
        category: "logical",
        commonMistakes: ["Selecting diagonally opposite person", "Inverting left and right"],
      };
    }
  }

  if (normTopic.includes("puzzle")) {
    const arch = archIndex(qIndex, testNum, 6);
    const n = [
      NAMES[Math.abs(qSeed) % NAMES.length],
      NAMES[Math.abs(qSeed + 2) % NAMES.length],
      NAMES[Math.abs(qSeed + 5) % NAMES.length],
      NAMES[Math.abs(qSeed + 7) % NAMES.length],
      NAMES[Math.abs(qSeed + 11) % NAMES.length],
      NAMES[Math.abs(qSeed + 13) % NAMES.length],
    ];
    if (arch === 0) {
      if ((qSeed % 2) === 0) {
        // 4 floors
        return {
          text: `${prefix} Four software engineers (${n[0]}, ${n[1]}, ${n[2]}, ${n[3]}) live on floors 1, 2, 3, and 4 of a residency building. ${n[0]} lives on an even floor. ${n[1]} lives above ${n[0]}. ${n[2]} lives on floor 1. On which floor does ${n[3]} reside?`,
          correctVal: "Floor 3",
          distractors: ["Floor 2", "Floor 4", "Floor 1"],
          explanation: `Floor 1 is occupied by ${n[2]}. ${n[0]} is on an even floor below ${n[1]}, so ${n[0]} must be on Floor 2 and ${n[1]} on Floor 4. Thus ${n[3]} must reside on Floor 3.`,
          shortcut: `Floor 1 = ${n[2]}. Even floor below top = Floor 2 (${n[0]}), Floor 4 (${n[1]}). Remaining Floor 3 = ${n[3]}.`,
          topic: "Puzzles",
          category: "logical",
          commonMistakes: ["Placing ${n[0]} on floor 4 leaving no room for ${n[1]}", "Miscounting floors"],
        };
      } else {
        // 5 floors
        return {
          text: `${prefix} Five colleagues (${n[0]}, ${n[1]}, ${n[2]}, ${n[3]}, ${n[4]}) live on separate floors 1 to 5 of an apartment. ${n[0]} lives on the top floor (5). ${n[1]} lives immediately above ${n[2]}. ${n[3]} lives on floor 1. If ${n[4]} lives on an even floor, on which floor does ${n[2]} live?`,
          correctVal: "Floor 2",
          distractors: ["Floor 3", "Floor 4", "Floor 1"],
          explanation: `Floor 5 = ${n[0]}, Floor 1 = ${n[3]}. Available floors are 2, 3, 4. Even floor for ${n[4]} can be 2 or 4. If ${n[1]} is immediately above ${n[2]}, they need consecutive floors (3 and 2, or 4 and 3). If ${n[4]} is on 4, ${n[1]} is on 3 and ${n[2]} is on 2. Thus ${n[2]} lives on Floor 2.`,
          shortcut: `Top=5, Bottom=1. Even=4 for ${n[4]} -> Consecutive 3,2 for ${n[1]},${n[2]}. ${n[2]}=Floor 2.`,
          topic: "Puzzles",
          category: "logical",
          commonMistakes: ["Placing ${n[4]} on floor 2", "Miscounting remaining floors"],
        };
      }
    } else if (arch === 1) {
      if ((qSeed % 2) === 0) {
        return {
          text: `${prefix} In a group of five engineers, ${n[0]} is taller than ${n[1]} but shorter than ${n[2]}. ${n[3]} is taller than ${n[4]} but shorter than ${n[1]}. Who is the tallest person in the group?`,
          correctVal: n[2],
          distractors: [n[0], n[3], n[1]],
          explanation: `Height ordering: ${n[2]} > ${n[0]} > ${n[1]} > ${n[3]} > ${n[4]}. Therefore, ${n[2]} is the tallest.`,
          shortcut: `Order: ${n[2]} > ${n[0]} > ${n[1]} > ${n[3]} > ${n[4]} -> Tallest is ${n[2]}.`,
          topic: "Puzzles",
          category: "logical",
          commonMistakes: ["Selecting ${n[0]}", "Overlooking transitive inequality"],
        };
      } else {
        return {
          text: `${prefix} Among five teammates, ${n[0]} is taller than ${n[1]} but shorter than ${n[2]}. ${n[3]} is taller than ${n[4]} but shorter than ${n[1]}. Who is the shortest person in the group?`,
          correctVal: n[4],
          distractors: [n[3], n[1], n[0]],
          explanation: `Height ordering: ${n[2]} > ${n[0]} > ${n[1]} > ${n[3]} > ${n[4]}. Therefore, ${n[4]} is the shortest.`,
          shortcut: `Order: ${n[2]} > ${n[0]} > ${n[1]} > ${n[3]} > ${n[4]} -> Shortest is ${n[4]}.`,
          topic: "Puzzles",
          category: "logical",
          commonMistakes: ["Selecting ${n[3]}", "Inverting tallest and shortest"],
        };
      }
    } else if (arch === 2) {
      // Days of week scheduling
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const dayOffset = Math.abs(qSeed) % 3;
      const reviewTypes = ["sprint reviews", "architecture syncs", "client project demos", "milestone checkpoints", "design presentations"];
      const review = reviewTypes[Math.abs(qSeed) % reviewTypes.length];
      return {
        text: `${prefix} Five ${review} (${n[0]}, ${n[1]}, ${n[2]}, ${n[3]}, ${n[4]}) are scheduled from Monday to Friday. ${n[0]}'s review is immediately before ${n[1]}'s. ${n[2]}'s review is on Wednesday. If ${n[0]}'s review is on ${days[dayOffset]}, on which day is ${n[1]}'s review?`,
        correctVal: days[dayOffset + 1],
        distractors: [days[dayOffset], days[(dayOffset + 2) % 5], "Friday"],
        explanation: `Since ${n[0]}'s review is scheduled on ${days[dayOffset]}, and ${n[1]} is immediately after ${n[0]}, ${n[1]}'s review takes place on ${days[dayOffset + 1]}.`,
        shortcut: `Immediately after ${days[dayOffset]} is ${days[dayOffset + 1]}.`,
        topic: "Puzzles",
        category: "logical",
        commonMistakes: ["Placing review on Wednesday", "Selecting previous day"],
      };
    } else if (arch === 3) {
      // Box stacking puzzle
      const colorPalettes = [
        ["Red", "Blue", "Green", "Yellow", "White"],
        ["Black", "Silver", "Gold", "Purple", "Orange"],
        ["Cyan", "Magenta", "Teal", "Indigo", "Maroon"],
        ["Violet", "Bronze", "Emerald", "Ruby", "Amber"],
        ["Copper", "Crimson", "Navy", "Olive", "Coral"],
        ["Charcoal", "Platinum", "Lavender", "Turquoise", "Peach"]
      ];
      const colors = colorPalettes[Math.abs(qSeed) % colorPalettes.length];
      return {
        text: `${prefix} Five storage boxes (${colors.join(", ")}) are stacked vertically one above another. The ${colors[0]} box is immediately above the ${colors[1]} box. The ${colors[2]} box is at the bottom. If the ${colors[3]} box is at the top, which box is in the exact middle?`,
        correctVal: `${colors[0]} box`,
        distractors: [`${colors[1]} box`, `${colors[4]} box`, `${colors[2]} box`],
        explanation: `Bottom is ${colors[2]} (position 1). Top is ${colors[3]} (position 5). ${colors[0]} is immediately above ${colors[1]}. The stack from top to bottom is: ${colors[3]}, ${colors[4]}, ${colors[0]}, ${colors[1]}, ${colors[2]}. The middle (3rd) box is ${colors[0]}.`,
        shortcut: `Stack: 5:${colors[3]}, 4:${colors[4]}, 3:${colors[0]}, 2:${colors[1]}, 1:${colors[2]}. Middle = ${colors[0]}.`,
        topic: "Puzzles",
        category: "logical",
        commonMistakes: ["Inverting top and bottom positions", "Misidentifying the middle index"],
      };
    } else if (arch === 4) {
      // City / Profession matching
      const citySets = [
        ["Bengaluru", "Hyderabad", "Pune"],
        ["Mumbai", "Delhi", "Chennai"],
        ["Kolkata", "Ahmedabad", "Gurugram"],
        ["Noida", "Kochi", "Chandigarh"],
        ["Jaipur", "Indore", "Bhopal"],
        ["Coimbatore", "Visakhapatnam", "Nagpur"]
      ];
      const roleSets = [
        ["Architect", "Data Scientist", "DevOps Engineer"],
        ["Product Manager", "Backend Engineer", "Security Analyst"],
        ["ML Engineer", "Frontend Specialist", "Database Administrator"],
        ["Cloud Consultant", "QA Automation Lead", "Scrum Master"]
      ];
      const cities = citySets[Math.abs(qSeed) % citySets.length];
      const roles = roleSets[Math.abs(qSeed + 1) % roleSets.length];
      return {
        text: `${prefix} Three tech professionals (${n[0]}, ${n[1]}, ${n[2]}) work in ${cities.join(", ")}, not necessarily in that order. ${n[0]} is a ${roles[0]} and does not work in ${cities[0]}. ${n[1]} works in ${cities[1]}. Where does ${n[0]} work if each person works in a distinct city?`,
        correctVal: cities[2],
        distractors: [cities[0], cities[1], "Cannot be determined"],
        explanation: `${n[1]} works in ${cities[1]}. ${n[0]} cannot work in ${cities[0]} or ${cities[1]}, so ${n[0]} must work in ${cities[2]}. Consequently, ${n[2]} works in ${cities[0]}.`,
        shortcut: `${n[1]}=${cities[1]}, ${n[0]}≠${cities[0]} -> ${n[0]}=${cities[2]}.`,
        topic: "Puzzles",
        category: "logical",
        commonMistakes: ["Assigning ${n[0]} to ${cities[0]}", "Confusing profession with location"],
      };
    } else {
      // Weight / Age ranking
      const diff = 2 + (Math.abs(qSeed) % 5);
      const isSecondOldest = (Math.abs(qSeed) % 2) === 0;
      if (isSecondOldest) {
        return {
          text: `${prefix} Among five teammates, ${n[0]} is older than ${n[1]} by ${diff} years. ${n[2]} is older than ${n[0]} but younger than ${n[3]}. ${n[4]} is the youngest. Who is the second oldest in the team?`,
          correctVal: n[2],
          distractors: [n[3], n[0], n[1]],
          explanation: `Age hierarchy: ${n[3]} > ${n[2]} > ${n[0]} > ${n[1]} > ${n[4]}. The second oldest person is ${n[2]}.`,
          shortcut: `Descending order: ${n[3]} > ${n[2]} > ${n[0]} > ${n[1]} > ${n[4]}. Second oldest = ${n[2]}.`,
          topic: "Puzzles",
          category: "logical",
          commonMistakes: ["Selecting the oldest (${n[3]})", "Confusing second oldest with second youngest"],
        };
      } else {
        return {
          text: `${prefix} Among five teammates, ${n[0]} is older than ${n[1]} by ${diff} years. ${n[2]} is older than ${n[0]} but younger than ${n[3]}. ${n[4]} is the youngest. Who is the second youngest in the team?`,
          correctVal: n[1],
          distractors: [n[4], n[0], n[2]],
          explanation: `Age hierarchy: ${n[3]} > ${n[2]} > ${n[0]} > ${n[1]} > ${n[4]}. The youngest is ${n[4]}, and the second youngest person is ${n[1]}.`,
          shortcut: `Ascending order: ${n[4]} < ${n[1]} < ${n[0]} < ${n[2]} < ${n[3]}. Second youngest = ${n[1]}.`,
          topic: "Puzzles",
          category: "logical",
          commonMistakes: ["Selecting the youngest (${n[4]})", "Selecting ${n[0]}"],
        };
      }
    }
  }

  // Logical Deduction
  const arch = archIndex(qIndex, testNum, 5);
  if (arch === 0) {
    return {
      text: `${prefix} If every tech unicorn has scalable software, and no company without venture funding can become a unicorn, which of the following MUST be true?`,
      correctVal: "Any company without venture funding is not a unicorn",
      distractors: ["All scalable software companies are unicorns", "All funded startups are unicorns", "Unicorns never fail"],
      explanation: `By contrapositive deduction: 'No non-funded company is a unicorn' means if a company is not funded, it cannot be a unicorn.`,
      shortcut: `Contrapositive rule: P -> Q implies ~Q -> ~P.`,
      topic: "Logical Deduction",
      category: "logical",
      commonMistakes: ["Assuming the converse (All scalable companies are unicorns)", "Assuming funding guarantees unicorn status"],
    };
  } else if (arch === 1) {
    return {
      text: `${prefix} Premise 1: Whenever the build pipeline fails, alerts are dispatched. Premise 2: No alerts were dispatched today. What deduction is valid?`,
      correctVal: "The build pipeline did not fail today",
      distractors: ["The build pipeline succeeded with warnings", "Alert system was turned off", "Build pipeline failed silently"],
      explanation: `Modus Tollens: If P implies Q, then ~Q implies ~P. Build failure (P) -> Alerts (Q). No alerts (~Q) -> No build failure (~P).`,
      shortcut: `Modus Tollens: ~Q -> ~P.`,
      topic: "Logical Deduction",
      category: "logical",
      commonMistakes: ["Assuming the alert service failed", "Invalid inductive leaps"],
    };
  } else if (arch === 2) {
    return {
      text: `${prefix} Premise: Either the database cluster is overloaded or network latency is high. If network latency is normal (not high), what must be concluded?`,
      correctVal: "The database cluster is overloaded",
      distractors: ["The network switch is faulty", "Both database and network are functioning normally", "System throughput is optimal"],
      explanation: `Disjunctive Syllogism: Given P ∨ Q and ¬Q, it follows logically that P must be true.`,
      shortcut: `P ∨ Q and ¬Q -> P.`,
      topic: "Logical Deduction",
      category: "logical",
      commonMistakes: ["Assuming both could be false", "Ignoring disjunctive premise"],
    };
  } else if (arch === 3) {
    return {
      text: `${prefix} If all cryptographic hashes are one-way functions, and SHA-256 is a cryptographic hash, what conclusion necessarily follows?`,
      correctVal: "SHA-256 is a one-way function",
      distractors: ["All one-way functions are SHA-256", "SHA-256 cannot be cracked by quantum computers", "SHA-256 produces variable length output"],
      explanation: `Universal instantiation (Modus Ponens): All H are O. S is H. Therefore S is O.`,
      shortcut: `All A are B. X is A -> X is B.`,
      topic: "Logical Deduction",
      category: "logical",
      commonMistakes: ["Affirming the consequent", "Extrapolating quantum resistance without premise"],
    };
  } else {
    return {
      text: `${prefix} Premise 1: Only senior developers have root production access. Premise 2: ${name1} has root production access. What is the guaranteed deduction?`,
      correctVal: `${name1} is a senior developer`,
      distractors: [`${name1} is the lead architect`, `All senior developers have root access`, `Junior developers can request temporary root`],
      explanation: `'Only A are B' means B implies A (Root access implies Senior developer). Since ${name1} has root access, ${name1} must be a senior developer.`,
      shortcut: `'Only A are B' -> B implies A. ${name1} has B -> ${name1} is A.`,
      topic: "Logical Deduction",
      category: "logical",
      commonMistakes: ["Interpreting 'Only A are B' as 'All A are B'", "Assuming ${name1} is team lead"],
    };
  }
}

// ============================================================================
// 3. VERBAL ABILITY SPECIALIZED GENERATORS
// ============================================================================

export function generateVerbalTopicQuestion(
  topic: string,
  qIndex: number,
  testNum: number,
  seed: number,
  prefix: string
): QuestionRawData {
  const normTopic = topic.toLowerCase();
  const qSeed = seed + qIndex * 73 + testNum * 31;
  const idx = (qIndex - 1 + (testNum - 1) * 7) % 30;

  if (normTopic.includes("reading") || normTopic.includes("comprehension")) {
    const readingBank = [
      {
        p: "The integration of machine learning in healthcare has revolutionized radiology. Deep neural networks detect malignant lesions with accuracy exceeding 94%. However, clinical adoption remains constrained by the black-box opacity of deep learning weights, which clinicians cannot audit.",
        q: "What is the primary constraint on clinical adoption of healthcare AI?",
        a: "Lack of algorithmic interpretability and transparency",
        d: ["Inferior diagnostic accuracy compared to junior physicians", "Excessive computational hardware requirements in clinics", "Patient refusal to accept digital recommendations"],
        exp: "The passage notes clinical adoption is constrained by the 'black-box opacity' of deep learning models."
      },
      {
        p: "Monolithic architectures have yielded ground to containerized microservices. By decomposing application domains into bounded services over message brokers, velocity is achieved. However, this incurs distributed complexity: network latency and partition consistency.",
        q: "What trade-off is highlighted regarding microservices adoption?",
        a: "Deployment velocity is gained at the expense of distributed operational complexity",
        d: ["Microservices reduce hardware costs but eliminate cloud interoperability", "Monolithic codebases run faster on edge devices", "Containerization introduces severe legal compliance issues"],
        exp: "The text explains architectural agility incurs distributed complexity."
      },
      {
        p: "The shift toward renewable energy sources presents grid management dilemmas. Because peak generation rarely synchronizes with peak demand, grid fluctuations threaten brownouts unless utility-scale battery storage buffers surplus output.",
        q: "Why are utility-scale battery storage systems necessary for renewable grids?",
        a: "To buffer the temporal mismatch between peak energy generation and peak demand",
        d: ["To permanently eliminate the need for interstate transmission lines", "Because wind turbines cannot operate during winter conditions", "To step down the voltage of high-tension power lines"],
        exp: "The text states battery storage is needed because generation rarely synchronizes with demand."
      },
      {
        p: "Just-in-time manufacturing eliminated buffer inventories for capital efficiency. However, geopolitical friction and shipping chokepoints revealed systemic fragility, prompting transitions toward nearshoring and multi-vendor sourcing.",
        q: "What strategic shift is taking place in supply chain management?",
        a: "Transitioning from lean inventory toward resilient multi-vendor nearshoring",
        d: ["Completely discontinuing international commerce", "Replacing container shipping with domestic air cargo", "Ignoring holding costs in favor of unlimited warehouse hoarding"],
        exp: "The passage details the shift toward resilient multi-vendor nearshoring."
      },
      {
        p: "Quantum computing leverages superposition and entanglement to solve discrete optimization problems in seconds. However, maintaining quantum coherence requires cryogenic dilution refrigerators operating near absolute zero.",
        q: "What physical condition is required to sustain quantum coherence?",
        a: "Cryogenic environments operating near absolute zero",
        d: ["Intense magnetic acceleration in vacuum tubes", "Continuous exposure to ultraviolet radiation", "High-temperature semiconductor junctions"],
        exp: "Coherence requires cryogenic dilution refrigerators near absolute zero."
      },
      {
        p: "Remote asynchronous work provides temporal autonomy and eliminates commuting overhead. Nonetheless, distributed teams report degraded serendipitous knowledge transfer and erosion of social capital over time.",
        q: "Which disadvantage of asynchronous remote work is cited?",
        a: "Diminished spontaneous knowledge sharing and social cohesion",
        d: ["Drastic reduction in overall individual code throughput", "Complete inability to conduct asynchronous sprint planning", "Mandatory requirement for daily round-the-clock meetings"],
        exp: "The text cites degraded serendipitous knowledge transfer and eroded social capital."
      },
      {
        p: "Autonomous driving algorithms rely on sensor fusion combining LiDAR, radar, and cameras. While LiDAR provides centimeter-precise depth maps, adverse weather like heavy snowfall degrades photon return fidelity.",
        q: "What limitation affects LiDAR sensors in autonomous vehicles?",
        a: "Performance degradation during heavy snowfall or adverse weather",
        d: ["Inability to distinguish colors in bright sunlight", "Complete failure when operating at speeds above 30 km/h", "Excessive interference from vehicle audio systems"],
        exp: "Heavy snowfall and weather degrade photon return fidelity in LiDAR."
      },
      {
        p: "Zero-Trust Architecture discards implicit perimeter trust in enterprise networks. Every authentication request, whether internal or external, undergoes continuous cryptographic identity verification and micro-segmentation inspection.",
        q: "What fundamental assumption does Zero-Trust Architecture reject?",
        a: "Implicit trust based solely on internal network location",
        d: ["The necessity of encrypting database tables at rest", "Multi-factor authentication protocols for privileged users", "Role-based access controls for corporate software"],
        exp: "Zero-Trust discards implicit perimeter trust based on internal location."
      },
      {
        p: "Central Bank Digital Currencies (CBDCs) allow sovereign monetary policy enforcement with zero payment intermediary fees. However, civil liberties advocates caution that programmable state currency enables surveillance of citizen transactions.",
        q: "What primary risk do civil liberty advocates associate with CBDCs?",
        a: "Potential state surveillance and restriction of private citizen transactions",
        d: ["Hyperinflation caused by automated algorithmic burning", "Complete collapse of national foreign exchange reserves", "Inability of consumers to access offline physical goods"],
        exp: "Advocates caution against surveillance through programmable state currency."
      },
      {
        p: "Edge computing shifts computational telemetry processing from centralized hyper-scale cloud data centers directly to local gateways, reducing round-trip latency for real-time industrial robotics.",
        q: "What is the primary operational advantage of edge computing?",
        a: "Minimizing network latency by processing telemetry locally",
        d: ["Eliminating the need for software updates on industrial machinery", "Replacing electric actuators with pneumatic valves", "Allowing robots to operate without electrical power"],
        exp: "Processing locally minimizes round-trip network latency."
      },
      {
        p: "Generative adversarial networks (GANs) pitch a generator against a discriminator in a minimax game. As the discriminator sharpens its detection of artifacts, the generator synthesizes indistinguishable photorealistic images.",
        q: "How does the minimax dynamic improve image synthesis in GANs?",
        a: "The generator adapts continuously to fool an increasingly rigorous discriminator",
        d: ["The discriminator generates synthetic training images directly", "Both networks share identical weights throughout the training run", "Training halts as soon as the discriminator makes its first error"],
        exp: "The adversarial competition pushes the generator to synthesize photorealistic data."
      },
      {
        p: "Open-source software ecosystems cultivate rapid innovation through collective code contributions. Yet, maintainer burnout and unpatched transitive dependencies introduce latent supply-chain vulnerabilities.",
        q: "What security risk is highlighted in open-source software ecosystems?",
        a: "Unpatched vulnerabilities residing in nested transitive dependencies",
        d: ["Proprietary source code leaking into public domain repositories", "Excessive licensing fees imposed by non-profit foundations", "Strict regulatory prohibitions against third-party package managers"],
        exp: "Unpatched transitive dependencies create latent supply-chain vulnerabilities."
      },
      {
        p: "Carbon capture and direct air capture (DAC) technologies extract ambient CO2 directly from atmosphere. Nevertheless, thermal regeneration of chemical sorbents demands substantial megawatt-hours of clean energy.",
        q: "Why is direct air capture energy-intensive?",
        a: "Thermal regeneration of chemical sorbents requires large energy inputs",
        d: ["Compressing ambient air requires cryogenic liquification of nitrogen", "DAC facilities must operate exclusively at night to absorb carbon", "Chemical sorbents cannot be reused after initial saturation"],
        exp: "Thermal desorption of sorbents consumes substantial clean energy."
      },
      {
        p: "Behavioral economics demonstrates that consumer decisions deviate predictably from rational choice theory. Heuristics like loss aversion cause individuals to weigh financial losses twice as heavily as equivalent monetary gains.",
        q: "According to loss aversion principles, how do people perceive equal gains and losses?",
        a: "The psychological pain of a loss is substantially greater than the joy of an equivalent gain",
        d: ["Gains and losses are evaluated on a strictly linear mathematical scale", "Consumers always prioritize long-term utility over short-term gratification", "Financial gains produce zero dopamine response in market participants"],
        exp: "Loss aversion shows losses are felt twice as intensely as equivalent gains."
      },
      {
        p: "Space debris in low Earth orbit poses collision hazards to active telecommunications constellations. Under Kessler syndrome, a single hypervelocity impact could trigger a cascade of secondary fragments.",
        q: "What characterizes the Kessler syndrome in orbital mechanics?",
        a: "A self-sustaining cascade of orbital collisions generating increasing orbital debris",
        d: ["The sudden atmospheric reentry of geostationary satellites", "Solar flare radiation ionizing satellite solar panels", "Gravitational decay caused by lunar tidal friction"],
        exp: "Kessler syndrome describes a runaway cascading debris collision chain."
      },
      {
        p: "Urban vertical farming utilizes closed-loop hydroponics and LED spectrums to cultivate crops with 95% less water than traditional agriculture. However, high electricity costs for indoor lighting challenge unit economics.",
        q: "What factor primarily constrains the commercial profitability of vertical farming?",
        a: "High electricity expenditures required for artificial indoor illumination",
        d: ["Excessive freshwater consumption compared to conventional irrigation", "Extreme vulnerability to outdoor seasonal monsoons", "Lack of fertile topsoil within urban high-rise installations"],
        exp: "Electricity for artificial lighting is the primary cost burden."
      },
      {
        p: "Software fuzzing bombards executable binaries with millions of pseudo-random mutated inputs. Coverage-guided fuzzers instrument code paths to discover memory safety crashes and buffer overflows.",
        q: "How do coverage-guided fuzzers uncover software security vulnerabilities?",
        a: "By tracking exercised code paths while mutating malformed test inputs",
        d: ["By reviewing static source code comments for logical syntax flaws", "By comparing binary file sizes against historical baseline benchmarks", "By enforcing mandatory peer code reviews before git pull requests"],
        exp: "Coverage fuzzing instruments code paths to detect memory corruption."
      },
      {
        p: "Precision medicine sequences individual tumor genomes to target oncogenic driver mutations. While targeted therapies achieve dramatic initial remissions, secondary resistance mutations frequently emerge within months.",
        q: "What clinical challenge frequently complicates targeted cancer therapies?",
        a: "The eventual emergence of secondary drug-resistant genetic mutations",
        d: ["Total inability to sequence oncogenic DNA from patient tissue", "Complete lack of targeted pharmaceutical drugs in commercial production", "Severe allergic reactions to preliminary blood drawing procedures"],
        exp: "Secondary resistance mutations emerge, undermining initial remissions."
      },
      {
        p: "Neuromorphic chips mimic biological neural architectures using event-driven spikes rather than synchronized clock cycles. This asynchronous execution delivers ultra-low power consumption for edge AI vision tasks.",
        q: "Why do neuromorphic computing architectures consume dramatically less power?",
        a: "They compute using event-driven spikes rather than continuous clock cycles",
        d: ["They utilize mechanical relays instead of silicon transistors", "They operate without drawing current from external power supplies", "They process data exclusively using optical photon reflection"],
        exp: "Asynchronous spike-based signaling eliminates clock distribution power."
      },
      {
        p: "Desalination through reverse osmosis forces seawater across semi-permeable membranes under high hydraulic pressure. The resulting brine discharge must be diffused responsibly to prevent localized hypersaline marine hypoxia.",
        q: "What ecological risk must reverse osmosis desalination facilities mitigate?",
        a: "Hypersaline brine discharge causing localized marine oxygen depletion",
        d: ["Excessive depletion of sodium chloride reserves in oceanic waters", "Release of toxic radioactive isotopes into municipal tap water", "Rapid temperature increases boiling shallow coastal lagoons"],
        exp: "Concentrated brine discharge can cause localized marine hypoxia."
      },
      {
        p: "Agile methodologies promote iterative software delivery and cross-functional empowerment. However, teams often confuse agile flexibility with the complete absence of architecture governance, resulting in technical debt accumulation.",
        q: "What pitfall is associated with flawed agile implementations?",
        a: "Neglecting architectural governance under the guise of iterative flexibility",
        d: ["Delivering production releases too infrequently to gather feedback", "Over-documenting system requirements before writing preliminary code", "Restricting developer communication to weekly status spreadsheets"],
        exp: "Discarding governance leads to rapid technical debt accumulation."
      },
      {
        p: "CRISPR-Cas9 gene editing employs a guide RNA to direct endonuclease cleavage at targeted genomic loci. While editing somatic cells treats sickle cell anemia, germline alterations carry transgenerational ethical implications.",
        q: "Why does germline gene editing provoke heightened ethical concern?",
        a: "Genetic modifications are inheritable across future generations",
        d: ["Somatic cells reject synthetic guide RNA molecules completely", "Endonucleases cannot cleave double-stranded human DNA in vitro", "Sickle cell anemia cannot be diagnosed through molecular screening"],
        exp: "Germline modifications are passed down transgenerationally."
      },
      {
        p: "Microplastics in oceanic food webs bioaccumulate up trophic levels. Apex marine predators consume bio-magnified concentrations of toxic plasticizers, disrupting endocrine signaling and reproductive fecundity.",
        q: "What consequence does trophic biomagnification of microplastics have on apex predators?",
        a: "Endocrine disruption and reduced reproductive fecundity",
        d: ["Immediate acceleration of skeletal bone density", "Enhanced immunity against predatory parasitic infections", "Drastic reduction in daily caloric nutritional requirements"],
        exp: "Toxic plasticizers biomagnify, disrupting endocrine and reproductive systems."
      },
      {
        p: "Decentralized autonomous organizations (DAOs) execute governance proposals via smart contracts. When voting weight correlates strictly with token holdings, plutocratic governance subverts decentralized democratic intent.",
        q: "What vulnerability can undermine democratic governance in token-weighted DAOs?",
        a: "Plutocratic dominance by large token holders over minority participants",
        d: ["Smart contracts executing transactions too slowly to enact decisions", "Mandatory requirements for state legislative approval on all votes", "Lack of cryptographic signatures on transaction proposals"],
        exp: "Token-weighted voting enables plutocratic dominance by whales."
      },
      {
        p: "Aerodynamic winglets reduce aircraft fuel consumption by disrupting wingtip vortices. By smoothing pressure differentials between upper and lower wing surfaces, induced drag is minimized during long-haul cruising.",
        q: "How do wingtip devices improve commercial aircraft efficiency?",
        a: "By disrupting wingtip vortices to minimize induced aerodynamic drag",
        d: ["By increasing total cabin payload capacity during runway takeoff", "By doubling jet engine thrust output during turbulent weather", "By shielding passenger windows from solar ultraviolet radiation"],
        exp: "Winglets disrupt vortex formation, reducing induced drag and saving fuel."
      },
      {
        p: "Synthetic biology enables metabolic engineering of yeast strains to synthesize artemisinin and vanillin. Fermentation replaces resource-intensive botanical harvesting, but downstream purification costs dictate commercial viability.",
        q: "What economic factor largely determines the commercial viability of engineered yeast fermentation?",
        a: "The cost efficiency of downstream chemical purification processes",
        d: ["The availability of arable farmland for growing commercial yeast crops", "Severe international trade tariffs on biological yeast cultures", "The complete inability of yeast to metabolize simple glucose feeds"],
        exp: "Downstream separation and purification costs dictate unit economics."
      },
      {
        p: "Semantic search engines leverage vector embeddings to retrieve documents based on contextual intent rather than exact keyword matches. High-dimensional vector space captures polysemy and conceptual synonymy.",
        q: "Why does vector-based semantic search outperform traditional keyword matching?",
        a: "It captures conceptual context and semantic intent rather than literal keywords",
        d: ["It stores documents in uncompressed plaintext on distributed hard drives", "It eliminates the need for mathematical indexing algorithms entirely", "It guarantees zero false positives across multilingual web documents"],
        exp: "Vector embeddings represent conceptual meaning and contextual relationships."
      },
      {
        p: "Geothermal heat pumps exploit stable underground crust temperatures to heat and cool buildings. While initial borehole drilling carries capital expenditure premiums, coefficient of performance exceeds 4.0 throughout annual seasonal cycles.",
        q: "What is the primary trade-off of geothermal heat pump installation?",
        a: "High upfront borehole drilling expense offset by superior seasonal operating efficiency",
        d: ["Low installation cost offset by complete failure during winter freeze cycles", "Mandatory dependence on diesel fuel to circulate underground water", "Severe seismic vibrations that crack building foundation slabs"],
        exp: "High upfront capital costs are compensated by high seasonal efficiency."
      },
      {
        p: "Digital twins construct real-time virtual representations of physical assets using continuous IoT sensor telemetry. Predictive maintenance models simulate mechanical stress to preempt catastrophic bearing failures.",
        q: "How do digital twin simulations prevent industrial equipment failure?",
        a: "By modeling stress telemetry to predict and schedule component maintenance early",
        d: ["By remotely increasing engine horsepower beyond manufacturer safety thresholds", "By eliminating the requirement for lubrication in high-speed mechanical bearings", "By automatically manufacturing replacement parts inside running turbines"],
        exp: "Predictive stress modeling allows preemptive maintenance before failure."
      },
      {
        p: "Container orchestration systems like Kubernetes manage automated deployment, horizontal scaling, and service self-healing. Pod health probes automatically terminate and restart un-responsive application instances.",
        q: "What role do health probes perform in container orchestration?",
        a: "Detecting un-responsive containers to trigger automated restarts and self-healing",
        d: ["Auditing developer commit messages for spelling and formatting errors", "Encrypting database backups before transferring files across networks", "Regulating server room ambient air temperatures automatically"],
        exp: "Liveness and readiness probes restart stalled containers to self-heal."
      }
    ];
    const item = readingBank[idx];
    return {
      text: `${prefix} Read the passage below and answer the question:\n\n"${item.p}"\n\nQuestion: ${item.q}`,
      correctVal: item.a,
      distractors: item.d,
      explanation: item.exp,
      shortcut: `Identify direct contextual assertion: ${item.a}.`,
      topic: "Reading Comprehension",
      category: "verbal",
      commonMistakes: ["Extrapolating assumptions beyond the text", "Selecting contradictory options"]
    };
  }

  if (normTopic.includes("grammar") || normTopic.includes("correction") || normTopic.includes("error")) {
    const grammarBank = [
      {
        t: "Select the sentence with correct subject-verb agreement:",
        a: "Neither the architect nor the software engineers were aware of the memory leak.",
        d: ["Neither the architect nor the software engineers was aware of the memory leak.", "Neither the architect or the software engineers was aware of the memory leak.", "Neither the architect nor the software engineers has been aware of the leak."],
        e: "In 'Neither... nor' constructions, the verb agrees with the closer subject ('engineers' = plural 'were')."
      },
      {
        t: "Choose the sentence free of dangling or misplaced modifiers:",
        a: "Having completed the benchmark testing, the engineering team deployed the patch.",
        d: ["Having completed the benchmark testing, the patch was deployed by the engineering team.", "Running into the data center, the air conditioning felt freezing.", "To reduce API latency, the database was redesigned by our team."],
        e: "The introductory participial phrase must be followed by the subject that actually performed the action."
      },
      {
        t: "Identify the correct conditional structure:",
        a: "If the security team had audited the gateway logs, the intrusion would have been detected.",
        d: ["If the security team would have audited the gateway logs, the intrusion would have been detected.", "If the security team had audited the gateway logs, the intrusion would be detected yesterday.", "If the security team audited the gateway logs, the intrusion would have been detected."],
        e: "Third conditional (past counterfactual) uses 'had + past participle' in the if-clause, never 'would have'."
      },
      {
        t: "Choose the sentence with correct collective noun agreement:",
        a: "The consensus panel has published its unanimous audit recommendations.",
        d: ["The consensus panel have published its unanimous audit recommendations.", "The consensus panel has published their unanimous audit recommendations.", "The consensus panel have published their unanimous audit recommendations."],
        e: "A collective noun acting as a single cohesive unit takes a singular verb ('has') and singular pronoun ('its')."
      },
      {
        t: "Select the grammatically correct comparative construction:",
        a: "This load balancer handles high traffic volumes more efficiently than any other system.",
        d: ["This load balancer handles high traffic volumes more efficiently than any system.", "This load balancer handles high traffic volumes more efficient than any other system.", "This load balancer handles high traffic volumes more better than any other system."],
        e: "When comparing within a class, use 'any other' to exclude the subject itself from the comparison group."
      },
      {
        t: "Identify the correct use of correlative conjunctions:",
        a: "The platform not only offers horizontal scalability but also ensures multi-region redundancy.",
        d: ["The platform not only offers horizontal scalability but ensures multi-region redundancy also.", "Not only the platform offers horizontal scalability but also ensures multi-region redundancy.", "The platform offers not only horizontal scalability but also ensures multi-region redundancy."],
        e: "Parallelism requires parallel parts of speech after 'not only' (verb phrase) and 'but also' (verb phrase)."
      },
      {
        t: "Choose the sentence with correct pronoun case:",
        a: "The lead architect asked Priya and me to review the distributed consensus algorithm.",
        d: ["The lead architect asked Priya and I to review the distributed consensus algorithm.", "The lead architect asked Priya and myself to review the distributed consensus algorithm.", "The lead architect asked Priya and mine to review the distributed consensus algorithm."],
        e: "'Me' is the objective pronoun required as the direct object of the verb 'asked'."
      },
      {
        t: "Select the sentence with correct subjunctive mood:",
        a: "The CTO recommended that every engineer write comprehensive integration tests.",
        d: ["The CTO recommended that every engineer writes comprehensive integration tests.", "The CTO recommended that every engineer wrote comprehensive integration tests.", "The CTO recommended that every engineer must write comprehensive integration tests."],
        e: "The subjunctive mood following verbs of mandate/recommendation requires the base verb ('write')."
      },
      {
        t: "Identify the sentence that correctly maintains parallel structure:",
        a: "The engineer enjoys analyzing telemetry, optimizing queries, and deploying microservices.",
        d: ["The engineer enjoys analyzing telemetry, to optimize queries, and deploying microservices.", "The engineer enjoys analyzing telemetry, optimizing queries, and deployment of microservices.", "The engineer enjoys telemetry analysis, optimizing queries, and microservices deployment."],
        e: "All elements in the series must maintain matching gerund forms ('analyzing', 'optimizing', 'deploying')."
      },
      {
        t: "Choose the correct punctuation for coordinating independent clauses:",
        a: "The server reached peak CPU capacity; consequently, requests were throttled.",
        d: ["The server reached peak CPU capacity, consequently, requests were throttled.", "The server reached peak CPU capacity: consequently requests were throttled.", "The server reached peak CPU capacity; consequently; requests were throttled."],
        e: "Two independent clauses joined by a conjunctive adverb require a semicolon before and comma after."
      },
      {
        t: "Select the sentence with correct prepositional idiom:",
        a: "The development framework complies with strict cloud security benchmarks.",
        d: ["The development framework complies to strict cloud security benchmarks.", "The development framework complies at strict cloud security benchmarks.", "The development framework complies into strict cloud security benchmarks."],
        e: "The standard English idiom is 'comply with', not 'comply to'."
      },
      {
        t: "Identify the sentence with correct apostrophe usage:",
        a: "The developers reviewed both systems' operational metrics before deployment.",
        d: ["The developers reviewed both systems's operational metrics before deployment.", "The developers reviewed both system's operational metrics before deployment.", "The developers reviewed both systems operational metrics before deployment."],
        e: "For plural nouns ending in 's', the possessive apostrophe is placed after the 's' ('systems'')."
      },
      {
        t: "Choose the sentence that correctly avoids double negatives:",
        a: "The DevOps team could scarcely believe the speed of the deployment pipeline.",
        d: ["The DevOps team couldn't scarcely believe the speed of the deployment pipeline.", "The DevOps team could scarcely not believe the speed of the deployment pipeline.", "The DevOps team couldn't hardly believe the speed of the deployment pipeline."],
        e: "'Scarcely' and 'hardly' are inherently negative; combining them with 'not' or 'n't' creates a double negative."
      },
      {
        t: "Select the sentence with correct tense sequence:",
        a: "By the time the patch was approved, the attackers had already compromised the server.",
        d: ["By the time the patch was approved, the attackers already compromised the server.", "By the time the patch was approved, the attackers have already compromised the server.", "By the time the patch had been approved, the attackers already compromised the server."],
        e: "The past perfect ('had already compromised') denotes an action completed before another past event."
      },
      {
        t: "Choose the sentence with correct relative pronoun usage:",
        a: "The engineer whom management promoted last month designed the distributed cache.",
        d: ["The engineer who management promoted last month designed the distributed cache.", "The engineer which management promoted last month designed the distributed cache.", "The engineer whose management promoted last month designed the distributed cache."],
        e: "'Whom' functions as the objective pronoun (object of 'promoted')."
      },
      {
        t: "Identify the sentence free of redundant phrasing:",
        a: "The team will revert the migration if unexpected latency occurs.",
        d: ["The team will revert back the migration if unexpected latency occurs.", "The team will repeat again the benchmark if unexpected latency occurs.", "The team will advance forward with the deployment if unexpected latency occurs."],
        e: "'Revert' already means turn back; adding 'back' creates tautological redundancy."
      },
      {
        t: "Select the correct use of 'fewer' vs 'less':",
        a: "The refactored module contains fewer lines of code and consumes less memory.",
        d: ["The refactored module contains less lines of code and consumes fewer memory.", "The refactored module contains fewer lines of code and consumes fewer memory.", "The refactored module contains less lines of code and consumes less memory."],
        e: "Use 'fewer' for countable plural nouns ('lines') and 'less' for uncountable quantities ('memory')."
      },
      {
        t: "Choose the grammatically sound sentence regarding 'between' vs 'among':",
        a: "The cloud cluster distributes traffic among five identical web worker instances.",
        d: ["The cloud cluster distributes traffic between five identical web worker instances.", "The cloud cluster distributes traffic across of five identical web worker instances.", "The cloud cluster distributes traffic between all the five instances."],
        e: "Use 'among' when referring to three or more collective entities without pairwise distinction."
      },
      {
        t: "Identify the sentence that correctly expresses hypothetical conditions:",
        a: "If the network latency were lower, edge replication would be instantaneous.",
        d: ["If the network latency was lower, edge replication would be instantaneous.", "If the network latency is lower, edge replication would have been instantaneous.", "If the network latency would be lower, edge replication were instantaneous."],
        e: "Hypothetical/counterfactual conditions require the subjunctive 'were', even with singular subjects."
      },
      {
        t: "Choose the correct sentence regarding active vs passive clarity:",
        a: "The security engineer patched the zero-day vulnerability before attackers exploited it.",
        d: ["The zero-day vulnerability was patched by the security engineer before being exploited by attackers.", "A patching of the zero-day vulnerability occurred by the engineer before exploitation.", "The exploitation of the vulnerability was prevented through patching by the security engineer."],
        e: "Active voice provides superior syntactic clarity and direct agency."
      },
      {
        t: "Select the sentence with correct pronoun-antecedent agreement:",
        a: "Each of the software engineers submitted his or her pull request before deadline.",
        d: ["Each of the software engineers submitted their pull request before deadline without approval.", "Every of the software engineers submitted their pull requests before deadline.", "Each software engineers submitted his pull request before deadline."],
        e: "'Each' is grammatically singular and agrees with singular possessive reference."
      },
      {
        t: "Choose the sentence with correct verb complementation:",
        a: "The architect persuaded the stakeholders to adopt microservices architecture.",
        d: ["The architect persuaded the stakeholders adopting microservices architecture.", "The architect persuaded that the stakeholders adopt microservices architecture.", "The architect persuaded for adopting microservices architecture."],
        e: "The verb 'persuade' governs an object + infinitive: 'persuaded someone to do something'."
      },
      {
        t: "Select the sentence with accurate idiom regarding 'different':",
        a: "The new framework's concurrency model is completely different from the old paradigm.",
        d: ["The new framework's concurrency model is completely different than the old paradigm.", "The new framework's concurrency model is completely different to the old paradigm.", "The new framework's concurrency model is completely different with the old paradigm."],
        e: "In formal standard English, the preferred preposition is 'different from'."
      },
      {
        t: "Identify the sentence correctly using 'as well as':",
        a: "The senior architect, as well as the junior developers, is attending the security summit.",
        d: ["The senior architect, as well as the junior developers, are attending the security summit.", "The senior architect, as well as the junior developers, have attended the summit.", "The senior architect as well as the junior developers were attending the summit."],
        e: "Parenthetical phrases introduced by 'as well as' do not compound the grammatical subject; 'is' agrees with 'architect'."
      },
      {
        t: "Choose the sentence with correct modifier placement:",
        a: "The engineering director only approved the production release after all tests passed.",
        d: ["The engineering director approved the production release only after all tests passed.", "Only the engineering director approved the production release after all tests passed.", "The engineering director approved only the production release after all tests passed."],
        e: "'Only after all tests passed' correctly limits the temporal condition of approval."
      },
      {
        t: "Select the sentence that avoids misplaced adverbials:",
        a: "The team completely redesigned the database schema to eliminate locking.",
        d: ["The team redesigned completely the database schema to eliminate locking.", "The team redesigned the database completely schema to eliminate locking.", "To eliminate completely locking, the schema was redesigned by the team."],
        e: "Adverbs of manner normally precede the main verb or follow the direct object."
      },
      {
        t: "Identify the correct negative polarity item usage:",
        a: "The auditor found barely any discrepancy in the encrypted ledger records.",
        d: ["The auditor did not find barely any discrepancy in the encrypted ledger records.", "The auditor found barely no discrepancy in the encrypted ledger records.", "The auditor scarcely could not find any discrepancy in the encrypted ledger records."],
        e: "'Barely' provides the negative polarity; pairing with 'no' creates a redundant double negative."
      },
      {
        t: "Choose the sentence with correct verb aspect in reported speech:",
        a: "The lead engineer confirmed that the caching layer had resolved the bottleneck.",
        d: ["The lead engineer confirmed that the caching layer has resolved the bottleneck.", "The lead engineer confirmed that the caching layer resolves the bottleneck yesterday.", "The lead engineer confirms that the caching layer had resolved the bottleneck tomorrow."],
        e: "Past reporting verb ('confirmed') triggers backshift to past perfect ('had resolved')."
      },
      {
        t: "Select the sentence with accurate idiom regarding 'prefer':",
        a: "Our infrastructure team prefers asynchronous messaging to synchronous polling.",
        d: ["Our infrastructure team prefers asynchronous messaging than synchronous polling.", "Our infrastructure team prefers asynchronous messaging over to synchronous polling.", "Our infrastructure team prefers asynchronous messaging rather than polling."],
        e: "The verb 'prefer' takes the preposition 'to': 'prefer X to Y'."
      },
      {
        t: "Identify the sentence free of faulty parallelism in correlative pairs:",
        a: "You must either refactor the legacy codebase or migrate to containerized microservices.",
        d: ["Either you must refactor the legacy codebase or migrate to containerized microservices.", "You must either refactor the legacy codebase or migrating to containerized microservices.", "You either must refactor the legacy codebase or to migrate to microservices."],
        e: "Parallel verb phrases ('refactor...' and 'migrate...') directly balance after 'either' and 'or'."
      }
    ];
    const item = grammarBank[idx];
    return {
      text: `${prefix} ${item.t}`,
      correctVal: item.a,
      distractors: item.d,
      explanation: item.e,
      shortcut: `Grammar rule: ${item.a}.`,
      topic: "Grammar & Sentence Correction",
      category: "verbal",
      commonMistakes: ["Applying colloquial habits to formal syntax", "Misidentifying the true subject"]
    };
  }

  if (normTopic.includes("jumble")) {
    const jumbleBank = [
      { p: "P. by reducing memory footprint and latency\nQ. asynchronous reactive streams\nR. high-throughput systems achieve scalability\nS. through non-blocking event loops", a: "Q-S-R-P", d: ["R-P-Q-S", "S-Q-P-R", "P-R-S-Q"], exp: "Asynchronous reactive streams (Q) through non-blocking event loops (S) high-throughput systems achieve scalability (R) by reducing memory footprint and latency (P)." },
      { p: "P. that revolutionized distributed computing\nQ. Google published the MapReduce paper\nR. in the early two thousands\nS. enabling parallel processing at petabyte scale", a: "R-Q-P-S", d: ["Q-P-S-R", "P-S-R-Q", "S-R-Q-P"], exp: "In the early two thousands (R), Google published the MapReduce paper (Q) that revolutionized distributed computing (P), enabling parallel processing at petabyte scale (S)." },
      { p: "P. but also enhances code maintainability\nQ. rigorous automated testing\nR. not only mitigates regression bugs\nS. across continuous integration pipelines", a: "Q-S-R-P", d: ["R-P-Q-S", "Q-R-P-S", "P-Q-R-S"], exp: "Rigorous automated testing (Q) across continuous integration pipelines (S) not only mitigates regression bugs (R) but also enhances code maintainability (P)." },
      { p: "P. to maintain low query latency\nQ. relational database indexes\nR. must be balanced with write overhead\nS. while speeding up read performance", a: "Q-S-R-P", d: ["S-R-Q-P", "P-Q-S-R", "R-S-Q-P"], exp: "Relational database indexes (Q) while speeding up read performance (S) must be balanced with write overhead (R) to maintain low query latency (P)." },
      { p: "P. across multi-cloud environments\nQ. modern zero-trust frameworks\nR. enforce continuous authentication\nS. to mitigate lateral threat movement", a: "Q-R-S-P", d: ["R-S-P-Q", "P-Q-R-S", "S-R-Q-P"], exp: "Modern zero-trust frameworks (Q) enforce continuous authentication (R) to mitigate lateral threat movement (S) across multi-cloud environments (P)." },
      { p: "P. by caching computed results\nQ. dynamic programming algorithms\nR. optimize recursive subproblems\nS. to achieve polynomial time complexity", a: "Q-R-P-S", d: ["P-S-Q-R", "R-Q-P-S", "S-P-R-Q"], exp: "Dynamic programming algorithms (Q) optimize recursive subproblems (R) by caching computed results (P) to achieve polynomial time complexity (S)." },
      { p: "P. ensuring seamless failover\nQ. distributed consensus algorithms like Raft\nR. maintain state synchronization across replicas\nS. during leader election partitions", a: "Q-R-S-P", d: ["R-Q-S-P", "S-P-Q-R", "P-R-S-Q"], exp: "Distributed consensus algorithms like Raft (Q) maintain state synchronization across replicas (R) during leader election partitions (S) ensuring seamless failover (P)." },
      { p: "P. to prevent single points of failure\nQ. enterprise network architects\nR. deploy redundant gateway routers\nS. across geographically distributed data centers", a: "Q-R-S-P", d: ["P-S-R-Q", "R-Q-P-S", "S-R-Q-P"], exp: "Enterprise network architects (Q) deploy redundant gateway routers (R) across geographically distributed data centers (S) to prevent single points of failure (P)." },
      { p: "P. minimizing deadlocks\nQ. transactional memory systems\nR. serialize concurrent operations\nS. through optimistic concurrency control", a: "Q-R-S-P", d: ["S-R-Q-P", "P-Q-S-R", "R-P-Q-S"], exp: "Transactional memory systems (Q) serialize concurrent operations (R) through optimistic concurrency control (S) minimizing deadlocks (P)." },
      { p: "P. by analyzing telemetry streams\nQ. predictive maintenance models\nR. detect subtle mechanical vibrations\nS. before catastrophic equipment failure occurs", a: "Q-R-P-S", d: ["R-S-Q-P", "P-R-S-Q", "S-P-Q-R"], exp: "Predictive maintenance models (Q) detect subtle mechanical vibrations (R) by analyzing telemetry streams (P) before catastrophic equipment failure occurs (S)." },
      { p: "P. providing immutable audit trails\nQ. cryptographically verified ledgers\nR. record state transitions chronologically\nS. against unauthorized tampering", a: "Q-R-P-S", d: ["P-Q-R-S", "R-S-P-Q", "S-R-Q-P"], exp: "Cryptographically verified ledgers (Q) record state transitions chronologically (R) providing immutable audit trails (P) against unauthorized tampering (S)." },
      { p: "P. to optimize resource allocation\nQ. machine learning schedulers\nR. dynamically rebalance compute workloads\nS. across heterogeneous server clusters", a: "Q-R-S-P", d: ["S-R-P-Q", "P-Q-R-S", "R-S-Q-P"], exp: "Machine learning schedulers (Q) dynamically rebalance compute workloads (R) across heterogeneous server clusters (S) to optimize resource allocation (P)." },
      { p: "P. mitigating supply chain vulnerabilities\nQ. automated dependency scanning\nR. inspects nested package versions\nS. during continuous integration builds", a: "Q-R-S-P", d: ["R-S-P-Q", "P-Q-R-S", "S-R-Q-P"], exp: "Automated dependency scanning (Q) inspects nested package versions (R) during continuous integration builds (S) mitigating supply chain vulnerabilities (P)." },
      { p: "P. without sacrificing diagnostic fidelity\nQ. federated learning protocols\nR. train decentralized neural networks\nS. preserving patient privacy locally", a: "Q-R-S-P", d: ["S-R-Q-P", "P-S-R-Q", "R-Q-P-S"], exp: "Federated learning protocols (Q) train decentralized neural networks (R) preserving patient privacy locally (S) without sacrificing diagnostic fidelity (P)." },
      { p: "P. to absorb volatile traffic spikes\nQ. cloud-native applications\nR. utilize asynchronous message queues\nS. decoupling producers from consumers", a: "Q-R-S-P", d: ["R-S-P-Q", "P-Q-R-S", "S-P-Q-R"], exp: "Cloud-native applications (Q) utilize asynchronous message queues (R) decoupling producers from consumers (S) to absorb volatile traffic spikes (P)." },
      { p: "P. preventing unauthorized data exfiltration\nQ. hardware security modules\nR. protect encryption root keys\nS. within tamper-resistant silicon boundaries", a: "Q-R-S-P", d: ["R-S-Q-P", "P-R-S-Q", "S-P-Q-R"], exp: "Hardware security modules (Q) protect encryption root keys (R) within tamper-resistant silicon boundaries (S) preventing unauthorized data exfiltration (P)." },
      { p: "P. speeding up release velocity\nQ. feature flag management systems\nR. decouple software deployment from activation\nS. through progressive rollout rings", a: "Q-R-S-P", d: ["S-R-P-Q", "P-Q-R-S", "R-Q-S-P"], exp: "Feature flag management systems (Q) decouple software deployment from activation (R) through progressive rollout rings (S) speeding up release velocity (P)." },
      { p: "P. ensuring seamless playback\nQ. adaptive bitrate streaming protocols\nR. dynamically adjust video resolution\nS. based on real-time network throughput", a: "Q-R-S-P", d: ["R-S-Q-P", "P-S-R-Q", "S-P-Q-R"], exp: "Adaptive bitrate streaming protocols (Q) dynamically adjust video resolution (R) based on real-time network throughput (S) ensuring seamless playback (P)." },
      { p: "P. reducing cooling overhead\nQ. liquid immersion cooling technologies\nR. dissipate thermal energy directly\nS. from ultra-dense server racks", a: "Q-R-S-P", d: ["R-S-P-Q", "P-Q-R-S", "S-R-Q-P"], exp: "Liquid immersion cooling technologies (Q) dissipate thermal energy directly (R) from ultra-dense server racks (S) reducing cooling overhead (P)." },
      { p: "P. to maintain low latency\nQ. content delivery networks\nR. terminate SSL connections at edge points\nS. closer to regional end users", a: "Q-R-S-P", d: ["R-S-Q-P", "P-Q-R-S", "S-R-P-Q"], exp: "Content delivery networks (Q) terminate SSL connections at edge points (R) closer to regional end users (S) to maintain low latency (P)." },
      { p: "P. preventing accidental data loss\nQ. distributed snapshot mechanisms\nR. capture consistent point-in-time states\nS. without pausing transactional throughput", a: "Q-R-S-P", d: ["S-R-P-Q", "P-Q-R-S", "R-S-Q-P"], exp: "Distributed snapshot mechanisms (Q) capture consistent point-in-time states (R) without pausing transactional throughput (S) preventing accidental data loss (P)." },
      { p: "P. empowering cross-functional autonomy\nQ. micro-frontend architectures\nR. decompose monolithic user interfaces\nS. into independently deployable components", a: "Q-R-S-P", d: ["R-S-P-Q", "P-S-R-Q", "S-P-Q-R"], exp: "Micro-frontend architectures (Q) decompose monolithic user interfaces (R) into independently deployable components (S) empowering cross-functional autonomy (P)." },
      { p: "P. ensuring sub-millisecond lookups\nQ. in-memory key-value data stores\nR. bypass spinning disk I/O bottlenecks\nS. by serving reads directly from RAM", a: "Q-R-S-P", d: ["R-S-Q-P", "P-Q-R-S", "S-P-Q-R"], exp: "In-memory key-value data stores (Q) bypass spinning disk I/O bottlenecks (R) by serving reads directly from RAM (S) ensuring sub-millisecond lookups (P)." },
      { p: "P. mitigating cold-start overhead\nQ. serverless platform runtimes\nR. pre-warm lightweight container instances\nS. using predictive traffic heuristics", a: "Q-R-S-P", d: ["S-R-P-Q", "P-Q-R-S", "R-Q-P-S"], exp: "Serverless platform runtimes (Q) pre-warm lightweight container instances (R) using predictive traffic heuristics (S) mitigating cold-start overhead (P)." },
      { p: "P. avoiding split-brain scenarios\nQ. quorum-based consensus protocols\nR. require majority acknowledgment\nS. before committing write transactions", a: "Q-R-S-P", d: ["R-S-Q-P", "P-S-R-Q", "S-P-Q-R"], exp: "Quorum-based consensus protocols (Q) require majority acknowledgment (R) before committing write transactions (S) avoiding split-brain scenarios (P)." },
      { p: "P. preventing catastrophic cascading failure\nQ. circuit breaker design patterns\nR. trip open during sustained downstream outages\nS. to protect upstream service health", a: "Q-R-S-P", d: ["R-S-P-Q", "P-Q-R-S", "S-R-Q-P"], exp: "Circuit breaker design patterns (Q) trip open during sustained downstream outages (R) to protect upstream service health (S) preventing catastrophic cascading failure (P)." },
      { p: "P. maintaining high developer velocity\nQ. trunk-based development workflows\nR. mandate short-lived feature branches\nS. with frequent merges into mainline", a: "Q-R-S-P", d: ["S-R-P-Q", "P-Q-R-S", "R-S-Q-P"], exp: "Trunk-based development workflows (Q) mandate short-lived feature branches (R) with frequent merges into mainline (S) maintaining high developer velocity (P)." },
      { p: "P. detecting unauthorized alterations\nQ. secure boot firmware protocols\nR. verify digital signatures cryptographically\nS. before loading the operating system kernel", a: "Q-R-S-P", d: ["R-S-Q-P", "P-R-S-Q", "S-P-Q-R"], exp: "Secure boot firmware protocols (Q) verify digital signatures cryptographically (R) before loading the operating system kernel (S) detecting unauthorized alterations (P)." },
      { p: "P. to isolate noisy neighbor workloads\nQ. multi-tenant cloud platforms\nR. enforce strict cgroup CPU and memory quotas\nS. on containerized background worker processes", a: "Q-R-S-P", d: ["S-R-P-Q", "P-Q-R-S", "R-Q-S-P"], exp: "Multi-tenant cloud platforms (Q) enforce strict cgroup CPU and memory quotas (R) on containerized background worker processes (S) to isolate noisy neighbor workloads (P)." },
      { p: "P. safeguarding production data integrity\nQ. continuous chaos engineering experiments\nR. inject deliberate network partitions\nS. to validate automated recovery mechanisms", a: "Q-R-S-P", d: ["R-S-P-Q", "P-S-R-Q", "S-P-Q-R"], exp: "Continuous chaos engineering experiments (Q) inject deliberate network partitions (R) to validate automated recovery mechanisms (S) safeguarding production data integrity (P)." }
    ];
    const item = jumbleBank[idx];
    return {
      text: `${prefix} Rearrange the following jumbled parts to form a coherent sentence:\n\n${item.p}`,
      correctVal: item.a,
      distractors: item.d,
      explanation: item.exp,
      shortcut: `Follow subject-verb-modifier chain: ${item.a}.`,
      topic: "Para Jumbles",
      category: "verbal",
      commonMistakes: ["Disconnecting dependent clauses", "Mismatched subject pronouns"]
    };
  }

  if (normTopic.includes("idiom") || normTopic.includes("phrase")) {
    const idiomBank = [
      { t: "Choose the exact meaning of the idiom: 'To cut corners'", a: "To do something in the easiest or cheapest way, often sacrificing quality", d: ["To take a geometric shortcut through traffic", "To reduce product prices during holiday sales", "To make sharp turns while driving"], exp: "'To cut corners' means doing something hastily or cheaply at the expense of quality." },
      { t: "Choose the exact meaning of the idiom: 'To bite the bullet'", a: "To face a difficult or unpleasant situation with courage and fortitude", d: ["To engage in violent corporate warfare", "To cancel a business contract abruptly", "To purchase munitions for defense"], exp: "'To bite the bullet' means facing inevitable adversity bravely." },
      { t: "Choose the exact meaning of the idiom: 'To burn the candle at both ends'", a: "To exhaust oneself by working excessively without adequate rest", d: ["To double company sales targets in one quarter", "To illuminate dark server warehouses", "To waste money foolishly"], exp: "It means working late into the night and rising early, causing exhaustion." },
      { t: "Choose the exact meaning of the idiom: 'A blessing in disguise'", a: "An apparent misfortune that eventually produces beneficial results", d: ["A software virus disguised as security patch", "A false compliment from management", "An unannounced corporate tax audit"], exp: "A situation that appears negative at first but turns out to be advantageous." },
      { t: "Choose the exact meaning of the idiom: 'To beat around the bush'", a: "To avoid discussing the core matter directly and talk evasively", d: ["To clear overgrown foliage in rural areas", "To inspect wildlife in conservation parks", "To attack competitors with false claims"], exp: "To speak evasively rather than getting to the point." },
      { t: "Choose the exact meaning of the idiom: 'Hit the nail on the head'", a: "To describe or identify the exact truth or core issue precisely", d: ["To make an amateur carpentry error", "To cause physical injury by carelessness", "To demolish an obsolete building"], exp: "To be exactly right about something." },
      { t: "Choose the exact meaning of the idiom: 'Call it a day'", a: "To stop working on something, either temporarily or permanently", d: ["To schedule a formal conference meeting", "To celebrate an official public holiday", "To launch a new commercial software service"], exp: "To conclude the day's work." },
      { t: "Choose the exact meaning of the idiom: 'Cost an arm and a leg'", a: "To be extremely exorbitant or expensive", d: ["To incur severe medical injuries", "To require manual physical labor", "To sign a long-term labor contract"], exp: "Very high monetary price or cost." },
      { t: "Choose the exact meaning of the idiom: 'Cry over spilled milk'", a: "To waste time worrying or lamenting over past irrevocable events", d: ["To complain about culinary mistakes", "To clean up liquid contamination in server rooms", "To negotiate lower grocery prices"], exp: "Regretting past mistakes that cannot be undone." },
      { t: "Choose the exact meaning of the idiom: 'Every cloud has a silver lining'", a: "Every difficult or negative circumstance has an encouraging or positive aspect", d: ["Thunderstorms always bring cool weather", "Precious metal prices fluctuate with rainfall", "High-altitude flights encounter bright sunlight"], exp: "There is something positive in every misfortune." },
      { t: "Choose the exact meaning of the idiom: 'Barking up the wrong tree'", a: "Pursuing a mistaken line of thought or accusing the wrong person", d: ["Training canine guard animals inefficiently", "Chopping timber in prohibited forest reserves", "Building treehouses on fragile branches"], exp: "Directing efforts toward the wrong goal." },
      { t: "Choose the exact meaning of the idiom: 'Leave no stone unturned'", a: "To make every possible effort and explore all avenues to achieve a goal", d: ["To clear rubble from construction sites", "To search for precious mineral deposits", "To pave an urban pedestrian walkway"], exp: "Exhausting all possible resources and methods." },
      { t: "Choose the exact meaning of the idiom: 'Spill the beans'", a: "To disclose confidential information or secrets prematurely", d: ["To make a mess in the kitchen", "To trade agricultural commodities on margin", "To plant seeds in agricultural soil"], exp: "Revealing a secret carelessly." },
      { t: "Choose the exact meaning of the idiom: 'Through thick and thin'", a: "Under all conditions, enduring both prosperous and adverse circumstances", d: ["Navigating dense jungle foliage", "Measuring the viscosity of chemical liquids", "Drafting complex legal documents"], exp: "Remaining loyal and steadfast through all trials." },
      { t: "Choose the exact meaning of the idiom: 'Jump on the bandwagon'", a: "To adopt a popular trend or activity simply because others are doing it", d: ["To board a festival parade vehicle", "To invest in musical instrument manufacturing", "To organize musical concerts in stadiums"], exp: "Joining an increasingly popular trend." },
      { t: "Choose the exact meaning of the idiom: 'Throw in the towel'", a: "To admit defeat and surrender", d: ["To clean laundry using automatic machines", "To prepare for an athletic boxing contest", "To offer hospitality to visitors"], exp: "To give up or concede." },
      { t: "Choose the exact meaning of the idiom: 'Once in a blue moon'", a: "Occurring very rarely and infrequently", d: ["Happening during lunar eclipses", "Occurring at midnight every weekend", "Happening only during cold winter seasons"], exp: "Very rare event." },
      { t: "Choose the exact meaning of the idiom: 'A dime a dozen'", a: "Extremely common, abundant, and of little unique value", d: ["Priced at exactly ten cents per twelve items", "Extremely rare collector coins", "Expensive luxury jewelry items"], exp: "Commonplace and easy to obtain." },
      { t: "Choose the exact meaning of the idiom: 'Piece of cake'", a: "Something that is extraordinarily easy to accomplish", d: ["A sweet confectionery treat", "A minor share of corporate equity", "An equitable financial compromise"], exp: "Very simple task." },
      { t: "Choose the exact meaning of the idiom: 'See eye to eye'", a: "To agree fully with someone on an issue", d: ["To make intense visual contact in an interview", "To undergo an ophthalmic vision exam", "To confront a competitor aggressively"], exp: "Being in complete agreement." },
      { t: "Choose the exact meaning of the idiom: 'Take with a grain of salt'", a: "To view something with healthy skepticism and reserve judgment", d: ["To add sodium seasoning to dietary food", "To preserve meat using chemical curing", "To reject a scientific theory completely"], exp: "Do not interpret literally or accept without proof." },
      { t: "Choose the exact meaning of the idiom: 'Under the weather'", a: "Feeling slightly unwell, sick, or fatigued", d: ["Exposed to outdoor torrential rainfall", "Working in open agricultural fields", "Operating atmospheric radar instruments"], exp: "Experiencing minor illness." },
      { t: "Choose the exact meaning of the idiom: 'Break a leg'", a: "A theatrical expression wishing someone good luck before a performance", d: ["To suffer a severe orthopedic fracture", "To damage stage equipment carelessly", "To run quickly in an emergency"], exp: "Traditional expression wishing success." },
      { t: "Choose the exact meaning of the idiom: 'Burn bridges'", a: "To permanently destroy relationships or options so one cannot return", d: ["To demolish civil infrastructure during warfare", "To build illuminated crossing spans", "To terminate highway transit routes"], exp: "Eliminating the possibility of retreat." },
      { t: "Choose the exact meaning of the idiom: 'Elephant in the room'", a: "An obvious major problem that people deliberately avoid mentioning", d: ["A captive wild animal in a menagerie", "An exceptionally large furniture installation", "An ornate decorative statue in a lobby"], exp: "An undeniable truth or crisis everyone ignores." },
      { t: "Choose the exact meaning of the idiom: 'Face the music'", a: "To confront the unpleasant consequences of one's actions", d: ["To attend a classical orchestral symphony", "To adjust audio equalizer frequencies", "To perform on stage before an audience"], exp: "Accepting accountability for mistakes." },
      { t: "Choose the exact meaning of the idiom: 'Get a taste of your own medicine'", a: "To experience the same unpleasant treatment that one inflicts on others", d: ["To swallow prescribed pharmaceutical drugs", "To graduate from accredited medical school", "To sample experimental herbal extracts"], exp: "Experiencing reciprocal negative consequences." },
      { t: "Choose the exact meaning of the idiom: 'Keep your chin up'", a: "To remain optimistic and cheerful in difficult times", d: ["To maintain proper physical posture", "To elevate visual line of sight during speeches", "To practice martial arts defense blocks"], exp: "Staying hopeful despite setbacks." },
      { t: "Choose the exact meaning of the idiom: 'On the fence'", a: "Undecided and unable to make a choice between alternatives", d: ["Perched on boundary security barriers", "Engaged in athletic fencing contests", "Building perimeter garden walls"], exp: "Remaining neutral or indecisive." },
      { t: "Choose the exact meaning of the idiom: 'Read between the lines'", a: "To discern the hidden or implied meaning that is not explicitly stated", d: ["To proofread printed text for typographical errors", "To scan barcodes using laser readers", "To write commentary in notebook margins"], exp: "Understanding implicit subtext." }
    ];
    const item = idiomBank[idx];
    return {
      text: `${prefix} ${item.t}`,
      correctVal: item.a,
      distractors: item.d,
      explanation: item.exp,
      shortcut: `Idiomatic definition: ${item.a}.`,
      topic: "Idioms & Phrases",
      category: "verbal",
      commonMistakes: ["Interpreting the idiom literally", "Confusing with opposing idioms"]
    };
  }

  // General Vocabulary / Synonyms & Antonyms / Fill in the Blanks
  const vocabBank = [
    { w: "Lucid", s: "clear", ant: "opaque", c: "The lead architect gave a remarkably _______ explanation of the distributed consensus protocol.", a: "lucid", d: ["opaque", "ambivalent", "tenuous"], e: "'Lucid' means clear, transparent, and easily understood." },
    { w: "Equanimity", s: "composure", ant: "agitation", c: "Despite the critical production outage, the SRE lead maintained complete _______.", a: "equanimity", d: ["petulance", "trepidation", "hubris"], e: "'Equanimity' means mental calmness and composure under stress." },
    { w: "Ephemeral", s: "transient", ant: "permanent", c: "The social media platform's initial surge in user traffic proved _______.", a: "ephemeral", d: ["perennial", "ubiquitous", "invulnerable"], e: "'Ephemeral' means lasting for a very brief period." },
    { w: "Pragmatic", s: "practical", ant: "idealistic", c: "Rather than pursuing theoretical elegance, the team chose a _______ architectural compromise.", a: "pragmatic", d: ["dogmatic", "esoteric", "frivolous"], e: "'Pragmatic' means dealing with things realistically and practically." },
    { w: "Mitigate", s: "alleviate", ant: "aggravate", c: "The redundant power backup was installed to _______ the risk of blackouts.", a: "mitigate", d: ["exacerbate", "instigate", "obfuscate"], e: "'Mitigate' means to make less severe, serious, or painful." },
    { w: "Ubiquitous", s: "omnipresent", ant: "rare", c: "Smartphones have become so _______ that nearly every professional carries one.", a: "ubiquitous", d: ["scarce", "parochial", "clandestine"], e: "'Ubiquitous' means present, appearing, or found everywhere." },
    { w: "Pernicious", s: "harmful", ant: "beneficial", c: "Unpatched security exploits can have a _______ effect on corporate reputation.", a: "pernicious", d: ["salutary", "innocuous", "propitious"], e: "'Pernicious' means having a harmful effect, especially in a gradual manner." },
    { w: "Fastidious", s: "meticulous", ant: "careless", c: "The QA lead was _______ about code formatting and test coverage benchmarks.", a: "fastidious", d: ["cursory", "apathetic", "slipshod"], e: "'Fastidious' means very attentive to and concerned about accuracy and detail." },
    { w: "Obsequious", s: "servile", ant: "assertive", c: "His _______ praise of the executive board made his colleagues uncomfortable.", a: "obsequious", d: ["imperious", "candid", "audacious"], e: "'Obsequious' means obedient or attentive to an excessive degree." },
    { w: "Reticent", s: "reserved", ant: "garrulous", c: "The engineer was _______ to criticize the design without concrete benchmark data.", a: "reticent", d: ["effusive", "loquacious", "voluble"], e: "'Reticent' means not revealing one's thoughts or feelings readily." },
    { w: "Capricious", s: "fickle", ant: "consistent", c: "Arbitrary and _______ policy changes confused engineering staff.", a: "capricious", d: ["steadfast", "methodical", "equable"], e: "'Capricious' means given to sudden and unaccountable changes of mood or behavior." },
    { w: "Esoteric", s: "obscure", ant: "familiar", c: "The research paper discussed _______ mathematical theories known only to specialists.", a: "esoteric", d: ["exoteric", "pedestrian", "commonplace"], e: "'Esoteric' means intended for or likely to be understood by only a small number with specialized knowledge." },
    { w: "Cogent", s: "compelling", ant: "unconvincing", c: "She presented a _______ argument for migrating the database to cloud-native storage.", a: "cogent", d: ["specious", "fallacious", "feeble"], e: "'Cogent' means clear, logical, and convincing." },
    { w: "Alacrity", s: "eagerness", ant: "reluctance", c: "The junior developer accepted the challenging refactoring task with _______.", a: "alacrity", d: ["lethargy", "apathy", "torpor"], e: "'Alacrity' means brisk and cheerful readiness." },
    { w: "Anachronism", s: "misplacement", ant: "contemporary", c: "Using tape storage for real-time web telemetry is a technological _______.", a: "anachronism", d: ["paradigm", "benchmark", "pinnacle"], e: "'Anachronism' means a thing belonging or appropriate to a period other than that in which it exists." },
    { w: "Bolster", s: "reinforce", ant: "undermine", c: "The company hired ten senior architects to _______ its distributed systems team.", a: "bolster", d: ["weaken", "enervate", "sabotage"], e: "'Bolster' means to support, strengthen, or prop up." },
    { w: "Cacophony", s: "discord", ant: "harmony", c: "The alerts generated a deafening _______ in the server control room.", a: "cacophony", d: ["euphony", "symphony", "resonance"], e: "'Cacophony' means a harsh, discordant mixture of sounds." },
    { w: "Enervate", s: "weaken", ant: "invigorate", c: "Working sixty hours a week without rest will completely _______ any engineering team.", a: "enervate", d: ["fortify", "galvanize", "animate"], e: "'Enervate' means to cause someone to feel drained of energy or vitality." },
    { w: "Garrulous", s: "talkative", ant: "taciturn", c: "Unlike his _______ colleague, the security analyst rarely spoke during standups.", a: "garrulous", d: ["laconic", "succinct", "mute"], e: "'Garrulous' means excessively talkative, especially on trivial matters." },
    { w: "Inundate", s: "overwhelm", ant: "drain", c: "The flash sale traffic began to _______ the web servers with millions of HTTP requests.", a: "inundate", d: ["deplete", "starve", "alleviate"], e: "'Inundate' means to overwhelm with things or people to be dealt with." },
    { w: "Laconic", s: "concise", ant: "verbose", c: "His _______ email simply read: 'Deployment complete; zero regressions.'", a: "laconic", d: ["prolix", "rambling", "pleonastic"], e: "'Laconic' means using very few words." },
    { w: "Malleable", s: "pliable", ant: "rigid", c: "Software specifications should remain _______ during the early research phase.", a: "malleable", d: ["intractable", "immutable", "adamant"], e: "'Malleable' means easily influenced or pliable." },
    { w: "Nefarious", s: "wicked", ant: "virtuous", c: "The intrusion detection system blocked a _______ attempt to exfiltrate customer credentials.", a: "nefarious", d: ["benevolent", "laudable", "altruistic"], e: "'Nefarious' means wicked, villainous, or criminal." },
    { w: "Ostentatious", s: "showy", ant: "modest", c: "The startup avoided _______ office perks, focusing capital on engineering talent.", a: "ostentatious", d: ["unassuming", "frugal", "austere"], e: "'Ostentatious' means characterized by vulgar or pretentious display." },
    { w: "Prolific", s: "productive", ant: "barren", c: "She was an extraordinarily _______ open-source contributor, submitting daily pull requests.", a: "prolific", d: ["unproductive", "sterile", "stagnant"], e: "'Prolific' means producing much fruit or foliage or many works." },
    { w: "Querulous", s: "complaining", ant: "contented", c: "The forum was filled with _______ complaints from dissatisfied beta testers.", a: "querulous", d: ["affable", "forbearing", "complaisant"], e: "'Querulous' means complaining in a petulant or whining manner." },
    { w: "Rancor", s: "bitterness", ant: "goodwill", c: "Despite intense debate over code styles, there was no personal _______ between engineers.", a: "rancor", d: ["amity", "concord", "cordiality"], e: "'Rancor' means bitterness or resentfulness, especially when long-standing." },
    { w: "Sagacious", s: "wise", ant: "foolish", c: "The founder made a _______ decision to pivot toward cloud infrastructure early.", a: "sagacious", d: ["fatuous", "naive", "obtuse"], e: "'Sagacious' means having or showing keen mental discernment and good judgment." },
    { w: "Taciturn", s: "silent", ant: "garrulous", c: "The chief architect was naturally _______, preferring code commits to long speeches.", a: "taciturn", d: ["garrulous", "effusive", "loquacious"], e: "'Taciturn' means reserved or uncommunicative in speech; saying little." },
    { w: "Zealot", s: "fanatic", ant: "moderate", c: "He was a test-driven development _______, refusing to merge code without 100% test coverage.", a: "zealot", d: ["skeptic", "agnostic", "cynic"], e: "'Zealot' means a person who is fanatical and uncompromising in pursuit of their ideals." }
  ];

  const item = vocabBank[idx];
  return {
    text: `${prefix} Complete the sentence with the most contextually fitting word:\n"${item.c}"`,
    correctVal: item.a,
    distractors: item.d,
    explanation: item.e,
    shortcut: `Context clue denotes '${item.s}': ${item.a}.`,
    topic: normTopic.includes("synonym") ? "Synonyms & Antonyms" : normTopic.includes("blank") ? "Fill in the Blanks" : "Vocabulary",
    category: "verbal",
    commonMistakes: ["Selecting an antonym instead of the correct meaning", "Confusing with phonetic false friends"]
  };
}

// ============================================================================
// 4. DATA INTERPRETATION SPECIALIZED GENERATORS
// ============================================================================

export function generateDITopicQuestion(
  topic: string,
  qIndex: number,
  testNum: number,
  seed: number,
  prefix: string
): QuestionRawData {
  const normTopic = topic.toLowerCase();
  const qSeed = seed + qIndex * 83 + testNum * 37;

  if (normTopic.includes("pie")) {
    const totalExp = 50 + (qSeed % 50);
    const rPct = 25;
    const mPct = 35;
    const oPct = 20;
    const iPct = 20;
    const diffVal = Number(((mPct - rPct) / 100 * totalExp).toFixed(1));
    return {
      text: `${prefix} In a corporate annual budget of ₹${totalExp} Crores, expenditure is distributed via a Pie Chart as: Marketing = 35%, R&D = 25%, Operations = 20%, Infrastructure = 20%. By how much does the expenditure on Marketing exceed that on R&D?`,
      correctVal: `₹${diffVal} Crores`,
      distractors: [`₹${(diffVal + 2.5).toFixed(1)} Crores`, `₹${(diffVal - 1.5).toFixed(1)} Crores`, `₹10.0 Crores`],
      explanation: `Difference % = 35% - 25% = 10%. Amount = 10% of ₹${totalExp} Cr = ₹${diffVal} Crores.`,
      shortcut: `(35% - 25%) × ${totalExp} = 10% × ${totalExp} = ${diffVal} Cr.`,
      topic: "Pie Charts",
      category: "data_interpretation",
      commonMistakes: ["Computing both amounts separately and risking rounding errors", "Misreading total budget"],
    };
  }

  if (normTopic.includes("bar") || normTopic.includes("graph") || normTopic.includes("line")) {
    const y1 = 400 + (qSeed % 200);
    const y2 = y1 + 100 + ((qSeed * 2) % 150);
    const growth = Number((((y2 - y1) / y1) * 100).toFixed(1));
    return {
      text: `${prefix} A company's server deployments over consecutive fiscal years show: Year 1 = ${y1} units, Year 2 = ${y2} units. What is the year-over-year percentage increase in server deployments?`,
      correctVal: `${growth}%`,
      distractors: [`${(growth - 4.5).toFixed(1)}%`, `${(growth + 5.2).toFixed(1)}%`, `${(growth * 0.8).toFixed(1)}%`],
      explanation: `Percentage increase = [(Year 2 - Year 1) / Year 1] × 100 = [(${y2} - ${y1}) / ${y1}] × 100 = ${growth}%.`,
      shortcut: `(Δ / Base) × 100 = (${y2 - y1} / ${y1}) × 100 = ${growth}%.`,
      topic: "Bar Graphs",
      category: "data_interpretation",
      commonMistakes: ["Dividing by Year 2 instead of the base Year 1", "Arithmetic difference error"],
    };
  }

  if (normTopic.includes("table")) {
    const tA = 120 + (qSeed % 40);
    const tB = 150 + ((qSeed * 3) % 50);
    const ratio = simplifyRatio(tA, tB);
    return {
      text: `${prefix} In a performance evaluation table, Department A resolved ${tA} support tickets while Department B resolved ${tB} tickets. What is the simplified ratio of tickets resolved by Department A to Department B?`,
      correctVal: ratio,
      distractors: [ratio.split(":").reverse().join(" : "), "1 : 1", `${tA} : ${tB + 10}`],
      explanation: `Ratio = ${tA} : ${tB} = ${ratio}.`,
      shortcut: `Divide by greatest common divisor: ${tA}:${tB} -> ${ratio}.`,
      topic: "Tables",
      category: "data_interpretation",
      commonMistakes: ["Reversing numerator and denominator", "Failing to reduce to lowest terms"],
    };
  }

  // Caselets & Data Sufficiency
  return {
    text: `${prefix} Question: What is the total strength of the engineering team?\nStatement I: The ratio of frontend to backend engineers is 3:2.\nStatement II: There are 15 backend engineers on the team.`,
    correctVal: "Both statements together are sufficient",
    distractors: [
      "Statement I alone is sufficient",
      "Statement II alone is sufficient",
      "Statements I and II together are not sufficient",
    ],
    explanation: `From Statement I, F/B = 3/2. From Statement II, B = 15. Combining both gives F = 3/2 × 15 = 22.5. Total = F + B = 37.5. Thus both statements together provide sufficient data.`,
    shortcut: `Ratio (I) + Single quantity (II) yields total. Both required.`,
    topic: "Data Sufficiency",
    category: "data_interpretation",
    commonMistakes: ["Thinking Statement I alone can give absolute total", "Calculating value when only sufficiency is required"],
  };
}

// ============================================================================
// 5. ANALYTICAL REASONING SPECIALIZED GENERATORS
// ============================================================================

export function generateAnalyticalTopicQuestion(
  topic: string,
  qIndex: number,
  testNum: number,
  seed: number,
  prefix: string
): QuestionRawData {
  const normTopic = topic.toLowerCase();
  const idx = (qIndex - 1 + (testNum - 1) * 7) % 30;

  if (normTopic.includes("assumption")) {
    const assumptions = [
      { s: "All employees must complete mandatory cybersecurity training by Friday to prevent phishing compromises.", a1: "Phishing emails pose an active security threat to the organization.", a2: "Employees currently lack awareness regarding cybersecurity protocols.", c: "Only assumption 1 is implicit", exp: "The directive assumes phishing poses an active threat (1). It does not assume everyone lacks awareness, only that training ensures compliance." },
      { s: "The municipal corporation launched a subsidized electric bus corridor to curb urban particulate pollution.", a1: "Commuters will utilize the subsidized electric bus corridor.", a2: "Public transport electrification contributes to reducing particulate emissions.", c: "Both assumptions are implicit", exp: "Launching the service assumes citizens will use it (1) and that electric buses reduce emissions (2)." },
      { s: "Invest in high-yield mutual funds today to secure your post-retirement financial independence.", a1: "Financial independence is a primary objective for post-retirement planning.", a2: "High-yield mutual funds guarantee risk-free capital returns.", c: "Only assumption 1 is implicit", exp: "Mutual funds involve market risk and do not guarantee risk-free returns. Assumption 1 is the motivating premise." },
      { s: "The university mandated that all thesis submissions must pass through automated plagiarism detection software.", a1: "Some students submit academic dissertations containing uncredited content.", a2: "Automated plagiarism software can effectively flag verbatim text duplication.", c: "Both assumptions are implicit", exp: "Mandating the check assumes potential plagiarism exists (1) and software is capable of detection (2)." },
      { s: "Install rooftop solar photovoltaic panels to slash your monthly household utility expenses by 40%.", a1: "Rooftop solar installations generate sufficient electricity to replace grid consumption.", a2: "Current household utility expenses are excessively high.", c: "Only assumption 1 is implicit", exp: "The claim assumes solar generation offsets grid usage (1). Whether current expenses are high or low is subjective." },
      { s: "The hospital inaugurated a 24/7 dedicated pediatric emergency triage facility.", a1: "Pediatric emergency cases require specialized clinical equipment and pediatricians.", a2: "Children fall ill more frequently during late-night hours than during the daytime.", c: "Only assumption 1 is implicit", exp: "Specialized triage assumes unique clinical needs (1). It does not assume higher frequency at night." },
      { s: "To reduce traffic congestion on the arterial expressway, toll rates will be tripled during peak rush hours.", a1: "A substantial proportion of motorists are sensitive to toll price fluctuations.", a2: "Alternative routes or public transit exist for displaced motorists.", c: "Both assumptions are implicit", exp: "Pricing congestion assumes elasticity (1) and feasible travel alternatives (2)." },
      { s: "Upgrade your cloud servers to NVMe solid-state storage arrays to accelerate database read throughput.", a1: "Current database query latency is constrained by disk I/O bottlenecks.", a2: "NVMe solid-state drives deliver higher data transfer rates than magnetic storage.", c: "Both assumptions are implicit", exp: "The recommendation assumes I/O is the bottleneck (1) and NVMe outperforms legacy disks (2)." },
      { s: "All software developers should master test-driven development (TDD) to eliminate production regressions.", a1: "Writing unit tests prior to implementation helps detect logic bugs early.", a2: "Software written without TDD is inherently unmaintainable.", c: "Only assumption 1 is implicit", exp: "TDD assumes early defect detection (1). Calling non-TDD code inherently unmaintainable is an extreme unstated assertion." },
      { s: "The central bank lowered benchmark interest rates by 50 basis points to stimulate commercial capital expenditure.", a1: "Lower borrowing costs incentivize corporations to finance expansion projects.", a2: "Consumer inflation is currently well below the statutory tolerance threshold.", c: "Only assumption 1 is implicit", exp: "Rate cuts directly assume borrowing elasticity for capex (1). Inflation levels are an external factor not stated." },
      { s: "The state airline replaced paper boarding passes with facial biometric recognition at all departure gates.", a1: "Biometric scanning accelerates passenger gate boarding throughput.", a2: "Passengers possess the requisite digital literacy to navigate biometric verification.", c: "Both assumptions are implicit", exp: "Biometric adoption assumes operational speedup (1) and user compliance (2)." },
      { s: "Farmers are advised to adopt drip irrigation systems in semi-arid zones to conserve subterranean groundwater aquifers.", a1: "Drip irrigation delivers water directly to plant root zones with minimal evaporative loss.", a2: "Groundwater extraction in semi-arid zones currently exceeds natural replenishment rates.", c: "Both assumptions are implicit", exp: "The advice assumes drip efficiency (1) and aquifer depletion concerns (2)." },
      { s: "The pharmaceutical regulator fast-tracked clinical evaluation of a novel monoclonal antibody vaccine.", a1: "The underlying epidemic presents an immediate public health emergency.", a2: "The fast-tracked vaccine candidate demonstrates acceptable preclinical safety benchmarks.", c: "Both assumptions are implicit", exp: "Emergency fast-tracking requires public health urgency (1) and baseline preclinical safety (2)." },
      { s: "Implement multi-factor authentication (MFA) across internal portals to safeguard enterprise credentials.", a1: "Static single-factor passwords can be compromised via credential stuffing or credential leakage.", a2: "MFA introduces a second independent cryptographic or biometric verification channel.", c: "Both assumptions are implicit", exp: "Password vulnerability (1) and MFA's layered security mechanism (2) are foundational premises." },
      { s: "The city council constructed dedicated protected bicycle lanes along major downtown corridors.", a1: "Segregated bicycle infrastructure encourages commuters to substitute private vehicles for cycles.", a2: "Downtown street width is adequate to accommodate dedicated cycle tracks without gridlocking buses.", c: "Both assumptions are implicit", exp: "Policy assumes modal shift (1) and roadway spatial feasibility (2)." },
      { s: "Enroll in our intensive full-stack coding bootcamp to transition from non-technical careers into tech engineering.", a1: "Structured coding mentorship can impart market-ready software engineering skills in months.", a2: "Technology companies hire software developers based on demonstrated practical competency rather than degrees.", c: "Both assumptions are implicit", exp: "The bootcamp's value proposition assumes effective skill acquisition (1) and merit-based hiring (2)." },
      { s: "The national highway authority replaced incandescent street lamps with adaptive LED luminaires.", a1: "LED luminaires consume significantly less electrical wattage per lumen than incandescent lamps.", a2: "Adaptive dimming extends luminaire lifespan without compromising motorist visibility.", c: "Both assumptions are implicit", exp: "Energy savings (1) and operational road safety (2) are direct assumptions." },
      { s: "Companies should offer flexible remote work arrangements to minimize employee attrition among senior engineers.", a1: "Workplace flexibility and schedule autonomy are valued significantly by experienced professionals.", a2: "Remote employees consistently exhibit higher productivity than co-located office teams.", c: "Only assumption 1 is implicit", exp: "Retention assumes employees value autonomy (1). Productivity superiority (2) is not asserted in the retention context." },
      { s: "To prevent unauthorized financial ledger modifications, the banking consortium implemented a distributed permissioned blockchain.", a1: "Cryptographic consensus algorithms prevent retroactive tampering of committed transaction ledgers.", a2: "Centralized database administrators were engaging in fraudulent ledger modifications.", c: "Only assumption 1 is implicit", exp: "Immutability assumption (1) is core. Assuming existing DBAs were fraudulent (2) is an unwarranted accusation." },
      { s: "Install smart electronic water metering in residential apartments to incentivize water conservation.", a1: "Detailed consumption telemetry encourages residents to identify leaks and curb excessive usage.", a2: "Tariffs linked to volumetric metering penalize wasteful water habits.", c: "Both assumptions are implicit", exp: "Telemetry awareness (1) and economic price incentives (2) both underpin metering policy." },
      { s: "The shipping logistics conglomerate transitioned container tracking to satellite-linked IoT sensors.", a1: "Real-time vessel location tracking reduces port turnaround delays and cargo pilferage.", a2: "Terrestrial cellular networks fail to provide uninterrupted mid-ocean maritime coverage.", c: "Both assumptions are implicit", exp: "Operational benefits (1) and terrestrial coverage limitations (2) justify satellite IoT." },
      { s: "The department of education integrated generative AI tools into high school computer science curricula.", a1: "Familiarity with AI development workflows will prepare students for modern industry roles.", a2: "Students will not misuse AI tools to bypass foundational programming learning.", c: "Both assumptions are implicit", exp: "Pedagogical relevance (1) and integrity of foundational learning (2) are implicit expectations." },
      { s: "Supermarket chains should eliminate single-use plastic grocery bags to mitigate municipal landfill accumulation.", a1: "Single-use plastic grocery bags constitute a substantial fraction of non-biodegradable municipal solid waste.", a2: "Shoppers are willing to adopt reusable fabric tote bags for daily grocery trips.", c: "Both assumptions are implicit", exp: "Landfill impact (1) and consumer adaptability (2) are required for the policy to succeed." },
      { s: "The telecom regulator mandated that all smartphones must support regional satellite emergency messaging.", a1: "Users occasionally encounter life-threatening emergencies in remote zones without cellular towers.", a2: "Direct-to-satellite silicon modems can be integrated into consumer handsets at reasonable cost.", c: "Both assumptions are implicit", exp: "Remote survival utility (1) and commercial hardware feasibility (2) underpin the mandate." },
      { s: "The factory installed automated optical inspection (AOI) robots to detect printed circuit board soldering defects.", a1: "Machine vision algorithms can detect microscopic solder bridging with higher consistency than human eyes.", a2: "PCB soldering flaws are a primary driver of factory warranty return claims.", c: "Both assumptions are implicit", exp: "Inspection superiority (1) and defect economic impact (2) justify the robotic investment." },
      { s: "The government launched zero-interest micro-loans for rural women entrepreneurs to foster decentralized employment.", a1: "Access to seed working capital enables rural women to establish sustainable micro-enterprises.", a2: "Rural women borrowers possess higher repayment discipline than large corporate entities.", c: "Only assumption 1 is implicit", exp: "Enterprise viability via capital (1) is the underlying premise. Repayment comparison to corporations (2) is irrelevant." },
      { s: "Automate continuous integration pipelines to run end-to-end regression suites upon every pull request.", a1: "Immediate automated test feedback reduces the latency required to detect code integration conflicts.", a2: "Developers will write comprehensive regression test coverage for every new software feature.", c: "Only assumption 1 is implicit", exp: "CI automation assumes rapid feedback (1). Perfect developer testing behavior (2) is not guaranteed nor implied." },
      { s: "The railway network mandated automated train collision avoidance systems across all trunk corridors.", a1: "Human driver signaling errors can be mitigated by autonomous electro-pneumatic braking interventions.", a2: "Train passenger demand will double immediately after collision avoidance installation.", c: "Only assumption 1 is implicit", exp: "Safety enhancement through automation (1) is the objective. Demand doubling (2) is completely unfounded." },
      { s: "Hospitals should deploy AI triage algorithms to prioritize emergency room CT scans for acute stroke cases.", a1: "Rapid radiological identification of ischemic or hemorrhagic stroke saves neural tissue.", a2: "AI triage models can reliably flag intracranial hemorrhages within minutes of scan completion.", c: "Both assumptions are implicit", exp: "Clinical time-sensitivity (1) and algorithmic radiological accuracy (2) are foundational." },
      { s: "Municipal authorities deployed smart street parking sensors connected to a public mobile reservation app.", a1: "Real-time parking spot discovery decreases urban cruising traffic and vehicular exhaust emissions.", a2: "Drivers will download and pay for reserved parking slots via the municipal smartphone app.", c: "Both assumptions are implicit", exp: "Congestion mitigation (1) and citizen app adoption (2) are both essential assumptions." },
    ];
    const item = assumptions[idx];
    return {
      text: `${prefix} Statement: "${item.s}"\n\nAssumptions:\nI. ${item.a1}\nII. ${item.a2}`,
      correctVal: item.c,
      distractors: ["Only assumption 1 is implicit", "Only assumption 2 is implicit", "Both assumptions are implicit", "Neither assumption is implicit"].filter(o => o !== item.c),
      explanation: item.exp,
      shortcut: `Identify the unstated logical premise required for the statement: ${item.c}.`,
      topic: "Statement Assumption",
      category: "analytical",
      commonMistakes: ["Treating subsequent results as assumptions", "Assuming external information not implied by statement"],
    };
  }

  if (normTopic.includes("conclusion")) {
    const conclusions = [
      { s: "In a clinical trial of 5,000 corporate professionals, participants who consistently slept 7-8 hours per night scored 30% higher on cognitive accuracy tests than those sleeping under 6 hours.", c1: "Adequate sleep directly correlates with enhanced cognitive performance.", c2: "Sleeping 10 hours per night will make any individual an exceptional problem solver.", ans: "Only conclusion 1 follows", exp: "The study strictly observed 7-8 hours (Conclusion 1). Oversleeping to 10 hours (Conclusion 2) is an unproven extrapolation." },
      { s: "Over the past 5 years, regional electric vehicle registrations expanded by 400%, while local urban gasoline sales declined by 18%.", c1: "Electric vehicle adoption has begun substituting traditional vehicular fossil fuel consumption in the region.", c2: "Gasoline passenger automobiles will be completely eradicated from the roads within the next 24 months.", ans: "Only conclusion 1 follows", exp: "The data shows tangible substitution (1). Complete eradication in 24 months (2) is an unsubstantiated extreme claim." },
      { s: "Every software engineer employed at CloudCorp holds an accredited cloud architecture certification.", c1: "Any engineer who joins CloudCorp must hold or acquire a cloud architecture certification.", c2: "Holding a cloud architecture certification guarantees that a developer writes error-free code.", ans: "Only conclusion 1 follows", exp: "Since all engineers hold it, it is a universal organizational characteristic (1). Writing error-free code (2) is unsupported." },
      { s: "Companies that instituted mandatory 3-day in-office attendance recorded a 14% increase in spontaneous hallway brainstorming sessions, but a 22% increase in senior engineer voluntary resignations.", c1: "Mandating in-office presence can simultaneously stimulate informal communication while escalating employee turnover risk.", c2: "Senior engineers universally despise in-office collaborative work.", ans: "Only conclusion 1 follows", exp: "Both empirical tradeoffs are documented (1). Universal hatred (2) is an overgeneralized hyperbole." },
      { s: "A metropolitan transit survey revealed that 78% of metro rail commuters cite punctual train departures as the primary determinant of commuter satisfaction.", c1: "Schedule reliability is the single most influential driver of transit commuter satisfaction.", c2: "Metro systems can safely double fare ticket prices without losing ridership as long as trains run on time.", ans: "Only conclusion 1 follows", exp: "Punctuality is the primary factor (1). Price elasticity and fare doubling (2) are completely unstudied here." },
      { s: "Agricultural drones equipped with multispectral sensors enabled farmers to reduce nitrogen fertilizer usage by 25% while sustaining equal crop yield.", c1: "Targeted multispectral precision application optimizes chemical fertilizer deployment efficiency.", c2: "Traditional manual farming methods are completely incapable of producing viable crop yields.", ans: "Only conclusion 1 follows", exp: "Precision fertilizer optimization is demonstrated (1). Calling traditional farming incapable (2) contradicts real-world reality." },
      { s: "During periods of high summer heat waves, regional peak grid electricity demand surges by 35% due to air conditioning load.", c1: "Air conditioning usage drives substantial seasonal variance in electrical power consumption.", c2: "The regional grid should permanently dismantle hydroelectric generators during cooler winter months.", ans: "Only conclusion 1 follows", exp: "Heat waves spike AC demand (1). Dismantling power plants in winter (2) is completely illogical." },
      { s: "Autonomous warehouse mobile robots reduced package sorting sorting errors by 90% and doubled packing velocity compared to manual sorting benches.", c1: "Robotic automation improves both accuracy and throughput in warehouse fulfillment sorting operations.", c2: "Warehouse logistics facilities will no longer require human management oversight or maintenance technicians.", ans: "Only conclusion 1 follows", exp: "Accuracy and velocity gains are verified (1). Zero human oversight/maintenance (2) is an invalid deduction." },
      { s: "The implementation of automated CI/CD security scanning caught 450 vulnerability regressions prior to merging code into production.", c1: "Automated security scanning provides preventative pre-release vulnerability remediation.", c2: "Production environments with automated scanning can never experience external zero-day exploits.", ans: "Only conclusion 1 follows", exp: "Pre-release detection is verified (1). Claiming zero-day immunity (2) is an impossible guarantee." },
      { s: "Solar photovoltaic panels paired with lithium battery storage maintained 99.8% uptime across off-grid telecommunication towers in remote deserts.", c1: "Solar plus storage microgrids can deliver mission-critical electrical reliability in isolated locations.", c2: "Solar power will completely replace all fossil fuel power generation worldwide within 5 years.", ans: "Only conclusion 1 follows", exp: "Remote microgrid viability is proven (1). Worldwide replacement in 5 years (2) is an ungrounded extreme statement." },
      { s: "In an educational assessment across 20 schools, students who participated in daily 45-minute physical exercise scored 15% higher on mathematics tests.", c1: "Physical exercise is positively correlated with academic performance in quantitative subjects.", c2: "Replacing all mathematics lectures with physical sports will boost mathematics scores even higher.", ans: "Only conclusion 1 follows", exp: "Correlation is established (1). Replacing all lectures with sports (2) is an absurd extrapolation." },
      { s: "Municipal smart water networks detected underground pipe burst anomalies in an average of 12 minutes, down from 72 hours under manual customer reporting.", c1: "Sensor-based telemetry drastically reduces water network anomaly detection latency.", c2: "Cities with smart water networks will never experience water scarcity during severe droughts.", ans: "Only conclusion 1 follows", exp: "Rapid leak detection is shown (1). Immunity from natural drought (2) is an invalid conclusion." },
      { s: "Enterprise customers using end-to-end data encryption experienced zero unauthorized data leakage incidents over a 3-year observation window.", c1: "Comprehensive encryption protocols serve as an effective defense against unauthorized data breaches.", c2: "Encrypted organizations do not require employee access management controls or audit logs.", ans: "Only conclusion 1 follows", exp: "Encryption effectiveness is demonstrated (1). Discarding IAM and auditing (2) is logically fallacious." },
      { s: "Replacing legacy magnetic hard drives with NVMe solid-state storage reduced server database query processing latency by 65%.", c1: "Solid-state storage architecture significantly accelerates database query execution speeds.", c2: "Database latency depends entirely on storage drive media and is unaffected by indexing or query complexity.", ans: "Only conclusion 1 follows", exp: "Hardware latency reduction is verified (1). Claiming query optimization doesn't matter (2) is false." },
      { s: "A national health survey revealed that adults who consume at least 25 grams of dietary fiber daily exhibit a 28% lower incidence of cardiovascular events.", c1: "Sufficient daily dietary fiber consumption is associated with decreased cardiovascular health risks.", c2: "Consuming 200 grams of fiber per day will guarantee immortality against cardiovascular failure.", ans: "Only conclusion 1 follows", exp: "The association holds (1). Extreme 200g dosing and guaranteed immortality (2) is unwarranted." },
      { s: "Off-peak nocturnal freight rail transport consumed 40% less energy per ton-kilometer than daytime highway trucking.", c1: "Rail transport represents a more energy-efficient modality for heavy freight haulage than road transport.", c2: "Trucking companies should scrap all cargo trucks and only operate trains between every storefront.", ans: "Only conclusion 1 follows", exp: "Efficiency superiority is shown (1). Replacing all last-mile trucking with rail (2) is physically unfeasible." },
      { s: "Introducing automated code formatting linters into repositories reduced pull request peer review time by 20%.", c1: "Standardized automated code styling eliminates manual debates over formatting during code reviews.", c2: "Linters can automatically detect and rewrite faulty business domain algorithmic logic.", ans: "Only conclusion 1 follows", exp: "Formatting debates are eliminated (1). Linters resolving complex business logic (2) is untrue." },
      { s: "Urban vertical hydroponic farms used 95% less freshwater and zero synthetic pesticides to grow leafy greens compared to traditional rural soil farms.", c1: "Vertical hydroponic farming offers significant resource conservation for specialized leafy crop cultivation.", c2: "All staple grains such as wheat and rice can immediately be transitioned entirely to vertical urban farms.", ans: "Only conclusion 1 follows", exp: "Leafy green efficiency is proven (1). Transitioning staple grains like wheat/rice (2) is unproven and economically infeasible." },
      { s: "A financial fraud prevention model with machine learning correctly flagged 94% of synthetic identity loan applications.", c1: "Machine learning pattern recognition is highly capable of detecting non-obvious fraudulent identity patterns.", c2: "Loan approval processes no longer require regulatory compliance verification by human credit officers.", ans: "Only conclusion 1 follows", exp: "Detection capability is verified (1). Eliminating statutory compliance officers (2) does not follow." },
      { s: "Deploying high-efficiency particulate air (HEPA) filters in elementary classrooms reduced viral transmission absentee rates by 42%.", c1: "Improved indoor air filtration helps diminish the spread of airborne pathogens in shared educational spaces.", c2: "Children in classrooms with HEPA filters will never catch an infectious illness outside school.", ans: "Only conclusion 1 follows", exp: "Classroom reduction is supported (1). Immunity outside school (2) is an absurd leap." },
      { s: "Companies adopting automated inventory demand forecasting reduced warehouse stockout incidents by 70%.", c1: "Predictive demand analytics significantly mitigates supply chain stock exhaustion risks.", c2: "Automated forecasting eliminates the necessity of maintaining any safety buffer inventory.", ans: "Only conclusion 1 follows", exp: "Stockout reduction is valid (1). Zero safety buffer requirement (2) is a dangerous overextension." },
      { s: "Mandatory two-factor authentication on developer code repository accounts prevented 100% of credential-stuffing account takeover attempts over 12 months.", c1: "Two-factor authentication is highly effective against unauthorized access stemming from leaked static passwords.", c2: "Developer accounts with 2FA are invulnerable to phishing attacks or social engineering compromises.", ans: "Only conclusion 1 follows", exp: "Credential-stuffing defense is confirmed (1). Total invulnerability to social engineering (2) is false." },
      { s: "Electric delivery vans deployed on urban postal routes achieved a 50% lower maintenance cost per kilometer than legacy diesel vans.", c1: "Fewer moving parts in electric powertrains lead to reduced ongoing mechanical maintenance expenses.", c2: "Electric vans can tow 40-ton transcontinental shipping containers across mountain ranges without recharging.", ans: "Only conclusion 1 follows", exp: "Maintenance cost reduction is valid (1). Heavy transcontinental towing capability (2) does not follow." },
      { s: "Students who solved at least 5 aptitude practice problems daily for 8 weeks scored 25 percentile points higher on campus placement examinations.", c1: "Consistent daily deliberate practice is positively associated with competitive exam score improvement.", c2: "Solving aptitude problems guarantees an immediate executive job offer at a multinational corporation.", ans: "Only conclusion 1 follows", exp: "Practice correlation is valid (1). Guaranteed executive job offer (2) is completely unfounded." },
      { s: "Automated continuous vulnerability patching reduced average corporate enterprise security breach dwell time from 40 days to 3 hours.", c1: "Prompt patch deployment sharply curtails the operational window available for malicious exploitation.", c2: "Enterprises that patch vulnerabilities can operate safely without firewalls or network intrusion systems.", ans: "Only conclusion 1 follows", exp: "Dwell time reduction is demonstrated (1). Eliminating firewalls and IDS (2) is reckless and illogical." },
      { s: "A clinical study demonstrated that 30 minutes of brisk daily aerobic walking reduced resting systolic blood pressure by an average of 8 mm Hg.", c1: "Regular moderate aerobic exercise contributes to clinically meaningful reductions in arterial blood pressure.", c2: "Individuals who walk for 30 minutes daily will never require hypertensive prescription medication.", ans: "Only conclusion 1 follows", exp: "Blood pressure reduction is confirmed (1). Complete elimination of medication for all individuals (2) is unsupported." },
      { s: "Air cargo tracking telemetry revealed that temperature-controlled smart containers eliminated 98% of pharmaceutical spoilage during transit.", c1: "Active thermal regulation and sensor telemetry preserve biologic pharmaceutical integrity in transit.", c2: "Pharmaceutical manufacturers no longer need to test expiration dates on temperature-controlled drugs.", ans: "Only conclusion 1 follows", exp: "In-transit preservation is verified (1). Abolishing drug expiration testing (2) is completely false." },
      { s: "Introducing microservice architecture with independent deployability reduced average production release cycle time from 3 months to 2 days.", c1: "Decoupling software systems enables engineering teams to ship updates with significantly increased frequency.", c2: "Microservices consume less total memory and network bandwidth than a well-architected monolith.", ans: "Only conclusion 1 follows", exp: "Release velocity gain is proven (1). Microservices consuming less memory/bandwidth (2) is actually false." },
      { s: "Consumer surveys indicate that 85% of online shoppers abandon their shopping carts if mandatory checkout registration requires more than 5 form fields.", c1: "Lengthy checkout registration friction is a major contributor to online shopping cart abandonment.", c2: "Removing all forms and giving away merchandise for free will maximize e-commerce profitability.", ans: "Only conclusion 1 follows", exp: "Form friction abandonment is supported (1). Free merchandise maximizing profit (2) is nonsense." },
      { s: "Renewable solar and wind generation provided 60% of the regional power grid's electricity on windy, sunny spring afternoons.", c1: "Under favorable climatic conditions, intermittent renewable energy sources can supply the majority of electrical demand.", c2: "The regional electrical grid can immediately decommission all baseload thermal and nuclear generation facilities.", ans: "Only conclusion 1 follows", exp: "Favorable condition generation is proven (1). Decommissioning all baseload facilities without storage (2) is invalid." },
    ];
    const item = conclusions[idx];
    return {
      text: `${prefix} Statement: "${item.s}"\n\nConclusions:\nI. ${item.c1}\nII. ${item.c2}`,
      correctVal: item.ans,
      distractors: ["Only conclusion 1 follows", "Only conclusion 2 follows", "Both conclusions follow", "Neither conclusion follows"].filter(o => o !== item.ans),
      explanation: item.exp,
      shortcut: `Draw deductions strictly bounded by the empirical premise: ${item.ans}.`,
      topic: "Statement Conclusion",
      category: "analytical",
      commonMistakes: ["Extrapolating extreme statements (words like 'all', 'never', 'guarantees')", "Assuming real-world biases not supported by the data"],
    };
  }

  if (normTopic.includes("cause") || normTopic.includes("effect")) {
    const causeEffects = [
      { s1: "Global crude oil import prices surged by 45% over the past quarter.", s2: "The national transport authority increased interstate freight tariffs by 20%.", ans: "Statement I is the cause and Statement II is its effect", exp: "The steep rise in raw fuel costs (Cause) directly led transport authorities to raise shipping freight tariffs (Effect)." },
      { s1: "Unprecedented torrential rainfall inundated the agricultural heartland during harvest week.", s2: "Wholesale domestic onion and tomato market prices escalated by 60% within a fortnight.", ans: "Statement I is the cause and Statement II is its effect", exp: "Crop destruction from flooding (Cause) curtailed supply, triggering wholesale price inflation (Effect)." },
      { s1: "The central government introduced substantial tax rebates for domestic semiconductor fabrication plants.", s2: "Three multinational microchip manufacturers committed $15 billion toward constructing state wafer foundries.", ans: "Statement I is the cause and Statement II is its effect", exp: "Fiscal incentives and tax rebates (Cause) motivated capital investment commitments by chipmakers (Effect)." },
      { s1: "Severe bacterial contamination was detected in the municipal central water reservoir.", s2: "Local clinics reported a 300% influx of patients with acute gastrointestinal infections.", ans: "Statement I is the cause and Statement II is its effect", exp: "Reservoir contamination (Cause) directly caused the surge in waterborne gastrointestinal illnesses (Effect)." },
      { s1: "The central bank elevated the benchmark repo rate by 150 basis points over six months.", s2: "Commercial home loan mortgage demand slowed down by 25% year-on-year.", ans: "Statement I is the cause and Statement II is its effect", exp: "Elevated borrowing interest rates (Cause) dampened consumer appetite for housing mortgages (Effect)." },
      { s1: "Major underground fiber optic cables were severed during deep sea dredging operations.", s2: "Internet banking and financial transaction clearing systems experienced widespread outages across the subcontinent.", ans: "Statement I is the cause and Statement II is its effect", exp: "Physical severance of fiber optic trunk cables (Cause) disrupted electronic financial communication networks (Effect)." },
      { s1: "The regional government declared a state of emergency and imposed strict quarantine curfews.", s2: "Urban vehicular traffic emissions plummeted to a twenty-year low.", ans: "Statement I is the cause and Statement II is its effect", exp: "Enforced curfew restrictions (Cause) immobilized private vehicles, resulting in plummeted traffic emissions (Effect)." },
      { s1: "Air pollution index (AQI) readings breached the hazardous 450 mark across the capital territory.", s2: "All primary and secondary schools were ordered to shift to online remote classes for one week.", ans: "Statement I is the cause and Statement II is its effect", exp: "Hazardous toxic air pollution (Cause) compelled authorities to close physical classrooms as a health precaution (Effect)." },
      { s1: "International shipping container freight tariffs plunged by 75% following the opening of new maritime canals.", s2: "Export volumes of manufactured textiles and industrial components expanded significantly.", ans: "Statement I is the cause and Statement II is its effect", exp: "Drastically cheaper shipping costs (Cause) bolstered the international competitiveness and volume of exports (Effect)." },
      { s1: "Prolonged multi-year drought depleted regional reservoir storage levels below 15% capacity.", s2: "Municipal water supply was rationed to alternate days for residential apartment complexes.", ans: "Statement I is the cause and Statement II is its effect", exp: "Severe reservoir depletion (Cause) necessitated strict municipal rationing of potable water (Effect)." },
      { s1: "A leading automobile manufacturer issued an immediate recall for 100,000 electric vehicles.", s2: "Quality control investigations revealed an internal short-circuit defect in battery management module firmware.", ans: "Statement II is the cause and Statement I is its effect", exp: "Discovery of the battery management firmware defect (Cause) triggered the corporate vehicle recall (Effect)." },
      { s1: "Employee voluntary turnover in the engineering division decreased from 28% to 6%.", s2: "The company transitioned to a flexible asynchronous 4-day work week with competitive salary indexing.", ans: "Statement II is the cause and Statement I is its effect", exp: "The shift to a 4-day work week with fair compensation (Cause) drove the steep reduction in employee turnover (Effect)." },
      { s1: "Crop yields per hectare of wheat increased by 35% across the northern river valley.", s2: "State agricultural agencies distributed climate-resilient hybrid seeds and subsidized solar drip irrigation.", ans: "Statement II is the cause and Statement I is its effect", exp: "Distribution of hybrid seeds and precision irrigation (Cause) produced the higher wheat yield per hectare (Effect)." },
      { s1: "Consumer adoption of digital UPI peer-to-peer microtransactions grew by 180% in rural districts.", s2: "Telecom providers installed 50,000 low-cost 4G cellular base towers and subsidized entry-level smartphones.", ans: "Statement II is the cause and Statement I is its effect", exp: "Telecom infrastructure expansion and affordable smartphones (Cause) enabled the surge in digital microtransactions (Effect)." },
      { s1: "The municipal public bus corporation recorded its highest operating profitability in twenty years.", s2: "The corporation converted its entire diesel fleet to subsidized compressed natural gas and automated ticketing.", ans: "Statement II is the cause and Statement I is its effect", exp: "Lower fuel costs and automated fare collection (Cause) generated record transit profitability (Effect)." },
      { s1: "Major airlines canceled over 500 domestic scheduled flights across the northern hub airport.", s2: "Dense radioactive advection fog reduced runway visual range below 50 meters for 18 consecutive hours.", ans: "Statement II is the cause and Statement I is its effect", exp: "Zero runway visibility due to dense fog (Cause) forced airlines to cancel flights (Effect)." },
      { s1: "The price of commercial solar photovoltaic panels declined by 40% over eighteen months.", s2: "Global polysilicon refining capacity doubled as massive new industrial manufacturing plants came online.", ans: "Statement II is the cause and Statement I is its effect", exp: "Doubling of polysilicon raw material supply (Cause) led to the market price decline of finished solar panels (Effect)." },
      { s1: "Incidence of malaria and dengue fever plunged by 70% in the coastal municipal district.", s2: "The civic sanitation department conducted intensive biological larvicide spraying across all stagnant water drains.", ans: "Statement II is the cause and Statement I is its effect", exp: "Targeted larvicide eradication of mosquito breeding habitats (Cause) caused the drop in vector-borne diseases (Effect)." },
      { s1: "Consumer retail inflation jumped to an eight-year high of 7.8%.", s2: "Global supply chain disruptions and geopolitical conflicts caused international crude oil and wheat shortages.", ans: "Statement II is the cause and Statement I is its effect", exp: "Global shortages in oil and wheat (Cause) translated into broad domestic consumer inflation (Effect)." },
      { s1: "The commercial bank suffered a sudden liquidity deficit and was placed under regulatory supervision.", s2: "Over 40% of the bank's total loan portfolio defaulted due to reckless unhedged real estate speculative lending.", ans: "Statement II is the cause and Statement I is its effect", exp: "Massive bad debt defaults from speculative lending (Cause) drained the bank's liquidity and provoked regulatory intervention (Effect)." },
      { s1: "The state forestry agency deployed autonomous sensor drones to monitor national reserves.", s2: "The city council inaugurated a state-of-the-art municipal modern art museum.", ans: "Both statements are effects of independent causes", exp: "Forest drone monitoring and municipal art museum inauguration are completely unrelated civic initiatives." },
      { s1: "Domestic automobile manufacturers increased sport-utility vehicle prices by 5%.", s2: "High school graduation board examination results improved by 4% across the southern state.", ans: "Both statements are effects of independent causes", exp: "Automobile pricing decisions and high school academic exam scores share no causal or common linkage." },
      { s1: "Commercial retail mall footfall declined by 25% on Saturday.", s2: "Heavy snowfall grounded suburban commuter rail lines across the metropolitan region.", ans: "Statement II is the cause and Statement I is its effect", exp: "Severe snowfall disrupting commuter transit (Cause) kept shoppers at home, depressing mall footfall (Effect)." },
      { s1: "The central government raised the mandatory minimum wage for industrial factory workers.", s2: "Several export-oriented garment manufacturers automated assembly lines with robotic sewing stations.", ans: "Statement I is the cause and Statement II is its effect", exp: "Statutory labor cost increases (Cause) motivated manufacturers to substitute labor with automated robotics (Effect)." },
      { s1: "University enrollment in undergraduate artificial intelligence degree programs tripled.", s2: "Multinational technology corporations announced aggressive multi-billion-dollar generative AI talent hiring programs.", ans: "Statement II is the cause and Statement I is its effect", exp: "Surge in industry job opportunities and hiring budgets (Cause) drove student enrollment into AI degrees (Effect)." },
      { s1: "A major submarine earthquake registering 8.2 on the Richter scale occurred 100 km off the archipelago.", s2: "Coastal disaster authorities sounded tsunami sirens and evacuated all low-lying fishing villages.", ans: "Statement I is the cause and Statement II is its effect", exp: "Undersea mega-earthquake (Cause) prompted emergency tsunami evacuation protocols (Effect)." },
      { s1: "The national health ministry subsidized influenza vaccines across all neighborhood primary care dispensaries.", s2: "Winter hospital emergency admissions for acute respiratory viral illnesses dropped by 50%.", ans: "Statement I is the cause and Statement II is its effect", exp: "Widespread subsidized vaccination (Cause) curbed respiratory viral transmission and hospitalizations (Effect)." },
      { s1: "Commercial banks elevated customer savings account interest deposit rates from 3% to 6.5%.", s2: "Retail household bank deposit inflows expanded by ₹2.5 trillion in the third fiscal quarter.", ans: "Statement I is the cause and Statement II is its effect", exp: "Higher interest returns on deposits (Cause) incentivized households to deposit more savings into banks (Effect)." },
      { s1: "The city transport authority unified metro, bus, and suburban rail ticketing onto a single contactless smartcard.", s2: "Daily intermodal public transit ridership climbed by 300,000 passenger journeys.", ans: "Statement I is the cause and Statement II is its effect", exp: "Seamless integrated ticketing (Cause) reduced friction and stimulated intermodal transit ridership (Effect)." },
      { s1: "A devastating locust swarm invaded agricultural farmlands across three border provinces.", s2: "The agriculture ministry deployed helicopters to conduct aerial pesticide spraying over 200,000 hectares.", ans: "Statement I is the cause and Statement II is its effect", exp: "Locust invasion destroying crops (Cause) necessitated aerial emergency pesticide countermeasures (Effect)." },
    ];
    const item = causeEffects[idx];
    return {
      text: `${prefix} Statements:\nI. ${item.s1}\nII. ${item.s2}`,
      correctVal: item.ans,
      distractors: [
        "Statement I is the cause and Statement II is its effect",
        "Statement II is the cause and Statement I is its effect",
        "Both statements are independent causes",
        "Both statements are effects of independent causes",
      ].filter(o => o !== item.ans),
      explanation: item.exp,
      shortcut: `Determine which event preceded and logically provoked the other: ${item.ans}.`,
      topic: "Cause and Effect",
      category: "analytical",
      commonMistakes: ["Confusing chronological order with reverse causality", "Assuming correlation equals causation without direct mechanism"],
    };
  }

  // Course of Action / Critical Reasoning / Strengthen / Weaken
  const actions = [
    {
      stmt: "A sophisticated ransomware attack encrypted the clinical patient records database of a tertiary care hospital, disrupting scheduled surgeries.",
      c1: "The hospital should immediately isolate affected network subnets, notify cybersecurity authorities, and restore medical systems from verified offline immutable backups.",
      c2: "The hospital management should pay the extortion demand in cryptocurrency without verifying backup status.",
      ans: "Only Course of Action I should be pursued",
      exp: "Network isolation and offline backup restoration (I) is the approved protocol. Paying extortion (II) is unlawful, does not guarantee decryption, and invites further attacks."
    },
    {
      stmt: "Severe seasonal smog and air pollution in the metropolitan region has breached hazardous PM2.5 levels for five consecutive days.",
      c1: "The municipal administration should halt non-essential construction, ban older diesel freight trucks from city limits, and deploy water misting cannons on major roads.",
      c2: "The administration should permanently ban all industrial manufacturing and shut down all power generation across the entire state indefinitely.",
      ans: "Only Course of Action I should be pursued",
      exp: "Targeted temporary pollution control (I) is proportionate. Permanently shutting down all industry and power indefinitely (II) is disproportionate and catastrophic."
    },
    {
      stmt: "Auditors discovered unauthorized financial ledger entries amounting to ₹25 Crore diverted to an offshore shell entity from a public sector enterprise.",
      c1: "The company should immediately suspend the authorizing finance executives pending an independent forensic investigation by statutory anti-corruption agencies.",
      c2: "The company should write off the ₹25 Crore as normal operational business expenditure without further inquiry.",
      ans: "Only Course of Action I should be pursued",
      exp: "Executive suspension and forensic probe (I) is legally mandated governance. Concealing fraud as operational expense (II) constitutes criminal malfeasance."
    },
    {
      stmt: "Routine quality assurance checks revealed that a batch of 50,000 packaged infant milk formula containers contains elevated trace lead impurities.",
      c1: "The manufacturing company should initiate an immediate public recall of the entire batch, notify food safety regulators, and establish a consumer helpline.",
      c2: "The company should quietly distribute the batch to rural tier-3 markets where testing laboratories are scarce.",
      ans: "Only Course of Action I should be pursued",
      exp: "Immediate product recall (I) protects infant health and complies with food safety statutes. Selling toxic milk to rural markets (II) is criminal and unconscionable."
    },
    {
      stmt: "An internal employee survey revealed that 65% of mid-level managers report severe burnout stemming from mandatory 70-hour workweeks.",
      c1: "Executive leadership should audit project resource allocation, enforce standard working hours, and hire supplemental staff to redistribute workloads.",
      c2: "Human resources should terminate the employment of all survey respondents who expressed dissatisfaction.",
      ans: "Only Course of Action I should be pursued",
      exp: "Workload redistribution and hiring (I) addresses systemic burnout. Retaliatory firing (II) violates labor ethics and exacerbates operational collapse."
    },
    {
      stmt: "Heavy monsoon floods caused extensive railway track ballast washouts, suspending passenger rail transit between two commercial capitals.",
      c1: "The railway engineering division should deploy emergency track restoration crews with stone ballast, while operating special bus shuttles for stranded passengers.",
      c2: "The railway ministry should permanently dismantle the railway track and abandon rail transport between the two cities.",
      ans: "Only Course of Action I should be pursued",
      exp: "Track restoration with passenger bus bridging (I) is practical and responsive. Permanently abandoning trunk rail lines (II) is completely irrational."
    },
    {
      stmt: "A critical zero-day remote code execution vulnerability was identified in an open-source cryptographic library used in millions of web applications.",
      c1: "Development teams worldwide should patch and redeploy their applications using the newly released remediated library version.",
      c2: "Software engineers should abandon software security practices and stop maintaining cryptographic encryption.",
      ans: "Only Course of Action I should be pursued",
      exp: "Deploying the security patch (I) eliminates the exploit. Abandoning cryptography (II) is absurd."
    },
    {
      stmt: "A coastal fishing community reported unprecedented fish mortality and an oil sheen drifting from an offshore drilling platform.",
      c1: "Maritime environmental agencies should deploy floating oil containment booms, dispatch inspection vessels to platform valves, and test marine toxicity.",
      c2: "Local authorities should encourage fishermen to continue harvesting the oil-contaminated fish for commercial food distribution.",
      ans: "Only Course of Action I should be pursued",
      exp: "Containment and platform inspection (I) mitigates environmental disaster. Distributing contaminated fish (II) endangers public health."
    },
    {
      stmt: "A university campus experienced a surge in unauthorized student attendance spoofing using duplicate NFC identity cards.",
      c1: "The university should introduce biometric verification or dynamic cryptographically signed QR codes for lecture hall check-ins.",
      c2: "The university should abolish all lectures and degree programs to prevent attendance fraud.",
      ans: "Only Course of Action I should be pursued",
      exp: "Cryptographic or biometric check-ins (I) resolves attendance integrity. Abolishing university degrees (II) is an extreme, nonsensical reaction."
    },
    {
      stmt: "A sudden viral outbreak in livestock farms resulted in significant poultry mortality across two rural districts.",
      c1: "Veterinary health authorities should establish quarantine containment cordons, sanitize farms, and compensate affected farmers for culled poultry.",
      c2: "Farm owners should conceal the outbreak and transport infected poultry to neighboring districts to sell quickly.",
      ans: "Only Course of Action I should be pursued",
      exp: "Veterinary quarantine and compensation (I) halts disease transmission. Transporting infected birds (II) causes catastrophic epidemic spread."
    },
    {
      stmt: "A banking mobile application crashed for 12 consecutive hours on salary day due to unanticipated database lock contention.",
      c1: "The engineering team should scale read replicas, optimize transaction isolation levels, and provide status transparency to customers.",
      c2: "The bank should deactivate mobile banking permanently and mandate all customers conduct transactions via physical paper tokens.",
      ans: "Only Course of Action I should be pursued",
      exp: "Technical database scaling and transparency (I) solves throughput. Reverting to 19th-century paper slips (II) is regressive and unacceptable."
    },
    {
      stmt: "An e-commerce marketplace discovered that third-party merchant accounts were listing counterfeit prescription pharmaceuticals.",
      c1: "The platform should immediately delist the rogue sellers, freeze their disbursement balances, and file criminal fraud complaints with drug law enforcement.",
      c2: "The platform should take a higher commission fee from counterfeit medicine sales to increase platform revenues.",
      ans: "Only Course of Action I should be pursued",
      exp: "Delisting rogue sellers and legal referral (I) upholds law and patient safety. Profiting from fake medicine (II) is illegal and immoral."
    },
    {
      stmt: "A manufacturing plant boiler exhibited pressure oscillations exceeding safety tolerance thresholds by 25%.",
      c1: "Plant supervisors should activate automated pressure relief bypass valves, shut down burner fuel feed, and evacuate the immediate boiler room zone.",
      c2: "Supervisors should disable pressure alarms with tape so workers do not get distracted by the noise.",
      ans: "Only Course of Action I should be pursued",
      exp: "Emergency pressure relief and evacuation (I) prevents boiler explosion. Muffling alarms (II) is criminally negligent."
    },
    {
      stmt: "Severe urban flash floods overwhelmed municipal storm drainage systems, stranding thousands of motorists on the ring road.",
      c1: "The disaster response agency should deploy high-clearance rescue vehicles, open emergency highway drainage gates, and set up temporary shelter stations.",
      c2: "Municipal authorities should advise stranded drivers to stay in submerged cars and wait until next week for water to evaporate.",
      ans: "Only Course of Action I should be pursued",
      exp: "Active rescue and drainage intervention (I) saves lives. Telling people to drown in submerged vehicles (II) is lethal negligence."
    },
    {
      stmt: "A clinical trial data integrity board discovered that a lead researcher fabricated efficacy data for an investigational cancer drug.",
      c1: "The research institution should retract the published paper, suspend the researcher, and initiate a comprehensive audit of all trial data points.",
      c2: "The institution should promote the researcher to dean and market the drug to hospitals without further verification.",
      ans: "Only Course of Action I should be pursued",
      exp: "Retraction and data audit (I) upholds scientific and clinical integrity. Promoting fraud (II) endangers cancer patients."
    },
    {
      stmt: "A municipality experienced severe structural cracking across an elevated highway flyover following an earthquake.",
      c1: "Civil engineers should immediately close the flyover to traffic, install temporary shoring supports, and conduct ultrasonic structural load tests.",
      c2: "Authorities should double the allowed vehicle speed limit on the cracked bridge so vehicles pass over it faster.",
      ans: "Only Course of Action I should be pursued",
      exp: "Closing the bridge and testing structural integrity (I) prevents structural collapse. Speeding traffic over it (II) accelerates fatal collapse."
    },
    {
      stmt: "An airline flight control software update introduced an anomalous sensor data disagreement warning during autopilot cruising.",
      c1: "Airlines should ground the affected aircraft fleet, revert to the certified stable flight control build, and conduct simulator test verification.",
      c2: "Pilots should be instructed to ignore all flight control warning lights during commercial passenger flights.",
      ans: "Only Course of Action I should be pursued",
      exp: "Fleet grounding and software reversion (I) ensures aviation safety. Ignoring warning lights (II) is catastrophically dangerous."
    },
    {
      stmt: "A chemical manufacturing factory suffered a storage cylinder rupture, venting toxic chlorine gas toward adjacent residential neighborhoods.",
      c1: "Emergency services should sound local sirens, evacuate residents upwind of the plume, deploy water neutralization curtains, and seal the ruptured valve.",
      c2: "Factory management should deny any leak is occurring and tell residents the smell is harmless morning mist.",
      ans: "Only Course of Action I should be pursued",
      exp: "Emergency evacuation and chemical neutralization (I) protects civilian lives. Lying about lethal gas (II) results in mass casualties."
    },
    {
      stmt: "Several schools reported an alarming increase in teenage cyberbullying occurring on a proprietary youth social media platform.",
      c1: "The platform should implement robust automated harassment keyword moderation, simplified reporting buttons, and parental safety controls.",
      c2: "The platform should reward cyberbullies with algorithmic engagement boosts and verified profile badges.",
      ans: "Only Course of Action I should be pursued",
      exp: "Automated moderation and reporting (I) creates safe spaces. Rewarding harassment (II) is socially destructive and unethical."
    },
    {
      stmt: "A major retail banking portal suffered repeated credential-stuffing automated bot attacks against customer login endpoints.",
      c1: "The security operations team should deploy Web Application Firewall bot mitigation rules, enforce CAPTCHA on suspicious IPs, and mandate MFA.",
      c2: "The bank should remove customer password requirements entirely so bots don't have to work as hard.",
      ans: "Only Course of Action I should be pursued",
      exp: "WAF bot mitigation and MFA enforcement (I) stops credential stuffing. Removing passwords (II) completely destroys account security."
    },
    {
      stmt: "An extensive municipal survey revealed that 40% of public school students suffer from severe nutritional iron-deficiency anemia.",
      c1: "The state education department should introduce iron-fortified midday meals and conduct bi-weekly clinical health checkups.",
      c2: "The department should expel all anemic students from public schools to improve school health statistics.",
      ans: "Only Course of Action I should be pursued",
      exp: "Nutritional supplementation and health checkups (I) directly remedies anemia. Expelling sick children (II) is cruel and unconstitutional."
    },
    {
      stmt: "A nuclear power generating facility detected a minor cooling water pump seal leak within the secondary non-radioactive turbine circuit.",
      c1: "Reactor operators should reduce turbine load, isolate the redundant auxiliary pump, and replace the mechanical seal under standard operating procedure.",
      c2: "Operators should disable the cooling water system completely and let the turbine run dry at full power.",
      ans: "Only Course of Action I should be pursued",
      exp: "Secondary circuit pump maintenance (I) is safe and controlled. Running turbines dry (II) causes catastrophic mechanical destruction."
    },
    {
      stmt: "A regional dairy cooperative discovered that raw milk collected from a collection center tested positive for antibiotic drug residue.",
      c1: "The cooperative should reject the contaminated milk batch, trace the supplying farm to halt milk collection, and inspect veterinary antibiotic withdrawal adherence.",
      c2: "The cooperative should dilute the contaminated milk into infant formula to disperse the antibiotic traces.",
      ans: "Only Course of Action I should be pursued",
      exp: "Rejecting the batch and auditing farm antibiotic protocols (I) protects public health. Diluting medicine into infant formula (II) is criminal."
    },
    {
      stmt: "A construction developer detected soil liquefaction and significant foundation subsidence beneath an under-construction 40-story residential tower.",
      c1: "Structural engineers should halt construction, install deep grouted micro-piles to bedrock, and re-certify foundation safety before resuming.",
      c2: "The developer should add 10 more stories to the building to push the foundation down into the ground faster.",
      ans: "Only Course of Action I should be pursued",
      exp: "Halting construction and underpinning foundation piles (I) prevents tower collapse. Adding weight to an unstable foundation (II) triggers disaster."
    },
    {
      stmt: "An industrial harbor experienced a crude oil pipeline rupture during tanker unloading, spilling 500 barrels into a sensitive marine sanctuary.",
      c1: "The port authority should deploy floating oil containment booms, skimming vessels, and chemical dispersants while isolating the pipeline valve.",
      c2: "Port authorities should set the floating oil on fire to illuminate the harbor for night fishing.",
      ans: "Only Course of Action I should be pursued",
      exp: "Oil containment and skimming (I) mitigates ecological disaster. Igniting harbor oil fires (II) creates toxic infernos and destroys ships."
    },
    {
      stmt: "A metropolitan hospital reported that emergency room triage nurses were experiencing verbal and physical assaults by intoxicated visitors.",
      c1: "Hospital administration should deploy security officers at triage entrances, install panic buttons, and enforce strict zero-tolerance patient advocate policies.",
      c2: "The hospital should require emergency room doctors and nurses to work without pay as a penalty for being assaulted.",
      ans: "Only Course of Action I should be pursued",
      exp: "Security personnel and zero-tolerance safety measures (I) protects clinical staff. Penalizing assaulted nurses (II) is unlawful and abusive."
    },
    {
      stmt: "A state highway witnessed multiple head-on vehicular collisions along an unlit undivided mountain curve during night hours.",
      c1: "The highway transport agency should install illuminated retro-reflective cat-eye lane markers, high-intensity LED streetlights, and a central concrete barrier.",
      c2: "The transport agency should remove all warning signs and encourage motorists to drive without headlights.",
      ans: "Only Course of Action I should be pursued",
      exp: "Illumination and physical central barriers (I) prevents head-on crashes. Removing signs and headlights (II) ensures lethal crashes."
    },
    {
      stmt: "An electronic voting machine pilot test revealed an unexpected clock skew causing transaction timestamp misalignment during audit logs.",
      c1: "The election commission should patch the cryptographic NTP synchronization firmware, verify audit hash chains, and conduct public mock poll re-certifications.",
      c2: "The commission should destroy all election audit logs and forbid independent oversight.",
      ans: "Only Course of Action I should be pursued",
      exp: "Cryptographic clock synchronization and transparent audit re-certification (I) upholds democracy. Destroying audit logs (II) subverts election integrity."
    },
    {
      stmt: "A university laboratory refrigerator containing biological viral research specimens suffered an electrical compressor failure over the weekend.",
      c1: "Laboratory safety officers should transfer specimens to backup cryogenic liquid nitrogen freezers and activate emergency diesel backup power.",
      c2: "Staff should leave the refrigerator door wide open and let the specimens melt onto the corridor floor.",
      ans: "Only Course of Action I should be pursued",
      exp: "Transferring specimens to backup cryogenic containment (I) ensures biosafety. Allowing melting into corridors (II) causes biohazard contamination."
    },
    {
      stmt: "A software fintech startup suffered a catastrophic bug that credited users' account balances with 10x the deposited amount during payment gateway timeouts.",
      c1: "The engineering team should temporarily pause automated withdrawals, roll back faulty transactional ledger entries, and audit database consistency.",
      c2: "The startup should encourage users to withdraw the phantom money immediately before investors notice.",
      ans: "Only Course of Action I should be pursued",
      exp: "Pausing withdrawals and reconciling faulty transactional ledgers (I) preserves financial solvency. Facilitating phantom withdrawals (II) causes bankruptcy and fraud."
    },
  ];
  const item = actions[idx];
  return {
    text: `${prefix} Statement: "${item.stmt}"\n\nCourses of Action:\nI. ${item.c1}\nII. ${item.c2}`,
    correctVal: item.ans,
    distractors: [
      "Only Course of Action I should be pursued",
      "Only Course of Action II should be pursued",
      "Both courses of action should be pursued",
      "Neither course of action should be pursued",
    ].filter(o => o !== item.ans),
    explanation: item.exp,
    shortcut: `Select the proportionate, ethical, and legally sound resolution: ${item.ans}.`,
    topic: "Course of Action",
    category: "analytical",
    commonMistakes: ["Choosing extreme or disproportionate reactions", "Failing to evaluate legal/ethical constraints"],
  };
}

// ============================================================================
// 6. QUANTITATIVE TOPIC DISPATCHER
// ============================================================================

export function generateQuantTopicQuestion(
  topic: string,
  qIndex: number,
  testNum: number,
  seed: number,
  prefix: string
): QuestionRawData {
  const norm = topic.toLowerCase();
  const qSeed = seed + qIndex * 79 + testNum * 37;

  if (norm.includes("profit") || norm.includes("loss")) {
    return generateProfitLossQuestion(qIndex, testNum, qSeed, prefix);
  }
  if (norm.includes("time") && norm.includes("work")) {
    return generateTimeWorkQuestion(qIndex, testNum, qSeed, prefix);
  }
  if (norm.includes("speed") || norm.includes("distance")) {
    return generateSpeedDistanceQuestion(qIndex, testNum, qSeed, prefix);
  }
  if (norm.includes("interest")) {
    return generateInterestQuestion(qIndex, testNum, qSeed, prefix);
  }
  if (norm.includes("ratio") || norm.includes("proportion")) {
    return generateRatioQuestion(qIndex, testNum, qSeed, prefix);
  }
  if (norm.includes("probab")) {
    return generateProbabilityQuestion(qIndex, testNum, qSeed, prefix);
  }
  if (norm.includes("permut") || norm.includes("combin")) {
    return generatePermutationQuestion(qIndex, testNum, qSeed, prefix);
  }
  if (norm.includes("average")) {
    return generateAverageQuestion(qIndex, testNum, qSeed, prefix);
  }
  if (norm.includes("mixture") || norm.includes("allig")) {
    return generateMixtureQuestion(qIndex, testNum, qSeed, prefix);
  }
  return generatePercentagesQuestion(qIndex, testNum, qSeed, prefix);
}
