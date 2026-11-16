// CARD ENGINE (cards plan step C3, CARDS-DESIGN.md section 2): src/cards/engine.js, the one routine that answers
// "which cards show now?". Every condition is tested true and false, then the group rule, the dose look-up (adult,
// each child band, a "-" cell, child lines, the RSI columns), on_request, the special-situation switch, voided
// events, and every card field the engine returns. Sessions are built with the app's own recording routines
// (tests/helpers/card-sessions.mjs), so they are exactly what the app saves.
// Step C4 (owner decisions 22 and 23): the shock energy header is an "always" card (23a), shown with or without an
// arrest; lines marked trace_only in the card file (A37) are never returned; header cards are marked "manual review"
// under the special-situation switch. The tests below that changed with these rulings say so where they changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/engine/core.js';
import * as drugCards from '../src/engine/drug-cards.js';
import { cardsNow, patientNow, latestRhythm, shockCount, doseCount } from '../src/cards/engine.js';
import { readCardFile } from '../src/cards/check.js';
import { arrest, texts, CARDS, CARD_TEXT, MIN, T0, MAX_WEIGHT_KG, fileLines } from './helpers/card-sessions.mjs';

const AUTOMATIC = ['cpr-clock', 'shock-energy', 'adrenaline', 'amiodarone-2', 'amiodarone-1', 'magnesium', 'fluids'];
const ON_REQUEST = ['guidance-intro', 'reversible-causes', 'special-situations', 'weight-from-age', 'tubes-lma', 'rsi'];
const ALWAYS = ['cpr-clock', 'shock-energy', 'adrenaline']; // shown whenever the arrest runs (no other condition)
const AT_ALL_TIMES = ['shock-energy']; // show_when: [always] (owner decision 23a)
const lower = (c) => c.at('lower');

/* ---------- 1. arrest_running ---------- */

test('arrest_running: before CPR is started only the always card (shock energy, decision 23a); the three always-on cards once it is', () => {
  assert.deepEqual(arrest({ start: false }).ids(), AT_ALL_TIMES);
  assert.deepEqual(arrest().ids(), ALWAYS);
});

test('arrest_running: false after ROSC and after the end; true again after a re-arrest', () => {
  const c = arrest().shock('VF');
  c.rosc();
  assert.deepEqual(c.ids(), AT_ALL_TIMES, 'decision 23a: the shock energy header stays');
  c.rearrest();
  assert.deepEqual(c.ids(), [...ALWAYS]);
  c.end();
  assert.deepEqual(c.ids(), AT_ALL_TIMES);
});

test('always (decision 23a): the shock energy card shows before CPR, during the arrest, after ROSC and after the end, with its dose', () => {
  for (const c of [arrest({ start: false, weight: '15' }), arrest({ weight: '15' }), arrest({ weight: '15' }).shock().rosc(), arrest({ weight: '15' }).end()]) {
    const energy = c.card('shock-energy');
    assert.equal(energy.place, 'header');
    assert.deepEqual(energy.lines, [], 'energy only: its sentence is trace-only (A37 item 3)');
    assert.deepEqual(energy.dose.lines[0].value, [80, 100]);
  }
  assert.deepEqual(CARDS.cards.find((card) => card.id === 'shock-energy').show_when, ['always']);
});

test('trace-only lines (decision 22, A37) are never returned: what the engine returns is exactly the drawn lines of the file', () => {
  const drawn = (list) => [].concat(list ?? []).filter((line) => line.trace_only !== true);
  const runs = [arrest({ weight: '70' }).shock().shock().shock(), arrest({ weight: '15' }).shock().shock().shock().dose('amiodarone', 100).shock().shock().shock(),
    arrest({ weight: '70' }).shock('Torsades').dose('magnesium', 10, 'mmol'), arrest({ weight: '20' }).shock('Torsades').noShock('PEA'), arrest().noShock('PEA')];
  let traceLines = 0;
  for (const c of runs) {
    for (const card of c.cards({ request: ON_REQUEST })) {
      const inFile = CARDS.cards.find((f) => f.id === card.id);
      traceLines += [inFile.lines, inFile.details].flat().filter(Boolean).filter((line) => line.trace_only).length;
      assert.deepEqual(texts(card.lines), drawn(inFile.lines).map((l) => l.text ?? l.app_text), card.id + ' lines');
      const details = drawn(inFile.details).filter((l) => !l.only || l.only === card.dose?.who || (!card.dose && l.only === 'adult'));
      assert.deepEqual(texts(card.details), details.map((l) => l.text ?? l.app_text), card.id + ' details');
      if (card.dose) assert.equal(card.dose.lines.length, drawn(inFile.dose[card.dose.who]).length, card.id + ' dose');
      if (card.doses?.confirm.length) assert.equal(card.doses.confirm.length, drawn(inFile.repeat.confirm).length, card.id + ' confirm');
    }
  }
  assert.ok(traceLines > 20, 'the runs reach cards with trace-only lines');
});

