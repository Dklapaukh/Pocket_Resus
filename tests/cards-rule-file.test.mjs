// CARD RULE FILE (cards plan step C2): src/cards/nz-eas-cards.yaml, the new rule file written as cards.
//  1. It passes the card checker (src/cards/check.js): every field is known, every guideline sentence is found
//     word for word on its cited page of the packaged PDF.
//  2. Its copied tables (EAS 7.2 bands, EAS 9.3 RSI columns) hold the same values as the live rules file
//     (src/rules/nz-eas.yaml), run through the same guideline values as tests/rules-file.test.mjs, AND each value is
//     read back from the packaged PDF text page by page. A22 changes the shock energy to the printed range.
//  3. A few things the approved rows A20, A31, A32, A33, A34 and A35 say about the file itself.
// The live app does not read this file yet (step C3), so nothing here changes a screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCardFile, checkCardFile, pageBody, sameWords } from '../src/cards/check.js';
import { RULES } from '../src/rules/load.js';

const ROOT = new URL('..', import.meta.url);
const TEXT = readFileSync(new URL('src/cards/nz-eas-cards.yaml', ROOT), 'utf8');
const GUIDELINE_TEXT = JSON.parse(readFileSync(new URL('src/cards/guideline-text.json', ROOT), 'utf8'));
const FILE = readCardFile(TEXT);
const card = (id) => FILE.cards.find((c) => c.id === id);
const column = (table, name) => FILE.tables[table].rows.map((row) => row[name]);

// The body of one PDF page as a list of non-empty lines (export header and footer removed).
const pageLines = (pdf, page) => pageBody(GUIDELINE_TEXT[pdf][page - 1]).split('\n').map((line) => line.trim()).filter(Boolean);
// The line that comes `step` lines after the line equal to `label` (the label must be on the page exactly once).
function after(lines, label, step = 1) {
  const at = lines.flatMap((line, i) => (line === label ? [i] : []));
  assert.equal(at.length, 1, '"' + label + '" should be on the page exactly once');
  return lines[at[0] + step];
}
// The one line on the page that matches pattern (refuses none or several).
function only(lines, pattern) {
  const found = lines.filter((line) => pattern.test(line));
  assert.equal(found.length, 1, pattern + ' should match exactly one line, found ' + JSON.stringify(found));
  return pattern.exec(found[0]);
}

test('the card rule file passes the card checker', () => {
  assert.deepEqual(checkCardFile(FILE, GUIDELINE_TEXT), []);
});

test('the card rule file holds the cards of CARDS-DESIGN.md section 1, amiodarone-2 before amiodarone-1', () => {
  assert.deepEqual(FILE.cards.map((c) => c.id), ['cpr-clock', 'shock-energy', 'adrenaline', 'amiodarone-2', 'amiodarone-1', 'magnesium', 'fluids',
    'guidance-intro', 'reversible-causes', 'special-situations', 'weight-from-age', 'tubes-lma', 'rsi']);
});

/* ---------- EAS 7.2 band table ---------- */

test('EAS 7.2 table (card file): adrenaline, amiodarone, magnesium per weight band (same values as the rules-file test)', () => {
  const t = FILE.tables.eas72;
  assert.equal(t.key, 'maxKg');
  assert.deepEqual(t.rows.map((b) => [b.maxKg, b.adrenalineMg, b.amiodaroneFirstMg, b.magnesiumMmol]), [
    [5, 0.05, 25, null], // no magnesium listed
    [10, 0.1, 50, null], // no magnesium listed
    [20, 0.2, 100, 4],
    [30, 0.3, 150, 6],
    [40, 0.4, 200, 8],
  ]);
  assert.ok(t.rows.every((b) => !Object.hasOwn(b, 'amiodaroneSecondMg')), 'A10: no child band holds a second amiodarone dose');
});

test('EAS 7.2 table (card file): every copied value equals the live rules file', () => {
  const live = RULES.numbers.childBands;
  assert.equal(FILE.tables.eas72.rows.length, live.length);
  for (const name of ['maxKg', 'adrenalineMg', 'amiodaroneFirstMg', 'magnesiumMmol', 'fluidsTableMl', 'ettSizesMm', 'ettLengthCm', 'lmaSize', 'lmaCuffMl']) {
    assert.deepEqual(column('eas72', name), live.map((band) => band[name]), name);
  }
  // A22 (D3): the energy is the printed range; its low end is today's single value (4 J/kg of the band, A1).
  assert.deepEqual(column('eas72', 'shockRangeJ'), [[20, 25], [40, 50], [80, 100], [120, 150], [160, 200]]);
  assert.deepEqual(column('eas72', 'shockRangeJ').map(([low]) => low), live.map((band) => band.shockJ));
  for (const [low, high] of column('eas72', 'shockRangeJ')) assert.ok(low <= high && high <= RULES.numbers.shock.maxRecordableJ, 'decision 16: low <= high, not above the highest recordable energy');
});

