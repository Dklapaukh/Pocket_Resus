// Step 3a sub-step 8 (doc 18): lock the partition in. Clinical numbers, guideline sentences, guideline
// links and PDFs live in the rules file (src/rules/nz-eas.yaml) only. These tests fail if any of them
// reappears as text typed into the app or engine code, or if a {gap} in the wording is left unfilled.
// Comments are ignored; only text the code can show (string and template pieces) is checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { tokenizer } from 'acorn';
import { RULES } from '../src/rules/load.js';
import { Resus as R } from '../src/engine/index.js';

const DIRS = ['src/app', 'src/engine', 'src/rules']; // src/rules: the loader, reader and checker hold no rules text either
const code = DIRS.flatMap((dir) => readdirSync(new URL(`../${dir}/`, import.meta.url))
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    const src = readFileSync(new URL(`../${dir}/${f}`, import.meta.url), 'utf8');
    const texts = [];
    for (const t of tokenizer(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true }))
      if (t.type.label === 'string' || t.type.label === 'template') texts.push({ text: String(t.value), where: `${dir}/${f}:${t.loc.start.line}` });
    return texts;
  })).flat();

// A number followed by a clinical unit, e.g. "200 J", "2 mg/kg", "1–2 minutes", "0.9%", "3 shocks".
const CLINICAL_NUMBER = /\d(?:[\d.]*)\s*(?:–\s*\d[\d.]*\s*)?(?:mg|mcg|mmol|mL|ml|L|g|J|kg|mm|cm|mmHg|cmH2O|min|minutes?|shocks?|years?)\b|\d+\.\d+\s*%/;

test('no clinical number with its unit is typed into the app or engine code', () => {
  const found = code.filter((c) => CLINICAL_NUMBER.test(c.text)).map((c) => `${c.where}: ${JSON.stringify(c.text.slice(0, 80))}`);
  assert.deepEqual(found, []);
});

test('no guideline link, PDF file or EAS guideline number is typed into the app or engine code', () => {
  const found = code.filter((c) => /https?:\/\/|\.pdf\b|\bEAS(?: guideline)? \d|\b\d+\.\d+\b(?=.*guideline)/.test(c.text))
    .map((c) => `${c.where}: ${JSON.stringify(c.text.slice(0, 80))}`);
  assert.deepEqual(found, []);
});

// Pieces of rules-file text long enough to be recognised (wording split at its {gaps}).
const pieces = (text) => text.split(/\{\w+\}/).map((p) => p.trim()).filter((p) => p.length >= 20);
// Every wording entry as { path, texts }: a plain entry, a list of paragraphs, or an entry inside a group (stage 2).
function wordingEntries(node, path = '') {
  if (typeof node === 'string' || Array.isArray(node)) return [{ path, texts: [].concat(node) }];
  return Object.entries(node).flatMap(([key, value]) => wordingEntries(value, path ? path + '.' + key : key));
}
const ALL_WORDING = wordingEntries(RULES.wording);
const rulesSentences = [
  // the guideline sentences (top-level entries); the stage 2 groups of screen text are checked further down
  ...Object.values(RULES.wording).filter((w) => typeof w === 'string' || Array.isArray(w)).flatMap((w) => [].concat(w)).flatMap(pieces),
  ...RULES.checklists.lists.flatMap((l) => l.items).filter((t) => t.length >= 20),
  ...RULES.checklists.causes.map((c) => c.text),
];

test('no guideline sentence from the rules file is also typed into the app or engine code', () => {
  const found = [];
  for (const sentence of rulesSentences)
    for (const c of code) if (c.text.includes(sentence)) found.push(`${c.where}: ${JSON.stringify(sentence.slice(0, 60))}`);
  assert.deepEqual(found, []);
});