/* ---------- 2. latest_rhythm ---------- */

test('latest_rhythm: true for a rhythm in the list (PEA: fluids), false for one that is not (Asystole, VF)', () => {
  assert.deepEqual(lower(arrest().noShock('PEA')), ['fluids']);
  assert.deepEqual(lower(arrest().noShock('Asystole')), []);
  assert.deepEqual(lower(arrest().noShock('PEA').shock('VF')), []);
  assert.deepEqual(lower(arrest().shock('VF').noShock('PEA')), ['fluids']);
});

test('latest_rhythm: a rhythm check whose rhythm was not recorded changes nothing', () => {
  const c = arrest().noShock('PEA').notRecorded('noshock');
  assert.equal(latestRhythm(c.s), 'PEA');
  assert.deepEqual(lower(c), ['fluids']);
  c.notRecorded('shock');
  assert.deepEqual(lower(c), ['fluids']);
  assert.equal(latestRhythm(arrest().notRecorded('shock').s), null);
});

test('latest_rhythm: a rhythm recorded with ROSC is ignored (A8); after a re-arrest the arrest rhythm still decides', () => {
  const c = arrest().noShock('Asystole').rosc('Other').rearrest();
  assert.equal(latestRhythm(c.s), 'Asystole');
  assert.deepEqual(lower(c), []);
  const d = arrest().noShock('PEA').rosc('Sinus rhythm').rearrest();
  assert.deepEqual(lower(d), ['fluids']);
});

test('latest_rhythm: an older saved session whose latest no-shock rhythm is "Other" counts as not PEA (A20)', () => {
  const c = arrest().noShock('PEA').noShock('Other');
  assert.equal(latestRhythm(c.s), 'Other');
  assert.deepEqual(lower(c), []);
});

test('latest_rhythm: a voided rhythm check no longer counts; the one before it decides', () => {
  const c = arrest().noShock('PEA').shock('VF');
  assert.deepEqual(lower(c), []);
  c.voidLast('shock');
  assert.deepEqual(lower(c), ['fluids']);
});

test('latest_rhythm: the time an event happened decides, so a corrected (earlier) time counts', () => {
  const c = arrest().noShock('PEA').shock('VF');
  c.s.events.find((e) => e.type === 'shock').at = T0 + MIN; // corrected to before the PEA check
  assert.equal(latestRhythm(c.s), 'PEA');
});

/* ---------- 3. shocks_at_least ---------- */

test('shocks_at_least: 2 shocks in VF is not enough for amiodarone, 3 is', () => {
  const c = arrest({ weight: '70' }).shock('VF').shock('VF');
  assert.deepEqual(lower(c), []);
  c.shock('VF');
  assert.deepEqual(lower(c), ['amiodarone-1']);
});

test('shocks_at_least: "+ Previous shock", earlier counts and shocks with the rhythm not recorded all count', () => {
  const c = arrest().previousShock().earlier({ shocks: 1 }).notRecorded('shock');
  assert.equal(shockCount(c.s), 3);
  assert.deepEqual(lower(c), [], 'no rhythm recorded yet: amiodarone needs VF or VT');
  c.shock('VT');
  assert.equal(shockCount(c.s), 4);
  assert.deepEqual(lower(c), ['amiodarone-1']);
});

test('shocks_at_least: a voided shock does not count', () => {
  const c = arrest().shock('VF').shock('VF').shock('VF');
  assert.deepEqual(lower(c), ['amiodarone-1']);
  c.voidLast('shock');
  assert.equal(shockCount(c.s), 2);
  assert.deepEqual(lower(c), []);
});

