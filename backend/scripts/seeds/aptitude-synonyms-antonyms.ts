/**
 * Synonyms & Antonyms - Test 1, Test 2 and Test 3.
 *
 * Tests 1-3 were previously empty; Test 3 additionally held a byte-for-byte copy
 * of Vocabulary Test 1, so all three are rebuilt here with content that belongs
 * to this topic.
 *
 * Test 1 is antonym-led, Test 2 synonym-led and Test 3 relational (analogy /
 * cause-effect / neither-nor), which also keeps them structurally distinct from
 * the Vocabulary tests (contextual fill-in-the-blank).
 *
 * None of the target headwords overlap the 30 words already banked for
 * Vocabulary / Synonyms & Antonyms.
 */
import { buildAptitudeQuestions, type AptitudeSeedSpec } from "./shared";

/** Test 1 - antonyms. */
const T1: AptitudeSeedSpec[] = [
  {
    text: 'Select the word most nearly OPPOSITE in meaning to "ABATE":',
    answer: "INTENSIFY",
    distractors: ["ALLEVIATE", "ASCEND", "MOLLIFY"],
    explanation:
      "'Abate' means to become less intense or widespread. Its opposite is to grow more severe, which is 'intensify'. 'Alleviate' and 'mollify' are synonyms of 'abate', not antonyms.",
    shortcut: "Abate = lessen. Opposite = intensify.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Picking 'alleviate', which is a synonym", "Picking 'mollify', which also means to soften"],
  },
  {
    text: 'Choose the word that comes closest to the OPPOSITE of "BELIE":',
    answer: "UPHOLD",
    distractors: ["REPUDIATE", "VINDICATE", "DISOWN"],
    explanation:
      "'Belie' means to show something to be false, that is, to contradict a statement. 'Uphold' means to support the truth of a statement, which is its opposite.",
    shortcut: "Belie = contradict. Uphold = support.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'repudiate' or 'disown', which are also ways of contradicting", "Choosing 'vindicate', which is a synonym of 'uphold'"],
  },
  {
    text: 'Pick the antonym of "CELESTIAL":',
    answer: "TERRESTRIAL",
    distractors: ["ASTRAL", "SUBTERRANEAN", "EMPYREAL"],
    explanation:
      "'Celestial' refers to the sky or the heavens, so its opposite is 'terrestrial', meaning relating to the earth. 'Astral' and 'empyreal' are synonyms of 'celestial'.",
    shortcut: "Celestial = heavenly. Terrestrial = earthly.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'astral', which is a synonym", "Choosing 'subterranean', which means underground rather than earthly"],
  },
  {
    text: 'Choose the word OPPOSITE in meaning to "CONFLATE":',
    answer: "DISTINGUISH",
    distractors: ["BLEND", "MELD", "AMALGAMATE"],
    explanation:
      "'Conflate' means to merge two distinct things into one, treating them as indistinguishable. 'Distinguish' does the opposite by marking them as different.",
    shortcut: "Conflate = merge and lose differences. Distinguish = mark differences.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'blend' or 'meld', which are synonyms of 'conflate'", "Choosing 'amalgamate', which also means to merge"],
  },
  {
    text: 'Select the antonym of "DEARTH":',
    answer: "ABUNDANCE",
    distractors: ["SCARCITY", "PAUCITY", "PENURY"],
    explanation:
      "'Dearth' means a scarcity or lack of something. 'Abundance' means a large, generous supply and is its direct opposite.",
    shortcut: "Dearth = lack. Abundance = plenty.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'scarcity' or 'paucity', which are synonyms", "Choosing 'penury', which means extreme poverty rather than scarcity of goods"],
  },
  {
    text: 'Pick the word that is the OPPOSITE of "DEFIANT":',
    answer: "COMPLIANT",
    distractors: ["INSUBORDINATE", "REBELLIOUS", "UNRULY"],
    explanation:
      "'Defiant' means openly refusing to obey. 'Compliant' means willing to obey, which is its opposite.",
    shortcut: "Defiant = refusing obedience. Compliant = readily obeying.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'insubordinate' or 'rebellious', which are synonyms of 'defiant'", "Choosing 'unruly', which describes disorder rather than a refusal to obey"],
  },
  {
    text: 'Choose the antonym of "DERIDE":',
    answer: "VENERATE",
    distractors: ["MOCK", "SCOFF AT", "TAUNT"],
    explanation:
      "'Deride' means to mock or ridicule contemptuously. 'Venerate' means to regard with great respect, which is its opposite.",
    shortcut: "Deride = mock. Venerate = hold in high respect.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'mock' or 'taunt', which are synonyms of 'deride'", "Choosing 'scoff at', which is also a mocking term"],
  },
  {
    text: 'Pick the word OPPOSITE in meaning to "DOGMATIC":',
    answer: "OPEN-MINDED",
    distractors: ["INSULAR", "SECTARIAN", "INFLEXIBLE"],
    explanation:
      "'Dogmatic' means asserting opinions as unquestionable truths, especially about religion or politics. 'Open-minded' means willing to consider new ideas, which is its opposite.",
    shortcut: "Dogmatic = fixed doctrine. Open-minded = receptive to change.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'insular' or 'inflexible', which are near-synonyms", "Choosing 'sectarian', which relates to a faction rather than to dogmatism"],
  },
  {
    text: 'Select the antonym of "ERRANT":',
    answer: "UNERRING",
    distractors: ["FALLIBLE", "WAYWARD", "DEVIANT"],
    explanation:
      "'Errant' means straying from the proper course or from what is correct. 'Unerring' means never making a mistake, which is its opposite.",
    shortcut: "Errant = going astray. Unerring = never deviating.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'wayward' or 'deviant', which are synonyms of 'errant'", "Choosing 'fallible', which describes the possibility of error"],
  },
  {
    text: 'Choose the word OPPOSITE in meaning to "EXACERBATE":',
    answer: "ALLEVIATE",
    distractors: ["AGGRAVATE", "INTENSIFY", "WORSEN"],
    explanation:
      "'Exacerbate' means to make a problem worse. 'Alleviate' means to make it less severe, which is its opposite.",
    shortcut: "Exacerbate = worsen. Alleviate = ease.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'aggravate' or 'worsen', which are synonyms", "Choosing 'intensify', which describes degree rather than the problem itself"],
  },
  {
    text: 'Pick the antonym of "FALTER":',
    answer: "STEADY",
    distractors: ["WOBBLE", "STAGGER", "WAVER"],
    explanation:
      "'Falter' means to start to fail in purpose or to move unsteadily. 'Steady' means to become resolute and regular in movement, which is its opposite.",
    shortcut: "Falter = weaken and hesitate. Steady = settle and hold firm.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'wobble' or 'stagger', which are physical synonyms", "Choosing 'waver', which shares both senses"],
  },
  {
    text: 'Select the word OPPOSITE in meaning to "FLOURISH":',
    answer: "WANE",
    distractors: ["DECLINE", "DETERIORATE", "ABATE"],
    explanation:
      "'Flourish' means to grow or develop in a vigorous way. 'Wane' means to become gradually weaker or smaller, which is its opposite.",
    shortcut: "Flourish = grow vigorously. Wane = grow weak.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'decline' or 'deteriorate', which are near-synonyms", "Choosing 'abate', which describes a reduction in intensity"],
  },
  {
    text: 'Choose the antonym of "IMPECCABLE":',
    answer: "FLAWED",
    distractors: ["FALLIBLE", "BLEMISHED", "IMPERFECT"],
    explanation:
      "'Impeccable' means free from faults or errors. 'Flawed' means having a weakness or defect, which is its opposite.",
    shortcut: "Impeccable = faultless. Flawed = defective.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'fallible', which describes the possibility of error rather than an actual defect", "Choosing 'blemished', which is a synonym of 'flawed'"],
  },
  {
    text: 'Pick the word OPPOSITE in meaning to "INCONGRUOUS":',
    answer: "CONSISTENT",
    distractors: ["DISCREPANT", "ATYPICAL", "OUT OF PLACE"],
    explanation:
      "'Incongruous' means out of place or in harmony with the surrounding context. 'Consistent' means agreeing with the context, which is its opposite.",
    shortcut: "Incongruous = does not fit. Consistent = fits perfectly.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'atypical' or 'out of place', which are synonyms", "Choosing 'discrepant', which refers to a mismatch between data points"],
  },
  {
    text: 'Select the antonym of "INTREPID":',
    answer: "TIMID",
    distractors: ["FEARFUL", "BASHFUL", "CIRCUMSPECT"],
    explanation:
      "'Intrepid' means showing fearless courage. 'Timid' means shy and easily frightened, which is its opposite.",
    shortcut: "Intrepid = fearless. Timid = easily frightened.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'fearful' or 'bashful', which are near-synonyms", "Choosing 'circumspect', which means cautious rather than timid"],
  },
  {
    text: 'Choose the word OPPOSITE in meaning to "LUCRE":',
    answer: "PENURY",
    distractors: ["AFFLUENCE", "INDIGENCE", "POVERTY"],
    explanation:
      "'Lucre' means wealth or riches. 'Penury' means extreme poverty or want, which is its opposite.",
    shortcut: "Lucre = riches. Penury = abject poverty.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'affluence', which is a synonym", "Choosing 'indigence' or 'poverty', which are near-synonyms rather than the standard contrast"],
  },
  {
    text: 'Pick the antonym of "MENDACIOUS":',
    answer: "CANDID",
    distractors: ["DECEITFUL", "FALSE", "DISHONEST"],
    explanation:
      "'Mendacious' means lying or given to lying. 'Candid' means truthful and straightforward, which is its opposite.",
    shortcut: "Mendacious = given to lying. Candid = frank and truthful.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'deceitful' or 'false', which are synonyms", "Choosing 'dishonest', which is also a synonym rather than the antonym"],
  },
  {
    text: 'Select the word OPPOSITE in meaning to "OBDURATE":',
    answer: "YIELDING",
    distractors: ["STUBBORN", "UNBENDING", "INTRANSIGENT"],
    explanation:
      "'Obdurate' means stubbornly refusing to change one's opinion. 'Yielding' means giving way or being compliant, which is its opposite.",
    shortcut: "Obdurate = immovably stubborn. Yielding = giving way.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'stubborn' or 'intransigent', which are synonyms", "Choosing 'unbending', which is also a synonym"],
  },
  {
    text: 'Choose the antonym of "PARAGON":',
    answer: "MEDIOCRITY",
    distractors: ["EXCELLENCE", "SUPERB EXEMPLAR", "MODEL OF VIRTUE"],
    explanation:
      "'Paragon' means a model of outstanding excellence. 'Mediocrity' means average or unremarkable quality, which is its opposite.",
    shortcut: "Paragon = perfect exemplar. Mediocrity = merely average.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'excellence' or 'model of virtue', which are synonyms", "Choosing 'superb exemplar', which repeats the same sense"],
  },
  {
    text: 'Pick the word OPPOSITE in meaning to "QUELL":',
    answer: "INCITE",
    distractors: ["SUPPRESS", "SUBDUE", "QUENCH"],
    explanation:
      "'Quell' means to put an end to something such as a disturbance. 'Incite' means to stir up or provoke, which is its opposite.",
    shortcut: "Quell = put down. Incite = stir up.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'suppress' or 'subdue', which are synonyms", "Choosing 'quench', which applies to fire or thirst but shares the sense"],
  },
  {
    text: 'Select the antonym of "SANCTUARY":',
    answer: "PERIL",
    distractors: ["REFUGE", "SANCTUM", "HAVEN"],
    explanation:
      "'Sanctuary' means a place of safety or refuge. 'Peril' means a place or situation of extreme danger, which is its opposite.",
    shortcut: "Sanctuary = safe haven. Peril = place of danger.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'refuge' or 'haven', which are synonyms", "Choosing 'sanctum', which also means a sacred private place"],
  },
  {
    text: 'Choose the word OPPOSITE in meaning to "TENUOUS":',
    answer: "STURDY",
    distractors: ["THIN", "SLENDER", "FRAGILE"],
    explanation:
      "'Tenuous' means very weak or slight and therefore easily broken. 'Sturdy' means strongly built and unlikely to break, which is its opposite.",
    shortcut: "Tenuous = slight and weak. Sturdy = strongly built.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'thin' or 'slender', which are synonyms", "Choosing 'fragile', which is a synonym rather than the true contrast"],
  },
  {
    text: 'Pick the antonym of "UMBRAGE":',
    answer: "DELIGHT",
    distractors: ["DISPLEASURE", "OFFENCE", "IRRITATION"],
    explanation:
      "'Umbrage' means offended or annoyed feeling. 'Delight' means great pleasure, which is its opposite.",
    shortcut: "Umbrage = taking offence. Delight = intense pleasure.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'displeasure' or 'irritation', which are synonyms", "Choosing 'offence', which is a synonym"],
  },
  {
    text: 'Select the word OPPOSITE in meaning to "BANEFUL":',
    answer: "BENEVOLENT",
    distractors: ["MALEFICENT", "HARMFUL", "DELETERIOUS"],
    explanation:
      "'Baneful' means actively harmful or poisonous. 'Benevolent' means well-meaning and kindly, which is its opposite.",
    shortcut: "Baneful = actively harmful. Benevolent = well-intentioned.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'harmful' or 'deleterious', which are synonyms", "Choosing 'maleficent', which is a synonym of 'baneful'"],
  },
  {
    text: 'Choose the word OPPOSITE in meaning to "CLEAVE":',
    answer: "FUSE",
    distractors: ["SPLIT", "SEVER", "PART"],
    explanation:
      "In its primary sense 'cleave' means to split or divide. 'Fuse' means to join or unite, which is its opposite.",
    shortcut: "Cleave = split apart. Fuse = join together.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'split' or 'sever', which are synonyms", "Choosing 'part', which is a verb synonym"],
  },
  {
    text: 'Pick the antonym of "DECIMATE":',
    answer: "MULTIPLY",
    distractors: ["ANNIHILATE", "REDUCE", "CULL"],
    explanation:
      "'Decimate' means to reduce a number by roughly one tenth, and by extension to destroy a large part. 'Multiply' means to increase in number, which is its opposite.",
    shortcut: "Decimate = reduce heavily. Multiply = increase.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'annihilate' or 'reduce', which are synonyms", "Choosing 'cull', which means to reduce selectively rather than destroy wholesale"],
  },
  {
    text: 'Select the word OPPOSITE in meaning to "IMPUGE":',
    answer: "EXONERATE",
    distractors: ["ACCUSE", "DENOUNCE", "INDICT"],
    explanation:
      "'Impugn' means to call into question the honesty or validity of something. 'Exonerate' means to free from blame, which is its opposite.",
    shortcut: "Impugn = cast doubt on. Exonerate = declare blameless.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'accuse' or 'denounce', which are synonyms", "Choosing 'indict', which refers specifically to a formal criminal charge"],
  },
  {
    text: 'Choose the antonym of "SPORADIC":',
    answer: "PERVASIVE",
    distractors: ["OCCASIONAL", "INTERMITTENT", "INFREQUENT"],
    explanation:
      "'Sporadic' means occurring at irregular intervals, in scattered instances. 'Pervasive' means spreading widely and everywhere, which is its opposite.",
    shortcut: "Sporadic = scattered and irregular. Pervasive = everywhere.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'occasional' or 'intermittent', which are synonyms", "Choosing 'infrequent', which is a synonym"],
  },
  {
    text: 'Pick the word OPPOSITE in meaning to "TEPID":',
    answer: "SCALDING",
    distractors: ["LUKewarm", "COOL", "CHILLED"],
    explanation:
      "'Tepid' means only slightly warm. 'Scalding' means extremely hot, close to boiling, which is its opposite.",
    shortcut: "Tepid = barely warm. Scalding = extremely hot.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'lukewarm' or 'cool', which are near-synonyms", "Choosing 'chilled', which is a further step in the same direction rather than the opposite"],
  },
  {
    text: 'Select the word OPPOSITE in meaning to "VITUPERATE":',
    answer: "COMMEND",
    distractors: ["BERATE", "REPROACH", "SCOLD"],
    explanation:
      "'Vituperate' means to blame or abuse someone in strong language. 'Commend' means to praise or approve of, which is its opposite.",
    shortcut: "Vituperate = abuse in words. Commend = praise.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'berate' or 'reproach', which are synonyms", "Choosing 'scold', which is a synonym"],
  },
];

