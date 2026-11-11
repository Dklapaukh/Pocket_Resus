// The clinical rules file (src/rules/nz-eas.js) checked value by value against the bundled NZ EAS
// guideline PDFs (exports dated 24 Sep 2026). If a guideline changes, update the rules file AND this
// test together, with the owner's approval recorded in docs/07. Page references are for auditors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/rules/nz-eas.js';

test('EAS 7.2 paediatric table: adrenaline, amiodarone, magnesium per weight band', () => {
  // cpg-paediatric-equipment.pdf, cardiac arrest tables by band (5 / 10 / 20 / 30 / 40 kg)
  assert.deepEqual(RULES.numbers.childBands.map(b => [b.maxKg, b.adrenalineMg, b.amiodaroneFirstMg, b.magnesiumMmol]), [
    [5, 0.05, 25, null], // no magnesium listed
    [10, 0.1, 50, null], // no magnesium listed
    [20, 0.2, 100, 4],
    [30, 0.3, 150, 6],
    [40, 0.4, 200, 8],
  ]);
});

test('second amiodarone dose for children is half the first (app rule; no EAS source, see C6b)', () => {
  for (const b of RULES.numbers.childBands) assert.equal(b.amiodaroneSecondMg, b.amiodaroneFirstMg / 2);
});

test('shock energy: 4 J/kg of the band, the bottom of each EAS 7.2 range (change A1); adult 200 J', () => {
  // EAS 7.2 ranges: 20-25, 40-50, 80-100, 120-150, 160-200 J
  assert.deepEqual(RULES.numbers.childBands.map(b => b.shockJ), [20, 40, 80, 120, 160]);
  for (const b of RULES.numbers.childBands) assert.equal(b.shockJ, b.maxKg * 4);
  assert.equal(RULES.numbers.adult.shockJ, 200);
  assert.equal(RULES.numbers.shock.paediatricPadsUpToJ, 100);
});

test('EAS 3.14 adult references and timings', () => {
  // cpg-cardiac-arrest.pdf: adrenaline 1 mg; amiodarone 300 mg then 150 mg; magnesium 10 mmol; fluids 1-2 L
  assert.deepEqual(
    [RULES.numbers.adult.adrenalineMg, RULES.numbers.adult.amiodaroneFirstMg, RULES.numbers.adult.amiodaroneSecondMg, RULES.numbers.adult.magnesiumMmol, RULES.numbers.adult.fluidsMinMl, RULES.numbers.adult.fluidsMaxMl],
    [1, 300, 150, 10, 1000, 2000],
  );
  assert.equal(RULES.numbers.timing.cprCycleMs, 2 * 60 * 1000);
  assert.equal(RULES.numbers.timing.adrenalineIntervalMs, 4 * 60 * 1000);
  assert.deepEqual([RULES.numbers.child.fluidsMinMlPerKg, RULES.numbers.child.fluidsMaxMlPerKg], [20, 40]);
});

test('weight bands round up and adult starts above 40 kg', () => {
  assert.deepEqual(RULES.numbers.childBands.map(b => b.maxKg), [5, 10, 20, 30, 40]);
  assert.equal(RULES.numbers.weight.adultAboveKg, 40);
});

test('the rules file is plain data (no functions), so an editor can read and write it', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(RULES)), RULES);
});

// Doc 07 step 2 (12 Nov 2026): app rules moved into the rules file. These are owner rulings, not EAS
// table values; each is pinned so a change needs the owner's approval and this test updated with it.
test('lower drug card (A2c, A7): fluids after PEA, Asystole or Other; VF/VT/Torsades bring amiodarone back', () => {
  assert.deepEqual(RULES.numbers.lowerCard, { fluidRhythms: ['PEA', 'Asystole', 'Other'], amiodaroneRhythms: ['VF', 'VT', 'Torsades'] });
});

test('amiodarone due at 3 shocks, second dose at 6, two doses at most (A2, A2b, C6b-2)', () => {
  assert.deepEqual(RULES.numbers.amiodarone.dueAtShocks, [3, 6]);
});

test('double-tap locks (A5): adrenaline 3 min 30 s, magnesium and fluids 5 s', () => {
  assert.deepEqual(RULES.numbers.doubleTapLockMs, { adrenaline: 210000, magnesium: 5000, fluids: 5000 });
});

