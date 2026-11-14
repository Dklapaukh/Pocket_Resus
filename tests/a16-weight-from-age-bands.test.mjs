// A16 (doc 07 A-table, approved 14 Nov 2026; owner decision 8): weight from age comes from the EAS 7.2 band
// table headings (cpg-paediatric-equipment.pdf pages 5-15: "5 kg / less than one year", "10 kg / 1 year",
// "20 kg / 2-5 years", "30 kg / 6-10 years", "40 kg / 11-13 years"), not the page 1 formulas.
// An age under 1 year stays as typed; any other age is rounded UP to the next whole year (1.1 -> 2).
// Under 1 = 5 kg; 1 = 10 kg; 2-5 = 20 kg; 6-10 = 30 kg; 11-13 = 40 kg; 14 = adult: no weight is filled and the
// pop-up says "Age 14: adult. Enter the weight.". Age 0 or less, above 14, or not a number: refused, with
// "Enter an age from under 1 year to 14 years.". Both age captions (weight and Tube sizes pop-ups) list the rows.
// Before A16: (age + 4) x 2 for whole years 1-10, age x 3 for 11-14 (age 14 = 42 kg), part years 1-14 refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp } from './helpers/dom-app.mjs';
import { ROOT } from './helpers/engines.mjs';
import { Resus as R } from '../src/engine/index.js';

const CAPTION = 'Under 1 year: 5 kg. 1 year: 10 kg. 2–5 years: 20 kg. 6–10 years: 30 kg. 11–13 years: 40 kg. 14 years: adult. ' +
  'Age rounded up to the next whole year. CPG 7.2; estimates may underestimate.';
// on screen the app shows "CPG 7.2" in its usual form, "EAS guideline 7.2" (in italics), as it did before A16
const SHOWN = CAPTION.replace('CPG 7.2', 'EAS guideline 7.2');
const REFUSED = 'Enter an age from under 1 year to 14 years.';
const ADULT = 'Age 14: adult. Enter the weight.';

// age typed -> weight filled (kg), 'adult', or 'refused'; typed here from the row, independent of the rules file
const EXPECTED = {
  '0.01': 5, '0.5': 5, '0.99': 5, '1': 10, '1.1': 20, '1.5': 20, '2': 20, '2.5': 20, '5': 20, '5.2': 30, '6': 30, '7': 30,
  '10': 30, '10.5': 40, '11': 40, '13': 40, '13.2': 'adult', '14': 'adult', '14.5': 'refused', '15': 'refused',
  '0': 'refused', '-1': 'refused', '': 'refused', 'abc': 'refused', '120': 'refused',
};

/* Open the weight pop-up, type the age and tap "Use age estimate". */
function estimateInApp(age, app = openApp({ appDir: ROOT })) {
  app.click('[data-action=weight]');
  app.type('#ageInput', age);
  app.click('[data-action=estimate]');
  const $ = (sel) => app.window.document.querySelector(sel);
  return { app, weight: $('#weightInput').value, error: $('#sheetError').hidden ? '' : $('#sheetError').textContent, $ };
}

test('A16: the engine gives the band weight for every age in the row, and nothing for an adult or refused age', () => {
  for (const [age, want] of Object.entries(EXPECTED)) {
    const kg = R.estimate(age), adult = R.adultAge(age);
    if (typeof want === 'number') { assert.equal(kg, want, `age ${age}`); assert.equal(adult, null, `age ${age} is not adult`); }
    else if (want === 'adult') { assert.equal(kg, null, `age ${age}: no weight`); assert.equal(adult, 14, `age ${age} is adult (rounded up to 14)`); }
    else { assert.equal(kg, null, `age ${age}: no weight`); assert.equal(adult, null, `age ${age} is refused`); }
  }
});

test('A16: the weight pop-up fills the band weight, says "adult" at 14 and refuses other ages with the new text', () => {
  for (const [age, want] of Object.entries(EXPECTED)) {
    const { weight, error } = estimateInApp(age);
    if (typeof want === 'number') { assert.equal(weight, String(want), `age ${age}`); assert.equal(error, '', `age ${age}: no message`); }
    else { assert.equal(weight, '', `age ${age}: no weight filled`); assert.equal(error, want === 'adult' ? ADULT : REFUSED, `age ${age}`); }
  }
});

test('A16: age 6 now uses the 30 kg band (120 J, no paediatric pads prompt); age 5 stays 20 kg (80 J)', () => {
  for (const [age, kg, joules, pads] of [['6', '30', '120', false], ['5', '20', '80', true], ['1.1', '20', '80', true]]) {
    const { app, $ } = estimateInApp(age);
    assert.equal($('#weightPadPrompt').hidden, !pads, `age ${age}: pads prompt in the pop-up`);
    app.click('[data-action=save-weight]');
    const saved = JSON.parse(app.window.localStorage.getItem('resus-pocket-v1'));
    assert.equal(saved.weight, kg, `age ${age}: saved weight`);
    assert.equal(saved.group, 'Child');
    assert.equal(saved.weightSource, `Estimated from age ${age} years · CPG 7.2`, 'saved source unchanged in form');
    assert.equal(saved.age, age);
    assert.equal(app.window.document.querySelector('.header-energy').textContent, `${joules} J · est.`, `age ${age}: header energy`);
    assert.equal(!!app.window.document.querySelector('.pads-prompt'), pads, `age ${age}: header pads prompt`);
  }
});

test('A16: age 14 fills nothing, so no weight is saved until one is typed', () => {
  const { app, weight, error } = estimateInApp('14');
  assert.equal(weight, '');
  assert.equal(error, ADULT);
  app.click('[data-action=save-weight]'); // nothing typed: refused as an invalid weight, as for any empty box
  assert.equal(JSON.parse(app.window.localStorage.getItem('resus-pocket-v1') || '{}').weight || '', '');
});

test('A16: both age captions list the band table headings', () => {
  const { app, $ } = estimateInApp('3');
  assert.equal(R.guideText('weightSheetAgeEstimate'), CAPTION, 'weight pop-up caption in the rule set');
  assert.equal(R.guideText('tubeSheetAgeEstimate'), CAPTION, 'Tube sizes pop-up caption in the rule set');
  assert.equal($('#sheet details .caption').textContent, SHOWN, 'weight pop-up caption');
  app.click('[data-action=save-weight]');
  app.click('[data-tab=guidance]');
  app.click('[data-reference=tubes]');
  const heading = [...app.window.document.querySelectorAll('#sheet h3')].find((h) => h.textContent === 'Age-based weight estimate');
  assert.ok(heading, 'Tube sizes pop-up has its age heading');
  assert.equal(heading.nextElementSibling.textContent, SHOWN, 'Tube sizes pop-up caption');
});
