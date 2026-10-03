/**
 * Vocabulary - Test 2 and Test 3.
 *
 * Both were empty. Vocabulary Test 1 already uses the contextual
 * fill-in-the-blank frame with engineering subject matter and a fixed bank of
 * thirty words, so:
 *   - Test 2 keeps the engineering frame but uses thirty entirely new headwords,
 *     and varies the instruction wording so the stem fingerprint differs.
 *   - Test 3 moves to medical, legal and general-academic subject matter, which
 *     broadens coverage and separates it further from Test 1.
 *
 * No headword here appears in the live bank (Lucid, Equanimity, Ephemeral,
 * Pragmatic, Mitigate, Ubiquitous, Pernicious, Fastidious, Obsequious,
 * Reticent, Capricious, Esoteric, Cogent, Alacrity, Anachronism, Bolster,
 * Cacophony, Enervate, Garrulous, Inundate, Laconic, Malleable, Nefarious,
 * Ostentatious, Prolific, Querulous, Rancor, Sagacious, Taciturn, Zealot).
 */
import { buildAptitudeQuestions, type AptitudeSeedSpec } from "./shared";

/** Test 2 - contextual fill-in-the-blank, engineering subject matter. */
const T2: AptitudeSeedSpec[] = [
  {
    text: 'Fill in the blank with the most appropriate word: "After passivation the stainless coupling surface is chemically _______, and further oxidation stops within minutes."',
    answer: "inert",
    distractors: ["porous", "volatile", "viscous"],
    explanation:
      "'Inert' means chemically unreactive. A passivated stainless surface is precisely unreactive, which is why it resists further oxidation. 'Porous' would admit oxygen and 'volatile' describes a substance that evaporates readily.",
    shortcut: "Chemically unreactive = inert.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'porous', which describes a surface that lets gases through", "Choosing 'viscous', which describes a thick liquid"],
  },
  {
    text: 'Choose the word that best completes the sentence: "Years of handling abrasive castings left his _______, cracked palms almost completely insensitive to heat."',
    answer: "callous",
    distractors: ["fragile", "nimble", "arid"],
    explanation:
      "'Callous' describes skin that has become hard and unfeeling through repeated exposure, which matches cracked palms that no longer feel heat.",
    shortcut: "Callous = hardened and unfeeling.",
    difficulty: "easy",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'fragile', which is the opposite of hardened", "Choosing 'nimble', which refers to quick movement rather than touch"],
  },
  {
    text: 'Supply the missing word: "A _______, deterministic test harness reproduced the race condition within two minutes of starting the run."',
    answer: "narrow",
    distractors: ["narrowing", "narrowly", "narrowness"],
    explanation:
      "'Narrow' is the adjective that modifies 'deterministic', describing a tightly scoped search. The other options are different parts of speech and cannot modify the noun phrase correctly.",
    shortcut: "Check the part of speech the gap requires before choosing among lookalikes.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'narrowly', which is an adverb and cannot modify a noun", "Choosing 'narrowness', which is a noun"],
  },
  {
    text: 'Fill in the blank: "The _______, expression of the lead auditor gave no hint of the finding she was about to announce."',
    answer: "placid",
    distractors: ["arid", "fluent", "stark"],
    explanation:
      "'Placid' means calm and untroubled, especially of a face or expression. The sentence describes composure as the outward sign of concealed news.",
    shortcut: "Placid = calm and undisturbed.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'arid', which means dry", "Choosing 'stark', which describes harshness rather than calmness"],
  },
  {
    text: 'Choose the word that best completes the sentence: "The unit was designed as a _______, sealed enclosure rated for dust ingress, vibration and repeated wash-down cycles."',
    answer: "rugged",
    distractors: ["arid", "fragile", "stellar"],
    explanation:
      "'Rugged' means built to withstand harsh conditions and rough handling, which is what the sealing and ratings describe.",
    shortcut: "Rugged = able to survive harsh conditions.",
    difficulty: "easy",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'fragile', the opposite sense", "Choosing 'stellar', which means outstanding or of astronomical origin"],
  },
  {
    text: 'Supply the missing word: "Once the laminar flow hood has been _______, no further open handling of the samples is permitted."',
    answer: "sterilized",
    distractors: ["sealed", "drained", "stamped"],
    explanation:
      "A laminar flow hood is sterilized to eliminate microbial contamination before aseptic work begins. 'Sealed' would not remove what is already inside.",
    shortcut: "Sterilize = destroy all microorganisms.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'sealed', which protects from new contamination but does not remove existing organisms", "Choosing 'drained', which is irrelevant to aseptic handling"],
  },
  {
    text: 'Fill in the blank with the most appropriate word: "The lubricant turned _______, and at operating temperature it adhered to the bore instead of draining away as specified."',
    answer: "viscid",
    distractors: ["arid", "viscous", "vagrant"],
    explanation:
      "'Viscid' means sticky or glutinous, describing a substance that clings to surfaces. 'Viscous' describes resistance to flow in a liquid and was the expected behaviour.",
    shortcut: "Viscid = sticky. Viscous = thick and slow-flowing.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'viscous', which is the plausible but incorrect near-synonym", "Choosing 'vagrant', which means wandering"],
  },
  {
    text: 'Choose the word that best completes the sentence: "An _______, habit of deferring documentation until after sign-off has now produced three consecutive audit findings."',
    answer: "inveterate",
    distractors: ["invaluable", "invisible", "inventive"],
    explanation:
      "'Inveterate' means firmly established and unlikely to change, used of a long-standing habit. 'Invaluable' means extremely valuable and 'inventive' means showing creativity, so neither fits.",
    shortcut: "Inveterate = long-established and hard to break.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'invaluable', which begins similarly but means priceless", "Choosing 'inventive', which describes creativity"],
  },
  {
    text: 'Supply the missing word: "The specification contains a serious _______, since it never states the permitted ambient temperature range."',
    answer: "lacuna",
    distractors: ["lapse", "lattice", "ledger"],
    explanation:
      "'Lacuna' is a formal word for a gap or missing portion in a text. The sentence describes exactly that omission in a specification.",
    shortcut: "Lacuna = a gap in a text.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'lapse', which means a decline or a failure", "Choosing 'ledger', which is a record book"],
  },
  {
    text: 'Fill in the blank: "There is a _______, of undocumented workarounds scattered through the legacy firmware release notes."',
    answer: "plethora",
    distractors: ["placard", "plateau", "plight"],
    explanation:
      "'Plethora' means a very large number of something. 'Plateau' is a flat stretch at constant level and 'plight' means a difficult situation, so neither can be followed by 'of' in this sense.",
    shortcut: "Plethora of = an excessive abundance of.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'plight', which is a condition rather than a quantity", "Choosing 'plateau', which describes stability rather than excess"],
  },
  {
    text: 'Choose the word that best completes the sentence: "A _______, working environment is a documented requirement under the occupational health and safety standard."',
    answer: "salubrious",
    distractors: ["salutary", "salvageable", "sedentary"],
    explanation:
      "'Salubrious' means wholesome and health-promoting. 'Salutary' means beneficial, usually of an effect or lesson, and does not describe a working environment here.",
    shortcut: "Salubrious = health-giving, of places and conditions.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'salutary', which is the obvious near-synonym trap", "Choosing 'sedentary', which means involving much sitting"],
  },
  {
    text: 'Supply the missing word: "The _______, launch week tested every fallback the release plan contained and still missed two rollout dates."',
    answer: "tempestuous",
    distractors: ["placid", "tranquil", "uneventful"],
    explanation:
      "'Tempestuous' means turbulent and full of dramatic disturbance, which fits a week of constant problems. The other three all describe calm, which contradicts the sentence.",
    shortcut: "Tempestuous = turbulent and stormy.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'uneventful', which contradicts the two missed dates", "Choosing 'placid', which is a synonym of 'tranquil'"],
  },
  {
    text: 'Fill in the blank: "The _______, lathe on the shop floor has outlived four generations of operators and still holds tolerance."',
    answer: "venerable",
    distractors: ["venerate", "venal", "verdant"],
    explanation:
      "'Venerable' describes something respected because of great age or importance. 'Venerate' is the verb to respect, and cannot modify 'lathe' in this sentence.",
    shortcut: "Venerable = old and worthy of respect.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'venerate', which is the verb form", "Choosing 'venal', which means open to bribery"],
  },
  {
    text: 'Choose the word that best completes the sentence: "Attempting to read a paper tape on a modern CNC controller is a _______, exercise in protocol compatibility."',
    answer: "anachronistic",
    distractors: ["arbitrary", "authentic", "agnostic"],
    explanation:
      "'Anachronistic' describes something placed in a period where it does not belong. A paper tape reader on a modern controller is exactly out of its era.",
    shortcut: "Anachronistic = belonging to the wrong period.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'authentic', which suggests genuine origin rather than misplaced period", "Choosing 'agnostic', which means uncertain about a matter"],
  },
  {
    text: 'Supply the missing word: "The _______, recognition of the risk came only after the field failure had already been logged."',
    answer: "belated",
    distractors: ["tardy", "reluctant", "redundant"],
    explanation:
      "'Belated' means arriving or happening later than it should have. Recognition that comes after the failure is precisely late recognition.",
    shortcut: "Belated = late, often with regret implied.",
    difficulty: "easy",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'reluctant', which describes unwillingness", "Choosing 'redundant', which describes unnecessary repetition"],
  },
  {
    text: 'Fill in the blank with the most appropriate word: "Her _______, about the delay in shipping the fixtures cut the review meeting in half."',
    answer: "candor",
    distractors: ["candour", "candidness", "cadence"],
    explanation:
      "'Candor' is the noun meaning frankness of speech. The other options are near-homophones with different meanings or inflections and do not fit grammatically here.",
    shortcut: "Candor = openness and honesty in speech.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'cadence', which refers to rhythm", "Choosing a form of the adjective rather than the required noun"],
  },
  {
    text: 'Choose the word that best completes the sentence: "A _______, turn of phrase in the final report lightened what had been a grim summary of the failures."',
    answer: "droll",
    distractors: ["drowsy", "dregs", "drone"],
    explanation:
      "'Droll' means amusing in a quaint or whimsical way, which is what lightened the summary. 'Drone' means to hum or speak monotonously.",
    shortcut: "Droll = whimsical and amusing.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'drone', which suggests monotony rather than amusement", "Choosing 'drowsy', which means sleepy rather than amusing"],
  },
  {
    text: 'Supply the missing word: "A _______, break in the cloud cover let the survey team finish the photogrammetry that afternoon."',
    answer: "fortuitous",
    distractors: ["fictitious", "fatuous", "ferocious"],
    explanation:
      "'Fortuitous' means occurring by a lucky chance. 'Fatuous' means silly and 'ferocious' means savage, so neither fits a lucky break in the weather.",
    shortcut: "Fortuitous = happening by good luck.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'fatuous', which begins similarly but means foolish", "Choosing 'ferocious', which means fierce"],
  },
  {
    text: 'Choose the word that best completes the sentence: "Avoid the _______, phrase on the value proposition slide; three other vendors used it this quarter."',
    answer: "hackneyed",
    distractors: ["hackled", "hallowed", "haggard"],
    explanation:
      "'Hackneyed' means lacking significance through overuse. A phrase used by every competitor is precisely overused.",
    shortcut: "Hackneyed = worn out by repetition.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'hallowed', which means revered rather than overused", "Choosing 'haggard', which describes a wasted appearance"],
  },
  {
    text: 'Supply the missing word: "The _______, review dismissed the entire legacy scheduler without a single word about the fifteen years it had served."',
    answer: "iconoclastic",
    distractors: ["iconic", "idiomatic", "ironic"],
    explanation:
      "'Iconoclastic' means attacking established beliefs or revered institutions without regard for convention. 'Iconic' is the lookalike that means symbolising something famous.",
    shortcut: "Iconoclastic = destroying revered traditions.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'iconic', which is the classic lookalike trap", "Choosing 'ironic', which describes an incongruity"],
  },
  {
    text: 'Fill in the blank with the most appropriate word: "The proposal\'s _______, analysis of failure modes amounted to three bullet points and a hand-drawn diagram."',
    answer: "jejune",
    distractors: ["juvenile", "jeopard", "judicious"],
    explanation:
      "'Jejune' means insipid, dull and uninteresting. 'Judicious' is the lookalike that means showing good judgement, which is the opposite evaluation.",
    shortcut: "Jejune = thin, dull and unstimulating.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'judicious', which means well judged", "Choosing 'juvenile', which describes something for or by children"],
  },
  {
    text: 'Choose the word that best completes the sentence: "The review board extended _______, to the team that isolated the intermittent fault after eleven days of false starts."',
    answer: "commendation",
    distractors: ["commencement", "commensurate", "compassion"],
    explanation:
      "'Commendation' means praise or approval for a particular act. 'Commencement' means a beginning and 'commensurate' means proportionate, neither of which fits.",
    shortcut: "Commendation = formal praise for an achievement.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'commencement', which is a synonym only in spelling", "Choosing 'compassion', which is sympathy rather than praise"],
  },
  {
    text: 'Supply the missing word: "The tooling supplier is a _______, whose single plant now supplies fixtures for four assembly lines."',
    answer: "magnate",
    distractors: ["magnesium", "magnitude", "malign"],
    explanation:
      "'Magnate' means a person of great importance, wealth or power in an industry. 'Magnitude' means great size or extent and cannot refer to a person as a noun of this kind.",
    shortcut: "Magnate = powerful figure in an industry.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'magnitude', which is the lookalike that means size", "Choosing 'malign', which is a verb meaning to slander"],
  },
  {
    text: 'Fill in the blank: "A pre-emptive firmware patch would have _______, the need for a physical recall of the affected units."',
    answer: "obviated",
    distractors: ["obviate", "obliterate", "obtruncate"],
    explanation:
      "'Obviate' means to remove a difficulty or need before it arises, which is what a pre-emptive patch would do. 'Obliterate' means to destroy completely and is far too strong.",
    shortcut: "Obviate = remove a need in advance.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'obliterate', which means destroy entirely", "Choosing 'obviate', which is the bare verb and does not fit the conditional clause"],
  },
  {
    text: 'Choose the word that best completes the sentence: "The _______, description of the acceptance criteria left the supplier no room to reinterpret them."',
    answer: "pellucid",
    distractors: ["perilous", "placid", "palpable"],
    explanation:
      "'Pellucid' means so clear that it can be understood immediately. 'Perilous' means dangerous and 'placid' means calm, so neither fits a description.",
    shortcut: "Pellucid = crystal clear and easily understood.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'perilous', which begins similarly but means dangerous", "Choosing 'placid', which means calm"],
  },
  {
    text: 'Supply the missing word: "The workshop smelled _______, of fresh-cut metal, cutting fluid and hot bearing grease."',
    answer: "redolent",
    distractors: ["redundant", "resolute", "reliant"],
    explanation:
      "'Redolent' is commonly used with 'of' to mean strongly scented or imbued with a quality. 'Redundant' means superfluous and is a pure lookalike.",
    shortcut: "Redolent of = strongly imbued with.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'redundant', the standard lookalike trap", "Choosing 'reliant', which is an adjective of dependency"],
  },
  {
    text: 'Fill in the blank with the most appropriate word: "The most _______, finding of the review was that the previous risk assessment had never actually been approved by anyone."',
    answer: "salutary",
    distractors: ["salubrious", "salviferous", "salvaging"],
    explanation:
      "'Salutary' means beneficial or health-giving, especially of a lesson or warning. It fits an uncomfortable but useful finding. 'Salubrious' was used for a working environment elsewhere in this test.",
    shortcut: "Salutary = beneficial, especially as a hard-won lesson.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'salubrious', which describes health-giving surroundings", "Choosing 'salviferous', which yields a saving of metal"],
  },
  {
    text: 'Choose the word that best completes the sentence: "With no timestamps on the log entries, the claim that a single root cause explains every failure is not _______, on the available evidence."',
    answer: "tenable",
    distractors: ["tentative", "tangible", "tenuous"],
    explanation:
      "'Tenable' means able to be defended or held against objection. The claim cannot be supported, so 'tenable' is required. 'Tentative' means hesitant and 'tangible' means physically perceptible.",
    shortcut: "Tenable = defensible in argument.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'tentative', which is a lookalike meaning hesitant", "Choosing 'tenuous', which means thin or slight rather than indefensible"],
  },
  {
    text: 'Supply the missing word: "Tail latency in the shared queue is highly _______, so a single fixed threshold rarely captures the behaviour that matters."',
    answer: "volatile",
    distractors: ["vagrant", "vacant", "vaunted"],
    explanation:
      "'Volatile' means liable to rapid unpredictable change, which describes latency. 'Vacant' means empty and 'vaunted' means boasted.",
    shortcut: "Volatile = changing rapidly and unpredictably.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'vagrant', which means wandering", "Choosing 'vacant', which means unoccupied"],
  },
  {
    text: 'Fill in the blank: "Reviewers must _______, the report to separate measured findings from unverified conjecture before the board sees it."',
    answer: "winnow",
    distractors: ["whittle", "wander", "waive"],
    explanation:
      "'Winnow' means to sift so as to separate the valuable from the worthless, which is exactly the review task. 'Whittle' means to reduce in size, which is not the same act.",
    shortcut: "Winnow = sift out the chaff and keep the grain.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'whittle', which implies gradual reduction rather than selection", "Choosing 'waive', which means to forgo a right"],
  },
];

