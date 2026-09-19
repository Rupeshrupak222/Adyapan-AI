import type { AptitudeCategory, Difficulty, GeneratedQuestion } from "./aptitude-engine.service";
import {
  generateNumberSystemsTopicQuestion,
  generateLogicalTopicQuestion,
  generateVerbalTopicQuestion,
  generateDITopicQuestion,
  generateAnalyticalTopicQuestion,
  generateQuantTopicQuestion,
} from "./aptitude-topic-generators";


export function getSeedHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Picks an archetype index for question i of test `testNum` across a pool of
 * `poolSize` archetypes. The stride is coprime with the pool size so every
 * archetype appears within one test, while the per-test offset rotates the mix
 * so adjacent tests do not start on the same pattern.
 */
export function archIndex(i: number, testNum: number, poolSize: number, bias: number = 0): number {
  const stride = poolSize === 5 ? 3 : poolSize === 4 ? 3 : poolSize === 6 ? 5 : poolSize === 10 ? 3 : 7;
  return (i * stride + bias + (testNum - 1) * 7) % poolSize;
}

export function shuffleWithOptions(correctVal: string, distractors: string[], targetIdx: number): string[] {
  const cleanCorrect = String(correctVal).trim();
  const seen = new Set<string>([cleanCorrect]);
  const uniqueDistractors: string[] = [];

  for (const d of distractors) {
    const cleanD = String(d).trim();
    if (cleanD && !seen.has(cleanD)) {
      seen.add(cleanD);
      uniqueDistractors.push(cleanD);
    }
  }

  let fallbackCounter = 1;
  while (uniqueDistractors.length < 3) {
    let candidate = "";
    if (cleanCorrect.includes(":")) {
      const parts = cleanCorrect.split(":").map(p => parseInt(p.trim(), 10) || 1);
      candidate = `${parts[0] + fallbackCounter} : ${parts[1] || 1}`;
      if (seen.has(candidate)) {
        candidate = `${parts[0]} : ${(parts[1] || 1) + fallbackCounter}`;
      }
    } else {
      const num = parseFloat(cleanCorrect.replace(/[^0-9.-]/g, ""));
      if (!isNaN(num) && num !== 0) {
        const offset = fallbackCounter * (Math.abs(num) > 10 ? 5 : 1);
        candidate = cleanCorrect.replace(String(num), String(num + offset));
      }
    }
    if (!candidate || seen.has(candidate)) {
      candidate = `Alternative ${fallbackCounter}`;
    }
    if (!seen.has(candidate)) {
      seen.add(candidate);
      uniqueDistractors.push(candidate);
    }
    fallbackCounter++;
  }

  const opts: string[] = [];
  let dIdx = 0;
  for (let k = 0; k < 4; k++) {
    if (k === targetIdx) {
      opts.push(cleanCorrect);
    } else {
      opts.push(uniqueDistractors[dIdx++]);
    }
  }
  return opts;
}

export interface QuestionRawData {
  text: string;
  correctVal: string;
  distractors: string[];
  explanation: string;
  shortcut: string;
  topic: string;
  category: AptitudeCategory;
  commonMistakes: string[];
  difficulty?: Difficulty;
}

// ============================================================================
// QUANTITATIVE ARCHETYPES
// ============================================================================

export function generatePercentagesQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 73 + testNum * 31;

  if (archetype === 0) {
    // Successive % change
    const p1 = 10 + ((qSeed * 7) % 20); // 10..29%
    const p2 = 5 + ((qSeed * 3) % 15);  // 5..19%
    const net = Number((p1 - p2 - (p1 * p2) / 100).toFixed(2));
    const isIncrease = net >= 0;
    const correctVal = `${Math.abs(net)}% ${isIncrease ? "increase" : "decrease"}`;
    const distractors = [
      `${p1 - p2}% ${isIncrease ? "increase" : "decrease"}`,
      `${(Math.abs(net) + 2.5).toFixed(2)}% ${isIncrease ? "decrease" : "increase"}`,
      `${(p1 + p2)}% increase`
    ];
    return {
      text: `${prefix} The price of a software license is first increased by ${p1}% and subsequently discounted by ${p2}%. What is the net percentage change in the price?`,
      correctVal,
      distractors,
      explanation: `Net % change = x + y + (xy / 100) = ${p1} - ${p2} - (${p1} × ${p2} / 100) = ${net}%. Positive sign denotes an increase.`,
      shortcut: `Use formula: a + b + (ab/100). Here ${p1} - ${p2} - ${(p1 * p2 / 100).toFixed(2)} = ${net}%.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Simply subtracting p1 - p2 without the product term", "Inverting increase and decrease signs"]
    };
  } else if (archetype === 1) {
    // Expenditure constant
    const p = 15 + ((qSeed * 5) % 35); // 15, 20, 25, 30...
    const red = Number(((p / (100 + p)) * 100).toFixed(1));
    return {
      text: `${prefix} If the market price of cloud server instances increases by ${p}%, by what percentage should an engineering team reduce consumption so their total monthly budget remains unchanged?`,
      correctVal: `${red}%`,
      distractors: [`${p}%`, `${(red - 3.2).toFixed(1)}%`, `${(red + 4.5).toFixed(1)}%`],
      explanation: `Reduction % = [r / (100 + r)] × 100 = [${p} / ${100 + p}] × 100 = ${red}%.`,
      shortcut: `Formula: [r / (100 + r)] × 100.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Assuming consumption reduces by the same percentage as the price rise", "Using (100 - r) in the denominator"]
    };
  } else if (archetype === 2) {
    // Examination pass/fail
    const passPct = [35, 40, 45, 50][qSeed % 4];
    const diffGap = 5 + (qSeed % 5);
    const scorePct = passPct - diffGap;
    const failBy = diffGap * (3 + ((qSeed * 3) % 10));
    const maxMarks = Math.round((failBy / (passPct - scorePct)) * 100);
    const passMarks = Math.round(maxMarks * (passPct / 100));
    return {
      text: `${prefix} A candidate appeared for a placement screening exam, scored ${scorePct}% marks, and failed by ${failBy} marks. If the passing threshold is ${passPct}%, what is the maximum total marks of the exam?`,
      correctVal: `${maxMarks}`,
      distractors: [`${maxMarks + 50}`, `${maxMarks - 40}`, `${passMarks}`],
      explanation: `Difference between passing % and candidate's % = ${passPct}% - ${scorePct}% = ${passPct - scorePct}%. Since ${passPct - scorePct}% of maximum marks = ${failBy}, Maximum Marks = (${failBy} / ${passPct - scorePct}) × 100 = ${maxMarks}.`,
      shortcut: `Max marks = (Mark difference / % difference) × 100 = (${failBy} / ${diffGap}) × 100 = ${maxMarks}.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Finding passing marks instead of maximum marks", "Dividing by score percentage instead of the gap"]
    };
  } else if (archetype === 3) {
    // Election vote share
    const winPct = 54 + ((qSeed * 3) % 15); // 54..68%
    const losePct = 100 - winPct;
    const diffPct = winPct - losePct;
    const margin = diffPct * (100 + ((qSeed * 17) % 400));
    const totalVotes = Math.round((margin / diffPct) * 100);
    return {
      text: `${prefix} In a two-candidate election, the winning candidate secured ${winPct}% of the valid votes and won by a margin of ${margin.toLocaleString()} votes. What was the total number of valid votes polled?`,
      correctVal: `${totalVotes.toLocaleString()}`,
      distractors: [`${(totalVotes + 4500).toLocaleString()}`, `${(totalVotes - 3200).toLocaleString()}`, `${Math.round(totalVotes * 0.8).toLocaleString()}`],
      explanation: `Winner = ${winPct}%, Loser = ${losePct}%. Margin % = ${winPct}% - ${losePct}% = ${diffPct}%. Total Votes = (${margin} / ${diffPct}) × 100 = ${totalVotes.toLocaleString()}.`,
      shortcut: `Total = Margin / (2 × Win% - 100) × 100.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Calculating margin against total votes rather than loser votes", "Arithmetic errors in percentage subtraction"]
    };
  } else if (archetype === 4) {
    // Salary comparison
    const xVals = [10, 15, 20, 25, 30, 40, 50, 60];
    const x = xVals[qSeed % xVals.length];
    const roles = [
      ["Engineer A", "Engineer B"],
      ["Software Developer", "QA Engineer"],
      ["Product Manager", "Scrum Master"],
      ["Senior Consultant", "Associate Analyst"],
      ["Architect A", "Architect B"]
    ][qSeed % 5];
    const lessPct = Number(((x / (100 + x)) * 100).toFixed(1));
    return {
      text: `${prefix} If ${roles[0]}'s base CTC is ${x}% higher than ${roles[1]}'s base CTC, by what percentage is ${roles[1]}'s CTC less than ${roles[0]}'s?`,
      correctVal: `${lessPct}%`,
      distractors: [`${x}%`, `${(lessPct + 5).toFixed(1)}%`, `${(lessPct - 3).toFixed(1)}%`],
      explanation: `Let ${roles[1]} = 100, then ${roles[0]} = ${100 + x}. Difference = ${x}. Required % = (${x} / ${100 + x}) × 100 = ${lessPct}%.`,
      shortcut: `[x / (100 + x)] × 100 = [${x} / ${100 + x}] × 100 = ${lessPct}%.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Assuming B is x% less than A", "Dividing by B's base instead of A's base"]
    };
  } else if (archetype === 5) {
    // Population compounding
    const pop = 40000 + ((qSeed * 17) % 50000);
    const rVals = [5, 10, 15, 20];
    const r = rVals[qSeed % rVals.length];
    const after2Yr = Math.round(pop * Math.pow(1 + r / 100, 2));
    return {
      text: `${prefix} The active user base of a mobile platform is currently ${pop.toLocaleString()}. If it expands at a consistent compound rate of ${r}% per annum, what will the user base be after 2 years?`,
      correctVal: `${after2Yr.toLocaleString()}`,
      distractors: [`${Math.round(pop * (1 + (2 * r) / 100)).toLocaleString()}`, `${(after2Yr + 2500).toLocaleString()}`, `${(after2Yr - 1800).toLocaleString()}`],
      explanation: `P_final = P × (1 + r/100)^2 = ${pop} × (1 + ${r}/100)^2 = ${after2Yr.toLocaleString()}.`,
      shortcut: `Compound for 2 years: (1 + r/100)^2 factor.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Using simple interest instead of compound interest", "Squaring rate incorrectly"]
    };
  } else if (archetype === 6) {
    // Percentage error
    const fracPairs = [
      { n1: 3, d1: 5, n2: 5, d2: 3 },
      { n1: 4, d1: 5, n2: 5, d2: 4 },
      { n1: 2, d1: 3, n2: 3, d2: 2 },
      { n1: 3, d1: 4, n2: 4, d2: 3 },
      { n1: 5, d1: 6, n2: 6, d2: 5 },
      { n1: 5, d1: 8, n2: 8, d2: 5 },
      { n1: 7, d1: 8, n2: 8, d2: 7 },
      { n1: 1, d1: 2, n2: 2, d2: 1 }
    ];
    const fp = fracPairs[qSeed % fracPairs.length];
    const errPct = Number((((fp.n2 / fp.d2 - fp.n1 / fp.d1) / (fp.n2 / fp.d2)) * 100).toFixed(1));
    return {
      text: `${prefix} An automated ETL pipeline mistakenly multiplied a metric by ${fp.n1}/${fp.d1} instead of ${fp.n2}/${fp.d2}. What is the percentage error in the resulting value?`,
      correctVal: `${errPct}%`,
      distractors: [`${(errPct - 12).toFixed(1)}%`, `${(errPct + 8.5).toFixed(1)}%`, `50%`],
      explanation: `True multiplier = ${fp.n2}/${fp.d2}. Mistaken multiplier = ${fp.n1}/${fp.d1}. Error = (${fp.n2}/${fp.d2} - ${fp.n1}/${fp.d1}) / (${fp.n2}/${fp.d2}) × 100 = ${errPct}%.`,
      shortcut: `Error % = (True - False) / True × 100 = ${errPct}%.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Dividing by the mistaken value instead of the correct baseline value", "Inverting numerator and denominator"]
    };
  } else {
    // Income, expenditure and savings
    const income = 30000 + ((qSeed * 1000) % 40000);
    const expPctVals = [60, 65, 70, 75, 80];
    const expPct = expPctVals[qSeed % expPctVals.length];
    const incGrowthVals = [15, 20, 25, 30];
    const incGrowth = incGrowthVals[(qSeed >> 2) % incGrowthVals.length];
    const expGrowthVals = [5, 10, 12, 15];
    const expGrowth = expGrowthVals[(qSeed >> 4) % expGrowthVals.length];
    const oldSav = income * (1 - expPct / 100);
    const newInc = income * (1 + incGrowth / 100);
    const newExp = (income * (expPct / 100)) * (1 + expGrowth / 100);
    const newSav = newInc - newExp;
    const savGrowth = Number((((newSav - oldSav) / oldSav) * 100).toFixed(1));
    return {
      text: `${prefix} An analyst spends ${expPct}% of their monthly income. If their income increases by ${incGrowth}% and expenditures increase by ${expGrowth}%, what is the percentage increase in their savings?`,
      correctVal: `${savGrowth}%`,
      distractors: [`${(savGrowth - 15).toFixed(1)}%`, `${(savGrowth + 10).toFixed(1)}%`, `${incGrowth - expGrowth}%`],
      explanation: `Original: Income = 100, Exp = ${expPct}, Savings = ${100 - expPct}. New: Income = ${100 + incGrowth}, Exp = ${(expPct * (1 + expGrowth / 100)).toFixed(1)}, Savings = ${newSav / (income / 100)}. Savings increase = ${savGrowth}%.`,
      shortcut: `Track units: Original savings = ${100 - expPct}, New savings = ${(100 + incGrowth - (expPct * (1 + expGrowth / 100))).toFixed(1)}. Growth = ${savGrowth}%.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Assuming savings grow at (Income growth - Expenditure growth)", "Calculating percentage of income instead of savings"]
    };
  }
}

