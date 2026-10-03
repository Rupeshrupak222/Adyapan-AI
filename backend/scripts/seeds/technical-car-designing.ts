/**
 * Car Designing - Test 1 (empty, questionCount 0).
 *
 * `technology` matches the store's `targetName`.
 *
 * Spread across the areas an automotive design or vehicle-engineering interview
 * actually probes: package and proportion, aerodynamics, powertrain layout,
 * materials and structures, NVH, thermal management, manufacturability, safety
 * regulation and the styling/process side of the discipline.
 */
import { buildTechnicalQuestions, type TechnicalSeedSpec } from "./shared";

const SPECS: TechnicalSeedSpec[] = [
  {
    question:
      "In packaging a front-engine longitudinal layout, engineers must keep the engine behind the front axle line. What is the principal reason for that constraint?",
    options: [
      "It keeps static weight on the steered axle, which reduces understeer at a given lateral acceleration",
      "It is required to keep the crankshaft clear of the steering rack",
      "It maximises rear seat legroom",
      "It reduces the torsional stiffness requirement of the body shell",
    ],
    correctIdx: 0,
    explanation:
      "Locating the centre of gravity ahead of the front axle line shifts static weight onto the steered wheels, reducing their slip angle at a given lateral acceleration and therefore reducing understeer. It also shortens the load path, but the handling consequence is the design driver.",
    hint: "Think about weight distribution between the steered axle and the driven axle.",
    relatedConcept: "Front-engine longitudinal layout, weight distribution and understeer gradient",
    difficulty: "Medium",
    interviewTip:
      "Packaging questions are answered by naming the competing requirements and the trade-off, not by recalling one number.",
  },
  {
    question:
      "A car's drag coefficient is improved by extending the rear roofline into a fastback and adding a small ducktail spoiler. Which mechanism explains most of the benefit?",
    options: [
      "Flow separation is delayed, keeping the vehicle within the laminar attached-flow region for longer",
      "The spoiler creates downforce that presses the car into the road",
      "The longer tail increases frontal area and therefore drag",
      "The spoiler reduces rolling resistance between tyre and road",
    ],
    correctIdx: 0,
    explanation:
      "A fastback tail lets the boundary layer remain attached past the rear screen instead of separating early at a bluff base. A ducktail then reattaches a limited flow downstream to exploit base suction. Downforce from a small spoiler is negligible at these scales, and rolling resistance is unrelated.",
    hint: "Drag is dominated by where the boundary layer separates, not by the tail silhouette alone.",
    relatedConcept: "Boundary layer separation, fastback tails and the Cd-A product",
    difficulty: "Medium",
    interviewTip:
      "Insist on Cd multiplied by frontal area; a low Cd on a large car can still lose to a high-Cd microcar.",
  },
  {
    question:
      "Wheelbase and front track are increased by 40 mm and 25 mm respectively on an otherwise unchanged platform. What is the most direct effect on high-speed stability?",
    options: [
      "Yaw stability improves because the wheelbase and track both increase the effective cornering stiffness",
      "Yaw stability worsens because the larger footprint raises the centre of gravity",
      "Understeer gradient increases because the tyres are further from the roll centre",
      "There is no measurable effect because stability depends only on the centre of gravity height",
    ],
    correctIdx: 0,
    explanation:
      "A longer wheelbase and wider track raise the vehicle's polar moment of inertia and reduce the load transfer per tyre for a given lateral acceleration. Both effects increase the yaw moment needed to disturb the vehicle, so high-speed stability improves and the understeer gradient falls.",
    hint: "Stability depends on rotational inertia and on how much lateral load each tyre carries.",
    relatedConcept: "Yaw inertia, load transfer and the understeer gradient",
    difficulty: "Hard",
    interviewTip:
      "State the two mechanisms separately - rotational inertia and load-transfer sensitivity - before giving the conclusion.",
  },
  {
    question:
      "Which body-in-white joining method allows the tightest tolerance control on a rear floor pan while avoiding the distortion that spot welding causes in thin, high-strength steel?",
    options: [
      "Adhesive bonding with a structural epoxy",
      "Self-piercing rivets",
      "MIG spot welding",
      "Soldering",
    ],
    correctIdx: 0,
    explanation:
      "Structural adhesives distribute load over a large area, eliminate the local heat-affected zone that causes distortion in thin HSIF steel, and add stiffness and damping. Self-piercing riveting avoids weld spatter but still creates a local stress concentration and cannot achieve the same gap control as a cured adhesive joint.",
    hint: "Consider which method adds no heat to the panel.",
    relatedConcept: "Joining technologies: adhesive bonding versus welding and riveting in lightweight structures",
    difficulty: "Medium",
    interviewTip:
      "Lightweighting interviews reward naming the metallurgical downside of welding high-strength steel.",
  },
  {
    question:
      "A transverse front-engine front-wheel-drive layout needs the steering rack and the exhaust and driveline to share a confined space. Which packaging measure is most effective?",
    options: [
      "Use a thin-wall, high-strength-steel front rail and route the exhaust on the opposite side of the driveline",
      "Increase the engine block width so the exhaust can pass underneath",
      "Adopt a double wishbone front suspension instead of McPherson struts",
      "Lengthen the wheelbase to create additional tunnel clearance",
    ],
    correctIdx: 0,
    explanation:
      "Packaging conflicts in a transverse FWD bay are solved by material gauge reduction, which frees several millimetres across the rail, and by separating the exhaust from the propshaft and half-shaft envelope. Suspension architecture and wheelbase change the whole layout and do not resolve a local clash.",
    hint: "Ask which levers change only the local dimension rather than the whole architecture.",
    relatedConcept: "Transverse FWD packaging, front rail design and packaging clearance management",
    difficulty: "Hard",
    interviewTip:
      "Package engineers expect answers framed as dimensional levers with quantified millimetres.",
  },
  {
    question:
      "In a BEV platform, the skateboard battery pack is designed as a structural member. Which consequence follows from mounting it in the floor between the sills?",
    options: [
      "Battery mass sits low and between the axles, improving centre-of-gravity location and torsional stiffness",
      "The battery must be structurally isolated to protect it from crash loads",
      "It raises the roll centre because the pack is the stiffest part of the car",
      "It reduces torsional stiffness because the pack is not bonded to the sills",
    ],
    correctIdx: 0,
    explanation:
      "A skateboard pack places roughly 400-600 kg of mass between the axles at floor level, cutting both static margin and polar moment, and once bonded into the body loop it closes the load path and raises torsional rigidity substantially. It also means crash energy must be routed around the pack, which is a design constraint rather than a stiffness benefit.",
    hint: "Consider both the mass location and whether the pack forms part of the closed section.",
    relatedConcept: "Structural battery packs, skateboard architectures and body torsional rigidity",
    difficulty: "Medium",
    interviewTip:
      "Mention that crash energy paths must be designed around the pack - it is the follow-up question.",
  },
  {
    question:
      "During cornering, tyre load sensitivity means that adding lateral load to the outside tyres gives diminishing returns. What design choice exploits this?",
    options: [
      "Keeping the roll centre low so that load transfer is minimised and total axle grip is maximised",
      "Raising the roll centre to increase the outside tyre load and traction",
      "Using a stiffer front anti-roll bar to bias roll distribution",
      "Increasing the track to reduce the roll couple arm",
    ],
    correctIdx: 0,
    explanation:
      "Because the total lateral force available falls as load transfers, minimising load transfer maximises the axle sum. A low roll centre and, in the limit, a decoupled anti-roll system achieve this. Raising the roll centre or stiffening an anti-roll bar deliberately increases load transfer, which reduces total axle grip even while it changes the balance.",
    hint: "Total grip is the sum of grip across both tyres, not the grip of the most loaded one.",
    relatedConcept: "Tyre load sensitivity, roll centre height and roll couple distribution",
    difficulty: "Hard",
    interviewTip:
      "This distinction - grip versus balance - is the whole point of the question; make it explicitly.",
  },
  {
    question:
      "A design team must reduce wind noise at the B-pillar without adding mass. Which intervention addresses the dominant mechanism?",
    options: [
      "Air-seal the pillar-to-roof and pillar-door gaps and add a tuned mass absorber to the glass run-up",
      "Increase the thickness of the door glass",
      "Increase the windscreen rake angle",
      "Fit a larger rear spoiler",
    ],
    correctIdx: 0,
    explanation:
      "Wind noise at the B-pillar is dominated by turbulent flow separation around the pillar and by leakage through the glass-to-pillar run-up, not by bulk panel vibration. Sealing those gaps directly removes the leakage path; a tuned mass absorber only helps if there is a structural panel resonance, which glass rarely has at these frequencies.",
    hint: "Separate airflow noise from structure-borne noise before choosing a fix.",
    relatedConcept: "Aeroacoustics: leakage paths, pillar turbulence and NVH treatments",
    difficulty: "Hard",
    interviewTip:
      "Ask whether the noise is tonal (structural) or broadband (airflow); the answer determines the fix.",
  },
  {
    question:
      "What is the primary function of a brake proportioning valve in a vehicle braking system?",
    options: [
      "To balance front and rear brake pressure so the vehicle does not lock its rear wheels before the fronts",
      "To modulate pressure according to ABS slip thresholds",
      "To compensate for pad wear over the life of the friction material",
      "To hold the vehicle stationary on a gradient without the handbrake",
    ],
    correctIdx: 0,
    explanation:
      "Rear tyres carry a lower share of vehicle weight but have a similar friction coefficient, so at equal pressure they lock first. A proportioning valve reduces rear line pressure to match rear axle load, preventing rear lock and preserving stability. ABS modulation is a separate, electronically controlled function.",
    hint: "Consider which axle reaches lock-up first at a common line pressure.",
    relatedConcept: "Brake balance, axle load transfer and lock-up avoidance",
    difficulty: "Medium",
    interviewTip:
      "Mention that ABS supersedes the proportioning valve functionally but the load-based reasoning still holds.",
  },
  {
    question:
      "Which change best improves the thermal performance of a liquid-cooled EV battery module during a fast-charge event?",
    options: [
      "Reducing the coolant flow rate to keep the cells hotter and reduce pump losses",
      "Increasing the coolant heat-transfer coefficient and lowering the thermal resistance between cells and cold plate",
      "Replacing the cold plate with a heatsink of larger mass",
      "Adding phase-change material without changing the cold plate",
    ],
    correctIdx: 0,
    explanation:
      "Fast-charge limits are set by cell temperature rise, which is proportional to thermal resistance divided by heat-transfer coefficient between the cells and coolant. Reducing that resistance - higher coolant-side h, tighter contact, better coolant - is the direct lever. Lowering flow rate reduces heat removal, and added thermal mass without better conduction only delays the temperature rise.",
    hint: "Fast charge is a conduction and convection problem, not a capacity problem.",
    relatedConcept: "Battery thermal management, cold-plate heat transfer and fast-charge derating",
    difficulty: "Medium",
    interviewTip:
      "Quantify: a cell with 0.4 K/W against the coolant sees 120 W of heat rise by about 48 K, which alone can trigger derating.",
  },
  {
    question:
      "A front subframe is being redesigned for stiffness. Which measure raises torsional stiffness with the least mass penalty?",
    options: [
      "Eliminate unnecessary joint stack-up by using laser welding instead of multi-spot assembly",
      "Increase the steel gauge uniformly across the frame",
      "Add a large triangulated brace to one corner",
      "Replace the steel subframe with an aluminium cast equivalent of equal thickness",
    ],
    correctIdx: 0,
    explanation:
      "Joint compliance is often the dominant softness in welded assemblies: each multi-spot stack introduces local slip that behaves like a rotational spring. Replacing a long stack-up with a single laser weld raises frame stiffness disproportionately to the mass added. Uniform gauge increases mass linearly, a one-sided brace helps torsion only in one load direction, and swapping material without resizing may even reduce stiffness.",
    hint: "Measure compliance in the joints before adding steel to the rails.",
    relatedConcept: "Joint compliance, weld technology and subframe torsional stiffness",
    difficulty: "Hard",
    interviewTip:
      "Structural interviewers expect you to distinguish rail stiffness from joint stiffness; most designs are joint-limited.",
  },
  {
    question:
      "Which characteristic most distinguishes a unibody construction from a body-on-frame construction?",
    options: [
      "The unibody carries structural loads in the stamped panels themselves, so panel geometry is load-bearing",
      "The unibody uses a separate ladder frame bonded to the panels",
      "The body-on-frame design integrates the floor as a stressed member",
      "Both structures distribute load identically and differ only in assembly method",
    ],
    correctIdx: 0,
    explanation:
      "In a unibody the body shell is the primary structure, so stiffness comes from panel shape, gauge distribution and joint design, which gives lower mass but makes crash and durability behaviour highly sensitive to those details. A body-on-frame separates the frame, which is efficient for heavy vehicles, trailers and severe-duty applications where repairability matters.",
    hint: "Ask where the load path physically lives.",
    relatedConcept: "Unibody versus body-on-frame architectures and their structural trade-offs",
    difficulty: "Medium",
    interviewTip:
      "Connect the architecture choice to duty cycle and repair cost - that is the engineering rationale.",
  },
  {
    question:
      "In a passive safety evaluation of a side-impact test, which measurement most directly indicates whether the thorax is adequately protected by the side airbag?",
    options: [
      "Lateral chest deflection and the sensor time from contact to full deployment",
      "Overall vehicle kerb weight",
      "The door intrusion depth at the B-pillar",
      "The peak deceleration of the vehicle in the frontal test",
    ],
    correctIdx: 0,
    explanation:
      "Thoracic protection is assessed by lateral chest deflection against the tolerance limit and by whether the airbag deploys early enough to be in the load path. Intrusion is a separate head and thorax hazard metric, and frontal-test deceleration is unrelated to a side event.",
    hint: "Separate the occupant-metric from the structure-metric.",
    relatedConcept: "Side-impact occupant protection, chest deflection and sensor timing",
    difficulty: "Medium",
    interviewTip:
      "Naming the specific regulation metric signals familiarity with homologation practice.",
  },
  {
    question:
      "A designer wants to reduce the frontal understeer gradient without changing tyre size. Which change is most effective?",
    options: [
      "Reduce the roll centre height and increase the front roll couple distribution",
      "Increase the roll centre height to raise lateral load transfer at the front",
      "Stiffen the rear springs to shift load forward",
      "Increase the front track width only",
    ],
    correctIdx: 0,
    explanation:
      "Load sensitivity means the axle that receives more load transfer delivers less total grip per unit of lateral acceleration. Lowering the roll centre and biasing roll couple forward at the front reduce front load transfer and increase front axle grip, cutting understeer. Raising the roll centre or stiffening the rear both increase front load transfer.",
    hint: "Follow the load, not the spring rate, and recall that grip is not linear in load.",
    relatedConcept: "Understeer gradient, roll centre and roll couple distribution",
    difficulty: "Hard",
    interviewTip:
      "State the direction of every effect before naming the answer; it keeps you honest under probing.",
  },
  {
    question:
      "What is the main function of a balance shaft in an inline-four engine?",
    options: [
      "To counter the inertial forces of the pistons and connecting rods so they cancel rather than sum",
      "To drive the camshaft at half crank speed",
      "To absorb crankshaft torsional vibration from gear engagement",
      "To increase oil pressure at high engine speed",
    ],
    correctIdx: 0,
    explanation:
      "An inline-four is inherently unbalanced because primary forces are fully in phase every two crank revolutions and secondary forces act along the crank axis. A balance shaft counter-rotates at twice crank speed so its inertial force cancels the residual, reducing vibration and permitting higher rpm. Torsional vibration is handled by a torsional damper, and the camshaft runs at half crank speed in a typical four-stroke.",
    hint: "Consider which vibration the part removes at what rotational speed.",
    relatedConcept: "Engine balancing, primary and secondary forces and NVH targets",
    difficulty: "Medium",
    interviewTip:
      "Mention the residual imbalance that remains even with a balance shaft; it is why engines still need vibration dampers.",
  },
  {
    question:
      "Which manufacturing process is best suited to producing a large, complex aluminium transmission housing in volume?",
    options: [
      "High-pressure die casting",
      "Sand casting",
      "Investment casting",
      "Forge welding",
    ],
    correctIdx: 0,
    explanation:
      "Die casting suits high-volume, complex thin-walled castings in aluminium because the pressure fill fills thin sections completely and the cycle is short. Sand casting suits very large or low-volume parts, investment casting suits small precise parts, and forge welding cannot produce a closed hollow casting at all.",
    hint: "Match the process to volume, section thickness and material.",
    relatedConcept: "Casting process selection for structural aluminium components",
    difficulty: "Medium",
    interviewTip:
      "Add the trade-off - high pressure introduces gas porosity and requires vacuum assist for structural parts.",
  },
  {
    question:
      "In a design for recyclability review, which change most improves the recyclability of a mixed-material front-end module?",
    options: [
      "Replace the mixed-material bonded stack with a mono-material design held by reversible fasteners",
      "Introduce a flame retardant that burns cleanly during recovery",
      "Reduce the module's overall mass to increase recycled content ratios",
      "Add identifying marks without changing the material mix",
    ],
    correctIdx: 0,
    explanation:
      "Recyclability is governed by separability and material purity. Bonded multi-material stacks cannot be separated economically, so they are downcycled; a mono-material design with bolts, screws or clips can be disassembled and fully recycled. Marking helps sorting but does nothing about an inseparable stack, and lighter mass does not improve recovery.",
    hint: "Ask whether the material can be separated before it is recycled.",
    relatedConcept: "Design for recycling, separability and mono-material construction",
    difficulty: "Medium",
    interviewTip:
      "Bring up the ELV and End-of-Life Vehicle Directive context; it shows you know the regulatory driver.",
  },
  {
    question:
      "A vehicle's cooling system has a thermostatically controlled bypass that sends coolant through the heater core before the engine reaches operating temperature. Why is this undesirable?",
    options: [
      "It wastes thermal energy heating the cabin while the engine is still warming up",
      "It prevents the cabin from ever reaching a comfortable temperature",
      "It causes the coolant pump to cavitate on cold start",
      "It increases the pressure in the radiator cap",
    ],
    correctIdx: 0,
    explanation:
      "Bypassing the radiator before the thermostat opens keeps the engine thermostatic, but diverting flow through the heater core first delivers hot coolant to the cabin while the block is still cold, so the engine warms more slowly for no comfort gain. Modern bypass valves are timed or position-controlled to avoid exactly this parasitic loss.",
    hint: "Consider what energy the flow is delivering before it is wanted.",
    relatedConcept: "Cooling system flow control, thermostatic preheat and parasitic thermal losses",
    difficulty: "Medium",
    interviewTip:
      "This is a classic systems-thinking question; answer with the energy argument rather than a component name.",
  },
  {
    question:
      "Which measurement is the most direct indicator of front-end NVH quality in a complete vehicle test?",
    options: [
      "A-weighted sound pressure level at the driver's head position on the dynamometer",
      "Peak engine brake torque",
      "Total vehicle kerb mass",
      "Maximum lateral g achieved on a skid pad",
    ],
    correctIdx: 0,
    explanation:
      "NVH as experienced by occupants is captured by sound pressure level at the ear point, weighted to approximate human hearing sensitivity, which is why A-weighting is standard. Torque and mass describe performance and packaging rather than noise, and lateral g measures handling.",
    hint: "NVH is an occupant-perceived quantity, so measure it where the occupant is.",
    relatedConcept: "NVH measurement, A-weighted SPL and ear-point acoustics",
    difficulty: "Easy",
    interviewTip:
      "Distinguish dBA overall from frequency-weighted component levels - the latter is what engineers act on.",
  },
  {
    question:
      "In a transverse powertrain, the exhaust manifold is placed close to the block. What does the reduced primary pipe length accomplish?",
    options: [
      "It lowers exhaust gas temperature and pressure losses before the catalytic converter, improving warm-up and emissions",
      "It increases backpressure to boost the volumetric efficiency at high rpm",
      "It eliminates the need for a flex joint in the exhaust",
      "It reduces the need for thermal insulation around the manifold",
    ],
    correctIdx: 0,
    explanation:
      "Catalyst light-off time is dominated by how quickly exhaust gas reaches 250-300 C, so shortening and thermally wrapping the primary pipe accelerates warm-up and cuts cold-start emissions. Raising backpressure would be a performance defect, and the flex joint and insulation requirements are unrelated to pipe length.",
    hint: "The requirement driving this design is emissions compliance on cold start.",
    relatedConcept: "Exhaust primary length, catalyst light-off and cold-start emissions",
    difficulty: "Hard",
    interviewTip:
      "Quantify: roughly 90% of real-world drive emissions occur before the catalyst lights off.",
  },
  {
    question:
      "A crash test shows the sill intrusion is acceptable but the occupant's chest receives a high deceleration. What structural change most directly addresses this?",
    options: [
      "Add a side-impact airbag sized and timed to engage before peak chest loading",
      "Increase the door beam section modulus",
      "Raise the floor pan stiffness",
      "Increase the B-pillar wall thickness",
    ],
    correctIdx: 0,
    explanation:
      "Sill intrusion measures structure performance; chest deceleration measures occupant loading. If intrusion already passes, the structure is adequate and the remaining gap is occupant coupling, which is what a properly sized and timed airbag addresses. Thicker beams or pillars would reduce intrusion further at the cost of mass and pedestrian-impact penalties.",
    hint: "Separate the structure criterion from the occupant criterion before choosing.",
    relatedConcept: "Crashworthiness trade-off: intrusion criteria versus occupant injury metrics",
    difficulty: "Hard",
    interviewTip:
      "Flag the pedestrian-impact penalty - adding B-pillar mass has a real cost elsewhere in the same structure.",
  },
  {
    question:
      "In a design where the battery tray is bonded to the body with a structural adhesive, which failure mode is most likely to be missed during validation?",
    options: [
      "Long-term creep of the adhesive at operating temperature leading to progressive loss of joint stiffness",
      "Yield of the aluminium tray under static load",
      "Fatigue cracking of the adhesive in a lap joint",
      "Peel at the adhesive edge driven by thermal expansion mismatch during cycle testing",
    ],
    correctIdx: 0,
    explanation:
      "Adhesive joints that pass short static and crash tests can still creep: under sustained load and elevated temperature the modulus falls over thousands of hours, so stiffness is lost gradually and shows up as premature NVH or structural degradation. Yield of the metal and lap-shear fatigue are already targeted by conventional testing, and thermal cycling is likewise a standard validated load case, whereas creep needs months of sustained load at temperature to reveal.",
    hint: "Consider what changes slowly over years rather than what fails in a millisecond.",
    relatedConcept: "Adhesive joint durability, creep and long-term NVH validation",
    difficulty: "Hard",
    interviewTip:
      "Durability testing on adhesives must include temperature and humidity ageing; it is a standard interview follow-up.",
  },
  {
    question:
      "A vehicle requires 400 Nm of tractive torque at the driven wheels in a hill-climb scenario, and the final drive ratio is 4.0. What torque must the differential output shaft deliver?",
    options: [
      "100 Nm",
      "1600 Nm",
      "400 Nm",
      "3200 Nm",
    ],
    correctIdx: 0,
    explanation:
      "Torque multiplies by the gear ratio from the differential output to the wheel, so the differential supplies 400 / 4.0 = 100 Nm. The tyre rolling radius would only be needed to convert torque into tractive force, and no force is asked for here - the absence of a radius is the clue that this is purely a ratio question.",
    hint: "Torque multiplies going forward through a gear reduction, so divide to go back from the wheel.",
    relatedConcept: "Torque multiplication, final drive ratios and the difference between torque and force",
    difficulty: "Medium",
    interviewTip:
      "Point out that the rolling radius is irrelevant here - noticing an unused datum is a strong signal you have read the question properly.",
  },
  {
    question:
      "Which steering system geometry most effectively reduces the tendency of the inside front tyre to lift under braking on a front-drive vehicle?",
    options: [
      "An anti-dive percentage that is high on the front axle",
      "An anti-dive percentage of zero on the front axle",
      "A rear anti-squat percentage of zero",
      "Increasing the rear anti-dive bar stiffness",
    ],
    correctIdx: 0,
    explanation:
      "In a front-drive vehicle the front axle carries most of the braking force, so front anti-dive geometry resists the pitch transfer that would otherwise unload the inside front tyre and impair steering response. Anti-dive is achieved by geometry such as a high-mounted control-arm pivot or a low-mounted steering rack. Anti-squat and rear anti-dive are the wrong-axis controls.",
    hint: "Under braking the load moves forward; ask which geometry resists that transfer at the front.",
    relatedConcept: "Anti-dive, anti-squat geometry and load transfer in braking and acceleration",
    difficulty: "Hard",
    interviewTip:
      "Get the axis and the direction right; anti-dive is a braking-pitch control, anti-squat an acceleration-pitch control.",
  },
  {
    question:
      "A premium EV platform needs to hit a 1,000 km range target with an 80 kWh pack. Which change offers the best range per unit of engineering and cost?",
    options: [
      "Reducing the drag coefficient by 0.05 and the rolling resistance coefficient by 15%",
      "Adding 8 kWh of usable pack capacity",
      "Improving the motor peak efficiency from 92% to 95%",
      "Adding a two-speed rear gearbox",
    ],
    correctIdx: 0,
    explanation:
      "At highway speeds roughly two-thirds of energy goes into overcoming aero drag, so a Cd reduction buys more real-world range per unit of pack, cost and mass than any drivetrain efficiency gain. A two-speed gearbox helps only at the edges of the efficiency map, and 15% lower rolling resistance is meaningful because tyre losses dominate at lower speeds. Added capacity raises weight and cost.",
    hint: "Break the energy budget into aero, rolling and drivetrain losses before deciding.",
    relatedConcept: "Vehicle energy budget, aerodynamic and rolling losses and range engineering",
    difficulty: "Hard",
    interviewTip:
      "Present the energy budget with typical percentages; that framing is what interviewers listen for.",
  },
  {
    question:
      "In a design review, a junior engineer proposes reducing spring rates across the board to improve ride comfort. Which counter-argument is technically strongest?",
    options: [
      "Lower rates reduce body control and pitch, which can worsen occupant comfort and transient response, so rates must be tuned to the frequency targets rather than lowered",
      "Softer springs are always lighter and therefore always cheaper",
      "Spring rate has no effect on anything except static ride height",
      "Softer springs increase the roll couple arm",
    ],
    correctIdx: 0,
    explanation:
      "Ride comfort depends on both sprung-mass natural frequency and body motion amplitudes across the 4-8 Hz band where humans are sensitive. Lowering all rates lowers body natural frequency, moves it closer to the sensitive band and increases pitch and heave amplitudes during transient inputs, so a blanket reduction usually degrades comfort and handling together. Rates must be targeted against the frequency requirements and the damper tuning.",
    hint: "Ride comfort is a frequency problem, not a stiffness-minimisation problem.",
    relatedConcept: "Sprung mass natural frequency, ride comfort and pitch transient response",
    difficulty: "Hard",
    interviewTip:
      "Quote the 4-8 Hz human sensitivity band - it is the number that makes the argument land.",
  },
  {
    question:
      "Which statement best describes the role of a jerk limiter in a suspension damper?",
    options: [
      "It limits the rate of change of damper force so structural and occupant loads are not applied in a short, sharp step",
      "It prevents the damper from reaching its bump stop",
      "It sets the static ride height",
      "It reduces unsprung mass",
    ],
    correctIdx: 0,
    explanation:
      "Force discontinuities at high velocity produce very high jerk and corresponding structural and occupant loads. A jerk limiter, usually a blow-off or a progressive knee in the low-speed regime, softens the onset of high-speed damping. Blow stops prevent damper travel limits and ride height is set by springs, not dampers.",
    hint: "Consider the derivative of damper force with respect to time rather than force itself.",
    relatedConcept: "Damper characterisation, jerk limiting and blow-off valves",
    difficulty: "Medium",
    interviewTip:
      "Mention that jerk limiting must be tuned so it does not degrade bottom-out control at full bump.",
  },
  {
    question:
      "A prototype's underbody was validated for stiffness but not for aero-acoustic performance. Which change most directly reduces wind noise from under the vehicle?",
    options: [
      "Fit underbody shielding and wheelhouse liners to block turbulent flow reaching the cabin floor",
      "Increase underbody panel gauge for stiffness",
      "Add chassis stiffeners at the rear floor",
      "Raise the ride height slightly",
    ],
    correctIdx: 0,
    explanation:
      "Underbody flow interacts with the rear axle and wheels, generating turbulent vortices that reach the cabin floor through the transmission tunnel and footwell. Flattening and shielding the underbody, or closing the wheelhouse, breaks up that vortex path and lowers radiated noise. Stiffeners and gauge changes address structure-borne paths, not airflow.",
    hint: "Decide whether the dominant path is through the air or through the structure.",
    relatedConcept: "Underbody aerodynamics, wheelhouse sealing and airborne noise paths",
    difficulty: "Medium",
    interviewTip:
      "Distinguish this from the structural-borne squeaks and rattles handled by friction damping treatments.",
  },
  {
    question:
      "In a hydrogen fuel-cell vehicle, what is the principal packaging advantage and the principal trade-off versus a battery-electric vehicle?",
    options: [
      "Higher energy density by mass allows a smaller tank, but hydrogen storage is bulky, cryogenic-capable and expensive to contain",
      "Lower energy density by mass but better volumetric density, making the tank smaller",
      "Identical packaging to a BEV, since the stack occupies the same volume",
      "Hydrogen is stored at high pressure in a small volume with no special materials",
    ],
    correctIdx: 0,
    explanation:
      "Compressed or liquefied hydrogen has excellent gravimetric but poor volumetric density, and it permeates and embrittles many materials, which forces composite overwrap and high-pressure or cryogenic tanks that cost far more than a battery enclosure. The advantage is range per kilogram; the trade-off is tank volume, cost and the station infrastructure needed to refuel it.",
    hint: "Separate gravimetric from volumetric density before comparing pack sizes.",
    relatedConcept: "Hydrogen storage, gravimetric versus volumetric density and FCEV packaging trade-offs",
    difficulty: "Medium",
    interviewTip:
      "Add that hydrogen embrittlement drives the composite overwrap and inspection regime.",
  },
  {
    question:
      "A quality team finds that a dimension critical to the door aperture varies by 1.5 mm across the fleet. Which root cause is most consistent with this pattern?",
    options: [
      "Inconsistent weld fixture location causing stack variation in the aperture assembly",
      "Random variation in paint thickness",
      "A supplier change in the glass substrate",
      "Ambient temperature at the shipping dock",
    ],
    correctIdx: 0,
    explanation:
      "A repeatable within-part variation across units is characteristic of process variation rather than measurement noise, and aperture dimensions are governed by the position of the weld fixtures that locate the hinge and latch pillars. Paint thickness is microns, not millimetres, and dock temperature affects paint cure rather than metal position.",
    hint: "Ask whether the variation is random noise or a systematic process capability shift.",
    relatedConcept: "Dimensional variation analysis, fixture location stack-up and process capability",
    difficulty: "Medium",
    interviewTip: "Reach for Cpk and a stack-up analysis; both belong in the answer to a variation question.",
  },
];

export const CAR_DESIGNING_QUESTIONS = buildTechnicalQuestions(SPECS, {
  idPrefix: "mcq-tech-car-designing-t1",
  technology: "Car Designing",
  expectCount: 30,
});

export const CAR_DESIGNING_SPEC_COUNT = SPECS.length;