/** Test 2 - synonyms. */
const T2: AptitudeSeedSpec[] = [
  {
    text: 'Choose the word closest in meaning to "ABSTRUSE":',
    answer: "RECONDITE",
    distractors: ["OBSCURE", "ARCANE", "INSCRUTABLE"],
    explanation:
      "'Abstruse' means difficult to understand because of its complexity. 'Recondite' has exactly that sense, while 'obscure' stresses being hidden and 'arcane' stresses mystery.",
    shortcut: "Abstruse = hard to comprehend because complex.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'obscure', which is a near-synonym with a different emphasis", "Choosing 'arcane', which suggests hidden or esoteric knowledge"],
  },
  {
    text: 'Pick the word nearest in meaning to "ACUMEN":',
    answer: "KEEN INSIGHT",
    distractors: ["BRILLIANCE", "SAGACITY", "ASTUTENESS"],
    explanation:
      "'Acumen' means the ability to make good judgements and decisions quickly. 'Keen insight' captures both sharpness of mind and practical judgement.",
    shortcut: "Acumen = sharp practical judgement.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'brilliance', which refers to intellectual display rather than judgement", "Choosing 'sagacity', which is a close synonym but more learned in tone"],
  },
  {
    text: 'Select the synonym of "AFFABLE":',
    answer: "CORDIAL",
    distractors: ["GENIAL", "AMIABLE", "CONGENIAL"],
    explanation:
      "'Affable' means friendly, easy to talk to and pleasant to be with. 'Cordial' expresses the same warmth in a slightly formal register.",
    shortcut: "Affable = warm and easy in manner.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'genial', which is a close synonym but usually applied to people or occasions", "Choosing 'amiable', which is nearly identical in sense"],
  },
  {
    text: 'Choose the word CLOSEST in meaning to "ANOMALY":',
    answer: "OUTLIER",
    distractors: ["IRREGULARITY", "EXCEPTION", "DEVIATION"],
    explanation:
      "'Anomaly' means something that deviates from what is standard or expected. In statistical and engineering writing the standard term is 'outlier', which names exactly that deviating case.",
    shortcut: "Anomaly = a case that breaks the pattern.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'irregularity', which describes the quality rather than the deviating item", "Choosing 'exception', which stresses being excluded from a rule"],
  },
  {
    text: 'Pick the synonym of "ARDENT":',
    answer: "PASSIONATE",
    distractors: ["EAGER", "ZEALOUS", "FERVENT"],
    explanation:
      "'Ardent' means having or displaying passion or enthusiasm. 'Passionate' expresses the same intensity directly.",
    shortcut: "Ardent = intensely keen or impassioned.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'eager', which is weaker in intensity", "Choosing 'zealous' or 'fervent', which are close synonyms"],
  },
  {
    text: 'Select the word nearest in meaning to "ASSIDUOUS":',
    answer: "DILIGENT",
    distractors: ["SEDULOUS", "PAINSTAKING", "PERSISTENT"],
    explanation:
      "'Assiduous' means showing constant, careful and sustained effort. 'Diligent' is its standard synonym, particularly about work and study.",
    shortcut: "Assiduous = persistently and carefully attentive.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'sedulous', which is a literary synonym", "Choosing 'persistent', which stresses continuing rather than careful attention"],
  },
  {
    text: 'Choose the synonym of "BELATED":',
    answer: "TARDY",
    distractors: ["LATE", "OVERDUE", "DELAYED"],
    explanation:
      "'Belated' means arriving or happening after the expected or proper time. 'Tardy' has precisely that sense of lateness.",
    shortcut: "Belated = coming later than it should.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'overdue', which applies to payments or library books", "Choosing 'late', which is a plain word but lacks the nuance of lateness relative to an expected time"],
  },
  {
    text: 'Pick the word CLOSEST in meaning to "BELLICOSE":',
    answer: "MILITANT",
    distractors: ["AGGRESSIVE", "BELLIGERENT", "MARTIAL"],
    explanation:
      "'Bellicose' means showing aggression or readiness to fight over a dispute. 'Militant' conveys the same warlike readiness to act forcefully.",
    shortcut: "Bellicose = aggressive in a warlike way.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'belligerent', which is a close synonym but implies active hostility", "Choosing 'aggressive', which is broader and not specifically warlike"],
  },
  {
    text: 'Select the synonym of "CLOY":',
    answer: "SATIATE",
    distractors: ["SURFEIT", "NAUSEATE", "OVERSATURATE"],
    explanation:
      "'Cloy' means to make someone completely tired or sick of something, especially by giving too much of it. 'Satiate' names the resulting state of being fully satisfied, often unpleasantly so.",
    shortcut: "Cloy = tire with an excess of something.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'nauseate', which is the opposite sense of causing disgust", "Choosing 'surfeit', which is a related noun rather than the verb that matches the stem"],
  },
  {
    text: 'Choose the word CLOSEST in meaning to "CRAVEN":',
    answer: "COWARDLY",
    distractors: ["TIMOROUS", "POLTROONISH", "PUSILLANIMOUS"],
    explanation:
      "'Craven' means lacking courage and mean-spirited. 'Cowardly' is the plainest exact equivalent.",
    shortcut: "Craven = spineless and fearful.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'timorous', which is timidity rather than cowardice", "Choosing 'pusillanimous', which is a literary synonym"],
  },
  {
    text: 'Pick the synonym of "DEBUNK":',
    answer: "DISPEL",
    distractors: ["DISPROVE", "EXPOSE", "DEMOLISH"],
    explanation:
      "'Debunk' means to expose and discredit a widely held belief. 'Dispel' means to drive away a belief, fear or rumour, which matches the function.",
    shortcut: "Debunk = strip a claim of its credibility.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'demolish', which applies to structures or arguments rather than beliefs", "Choosing 'expose', which names the act rather than the removal of belief"],
  },
  {
    text: 'Select the word nearest in meaning to "EFFACIOUS":',
    answer: "EFFECTIVE",
    distractors: ["POTENT", "EFFICIENT", "PRODUCTIVE"],
    explanation:
      "'Effacious' means producing the desired result. 'Effective' is the direct synonym, whereas 'efficient' stresses economy of effort and 'productive' stresses output.",
    shortcut: "Effacious = achieves the intended result.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'efficient', which is a near-synonym in modern use but classically means thrifty", "Choosing 'productive', which concerns output rather than the intended effect"],
  },
  {
    text: 'Choose the synonym of "EMBARGO":',
    answer: "MORATORIUM",
    distractors: ["BLOCKADE", "PROHIBITION", "BAN"],
    explanation:
      "'Embargo' means a legal or official order preventing the movement of goods or the start of activity. 'Moratorium' is the formal term for a temporary suspension.",
    shortcut: "Embargo = a temporary legal bar on trade or activity.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'blockade', which implies a physical obstruction", "Choosing 'ban', which need not be temporary or legal"],
  },
  {
    text: 'Pick the word CLOSEST in meaning to "EMBROIL":',
    answer: "ENMESH",
    distractors: ["ENTANGLE", "IMPLICATE", "INVOLVE"],
    explanation:
      "'Embroil' means to involve someone deeply and damagingly in a difficult situation. 'Enmesh' conveys the same idea of being caught up in something tangled.",
    shortcut: "Embroil = drag someone into a mess.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'involve', which is far too weak", "Choosing 'entangle', which does not carry the damaging connotation"],
  },
  {
    text: 'Select the synonym of "ENIGMA":',
    answer: "MYSTERY",
    distractors: ["PUZZLE", "RIDDLE", "CONUNDRUM"],
    explanation:
      "'Enigma' means something that is mysterious and difficult to understand. 'Mystery' names that quality directly, whereas 'riddle' and 'conundrum' are deliberately solvable puzzles.",
    shortcut: "Enigma = something puzzling and unexplained.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'riddle', which implies a question with an answer", "Choosing 'conundrum', which likewise implies a solvable puzzle"],
  },
  {
    text: 'Choose the word nearest in meaning to "ESTEEM":',
    answer: "REGARD",
    distractors: ["RESPECT", "ESTIMATION", "DEFERENCE"],
    explanation:
      "'Esteem' means to regard something as important or of high value. 'Regard' expresses the same attitude of consideration and respect.",
    shortcut: "Esteem = hold in high regard.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'deference', which implies submission to authority", "Choosing 'estimation', which is the noun form"],
  },
  {
    text: 'Pick the synonym of "EXEMPLARY":',
    answer: "MODEL",
    distractors: ["OUTSTANDING", "COMMENDABLE", "ILLUSTRIOUS"],
    explanation:
      "'Exemplary' means serving as a model to be imitated, with the sense that the conduct is unusually good. 'Model' carries the same sense of being a standard to copy.",
    shortcut: "Exemplary = worthy of being copied.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'outstanding', which loses the idea of serving as a standard", "Choosing 'illustrious', which means famous rather than exemplary"],
  },
  {
    text: 'Select the word CLOSEST in meaning to "EXTOL":',
    answer: "LAUD",
    distractors: ["EULOGIZE", "EXALT", "GLORIFY"],
    explanation:
      "'Extol' means to praise something highly. 'Laud' means to express approval of, which matches the sense of commending.",
    shortcut: "Extol = praise highly.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'exalt', which stresses glorification rather than simple praise", "Choosing 'eulogize', which applies specifically to a funeral tribute"],
  },
  {
    text: 'Choose the synonym of "FERVENT":',
    answer: "ZEALOUS",
    distractors: ["PASSIONATE", "ARDENT", "DEVOUT"],
    explanation:
      "'Fervent' means showing intense feeling or enthusiasm. 'Zealous' expresses the same burning eagerness.",
    shortcut: "Fervent = intensely enthusiastic.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'ardent', which was the target word in an antonym item", "Choosing 'devout', which is specific to religious devotion"],
  },
  {
    text: 'Pick the word nearest in meaning to "FRUGAL":',
    answer: "THRIFTY",
    distractors: ["AUSTERE", "SPARSE", "ECONOMICAL"],
    explanation:
      "'Frugal' means sparing or economical in the use of resources. 'Thrifty' describes the same careful economy.",
    shortcut: "Frugal = careful with money or resources.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'sparse', which describes thinness or scarcity rather than economy", "Choosing 'austere', which describes severity of manner"],
  },
  {
    text: 'Select the synonym of "GRIEVE":',
    answer: "MOURN",
    distractors: ["LAMENT", "BEWAIL", "SORROW"],
    explanation:
      "'Grieve' means to feel deep sorrow over a loss. 'Mourn' expresses the same sorrowing, usually for a death.",
    shortcut: "Grieve = feel deep sorrow at a loss.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'bewail', which is a louder, more literary synonym", "Choosing 'sorrow', which is the noun"],
  },
  {
    text: 'Choose the word CLOSEST in meaning to "HARROW":',
    answer: "TORTURE",
    distractors: ["AGONY", "EXACERBATE", "MAIM"],
    explanation:
      "'Harrow' means to cause acute pain or distress. 'Torture' captures that severity of inflicted suffering.",
    shortcut: "Harrow = subject to acute pain or distress.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'exacerbate', which is a verb meaning to worsen", "Choosing 'agony', which is the noun form"],
  },
  {
    text: 'Pick the synonym of "IMPETUS":',
    answer: "MOMENTUM",
    distractors: ["IMPULSE", "STIMULUS", "DRIVE"],
    explanation:
      "'Impetus' means the force that drives something forward, giving it energy and direction. 'Momentum' names that same forward-driving quantity.",
    shortcut: "Impetus = the push that sets something in motion.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'stimulus', which is an external trigger rather than internal drive", "Choosing 'impulse', which is a momentary force rather than sustained momentum"],
  },
  {
    text: 'Select the word nearest in meaning to "INAUGURATE":',
    answer: "COMMENCE",
    distractors: ["INSTITUTE", "INITIATE", "DEDICATE"],
    explanation:
      "'Inaugurate' means to begin something formally, especially a public undertaking. 'Commence' means to begin, matching the core sense.",
    shortcut: "Inaugurate = begin formally and ceremonially.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'dedicate', which is one specific sense but not the general one", "Choosing 'initiate', which is a close synonym but implies the first step by a person"],
  },
  {
    text: 'Choose the synonym of "INFILTRATE":',
    answer: "PENETRATE",
    distractors: ["PERVADE", "INSINUATE", "TRESPASS"],
    explanation:
      "'Infiltrate' means to enter gradually and stealthily, especially where entry is not permitted. 'Penetrate' captures the entry itself, though not the stealth.",
    shortcut: "Infiltrate = gain entry stealthily.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'insinuate', which means to suggest indirectly", "Choosing 'trespass', which is a legal wrong rather than a method of entry"],
  },
  {
    text: 'Pick the word CLOSEST in meaning to "INSIDIOUS":',
    answer: "TREACHEROUS",
    distractors: ["PERNICIOUS", "DECEITFUL", "SUBTLE"],
    explanation:
      "'Insidious' means working in a hidden, harmful way, often by gradual undermining. 'Treacherous' conveys the same concealed betrayal.",
    shortcut: "Insidious = harmful in a hidden, gradual way.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'pernicious', which was a target word elsewhere and stresses harmfulness", "Choosing 'subtle', which is neutral rather than malicious"],
  },
  {
    text: 'Select the synonym of "MUNIFICENT":',
    answer: "GENEROUS",
    distractors: ["LIBERAL", "MAGNANIMOUS", "PRODIGAL"],
    explanation:
      "'Munificent' means very generous, especially in giving large amounts. 'Generous' is its standard plain equivalent.",
    shortcut: "Munificent = giving generously, often lavishly.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'prodigal', which implies wasteful or excessive giving", "Choosing 'magnanimous', which stresses nobility rather than generosity of amount"],
  },
  {
    text: 'Choose the word nearest in meaning to "OBFUSCATE":',
    answer: "CONCEAL",
    distractors: ["OBSCURE", "DELIBERATE", "SUPPRESS"],
    explanation:
      "'Obfuscate' means to render something unclear or difficult to understand, usually deliberately. 'Conceal' names the same intent of hiding.",
    shortcut: "Obfuscate = deliberately make unclear.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'suppress', which means to withhold rather than to make unclear", "Choosing 'obscure', which drops the deliberate intent"],
  },
  {
    text: 'Pick the synonym of "ORTHODOX":',
    answer: "CONVENTIONAL",
    distractors: ["TRADITIONAL", "ORTHODOXED", "CUSTODIAL"],
    explanation:
      "'Orthodox' means conforming to accepted or established views. 'Conventional' expresses the same adherence to what is generally approved.",
    shortcut: "Orthodox = accepted and traditional.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'custodial', which means relating to custody", "Choosing 'traditional', which is close but stresses antiquity rather than approval"],
  },
  {
    text: 'Select the word CLOSEST in meaning to "RECALCITRANT":',
    answer: "OBSTINATE",
    distractors: ["STUBBORN", "UNMANAGEABLE", "INTRANSIGENT"],
    explanation:
      "'Recalcitrant' means stubbornly resisting authority or control. 'Obstinate' has the same stubbornness, though without the added note of resisting a superior.",
    shortcut: "Recalcitrant = stubbornly refusing to comply.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'unmanageable', which describes the practical consequence rather than the attitude", "Choosing 'intransigent', which is a close synonym with a more diplomatic tone"],
  },
];

