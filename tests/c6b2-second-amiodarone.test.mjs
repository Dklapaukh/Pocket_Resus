// C6b-2 (owner ruling 3 Nov 2026): the second amiodarone dose is only an option from the 6th shock.
// Child between dose 1 and 6 shocks: "Seek clinical advice" + "Select dose" (option A: type the dose, nothing suggested).
// Adult between dose 1 and 6 shocks: no number and no Record button either.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

const MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
const shock = a => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); a.click('[data-record-rhythm=VF]'); };
const start = (a, kg) => { weight(a, kg); a.click('[data-action=start]'); };
const card = a => { const m = a.surfaces().main, i = m.indexOf('id="amiodaroneCard"'); return i < 0 ? '' : m.slice(i, m.indexOf('</section>', i)); };
const stored = a => a.surfaces().stored;

test('C6b-2: child, dose 1 given, 3 shocks: Seek clinical advice + Select dose; no number, no Record button', () => {
  const a = openApp({ appDir: ROOT }); start(a, '15'); shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]');
  const h = card(a);
  assert.match(h, /<div class="drug-dose child">Seek clinical advice<\/div>/);
  assert.match(h, /data-select-dose="amiodarone">Select dose<\/button>/);
  assert.ok(!/ mg IV<\/div>/.test(h) && !/data-drug="amiodarone"/.test(h) && !/Record \d/.test(h));
  assert.ok(h.includes('data-custom-drug="amiodarone"'));
});

test('C6b-2: Select dose opens a pop-up with an empty dose box and records what is typed as an amiodarone dose', () => {
  const a = openApp({ appDir: ROOT }); start(a, '15'); shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]'); shock(a);
  a.click('[data-select-dose=amiodarone]');
  const sh = a.surfaces().sheet;
  assert.match(sh, /Select amiodarone dose/); assert.match(sh, /name="dose"[^>]*placeholder="mg"/); assert.ok(!/ value="\d/.test(sh.split('name="dose"')[1].split('>')[0]), 'dose box is empty');
  assert.ok(!/ 50 | 50<|2\.5/.test(sh), 'no suggested value');
});

test('C6b-2: at the 6th shock a child card is disabled "Seek clinical advice" (no Select dose)', () => {
  const a = openApp({ appDir: ROOT }); start(a, '15'); shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]'); shock(a); shock(a); shock(a);
  const h = card(a);
  assert.match(h, /<button class="record" data-drug="amiodarone" disabled="">Seek clinical advice<\/button>/);
  assert.ok(!h.includes('data-select-dose'));
});

test('C6b-2: adult, dose 1 given, before 6 shocks: no 150 mg, no Record; at 6 shocks 150 mg is offered', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70'); shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]'); shock(a);
  let h = card(a);
  assert.ok(!/150 mg/.test(h) && !h.includes('data-select-dose'));
  assert.match(h, /Due after 6 shocks/);
  assert.match(h, /data-drug="amiodarone" disabled="">Not yet due<\/button>/);
  const before = stored(a); a.click('[data-drug=amiodarone]'); assert.equal(stored(a), before, 'tapping records nothing');
  shock(a); shock(a);
  h = card(a); assert.match(h, /150 mg IV/); assert.match(h, /Record 150 mg IV/);
});

test('C6b-2: "Previous shock" taps count towards 6 for the second dose', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70'); shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]');
  for (let i = 0; i < 3; i++) a.click('[data-action=previous-shock]');
  assert.match(card(a), /Record 150 mg IV/);
});