const AGE_GAPS = ['underOneYearKg', 'tenMaxAge', 'tenAddYears', 'tenMultiplyBy', 'fourteenFromAge', 'fourteenMaxAge', 'fourteenMultiplyBy'];
test('reference wording is plain text, and every {gap} is one the app fills', () => {
  const gaps = { adultDoseBasis: ['adultAboveKg'], childDoseBasis: ['band'], childMagnesiumBasis: ['band'], noMagnesiumDoseBasis: ['band'],
    childFluidBasis: ['minPerKg', 'maxPerKg'], amiodaroneNotYetDue: ['first', 'second'], amiodaroneSecondNotYetDue: ['second'], invalidWeight: ['maxKg'],
    weightSheetAgeEstimate: AGE_GAPS, tubeSheetAgeEstimate: AGE_GAPS,
    tubeSizeUnderOne: ['minMm', 'maxMm'], tubeLengthUnderOne: ['timesSize'], tubeSizeFormula: ['mm'], tubeLengthFormula: ['cm'],
    // step 3a sub-step 4: wording moved from the app; gaps filled from part 1 by the engine (wordingGaps)
    headerEnergyTitle: ['joulesPerKg', 'adultShockJ'], padsPromptWithLimit: ['padsUpToJ'], estimateAgeError: ['fourteenMaxAge'],
    estimatedWeightSource: ['age'], adrenalineOverdue: ['adrenalineEveryMin'], adrenalineUntilReview: ['adrenalineEveryMin'],
    amiodaroneReviewAt: ['shocks'], maxDosesRecorded: ['maxDoses'], magnesiumMaxDosesStatus: ['magnesiumMaxDoses'], fluidsCardTitle: ['fluidShort'],
    amiodaroneChildPopupDose: ['first'], amiodaroneAdultPopupDose: ['first', 'second'],
    adrenalineHow: ['adrenalineEveryMin', 'adultRoundedToKg', 'adultAboveKg', 'adrDiluteMg', 'adrDiluteMl', 'fluid', 'adrDiluteMgPerMl'],
    amiodaroneHow: ['amiodaroneFirstShocks', 'amiodaroneSecondShocks'], drugPopupFooter: ['guideline'],
    torsadesExtract: ['adultMagnesiumMmol', 'magAdultGrams', 'magOverMinMinutes', 'magOverMaxMinutes'], fluidsExtractQuote: ['fluid'],
    fluidsExtract: ['adultFluidsMinL', 'adultFluidsMaxL', 'childFluidsMinPerKg', 'childFluidsMaxPerKg'],
    magnesiumHow: ['adultMagnesiumMmol', 'fluid', 'magAdultDiluteToMl', 'magOverMinMinutes', 'magOverMaxMinutes', 'magChildMmolPerMl', 'magAmpouleMl', 'magAmpouleMmol', 'magAmpouleMl', 'magChildDiluteToMl'],
    guidanceIntro: ['cprCycleMinWord', 'adrenalineEveryMin', 'amiodaroneFirstShocks', 'amiodaroneSecondShocks', 'bandList', 'joulesPerKg', 'adultShockJ'],
    guidanceCaption: ['exportDate', 'reversibleCauses'], igelSourceCaption: ['igel'],
    guidanceRsi: ['fentanylMcgPerKg', 'fentanylMaxMcg', 'ketamineMgPerKg', 'ketamineMaxMg', 'reducedKetamineMgPerKg', 'blockerMgPerKg', 'blockerMaxMg', 'blockerRoundMg'] };
  for (const [key, entry] of Object.entries(RULES.wording)) {
    const texts = [].concat(entry); // a list = one paragraph per item
    assert.ok(texts.length > 0, key);
    for (const text of texts) {
      assert.equal(typeof text, 'string', key);
      assert.ok(text.trim().length > 0, key + ' is empty');
      assert.deepEqual([...text.matchAll(/<\/?(\w+)/g)].map((m) => m[1]).filter((tag) => !['b', 'em', 'br'].includes(tag)), [], key + ': only <b>, <em>, <br>');
    }
    assert.deepEqual([...texts.join(' ').matchAll(/\{(\w+)\}/g)].map((m) => m[1]), gaps[key] || [], key);
  }
});

test('each child band energy is joulesPerKg x band weight (A1), so the wording and the bands cannot disagree', () => {
  assert.equal(RULES.numbers.shock.joulesPerKg, 4);
  for (const b of RULES.numbers.childBands) assert.equal(b.shockJ, b.maxKg * RULES.numbers.shock.joulesPerKg);
});

test('magnesium: one dose and a single repeat at most; preparation values (EAS 3.14, 14.27, 7.2; EAS 14.3 adrenaline)', () => {
  assert.equal(RULES.numbers.magnesium.maxDoses, 2);
  assert.deepEqual(RULES.numbers.preparation, {
    adrenalineChild: { drugMg: 1, totalMl: 10 },
    magnesium: { adultGrams: 2.5, adultDiluteToMl: 10, overMinMinutes: 1, overMaxMinutes: 2, ampouleMmol: 10, ampouleMl: 5, childDiluteToMl: 10 },
  });
  assert.deepEqual(RULES.numbers.products, { fluid: '0.9% sodium chloride', fluidShort: 'NaCl 0.9%' });
  assert.equal(RULES.numbers.weight.adultRoundedToKg, 50);
});

test('the rule set has exactly the five parts, in order (owner decision 2, doc 18)', () => {
  assert.deepEqual(Object.keys(RULES), ['numbers', 'wording', 'checklists', 'equipment', 'sources']);
});