/* ---------- 4 and 5. ever_recorded and never_recorded ---------- */

test('ever_recorded: torsades at any rhythm check brings magnesium for the rest of the arrest, whatever the later rhythm', () => {
  const c = arrest().shock('Torsades');
  assert.deepEqual(lower(c), ['magnesium']);
  c.shock('VF').shock('VF').shock('VF');
  assert.deepEqual(lower(c), ['magnesium']);
  c.noShock('Asystole');
  assert.deepEqual(lower(c), ['magnesium']);
  c.rosc().rearrest();
  assert.deepEqual(lower(c), ['magnesium']);
});

test('ever_recorded: false with no torsades; a voided torsades check does not count', () => {
  assert.deepEqual(lower(arrest().shock('VF')), []);
  const c = arrest().shock('Torsades');
  c.voidLast('shock');
  assert.deepEqual(lower(c), []);
});

test('never_recorded: amiodarone shows only while torsades has never been recorded', () => {
  const c = arrest().shock('VF').shock('VF').shock('VF');
  assert.deepEqual(lower(c), ['amiodarone-1']);
  c.shock('Torsades').shock('VF');
  assert.deepEqual(lower(c), ['magnesium']);
  c.voidLast('shock').voidLast('shock'); // both crossed out: torsades never recorded again
  assert.deepEqual(lower(c), ['amiodarone-1']);
});

/* ---------- 6. doses_at_least ---------- */

test('doses_at_least: the second-dose card needs one amiodarone dose; earlier doses count; voided doses do not', () => {
  const c = arrest({ weight: '70' }).shock().shock().shock().shock().shock().shock();
  assert.deepEqual(lower(c), ['amiodarone-1']);
  c.earlier({ amiodarone: 1 });
  assert.equal(doseCount(c.s, 'amiodarone'), 1);
  assert.deepEqual(lower(c), ['amiodarone-2']);
  c.earlier({ amiodarone: 0 }).dose('amiodarone', 300);
  assert.deepEqual(lower(c), ['amiodarone-2']);
  c.voidLast('amiodarone');
  assert.deepEqual(lower(c), ['amiodarone-1']);
});

/* ---------- 7. on_request ---------- */

test('on_request: a Guidance card shows only when it is asked for, one id or several, with or without an arrest', () => {
  assert.ok(!arrest().ids().some((id) => ON_REQUEST.includes(id)));
  assert.deepEqual(arrest({ start: false }).ids({ request: 'reversible-causes' }), [...AT_ALL_TIMES, 'reversible-causes']);
  assert.deepEqual(arrest().ids({ request: ['rsi', 'guidance-intro'] }), [...ALWAYS, 'guidance-intro', 'rsi']);
  assert.deepEqual(arrest().shock().rosc().ids({ request: ON_REQUEST }), [...AT_ALL_TIMES, ...ON_REQUEST]);
  assert.deepEqual(arrest().ids({ request: 'not-a-card' }), ALWAYS);
});

/* ---------- Group rule ---------- */

test('group rule: only the first matching card of a group, in file order, shows', () => {
  const c = arrest({ weight: '70' }).shock().shock().shock().shock().shock().shock().dose('amiodarone', 300);
  // Both amiodarone cards' conditions are met; amiodarone-2 is listed first, so it alone shows.
  const file = CARDS;
  const amio1 = file.cards.find((card) => card.id === 'amiodarone-1');
  assert.ok(amio1.show_when.length && lower(c).length === 1 && lower(c)[0] === 'amiodarone-2');
  // The same session with the two cards swapped (a file the checker refuses) shows amiodarone-1 instead.
  const swapped = readCardFile(CARD_TEXT);
  const i2 = swapped.cards.findIndex((card) => card.id === 'amiodarone-2');
  [swapped.cards[i2], swapped.cards[i2 + 1]] = [swapped.cards[i2 + 1], swapped.cards[i2]];
  assert.deepEqual(cardsNow(swapped, c.s, c.now).filter((card) => card.place === 'lower').map((card) => card.id), ['amiodarone-1']);
});

test('group rule: a card with no group is never held back by another card', () => {
  const c = arrest().shock('Torsades').noShock('PEA');
  assert.deepEqual(lower(c), ['magnesium', 'fluids']);
});

/* ---------- Adult or child: the dose line only ---------- */