/** Test 3 - relational pairs: analogy, cause-effect, part-whole and neither/nor. */
const T3: AptitudeSeedSpec[] = [
  {
    text: 'The relation in IGNITE : BLAZE is the same as FLOOD : _______',
    answer: "DELUGE",
    distractors: ["IRRIGATE", "DRENCH", "SUBMERGE"],
    explanation:
      "'Ignite' is the act that brings about a 'blaze'. A 'flood' brings about a 'deluge', so the second pair must keep the act-and-consequence relation.",
    shortcut: "A verb naming the action -> the noun naming its extreme result.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'irrigate', which is a controlled water supply rather than a consequence", "Choosing 'drench', which is a milder verb rather than the resulting condition"],
  },
  {
    text: 'Complete the pair with the same relation as HERBICIDE : WEED :: BACTERICIDE : _______',
    answer: "MICROBE",
    distractors: ["VIRUS", "FUNGUS", "TOXIN"],
    explanation:
      "A herbicide destroys weeds, so it acts on the target plant. A bactericide acts on bacteria, and the singular noun for that target group is 'microbe'.",
    shortcut: "Agent that kills X :: X, in its singular.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'virus', which is not what a bactericide acts on", "Choosing 'toxin', which is a substance rather than an organism"],
  },
  {
    text: 'Fill in the blank so the relation matches MALEDICTION : EVIL :: REPRIMAND : _______',
    answer: "REBUKE",
    distractors: ["REWARD", "RELEASE", "RECALL"],
    explanation:
      "A malediction is the utterance of a curse, that is, an act of wishing evil. A reprimand is the utterance of a rebuke, so the second half of the pair must be the act of criticising harshly.",
    shortcut: "A formal word naming an act :: the plainer word naming the same act.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'recall', which means to withdraw or remember", "Choosing 'release', which is the opposite of restraint"],
  },
  {
    text: 'EBONY : CHAIR :: SPINE : _______',
    answer: "BOOK",
    distractors: ["SKELETON", "RIBBON", "GALLEY"],
    explanation:
      "'Ebony' is the material and 'chair' is the object built from it. 'Spine' is the structural material of a 'book'.",
    shortcut: "Material :: the artefact made from it.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'skeleton', which is made of bone, not of spine", "Choosing 'ribbon', which is a material rather than an artefact"],
  },
  {
    text: 'BRAMBLE : HEDGEROW :: SHINGLE : _______',
    answer: "ROOF",
    distractors: ["FENCE", "WALL", "CLADDING"],
    explanation:
      "Brambles, when planted close together, form a hedgerow. Shingles, when laid, form a roof covering, so 'roof' is the matching collective object.",
    shortcut: "Unit that is laid in rows -> the surface it forms.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'fence', which would repeat the hedging idea", "Choosing 'wall', which is a vertical structure rather than a surface covering"],
  },
  {
    text: 'STRAND : TRESS :: BEAM : _______',
    answer: "RAFTER",
    distractors: ["LINTEL", "JOIST", "TRUSS"],
    explanation:
      "Several strands together form a tress of hair. Several beams laid side by side form the rafters of a roof, so 'rafter' is the matching collective term.",
    shortcut: "Small repeated unit :: the larger member made of many such units.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'lintel', which is the horizontal beam over an opening", "Choosing 'truss', which is the whole assembly rather than the repeated member"],
  },
  {
    text: 'TORRID : SCORCHING :: LUKewarm : _______',
    answer: "TEMPID",
    distractors: ["CHILLED", "ICY", "MILD"],
    explanation:
      "The first pair shows a mild word and its extreme intensification. Applying the same one-step reduction to 'lukewarm' gives 'tepid'.",
    shortcut: "Hot extreme <- mild form: the mild form's milder synonym is the answer.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'chilled', which is two steps colder rather than one", "Choosing 'mild', which is too general and does not pair as a temperature term"],
  },
  {
    text: 'Complete the pair: SPECIMEN : SAMPLE :: MODEL : _______',
    answer: "PROTOTYPE",
    distractors: ["DUPLICATE", "REPLICA", "COUNTERPART"],
    explanation:
      "A 'specimen' is a 'sample' taken from a larger population for study. A 'model' that is the first of its kind serves as the 'prototype' from which later versions are made.",
    shortcut: "A representative example :: the thing it represents.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'replica', which is a later copy rather than the original", "Choosing 'duplicate', which implies a copy rather than a standard"],
  },
  {
    text: 'FLEET : CORVETTE :: FLOCK : _______',
    answer: "MERINO",
    distractors: ["BOLLARD", "CORMORANT", "COYOTE"],
    explanation:
      "A 'corvette' is a member of a fleet of ships. A 'merino' is a member of a flock of sheep, which is the collection term for that animal.",
    shortcut: "Collection term :: a single member of that collection.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'cormorant', which is a member of a roost or colony", "Choosing 'bollard', which has no matching collective of that kind"],
  },
  {
    text: 'ANTHOLOGY : POEM :: ALBUM : _______',
    answer: "SNAPSHOT",
    distractors: ["PAINTING", "SCULPTURE", "RECITAL"],
    explanation:
      "A poem is a single item collected in an anthology. A photograph is a single item collected in an album, so 'snapshot' completes the pair.",
    shortcut: "Collection :: the kind of single item the collection holds.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'painting', which is more usually held in a gallery or portfolio", "Choosing 'recital', which is a performance rather than a collected item"],
  },
  {
    text: 'MARBLE : STATUE :: WOOL : _______',
    answer: "SWEATER",
    distractors: ["CARPET", "MITTEN", "BLANKET"],
    explanation:
      "A statue is a carved object made of marble. A sweater is a knitted garment made of wool, which is the everyday pairing.",
    shortcut: "Material :: the object commonly made from it.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'carpet', which is woven rather than knitted and is a domestic furnishing", "Choosing 'blanket', which overlaps but is not the standard example"],
  },
  {
    text: 'OBSIDIAN : BLADE :: COPPER : _______',
    answer: "WIRE",
    distractors: ["PIPE", "TUBING", "ALLOY"],
    explanation:
      "Obsidian was knapped into blades for cutting. Copper's characteristic use is drawn into wire for carrying current.",
    shortcut: "Material :: the product its properties make it ideal for.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'pipe', which uses rigidity rather than conductivity", "Choosing 'alloy', which is a mixture rather than a single material"],
  },
  {
    text: 'IVORY : PIANO KEY :: GRANITE : _______',
    answer: "COUNTERTOP",
    distractors: ["GRAVESTONE", "KERBSTONE", "OBELISK"],
    explanation:
      "Ivory was the traditional material for the white keys of a piano. Granite is the traditional material for a work surface, that is, a countertop.",
    shortcut: "Material :: the functional surface it is traditionally used for.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'gravestone', which is a memorial object rather than a surface", "Choosing 'kerbstone', which is an outdoor edging"],
  },
  {
    text: 'ANVIL : BLACKSMITH :: LOOM : _______',
    answer: "WEAVER",
    distractors: ["FULLER", "DYER", "TAILOR"],
    explanation:
      "An anvil is the characteristic tool of a blacksmith. A loom is the characteristic apparatus of a weaver.",
    shortcut: "Characteristic tool :: the craftsperson who uses it.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'fuller', which finishes and thickens cloth rather than weaving it", "Choosing 'dyer', which works with finished cloth"],
  },
  {
    text: 'LATHE : TURNER :: VICE : _______',
    answer: "MACHINIST",
    distractors: ["TURNER", "CARPENTER", "FOUNDER"],
    explanation:
      "A lathe shapes material by rotating it and is operated by a turner. A vice holds work firmly and is set up by a machinist in a workshop.",
    shortcut: "Workshop apparatus :: the trade that uses it.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'carpenter', who works in timber rather than a metalworking vice", "Choosing 'founder', who casts metal in a mould"],
  },
  {
    text: 'STETHOSCOPE : CARDIOLOGIST :: ENDOSCOPE : _______',
    answer: "GASTROENTEROLOGIST",
    distractors: ["NEUROLOGIST", "RADIOLOGIST", "OPHTHALMOLOGIST"],
    explanation:
      "A stethoscope examines the heart and is used by a cardiologist. An endoscope examines the digestive tract and is used by a gastroenterologist.",
    shortcut: "Instrument for a named organ :: the specialist who uses it.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'ophthalmologist', who examines the eye rather than the gut", "Choosing 'radiologist', who reads images rather than using an endoscope"],
  },
  {
    text: 'TELESCOPE : ASTRONOMER :: MICROSCOPE : _______',
    answer: "MICROBIOLOGIST",
    distractors: ["BOTANIST", "GEOLOGIST", "ENTOMOLOGIST"],
    explanation:
      "A telescope magnifies distant celestial objects and is used by an astronomer. A microscope magnifies very small specimens and is used by a microbiologist.",
    shortcut: "Instrument for viewing a scale :: the scientist who works at that scale.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'botanist', who studies plants and can use a microscope but is not the defining pairing", "Choosing 'entomologist', who studies insects at a different scale"],
  },
  {
    text: 'GONIOMETER : SURVEYOR :: SPECTROGRAPH : _______',
    answer: "ASTROPHYSICIST",
    distractors: ["CARTOGRAPHER", "GEOPHYSICIST", "METEOROLOGIST"],
    explanation:
      "A goniometer measures angles and is the surveyor's instrument for fixing bearings. A spectrograph splits light into a spectrum and is used by an astrophysicist to read stellar composition.",
    shortcut: "Measuring instrument for a specific quantity :: the discipline that depends on it.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'cartographer', who uses the surveyor's output rather than the goniometer directly", "Choosing 'meteorologist', who uses radiometers rather than spectrographs"],
  },
  {
    text: 'Select the word that is NEITHER a synonym NOR an antonym of "UBIQUITY":',
    answer: "HARMONY",
    distractors: ["OMNIPRESENCE", "SCARCITY", "PERVASIVENESS"],
    explanation:
      "'Ubiquity' means being present everywhere. 'Omnipresence' is its synonym and 'scarcity' is its antonym, while 'harmony' is unrelated to either.",
    shortcut: "For neither/nor items, discard the synonym and the antonym first.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'omnipresence', which is a direct synonym", "Choosing 'scarcity', which is the antonym"],
  },
  {
    text: 'Which option stands in no direct relation to "ADAMANT" - neither restating nor reversing its sense?',
    answer: "IMPECCABLE",
    distractors: ["OBSTINATE", "PLIANT", "UNWAVERING"],
    explanation:
      "'Adamant' means unbreakably firm in purpose. 'Obstinate' and 'unwavering' are synonyms and 'pliant' is the antonym, leaving 'impeccable', which concerns faultlessness rather than firmness.",
    shortcut: "Neither/nor: two synonyms and one antonym are decoys.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'obstinate', a close synonym", "Choosing 'pliant', which is the antonym"],
  },
  {
    text: 'None of these three restate or reverse the sense of "LUCRE". Which one is the odd word out?',
    answer: "SERENITY",
    distractors: ["WEALTH", "PENURY", "OPULENCE"],
    explanation:
      "'Lucre' means riches. 'Wealth' and 'opulence' are synonyms and 'penury' is the antonym, so 'serenity' is unrelated to either.",
    shortcut: "The answer to a neither/nor item is always the unrelated word.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'opulence', which is a synonym", "Choosing 'penury', which is the antonym"],
  },
  {
    text: 'ESCALATE : WORSEN :: SUBSIDE : _______',
    answer: "ABATE",
    distractors: ["INTENSIFY", "AMELIORATE", "REGRESS"],
    explanation:
      "'Escalate' and 'worsen' are two names for the same upward movement in severity. The downward counterpart, 'subside', pairs with 'abate'.",
    shortcut: "Direction of change must match: up pairs with up, down with down.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'intensify', which continues the upward movement", "Choosing 'regress', which suggests stepping backwards rather than calming"],
  },
  {
    text: 'ABJURE : RENOUNCE :: BEGRIM : _______',
    answer: "BEGRUDGE",
    distractors: ["CONCEDE", "BESTOW", "BEGUILE"],
    explanation:
      "'Abjure' is the formal term and 'renounce' the plainer one for formally giving something up. 'Begrim' and 'begrudge' have the same relationship: a literary word paired with its plainer equivalent.",
    shortcut: "Identify whether the pair is formal:plain or opposite; then match that structure.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'concede', which means to yield rather than to hold a grudge", "Choosing 'bestow', which is the opposite of begrudging something"],
  },
  {
    text: 'RAVINE : GORGE :: KNOLL : _______',
    answer: "HILL",
    distractors: ["ABYSS", "TRENCH", "CHASM"],
    explanation:
      "'Ravine' and 'gorge' are two names for the same kind of deep narrow valley. 'Knoll' and 'hill' are two names for the same kind of small rise in the ground.",
    shortcut: "Both halves of a pair must be the same kind of landform.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'abyss', which is far deeper than a knoll", "Choosing 'trench', which is a man-made or narrow cut"],
  },
  {
    text: 'SPUME : FROTH :: ASH : _______',
    answer: "CINDER",
    distractors: ["EMBER", "SOOT", "SMOKE"],
    explanation:
      "'Spume' is the formal word for 'froth'. 'Ash' is the everyday word for the residue of burning, and its more precise equivalent for the coarser fragments is 'cinder'.",
    shortcut: "Formal:litre synonym pairs must keep the same relationship.",
    difficulty: "hard",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'soot', which is the fine deposit rather than the coarser residue", "Choosing 'ember', which is a glowing fragment rather than the residue"],
  },
  {
    text: 'PIGMENT : COLOURING MATTER :: PIGEON : _______',
    answer: "BIRD",
    distractors: ["CARRIER", "PATIENT", "TARGET"],
    explanation:
      "'Pigment' is the technical name for colouring matter. 'Pigeon' is the specific name and 'bird' is the general class, matching the specific-to-general direction.",
    shortcut: "Specific name :: the broader class it belongs to.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'carrier', which is a different sense of the same root", "Choosing 'target', which confuses the homonym"],
  },
  {
    text: 'Complete the analogy: HERBIVORE : PLANT :: CARNIVORE : _______',
    answer: "ANIMAL",
    distractors: ["PLANT", "MINERAL", "FUNGUS"],
    explanation:
      "A herbivore feeds on plants; a carnivore feeds on animals, which completes the food-source pairing.",
    shortcut: "Feeder :: what it feeds on.",
    difficulty: "easy",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'plant', which repeats the first answer", "Choosing 'fungus', which would define an insectivore or mycophage"],
  },
  {
    text: 'GLACIER : ICE :: DESERT : _______',
    answer: "ARID SAND",
    distractors: ["WATER", "GRASS", "ROCK"],
    explanation:
      "A glacier is a body of ice; a desert is characterised by aridity and sand. The pairing is between a large landform and its dominant substance or condition.",
    shortcut: "Landform :: the material or condition that defines it.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'water', which is the wrong pairing because a desert lacks it", "Choosing 'rock', which characterises a plateau rather than a desert"],
  },
  {
    text: 'EPISTEMOLOGY : KNOWLEDGE :: AESTHETICS : _______',
    answer: "BEAUTY",
    distractors: ["TRUTH", "ETHICS", "LOGIC"],
    explanation:
      "Epistemology is the branch of philosophy concerned with knowledge. Aesthetics is the branch concerned with beauty and taste.",
    shortcut: "-ology suffix names a field; pair it with the thing it studies.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'truth', which belongs to the concern of ethics and logic", "Choosing 'ethics', which is the branch studying moral judgement"],
  },
  {
    text: 'CHASSIS : VEHICLE :: KEEL : _______',
    answer: "BOAT",
    distractors: ["SAIL", "HARBOUR", "ANCHOR"],
    explanation:
      "A chassis is the load-bearing base that carries a vehicle, and a keel is the load-bearing base that carries a boat. The structural member must pair with the whole it supports.",
    shortcut: "Structural base :: the whole structure it carries.",
    difficulty: "medium",
    topic: "Synonyms & Antonyms",
    commonMistakes: ["Choosing 'sail', which is a driving surface rather than a structural base", "Choosing 'anchor', which is moored equipment rather than part of the hull"],
  },
];

export const SYNONYMS_ANTONYMS_TESTS = {
  test1: buildAptitudeQuestions(T1, { category: "verbal", idPrefix: "apt-synant-t1", expectCount: 30 }),
  test2: buildAptitudeQuestions(T2, { category: "verbal", idPrefix: "apt-synant-t2", expectCount: 30 }),
  test3: buildAptitudeQuestions(T3, { category: "verbal", idPrefix: "apt-synant-t3", expectCount: 30 }),
};

export const SYNONYMS_ANTONYMS_SPEC_COUNTS = { test1: T1.length, test2: T2.length, test3: T3.length };