export function generateProfitLossQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 79 + testNum * 37;

  if (archetype === 0) {
    // Markup and discount
    const cp = 600 + ((qSeed * 29) % 1500);
    const markup = 20 + ((qSeed * 5) % 35);
    const discount = [10, 12, 15, 20][qSeed % 4];
    const netProfitPct = Number((markup - discount - (markup * discount) / 100).toFixed(1));
    return {
      text: `${prefix} A merchant marks hardware products ${markup}% above their cost price of ₹${cp} and offers a trade discount of ${discount}% on the marked price. What is the net profit percentage?`,
      correctVal: `${netProfitPct}%`,
      distractors: [`${markup - discount}%`, `${(netProfitPct - 4.2).toFixed(1)}%`, `${(netProfitPct + 5).toFixed(1)}%`],
      explanation: `Net % = M - D - (M × D / 100) = ${markup} - ${discount} - (${markup} × ${discount} / 100) = ${netProfitPct}%.`,
      shortcut: `Direct formula: Net % = Markup - Discount - (Markup × Discount / 100).`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Subtracting discount from markup directly (Markup - Discount)", "Applying discount on cost price"]
    };
  } else if (archetype === 1) {
    // Two articles same SP
    const pVals = [5, 8, 10, 12, 15, 20];
    const p = pVals[qSeed % pVals.length];
    const sp = 5000 + ((qSeed * 100) % 20000);
    const items = ["smartphones", "mechanical keyboards", "smart monitors", "cloud workbooks", "wireless headsets"];
    const item = items[qSeed % items.length];
    const lossPct = Number(((p * p) / 100).toFixed(2));
    return {
      text: `${prefix} A store sells two ${item} for ₹${sp.toLocaleString()} each. On one it gains ${p}% and on the other it loses ${p}%. What is the overall transaction outcome?`,
      correctVal: `${lossPct}% loss`,
      distractors: ["No profit no loss", `${lossPct}% profit`, `${(lossPct * 2).toFixed(2)}% loss`],
      explanation: `When two items are sold at the same selling price, one at a gain of p% and the other at a loss of p%, there is always an overall loss of (p/10)^2 % = (${p}/10)^2 = ${lossPct}%.`,
      shortcut: `Always a loss: (Common % / 10)^2 = (${p}/10)^2 = ${lossPct}% loss.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Concluding 'no profit, no loss' because percentages cancel out", "Confusing cost price with selling price"]
    };
  } else if (archetype === 2) {
    // Dishonest trader false weight
    const falseWts = [800, 850, 900, 920, 950, 960];
    const falseWt = falseWts[qSeed % falseWts.length];
    const trueWt = 1000;
    const gainPct = Number((((trueWt - falseWt) / falseWt) * 100).toFixed(1));
    return {
      text: `${prefix} A vendor professes to sell raw materials at cost price, but uses an inaccurate scale measuring ${falseWt} grams for every 1 kg (1000 grams). What is the vendor's actual profit percentage?`,
      correctVal: `${gainPct}%`,
      distractors: ["10%", `${(gainPct - 2.5).toFixed(1)}%`, `${(gainPct + 3.4).toFixed(1)}%`],
      explanation: `Gain % = [Error / (True Weight - Error)] × 100 = [${trueWt - falseWt} / ${falseWt}] × 100 = ${gainPct}%.`,
      shortcut: `[Error / False Weight] × 100 = ${trueWt - falseWt} / ${falseWt} × 100 = ${gainPct}%.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Dividing by 1000g instead of actual weight sold", "Assuming profit is simply the percentage error of 1000g"]
    };
  } else if (archetype === 3) {
    // Successive discounts
    const pairs = [{d1: 20, d2: 10}, {d1: 25, d2: 10}, {d1: 30, d2: 20}, {d1: 15, d2: 10}, {d1: 20, d2: 5}, {d1: 40, d2: 10}, {d1: 30, d2: 10}];
    const { d1, d2 } = pairs[qSeed % pairs.length];
    const singleEq = Number((d1 + d2 - (d1 * d2) / 100).toFixed(1));
    return {
      text: `${prefix} What single equivalent discount percentage corresponds to two successive discounts of ${d1}% and ${d2}% on enterprise software licensing?`,
      correctVal: `${singleEq}%`,
      distractors: [`${d1 + d2}%`, `${Number((singleEq - 2).toFixed(1))}%`, `${Number((singleEq + 4).toFixed(1))}%`],
      explanation: `Equivalent discount = D1 + D2 - (D1 × D2 / 100) = ${d1} + ${d2} - (${d1} × ${d2} / 100) = ${singleEq}%.`,
      shortcut: `D = ${d1} + ${d2} - ${(d1 * d2 / 100).toFixed(1)} = ${singleEq}%.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Adding discounts directly", "Multiplying discounts"]
    };
  } else if (archetype === 4) {
    // Buy X Get Y Free
    const bPairs = [{b: 3, f: 1}, {b: 4, f: 1}, {b: 5, f: 1}, {b: 2, f: 1}, {b: 7, f: 1}, {b: 4, f: 2}, {b: 6, f: 2}];
    const { b: buy, f: free } = bPairs[qSeed % bPairs.length];
    const effDiscount = Number(((free / (buy + free)) * 100).toFixed(1));
    return {
      text: `${prefix} An authorized distributor announces an end-of-quarter promotion: "Buy ${buy} units, Get ${free} Free". What is the effective percentage discount received by the purchaser?`,
      correctVal: `${effDiscount}%`,
      distractors: [`${(free / buy * 100).toFixed(1)}%`, `${(effDiscount - 4).toFixed(1)}%`, `25%`],
      explanation: `Discount % = [Free Items / Total Items Taken] × 100 = [${free} / (${buy} + ${free})] × 100 = [${free} / ${buy + free}] × 100 = ${effDiscount}%.`,
      shortcut: `Free / Total × 100 = ${free} / ${buy + free} × 100 = ${effDiscount}%.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Dividing Free by Buy items instead of Total items", "Ignoring total articles"]
    };
  } else if (archetype === 5) {
    // Cost price of X = Selling price of Y
    const cpSpPairs = [{x: 15, y: 12}, {x: 20, y: 16}, {x: 25, y: 20}, {x: 10, y: 8}, {x: 12, y: 10}, {x: 16, y: 12}, {x: 18, y: 15}, {x: 30, y: 24}];
    const { x, y } = cpSpPairs[qSeed % cpSpPairs.length];
    const profitPct = Number((((x - y) / y) * 100).toFixed(1));
    return {
      text: `${prefix} If the cost price of ${x} microchips is exactly equal to the selling price of ${y} microchips, what is the profit percentage earned?`,
      correctVal: `${profitPct}%`,
      distractors: [`${((x - y) / x * 100).toFixed(1)}%`, `${profitPct + 5}%`, `${profitPct - 4}%`],
      explanation: `Let CP of 1 chip = ₹1. Total CP of ${y} chips = ₹${y}. SP of ${y} chips = CP of ${x} chips = ₹${x}. Profit = ₹${x - y}. Profit % = (${x - y} / ${y}) × 100 = ${profitPct}%.`,
      shortcut: `[(X - Y) / Y] × 100 = (${x - y} / ${y}) × 100 = ${profitPct}%.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Dividing by X instead of Y", "Confusing profit with loss"]
    };
  } else if (archetype === 6) {
    // Target selling price
    const lossVals = [5, 10, 15, 20];
    const gainVals = [10, 15, 20, 25];
    const lossPct = lossVals[qSeed % lossVals.length];
    const targetGain = gainVals[(qSeed >> 2) % gainVals.length];
    const cp = 1000 + ((qSeed * 100) % 4000);
    const sp1 = Math.round(cp * (1 - lossPct / 100));
    const sp2 = Math.round(cp * (1 + targetGain / 100));
    return {
      text: `${prefix} By selling a server rack for ₹${sp1.toLocaleString()}, a vendor loses ${lossPct}%. At what selling price should the vendor sell the unit to achieve a profit of ${targetGain}%?`,
      correctVal: `₹${sp2.toLocaleString()}`,
      distractors: [`₹${(sp2 + 180).toLocaleString()}`, `₹${(sp2 - 160).toLocaleString()}`, `₹${Math.round(cp).toLocaleString()}`],
      explanation: `Cost Price = SP1 / (1 - Loss%) = ${sp1} / ${(1 - lossPct / 100).toFixed(2)} = ₹${cp}. Required SP = CP × (1 + Target Gain%) = ${cp} × ${(1 + targetGain / 100).toFixed(2)} = ₹${sp2}.`,
      shortcut: `SP2 = SP1 × (100 + Gain%) / (100 - Loss%) = ₹${sp2}.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Calculating gain on SP1 instead of CP", "Incorrect base division"]
    };
  } else {
    // Partnership profit ratio
    const invA = 10000 + ((qSeed * 1000) % 20000);
    const timeA = 8 + (qSeed % 5);
    const invB = 15000 + ((qSeed * 1500) % 25000);
    const timeB = 6 + ((qSeed * 3) % 7);
    const totalProfit = 24000 + ((qSeed * 2000) % 50000);
    const capA = invA * timeA;
    const capB = invB * timeB;
    const shareB = Math.round(totalProfit * (capB / (capA + capB)));
    const shareA = totalProfit - shareB;
    return {
      text: `${prefix} Developer A invested ₹${invA.toLocaleString()} for ${timeA} months in a startup, while Developer B invested ₹${invB.toLocaleString()} for ${timeB} months. If the annual net profit is ₹${totalProfit.toLocaleString()}, what is Developer B's profit share?`,
      correctVal: `₹${shareB.toLocaleString()}`,
      distractors: [`₹${shareA.toLocaleString()}`, `₹${(shareB + 3000).toLocaleString()}`, `₹${(shareB - 2500).toLocaleString()}`],
      explanation: `Profit ratio = (Capital_A × Time_A) : (Capital_B × Time_B) = (${invA} × ${timeA}) : (${invB} × ${timeB}) = ${capA} : ${capB} = ${ratioSimplify(capA, capB)}. B's share = ${capB}/${capA + capB} × ${totalProfit} = ₹${shareB.toLocaleString()}.`,
      shortcut: `Ratio = (${invA} × ${timeA}) : (${invB} × ${timeB}) = ${ratioSimplify(capA, capB)}. Share = ${ratioSimplify(capB, capA + capB)} of ${totalProfit} = ₹${shareB}.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Ignoring time duration in capital ratio", "Splitting profit purely by initial capital"]
    };
  }
}

export function generateTimeWorkQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 83 + testNum * 41;

  if (archetype === 0) {
    // Joint work rate
    const a = 10 + ((qSeed * 2) % 6) * 2;
    const b = 16 + ((qSeed * 3) % 6) * 2;
    const ans = Number(((a * b) / (a + b)).toFixed(1));
    return {
      text: `${prefix} Engineer A can configure a high-availability cluster in ${a} days, and Engineer B can configure the same cluster in ${b} days. How many days will they take working together?`,
      correctVal: `${ans} days`,
      distractors: [`${((a + b) / 2).toFixed(1)} days`, `${(ans + 2.1).toFixed(1)} days`, `${(ans - 1.5).toFixed(1)} days`],
      explanation: `Combined rate = 1/${a} + 1/${b} = (${a + b}) / (${a} × ${b}). Total time = (${a} × ${b}) / (${a} + ${b}) = ${ans} days.`,
      shortcut: `Product / Sum: (${a} × ${b}) / (${a} + ${b}) = ${ans} days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Averaging the days (A + B) / 2", "Adding reciprocals without inversion"]
    };
  } else if (archetype === 1) {
    // Leaving midway
    const a = 12 + (qSeed % 8);
    const b = a + 4 + ((qSeed * 2) % 6);
    const daysTogether = 2 + (qSeed % 3);
    const workDoneFrac = daysTogether * (1/a + 1/b);
    const remB = Number(((1 - workDoneFrac) * b).toFixed(1));
    return {
      text: `${prefix} Worker A can complete a project in ${a} days, and Worker B can complete it in ${b} days. Both work together for ${daysTogether} days, after which Worker A leaves. In how many more days will Worker B finish the remaining work alone?`,
      correctVal: `${remB} days`,
      distractors: [`${(remB + 2).toFixed(1)} days`, `${(remB - 2.5).toFixed(1)} days`, `8.0 days`],
      explanation: `Combined daily rate = 1/${a} + 1/${b}. In ${daysTogether} days, work completed = ${daysTogether} × (1/${a} + 1/${b}) = ${workDoneFrac.toFixed(2)}. Remaining work = ${(1 - workDoneFrac).toFixed(2)}. Days for Worker B = ${(1 - workDoneFrac).toFixed(2)} × ${b} = ${remB} days.`,
      shortcut: `Remaining = 1 - ${daysTogether} × (${a + b}/${a * b}). Time = Rem × ${b} = ${remB} days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Forgetting to subtract combined work done", "Calculating total days instead of additional days"]
    };
  } else if (archetype === 2) {
    // Pipes and Cistern with Leak
    const fillA = 8 + (qSeed % 6);
    const fillB = 12 + ((qSeed * 2) % 6);
    const leakC = 24 + ((qSeed * 3) % 12);
    const netRate = 1/fillA + 1/fillB - 1/leakC;
    const netTime = Number((1 / netRate).toFixed(1));
    return {
      text: `${prefix} Pipe A fills an industrial reservoir in ${fillA} hours, Pipe B fills it in ${fillB} hours, while drainage Valve C can empty the full reservoir in ${leakC} hours. If all three operate simultaneously, how many hours will it take to fill the reservoir?`,
      correctVal: `${netTime} hours`,
      distractors: [`${(netTime + 2.5).toFixed(1)} hours`, `${(netTime - 1.5).toFixed(1)} hours`, `12.0 hours`],
      explanation: `Net filling rate per hour = 1/${fillA} + 1/${fillB} - 1/${leakC} = ${netRate.toFixed(3)}. Time to fill = 1 / ${netRate.toFixed(3)} = ${netTime} hours.`,
      shortcut: `Net rate = 1/${fillA} + 1/${fillB} - 1/${leakC}. Time = 1 / net rate = ${netTime} hrs.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Adding the leak rate instead of subtracting", "Inverting fractional operations"]
    };
  } else if (archetype === 3) {
    // Alternate days
    const pairs = [
      { a: 10, b: 15, ans: "12 days" },
      { a: 12, b: 18, ans: "14 1/3 days" },
      { a: 12, b: 16, ans: "13 1/2 days" },
      { a: 8, b: 12, ans: "9 1/2 days" },
      { a: 15, b: 20, ans: "17 days" },
      { a: 6, b: 9, ans: "7 days" }
    ];
    const p = pairs[qSeed % pairs.length];
    return {
      text: `${prefix} Contractor A can pave a roadway in ${p.a} days, and Contractor B in ${p.b} days. If they work on alternate days starting with Contractor A on Day 1, in how many days will the roadway be completed?`,
      correctVal: p.ans,
      distractors: [`15 days`, `14 1/2 days`, `13 2/3 days`].filter(d => d !== p.ans).concat([`16 days`]).slice(0, 3),
      explanation: `With A doing 1/${p.a} and B doing 1/${p.b} on alternate days, they cycle every 2 days. Output leads to completion in ${p.ans}.`,
      shortcut: `Compute 2-day cycle capacity and remainder for final day. Result: ${p.ans}.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Assuming whole days for final fractional work", "Confusing who starts on odd cycles"]
    };
  } else if (archetype === 4) {
    // Men and Women equivalence
    const mPairs = [
      { m: 6, w: 8, days: 10, m2: 3, w2: 4, ans: 10 },
      { m: 4, w: 6, days: 12, m2: 2, w2: 3, ans: 12 },
      { m: 8, w: 12, days: 9, m2: 4, w2: 6, ans: 9 },
      { m: 5, w: 10, days: 14, m2: 2, w2: 6, ans: 14 },
      { m: 10, w: 15, days: 8, m2: 4, w2: 9, ans: 8 }
    ];
    const mp = mPairs[qSeed % mPairs.length];
    return {
      text: `${prefix} ${mp.m} men or ${mp.w} women can complete a database migration in ${mp.days} days. In how many days can ${mp.m2} men and ${mp.w2} women complete the same migration working together?`,
      correctVal: `${mp.ans} days`,
      distractors: [`${mp.ans + 2} days`, `${mp.ans - 2} days`, `14 days`],
      explanation: `${mp.m} men's work = ${mp.w} women's work. Converting team ${mp.m2} men + ${mp.w2} women to women gives an equivalent capacity completing the task in ${mp.ans} days.`,
      shortcut: `Equate to one gender: total team efficiency yields ${mp.ans} days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Adding men and women counts directly without rate equivalence", "Inverting gender ratios"]
    };
  } else if (archetype === 5) {
    // Wages division
    const pairs = [{ a: 6, b: 8 }, { a: 5, b: 10 }, { a: 8, b: 12 }, { a: 4, b: 6 }, { a: 9, b: 12 }];
    const pair = pairs[qSeed % pairs.length];
    const totalWage = 6000 + ((qSeed * 500) % 8000);
    // Eff ratio = 1/a : 1/b = b : a. Total parts = a + b.
    // B's share = (a / (a + b)) * totalWage
    const shareB = Math.round(totalWage * (pair.a / (pair.a + pair.b)));
    return {
      text: `${prefix} Technician A can wire a data center rack in ${pair.a} days, while Technician B takes ${pair.b} days. If they undertake the assignment together for total wages of ₹${totalWage.toLocaleString()}, what is Technician B's fair share?`,
      correctVal: `₹${shareB.toLocaleString()}`,
      distractors: [`₹${(totalWage - shareB).toLocaleString()}`, `₹${(shareB + 500).toLocaleString()}`, `₹${(shareB - 500).toLocaleString()}`],
      explanation: `Wages are divided in proportion to daily work rates: Rate_A : Rate_B = (1/${pair.a}) : (1/${pair.b}) = ${pair.b} : ${pair.a}. Total parts = ${pair.a + pair.b}. B's share = (${pair.a} / ${pair.a + pair.b}) × ₹${totalWage} = ₹${shareB.toLocaleString()}.`,
      shortcut: `Wages inversely proportional to days: B's share = a / (a + b) × Total = ₹${shareB}.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Distributing wages directly proportional to days taken", "Arithmetic division error"]
    };
  } else if (archetype === 6) {
    // Efficiency multiplier
    const effPctVals = [25, 40, 50, 60, 75, 80, 100];
    const effPct = effPctVals[qSeed % effPctVals.length];
    const daysB = 12 + (qSeed % 12);
    const daysA = Number((daysB / (1 + effPct / 100)).toFixed(1));
    return {
      text: `${prefix} Senior Architect A is ${effPct}% more efficient than Junior Architect B. If Junior Architect B takes ${daysB} days to design a microservices architecture, how many days will Senior Architect A take alone?`,
      correctVal: `${daysA} days`,
      distractors: [`${Number((daysA + 2).toFixed(1))} days`, `${Number((daysA - 2).toFixed(1))} days`, `12 days`],
      explanation: `Efficiency of A / Efficiency of B = (100 + ${effPct}) / 100 = ${(1 + effPct / 100).toFixed(2)}. Time is inversely proportional to efficiency: Time_A = Time_B / ${(1 + effPct / 100).toFixed(2)} = ${daysB} / ${(1 + effPct / 100).toFixed(2)} = ${daysA} days.`,
      shortcut: `Time_A = ${daysB} / ${(1 + effPct / 100).toFixed(2)} = ${daysA} days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Multiplying by efficiency multiplier instead of dividing", "Applying percentage decrease directly"]
    };
  } else {
    // Destruction / negative work
    const buildDays = 12 + (qSeed % 8);
    const destroyDays = buildDays + 4 + ((qSeed * 2) % 8);
    const totalDays = Number(((buildDays * destroyDays) / (destroyDays - buildDays)).toFixed(1));
    return {
      text: `${prefix} Builder A can construct a security firewall in ${buildDays} days, while a continuous stress-testing simulator would take ${destroyDays} days to dismantle it completely. If both run simultaneously, in how many days will the firewall be fully built?`,
      correctVal: `${totalDays} days`,
      distractors: [`${Number((totalDays - 15).toFixed(1))} days`, `${Number((totalDays + 20).toFixed(1))} days`, `35 days`],
      explanation: `Net build rate per day = 1/${buildDays} - 1/${destroyDays} = (${destroyDays - buildDays}) / (${buildDays} × ${destroyDays}). Time required = (${buildDays} × ${destroyDays}) / (${destroyDays - buildDays}) = ${totalDays} days.`,
      shortcut: `Net time = (B × D) / (D - B) = (${buildDays} × ${destroyDays}) / ${destroyDays - buildDays} = ${totalDays} days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Adding rates instead of subtracting", "Taking difference of days directly"]
    };
  }
}

export function generateSpeedDistanceQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 89 + testNum * 43;

  if (archetype === 0) {
    // Train crossing pole
    const len = 150 + ((qSeed * 25) % 250);
    const speedKmph = [36, 54, 72, 90, 108][qSeed % 5];
    const speedMs = (speedKmph * 5) / 18;
    const timeSec = Number((len / speedMs).toFixed(1));
    return {
      text: `${prefix} An express train ${len} meters long is traveling at a uniform speed of ${speedKmph} km/h. How many seconds will it take to pass a stationary signal post?`,
      correctVal: `${timeSec} seconds`,
      distractors: [`${Number((timeSec + 4).toFixed(1))} seconds`, `${Number((timeSec - 3).toFixed(1))} seconds`, `${Number((timeSec * 2).toFixed(1))} seconds`],
      explanation: `Speed in m/s = ${speedKmph} × (5/18) = ${speedMs} m/s. Distance to cross pole = Train length = ${len} m. Time = Distance / Speed = ${len} / ${speedMs} = ${timeSec} seconds.`,
      shortcut: `Speed = ${speedKmph} × 5/18 = ${speedMs} m/s. Time = ${len} / ${speedMs} = ${timeSec}s.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Forgetting to convert km/h to m/s", "Using length in km instead of meters"]
    };
  } else if (archetype === 1) {
    // Train crossing platform
    const trainLen = 150 + ((qSeed * 20) % 150);
    const platLen = 200 + ((qSeed * 30) % 250);
    const speedKmph = [36, 54, 72, 90][qSeed % 4];
    const speedMs = (speedKmph * 5) / 18;
    const totalDist = trainLen + platLen;
    const timeSec = Number((totalDist / speedMs).toFixed(1));
    return {
      text: `${prefix} A freight train ${trainLen} meters long moving at ${speedKmph} km/h completely crosses a railway platform ${platLen} meters long. What is the time taken in seconds?`,
      correctVal: `${timeSec} seconds`,
      distractors: [`${Number((timeSec - 8).toFixed(1))} seconds`, `${Number((timeSec + 10).toFixed(1))} seconds`, `24 seconds`],
      explanation: `Total distance = Train length + Platform length = ${trainLen} + ${platLen} = ${totalDist} meters. Speed = ${speedKmph} × (5/18) = ${speedMs} m/s. Time = ${totalDist} / ${speedMs} = ${timeSec} seconds.`,
      shortcut: `Total Distance = ${totalDist}m. Speed = ${speedMs} m/s. Time = ${totalDist} / ${speedMs} = ${timeSec} seconds.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Ignoring platform length and only using train length", "Failing to convert km/h to m/s"]
    };
  } else if (archetype === 2) {
    // Two trains opposite directions
    const l1 = 120 + ((qSeed * 15) % 120);
    const l2 = 150 + ((qSeed * 25) % 150);
    const s1 = 36 + ((qSeed * 5) % 36);
    const s2 = 45 + ((qSeed * 7) % 36);
    const relSpeedKmph = s1 + s2;
    const relSpeedMs = (relSpeedKmph * 5) / 18;
    const timeSec = Number(((l1 + l2) / relSpeedMs).toFixed(1));
    return {
      text: `${prefix} Two commuter trains of lengths ${l1}m and ${l2}m run on parallel tracks in opposite directions at speeds of ${s1} km/h and ${s2} km/h respectively. In how many seconds will they cross each other completely?`,
      correctVal: `${timeSec} seconds`,
      distractors: [`${Number((timeSec + 4).toFixed(1))} seconds`, `${Number((timeSec - 4).toFixed(1))} seconds`, `25 seconds`],
      explanation: `Relative speed (opposite direction) = ${s1} + ${s2} = ${relSpeedKmph} km/h = ${relSpeedMs.toFixed(2)} m/s. Total distance = ${l1} + ${l2} = ${l1 + l2} m. Time = ${l1 + l2} / ${relSpeedMs.toFixed(2)} = ${timeSec} seconds.`,
      shortcut: `Distance = ${l1 + l2}m. Relative Speed = ${relSpeedKmph} km/h. Time = ${timeSec}s.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Subtracting speeds for opposite directions instead of adding", "Unit conversion errors"]
    };
  } else if (archetype === 3) {
    // Boats and streams
    const stillSpeed = 12 + (qSeed % 8);
    const streamSpeed = 2 + (qSeed % 4);
    const dist = (stillSpeed - streamSpeed) * (stillSpeed + streamSpeed);
    const upSpeed = stillSpeed - streamSpeed;
    const downSpeed = stillSpeed + streamSpeed;
    const totalTime = Number((dist / upSpeed + dist / downSpeed).toFixed(1));
    return {
      text: `${prefix} A patrol boat can travel at ${stillSpeed} km/h in still water. If the river flow rate is ${streamSpeed} km/h, what is the total time taken for a round trip covering ${dist} km upstream and returning ${dist} km downstream?`,
      correctVal: `${totalTime} hours`,
      distractors: [`${Number((totalTime - 1.2).toFixed(1))} hours`, `${Number((totalTime + 1.5).toFixed(1))} hours`, `4.0 hours`],
      explanation: `Upstream speed = ${stillSpeed} - ${streamSpeed} = ${upSpeed} km/h. Downstream speed = ${stillSpeed} + ${streamSpeed} = ${downSpeed} km/h. Time Up = ${dist}/${upSpeed} = ${dist/upSpeed} hrs. Time Down = ${dist}/${downSpeed} = ${dist/downSpeed} hrs. Total = ${totalTime} hours.`,
      shortcut: `Round trip time = D/(u - v) + D/(u + v) = ${dist}/${upSpeed} + ${dist}/${downSpeed} = ${totalTime} hrs.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Calculating round trip time as 2D / still water speed", "Subtracting stream speed for downstream"]
    };
  } else if (archetype === 4) {
    // Round trip average speed
    const s1 = 40 + ((qSeed * 5) % 40);
    const s2 = 20 + ((qSeed * 3) % 40);
    const avgSpeed = Number(((2 * s1 * s2) / (s1 + s2)).toFixed(1));
    return {
      text: `${prefix} A commuter drives from City A to City B at ${s1} km/h and returns along the same route at ${s2} km/h. What is the average speed for the entire journey?`,
      correctVal: `${avgSpeed} km/h`,
      distractors: [`${((s1 + s2) / 2).toFixed(1)} km/h`, `${(avgSpeed + 4).toFixed(1)} km/h`, `45 km/h`],
      explanation: `For equal distances, Average Speed = (2 × s1 × s2) / (s1 + s2) = (2 × ${s1} × ${s2}) / (${s1} + ${s2}) = ${avgSpeed} km/h.`,
      shortcut: `Harmonic Mean: 2ab / (a + b) = 2(${s1})(${s2}) / ${s1 + s2} = ${avgSpeed} km/h.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Arithmetic mean (s1 + s2) / 2", "Dividing difference of speeds"]
    };
  } else if (archetype === 5) {
    // Late and early speed change
    const s1 = 3 + (qSeed % 4);
    const s2 = s1 + 1 + (qSeed % 3);
    const lateMin = 8 + (qSeed % 10);
    const earlyMin = 4 + ((qSeed * 2) % 8);
    const dist = Number(((s1 * s2 / (s2 - s1)) * ((lateMin + earlyMin) / 60)).toFixed(1));
    return {
      text: `${prefix} Walking at ${s1} km/h, an employee reaches the office ${lateMin} minutes late. If walking at ${s2} km/h, the employee arrives ${earlyMin} minutes early. What is the distance between the employee's residence and office?`,
      correctVal: `${dist} km`,
      distractors: [`${Number((dist + 2.5).toFixed(1))} km`, `${Number((dist - 1.5).toFixed(1))} km`, `6.5 km`],
      explanation: `Time difference = ${lateMin} min late - (-${earlyMin} min early) = ${lateMin + earlyMin} minutes = ${(lateMin + earlyMin) / 60} hours. Distance = (s1 × s2 / |s2 - s1|) × ΔT = (${s1} × ${s2} / ${s2 - s1}) × (${lateMin + earlyMin} / 60) = ${dist} km.`,
      shortcut: `D = (Product of speeds / Difference of speeds) × Total time difference = ${dist} km.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Subtracting times instead of adding late + early", "Forgetting to convert minutes to hours"]
    };
  } else if (archetype === 6) {
    // Police and thief relative chase
    const distApartMeters = 150 + ((qSeed * 25) % 250);
    const thiefMs = 8 + (qSeed % 5);
    const copMs = thiefMs + 2 + (qSeed % 4);
    const relMs = copMs - thiefMs;
    const timeSec = Math.round(distApartMeters / relMs);
    const patrolDist = copMs * timeSec;
    return {
      text: `${prefix} A cyber patrol detects an intruder accessing system files ${distApartMeters} meters ahead in a network simulator. The intruder moves at ${thiefMs} m/s and the security patrol accelerates at ${copMs} m/s. What distance will the security patrol travel to intercept the intruder?`,
      correctVal: `${patrolDist} meters`,
      distractors: [`${patrolDist - 100} meters`, `${patrolDist + 120} meters`, `${thiefMs * timeSec} meters`],
      explanation: `Relative speed = ${copMs} - ${thiefMs} = ${relMs} m/s. Time to catch = Initial separation / Relative speed = ${distApartMeters} / ${relMs} = ${timeSec} seconds. Distance covered by security patrol = Speed × Time = ${copMs} × ${timeSec} = ${patrolDist} meters.`,
      shortcut: `Time = ${distApartMeters} / ${relMs} = ${timeSec}s. Patrol distance = ${copMs} × ${timeSec} = ${patrolDist}m.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Calculating the intruder's distance instead of the patrol's distance", "Adding speeds in chase scenario"]
    };
  } else {
    // Circular track meeting
    const trackLen = 400 + ((qSeed * 50) % 600);
    const s1 = 10 + (qSeed % 10);
    const s2 = 5 + ((qSeed * 2) % 10);
    const timeSec = Number((trackLen / (s1 + s2)).toFixed(1));
    return {
      text: `${prefix} Two autonomous delivery drones start simultaneously from the same point on a circular testing track of circumference ${trackLen} meters in opposite directions with speeds of ${s1} m/s and ${s2} m/s. After how many seconds will they cross each other for the first time?`,
      correctVal: `${timeSec} seconds`,
      distractors: [`${Number((timeSec + 12).toFixed(1))} seconds`, `${Number((timeSec - 6).toFixed(1))} seconds`, `40 seconds`],
      explanation: `When traveling in opposite directions around a closed circular circuit, relative speed = s1 + s2 = ${s1} + ${s2} = ${s1 + s2} m/s. Time for first meeting = Track Length / Relative Speed = ${trackLen} / ${s1 + s2} = ${timeSec} seconds.`,
      shortcut: `Time = Circumference / (s1 + s2) = ${trackLen} / ${s1 + s2} = ${timeSec}s.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Subtracting speeds on a circular track when moving in opposite directions", "Dividing by average speed"]
    };
  }
}

// ============================================================================
// LOGICAL REASONING ARCHETYPES
// ============================================================================

export function generateLogicalQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8, seed % 8);
  const qSeed = seed + qIndex * 97 + testNum * 47;

  if (archetype === 0) {
    // Coding-Decoding alphabetical shift
    const shift = 2 + (testNum % 3); // 2, 3, 4
    const word = testNum % 2 === 0 ? "STREAM" : "VECTOR";
    const encode = (w: string, s: number) =>
      w.split("").map(c => String.fromCharCode(((c.charCodeAt(0) - 65 + s) % 26) + 65)).join("");
    const encoded = encode(word, shift);
    const targetWord = testNum % 2 === 0 ? "BUFFER" : "PACKET";
    const targetEncoded = encode(targetWord, shift);
    const distractor1 = encode(targetWord, shift + 1);
    const distractor2 = encode(targetWord, shift - 1);
    const distractor3 = targetWord.split("").reverse().join("");

    return {
      text: `${prefix} In a communication cipher system, if "${word}" is encoded as "${encoded}", how will "${targetWord}" be encoded under the identical transformation rule?`,
      correctVal: targetEncoded,
      distractors: [distractor1, distractor2, distractor3],
      explanation: `Each character in the word is shifted forward by +${shift} positions alphabetically. Applying +${shift} to each letter of "${targetWord}" yields "${targetEncoded}".`,
      shortcut: `Offset = +${shift}. Apply +${shift} to each character.`,
      topic: "Coding-Decoding",
      category: "logical",
      commonMistakes: ["Shifting backward instead of forward", "Off-by-one alphabet index counting"]
    };
  } else if (archetype === 1) {
    // Blood Relations
    const relations = [
      {
        q: `Pointing to a photograph on the office board, Rahul remarked: "His mother is the only daughter of my maternal grandfather." How is Rahul related to the person in the photograph?`,
        ans: "Brother",
        dist: ["Father", "Uncle", "Cousin"],
        exp: `"Only daughter of my maternal grandfather" is Rahul's mother. The person's mother is Rahul's mother. Therefore, Rahul is the brother of that person.`,
        trick: `Grandfather's only daughter = Mother.`
      },
      {
        q: `Pointing to a speaker on stage, Neha said: "He is the son of the only brother of my father's wife." How is the speaker related to Neha?`,
        ans: "Cousin (Maternal)",
        dist: ["Brother", "Uncle", "Nephew"],
        exp: `Neha's father's wife = Neha's mother. Mother's only brother = Neha's maternal uncle. Uncle's son = Neha's cousin.`,
        trick: `Father's wife = Mother -> Brother = Uncle -> Son = Cousin.`
      },
      {
        q: `If A + B means A is the brother of B, A - B means A is the sister of B, and A * B means A is the father of B, which expression denotes "P is the paternal uncle of Q"?`,
        ans: "P + R * Q",
        dist: ["P * R + Q", "P - R * Q", "R + P * Q"],
        exp: `P + R denotes P is brother of R. R * Q denotes R is father of Q. Brother of Q's father is Q's paternal uncle. Hence P + R * Q is correct.`,
        trick: `Uncle = Brother (+) of Father (*). P + R * Q.`
      }
    ];
    const r = relations[(qSeed + qIndex) % relations.length];
    return {
      text: `${prefix} ${r.q}`,
      correctVal: r.ans,
      distractors: r.dist,
      explanation: r.exp,
      shortcut: r.trick,
      topic: "Blood Relations",
      category: "logical",
      commonMistakes: ["Confusing maternal and paternal relationships", "Assuming gender without explicit cues"]
    };
  } else if (archetype === 2) {
    // Seating Arrangement
    return {
      text: `${prefix} Five colleagues (A, B, C, D, E) sit in a straight line facing North. C sits in the exact middle. A sits to the immediate right of C. B sits at the extreme left end. Who is sitting immediately to the left of C?`,
      correctVal: "D or E",
      distractors: ["A", "B", "Cannot be determined"],
      explanation: `Positions 1 to 5 from left to right: Pos 1 = B, Pos 3 = C, Pos 4 = A. Remaining positions are Pos 2 and Pos 5, occupied by D and E. The person immediately to the left of C is at Pos 2, which is either D or E.`,
      shortcut: `Map positions 1(B), 2(D/E), 3(C), 4(A), 5(E/D). Immediately left of C is Pos 2.`,
      topic: "Seating Arrangement",
      category: "logical",
      commonMistakes: ["Placing B next to C", "Assuming A is to the left when facing North"]
    };
  } else if (archetype === 3) {
    // Syllogisms
    return {
      text: `${prefix} Statements:\nI. All microservices are containers.\nII. All containers are scalable units.\nConclusions:\n1. All microservices are scalable units.\n2. Some scalable units are containers.`,
      correctVal: "Both conclusions 1 and 2 follow",
      distractors: ["Only conclusion 1 follows", "Only conclusion 2 follows", "Neither conclusion follows"],
      explanation: `Since Microservices ⊆ Containers ⊆ Scalable Units, all microservices are scalable units (Conclusion 1 follows). Also, the converse of 'All containers are scalable units' guarantees that some scalable units are containers (Conclusion 2 follows).`,
      shortcut: `Universal transitive inclusion: All A in B and All B in C implies All A in C and Some C in B.`,
      topic: "Syllogisms",
      category: "logical",
      commonMistakes: ["Overlooking valid converse inferences (All X is Y implies Some Y is X)", "Assuming exclusivity"]
    };
  } else if (archetype === 4) {
    // Number Series (2nd order diff or squares)
    const base = 3 + (testNum % 4);
    const s1 = base;
    const s2 = s1 + 3;
    const s3 = s2 + 6;
    const s4 = s3 + 12;
    const s5 = s4 + 24;
    return {
      text: `${prefix} Identify the missing number in the progression: ${s1}, ${s2}, ${s3}, ${s4}, ?`,
      correctVal: `${s5}`,
      distractors: [`${s4 + 18}`, `${s5 + 6}`, `${s5 - 4}`],
      explanation: `The successive differences double at each step: +3, +6, +12, +24. Next term = ${s4} + 24 = ${s5}.`,
      shortcut: `Differences: 3, 6, 12, 24 (geometric doubling). ${s4} + 24 = ${s5}.`,
      topic: "Number Series",
      category: "logical",
      commonMistakes: ["Assuming constant arithmetic differences", "Adding 12 again instead of 24"]
    };
  } else if (archetype === 5) {
    // Direction Sense
    const e = 12;
    const n = 5;
    // Straight line distance = sqrt(12^2 + 5^2) = 13 km
    return {
      text: `${prefix} An autonomous drone flies ${e} km East from base station Alpha, then turns 90 degrees counter-clockwise and travels ${n} km North. What is the shortest straight-line distance from the base station Alpha?`,
      correctVal: `13 km`,
      distractors: [`17 km`, `15 km`, `11 km`],
      explanation: `The displacement forms a right-angled triangle with legs of ${e} km and ${n} km. Shortest distance = √(12² + 5²) = √(144 + 25) = √169 = 13 km.`,
      shortcut: `Pythagorean triplet (5, 12, 13). Direct distance = 13 km.`,
      topic: "Direction Sense",
      category: "logical",
      commonMistakes: ["Adding path lengths (12 + 5 = 17 km) instead of displacement", "Direction rotation confusion"]
    };
  } else if (archetype === 6) {
    // Clock angle
    // At 3:30, angle = |30*H - 11/2*M| = |90 - 165| = 75 degrees
    return {
      text: `${prefix} What is the smaller angle formed between the hour hand and minute hand of a clock at 3:30?`,
      correctVal: `75°`,
      distractors: [`90°`, `85°`, `70°`],
      explanation: `Angle formula = |30H - (11/2)M| = |30(3) - (11/2)(30)| = |90 - 165| = 75°.`,
      shortcut: `Formula: |30H - 5.5M| = |90 - 165| = 75°.`,
      topic: "Clocks & Calendars",
      category: "logical",
      commonMistakes: ["Assuming hour hand stays fixed at 3 (giving 90°)", "Forgetting hour hand movement of 0.5° per minute"]
    };
  } else {
    // Critical Reasoning / Puzzle
    return {
      text: `${prefix} In a server cluster, 8 worker nodes are functioning normally and 1 node is degraded (slower response time). If you can benchmark comparisons in parallel batches of 3, what is the minimum number of benchmarking rounds required to definitively isolate the degraded node?`,
      correctVal: "2 rounds",
      distractors: ["3 rounds", "1 round", "4 rounds"],
      explanation: `Divide the 9 nodes into 3 groups of 3 (A, B, C). Round 1: Benchmark Group A against Group B. If they match, the degraded node is in Group C. If one group is slower, it contains the degraded node. Round 2: Benchmark 2 nodes from the suspect group against each other. Total rounds = 2.`,
      shortcut: `Ternary log: 3² = 9 nodes can be resolved in exactly 2 weighings/rounds.`,
      topic: "Puzzles & Logic",
      category: "logical",
      commonMistakes: ["Using binary halving instead of ternary division", "Testing nodes one by one"]
    };
  }
}