test('look-up: no weight and over 40 kg are adult; 40 kg or less is a child, rounded UP to the band; same as today', () => {
  const who = (weight) => patientNow(CARDS, { weight }, { maxWeightKg: MAX_WEIGHT_KG });
  assert.deepEqual(who(''), { who: 'adult', kg: null });
  assert.deepEqual(who('70'), { who: 'adult', kg: 70 });
  assert.deepEqual(who('40.5'), { who: 'adult', kg: 40.5 });
  const bands = { 1: 5, 3: 5, 5: 5, 5.5: 10, 7: 10, 10: 10, 11: 20, 15: 20, 20: 20, 25: 30, 30: 30, 31: 40, 40: 40 };
  for (const [kg, band] of Object.entries(bands)) assert.deepEqual(who(String(kg)), { who: 'child', kg: Number(kg), bandKg: band }, kg + ' kg');
  assert.deepEqual(who('15,5'), { who: 'child', kg: 15.5, bandKg: 20 }, 'a decimal comma reads as a point');
  for (const bad of ['0', 'abc', '12.25', '-5', '501']) assert.deepEqual(who(bad), { who: null, kg: null }, bad);
  // The same answer as today's look-up (src/engine/core.js dose() and childBand()), weight by weight.
  for (const weight of ['', '0', '1', '3', '4.9', '5', '5.1', '9', '10', '15', '15,5', '20', '29.9', '30', '39', '40', '40.1', '41', '70', '500', '501', 'abc']) {
    const today = core.dose({ weight });
    const now = who(weight);
    if (today === null) assert.equal(now.who, null, weight);
    else if (core.isPaediatric({ weight })) assert.equal(now.bandKg, core.childBand(Number(weight.replace(',', '.'))).maxKg, weight);
    else assert.equal(now.who, 'adult', weight);
  }
});

test('dose lines: adult text lines, with the number a tap records read from the printed dose', () => {
  const c = arrest().shock().shock().shock();
  assert.deepEqual(texts(c.card('adrenaline').dose.lines), ['1 mg IV for an adult.']);
  assert.equal(c.card('adrenaline').dose.who, 'adult');
  assert.deepEqual(c.card('adrenaline').record, { drug: 'adrenaline', amount: 'dose', unit: 'mg', value: 1 });
  assert.equal(c.card('amiodarone-1').record.value, 300);
  c.dose('amiodarone', 300).shock().shock().shock();
  assert.equal(c.card('amiodarone-2').record.value, 150);
  assert.deepEqual(texts(c.card('shock-energy').dose.lines), ['Maximum joule setting for an adult.']);
  const t = arrest().shock('Torsades');
  assert.equal(t.card('magnesium').record.value, 10);
  assert.equal(t.card('magnesium').record.unit, 'mmol');
});

test('dose lines: each child band gives its EAS 7.2 cell, and the cell value is what a tap records', () => {
  const rows = CARDS.tables.eas72.rows;
  for (const [weight, band] of [['3', 5], ['8', 10], ['15', 20], ['25', 30], ['40', 40]]) {
    const row = rows.find((r) => r.maxKg === band);
    const c = arrest({ weight }).shock().shock().shock();
    const adrenaline = c.card('adrenaline');
    assert.equal(adrenaline.dose.who, 'child');
    assert.deepEqual(adrenaline.dose.lines, [{ kind: 'cell', table: 'eas72', column: 'adrenalineMg', value: row.adrenalineMg, rowKey: band, source: 'EAS 7.2 p5, p8, p10, p12, p14' }]);
    assert.equal(adrenaline.record.value, row.adrenalineMg);
    assert.equal(c.card('amiodarone-1').record.value, row.amiodaroneFirstMg);
    assert.deepEqual(c.card('shock-energy').dose.lines[0].value, row.shockRangeJ);
  }
});

test('dose lines: a "-" cell (magnesium, 5 and 10 kg bands) is "seek clinical advice" with no number to record', () => {
  for (const weight of ['4', '7']) {
    const mg = arrest({ weight }).shock('Torsades').card('magnesium');
    assert.deepEqual(mg.dose.lines, [{ kind: 'seek_advice', table: 'eas72', column: 'magnesiumMmol', source: 'EAS 7.2 p7, p9, p11, p13, p15' }]);
    assert.equal(mg.record.value, null);
  }
  assert.equal(arrest({ weight: '15' }).shock('Torsades').card('magnesium').record.value, 4);
});

