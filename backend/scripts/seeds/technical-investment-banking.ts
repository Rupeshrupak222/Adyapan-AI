/**
 * Investment Banking & Finance - Test 1 (empty, questionCount 0).
 *
 * `technology` matches the store's `targetName` so the questions bucket the
 * same way every other technical test does.
 *
 * Concepts are deliberately spread across the areas an equity-research,
 * investment-banking or trading interview actually probes: valuation
 * mechanics, DCF, capital structure, LBO maths, merger arithmetic, fixed
 * income, FX and derivatives basics, and behavioural/risk content.
 */
import { buildTechnicalQuestions, type TechnicalSeedSpec } from "./shared";

const SPECS: TechnicalSeedSpec[] = [
  {
    question:
      "A company has 10 million shares outstanding at Rs 120 per share and 2 million convertible preference shares that can each be converted into 4 common shares. What is the fully diluted share count?",
    options: [
      "10 million",
      "18 million",
      "12 million",
      "20 million",
    ],
    correctIdx: 1,
    explanation:
      "Fully diluted count = existing common shares + shares issuable on conversion = 10m + (2m x 4) = 18m. The treasury-stock and if-converted methods both land on 18m here because the preference shares convert into newly issued common rather than being repurchased.",
    hint: "Convertible preference shares convert into a fixed number of common shares.",
    relatedConcept: "Fully diluted share count and the if-converted method",
    difficulty: "Easy",
    interviewTip:
      "Say the number aloud, then state whether you used the if-converted or treasury-stock method and why.",
  },
  {
    question:
      "In a discounted cash flow valuation, the terminal value is usually taken as a growing perpetuity. Which exit assumption is internally consistent with a declining but still positive FCF stream?",
    options: [
      "A perpetual growth rate equal to or below the risk-free rate",
      "A perpetual growth rate above the nominal GDP growth rate",
      "A perpetual growth rate equal to the WACC",
      "A perpetual growth rate of zero in every case",
    ],
    correctIdx: 0,
    explanation:
      "The Gordon growth formula is TV = FCFn+1 / (WACC - g), so g must stay strictly below WACC and, economically, must not exceed long-run nominal growth of the economy. A g above nominal GDP implies the firm eventually outgrows the economy forever, which is not defensible.",
    hint: "g must be lower than the discount rate and lower than nominal GDP growth.",
    relatedConcept: "Gordon growth terminal value and the g < WACC constraint",
    difficulty: "Hard",
    interviewTip:
      "Always state both constraints explicitly - it is the fastest way to show you understand the model rather than memorising it.",
  },
  {
    question:
      "A firm's WACC is 11%. Its beta is currently 1.4 and the risk-free rate rises by 100 basis points while the equity risk premium is unchanged. Using CAPM and assuming no change in debt weight, what happens to WACC?",
    options: [
      "It rises, because the cost of equity rises",
      "It falls, because the cost of debt falls",
      "It is unchanged, because WACC depends only on capital structure weights",
      "It falls, because beta falls as the risk-free rate rises",
    ],
    correctIdx: 0,
    explanation:
      "CAPM: Re = Rf + beta x ERP. Raising Rf by 100 bps with beta and ERP fixed raises Re by 100 bps, which feeds straight through to WACC through its equity weight. Beta is an empirical sensitivity estimate, not a function of Rf, so it does not fall mechanically.",
    hint: "Rf is an additive term in CAPM, so it passes through one-for-one into the cost of equity.",
    relatedConcept: "CAPM, WACC decomposition and the pass-through of the risk-free rate",
    difficulty: "Medium",
    interviewTip:
      "Walk the bridge: delta Re = delta Rf x beta, then delta WACC = wE x delta Re.",
  },
  {
    question:
      "Two projects have identical cash flow streams but Project A's cash flows arrive earlier in each period. Which statement correctly describes their NPVs at the same discount rate?",
    options: [
      "Project A has a strictly higher NPV, because earlier cash flows are discounted over fewer periods",
      "Both have identical NPVs, because the cash flows are identical in total",
      "Project A has a higher NPV only if the discount rate exceeds 10%",
      "The comparison is meaningless without knowing the initial outlay",
    ],
    correctIdx: 0,
    explanation:
      "NPV discounts each cash flow by (1+r)^t. Moving cash flows earlier lowers t for every positive cash flow, so each term is larger and the total is strictly larger for any r > 0. This is the timing component of the time value of money.",
    hint: "Compare the exponent t term by term.",
    relatedConcept: "Time value of money and the effect of cash flow timing on NPV",
    difficulty: "Easy",
    interviewTip:
      "This is a favourite warm-up question; the polished answer quantifies the difference explicitly.",
  },
  {
    question:
      "In an LBO, a sponsor buys a company at 8.0x EBITDA and exits after 5 years at 9.0x EBITDA, with EBITDA growing at 8% per year. Ignoring debt paydown, which combination describes the exit mechanics?",
    options: [
      "Multiple expansion adds value on top of EBITDA growth",
      "Only EBITDA growth creates value, because the exit multiple is not controllable",
      "Value creation equals the change in the multiple times the entry EBITDA",
      "Multiple expansion destroys value whenever the exit multiple is higher",
    ],
    correctIdx: 0,
    explanation:
      "Exit equity value = exit multiple x exit EBITDA. With EBITDA compounding at 8% and the multiple rising from 8.0x to 9.0x, the two effects multiply: growth drives the EBITDA base, and expansion applies a higher multiple to it. In practice the multiple is far less controllable than the growth, which is why sponsors underwrite primarily to the operating plan.",
    hint: "Exit value is the product of a multiple and an EBITDA number; identify which factor each assumption moves.",
    relatedConcept: "LBO sources of value creation: EBITDA growth, multiple expansion and deleveraging",
    difficulty: "Medium",
    interviewTip:
      "Quantify: entry EV on 100 of EBITDA is 800; exit EBITDA is about 147 and exit EV about 1323, so growth contributes more than the extra turn.",
  },
  {
    question:
      "A merger is structured so that the acquiring firm issues 0.4 new shares for each target share, and the acquirer's pre-deal share price is Rs 500. What is the implied value offered per target share before any premium adjustment?",
    options: [
      "Rs 140",
      "Rs 200",
      "Rs 1,250",
      "Rs 500",
    ],
    correctIdx: 1,
    explanation:
      "Exchange ratio 0.4 x acquirer price Rs 500 = Rs 200 per target share. The Rs 1,250 figure would be the value of the acquirer's shares issued per target share, which is the inverse calculation.",
    hint: "Value per target share = exchange ratio x acquirer share price.",
    relatedConcept: "Merger exchange ratios and implied consideration per target share",
    difficulty: "Easy",
    interviewTip:
      "Watch for the reciprocal trap - interviewers often quote the ratio in the other direction.",
  },
  {
    question:
      "A convertible bond trades at 105 while its conversion value is 118. Relative to the straight bond floor, which statement best characterises the instrument?",
    options: [
      "It is trading below conversion value, so an arbitrageur would convert",
      "It is trading above conversion value, so the option value is positive",
      "It is trading above conversion value, so the option value is negative",
      "The parity can only be assessed once coupon payments begin",
    ],
    correctIdx: 0,
    explanation:
      "The holder pays 105 for a claim worth 118 on conversion, so the option is deep in the money and conversion is immediately profitable. Arbitrageurs can buy at 105 and convert to 118, so parity cannot be violated in the other direction: price must be at least the greater of the straight-bond floor and the conversion value, and above conversion value by the remaining time value of the option. Price = straight-bond value + option value, and the floor is the bond floor.",
    hint: "Conversion arbitrage bounds the price from below at conversion value once parity holds.",
    relatedConcept: "Convertible bond parity, the bond floor and embedded option value",
    difficulty: "Hard",
    interviewTip:
      "State the floor and ceiling together: max(bond floor, conversion value) <= price <= bond floor + option value.",
  },
  {
    question:
      "Which of the following best explains why a company with stable, predictable cash flows and low leverage should trade at a lower cost of equity than a company with volatile cash flows and high leverage in the same industry?",
    options: [
      "Its free cash flow is less sensitive to the business cycle, so its equity beta is lower",
      "Its dividend payout ratio is legally required to be lower",
      "It has more shares outstanding, so each share carries less idiosyncratic risk",
      "Its interest expense is tax-deductible, which reduces the equity beta",
    ],
    correctIdx: 0,
    explanation:
      "Beta measures the sensitivity of equity returns to market returns, and it is driven by cash-flow volatility and financial leverage through the D/E ratio in the Hamada framework. Lower leverage mechanically lowers asset beta and therefore equity beta, and steadier cash flows lower asset beta directly.",
    hint: "Beta is a sensitivity measure; the two inputs are cash-flow volatility and leverage.",
    relatedConcept: "Hamada leverage and asset/equity beta decomposition",
    difficulty: "Medium",
    interviewTip:
      "Reference Hamada explicitly - it signals that you know the mechanism rather than the conclusion.",
  },
  {
    question:
      "A perpetuity pays Rs 100 at the end of each year and yields 8%. What is the price today?",
    options: [
      "Rs 1,000",
      "Rs 1,250",
      "Rs 800",
      "Rs 108",
    ],
    correctIdx: 1,
    explanation:
      "P = C / r = 100 / 0.08 = Rs 1,250. Because the first payment is one year away, no discount factor is applied to the first cash flow - a common source of off-by-one-period errors.",
    hint: "The perpetuity formula has no growth term, so divide the cash flow by the required return.",
    relatedConcept: "Perpetuity valuation and the one-period convention",
    difficulty: "Easy",
    interviewTip:
      "Verify by discounting manually: 100/1.08 + 100/1.08^2 + ... geometric series converges to 1,250.",
  },
  {
    question:
      "In a bootstrap test of an ML model for default prediction, the model has 95% accuracy but recall of 20% on the positive class. What does this imply?",
    options: [
      "It is missing four out of five actual defaults, which is dangerous for a credit decision",
      "It is mislabelling four out of five actual defaults as non-default",
      "It is over-predicting defaults relative to the base rate",
      "It is unusable for any purpose because accuracy alone is meaningless",
    ],
    correctIdx: 0,
    explanation:
      "Recall of 20% on the positive class means the model identifies only 1 in 5 true defaults, so the false-negative rate is 80%. With severe class imbalance, accuracy is dominated by the majority class and can look excellent while the model is nearly useless for the decision it exists to inform.",
    hint: "Recall on the positive class is the true-positive rate; the complement is the false-negative rate.",
    relatedConcept: "Class imbalance, confusion matrix metrics and precision-recall trade-offs",
    difficulty: "Medium",
    interviewTip:
      "Frame it in business terms - missed defaults become credit losses, not just misclassifications.",
  },
  {
    question:
      "A currency pair is quoted as USD/INR at 83.20. If the quote rises to 83.90, what has happened to the rupee?",
    options: [
      "The rupee has appreciated, because one rupee now buys more US dollars",
      "The rupee has depreciated, because more rupees are needed to buy the same dollar",
      "Nothing has changed, because the nominal rate is unchanged",
      "The dollar has depreciated against the rupee",
    ],
    correctIdx: 1,
    explanation:
      "In USD/INR the base currency is the dollar. A rise from 83.20 to 83.90 means it takes more rupees to buy one dollar, so the rupee has depreciated. Direct quotes always move against the quote currency.",
    hint: "In a direct quote the rise is a strengthening of the base currency and a weakening of the quote currency.",
    relatedConcept: "Direct and indirect FX quotations and cross-rate arithmetic",
    difficulty: "Easy",
    interviewTip:
      "Say the base and quote currency out loud before interpreting the direction - it eliminates this class of error.",
  },
  {
    question:
      "A bank holds a 10-year zero-coupon bond with a face value of Rs 1,000. If the spot yield is 6% and it wants to hedge duration, which instrument most directly offsets the rate risk?",
    options: [
      "A long position in a zero-coupon bond of similar maturity",
      "A short position in the same 10-year bond",
      "A long position in a 6-month bill",
      "A long position in an equity index future",
    ],
    correctIdx: 1,
    explanation:
      "Duration measures sensitivity of price to yield. A short position in the same or a highly correlated long-duration bond gains when yields rise, offsetting the loss on the held-to-maturity position. A short bill has almost no duration and an equity future has the wrong risk factor.",
    hint: "Matching duration and sign is what neutralises a parallel yield shift.",
    relatedConcept: "Duration hedging, key-rate risk and the basis mismatch problem",
    difficulty: "Hard",
  },
  {
    question:
      "What is the primary economic difference between a forward contract and a futures contract?",
    options: [
      "Futures require daily marking to market, whereas forwards settle only at maturity",
      "Forwards are exchange-traded while futures are bilateral OTC contracts",
      "Futures are always physically settled whereas forwards are cash settled",
      "Forwards carry counterparty risk whereas futures are fully collateralised",
    ],
    correctIdx: 0,
    explanation:
      "Both can be cash or physically settled and both are available OTC and on exchanges. The genuine structural difference is the daily marking-to-margin process in futures, which converts default risk into variation margin and reduces counterparty exposure; a forward is settled in a single lump at maturity.",
    hint: "Think about when cash actually moves under each contract.",
    relatedConcept: "Forwards vs futures: MTM, margin and counterparty risk",
    difficulty: "Medium",
    interviewTip:
      "Many candidates get this wrong by confusing exchange-traded with centrally cleared; be precise.",
  },
  {
    question:
      "A project has an initial outlay of Rs 500, generates Rs 150 per year for four years and Rs 200 of salvage in year 4, and requires a 12% return. Which statement is correct?",
    options: [
      "NPV is positive because the annuity plus salvage exceeds the initial outlay in present-value terms",
      "NPV is negative because the payback period exceeds three years",
      "The IRR equals 12% because the cash flows are conventional",
      "The project should be rejected because the salvage value is non-operational",
    ],
    correctIdx: 0,
    explanation:
      "PV of the annuity at 12% for 4 years is 150 x 3.0373 = 455.6; PV of salvage is 200/1.12^4 = 127.2. Total PV = 582.8, so NPV = +82.8 and the project should be accepted. Payback period is not the decision rule when the cost of capital is known.",
    hint: "Compute PV of the annuity and PV of the salvage, then compare the sum with the outlay.",
    relatedConcept: "NPV decision rule with terminal cash flows",
    difficulty: "Medium",
    interviewTip:
      "Always show the PV components separately; the salvage term is where most arithmetic errors hide.",
  },
  {
    question:
      "An investment committee is choosing between NPV and IRR for evaluating two mutually exclusive projects. What is the decisive weakness of IRR in this setting?",
    options: [
      "It assumes reinvestment at the cost of capital, whereas NPV assumes reinvestment at the NPV rate",
      "It can rank mutually exclusive projects incorrectly when they differ in scale or timing",
      "It cannot be applied to projects with conventional cash flows",
      "It requires a risk-free rate rather than a cost of capital",
    ],
    correctIdx: 1,
    explanation:
      "When projects differ in scale or in the timing of cash flows, the IRR criterion and the NPV criterion can rank them differently, so IRR alone can select the value-destroying project. NPV is additive and measures absolute value created, which is why it is the governing rule for mutually exclusive choices.",
    hint: "Scale differences create a reinvestment assumption that changes the ranking.",
    relatedConcept: "NPV versus IRR conflict: scale, reinvestment assumption and multiple IRRs",
    difficulty: "Hard",
    interviewTip:
      "Mention the reinvestment-rate flaw of IRR as a bonus - it shows you know why NPV won.",
  },
  {
    question:
      "A company reports EBITDA of Rs 400 and EBIT of Rs 250. If depreciation and amortisation is Rs 150, what does this tell you about the firm?",
    options: [
      "D&A exceeds EBIT, so EBITDA is not a proxy for operating cash flow",
      "D&A is 60% of EBIT, which indicates a very old or heavily depreciated asset base",
      "EBITDA is negative, so leverage is unsustainable",
      "Interest expense is Rs 250",
    ],
    correctIdx: 1,
    explanation:
      "D&A = EBITDA - EBIT = 400 - 250 = 150, which is 60% of EBIT. A ratio that high usually signals either a capital-intensive asset base that is late in its depreciation life or an acquisition accounting step-up, and it matters because high D&A is what makes EBIT understate cash generation.",
    hint: "EBITDA minus EBIT is exactly D&A; compare that to EBIT.",
    relatedConcept: "EBITDA, EBIT and the interpretation of the D&A ratio",
    difficulty: "Medium",
    interviewTip:
      "Call out that D&A is non-cash but signals future capex needs - that is the interviewer's real interest.",
  },
  {
    question:
      "A portfolio earns 14% with a beta of 1.2 when the risk-free rate is 4%. If the portfolio is restructured to a beta of 0.8, holding the risk-free rate and the equity risk premium constant, what is the new expected return?",
    options: [
      "10.7%",
      "12.0%",
      "9.3%",
      "14.0%",
    ],
    correctIdx: 0,
    explanation:
      "From the first portfolio, ERP = (14% - 4%) / 1.2 = 8.33%. The expected return falls in proportion to beta, so the new return is 4% + 0.8 x 8.33% = 10.67%, about 10.7%. Equivalently the return falls by 0.4 x ERP = 3.33 percentage points, giving 14% - 3.33% = 10.67%.",
    hint: "Beta falls by 0.4, so the expected return must fall by 0.4 times the equity risk premium. Back the ERP out of the given pair first.",
    relatedConcept: "CAPM and expected return as a linear function of systematic risk",
    difficulty: "Hard",
    interviewTip:
      "Derive the ERP from the given pair instead of assuming a market convention; interviewers reward the derivation.",
  },
  {
    question:
      "A firm is comparing a new-issue bond with a seasoned bond of identical seniority and rating. Which factor most directly explains a lower yield on the seasoned bond?",
    options: [
      "Liquidity premium: seasoned issues typically trade more actively",
      "Maturity: seasoned bonds are always longer-dated",
      "Coupon: seasoned bonds carry a lower coupon",
      "Call protection: seasoned bonds are less likely to be called",
    ],
    correctIdx: 0,
    explanation:
      "On-the-run issues trade actively and carry concession, while off-the-run seasoned paper trades less and therefore commands a liquidity premium, so it yields more. Maturity and coupon are irrelevant to yield for identical promised cash flows, and call protection affects option value rather than liquidity.",
    hint: "Two bonds with identical cash flows can only differ in yield through liquidity or tax treatment.",
    relatedConcept: "On-the-run versus off-the-run yields and the liquidity premium",
    difficulty: "Hard",
    interviewTip:
      "Memorise the term 'on-the-run concession' - fixed income interviewers use it constantly.",
  },
  {
    question:
      "A start-up raises Rs 50 crore at a pre-money valuation of Rs 150 crore. What is the post-money valuation and the investor's percentage ownership before any anti-dilution or option pool?",
    options: [
      "Rs 200 crore and 25%",
      "Rs 150 crore and 33.3%",
      "Rs 200 crore and 33.3%",
      "Rs 50 crore and 50%",
    ],
    correctIdx: 0,
    explanation:
      "Post-money = pre-money + new money = 150 + 50 = Rs 200 crore. Investor ownership = new money / post-money = 50/200 = 25%. The classic mistake is dividing by pre-money, which yields 33.3%.",
    hint: "Ownership is the new investment divided by post-money value.",
    relatedConcept: "Venture financing arithmetic and pre-money versus post-money valuation",
    difficulty: "Easy",
    interviewTip:
      "Say both numbers explicitly and then sanity-check that pre- and post-investor percentages sum to 100%.",
  },
  {
    question:
      "A trader buys a call for Rs 40 and simultaneously sells a put for Rs 55, both struck at Rs 500 on the same underlying with the same expiry. What is the position at expiry?",
    options: [
      "Maximum profit unlimited, maximum loss Rs 485",
      "Maximum profit Rs 95, maximum loss Rs 15",
      "Maximum profit Rs 15, maximum loss unlimited",
      "Maximum profit Rs 55, maximum loss Rs 40",
    ],
    correctIdx: 0,
    explanation:
      "Long call plus short put is a synthetic long. Net premium received is 55 - 40 = Rs 15, so expiry payoff is (S - 500) + 15. As S rises the profit is unlimited; at S = 0 the payoff is -500 + 15 = -485, which is the maximum loss, that is, strike less the net premium received.",
    hint: "Net the premium flows first: you are long a call and short a put, so you have a synthetic long.",
    relatedConcept: "Synthetic long, net premium and payoff analysis of option combinations",
    difficulty: "Hard",
    interviewTip:
      "Draw the two payoff lines on one axis; the combined line has slope +1 and crosses at the strike plus net premium.",
  },
  {
    question:
      "A bank is required to hold regulatory capital against its risk-weighted assets. Which balance-sheet item typically attracts the highest risk weight under the standardised approach?",
    options: [
      "Subordinated debt issued by a corporate borrower",
      "Cash and balances with central banks",
      "Claims secured on residential property",
      "Interbank claims on a Grade-A bank",
    ],
    correctIdx: 0,
    explanation:
      "Under standardised Basel approaches, cash and claims on sovereigns or top-tier banks carry near-zero risk weights, while corporate subordinated exposures sit in the higher corporate bucket because they absorb losses before senior claims. The specific weights vary by jurisdiction and Basel version, but the ordering is stable.",
    hint: "Rank by seniority and by the strength of the counterparty.",
    relatedConcept: "Basel standardised approach, risk weights and capital adequacy",
    difficulty: "Hard",
    interviewTip:
      "State that exact weights are jurisdiction-dependent and give the relative ordering, which is what the question tests.",
  },
  {
    question:
      "A firm's ROCE is 18% while its WACC is 11%. Assuming the firm is not distressed and the accounting is clean, what does the positive spread imply?",
    options: [
      "The firm is creating economic value and should grow while spreads persist",
      "The firm must be over-levered, since high returns on equity always indicate high leverage",
      "ROCE and WACC are unrelated metrics",
      "The firm should distribute all earnings because growth destroys value",
    ],
    correctIdx: 0,
    explanation:
      "A positive ROCE minus WACC spread of 7 percentage points means each rupee of capital employed earns 7 paise more than its opportunity cost, so growth creates value and the firm should reinvest while the spread persists. The spread can narrow, so reinvestment should be conditional on its durability.",
    hint: "Compare the return on capital with the cost of that capital.",
    relatedConcept: "Economic value added, ROCE-WACC spread and value-creative growth",
    difficulty: "Medium",
    interviewTip:
      "Add the caveat that the spread must be sustainable, which distinguishes a strong answer from a rote one.",
  },
  {
    question:
      "In a backtest, a strategy's Sharpe ratio is 3.0 on six months of daily data and 0.6 on ten years of daily data. What is the most likely explanation?",
    options: [
      "The short sample overstated performance through luck, small-sample bias and cost understatement",
      "The strategy genuinely improved over time",
      "Sharpe ratios are not comparable across different frequencies",
      "The ten-year period must contain a crisis that reduces returns",
    ],
    correctIdx: 0,
    explanation:
      "Sample estimates of Sharpe are upward-biased in small samples because the denominator (the volatility estimate) is itself estimated from the same few observations, and short samples miss regimes, costs and slippage. A fall from 3.0 to 0.6 with more data is the classic signature of small-sample overfitting.",
    hint: "Think about the statistical properties of an estimated mean divided by an estimated standard deviation.",
    relatedConcept: "Backtest overfitting, small-sample bias in Sharpe estimation and the Deflated Sharpe ratio",
    difficulty: "Hard",
    interviewTip:
      "Reference multiple-testing or the Deflated Sharpe ratio - it shows awareness of the research literature.",
  },
  {
    question:
      "What is the main advantage of using an EBITDA multiple rather than a P/E multiple when comparing two companies in the same industry?",
    options: [
      "It is unaffected by differences in capital structure and depreciation policy",
      "It is always higher than the P/E multiple",
      "It requires no forecast and is therefore more reliable",
      "It directly measures the return to equity holders",
    ],
    correctIdx: 0,
    explanation:
      "EBITDA sits above interest and taxes and before depreciation, so it is largely neutral to leverage and to depreciation policy - two common sources of spurious comparison. The trade-off is that it ignores the real economic cost of capex, so EV/EBITDA is normally paired with margin and capex analysis rather than used alone.",
    hint: "Identify which accounting choices EBITDA deliberately removes.",
    relatedConcept: "EV/EBITDA versus P/E and the normalisation of capital structure effects",
    difficulty: "Medium",
    interviewTip:
      "State the limitation as well - EBITDA is not free of distortion, it simply standardises two of them.",
  },
  {
    question:
      "A company's cash flow statement shows negative free cash flow of Rs 300 crore despite EBIT of Rs 450 crore. Which explanation is least likely?",
    options: [
      "The company has a very high dividend payout ratio",
      "A large one-time restructuring cash outflow",
      "Sustained working capital build from rapid growth",
      "Heavy capital expenditure on a new plant",
    ],
    correctIdx: 0,
    explanation:
      "A high dividend payout reduces the cash available to the firm but is a distribution decision, not a reason that cash generated by operations fails to cover investment. Restructuring charges, working capital build and capex are the classic operating causes of negative FCF despite positive EBIT.",
    hint: "Separate distributions, which happen after cash is generated, from the cash flows that determine FCF.",
    relatedConcept: "Free cash flow bridge, capex cycle and working capital dynamics",
    difficulty: "Medium",
    interviewTip:
      "Walk the bridge: EBITDA to EBIT to NOPAT to CFO to capex, naming each deduction as you go.",
  },
  {
    question:
      "Two companies have identical WACCs and identical growth rates, but Company A reinvests 40% of earnings while Company B reinvests 15%. Under a growth-driven value model, what must be true?",
    options: [
      "Company B must have a higher return on invested capital to sustain its growth",
      "Company A must be more valuable because it reinvests more",
      "The two companies must be worth the same",
      "Company B must have higher leverage, since WACC is identical",
    ],
    correctIdx: 0,
    explanation:
      "Sustainable growth in the value-driver framework requires g = ROCE x reinvestment rate. With identical g, a lower reinvestment rate forces a proportionally higher ROCE, so the company that grows while reinvesting less must be far more capital-efficient.",
    hint: "Solve the growth equation for return on capital when growth and reinvestment are fixed.",
    relatedConcept: "Value-driver model: g = ROCE x reinvestment rate",
    difficulty: "Hard",
    interviewTip:
      "This is McKinsey's value-driver formula; writing it out earns credibility immediately.",
  },
  {
    question:
      "A euro-denominated bond pays a coupon 200 basis points below a dollar bond of identical maturity and credit quality. What does the spread most directly indicate?",
    options: [
      "The market is pricing higher interest-rate risk or reduced demand for euro exposure",
      "The euro issuer is more likely to default than the dollar issuer",
      "The dollar bond has a longer maturity than the euro bond",
      "The euro bond is more liquid than the dollar bond",
    ],
    correctIdx: 0,
    explanation:
      "With credit quality held constant, a yield differential between currencies is a market price of interest-rate risk and liquidity in that currency, driven by the relative expected path of policy rates and by demand for the currency. It is not a default signal.",
    hint: "Control for credit and maturity, and ask what the remaining difference measures.",
    relatedConcept: "Cross-currency yield differentials and interest-rate parity",
    difficulty: "Hard",
    interviewTip:
      "Mention covered interest rate parity as the arbitrage framework that links these yields.",
  },
  {
    question:
      "A share trades at Rs 500. A rights issue offers one new share for every two held, at a 20% discount to the current market price. What is the theoretical ex-rights price?",
    options: [
      "Rs 466.67",
      "Rs 450.00",
      "Rs 400.00",
      "Rs 480.00",
    ],
    correctIdx: 0,
    explanation:
      "Subscription price = 500 x 0.80 = Rs 400. TERP weights the two old shares and the one new share by price: (2 x 500 + 1 x 400) / 3 = 1,400 / 3 = Rs 466.67. The theoretical value transfer per old share is 500 - 466.67 = Rs 33.33, exactly the value of the subscription discount on one new share, which is what makes a rights issue theoretically wealth-neutral.",
    hint: "TERP weights the old price and the subscription price by the old and new share counts.",
    relatedConcept: "Theoretical ex-rights price and the wealth-neutrality of rights issues",
    difficulty: "Medium",
    interviewTip:
      "Derive the 33.33 per-share value transfer as a check on the TERP calculation.",
  },
  {
    question:
      "Which statement best describes the purpose of a fairness opinion in a merger?",
    options: [
      "To provide an independent assessment of whether the consideration is fair to minority shareholders",
      "To guarantee that the transaction will obtain antitrust clearance",
      "To certify that the acquirer's financial statements are accurate",
      "To promise shareholders a minimum post-merger share price",
    ],
    correctIdx: 0,
    explanation:
      "A fairness opinion is an independent valuation-based judgement about whether the terms are fair from the financial point of view to those not receiving a control premium. It is not an assurance of regulatory outcome, accounting accuracy or future price, and the opinion itself is explicitly non-binding.",
    hint: "Fairness is defined relative to a defined constituency and valuation range.",
    relatedConcept: "Fairness opinions, fiduciary duty and the valuation range concept",
    difficulty: "Medium",
    interviewTip:
      "Note the non-binding nature and the controlling-shareholder conflict, which are the practical controversies.",
  },
  {
    question:
      "A hedge fund reports a Sharpe ratio of 1.4 with 60% of returns in a single illiquid position valued at management's own marks. What is the key methodological concern?",
    options: [
      "Smoothed, self-priced valuations inflate measured returns and understate volatility",
      "The Sharpe ratio cannot exceed 2.0 by construction",
      "Illiquid positions are always inappropriate for a hedge fund",
      "The position size implies a leverage violation",
    ],
    correctIdx: 0,
    explanation:
      "When a large share of NAV is priced infrequently and by the manager, returns are smoothed and volatility is understated, which biases the Sharpe ratio upward. Standard fixes include using third-party marks, applying a liquidity discount, or widening the reporting frequency.",
    hint: "Consider what happens to measured volatility when prices only update quarterly.",
    relatedConcept: "Smoothed pricing, stale-price bias and reported Sharpe reliability",
    difficulty: "Hard",
    interviewTip:
      "Connect it to the wider debate on private-asset marks and smooth historical returns.",
  },
];

export const INVESTMENT_BANKING_QUESTIONS = buildTechnicalQuestions(SPECS, {
  idPrefix: "mcq-tech-investment-banking-t1",
  technology: "Investment Banking & Finance",
  expectCount: 30,
});

export const INVESTMENT_BANKING_SPEC_COUNT = SPECS.length;