// ============================================================================
// VERBAL ABILITY ARCHETYPES
// ============================================================================

export function generateVerbalQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 6, seed % 6);

  if (archetype === 0) {
    // Subject-Verb Agreement
    return {
      text: `${prefix} Select the grammatically correct sentence for formal executive reporting:`,
      correctVal: "Neither the lead architect nor the developers were informed of the configuration change.",
      distractors: [
        "Neither the lead architect nor the developers was informed of the configuration change.",
        "Neither the lead architect or the developers were informed of the configuration change.",
        "Neither the lead architect nor the developers has been informed of the configuration change."
      ],
      explanation: `Under the rule of proximity for 'neither... nor', the verb agrees with the closer subject. Since 'the developers' is plural, the plural verb 'were' is required.`,
      shortcut: `'Neither... nor' agrees with the nearest subject. Developers (plural) -> were.`,
      topic: "Sentence Correction & Grammar",
      category: "verbal",
      commonMistakes: ["Matching verb with the first subject ('lead architect')", "Using 'or' instead of 'nor' with 'neither'"]
    };
  } else if (archetype === 1) {
    // Vocabulary Antonyms
    const vocabList = [
      { word: "EPHEMERAL", ant: "Permanent", syn: "Transient", exp: "'Ephemeral' means lasting for a very short time. Its antonym is 'Permanent'." },
      { word: "CANDID", ant: "Deceitful", syn: "Frank", exp: "'Candid' means truthful and straightforward. Its antonym is 'Deceitful'." },
      { word: "PRAGMATIC", ant: "Idealistic", syn: "Practical", exp: "'Pragmatic' means dealing with things realistically. Its antonym is 'Idealistic'." },
      { word: "RESILIENT", ant: "Fragile", syn: "Tough", exp: "'Resilient' means able to withstand or recover quickly. Its antonym is 'Fragile'." }
    ];
    const item = vocabList[(qIndex + testNum) % vocabList.length];
    return {
      text: `${prefix} Choose the word that is most nearly OPPOSITE in meaning (Antonym) to "${item.word}":`,
      correctVal: item.ant,
      distractors: [item.syn, "Ambiguous", "Superfluous"],
      explanation: item.exp,
      shortcut: `${item.word} = ${item.syn}. Opposite = ${item.ant}.`,
      topic: "Synonyms & Antonyms",
      category: "verbal",
      commonMistakes: ["Selecting the synonym instead of the antonym", "Confusing similar sounding root words"]
    };
  } else if (archetype === 2) {
    // Para Jumbles (P-Q-R-S)
    return {
      text: `${prefix} Rearrange the sentence fragments P, Q, R, S to form a coherent, grammatically sound statement:\nP: to optimize latency\nQ: the caching mechanism\nR: was redesigned\nS: across distributed edge gateways`,
      correctVal: "Q-R-S-P",
      distractors: ["P-Q-R-S", "R-S-P-Q", "S-P-Q-R"],
      explanation: `Subject ('Q: the caching mechanism') + Passive Verb ('R: was redesigned') + Location ('S: across distributed edge gateways') + Purpose ('P: to optimize latency') forms the logical sequence Q-R-S-P.`,
      shortcut: `Identify core Subject + Verb (Q + R). Only Q-R-S-P begins with Q-R.`,
      topic: "Para Jumbles",
      category: "verbal",
      commonMistakes: ["Placing the purpose clause (P) first without a comma", "Separating verb from its subject"]
    };
  } else if (archetype === 3) {
    // Idioms & Phrases
    return {
      text: `${prefix} Choose the option that best conveys the meaning of the idiomatic phrase "bite the bullet":`,
      correctVal: "To face a grim or unavoidable situation with courage and fortitude",
      distractors: [
        "To take unnecessary and reckless financial risks",
        "To terminate a long-standing business partnership abruptly",
        "To delay making a critical decision until the last moment"
      ],
      explanation: `'To bite the bullet' means to force oneself to perform an unpleasant or difficult action or to endure a grim situation with fortitude.`,
      shortcut: `Bite the bullet = endure unavoidable adversity courageously.`,
      topic: "Idioms & Phrases",
      category: "verbal",
      commonMistakes: ["Taking the idiom literally", "Confusing with 'dodge a bullet'"]
    };
  } else if (archetype === 4) {
    // Fill in the Blanks
    return {
      text: `${prefix} Complete the sentence with the most precise contextual word: "Due to unforeseen infrastructure anomalies, the deployment was _______ until comprehensive stability tests could be concluded."`,
      correctVal: "deferred",
      distractors: ["accelerated", "repealed", "instigated"],
      explanation: `'Deferred' means postponed or put off to a later time, which aligns perfectly with conducting subsequent stability tests before proceeding.`,
      shortcut: `'deferred' = postponed until ready.`,
      topic: "Fill in the Blanks",
      category: "verbal",
      commonMistakes: ["Choosing 'repealed' which applies to legislation/laws rather than engineering deployments", "Misreading the context"]
    };
  } else {
    // Sentence Correction
    return {
      text: `${prefix} Identify the underlined phrase error: "If the security team *would have reviewed* the logs earlier, the breach could have been averted."`,
      correctVal: "had reviewed",
      distractors: ["would review", "have reviewed", "should have reviewed"],
      explanation: `In third conditional constructions (past counterfactuals), the 'if'-clause uses the past perfect tense ('had reviewed'), while the main clause uses 'would have + past participle'.`,
      shortcut: `If-clause condition uses 'had + V3', NEVER 'would have + V3'.`,
      topic: "Sentence Correction & Grammar",
      category: "verbal",
      commonMistakes: ["Using 'would have' in the if-clause", "Mixing second and third conditional tenses"]
    };
  }
}

