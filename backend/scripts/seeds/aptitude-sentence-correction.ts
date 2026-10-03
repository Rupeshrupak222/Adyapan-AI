/**
 * Sentence Correction - Test 2 and Test 3.
 *
 * Test 1 (already live) covers: along-with/as-well-as agreement, 'each of'
 * agreement, not-only/but-also comparative, three dangling participles, two
 * misplaced adverbs, four parallelism breaks, 'aims at', 'dependent upon for',
 * past-perfect/present-perfect tense mixing, active-vs-passive voice, and
 * phrasal modifier placement. Every question below targets an error class that
 * Test 1 does not use, and each has its own scenario vocabulary so no two
 * questions collapse to the same concept signature.
 */
import { buildAptitudeQuestions, type AptitudeSeedSpec } from "./shared";

const TEST_2: AptitudeSeedSpec[] = [
  {
    text: 'Fix the article error: "Sanjay was waiting for _______ unique approval from the statutory auditor."',
    answer: "an unique",
    distractors: ["a unique", "a an unique", "the unique"],
    explanation:
      "The indefinite article takes the sound of the following word, not its spelling. 'Unique' begins with the consonant sound /juË/, so it must be preceded by 'an'.",
    shortcut: "An before a vowel SOUND, not a vowel letter.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Choosing 'a unique' because the word starts with the letter 'u'",
      "Choosing the definite article because the approval is already known",
    ],
  },
  {
    text: 'Choose the sentence that uses the count noun correctly: "The auditor counted _______ items in the inventory register than the previous quarter had listed."',
    answer: "fewer",
    distractors: ["less", "least", "lesser"],
    explanation:
      "'Fewer' is used with countable nouns that have an individual plural form. 'Items' is countable, so 'fewer' is required. 'Less' belongs with uncountable nouns such as water, time or effort.",
    shortcut: "Countable plural -> fewer. Uncountable mass -> less.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'less' because the quantity is small", "Using 'least' which is the superlative, not the comparative"],
  },
  {
    text: 'Which revision removes the misplaced prepositional phrase in: "The intern in the payroll team resigned her post, citing burnout."',
    answer: "The payroll team intern resigned her post, citing burnout.",
    distractors: [
      "The intern resigned her post, citing burnout in the payroll team.",
      "Resigning her post, the intern in the payroll team cited burnout.",
      "The intern in the payroll team, citing burnout, resigned her post.",
    ],
    explanation:
      "A prepositional phrase placed immediately after a noun ambiguously modifies that noun. Rewriting it as an introductory phrase after the noun, or moving it into the trailing position, restores the intended subject.",
    shortcut: "A phrase right after a noun usually attaches to that noun. Check who it actually describes.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Accepting that 'in the payroll team' might describe the resignation",
      "Repairing tense instead of modifier placement",
    ],
  },
  {
    text: 'Identify the comma splice in: "The batch failed validation, the pipeline halted before promotion."',
    answer: "The batch failed validation; the pipeline halted before promotion.",
    distractors: [
      "The batch failed validation, and the pipeline halted before promotion.",
      "The batch failed validation, so, the pipeline halted before promotion.",
      "The batch failed validation â€” and, the pipeline halted before promotion.",
    ],
    explanation:
      "Two independent clauses joined only by a comma is a comma splice. Either break the sentence with a semicolon or add a coordinating conjunction. 'So' is a conjunction but it cannot follow a comma before an independent clause.",
    shortcut: "Independent clause + comma + independent clause = illegal. Use ';' or add 'and'.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Inserting 'so' after the comma, which produces a new fault", "Inserting a second comma instead of a semicolon"],
  },
  {
    text: 'Pick the correct relative pronoun: "The technician _______ rewrote the scheduler still keeps a backup of every configuration file."',
    answer: "who",
    distractors: ["which", "whom", "whose"],
    explanation:
      "Standard English restricts 'who' to people and 'which' to things. The technician is a person, so 'who' is required as the subject of 'rewrote'. 'Whom' is the objective form and cannot serve as a subject.",
    shortcut: "Person -> who/whom/whose. Thing -> which/that.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Choosing 'which' for a human referent", "Choosing 'whom', which cannot be a subject"],
  },
  {
    text: 'Remove the redundancy: "The vendor returned the signed acceptance form back to the procurement portal."',
    answer: "returned the signed acceptance form to the procurement portal",
    distractors: [
      "returned the signed acceptance form back again to the procurement portal",
      "reverted the signed acceptance form back to the procurement portal",
      "returned back the signed acceptance form to the procurement portal",
    ],
    explanation:
      "'Return' already means to give back, so 'back' adds nothing. The plain transitive verb 'returned X to Y' is both grammatical and complete.",
    shortcut: "'Return back', 'repeat again', 'final outcome' - one word is always spare.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Keeping 'back' because the phrasing feels emphatic", "Changing the verb and leaving the duplication in place"],
  },
  {
    text: 'Resolve the possessive pronoun: "The warranty lapsed because _______ had shipped the unit without a completed inspection record."',
    answer: "it",
    distractors: ["its", "it's", "their"],
    explanation:
      "The possessive determiner 'its' must modify a noun and cannot stand alone as a subject. As the subject of the clause, the correct pronoun is the personal pronoun 'it'.",
    shortcut: "Its = belonging to it (never stands alone). It's = it is.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'its' because it looks possessive", "Using 'it's' as a possessive"],
  },
  {
    text: 'Fix the agreement error: "The number of defective units returned last quarter are far above the agreed threshold."',
    answer: "is",
    distractors: ["are", "were", "have been"],
    explanation:
      "In 'the number of X', the subject is the singular noun 'number', so the verb is singular. The plural verb belongs to 'a number of X', where the head noun is plural.",
    shortcut: "The number of -> singular verb. A number of -> plural verb.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Making the verb agree with 'units' instead of 'number'",
      "Adding 'a' before 'number' which changes the meaning",
    ],
  },
  {
    text: 'Correct the indefinite pronoun agreement: "Neither of the two calibration rigs _______ produced a reading within tolerance."',
    answer: "has",
    distractors: ["have", "produce", "producing"],
    explanation:
      "'Neither' is singular, so it takes a singular present-tense verb. The prepositional phrase 'of the two calibration rigs' sits inside the pronoun and does not change its number.",
    shortcut: "Neither/either/each = singular, whatever follows 'of'.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Pluralising the verb because 'rigs' is plural", "Using 'producing' which cannot follow 'neither'"],
  },
  {
    text: 'Restore parallelism: "The graduate trainee was asked to calibrate, to log the readings and _______ the instrument drift."',
    answer: "document",
    distractors: ["documenting", "documented", "to document"],
    explanation:
      "A coordinated series built on 'to' + verb must repeat the 'to' in every element. Mixing bare, 'to'-less and 'to'-prefixed infinitives breaks the parallelism.",
    shortcut: "If the first item has 'to', every item needs 'to'.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Making the last item past tense", "Adding 'to' only where it reads smoothly"],
  },
  {
    text: 'Choose the sentence with the correct correlative conjunction: "The audit _______ the redesign _______ the new control matrix uncovered eleven gaps."',
    answer: "Either the audit or the redesign of the new control matrix uncovered eleven gaps.",
    distractors: [
      "Either the audit or the redesign uncovered either eleven gaps or none.",
      "Neither the audit nor the redesign of the new control matrix uncovered eleven gaps.",
      "Either the audit, or the redesign of the new control matrix uncovered, eleven gaps.",
    ],
    explanation:
      "'Either ... or' pairs two alternatives and needs no commas around itself. The second alternative may be a whole noun phrase, so 'of the new control matrix' belongs to the redesign, and the single verb 'uncovered' distributes across both subjects.",
    shortcut: "Either/or = two positive alternatives, no surrounding commas.",
    difficulty: "hard",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Pairing 'either' with 'none', which is not an alternative", "Adding commas that turn the coordination into a non-restrictive aside"],
  },
  {
    text: "Replace the word choice that is inappropriate in formal writing: 'Since the firmware image was corrupted, we reflashed the controller from the recovery slot.'",
    answer: "Because",
    distractors: ["As", "While", "Though"],
    explanation:
      "'Since' is ambiguous: it can be a conjunction meaning 'because' or a preposition meaning 'from a point in time'. In formal technical prose, 'because' states the cause unambiguously.",
    shortcut: "Replace 'since' with 'because' whenever a causal link is meant.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Leaving 'since' in place and treating the ambiguity as harmless",
      "Using 'while', which introduces a time rather than a cause",
    ],
  },
  {
    text: 'Fix the homophone: "The chief ______ reason for the recall was a nonconforming weld in the subframe."',
    answer: "principal",
    distractors: ["principle", "principal's", "principles"],
    explanation:
      "'Principal' is the adjective meaning chief or main. 'Principle' is the noun meaning a rule or belief. The blank needs the adjective modifying 'reason'.",
    shortcut: "Principal = chief. Principle = rule.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Choosing 'principle' because it is the more frequently used noun", "Writing 'principal's' which makes the blank a possessive modifier"],
  },
  {
    text: 'Order the adjectives correctly: "The replacement assembly arrived in a _______ corrosion-resistant metal container."',
    answer: "small, sturdy, corrosion-resistant",
    distractors: [
      "corrosion-resistant small sturdy",
      "sturdy corrosion-resistant small",
      "small corrosion-resistant sturdy",
    ],
    explanation:
      "English orders adjectives as opinion, size, age, shape, colour, origin, material, purpose. 'Small' (size) precedes 'sturdy' (opinion in practice for manufactured goods) and 'corrosion-resistant' (purpose/quality) must come last.",
    shortcut: "Opinion, size, age, shape, colour, origin, material, purpose.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Placing the hyphenated compound adjective first because it is the most noticeable",
      "Treating 'sturdy' as a material adjective",
    ],
  },
  {
    text: "Choose the correct preposition: 'Three candidates _______ the six finalists were invited to the second round.'",
    answer: "among",
    distractors: ["between", "amongst both of", "beside"],
    explanation:
      "'Between' separates two definite items; 'among' places an item inside a group of more than two. 'Three candidates' is one member of the larger group 'the six finalists'.",
    shortcut: "Between = two. Among = more than two, treated as a group.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Using 'between' because the sentence names two groups",
      "Writing a redundant phrase such as 'amongst both of'",
    ],
  },
  {
    text: "Fix the reflexive pronoun: 'The three auditors reminded one _______ that the evidence locker had been relocked.'",
    answer: "another",
    distractors: ["themselves", "each other", "itself"],
    explanation:
      "Reflexive pronouns refer back to the subject. With three auditors acting separately, 'one another' and not 'themselves' is the accurate reciprocal, while 'another' correctly means a different auditor. 'Each other' is traditionally reserved for two, though it is widely accepted; the clear error is 'themselves', which implies each auditor reminded only themself.",
    shortcut: "Two items -> each other. Three or more -> one another.",
    difficulty: "hard",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Choosing 'themselves', which makes the pronoun refer to a single actor", "Using 'itself' with a plural subject"],
  },
  {
    text: "Choose the sentence in which 'affect' is used correctly: 'A partial power loss can _______ the calibration certificate more seriously than a full outage.'",
    answer: "affect",
    distractors: ["effect", "effects", "effecting"],
    explanation:
      "'Affect' is the verb meaning to influence or alter. 'Effect' is the noun meaning a result or consequence. The blank requires a verb after the modal 'can', so 'affect' is the only correct form.",
    shortcut: "Affect = verb (influence). Effect = noun (result).",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Choosing the noun 'effect' after a modal verb", "Using the participle 'effecting', which is not a standard word"],
  },
  {
    text: "Fix the misplaced word: 'The calibration lab only issues certificates for instruments it has verified _______ week.'",
    answer: "only issues certificates for instruments it has verified that week",
    distractors: [
      "issues certificates only for instruments it has verified that week",
      "only issues certificates for instruments that week it has verified",
      "issues certificates for only instruments it has verified that week",
    ],
    explanation:
      "'Only' must sit directly in front of the word it limits. It modifies 'issues', not 'certificates', 'instruments' or 'verified', so it belongs immediately before the verb.",
    shortcut: "Move 'only' next to the exact element it qualifies.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Leaving 'only' attached to 'issues' while reading it as limiting 'instruments'", "Inserting 'only' before 'instruments' to create a different meaning"],
  },
  {
    text: 'Correct the preposition: "The weld was rejected _______ the presence of porosity in the fusion zone."',
    answer: "because of",
    distractors: ["due", "owing", "thanks"],
    explanation:
      "'Because of' takes a noun phrase. 'Due' and 'owing' are adjectives that must be followed by 'to' plus a noun phrase. 'Thanks' would reverse the intended meaning.",
    shortcut: "Because of + noun. Due to + noun. Because + clause.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Writing 'due the presence' without 'to'", "Using 'owing of'"],
  },
  {
    text: 'Fix the verb form: "The technician _______ familiar with the firmware recovery procedure before the first field deployment."',
    answer: "was",
    distractors: ["were", "is", "has being"],
    explanation:
      "'Familiar' is an adjective, not a predicate noun, so the linking verb must agree with the singular subject 'the technician': 'was'. 'Is' would break the past-time reference established by 'before the first deployment'.",
    shortcut: "Adjective subject + singular linking verb; check the time reference for tense.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'were' because 'technician' can describe a team informally", "Writing 'has being' which is not a valid form"],
  },
  {
    text: 'Identify the fault in this comparative statement: "The new housing is more lighter than the casting it replaced."',
    answer: "lighter",
    distractors: ["more light", "lightest", "the lightest"],
    explanation:
      "The suffix '-er' already marks the comparative, so adding 'more' double-marks it. 'Lighter' is the correct comparative of the adjective 'light'.",
    shortcut: "Never 'more' + a word ending in -er or -est.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'more light' which reverses the part of speech", "Using the superlative 'lightest' for a two-way comparison"],
  },
  {
    text: 'Correct the pronoun case after the preposition: "The auditor sent a copy of the finding to _______ whom she had trained."',
    answer: "him",
    distractors: ["he", "his", "he's"],
    explanation:
      "A pronoun after a preposition takes the objective case. Because 'whom' is the object of 'to', the objective 'him' must be used.",
    shortcut: "After a preposition -> objective case (me, him, her, them, us).",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using the subjective 'he' after a preposition", "Using the possessive 'his' where an object pronoun is required"],
  },
  {
    text: "Rewrite the sentence so the introductory element is punctuated correctly: 'On completion of the destructive test the specimen fractured at the weld toe.'",
    answer: "On completion of the destructive test, the specimen fractured at the weld toe.",
    distractors: [
      "On completion, of the destructive test the specimen fractured at the weld toe.",
      "On completion of the destructive test; the specimen fractured at the weld toe.",
      "On completion of the destructive test the specimen, fractured at the weld toe.",
    ],
    explanation:
      "A short introductory prepositional phrase of more than one word should be followed by a comma. A semicolon would wrongly join two clauses, and splitting the prepositional phrase is ungrammatical.",
    shortcut: "Introductory phrase longer than three words -> comma after it.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Inserting a semicolon, which is reserved for joining independent clauses", "Inserting a comma inside the prepositional phrase"],
  },
  {
    text: "Correct the verb agreement with a collective noun: 'The panel of external auditors, together with the internal assurance lead, _______ the final opinion on the reporting framework.'",
    answer: "issued",
    distractors: ["issue", "issues", "issuing"],
    explanation:
      "The head of the subject is the singular 'panel'. The phrase 'together with the internal assurance lead' is a parenthetical that does not change the number, so the past-tense verb is 'issued'.",
    shortcut: "Find the head noun of the subject; parenthetical phrases never change agreement.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Treating the second noun in the parenthetical as the head", "Choosing present tense 'issues' against a past-time narrative"],
  },
  {
    text: 'Fix the misuse of "with": "The entire batch was quarantined with the exception of the samples already released _______ customs."',
    answer: "by customs",
    distractors: ["of customs", "from customs", "at customs"],
    explanation:
      "A passive 'with' clause naming the agent takes 'by'. 'Of' would create a partitive phrase, 'from' an origin and 'at' a location, none of which identifies the releasing authority.",
    shortcut: "Passive agent after a with-phrase -> by.",
    difficulty: "hard",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'of', which treats customs as the subject of release", "Using 'from', which describes origin rather than agency"],
  },
  {
    text: 'Remove the unneeded "to" in the phrasal verb: "The production team set forth to the shipping dock to verify the crate markings."',
    answer: "set forth",
    distractors: ["set about to", "set off to", "set forth to"],
    explanation:
      "'Set forth' is already a complete phrasal verb meaning to begin or to present. No second 'to' is needed, because the infinitive 'to verify' already supplies the complement.",
    shortcut: "Check whether the phrasal verb is already complete before adding 'to'.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Rewriting it as 'set about to', which changes the meaning to attempt", "Deleting the infinitive 'to verify' along with the extra 'to'"],
  },
  {
    text: "Correct the tense in the time clause: 'The calibration rig has been recalibrated twice since the engineer _______ the facility last June.'",
    answer: "joined",
    distractors: ["joins", "has joined", "will join"],
    explanation:
      "'Since' with a present perfect main clause refers to an interval starting in the past, and the subordinate clause describing the start of that interval takes the simple past.",
    shortcut: "Since + present perfect -> since-clause uses simple past.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using the present perfect 'has joined' in the time clause", "Using the simple present 'joins' as if the interval were current"],
  },
  {
    text: 'Fix the misuse of "regarding": "The disposition of the nonconforming part regarding _______ is still under review."',
    answer: "its root cause",
    distractors: ["it's root cause", "there root cause", "the root cause of it's"],
    explanation:
      "The possessive determiner 'its' is required before the noun 'root cause'. 'It's' is the contraction of 'it is' and cannot be followed by a noun in this construction.",
    shortcut: "Before a noun, always 'its' with no apostrophe.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Writing 'it's root cause' because the apostrophe looks possessive", "Using 'there' which is a place adverb, not a determiner"],
  },
  {
    text: 'Choose the sentence without a dangling participle: "Reviewing the weld map, three inconsistencies stood out to the auditor."',
    answer: "While reviewing the weld map, the auditor found three inconsistencies.",
    distractors: [
      "Reviewing the weld map, three inconsistencies stood out to the auditor.",
      "Reviewing the weld map, three inconsistencies were noticed by the auditor.",
      "Reviewing the weld map, the three inconsistencies stood out to the auditor.",
    ],
    explanation:
      "A participle at the start of a sentence must modify the grammatical subject. Here the subject is 'three inconsistencies', which cannot review anything, so the modifier must be attached to the person doing the reviewing.",
    shortcut: "Fronted participle -> the subject immediately after it must be the one doing the action.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Converting to a passive, which leaves 'three inconsistencies' as the subject of 'reviewing'",
      "Inserting 'the' before 'three inconsistencies' to disguise the mismatch",
    ],
  },
  {
    text: "Fix the usage of 'whose': 'The engineering council, _______ charter was renewed last quarter, has appointed a new external auditor.'",
    answer: "whose",
    distractors: ["which", "whom", "it's"],
    explanation:
      "'Whose' expresses possession and is the correct relative pronoun for things as well as people. 'Which' cannot serve this possessive function in standard formal English.",
    shortcut: "Possession -> whose, for both people and objects.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Choosing 'which' and then supplying a preposition such as 'of which'", "Choosing 'whom', which is for people in the object case"],
  },
];

