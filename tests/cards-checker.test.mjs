// CARD CHECKER (cards plan step C1, CARDS-DESIGN.md section 2): the checker accepts a good card file and refuses
// deliberately bad ones, each with its own plain-English message. The good file is tests/fixtures/cards/good.yaml
// (the CARDS-DESIGN.md section 3 examples); every bad file is that file with one planted fault.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCardFile, checkCardFile, readSource, sameWords } from '../src/cards/check.js';

const ROOT = new URL('..', import.meta.url);
const GOOD_TEXT = readFileSync(new URL('tests/fixtures/cards/good.yaml', ROOT), 'utf8');
const GUIDELINE_TEXT = JSON.parse(readFileSync(new URL('src/cards/guideline-text.json', ROOT), 'utf8'));

const good = () => readCardFile(GOOD_TEXT);
const card = (file, id) => file.cards.find((c) => c.id === id);
const check = (file) => checkCardFile(file, GUIDELINE_TEXT);

test('the good card file passes with no problems', () => {
  assert.deepEqual(check(good()), []);
});

// Each bad file: [what is planted, change to make, a pattern the problem list must contain].
const BAD = [
  // Fields and their kinds
  ['a card with no title', (f) => { delete card(f, 'adrenaline').title; }, /\(adrenaline\): is missing the field "title"/],
  ['a card with no lines', (f) => { delete card(f, 'fluids').lines; }, /\(fluids\): is missing the field "lines"/],
  ['an unknown card field', (f) => { card(f, 'adrenaline').formula = 'shocks > 3'; }, /\(adrenaline\)\.formula: is not a card field/],
  ['two cards with the same id', (f) => { card(f, 'fluids').id = 'adrenaline'; }, /another card already has this id/],
  ['an id with capitals', (f) => { card(f, 'fluids').id = 'Fluids'; }, /\.id: must be small letters/],
  ['an unknown place', (f) => { card(f, 'fluids').place = 'middle'; }, /\.place: must be one of top, lower, header, guidance/],
  ['an empty lines list', (f) => { card(f, 'fluids').lines = []; }, /\(fluids\)\.lines: must be a list of at least one line/],
  ['a group of one card', (f) => { card(f, 'amiodarone-2').group = 'amio-two'; }, /group "amio-two" has only one card/],
  ['a group across two places', (f) => { card(f, 'amiodarone-1').place = 'top'; }, /cards of group "amiodarone" must all have the same place/],
  // Conditions
  ['an unknown condition word', (f) => { card(f, 'fluids').show_when.push('patient_moving'); }, /"patient_moving" is not a condition/],
  ['an unknown condition with a value', (f) => { card(f, 'fluids').show_when.push({ minutes_at_least: 10 }); }, /"minutes_at_least" is not a condition that takes a value/],
  ['an "or" between conditions', (f) => { card(f, 'fluids').show_when.push({ latest_rhythm: ['PEA'], or: true }); }, /no "or", no formulas/],
  ['a formula as a condition', (f) => { card(f, 'fluids').show_when.push('shocks >= 3 and latest_rhythm == PEA'); }, /is not a condition/],
  ['no arrest_running or on_request', (f) => { card(f, 'fluids').show_when.shift(); }, /needs exactly one of arrest_running .* or on_request/],
  ['both arrest_running and on_request', (f) => { card(f, 'fluids').show_when.push('on_request'); }, /needs exactly one of arrest_running/],
  ['on_request with another condition', (f) => { card(f, 'reversible-causes').show_when.push({ latest_rhythm: ['PEA'] }); }, /an on_request card is opened by hand/],
  ['a rhythm that is not a choice', (f) => { card(f, 'fluids').show_when[1] = { latest_rhythm: ['Other'] }; }, /latest_rhythm needs a list of rhythms from settings.rhythms/],
  ['a ROSC rhythm in a condition', (f) => { card(f, 'magnesium').show_when[1] = { ever_recorded: 'Sinus rhythm' }; }, /ever_recorded needs one rhythm/],
  ['shocks_at_least of zero', (f) => { card(f, 'amiodarone-1').show_when[3] = { shocks_at_least: 0 }; }, /shocks_at_least must be a whole number from 1 to 100 \(found 0\)/],
  ['shocks_at_least as text', (f) => { card(f, 'amiodarone-1').show_when[3] = { shocks_at_least: 'three' }; }, /shocks_at_least must be a whole number/],
  ['the same condition twice', (f) => { card(f, 'amiodarone-1').show_when.push({ shocks_at_least: 6 }); }, /shocks_at_least is used twice/],
  ['ever and never the same rhythm', (f) => { card(f, 'magnesium').show_when.push({ never_recorded: 'Torsades' }); }, /cannot be both ever_recorded and never_recorded/],
  ['latest rhythm that was never recorded', (f) => { card(f, 'amiodarone-1').show_when[1] = { latest_rhythm: ['Torsades'] }; }, /latest rhythm cannot be "Torsades" if it was never recorded/],
  ['doses_at_least at the dose limit', (f) => { card(f, 'amiodarone-2').show_when[4] = { doses_at_least: 2 }; }, /could never be used/],
  ['doses_at_least on a card that records nothing', (f) => { card(f, 'reversible-causes').show_when = ['arrest_running', { doses_at_least: 1 }]; }, /doses_at_least counts this card's drug, so the card needs "record"/],
  // Sources and word-for-word text
  ['a guideline line with no source', (f) => { delete card(f, 'adrenaline').lines[0].source; }, /a line is \{text, source\} or \{app_text\}/],
  ['a source with no page', (f) => { card(f, 'adrenaline').lines[0].source = 'EAS 3.14'; }, /has a part that is not "EAS <number> p<page>"/],
  ['a page past the end of the PDF', (f) => { card(f, 'adrenaline').lines[0].source = 'EAS 3.14 p40'; }, /has 19 pages; there is no page 40/],
  ['a guideline that is not listed', (f) => { card(f, 'adrenaline').lines[0].source = 'EAS 3.99 p1'; }, /EAS 3.99 is not in the guidelines part/],
  ['a one-word change to a sentence', (f) => { card(f, 'adrenaline').lines[0].text = 'Administer adrenaline IV every three minutes:'; }, /not found word for word on EAS 3.14 p1/],
  ['a changed dose number', (f) => { card(f, 'adrenaline').dose.adult.text = '2 mg IV for an adult.'; }, /\.dose\.adult: not found word for word/],
  ['the right sentence on the wrong page', (f) => { card(f, 'magnesium').lines[1].source = 'EAS 3.14 p1'; }, /\(magnesium\)\.lines\[1\]: not found word for word on EAS 3.14 p1/],
  ['a sentence citing an online-only guideline', (f) => { card(f, 'magnesium').details.push({ text: 'Dilute to 10 ml.', source: 'EAS 14.27 p1' }); }, /EAS 14.27 has no packaged PDF/],
  ['a guideline sentence cited only to an owner ruling', (f) => { card(f, 'fluids').lines[1].source = 'Owner ruling D1'; }, /must name the guideline and page/],
  ['a {gap} left in the text', (f) => { card(f, 'fluids').details[0] = { app_text: 'Give {fluid} mL' }; }, /has \{ or \}/],
  ['bold marks in the text', (f) => { card(f, 'fluids').details[0] = { app_text: '**Give fluids**' }; }, /bold or italic marks/],
  ['an adult dose in app words with no ruling', (f) => { card(f, 'adrenaline').dose.adult = { app_text: '1 mg' }; }, /a dose in the app's own words needs a source that cites an owner ruling/],
  ['a child dose in app words citing only the guideline', (f) => { card(f, 'amiodarone-2').dose.child = { app_text: 'Seek clinical advice', source: 'EAS 3.14 p1' }; }, /cites an owner ruling/],
  // Doses, tables and recording
  ['a table that does not exist', (f) => { card(f, 'adrenaline').dose.child.table = 'eas73'; }, /there is no table "eas73"/],
  ['a column that does not exist', (f) => { card(f, 'adrenaline').dose.child.column = 'adrenalineMcg'; }, /table "eas72" has no column "adrenalineMcg"/],
  ['a table cell with no source', (f) => { delete card(f, 'adrenaline').dose.child.source; }, /a table cell is exactly \{ table, column, source \}/],
  ['a table cell in the card lines', (f) => { card(f, 'adrenaline').lines.push({ table: 'eas72', column: 'adrenalineMg', source: 'EAS 7.2 p5' }); }, /found the fields column,source,table/],
  ['a dose with no child part', (f) => { delete card(f, 'adrenaline').dose.child; }, /\.dose: must be \{ adult: \.\.\., child: \.\.\. \}/],
  ['recording the dose shown with no dose', (f) => { delete card(f, 'magnesium').dose; }, /records the dose shown, but the card has no dose/],
  ['an unknown amount kind', (f) => { card(f, 'fluids').record.amount = 'calculated'; }, /must be dose .* or typed/],
  ['a timer with no record', (f) => { card(f, 'reversible-causes').timer = { every_min: 4, from: 'last_dose' }; }, /a timer counts from a recorded dose/],
  ['a timer of zero minutes', (f) => { card(f, 'adrenaline').timer.every_min = 0; }, /timer\.every_min: must be a whole number of minutes from 1 to 60/],
  ['a timer from an unknown event', (f) => { card(f, 'adrenaline').timer.from = 'last_shock'; }, /timer\.from: must be last_dose/],
  ['a dose limit of zero', (f) => { card(f, 'magnesium').repeat.max = 0; }, /repeat\.max: must be a whole number of doses from 1 to 20/],
  ['confirm lines with no repeat', (f) => { card(f, 'amiodarone-1').repeat.confirm = [{ app_text: 'Again?' }]; }, /max is 1 so there is no repeat/],
  ['a lock of an hour', (f) => { card(f, 'adrenaline').lock_s = 3600; }, /lock_s: must be a whole number of seconds from 0 to 600/],
  ['a pop-up on show with no details', (f) => { card(f, 'fluids').details = []; }, /opens the details pop-up, so the card needs at least one details line/],
  // Other parts
  ['a guideline PDF that is not packaged', (f) => { f.guidelines['3.14'].pdf = 'cpg-missing.pdf'; }, /guidelines\.3\.14\.pdf: must be a packaged PDF/],
  ['a guideline web link that is not https', (f) => { f.guidelines['3.14'].web = 'http://cpg.stjohn.org.nz'; }, /\.web: must start with https:\/\//],
  ['a rhythm in both lists', (f) => { f.settings.rhythms.noshock.push('VF'); }, /"VF" is in both the shock and no-shock lists/],
  ['table rows out of order', (f) => { f.tables.eas72.rows.reverse(); }, /"maxKg" column must be numbers in increasing order/],
  ['a table row with a missing column', (f) => { delete f.tables.eas72.rows[1].fluidsTableMl; }, /rows\[1\]: must have the same columns/],
  ['a checklist item with a changed word', (f) => { f.checklists[0].items[0].text = 'Team leader chosen.'; }, /checklists\[0\]\.items\[0\]: not found word for word/],
];

for (const [name, plant, pattern] of BAD) {
  test('refused: ' + name, () => {
    const file = good();
    plant(file);
    const problems = check(file);
    assert.ok(problems.some((p) => pattern.test(p)), 'expected a problem matching ' + pattern + '; got:\n' + problems.join('\n'));
  });
}

test('at least 30 deliberately bad card files are refused', () => {
  assert.ok(BAD.length >= 30);
});

test('the reader refuses parts in the wrong order, comments, anchors and a file cut short', () => {
  const reordered = GOOD_TEXT.replace(/^about: .*\n/, '').replace(/^\.\.\.\n$/m, '') + 'about: moved\n...\n';
  assert.throws(() => readCardFile(reordered), /must hold exactly these parts, in this order/);
  assert.throws(() => readCardFile(GOOD_TEXT.replace('place: top', 'place: top # main card')), /# comment/);
  assert.throws(() => readCardFile(GOOD_TEXT.replace('lock_s: 210', 'lock_s: &lock 210')), /anchor/);
  assert.throws(() => readCardFile(GOOD_TEXT.replace(/\.\.\.\n$/, '')), /incomplete/);
});

test('a sentence that runs across a page break is found when both pages are cited, and not otherwise', () => {
  const sentence = 'If there is any doubt, a paediatric dose should be administered.'; // EAS 7.2, pages 1 to 2
  const withLine = (source) => { const f = good(); card(f, 'adrenaline').details.push({ text: sentence, source }); return check(f); };
  assert.deepEqual(withLine('EAS 7.2 p1-2'), []);
  assert.deepEqual(withLine('EAS 7.2 p1, p2'), []);
  assert.ok(withLine('EAS 7.2 p1').some((p) => /not found word for word/.test(p)));
});

test('word-for-word ignores only spacing, quote style and dash style', () => {
  assert.equal(sameWords('child’s  weight –\n 20‐40'), "child's weight - 20-40");
  assert.notEqual(sameWords('1 mg IV'), sameWords('1mg IV'));
  assert.notEqual(sameWords('Administer'), sameWords('administer'));
});

test('sources are read into guideline parts and owner-ruling parts', () => {
  assert.deepEqual(readSource('Owner ruling A10 · EAS 3.14 p1'), { eas: [{ code: '3.14', pages: [1] }], rulings: ['Owner ruling A10'], problem: null });
  assert.deepEqual(readSource('EAS 7.2 p5, p8-9').eas, [{ code: '7.2', pages: [5, 8, 9] }]);
  assert.match(readSource('EAS 7.2 p9-8').problem, /runs backwards/);
  assert.match(readSource('').problem, /needs a source/);
  assert.match(readSource('see EAS 3.14').problem, /not "EAS <number> p<page>"/);
});

test('the checker changes nothing it is given', () => {
  const file = good();
  const before = JSON.stringify(file);
  check(file);
  assert.equal(JSON.stringify(file), before);
});