/** Test 3 - contextual fill-in-the-blank across medical, legal and academic contexts. */
const T3: AptitudeSeedSpec[] = [
  {
    text: 'Select the word that best completes the sentence: "The infection audit traced forty per cent of the ward\'s cases to _______, transmission, largely from shared equipment."',
    answer: "nosocomial",
    distractors: ["neonatal", "nutritional", "neoplastic"],
    explanation:
      "'Nosocomial' means originating in a hospital, and 'nosocomial transmission' is the standard clinical term for infection acquired during care. 'Neonatal' refers to newborn infants.",
    shortcut: "Nosocomial = hospital-acquired.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'neonatal', which refers to the newborn period", "Choosing 'neoplastic', which means relating to tumour growth"],
  },
  {
    text: 'Fill in the blank with the most appropriate word: "Because no cause could be established, the condition was recorded as _______, rather than congenital or environmental."',
    answer: "idiopathic",
    distractors: ["inherited", "infectious", "iatrogenic"],
    explanation:
      "'Idiopathic' means arising from an unknown cause. 'Iatrogenic' means caused by medical treatment, which is a recognised cause and would contradict the statement that no cause could be established.",
    shortcut: "Idiopathic = arising spontaneously, from an unknown cause.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'iatrogenic', which is a real cause rather than an absence of cause", "Choosing 'inherited', which is a known cause"],
  },
  {
    text: 'Choose the word that best completes the sentence: "The rescue attempt was _______, and the diver surfaced without having entered the wreck at all."',
    answer: "abortive",
    distractors: ["abrupt", "abundant", "aberrant"],
    explanation:
      "'Abortive' means unsuccessful from the beginning, which fits a rescue that never started properly. 'Abrupt' describes a sudden ending and 'aberrant' means departing from the normal.",
    shortcut: "Abortive = brought to nothing from the outset.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'abrupt', which describes suddenness rather than failure", "Choosing 'aberrant', which means deviant from the norm"],
  },
  {
    text: 'Supply the missing word: "Screening every newborn for the condition is standard practice because it is almost always _______, present from birth rather than acquired later."',
    answer: "congenital",
    distractors: ["chronic", "covert", "concurrent"],
    explanation:
      "'Congenital' means existing from birth. The sentence itself defines the term as 'present from birth', which removes any ambiguity.",
    shortcut: "Congenital = present from birth.",
    difficulty: "easy",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'chronic', which means long-lasting rather than present at birth", "Choosing 'concurrent', which means happening at the same time"],
  },
  {
    text: 'Fill in the blank: "Years of untreated infection had left the patient profoundly _______, too weak to stand without assistance."',
    answer: "debilitated",
    distractors: ["deliberated", "delegated", "demolished"],
    explanation:
      "'Debilitated' means made weak or listless. 'Deliberated' means carefully considered and 'demolished' means destroyed outright, neither of which describes a patient.",
    shortcut: "Debilitated = weakened.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'deliberated', which means carefully considered", "Choosing 'delegated', which means handed to another person"],
  },
  {
    text: 'Choose the word that best completes the sentence: "The _______, progression of the infection left the team only hours to act once the first signs appeared."',
    answer: "fulminant",
    distractors: ["fugitive", "futile", "feckless"],
    explanation:
      "'Fulminant' means developing extremely rapidly and severely, which is the standard clinical descriptor. 'Futile' means useless and describes attempts rather than the disease itself.",
    shortcut: "Fulminant = rapid and severe in onset.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'futile', which describes an action rather than a progression", "Choosing 'fugitive', which means in flight from justice"],
  },
  {
    text: 'Supply the missing word: "The viral sample was left to _______, and only after thirty-six hours did the plate show any colonies at all."',
    answer: "incubate",
    distractors: ["insulate", "inoculate", "intubate"],
    explanation:
      "'Incubate' means to keep something at a controlled temperature so that growth or development can occur, which is the standard laboratory term. 'Inoculate' means to introduce a culture.",
    shortcut: "Incubate = maintain at a controlled temperature for growth.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'inoculate', which is the closely related act of introducing a culture", "Choosing 'insulate', which means to protect from heat or electricity"],
  },
  {
    text: 'Fill in the blank with the most appropriate word: "The pathologist recorded the _______, nature of the growth and moved the case to the urgent list."',
    answer: "lethal",
    distractors: ["latent", "lingual", "lucent"],
    explanation:
      "'Lethal' means causing death, which is what the urgent classification reflects. 'Latent' means present but not yet apparent, and is the dangerous lookalike here.",
    shortcut: "Lethal = fatal. Latent = present but inactive.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'latent', which suggests a dormant rather than deadly condition", "Choosing 'lingual', which means relating to the tongue"],
  },
  {
    text: 'Choose the word that best completes the sentence: "The committee insisted that every adjustment be recorded so that the cause of the change could be traced without _______, from the log."',
    answer: "doubt",
    distractors: ["dissent", "debate", "denial"],
    explanation:
      "'Without doubt' is the fixed phrase meaning with certainty. 'Dissent', 'debate' and 'denial' are all nouns of disagreement and none collocates with 'without' in this construction.",
    shortcut: "Without doubt = with certainty.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'dissent', which is a disagreement among people", "Choosing 'denial', which means refusal to accept"],
  },
  {
    text: 'Supply the missing word: "The drug was continued strictly _______, so that the tumour was never treated as the target of therapy."',
    answer: "palliatively",
    distractors: ["pallidly", "partially", "prematurely"],
    explanation:
      "'Palliatively' means to relieve symptoms without attempting to cure the underlying condition, which is exactly the stated purpose. 'Partially' would imply a partial attempt at a cure.",
    shortcut: "Palliative care = symptom relief without cure.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'partially', which implies a partial cure rather than symptom relief", "Choosing 'prematurely', which refers to timing"],
  },
  {
    text: 'Fill in the blank: "The pelvic organ was recorded as _______, having descended from its normal position under the sustained load."',
    answer: "prolapsed",
    distractors: ["protruded", "projected", "prosecuted"],
    explanation:
      "'Prolapsed' means having slipped or fallen out of the normal position, which is the standard term for an organ that has descended. 'Protruded' means pushed outward.",
    shortcut: "Prolapse = an organ has fallen from its normal position.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'protruded', which means bulged outward", "Choosing 'projected', which means projected outward or forecast"],
  },
  {
    text: 'Supply the missing word: "The principal _______, the man the family believed to be missing, turned out to have emigrated in 1974."',
    answer: "culprit",
    distractors: ["candid", "capitulate", "cadence"],
    explanation:
      "'Culprit' originally meant the guilty party and is now used for the person chiefly responsible for a misdeed, which is the sense intended. 'Candid' is the lookalike meaning frank.",
    shortcut: "Culprit = the person chiefly to blame.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'candid', the standard lookalike meaning frank", "Choosing 'capitulate', which means to surrender"],
  },
  {
    text: 'Fill in the blank with the most appropriate word: "We accepted the delay _______, knowing it would cost the quarter its entire contingency."',
    answer: "detrimentally",
    distractors: ["detractively", "degenerately", "despondently"],
    explanation:
      "'Detrimentally' means in a way that causes harm or disadvantage, which matches the stated cost. 'Despondently' describes a mood rather than a consequence.",
    shortcut: "Detrimental = causing harm or disadvantage.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'degenerately', which describes marked abnormality", "Choosing 'despondently', which describes the mood rather than the consequence"],
  },
  {
    text: 'Choose the word that best completes the sentence: "Nothing in the audit was _______, so the supervisor withdrew the accusation entirely."',
    answer: "exculpatory",
    distractors: ["execrable", "exacting", "exogenous"],
    explanation:
      "'Exculpatory' means tending to clear of blame, which is why it removes the accusation. 'Execrable' is the lookalike and means detestable, the opposite evaluation.",
    shortcut: "Exculpatory = clearing of blame.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'execrable', the classic lookalike meaning detestable", "Choosing 'exacting', which means excessively demanding"],
  },
  {
    text: 'Supply the missing word: "The supplier agreed to _______, the buyer for the spoiled consignment, but refused to admit fault."',
    answer: "indemnify",
    distractors: ["indict", "indulge", "induce"],
    explanation:
      "'Indemnify' means to compensate someone for loss or damage, which is what the supplier agreed to do. 'Indict' means to accuse formally before a court.",
    shortcut: "Indemnify = compensate for loss.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'indict', which means to charge formally", "Choosing 'induce', which means to bring about or persuade"],
  },
  {
    text: 'Fill in the blank: "The court declined to _______, the officer for disclosing the figures, describing the act as a duty rather than a breach."',
    answer: "prosecute",
    distractors: ["persecute", "prophesy", "prognosticate"],
    explanation:
      "'Prosecute' means to bring legal proceedings against someone. 'Persecute' means to harass or mistreat and is the deliberate lookalike here.",
    shortcut: "Prosecute = bring charges in court.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'persecute', which is the confusion trap for this pair", "Choosing 'prophesy', which means to predict rather than to charge"],
  },
  {
    text: 'Choose the word that best completes the sentence: "Her _______, taken under oath and transcribed by the clerk, became the single most important page in the file."',
    answer: "testimony",
    distractors: ["testament", "attestation", "testimonial"],
    explanation:
      "'Testimony' is the formal word for a statement given under oath. 'Testament' means a will, and 'testimonial' refers to a letter of praise.",
    shortcut: "Testimony = a formal sworn statement.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'testament', which means a will", "Choosing 'testimonial', which means a letter of recommendation"],
  },
  {
    text: 'Supply the missing word: "The contractor argued that the delay was not a breach of contract but a _______, meaning a civil wrong rather than a criminal act."',
    answer: "tort",
    distractors: ["torrent", "torpor", "total"],
    explanation:
      "'Tort' is the legal term for a civil wrong, as distinct from a criminal offence or a breach of contract. 'Torpor' means a state of sluggishness.",
    shortcut: "Tort = civil wrong, actionable in damages.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'torpor', which means dullness", "Choosing 'torrent', which means a rushing stream"],
  },
  {
    text: 'Choose the word that best completes the sentence: "His account of the evening was never independently corroborated, and he offered no _______, for where he was between eight and ten."',
    answer: "alibi",
    distractors: ["allegiance", "alleviation", "allegory"],
    explanation:
      "'Alibi' means a statement, supported by evidence, that the accused was elsewhere at the relevant time. 'Allegiance' is loyalty to a person or cause, which is the lookalike trap.",
    shortcut: "Alibi = proof you were elsewhere.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'allegiance', which means loyalty", "Choosing 'allegory', which is a symbolic narrative"],
  },
  {
    text: 'Supply the missing word: "The company was fined for a clear _______, of the regulation requiring all subcontractors to be registered."',
    answer: "breach",
    distractors: ["breeze", "brooch", "blight"],
    explanation:
      "'Breach' means a violation of a law, contract or obligation, which is exactly what the fine penalised. 'Blight' means a harmful influence rather than a violation.",
    shortcut: "Breach = a violation of a rule or obligation.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'blight', which means a damaging influence", "Choosing an unrelated lookalike"],
  },
  {
    text: 'Fill in the blank: "The auditor found no evidence of systematic fraud, and the remaining gaps were ordinary _________, issues rather than concealments."',
    answer: "compliance",
    distractors: ["complacency", "complaint", "compliment"],
    explanation:
      "'Compliance' means conformity with rules or requirements. 'Complacency' means self-satisfaction, which is the deliberate lookalike here.",
    shortcut: "Compliance = conforming to a rule.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'complacency', which means untroubled self-satisfaction", "Choosing 'compliment', which is praise"],
  },
  {
    text: 'Choose the word that best completes the sentence: "The report begins with a long _______, in which three witnesses give sworn statements that could not be reconciled."',
    answer: "deposition",
    distractors: ["deportation", "despotism", "debilitation"],
    explanation:
      "'Deposition' has the precise legal sense of a statement taken under oath. 'Deportation' means removal from a country and 'despotism' means tyrannical rule.",
    shortcut: "Deposition = a sworn statement taken in court.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'deportation', which is the sound-alike trap", "Choosing 'despotism', which concerns government"],
  },
  {
    text: 'Supply the missing word: "The treasurer was charged with _______, the deliberate use of company funds for personal purposes."',
    answer: "malfeasance",
    distractors: ["mala fide", "maladroit", "malignancy"],
    explanation:
      "'Malfeasance' means wrongdoing or misconduct, particularly by an official or trustee. 'Maladroit' means clumsy, which is not a moral charge.",
    shortcut: "Malfeasance = official misconduct. Misfeasance = improper but lawful conduct.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'maladroit', which means awkward or clumsy", "Choosing 'mala fide', which is a Latin phrase rather than a noun"],
  },
  {
    text: 'Fill in the blank with the most appropriate word: "A _______, who avoided every department social for eleven years, was eventually found to hold three patents."',
    answer: "recluse",
    distractors: ["reclusive", "recuse", "resourceful"],
    explanation:
      "'Recluse' is the noun for a person who lives in seclusion. 'Recuse' is a verb in legal procedure and 'reclusive' is the adjective form.",
    shortcut: "Recluse = a person who keeps to themselves.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'reclusive', which is the adjective", "Choosing 'recuse', which is a verb meaning to exclude from a hearing"],
  },
  {
    text: 'Choose the word that best completes the sentence: "Six months of unanswered maintenance requests had bred _______, so the crew stopped filing new ones at all."',
    answer: "apathy",
    distractors: ["empathy", "antipathy", "alchemy"],
    explanation:
      "'Apathy' means indifference or lack of concern, which explains why reporting stopped. 'Antipathy' means active hostility and 'empathy' means understanding of others' feelings.",
    shortcut: "Apathy = indifference. Antipathy = active dislike.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'antipathy', which is a lookalike meaning active dislike", "Choosing 'empathy', which is positive rather than indifferent"],
  },
  {
    text: 'Supply the missing word: "A later replication study came to _______, the original team\'s claim about the alloy\'s fatigue limit."',
    answer: "vindicate",
    distractors: ["vindictive", "indict", "vituperate"],
    explanation:
      "'Vindicate' means to clear someone of blame or to establish the truth of something. 'Vindictive' means seeking revenge, which is the lookalike trap.",
    shortcut: "Vindicate = clear of blame; prove right.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'vindictive', which means revenge-seeking", "Choosing 'vituperate', which means to abuse verbally rather than to justify"],
  },
  {
    text: 'Fill in the blank: "The review was written in a _______, tone, listing each defect with its measurement rather than characterising the team."',
    answer: "caustic",
    distractors: ["cautious", "casual", "candescent"],
    explanation:
      "'Caustic' means sharply critical and often sarcastic in tone, or in chemistry, corrosive. In this sentence it means the review was cutting in its criticism.",
    shortcut: "Caustic = sharply critical or corrosive.",
    difficulty: "medium",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'casual', which means informal", "Choosing 'cautious', which is the lookalike meaning careful"],
  },
  {
    text: 'Supply the missing word: "The _______, drop in yield disappeared the moment the humidity sensor was recalibrated, so the cause was environmental after all."',
    answer: "inexplicable",
    distractors: ["indelible", "inescapable", "inconspicuous"],
    explanation:
      "'Inexplicable' means impossible to explain, which describes a result that vanished once the measurement was corrected. 'Inescapable' means unavoidable, which is not the issue here.",
    shortcut: "Inexplicable = that cannot be explained.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'inescapable', the lookalike meaning unavoidable", "Choosing 'indelible', which means unable to be erased"],
  },
  {
    text: 'Fill in the blank: "Land _______, restored the saline paddy to its former productivity and returned the wetland to tidal exchange."',
    answer: "reclamation",
    distractors: ["recreation", "recrimination", "recrudescence"],
    explanation:
      "'Reclamation' means bringing waste land into productive use. 'Recreation' means leisure activity and 'recrimination' means mutual accusations.",
    shortcut: "Reclamation = converting waste land into useful ground.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'recrimination', which means blaming one another", "Choosing 'recreation', which means leisure"],
  },
  {
    text: 'Choose the word that best completes the sentence: "Her _______, attention to the change-control log is the reason the site has recorded no audit findings for three years."',
    answer: "sedulous",
    distractors: ["sedentary", "sequel", "sedition"],
    explanation:
      "'Sedulous' means showing careful, diligent and persistent attention. 'Sedentary' means involving much sitting, which is the sound-alike trap.",
    shortcut: "Sedulous = painstakingly diligent.",
    difficulty: "hard",
    topic: "Vocabulary",
    commonMistakes: ["Choosing 'sedentary', which is the sound-alike meaning involving sitting", "Choosing 'sedition', which means stirring rebellion rather than diligent effort"],
  },
];

export const VOCABULARY_TESTS = {
  test2: buildAptitudeQuestions(T2, { category: "verbal", idPrefix: "apt-vocab-t2", expectCount: 30 }),
  test3: buildAptitudeQuestions(T3, { category: "verbal", idPrefix: "apt-vocab-t3", expectCount: 30 }),
};

export const VOCABULARY_SPEC_COUNTS = { test2: T2.length, test3: T3.length };