const TEST_3: AptitudeSeedSpec[] = [
  {
    text: 'Correct the usage of "since": "Since the last calibration cycle, the drift on channel four _______ exceeded the alarm threshold."',
    answer: "has",
    distractors: ["had", "was", "were"],
    explanation:
      "'Since' introduces an interval running from the past to the present, so the present perfect 'has exceeded' is required.",
    shortcut: "Since + a past event -> present perfect in the main clause.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'had exceeded' as though the interval had closed", "Using 'was' without the perfect auxiliary"],
  },
  {
    text: 'Correct the verb form: "The technician _______ the fixture against the plate before attempting the drilling operation."',
    answer: "squared",
    distractors: ["squares", "has squared", "squaring"],
    explanation:
      "The subordinate clause states an action completed before the main clause, so the simple past 'squared' is correct.",
    shortcut: "Before-clause describing a completed step -> simple past.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using the present perfect 'has squared'", "Using the bare gerund 'squaring' after 'before'"],
  },
  {
    text: "Fix the misuse of 'in spite of': 'In spite of the assembly line being stopped twice, the output target was still achieved.'",
    answer: "Despite the assembly line being stopped twice",
    distractors: [
      "In spite of the assembly line having stopped twice",
      "In spite of the assembly line was stopped twice",
      "In spite of stopping the assembly line twice",
    ],
    explanation:
      "'Despite' and 'in spite of' are prepositions and take noun phrases or gerunds, never clauses. The gerund phrase 'the assembly line being stopped' is the correct object.",
    shortcut: "Despite / in spite of + noun or gerund. Never + a clause.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using a past-participle clause, which requires 'that'", "Writing 'in spite of stopping', which makes the reader the actor"],
  },
  {
    text: 'Fix the modifier placement: "The audit report that the lead auditor signed yesterday identified three material weaknesses."',
    answer: "The audit report signed yesterday by the lead auditor identified three material weaknesses.",
    distractors: [
      "The audit report that the lead auditor signed identified three material weaknesses yesterday.",
      "Signed yesterday, the audit report by the lead auditor identified three material weaknesses.",
      "The audit report that yesterday identified three material weaknesses the lead auditor signed.",
    ],
    explanation:
      "Placing 'yesterday' at the end leaves its attachment ambiguous: it could modify either 'signed' or 'identified'. Moving it next to the verb it times removes the ambiguity.",
    shortcut: "Put an adverb of time immediately beside the verb it times.",
    difficulty: "hard",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Converting to a fronted participle, which leaves a reduced clause modifying the wrong noun",
      "Moving 'yesterday' to modify 'identified' instead of 'signed'",
    ],
  },
  {
    text: "Fix the agreement error in this compound subject: 'Neither the incoming material nor the work-in-progress inventory _______ free of visible contamination.'",
    answer: "was",
    distractors: ["were", "are", "have been"],
    explanation:
      "'Neither ... nor' agrees with the nearer subject, 'the work-in-progress inventory', which is singular even though 'inventory' can look plural.",
    shortcut: "Neither ... nor -> verb matches the second subject.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Treating 'inventory' as plural because of the '-ory' ending", "Using 'are' because two items are listed"],
  },
  {
    text: 'Correct the preposition after "different": "The revised drawing is significantly different _______ the previous revision."',
    answer: "from",
    distractors: ["than", "with", "to"],
    explanation:
      "'Different' is followed by 'from' in standard formal English. 'Than' is used with comparatives such as 'more than' or 'fewer than', not with 'different from'.",
    shortcut: "Different from. Never 'different than' in formal usage.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'than' by analogy with comparative forms", "Using 'to' which reverses the comparison"],
  },
  {
    text: 'Correct the verb form in the "that"-clause: "The supervisor insisted that the technician _______ the guard before commencing the drilling cycle."',
    answer: "verify",
    distractors: ["verifies", "verified", "has verified"],
    explanation:
      "Verbs of insisting, demanding or requesting that take the subjunctive, which uses the bare infinitive regardless of the subject's number.",
    shortcut: "Insist / demand / request that + bare infinitive (subjunctive).",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'verifies' by applying ordinary agreement", "Using 'has verified' which would turn the clause into an assertion"],
  },
  {
    text: 'Correct the tense in the conditional: "If the plant had installed the redundant chiller two years earlier, the summer output shortfall _______ have been avoided."',
    answer: "would",
    distractors: ["will", "would have", "had"],
    explanation:
      "In a third conditional the result clause uses 'would have' plus the past participle. Because the ellipsis omits the repetitive auxiliary, only 'would' remains.",
    shortcut: "Third conditional: if + had V3 -> would (have) V3.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'would have', which would duplicate the modal already supplied", "Using 'will', which belongs to a real future condition"],
  },
  {
    text: 'Fix the misplaced adjective: "The maintenance log showed three loose fasteners on the bracket mount, which _______ required immediate retightening."',
    answer: "all required",
    distractors: ["required all", "requires all", "required"],
    explanation:
      "The relative pronoun 'which' refers to the fasteners, so the plural verb 'required' is correct and the quantifier 'all' belongs directly before it.",
    shortcut: "The relative pronoun's antecedent fixes the verb's number, not the noun it follows.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Treating 'which' as referring to 'the bracket mount'", "Using the present tense 'requires' against a past-tense log"],
  },
  {
    text: "Fix the misuse of 'so': 'The part number had been transposed so the drawing revision could not be matched to the bill of material.'",
    answer: "so that",
    distractors: ["such that", "so as", "thus"],
    explanation:
      "'So that' expresses purpose or result in formal writing. Bare 'so' is acceptable in informal register but is avoided in technical documentation.",
    shortcut: "Purpose or result -> 'so that' in formal prose.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'so as', which requires an infinitive", "Using 'such that', which expresses a condition rather than a result"],
  },
  {
    text: 'Correct the redundancy in this sentence: "The manual contains a complete and comprehensive list of every approved torque value."',
    answer: "a complete list of every approved torque value",
    distractors: [
      "a comprehensive list of every approved torque value",
      "a complete and exhaustive list of every approved torque value",
      "a complete list of absolutely every approved torque value",
    ],
    explanation:
      "'Complete' and 'comprehensive' are near-synonyms; using both is pleonasm. A single adjective carries the meaning.",
    shortcut: "Delete one of any two adjectives that share a meaning.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Substituting a third synonym rather than removing the redundancy", "Keeping both and adding 'absolutely'"],
  },
  {
    text: 'Fix the error in this sentence: "The retest results were consistent with the original findings, as well as the process capability indices."',
    answer: "The retest results were consistent with the original findings as well as with the process capability indices.",
    distractors: [
      "The retest results were consistent with the original findings, as well as the process capability indices.",
      "The retest results were consistent with the original findings, as well as with the process capability indices.",
      "The retest results were consistent, with the original findings as well as the process capability indices.",
    ],
    explanation:
      "In 'as well as', the second coordinate stands alone and must repeat any preposition that the first coordinate uses.",
    shortcut: "With X as well as Y, repeat the preposition: 'as well as with Y'.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'as well as with', which is clumsy but defensible, so the sharpest correction repeats 'with' cleanly", "Deleting 'with' from both halves and producing an ungrammatical string"],
  },
  {
    text: 'Correct the verb form after "no sooner": "No sooner had the batch been released than the customer _______, arriving before the dispatch note had printed."',
    answer: "complained",
    distractors: ["complains", "has complained", "would complain"],
    explanation:
      "'No sooner ... than' pairs the past perfect with the simple past to express two closely linked past events.",
    shortcut: "No sooner had + V3 than + past simple.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'complains' because 'no sooner' can suggest immediacy", "Using a future conditional 'would complain'"],
  },
  {
    text: "Fix the agreement error after 'either of': 'Either of the two connectors _______ prone to fretting under cyclic vibration.'",
    answer: "is",
    distractors: ["are", "were", "have been"],
    explanation:
      "'Either' is singular and takes a singular verb; the plural noun inside the 'of' phrase is irrelevant to agreement.",
    shortcut: "Either of / neither of -> singular verb.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Pluralising the verb because 'connectors' is plural", "Using 'have been' without a preceding auxiliary"],
  },
  {
    text: 'Correct the misuse of "due to" as a sentence adverb: "Due to the dust extraction unit failing, the entire batch was quarantined."',
    answer: "Because the dust extraction unit failed",
    distractors: [
      "Due to the dust extraction unit having failed",
      "Due to the failure of the dust extraction unit",
      "Due as the dust extraction unit failed",
    ],
    explanation:
      "'Due to' cannot begin a sentence because the adverbial phrase would leave the main clause without a subject. Rewriting with 'because' supplies the subject and states the cause unambiguously.",
    shortcut: "Never start a sentence with 'due to' or 'owing to'.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: [
      "Using 'due to the failure of', which is acceptable but still front-loads the phrase",
      "Replacing the preposition with 'due as', which is not a construction in English",
    ],
  },
  {
    text: "Fix the error in this sentence: 'The design review identified three opportunities for improvement, and one of them concerned the tolerance stack-up in the housing joint.'",
    answer:
      "The design review identified three opportunities for improvement, one of which concerned the tolerance stack-up in the housing joint.",
    distractors: [
      "The design review identified three opportunities for improvement, and one of them concerned about the tolerance stack-up in the housing joint.",
      "The design review identified three opportunities for improvement, and one of it concerned the tolerance stack-up in the housing joint.",
      "The design review identified three opportunities for improvement, and the one of them concerned the tolerance stack-up in the housing joint.",
    ],
    explanation:
      "The original sentence is grammatically acceptable; the sharper version uses a non-restrictive relative 'one of which' and avoids the unnecessary coordinating conjunction, which is the preferred formal construction.",
    shortcut: "'One of which' turns a loose coordination into a precise non-restrictive clause.",
    difficulty: "hard",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Adding 'about' after 'concerned', which duplicates the preposition", "Using 'one of it', which breaks number agreement"],
  },
  {
    text: 'Correct the error in this sentence: "There were found to be several discrepancies between the drawing and the as-built model."',
    answer: "Several discrepancies were found between the drawing and the as-built model.",
    distractors: [
      "There were several discrepancies found between the drawing and the as-built model.",
      "There were finding to be several discrepancies between the drawing and the as-built model.",
      "There were found several discrepancies between the drawing and the as-built model.",
    ],
    explanation:
      "The existential 'there' cannot be followed by a past participle. With a plural subject, the 'there is/are' pattern requires either the bare plural noun or the 'there were found to be' construction with the participle after 'were'.",
    shortcut: "'There were + found' is invalid; use 'X were found' instead.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'there were several discrepancies found', which is defensible but leaves the existential construction clumsy", "Writing 'finding' which breaks the participle form"],
  },
  {
    text: 'Correct the error in this sentence: "The revised tolerance reduced the clearance by 0.05 mm, and this consequently reduced the seal compression."',
    answer: "The revised tolerance reduced the clearance by 0.05 mm; consequently, this reduced the seal compression.",
    distractors: [
      "The revised tolerance reduced the clearance by 0.05 mm, consequently this reduced the seal compression.",
      "The revised tolerance reducing the clearance by 0.05 mm consequently reduced the seal compression.",
      "The revised tolerance reduced the clearance, by 0.05 mm consequently this reduced the seal compression.",
    ],
    explanation:
      "A conjunctive adverb such as 'consequently' needs a semicolon before it when it joins two independent clauses; a bare comma is insufficient.",
    shortcut: "Semicolon before however, therefore, consequently, meanwhile, otherwise.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Leaving the comma in place, which produces a comma splice", "Turning the first clause into a gerund subject and losing the coordination"],
  },
  {
    text: "Fix the redundancy in this question: 'Can you kindly explain to me the reason why the measurement was repeated three separate times?'",
    answer: "Can you explain why the measurement was repeated three times?",
    distractors: [
      "Can you kindly explain why the measurement was repeated three separate times?",
      "Can you explain to me why the measurement was repeated three times?",
      "Can you please explain the reason why the measurement was repeated three times?",
    ],
    explanation:
      "Three separate redundancies are removed: 'kindly' and 'please' are pleonastic with 'can you', 'explain to me' needs no indirect object, and 'the reason why' restates 'why'.",
    shortcut: "Ask one question per sentence and cut every filler word.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Removing only one of the three redundancies", "Keeping 'the reason why', which doubles the interrogative"],
  },
  {
    text: 'Fix the error in the use of "each": "The maintenance crew performs each of the four preventive tasks on a monthly schedule, and each take roughly two hours."',
    answer: "and each takes roughly two hours",
    distractors: [
      "and each taken roughly two hours",
      "and each are taking roughly two hours",
      "and each of them take roughly two hours",
    ],
    explanation:
      "As the subject, 'each' takes a singular verb in the simple present: 'takes'.",
    shortcut: "Each as a subject -> singular simple present verb.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'each of them take' which wrongly pluralises the verb", "Using the past participle 'taken' without an auxiliary"],
  },
  {
    text: "Correct the error in this sentence: 'The plant manager confirmed that the two new sensors had been installed, calibrated and tested on the line by Tuesday morning.'",
    answer: "on Tuesday morning",
    distractors: [
      "by Tuesday morning",
      "until Tuesday morning",
      "at Tuesday morning",
    ],
    explanation:
      "A definite point in time such as 'Tuesday morning' takes 'on'. 'By' marks a deadline, which is a different relationship.",
    shortcut: "On + day. By + deadline.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'by' which changes completion into a deadline", "Using 'at', which is reserved for clock times and points"],
  },
  {
    text: "Fix the misuse of 'amount': 'The amount of calibration gas remaining in the cylinder was sufficient for two further tests.'",
    answer: "was",
    distractors: ["were", "have been", "are"],
    explanation:
      "'Gas' is an uncountable noun, so 'amount' is correct and takes a singular verb. Using 'number' here would be the error.",
    shortcut: "Amount + uncountable. Number + countable plural.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Pluralising the verb because the phrase implies several tests", "Changing 'amount' to 'number', which is the actual error in the original"],
  },
  {
    text: "Fix the wrong word in this sentence: 'The two valves are connected in series, and the pressure drop across the assembly is more inferior than the design allowance.'",
    answer: "inferior",
    distractors: ["inferiour", "more inferior", "superior"],
    explanation:
      "The correct spelling is 'inferior', and comparatives of absolute adjectives such as 'inferior' are not doubled with 'more'.",
    shortcut: "Absolute adjectives (perfect, unique, inferior) do not take 'more'.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Keeping 'more' before an absolute adjective", "Misspelling the word as 'inferiour'"],
  },
  {
    text: "Correct the misplaced qualifier in this sentence: 'The laboratory received only one sample in the afternoon, which was properly sealed and labelled.'",
    answer: "which was properly sealed and labelled.",
    distractors: [
      "which only was properly sealed and labelled.",
      "only which was properly sealed and labelled.",
      "which was only properly sealed and labelled.",
    ],
    explanation:
      "'Only one' is already fixed by the position of 'only' before 'one'. Adding 'only' inside the relative clause would introduce a second, contradictory limitation.",
    shortcut: "Two 'only' clauses in one sentence almost always contradict each other.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Inserting 'only' before the verb to imply other samples were not sealed", "Moving 'only' to modify the relative pronoun, which makes no sense"],
  },
  {
    text: "Fix the tense error in this sentence: 'The auditor asked whether the vendor has completed the corrective action plan before the deadline.'",
    answer: "had completed",
    distractors: ["has completed", "will complete", "completes"],
    explanation:
      "A reported question whose main clause is in the past tense takes backshift in the subordinate clause: 'had completed'. Tense should not shift further when the event is still future relative to the reporting time.",
    shortcut: "Reported questions backshift past tense but keep a still-future event in the future.",
    difficulty: "hard",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'completes' which is too early a tense", "Using 'will complete' which implies a second future beyond the original deadline"],
  },
  {
    text: 'Fix the article and preposition: "The engineer assigned the task of recalibrating the reference transducer _______ the junior technician."',
    answer: "to",
    distractors: ["for", "with", "on"],
    explanation:
      "Assigning a task takes the preposition 'to' for the recipient. 'For' marks a beneficiary rather than an assignee.",
    shortcut: "Assign something to someone. Prepare something for someone.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using 'for', which suggests a purpose rather than an assignment", "Using 'on', which is used for burdens or conditions"],
  },
  {
    text: "Correct the error in this sentence: 'Although the initial simulation finished late, but the revised model produced a stable solution within the allotted budget.'",
    answer: "Although the initial simulation finished late, the revised model produced a stable solution within the allotted budget.",
    distractors: [
      "Although the initial simulation finished late, and the revised model produced a stable solution within the allotted budget.",
      "Although the initial simulation finished late; the revised model produced a stable solution within the allotted budget.",
      "Although the initial simulation finished late the revised model, produced a stable solution within the allotted budget.",
    ],
    explanation:
      "'Although' already carries the concessive contrast, so 'but' is redundant and the two items form a double connective. A comma is enough.",
    shortcut: "Although and but never appear in the same clause pair.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Keeping 'but' alongside 'although'", "Adding a semicolon, which over-punctuates a single subordinate clause pair"],
  },
  {
    text: 'Fix the misuse of "regarding": "The audit plan describes the sampling strategy, and the standard regarding _______ of nonconforming parts was updated last year."',
    answer: "handling",
    distractors: ["handle", "handled", "handles"],
    explanation:
      "A preposition such as 'regarding' is followed by a gerund or a noun phrase, so the blank requires the gerund 'handling'.",
    shortcut: "A preposition before a verb form takes the gerund.",
    difficulty: "easy",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Using the bare infinitive 'handle'", "Using the third-person 'handles' after a preposition"],
  },
  {
    text: "Fix the verb form after 'neither': 'The sample neither met the dimensional requirements nor passed the surface finish check.'",
    answer: "neither met nor passed",
    distractors: ["neither met nor was passed", "did neither meet nor pass", "neither met and passed"],
    explanation:
      "With 'neither ... nor' and simple past verbs, the negative element is carried by 'neither' and both verbs appear in the simple past without auxiliary 'do' support.",
    shortcut: "Neither + past verb + nor + past verb, no 'do' support.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Adding a passive 'was passed', which changes agency", "Using 'and' in place of 'nor'"],
  },
  {
    text: 'Correct the error in this sentence: "The maintenance window will be rescheduled once the spare bearing arrives, and we will notify the production supervisor accordingly."',
    answer: "we will notify",
    distractors: ["will notify", "notify", "notifying"],
    explanation:
      "In a compound predicate sharing one subject, the first clause's subject 'the maintenance window' cannot govern 'notify'; the second clause needs its own subject 'we', or the original must be restructured.",
    shortcut: "Two clauses, two subjects - or restructure as a single subject with a compound predicate.",
    difficulty: "medium",
    topic: "Sentence Correction & Grammar",
    commonMistakes: ["Deleting the second subject, which makes the window the notifier", "Omitting 'we' entirely, leaving a subjectless imperative in the middle of a sentence"],
  },
];

export const SENTENCE_CORRECTION_TESTS = {
  test2: buildAptitudeQuestions(TEST_2, { category: "verbal", idPrefix: "apt-sentcorr-t2", expectCount: 30 }),
  test3: buildAptitudeQuestions(TEST_3, { category: "verbal", idPrefix: "apt-sentcorr-t3", expectCount: 30 }),
};

export const SENTENCE_CORRECTION_SPEC_COUNTS = { test2: TEST_2.length, test3: TEST_3.length };