test('dose lines: child lines (fluids: table volume, its EAS 3.14 line trace-only (A37); second amiodarone: "Seek clinical advice" only (23c))', () => {
  const f = arrest({ weight: '15' }).noShock('PEA').card('fluids');
  assert.deepEqual(texts(f.dose.lines), ['cell:fluidsTableMl=400']);
  assert.deepEqual(fileLines('fluids', 'dose.child'), ['cell:fluidsTableMl', '20-40 ml/kg IV for a child. [trace]']);
  assert.deepEqual(f.record, { drug: 'fluids', amount: 'typed', unit: 'mL', value: null }, 'typed: never pre-filled');
  const a = arrest({ weight: '15' }).shock().shock().shock().dose('amiodarone', 100).shock().shock().shock().card('amiodarone-2');
  assert.deepEqual(a.dose.lines.map((l) => l.kind), ['app'], 'decision 23c: the A33 lines are dropped');
  assert.equal(a.record.value, null, 'A10: no child second dose can be recorded from the card');
});

test('dose lines: a weight that is not valid shows no dose line and nothing to record (as today)', () => {
  const c = arrest({ weight: 'abc' });
  assert.deepEqual(c.card('adrenaline').dose, { who: null, lines: [] });
  assert.equal(c.card('adrenaline').record.value, null);
});

test('dose lines: RSI columns (decision 2, A12, A26): child band column, adult next column up, last column above', () => {
  const rsi = (weight) => arrest({ weight }).card('rsi', { request: 'rsi' }).dose;
  const keys = (dose) => dose.lines.filter((l) => l.kind === 'cell').map((l) => l.rowKey);
  assert.deepEqual(keys(rsi('15')), [20, 20, 20, 20]);
  assert.deepEqual(keys(rsi('45')), [50, 50, 50, 50]);
  assert.deepEqual(keys(rsi('60')), [60, 60, 60, 60]);
  assert.deepEqual(keys(rsi('95')), [100, 100, 100, 100]);
  assert.deepEqual(keys(rsi('130')), [100, 100, 100, 100]);
  assert.deepEqual(rsi('3').lines.map((l) => l.kind), ['seek_advice', 'seek_advice', 'seek_advice', 'seek_advice'], 'the 5 kg band has no column');
  assert.deepEqual(rsi('').lines.map((l) => l.kind), ['needs_weight', 'needs_weight', 'needs_weight', 'needs_weight', 'app'], 'no weight: no column can be chosen');
  // The same columns as today's look-up (src/engine/core.js rsiDoses).
  for (const kg of [3, 5, 9, 10, 11, 20, 33, 40, 41, 50, 51, 77, 90, 91, 100, 250]) {
    const today = core.rsiDoses(kg);
    const cells = rsi(String(kg)).lines.filter((l) => l.kind === 'cell');
    if (today === null) assert.equal(cells.length, 0, kg + ' kg');
    else assert.deepEqual(Object.fromEntries(cells.map((l) => [l.column, l.value])), { fentanylMcg: today.fentanylMcg, ketamineMg: today.ketamineMg, reducedKetamineMg: today.reducedKetamineMg, blockerMg: today.blockerMg }, kg + ' kg');
  }
});

/* ---------- Every other card field ---------- */

test('card fields: id, title, place, group and lines (guideline words and app words told apart)', () => {
  const c = arrest().shock().shock().shock();
  const amio = c.card('amiodarone-1');
  assert.deepEqual([amio.id, amio.title, amio.place, amio.group], ['amiodarone-1', 'Amiodarone', 'lower', 'amiodarone']);
  assert.equal(c.card('adrenaline').group, null);
  assert.deepEqual(amio.lines, [], 'A37 item 1: both amiodarone-1 lines are trace-only');
  assert.deepEqual(c.shock('Torsades').card('magnesium').lines[0], { kind: 'guideline', text: 'Withhold amiodarone.', source: 'EAS 3.14 p2' });
  const intro = c.card('guidance-intro', { request: 'guidance-intro' });
  assert.deepEqual(intro.lines[0].kind, 'app');
  assert.equal(intro.lines[0].source, null);
  assert.equal(c.card('cpr-clock').place, 'header');
});

