/**
 * Clinical Trial & Research (Pharma) - Test 1 (empty, questionCount 0).
 *
 * `technology` matches the store's `targetName`.
 *
 * Covers the regulatory and scientific content a clinical research interview
 * probes: phase design, endpoints, randomisation and blinding, statistics
 * (power, sample size, multiplicity, interim analysis), safety reporting,
 * GCP/GLP/GMP boundaries, ethics, pharmacovigilance and pharmacokinetics.
 */
import { buildTechnicalQuestions, type TechnicalSeedSpec } from "./shared";

const SPECS: TechnicalSeedSpec[] = [
  {
    question:
      "What is the principal difference between a primary and a secondary endpoint in a confirmatory trial?",
    options: [
      "A primary endpoint is the one prespecified to drive the primary hypothesis test; a secondary endpoint supports supportive or exploratory analysis",
      "A primary endpoint is always measured at screening",
      "Secondary endpoints must be objective while primary endpoints are subjective",
      "There is no regulatory difference between them",
    ],
    correctIdx: 0,
    explanation:
      "The primary endpoint is defined prospectively in the protocol and carries the inferential burden of the trial; multiplicity control and the decision to reject the null are built around it. Secondary endpoints are supportive, exploratory or hypothesis-generating, and are interpreted with appropriate caution unless the primary is met and they are formally controlled.",
    hint: "Ask which endpoint the power calculation and the alpha spending were built around.",
    relatedConcept: "Primary and secondary endpoints, prespecification and multiplicity control",
    difficulty: "Medium",
    interviewTip:
      "Mention that changing the primary endpoint after unblinding invalidates the trial; that is the key regulatory consequence.",
  },
  {
    question:
      "A trial needs 90% power at a two-sided alpha of 0.05 to detect a hazard ratio of 0.75. Which factor most directly determines the required sample size beyond these parameters?",
    options: [
      "The event rate, since the number of subjects required depends on how many events accumulate over the follow-up period",
      "The sponsor's commercial preference",
      "The number of participating countries",
      "The colour of the case report forms",
    ],
    correctIdx: 0,
    explanation:
      "Event-driven designs size the trial on the number of events, not the number of randomised subjects. The required events come from the effect size, alpha, power and allocation ratio, and the sample size follows from events divided by the expected event rate. A low event rate, for example in a slow-progressing disease, forces a much larger and longer recruitment.",
    hint: "Distinguish the number of subjects from the number of events.",
    relatedConcept: "Sample size calculation, event-driven designs and event rates",
    difficulty: "Medium",
    interviewTip:
      "Adding that dropout must be inflated on top of the calculated requirement shows you understand recruitment feasibility.",
  },
  {
    question:
      "Which feature best distinguishes a superiority trial from a non-inferiority trial?",
    options: [
      "A non-inferiority trial is designed to show the new treatment is no worse than the control by a pre-specified margin, so it requires a conservative variance assumption",
      "A superiority trial must be powered to detect no difference",
      "A non-inferiority trial does not need a control arm",
      "Superiority trials cannot be blinded",
    ],
    correctIdx: 0,
    explanation:
      "Non-inferiority designs shift the null hypothesis from equality to a margin, and because the conclusion rests on the upper confidence bound, the analysis must be conservative: dropping participants or missing data can bias the estimate toward the control and manufacture a false non-inferiority conclusion. This is why regulators demand very low protocol violation and dropout rates in such trials.",
    hint: "Ask what happens to the conclusion if the analysis set loses subjects.",
    relatedConcept: "Non-inferiority trials, the non-inferiority margin and the per-protocol set",
    difficulty: "Hard",
    interviewTip:
      "Explain the ITT versus per-protocol bias in non-inferiority; that is the classic exam trap.",
  },
  {
    question:
      "In a randomised trial, the randomisation sequence is generated centrally and the assignment list is held centrally. What risk does this specifically control?",
    options: [
      "Predictability and subversion of assignment by recruiters who could otherwise recruit patients based on the next assignment",
      "Loss of statistical power",
      "Measurement error in the outcome assessor",
      "Imbalance in baseline characteristics",
    ],
    correctIdx: 0,
    explanation:
      "Concealed, centrally generated allocation addresses predictability and selection: if recruiters can know the next assignment they may enrol selectively or delay enrolment, which destroys randomisation and biases the comparison. Blinding addresses measurement and performance bias separately, while allocation concealment addresses who gets enrolled at all. Randomisation itself already balances characteristics in expectation.",
    hint: "Separate concealment of allocation from blinding of treatment.",
    relatedConcept: "Allocation concealment, randomisation bias and CONSORT reporting",
    difficulty: "Medium",
    interviewTip:
      "Point out that baseline imbalance is the signal that randomisation or concealment has failed.",
  },
  {
    question:
      "An interim analysis shows p = 0.03 for the primary endpoint, but the protocol's pre-specified alpha was 0.05 with no interim provision. What is the correct conclusion?",
    options: [
      "The p-value is not valid for the claim because the unplanned look inflates the type I error rate; the result is exploratory and requires confirmation",
      "The trial can stop immediately because p is below 0.05",
      "The result must be reported as significant but with a caveat",
      "The alpha must be retrospectively reset to 0.025",
    ],
    correctIdx: 0,
    explanation:
      "Every additional look at the data inflates the probability of a false positive, and an unplanned interim look is not covered by any alpha-spending function. Retrospectively re-specifying alpha after seeing the data is not legitimate, so the claim must be treated as exploratory or repeated in a confirmatory trial. Legitimate interim analyses are prespecified with an alpha-spending boundary such as O'Brien-Fleming.",
    hint: "Ask whether the look was planned before the data were seen.",
    relatedConcept: "Interim analysis, alpha spending and multiplicity from repeated looks",
    difficulty: "Hard",
    interviewTip:
      "Mention that stopping for efficacy can also bias the effect-size estimate upward, not just the p-value.",
  },
  {
    question:
      "A pharmacokinetic study reports Cmax and Tmax. What do these parameters describe?",
    options: [
      "The peak concentration and the time to that peak after dosing",
      "The total amount absorbed and the fraction excreted unchanged",
      "The volume of distribution and the clearance",
      "The half-life and the accumulation ratio",
    ],
    correctIdx: 0,
    explanation:
      "Cmax and Tmax are absorption-linked descriptors of the concentration-time curve: Cmax reflects both absorption rate and extent, and Tmax reflects absorption rate alone. Bioavailability measures F or AUC, while Vd, CL and t-half are disposition parameters derived from elimination and distribution.",
    hint: "Separate absorption-phase from distribution and elimination parameters.",
    relatedConcept: "Pharmacokinetic parameters, Cmax, Tmax and bioavailability",
    difficulty: "Easy",
    interviewTip:
      "Add that non-compartmental exposure metrics are what regulatory submissions actually rely on.",
  },
  {
    question:
      "A serious adverse event occurs in a trial subject. Within what timeframe must it be reported to the regulator under ICH E2A and related guidance?",
    options: [
      "Expedited reporting within 24 hours for fatal or life-threatening events and no later than 15 calendar days for other serious events, with follow-up reports as needed",
      "Only at the next scheduled safety review meeting",
      "Within 90 days regardless of severity",
      "Only if the event is unexpected and related",
    ],
    correctIdx: 0,
    explanation:
      "Serious adverse events are expedited-reportable regardless of relatedness or expectation: fatal or life-threatening events within 24 hours, and other serious events within 15 calendar days, with additional follow-up reports when new information arrives. Non-serious events are handled through the periodic safety update report instead. The distinction is seriousness, not causality.",
    hint: "Confirm whether the trigger for expedited reporting is seriousness or causality.",
    relatedConcept: "Pharmacovigilance, ICH E2A expedited reporting and safety signal management",
    difficulty: "Medium",
    interviewTip:
      "Distinguish individual case safety reports from periodic safety update reports; both appear on every CV curriculum.",
  },
  {
    question:
      "A study compares two treatments and finds a result significant at p = 0.03 across 20 separate primary-looking endpoints. What is the most likely explanation for more apparent significance than expected?",
    options: [
      "Multiplicity: uncorrected multiple comparisons inflate the family-wise error rate well above 5%",
      "The sample size was too small",
      "The effect size was underestimated",
      "The data were normally distributed",
    ],
    correctIdx: 0,
    explanation:
      "Testing 20 endpoints each at 0.05 gives a family-wise error rate of 1 - 0.95^20, about 64%, so roughly two-thirds of such studies will show at least one spurious 'significant' result. Correction for multiplicity, or a pre-specified hierarchical testing sequence where each level is tested only if the previous one succeeds, is required to control this.",
    hint: "Compute the probability of at least one false positive across independent tests.",
    relatedConcept: "Multiplicity control, family-wise error rate and gatekeeping procedures",
    difficulty: "Hard",
    interviewTip:
      "Quote the Bonferroni threshold of 0.0025 and the gatekeeping alternative; both are commonly expected.",
  },
  {
    question:
      "What is the primary ethical justification for randomised controlled trials despite the known burdens on participants?",
    options: [
      "Clinical equipoise and the resulting contribution to knowledge that benefits future patients, offsetting individual risk",
      "The commercial benefit to the sponsor",
      "The regulatory requirement for marketing approval",
      "The convenience of data collection for investigators",
    ],
    correctIdx: 0,
    explanation:
      "Research equipoise requires genuine uncertainty about which arm is superior, so no consenting participant is knowingly denied the better treatment, and the knowledge produced is the social justification for the burden. Commercial and regulatory interests are legitimate operational drivers but are not the ethical justification, and convenience has no standing in the balance.",
    hint: "Ask whether equipoise holds: do we already know which arm is better?",
    relatedConcept: "Clinical equipoise, informed consent and the ethical justification for randomisation",
    difficulty: "Medium",
    interviewTip:
      "Link to the Declaration of Helsinki and to post-trial access provisions for participants.",
  },
  {
    question:
      "A bioequivalence study compares test and reference formulations. What is the primary purpose of the 90% confidence interval for AUC and Cmax?",
    options: [
      "To demonstrate that the test formulation's exposure is within a pre-specified range of the reference, typically 80-125%",
      "To test whether the formulations are chemically identical",
      "To establish that the reference product is superior",
      "To measure the elimination half-life of both products",
    ],
    correctIdx: 0,
    explanation:
      "The 90% interval is used rather than 95% because it corresponds to a one-sided 5% test, matching the conventional bioequivalence criterion of 80-125% for both AUC and Cmax. It demonstrates comparable rate and extent of absorption, not chemical identity and not superiority in either direction.",
    hint: "Work out why the interval confidence level is 90% rather than 95%.",
    relatedConcept: "Bioequivalence, the 80-125% acceptance range and the 90% confidence interval",
    difficulty: "Hard",
    interviewTip:
      "Mention that a confidence interval entirely inside the bounds is required, with both limits assessed on the log-transformed scale.",
  },
  {
    question:
      "A pharmacovigilance database shows a statistically significant increase in a rare adverse event. Why is a disproportionality signal not sufficient to conclude causality?",
    options: [
      "Disproportionality analyses are vulnerable to reporting bias, confounding by indication and under-reporting, so they generate hypotheses rather than establish causation",
      "Disproportionality analyses require a p-value below 0.001",
      "Only case series can ever be used in pharmacovigilance",
      "The events are too rare to analyse statistically",
    ],
    correctIdx: 0,
    explanation:
      "Spontaneous reporting systems suffer from stimulated reporting around a safety concern, under-reporting of common events, duplicate cases and confounding by the underlying disease that made the drug prescribed. Disproportionality therefore generates a signal that must be tested with case-by-case assessment, epidemiological studies or randomised data before causality can be attributed.",
    hint: "Ask what biases affect voluntary reporting systems.",
    relatedConcept: "Pharmacovigilance signal detection, disproportionality analysis and causality assessment",
    difficulty: "Hard",
    interviewTip:
      "Mention the formal signal validation and the Qualified Person for Pharmacovigilance process.",
  },
  {
    question:
      "What does Good Clinical Practice (ICH E6) primarily require of the investigator?",
    options: [
      "That the rights, safety and well-being of the participant prevail over the interests of science and society",
      "That the investigator completes the trial within the agreed timeline",
      "That the investigator enrols a target number of participants",
      "That the investigator publishes the results whatever they are",
    ],
    correctIdx: 0,
    explanation:
      "The first GCP principle is that subject rights, safety and well-being take precedence over scientific or societal interests, which underpins informed consent, the requirement for favourable ethics approval and the duty to report adverse events. Timeline, enrolment and publication duties are good practice but are secondary principles.",
    hint: "Identify the highest-ranking principle in the GCP framework.",
    relatedConcept: "ICH E6 GCP, participant protection and informed consent",
    difficulty: "Easy",
    interviewTip:
      "Add the practical implication: protocol compliance, source data integrity and delegation logging are all GCP obligations.",
  },
  {
    question:
      "A dose-escalation study uses the modified toxicity probability interval 2 design. What problem does it primarily address?",
    options: [
      "Patient exposure to excessively toxic doses, which is the dominant ethical risk in first-in-human studies",
      "Slow recruitment",
      "High dropout from adverse events in later stages",
      "The need for a concurrent control arm",
    ],
    correctIdx: 0,
    explanation:
      "The modified toxicity probability interval approach sets dose-escalation boundaries from observed dose-limiting toxicities so that the probability of exceeding the maximum tolerated dose stays within a predefined ceiling, typically 0.33 in early phase work. It is designed for first-in-human safety, not for recruitment or dropout, and it does not require a control arm.",
    hint: "Ask what harm is most likely in a first-in-human dose escalation.",
    relatedConcept: "Dose escalation, mTPI-2 and the 3+3 design limitations",
    difficulty: "Hard",
    interviewTip:
      "Contrast with the rule-based 3+3 design, which is slower and less informative about the maximum tolerated dose.",
  },
  {
    question:
      "A new molecular entity shows a large volume of distribution. What clinical implication follows?",
    options: [
      "Loading doses may be required because the time to reach steady-state concentration is long, and the drug may accumulate in tissue",
      "The elimination half-life must be short",
      "The drug is unlikely to cross membranes",
      "Protein binding will be low",
    ],
    correctIdx: 0,
    explanation:
      "A large volume of distribution means extensive tissue binding or sequestration relative to plasma binding, which prolongs the time constant to steady state and increases total body accumulation. Clinically this argues for a loading dose to reach therapeutic concentrations faster and for caution in re-dosing as accumulation occurs. It does not itself determine half-life, membrane permeability or binding fraction.",
    hint: "Consider the time constant to steady state, which is driven by volume of distribution.",
    relatedConcept: "Volume of distribution, loading doses and time to steady state",
    difficulty: "Medium",
    interviewTip:
      "Add that apparent Vd can be an artefact in patients with oedema, ascites or renal replacement therapy.",
  },
  {
    question:
      "A trial's primary endpoint is a composite of death, myocardial infarction and stroke. What is the principal statistical pitfall?",
    options: [
      "The first component in the composite drives the result, so the treatment effect on the composite may not reflect the effect on every component",
      "Composite endpoints always increase sample size requirements",
      "Composite endpoints cannot be adjusted for multiplicity",
      "Composite endpoints are prohibited by regulators for cardiovascular trials",
    ],
    correctIdx: 0,
    explanation:
      "A composite is powered by whichever component occurs most often or changes most, usually the first in sequence, so a benefit driven by a less common component can be masked or a benefit on a component can be diluted. Interpretation requires the components to be reported individually, and regulators caution against composites mixing fatal and non-fatal outcomes or related and unrelated events.",
    hint: "Ask which component contributes most events to the composite.",
    relatedConcept: "Composite endpoints, component reporting and interpretation pitfalls",
    difficulty: "Hard",
    interviewTip:
      "Mention that win-ratio and prioritized composite methods attempt to address the frequency imbalance.",
  },
  {
    question:
      "A pharmacovigilance team needs to detect rare adverse drug reactions that appear weeks after exposure. Which study design is most efficient for this purpose?",
    options: [
      "An active comparator cohort study using linked dispensing and hospitalisation data",
      "An uncontrolled series of case reports submitted to the regulator",
      "A meta-analysis of unpublished case notes with no denominator",
      "A single-centre randomised trial of one dose level",
    ],
    correctIdx: 0,
    explanation:
      "An active comparator, new-user cohort design has a defined denominator and an exposed and unexposed group, so background rates can be compared and a temporal association with delayed onset can be quantified efficiently across large populations. Spontaneous case reports have no denominator, and a randomised trial is powered for efficacy, not for detecting rare harms.",
    hint: "Ask which design provides a denominator and a comparator group.",
    relatedConcept: "Active surveillance, cohort study designs and database pharmacovigilance",
    difficulty: "Medium",
    interviewTip:
      "Weigh it against trial follow-up: trials are underpowered for rare harms because events are rare by construction.",
  },
  {
    question:
      "Which of the following best describes the purpose of a Data Monitoring Committee in a clinical trial?",
    options: [
      "To review accumulating unblinded safety and efficacy data at prespecified points and recommend continuation, modification or stopping",
      "To audit the site's source data at the end of the trial",
      "To approve the protocol before the trial begins",
      "To analyse the primary endpoint and publish the results",
    ],
    correctIdx: 0,
    explanation:
      "An independent DMC examines unblinded data against prespecified boundaries to protect participants from unexpected harm or futility, and recommends whether to continue, modify the protocol, adjust the sample size or stop. Ethics committee approval, site audit and endpoint analysis are separate functions carried out by different parties.",
    hint: "Distinguish the ongoing independent oversight function from the pre-trial and post-trial activities.",
    relatedConcept: "Data Monitoring Committees, group sequential designs and trial oversight",
    difficulty: "Medium",
    interviewTip:
      "Note the operational protection: the DMC charter defines membership, meeting frequency and the confidentiality firewall.",
  },
  {
    question:
      "In a pharmacokinetic study, why is a single time-point concentration insufficient to estimate clearance?",
    options: [
      "Because clearance depends on the area under the concentration-time curve, which requires multiple time points across the full profile",
      "Because single samples cannot be measured accurately",
      "Because clearance is a function of body weight only",
      "Because volume of distribution can be obtained from one sample",
    ],
    correctIdx: 0,
    explanation:
      "Clearance equals dose divided by AUC, so the entire concentration-time profile is required to compute exposure. A single point can give an approximate steady-state clearance only under tightly controlled constant infusion with known dosing interval, and it cannot characterise absorption or distribution at all.",
    hint: "Recall the CL equals dose over AUC relationship.",
    relatedConcept: "Non-compartmental pharmacokinetics, AUC estimation and clearance calculation",
    difficulty: "Medium",
    interviewTip:
      "Mention sparse sampling and population PK modelling as the practical answer when time points are limited.",
  },
  {
    question:
      "A participant in a blinded trial suspects which arm they are in and alters their behaviour accordingly. What does this threaten?",
    options: [
      "Performance bias, a direct threat to the validity of the treatment comparison",
      "Randomisation integrity",
      "The statistical power of the trial",
      "The regulatory acceptability of the endpoint",
    ],
    correctIdx: 0,
    explanation:
      "When participants modify behaviour because they guess their assignment, the difference in outcomes can no longer be attributed to the treatment alone; this is performance bias. Breaking the blind does not in itself break randomisation, which happened at allocation. Expectancy effects are precisely what blinding is designed to eliminate, and trials often assess the success of blinding.",
    hint: "Distinguish the three internal-validity domains: confounding, information bias and selection bias.",
    relatedConcept: "Performance bias, blinding and the three threats to trial validity",
    difficulty: "Medium",
    interviewTip:
      "Contrast with detection bias, which is the assessor equivalent, and note that both are prevented by concealment.",
  },
  {
    question:
      "A new analgesic is tested against placebo in patients with post-operative pain. The primary outcome is pain intensity on a numeric rating scale. What is the principal risk with this choice?",
    options: [
      "Subjective reporting and expectation effects, plus placebo response and regression to the mean, can inflate the apparent treatment effect",
      "The scale cannot detect a change of any size",
      "Pain cannot be measured at all in post-operative patients",
      "The scale has no validated scoring anchors",
    ],
    correctIdx: 0,
    explanation:
      "A subjective outcome in an unblinded-comparison context is vulnerable to expectation and reporting bias, placebo response and regression to the mean, all of which favour the intervention in a placebo-controlled design. Blinding, objective or composite supportive endpoints such as rescue medication consumption, and pre-specified analysis of the blinding success all mitigate this. The NRS itself is a validated, widely used instrument.",
    hint: "Ask what biases affect a subjective endpoint in a placebo-controlled design.",
    relatedConcept: "Subjective endpoints, placebo response and bias mitigation in analgesic trials",
    difficulty: "Medium",
    interviewTip:
      "Suggest rescue analgesic consumption as a co-primary or supportive objective measure.",
  },
  {
    question:
      "Which of the following best explains why a positive trial in a narrow population may not change practice for a broader population?",
    options: [
      "External validity: inclusion criteria, background therapy and outcome ascertainment in a trial rarely match every real-world setting",
      "Internal validity, which is weaker in narrow trials",
      "The trial necessarily used an inadequate sample size",
      "The regulatory authority ignored the data",
    ],
    correctIdx: 0,
    explanation:
      "External validity is about generalisability, and it is limited by restrictive eligibility criteria, controlled background therapy, surrogate-heavy endpoints and specialist centres. A trial can be internally valid and still not change prescribing for a population excluded by its criteria, which is why post-authorisation studies and real-world data matter.",
    hint: "Separate the questions of credibility within the study and applicability outside it.",
    relatedConcept: "External validity, generalisability and post-authorisation observational studies",
    difficulty: "Medium",
    interviewTip:
      "Connect to the concept of an effect modifier: what matters is whether effect modifiers differ between trial and practice populations.",
  },
  {
    question:
      "A paediatric trial is planned with an adapted design. Which approach most reduces the ethical and practical burden while preserving validity?",
    options: [
      "Starting with a pharmacokinetic and safety study in a small cohort before proceeding to efficacy",
      "Including adults in the same trial to increase power",
      "Reducing the sample size below statistical requirements",
      "Excluding pharmacovigilance follow-up after approval",
    ],
    correctIdx: 0,
    explanation:
      "A staged or adaptive design begins by characterising pharmacokinetics and tolerability in a small number of children, then uses that information to dose subsequent cohorts rationally, so no child is exposed to an unknown or inappropriate dose. Including adults changes the population rather than the sample size, reducing power in the paediatric subgroup, and under-powering sacrifices validity.",
    hint: "Consider what evidence is needed before exposing more children.",
    relatedConcept: "Paediatric drug development, adaptive designs and dose-finding in children",
    difficulty: "Hard",
    interviewTip:
      "Mention the regulatory incentives for paediatric studies and the need for long-term safety follow-up on growth and development.",
  },
  {
    question:
      "Which analysis is the primary safeguard against bias in a randomised trial where participants and outcome assessors are both blinded?",
    options: [
      "Intention-to-treat analysis of all randomised participants, regardless of adherence",
      "Per-protocol analysis of only those who completed the trial",
      "Analysis of the last observation carried forward only",
      "As-treated analysis regrouping participants by actual treatment received",
    ],
    correctIdx: 0,
    explanation:
      "Intention-to-treat preserves the benefits of randomisation because it keeps the groups comparable as allocated, so a differential dropout or crossover rate cannot reintroduce selection bias. Per-protocol and as-treated analyses are useful sensitivity checks but are vulnerable to selection bias, because the factors determining adherence or switching are rarely random.",
    hint: "Ask which analysis keeps the randomisation intact.",
    relatedConcept: "Intention-to-treat versus per-protocol analysis and the risks of as-treated analysis",
    difficulty: "Medium",
    interviewTip:
      "Insist that the protocol names the primary analysis population and a missing-data strategy before unblinding.",
  },
  {
    question:
      "A regulatory submission is planned for a biosimilar. Which of the following is the most appropriate overall evidence strategy?",
    options: [
      "A comprehensive analytical and functional characterisation package followed by a comparative efficacy or immunogenicity trial in a sensitive population",
      "A small phase 1 study alone",
      "A placebo-controlled efficacy trial in a large patient population",
      "An animal toxicity study only",
    ],
    correctIdx: 0,
    explanation:
      "Biosimilar development rests on the totality of evidence principle: extensive physicochemical, structural and functional characterisation to demonstrate that differences in sequence and glycosylation do not alter the product's mechanism, potency and safety, with the need for a comparative clinical study judged case by case, usually using sensitive endpoints and populations. A head-to-head placebo-controlled efficacy trial adds little for similarity.",
    hint: "Apply the totality-of-evidence principle to what similarity actually requires.",
    relatedConcept: "Biosimilar development, totality of evidence and functional comparability",
    difficulty: "Hard",
    interviewTip:
      "State clearly that extrapolation to all indications depends on which indications the comparative trial actually studied.",
  },
  {
    question:
      "What is the most likely reason a negative phase 3 trial does not necessarily invalidate the drug's efficacy?",
    options: [
      "Trial design factors such as outcome misclassification, inadequate duration, an insensitive control or a poorly enriched population can obscure a real effect",
      "Phase 3 trials never have adequate statistical power",
      "A negative result means the drug is more effective than placebo",
      "Regulators ignore phase 3 results",
    ],
    correctIdx: 0,
    explanation:
      "Failure to reject the null hypothesis does not prove absence of effect; it means the study could not detect it with adequate probability. Deliberate differences between trial and real-world populations, non-adherence, dose or timing mismatch, an active control that is too effective, and endpoints that are insensitive to the mechanism are all documented explanations for a false negative, and they inform the design of the next study.",
    hint: "Distinguish a true negative from a study that was unable to detect the effect.",
    relatedConcept: "False negatives, trial design sensitivity and post hoc root cause analysis",
    difficulty: "Hard",
    interviewTip:
      "Contrast with false positives, which are the problem controlled by multiplicity correction.",
  },
  {
    question:
      "Which requirement distinguishes Good Laboratory Practice from Good Clinical Practice?",
    options: [
      "GLP applies to non-clinical laboratory studies supporting marketing authorisation and requires study content and records to be archived and independently verifiable",
      "GLP applies only to studies in healthy volunteers",
      "GLP is a subset of GMP for manufacturing",
      "GLP has no record-keeping requirements",
    ],
    correctIdx: 0,
    explanation:
      "GLP applies to non-clinical safety studies - toxicology, pharmacokinetics and safety pharmacology - and mandates study plan, conduct, raw data retention and quality assurance so that the study is reconstructable and auditable by regulators. GCP applies to the conduct of trials with human participants. Neither has manufacturing responsibilities, which are GMP.",
    hint: "Ask which subject population each standard governs.",
    relatedConcept: "GLP, GCP and GMP scope and their respective documentation requirements",
    difficulty: "Easy",
    interviewTip:
      "Name the QA unit and statement of compliance; both are specific GLP deliverables.",
  },
  {
    question:
      "In a biobanking study, a participant withdraws consent. What obligations does the research team still have?",
    options: [
      "To destroy or irreversibly anonymise retained samples and data where no further processing is permitted, while retaining records required for regulatory or safety purposes",
      "To retain everything indefinitely because the data were already collected",
      "To transfer the samples to another investigator",
      "To delete the trial record entirely, including safety data",
    ],
    correctIdx: 0,
    explanation:
      "Withdrawal prospectively stops further use of the participant's samples and data, and any retained material must be destroyed or anonymised if the consent and applicable regulation permit no continued processing, such as under GDPR where withdrawal does not affect processing already lawfully carried out. Records required to demonstrate compliance and to meet pharmacovigilance obligations are retained, and the data cannot simply be erased from regulatory submissions already made.",
    hint: "Separate future use from retention of regulatory and safety records.",
    relatedConcept: "Informed consent withdrawal, GDPR erasure limits and regulatory record retention",
    difficulty: "Hard",
    interviewTip:
      "Address the practical difficulty: anonymisation of clinical-linked biobank samples is technically difficult, so re-identification risk governs design.",
  },
  {
    question:
      "Which pharmacokinetic quantity is most affected by a subject's renal function?",
    options: [
      "Clearance of renally eliminated drugs, which falls with reduced glomerular filtration",
      "Volume of distribution of a drug that is not excreted by the kidney",
      "Absorption rate after an oral dose",
      "Potency at the receptor",
    ],
    correctIdx: 0,
    explanation:
      "Total clearance is the sum of renal and non-renal contributions, so as filtration declines the clearance of drugs eliminated by the kidney falls in proportion, which is the basis for dose adjustment in renal impairment. Volume of distribution depends on binding and tissue partitioning rather than on filtration, and absorption and potency are not directly functions of renal function.",
    hint: "Write total clearance as a sum of elimination pathways and vary one of them.",
    relatedConcept: "Renal clearance, glomerular filtration rate and dose adjustment in special populations",
    difficulty: "Medium",
    interviewTip:
      "Mention that non-renally cleared drugs can still be affected because active metabolites may be renally excreted.",
  },
  {
    question:
      "A sponsor wants to reduce trial cost without reducing the evidentiary value of the trial. Which change is most defensible?",
    options: [
      "Adopting risk-based quality management and centralised remote monitoring so oversight effort is targeted at the risks that matter",
      "Reducing the number of sites and enrolment targets without re-justifying power",
      "Removing independent data monitoring from a high-risk study",
      "Reusing participant data from an earlier unrelated study without re-consent",
    ],
    correctIdx: 0,
    explanation:
      "Risk-based quality management and centralised monitoring concentrate oversight on critical data and high-risk processes, which is what regulators encourage and which reduces cost without weakening conclusions. Cutting sites or enrolment reduces power, removing monitoring removes a safeguard, and reusing data without consent or re-consent is a serious ethical breach.",
    hint: "Separate efficiency measures that preserve inference from those that reduce information.",
    relatedConcept: "Risk-based quality management, centralised monitoring and ICH E6 R2",
    difficulty: "Medium",
    interviewTip:
      "Mention that regulators now explicitly caution against blanket over-monitoring, which is where much of the cost sits.",
  },
  {
    question:
      "A trial reports a hazard ratio of 0.75 with a 95% confidence interval of 0.60 to 0.94. What is the correct interpretation?",
    options: [
      "There is a statistically significant 25% reduction in hazard, and the interval excludes no effect",
      "There is a 25% reduction in risk that is proven with certainty",
      "The result is inconclusive because the interval does not include 1.0 exactly",
      "The treatment reduces mortality by 25 percentage points",
    ],
    correctIdx: 0,
    explanation:
      "A hazard ratio of 0.75 means the instantaneous event rate in the treated group is 25% lower, and because the 95% interval excludes 1.0 the effect is statistically significant at the 5% level. The interval still spans a range of plausible effects, so the magnitude is uncertain, and hazard ratios are not the same as risk or mortality-point reductions.",
    hint: "Read the interval against the null value of 1.0 and be precise about what a hazard ratio measures.",
    relatedConcept: "Hazard ratios, survival analysis and confidence interval interpretation",
    difficulty: "Medium",
    interviewTip:
      "Stress that proportional-hazards assumptions should be checked, since a time-varying treatment effect can make a single HR misleading.",
  },
];

export const CLINICAL_RESEARCH_QUESTIONS = buildTechnicalQuestions(SPECS, {
  idPrefix: "mcq-tech-clinical-research-t1",
  technology: "Clinical Trial & Research (Pharma)",
  expectCount: 30,
});

export const CLINICAL_RESEARCH_SPEC_COUNT = SPECS.length;