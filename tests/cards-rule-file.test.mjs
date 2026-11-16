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

/* ---------- Every card's clinical fields, pinned (written out here, not taken from the file) ----------
   From the approved CARDS-DESIGN.md section 3 examples and rows A20 to A35. A change to any of these needs an
   approved A-row and this list changed with it. Lines are shown as their text; app text starts "APP: ", and a
   line for one patient only ends " [child only]". */
const S72_ARREST = 'EAS 7.2 p5, p8, p10, p12, p14';
const S72_AIRWAY = 'EAS 7.2 p6, p8, p10, p12, p14';
const AMIODARONE_DETAILS = ['Cardiac arrest: administer IV undiluted as a bolus.', 'Contraindications', 'Known severe allergy.', 'Known severe allergy to iodine.',
  'VT secondary to cyclic antidepressant poisoning. In this setting amiodarone administration can be associated with severe worsening of shock, without resolution of the rhythm.',
  'If torsades de pointes is present or has occurred.'];
const RSI_COLUMNS = ['fentanylMcg', 'ketamineMg', 'reducedKetamineMg', 'blockerMg'];
const EXPECTED_CARDS = {
  'cpr-clock': { place: 'header', show_when: ['arrest_running'],
    lines: ['Perform two-minute cycles of high performance CPR between rhythm checks.'] },
  'shock-energy': { place: 'header', show_when: ['arrest_running'],
    lines: ['Defibrillate immediately if the cardiac rhythm is VF or VT using a single shock and immediately recommence chest compressions:'],
    dose: { adult: { text: 'Maximum joule setting for an adult.', source: 'EAS 3.14 p1' }, child: { table: 'eas72', column: 'shockRangeJ', source: S72_ARREST } } },
  adrenaline: { place: 'top', show_when: ['arrest_running'],
    lines: ['Administer adrenaline IV every four minutes:'],
    dose: { adult: { text: '1 mg IV for an adult.', source: 'EAS 3.14 p1' }, child: { table: 'eas72', column: 'adrenalineMg', source: S72_ARREST } },
    record: { drug: 'adrenaline', amount: 'dose', unit: 'mg' }, timer: { every_min: 4, from: 'last_dose' }, lock_s: 210,
    details: ['Administer adrenaline IV every four minutes:', 'Cardiac arrest:',
      'Adults and children whose weight has been rounded to 50 kg or more: administer undiluted as an IV bolus.',
      'Children whose weight has been rounded to 40 kg or less: dilute 1 mg of adrenaline to a total of 10 ml using 0.9% sodium chloride. This solution is 1:10,000 and contains 0.1 mg/ml. Draw up the dose from this solution and administer as an IV bolus.'] },
  'amiodarone-2': { group: 'amiodarone', place: 'lower',
    show_when: ['arrest_running', { latest_rhythm: ['VF', 'VT'] }, { never_recorded: 'Torsades' }, { shocks_at_least: 6 }, { doses_at_least: 1 }],
    lines: ['If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:'],
    dose: { adult: { text: '150 mg IV for an adult.', source: 'EAS 3.14 p1' }, child: [
      { app_text: 'Seek clinical advice', source: 'Owner ruling A10 · Owner ruling A33 · EAS 3.14 p1' },
      { text: 'See the paediatric drug dose tables for a child.', source: 'EAS 3.14 p1' },
      { app_text: 'The EAS 7.2 tables print one amiodarone dose per band.', source: 'Owner ruling A33 · ' + S72_ARREST }] },
    record: { drug: 'amiodarone', amount: 'dose', unit: 'mg' }, repeat: { max: 2 }, details: AMIODARONE_DETAILS },
  'amiodarone-1': { group: 'amiodarone', place: 'lower',
    show_when: ['arrest_running', { latest_rhythm: ['VF', 'VT'] }, { never_recorded: 'Torsades' }, { shocks_at_least: 3 }],
    lines: ['If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:', 'Administer amiodarone:'],
    dose: { adult: { text: '300 mg IV for an adult.', source: 'EAS 3.14 p1' }, child: { table: 'eas72', column: 'amiodaroneFirstMg', source: S72_ARREST } },
    record: { drug: 'amiodarone', amount: 'dose', unit: 'mg' }, repeat: { max: 1 }, details: AMIODARONE_DETAILS },
  magnesium: { place: 'lower', show_when: ['arrest_running', { ever_recorded: 'Torsades' }],
    lines: ['If torsades de pointes is present or has occurred', 'Withhold amiodarone.', 'Administer magnesium IV:'],
    dose: { adult: { text: '10 mmol (2.5 g) over 1-2 minutes for an adult.', source: 'EAS 3.14 p2' }, child: { table: 'eas72', column: 'magnesiumMmol', source: 'EAS 7.2 p7, p9, p11, p13, p15' } },
    record: { drug: 'magnesium', amount: 'dose', unit: 'mmol' },
    repeat: { max: 2, confirm: ['APP: One dose is already recorded.', 'Repeat once if torsades de pointes recurs or persists.'] }, lock_s: 5,
    details: ['If torsades de pointes is present or has occurred', 'Withhold amiodarone.', 'Administer magnesium IV:', '10 mmol (2.5 g) over 1-2 minutes for an adult.',
      'See the paediatric drug dose tables for a child.', 'Repeat once if torsades de pointes recurs or persists.', 'APP: Administration time: see EAS 7.2, dilution 13 [child only]'] },
  fluids: { place: 'lower', show_when: ['arrest_running', { latest_rhythm: ['PEA'] }], pop_up_on_show: true,
    lines: ['If the patient is in PEA', 'Correct immediately reversible causes.', 'Administer 0.9% sodium chloride IV:'],
    dose: { adult: { text: '1-2 litres IV for an adult.', source: 'EAS 3.14 p2' }, child: [
      { table: 'eas72', column: 'fluidsTableMl', source: 'EAS 7.2 p7, p9, p12, p14, p16' }, { text: '20-40 ml/kg IV for a child.', source: 'EAS 3.14 p2' }] },
    record: { drug: 'fluids', amount: 'typed', unit: 'mL' }, lock_s: 5,
    details: ['If the patient is in PEA', 'Correct immediately reversible causes.', 'Administer 0.9% sodium chloride IV:', '1-2 litres IV for an adult.', '20-40 ml/kg IV for a child.'] },
  'guidance-intro': { place: 'guidance', show_when: ['on_request'],
    lines: ['APP: Standard non-traumatic cardiac arrest. Clinician reference and event recorder. It does not detect a rhythm, operate a defibrillator or infer treatment.',
      'This guideline is for adults and children in non-traumatic cardiac arrest.', 'Perform two-minute cycles of high performance CPR between rhythm checks.',
      'Administer adrenaline IV every four minutes:', '1 mg IV for an adult.', 'See the paediatric drug dose tables for a child.',
      'If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:', 'Administer amiodarone:', '300 mg IV for an adult.', 'See the paediatric drug dose tables for a child.',
      'If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:', '150 mg IV for an adult.', 'See the paediatric drug dose tables for a child.',
      'Maximum joule setting for an adult.', 'See the paediatric drug dose tables for joule settings for a child.',
      'The following pages contain tables of paediatric drug doses. They are based on rounding the child’s weight up to 5, 10, 20, 30 or 40 kg.',
      'The usual recommended defibrillation energy for a child is 4 J/kg, but this may not be available for all defibrillators. If the recommended defibrillation energy level is not available, select the next highest level.',
      'APP: A no-shock cycle is counted only when recorded.'] },
  'reversible-causes': { place: 'guidance', show_when: ['on_request'],
    lines: ['Potentially reversible causes of PEA include:', 'Hypoxia.', 'Hypothermia.', 'Hypovolaemia (including anaphylaxis).', 'Hyper/hypokalaemia (and other metabolic abnormalities).',
      'Tension pneumothorax.', 'Tamponade (cardiac).', 'Toxins (poisoning).', 'Thrombosis (pulmonary and coronary).'] },
  'special-situations': { place: 'guidance', show_when: ['on_request'],
    lines: ['See the ‘cardiac arrest secondary to trauma’ guideline if the cardiac arrest is secondary to trauma.', 'Cardiac arrest secondary to drowning', 'Cardiac arrest secondary to hanging',
      'Cardiac arrest secondary to asthma', 'Cardiac arrest secondary to anaphylaxis', 'Cardiac arrest secondary to cyclic antidepressant poisoning',
      'Cardiac arrest during pregnancy greater than 20 weeks', 'Cardiac arrest secondary to hypothermia', 'Cardiac arrest secondary to hyperkalaemia', 'Cardiac arrest secondary to opiate poisoning'] },
  'weight-from-age': { place: 'header', show_when: ['on_request'],
    lines: ['If the weight is not known, it can be estimated from the child’s age using formulae, noting that the formulae are a guide only and tend to underestimate true weight.'] },
  'tubes-lma': { place: 'guidance', show_when: ['on_request'],
    lines: ['Children may require a different sized SGA, ETT or length at lips than that predicted by the formulae.'],
    dose: { adult: { app_text: 'Not shown for adults (over 40 kg or 14 years).', source: 'Owner ruling A18 · EAS 7.2 p1' },
      child: ['ettSizesMm', 'ettLengthCm', 'lmaSize', 'lmaCuffMl'].map((name) => ({ table: 'eas72', column: name, source: S72_AIRWAY })) } },
  rsi: { place: 'guidance', show_when: ['on_request'],
    lines: ['Administer 2 mcg/kg of fentanyl IV (up to a maximum of 200 mcg) immediately prior to ketamine if the patient has:', 'Traumatic brain injury, or',
      'Suspected intracranial pathology, or', 'Hypertension (SBP > 150 mmHg in an adult).', 'Withhold fentanyl if the above clinical indications are not present, or there are signs of shock.',
      'Administer 2 mg/kg of ketamine IV (up to a maximum of 200 mg) for most patients.', 'Consider reducing the dose to 1 mg/kg if:', 'There are signs of shock, or',
      'Sedative medicines have already been administered or taken.', 'Administer neuromuscular blockade:', '2 mg/kg of rocuronium IV, or', '2 mg/kg of suxamethonium IV.',
      'Do not reduce the dose of ketamine in the setting of RSI for prolonged seizures.', '2 mg/kg of rocuronium or suxamethonium (to a maximum of 200 mg) is an appropriate dose for all patients.',
      'The dose should usually be rounded to the nearest 50 mg in adults.'],
    dose: { adult: [...RSI_COLUMNS.map((name) => ({ table: 'eas93adult', column: name, source: 'EAS 9.3 p2' })),
      { app_text: 'weight rounded up to the next column', source: 'Owner ruling A26 · EAS 9.3 p2' }],
    child: RSI_COLUMNS.map((name) => ({ table: 'eas93child', column: name, source: 'EAS 9.3 p2' })) } },
};

