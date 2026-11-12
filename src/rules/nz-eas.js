/* CLINICAL RULES FILE: NZ EAS clinical practice guidelines (packaged exports 24 September 2026).

   Every clinical number and rule the app uses lives here (engine numbers since 11 Nov 2026; the
   drug-card rules, A5 locks and reference wording since 12 Nov 2026), so they can be checked against the
   guideline in one place. This file is plain data (no program logic), so a future rules editor
   can read and write it, and other services can have their own copy.

   Five parts (owner decision 2, doc 18), each with its own checks:
     1 numbers     clinical numbers and rules
     2 wording     clinical wording; numbers appear only as {gaps} filled from part 1
     3 checklists  checklists and reversible causes
     4 equipment   device types, sizes, access sites, colours
     5 sources     guideline name, export date, PDF files and web links

   Do not change a value without the owner's approval (see docs/07, A-table).
   tests/rules-file.test.mjs checks every value below against the guideline tables. */

export const RULES = {
  /* ===== PART 1: CLINICAL NUMBERS AND RULES ===== */
  numbers: {
    timing: {
      cprCycleMs: 120000, // 2-minute CPR cycle (EAS 3.14)
      adrenalineIntervalMs: 240000, // adrenaline review every 4 minutes (EAS 3.14)
      checklistPromptMinLeftMs: 90000, // offer the checklist only while at least 1 min 30 s of the cycle remains
    },

    weight: {
      maxKg: 500, // highest weight accepted as valid
      adultAboveKg: 40, // above 40 kg the patient is treated as an adult ("41 kg = 50 kg")
      adultRoundedToKg: 50, // how the wording describes an adult weight ("rounded to 50 kg or more")
    },

    // Paediatric weight estimate from age, in years (EAS 7.2). Ages outside these rules give no estimate.
    ageEstimate: {
      underOneYearKg: 5, // any age below 1 year
      oneToTenYears: { maxAge: 10, addYears: 4, multiplyBy: 2 }, // (age + 4) x 2, whole years only
      elevenToFourteenYears: { maxAge: 14, multiplyBy: 3 }, // age x 3, whole years only
    },

    /* Child weight bands (EAS 7.2). A child's weight is ROUNDED UP to the next band
       (e.g. 15 kg uses the 20 kg row). magnesiumMmol null = no dose listed: seek clinical advice.
       shockJ = 4 J/kg of the band, from change A1 (owner-approved 3 Nov 2026). */
    childBands: [
      { maxKg: 5, adrenalineMg: 0.05, amiodaroneFirstMg: 25, amiodaroneSecondMg: 12.5, magnesiumMmol: null, shockJ: 20 },
      { maxKg: 10, adrenalineMg: 0.1, amiodaroneFirstMg: 50, amiodaroneSecondMg: 25, magnesiumMmol: null, shockJ: 40 },
      { maxKg: 20, adrenalineMg: 0.2, amiodaroneFirstMg: 100, amiodaroneSecondMg: 50, magnesiumMmol: 4, shockJ: 80 },
      { maxKg: 30, adrenalineMg: 0.3, amiodaroneFirstMg: 150, amiodaroneSecondMg: 75, magnesiumMmol: 6, shockJ: 120 },
      { maxKg: 40, adrenalineMg: 0.4, amiodaroneFirstMg: 200, amiodaroneSecondMg: 100, magnesiumMmol: 8, shockJ: 160 },
    ],

    // Adult references (also used when no weight has been entered).
    adult: {
      adrenalineMg: 1,
      amiodaroneFirstMg: 300,
      amiodaroneSecondMg: 150,
      magnesiumMmol: 10,
      fluidsMinMl: 1000,
      fluidsMaxMl: 2000,
      shockJ: 200,
    },

    child: {
      fluidsMinMlPerKg: 20, // 20-40 mL/kg of the ACTUAL weight (not the band), EAS 3.14
      fluidsMaxMlPerKg: 40,
    },

    shock: {
      joulesPerKg: 4, // each child band's shockJ = maxKg x joulesPerKg (change A1; checked by test)
      paediatricPadsUpToJ: 100, // prompt for paediatric pads when the energy reference is 100 J or less
      maxRecordableJ: 1000, // a recorded energy must be above 0 and no more than this
    },

    // Rhythms that can be recorded for each rhythm-check outcome.
    rhythms: {
      shock: ['VF', 'VT', 'Torsades'],
      noshock: ['PEA', 'Asystole', 'Other', 'Unknown'],
      rosc: ['Sinus rhythm', 'Organised rhythm', 'AF', 'Other', 'Unknown'],
    },

    /* Which card fills the lower drug slot on the Live screen (A2c 3 Nov 2026, A7 11 Nov 2026).
       The latest rhythm (from either list) decides: a fluids rhythm shows the fluids card; an
       amiodarone rhythm shows amiodarone, or magnesium if torsades was ever recorded.
       Rhythms in neither list ("Unknown") are ignored, and so is any rhythm recorded with ROSC
       (A8, 12 Nov 2026: ROSC "Other" is not a non-shockable arrest rhythm). */
    lowerCard: {
      fluidRhythms: ['PEA', 'Asystole', 'Other'],
      amiodaroneRhythms: ['VF', 'VT', 'Torsades'],
    },

    /* Amiodarone doses become due at these shock counts (earlier shocks count): first dose at 3,
       second at 6 (A2, A2b, C6b-2). The number of entries is the maximum number of doses. */
    amiodarone: {
      dueAtShocks: [3, 6],
    },

    // Magnesium for torsades: one dose and a single repeat at most (EAS 3.14).
    magnesium: {
      maxDoses: 2,
    },

    // Products named in the wording and the record forms.
    products: {
      fluid: '0.9% sodium chloride', // also the diluent
      fluidShort: 'NaCl 0.9%',
    },

    // Preparation shown in the Administration pop-ups (EAS 14.3 adrenaline, EAS 14.27 / 7.2 magnesium).
    preparation: {
      adrenalineChild: { drugMg: 1, totalMl: 10 }, // children 40 kg or less: 1 mg to 10 mL (0.1 mg/mL)
      magnesium: {
        adultGrams: 2.5, // the adult 10 mmol dose in grams
        adultDiluteToMl: 10,
        overMinMinutes: 1, // given over 1-2 minutes
        overMaxMinutes: 2,
        ampouleMmol: 10, // paediatric: 10 mmol / 5 mL ampoule diluted to 10 mL = 1 mmol/mL
        ampouleMl: 5,
        childDiluteToMl: 10,
      },
    },

    /* RSI dose references (EAS 9.3), shown on the Guidance tab from the EXACT entered weight (not the
       band). Each dose = weight x perKg, capped at max. Above the adult threshold (weight.adultAboveKg)
       the blocker is first rounded to the nearest roundAdultToMg. Shown to displayDecimals places. */
    rsi: {
      fentanyl: { mcgPerKg: 2, maxMcg: 200 },
      ketamine: { mgPerKg: 2, maxMg: 200 },
      reducedKetamine: { mgPerKg: 1, maxMg: 200 },
      blocker: { mgPerKg: 2, maxMg: 200, roundAdultToMg: 50 }, // rocuronium OR suxamethonium
      displayDecimals: 1,
    },

    /* Paediatric tube formulae (shown on the Guidance tab from age in years, up to showUpToAge).
       Under 1 year: a fixed size range, length = size x underOneLengthTimesSize.
       Otherwise: size = age / sizeAgeDivisor + sizeAddMm; length = age / lengthAgeDivisor + lengthAddCm. */
    tubes: {
      showUpToAge: 14,
      underOneSizeMinMm: 3,
      underOneSizeMaxMm: 4,
      underOneLengthTimesSize: 3,
      sizeAgeDivisor: 4,
      sizeAddMm: 3.5,
      lengthAgeDivisor: 2,
      lengthAddCm: 12,
      displayDecimals: 1,
    },

    /* A5 (owner ruling 4 Nov 2026): after a dose is recorded, the Live card cannot record again for
       this long. Adrenaline is also greyed out while locked; magnesium and fluids are not. */
    doubleTapLockMs: {
      adrenaline: 210000, // 3 min 30 s
      magnesium: 5000,
      fluids: 5000,
    },
  },

  /* ===== PART 2: CLINICAL WORDING ===== */
  /* Reference wording shown with the doses. {name} is filled in by the app, e.g. {band} = 20. */
  wording: {
    adultDoseBasis: 'Adult dose reference · CPG weight band above {adultAboveKg} kg',
    childDoseBasis: 'Child · {band} kg CPG band (rounded up)',
    adultMagnesiumBasis: 'Adult · EAS 3.14 / EAS 14.27',
    childMagnesiumBasis: 'Child · {band} kg CPG band · EAS 7.2',
    noMagnesiumDoseBasis: 'No magnesium dose listed for the {band} kg CPG band · seek clinical advice',
    invalidWeightMagnesiumBasis: 'Enter a valid weight for a dose reference',
    adultFluidBasis: 'Adult · EAS 3.14',
    childFluidBasis: '{minPerKg}–{maxPerKg} mL/kg · EAS 3.14',
    noWeightFluidBasis: 'Enter weight for a volume reference',
    amiodaroneNotYetDue: 'Not yet due. Review after {first} shocks in VF / pulseless VT (second dose after {second}, counting earlier shocks).',
    amiodaroneSecondNotYetDue: 'Due after {second} shocks',
    childSecondAmiodarone: 'Seek clinical advice', // C6b: no EAS source for a child second dose
    invalidWeight: 'Enter weight above zero and no more than {maxKg} kg, with up to one decimal.',
    /* Below: wording whose {gaps} are filled automatically from part 1 (engine wordingGaps). A list
       is shown as separate paragraphs. Only <b>, <em> and <br> are used inside the wording. */

    // Header and weight pop-up
    headerEnergyTitle: '{joulesPerKg} J/kg of CPG weight band · maximum {adultShockJ} J',
    padsPrompt: 'Use paediatric pads',
    padsPromptWithLimit: 'Use paediatric pads · {padsUpToJ} J or less',
    estimateAgeError: 'Use an infant age in years or whole years 1–{fourteenMaxAge}.',
    estimatedWeightSource: 'Estimated from age {age} years · CPG 7.2',

    // Live drug cards
    adrenalineOverdue: '{adrenalineEveryMin} min elapsed · review',
    adrenalineUntilReview: 'Until {adrenalineEveryMin} min review',
    amiodaroneReviewAt: 'Review at {shocks} shocks',
    maxDosesRecorded: '{maxDoses} doses recorded',
    withholdTorsades: 'Withhold · torsades',
    magnesiumMaxDosesStatus: '{magnesiumMaxDoses} doses · clinical review',
    magnesiumRepeatStatus: 'Repeat once only if TdP persists/recurs',
    magnesiumFirstStatus: 'Withhold amiodarone · torsades history',
    fluidsCardTitle: 'Fluids · {fluidShort}',

    // Adrenaline and amiodarone Administration pop-ups
    noWeightDoseReference: 'Enter child weight for reference',
    referenceOnly: 'Reference only',
    amiodaroneChildPopupDose: '{first} mg IV first; second dose: seek clinical advice',
    amiodaroneAdultPopupDose: '{first} mg IV first; {second} mg IV second',
    adrenalineHow: [
      'NZCPG cardiac arrest: every {adrenalineEveryMin} minutes. Adults and children rounded to {adultRoundedToKg} kg or more: IV bolus, undiluted.',
      'Children rounded to {adultAboveKg} kg or less: dilute {adrDiluteMg} mg to a total of {adrDiluteMl} mL with {fluid} ({adrDiluteMgPerMl} mg/mL). Draw up the dose and give as an IV bolus.',
    ],
    amiodaroneHow: [
      'IV bolus, undiluted. For persistent VF / pulseless VT: first dose after {amiodaroneFirstShocks} shocks, second after {amiodaroneSecondShocks} shocks, including earlier shocks.',
      '<b>Withhold if torsades is present or has occurred.</b>',
    ],
    drugPopupFooter: 'NZCPG EAS {guideline} and EAS 3.14. Reference values do not record administration.',

    // Record forms
    amiodaroneAfterTorsadesWarning: 'Torsades has occurred. CPG advises withholding amiodarone. This form records an actual event, not a recommendation.',
    selectDoseAdvice: '<b>Seek clinical advice.</b> No second-dose value is suggested for a child. Enter the dose given.',
    confirmTorsades: 'Confirm the observed rhythm to record the delivered shock. This does not record a magnesium administration.',
    repeatMagnesium: 'One dose is already recorded. Record a second dose only if it was given for persistent or recurrent torsades.',

    // Torsades and fluids guideline extracts, and their Administration pop-ups
    torsadesExtractTitle: 'Torsades de pointes · guideline extract',
    torsadesExtractQuote: 'Withhold amiodarone.<br>Administer magnesium IV:',
    torsadesExtract: 'Adult reference: {adultMagnesiumMmol} mmol ({magAdultGrams} g), given IV over {magOverMinMinutes}–{magOverMaxMinutes} minutes. A single repeat is permitted when torsades continues or returns. Use the paediatric dose tables for children.',
    fluidsExtractTitle: 'Fluids · guideline extract',
    fluidsExtractQuote: 'Correct immediately reversible causes.<br>Administer {fluid} IV:',
    fluidsExtract: 'The IV volume reference is {adultFluidsMinL}–{adultFluidsMaxL} L in adults, or {childFluidsMinPerKg}–{childFluidsMaxPerKg} mL/kg in children. Assess and treat the reversible cause.',
    fluidsRecordNote: 'Record the actual volume given in mL. The card shows the recorded total; a rhythm change does not record fluid administration.',
    magnesiumNoDose: 'Dose requires clinical review',
    magnesiumHow: [
      'For adult cardiac-arrest administration, dilute the {adultMagnesiumMmol} mmol dose with {fluid} to {magAdultDiluteToMl} mL and give over {magOverMinMinutes}–{magOverMaxMinutes} minutes. The paediatric preparation in <em>EAS guideline 7.2</em> is {magChildMmolPerMl} mmol/mL: dilute {magAmpouleMl} mL from a {magAmpouleMmol} mmol/{magAmpouleMl} mL ampoule to {magChildDiluteToMl} mL, then draw up the table dose.',
      'Avoid the IV line carrying a concurrent adrenaline infusion because precipitation can occur. Record magnesium in mmol.',
    ],

    // Guidance & sources pop-up
    guidanceIntro: [
      '<b>Standard non-traumatic cardiac arrest.</b> Clinician reference and event recorder. It does not detect a rhythm, operate a defibrillator or infer treatment.',
      'NZCPG <em>EAS guideline 3.14</em>: {cprCycleMinWord} minute CPR cycles; adrenaline review every {adrenalineEveryMin} minutes; amiodarone reviews at {amiodaroneFirstShocks} and {amiodaroneSecondShocks} VF / pulseless VT shocks. Weight references retain the source app’s {bandList} kg paediatric bands.',
      'Shock energy is {joulesPerKg} J/kg of the CPG weight band (rounded up), capped at {adultShockJ} J. The adult CPG specifies maximum defibrillator setting. A no-shock cycle is counted only when recorded.',
    ],
    guidanceRsiTitle: 'RSI medicine references',
    guidanceRsi: [
      'Fentanyl: {fentanylMcgPerKg} mcg/kg IV, maximum {fentanylMaxMcg} mcg. Only when indicated for TBI, suspected intracranial pathology or hypertension; withhold with shock.',
      'Ketamine: {ketamineMgPerKg} mg/kg IV, maximum {ketamineMaxMg} mg. Consider {reducedKetamineMgPerKg} mg/kg with shock / prior sedation; do not reduce for prolonged seizures.',
      'Rocuronium <b>or</b> suxamethonium: {blockerMgPerKg} mg/kg IV, maximum {blockerMaxMg} mg. Adult dose usually rounded to nearest {blockerRoundMg} mg. Alternatives, not both.',
      'Use the full RSI CPG for patient context and administration.',
    ],
    guidanceCaption: 'Packaged NZCPG exports: {exportDate}. Reversible causes: {reversibleCauses}. Local protocol takes precedence. This extracted app requires clinical validation before patient-care use.',

    // RSI and tube pop-ups (Guidance tab)
    rsiNotRecorded: 'calculated references, not recorded administrations',
    rsiConditions: 'Fentanyl only for TBI, suspected intracranial pathology or hypertension; withhold with shock. Consider reduced ketamine with shock / prior sedation; do not reduce for prolonged seizures. Neuromuscular blockers are alternatives, not both.',
    tubeNoAge: 'Enter age to show the paediatric ETT and length-at-lips formula results.',
    tubeCaution: 'Paediatric formulae are guides; confirm actual fit. Not a weight-only adult tube-size recommendation.',
    igelSourceCaption: 'iGel colours/ranges: {igel}.',

    // Tube sheet results; gaps come from numbers.tubes
    tubeSizeUnderOne: '{minMm}–{maxMm} mm',
    tubeLengthUnderOne: 'ETT size × {timesSize} cm',
    tubeSizeFormula: '{mm} mm (formula)',
    tubeLengthFormula: '{cm} cm (formula)',
    // Age-estimate captions (weight sheet, tube sheet); gaps come from numbers.ageEstimate
    weightSheetAgeEstimate: 'Under 1 year: {underOneYearKg} kg. 1–{tenMaxAge} years: (age + {tenAddYears}) × {tenMultiplyBy}. {fourteenFromAge}–{fourteenMaxAge}: age × {fourteenMultiplyBy}. CPG 7.2; estimates may underestimate. Excludes newborn resuscitation.',
    tubeSheetAgeEstimate: 'Under 1 year: {underOneYearKg} kg. Ages 1–{tenMaxAge}: (age + {tenAddYears}) × {tenMultiplyBy} kg. Ages {fourteenFromAge}–{fourteenMaxAge}: age × {fourteenMultiplyBy} kg. Estimates may underestimate actual weight.',
  },

  /* ===== PART 3: CHECKLISTS AND REVERSIBLE CAUSES ===== */
  checklists: {
    // The four checklists (Guidance tab and Post ROSC). Each item is ticked and timestamped in the log.
    lists: [
      {
        id: 'arrest',
        label: 'Arrest checklist',
        code: 'EAS 3.14',
        pdf: 'cpg-cardiac-arrest.pdf#page=2',
        items: [
          'Team leader identified.',
          'Roles allocated and confirmed.',
          'CPR feedback device and metronome on if available.',
          'Defibrillator screen visible to the team leader.',
          'Airway adjunct or ETT in place and ventilation adequate.',
          'ETCO2 attached and waveform visible.',
          'Oxygen flow and supply adequate.',
          'IV/IO access secure, two sites if possible.',
          'Consider underlying and reversible causes.',
          'Appropriate medicines administered.',
          'Initiate documentation.',
          'Communication with family/bystanders.',
        ],
      },
      {
        id: 'postrosc',
        label: 'Post ROSC checklist',
        code: 'EAS 3.15',
        pdf: 'cpg-post-rosc.pdf#page=2',
        items: [
          'Airway and ventilation are adequate/secure.',
          'Vital signs, including blood glucose level.',
          'Backup for RSI called for if indicated.',
          'IV access secure.',
          'ETCO2 35–45 mmHg if ventilated.',
          'Sedation and neuromuscular blockade if indicated.',
          'BP above target.',
          '12 lead ECG.',
          'Confirm appropriate transport destination.',
        ],
      },
      {
        id: 'preparation',
        label: 'Preparation for RSI',
        code: 'EAS 9.2 · Airway Backup Checklist',
        pdf: 'cpg-preparation-rsi.pdf',
        intro: 'Prepare for RSI while awaiting CCP backup.',
        items: [
          'Pre-oxygenate by mask.',
          'Attach monitor, including ETCO2.',
          'Gain IV access, preferably in two sites.',
          'Prepare a running line of 0.9% sodium chloride.',
          'Position the patient for optimal airway control.',
          'Place an ETT holder under the patient’s head.',
          'Ensure suction is working and turn it off.',
          'Prepare a manual ventilation bag with PEEP valve.',
          'Maximise space and clear away unnecessary equipment.',
          'Consider travelling toward backup.',
        ],
      },
      {
        id: 'rsi',
        label: 'RSI checklist',
        code: 'EAS 9.4',
        pdf: 'cpg-rsi-checklist.pdf',
        items: [
          'Roles assigned — Team leader.',
          'Roles assigned — Airway.',
          'Roles assigned — Airway assistant.',
          'Roles assigned — Drugs and monitoring.',
          'Patient prepared — Check oxygen supply and pre-oxygenate.',
          'Patient prepared — Consider nasal prongs.',
          'Patient prepared — Position optimised.',
          'Patient prepared — IV access patent. Running line attached.',
          'Patient prepared — Consider marking surgical airway landmarks.',
          'Monitoring attached and visible — Baseline vital signs.',
          'Monitoring attached and visible — Pulse oximetry, capnography, and cycling BP.',
          'Equipment checked and ready — PPE.',
          'Equipment checked and ready — Manual ventilation bag with PEEP valve set to 5 cmH2O.',
          'Equipment checked and ready — OPA, SGA, and surgical airway equipment.',
          'Equipment checked and ready — Laryngoscope.',
          'Equipment checked and ready — ETT and 10 ml cuff syringe.',
          'Equipment checked and ready — ETT holder in place.',
          'Equipment checked and ready — Suction.',
          'Equipment checked and ready — Bougie and stylet.',
          'Medicines drawn up, labelled and doses confirmed — Fentanyl (if indicated).',
          'Medicines drawn up, labelled and doses confirmed — Ketamine.',
          'Medicines drawn up, labelled and doses confirmed — Neuromuscular blocker.',
          'Medicines drawn up, labelled and doses confirmed — Post intubation sedation.',
          'Medicines drawn up, labelled and doses confirmed — Metaraminol.',
          'Team briefing — Airway plan, including failed intubation.',
          'Team briefing — Medication plan.',
          'Team briefing — Anticipated complications.',
          'Team briefing — Any concerns before proceeding?',
        ],
      },
    ],

    // 4 Hs and 4 Ts: names and short guidance prompts (shown from the Guidance tab).
    causes: [
      {
        id: 'oxygen',
        group: '4 Hs',
        name: 'Hypoxia',
        plain: 'Low oxygen',
        text: 'Review airway patency, oxygen supply, ventilation and waveform capnography.',
      },
      {
        id: 'volume',
        group: '4 Hs',
        name: 'Hypovolaemia',
        plain: 'Low circulating volume',
        text: 'Consider bleeding or fluid loss. Look for the cause and review volume replacement in the applicable CPG.',
      },
      {
        id: 'metabolic',
        group: '4 Hs',
        name: 'Hypo / hyperkalaemia',
        plain: 'Potassium or metabolic disturbance',
        text: 'Consider renal failure, dialysis, medicines and other metabolic causes. Review relevant history, ECG and available point-of-care results.',
      },
      {
        id: 'temperature',
        group: '4 Hs',
        name: 'Hypo / hyperthermia',
        plain: 'Low or high body temperature',
        text: 'Review exposure and core temperature if available. Temperature-related arrest can require a modified approach; use the specific CPG.',
      },
      {
        id: 'tension',
        group: '4 Ts',
        name: 'Tension pneumothorax',
        plain: 'Pressure in the chest',
        text: 'Consider the history, chest findings and ventilation difficulty. Use the specific CPG for assessment and treatment.',
      },
      {
        id: 'tamponade',
        group: '4 Ts',
        name: 'Cardiac tamponade',
        plain: 'Pressure around the heart',
        text: 'Consider trauma and other relevant history. Use ultrasound only if available, within scope, and without interrupting CPR.',
      },
      {
        id: 'toxins',
        group: '4 Ts',
        name: 'Toxins',
        plain: 'Poisoning or medicines',
        text: 'Ask about medicines, substances, overdose and scene clues. Seek the relevant toxicology guidance.',
      },
      {
        id: 'thrombosis',
        group: '4 Ts',
        name: 'Thrombosis',
        plain: 'Coronary or pulmonary clot',
        text: 'Consider myocardial infarction or pulmonary embolism from the history and findings. Use the relevant CPG and specialist advice.',
      },
    ],
  },

  /* ===== PART 4: EQUIPMENT ===== */
  equipment: {
    // Airway and access device types and their size choices (record forms).
    devices: {
      iv: { name: 'IV cannulation', sizes: ['24', '22', '20', '18', '16'] },
      io: { name: 'IO access', sizes: ['Large', 'Medium', 'Small'] },
      opa: { name: 'OPA', sizes: ['0', '1', '2', '3', '4', '5'] },
      npa: { name: 'NPA', sizes: ['6', '7', '8'] },
      igel: { name: 'iGel', sizes: ['1', '1.5', '2', '2.5', '3', '4', '5'] },
      laryngoscopy: { name: 'Laryngoscopy', sizes: ['00', '0', '1', '2', '3', '4', '5'] },
      intubation: { name: 'Intubation', sizes: ['3', '4', '5', '6', '7', '8', '9'] },
    },

    // Laryngoscope blade choices, by method.
    blades: {
      Video: ['1', '2', '3', '4', 'X blade'],
      Direct: ['Mac 1', 'Mac 2', 'Mac 3', 'Mac 4', 'Miller 0', 'Miller 1', 'Miller 2'],
    },

    maxTubeSizeMm: 12, // a recorded intubation tube size must be above 0 and no more than this

    // IV / IO access site choices.
    sites: {
      iv: ['ACF', 'Forearm', 'Hand', 'Foot', 'EJ'],
      io: ['Proximal tibia', 'Proximal humerus', 'Distal Femur'],
    },

    // Colours shown beside cannula, IO and iGel sizes.
    colours: {
      iv: { 24: '#f4cc28', 22: '#439be0', 20: '#ef99ba', 18: '#68b88b', 16: '#aeb2b3' },
      io: { Large: '#f4cc28', Medium: '#439be0', Small: '#ef99ba' },
      igel: {
        1: '#ef99ba',
        1.5: '#88c9ee',
        2: '#aeb2b3',
        2.5: '#fff',
        3: '#f4cc28',
        4: '#68b88b',
        5: '#ee9b43',
      },
    },

    // iGel weight ranges in kg (Intersurgical product information); maxKg null = and above.
    igelRanges: [
      { size: '1', minKg: 2, maxKg: 5 },
      { size: '1.5', minKg: 5, maxKg: 12 },
      { size: '2', minKg: 10, maxKg: 25 },
      { size: '2.5', minKg: 25, maxKg: 35 },
      { size: '3', minKg: 30, maxKg: 60 },
      { size: '4', minKg: 50, maxKg: 90 },
      { size: '5', minKg: 90, maxKg: null },
    ],
  },

  /* ===== PART 5: SOURCES ===== */
  sources: {
    name: 'NZ EAS clinical practice guidelines',
    summary: 'EAS 3.14 (cardiac arrest), EAS 7.2 (paediatric tables), EAS 14.27 (magnesium)',
    exportDate: '24 September 2026', // date of the packaged guideline PDFs
    reversibleCauses: 'ANZCOR 11.2',
    igel: 'Intersurgical product information',

    // Guidelines the app links to: EAS code, label, PDF packaged with the app (offline) and web page.
    guidelines: {
      cardiacArrest: {
        code: '3.14',
        label: 'Cardiac arrest',
        pdf: 'cpg-cardiac-arrest.pdf',
        offlinePage: 2, // the flowchart page
        web: 'https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/cardiac-arrest-eas',
      },
      postRosc: { code: '3.15', label: 'Post ROSC', pdf: 'cpg-post-rosc.pdf' },
      paediatric: { code: '7.2', label: 'Paediatric equipment & doses', pdf: 'cpg-paediatric-equipment.pdf' },
      rsi: { code: '9.3', label: 'RSI', pdf: 'cpg-rsi.pdf' },
      adrenaline: { code: '14.3', pdf: 'cpg-drugs/eas-14-3.pdf' },
      amiodarone: { code: '14.4', pdf: 'cpg-drugs/eas-14-4.pdf' },
      magnesium: { code: '14.27', web: 'https://cpg.stjohn.org.nz/tabs/medicines/page/magnesium-sulphate-eas' },
    },

    // Links listed in the Guidance & sources pop-up, in this order.
    guidanceLinks: ['cardiacArrest', 'postRosc', 'paediatric', 'rsi'],
  },
};
