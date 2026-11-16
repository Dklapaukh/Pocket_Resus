// A37 (owner decision 22, 16 Nov 2026): screen text trimmed. A23 and A32 approved by the owner, the rest by the trim
// rule with assumed approval. Every trimmed guideline line STAYS in the card file, marked trace_only (kept for audit,
// never drawn), and the card checker still compares it word for word with the packaged PDF.
// One test per A37 item (1 to 14). Each checks, for its item:
//   - what is drawn: exactly the lines A37 lists (what the card engine returns, which is all the screen can draw);
//   - each trimmed line is absent from what the engine returns, present in the card file as trace_only, and still
//     found word for word on its cited PDF page;
// and one test checks that the file has no trace-only line that A37 does not list.
// Step C4 part 1 checks the ENGINE and the card file. The screen checks (each trimmed sentence absent from the drawn
// screen in the fake browser; no source line on any card or pop-up; Settings "Guidelines used") are added at C4 part 2,
// when the screens are rewired to the card engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { comparableText, foundWhole, pageBody, readSource, sameWords, checkCardFile } from '../src/cards/check.js';
import { arrest, texts, CARDS, GUIDELINE_TEXT, fileLines } from './helpers/card-sessions.mjs';

/* ---------- Helpers ---------- */

const fileCard = (id) => CARDS.cards.find((c) => c.id === id);

// Every line of a card in the file (lines, dose, details, confirm), as written.
function allFileLines(card) {
  const dose = card.dose ? [card.dose.adult, card.dose.child].flat() : [];
  return [card.lines, dose, card.details, card.repeat?.confirm].flat().filter(Boolean);
}

// Every piece of text the engine gives the screen for a card (lines, dose lines, details, confirm lines, title).
function drawnTexts(card) {
  return [card.title, ...texts(card.lines), ...(card.dose ? texts(card.dose.lines) : []), ...texts(card.details), ...(card.doses ? texts(card.doses.confirm) : [])];
}

// True when the text is found word for word on one of its cited PDF pages (the same comparison as the card checker).
function matchesPdf(text, source) {
  const { eas } = readSource(source);
  return eas.some(({ code, pages }) => {
    const pdf = CARDS.guidelines[code].pdf;
    return pdf && pages.some((page) => foundWhole(sameWords(text), comparableText([pageBody(GUIDELINE_TEXT[pdf][page - 1])])));
  });
}

/* The trimmed lines of one card: each must be in the file as trace_only (count times, where count is how often the
   sentence is trimmed on that card), match the PDF, and never reach the screen in any of the given sessions. */
function checkTrimmed(id, trimmed, shownCards) {
  const inFile = allFileLines(fileCard(id));
  for (const text of trimmed) {
    const lines = inFile.filter((line) => line.text === text && line.trace_only === true);
    assert.ok(lines.length >= 1, id + ': "' + text + '" is in the card file as trace_only');
    for (const line of lines) assert.ok(matchesPdf(line.text, line.source), id + ': "' + text + '" still matches ' + line.source);
    assert.ok(!inFile.some((line) => line.text === text && line.trace_only !== true), id + ': "' + text + '" is never drawn');
    for (const card of shownCards) assert.ok(!drawnTexts(card).includes(text), id + ': "' + text + '" is absent from what the engine gives the screen');
  }
}

const REQUEST = ['guidance-intro', 'reversible-causes', 'special-situations', 'weight-from-age', 'tubes-lma', 'rsi'];
const THREE = ['If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:', 'Administer amiodarone:'];
const SIX = 'If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:';
const AMIODARONE_DETAILS = ['Cardiac arrest: administer IV undiluted as a bolus.', 'Contraindications', 'Known severe allergy.', 'Known severe allergy to iodine.',
  'VT secondary to cyclic antidepressant poisoning. In this setting amiodarone administration can be associated with severe worsening of shock, without resolution of the rhythm.',
  'If torsades de pointes is present or has occurred.'];
const HOW_TO_GIVE = ['Adults and children whose weight has been rounded to 50 kg or more: administer undiluted as an IV bolus.',
  'Children whose weight has been rounded to 40 kg or less: dilute 1 mg of adrenaline to a total of 10 ml using 0.9% sodium chloride. This solution is 1:10,000 and contains 0.1 mg/ml. Draw up the dose from this solution and administer as an IV bolus.'];
