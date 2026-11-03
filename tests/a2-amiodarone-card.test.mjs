// A2 (owner-approved): the amiodarone card appears only when a dose is due, and C6b: for a child the second
// dose reads "Seek clinical advice". Drives the real screens in a fake browser (like the 6 golden scenarios).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';

const MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
const shock = (a, rhythm = 'VF') => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); a.click(`[data-record-rhythm=${rhythm}]`); };
const noShock = (a, rhythm) => { a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); a.click(`[data-record-rhythm="${rhythm}"]`); };
const start = (a, kg) => { weight(a, kg); a.click('[data-action=start]'); };
const main = a => a.surfaces().main;
const pending = a => main(a).includes('id="amiodaronePending"') && !main(a).includes('id="amiodaroneCard"');
const card = a => main(a).includes('id="amiodaroneCard"') && !main(a).includes('id="amiodaronePending"');
const amioCardHtml = a => main(a).match(/<section class="drug[^"]*" id="amiodaroneCard">[\s\S]*?<\/section>/)[0];

test('A2: before any shock the lower slot is a plain tile: no amiodarone dose and no record button', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70');
  assert.ok(pending(a)); assert.match(main(a), /Not yet due\. Review after 3 shocks in VF \/ pulseless VT \(second dose after 6, counting earlier shocks\)\./);
  assert.ok(!main(a).includes('data-drug="amiodarone"')); assert.ok(!main(a).includes('300 mg'));
});

test('A2: the card appears after the 3rd VF/VT shock, not before', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70');
  shock(a, 'VF'); assert.ok(pending(a)); shock(a, 'VT'); assert.ok(pending(a));
  shock(a, 'VF'); assert.ok(card(a)); assert.match(amioCardHtml(a), /300 mg IV/); assert.match(amioCardHtml(a), /data-drug="amiodarone"\s*>/);
});

test('A2 (updated by A2c): non-shockable rhythms never show the amiodarone card; asystole and PEA both show fluids', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70');
  noShock(a, 'Asystole'); noShock(a, 'Asystole'); noShock(a, 'Asystole');
  assert.ok(main(a).includes('id="fluidsCard"') && !pending(a) && !card(a));
  noShock(a, 'PEA'); assert.ok(main(a).includes('id="fluidsCard"') && !pending(a));
});

test('A2: once shown the card stays, even after the 3rd shock is undone', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70');
  shock(a); shock(a); shock(a); assert.ok(card(a));
  a.click('[data-action=settings]'); a.click('#undo'); assert.ok(card(a), 'card must not vanish after undo');
});

test('A2: a new patient starts with the tile again', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70'); shock(a); shock(a); shock(a); assert.ok(card(a));
  a.click('[data-action=settings]'); a.click('[data-action=new]'); a.click('[data-action=confirm-new]'); assert.ok(pending(a));
});

test('A2: a recorded dose keeps the card on screen after a reload', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70'); shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]');
  const b = openApp({ appDir: ROOT, savedState: a.surfaces().stored }); assert.ok(card(b));
});

test('C6b: child (15 kg) second dose reads "Seek clinical advice"; button disabled; nothing can record it', () => {
  const a = openApp({ appDir: ROOT }); start(a, '15');
  shock(a); shock(a); shock(a); assert.match(amioCardHtml(a), /100 mg IV/); a.click('[data-drug=amiodarone]');
  shock(a); shock(a); assert.match(amioCardHtml(a), /50 mg IV/, 'before 6 shocks the old number is still shown (open question for the owner)');
  shock(a);
  const html = amioCardHtml(a);
  assert.match(html, /<div class="drug-dose child">Seek clinical advice<\/div>/);
  assert.match(html, /<button class="record" data-drug="amiodarone" disabled="">Seek clinical advice<\/button>/);
  assert.ok(!/50 mg/.test(html));
  const before = a.surfaces().stored; a.click('[data-drug=amiodarone]'); assert.equal(a.surfaces().stored, before, 'tapping the disabled button records nothing');
  assert.ok(html.includes('data-custom-drug="amiodarone"'), '"Other…" stays so the dose actually given can still be logged');
});

test('C6b: Administration pop-up for a child lists the first dose and "second dose: seek clinical advice"', () => {
  const a = openApp({ appDir: ROOT }); start(a, '15'); shock(a); shock(a); shock(a);
  a.click('[data-drug-info=amiodarone]'); const sheet = a.surfaces().sheet;
  assert.match(sheet, /100 mg IV first; second dose: seek clinical advice/); assert.ok(!/50 mg IV second/.test(sheet));
});

test('C6b: adults are unchanged (second dose 150 mg IV, recordable at 6 shocks)', () => {
  const a = openApp({ appDir: ROOT }); start(a, '70');
  shock(a); shock(a); shock(a); a.click('[data-drug=amiodarone]'); shock(a); shock(a); shock(a);
  assert.match(amioCardHtml(a), /150 mg IV/); assert.match(amioCardHtml(a), /data-drug="amiodarone"\s*>Record 150 mg IV/);
  a.click('[data-drug-info=amiodarone]'); assert.match(a.surfaces().sheet, /300 mg IV first; 150 mg IV second/);
});

// precision.css is the baseline file plus ONE appended block (the tile styling); nothing else in it changed.
const A2_CSS = '\n/* A2: tile shown in the lower drug slot until amiodarone is due (no dose, no button) */\n.live-mode .drug-grid .drug.drug-pending{display:block;border-left-color:#c9d1cc;border-top:1px solid #e1e8e3;background:#f4f6f5;color:#5d6d64}\n.live-mode .drug-grid .drug.drug-pending h3{color:#5d6d64}\n.live-mode .drug-grid .drug.drug-pending .pending-note{margin:3px 0 0;font-size:12.5px;line-height:16px}\n';
test('A2: precision.css = the baseline file + the A2 tile block only', () => {
  const now = readFileSync(ROOT + '/precision.css', 'utf8');
  assert.ok(now.endsWith(A2_CSS), 'A2 block missing or changed');
  const want = readFileSync(ROOT + '/docs/baseline/file-hashes.sha256', 'utf8').split('\n').map(l => l.trim().split(/\s+/)).find(r => r[1] === 'precision.css')[0];
  assert.equal(createHash('sha256').update(now.slice(0, now.length - A2_CSS.length)).digest('hex'), want);
});
