// Step 3a sub-step 8 (doc 18): lock the partition in. Clinical numbers, guideline sentences, guideline
// links and PDFs live in the rules file (src/rules/nz-eas.js) only. These tests fail if any of them
// reappears as text typed into the app or engine code, or if a {gap} in the wording is left unfilled.
// Comments are ignored; only text the code can show (string and template pieces) is checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { tokenizer } from 'acorn';
import { RULES } from '../src/rules/nz-eas.js';
import { Resus as R } from '../src/engine/index.js';

const DIRS = ['src/app', 'src/engine'];
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
const rulesSentences = [
  ...Object.values(RULES.wording).flatMap((w) => [].concat(w)).flatMap(pieces),
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
  childFluidBasis: { minPerKg: 20, maxPerKg: 40 }, amiodaroneNotYetDue: { first: 3, second: 6 }, amiodaroneSecondNotYetDue: { second: 6 },
  invalidWeight: { maxKg: 500 }, estimatedWeightSource: { age: 7 }, amiodaroneReviewAt: { shocks: 3 }, maxDosesRecorded: { maxDoses: 2 },
  amiodaroneChildPopupDose: { first: 100 }, amiodaroneAdultPopupDose: { first: 300, second: 150 }, drugPopupFooter: { guideline: '14.3' },
  tubeSizeUnderOne: { minMm: 3, maxMm: 4 }, tubeLengthUnderOne: { timesSize: 3 }, tubeSizeFormula: { mm: 5.3 }, tubeLengthFormula: { cm: 15.5 },
};

test('every {gap} in the wording is filled (from part 1 and part 5, or by the app where listed)', () => {
  const gaps = R.wordingGaps();
  for (const value of Object.values(gaps)) assert.ok(value !== undefined && value !== null && !Number.isNaN(value), 'a gap value is missing');
  for (const key of Object.keys(RULES.wording)) {
    for (const text of [].concat(R.guideText(key, APP_VALUES[key]))) {
      assert.doesNotMatch(text, /\{\w+\}|undefined|NaN/, key);
    }
    // the app supplies only what is listed; everything else must come from the rules file
    const own = Object.keys(APP_VALUES[key] || {});
    const used = [...[].concat(RULES.wording[key]).join(' ').matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    for (const gap of used) assert.ok(own.includes(gap) || gap in gaps, `${key}: {${gap}} has no source`);
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