// A card's clinical fields in the form of EXPECTED_CARDS (only the fields the card has; title and note left out).
const asText = (line) => (line.text ?? 'APP: ' + line.app_text) + (line.only ? ' [' + line.only + ' only]' : '');
function clinicalFields(c) {
  const out = {};
  for (const field of ['group', 'place', 'show_when', 'pop_up_on_show', 'lines', 'dose', 'record', 'timer', 'repeat', 'lock_s', 'details']) {
    if (!(field in c)) continue;
    if (field === 'lines') out.lines = c.lines.map(asText);
    else if (field === 'details') { if (c.details.length) out.details = c.details.map(asText); }
    else if (field === 'repeat') out.repeat = c.repeat.confirm ? { max: c.repeat.max, confirm: c.repeat.confirm.map(asText) } : c.repeat;
    else out[field] = c[field];
  }
  return out;
}

test('every card equals its approved form: conditions, doses, recording, timer, repeat, lock, place, group, lines and details', () => {
  assert.deepEqual(FILE.cards.map((c) => c.id), Object.keys(EXPECTED_CARDS));
  for (const c of FILE.cards) assert.deepEqual(clinicalFields(c), EXPECTED_CARDS[c.id], c.id);
});

test('the app text lines are exactly those the A-rows and the design approve (A26, A27, A29 item 1, A33, A34, tubes adult line)', () => {
  const found = [];
  (function walk(node) {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') { if ('app_text' in node) found.push(node.app_text); else Object.values(node).forEach(walk); }
  })(FILE);
  assert.deepEqual(found.sort(), [
    'A no-shock cycle is counted only when recorded.', // A29 (kept)
    'Administration time: see EAS 7.2, dilution 13', // A34
    'Not shown for adults (over 40 kg or 14 years).', // tubes adult line (A18, today's wording)
    'One dose is already recorded.', // A27
    'Seek clinical advice', // A10, A33
    'Standard non-traumatic cardiac arrest. Clinician reference and event recorder. It does not detect a rhythm, operate a defibrillator or infer treatment.', // A29 item 1
    'The EAS 7.2 tables print one amiodarone dose per band.', // A33
    'weight rounded up to the next column', // A26
  ].sort());
});