test('card fields: timer counts down four minutes from the latest adrenaline dose; negative when overdue; voided dose', () => {
  const c = arrest();
  assert.deepEqual(c.card('adrenaline').timer, { every_min: 4, from: 'last_dose', lastDoseAt: null, leftMs: null });
  c.advance(MIN).dose('adrenaline');
  const at = c.now;
  c.advance(MIN);
  assert.deepEqual(c.card('adrenaline').timer, { every_min: 4, from: 'last_dose', lastDoseAt: at, leftMs: 3 * MIN });
  c.advance(4 * MIN);
  assert.equal(c.card('adrenaline').timer.leftMs, -MIN);
  c.voidLast('adrenaline');
  assert.equal(c.card('adrenaline').timer.leftMs, null);
  assert.equal(c.card('fluids'), undefined);
  assert.equal(arrest().noShock('PEA').card('fluids').timer, null, 'a card with no timer');
});

test('card fields: dose count, limit and repeat confirm lines (magnesium: confirm after one dose; complete at two)', () => {
  const c = arrest().shock('Torsades');
  assert.deepEqual(c.card('magnesium').doses, { count: 0, max: 2, complete: false, confirm: [] });
  c.dose('magnesium', 10, 'mmol');
  assert.deepEqual(texts(c.card('magnesium').doses.confirm), ['One dose is already recorded.', 'Repeat once if torsades de pointes recurs or persists.']);
  assert.deepEqual(c.card('magnesium').doses.confirm.map((l) => l.kind), ['app', 'guideline']);
  c.dose('magnesium', 10, 'mmol');
  assert.deepEqual(c.card('magnesium').doses, { count: 2, max: 2, complete: true, confirm: [] });
  assert.deepEqual(arrest().card('adrenaline').doses, { count: 0, max: null, complete: false, confirm: [] }, 'no limit');
  assert.equal(arrest().card('cpr-clock').doses, null, 'records nothing');
  const a = arrest().earlier({ amiodarone: 1 }).shock().shock().shock();
  assert.deepEqual(a.card('amiodarone-1').doses, { count: 1, max: 1, complete: true, confirm: [] }, 'earlier doses count');
});

test('card fields: double-tap lock (A5) runs from the latest dose; a voided dose frees it; the same as today', () => {
  const c = arrest();
  assert.deepEqual(c.card('adrenaline').lock, { seconds: 210, leftMs: 0 });
  c.dose('adrenaline').advance(10000);
  assert.equal(c.card('adrenaline').lock.leftMs, 200000);
  assert.equal(c.card('adrenaline').lock.leftMs, drugCards.lockLeft(c.s, 'adrenaline', c.now), 'same as today');
  c.advance(200000);
  assert.equal(c.card('adrenaline').lock.leftMs, 0);
  c.dose('adrenaline').voidLast('adrenaline');
  assert.equal(c.card('adrenaline').lock.leftMs, 0);
  const t = arrest().shock('Torsades').dose('magnesium', 10, 'mmol').advance(2000);
  assert.equal(t.card('magnesium').lock.leftMs, 3000);
  assert.equal(t.card('magnesium').lock.leftMs, drugCards.lockLeft(t.s, 'magnesium', t.now));
  assert.equal(arrest().shock().shock().shock().card('amiodarone-1').lock, null, 'no lock_s: no lock');
});

test('card fields: details for this patient (only: child lines left out for an adult) and pop_up_on_show', () => {
  const pointer = 'Administration time: see EAS 7.2, dilution 13';
  assert.ok(texts(arrest({ weight: '20' }).shock('Torsades').card('magnesium').details).includes(pointer));
  assert.ok(!texts(arrest({ weight: '70' }).shock('Torsades').card('magnesium').details).includes(pointer));
  assert.ok(!texts(arrest().shock('Torsades').card('magnesium').details).includes(pointer), 'no weight: adult');
  assert.ok(!texts(arrest({ weight: 'x' }).shock('Torsades').card('magnesium').details).includes(pointer), 'weight not valid');
  assert.equal(arrest().noShock('PEA').card('fluids').pop_up_on_show, true);
  assert.equal(arrest().card('adrenaline').pop_up_on_show, false);
  assert.deepEqual(arrest().card('cpr-clock').details, []);
});

