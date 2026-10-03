/**
 * Product Management (Mechanical) - Test 1 (empty, questionCount 0).
 *
 * `technology` matches the store's `targetName`.
 *
 * The mechanical product-management domain, not generic product management:
 * requirements and specification language, DFM/DFA, tolerances and GD&T,
 * material selection, reliability and FMEA, root-cause methods, PLM and change
 * control, cost and make-versus-buy, lifecycle and validation.
 */
import { buildTechnicalQuestions, type TechnicalSeedSpec } from "./shared";

const SPECS: TechnicalSeedSpec[] = [
  {
    question:
      "A drawing states a shaft journal as 25.00 +0.03/-0.01 mm. With the shaft at 25.02 mm and the bearing bore at 25.05 mm, what does this indicate?",
    options: [
      "The shaft is oversized for the bore, so there is insufficient clearance and the fit will be tight",
      "The fit is loose and the shaft will slip in the bore",
      "The parts are at their maximum material condition, so the fit is verified",
      "The bearing bore is out of specification",
    ],
    correctIdx: 0,
    explanation:
      "The shaft tolerance band is 24.99 to 25.03 mm, so 25.02 is within specification but toward the top of the band. The bore at 25.05 is larger than the shaft's maximum material, giving a clearance of only 0.02 mm, which is tight for a running fit on a journal. Maximum material condition would require both parts at their maximum sizes, which is not the case here.",
    hint: "Compare the actual sizes against the tolerance bands before judging the fit.",
    relatedConcept: "Tolerance analysis, limits and fits and maximum material condition",
    difficulty: "Medium",
    interviewTip:
      "Always compute the clearance from actual sizes; assuming nominal is the standard interview trap.",
  },
  {
    question:
      "Two drawings both specify a feature at 0.25 mm positional tolerance but one calls out the datum reference frame and the other does not. What is the practical difference?",
    options: [
      "The callout defines the toleranced feature's orientation and location relative to datums, so it is functionally verifiable; without it the requirement is ambiguous",
      "The numeric value is meaningless without the datum callout, so both drawings are unusable",
      "There is no difference, because positional tolerance is always self-referencing",
      "The second drawing implies a larger tolerance zone",
    ],
    correctIdx: 0,
    explanation:
      "A positional tolerance defines a cylindrical or spherical zone whose orientation and location must be established relative to a datum reference frame. Without the datum callout, the zone floats and the part cannot be inspected to a consistent result, so the same numeric value denotes a different and unenforceable requirement. The zone size itself is unchanged.",
    hint: "Ask where the tolerance zone is anchored.",
    relatedConcept: "GD&T, datum reference frames and functional tolerancing",
    difficulty: "Medium",
    interviewTip:
      "Push the discussion to the design intent: the datum frame must reflect the functional assembly direction.",
  },
  {
    question:
      "A die-cast part has been redesigned from 4 mm to 2 mm wall thickness with no rib support. Which defect is most likely to appear first in production?",
    options: [
      "Cold shuts and short shots where the metal underfills the mould cavity",
      "Excessive flash at the parting line",
      "Dimensional drift of the ejector pin positions",
      "Die wear on the cavity flanks",
    ],
    correctIdx: 0,
    explanation:
      "Thin walls lose heat faster and have higher flow resistance, so the melt front decelerates and can freeze before filling the cavity, producing cold shuts and short shots. Ribs would restore flow by channelling metal, which is why thin sections are almost always ribbed. Flash is driven by clamping force and die parting-line clearance, which are unchanged.",
    hint: "Consider the thermal and rheological consequence of removing material.",
    relatedConcept: "Thin-wall die casting, solidification and the role of stiffening ribs",
    difficulty: "Hard",
    interviewTip:
      "The DFM answer is 'add ribs' - but explain the mechanism, because the rib is what makes the design manufacturable.",
  },
  {
    question:
      "A gearbox housing develops a crack at a bolt flange after six months in the field. Fatigue analysis shows fully reversed loading. Which change most directly addresses the failure?",
    options: [
      "Add a generous fillet radius at the flange root to reduce the stress concentration",
      "Increase the flange thickness uniformly",
      "Increase the bolt preload",
      "Change the housing material to one of lower density",
    ],
    correctIdx: 0,
    explanation:
      "Fully reversed loading means the stress swings through zero, which is pure fatigue and is governed almost entirely by local stress concentration. A generous fillet radius raises the notch radius and lowers the theoretical Kt, which typically dominates any change in gross section. Lower density alone does not raise fatigue strength - strength-specific materials or surface treatments do.",
    hint: "Fully reversed loading means fatigue, and fatigue failures start at stress raisers.",
    relatedConcept: "Fatigue failure, stress concentration and fillet radius design",
    difficulty: "Medium",
    interviewTip:
      "Mention shot peening or rolling as the second lever after geometry, since they improve surface finish rather than section size.",
  },
  {
    question:
      "A DFM review identifies that the part requires a 5-axis milling operation on three faces. Which is the strongest argument for redesigning the part to a prismatic form?",
    options: [
      "Prismatic parts can be fixtured once in a 3-axis setup, cutting cycle time and eliminating setup error accumulation",
      "Prismatic parts always weigh less",
      "Prismatic parts require no tolerances",
      "Prismatic parts eliminate the need for CAM programming",
    ],
    correctIdx: 0,
    explanation:
      "The dominant cost in multi-setup machining is not the cutting time but the repeated setup, probing and fixturing, each of which adds cycle time and a chance of positional error that must be absorbed by looser tolerances. Consolidating onto a prismatic blank that can be fixtured once in 3-axis removes that overhead. Part weight and tolerances are design choices, not consequences of prismatic form.",
    hint: "Identify which cost dominates when a part must be re-fixtured several times.",
    relatedConcept: "DFM, setup reduction and prismatic versus freeform part design",
    difficulty: "Medium",
    interviewTip:
      "Quantify setups and minutes per setup; that is the language a manufacturing engineer uses.",
  },
  {
    question:
      "Two suppliers quote the same part: one at 15% premium with a certified IATF 16949 process, the other 15% cheaper with no automotive certification. What is the correct decision framework?",
    options: [
      "Compare total cost of ownership including scrap, warranty, launch risk and line-down cost against the purchase-price difference",
      "Take the lower price, because the part is dimensionally identical",
      "Take the premium supplier, because certification guarantees zero defects",
      "Split the volume 50/50 and choose again next year",
    ],
    correctIdx: 0,
    explanation:
      "Unit price is only one term in total cost of ownership. Non-recurring costs such as PPAP, tooling amortisation, launch containment and line-down exposure can dominate a 15% price gap, while certification reduces the probability and cost of escapes. Certification is evidence of process capability, not a guarantee of zero defects.",
    hint: "Build the comparison as total cost of ownership, not as a unit-price auction.",
    relatedConcept: "Total cost of ownership, supplier risk and automotive PPAP qualification",
    difficulty: "Medium",
    interviewTip:
      "Convert the price gap into a break-even defect rate - that framing resolves the discussion quickly.",
  },
  {
    question:
      "A series of production failures all trace to the same tolerance being met on the CMM but not on the shop floor. What is the most likely root cause category?",
    options: [
      "Measurement system variation: the CMM and the production gauge are not correlated",
      "Operator training deficit",
      "Supplier price increase",
      "Insufficient lubrication in the machine tool",
    ],
    correctIdx: 0,
    explanation:
      "If a CMM passes the part but production does not, the discrepancy is a metrology problem before it is a manufacturing problem. Until the measurement systems are correlated, no capability number is trustworthy, and capability analysis on a biased gauge is meaningless. This is why gauge R&R precedes Cpk in any phase I.",
    hint: "Distinguish the thing being measured from the thing measuring it.",
    relatedConcept: "Measurement system analysis, gauge R&R and correlation studies",
    difficulty: "Hard",
    interviewTip:
      "Sequence matters: MSA before capability. Saying so unprompted is a strong differentiator.",
  },
  {
    question:
      "A chassis component fails in the field only at low temperature. The failure mode is a brittle-looking fracture with no visible deformation. Which hypothesis should be tested first?",
    options: [
      "Transition-temperature behaviour of the material, where the toughness drops sharply below a critical temperature",
      "Overheating during welding of the component",
      "Corrosion fatigue from road salt",
      "Fatigue from cyclic road vibration",
    ],
    correctIdx: 0,
    explanation:
      "Low temperature plus negligible plastic deformation before fracture is the classic signature of reduced ductility or toughness, where the transition temperature moves into the operating range. Failure must be evaluated against the minimum design temperature, not the nominal. Overheating would leave thermal evidence, and corrosion or vibration fatigue would show surface initiation and beach marks.",
    hint: "Look at what the absence of plastic deformation tells you about the toughness.",
    relatedConcept: "Impact transition temperature, toughness requirements and low-temperature design",
    difficulty: "Hard",
    interviewTip:
      "Name the specific test - Charpy or tear-drop - that would confirm or eliminate the hypothesis.",
  },
  {
    question:
      "An engineer proposes switching a bracket from 3 mm mild steel to 2 mm aluminium to reduce mass. Why is this often counter-productive?",
    options: [
      "Stiffness scales with thickness cubed in bending, so halving the gauge loses far more stiffness than the mass saving, requiring a wider or ribbed redesign",
      "Aluminium cannot be fastened to a steel vehicle body",
      "Aluminium has a higher density than steel",
      "Steel cannot be formed into a bracket shape",
    ],
    correctIdx: 0,
    explanation:
      "Second moment of area for a rectangular section scales with thickness cubed, so going from 3 mm to 2 mm keeps 2/3 of the mass but only 8/27, about 30%, of the bending stiffness. With E also lower for aluminium, stiffness per unit mass is worse still, and the engineer must increase width or add ribs, which erodes the mass benefit and adds joints.",
    hint: "Compare the mass and stiffness scaling exponents for the same section.",
    relatedConcept: "Stiffness-to-mass trade-off, second moment of area and lightweighting",
    difficulty: "Hard",
    interviewTip:
      "Write the cubic relationship on the whiteboard; it settles lightweighting arguments in seconds.",
  },
  {
    question:
      "A product change alters a functional dimension on a part already released to production. Which document formally approves the change?",
    options: [
      "An engineering change order, routed through the change control board",
      "An updated bill of materials sent to purchasing",
      "A revised work instruction distributed to the shop",
      "A supplier corrective action report",
    ],
    correctIdx: 0,
    explanation:
      "An engineering change order is the controlled instrument that captures the reason, the affected drawings, the risk assessment, the approvals and the effective date for a change. The other three are downstream consequences or a reactive quality document, and none of them authorises a change to the released definition.",
    hint: "Identify the document that carries the authorisation and the approval trail.",
    relatedConcept: "Engineering change control, ECO workflow and change control boards",
    difficulty: "Easy",
    interviewTip:
      "Follow up with the question of what happens to in-flight stock and WIP when a change lands mid-week.",
  },
  {
    question:
      "A DFMEA assigns a Severity of 9 to a failure that would result in loss of a critical braking function. What does that imply about the required action?",
    options: [
      "The action priority will be very high and the failure requires mitigation regardless of occurrence or detectability",
      "Severity 9 is acceptable if occurrence is rated 1",
      "Severity only affects documentation, not design action",
      "The item can be removed from the DFMEA once it is rated",
    ],
    correctIdx: 0,
    explanation:
      "On the standard 1-10 scales, Severity 9 means a safety-critical failure with possible loss of function and injury, and Severity 10 is catastrophic without warning. Under the action priority system, very high severity forces action because the potential outcome is unacceptable regardless of how rare or hard to detect the failure is. Severity never justifies accepting the item.",
    hint: "In FMEA, severity sets a floor on required action that occurrence and detectability cannot offset.",
    relatedConcept: "DFMEA, severity-occurrence-detectability and action priority",
    difficulty: "Medium",
    interviewTip:
      "Mention the distinction between severity, occurrence and detectability scoring - candidates routinely conflate them.",
  },
  {
    question:
      "A six-sigma programme reports a defect rate of 3.4 defects per million opportunities. What does this correspond to in terms of process capability?",
    options: [
      "A short-term capability of roughly 1.5 sigma, which is close to the limit of most stable processes",
      "A capability of 6 sigma, since that is the programme name",
      "A capability of 4.5 sigma",
      "Zero capability, because six-sigma targets zero defects",
    ],
    correctIdx: 0,
    explanation:
      "A 3.4 DPMO rate corresponds to Cpk of about 1.33, and six sigma expresses that capability after the conventional 1.5-sigma long-term shift in the process mean, which is why the same defect rate is quoted as 4.5 sigma of capability. Three point four DPMO is a demanding but not literally impossible target, and calling it zero defects is a misreading of the framework.",
    hint: "Remember that the six-sigma target embeds a 1.5-sigma shift.",
    relatedConcept: "Six sigma, DPMO, Cpk and the 1.5-sigma shift convention",
    difficulty: "Hard",
    interviewTip:
      "State the 1.5-sigma shift assumption - it is what distinguishes candidates who have actually read the framework.",
  },
  {
    question:
      "A warranty claim investigation finds that the same assembly revision is used in three vehicle variants, with the fault rate varying by variant. What does this tell the team first?",
    options: [
      "The fault is application-specific, so the boundary conditions of each variant must be captured in the specifications and DFMEA",
      "The assembly itself is defective and should be replaced",
      "The warranty data is unreliable and should be discarded",
      "Only the highest-volume variant matters for the investigation",
    ],
    correctIdx: 0,
    explanation:
      "A rate that varies by variant with the same part number is a signal that the part is being operated outside its validated envelope in at least one application - different loads, temperatures, duty cycles or interface partners. The corrective action is to specify and DFMEA the variant-specific boundary conditions, not to condemn the part. Discarding the data or ignoring low-volume variants would hide the failure mechanism.",
    hint: "Ask whether the part is identical and whether the conditions of use are identical too.",
    relatedConcept: "Design FMEA boundary conditions, duty cycle and application-specific requirements",
    difficulty: "Hard",
    interviewTip:
      "Generalise the lesson: a part number without an application envelope is an incomplete specification.",
  },
  {
    question:
      "Which prototyping approach is most appropriate when the goal is to validate a new polymer formulation's dimensional stability but the geometry is still being finalised?",
    options: [
      "Slush moulding or CNC machined blocks from the formulation, since only material behaviour matters and geometry is not yet frozen",
      "A full injection mould tool with production geometry",
      "A sheet metal stamping trial",
      "A hand-woven composite lay-up panel",
    ],
    correctIdx: 0,
    explanation:
      "When material behaviour, not part geometry, is the open question, the cheapest representative artefact is a simple moulding or machined block from the real formulation. A production tool would lock geometry that is not yet settled and cost far more. Stamping and lay-up answer different questions about formability and fibre behaviour.",
    hint: "Separate the variable under test from the variables deliberately held simple.",
    relatedConcept: "Prototype strategy, DfAM and designing experiments for material validation",
    difficulty: "Medium",
    interviewTip:
      "Frame prototyping around the question being answered - that is the discipline being tested.",
  },
  {
    question:
      "A part is produced in high volume by machining. Which change gives the largest cost reduction per unit?",
    options: [
      "Reducing cycle time by consolidating two operations into one setup",
      "Renegotiating the machine hour rate",
      "Increasing the batch size for the same scrap rate",
      "Replacing the spindle with a higher-power unit",
    ],
    correctIdx: 0,
    explanation:
      "In high-volume machining the unit cost is dominated by cycle time, and cycle time is dominated by cutting plus the fixed overhead of setup and probing per batch. Consolidating operations attacks the overhead directly, which is why setup reduction is the standard first target in machining DFM. Spindle power affects achievable cutting conditions but not the fixed per-part overhead.",
    hint: "Rank the cost elements: material, machine time, setup overhead, scrap.",
    relatedConcept: "Machining economics, setup consolidation and cycle time reduction",
    difficulty: "Medium",
    interviewTip:
      "Mention that scrap reduction usually outranks all of these in high-volume machining; ask which cost dominates first.",
  },
  {
    question:
      "What is the difference between a specification requirement and a derived requirement in systems engineering?",
    options: [
      "A specification requirement states what the customer needs; a derived requirement is calculated or allocated from it to satisfy it",
      "A specification requirement is measurable while a derived requirement is not",
      "They are two names for the same kind of statement",
      "Derived requirements come from regulatory standards only",
    ],
    correctIdx: 0,
    explanation:
      "Specification requirements capture stakeholder and regulatory intent - for example, the assembly must support a 200 kg load. Derived requirements are those calculated or allocated to meet them, such as a 45 mm pin diameter from bending stress. Both must be traceable and verifiable, and the distinction matters for verification allocation across suppliers and subsystems.",
    hint: "Ask where the number came from: from the stakeholder, or from a calculation.",
    relatedConcept: "Requirements engineering, derived requirements and traceability",
    difficulty: "Medium",
    interviewTip:
      "Follow with a traceability example - derived requirements must trace up to a parent requirement.",
  },
  {
    question:
      "A team cannot agree whether a fit problem is a design issue or a manufacturing capability issue. What is the most effective first step?",
    options: [
      "Establish whether the process is capable at all by computing Cpk against the specified tolerance before debating the design",
      "Increase the tolerance band",
      "Re-derive the specification from the component function",
      "Sort the rejects by defect type",
    ],
    correctIdx: 0,
    explanation:
      "Capability first, because if Cpk is below 1.0 the process cannot consistently meet any tolerance in the band, and widening the tolerance is a commercial decision rather than a technical fix. If the process is capable and still producing nonconforming parts, the specification itself is the suspect and should be re-derived from function. Sorting rejects is useful but comes after.",
    hint: "Rule out the process before redesigning the part.",
    relatedConcept: "Process capability, Cpk and the design-versus-manufacturing decision sequence",
    difficulty: "Hard",
    interviewTip:
      "This ordering is exactly what an APQP or phase I review expects; state it as a sequence.",
  },
  {
    question:
      "A carbon-fibre layup is being specified. What is the main mechanical consequence of moving a ply from 0 degrees to 45 degrees in a quasi-isotropic laminate?",
    options: [
      "In-plane shear stiffness rises markedly while axial stiffness and stiffness in the through-thickness direction do not",
      "Axial stiffness rises while shear stiffness falls",
      "Both axial and shear stiffness rise proportionally",
      "Only the failure strain changes; stiffness is unaffected",
    ],
    correctIdx: 0,
    explanation:
      "At 0 degrees the ply carries almost pure axial load; at 45 degrees it carries a large shear component. A balanced quasi-isotropic laminate therefore gains shear-dominated properties such as in-plane shear modulus and interlaminar performance, while 0-degree plies remain necessary for axial and bending stiffness. Thickness and mass are unchanged.",
    hint: "Think about which stress components each ply orientation is stiff in.",
    relatedConcept: "Composite laminate mechanics, ply orientation and quasi-isotropic design",
    difficulty: "Hard",
    interviewTip:
      "Mention that compression after impact often governs layup, which is why 45-degree plies are added rather than 90.",
  },
  {
    question:
      "An end-of-life programme asks whether a multi-material assembly can be recycled. Which factor most often determines recyclability in practice?",
    options: [
      "Whether the materials can be separated economically, which is usually governed by the joining method rather than by the material choice",
      "The absolute mass of the part",
      "The number of parts in the assembly",
      "The colour of the surface coating",
    ],
    correctIdx: 0,
    explanation:
      "Recyclability in practice is limited by separation: adhesive and welded multi-material stacks cannot be sorted economically, whereas bolted or snap-fit mono-material assemblies can. Mass and part count affect logistics but not the fundamental separability constraint. Coating colour can affect sorting quality but is secondary to whether the joint can be undone.",
    hint: "Ask how the materials come apart at end of life, not what they are made of.",
    relatedConcept: "Design for recycling, separability and joint selection",
    difficulty: "Medium",
    interviewTip:
      "Distinguish theoretical recyclability of the material from actual recyclability of the assembly.",
  },
  {
    question:
      "A moulded part shows sink marks near a boss. Which process adjustment most directly reduces them?",
    options: [
      "Increasing packing pressure or gate size so material remains available at the thick section while it solidifies",
      "Raising the mould temperature to slow cooling",
      "Reducing the holding pressure to relieve stress",
      "Adding a release agent to the cavity walls",
    ],
    correctIdx: 0,
    explanation:
      "Sink is volumetric shrinkage in a locally thicker region once the gate has frozen. Larger gates and adequate packing hold pressure at the thick section until it is solid, which directly attacks the mechanism. Raising mould temperature slows overall cooling and can worsen shrinkage, and reducing holding pressure removes the very mechanism that prevents sink.",
    hint: "Identify what starves the thick section of material during freeze-off.",
    relatedConcept: "Injection moulding defects, sink marks and packing and holding control",
    difficulty: "Medium",
    interviewTip:
      "Match the defect to its mechanism; Mouldflow simulation of volumetric shrinkage is the professional confirmation.",
  },
  {
    question:
      "Two candidate materials both meet the stiffness requirement for a bracket. Material A is far more expensive but recyclable and weldable; Material B is cheap, light and requires adhesive bonding. What is the correct engineering justification for selecting A?",
    options: [
      "Total cost of ownership, including lifecycle, recyclability, joining process capability and supply risk, outweighs the unit price difference",
      "Unit price is the only correct criterion for a mechanical selection",
      "Recyclability is irrelevant unless the part is a single material",
      "Adhesive bonding is not an acceptable production joining method",
    ],
    correctIdx: 0,
    explanation:
      "A mechanical specification that meets every requirement leaves the decision to total cost of ownership: the assembly cost of adhesive bonding, the loss of structural stiffness at the adhesive joint, recyclability obligations under end-of-life regulation, supply-chain resilience and service life. Unit price alone is the least complete of the criteria. Adhesive bonding is widely used in production where its process window is understood.",
    hint: "Compare complete systems, not isolated material properties.",
    relatedConcept: "Material selection frameworks, total cost of ownership and joint strength in design",
    difficulty: "Medium",
    interviewTip:
      "Introduce a weighted decision matrix with explicit criteria - it is the expected answer format.",
  },
  {
    question:
      "A tolerance stack of five contributors gives a worst-case result of 0.60 mm, comfortably above the 0.40 mm limit. A statistical analysis gives 0.18 mm. Which conclusion is valid?",
    options: [
      "The statistical result applies only if the contributors are independent and statistically controlled, so process capability must be established first",
      "The statistical result is always correct and the worst case can be ignored",
      "The limit must be increased to 0.60 mm",
      "Reducing the number of contributors from five to four solves the problem",
    ],
    correctIdx: 0,
    explanation:
      "Worst-case summation assumes every contributor drifts to its limit simultaneously, which is conservative. The root-sum-of-squares method requires independence and reasonable distributions, and it is only valid if those processes are statistically centred and capable. Without demonstrated capability the worst-case figure remains the defensible number, and arithmetic reduction of contributor count does not by itself prove achievability.",
    hint: "State the assumptions behind the RSS method before trusting it.",
    relatedConcept: "Statistical tolerance stack-up, RSS versus worst case and process capability",
    difficulty: "Hard",
    interviewTip:
      "Mention guard-banding the statistical result by the Cpk of the governing contributor.",
  },
  {
    question:
      "A warranty engineer finds that failures cluster at the 18-24 month mark, long after the infant-mortality period. What failure pattern does this indicate?",
    options: [
      "A wear-out or endurance-limit pattern, where accumulated damage exceeds the design life",
      "A manufacturing escape rate that should be highest at launch",
      "Random failures independent of age",
      "A design that is over-specified for the duty cycle",
    ],
    correctIdx: 0,
    explanation:
      "The bathtub curve has three regions: early failures from manufacturing escapes, a random middle region, and wear-out failures as damage accumulates. A cluster at 18-24 months, well past the early period, is the wear-out region and indicates either an under-rated design, an over-severe duty-cycle assumption, or a duty cycle that exceeds what was validated.",
    hint: "Place the cluster on the bathtub curve.",
    relatedConcept: "Reliability engineering, the bathtub curve and wear-out failure",
    difficulty: "Medium",
    interviewTip:
      "Follow up with the validation implication: the accelerated test must have reached the knee of the curve.",
  },
  {
    question:
      "A part has a 10 mm hole with a positional tolerance of 0.1 mm. Its position varies by 0.35 mm across parts even though the hole size is always correct. What is the dominant cause?",
    options: [
      "Datum shift or fixture variation at assembly, which moves the feature without changing its form",
      "Tool wear on the reamer",
      "Incorrect hole diameter in the drawing",
      "Excessive clearance in the joint",
    ],
    correctIdx: 0,
    explanation:
      "Form error and location error are separate. Because the hole size is consistently correct, the cutting tool and drawing are not the problem; the whole feature is being located somewhere slightly different each time, which is a fixture or datum repeatability issue. Tool wear would change size, and joint clearance would not shift position by that magnitude.",
    hint: "Separate form, size, orientation and location errors before assigning a cause.",
    relatedConcept: "GD&T error types, datum repeatability and assembly variation",
    difficulty: "Medium",
    interviewTip:
      "Ask for a positional report from CMM; the pattern of variation tells you fixture versus datum.",
  },
  {
    question:
      "A customer requests a 30% weight reduction with no cost increase and no change to the mounting interfaces. Which redesign strategy is most likely to succeed?",
    options: [
      "Topology optimisation to remove material from unstressed regions, keeping the load paths and interfaces intact",
      "Switching to a higher-density alloy to preserve thickness",
      "Thickening the part and machining the excess away afterwards",
      "Reducing the surface finish quality to save a coating operation",
    ],
    correctIdx: 0,
    explanation:
      "Topology optimisation targets exactly this constraint set: it keeps material along the computed load paths and the regions where interfaces must be retained, and removes material from unstressed space, delivering weight reduction with no change to mating faces and minimal process change. Higher density increases mass, and stock-then-machine adds cost without removing the required part.",
    hint: "Find the method that changes the internal material distribution and leaves the interfaces untouched.",
    relatedConcept: "Topology optimisation, lightweighting constraints and additive versus subtractive design",
    difficulty: "Medium",
    interviewTip:
      "Acknowledge the real limitation: additive build economics and the fact that not all foundries can print the result.",
  },
  {
    question:
      "A plant measures a scrap rate of 4% and the customer's cost-of-scrap is high. Which measurement would best support a business case for reducing it?",
    options: [
      "The cost of poor quality per month, including scrap, rework, sorting, warranty and line-down cost",
      "The total number of parts produced",
      "The number of operators on each shift",
      "The tonnage of material ordered",
    ],
    correctIdx: 0,
    explanation:
      "The business case must be expressed as money, and the true cost of poor quality includes far more than the scrap bin: reinspection and sorting labour, rework capacity, warranty and field returns, premium freight and the revenue lost when a line stops. A 4% scrap rate alone does not size the opportunity; the COPQ figure does.",
    hint: "Convert the defect rate into rupees per month before building any case.",
    relatedConcept: "Cost of poor quality, scrap reduction and the business case for quality",
    difficulty: "Medium",
    interviewTip:
      "Name the hidden COPQ categories - that enumeration is usually what convinces the audience.",
  },
  {
    question:
      "A machine operator records a torque value out of specification on an assembly bolt. Which measurement practice should be applied first?",
    options: [
      "Confirm the torque wrench is in calibration and that its measurement system analysis is valid",
      "Increase the target torque to match what is being achieved",
      "Replace the fastener with a softer grade",
      "Reinspect the joint for cosmetic defects only",
    ],
    correctIdx: 0,
    explanation:
      "An out-of-tolerance recorded value is only meaningful if the measuring system is capable. Wrench calibration, angle and torque accuracy, and the MSA of the process must be confirmed before any conclusion about the product is drawn. Relaxing the target to match reality removes the requirement rather than solving it, and changing fastener grade shifts the joint design rather than validating the measurement.",
    hint: "Ask whether you can trust the number before acting on it.",
    relatedConcept: "Torque control, calibration and measurement system analysis",
    difficulty: "Medium",
    interviewTip:
      "Extend it: torque-to-tension conversion depends on thread friction, so lubrication conditions are part of the spec.",
  },
  {
    question:
      "A subsystem supplier proposes a part that is cheaper and meets every requirement, but its only source is a single plant in a geopolitically exposed region. What is the correct engineering response?",
    options: [
      "Qualify a second source or document and accept the single-point risk with a mitigation plan",
      "Reject the part because single sourcing is always unacceptable",
      "Accept the part with no documentation, since it meets requirements",
      "Increase the part's safety factor by 50% to remove the risk",
    ],
    correctIdx: 0,
    explanation:
      "Requirements met is necessary but not sufficient; supply risk is a legitimate engineering attribute. The options are to qualify an alternate source, or to accept and document the risk with a mitigation such as strategic stock or a designed-in substitute. A blanket rejection is as wrong as silent acceptance, and inflating the safety factor does nothing for a geopolitical disruption.",
    hint: "Separate technical risk from supply risk and treat the latter explicitly.",
    relatedConcept: "Supply chain risk, dual sourcing and risk acceptance in design",
    difficulty: "Medium",
    interviewTip:
      "Mention PPAP timing and tooling ownership - dual sourcing requires the tooling to be transferable.",
  },
  {
    question:
      "A standard operating procedure specifies tightening a fastener to 45 Nm. A new torque wrench model is introduced. What must happen before production use?",
    options: [
      "The new wrench must be validated against the MSA of the process and its calibration traceable to a national standard",
      "The new wrench can be used if it is newer and more expensive",
      "The specification must be increased to account for manufacturing variation",
      "Operators must be retrained to feel the correct torque",
    ],
    correctIdx: 0,
    explanation:
      "Any change to the measurement device invalidates the measurement system analysis until it is repeated, because capability and control decisions were based on the old device's bias and repeatability. Traceable calibration to a national standard is required for the numbers to be valid for the specification. Retraining and re-speccing do not restore metrological validity.",
    hint: "MSA is tied to the specific measuring instrument used.",
    relatedConcept: "MSA invalidation on equipment change and calibration traceability",
    difficulty: "Hard",
    interviewTip:
      "Generalise it: process validation is invalidated by changes to process, product, method, machine, material, manpower and measurement.",
  },
  {
    question:
      "A mechanical product must become serviceable in the field. Which architectural decision most improves replaceability?",
    options: [
      "Build the product as modules joined by a small number of standard, accessible interfaces",
      "Build the product as a single one-piece assembly to eliminate assembly error",
      "Use threaded fasteners everywhere instead of adhesive joints",
      "Increase the number of unique components so each can be individually identified",
    ],
    correctIdx: 0,
    explanation:
      "A modular architecture with a few standard interfaces localises a failure to one module and bounds the service kit to a small set of spares, which is what actually reduces mean time to repair. A one-piece assembly cannot be serviced at all. Fastener selection alone creates no serviceability, and more unique parts raise part-number and inventory complexity without improving replaceability.",
    hint: "Serviceability is an architectural property, not a fastener property.",
    relatedConcept: "Product modularity, interfaces and design for service and maintenance",
    difficulty: "Medium",
    interviewTip:
      "Connect architecture decisions to the field metric they move - mean time to repair or units replaced per incident.",
  },
];

export const MECHANICAL_PRODUCT_QUESTIONS = buildTechnicalQuestions(SPECS, {
  idPrefix: "mcq-tech-mech-product-t1",
  technology: "Product Management (Mechanical)",
  expectCount: 30,
});

export const MECHANICAL_PRODUCT_SPEC_COUNT = SPECS.length;