// ============================================================================
// SIMPLE & COMPOUND INTEREST, RATIO, AVERAGES, MIXTURE, PROBABILITY, PERMUTATION
// ============================================================================

export function generateInterestQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 61 + testNum * 29;

  if (archetype === 0) {
    // Simple interest
    const p = 8000 + ((qSeed * 131) % 7000);
    const r = 6 + ((qSeed * 3) % 10);
    const t = 2 + ((qSeed * 5) % 4);
    const si = Number(((p * r * t) / 100).toFixed(2));
    return {
      text: `${prefix} A startup placed ₹${p.toLocaleString()} in a treasury account offering simple interest at ${r}% per annum. What is the simple interest earned after ${t} years?`,
      correctVal: `₹${si.toLocaleString()}`,
      distractors: [`₹${(si + 500).toLocaleString()}`, `₹${Math.round(si * 0.9).toLocaleString()}`, `₹${Math.round(si * 1.15).toLocaleString()}`],
      explanation: `SI = (P × R × T) / 100 = (${p} × ${r} × ${t}) / 100 = ${si}.`,
      shortcut: `SI = PRT/100 = ${p} × ${r} × ${t} / 100 = ₹${si}.`,
      topic: "Simple & Compound Interest",
      category: "quantitative",
      commonMistakes: ["Forgetting to divide by 100", "Using compound interest formula"],
    };
  } else if (archetype === 1) {
    // Compound interest (annual)
    const p = 20000 + ((qSeed * 151) % 20000);
    const r = 8 + ((qSeed * 2) % 6);
    const t = 2;
    const amount = Number((p * Math.pow(1 + r / 100, t)).toFixed(0));
    const ci = Number((amount - p).toFixed(0));
    return {
      text: `${prefix} An investor deposits ₹${p.toLocaleString()} in a fixed deposit compounding annually at ${r}% per annum. What is the compound interest earned after ${t} years?`,
      correctVal: `₹${ci.toLocaleString()}`,
      distractors: [`₹${Math.round(ci * 0.8).toLocaleString()}`, `₹${Math.round(ci * 1.1).toLocaleString()}`, `₹${Math.round(p * r * 2 / 100).toLocaleString()}`],
      explanation: `Amount = P(1 + r/100)^t = ${p} × (1.${r})² = ${amount}. CI = Amount − Principal = ${amount} − ${p} = ₹${ci}.`,
      shortcut: `CI = P[(1 + r/100)^t − 1] = ${p} × [(${(1 + r/100).toFixed(2)})² − 1] = ₹${ci}.`,
      topic: "Simple & Compound Interest",
      category: "quantitative",
      commonMistakes: ["Using simple interest instead of compound interest", "Adding interest without compounding"],
    };
  } else if (archetype === 2) {
    // CI - SI difference over 2 years
    const p = 10000 + ((qSeed * 211) % 30000);
    const r = 5 + ((qSeed * 3) % 10);
    const diff = Number((p * Math.pow(r / 100, 2)).toFixed(2));
    return {
      text: `${prefix} The difference between compound interest and simple interest on a principal of ₹${p.toLocaleString()} for 2 years at ${r}% per annum is:`,
      correctVal: `₹${diff.toLocaleString()}`,
      distractors: [`₹${Math.round(p * r / 100).toLocaleString()}`, `₹${(diff + 150).toLocaleString()}`, `₹${Math.round(diff * 1.5).toLocaleString()}`],
      explanation: `Difference for 2 years = P × (r/100)² = ${p} × (${r}/100)² = ${diff}.`,
      shortcut: `CI − SI (2 yrs) = P(r/100)² = ${p} × ${r}²/10000 = ₹${diff}.`,
      topic: "Simple & Compound Interest",
      category: "quantitative",
      commonMistakes: ["Dividing the difference by 3", "Ignoring the square of the rate"],
    };
  } else if (archetype === 3) {
    // CI - SI difference over 3 years
    const p = 5000 + ((qSeed * 191) % 15000);
    const r = 8 + ((qSeed * 2) % 6);
    const diff = Number((p * Math.pow(r / 100, 2) * (3 + r / 100)).toFixed(2));
    return {
      text: `${prefix} For a principal of ₹${p.toLocaleString()} lent at ${r}% per annum, what is the difference between compound interest and simple interest for 3 years?`,
      correctVal: `₹${diff.toLocaleString()}`,
      distractors: [`₹${(diff + 90).toLocaleString()}`, `₹${Math.round(diff * 0.75).toLocaleString()}`, `₹${Math.round(p * r / 100 * 3).toLocaleString()}`],
      explanation: `CI − SI (3 yrs) = P × (r/100)² × (3 + r/100) = ${p} × (${r}/100)² × (3 + ${r}/100) = ${diff}.`,
      shortcut: `P(r/100)²(3 + r/100) = ${p} × ${(r / 100).toFixed(3)}² × ${(3 + r / 100).toFixed(3)} = ₹${diff}.`,
      topic: "Simple & Compound Interest",
      category: "quantitative",
      commonMistakes: ["Using the two-year formula P(r/100)²", "Adding rate three times"],
    };
  } else if (archetype === 4) {
    // Doubling at simple interest
    const n = 4 + (qSeed % 5);
    const rate = Number((100 / n).toFixed(1));
    return {
      text: `${prefix} In how many years will a sum of money double itself at ${rate}% per annum simple interest?`,
      correctVal: `${n} years`,
      distractors: [`${n + 2} years`, `${n - 1} years`, `${Math.round(n * 1.5)} years`],
      explanation: `For money to double, interest earned = principal: (P × R × T)/100 = P ⇒ T = 100/R = 100/${rate} = ${n} years.`,
      shortcut: `T = 100 / R = 100 / ${rate} = ${n} years.`,
      topic: "Simple & Compound Interest",
      category: "quantitative",
      commonMistakes: ["Using T = R × 100", "Treating interest as twice the principal"],
    };
  } else if (archetype === 5) {
    // Amount in SI after different years
    const yearly = 400 + ((qSeed * 97) % 900);
    const principalFinal = 5000 + ((qSeed * 71) % 10000);
    const amt2 = principalFinal + 2 * yearly;
    const amt4 = principalFinal + 4 * yearly;
    return {
      text: `${prefix} A sum of money at simple interest amounts to ₹${amt2.toLocaleString()} in 2 years and ₹${amt4.toLocaleString()} in 4 years. What is the original principal?`,
      correctVal: `₹${principalFinal.toLocaleString()}`,
      distractors: [`₹${(principalFinal + yearly).toLocaleString()}`, `₹${(principalFinal - yearly).toLocaleString()}`, `₹${Math.round(principalFinal * 0.85).toLocaleString()}`],
      explanation: `Interest from year 2 to year 4 = ₹${amt4.toLocaleString()} − ₹${amt2.toLocaleString()} = ₹${(2 * yearly).toLocaleString()}, so yearly SI = ₹${yearly}. Principal = amount after 2 years − 2 × SI = ₹${amt2.toLocaleString()} − ₹${(2 * yearly).toLocaleString()} = ₹${principalFinal.toLocaleString()}.`,
      shortcut: `Yearly SI = (₹${amt4.toLocaleString()} − ₹${amt2.toLocaleString()}) / 2 = ₹${yearly}. Principal = ₹${amt2.toLocaleString()} − 2 × ${yearly} = ₹${principalFinal.toLocaleString()}.`,
      topic: "Simple & Compound Interest",
      category: "quantitative",
      commonMistakes: ["Dividing the difference by 4 instead of 2", "Subtracting only one year's interest"],
    };
  } else if (archetype === 6) {
    // Quarterly compounding
    const p = 40000 + ((qSeed * 173) % 30000);
    const r = 8 + ((qSeed * 2) % 8);
    const amount = Number((p * Math.pow(1 + r / 400, 4)).toFixed(2));
    const interest = Number((amount - p).toFixed(2));
    return {
      text: `${prefix} An amount of ₹${p.toLocaleString()} is invested at ${r}% per annum compounded quarterly for one year. What is the compound interest earned?`,
      correctVal: `₹${interest.toLocaleString()}`,
      distractors: [`₹${Math.round(p * r / 100).toLocaleString()}`, `₹${Math.round(interest * 1.5).toLocaleString()}`, `₹${Math.round(interest * 0.85).toLocaleString()}`],
      explanation: `Quarterly rate = ${r}/4 = ${(r / 4).toFixed(1)}%. Amount = P(1 + r/400)⁴ = ${p} × (${(1 + r / 400).toFixed(4)})⁴ = ${Number(amount.toFixed(0)).toLocaleString()}. CI = ₹${interest.toLocaleString()}.`,
      shortcut: `Quarterly comp.: Amount = P(1 + r/400)⁴. Interest = ${interest.toLocaleString()}.`,
      topic: "Simple & Compound Interest",
      category: "quantitative",
      commonMistakes: ["Compounding annually instead of quarterly", "Using rate as if per quarter directly"],
    };
  } else {
    // Principal from simple interest amounts
    const p = 6000 + ((qSeed * 157) % 12000);
    const r = 5 + ((qSeed * 3) % 11);
    const t = 3;
    const amount = Number((p * (1 + (r * t) / 100)).toFixed(0));
    return {
      text: `${prefix} A loan with simple interest at ${r}% per annum amounts to ₹${amount.toLocaleString()} after ${t} years. What is the principal amount of the loan?`,
      correctVal: `₹${p.toLocaleString()}`,
      distractors: [`₹${(p + 500).toLocaleString()}`, `₹${(p - 400).toLocaleString()}`, `₹${Math.round(p * 0.9).toLocaleString()}`],
      explanation: `Amount = P(1 + RT/100) ⇒ P = ${amount} / (1 + ${r * t}/100) = ${amount} / ${(1 + (r * t) / 100).toFixed(2)} = ₹${p.toLocaleString()}.`,
      shortcut: `P = Amount × 100 / (100 + RT) = ${amount} × 100 / ${100 + r * t} = ₹${p.toLocaleString()}.`,
      topic: "Simple & Compound Interest",
      category: "quantitative",
      commonMistakes: ["Subtracting interest from amount incorrectly", "Applying the formula to the amount directly"],
    };
  }
}

