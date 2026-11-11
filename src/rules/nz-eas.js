/* CLINICAL RULES FILE: NZ EAS clinical practice guidelines (packaged exports 24 September 2026).

   Every clinical number the engine uses lives here, so the rules can be checked against the
   guideline in one place. This file is plain data (no program logic), so a future rules editor
   can read and write it, and other services can have their own copy.

   Do not change a value without the owner's approval (see docs/07, A-table).
   tests/rules-file.test.mjs checks every value below against the guideline tables. */

export const RULES = {
  name: 'NZ EAS clinical practice guidelines',
  sources: 'EAS 3.14 (cardiac arrest), EAS 7.2 (paediatric tables), EAS 14.27 (magnesium)',

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
};
