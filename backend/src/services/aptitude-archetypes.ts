import type { AptitudeCategory, Difficulty, GeneratedQuestion } from "./aptitude-engine.service";

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
  const stride = poolSize === 4 ? 3 : poolSize === 6 ? 5 : poolSize === 10 ? 3 : 5;
  return (i * stride + bias + (testNum - 1) * 7) % poolSize;
}

export function shuffleWithOptions(correctVal: string, distractors: string[], targetIdx: number): string[] {
  const opts: string[] = [];
  let dIdx = 0;
  for (let k = 0; k < 4; k++) {
    if (k === targetIdx) {
      opts.push(correctVal);
    } else {
      opts.push(distractors[dIdx % distractors.length]);
      dIdx++;
    }
  }
  return opts;
}

interface QuestionRawData {
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
    const p = 20 + ((qSeed * 5) % 30); // 20, 25, 30...
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
    const passPct = 40;
    const scorePct = 32;
    const failBy = 16 + ((qSeed * 2) % 24);
    const maxMarks = Math.round((failBy / (passPct - scorePct)) * 100);
    const passMarks = Math.round(maxMarks * 0.40);
    return {
      text: `${prefix} A candidate appeared for a placement screening exam, scored ${scorePct}% marks, and failed by ${failBy} marks. If the passing threshold is ${passPct}%, what is the maximum total marks of the exam?`,
      correctVal: `${maxMarks}`,
      distractors: [`${maxMarks + 50}`, `${maxMarks - 40}`, `${passMarks}`],
      explanation: `Difference between passing % and candidate's % = ${passPct}% - ${scorePct}% = ${passPct - scorePct}%. Since ${passPct - scorePct}% of maximum marks = ${failBy}, Maximum Marks = (${failBy} / ${passPct - scorePct}) × 100 = ${maxMarks}.`,
      shortcut: `Max marks = (Mark difference / % difference) × 100 = (${failBy} / 8) × 100 = ${maxMarks}.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Finding passing marks instead of maximum marks", "Dividing by score percentage instead of the gap"]
    };
  } else if (archetype === 3) {
    // Election vote share
    const winPct = 56 + ((qSeed * 3) % 10); // 56..65%
    const losePct = 100 - winPct;
    const margin = 2400 + ((qSeed * 11) % 5000);
    const totalVotes = Math.round((margin / (winPct - losePct)) * 100);
    return {
      text: `${prefix} In a two-candidate election, the winning candidate secured ${winPct}% of the valid votes and won by a margin of ${margin.toLocaleString()} votes. What was the total number of valid votes polled?`,
      correctVal: `${totalVotes.toLocaleString()}`,
      distractors: [`${(totalVotes + 4500).toLocaleString()}`, `${(totalVotes - 3200).toLocaleString()}`, `${Math.round(totalVotes * 0.8).toLocaleString()}`],
      explanation: `Winner = ${winPct}%, Loser = ${losePct}%. Margin % = ${winPct}% - ${losePct}% = ${winPct - losePct}%. Total Votes = (${margin} / ${winPct - losePct}) × 100 = ${totalVotes.toLocaleString()}.`,
      shortcut: `Total = Margin / (2 × Win% - 100) × 100.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Calculating margin against total votes rather than loser votes", "Arithmetic errors in percentage subtraction"]
    };
  } else if (archetype === 4) {
    // Salary comparison
    const x = 25;
    const lessPct = Number(((x / (100 + x)) * 100).toFixed(1));
    return {
      text: `${prefix} If engineer A's base CTC is ${x}% higher than engineer B's base CTC, by what percentage is engineer B's CTC less than engineer A's?`,
      correctVal: `${lessPct}%`,
      distractors: [`${x}%`, `${(lessPct + 5).toFixed(1)}%`, `${(lessPct - 3).toFixed(1)}%`],
      explanation: `Let B = 100, then A = ${100 + x}. Difference = ${x}. Required % = (${x} / ${100 + x}) × 100 = ${lessPct}%.`,
      shortcut: `[x / (100 + x)] × 100 = [25 / 125] × 100 = 20%.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Assuming B is x% less than A", "Dividing by B's base instead of A's base"]
    };
  } else if (archetype === 5) {
    // Population compounding
    const pop = 50000 + ((qSeed * 17) % 30000);
    const r = 10;
    const after2Yr = Math.round(pop * 1.21);
    return {
      text: `${prefix} The active user base of a mobile platform is currently ${pop.toLocaleString()}. If it expands at a consistent compound rate of ${r}% per annum, what will the user base be after 2 years?`,
      correctVal: `${after2Yr.toLocaleString()}`,
      distractors: [`${Math.round(pop * 1.20).toLocaleString()}`, `${(after2Yr + 2500).toLocaleString()}`, `${(after2Yr - 1800).toLocaleString()}`],
      explanation: `P_final = P × (1 + r/100)^2 = ${pop} × (1.10)^2 = ${pop} × 1.21 = ${after2Yr.toLocaleString()}.`,
      shortcut: `10% compound for 2 years equals effective 21% rise. ${pop} × 1.21 = ${after2Yr}.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Using simple interest (20%) instead of compound interest (21%)", "Squaring rate incorrectly"]
    };
  } else if (archetype === 6) {
    // Percentage error
    const num1 = 3;
    const den1 = 5;
    const num2 = 5;
    const den2 = 3;
    // Multiplied by 3/5 instead of 5/3
    const errPct = Number((((num2/den2 - num1/den1) / (num2/den2)) * 100).toFixed(1));
    return {
      text: `${prefix} An automated ETL pipeline mistakenly multiplied a metric by ${num1}/${den1} instead of ${num2}/${den2}. What is the percentage error in the resulting value?`,
      correctVal: `${errPct}%`,
      distractors: [`${(errPct - 12).toFixed(1)}%`, `${(errPct + 8.5).toFixed(1)}%`, `50%`],
      explanation: `True multiplier = ${num2}/${den2} = ${(num2/den2).toFixed(2)}. Mistaken multiplier = ${num1}/${den1} = ${(num1/den1).toFixed(2)}. Error = (${num2}/${den2} - ${num1}/${den1}) / (${num2}/${den2}) × 100 = ${errPct}%.`,
      shortcut: `Error % = (True - False) / True × 100.`,
      topic: "Percentages",
      category: "quantitative",
      commonMistakes: ["Dividing by the mistaken value instead of the correct baseline value", "Inverting numerator and denominator"]
    };
  } else {
    // Income, expenditure and savings
    const income = 40000;
    const expPct = 75;
    const incGrowth = 20;
    const expGrowth = 10;
    const oldSav = income * (1 - expPct / 100); // 10000
    const newInc = income * (1 + incGrowth / 100); // 48000
    const newExp = (income * (expPct / 100)) * (1 + expGrowth / 100); // 33000
    const newSav = newInc - newExp; // 15000
    const savGrowth = Number((((newSav - oldSav) / oldSav) * 100).toFixed(1));
    return {
      text: `${prefix} An analyst spends ${expPct}% of their monthly income. If their income increases by ${incGrowth}% and expenditures increase by ${expGrowth}%, what is the percentage increase in their savings?`,
      correctVal: `${savGrowth}%`,
      distractors: [`${(savGrowth - 15).toFixed(1)}%`, `${(savGrowth + 10).toFixed(1)}%`, `${incGrowth - expGrowth}%`],
      explanation: `Original: Income = 100, Exp = ${expPct}, Savings = ${100 - expPct}. New: Income = ${100 + incGrowth}, Exp = ${expPct} × ${(1 + expGrowth/100).toFixed(2)} = ${(expPct * (1 + expGrowth/100)).toFixed(1)}, Savings = ${newSav / (income / 100)}. Savings increase = ${savGrowth}%.`,
      shortcut: `Track base units: 100 -> 120 income, 75 -> 82.5 expenditure. Savings jumps 25 -> 37.5 (+50%).`,
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
    const cp = 800 + ((qSeed * 13) % 1200);
    const markup = 30 + ((qSeed * 5) % 20); // 30..49%
    const discount = 15;
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
    const sp = 9900;
    const p = 10;
    const lossPct = Number(((p * p) / 100).toFixed(1));
    return {
      text: `${prefix} A store sells two cloud workbooks for ₹${sp.toLocaleString()} each. On one it gains ${p}% and on the other it loses ${p}%. What is the overall transaction outcome?`,
      correctVal: `${lossPct}% loss`,
      distractors: ["No profit no loss", `${lossPct}% profit`, `${(lossPct * 2).toFixed(1)}% loss`],
      explanation: `When two items are sold at the same selling price, one at a gain of p% and the other at a loss of p%, there is always an overall loss of (p/10)^2 % = (${p}/10)^2 = ${lossPct}%.`,
      shortcut: `Always a loss: (Common % / 10)^2 = (${p}/10)^2 = ${lossPct}% loss.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Concluding 'no profit, no loss' because percentages cancel out", "Confusing cost price with selling price"]
    };
  } else if (archetype === 2) {
    // Dishonest trader false weight
    const trueWt = 1000;
    const falseWt = 900;
    const gainPct = Number((((trueWt - falseWt) / falseWt) * 100).toFixed(1));
    return {
      text: `${prefix} A vendor professes to sell raw materials at cost price, but uses an inaccurate scale measuring ${falseWt} grams for every 1 kg (1000 grams). What is the vendor's actual profit percentage?`,
      correctVal: `${gainPct}%`,
      distractors: ["10%", `${(gainPct - 2.5).toFixed(1)}%`, `${(gainPct + 3.4).toFixed(1)}%`],
      explanation: `Gain % = [Error / (True Weight - Error)] × 100 = [100 / 900] × 100 = ${gainPct}%.`,
      shortcut: `[Error / False Weight] × 100 = 100 / 900 × 100 = 11.1%.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Dividing by 1000g instead of 900g", "Assuming profit is simply 10%"]
    };
  } else if (archetype === 3) {
    // Successive discounts
    const d1 = 20;
    const d2 = 10;
    const singleEq = d1 + d2 - (d1 * d2) / 100;
    return {
      text: `${prefix} What single equivalent discount percentage corresponds to two successive discounts of ${d1}% and ${d2}% on enterprise software licensing?`,
      correctVal: `${singleEq}%`,
      distractors: [`${d1 + d2}%`, `${singleEq - 2}%`, `${singleEq + 4}%`],
      explanation: `Equivalent discount = D1 + D2 - (D1 × D2 / 100) = ${d1} + ${d2} - (${d1} × ${d2} / 100) = ${singleEq}%.`,
      shortcut: `D = 20 + 10 - 2 = 28%.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Adding discounts directly (20 + 10 = 30%)", "Multiplying discounts"]
    };
  } else if (archetype === 4) {
    // Buy X Get Y Free
    const buy = 4;
    const free = 1;
    const effDiscount = Number(((free / (buy + free)) * 100).toFixed(1));
    return {
      text: `${prefix} An authorized distributor announces an end-of-quarter promotion: "Buy ${buy} units, Get ${free} Free". What is the effective percentage discount received by the purchaser?`,
      correctVal: `${effDiscount}%`,
      distractors: [`${(free / buy * 100).toFixed(1)}%`, `${(effDiscount - 4).toFixed(1)}%`, `25%`],
      explanation: `Discount % = [Free Items / Total Items Taken] × 100 = [${free} / (${buy} + ${free})] × 100 = [${free} / ${buy + free}] × 100 = ${effDiscount}%.`,
      shortcut: `Free / Total × 100 = 1 / 5 × 100 = 20%.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Dividing Free by Buy items (1/4 = 25%) instead of Total items (1/5 = 20%)", "Ignoring total articles"]
    };
  } else if (archetype === 5) {
    // Cost price of X = Selling price of Y
    const x = 15;
    const y = 12;
    const profitPct = Number((((x - y) / y) * 100).toFixed(1));
    return {
      text: `${prefix} If the cost price of ${x} microchips is exactly equal to the selling price of ${y} microchips, what is the profit percentage earned?`,
      correctVal: `${profitPct}%`,
      distractors: [`${((x - y) / x * 100).toFixed(1)}%`, `${profitPct + 5}%`, `${profitPct - 4}%`],
      explanation: `Let CP of 1 chip = ₹1. Total CP of ${y} chips = ₹${y}. SP of ${y} chips = CP of ${x} chips = ₹${x}. Profit = ₹${x - y}. Profit % = (${x - y} / ${y}) × 100 = ${profitPct}%.`,
      shortcut: `[(X - Y) / Y] × 100 = (3 / 12) × 100 = 25%.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Dividing by X instead of Y", "Confusing profit with loss"]
    };
  } else if (archetype === 6) {
    // Target selling price
    const sp1 = 1440;
    const lossPct = 10;
    const targetGain = 15;
    const cp = sp1 / (1 - lossPct / 100);
    const sp2 = Math.round(cp * (1 + targetGain / 100));
    return {
      text: `${prefix} By selling a server rack for ₹${sp1.toLocaleString()}, a vendor loses ${lossPct}%. At what selling price should the vendor sell the unit to achieve a profit of ${targetGain}%?`,
      correctVal: `₹${sp2.toLocaleString()}`,
      distractors: [`₹${(sp2 + 180).toLocaleString()}`, `₹${(sp2 - 160).toLocaleString()}`, `₹${Math.round(cp).toLocaleString()}`],
      explanation: `Cost Price = SP1 / (1 - Loss%) = ${sp1} / 0.90 = ₹${cp}. Required SP = CP × (1 + Target Gain%) = ${cp} × 1.15 = ₹${sp2}.`,
      shortcut: `SP2 = SP1 × (100 + Gain%) / (100 - Loss%) = ${sp1} × (115 / 90) = ₹${sp2}.`,
      topic: "Profit & Loss",
      category: "quantitative",
      commonMistakes: ["Calculating gain on SP1 instead of CP", "Incorrect base division"]
    };
  } else {
    // Partnership profit ratio
    const invA = 12000;
    const timeA = 12;
    const invB = 18000;
    const timeB = 12;
    const totalProfit = 36000;
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
    const a = 12 + ((qSeed * 2) % 6) * 2; // 12, 16, 20...
    const b = 18 + ((qSeed * 3) % 6) * 2; // 18, 24...
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
    const a = 15;
    const b = 20;
    const daysTogether = 4;
    // Work done = 4*(1/15 + 1/20) = 4*(7/60) = 28/60 = 7/15. Rem = 8/15.
    // B finishes remaining = (8/15) * 20 = 160/15 = 10.7 days
    const remB = Number(((1 - daysTogether * (1/a + 1/b)) * b).toFixed(1));
    return {
      text: `${prefix} Worker A can complete a project in ${a} days, and Worker B can complete it in ${b} days. Both work together for ${daysTogether} days, after which Worker A leaves. In how many more days will Worker B finish the remaining work alone?`,
      correctVal: `${remB} days`,
      distractors: [`${(remB + 2).toFixed(1)} days`, `${(remB - 2.5).toFixed(1)} days`, `8.0 days`],
      explanation: `Combined rate = 1/${a} + 1/${b} = 7/60 per day. In ${daysTogether} days, work done = ${daysTogether} × (7/60) = 28/60. Remaining work = 32/60. Time for B = (32/60) × ${b} = ${remB} days.`,
      shortcut: `Remaining = 1 - 4(7/60) = 32/60. Days for B = 32/60 × 20 = 10.7 days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Forgetting to subtract initial 4 days of combined work", "Calculating total days instead of additional days"]
    };
  } else if (archetype === 2) {
    // Pipes and Cistern with Leak
    const fillA = 10;
    const fillB = 15;
    const leakC = 30;
    // 1/10 + 1/15 - 1/30 = (3 + 2 - 1)/30 = 4/30 = 2/15 -> 7.5 hrs
    const netTime = Number((1 / (1/fillA + 1/fillB - 1/leakC)).toFixed(1));
    return {
      text: `${prefix} Pipe A fills an industrial reservoir in ${fillA} hours, Pipe B fills it in ${fillB} hours, while drainage Valve C can empty the full reservoir in ${leakC} hours. If all three operate simultaneously, how many hours will it take to fill the reservoir?`,
      correctVal: `${netTime} hours`,
      distractors: [`${(netTime + 2.5).toFixed(1)} hours`, `${(netTime - 1.5).toFixed(1)} hours`, `12.0 hours`],
      explanation: `Net filling rate per hour = 1/${fillA} + 1/${fillB} - 1/${leakC} = 3/30 + 2/30 - 1/30 = 4/30 = 2/15. Time to fill = 15/2 = ${netTime} hours.`,
      shortcut: `LCM(10, 15, 30) = 30 units. A=3, B=2, C=-1. Net rate = 4 units/hr. Time = 30 / 4 = 7.5 hrs.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Adding the leak rate instead of subtracting", "Inverting fractional operations"]
    };
  } else if (archetype === 3) {
    // Alternate days
    const a = 12;
    const b = 18;
    // Total work = 36 units. A=3/day, B=2/day. Cycle = 2 days, 5 units.
    // 7 cycles = 14 days, 35 units. Rem = 1 unit. Day 15: A does 1 unit in 1/3 day.
    // Total = 14.3 days
    return {
      text: `${prefix} Contractor A can pave a roadway in ${a} days, and Contractor B in ${b} days. If they work on alternate days starting with Contractor A on Day 1, in how many days will the roadway be completed?`,
      correctVal: `14 1/3 days`,
      distractors: [`15 days`, `14 1/2 days`, `13 2/3 days`],
      explanation: `Work = LCM(${a}, ${b}) = 36 units. A's daily output = 3 units, B's = 2 units. In 2 days (1 cycle), output = 5 units. In 7 cycles (14 days), output = 35 units. Remaining = 1 unit. On Day 15, A works: time = 1/3 day. Total = 14 1/3 days.`,
      shortcut: `36 / 5 = 7 cycles (14 days) + 1 unit left / A's rate (3) = 14 1/3 days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Assuming whole days for final fractional work", "Confusing who starts on odd cycles"]
    };
  } else if (archetype === 4) {
    // Men and Women equivalence
    const m = 6;
    const w = 8;
    const days = 10;
    // 6 men = 8 women => 3 men = 4 women => 1 man = 4/3 women.
    // How long for 3 men and 4 women? 3 men = 4 women, total = 8 women.
    // 8 women take 10 days!
    return {
      text: `${prefix} ${m} men or ${w} women can complete a database migration in ${days} days. In how many days can 3 men and 4 women complete the same migration working together?`,
      correctVal: `10 days`,
      distractors: [`12 days`, `8 days`, `14 days`],
      explanation: `${m} men's work = ${w} women's work => 1 man = ${w / m} women = 4/3 women. 3 men = 4 women. Hence (3 men + 4 women) = (4 women + 4 women) = 8 women. Since 8 women take ${days} days, the team will take 10 days.`,
      shortcut: `Equate to one gender: 3 men = 4 women. Total team = 8 women, which matches given condition (8 women = 10 days).`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Adding men and women counts directly without rate equivalence", "Inverting gender ratios"]
    };
  } else if (archetype === 5) {
    // Wages division
    const a = 6;
    const b = 8;
    const totalWage = 7000;
    // Eff ratio = 1/6 : 1/8 = 8 : 6 = 4 : 3. Total parts = 7.
    // B's share = 3/7 * 7000 = 3000
    const shareB = 3000;
    return {
      text: `${prefix} Technician A can wire a data center rack in ${a} days, while Technician B takes ${b} days. If they undertake the assignment together for total wages of ₹${totalWage.toLocaleString()}, what is Technician B's fair share?`,
      correctVal: `₹${shareB.toLocaleString()}`,
      distractors: [`₹${(totalWage - shareB).toLocaleString()}`, `₹${(shareB + 500).toLocaleString()}`, `₹${(shareB - 500).toLocaleString()}`],
      explanation: `Wages are divided in proportion to daily work rates: Rate_A : Rate_B = (1/${a}) : (1/${b}) = ${b} : ${a} = 4 : 3. Total parts = 7. B's share = (3 / 7) × ₹${totalWage} = ₹${shareB.toLocaleString()}.`,
      shortcut: `Wages inversely proportional to days: B's share = a / (a + b) × Total = 6 / 14 × 7000 = ₹3000.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Distributing wages directly proportional to days taken", "Arithmetic division error"]
    };
  } else if (archetype === 6) {
    // Efficiency multiplier
    const effPct = 60; // A is 60% more efficient than B
    const daysB = 16;
    // Eff_A = 1.6 * Eff_B => Time_A = 16 / 1.6 = 10 days
    const daysA = 10;
    return {
      text: `${prefix} Senior Architect A is ${effPct}% more efficient than Junior Architect B. If Junior Architect B takes ${daysB} days to design a microservices architecture, how many days will Senior Architect A take alone?`,
      correctVal: `${daysA} days`,
      distractors: [`${daysA + 2} days`, `${daysA - 2} days`, `12 days`],
      explanation: `Efficiency of A / Efficiency of B = (100 + ${effPct}) / 100 = 160 / 100 = 8/5. Time is inversely proportional to efficiency: Time_A = Time_B × (5/8) = ${daysB} × (5/8) = ${daysA} days.`,
      shortcut: `Time_A = ${daysB} / 1.6 = ${daysA} days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Multiplying by 1.6 instead of dividing", "Applying percentage decrease directly"]
    };
  } else {
    // Destruction / negative work
    const buildDays = 15;
    const destroyDays = 20;
    // 1/15 - 1/20 = (4 - 3)/60 = 1/60 => 60 days
    const totalDays = 60;
    return {
      text: `${prefix} Builder A can construct a security firewall in ${buildDays} days, while a continuous stress-testing simulator would take ${destroyDays} days to dismantle it completely. If both run simultaneously, in how many days will the firewall be fully built?`,
      correctVal: `${totalDays} days`,
      distractors: [`${totalDays - 15} days`, `${totalDays + 20} days`, `35 days`],
      explanation: `Net build rate per day = 1/${buildDays} - 1/${destroyDays} = 4/60 - 3/60 = 1/60. Time required = 60 days.`,
      shortcut: `Net rate = (D - B) / (B × D) = (20 - 15) / 300 = 5/300 = 1/60 -> 60 days.`,
      topic: "Time & Work",
      category: "quantitative",
      commonMistakes: ["Adding rates instead of subtracting", "Taking difference of days (20 - 15 = 5)"]
    };
  }
}

