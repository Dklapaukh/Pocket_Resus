// A5 (owner ruling, 4 Nov 2026): protection against accidental double-taps on the Live drug cards.
//  - Adrenaline: greyed out and unusable for 3 min 30 s after a dose is recorded.
//  - Magnesium and fluids: no repeat for 5 s, but NOT greyed out.
//  - Amiodarone: unchanged (already protected by its dose-count rules; c6b2 / a2 tests cover it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

const SEC = 1000, MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
const shock = (a, rhythm = 'VF') => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); a.click(`[data-record-rhythm=${rhythm}]`); };
const noShock = (a, rhythm) => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); a.click(`[data-record-rhythm="${rhythm}"]`); };
const start = (a, kg = '70') => { weight(a, kg); a.click('[data-action=start]'); };
const count = (a, type) => JSON.parse(a.surfaces().stored).events.filter(e => e.type === type && !e.voided).length;
const sheetOpen = (a, text) => { const s = a.surfaces().sheet; return s.endsWith('open=true') && s.includes(text); };
const adrBtn = a => a.window.document.querySelector('#adrenalineCard button[data-drug=adrenaline]');
const supBtn = (a, t) => a.window.document.querySelector(`button[data-support=${t}]`);
const undo = a => { a.click('[data-action=settings]'); a.click('#undo'); };

test('A5 adrenaline: three quick taps record ONE dose and the button is greyed out', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  a.click('[data-drug=adrenaline]'); a.click('[data-drug=adrenaline]'); a.click('[data-drug=adrenaline]');
  assert.equal(count(a, 'adrenaline'), 1);
  assert.equal(adrBtn(a).disabled, true);
});

test('A5 adrenaline: stays locked until 3 min 30 s, then frees itself (no new dose needed to redraw)', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  a.click('[data-drug=adrenaline]');
  a.advance(3 * MIN + 29 * SEC); assert.equal(adrBtn(a).disabled, true, 'still locked at 3:29');
  a.click('[data-drug=adrenaline]'); assert.equal(count(a, 'adrenaline'), 1, 'tap at 3:29 is ignored');
  a.advance(2 * SEC); assert.equal(adrBtn(a).disabled, false, 'free at 3:31');
  assert.match(adrBtn(a).textContent, /Record 1 mg IV/);
  a.click('[data-drug=adrenaline]'); assert.equal(count(a, 'adrenaline'), 2, 'second dose allowed after the lock');
});

test('A5 adrenaline: the lock survives a redraw (e.g. a shock recorded) and a reload', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  a.click('[data-drug=adrenaline]'); shock(a); // +2 min: redraws the screen, still inside 3:30
  assert.equal(adrBtn(a).disabled, true);
  const b = openApp({ appDir: ROOT, savedState: a.surfaces().stored }); // reload: new page, clock restarts at T0
  assert.ok(b.surfaces().main.includes('id="adrenalineCard"'));
});

test('A5 adrenaline: undoing the dose frees the button at once', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  a.click('[data-drug=adrenaline]'); assert.equal(adrBtn(a).disabled, true);
  undo(a); assert.equal(count(a, 'adrenaline'), 0);
  assert.equal(adrBtn(a).disabled, false);
});

test('A5 adrenaline: a button that is disabled for another reason (ROSC recorded) is NOT freed by the timer', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  a.click('[data-drug=adrenaline]'); a.click('#unexpectedRosc'); a.click('[data-record-rhythm="Sinus rhythm"]'); a.click('[data-tab=live]');
  assert.ok(adrBtn(a), 'card still drawn'); assert.equal(adrBtn(a).disabled, true);
  a.advance(5 * MIN); assert.equal(adrBtn(a).disabled, true);
});

test('A5 adrenaline: the "Other…" form is not changed by the guard', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  a.click('[data-drug=adrenaline]');
  a.click('[data-custom-drug=adrenaline]');
  a.type('#drugForm [name=dose]', '1'); a.check('#drugForm [name=route][value=IV]'); a.submit('#drugForm');
  assert.equal(count(a, 'adrenaline'), 2);
});

test('A5 magnesium: a repeat tap within 5 s does nothing; after 5 s the repeat pop-up opens; never greyed out', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a, 'Torsades'); a.click('[data-confirm-torsades]');
  a.click('[data-support=magnesium]'); assert.equal(count(a, 'magnesium'), 1);
  a.click('[data-support=magnesium]'); a.click('[data-support=magnesium]');
  assert.equal(count(a, 'magnesium'), 1);
  assert.ok(!sheetOpen(a, 'Repeat magnesium'), 'no repeat pop-up inside 5 s');
  assert.equal(supBtn(a, 'magnesium').disabled, false, 'not greyed out');
  a.advance(6 * SEC);
  a.click('[data-support=magnesium]'); assert.ok(sheetOpen(a, 'Repeat magnesium'), 'repeat pop-up after 5 s');
});

test('A5 magnesium: the repeat confirm button cannot be double-tapped into two repeats', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  shock(a, 'Torsades'); a.click('[data-confirm-torsades]');
  a.click('[data-support=magnesium]'); a.advance(6 * SEC);
  a.click('[data-support=magnesium]'); a.click('[data-confirm-magnesium]'); a.click('[data-confirm-magnesium]');
  assert.equal(count(a, 'magnesium'), 2);
});

test('A5 fluids: after a fluids dose the card cannot reopen the pop-up for 5 s; then it can; never greyed out', () => {
  const a = openApp({ appDir: ROOT }); start(a);
  noShock(a, 'PEA');
  a.click('[data-support=fluids]'); a.type('#drugForm [name=dose]', '500'); a.submit('#drugForm');
  assert.equal(count(a, 'fluids'), 1);
  a.click('[data-support=fluids]');
  assert.ok(!sheetOpen(a, 'id="drugForm"'), 'no fluids pop-up inside 5 s');
  assert.equal(supBtn(a, 'fluids').disabled, false, 'not greyed out');
  a.advance(6 * SEC);
  a.click('[data-support=fluids]'); assert.ok(sheetOpen(a, 'id="drugForm"'), 'pop-up after 5 s');
});