// Values the app supplies itself when it shows these entries (everything else comes from the rules file).
const APP_VALUES = {
  adultDoseBasis: { adultAboveKg: 40 }, childDoseBasis: { band: 20 }, childMagnesiumBasis: { band: 20 }, noMagnesiumDoseBasis: { band: 5 },
  childFluidBasis: { band: 20, min: 400, maxPerKg: 40, max: 800 }, amiodaroneNotYetDue: { first: 3, second: 6 }, amiodaroneSecondNotYetDue: { second: 6 },
  invalidWeight: { maxKg: 500 }, estimatedWeightSource: { age: 7 }, amiodaroneReviewAt: { shocks: 3 }, maxDosesRecorded: { maxDoses: 2 },
  amiodaroneChildPopupDose: { first: 100 }, amiodaroneAdultPopupDose: { first: 300, second: 150 }, drugPopupFooter: { guideline: '14.3' },
  tubeSizeUnderOne: { minMm: 3, maxMm: 4 }, tubeLengthUnderOne: { timesSize: 3 }, tubeSizeFormula: { mm: 5.3 }, tubeLengthFormula: { cm: 15.5 },
  // A16: the adult-age message (app) and the age-row phrases (filled by the engine's ageEstimateGaps)
  estimateAgeAdult: { age: 14 }, ageBandWeight: { ages: '2–5 years', kg: 20 }, ageOneYear: { age: 1 }, ageManyYears: { age: 14 }, ageYearRange: { from: 2, to: 5 },
};

// Gaps the app itself supplies for the stage 2 entries (anything else must come from the rules file).
const APP_GAP_NAMES = ['dose', 'name', 'weight', 'source', 'energy', 'rhythm', 'minutes', 'count', 'number', 'late', 'time', 'sign', 'clock',
  'note', 'phase', 'before', 'after', 'shocks', 'noShock', 'amiodarone', 'item', 'key', 'value', 'methods', 'unit', 'route', 'notes', 'code', 'issuer',
  'label', 'kind', 'title', 'details', 'start', 'extension', 'state', 'min', 'max', 'size', 'total', 'ranges', 'age', 'source'];

