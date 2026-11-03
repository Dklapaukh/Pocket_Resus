// A2b (owner rule, 3 Nov 2026): the amiodarone card opens when the shock counter reaches 3 (second dose at 6),
// whatever the current rhythm, and never once torsades has been recorded. Lower slot: PEA at the latest check =
// fluids; torsades history = magnesium; a later VF/VT can bring amiodarone back only if there was no torsades.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

const MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
const shock = (a, rhythm = 'VF') => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); a.click(`[data-record-rhythm=${rhythm}]`); };
const torsadesShock = a => { shock(a, 'Torsades'); a.click('[data-confirm-torsades]'); };
const noShock = (a, rhythm) => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); a.click(`[data-record-rhythm="${rhythm}"]`); };
const previous = a => a.click('[data-action=previous-shock]');
const start = (a, kg = '70') => { weight(a, kg); a.click('[data-action=start]'); };
const main = a => a.surfaces().main;
const pending = a => main(a).includes('id="amiodaronePending"');
const amio = a => main(a).includes('id="amiodaroneCard"');
const fluids = a => main(a).includes('id="fluidsCard"');
const magnesium = a => main(a).includes('id="magnesiumCard"');

test('A2b: three "+ Previous shock" taps (rhythm not recorded) open the card', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  previous(a); previous(a); assert.ok(pending(a));
  previous(a); assert.ok(amio(a)); assert.match(main(a), /300 mg IV/);
});

test('A2b: a mix of recorded and previous shocks counts', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  previous(a); previous(a); shock(a, 'VF'); assert.ok(amio(a));
});

test('A2b: 3 shocks then asystole recorded: the card stays open (current rhythm does not matter)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); shock(a); noShock(a, 'Asystole');
  assert.ok(amio(a) && !pending(a) && !fluids(a) && !magnesium(a));
  assert.match(main(a), /data-drug="amiodarone"\s*>/);
});

test('A2b: asystole as the current rhythm with only 2 shocks keeps the grey tile', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); noShock(a, 'Asystole'); assert.ok(pending(a) && !amio(a));
});

test('A2b: PEA at the latest check turns the lower card into fluids; a later VF replaces it with amiodarone', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); shock(a); noShock(a, 'PEA'); assert.ok(fluids(a) && !amio(a));
  shock(a, 'VF'); assert.ok(amio(a) && !fluids(a));
});

test('A2b: PEA with fewer than 3 shocks, then VF: fluids first, then the grey tile (not yet due)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  noShock(a, 'PEA'); assert.ok(fluids(a)); shock(a, 'VF'); assert.ok(pending(a));
});

test('A2b: torsades at any point: magnesium holds the lower slot, amiodarone never appears', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); torsadesShock(a); assert.ok(magnesium(a) && !amio(a) && !pending(a));
  shock(a, 'VF'); shock(a, 'VF'); assert.ok(magnesium(a) && !amio(a), '3+ shocks must not bring amiodarone back');
  noShock(a, 'Asystole'); assert.ok(magnesium(a) && !amio(a));
});

test('A2b: torsades, then PEA, then VF: fluids for PEA, then back to magnesium (never amiodarone)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); torsadesShock(a); noShock(a, 'PEA'); assert.ok(fluids(a));
  shock(a, 'VF'); assert.ok(magnesium(a) && !amio(a));
});

test('A2b: torsades after the card was already showing: card is replaced by magnesium and cannot record', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); shock(a); assert.ok(amio(a)); torsadesShock(a); assert.ok(magnesium(a) && !amio(a));
});

test('A2b: second dose is due at 6 shocks whatever the current rhythm (one dose given, asystole recorded)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]');
  shock(a); shock(a); shock(a); noShock(a, 'Asystole');
  assert.ok(amio(a)); assert.match(main(a), /Review second dose/);
});