const REPEAT = 'Repeat once if torsades de pointes recurs or persists.';
const POINTER = 'Administration time: see EAS 7.2, dilution 13';
const EAS314_P1 = ['This guideline is for adults and children in non-traumatic cardiac arrest.', 'Perform two-minute cycles of high performance CPR between rhythm checks.',
  'Administer adrenaline IV every four minutes:', '1 mg IV for an adult.', 'See the paediatric drug dose tables for a child.',
  ...THREE, '300 mg IV for an adult.', SIX, '150 mg IV for an adult.', 'Maximum joule setting for an adult.', 'See the paediatric drug dose tables for joule settings for a child.'];
const RSI_TRIMMED = ['2 mg/kg of rocuronium or suxamethonium (to a maximum of 200 mg) is an appropriate dose for all patients.',
  'The dose should usually be rounded to the nearest 50 mg in adults.'];
const BACKUP_OPENING = 'This checklist should be used to prepare a patient for RSI while awaiting CCP backup.';

// Every trimmed line A37 lists, by card (each sentence once per card; the checklist item separately).
const A37_TRIMS = {
  'amiodarone-1': THREE,
  'amiodarone-2': [SIX],
  'shock-energy': ['Defibrillate immediately if the cardiac rhythm is VF or VT using a single shock and immediately recommence chest compressions:'],
  'cpr-clock': ['Perform two-minute cycles of high performance CPR between rhythm checks.'],
  adrenaline: ['Administer adrenaline IV every four minutes:', 'Cardiac arrest:'],
  magnesium: ['If torsades de pointes is present or has occurred', 'Administer magnesium IV:', 'See the paediatric drug dose tables for a child.', '10 mmol (2.5 g) over 1-2 minutes for an adult.'],
  fluids: ['If the patient is in PEA', 'Administer 0.9% sodium chloride IV:', '20-40 ml/kg IV for a child.'],
  'guidance-intro': EAS314_P1,
  'reversible-causes': ['Potentially reversible causes of PEA include:'],
  rsi: RSI_TRIMMED,
};

/* ---------- One test per A37 item ---------- */

test('A37 item 1: amiodarone card: the dose line and the dose count only; the three- and six-shock sentences and "Administer amiodarone:" not drawn', () => {
  const adult = arrest({ weight: '70' }).shock().shock().shock();
  const first = adult.card('amiodarone-1');
  assert.deepEqual(texts(first.lines), []);
  assert.deepEqual(texts(first.dose.lines), ['300 mg IV for an adult.']);
  assert.deepEqual(first.doses, { count: 0, max: 1, complete: false, confirm: [] });
  const child = arrest({ weight: '15' }).shock().shock().shock();
  assert.deepEqual(texts(child.card('amiodarone-1').dose.lines), ['cell:amiodaroneFirstMg=100']);
  adult.dose('amiodarone', 300).shock().shock().shock();
  const second = adult.card('amiodarone-2');
  assert.deepEqual(texts(second.lines), []);
  assert.deepEqual(texts(second.dose.lines), ['150 mg IV for an adult.']);
  child.dose('amiodarone', 100).shock().shock().shock();
  assert.deepEqual(texts(child.card('amiodarone-2').dose.lines), ['Seek clinical advice']);
  checkTrimmed('amiodarone-1', THREE, [first, child.card('amiodarone-2')]);
  checkTrimmed('amiodarone-2', [SIX], [second, child.card('amiodarone-2')]);
});