export function generateRatioQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 67 + testNum * 37;

  if (archetype === 0) {
    // Share of amount in a:b:c
    const a = 2;
    const b = 3;
    const c = 5;
    const total = 50000 + ((qSeed * 211) % 40000);
    const shareB = Number((total * (b / (a + b + c))).toFixed(0));
    return {
      text: `${prefix} A startup's annual profit of ₹${total.toLocaleString()} is shared among three founders in the ratio ${a}:${b}:${c}. What is the share of the second founder?`,
      correctVal: `₹${shareB.toLocaleString()}`,
      distractors: [`₹${Math.round(total * 0.2).toLocaleString()}`, `₹${(shareB + 3000).toLocaleString()}`, `₹${(shareB - 2500).toLocaleString()}`],
      explanation: `Total parts = ${a + b + c}. Share = ${b} / ${a + b + c} × ${total} = ₹${shareB.toLocaleString()}.`,
      shortcut: `Fraction = ${b}/${a + b + c}. Share = ${total} × ${b}/${a + b + c}.`,
      topic: "Ratio & Proportion",
      category: "quantitative",
      commonMistakes: ["Using the first ratio value instead of the requested one", "Dividing by total from wrong ratio"],
    };
  } else if (archetype === 1) {
    // Combined ratio a:b and b:c
    const a = 4;
    const b = 5;
    const c = 6;
    const total = 45000 + ((qSeed * 191) % 35000);
    const mult = Math.round(total / (a + b + c));
    const shareA = a * mult;
    return {
      text: `${prefix} If A : B = ${a}:${b} and B : C = ${b}:${c}, and the sum of ₹${total.toLocaleString()} is divided among A, B and C, what is A's share?`,
      correctVal: `₹${shareA.toLocaleString()}`,
      distractors: [`₹${Math.round(total * 0.4).toLocaleString()}`, `₹${(shareA + 2000).toLocaleString()}`, `₹${(shareA - 1500).toLocaleString()}`],
      explanation: `A:B:C = ${a}:${b}:${c}. One unit = ${total} / ${a + b + c} = ₹${mult.toLocaleString()}. A's share = ${a} × ${mult} = ₹${shareA.toLocaleString()}.`,
      shortcut: `Combine ratios: A:B:C = ${a}:${b}:${c}. A's share = ${a}/(${a + b + c}) × ${total}.`,
      topic: "Ratio & Proportion",
      category: "quantitative",
      commonMistakes: ["Adding ratios of A:B and B:C directly", "Rounding the unit value incorrectly"],
    };
  } else if (archetype === 2) {
    // Ages ratio (now and after t years)
    const rOld = 5;
    const rNew = 3;
    const t = 4;
    const mult = 2 + (qSeed % 4);
    const ageA = rOld * mult;
    const ageB = rNew * mult;
    const futureRatio = ratioSimplify(ageA + t, ageB + t);
    return {
      text: `${prefix} The present ages of two brothers are in the ratio ${rOld}:${rNew}. Four years from now the ratio of their ages will be ${futureRatio}. What are their present ages?`,
      correctVal: `${ageA} and ${ageB} years`,
      distractors: [`${ageA - 4} and ${ageB + 4} years`, `${ageB} and ${ageA} years`, `${ageA + t} and ${ageB + t} years`],
      explanation: `Let ages be ${rOld}k and ${rNew}k. After ${t} years: (${rOld}k + ${t}) : (${rNew}k + ${t}) = ${futureRatio}, which gives k = ${mult}. Ages = ${ageA} and ${ageB}.`,
      shortcut: `Solve (${rOld}k + ${t}):(${rNew}k + ${t}) = ${futureRatio} → k = ${mult}. Ages = ${ageA} and ${ageB}.`,
      topic: "Ratio & Proportion",
      category: "quantitative",
      commonMistakes: ["Adding years to the ratio numbers rather than ages", "Assuming age difference changes"],
    };
  } else if (archetype === 3) {
    // Numbers from ratio and difference
    const a = 7;
    const b = 4;
    const diff = 90 + ((qSeed * 53) % 300);
    const unit = Math.round(diff / (a - b));
    const x = a * unit;
    const y = b * unit;
    return {
      text: `${prefix} Two positive integers are in the ratio ${a}:${b}. If their difference is ${diff}, what is the larger number?`,
      correctVal: `${x}`,
      distractors: [`${y}`, `${x + unit}`, `${x - unit}`],
      explanation: `Difference of ratio parts = ${a - b}. One unit = ${diff} / ${a - b} = ${unit}. Larger number = ${a} × ${unit} = ${x}.`,
      shortcut: `Unit = Diff / (a − b) = ${diff} / ${a - b} = ${unit}. Larger = ${a} × ${unit} = ${x}.`,
      topic: "Ratio & Proportion",
      category: "quantitative",
      commonMistakes: ["Dividing the difference by the larger ratio", "Adding the difference to the smaller number"],
    };
  } else if (archetype === 4) {
    // Transfer of money changes ratio
    const total = 1800 + ((qSeed * 37) % 1800);
    const partA = Math.round(total * 3 / 8);
    const partB = total - partA;
    const give = 100 + ((qSeed * 11) % Math.max(80, partA - 120));
    const newA = partA - give;
    const newB = partB + give;
    return {
      text: `${prefix} A sum of ₹${total.toLocaleString()} is divided between two partners in the ratio 3:5. If the first partner then gives ₹${give.toLocaleString()} to the second, what is the new ratio of their amounts?`,
      correctVal: ratioSimplify(newA, newB),
      distractors: [`3 : 5`, `${ratioSimplify(newB, newA)}`, `1 : 2`],
      explanation: `First partner originally = ₹${partA.toLocaleString()}, second = ₹${partB.toLocaleString()}. After transfer: ${newA} : ${newB}, which simplifies to ${ratioSimplify(newA, newB)}.`,
      shortcut: `New ratio = (${newA}) : (${newB}) = ${ratioSimplify(newA, newB)} after dividing by the HCF.`,
      topic: "Ratio & Proportion",
      category: "quantitative",
      commonMistakes: ["Swapping the order of the ratio", "Forgetting the transfer changes both amounts"],
    };
  } else if (archetype === 5) {
    // Coin count from ratio and total value
    const v1 = 1;
    const v2 = 2;
    const a = 3;
    const b = 1;
    const totalVal = 500 + ((qSeed * 29) % 400);
    const k = Math.round(totalVal / (a * v1 + b * v2));
    const count1 = a * k;
    const count2 = b * k;
    return {
      text: `${prefix} A piggy bank contains only ₹1 and ₹2 coins in the ratio ${a}:${b}. If the total value of the coins is ₹${totalVal}, how many ₹1 coins are there?`,
      correctVal: `${count1}`,
      distractors: [`${count2}`, `${count1 + count2}`, `${count1 - a}`],
      explanation: `One set = ${a} × 1 + ${b} × 2 = ₹${a * v1 + b * v2}. Number of sets = ${totalVal} / ${a * v1 + b * v2} = ${k}. ₹1 coins = ${a} × ${k} = ${count1}.`,
      shortcut: `Sets = Total value / (${a}×1 + ${b}×2) = ${k}. ₹1 coins = ${a} × ${k} = ${count1}.`,
      topic: "Ratio & Proportion",
      category: "quantitative",
      commonMistakes: ["Using the total value directly as the count", "Mixing up which coin has which ratio"],
    };
  } else if (archetype === 6) {
    // x:y and (x+k):(y+k) ratio
    const a = 2;
    const b = 3;
    const k = 4;
    const unit = 3 + (qSeed % 5);
    const x = a * unit;
    const y = b * unit;
    return {
      text: `${prefix} Two numbers are in the ratio ${a}:${b}. If ${k} is added to each, the new numbers are in the ratio ${(a * unit + k)}:${(b * unit + k)}. What is the sum of the original numbers?`,
      correctVal: `${x + y}`,
      distractors: [`${x + y + 4}`, `${x + y - 4}`, `${x * y}`],
      explanation: `Let numbers be ${a}U and ${b}U. Then (${a}U + ${k}) / (${b}U + ${k}) = ${a * unit + k} / ${b * unit + k} ⇒ U = ${unit}. Sum = ${x} + ${y} = ${x + y}.`,
      shortcut: `Solve (${a}U+${k}):(${b}U+${k}) = ${a * unit + k}:${b * unit + k} to get U=${unit}. Sum = ${x + y}.`,
      topic: "Ratio & Proportion",
      category: "quantitative",
      commonMistakes: ["Adding k to the ratio values instead of the numbers", "Finding the smaller number only"],
    };
  } else {
    // Incomes & savings (ratio of expenditures)
    const incA = 5 + (qSeed % 3);
    const incB = incA - 2;
    const unitInc = 1000 + ((qSeed * 43) % 2000);
    const incomeA = incA * unitInc;
    const incomeB = incB * unitInc;
    const save = unitInc;
    const expRatio = ratioSimplify(incomeA - save, incomeB - save);
    return {
      text: `${prefix} The monthly incomes of two employees are in the ratio ${incA}:${incB} and each saves ₹${save.toLocaleString()} per month. If the common unit of the scale is ₹${unitInc.toLocaleString()}, what is the ratio of their expenditures?`,
      correctVal: expRatio,
      distractors: [`${incA}:${incB}`, "1 : 1", `${expRatio.split(":").reverse().join(":")}`],
      explanation: `Incomes = ₹${incomeA.toLocaleString()} and ₹${incomeB.toLocaleString()}. Both save ₹${save.toLocaleString()}. Expenditures = ${(incomeA - save).toLocaleString()} : ${(incomeB - save).toLocaleString()} = ${expRatio}.`,
      shortcut: `Expenditure = Income − Saving → ${expRatio}.`,
      topic: "Ratio & Proportion",
      category: "quantitative",
      commonMistakes: ["Subtracting ratio terms directly", "Reversing the expenditure ratio"],
    };
  }
}