test('card fields: sources are every source the card shows, each once, in order', () => {
  // A37: the adrenaline lead-ins are trace-only, so a child's card shows no EAS 3.14 line (the adult dose line is EAS 3.14 p1).
  assert.deepEqual(arrest().card('adrenaline').sources, ['EAS 3.14 p1', 'EAS 14.3 p2']);
  assert.deepEqual(arrest({ weight: '15' }).card('adrenaline').sources, ['EAS 7.2 p5, p8, p10, p12, p14', 'EAS 14.3 p2']);
  assert.deepEqual(arrest({ weight: '20' }).shock('Torsades').card('magnesium').sources, ['EAS 3.14 p2', 'EAS 7.2 p7, p9, p11, p13, p15', 'Owner ruling A34 · EAS 7.2 p4-5']);
});

/* ---------- Special-situation switch ---------- */

test('special situation: every automatic card is marked "manual review"; Guidance cards are not; switch off clears it', () => {
  const c = arrest().shock('Torsades').noShock('PEA').special();
  const cards = c.cards({ request: 'reversible-causes' });
  assert.deepEqual(cards.map((card) => card.id), ['cpr-clock', 'shock-energy', 'adrenaline', 'magnesium', 'fluids', 'reversible-causes']);
  for (const card of cards) assert.equal(card.manual_review, AUTOMATIC.includes(card.id), card.id);
  c.special(false);
  assert.ok(c.cards().every((card) => card.manual_review === false));
});

test('special situation (DECISIONS.md section 8, at C4): header cards are marked "manual review" too, also the always card outside an arrest', () => {
  const c = arrest({ weight: '15' }).special();
  for (const id of ['cpr-clock', 'shock-energy']) assert.equal(c.card(id).manual_review, true, id);
  const before = arrest({ start: false, weight: '15' }).special();
  assert.equal(before.card('shock-energy').manual_review, true);
  assert.equal(before.card('weight-from-age', { request: 'weight-from-age' }).manual_review, false, 'an on_request card is never marked');
});

/* ---------- Same counts as today; nothing changed ---------- */

test('counts: shocks and amiodarone doses equal today\'s counts on the same sessions', () => {
  const cases = [
    arrest(), arrest().previousShock().previousShock().shock(), arrest().earlier({ shocks: 4, amiodarone: 1 }).shock().dose('amiodarone', 150),
    arrest().shock().shock().voidLast('shock').notRecorded('shock'), arrest().shock().dose('amiodarone').dose('amiodarone').voidLast('amiodarone'),
  ];
  for (const c of cases) {
    const today = core.counts(c.s);
    assert.equal(shockCount(c.s), today.shocks);
    assert.equal(doseCount(c.s, 'amiodarone'), today.amio);
  }
});

test('the engine changes nothing it is given', () => {
  const c = arrest({ weight: '15' }).shock('Torsades').noShock('PEA').dose('magnesium', 4, 'mmol');
  const fileBefore = JSON.stringify(CARDS), sessionBefore = JSON.stringify(c.s);
  c.cards({ request: ON_REQUEST });
  assert.equal(JSON.stringify(CARDS), fileBefore);
  assert.equal(JSON.stringify(c.s), sessionBefore);
});

test('every card in the file can be shown by the engine and every condition in the file is one the engine knows', () => {
  const seen = new Set();
  const runs = [
    arrest({ weight: '70' }).shock().shock().shock(), arrest({ weight: '70' }).shock().shock().shock().dose('amiodarone').shock().shock().shock(),
    arrest().shock('Torsades'), arrest().noShock('PEA'),
  ];
  for (const c of runs) for (const id of c.ids({ request: ON_REQUEST })) seen.add(id);
  assert.deepEqual([...seen].sort(), CARDS.cards.map((card) => card.id).sort());
  // The seven conditions of CARDS-DESIGN.md section 2, plus "always" (owner decision 23a, step C4).
  const known = new Set(['arrest_running', 'on_request', 'always', 'latest_rhythm', 'shocks_at_least', 'ever_recorded', 'never_recorded', 'doses_at_least']);
  for (const card of CARDS.cards) for (const condition of card.show_when) assert.ok(known.has(typeof condition === 'string' ? condition : Object.keys(condition)[0]));
});