test('EAS 7.2 table (card file): weight from age equals the live age estimate (decision 8, A16)', () => {
  const { underOneYearKg, bands, adultUpToAge } = RULES.numbers.ageEstimate;
  const rows = FILE.tables.eas72.rows;
  // 0 years means "under 1 year"; the rows run on with no gap and stop one year before the adult age.
  assert.deepEqual(rows[0].ageYears, [0, 0]);
  assert.equal(rows[0].maxKg, underOneYearKg);
  rows.forEach((row, i) => { if (i) assert.equal(row.ageYears[0], rows[i - 1].ageYears[1] + 1, row.maxKg + ' kg'); });
  assert.equal(rows.at(-1).ageYears[1], adultUpToAge - 1);
  assert.deepEqual(rows.slice(1).map((row) => [row.ageYears[1], row.maxKg]), bands.map((band) => [band.maxAge, band.weightKg]));
});

test('EAS 7.2 table (card file): every value is printed on its band page of the packaged PDF', () => {
  const pdf = FILE.guidelines['7.2'].pdf;
  // Band pages: cardiac arrest table and airway devices, magnesium, 0.9% sodium chloride.
  const pages = { 5: [5, 6, 7, 7], 10: [8, 8, 9, 9], 20: [10, 10, 11, 12], 30: [12, 12, 13, 14], 40: [14, 14, 15, 16] };
  for (const row of FILE.tables.eas72.rows) {
    const [arrestPage, airwayPage, magnesiumPage, fluidPage] = pages[row.maxKg];
    const arrest = pageLines(pdf, arrestPage), airway = pageLines(pdf, airwayPage);
    const where = row.maxKg + ' kg band';
    assert.ok(arrest.includes(row.heading), where + ': heading "' + row.heading + '"');
    assert.ok(row.heading.startsWith(row.maxKg + ' kg / '), where + ': heading names the band weight');
    assert.equal(after(arrest, 'Adrenaline IV', 1), row.adrenalineMg + ' mg', where + ': adrenaline');
    assert.equal(after(arrest, 'Amiodarone IV', 1), row.amiodaroneFirstMg + ' mg', where + ': amiodarone');
    assert.equal(after(arrest, 'Manual defibrillation', 1), row.shockRangeJ.join('-'), where + ': shock energy (joules)');
    assert.equal(after(pageLines(pdf, magnesiumPage), 'Magnesium IV', 1), row.magnesiumMmol === null ? '-' : row.magnesiumMmol + ' mmol', where + ': magnesium');
    assert.equal(after(pageLines(pdf, fluidPage), '0.9% sodium chloride IV', 1), '20 ml/kg', where + ': fluids per kg');
    assert.equal(after(pageLines(pdf, fluidPage), '0.9% sodium chloride IV', 2), row.fluidsTableMl + ' ml', where + ': fluids volume');
    const ett = only(airway, /^Size (\d+)(?: or (\d+))?$/);
    assert.deepEqual(ett.slice(1).filter(Boolean).map(Number), row.ettSizesMm, where + ': cuffed ETT size');
    assert.equal(Number(only(airway, /^(\d+) cm length at lips$/)[1]), row.ettLengthCm, where + ': length at lips');
    assert.equal(Number(only(airway, /^Size (\d+) \(/)[1]), row.lmaSize, where + ': LMA size');
    assert.equal(Number(only(airway, /^Cuff inflation (\d+) ml$/)[1]), row.lmaCuffMl, where + ': LMA cuff');
  }
});

/* ---------- EAS 9.3 RSI tables ---------- */

test('EAS 9.3 tables (card file): every copied value equals the live rules file', () => {
  assert.deepEqual(FILE.tables.eas93child.rows, RULES.numbers.rsi.tables.paediatric);
  assert.deepEqual(FILE.tables.eas93adult.rows, RULES.numbers.rsi.tables.adult);
});

test('EAS 9.3 tables (card file): every value is printed in the dose summary tables on page 2', () => {
  const lines = pageLines(FILE.guidelines['9.3'].pdf, 2);
  const adultAt = lines.indexOf('Adult dose summary table'), childAt = lines.indexOf('Paediatric dose summary table');
  assert.ok(adultAt >= 0 && childAt > adultAt);
  const rows = { fentanylMcg: 'Fentanyl (2 mcg/kg)', reducedKetamineMg: 'Ketamine (1 mg/kg)', ketamineMg: 'Ketamine (2 mg/kg)', blockerMg: 'Rocuronium' };
  for (const [table, part] of [['eas93adult', lines.slice(adultAt, childAt)], ['eas93child', lines.slice(childAt)]]) {
    const count = FILE.tables[table].rows.length;
    assert.deepEqual(part.slice(1, 1 + count).map((cell) => Number(/(\d+) kg$/.exec(cell)[1])), column(table, 'columnKg'), table + ' columns');
    const values = (label) => { const at = part.indexOf(label); assert.ok(at > 0, label); return part.slice(at + 1, at + 1 + count).map((cell) => parseInt(cell, 10)); };
    for (const [name, label] of Object.entries(rows)) assert.deepEqual(values(label), column(table, name), table + ' ' + name);
    assert.deepEqual(values('Suxamethonium'), column(table, 'blockerMg'), table + ': suxamethonium equals rocuronium');
  }
});

/* ---------- What the approved rows say about the file ---------- */

test('A32: the nine guidelines, each with its website link; EAS 14.27 has no packaged PDF', () => {
  assert.deepEqual(Object.keys(FILE.guidelines), ['3.14', '3.15', '7.2', '9.2', '9.3', '9.4', '14.3', '14.4', '14.27']);
  for (const entry of Object.values(FILE.guidelines)) assert.match(entry.web, /^https:\/\/cpg\.stjohn\.org\.nz\//);
  assert.equal(FILE.guidelines['14.27'].pdf, null);
});

test('A20: the no-shock choices are PEA and Asystole only; fluids show after PEA only', () => {
  assert.deepEqual(FILE.settings.rhythms, { shock: ['VF', 'VT', 'Torsades'], noshock: ['PEA', 'Asystole'], rosc: RULES.numbers.rhythms.rosc });
  assert.deepEqual(card('fluids').show_when, ['arrest_running', { latest_rhythm: ['PEA'] }]);
});

test('A33: the child second amiodarone dose is "Seek clinical advice" with the EAS 3.14 sentence and the one-dose line', () => {
  assert.deepEqual(card('amiodarone-2').dose.child.map((line) => line.app_text || line.text), [
    'Seek clinical advice', 'See the paediatric drug dose tables for a child.', 'The EAS 7.2 tables print one amiodarone dose per band.']);
});

test('A34 and A35: the magnesium pointer line is for a child only; the two unsourced sentences are nowhere in the file', () => {
  const pointer = card('magnesium').details.filter((line) => /Administration time/.test(line.app_text || ''));
  assert.deepEqual(pointer, [{ app_text: 'Administration time: see EAS 7.2, dilution 13', source: 'Owner ruling A34 · EAS 7.2 p4-5', only: 'child' }]);
  assert.doesNotMatch(TEXT, /precipitation|concurrent adrenaline infusion/i);
  assert.doesNotMatch(TEXT, /dilute[^"]*10 mmol[^"]*10 m[lL]/i);
});

test('A31: every checklist line is in the same order as on the PDF pages; section headings appear once', () => {
  const pdfOf = (source) => FILE.guidelines[/^EAS (\S+) /.exec(source)[1]].pdf;
  for (const list of FILE.checklists) {
    const pdf = pdfOf(list.items[0].source);
    const whole = sameWords(GUIDELINE_TEXT[pdf].map(pageBody).join('\n'));
    let from = 0;
    for (const item of list.items) {
      const at = whole.indexOf(sameWords(item.text), from);
      assert.ok(at >= 0, list.id + ': "' + item.text + '" is out of order');
      from = at + 1;
    }
    const texts = list.items.map((item) => item.text);
    assert.equal(new Set(texts).size, texts.length, list.id + ': a line appears twice');
  }
  assert.deepEqual(FILE.checklists.find((list) => list.id === 'rsi').items.filter((item) => item.tick === false).map((item) => item.text),
    ['Roles assigned:', 'Patient prepared:', 'Monitoring attached and visible:', 'Equipment checked and ready:', 'Medicines drawn up, labelled and doses confirmed:', 'Team briefing:']);
});