export function generateAverageQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 71 + testNum * 31;

  if (archetype === 0) {
    // Find the missing number
    const n = [5, 6, 7][qSeed % 3];
    const avg = 50 + ((qSeed * 3) % 30);
    const known: number[] = [];
    for (let k = 0; k < n - 1; k++) {
      known.push(30 + ((qSeed * (k + 1) * 7) % 50));
    }
    const missing = n * avg - known.reduce((a, b) => a + b, 0);
    return {
      text: `${prefix} The average of ${n} numbers is ${avg}. ${n - 1} of the numbers are ${known.join(", ")}. What is the remaining number?`,
      correctVal: `${missing}`,
      distractors: [`${missing + n}`, `${missing - n}`, `${avg}`],
      explanation: `Sum of all = ${n} × ${avg} = ${n * avg}. Sum of known = ${known.reduce((a, b) => a + b, 0)}. Remaining = ${n * avg} − ${known.reduce((a, b) => a + b, 0)} = ${missing}.`,
      shortcut: `Missing = Total − Sum(known) = ${n * avg} − ${known.reduce((a, b) => a + b, 0)} = ${missing}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Dividing the known sum by n", "Subtracting the average instead of the sum"],
    };
  } else if (archetype === 1) {
    // Weighted average
    const n1 = 30 + ((qSeed * 5) % 25);
    const n2 = 40 + ((qSeed * 7) % 30);
    const avg1 = 65 + ((qSeed * 2) % 20);
    const avg2 = 50 + ((qSeed * 3) % 20);
    const weighted = Number((((n1 * avg1 + n2 * avg2) / (n1 + n2))).toFixed(1));
    return {
      text: `${prefix} In a batch of ${n1 + n2} candidates, ${n1} scored an average of ${avg1} and ${n2} scored an average of ${avg2}. What is the overall average score?`,
      correctVal: `${weighted}`,
      distractors: [`${Number(((avg1 + avg2) / 2).toFixed(1))}`, `${Number((weighted + 3).toFixed(1))}`, `${Number((weighted - 4).toFixed(1))}`],
      explanation: `Overall = (${n1} × ${avg1} + ${n2} × ${avg2}) / (${n1} + ${n2}) = ${n1 * avg1 + n2 * avg2} / ${n1 + n2} = ${weighted}.`,
      shortcut: `Weighted mean = (${n1}×${avg1} + ${n2}×${avg2}) / ${n1 + n2} = ${weighted}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Taking the simple mean of the two averages", "Using the wrong group sizes"],
    };
  } else if (archetype === 2) {
    // Average of first n even numbers
    const n = 8 + (qSeed % 15);
    const avgEv = n + 1;
    const sum = n * (n + 1);
    return {
      text: `${prefix} What is the average of the first ${n} even natural numbers?`,
      correctVal: `${avgEv}`,
      distractors: [`${n}`, `${n + 2}`, `${Math.round(sum / Math.max(1, n) + 1)}`],
      explanation: `First ${n} even numbers: 2, 4, …, ${2 * n}. Sum = ${n}(${n} + 1) = ${sum}. Average = ${sum} / ${n} = ${avgEv}.`,
      shortcut: `Average of first n even numbers = n + 1 = ${n + 1}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Answering n", "Using the odd-number formula n"],
    };
  } else if (archetype === 3) {
    // Misread value correction
    const n = 6 + (qSeed % 5);
    const wrong = 25 + (qSeed % 25);
    const right = wrong + 10 + ((qSeed * 3) % 30);
    const origAvg = 50 + (qSeed % 20);
    const correctAvg = Number((origAvg + (right - wrong) / n).toFixed(1));
    return {
      text: `${prefix} The average of ${n} numbers is ${origAvg}. On checking, one number ${wrong} was misread as ${right}. What is the corrected average?`,
      correctVal: `${correctAvg}`,
      distractors: [`${Number((origAvg - (right - wrong) / n).toFixed(1))}`, `${origAvg}`, `${Number((origAvg + (right - wrong)).toFixed(1))}`],
      explanation: `Clerical error = ${right} − ${wrong} = ${right - wrong} (overstated). Corrected sum = sum − ${right - wrong}. Corrected average = ${origAvg} − ${right - wrong}/${n} = ${correctAvg}.`,
      shortcut: `Corrected average = given average − (wrong − right)/n = ${correctAvg}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Adding instead of subtracting the error effect", "Dividing the error by the wrong group size"],
    };
  } else if (archetype === 4) {
    // New value added
    const n = 4 + (qSeed % 4);
    const avgBefore = 45 + ((qSeed * 7) % 25);
    const newVal = avgBefore + 15 + (qSeed % 15);
    const newAvg = Number((((n * avgBefore + newVal) / (n + 1))).toFixed(1));
    return {
      text: `${prefix} The average of ${n} sprint completion times is ${avgBefore} seconds. If a new sprint finishes in ${newVal} seconds, what is the new average?`,
      correctVal: `${newAvg}`,
      distractors: [`${Number(((newAvg + 2).toFixed(1)))}`, `${Number(((avgBefore + (newVal - avgBefore) / n).toFixed(1)))}`, `${newVal}`],
      explanation: `New sum = ${n} × ${avgBefore} + ${newVal} = ${n * avgBefore + newVal}. New average = ${n * avgBefore + newVal} / ${n + 1} = ${newAvg}.`,
      shortcut: `New average = (old sum + new value) / (n + 1) = ${newAvg}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Dividing by n instead of n+1", "Using the difference between the value and average"],
    };
  } else if (archetype === 5) {
    // Remove a member
    const n = 5 + (qSeed % 4);
    const avgA = 35 + ((qSeed * 3) % 25);
    const removed = avgA + 10 + (qSeed % 15);
    const newAvg = Number((((n * avgA - removed) / (n - 1))).toFixed(1));
    return {
      text: `${prefix} The average age of a team of ${n} members is ${avgA} years. If a member aged ${removed} leaves the team, what is the new average age of the remaining team members?`,
      correctVal: `${newAvg}`,
      distractors: [`${Number(((newAvg + 3).toFixed(1)))}`, `${avgA}`, `${Number(((newAvg - 2).toFixed(1)))}`],
      explanation: `Old total = ${n} × ${avgA} = ${n * avgA}. New total = ${n * avgA} − ${removed} = ${n * avgA - removed}. New average = ${n * avgA - removed} / ${n - 1} = ${newAvg}.`,
      shortcut: `New average = (${n}×${avgA} − ${removed}) / ${n - 1} = ${newAvg}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Dividing by the original count n", "Forgetting the removed member's age"],
    };
  } else if (archetype === 6) {
    // Average of consecutive integers
    const start = 10 + (qSeed % 20);
    const count = [7, 9, 11, 13, 15][qSeed % 5];
    const avg = start + (count - 1) / 2;
    return {
      text: `${prefix} What is the average of the ${count} consecutive integers from ${start} to ${start + count - 1}?`,
      correctVal: `${avg}`,
      distractors: [`${start}`, `${start + count - 1}`, `${start + Math.floor(count / 2) + 2}`],
      explanation: `Average of consecutive integers = (first + last) / 2 = (${start} + ${start + count - 1}) / 2 = ${start + (count - 1) / 2}.`,
      shortcut: `Average = middle term = ${start + (count - 1) / 2}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Answering the first term", "Answering the last term"],
    };
  } else {
    // One observation replaced
    const n = 5 + (qSeed % 4);
    const origAvg = 50 + ((qSeed * 5) % 20);
    const oldVal = 30 + (qSeed % 30);
    const newVal = oldVal + 15 + (qSeed % 15);
    const newAvg = Number((((n * origAvg - oldVal + newVal) / n)).toFixed(1));
    return {
      text: `${prefix} The average of ${n} numbers is ${origAvg}. If one of the numbers, ${oldVal}, is replaced by ${newVal}, what is the new average?`,
      correctVal: `${newAvg}`,
      distractors: [`${origAvg}`, `${Number((newAvg + 3).toFixed(1))}`, `${Number((newAvg - 2).toFixed(1))}`],
      explanation: `Old sum = ${n} × ${origAvg} = ${n * origAvg}. New sum = ${n * origAvg} − ${oldVal} + ${newVal} = ${n * origAvg - oldVal + newVal}. New average = ${n * origAvg - oldVal + newVal} / ${n} = ${newAvg}.`,
      shortcut: `New average = old average + (new value − old value)/n = ${origAvg} + (${newVal - oldVal})/${n} = ${newAvg}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Adding the difference to the total instead of the average", "Dividing by n+1 instead of n"],
    };
  }
}

export function generateMixtureQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 73 + testNum * 41;

  if (archetype === 0) {
    // Alligation (two-priced commodities)
    const poor = 10 + (qSeed % 10);
    const rich = poor + 10 + ((qSeed * 2) % 15);
    const mean = poor + 3 + (qSeed % Math.max(2, rich - poor - 4));
    const r1 = rich - mean;
    const r2 = mean - poor;
    return {
      text: `${prefix} In what ratio should two varieties of tea priced at ₹${poor} and ₹${rich} per kg be mixed to obtain a blend worth ₹${mean} per kg?`,
      correctVal: `${simplifyRatio(r2, r1)}`,
      distractors: [`${simplifyRatio(r1, r2)}`, `1 : 1`, `${simplifyRatio(r1 + r2, r1)}`],
      explanation: `Alligation: (rich − mean) : (mean − poor) = ${r1} : ${r2}. Ratio of poor to rich tea = ${r2} : ${r1} = ${simplifyRatio(r2, r1)}.`,
      shortcut: `Cheaper : Dearer = (D − M) : (M − C) = ${r2} : ${r1}.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Reversing the alligation ratio", "Subtracting in the wrong order"],
    };
  } else if (archetype === 1) {
    // Add water dilutes mixture
    const base = 30 + ((qSeed * 5) % 30);
    const conc = 50 + (qSeed % 30);
    const addWater = 20 + ((qSeed * 3) % 30);
    const milkAmt = Number(((conc * base) / 100).toFixed(2));
    const newPct = Number((100 * milkAmt / (base + addWater)).toFixed(1));
    return {
      text: `${prefix} A vessel contains ${base} litres of a ${conc}% milk solution. If ${addWater} litres of water is added, what is the new milk percentage?`,
      correctVal: `${newPct}%`,
      distractors: [`${conc}%`, `${Number((newPct + 5).toFixed(1))}%`, `${Number((newPct - 4).toFixed(1))}%`],
      explanation: `Milk content = ${conc}% × ${base} = ${milkAmt} L. New total = ${base} + ${addWater} = ${base + addWater} L. New percentage = (${milkAmt} / ${base + addWater}) × 100 = ${newPct}%.`,
      shortcut: `New % = (${milkAmt} / (${base} + ${addWater})) × 100 = ${newPct}%.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Adding water to the percentage directly", "Using the initial percentage as the answer"],
    };
  } else if (archetype === 2) {
    // Remove and replace
    const vols = [40, 50, 60, 80];
    const vol = vols[qSeed % vols.length];
    const replaces = [5, 8, 10, 12];
    const replace = replaces[(qSeed >> 2) % replaces.length];
    const conc = 80 + (qSeed % 15);
    const times = 2;
    const afterOne = Number((conc * (1 - replace / vol)).toFixed(1));
    const afterTwo = Number((conc * Math.pow(1 - replace / vol, 2)).toFixed(1));
    return {
      text: `${prefix} A ${vol} litre container is full of a ${conc}% alcohol solution. ${replace} litres are removed and replaced with water, and this process is repeated twice. What is the final alcohol percentage?`,
      correctVal: `${afterTwo}%`,
      distractors: [`${afterOne}%`, `${Number((afterTwo + 5.5).toFixed(1))}%`, `${Number((afterTwo - 4).toFixed(1))}%`],
      explanation: `After each replacement, concentration = previous × (1 − ${replace}/${vol}) = previous × ${(1 - replace / vol).toFixed(2)}. After 2 operations: ${conc} × ${(1 - replace / vol).toFixed(3)}² = ${afterTwo}%.`,
      shortcut: `Final = C(1 − R/V)ⁿ = ${conc}(1 − ${replace}/${vol})² = ${afterTwo}%.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Using the removed quantity as a percentage directly", "Subtracting the removed volume each time"],
    };
  } else if (archetype === 3) {
    // Two mixtures combined
    const amtA = 15 + ((qSeed * 3) % 25);
    const amtB = 10 + ((qSeed * 5) % 25);
    const solA = 50 + (qSeed % 30);
    const solB = 20 + (qSeed % 25);
    const mixPct = Number((((amtA * solA + amtB * solB) / (amtA + amtB))).toFixed(1));
    return {
      text: `${prefix} ${amtA} litres of a ${solA}% acid solution are mixed with ${amtB} litres of a ${solB}% acid solution. What is the strength of the resulting acid mixture?`,
      correctVal: `${mixPct}%`,
      distractors: [`${Number(((solA + solB) / 2).toFixed(1))}%`, `${Number((mixPct + 5).toFixed(1))}%`, `${Number((mixPct - 6).toFixed(1))}%`],
      explanation: `Acid content = ${amtA} × ${solA}% + ${amtB} × ${solB}% = ${(amtA * solA / 100).toFixed(1)} + ${(amtB * solB / 100).toFixed(1)} L. Strength = (acid content / ${amtA + amtB}) × 100 = ${mixPct}%.`,
      shortcut: `Mixture % = ($A×a + $B×b) / ($A + $B) = ${mixPct}%.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Averaging the two percentages", "Mixing volumes weighted wrongly"],
    };
  } else if (archetype === 4) {
    // Find ratio from price using mixture
    const pureX = 120 + ((qSeed * 10) % 60);
    const pureY = 80 + ((qSeed * 5) % 30);
    const mix = pureY + 10 + (qSeed % Math.max(2, pureX - pureY - 10));
    const rX = mix - pureY;
    const rY = pureX - mix;
    return {
      text: `${prefix} Commodity X costs ₹${pureX}/kg and commodity Y costs ₹${pureY}/kg. In what ratio X and Y must be mixed so the blend is sold at no loss or gain when priced at ₹${mix}/kg?`,
      correctVal: `${simplifyRatio(rX, rY)}`,
      distractors: [`${simplifyRatio(rY, rX)}`, `1 : 1`, `${simplifyRatio(rX + rY, rX)}`],
      explanation: `Alligation: X : Y = (mix − Y) : (X − mix) = (${mix} − ${pureY}) : (${pureX} − ${mix}) = ${rX} : ${rY} = ${simplifyRatio(rX, rY)}.`,
      shortcut: `X : Y = (M − Y) : (X − M) = ${rX} : ${rY}.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Reversing the ratio", "Subtracting mix price in the wrong order"],
    };
  } else if (archetype === 5) {
    // Alloys weight ratio
    const p1 = 60 + (qSeed % 25);
    const p2 = 20 + (qSeed % 20);
    const target = p2 + 10 + (qSeed % Math.max(2, p1 - p2 - 15));
    const rHigh = Math.abs(target - p2);
    const rLow = Math.abs(p1 - target);
    return {
      text: `${prefix} Alloy A contains ${p1}% copper and Alloy B contains ${p2}% copper. In what ratio should A and B be melted together to obtain an alloy with ${target}% copper?`,
      correctVal: `${simplifyRatio(rHigh, rLow)}`,
      distractors: [`${simplifyRatio(rLow, rHigh)}`, `1 : 1`, `${simplifyRatio(rHigh + rLow, rHigh)}`],
      explanation: `Alligation: A : B = (target − ${p2}) : (${p1} − target) = ${rHigh} : ${rLow} = ${simplifyRatio(rHigh, rLow)}.`,
      shortcut: `Difference from mean rule: A : B = ${simplifyRatio(rHigh, rLow)}.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Subtracting in the wrong order", "Averaging the copper percentages"],
    };
  } else if (archetype === 6) {
    // Replacing fraction of mixture
    const conc = 60 + (qSeed % 30);
    const times = 2;
    const fracs = [0.2, 0.25, 0.3, 0.4];
    const frac = fracs[qSeed % fracs.length];
    const finalConc = Number((conc * Math.pow(1 - frac, times)).toFixed(1));
    return {
      text: `${prefix} A container has a ${conc}% strength solution. Each time, ${Math.round(frac * 100)}% of the liquid is drawn off and replaced with water, done ${times} times. What is the final strength?`,
      correctVal: `${finalConc}%`,
      distractors: [`${conc}%`, `${Number((finalConc + 10).toFixed(1))}%`, `${Number((finalConc * 0.8).toFixed(1))}%`],
      explanation: `Strength = C(1 − f)ⁿ = ${conc} × (1 − ${frac})² = ${conc} × ${(1 - frac).toFixed(2)}² = ${finalConc}%.`,
      shortcut: `C × (remaining fraction)ⁿ = ${conc} × ${(1 - frac).toFixed(2)}² = ${finalConc}%.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Subtracting the drawn-off percentage directly", "Raising the drawn-off fraction instead of remaining"],
    };
  } else {
    // Gain on selling mixture
    const cp = 40 + (qSeed % 30);
    const gainPct = 15 + (qSeed % 20);
    const sp = Number((cp * (1 + gainPct / 100)).toFixed(0));
    return {
      text: `${prefix} A milkman mixes water in milk such that the effective cost price of the mixture is ₹${cp} per litre. If he wishes to earn a profit of ${gainPct}%, at what price per litre should he sell the mixture?`,
      correctVal: `₹${sp.toLocaleString()}`,
      distractors: [`₹${(sp + 5).toLocaleString()}`, `₹${Math.round(cp * 1.1).toLocaleString()}`, `₹${(sp - 8).toLocaleString()}`],
      explanation: `SP = CP × (1 + gain/100) = ${cp} × ${(1 + gainPct / 100).toFixed(2)} = ₹${sp}.`,
      shortcut: `SP = CP × ${(100 + gainPct)}/100 = ${sp}.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Adding the percentage to the cost price directly", "Calculating profit over selling price"],
    };
  }
}

