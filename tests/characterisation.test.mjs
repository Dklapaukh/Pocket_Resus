// Plain-English record of CURRENT behaviour (parity first). Items marked [A1]/[A2] are approved to change
// LATER, one at a time, with owner sign-off; update the matching test in that same change.
import test from 'node:test';
import assert from 'node:assert/strict';
import { original, ported } from './helpers/engines.mjs';
for (const [name, R] of [['original', original], ['ported', ported]]) {
  test(name + ': weight bands for drugs round UP (41 kg = adult 50 kg band, 5.1 kg = 10 kg band)', () => {
    assert.equal(R.dose({ weight: '41' }).adr, 1);
    assert.equal(R.dose({ weight: '40' }).adr, 0.4);
    assert.equal(R.dose({ weight: '5.1' }).adr, 0.1);
    assert.equal(R.dose({ weight: '' }).amio1, 300);
  });
  test(name + ': [A1] shock energy today = exact weight x 4 J/kg, capped at 200 J', () => {
    assert.equal(R.joules('42'), 168); assert.equal(R.joules('25'), 100); assert.equal(R.joules('5.1'), 20.4);
    assert.equal(R.joules('41'), 164); assert.equal(R.joules('60'), 200); assert.equal(R.joules('abc'), null);
    assert.equal(R.shockEnergy({ weight: '' }), 200);
  });
  test(name + ': [A1-linked, C3] paediatric pads prompt when energy is 100 J or less', () => {
    assert.equal(R.needsPaediatricPads('25'), true); assert.equal(R.needsPaediatricPads('26'), false);
  });
  test(name + ': [C4] weights under 5 kg are accepted and use the 5 kg band', () => {
    assert.equal(R.validWeight('0.1'), true); assert.equal(R.dose({ weight: '0.1' }).adr, 0.05);
  });
  test(name + ': 40 kg or less counts as a child; magnesium bands 20/30/40 = 4/6/8, none listed for 5 and 10 kg', () => {
    assert.equal(R.isPaediatric({ weight: '40' }), true); assert.equal(R.isPaediatric({ weight: '40.1' }), false);
    assert.deepEqual([20, 30, 40].map(w => R.magnesiumReference({ weight: String(w) }).dose), [4, 6, 8]);
    assert.equal(R.magnesiumReference({ weight: '10' }).dose, null);
  });
  test(name + ': rhythm check is only allowed once the 2:00 timer has run out', () => {
    const s = R.fresh(0); s.weight = '70'; R.begin(s, 0);
    assert.equal(R.canRhythmCheck(s, 119000), false); assert.equal(R.canRhythmCheck(s, 120000), true);
  });
  test(name + ': [C5] amiodarone/care mode: VF/VT = amiodarone, PEA = fluids, any torsades history = magnesium', () => {
    const s = R.fresh(0); s.weight = '70'; R.begin(s, 0); let n = 0;
    const go = (o, r) => { n += 120000; const id = R.startOutcome(s, o, n); R.completeOutcome(s, id, r, o === 'shock' ? '200' : ''); return R.careMode(s); };
    assert.equal(go('shock', 'VF'), 'amiodarone'); assert.equal(go('shock', 'Torsades'), 'magnesium');
    assert.equal(go('noshock', 'PEA'), 'fluids');
  });
}