/* ---------- Checklists and the reversible causes: the full PDF text, in PDF order ----------
   Each expected list is written out here; [heading] marks a line shown but not ticked (tick: false). The test checks
   the list against the PDF (the printed lines from the first to the last, nothing left out) and against the file. */
const EXPECTED_LISTS = {
  arrest: { pdf: 'cpg-cardiac-arrest.pdf', pages: [2, 3], items: ['Team leader identified.', 'Roles allocated and confirmed.', 'CPR feedback device and metronome on if available.',
    'Defibrillator screen visible to the team leader.', 'Airway adjunct or ETT in place and ventilation adequate.', 'ETCO2 attached and waveform visible.', 'Oxygen flow and supply adequate.',
    'IV/IO access secure, two sites if possible.', 'Consider underlying and reversible causes.', 'Appropriate medicines administered.', 'Initiate documentation.', 'Communication with family/bystanders.'] },
  postrosc: { pdf: 'cpg-post-rosc.pdf', pages: [2, 3], items: ['Airway and ventilation are adequate/secure.', 'Vital signs, including blood glucose level.', 'Backup for RSI called for if indicated.',
    'IV access secure.', 'ETCO2 35-45 mmHg if ventilated.', 'Sedation and neuromuscular blockade if indicated.', 'BP above target.', '12 lead ECG.', 'Confirm appropriate transport destination.'] },
  preparation: { pdf: 'cpg-preparation-rsi.pdf', pages: [1], items: ['[heading] This checklist should be used to prepare a patient for RSI while awaiting CCP backup.',
    'Pre-oxygenate by mask.', 'Attach monitor, including ETCO2.', 'Gain IV access, preferably in two sites.', 'Prepare a running line of 0.9% sodium chloride.',
    'Position the patient for optimal airway control.', 'Place an ETT holder under the patient’s head.', 'Ensure suction is working and turn it off.',
    'Prepare a manual ventilation bag with PEEP valve.', 'Maximise space and clear away unnecessary equipment.', 'Consider travelling toward backup.'] },
  rsi: { pdf: 'cpg-rsi-checklist.pdf', pages: [1, 2], items: ['[heading] Roles assigned:', 'Team leader.', 'Airway.', 'Airway assistant.', 'Drugs and monitoring.',
    '[heading] Patient prepared:', 'Check oxygen supply and pre-oxygenate.', 'Consider nasal prongs.', 'Position optimised.', 'IV access patent. Running line attached.', 'Consider marking surgical airway landmarks.',
    '[heading] Monitoring attached and visible:', 'Baseline vital signs.', 'Pulse oximetry, capnography, and cycling BP.',
    '[heading] Equipment checked and ready:', 'PPE.', 'Manual ventilation bag with PEEP valve set to 5 cmH2O.', 'OPA, SGA, and surgical airway equipment.', 'Laryngoscope.',
    'ETT and 10 ml cuff syringe.', 'ETT holder in place.', 'Suction.', 'Bougie and stylet.',
    '[heading] Medicines drawn up, labelled and doses confirmed:', 'Fentanyl (if indicated).', 'Ketamine.', 'Neuromuscular blocker.', 'Post intubation sedation.', 'Metaraminol.',
    '[heading] Team briefing:', 'Airway plan, including failed intubation.', 'Medication plan.', 'Anticipated complications.', 'Any concerns before proceeding?'] },
};
const EXPECTED_TITLES = { arrest: 'Cardiac arrest checklist', postrosc: 'Post cardiac arrest checklist', preparation: 'Airway Backup Checklist', rsi: 'RSI Checklist' };