test('every {gap} in the wording is filled (from part 1 and part 5, or by the app where listed)', () => {
  const gaps = R.wordingGaps();
  for (const value of Object.values(gaps)) assert.ok(value !== undefined && value !== null && !Number.isNaN(value), 'a gap value is missing');
  for (const { path, texts } of ALL_WORDING) {
    const used = [...texts.join(' ').matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const own = Object.keys(APP_VALUES[path] || {});
    for (const gap of used) assert.ok(own.includes(gap) || gap in gaps || (!(path in APP_VALUES) && !(path in RULES.wording) && APP_GAP_NAMES.includes(gap)), `${path}: {${gap}} has no source`);
    // fill the app's own gaps with a sample and check nothing is left over
    const sample = Object.fromEntries(used.filter((g) => !(g in gaps)).map((g) => [g, APP_VALUES[path]?.[g] ?? '1']));
    for (const text of [].concat(R.guideText(path, { ...sample, ...APP_VALUES[path] }))) assert.doesNotMatch(text, /\{\w+\}|undefined|NaN/, path);
  }
});

test('the wording reads exactly as v21 when filled (spot checks across the five parts)', () => {
  assert.equal(R.guideText('headerEnergyTitle'), '4 J/kg of CPG weight band · maximum 200 J');
  assert.deepEqual(R.guideText('adrenalineHow'), [
    'NZCPG cardiac arrest: every 4 minutes. Adults and children rounded to 50 kg or more: IV bolus, undiluted.',
    'Children rounded to 40 kg or less: dilute 1 mg to a total of 10 mL with 0.9% sodium chloride (0.1 mg/mL). Draw up the dose and give as an IV bolus.',
  ]);
  assert.equal(R.guideText('fluidsExtract'), 'The IV volume reference is 1–2 L in adults, or 20–40 mL/kg in children. Assess and treat the reversible cause.');
  assert.equal(R.guideText('guidanceIntro')[1], 'NZCPG <em>EAS guideline 3.14</em>: two minute CPR cycles; adrenaline review every 4 minutes; amiodarone reviews at 3 and 6 VF / pulseless VT shocks. Weight references retain the source app’s 5 / 10 / 20 / 30 / 40 kg paediatric bands.');
  assert.equal(R.guideText('guidanceCaption'), 'Packaged NZCPG exports: 24 September 2026. Reversible causes: ANZCOR 11.2. Local protocol takes precedence. This extracted app requires clinical validation before patient-care use.');
});

/* ---------- Stage 2 (doc 18, items F, 31, 34, 37, 39, 40): screen text, timer thresholds, choice lists,
   equipment form questions and log settings now live in the rules file. None may creep back into code. ---------- */

const movedTexts = [
  ...ALL_WORDING.flatMap((entry) => entry.texts),
  ...Object.values(RULES.equipment.forms).flatMap((group) => Object.values(group)).flatMap((v) => [].concat(v)).filter((v) => typeof v === 'string'),
].flatMap((text) => text.split(/\{\w+\}/)).map((p) => p.replace(/<[^>]*>/g, '').trim()).filter((p) => p.length >= 4);

// Names the program uses as labels in saved data or logic (not text a person reads): they may stay in code.
const TECHNICAL_NAMES = new Set([
  ...Object.values(RULES.numbers.rhythms).flat(), ...Object.values(RULES.numbers.correctionRhythms).flat(),
  'Ready', 'Active', 'ROSC', 'Ended', 'Adult', 'Child', 'Not recorded', 'Entered', 'Estimated', 'ANZCOR', 'started', 'finished', 'shock', 'shocks', 'mmol', 'mL',
  'medicine', 'resus-', // an event type and the start of a session id, which only happen to be words in the rules file too
]);

// check.js only builds the plain-English problem messages for the person editing the rules (never shown on a screen
// during care), and they naturally repeat a few of the same words.
const TEXT_CHECK_EXEMPT = ['src/app/data.js', 'src/rules/check.js'];
const looksLikeAWordingKey = (token) => /^[a-z]\w*(\.\w*)+$/.test(token);

test('no screen text, message, label or form question from the rules file is also typed into the app or engine code', () => {
  const found = [];
  for (const piece of new Set(movedTexts)) {
    if (TECHNICAL_NAMES.has(piece)) continue;
    const isPhrase = /\s/.test(piece) && piece.length >= 8; // a phrase must not appear inside any text; a single word only as a whole text
    for (const c of code) {
      if (TEXT_CHECK_EXEMPT.some((file) => c.where.startsWith(file))) continue;
      const token = c.text.trim();
      if (looksLikeAWordingKey(token)) continue;
      if (isPhrase ? c.text.includes(piece) : token === piece) found.push(`${c.where}: ${JSON.stringify(piece)}`);
    }
  }
  assert.deepEqual(found, []);
});

// Numbers and lists the rules file now holds (stage 2) must not be typed into code as numbers or lists.
const codeTokens = DIRS.flatMap((dir) => readdirSync(new URL(`../${dir}/`, import.meta.url))
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({
    where: `${dir}/${f}`,
    tokens: [...tokenizer(readFileSync(new URL(`../${dir}/${f}`, import.meta.url), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' })]
      .map((t) => (t.type.label === 'num' || t.type.label === 'string' ? JSON.stringify(t.value) : t.type.label === 'template' ? '`' : t.type.label)),
  })));

test('timer thresholds (15 s, 30 s) are not typed into the app or engine code', () => {
  const t = RULES.numbers.timing;
  const found = [];
  for (const { where, tokens } of codeTokens)
    for (const ms of [t.prepareAtMs, t.warningAtMs, t.adrenalineHighlightMs]) if (tokens.includes(String(ms))) found.push(`${where}: ${ms}`);
  assert.deepEqual(found, []);
  assert.ok(codeTokens.some(({ where, tokens }) => where.endsWith('views.js') && tokens.includes('1000') === false), 'views.js no longer types the 1 s overdue limit');
});

test('lists the rules file holds (rhythms, quick choices, event types, units, device groups, form choices) are not typed into code as lists', () => {
  const lists = [];
  (function walk(node, path) {
    if (Array.isArray(node)) { if (node.length >= 3 && node.every((v) => typeof v === 'string' || typeof v === 'number')) lists.push({ path, items: node }); return; }
    if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, path + '.' + k);
  })({
    numbers: { resusStart: RULES.numbers.resusStart, correctionRhythms: RULES.numbers.correctionRhythms, log: RULES.numbers.log, medicineForm: RULES.numbers.medicineForm },
    equipment: { accessDevices: RULES.equipment.accessDevices, forms: RULES.equipment.forms },
  }, '');
  assert.ok(lists.length >= 8);
  const found = [];
  for (const { where, tokens } of codeTokens)
    for (const { path, items } of lists) {
      const pattern = items.map((v) => JSON.stringify(v));
      for (let i = 0; i + pattern.length <= tokens.length; i++)
        if (pattern.every((v, j) => tokens[i + j * 2] === v)) found.push(`${where}: the list ${path}`);
    }
  assert.deepEqual(found, []);
});
