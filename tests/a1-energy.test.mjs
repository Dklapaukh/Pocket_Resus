// A1 (owner-approved 3 Nov 2026): shock energy = 4 J/kg of the CPG weight band (5/10/20/30/40 kg, rounded up),
// 200 J above 40 kg, weights under 5 kg use the 5 kg band. Pads prompt rule stays "energy <= 100 J".
import test from 'node:test';
import assert from 'node:assert/strict';
import { ported as R } from './helpers/engines.mjs';

test('A1: shock energy is 4 J/kg of the weight band, rounded up, capped at 200 J', () => {
  const want = { '0.1': 20, '4': 20, '5': 20, '5.1': 40, '10': 40, '10.1': 80, '15': 80, '20': 80, '25': 120, '30': 120,
    '35': 160, '40': 160, '40.1': 200, '42': 200, '60': 200, '4,5': 20 };
  for (const [w, j] of Object.entries(want)) assert.equal(R.joules(w), j, w + ' kg');
  for (const w of ['', '0', 'abc', '500.1']) assert.equal(R.joules(w), null, JSON.stringify(w));
  assert.equal(R.shockEnergy({ weight: '' }), 200);
});

test('A1: paediatric pads prompt (energy 100 J or less) now covers weights up to 20 kg only', () => {
  assert.equal(R.needsPaediatricPads('20'), true);
  assert.equal(R.needsPaediatricPads('20.1'), false);
  assert.equal(R.needsPaediatricPads('25'), false);
  assert.equal(R.needsPaediatricPads('3'), true);
});