// The printed lines of the pages, from the line equal to first to the line equal to last (both included). Some PDFs
// repeat the guideline title as the first body line of a later page (EAS 3.15 p3 "Treatment following ROSC"): that
// repeated title is the page's running heading, not part of the list, so it is skipped there and only there.
const RUNNING_TITLES = ['Treatment following ROSC', 'Cardiac Arrest', 'RSI Checklist'];
function printedRun(pdf, pages, first, last) {
  const lines = pages.flatMap((page, i) => {
    const body = pageLines(pdf, page);
    return i > 0 && RUNNING_TITLES.includes(body[0]) ? body.slice(1) : body;
  }).map(sameWords);
  const from = lines.indexOf(sameWords(first)), to = lines.indexOf(sameWords(last), from);
  assert.ok(from >= 0 && to >= from, pdf + ': "' + first + '" to "' + last + '" not found');
  return lines.slice(from, to + 1);
}
const plain = (item) => item.replace(/^\[heading\] /, '');

test('A31: each checklist is the full PDF list in PDF order, with exactly the printed headings and opening sentence not ticked', () => {
  assert.deepEqual(FILE.checklists.map((list) => list.id), Object.keys(EXPECTED_LISTS));
  for (const list of FILE.checklists) {
    const expected = EXPECTED_LISTS[list.id];
    assert.equal(list.title, EXPECTED_TITLES[list.id], list.id + ' title');
    const texts = expected.items.map(plain);
    assert.deepEqual(printedRun(expected.pdf, expected.pages, texts[0], texts.at(-1)), texts.map(sameWords), list.id + ': the PDF prints exactly these lines');
    assert.deepEqual(list.items.map((item) => (item.tick === false ? '[heading] ' : '') + item.text), expected.items, list.id + ': the file holds exactly these lines');
  }
  // The headings that come just before each printed list are where the list starts.
  assert.equal(printedRun('cpg-cardiac-arrest.pdf', [2], 'Cardiac arrest checklist', 'Team leader identified.').length, 2);
  assert.equal(printedRun('cpg-post-rosc.pdf', [2], 'Post cardiac arrest checklist', 'Airway and ventilation are adequate/secure.').length, 2);
  assert.equal(printedRun('cpg-cardiac-arrest.pdf', [3], 'Communication with family/bystanders.', 'Additional information').length, 2);
  assert.equal(printedRun('cpg-post-rosc.pdf', [3], 'Confirm appropriate transport destination.', 'Additional information').length, 2);
});

test('A24: the reversible causes card is the full EAS 3.14 p13 list in PDF order, nothing left out', () => {
  const expected = EXPECTED_CARDS['reversible-causes'].lines;
  assert.deepEqual(printedRun('cpg-cardiac-arrest.pdf', [13], expected[0], expected.at(-1)), expected.map(sameWords));
  assert.equal(pageLines('cpg-cardiac-arrest.pdf', 13).at(-1), expected.at(-1), 'the list ends where the page body ends');
});
