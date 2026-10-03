/**
 * Genetic Engineering - Test 1 (empty, questionCount 0).
 *
 * `technology` matches the store's `targetName`.
 *
 * Covers molecular cloning, gene editing, vector design, expression and
 * purification of recombinant proteins, delivery, screening and biosafety.
 */
import { buildTechnicalQuestions, type TechnicalSeedSpec } from "./shared";

const SPECS: TechnicalSeedSpec[] = [
  {
    question:
      "A Golden Gate cloning workflow uses BsaI. What property of the Type IIS enzyme makes the workflow possible?",
    options: [
      "It cuts outside its recognition sequence and generates defined four-nucleotide overhangs, so many fragments can be assembled in a single ordered reaction",
      "It cuts only within the sequence of its recognition site",
      "It requires separate ligation reactions for each fragment",
      "It removes the need for any flanking fusion sites",
    ],
    correctIdx: 0,
    explanation:
      "Type IIS enzymes recognise one sequence but cleave a fixed distance away, exposing predictable overhangs. Because the recognition sites are removed from the final construct, the same enzyme can process every fragment and the correct overhangs drive the fragments into the intended order, then the sites are destroyed in the product and the reaction is effectively irreversible. Restriction enzymes that cut within their site leave recognition sequences in the product and require removal or re-engineering.",
    hint: "Ask where the cut falls relative to the recognition sequence.",
    relatedConcept: "Type IIS restriction enzymes, Golden Gate assembly and modular cloning",
    difficulty: "Medium",
    interviewTip:
      "Contrast with restriction-ligation cloning, where compatible ends can ligate in any order and internal sites cannot be removed.",
  },
  {
    question:
      "A plasmid that replicates at high copy number in E. coli is transferred into human cells, but the DNA is lost within days. What is the most likely cause?",
    options: [
      "The bacterial origin of replication is not recognised by mammalian cells, so the vector cannot replicate episomally",
      "The plasmid is too large to enter the cell",
      "The bacterial antibiotic resistance marker is toxic",
      "Human cells repair the plasmid and remove it",
    ],
    correctIdx: 0,
    explanation:
      "Replication origins are host-specific: a ColE1 or pMB1 origin drives multicopy replication in E. coli but is inactive in mammalian cells, so the construct is diluted as cells divide and is lost unless it integrates or carries a mammalian origin such as SV40 or EBV. Transient delivery methods rely on this loss in reverse, producing short-lived expression.",
    hint: "Ask which host machinery recognises the origin of replication.",
    relatedConcept: "Origins of replication, episomal versus integrated vectors and transient expression",
    difficulty: "Medium",
    interviewTip:
      "Mention that CMV or SV40 promoters drive transcription but do not confer replication competence.",
  },
  {
    question:
      "Gibson assembly is used to join four DNA fragments without restriction enzymes. What is the mechanistic basis of the method?",
    options: [
      "A 5' exonuclease generates single-stranded overhangs that anneal to homologous overlaps, and a polymerase plus ligase completes the join",
      "Restriction enzymes create the compatible ends before ligation",
      "The fragments are joined by base stacking without any overlap",
      "A ligase directly covalently links blunt fragment ends in sequence",
    ],
    correctIdx: 0,
    explanation:
      "Gibson assembly is enzymatic recombination driven by homology: T5 exonuclease chews back 5' ends to expose complementary single-stranded regions, the overlaps anneal, Phusion polymerase fills the gaps and Taq ligase seals the nicks, with the whole reaction at 50 degrees Celsius. The overlaps are typically 15 to 40 bases, which is much longer than a restriction overhang but needs no recognition sites, so the final construct is scarless and any internal site is irrelevant.",
    hint: "Ask what the exonuclease exposes and what the polymerase then does.",
    relatedConcept: "Gibson assembly, homology-directed assembly and scarless cloning",
    difficulty: "Medium",
    interviewTip:
      "Compare with CPEC and In-Fusion, which use polymerase-plus-exonuclease or exonuclease-plus-polymerase rather than a dedicated exonuclease.",
  },
  {
    question:
      "Which change most improves a pair of PCR primers that produce a ladder of small nonspecific products?",
    options: [
      "Redesigning the primers to raise Tm and reduce 3' complementarity so annealing occurs at a higher, more specific temperature",
      "Increasing the annealing temperature well below the primer Tm",
      "Adding more cycles to the reaction",
      "Using the same primers but switching to a larger polymerase",
    ],
    correctIdx: 0,
    explanation:
      "The ladder pattern is typical of mispriming: low annealing temperature and 3' self-complementarity let primers anneal at multiple imperfect sites and, with extension, generate short products that then amplify. Raising the annealing temperature toward Tm, extending the primers to raise Tm, and avoiding complementary 3' ends increases specificity. Extra cycles amplify the artefact rather than remove it, and polymerase choice rarely changes primer specificity.",
    hint: "Read the gel as a mispriming problem, not an enzyme problem.",
    relatedConcept: "PCR primer design, specificity and mispriming",
    difficulty: "Medium",
    interviewTip:
      "Mention GC clamps at the 3' end, and that hot-start polymerase reduces non-specific amplification at first cycle.",
  },
  {
    question:
      "In qPCR, a candidate reference gene shows variable expression across the conditions being compared. What is the consequence?",
    options: [
      "The normalisation is invalid, because apparent target-gene change may simply reflect reference-gene change",
      "The target gene expression is unaffected",
      "The Ct values of the target become more accurate",
      "Only the melting curve is affected",
    ],
    correctIdx: 0,
    explanation:
      "The 2^-ΔΔCt method assumes the reference gene is stably expressed, so a varying reference is folded into the target's apparent change and can create or cancel a difference entirely. Reference candidates must be validated for stability across exactly the conditions and sample types used, ideally with several candidates and geNorm or NormFinder ranking, rather than assumed because they are convenient.",
    hint: "Ask whether the denominator of the ratio is constant across groups.",
    relatedConcept: "qPCR normalisation, reference gene stability and the 2^-ΔΔCt method",
    difficulty: "Medium",
    interviewTip:
      "Add that efficiency matching between target and reference is the other prerequisite, since equal slopes are assumed.",
  },
  {
    question:
      "A gene has many isoforms with small changes that must be distinguished precisely. Which sequencing approach is the appropriate choice?",
    options: [
      "Sanger sequencing of cloned amplicons or of the cDNA, because it reads both strands with high base-calling accuracy across the whole amplicon",
      "Short-read NGS with 75 base paired-end reads and no long-read support",
      "Whole-genome sequencing of genomic DNA only",
      "A restriction digest to infer transcript identity",
    ],
    correctIdx: 0,
    explanation:
      "Sanger gives near-complete base resolution over roughly 500 to 900 bases with bidirectional confirmation, which is the reference standard for verifying isoforms, point variants and cloning constructs. Short-read NGS is far better for low-abundance variants and large panels but its reads rarely span a complex isoform, so junction confirmation needs long reads or cloning. A restriction digest cannot resolve sequence-level isoform structure reliably.",
    hint: "Match read strategy to the question: precise isoform resolution versus variant discovery.",
    relatedConcept: "Sanger versus NGS, transcript isoform analysis and variant confirmation",
    difficulty: "Medium",
    interviewTip:
      "Mention that capillary trace quality and the requirement to sequence both strands are what make Sanger confirmatory.",
  },
  {
    question:
      "A heterologous gene expressed in E. coli is functionally inactive and forms insoluble inclusion bodies. Which change is most likely to help?",
    options: [
      "Lowering the induction temperature and using a lower inducer concentration to slow synthesis and allow folding",
      "Increasing the inducer concentration to drive faster synthesis",
      "Removing the stop codon",
      "Switching to a stronger promoter",
    ],
    correctIdx: 0,
    explanation:
      "Inclusion bodies form when synthesis outpaces folding, so reducing expression flux - lower temperature, weaker promoter or partial induction, sometimes co-expression of chaperones - keeps the concentration of partially folded intermediates low and lets folding proceed. Faster synthesis worsens aggregation. Truncating the stop codon, if anything, tends to increase aggregation and can produce aberrant C-terminal fusions.",
    hint: "Treat aggregation as a kinetic problem: folding must outrun synthesis.",
    relatedConcept: "Protein solubility, inclusion bodies and expression-folding kinetics",
    difficulty: "Medium",
    interviewTip:
      "Follow with the alternative strategies: fusion tags, co-expression with chaperones, or switching to a eukaryotic host.",
  },
  {
    question:
      "A recombinant protein is needed with complex human glycosylation. Why is E. coli an unsuitable host for this product?",
    options: [
      "E. coli lacks the endoplasmic reticulum and Golgi glycosylation machinery and instead produces non-human, often non-functional glycans",
      "E. coli cannot perform any post-translational modification",
      "E. coli glycosylates proteins but attaches only glucose",
      "E. coli cannot grow under controlled fermentation conditions",
    ],
    correctIdx: 0,
    explanation:
      "E. coli has no ER or Golgi, so N-linked glycosylation occurs only rarely and non-enzymatically, and the product lacks the complex branched glycans of therapeutic proteins that affect folding, clearance and immunogenicity. Phosphorylation is similarly absent. Yeast performs glycosylation but tends to hyper-mannosylate, so insect or mammalian hosts such as CHO and HEK293 are used when a mammalian glycoform is required.",
    hint: "Ask which host supplies the secretory organelles needed for complex glycans.",
    relatedConcept: "Host selection, glycosylation machinery and CHO versus HEK293 expression",
    difficulty: "Easy",
    interviewTip:
      "Distinguish non-glycosylated, high-mannose and complex human-like glycosylation as three distinct product classes.",
  },
  {
    question:
      "Why does the choice of expression host matter for the immunogenicity of a therapeutic protein?",
    options: [
      "Host-specific processing produces different glycoforms and other modifications that create novel epitopes or alter clearance and immunogenicity",
      "The host determines only the amino acid sequence of the protein",
      "Host choice has no effect on immunogenicity if the cDNA is identical",
      "Only the promoter used affects immunogenicity",
    ],
    correctIdx: 0,
    explanation:
      "The same cDNA can yield materially different protein products depending on the host: different N-glycosylation site occupancy and glycan structures, incomplete post-translational modification, different secretion efficiency, aggregation and truncation. These differences affect the conformational and glycan-dependent epitopes seen by the immune system and the exposure profile, so comparability and clinical bridging studies are required when the host or its culture conditions change.",
    hint: "Ask what happens to the product after translation in different hosts.",
    relatedConcept: "Post-translational modification, product comparability and immunogenicity",
    difficulty: "Hard",
    interviewTip:
      "Mention that a change of master cell bank, vector or even a single medium component can require comparability work.",
  },
  {
    question:
      "Which change to a His-tag purification protocol typically improves elution of a strongly bound target from an IMAC column?",
    options: [
      "Increasing the imidazole concentration in the elution buffer to compete the protein off the metal resin",
      "Reducing the imidazole concentration in the wash",
      "Increasing the resin's chelating agent during elution",
      "Lowering the pH to a more acidic value during loading",
    ],
    correctIdx: 0,
    explanation:
      "Immobilised metal affinity chromatography works because histidines coordinate the metal on the resin, so raising imidazole - which also coordinates the metal - competes the protein off eluting it while a milder alternative is pH change or chelator. In contrast, more imidazole in the wash reduces nonspecific binding, and chelators belong in the stripping and regeneration steps, not in elution.",
    hint: "Ask what competes for the metal sites.",
    relatedConcept: "IMAC, imidazole competition and His-tag purification",
    difficulty: "Easy",
    interviewTip:
      "Mention the reverse IMAC case: an acidic pH elution for proteins that tolerate it, and the need to remove imidazole before downstream steps.",
  },
  {
    question:
      "After affinity chromatography a protein still shows aggregation on analytical SEC. What is the most appropriate next step?",
    options: [
      "A polishing step such as size-exclusion chromatography to resolve aggregates from monomer by hydrodynamic size",
      "Repeating the affinity step to improve purity further",
      "Increasing the affinity tag length",
      "Adding more reducing agent to the SEC buffer",
    ],
    correctIdx: 0,
    explanation:
      "Size-exclusion chromatography separates by hydrodynamic radius, so it is the natural polishing step for separating monomer from dimer and higher aggregates, and it also gives a physical size estimate. Repeating affinity alone will not separate species of the same size because it discriminates on the affinity tag. Aggregation is better prevented than merely resolved, since it typically indicates unfolded or misassembled protein upstream.",
    hint: "Ask which property SEC uses that affinity chromatography cannot discriminate.",
    relatedConcept: "Size-exclusion chromatography, aggregation and downstream polishing",
    difficulty: "Medium",
    interviewTip:
      "Add that SEC is low capacity and expensive, so it is a polishing step rather than a capture step.",
  },
  {
    question:
      "A researcher wants to deliver a self-complementary AAV vector. What constraint must the cassette respect?",
    options: [
      "The packaged genome is limited to roughly 4.7 kilobases between the ITRs, so self-complementary designs are restricted to about half that payload",
      "Self-complementary vectors have no size limit",
      "The cassette must exceed 10 kilobases to package efficiently",
      "There is no ITR involvement in self-complementary vectors",
    ],
    correctIdx: 0,
    explanation:
      "AAV packages a single-stranded genome between the two inverted terminal repeats, and total packaged length above roughly 4.7 kilobates progressively reduces packaging efficiency. A self-complementary vector folds the genome into a double-stranded form by omitting the central part of one ITR, which halves the available payload to around 2.3 kilobases but gives faster and higher expression. Either way, gene therapy cassettes must be reduced or split across two vectors.",
    hint: "Ask how much space the ITRs occupy and what self-complementarity costs.",
    relatedConcept: "AAV vector design, packaging capacity and self-complementary AAV",
    difficulty: "Hard",
    interviewTip:
      "Mention that oversizing silently reduces vector genome integrity and titre, so QC by ddPCR or qPCR matters.",
  },
  {
    question:
      "What is the principal trade-off of using a lentiviral rather than an AAV vector for gene therapy?",
    options: [
      "Lentiviral vectors integrate into the host genome, giving durable expression in dividing cells, but carry a higher insertional mutagenesis risk than episomal AAV",
      "Lentiviral vectors are strictly episomal and cannot integrate",
      "AAV integrates efficiently while lentivirus remains episomal",
      "Both vectors carry identical insertional risk profiles",
    ],
    correctIdx: 0,
    explanation:
      "Lentivirus reverse-transcribes its RNA genome and integrates into the genome, so transgenes persist through cell division and it can carry larger cassettes, but integration near proto-oncogenes raises the risk of transformation, which drove the development of self-inactivating designs that delete the viral LTR after integration. AAV mainly persists as a circular episome and has a lower integration and immunogenicity burden, but expression wanes in dividing tissues.",
    hint: "Ask about persistence through cell division versus genome alteration.",
    relatedConcept: "Lentiviral and AAV vectors, insertional mutagenesis and self-inactivating designs",
    difficulty: "Hard",
    interviewTip:
      "Mention that ex vivo T-cell transduction, which is where lentivirus is most used, is followed by selection or clonal sorting to reduce polyclonal outgrowth risk.",
  },
  {
    question:
      "A self-inactivating lentiviral vector has been designed to reduce genotoxicity. Which feature implements this?",
    options: [
      "A deletion in the 3' LTR U3 region, which is copied onto the 5' LTR in the provirus, leaving an inactive proviral LTR that cannot drive transcription from an internal promoter",
      "Removal of the gag-pol gene",
      "Use of a self-complementary genome",
      "Mutation of the integrase catalytic site",
    ],
    correctIdx: 0,
    explanation:
      "During reverse transcription the 3' LTR is copied to the 5' end, so deleting the U3 region of the 3' LTR produces a provirus whose 5' LTR carries the deletion; the Tat response element is gone, so the integrated provirus is transcriptionally silent from the viral LTR and cannot provide the promoter that drives insertional activation. The virus must still be packaged with an intact LTR, so the deletion exists only in the infected cell.",
    hint: "Consider which LTR remains active after integration.",
    relatedConcept: "Self-inactivating lentiviral vectors, U3 deletion and LTR-driven expression",
    difficulty: "Hard",
    interviewTip:
      "Explain why the effect requires reverse transcription, which is also why lentiviral vectors are classified as integrating vectors.",
  },
  {
    question:
      "What is the main function of the ionizable lipid in a lipid nanoparticle mRNA vaccine?",
    options: [
      "It binds and stabilises the RNA at acidic pH and promotes endosomal escape, while remaining largely neutral at physiological pH to limit toxicity",
      "It provides the enzymatic translation of the mRNA",
      "It acts as the antigen by producing the viral surface protein",
      "It permanently integrates the RNA into the genome",
    ],
    correctIdx: 0,
    explanation:
      "Ionizable lipids are designed to be charge-neutral near neutral pH so they are tolerated, but they become protonated in the acidic endosome, interact with anionic membrane lipids and destabilise the membrane to allow release of the mRNA into the cytosol. The encapsulation and endosomal escape steps are the main failure points that determine delivery efficiency and reactogenicity.",
    hint: "Ask how a lipid can be both well tolerated and still release its cargo.",
    relatedConcept: "Lipid nanoparticles, ionizable lipids and endosomal escape",
    difficulty: "Hard",
    interviewTip:
      "Mention the PEG-lipid, cholesterol and helper-lipid roles in particle structure and how RNA identity and purity determine reactogenicity.",
  },
  {
    question:
      "Which method is generally preferred for transfecting primary human T cells for adoptive therapy?",
    options: [
      "Electroporation, because it achieves high efficiency in cells that resist lipid-mediated transfection",
      "Oral delivery of plasmid DNA",
      "Silk fibroin nanoparticle injection",
      "Passive diffusion through the cell membrane",
    ],
    correctIdx: 0,
    explanation:
      "Primary T cells are difficult to transfect with lipid reagents and are routinely transduced by electroporation or viral vectors, with electroporation offering rapid, high-efficiency delivery of plasmid, mRNA or ribonucleoprotein and no viral intermediate. Macrophages, by contrast, transfect well with lipid reagents, and passive membrane diffusion of plasmid is negligible.",
    hint: "Ask which cells lipid-mediated transfection fails to serve.",
    relatedConcept: "Transfection and transduction methods, electroporation and primary cell engineering",
    difficulty: "Medium",
    interviewTip:
      "Mention that delivering Cas9 ribonucleoprotein rather than plasmid DNA shortens nuclease exposure and lowers off-target editing.",
  },
  {
    question:
      "Why must a target site for Streptococcus pyogenes Cas9 lie close to a PAM?",
    options: [
      "The PAM is the sequence the nuclease must first recognise and unwind before the guide RNA can base-pair with the adjacent protospacer",
      "The PAM is the sequence that the guide RNA is designed to complement",
      "The PAM determines the cut site only after DNA repair has begun",
      "The PAM is required for binding of the host repair machinery",
    ],
    correctIdx: 0,
    explanation:
      "Cas9 first samples duplex DNA with a PAM-recognition domain; only after the PAM is found does the guide RNA interrogate the adjacent 20-nucleotide protospacer, and PAM-interacting residues then disrupt the adjacent duplex so the guide can pair. This sequence-first search is why the editing window is limited to sites containing the PAM, which is why PAM-relaxed engineered variants were developed. The guide RNA complements the protospacer, not the PAM.",
    hint: "Ask which sequence the protein binds before it can read the guide.",
    relatedConcept: "Cas9 mechanism, PAM recognition and target site availability",
    difficulty: "Hard",
    interviewTip:
      "Name the sequences - SpCas9 recognises NGG on both strands, so the effective target space is a 23-nucleotide N20-NGG.",
  },
  {
    question:
      "An engineered nuclease guided by a crRNA-tracrRNA fusion is used in place of Cas9 because its PAM is TTTV rather than NGG. What does this enable?",
    options: [
      "Editing of target sites in AT-rich sequences that lack any NGG PAM but contain TTTV, expanding the reachable genome",
      "Removal of the need for a guide RNA",
      "Editing without any sequence-specificity requirement",
      "Direct repair of the target without nuclease activity",
    ],
    correctIdx: 0,
    explanation:
      "Cas12a and related nucleases recognise TTTV PAMs and cut the distal non-target strand, which occur in AT-rich contexts where Cas9 finds few sites, so they open previously unreachable genomic regions. All of these systems still require sequence-specific guide pairing, so specificity and off-target analysis remain necessary.",
    hint: "Think about which sequence composition Cas9's NGG requirement excludes.",
    relatedConcept: "PAM engineering, Cas12a and expanding the editable sequence space",
    difficulty: "Medium",
    interviewTip:
      "Mention that Cas12a also has collateral cleavage activity, which is the basis of diagnostic applications.",
  },
  {
    question:
      "How does CRISPR interference using dCas9 differ from CRISPR knockout by nuclease-active Cas9?",
    options: [
      "dCas9 is nuclease-dead and silences transcription by blocking RNA polymerase or recruiting repressors, whereas nuclease-active Cas9 disrupts the gene with DNA breaks",
      "dCas9 cuts DNA less efficiently than Cas9",
      "CRISPRi requires a PAM sequence while knockout does not",
      "There is no meaningful difference between the two",
    ],
    correctIdx: 0,
    explanation:
      "Catalytically inactive Cas9 binds its target through guide-directed recognition but has no cutting activity, so CRISPRi works either by physically obstructing transcription at a promoter-proximal site or by fusing a repressor such as KRAB for chromatin spreading and silencing. Cas9 knockout instead creates double-strand breaks that are repaired by error-prone end joining to disrupt the coding sequence, which is durable but mutagenic. CRISPRi is reversible and titratable; knockout is not.",
    hint: "Ask whether DNA is broken at all in the interference system.",
    relatedConcept: "CRISPRi, dCas9 effectors, KRAB repression and gene knockout",
    difficulty: "Medium",
    interviewTip:
      "Add that guide positioning matters for CRISPRi: targeting within about -50 to +300 bp of the TSS works best.",
  },
  {
    question:
      "What limitation distinguishes base editing from both nuclease knockout and homology-directed repair?",
    options: [
      "It makes only the single substitutions the deaminase can install, within a limited editing window, and bystander edits at neighbouring bases cannot be excluded",
      "It cannot make any substitution",
      "It integrates large donor templates into the locus",
      "It edits only mitochondrial DNA",
    ],
    correctIdx: 0,
    explanation:
      "Cytosine and adenine base editors are fusion proteins in which a deaminase is positioned by a nickase Cas9 to convert C to T or A to G within roughly a four to eight base window on the non-target strand. They cannot insert or delete bases and cannot reach the desired base if it lies outside the window or the PAM, and every C in the window is a substrate, so bystander edits, including coding and splice changes, must be assessed. HDR handles arbitrary changes but is far less efficient.",
    hint: "Think about the number of bases that can be changed and the size of the editing window.",
    relatedConcept: "Cytosine and adenine base editors, editing windows and bystander edits",
    difficulty: "Hard",
    interviewTip:
      "Mention that a deaminase has no editing-window specificity, so codon-aware silent positions are used to protect essential bases.",
  },
  {
    question:
      "In a knock-in experiment, why is an ssODN donor generally preferred over a double-stranded plasmid donor for precise point edits?",
    options: [
      "An ssODN is short enough that a single-stranded repair template is used efficiently by the cell's single-strand annealing repair machinery, giving higher precise knock-in rates with less random integration",
      "An ssODN cannot carry any homology arms",
      "Plasmid donors cannot be used with CRISPR",
      "ssODN donors are immune to repair-pathway choice",
    ],
    correctIdx: 0,
    explanation:
      "Single-stranded donors with about 40 to 90 nucleotide homology arms are channelled through Fanconi pathway single-strand repair, which is more accurate than the competing double-strand repair routes that a plasmid donor promotes, and plasmid donors can integrate randomly or concatemerise. The trade-off is length: ssODNs are limited to roughly 100 to 200 nucleotides total, so larger insertions need a plasmid, long ssDNA donor or prime editing.",
    hint: "Consider which repair pathway each donor type engages.",
    relatedConcept: "ssODN donors, homology-directed repair and Fanconi pathway",
    difficulty: "Hard",
    interviewTip:
      "Mention that in zygotes homology-directed repair competes with NHEJ and that the donor must be delivered by microinjection or electroporation timing.",
  },
  {
    question:
      "A laboratory validates a new CRISPR guide and finds that editing efficiency is low in the target cell line. Which factor most directly limits whether the site can be targeted at all?",
    options: [
      "Whether a compatible PAM exists in the sequence, because no guide can be cut without PAM recognition",
      "The amount of mRNA used in the transfection",
      "The colour of the selection antibiotic",
      "The length of the homology arms",
    ],
    correctIdx: 0,
    explanation:
      "Guide efficiency is secondary to PAM availability: if the cell line's allele lacks an NGG for SpCas9, no amount of guide or RNP will cut the site, and the only remedies are a different nuclease, a PAM-recoding approach or another guide elsewhere in the gene. Confirming the target sequence in the specific cell line before any editing work is a standard step, since single-nucleotide polymorphisms can remove the PAM.",
    hint: "Check the recognition site in the actual sequence of the cell line before anything else.",
    relatedConcept: "PAM availability, target sequence verification and guide selection",
    difficulty: "Medium",
    interviewTip:
      "Follow with chromatin accessibility as the second-tier determinant of on-target editing efficiency.",
  },
  {
    question:
      "Which off-target detection method identifies genome-wide cleavage sites experimentally without requiring a pre-specified candidate list?",
    options: [
      "GUIDE-seq, which captures the DNA fragments still bound by Cas9 and maps their cleavage junctions",
      "An in silico prediction using the guide sequence alone",
      "Measuring Cas9 mRNA levels in the cell",
      "Staining for the nuclease with an antibody",
    ],
    correctIdx: 0,
    explanation:
      "GUIDE-seq is a cell-based, guide-specific, genome-wide assay: Cas9-bound fragments are converted to libraries and mapped to reveal cleavage sites, so it finds unpredicted off-targets rather than only computational predictions. CIRCLE-seq is in vitro and finds cleavage even at sites inaccessible in cells, while targeted amplicon sequencing only confirms sites already nominated. Computational scores alone systematically miss some off-targets.",
    hint: "Distinguish assays that discover sites from those that confirm nominated sites.",
    relatedConcept: "Off-target detection, GUIDE-seq and CIRCLE-seq",
    difficulty: "Hard",
    interviewTip:
      "Note the current practice of combining GUIDE-seq or equivalent discovery with whole-genome sequencing, since cell type and delivery method change the off-target profile.",
  },
  {
    question:
      "An experiment requires two proteins to be co-expressed from one transcript in equimolar amounts. Which strategy is most appropriate?",
    options: [
      "A 2A ribosomal skipping sequence derived from a picornavirus, which releases both proteins as separate polypeptides",
      "An internal ribosome entry site upstream of the second cistron",
      "A polyglutamate linker",
      "A single fusion protein that must be proteolysed in vitro",
    ],
    correctIdx: 0,
    explanation:
      "2A peptides insert a stop-go sequence in the nascent polypeptide so ribosomes continue translating the downstream cistron, with the 2A peptide remaining attached to the upstream protein; because both come from one mRNA their ratio is near stoichiometric. An IRES allows cap-independent internal initiation with lower and more variable efficiency, and fusion proteins require an added protease step and can constrain folding.",
    hint: "Consider stoichiometry: one mRNA, two products.",
    relatedConcept: "2A peptides, ribosome skipping and polycistronic expression",
    difficulty: "Medium",
    interviewTip:
      "Mention that ribosome skipping is not complete, so a residual uncleaved species is expected and P2A is often preferred when a clean N-terminus matters.",
  },
  {
    question:
      "A knockout is required only in the presence of a Cre driver, leaving surrounding tissues unaffected. Which genetic tool implements this?",
    options: [
      "A conditional floxed allele, in which a critical exon is flanked by loxP sites so recombination occurs only where Cre is expressed",
      "A constitutive CRISPR knockout",
      "An antisense knockdown in all tissues",
      "A promoterless reporter cassette",
    ],
    correctIdx: 0,
    explanation:
      "A floxed allele places two loxP sites around an essential exon; in Cre-expressing cells recombination excises that exon and the locus loses function, while Cre-negative cells remain intact. This is essential for proteins whose null phenotype is embryonic lethal, for temporal control with CreERT2, and for lineage tracing with reporter lox-stop-lox alleles. Constitutive knockouts cannot be restricted this way.",
    hint: "The conditionality must come from the timing or location of one enzyme.",
    relatedConcept: "Cre-loxP, conditional knockouts and CreERT2 induction",
    difficulty: "Easy",
    interviewTip:
      "Add that Cre recombinase activity, not efficiency of recombination, is the usual bottleneck, so reporters such as Rosa26-LSL-tdTomato are used to verify it.",
  },
  {
    question:
      "Which repair pathway produces most CRISPR-induced insertions and deletions, and why does that matter for designing a knockout?",
    options: [
      "Non-homologous end joining, which repairs broken ends without a template and typically creates small indels that disrupt the coding frame",
      "Homology-directed repair, which uses the donor plasmid",
      "Base excision repair",
      "Nucleotide excision repair",
    ],
    correctIdx: 0,
    explanation:
      "Cas9 creates a double-strand break, and in the absence of a homologous template the cell repairs the ends through non-homologous end joining, which commonly adds or removes a few nucleotides and frequently shifts the reading frame or creates a premature stop. This is why knockout design targets an early coding exon and screens by indels. Homology-directed repair requires a donor and is the basis of precise knock-in rather than of most knockouts.",
    hint: "Ask what happens at a broken end when no template is available.",
    relatedConcept: "Non-homologous end joining, indel formation and knockout design",
    difficulty: "Medium",
    interviewTip:
      "Mention that large deletions and chromosomal rearrangements can also occur and are missed by simple amplicon sizing assays.",
  },
  {
    question:
      "An antibody with modest affinity is improved by error-prone PCR followed by phage display selection. What is the principle behind the improvement?",
    options: [
      "Random mutation generates a diverse library, and iterative selection and amplification enrich clones with the desired binding, exploiting natural selection in vitro",
      "Every mutation is beneficial and the whole library improves uniformly",
      "The antibody is improved by increasing the host cell growth rate",
      "The phage display step fixes the sequence before the mutations are introduced",
    ],
    correctIdx: 0,
    explanation:
      "Directed evolution replaces the cell's slow random mutation with a controllable rate - typically about 10 to 3 mutations per gene for error-prone PCR - followed by cycles of selection, infection and amplification of binders. Each round samples library diversity for improved variants and accumulates beneficial mutations additively, and affinity maturation runs in parallel with affinity improvement.",
    hint: "Ask which step introduces variation and which step imposes selection.",
    relatedConcept: "Directed evolution, error-prone PCR and phage display",
    difficulty: "Medium",
    interviewTip:
      "Mention that the selection stringency or the elution conditions are usually tightened each round to increase enrichment.",
  },
  {
    question:
      "A viral vector intended for human administration must be replication-incompetent. Which design feature is essential for achieving this?",
    options: [
      "Deletion of the genes required for replication, so the vector cannot produce new virions after transducing a cell",
      "Use of a larger capsid",
      "Choice of a permissive producer cell line only",
      "Purification by ultracentrifugation",
    ],
    correctIdx: 0,
    explanation:
      "Replication competence requires the viral genes for replication and assembly; deleting or disrupting them means a transduced cell produces the transgene but no progeny virus, which prevents local and systemic spread and limits the dose needed to reach transduction targets. Producer cell lines supply the missing functions during manufacture, and the vector genome must be screened for residual replication-competent contaminants.",
    hint: "Ask what the vector genome still encodes after the relevant deletion.",
    relatedConcept: "Replication-incompetent vectors, biosafety and producer cell lines",
    difficulty: "Medium",
    interviewTip:
      "Mention that replication-competent wild-type contamination in a lentiviral lot remains a release-testing concern even with replication-incompetent designs.",
  },
  {
    question:
      "A protocol specifies a biosafety level for a procedure involving replication-defective viral vectors and recombinant proteins. What does the biosafety level principally govern?",
    options: [
      "The containment, engineering controls and personal protective equipment needed to protect personnel and the environment from the hazard",
      "The regulatory classification of the finished product",
      "The number of validation experiments required",
      "The choice of expression host",
    ],
    correctIdx: 0,
    explanation:
      "Biosafety levels describe the containment and equipment required by the agent hazard and are implemented through engineering controls, administrative controls and personal protective equipment, together with institutional biosafety committee approval and a risk assessment. Product regulation, validation and manufacturing controls are governed by other frameworks, and the required containment follows the hazard assessment rather than a fixed label.",
    hint: "Ask what the containment level is protecting against and how.",
    relatedConcept: "Biosafety levels, containment and risk assessment",
    difficulty: "Easy",
    interviewTip:
      "Expect follow-up on spill response, sharps handling and decontamination, which are the practical elements of a biosafety assessment.",
  },
  {
    question:
      "After ligation into a plasmid, colonies are grown on agar containing X-gal and IPTG. What does a white colony indicate?",
    options: [
      "The insert has disrupted the lacZ alpha-peptide sequence, so no functional beta-galactosidase is produced and X-gal is not cleaved",
      "The colony contains no plasmid DNA at all",
      "The insert is present but inserted in the wrong orientation",
      "The colony grew faster because it metabolised X-gal as a carbon source",
    ],
    correctIdx: 0,
    explanation:
      "Blue-white screening exploits alpha complementation: the host supplies the lacZ omega fragment and the vector carries the lacZ alpha sequence containing the multiple cloning site. An intact lacZ alpha restores beta-galactosidase, which cleaves X-gal to a blue product, so blue colonies are empty vector. Inserting DNA into the multiple cloning site disrupts alpha, leaving white colonies that are candidate recombinants.",
    hint: "Ask which gene the insert interrupts and what the substrate does.",
    relatedConcept: "Blue-white screening, alpha complementation and directional cloning",
    difficulty: "Easy",
    interviewTip:
      "The follow-up almost always asks why sequencing is still required: white means lacZ was disrupted, not that the insert is correct, complete or in the right orientation.",
  },
];

export const GENETIC_ENGINEERING_QUESTIONS = buildTechnicalQuestions(SPECS, {
  idPrefix: "mcq-tech-genetic-engineering-t1",
  technology: "Genetic Engineering",
  expectCount: 30,
});

export const GENETIC_ENGINEERING_SPEC_COUNT = SPECS.length;