export function generateSpeedDistanceQuestion(qIndex: number, testNum: number, seed: number, prefix: string): QuestionRawData {
  const archetype = archIndex(qIndex, testNum, 8);
  const qSeed = seed + qIndex * 89 + testNum * 43;

  if (archetype === 0) {
    // Train crossing pole
    const len = 200 + ((qSeed * 11) % 4) * 50; // 200, 250, 300, 350
    const speedKmph = 72;
    const speedMs = (speedKmph * 5) / 18; // 20 m/s
    const timeSec = len / speedMs;
    return {
      text: `${prefix} An express train ${len} meters long is traveling at a uniform speed of ${speedKmph} km/h. How many seconds will it take to pass a stationary signal post?`,
      correctVal: `${timeSec} seconds`,
      distractors: [`${timeSec + 4} seconds`, `${timeSec - 3} seconds`, `${timeSec * 2} seconds`],
      explanation: `Speed in m/s = ${speedKmph} × (5/18) = ${speedMs} m/s. Distance to cross pole = Train length = ${len} m. Time = Distance / Speed = ${len} / ${speedMs} = ${timeSec} seconds.`,
      shortcut: `Speed = 72 × 5/18 = 20 m/s. Time = ${len} / 20 = ${timeSec}s.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Forgetting to convert km/h to m/s", "Using length in km instead of meters"]
    };
  } else if (archetype === 1) {
    // Train crossing platform
    const trainLen = 240;
    const platLen = 360;
    const speedKmph = 54;
    const speedMs = (speedKmph * 5) / 18; // 15 m/s
    const totalDist = trainLen + platLen; // 600m
    const timeSec = totalDist / speedMs; // 40s
    return {
      text: `${prefix} A freight train ${trainLen} meters long moving at ${speedKmph} km/h completely crosses a railway platform ${platLen} meters long. What is the time taken in seconds?`,
      correctVal: `${timeSec} seconds`,
      distractors: [`${timeSec - 8} seconds`, `${timeSec + 10} seconds`, `24 seconds`],
      explanation: `Total distance = Train length + Platform length = ${trainLen} + ${platLen} = ${totalDist} meters. Speed = ${speedKmph} × (5/18) = ${speedMs} m/s. Time = ${totalDist} / ${speedMs} = ${timeSec} seconds.`,
      shortcut: `Total Distance = 600m. Speed = 15 m/s. Time = 600 / 15 = 40 seconds.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Ignoring platform length and only using train length", "Failing to convert km/h to m/s"]
    };
  } else if (archetype === 2) {
    // Two trains opposite directions
    const l1 = 180;
    const l2 = 220;
    const s1 = 40;
    const s2 = 50;
    const relSpeedKmph = s1 + s2; // 90 km/h
    const relSpeedMs = (relSpeedKmph * 5) / 18; // 25 m/s
    const timeSec = (l1 + l2) / relSpeedMs; // 400 / 25 = 16s
    return {
      text: `${prefix} Two commuter trains of lengths ${l1}m and ${l2}m run on parallel tracks in opposite directions at speeds of ${s1} km/h and ${s2} km/h respectively. In how many seconds will they cross each other completely?`,
      correctVal: `${timeSec} seconds`,
      distractors: [`${timeSec + 4} seconds`, `${timeSec - 4} seconds`, `25 seconds`],
      explanation: `Relative speed (opposite direction) = ${s1} + ${s2} = ${relSpeedKmph} km/h = ${relSpeedKmph} × (5/18) = ${relSpeedMs} m/s. Total distance = ${l1} + ${l2} = ${l1 + l2} m. Time = ${l1 + l2} / ${relSpeedMs} = ${timeSec} seconds.`,
      shortcut: `Distance = 400m. Relative Speed = 90 km/h = 25 m/s. Time = 400 / 25 = 16s.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Subtracting speeds for opposite directions instead of adding", "Unit conversion errors"]
    };
  } else if (archetype === 3) {
    // Boats and streams
    const stillSpeed = 15;
    const streamSpeed = 3;
    const dist = 36;
    const upSpeed = stillSpeed - streamSpeed; // 12 km/h
    const downSpeed = stillSpeed + streamSpeed; // 18 km/h
    const totalTime = Number((dist / upSpeed + dist / downSpeed).toFixed(1)); // 3 + 2 = 5 hrs
    return {
      text: `${prefix} A patrol boat can travel at ${stillSpeed} km/h in still water. If the river flow rate is ${streamSpeed} km/h, what is the total time taken for a round trip covering ${dist} km upstream and returning ${dist} km downstream?`,
      correctVal: `${totalTime} hours`,
      distractors: [`${(totalTime - 1.2).toFixed(1)} hours`, `${(totalTime + 1.5).toFixed(1)} hours`, `4.0 hours`],
      explanation: `Upstream speed = ${stillSpeed} - ${streamSpeed} = ${upSpeed} km/h. Downstream speed = ${stillSpeed} + ${streamSpeed} = ${downSpeed} km/h. Time Up = ${dist}/${upSpeed} = ${dist/upSpeed} hrs. Time Down = ${dist}/${downSpeed} = ${dist/downSpeed} hrs. Total = ${totalTime} hours.`,
      shortcut: `Round trip time = D/(u - v) + D/(u + v) = 36/12 + 36/18 = 3 + 2 = 5 hrs.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Calculating round trip time as 2D / still water speed", "Subtracting stream speed for downstream"]
    };
  } else if (archetype === 4) {
    // Round trip average speed
    const s1 = 60;
    const s2 = 40;
    const avgSpeed = Number(((2 * s1 * s2) / (s1 + s2)).toFixed(1)); // 48 km/h
    return {
      text: `${prefix} A commuter drives from City A to City B at ${s1} km/h and returns along the same route at ${s2} km/h. What is the average speed for the entire journey?`,
      correctVal: `${avgSpeed} km/h`,
      distractors: [`${((s1 + s2) / 2).toFixed(1)} km/h`, `${(avgSpeed + 4).toFixed(1)} km/h`, `45 km/h`],
      explanation: `For equal distances, Average Speed = (2 × s1 × s2) / (s1 + s2) = (2 × ${s1} × ${s2}) / (${s1} + ${s2}) = ${(2 * s1 * s2)} / ${s1 + s2} = ${avgSpeed} km/h.`,
      shortcut: `Harmonic Mean: 2ab / (a + b) = 2(60)(40) / 100 = 48 km/h.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Arithmetic mean (60 + 40) / 2 = 50 km/h", "Dividing difference of speeds"]
    };
  } else if (archetype === 5) {
    // Late and early speed change
    const s1 = 4;
    const s2 = 5;
    const lateMin = 10;
    const earlyMin = 5;
    // D = (s1 * s2 / (s2 - s1)) * (late + early) / 60 = (20 / 1) * 15/60 = 20 * 0.25 = 5 km
    const dist = (s1 * s2 / (s2 - s1)) * ((lateMin + earlyMin) / 60);
    return {
      text: `${prefix} Walking at ${s1} km/h, an employee reaches the office ${lateMin} minutes late. If walking at ${s2} km/h, the employee arrives ${earlyMin} minutes early. What is the distance between the employee's residence and office?`,
      correctVal: `${dist} km`,
      distractors: [`${dist + 2.5} km`, `${dist - 1.5} km`, `6.5 km`],
      explanation: `Time difference = ${lateMin} min late - (-${earlyMin} min early) = ${lateMin + earlyMin} minutes = ${(lateMin + earlyMin) / 60} hours. Distance = (s1 × s2 / |s2 - s1|) × ΔT = (${s1} × ${s2} / 1) × (${lateMin + earlyMin} / 60) = ${dist} km.`,
      shortcut: `D = (Product of speeds / Difference of speeds) × Total time difference = (20 / 1) × (15 / 60) = 5 km.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Subtracting times (10 - 5 = 5 min) instead of adding late + early", "Forgetting to convert minutes to hours"]
    };
  } else if (archetype === 6) {
    // Police and thief relative chase
    const distApartMeters = 200;
    const thiefKmph = 10;
    const copKmph = 12;
    const relKmph = copKmph - thiefKmph; // 2 km/h
    const relMs = (relKmph * 5) / 18; // 5/9 m/s
    const timeSec = distApartMeters / relMs; // 360s = 6 mins
    const thiefDist = (thiefKmph * (5/18)) * timeSec; // 1000m = 1 km
    return {
      text: `${prefix} A cyber patrol detects an intruder accessing system files 200 meters ahead in a network simulator. The intruder moves at 10 m/s and the security patrol accelerates at 14 m/s. What distance will the security patrol travel to intercept the intruder?`,
      correctVal: `700 meters`,
      distractors: [`500 meters`, `600 meters`, `800 meters`],
      explanation: `Relative speed = 14 - 10 = 4 m/s. Time to catch = Initial separation / Relative speed = 200 / 4 = 50 seconds. Distance covered by security patrol = Speed × Time = 14 × 50 = 700 meters.`,
      shortcut: `Time = 200 / 4 = 50s. Patrol distance = 14 × 50 = 700m.`,
      topic: "Time Speed & Distance",
      category: "quantitative",
      commonMistakes: ["Calculating the intruder's distance instead of the patrol's distance", "Adding speeds in chase scenario"]
    };
  } else {
    // Circular track meeting
    const trackLen = 600;
    const s1 = 15; // m/s
    const s2 = 10; // m/s
    // Opposite directions: rel speed = 25 m/s. Time = 600 / 25 = 24s
    const timeSec = trackLen / (s1 + s2);
    return {
      text: `${prefix} Two autonomous delivery drones start simultaneously from the same point on a circular testing track of circumference ${trackLen} meters in opposite directions with speeds of ${s1} m/s and ${s2} m/s. After how many seconds will they cross each other for the first time?`,
      correctVal: `${timeSec} seconds`,
      distractors: [`${timeSec + 12} seconds`, `${timeSec - 6} seconds`, `40 seconds`],
      explanation: `When traveling in opposite directions around a closed circular circuit, relative speed = s1 + s2 = ${s1} + ${s2} = ${s1 + s2} m/s. Time for first meeting = Track Length / Relative Speed = ${trackLen} / ${s1 + s2} = ${timeSec} seconds.`,
      shortcut: `Time = Circumference / (s1 + s2) = 600 / 25 = 24s.`,
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
    const n = 5;
    const avg = 60 + ((qSeed * 3) % 20);
    const known = [20 + (qSeed % 40), 70 + (qSeed % 20), 50 + (qSeed % 30), 90 - (qSeed % 20)];
    const missing = n * avg - known.reduce((a, b) => a + b, 0);
    return {
      text: `${prefix} The average of ${n} numbers is ${avg}. Four of the numbers are ${known.join(", ")}. What is the fifth number?`,
      correctVal: `${missing}`,
      distractors: [`${missing + n}`, `${missing - n}`, `${avg}`],
      explanation: `Sum of all = ${n} × ${avg} = ${n * avg}. Sum of known = ${known.reduce((a, b) => a + b, 0)}. Fifth = ${n * avg} − ${known.reduce((a, b) => a + b, 0)} = ${missing}.`,
      shortcut: `Missing = Total − Sum(known) = ${n * avg} − ${known.reduce((a, b) => a + b, 0)} = ${missing}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Dividing the known sum by n", "Subtracting the average instead of the sum"],
    };
  } else if (archetype === 1) {
    // Weighted average
    const g1 = 40;
    const g2 = 60;
    const avg1 = 70 + ((qSeed * 2) % 15);
    const avg2 = 55 + ((qSeed * 5) % 10);
    const weighted = Number((((g1 * avg1 + g2 * avg2) / (g1 + g2)) * 100 / 100).toFixed(1));
    const n1 = 40;
    const n2 = 60;
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
    const n = 10 + (qSeed % 10);
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
    const n = 8;
    const wrong = 30 + (qSeed % 20);
    const right = 90 + (qSeed % 20);
    const origAvg = 60 + (qSeed % 10);
    const correctAvg = Number((origAvg + (right - wrong) / n) * 1).toFixed(1);
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
    const avgBefore = 50 + ((qSeed * 7) % 20);
    const newVal = avgBefore + 20 + (qSeed % 10);
    const newAvg = Number((((n * avgBefore + newVal) / (n + 1)) * 1).toFixed(1));
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
    const n = 6;
    const avgA = 80;
    const removed = 95;
    const newAvg = Number((((n * avgA - removed) / (n - 1)) * 1).toFixed(2));
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
    const start = 15 + (qSeed % 10);
    const count = 9;
    const avg = start + (count - 1) / 2;
    return {
      text: `${prefix} What is the average of the ${count} consecutive integers from ${start} to ${start + count - 1}?`,
      correctVal: `${avg}`,
      distractors: [`${start}`, `${start + count - 1}`, `${start + count / 2}`],
      explanation: `Average of consecutive integers = (first + last) / 2 = (${start} + ${start + count - 1}) / 2 = ${start + (count - 1) / 2}.`,
      shortcut: `Average = middle term = ${start + (count - 1) / 2}.`,
      topic: "Averages",
      category: "quantitative",
      commonMistakes: ["Answering the first term", "Answering the last term"],
    };
  } else {
    // One observation replaced
    const n = 6 + (qSeed % 3);
    const origAvg = 55 + ((qSeed * 5) % 15);
    const oldVal = 40 + (qSeed % 30);
    const newVal = oldVal + 24 + (qSeed % 5);
    const newAvg = Number((((n * origAvg - oldVal + newVal) / n) * 1).toFixed(2));
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
    const poor = 12 + (qSeed % 5);
    const rich = 20 + (qSeed % 8);
    const mean = Math.round((poor + rich) / 2) + ((qSeed % 3) - 1);
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
    const base = 30 + ((qSeed * 2) % 20);
    const conc = 60 + (qSeed % 20);
    const addWater = 30 + ((qSeed * 3) % 40);
    const milkAmt = Number(((conc * base) / 100) * 100) / 100;
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
    const vol = 40;
    const replace = 8;
    const conc = 90;
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
    const solA = 60;
    const solB = 30;
    const amtA = 24;
    const amtB = 16;
    const mixPct = Number((((amtA * solA + amtB * solB) / (amtA + amtB)) * 1).toFixed(1));
    return {
      text: `${prefix} ${amtA} litres of a ${solA}% acid solution are mixed with ${amtB} litres of a ${solB}% acid solution. What is the strength of the resulting acid mixture?`,
      correctVal: `${mixPct}%`,
      distractors: [`${Number(((solA + solB) / 2).toFixed(1))}%`, `${Number((mixPct + 5).toFixed(1))}%`, `${Number((mixPct - 6).toFixed(1))}%`],
      explanation: `Acid content = ${amtA} × ${solA}% + ${amtB} × ${solB}% = ${amtA * solA / 100} + ${amtB * solB / 100} L. Strength = (acid content / ${amtA + amtB}) × 100 = ${mixPct}%.`,
      shortcut: `Mixture % = ($A×a + $B×b) / ($A + $B) = ${mixPct}%.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Averaging the two percentages", "Mixing volumes weighted wrongly"],
    };
  } else if (archetype === 4) {
    // Find ratio from price using mixture
    const pureX = 150;
    const pureY = 100;
    const mix = 120 + (qSeed % 15);
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
    const p1 = 60;
    const p2 = 25;
    const target = 40;
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
    const conc = 80;
    const times = 3;
    const frac = 0.75;
    const finalConc = Number((conc * Math.pow(frac, times)).toFixed(1));
    return {
      text: `${prefix} A container has a ${conc}% strength solution. Each time, ${frac * 100}% of the liquid is drawn off and replaced with water, done ${times} times. What is the final strength?`,
      correctVal: `${finalConc}%`,
      distractors: [`${conc}%`, `${Number((finalConc + 10).toFixed(1))}%`, `${Number((finalConc * 0.8).toFixed(1))}%`],
      explanation: `Strength = C(1 − f)ⁿ = ${conc} × (1 − 0.75)³ = ${conc} × 0.25³ = ${finalConc}%.`,
      shortcut: `C × (remaining fraction)ⁿ = ${conc} × 0.25³ = ${finalConc}%.`,
      topic: "Mixture & Alligation",
      category: "quantitative",
      commonMistakes: ["Subtracting the drawn-off percentage directly", "Raising the drawn-off fraction instead of remaining"],
    };
  } else {
    // Gain on selling mixture
    const cp = 50 + (qSeed % 20);
    const gainPct = 20 + (qSeed % 15);
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
    const n = 3;
    const target = Math.pow(2, n) - 1;
    return {
      text: `${prefix} Three fair coins are tossed simultaneously. What is the probability of getting at least one head?`,
      correctVal: `${target}/8`,
      distractors: [`1/8`, `1/2`, `1/4`],
      explanation: `Total outcomes = 2³ = 8. P(no head) = 1/8. P(at least one head) = 1 − 1/8 = 7/8.`,
      shortcut: `P = 1 − (1/2)ⁿ = 1 − 1/8 = 7/8.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Answering 1/2", "Forgetting to subtract the complement from 1"],
    };
  } else if (archetype === 1) {
    // Two dice sum
    const sum = 9;
    const fav = 4; // (3,6)(4,5)(5,4)(6,3)
    return {
      text: `${prefix} Two fair dice are rolled together. What is the probability that the sum of the numbers appearing is ${sum}?`,
      correctVal: `${fav}/36`,
      distractors: [`1/12`, `1/18`, `1/6`],
      explanation: `Favourable pairs for sum ${sum}: (3,6), (4,5), (5,4), (6,3) → ${fav} cases. Total = 36. P = ${fav}/36.`,
      shortcut: `Favourable outcomes = ${fav}. P = ${fav}/36.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Counting ordered pairs incorrectly", "Using 6 × 6 = 12 as the denominator"],
    };
  } else if (archetype === 2) {
    // Cards
    const favCount = 12;
    const type = "face card";
    const prob = Number((favCount / 52).toFixed(4));
    return {
      text: `${prefix} A card is drawn at random from a well-shuffled deck of 52 cards. What is the probability that it is a ${type}?`,
      correctVal: `${simplifyRatio(favCount, 52 - favCount)}`,
      distractors: [`1/13`, `1/4`, `4/13`],
      explanation: `There are ${favCount} face cards (J, Q, K of each suit). P = ${favCount}/52 = ${prob.toFixed(3)} = ${simplifyRatio(favCount, 52 - favCount)}.`,
      shortcut: `P = face cards / total = ${favCount}/52 = ${prob.toFixed(3)}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Forgetting face cards include three ranks per suit", "Counting 52 cards wrongly"],
    };
  } else if (archetype === 3) {
    // Balls from bag
    const red = 3;
    const blue = 4;
    const green = 5;
    const pick = 2;
    const total = red + blue + green;
    const fav = nCr(red, 2) + nCr(blue, 2) + nCr(green, 2);
    const all = nCr(total, pick);
    return {
      text: `${prefix} A bag contains ${red} red, ${blue} blue and ${green} green balls. Two balls are drawn at random. What is the probability that both balls are of the same colour?`,
      correctVal: `${simplifyRatio(fav, all - fav)}`,
      distractors: [`${simplifyRatio(nCr(red, 2), all)}`, `1/2`, `1/3`],
      explanation: `Total ways = C(${total}, 2) = ${all}. Same colour = C(${red},2) + C(${blue},2) + C(${green},2) = ${nCr(red, 2)} + ${nCr(blue, 2)} + ${nCr(green, 2)} = ${fav}. P = ${fav}/${all}.`,
      shortcut: `P = [C(r,2) + C(b,2) + C(g,2)] / C(total,2) = ${fav}/${all}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Counting the draw order twice", "Forgetting green balls contribute to same-colour cases"],
    };
  } else if (archetype === 4) {
    // Complement via "at least one" of multiples
    const pn = 1 / 3;
    return {
      text: `${prefix} An unbiased die is thrown three times. What is the probability of obtaining a multiple of 3 at least once?`,
      correctVal: `19/27`,
      distractors: [`8/27`, `1/9`, `7/27`],
      explanation: `P(multiple of 3 in one throw) = 2/6 = 1/3. P(none in three throws) = (2/3)³ = 8/27. Required = 1 − 8/27 = 19/27.`,
      shortcut: `1 − (2/3)³ = 1 − 8/27 = 19/27.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Subtracting 3 × (1/3)", "Using the complement wrongly"],
    };
  } else if (archetype === 5) {
    // Committee selection
    const boys = 5;
    const girls = 4;
    const team = 3;
    const total = boys + girls;
    const all = nCr(total, team);
    const fav = nCr(boys, 2) * nCr(girls, 1);
    return {
      text: `${prefix} From a group of ${boys} boys and ${girls} girls, a committee of ${team} is to be formed. What is the probability that the committee has exactly 2 boys and 1 girl?`,
      correctVal: `${simplifyRatio(fav, all - fav)}`,
      distractors: [`${simplifyRatio(nCr(girls, 1) * nCr(boys, 3), all)}`, `1/4`, `1/3`],
      explanation: `Total ways = C(${total}, ${team}) = ${all}. Favourable = C(${boys},2) × C(${girls},1) = ${nCr(boys, 2)} × ${nCr(girls, 1)} = ${fav}. P = ${fav}/${all}.`,
      shortcut: `P = [C(boy,2) × C(girl,1)] / C(total,3) = ${fav}/${all}.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Choosing 3 boys instead of 2 boys + 1 girl", "Forgetting to choose from girls separately"],
    };
  } else if (archetype === 6) {
    // Independent events (truthfulness)
    const pA = 3;
    const pB = 4;
    const contrad = pA * (5 - pB) + (5 - pA) * pB;
    return {
      text: `${prefix} A speaks the truth in ${pA} out of 5 cases and B speaks the truth in ${pB} out of 5 cases. What is the probability that they contradict each other when narrating the same event?`,
      correctVal: `${simplifyRatio(contrad, 25 - contrad)}`,
      distractors: [`${pA}/${pB}`, `1/2`, `9/25`],
      explanation: `Contradiction = A true & B false OR A false & B true = (${pA}/5 × ${5 - pB}/5) + (${5 - pA}/5 × ${pB}/5) = ${contrad}/25.`,
      shortcut: `P(contradict) = a(1 − b) + b(1 − a) = (${pA}×${5 - pB} + ${5 - pA}×${pB}) / 25 = ${contrad}/25.`,
      topic: "Probability",
      category: "quantitative",
      commonMistakes: ["Adding the two truth probabilities", "Using persistence of independence wrongly"],
    };
  } else {
    // Word/letter probability (vowel pick)
    const word = "MAHABHARATA";
    const vowels = 5;
    const letters = 11;
    return {
      text: `${prefix} A letter is chosen at random from the word "${word}". What is the probability that it is a vowel?`,
      correctVal: `${simplifyRatio(vowels, letters - vowels)}`,
      distractors: [`${simplifyRatio(6, 5)}`, `1/2`, `1/3`],
      explanation: `The word "${word}" has ${vowels} vowels (including repeated vowels) out of ${letters} letters. P = ${vowels}/${letters}.`,
      shortcut: `P = vowels / total letters = ${vowels}/${letters}.`,
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
    const n = 6;
    const ways = factorial(n);
    return {
      text: `${prefix} In how many different ways can ${n} distinct books be arranged on a shelf?`,
      correctVal: `${ways}`,
      distractors: [`${ways * 2}`, `${ways / 2}`, `${factorial(n - 1)}`],
      explanation: `Number of ways = ${n}! = ${ways}.`,
      shortcut: `${n}! = ${ways}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using n − 1 factorial", "Adding factorial terms instead of multiplying"],
    };
  } else if (archetype === 1) {
    // Repeated letters
    const word = "MISSISSIPPI";
    const total = 11;
    const ways = (factorial(11) / (factorial(4) * factorial(4) * factorial(2))) | 0;
    return {
      text: `${prefix} How many distinct arrangements are possible using all the letters of the word "${word}"?`,
      correctVal: `${ways}`,
      distractors: [`${factorial(11)}`, `${ways * 2}`, `${Math.round(ways / 2)}`],
      explanation: `Letters: M(1), I(4), S(4), P(2). Ways = 11! / (4! × 4! × 2!) = ${ways}.`,
      shortcut: `11! / (4! 4! 2!) = ${ways}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using 11! without dividing by repeated letters", "Dividing by the wrong factorial values"],
    };
  } else if (archetype === 2) {
    // Selection (combinations)
    const total = 8;
    const pick = 3;
    const waysC = nCr(total, pick);
    return {
      text: `${prefix} From a group of ${total} developers, how many different teams of ${pick} can be formed?`,
      correctVal: `${waysC}`,
      distractors: [`${waysC * 2}`, `${waysC - 8}`, `${factorial(pick)}`],
      explanation: `Team size ${pick} from ${total}: C(${total}, ${pick}) = ${waysC}.`,
      shortcut: `C(${total}, ${pick}) = ${waysC}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using permutation instead of combination", "Reversing the values of n and r"],
    };
  } else if (archetype === 3) {
    // Circular arrangement
    const n = 7;
    const ways = factorial(n - 1);
    return {
      text: `${prefix} In how many ways can ${n} people be seated around a circular table?`,
      correctVal: `${ways}`,
      distractors: [`${factorial(n)}`, `${factorial(n - 1) * 2}`, `${(factorial(n - 1) / 2) | 0}`],
      explanation: `Circular arrangements of ${n} distinct items = (${n} − 1)! = ${ways}.`,
      shortcut: `(n − 1)! = 6! = ${ways}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using n! for a circular table", "Dividing by 2 for a normal circular table"],
    };
  } else if (archetype === 4) {
    // Vowels together
    const word = "UNITED";
    const letters = 6;
    const vowels = 3;
    const waysV = factorial(4) * factorial(3);
    return {
      text: `${prefix} How many distinct arrangements of the letters of the word "${word}" keep all the vowels together?`,
      correctVal: `${waysV}`,
      distractors: [`${factorial(6)}`, `${factorial(4) * factorial(4)}`, `${factorial(3) * factorial(3)}`],
      explanation: `Treat the ${vowels} vowels as one block: ${letters - vowels + 1} units → 4!, and the ${vowels} vowels internally → 3!. Total = 4! × 3! = ${waysV}.`,
      shortcut: `Block method: (${letters - vowels + 1})! × ${vowels}! = ${waysV}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Not multiplying by the internal vowel arrangements", "Using 6! directly"],
    };
  } else if (archetype === 5) {
    // Passwords with repetition
    const digits = 10;
    const len = 4;
    const waysP = Math.pow(digits, len);
    return {
      text: `${prefix} How many ${len}-digit codes can be formed using the digits 0-9 if repetition of digits is allowed?`,
      correctVal: `${waysP}`,
      distractors: [`${nCr(digits, len)}`, `${waysP / 10}`, `${factorial(4)}`],
      explanation: `Each of the ${len} positions has ${digits} choices: ${digits}^${len} = ${waysP}.`,
      shortcut: `${digits}^${len} = ${waysP}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Using permutations without repetition", "Using combinations instead of arrangements"],
    };
  } else if (archetype === 6) {
    // At least one restriction
    const total = 9;
    const pick = 4;
    const all = nCr(total, pick);
    const bad = nCr(total - 1, pick);
    return {
      text: `${prefix} A committee of ${pick} is to be formed from ${total} engineers such that a specific senior engineer MUST be included. In how many ways can this be done?`,
      correctVal: `${nCr(total - 1, pick - 1)}`,
      distractors: [`${all - 1}`, `${bad}`, `${all}`],
      explanation: `Fix the senior engineer, then choose the remaining ${pick - 1} from the other ${total - 1}: C(${total - 1}, ${pick - 1}) = ${nCr(total - 1, pick - 1)}.`,
      shortcut: `C(n−1, r−1) = C(${total - 1}, ${pick - 1}) = ${nCr(total - 1, pick - 1)}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Computing total − bad (same answer, risk of arithmetic error)", "Choosing r from n−1 instead of r−1"],
    };
  } else {
    // Grouping / distributions
    const total = 6;
    const g1 = 2;
    const g2 = 2;
    const g3 = 2;
    const waysG = (factorial(total) / (factorial(g1) * factorial(g2) * factorial(g3))) | 0;
    return {
      text: `${prefix} In how many ways can ${total} distinct tasks be distributed equally among three teams so that each team gets ${g1} tasks (order of teams is NOT important)?`,
      correctVal: `${waysG / 6}`,
      distractors: [`${waysG}`, `${waysG * 3}`, `${Math.round(waysG / 2)}`],
      explanation: `Since teams are unlabelled: ${total}! / (${g1}! × ${g2}! × ${g3}! × 3!) = ${waysG / 6}.`,
      shortcut: `6! / (2! 2! 2! × 3!) = ${waysG / 6}.`,
      topic: "Permutations & Combinations",
      category: "quantitative",
      commonMistakes: ["Forgetting to divide by 3! for identical groups", "Using labelled group division without extra factorial"],
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

  const isCompany = normalizedCategory === "company" || normalizedCategory === "company_test";

  for (let i = 1; i <= count; i++) {
    const isEasy = i <= 10;
    const isHard = i > 20;
    const diff: Difficulty = isEasy ? "easy" : isHard ? "hard" : "medium";
    const qSeed = seed + i * 113 + testNum * 19;
    const correctIdx = (qSeed + i * 5) % 4;

    let raw: QuestionRawData;

    if (isCompany) {
      const companyName = topic.trim();
      const prefix = `[${companyName} Test ${testNum} • Q${i}]`;
      // Distribute questions: 12 Quant, 8 Logical, 6 Verbal, 4 DI across 30 questions
      const slot = (i - 1 + (testNum - 1) * 7) % 10;
      if (slot === 0 || slot === 3 || slot === 6 || slot === 9) {
        // Quant rotated across all 10 families
        const qFamily = (i + (testNum - 1) * 3) % 10;
        if (qFamily === 0) raw = generatePercentagesQuestion(i, testNum, qSeed, prefix);
        else if (qFamily === 1) raw = generateProfitLossQuestion(i, testNum, qSeed, prefix);
        else if (qFamily === 2) raw = generateTimeWorkQuestion(i, testNum, qSeed, prefix);
        else if (qFamily === 3) raw = generateSpeedDistanceQuestion(i, testNum, qSeed, prefix);
        else if (qFamily === 4) raw = generateInterestQuestion(i, testNum, qSeed, prefix);
        else if (qFamily === 5) raw = generateRatioQuestion(i, testNum, qSeed, prefix);
        else if (qFamily === 6) raw = generateAverageQuestion(i, testNum, qSeed, prefix);
        else if (qFamily === 7) raw = generateMixtureQuestion(i, testNum, qSeed, prefix);
        else if (qFamily === 8) raw = generateProbabilityQuestion(i, testNum, qSeed, prefix);
        else raw = generatePermutationQuestion(i, testNum, qSeed, prefix);
      } else if (slot === 1 || slot === 4 || slot === 7) {
        raw = generateLogicalQuestion(i, testNum, qSeed, prefix);
      } else if (slot === 2 || slot === 8) {
        raw = generateVerbalQuestion(i, testNum, qSeed, prefix);
      } else {
        raw = generateDIQuestion(i, testNum, qSeed, prefix);
      }
    } else {
      const prefix = `[${topic} Test ${testNum} • Q${i}]`;
      // Specialized topic routing
      if (normTopic.includes("percent")) {
        raw = generatePercentagesQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("profit") || normTopic.includes("loss")) {
        raw = generateProfitLossQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("time") && normTopic.includes("work")) {
        raw = generateTimeWorkQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("speed") || normTopic.includes("distance")) {
        raw = generateSpeedDistanceQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("interest")) {
        raw = generateInterestQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("ratio") || normTopic.includes("proportion")) {
        raw = generateRatioQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("probab")) {
        raw = generateProbabilityQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("permut") || normTopic.includes("combination")) {
        raw = generatePermutationQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("average") || normTopic.includes("mean")) {
        raw = generateAverageQuestion(i, testNum, qSeed, prefix);
      } else if (normTopic.includes("mixture") || normTopic.includes("alligation")) {
        raw = generateMixtureQuestion(i, testNum, qSeed, prefix);
      } else if (normalizedCategory === "quantitative" || normalizedCategory === "math") {
        // Broad quantitative: rotate across all 10 families
        const quantRot = (i + (testNum - 1) * 3) % 10;
        if (quantRot === 0) raw = generatePercentagesQuestion(i, testNum, qSeed, prefix);
        else if (quantRot === 1) raw = generateProfitLossQuestion(i, testNum, qSeed, prefix);
        else if (quantRot === 2) raw = generateTimeWorkQuestion(i, testNum, qSeed, prefix);
        else if (quantRot === 3) raw = generateSpeedDistanceQuestion(i, testNum, qSeed, prefix);
        else if (quantRot === 4) raw = generateInterestQuestion(i, testNum, qSeed, prefix);
        else if (quantRot === 5) raw = generateRatioQuestion(i, testNum, qSeed, prefix);
        else if (quantRot === 6) raw = generateAverageQuestion(i, testNum, qSeed, prefix);
        else if (quantRot === 7) raw = generateMixtureQuestion(i, testNum, qSeed, prefix);
        else if (quantRot === 8) raw = generateProbabilityQuestion(i, testNum, qSeed, prefix);
        else raw = generatePermutationQuestion(i, testNum, qSeed, prefix);
      } else if (normalizedCategory === "logical" || normalizedCategory === "reasoning") {
        raw = generateLogicalQuestion(i, testNum, qSeed, prefix);
      } else if (normalizedCategory === "verbal" || normalizedCategory === "english") {
        raw = generateVerbalQuestion(i, testNum, qSeed, prefix);
      } else {
        // Data interpretation or analytical
        raw = generateDIQuestion(i, testNum, qSeed, prefix);
      }
    }

    const opts = shuffleWithOptions(raw.correctVal, raw.distractors, correctIdx);

    questions.push({
      id: `db-${normTopic.replace(/[^a-z0-9]/g, "-")}-t${testNum}-q${i}`,
      text: raw.text,
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