export function generateProbabilityQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 79 + testNum * 53;

  if (archetype === 0) {
    // Single coin tosses
    const coinVariants = [
      { n: 2, condition: "at least one head", ans: "3/4", comp: "1/4", dist: ["1/4", "1/2", "3/8"] },
      { n: 3, condition: "at least one head", ans: "7/8", comp: "1/8", dist: ["1/8", "1/2", "3/4"] },
      { n: 4, condition: "at least one head", ans: "15/16", comp: "1/16", dist: ["1/16", "7/8", "1/2"] },
      { n: 5, condition: "at least one head", ans: "31/32", comp: "1/32", dist: ["1/32", "15/16", "3/4"] },
      { n: 2, condition: "exactly one head", ans: "1/2", comp: "1/2", dist: ["1/4", "3/4", "1/3"] },
      { n: 3, condition: "exactly two heads", ans: "3/8", comp: "5/8", dist: ["1/2", "1/4", "5/8"] },
      { n: 3, condition: "all heads or all tails", ans: "1/4", comp: "3/4", dist: ["1/8", "1/2", "3/8"] },
      { n: 4, condition: "at least one tail", ans: "15/16", comp: "1/16", dist: ["1/16", "7/8", "1/2"] },
      { n: 3, condition: "at least one tail", ans: "7/8", comp: "1/8", dist: ["1/8", "1/2", "3/4"] }
    ];
    const cv = coinVariants[qSeed % coinVariants.length];
    return {
      text: `${prefix} ${cv.n} fair coins are tossed simultaneously. What is the probability of obtaining ${cv.condition}?`,
      correctVal: cv.ans,
      distractors: cv.dist,
      explanation: `Total outcomes for tossing ${cv.n} coins = 2^${cv.n} = ${Math.pow(2, cv.n)}. The probability of ${cv.condition} is ${cv.ans}.`,
      shortcut: `Using binomial or complement principle: P = ${cv.ans}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Answering 1/2 without evaluating all cases", "Forgetting to evaluate the complement"]
    };
  } else if (archetype === 1) {
    // Two dice sum
    const diceSums = [
      { sum: 4, fav: 3 },
      { sum: 5, fav: 4 },
      { sum: 6, fav: 5 },
      { sum: 7, fav: 6 },
      { sum: 8, fav: 5 },
      { sum: 9, fav: 4 },
      { sum: 10, fav: 3 },
      { sum: 11, fav: 2 },
      { sum: 3, fav: 2 },
      { sum: 12, fav: 1 }
    ];
    const d = diceSums[qSeed % diceSums.length];
    return {
      text: `${prefix} Two fair dice are rolled together. What is the probability that the sum of the numbers appearing is ${d.sum}?`,
      correctVal: `${d.fav}/36`,
      distractors: [`${d.fav + 1}/36`, `${Math.max(1, d.fav - 1)}/36`, `1/6`].filter(x => x !== `${d.fav}/36`).slice(0, 3),
      explanation: `Favourable pairs for sum ${d.sum}: ${d.fav} cases. Total outcomes = 36. P = ${d.fav}/36.`,
      shortcut: `Favourable outcomes = ${d.fav}. P = ${d.fav}/36.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Counting ordered pairs incorrectly", "Using 6 × 6 = 12 as the denominator"],
    };
  } else if (archetype === 2) {
    // Cards
    const cardTypes = [
      { type: "face card (Jack, Queen, or King)", fav: 12, ans: "3/13" },
      { type: "spade", fav: 13, ans: "1/4" },
      { type: "heart", fav: 13, ans: "1/4" },
      { type: "diamond", fav: 13, ans: "1/4" },
      { type: "club", fav: 13, ans: "1/4" },
      { type: "ace", fav: 4, ans: "1/13" },
      { type: "red card", fav: 26, ans: "1/2" },
      { type: "black card", fav: 26, ans: "1/2" },
      { type: "king or a queen", fav: 8, ans: "2/13" },
      { type: "red face card", fav: 6, ans: "3/26" },
      { type: "black ace", fav: 2, ans: "1/26" },
      { type: "numbered card (between 2 and 10 inclusive)", fav: 36, ans: "9/13" }
    ];
    const ct = cardTypes[qSeed % cardTypes.length];
    return {
      text: `${prefix} A card is drawn at random from a well-shuffled deck of 52 cards. What is the probability that it is a ${ct.type}?`,
      correctVal: ct.ans,
      distractors: [`1/13`, `1/4`, `1/2`, `2/13`, `3/26`].filter(d => d !== ct.ans).slice(0, 3),
      explanation: `There are ${ct.fav} favourable cards out of 52. P = ${ct.fav}/52 = ${ct.ans}.`,
      shortcut: `P = favourable / 52 = ${ct.ans}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Miscounting cards of the given type", "Using the wrong deck count"],
    };
  } else if (archetype === 3) {
    // Balls from bag
    const colorSets = [
      ["red", "blue", "green"],
      ["white", "black", "yellow"],
      ["crimson", "sapphire", "emerald"],
      ["ruby", "amber", "jade"]
    ];
    const colors = colorSets[qSeed % colorSets.length];
    const c1 = 2 + (qSeed % 3);
    const c2 = 3 + ((qSeed * 2) % 3);
    const c3 = 3 + ((qSeed * 3) % 3);
    const total = c1 + c2 + c3;
    const fav = nCr(c1, 2) + nCr(c2, 2) + nCr(c3, 2);
    const all = nCr(total, 2);
    return {
      text: `${prefix} A bag contains ${c1} ${colors[0]}, ${c2} ${colors[1]} and ${c3} ${colors[2]} balls. Two balls are drawn at random. What is the probability that both balls are of the same colour?`,
      correctVal: `${fav}/${all}`,
      distractors: [`${nCr(c1, 2)}/${all}`, `1/2`, `1/3`],
      explanation: `Total ways = C(${total}, 2) = ${all}. Same colour = C(${c1},2) + C(${c2},2) + C(${c3},2) = ${fav}. P = ${fav}/${all}.`,
      shortcut: `P = [C(c1,2) + C(c2,2) + C(c3,2)] / C(total,2) = ${fav}/${all}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Counting the draw order twice", "Forgetting third colour balls contribute to same-colour cases"],
    };
  } else if (archetype === 4) {
    // Complement via "at least one" of multiples
    const dieScenarios = [
      { throws: 2, target: "a multiple of 3", num: 5, den: 9, dist: ["4/9", "1/3", "2/9"] },
      { throws: 3, target: "a multiple of 3", num: 19, den: 27, dist: ["8/27", "1/9", "7/27"] },
      { throws: 2, target: "an even number", num: 3, den: 4, dist: ["1/4", "1/2", "3/8"] },
      { throws: 3, target: "an even number", num: 7, den: 8, dist: ["1/8", "3/4", "1/2"] },
      { throws: 2, target: "a 6", num: 11, den: 36, dist: ["25/36", "1/6", "5/36"] },
      { throws: 2, target: "a number strictly greater than 4", num: 5, den: 9, dist: ["4/9", "1/3", "2/9"] },
      { throws: 3, target: "a number strictly greater than 4", num: 19, den: 27, dist: ["8/27", "1/9", "7/27"] }
    ];
    const ds = dieScenarios[qSeed % dieScenarios.length];
    return {
      text: `${prefix} An unbiased die is thrown ${ds.throws} times. What is the probability of obtaining ${ds.target} at least once?`,
      correctVal: `${ds.num}/${ds.den}`,
      distractors: ds.dist,
      explanation: `Using complement: P(at least once) = 1 − P(none in ${ds.throws} throws) = ${ds.num}/${ds.den}.`,
      shortcut: `1 − (fail probability)^${ds.throws} = ${ds.num}/${ds.den}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Multiplying single probability directly", "Using complement wrongly"],
    };
  } else if (archetype === 5) {
    // Committee selection
    const commScenarios = [
      { boys: 4, girls: 3, bSel: 2, gSel: 1 },
      { boys: 5, girls: 4, bSel: 2, gSel: 1 },
      { boys: 5, girls: 3, bSel: 2, gSel: 1 },
      { boys: 6, girls: 4, bSel: 2, gSel: 1 },
      { boys: 4, girls: 4, bSel: 2, gSel: 1 },
      { boys: 5, girls: 5, bSel: 2, gSel: 1 }
    ];
    const cs = commScenarios[qSeed % commScenarios.length];
    const total = cs.boys + cs.girls;
    const team = cs.bSel + cs.gSel;
    const all = nCr(total, team);
    const fav = nCr(cs.boys, cs.bSel) * nCr(cs.girls, cs.gSel);
    return {
      text: `${prefix} From a group of ${cs.boys} male engineers and ${cs.girls} female engineers, a project squad of ${team} is formed at random. What is the probability that the squad has exactly ${cs.bSel} male and ${cs.gSel} female engineers?`,
      correctVal: `${fav}/${all}`,
      distractors: [`${nCr(cs.boys, team)}/${all}`, `1/4`, `1/3`],
      explanation: `Total ways = C(${total}, ${team}) = ${all}. Favourable = C(${cs.boys},${cs.bSel}) × C(${cs.girls},${cs.gSel}) = ${nCr(cs.boys, cs.bSel)} × ${nCr(cs.girls, cs.gSel)} = ${fav}. P = ${fav}/${all}.`,
      shortcut: `P = [C(m,${cs.bSel}) × C(f,${cs.gSel})] / C(total,${team}) = ${fav}/${all}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Choosing all from one gender", "Forgetting to multiply combination branches"],
    };
  } else if (archetype === 6) {
    // Independent events (truthfulness)
    const pAPairs = [
      { pA: 3, pB: 4, out: 5 },
      { pA: 4, pB: 3, out: 5 },
      { pA: 2, pB: 3, out: 5 },
      { pA: 3, pB: 3, out: 5 },
      { pA: 4, pB: 4, out: 5 },
      { pA: 2, pB: 4, out: 5 },
      { pA: 1, pB: 4, out: 5 },
      { pA: 3, pB: 2, out: 5 }
    ];
    const pTruth = pAPairs[qSeed % pAPairs.length];
    const contrad = pTruth.pA * (5 - pTruth.pB) + (5 - pTruth.pA) * pTruth.pB;
    return {
      text: `${prefix} Candidate A speaks the truth in ${pTruth.pA} out of ${pTruth.out} cases and Candidate B speaks the truth in ${pTruth.pB} out of ${pTruth.out} cases. What is the probability that they contradict each other when narrating the same event?`,
      correctVal: `${contrad}/25`,
      distractors: [`${pTruth.pA}/5`, `1/2`, `${25 - contrad}/25`],
      explanation: `Contradiction = (A true & B false) + (A false & B true) = (${pTruth.pA}/5 × ${5 - pTruth.pB}/5) + (${5 - pTruth.pA}/5 × ${pTruth.pB}/5) = ${contrad}/25.`,
      shortcut: `P(contradict) = (${pTruth.pA}×${5 - pTruth.pB} + ${5 - pTruth.pA}×${pTruth.pB}) / 25 = ${contrad}/25.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Adding the two truth probabilities directly", "Using persistence of independence wrongly"],
    };
  } else {
    // Word/letter probability (vowel pick)
    const wordList = [
      { w: "MAHABHARATA", v: 5, l: 11 },
      { w: "ALGORITHM", v: 3, l: 9 },
      { w: "MATHEMATICS", v: 4, l: 11 },
      { w: "STATISTICS", v: 3, l: 10 },
      { w: "COMBINATION", v: 5, l: 11 },
      { w: "PROBABILITY", v: 4, l: 11 },
      { w: "DEVELOPER", v: 4, l: 9 },
      { w: "ENGINEER", v: 4, l: 8 },
      { w: "UNIVERSITY", v: 4, l: 10 },
      { w: "ARCHITECTURE", v: 5, l: 12 },
      { w: "OPTIMIZATION", v: 6, l: 12 },
      { w: "INTELLIGENCE", v: 5, l: 12 },
      { w: "DATASTRUCTURE", v: 5, l: 13 },
      { w: "PERMUTATION", v: 5, l: 11 }
    ];
    const wl = wordList[qSeed % wordList.length];
    return {
      text: `${prefix} A letter is chosen at random from the word "${wl.w}". What is the probability that it is a vowel?`,
      correctVal: `${wl.v}/${wl.l}`,
      distractors: [`${wl.l - wl.v}/${wl.l}`, `1/2`, `1/3`],
      explanation: `The word "${wl.w}" has ${wl.v} vowels out of ${wl.l} letters. P = ${wl.v}/${wl.l}.`,
      shortcut: `P = vowels / total letters = ${wl.v}/${wl.l}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Counting distinct vowels only", "Counting consonants as vowels"],
    };
  }
}

export function generatePermutationQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 83 + testNum * 59;

  if (archetype === 0) {
    // Distinct arrangements
    const nArr = [4, 5, 6, 7, 8];
    const n = nArr[qSeed % nArr.length];
    const ways = factorial(n);
    const items = [
      "distinct books on a shelf",
      "trophies in a display showcase",
      "paintings along an exhibition wall",
      "keynote speakers in an agenda line-up",
      "flags of different nations in a row",
      "executive candidates in an interview schedule",
      "distinct medals on a presentation board"
    ];
    const item = items[qSeed % items.length];
    return {
      text: `${prefix} In how many different ways can ${n} ${item} be arranged?`,
      correctVal: `${ways}`,
      distractors: [`${ways * 2}`, `${Math.round(ways / 2)}`, `${factorial(n - 1)}`],
      explanation: `Number of ways = ${n}! = ${ways}.`,
      shortcut: `${n}! = ${ways}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using n − 1 factorial", "Adding factorial terms instead of multiplying"],
    };
  } else if (archetype === 1) {
    // Repeated letters
    const words = [
      { w: "MISSISSIPPI", ans: 34650, exp: "11! / (4! × 4! × 2!)" },
      { w: "STATISTICS", ans: 50400, exp: "10! / (3! × 3! × 2!)" },
      { w: "MATHEMATICS", ans: 4989600, exp: "11! / (2! × 2! × 2!)" },
      { w: "ARRANGEMENT", ans: 2494800, exp: "11! / (2! × 2! × 2! × 2!)" },
      { w: "BANANA", ans: 60, exp: "6! / (3! × 2!)" },
      { w: "SUCCESS", ans: 420, exp: "7! / (3! × 2!)" },
      { w: "MANAGEMENT", ans: 226800, exp: "10! / (2! × 2! × 2!)" },
      { w: "PARALLEL", ans: 3360, exp: "8! / (3! × 2!)" },
      { w: "COMMITTEE", ans: 45360, exp: "9! / (2! × 2! × 2!)" },
      { w: "ASSASSIN", ans: 840, exp: "8! / (4! × 2!)" }
    ];
    const wrd = words[qSeed % words.length];
    return {
      text: `${prefix} How many distinct arrangements are possible using all the letters of the word "${wrd.w}"?`,
      correctVal: `${wrd.ans}`,
      distractors: [`${wrd.ans * 2}`, `${Math.round(wrd.ans / 2)}`, `${Math.round(wrd.ans * 1.5)}`],
      explanation: `Arrangements for "${wrd.w}" = ${wrd.exp} = ${wrd.ans}.`,
      shortcut: `Formula: n! / (p! q! r!) = ${wrd.ans}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using n! without dividing by repeated letters", "Dividing by the wrong factorial values"],
    };
  } else if (archetype === 2) {
    // Selection (combinations)
    const teams = [
      { total: 8, pick: 3, role: "developers" },
      { total: 9, pick: 4, role: "consultants" },
      { total: 10, pick: 3, role: "researchers" },
      { total: 7, pick: 3, role: "analysts" },
      { total: 8, pick: 4, role: "engineers" },
      { total: 10, pick: 4, role: "specialists" },
      { total: 12, pick: 3, role: "interns" },
      { total: 11, pick: 2, role: "team leads" }
    ];
    const tm = teams[qSeed % teams.length];
    const waysC = nCr(tm.total, tm.pick);
    return {
      text: `${prefix} From a group of ${tm.total} ${tm.role}, how many different squads of ${tm.pick} can be formed?`,
      correctVal: `${waysC}`,
      distractors: [`${waysC * 2}`, `${waysC - 8}`, `${factorial(tm.pick)}`],
      explanation: `Squad size ${tm.pick} from ${tm.total}: C(${tm.total}, ${tm.pick}) = ${waysC}.`,
      shortcut: `C(${tm.total}, ${tm.pick}) = ${waysC}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using permutation instead of combination", "Reversing the values of n and r"],
    };
  } else if (archetype === 3) {
    // Circular arrangement
    const circItems = [
      { n: 5, context: "delegates around a round conference table" },
      { n: 6, context: "directors seated at a circular boardroom table" },
      { n: 7, context: "participants seated around a circular discussion pod" },
      { n: 8, context: "team leads arranged around a circular table" },
      { n: 9, context: "panelists seated around a circular debate stage" },
      { n: 10, context: "executives seated around a circular dining table" },
      { n: 12, context: "committee members seated at a circular summit" }
    ];
    const ci = circItems[qSeed % circItems.length];
    const ways = factorial(ci.n - 1);
    return {
      text: `${prefix} In how many ways can ${ci.n} ${ci.context}?`,
      correctVal: `${ways}`,
      distractors: [`${factorial(ci.n)}`, `${ways * 2}`, `${Math.round(ways / 2)}`],
      explanation: `Circular arrangements of ${ci.n} distinct entities = (${ci.n} − 1)! = ${ways}.`,
      shortcut: `(n − 1)! = ${ways}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using n! for a circular table", "Dividing by 2 for a normal circular table"],
    };
  } else if (archetype === 4) {
    // Vowels together
    const vWords = [
      { w: "UNITED", let: 6, vow: 3, ways: 144 },
      { w: "DETAIL", let: 6, vow: 3, ways: 144 },
      { w: "DESIGN", let: 6, vow: 2, ways: 240 },
      { w: "VECTOR", let: 6, vow: 2, ways: 240 },
      { w: "ORANGE", let: 6, vow: 3, ways: 144 },
      { w: "MACHINE", let: 7, vow: 3, ways: 720 },
      { w: "SOFTWARE", let: 8, vow: 3, ways: 4320 },
      { w: "DELIGHT", let: 7, vow: 2, ways: 1440 }
    ];
    const vw = vWords[qSeed % vWords.length];
    return {
      text: `${prefix} How many distinct arrangements of the letters of the word "${vw.w}" keep all the vowels together?`,
      correctVal: `${vw.ways}`,
      distractors: [`${factorial(vw.let)}`, `${vw.ways * 2}`, `${Math.round(vw.ways / 2)}`],
      explanation: `Treat the vowels as one block and multiply internal arrangements: total = ${vw.ways}.`,
      shortcut: `Block method: (${vw.let - vw.vow + 1})! × ${vw.vow}! = ${vw.ways}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Not multiplying by the internal vowel arrangements", "Using full factorial directly"],
    };
  } else if (archetype === 5) {
    // Passwords with repetition
    const pCodes = [
      { len: 3, digits: 10, ways: 1000, desc: "3-digit numeric passcodes using digits 0-9" },
      { len: 4, digits: 10, ways: 10000, desc: "4-digit ATM PINs using digits 0-9" },
      { len: 3, digits: 6, ways: 216, desc: "3-character security keys using 6 designated digits" },
      { len: 4, digits: 6, ways: 1296, desc: "4-digit identification tokens using digits 1-6" },
      { len: 5, digits: 10, ways: 100000, desc: "5-digit verification tokens using digits 0-9" },
      { len: 3, digits: 5, ways: 125, desc: "3-digit access codes using digits 1-5" },
      { len: 4, digits: 5, ways: 625, desc: "4-digit locker codes using digits 1-5" }
    ];
    const pc = pCodes[qSeed % pCodes.length];
    return {
      text: `${prefix} How many ${pc.desc} can be formed if repetition of digits is allowed?`,
      correctVal: `${pc.ways}`,
      distractors: [`${nCr(pc.digits, pc.len)}`, `${pc.ways / 10}`, `${factorial(pc.len)}`],
      explanation: `Each of the ${pc.len} positions has ${pc.digits} choices: ${pc.digits}^${pc.len} = ${pc.ways}.`,
      shortcut: `${pc.digits}^${pc.len} = ${pc.ways}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using permutations without repetition", "Using combinations instead of arrangements"],
    };
  } else if (archetype === 6) {
    // At least one restriction
    const restr = [
      { total: 9, pick: 4, role: "engineers", spec: "lead architect" },
      { total: 8, pick: 3, role: "analysts", spec: "senior director" },
      { total: 10, pick: 4, role: "scientists", spec: "principal investigator" },
      { total: 7, pick: 3, role: "designers", spec: "creative director" },
      { total: 10, pick: 3, role: "executives", spec: "founding partner" },
      { total: 12, pick: 4, role: "officers", spec: "chief auditor" }
    ];
    const res = restr[qSeed % restr.length];
    const waysInc = nCr(res.total - 1, res.pick - 1);
    const all = nCr(res.total, res.pick);
    return {
      text: `${prefix} A committee of ${res.pick} is to be formed from ${res.total} ${res.role} such that a specific ${res.spec} MUST be included. In how many ways can this be done?`,
      correctVal: `${waysInc}`,
      distractors: [`${all}`, `${waysInc * 2}`, `${Math.max(1, waysInc - 10)}`],
      explanation: `Fix the senior member, then choose the remaining ${res.pick - 1} from the other ${res.total - 1}: C(${res.total - 1}, ${res.pick - 1}) = ${waysInc}.`,
      shortcut: `C(n−1, r−1) = C(${res.total - 1}, ${res.pick - 1}) = ${waysInc}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Computing total − bad incorrectly", "Choosing r from n−1 instead of r−1"],
    };
  } else {
    // Handshakes / pairwise interactions
    const handScenarios = [
      { n: 8, event: "board committee meeting", ans: 28 },
      { n: 9, event: "regional sales summit", ans: 36 },
      { n: 10, event: "corporate networking summit", ans: 45 },
      { n: 12, event: "tech symposium", ans: 66 },
      { n: 14, event: "executive round-table", ans: 91 },
      { n: 15, event: "founder retreat", ans: 105 },
      { n: 16, event: "industry workshop", ans: 120 },
      { n: 20, event: "alumni gathering", ans: 190 }
    ];
    const hs = handScenarios[qSeed % handScenarios.length];
    return {
      text: `${prefix} At a ${hs.event} with ${hs.n} delegates, in how many ways can every attendee shake hands with every other attendee exactly once?`,
      correctVal: `${hs.ans}`,
      distractors: [`${hs.n * hs.n}`, `${hs.ans + hs.n}`, `${hs.ans - hs.n}`],
      explanation: `Each handshake involves 2 people: C(${hs.n}, 2) = (${hs.n} × ${hs.n - 1}) / 2 = ${hs.ans}.`,
      shortcut: `n(n − 1)/2 = (${hs.n} × ${hs.n - 1}) / 2 = ${hs.ans}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using n² directly", "Forgetting to divide by 2 for pairwise handshakes"],
    };
  }
}

function cdGcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}

function simplifyRatio(a: number, b: number): string {
  const g = cdGcd(a, b);
  return `${a / g} : ${b / g}`;
}

function ratioSimplify(a: number, b: number): string {
  return simplifyRatio(a, b);
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  return factorial(n) / (factorial(r) * factorial(n - r));
}

// ============================================================================
// DATA INTERPRETATION & ANALYTICAL ARCHETYPES
// ============================================================================

export function generateDIQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 4, seed % 4);
  const qSeed = seed + qIndex * 101 + testNum * 53;

  if (archetype === 0) {
    // Revenue Growth %
    const r1 = 120 + ((qSeed * 7) % 60);
    const r2 = 180 + ((qSeed * 11) % 80);
    const pct = Number((((r2 - r1) / r1) * 100).toFixed(1));
    return {
      text: `${prefix} According to quarterly earnings records, an enterprise SaaS unit registered revenue of ₹${r1} Cr in Year 1 and ₹${r2} Cr in Year 2. What was the annual percentage growth?`,
      correctVal: `${pct}%`,
      distractors: [`${(pct + 6.2).toFixed(1)}%`, `${(pct - 5.4).toFixed(1)}%`, `${(pct + 12).toFixed(1)}%`],
      explanation: `% Growth = [(Year 2 - Year 1) / Year 1] × 100 = [(${r2} - ${r1}) / ${r1}] × 100 = ${pct}%.`,
      shortcut: `Growth = Difference / Base × 100.`,
      topic: "Tables & Data Matrices",
      category: "data-interpretation",
      commonMistakes: ["Dividing by Year 2 revenue instead of Year 1 base", "Arithmetic subtraction slips"]
    };
  } else if (archetype === 1) {
    // Pie Chart Headcount
    const total = 1600;
    const deg = 72; // 72 degrees out of 360 = 20%
    const count = Math.round(total * (deg / 360));
    return {
      text: `${prefix} In a pie chart depicting corporate staff distribution, the Machine Learning engineering division occupies an angular sector of ${deg}°. If the organization has a total headcount of ${total.toLocaleString()}, how many employees are in Machine Learning?`,
      correctVal: `${count}`,
      distractors: [`${count + 40}`, `${count - 35}`, `${count + 80}`],
      explanation: `Percentage = ${deg}° / 360° = 1/5 = 20%. Division headcount = 20% of ${total} = ${count}.`,
      shortcut: `Headcount = (${deg} / 360) × Total = (1/5) × 1600 = 320.`,
      topic: "Pie Charts",
      category: "data-interpretation",
      commonMistakes: ["Treating degrees as direct percentages (72% instead of 72/360)", "Rounding inaccuracies"]
    };
  } else if (archetype === 2) {
    // Target vs Actual Bar Chart
    const target = 500;
    const actual = 575;
    const excessPct = Number((((actual - target) / target) * 100).toFixed(1));
    return {
      text: `${prefix} In a manufacturing line bar chart, the monthly production target was set at ${target} units, but actual output reached ${actual} units. What was the percentage achievement above target?`,
      correctVal: `${excessPct}%`,
      distractors: [`${(excessPct - 3).toFixed(1)}%`, `${(excessPct + 4.5).toFixed(1)}%`, `15%`],
      explanation: `Excess % = [(Actual - Target) / Target] × 100 = [(575 - 500) / 500] × 100 = (75 / 500) × 100 = ${excessPct}%.`,
      shortcut: `75 / 500 = 15%.`,
      topic: "Bar Graphs & Line Charts",
      category: "data-interpretation",
      commonMistakes: ["Dividing by actual instead of target baseline", "Calculating total achievement (115%) instead of excess"]
    };
  } else {
    // Data Sufficiency
    return {
      text: `${prefix} Question: What is the value of positive integer x?\nStatement I: x² = 64\nStatement II: x is a prime number.`,
      correctVal: "Statement I alone is sufficient, but Statement II alone is not sufficient",
      distractors: [
        "Statement II alone is sufficient, but Statement I alone is not sufficient",
        "Both statements together are needed",
        "Neither statement is sufficient"
      ],
      explanation: `From Statement I: Since x is a positive integer, x² = 64 gives x = +8 uniquely. Thus Statement I alone is sufficient. From Statement II: x is a prime number, which allows infinitely many values (2, 3, 5, 7...), so Statement II alone is not sufficient.`,
      shortcut: `Positive integer + x²=64 uniquely determines x=8.`,
      topic: "Data Sufficiency",
      category: "data-interpretation",
      commonMistakes: ["Forgetting that x was given as a positive integer in the question stem", "Overcomplicating statement interactions"]
    };
  }
}

// ============================================================================
// MAIN DIVERSIFIED GENERATOR FOR ALL TOPIC & COMPANY TESTS
// ============================================================================

export function buildDiversifiedTopicTest(topic: string, category: string, testNum: number): GeneratedQuestion[] {
  const count = 30;
  const normalizedCategory = (category || "quantitative").toLowerCase();
  const normTopic = topic.trim().toLowerCase();
  const seed = getSeedHash(`${normTopic}-T${testNum}-${normalizedCategory}`);
  const questions: GeneratedQuestion[] = [];
  const seenTexts = new Set<string>();

  const isCompany = normalizedCategory === "company" || normalizedCategory === "company_test";

  for (let i = 1; i <= count; i++) {
    const isEasy = i <= 10;
    const isHard = i > 20;
    const diff: Difficulty = isEasy ? "easy" : isHard ? "hard" : "medium";

    let raw!: QuestionRawData;
    let cleanText = "";
    let correctIdx = 0;

    for (let attempt = 0; attempt < 20; attempt++) {
      const qIndex = i + attempt * 7;
      const qSeed = seed + (i + attempt * 37) * 113 + testNum * 19;
      correctIdx = (qSeed + i * 5) % 4;

      let candidate: QuestionRawData;

      if (isCompany) {
        const companyName = topic.trim();
        const prefix = "";

        const quantTopics = [
          "Percentages",
          "Profit & Loss",
          "Time & Work",
          "Speed & Distance",
          "Simple & Compound Interest",
          "Ratios & Proportions",
          "Averages",
          "Mixtures & Alligations",
          "Probability",
          "Permutation & Combination",
        ];

        const logicalTopics = [
          "Blood Relations",
          "Coding-Decoding",
          "Direction Sense",
          "Number Series",
          "Letter Series",
          "Seating Arrangement",
          "Syllogisms",
          "Order & Ranking",
          "Puzzles",
          "Data Sufficiency",
        ];

        const verbalTopics = [
          "Reading Comprehension",
          "Spotting Errors",
          "Sentence Correction",
          "Synonyms & Antonyms",
          "Idioms & Phrases",
          "Para Jumbles",
        ];

        const diTopics = [
          "Tables",
          "Bar Graphs & Line Charts",
          "Pie Charts",
        ];

        const analyticalTopics = [
          "Statement & Assumption",
          "Statement & Conclusion",
          "Course of Action",
        ];

        if (i <= 10) {
          const top = quantTopics[(i - 1 + (testNum - 1) * 3) % quantTopics.length];
          candidate = generateQuantTopicQuestion(top, qIndex, testNum, qSeed, prefix);
        } else if (i <= 18) {
          const top = logicalTopics[(i - 11 + (testNum - 1) * 3) % logicalTopics.length];
          candidate = generateLogicalTopicQuestion(top, qIndex, testNum, qSeed, prefix);
        } else if (i <= 24) {
          const top = verbalTopics[(i - 19 + (testNum - 1) * 2) % verbalTopics.length];
          candidate = generateVerbalTopicQuestion(top, qIndex, testNum, qSeed, prefix);
        } else if (i <= 27) {
          const top = diTopics[(i - 25 + (testNum - 1)) % diTopics.length];
          candidate = generateDITopicQuestion(top, qIndex, testNum, qSeed, prefix);
        } else {
          const top = analyticalTopics[(i - 28 + (testNum - 1)) % analyticalTopics.length];
          candidate = generateAnalyticalTopicQuestion(top, qIndex, testNum, qSeed, prefix);
        }
      } else {
        const prefix = "";
        if (
          normalizedCategory === "number_systems" ||
          normalizedCategory === "number-systems" ||
          normTopic.includes("hcf") ||
          normTopic.includes("lcm") ||
          normTopic.includes("fraction") ||
          normTopic.includes("divisib") ||
          normTopic.includes("remaind") ||
          normTopic.includes("unit") ||
          normTopic.includes("cyclic") ||
          normTopic.includes("number system")
        ) {
          candidate = generateNumberSystemsTopicQuestion(topic, qIndex, testNum, qSeed, prefix);
        } else if (
          normalizedCategory === "logical" ||
          normalizedCategory === "reasoning" ||
          normTopic.includes("puzzle") ||
          normTopic.includes("seating") ||
          normTopic.includes("blood") ||
          normTopic.includes("coding") ||
          normTopic.includes("direction") ||
          normTopic.includes("syllog") ||
          normTopic.includes("series") ||
          normTopic.includes("analogy") ||
          normTopic.includes("deduction")
        ) {
          candidate = generateLogicalTopicQuestion(topic, qIndex, testNum, qSeed, prefix);
        } else if (
          normalizedCategory === "verbal" ||
          normalizedCategory === "english" ||
          normTopic.includes("reading") ||
          normTopic.includes("grammar") ||
          normTopic.includes("vocab") ||
          normTopic.includes("sentence") ||
          normTopic.includes("jumble") ||
          normTopic.includes("blank") ||
          normTopic.includes("synonym") ||
          normTopic.includes("idiom")
        ) {
          candidate = generateVerbalTopicQuestion(topic, qIndex, testNum, qSeed, prefix);
        } else if (
          normalizedCategory === "data_interpretation" ||
          normalizedCategory === "data-interpretation" ||
          normTopic.includes("graph") ||
          normTopic.includes("chart") ||
          normTopic.includes("table") ||
          normTopic.includes("caselet") ||
          normTopic.includes("sufficiency")
        ) {
          candidate = generateDITopicQuestion(topic, qIndex, testNum, qSeed, prefix);
        } else if (
          normalizedCategory === "analytical" ||
          normTopic.includes("critical") ||
          normTopic.includes("assumption") ||
          normTopic.includes("conclusion") ||
          normTopic.includes("cause") ||
          normTopic.includes("action") ||
          normTopic.includes("argument")
        ) {
          candidate = generateAnalyticalTopicQuestion(topic, qIndex, testNum, qSeed, prefix);
        } else {
          candidate = generateQuantTopicQuestion(topic, qIndex, testNum, qSeed, prefix);
        }
      }

      let candidateClean = candidate.text.replace(/^\[[^\]]*\]\s*/, "").trim();
      if (!seenTexts.has(candidateClean)) {
        raw = candidate;
        cleanText = candidateClean;
        seenTexts.add(candidateClean);
        break;
      }

      if (attempt === 19) {
        let disambigCounter = 2;
        let finalClean = `${candidateClean} (Case ${disambigCounter})`;
        while (seenTexts.has(finalClean)) {
          disambigCounter++;
          finalClean = `${candidateClean} (Case ${disambigCounter})`;
        }
        raw = candidate;
        cleanText = finalClean;
        seenTexts.add(finalClean);
        break;
      }
    }

    raw.text = cleanText;

    const opts = shuffleWithOptions(raw.correctVal, raw.distractors, correctIdx);

    questions.push({
      id: `db-${normTopic.replace(/[^a-z0-9]/g, "-")}-t${testNum}-q${i}`,
      text: cleanText,
      options: opts,
      correctIdx,
      explanation: raw.explanation,
      shortcut: raw.shortcut,
      difficulty: diff,
      estimatedTimeSec: diff === "easy" ? 45 : diff === "hard" ? 90 : 60,
      topic: raw.topic || topic,
      category: raw.category || (normalizedCategory as AptitudeCategory) || "quantitative",
      companyTags: isCompany ? [topic.trim()] : ["Placement"],
      commonMistakes: raw.commonMistakes || ["Calculation error", "Misreading question prompt"]
    });
  }

  return questions;
}