test('A37 item 2 (A32): no source line is drawn: sources stay in the card file; Settings keeps the nine guidelines', () => {
  // The engine returns sources for audit only (the screen never draws them: checked at C4 part 2). Every card that
  // shows has its sources from the file.
  const card = arrest({ weight: '15' }).shock('Torsades').card('magnesium');
  assert.ok(card.sources.length > 0);
  for (const source of card.sources) assert.equal(readSource(source).problem, null);
  assert.deepEqual(Object.keys(CARDS.guidelines), ['3.14', '3.15', '7.2', '9.2', '9.3', '9.4', '14.3', '14.4', '14.27']);
  for (const [code, entry] of Object.entries(CARDS.guidelines)) {
    assert.match(entry.web, /^https:\/\//, code + ' website');
    assert.equal(entry.pdf === null, code === '14.27', code + ': packaged PDF (website only for 14.27, D12)');
  }
});

test('A37 item 3: shock energy header: the energy only, at all times (decision 23a)', () => {
  for (const c of [arrest({ start: false, weight: '15' }), arrest({ weight: '15' }), arrest({ weight: '15' }).shock().rosc()]) {
    const energy = c.card('shock-energy');
    assert.deepEqual(texts(energy.lines), []);
    assert.deepEqual(texts(energy.dose.lines), ['cell:shockRangeJ=[80,100]']);
    checkTrimmed('shock-energy', A37_TRIMS['shock-energy'], [energy]);
  }
  assert.deepEqual(texts(arrest({ weight: '70' }).card('shock-energy').dose.lines), ['Maximum joule setting for an adult.']);
  assert.deepEqual(fileCard('shock-energy').show_when, ['always']);
});

test('A37 item 4: CPR clock: the sentence is not drawn (decision 23b)', () => {
  const clock = arrest().card('cpr-clock');
  assert.deepEqual(drawnTexts(clock), ['CPR clock']);
  checkTrimmed('cpr-clock', A37_TRIMS['cpr-clock'], [clock]);
});

test('A37 item 5: adrenaline: the card draws the dose only; the pop-up the two EAS 14.3 how-to-give sentences', () => {
  for (const [weight, dose] of [['70', '1 mg IV for an adult.'], ['15', 'cell:adrenalineMg=0.2']]) {
    const card = arrest({ weight }).card('adrenaline');
    assert.deepEqual(texts(card.lines), []);
    assert.deepEqual(texts(card.dose.lines), [dose]);
    assert.deepEqual(texts(card.details), HOW_TO_GIVE);
    checkTrimmed('adrenaline', A37_TRIMS.adrenaline, [card]);
  }
});

test('A37 item 6: amiodarone pop-up: "Cardiac arrest: administer IV undiluted as a bolus.", "Contraindications" and the four contraindications; dose lines as item 1', () => {
  const c = arrest({ weight: '70' }).shock().shock().shock();
  assert.deepEqual(texts(c.card('amiodarone-1').details), AMIODARONE_DETAILS);
  c.dose('amiodarone', 300).shock().shock().shock();
  assert.deepEqual(texts(c.card('amiodarone-2').details), AMIODARONE_DETAILS);
  for (const id of ['amiodarone-1', 'amiodarone-2']) assert.ok(fileCard(id).details.every((line) => !line.trace_only), id + ': nothing trimmed from the pop-up');
});

test('A37 item 7: magnesium: card "Withhold amiodarone." and the dose; pop-up "Magnesium": "Withhold amiodarone.", the dose, the repeat sentence, the child pointer', () => {
  const adult = arrest({ weight: '70' }).shock('Torsades');
  const card = adult.card('magnesium');
  assert.equal(card.title, 'Magnesium');
  assert.deepEqual(texts(card.lines), ['Withhold amiodarone.']);
  assert.deepEqual(texts(card.dose.lines), ['10 mmol (2.5 g) over 1-2 minutes for an adult.']);
  assert.deepEqual(texts(card.details), ['Withhold amiodarone.', REPEAT]);
  const child = arrest({ weight: '20' }).shock('Torsades').card('magnesium');
  assert.deepEqual(texts(child.dose.lines), ['cell:magnesiumMmol=4']);
  assert.deepEqual(texts(child.details), ['Withhold amiodarone.', REPEAT, POINTER]);
  // The repeat sheet is unchanged (A27).
  adult.dose('magnesium', 10, 'mmol').advance(10000);
  assert.deepEqual(texts(adult.card('magnesium').doses.confirm), ['One dose is already recorded.', REPEAT]);
  // The pop-up's dose is the card's dose for this patient: the adult dose sentence in the details is trace-only, so a
  // child never sees the adult dose in the pop-up; the card itself still draws the adult dose for an adult.
  checkTrimmed('magnesium', A37_TRIMS.magnesium.slice(0, 3), [card, child, adult.card('magnesium')]);
  assert.deepEqual(fileLines('magnesium', 'details').filter((line) => line.startsWith('10 mmol')), ['10 mmol (2.5 g) over 1-2 minutes for an adult. [trace]']);
  assert.ok(!texts(child.details).includes('10 mmol (2.5 g) over 1-2 minutes for an adult.'));
});

test('A37 item 8: fluids: card "Correct immediately reversible causes." and the dose; pop-up "Fluids · NaCl 0.9%" with the cause line and the adult and child lines', () => {
  for (const [weight, dose] of [['', '1-2 litres IV for an adult.'], ['70', '1-2 litres IV for an adult.'], ['15', 'cell:fluidsTableMl=400']]) {
    const card = arrest({ weight }).noShock('PEA').card('fluids');
    assert.equal(card.title, 'Fluids · NaCl 0.9%');
    assert.deepEqual(texts(card.lines), ['Correct immediately reversible causes.']);
    assert.deepEqual(texts(card.dose.lines), [dose], weight || 'no weight (A36)');
    assert.deepEqual(texts(card.details), ['Correct immediately reversible causes.', '1-2 litres IV for an adult.', '20-40 ml/kg IV for a child.']);
    assert.ok(!/allows up to 40/.test(drawnTexts(card).join('\n')), "A19's source line is replaced");
    checkTrimmed('fluids', A37_TRIMS.fluids.slice(0, 2), [card]);
    if (weight === '15') assert.ok(!texts(card.dose.lines).includes('20-40 ml/kg IV for a child.'), 'the child card line is trace-only');
  }
  assert.deepEqual(fileLines('fluids', 'dose.child'), ['cell:fluidsTableMl', '20-40 ml/kg IV for a child. [trace]']);
});

test('A37 item 9: Guidance opening text: item 1 (plain app text), the EAS 7.2 p1 and p2 sentences, the no-shock line; the EAS 3.14 p1 sentences not drawn', () => {
  const intro = arrest().card('guidance-intro', { request: 'guidance-intro' });
  assert.deepEqual(texts(intro.lines), [
    'Standard non-traumatic cardiac arrest. Clinician reference and event recorder. It does not detect a rhythm, operate a defibrillator or infer treatment.',
    'The following pages contain tables of paediatric drug doses. They are based on rounding the child’s weight up to 5, 10, 20, 30 or 40 kg.',
    'The usual recommended defibrillation energy for a child is 4 J/kg, but this may not be available for all defibrillators. If the recommended defibrillation energy level is not available, select the next highest level.',
    'A no-shock cycle is counted only when recorded.']);
  assert.deepEqual(intro.lines.map((line) => line.kind), ['app', 'guideline', 'guideline', 'app']);
  checkTrimmed('guidance-intro', EAS314_P1, [intro]);
  assert.equal(fileCard('guidance-intro').lines.filter((line) => line.trace_only).length, 14,
    'all fourteen EAS 3.14 p1 sentences are trace-only (A37 says "twelve"; its drawn list leaves none of the fourteen)');
});

test('A37 item 10: reversible causes: titled "Reversible causes", the eight causes; the lead-in not drawn', () => {
  const causes = arrest().card('reversible-causes', { request: 'reversible-causes' });
  assert.equal(causes.title, 'Reversible causes');
  assert.deepEqual(texts(causes.lines), ['Hypoxia.', 'Hypothermia.', 'Hypovolaemia (including anaphylaxis).', 'Hyper/hypokalaemia (and other metabolic abnormalities).',
    'Tension pneumothorax.', 'Tamponade (cardiac).', 'Toxins (poisoning).', 'Thrombosis (pulmonary and coronary).']);
  checkTrimmed('reversible-causes', A37_TRIMS['reversible-causes'], [causes]);
});

test('A37 item 11: special situations: in the Settings note (decision 23e), the trauma sentence and the nine headings unchanged', () => {
  const special = arrest().card('special-situations', { request: 'special-situations' });
  assert.equal(special.place, 'settings');
  assert.equal(special.lines.length, 10);
  assert.ok(fileCard('special-situations').lines.every((line) => !line.trace_only));
});

test('A37 item 12: RSI: the fentanyl, ketamine and blockade lines and the p4 seizure sentence drawn; the p4 dose sentence and the p5 rounding sentence not drawn', () => {
  for (const weight of ['70', '20', '45']) {
    const rsi = arrest({ weight }).card('rsi', { request: 'rsi' });
    assert.equal(rsi.lines.length, 13);
    assert.equal(texts(rsi.lines).at(-1), 'Do not reduce the dose of ketamine in the setting of RSI for prolonged seizures.');
    assert.equal(texts(rsi.dose.lines).includes('weight rounded up to the next column'), weight !== '20', 'A26 line for an adult column');
    checkTrimmed('rsi', RSI_TRIMMED, [rsi]);
  }
});

test('A37 item 13: checklists unchanged except the Airway Backup opening sentence, kept as trace-only', () => {
  const backup = CARDS.checklists.find((list) => list.id === 'preparation');
  const opening = backup.items.find((item) => item.text === BACKUP_OPENING);
  assert.equal(opening.trace_only, true);
  assert.ok(matchesPdf(opening.text, opening.source));
  const traced = CARDS.checklists.flatMap((list) => list.items.filter((item) => item.trace_only).map((item) => list.id + ': ' + item.text));
  assert.deepEqual(traced, ['preparation: ' + BACKUP_OPENING], 'no other checklist item is trimmed');
});

test('A37 item 14: weight-from-age caption and tube caution unchanged (drawn)', () => {
  const age = arrest().card('weight-from-age', { request: 'weight-from-age' });
  assert.equal(age.place, 'weight-sheet', 'opened from the weight sheet (decision 23e)');
  assert.deepEqual(texts(age.lines), ['If the weight is not known, it can be estimated from the child’s age using formulae, noting that the formulae are a guide only and tend to underestimate true weight.']);
  const tubes = arrest({ weight: '15' }).card('tubes-lma', { request: 'tubes-lma' });
  assert.deepEqual(texts(tubes.lines), ['Children may require a different sized SGA, ETT or length at lips than that predicted by the formulae.']);
});

/* ---------- Nothing else is trimmed ---------- */

test('A37: every trace-only line in the card file is one A37 lists, and the file still passes the checker (every trace-only line matched with the PDF)', () => {
  assert.deepEqual(checkCardFile(CARDS, GUIDELINE_TEXT), []);
  const found = {};
  for (const card of CARDS.cards) {
    const trimmed = [...new Set(allFileLines(card).filter((line) => line.trace_only).map((line) => line.text))];
    if (trimmed.length) found[card.id] = trimmed;
  }
  const sorted = (map) => Object.fromEntries(Object.entries(map).map(([id, list]) => [id, [...new Set(list)].sort()]).sort());
  assert.deepEqual(sorted(found), sorted(A37_TRIMS));
  // And none of them reaches the screen in a run that shows every card.
  const shown = [arrest({ weight: '15' }).shock().shock().shock(), arrest({ weight: '70' }).shock().shock().shock().dose('amiodarone').shock().shock().shock(),
    arrest({ weight: '20' }).shock('Torsades').noShock('PEA')].flatMap((c) => c.cards({ request: REQUEST }));
  assert.deepEqual([...new Set(shown.map((card) => card.id))].sort(), CARDS.cards.map((card) => card.id).sort());
  const drawn = new Set(shown.flatMap(drawnTexts));
  // A trimmed sentence may be drawn on ANOTHER card where A37 keeps it (the adult dose lines, "Withhold amiodarone.").
  const keptElsewhere = new Set(['1 mg IV for an adult.', '300 mg IV for an adult.', '150 mg IV for an adult.', 'Maximum joule setting for an adult.', '10 mmol (2.5 g) over 1-2 minutes for an adult.', '20-40 ml/kg IV for a child.']);
  for (const text of Object.values(A37_TRIMS).flat()) if (!keptElsewhere.has(text)) assert.ok(!drawn.has(text), '"' + text + '" is drawn somewhere');
});
