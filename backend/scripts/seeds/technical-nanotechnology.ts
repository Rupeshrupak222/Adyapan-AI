/**
 * Nanotechnology (Pharma/ECE) - Test 1 (empty, questionCount 0).
 *
 * `technology` matches the store's `targetName`.
 *
 * Spans the physics and engineering that a nanopharma or nanoelectronics
 * interview probes: length scaling and its consequences, quantum effects,
 * surface-to-volume ratio, self-assembly, nanoparticle drug delivery,
 * characterisation limits, top-down versus bottom-up fabrication, and the
 * dosimetry and safety questions specific to nanomaterials.
 */
import { buildTechnicalQuestions, type TechnicalSeedSpec } from "./shared";

const SPECS: TechnicalSeedSpec[] = [
  {
    question:
      "Why does the melting point of a nanoparticle of diameter 10 nm generally fall below that of the bulk material with the same composition?",
    options: [
      "The surface-to-volume ratio is very high, so surface atoms with reduced coordination destabilise the lattice and depress the melting point",
      "The particles are always coated with a low-melting surfactant",
      "Melting point is a bulk property that does not change with size",
      "The particles are more porous, which lowers the melting point",
    ],
    correctIdx: 0,
    explanation:
      "At 10 nm a large fraction of atoms sit on the surface with fewer nearest neighbours and higher energy than bulk atoms, so the surface contribution lowers the total cohesive energy per atom. The Gibbs-Thomson relation then predicts a melting point depression that scales as 1/diameter. No coating is required and melting point is emphatically not size-independent at this scale.",
    hint: "Relate the melting point depression to the fraction of atoms on the surface.",
    relatedConcept: "Gibbs-Thomson effect, size-dependent melting point and surface energy",
    difficulty: "Hard",
    interviewTip:
      "Quote the 1/diameter scaling; the quantitative form is what separates a strong answer.",
  },
  {
    question:
      "A gold nanoparticle of 5 nm is used in a colourimetric assay. Which effect explains the red colour that bulk gold does not show?",
    options: [
      "Localized surface plasmon resonance, whose frequency depends strongly on particle size, shape and dielectric environment",
      "Quantum confinement of the conduction electrons into discrete states",
      "Nonlinear optical emission from the gold nuclei",
      "Bulk interband absorption in the visible range",
    ],
    correctIdx: 0,
    explanation:
      "The red is a localised surface plasmon resonance: collective oscillation of conduction electrons in a particle much smaller than the wavelength of light, which absorbs in the visible. Its position shifts with size, shape, spacing and refractive index, which is what makes it a useful sensing mechanism. Quantum confinement matters for semiconductors and for particles small enough that the electron mean free path and level spacing dominate.",
    hint: "Think about collective electron oscillations in a metal particle much smaller than the light wavelength.",
    relatedConcept: "Localized surface plasmon resonance and nanoparticle optical sensing",
    difficulty: "Medium",
    interviewTip:
      "Note that the plasmon shift with interparticle spacing is the basis of colourimetric aggregation assays.",
  },
  {
    question:
      "A nanocarrier formulation is being designed to carry a poorly soluble drug. Which combination of design parameters most directly determines its therapeutic performance?",
    options: [
      "Particle size distribution, surface charge and PEGylation, and release kinetics in the intended physiological medium",
      "Only the chemical identity of the polymer carrier",
      "Only the mass of drug loaded per milligram of carrier",
      "The colour and shape of the lyophilised powder",
    ],
    correctIdx: 0,
    explanation:
      "In vivo performance is set by the whole set: size distribution governs cellular uptake and reticuloendothelial clearance, surface charge governs aggregation, opsonisation and toxicity, PEGylation governs circulation time, and release kinetics governs whether free drug appears in a therapeutic window rather than dumping at the injection site. Carrier identity and loading are inputs to these, not substitutes for them.",
    hint: "Separate the properties that control delivery from those that describe the container.",
    relatedConcept: "Nanocarrier design parameters, PEGylation and release kinetics",
    difficulty: "Medium",
    interviewTip:
      "Add that release kinetics should be characterised in serum at 37 C, not in buffer at pH 7.4 alone.",
  },
  {
    question:
      "Which statement correctly distinguishes top-down from bottom-up nanofabrication?",
    options: [
      "Top-down reduces a bulk material to the target size by lithography or milling; bottom-up assembles the structure from atoms or molecules",
      "Top-down is always cheaper because it needs no cleanroom",
      "Bottom-up produces structures with worse dimensional control than top-down",
      "The two terms describe two types of chemical bonding",
    ],
    correctIdx: 0,
    explanation:
      "Top-down is subtractive: lithography, etching, milling and grinding start with bulk material and remove what is not wanted, which is how most semiconductor nodes are made. Bottom-up is additive and self-organising, using supramolecular assembly, sol-gel chemistry, colloidal synthesis or atomic layer deposition to grow the structure, which offers finer size control at lower cost but typically at lower placement precision.",
    hint: "One process subtracts material, the other assembles it.",
    relatedConcept: "Top-down versus bottom-up nanofabrication and their respective limits",
    difficulty: "Medium",
    interviewTip:
      "Note the resolution-versus-throughput trade-off, which is what makes both routes economic at different scales.",
  },
  {
    question:
      "A dynamic light scattering measurement of a 120 nm nanoparticle suspension gives 120 nm. A TEM image shows a broad, non-spherical population. Which conclusion is justified?",
    options: [
      "DLS reports an intensity-weighted hydrodynamic diameter, so a small fraction of large aggregates dominates the number and the result may not describe the primary population",
      "DLS and TEM disagree, so one of the instruments must be faulty",
      "TEM is not valid for nanoparticles below 200 nm",
      "The particles must be smaller than 120 nm and DLS is miscalibrated",
    ],
    correctIdx: 0,
    explanation:
      "DLS intensity scales roughly with the sixth power of particle diameter, so even a small number of large aggregates dominates the scattering and inflates the reported hydrodynamic size. TEM measures the real size and shape directly but samples a small, manually selected region. Neither is wrong; they answer different questions, and orthogonal methods are required.",
    hint: "Consider how strongly scattering intensity scales with particle size.",
    relatedConcept: "DLS intensity weighting, hydrodynamic versus core size and orthogonal characterisation",
    difficulty: "Hard",
    interviewTip:
      "Mention the Rayleigh approximation and that DLS is most reliable for narrow, unimodal, non-aggregating samples.",
  },
  {
    question:
      "Why is dose estimation for an injected nanoparticle formulation harder than for a dissolved small-molecule drug?",
    options: [
      "The systemic dose depends on how many particles localise in each organ and how much payload each particle carries, so neither injected mass nor plasma concentration gives a reliable total",
      "Nanoparticles cannot be measured in plasma at all",
      "All of the dose is eliminated renally before it reaches the tissue",
      "Particle mass is not conserved in the body",
    ],
    correctIdx: 0,
    explanation:
      "For a particulate carrier the pharmacologically relevant unit is the mass of payload reaching the target tissue, which depends on the administered particle number, the loading per particle, the biodistribution between liver, spleen, kidney and tumour, and the rate of payload release. Plasma concentration of the carrier therefore cannot substitute for tissue dose, and mass balance must be reconstructed organ by organ.",
    hint: "Separate the mass of carrier injected from the mass of drug that reaches the target.",
    relatedConcept: "Nanomedicine dosimetry, biodistribution and payload release kinetics",
    difficulty: "Hard",
    interviewTip:
      "Adding that release kinetics complicate it further, since the same tissue mass can be dosed by very different release profiles.",
  },
  {
    question:
      "Which measurement technique is most appropriate for determining the size and polydispersity of a nanoparticle sample intended for a regulatory submission?",
    options: [
      "A validated orthogonal set such as DLS for the hydrodynamic size and TEM or AFM for the primary particle size and morphology",
      "A single SEM image of five particles",
      "Visual inspection of the suspension for turbidity",
      "Measuring the sample mass before and after drying",
    ],
    correctIdx: 0,
    explanation:
      "Regulatory characterisation expects at least two orthogonal techniques that measure different properties, so that an artefact of any single method can be detected. DLS gives the intensity-weighted hydrodynamic size and a polydispersity index, while TEM or AFM gives the core size and morphology directly. A handful of SEM images or a mass difference provides no distribution information.",
    hint: "Regulators want agreement between methods that measure different properties.",
    relatedConcept: "Nanoparticle characterisation strategy and regulatory expectations",
    difficulty: "Medium",
    interviewTip:
      "Name the specific deliverables - PDI, size distribution by volume, zeta potential and morphology.",
  },
  {
    question:
      "In photolithography, the minimum printable feature halves every time the wavelength halves, holding everything else constant. What sets this floor?",
    options: [
      "The diffraction limit, where the smallest resolvable feature is proportional to k1 times the wavelength over the numerical aperture",
      "The atomic diameter of the silicon substrate",
      "The thickness of the photoresist",
      "The number of transistors on the die",
    ],
    correctIdx: 0,
    explanation:
      "Rayleigh resolution gives a printable feature of roughly k1 x lambda / NA, so a shorter wavelength directly shrinks the printable feature. That relationship is why immersion lithography extends the effective k1 by raising NA, and why extreme ultraviolet at 13.5 nm was needed to continue scaling. Resistor thickness affects the process window and aspect ratio but not the optical floor.",
    hint: "The Rayleigh criterion links printable size to wavelength and numerical aperture.",
    relatedConcept: "Rayleigh resolution, k1 scaling and immersion and EUV lithography",
    difficulty: "Hard",
    interviewTip:
      "Follow up with why multi-patterning stretched k1 below 0.25 before EUV arrived.",
  },
  {
    question:
      "Two gold nanoparticles of the same material aggregate, and their colour shifts from red to blue. What is the physical origin of the shift?",
    options: [
      "Aggregation couples the plasmons of adjacent particles, lowering the resonance energy and red-shifting the absorption",
      "The aggregate becomes bulk gold, so it absorbs at the bulk interband edge",
      "The particles are oxidising and changing their dielectric function",
      "The suspension is diluting and changing the refractive index of water",
    ],
    correctIdx: 0,
    explanation:
      "When particles come within roughly a wavelength of each other, their localised surface plasmon modes couple, and the lowest-energy collective mode is red-shifted and broadened. This is the mechanism behind red-to-blue aggregation assays and is a direct optical readout of nanoparticle spacing. Bulk interband absorption would only appear once the material genuinely became bulk-like.",
    hint: "Consider how the collective electron oscillation changes when particles are close together.",
    relatedConcept: "Plasmon coupling, aggregation assays and distance-dependent optical response",
    difficulty: "Hard",
    interviewTip:
      "Note that the plasmon shift saturates as particles merge, so shift magnitude is not linear in aggregate size.",
  },
  {
    question:
      "A silicon nanowire is grown by the vapour-liquid-solid method. Which mechanism determines the wire's diameter?",
    options: [
      "The diameter of the catalyst droplet, which sets the cross-section available for precursor decomposition and axial growth",
      "The reactor chamber pressure alone",
      "The wafer thickness",
      "The rotation speed of the substrate during growth",
    ],
    correctIdx: 0,
    explanation:
      "In VLS growth a liquid catalyst droplet absorbs the precursor and supplies material at the liquid-solid interface, so the droplet diameter fixes the wire diameter and the length is set by time. Diameter control therefore requires monodisperse droplets, which is why catalyst size control, not reactor setpoint accuracy, is the limiting technology.",
    hint: "Identify the interface at which the material is actually added.",
    relatedConcept: "Vapour-liquid-solid growth, catalyst droplet control and nanowire diameter",
    difficulty: "Hard",
    interviewTip:
      "Mention that VLS growth is near-equilibrium and therefore produces very low defect densities compared with MBE.",
  },
  {
    question:
      "Which of the following best explains why surface energy drives self-assembly of block copolymer systems into nanoscale domains?",
    options: [
      "The system minimises total interfacial free energy, so immiscible blocks segregate into periodic domains sized by the balance of chain stretching and interface energy",
      "The blocks chemically bond to each other to form a stable crystal lattice",
      "The entropy of mixing dominates and the blocks remain uniformly distributed",
      "Van der Waals forces between the blocks overcome all other terms",
    ],
    correctIdx: 0,
    explanation:
      "Block copolymers are immiscible by design, so the free-energy minimum is a microphase-separated morphology in which the interface area is minimised while chain stretching is paid. Domain size follows a chi N scaling of order R_g times a function of the segregation parameter, which is why controlling molecular weight and chi is how nanoscale dimensions are engineered. The blocks do not bond chemically and mixing entropy works against separation.",
    hint: "Ask which free-energy term the morphology is minimising.",
    relatedConcept: "Block copolymer self-assembly, chi N and microphase morphology",
    difficulty: "Hard",
    interviewTip:
      "Adding that directed self-assembly uses chemically or physically patterned substrates is a natural extension.",
  },
  {
    question:
      "A flexible printed circuit requires bendable conductive traces. Which failure mechanism dominates when copper is deposited directly on a polymer substrate?",
    options: [
      "Fatigue cracking of the copper at the neutral axis under repeated flexing, worsened by the high stiffness mismatch with the polymer",
      "Oxidation of the polymer substrate at room temperature",
      "Delamination caused by adhesive failure before the copper was printed",
      "Grain growth in the copper during room-temperature storage",
    ],
    correctIdx: 0,
    explanation:
      "Copper is roughly 100 times stiffer than typical polymers, so under repeated bending the copper is placed in tension or compression at large strain and cracks nucleate at grain boundaries after a few thousand cycles. Flexible electronics therefore use thin copper, grain orientation control, or conductive inks and pastes that tolerate the strain. Neither polymer oxidation nor grain growth at room temperature explains the failure.",
    hint: "Consider the strain imposed on the stiff layer by bending a dissimilar stack.",
    relatedConcept: "Flexible electronics, strain in dissimilar laminates and fatigue of conductive films",
    difficulty: "Medium",
    interviewTip:
      "Quantify the strain: epsilon is proportional to thickness times curvature divided by the neutral axis distance.",
  },
  {
    question:
      "Which factor most strongly determines whether a nanoparticle crosses the blood-brain barrier?",
    options: [
      "Its hydrodynamic size and surface charge, which determine whether it is retained by the endothelium rather than excluded by tight junctions",
      "Its colour",
      "Its density in the suspension",
      "The brand of the centrifugation supplier",
    ],
    correctIdx: 0,
    explanation:
      "The blood-brain barrier is a tight-junction endothelium that excludes most macromolecules. Successful brain delivery therefore depends on hydrodynamic size below roughly a few tens of nanometres, a surface that avoids plasma protein adsorption and opsonisation, a charge that does not trigger immediate clearance, and usually some form of receptor-mediated transport rather than passive diffusion. The other options have no mechanistic role.",
    hint: "Focus on the size and surface properties that govern transport across a tight-junction barrier.",
    relatedConcept: "Blood-brain barrier transport, nanoparticle size thresholds and receptor-mediated transcytosis",
    difficulty: "Hard",
    interviewTip:
      "Mention that success in animal models frequently fails in humans because of scaling and species differences in efflux transporters.",
  },
  {
    question:
      "A metal-oxide gas sensor must distinguish carbon monoxide from hydrogen in a humid environment. What is the main challenge in achieving this?",
    options: [
      "Water vapour dominates the surface reaction and masks the target signal, so selectivity requires a filter or a sensing material that is intrinsically selective",
      "The sensor has too many response states to decode",
      "Carbon monoxide cannot be detected by any metal-oxide mechanism",
      "Hydrogen is heavier and blocks the pores permanently",
    ],
    correctIdx: 0,
    explanation:
      "Humidity adsorbs on the sensing film, competes for the same oxygen species and changes the baseline resistance, often by more than the target gas contribution, and the effect is also strongly temperature dependent. Selectivity is therefore achieved with a hydrophobic filter, a doping or overlayer that changes the activation energies, or a temperature-programmed measurement that separates the response kinetics. It is not a decoding problem.",
    hint: "Identify which species occupies the same adsorption sites as the target gas.",
    relatedConcept: "Conductometric metal-oxide sensors, humidity interference and selectivity engineering",
    difficulty: "Hard",
    interviewTip:
      "Mention that cross-sensitivity is the central engineering problem in real deployments, not sensitivity.",
  },
  {
    question:
      "Quantum confinement in a semiconductor quantum dot is best described as:",
    options: [
      "Restricting the carrier to dimensions comparable to the exciton Bohr radius, which discretises the continuous band into discrete energy levels",
      "Increasing the carrier concentration in a bulk sample",
      "Reducing the band gap of a bulk semiconductor by alloying",
      "Blocking current flow through a thin dielectric",
    ],
    correctIdx: 0,
    explanation:
      "When a nanocrystal is comparable to the exciton Bohr radius, the continuum of states is replaced by a ladder of discrete states and the effective band gap grows with decreasing size, so emission shifts to shorter wavelengths as the dot shrinks. The effect reverses the bulk trend, which is why size is the emission colour knob in displays and in biological assays.",
    hint: "The size change moves the band gap in the opposite direction to what alloying does.",
    relatedConcept: "Quantum confinement, discrete energy states and size-tunable emission",
    difficulty: "Medium",
    interviewTip:
      "Mention that this is also why quantum dots have wide emission bands and blinking, both of which have practical consequences.",
  },
  {
    question:
      "Which manufacturing technique is best suited to producing a three-dimensional porous scaffold for tissue engineering with controlled pore interconnectivity?",
    options: [
      "Additive manufacturing using a sacrificial porogen that is leached out after printing",
      "Injection moulding of a solid part",
      "CNC milling of a solid block",
      "Sheet metal stamping",
    ],
    correctIdx: 0,
    explanation:
      "Cell ingress and nutrient transport in a tissue scaffold require fully interconnected pores in the 100-600 um range, which no subtractive process can achieve internally. Additive manufacturing with a sacrificial or dissolving porogen, or freeze-drying of a printed hydrogel, is the practical route. Moulding, milling and stamping all produce solid geometries.",
    hint: "Interconnected internal voids cannot be made by removing material from a solid.",
    relatedConcept: "Scaffold fabrication, porogen leaching and interconnectivity requirements",
    difficulty: "Medium",
    interviewTip:
      "Quantify the target pore size and relate it to cell size and diffusion limits.",
  },
  {
    question:
      "An engineer claims that reducing nanoparticle size always improves solubility and bioavailability. What is the correct response?",
    options: [
      "Surface area per unit mass rises with decreasing size, which often improves dissolution kinetics, but below a critical size aggregation and surface-energy-driven growth can negate the gain",
      "Surface area is independent of particle size for a fixed mass",
      "Smaller particles are always more thermodynamically stable",
      "Bioavailability is independent of crystal form and size",
    ],
    correctIdx: 0,
    explanation:
      "For a fixed mass, surface area scales as 1/diameter, so dissolution rate from the Noyes-Whitney perspective does improve. But surface free energy also drives Ostwald ripening and agglomeration, so a nanosuspension can age into larger particles and lose its advantage, and the Ostwald-Freundlich solubility increase only applies at very small radii. Crystal form and polymorph conversion interact with all of this.",
    hint: "Separate the kinetic benefit from the thermodynamic instability at the same time.",
    relatedConcept: "Nanosuspension dissolution kinetics, Ostwald ripening and the Ostwald-Freundlich relation",
    difficulty: "Hard",
    interviewTip:
      "Mention stabilisers and zeta potential as the practical countermeasure to ripening.",
  },
  {
    question:
      "Which statement about magnetofection, the use of magnetic nanoparticles to deliver genetic material, is accurate?",
    options: [
      "A magnetic field concentrates the particles at the target, raising local concentration and uptake, but efficiency depends on field gradient rather than field strength alone",
      "Magnetic fields increase uptake uniformly throughout the body",
      "The nanoparticles act as gene vectors without any chemical modification",
      "It requires no permanent magnets because the Earth field is sufficient",
    ],
    correctIdx: 0,
    explanation:
      "Magnetofection works because force is proportional to the gradient of the field squared, so a strong magnet with a weak gradient does little while a modest field with a steep gradient near the target concentrates particles effectively. Uptake improves because of the local concentration increase, not because the field acts on the DNA. The cargo must be chemically attached or complexed, and the Earth's field is far too weak.",
    hint: "Consider the physics of magnetic force on a dipole as it moves through the field.",
    relatedConcept: "Magnetofection, magnetic force gradients and gene delivery vectors",
    difficulty: "Hard",
    interviewTip:
      "Quote the force relation F proportional to grad(B squared) times volume - it explains why gradient matters.",
  },
  {
    question:
      "In nanoelectronics, why does the leakage current through a very thin gate oxide increase as the oxide is thinned?",
    options: [
      "Tunnelling probability rises exponentially as the barrier narrows, so the off-state current rises steeply once the oxide is below a few nanometres",
      "The oxide's permittivity increases with thinning",
      "The channel doping is automatically reduced when the oxide is thinned",
      "Leakage is independent of oxide thickness",
    ],
    correctIdx: 0,
    explanation:
      "Direct source-drain tunnelling through the barrier has a probability that decays exponentially with barrier width and barrier height, so even a one-nanometre reduction produces orders of magnitude more leakage. This tunnelling wall sets the practical limit on scaling a planar gate stack and motivated high-k dielectrics with a physically thicker barrier for the same capacitance.",
    hint: "Recall that tunnelling transmission falls exponentially, not linearly, with barrier thickness.",
    relatedConcept: "Quantum tunnelling leakage, high-k gate dielectrics and the scaling limit",
    difficulty: "Hard",
    interviewTip:
      "The high-k motivation is the key follow-up: greater permittivity allows equivalent capacitance with a thicker barrier.",
  },
  {
    question:
      "A liposomal formulation shows encapsulated drug leakage that increases with time and temperature. Which change most directly addresses it?",
    options: [
      "Increasing the phase-transition temperature of the lipid bilayer so it is less fluid at the working temperature",
      "Adding more water to the suspension",
      "Reducing the particle zeta potential to zero",
      "Storing the sample at a higher temperature",
    ],
    correctIdx: 0,
    explanation:
      "Bilayer fluidity rises toward the phase-transition temperature, and once the phospholipid chains are in the liquid-crystalline state the packing defects that permit drug diffusion rise sharply. Raising the Tm by using more saturated or higher-melting lipids reduces leakage. Dilution changes concentration rather than the barrier, and warming accelerates leakage rather than preventing it.",
    hint: "Relate drug permeability across the bilayer to its phase state.",
    relatedConcept: "Liposomal drug leakage, lipid phase transition and bilayer permeability",
    difficulty: "Medium",
    interviewTip:
      "Mention that leakage kinetics are often fitted to first-order models as a release specification.",
  },
  {
    question:
      "Which characterisation method directly measures the surface charge of a nanoparticle suspension as a function of pH?",
    options: [
      "Phase analysis light scattering, reporting the zeta potential",
      "X-ray photoelectron spectroscopy",
      "Thermogravimetric analysis",
      "Differential scanning calorimetry",
    ],
    correctIdx: 0,
    explanation:
      "Phase analysis light scattering infers electrophoretic mobility from phase shifts of a scattered laser and reports it as zeta potential, the potential at the slipping plane. That gives the pH-dependent charging behaviour which drives colloidal stability. XPS gives surface elemental composition and oxidation state, TGA gives mass loss on heating, and DSC gives transition temperatures and enthalpies.",
    hint: "Look for the technique that measures a colloidal electrokinetic property.",
    relatedConcept: "Zeta potential, electrokinetic characterisation and colloidal stability",
    difficulty: "Medium",
    interviewTip:
      "Explain that zeta potential predicts stability but is not the same as the surface potential, and that it is sensitive to conductivity and dispersant.",
  },
  {
    question:
      "What is the principal advantage of using a femtosecond laser in laser ablation synthesis of nanoparticles?",
    options: [
      "The extremely short pulse deposits energy with minimal thermal damage, limiting melting and recondensation that would broaden the size distribution",
      "It increases the melting point of the target material",
      "It allows the process to run without any liquid medium",
      "It guarantees a monodisperse particle size without any surfactant",
    ],
    correctIdx: 0,
    explanation:
      "Pulse duration controls how much of the energy goes into ablation versus melting: at femtosecond timescales the heat-affected zone is far smaller than the particle being ejected, so the plume cools rapidly and particles do not grow by coalescence during flight. Size distributions narrow as pulse length falls. The process still needs a liquid or gas medium and the distribution still requires stabilisers to stay narrow.",
    hint: "Think about heat transfer time versus particle formation time.",
    relatedConcept: "Pulsed laser ablation, thermal confinement and nanoparticle size distributions",
    difficulty: "Hard",
    interviewTip:
      "Relate pulse duration to the thermal diffusion length sqrt(alpha x tau) for a quantitative anchor.",
  },
  {
    question:
      "A nanomaterial is claimed to have a band gap of 1.1 eV from UV-Vis absorption. What is the most important limitation of that measurement?",
    options: [
      "The absorption edge is broadened by size dispersion and by defect states, so the gap inferred from Tauc analysis can be systematically underestimated",
      "UV-Vis cannot measure anything below 1 eV",
      "The measurement requires the sample to be metallic",
      "The band gap must be measured by X-ray diffraction",
    ],
    correctIdx: 0,
    explanation:
      "Absorption in a nanocrystal has contributions from band-edge states, defects, surface states and size dispersion, and the tail of that absorption extends into the sub-gap region. Fitting a Tauc plot therefore tends to understate the true gap unless excitonic features and Urbach tails are separated. Metallic samples are indeed a problem, but the systematic bias from broadening is the substantive limitation.",
    hint: "Consider what the absorption tail below the true gap is made of.",
    relatedConcept: "Tauc analysis, Urbach tails and the limits of optical band-gap determination",
    difficulty: "Hard",
    interviewTip:
      "Mention that valence-band XPS is the usual cross-check when the gap matters for a device claim.",
  },
  {
    question:
      "Which design choice most improves the accuracy of a nanoparticle-based lateral flow immunoassay?",
    options: [
      "Using monodisperse particles with a bright, stable signal so the visual or reader threshold is not near the noise floor",
      "Using the smallest possible particles to maximise surface area",
      "Maximising the polydispersity of the particles to broaden the signal",
      "Removing the capture antibody to reduce background",
    ],
    correctIdx: 0,
    explanation:
      "A lateral flow assay is a threshold measurement, so the signal at the limit of detection must sit well above the noise. Monodispersity maximises the signal per unit mass and tightens the particle-to-particle distribution that sets the threshold, and colour or label stability prevents photobleaching and drift. Smaller particles give less signal per particle, and polydispersity and removing the capture step both degrade performance.",
    hint: "Think about the relationship between the signal distribution and the decision threshold.",
    relatedConcept: "Lateral flow immunoassays, assay sensitivity limits and label choice",
    difficulty: "Medium",
    interviewTip:
      "Distinguish analytical sensitivity from clinical sensitivity - the first is what particle choice controls.",
  },
  {
    question:
      "In nano-biosensing, what is the fundamental trade-off of using quantum dots as fluorescent labels?",
    options: [
      "Their narrow, size-tunable emission enables multiplexing, but their brightness per particle can fluctuate because of blinking and non-radiative pathways",
      "Their emission is too broad for multiplexing",
      "They are too small to be detected optically",
      "They cannot be conjugated to antibodies",
    ],
    correctIdx: 0,
    explanation:
      "Size-dependent emission gives a narrow, addressable set of colours from a single material, and quantum dots are photostable and brighter than organic dyes. But blinking, caused by Auger recombination in charged states, makes single-particle intensity non-stationary, which complicates quantitative single-molecule measurement. Broad emission would be true of organic dyes, not of quantum dots.",
    hint: "The multiplexing benefit and the stability problem have different physical origins.",
    relatedConcept: "Quantum dot labelling, Auger blinking and multiplexing in biosensing",
    difficulty: "Hard",
    interviewTip:
      "Mention that blinking is charge-state dependent, so surface engineering mitigates it rather than eliminating it.",
  },
  {
    question:
      "A nano-enabled product is being prepared for commercialisation. Which consideration is specific to nanomaterials and rarely applies to bulk materials?",
    options: [
      "Life-cycle exposure and fate assessment, because nanoscale particles have size-dependent transport, biodistribution and potential for trophic transfer",
      "Determining the melting point of the material",
      "Measuring the electrical resistivity of the bulk sample",
      "Calculating the cost of the raw ore",
    ],
    correctIdx: 0,
    explanation:
      "At the nanoscale, hazard and exposure assessment cannot be inferred from bulk material data, because mobility across biological barriers, tissue distribution and persistence all change with size, shape and surface chemistry, and nanomaterials may pass through filters and membranes designed for bulk. Toxicology, fate and worker-exposure characterisation become a distinct regulatory workstream. Bulk properties such as melting point and ore cost are handled conventionally.",
    hint: "Ask which assessment changes qualitatively rather than quantitatively with particle size.",
    relatedConcept: "Nanosafety, life-cycle assessment and size-dependent transport and biodistribution",
    difficulty: "Medium",
    interviewTip:
      "Bring up the specific regulatory instrument for nanomaterials in your market; it varies by region.",
  },
  {
    question:
      "What is the purpose of zeta potential measurement in nanoparticle formulation development?",
    options: [
      "To predict colloidal stability by establishing the electrostatic barrier to aggregation",
      "To measure the core diameter of the particles",
      "To determine the drug loading capacity of the carrier",
      "To quantify the surface elemental composition",
    ],
    correctIdx: 0,
    explanation:
      "A zeta potential magnitude above roughly 30 mV generally provides enough electrostatic repulsion to prevent spontaneous aggregation, and its sign and pH dependence tell you whether a charged excipient is needed or whether steric stabilisation is required. It does not measure core size, loading or elemental composition - those need TEM, HPLC and XPS respectively.",
    hint: "Identify which property of the suspension, rather than of the particle, is being measured.",
    relatedConcept: "Zeta potential, colloidal stability and electrostatic versus steric stabilisation",
    difficulty: "Easy",
    interviewTip:
      "Add the practical caveat: high zeta potential does not stop aggregation if the particles are already sterically stabilised at low charge.",
  },
  {
    question:
      "A nanomaterial is described as a nanozyme because it shows enzyme-like catalytic activity. What feature fundamentally distinguishes it from a natural enzyme?",
    options: [
      "Its catalytic activity comes from surface chemistry and the size-dependent electronic structure of a nanostructured material rather than from a protein active site, so it is far more stable but generally less selective",
      "It uses the same amino-acid active site as a natural enzyme, simply at a smaller scale",
      "It requires a cofactor that natural enzymes cannot synthesise",
      "It can only catalyse reactions above 300 degrees Celsius",
    ],
    correctIdx: 0,
    explanation:
      "Materials such as magnetite nanoparticles, gold nanoclusters, cerium oxide and carbon dots exhibit peroxidase-, oxidase-, catalase- or superoxide-dismutase-like activity that emerges from surface atoms, oxygen vacancies and electron transfer, not from a folded protein active site. The advantages are cost, stability across temperature and pH, and easy functionalisation and immobilisation; the costs are narrower substrate specificity, non-specific surface adsorption, batch-to-batch variability and poor control of the catalytic site. This is why nanozymes are used in colourimetric and lateral-flow assays, antibacterial coatings and cellular protection.",
    hint: "Ask what provides the catalytic site in each case.",
    relatedConcept: "Nanozymes, nanocatalysis and enzyme-mimetic nanomaterials",
    difficulty: "Hard",
    interviewTip:
      "Mention that peroxidase-mimicking iron oxide nanoparticles are common in immunoassays, and that inter-batch reproducibility is a genuine translation problem.",
  },
  {
    question:
      "In nanomedicine, why are PEG chains grafted onto liposomes or nanoparticles?",
    options: [
      "They create a steric barrier that reduces protein adsorption and opsonisation, thereby slowing reticuloendothelial clearance and extending circulation",
      "They increase the encapsulation efficiency of every drug",
      "They lower the core particle size",
      "They replace the need for a targeting ligand",
    ],
    correctIdx: 0,
    explanation:
      "PEG forms a hydrated, excluded-volume layer that physically blocks protein adsorption onto the particle surface, so opsonins and macrophages do not recognise it as foreign, which extends plasma half-life and increases the chance of reaching the target. PEG does not improve encapsulation universally, does not reduce core size, and does not replace active targeting - it delivers the particle to the target at all.",
    hint: "Focus on what happens at the particle surface in the bloodstream.",
    relatedConcept: "PEGylation, opsonisation and the enhanced permeability and retention effect",
    difficulty: "Medium",
    interviewTip:
      "Mention the trade-off: excessive PEG reduces the activity of surface targeting ligands.",
  },
  {
    question:
      "A photoresist for a 193 nm immersion lithography step needs a higher dissolution rate without losing resolution. Which property is most critical?",
    options: [
      "The balance of surface chemistry that keeps the unexposed resist insoluble while allowing fast dissolution in the exposed region",
      "The colour of the resist after baking",
      "The reflectivity of the substrate",
      "The thickness uniformity of the wafer",
    ],
    correctIdx: 0,
    explanation:
      "A resist must have a sufficient dissolution contrast between exposed and unexposed regions: high enough to resolve a feature at 193 nm with immersion, and low enough that unexposed material survives. Chemically amplified resists push this by catalysing a deprotection cascade during post-exposure bake. Substrate reflectivity matters for standing waves but is not the contrast mechanism.",
    hint: "Resolution depends on a contrast ratio between exposed and unexposed material.",
    relatedConcept: "Chemically amplified resists, dissolution contrast and 193 nm immersion lithography",
    difficulty: "Hard",
    interviewTip:
      "Mention line-edge roughness as the practical limit that resist chemistry has not fully solved.",
  },
];

export const NANOTECHNOLOGY_QUESTIONS = buildTechnicalQuestions(SPECS, {
  idPrefix: "mcq-tech-nanotechnology-t1",
  technology: "Nanotechnology (Pharma/ECE)",
  expectCount: 30,
});

export const NANOTECHNOLOGY_SPEC_COUNT = SPECS.length;