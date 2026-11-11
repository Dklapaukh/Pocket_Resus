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
       Rhythms in neither list ("Unknown", ROSC rhythms) are ignored. */
    lowerCard: {
      fluidRhythms: ['PEA', 'Asystole', 'Other'],
      amiodaroneRhythms: ['VF', 'VT', 'Torsades'],
    },

    /* Amiodarone doses become due at these shock counts (earlier shocks count): first dose at 3,
       second at 6 (A2, A2b, C6b-2). The number of entries is the maximum number of doses. */
    amiodarone: {
      dueAtShocks: [3, 6],
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
    // Tube sheet results; gaps come from numbers.tubes
    tubeSizeUnderOne: '{minMm}–{maxMm} mm',
    tubeLengthUnderOne: 'ETT size × {timesSize} cm',
    tubeSizeFormula: '{mm} mm (formula)',
    tubeLengthFormula: '{cm} cm (formula)',
    // Age-estimate captions (weight sheet, tube sheet); gaps come from numbers.ageEstimate
    weightSheetAgeEstimate: 'Under 1 year: {underOneYearKg} kg. 1–{tenMaxAge} years: (age + {tenAddYears}) × {tenMultiplyBy}. {fourteenFromAge}–{fourteenMaxAge}: age × {fourteenMultiplyBy}. CPG 7.2; estimates may underestimate. Excludes newborn resuscitation.',
    tubeSheetAgeEstimate: 'Under 1 year: {underOneYearKg} kg. Ages 1–{tenMaxAge}: (age + {tenAddYears}) × {tenMultiplyBy} kg. Ages {fourteenFromAge}–{fourteenMaxAge}: age × {fourteenMultiplyBy} kg. Estimates may underestimate actual weight.',
  },

  /* ===== PART 3: CHECKLISTS AND REVERSIBLE CAUSES (filled in step 3a, sub-step 5) ===== */
  checklists: {},

  /* ===== PART 4: EQUIPMENT (filled in step 3a, sub-step 6) ===== */
  equipment: {},

  /* ===== PART 5: SOURCES ===== */
  sources: {
    name: 'NZ EAS clinical practice guidelines',
    summary: 'EAS 3.14 (cardiac arrest), EAS 7.2 (paediatric tables), EAS 14.27 (magnesium)',
  },
};
