// The clinical rules file (src/rules/nz-eas.js) checked value by value against the bundled NZ EAS
// guideline PDFs (exports dated 24 Sep 2026). If a guideline changes, update the rules file AND this
// test together, with the owner's approval recorded in docs/07. Page references are for auditors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/rules/nz-eas.js';

test('EAS 7.2 paediatric table: adrenaline, amiodarone, magnesium per weight band', () => {
  // cpg-paediatric-equipment.pdf, cardiac arrest tables by band (5 / 10 / 20 / 30 / 40 kg)
  assert.deepEqual(RULES.childBands.map(b => [b.maxKg, b.adrenalineMg, b.amiodaroneFirstMg, b.magnesiumMmol]), [
    [5, 0.05, 25, null], // no magnesium listed
    [10, 0.1, 50, null], // no magnesium listed
    [20, 0.2, 100, 4],
    [30, 0.3, 150, 6],
    [40, 0.4, 200, 8],
  ]);
});

test('second amiodarone dose for children is half the first (app rule; no EAS source, see C6b)', () => {
  for (const b of RULES.childBands) assert.equal(b.amiodaroneSecondMg, b.amiodaroneFirstMg / 2);
});

test('shock energy: 4 J/kg of the band, the bottom of each EAS 7.2 range (change A1); adult 200 J', () => {
  // EAS 7.2 ranges: 20-25, 40-50, 80-100, 120-150, 160-200 J
  assert.deepEqual(RULES.childBands.map(b => b.shockJ), [20, 40, 80, 120, 160]);
  for (const b of RULES.childBands) assert.equal(b.shockJ, b.maxKg * 4);
  assert.equal(RULES.adult.shockJ, 200);
  assert.equal(RULES.shock.paediatricPadsUpToJ, 100);
});

test('EAS 3.14 adult references and timings', () => {
  // cpg-cardiac-arrest.pdf: adrenaline 1 mg; amiodarone 300 mg then 150 mg; magnesium 10 mmol; fluids 1-2 L
  assert.deepEqual(
    [RULES.adult.adrenalineMg, RULES.adult.amiodaroneFirstMg, RULES.adult.amiodaroneSecondMg, RULES.adult.magnesiumMmol, RULES.adult.fluidsMinMl, RULES.adult.fluidsMaxMl],
    [1, 300, 150, 10, 1000, 2000],
  );
  assert.equal(RULES.timing.cprCycleMs, 2 * 60 * 1000);
  assert.equal(RULES.timing.adrenalineIntervalMs, 4 * 60 * 1000);
  assert.deepEqual([RULES.child.fluidsMinMlPerKg, RULES.child.fluidsMaxMlPerKg], [20, 40]);
});

test('weight bands round up and adult starts above 40 kg', () => {
  assert.deepEqual(RULES.childBands.map(b => b.maxKg), [5, 10, 20, 30, 40]);
  assert.equal(RULES.weight.adultAboveKg, 40);
});

test('the rules file is plain data (no functions), so an editor can read and write it', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(RULES)), RULES);
});
