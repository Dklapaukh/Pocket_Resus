// A29 (D6, owner ruling 15 Nov 2026): Guidance opening text and special situations word for word. EAS 3.14 p1,
// p16-18; EAS 7.2 p1, p2.
// Step C3 checks the ENGINE and the card file: opened from Guidance, the opening text card shows item 1 (app text:
// what the app is), the EAS 3.14 and EAS 7.2 sentences word for word, then the kept app text; the special situations
// card shows the trauma sentence and the nine headings as printed; "capped at 200 J" is nowhere.
// Screen checks added at C4: the Guidance opening text as written; the settings special-situation note (its place is
// owner question 1e, DECISIONS.md section 6); item 1 drawn plain (question 1d).
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, CARD_TEXT } from './helpers/card-sessions.mjs';

const INTRO = [
  'Standard non-traumatic cardiac arrest. Clinician reference and event recorder. It does not detect a rhythm, operate a defibrillator or infer treatment.',
  'This guideline is for adults and children in non-traumatic cardiac arrest.', 'Perform two-minute cycles of high performance CPR between rhythm checks.',
  'Administer adrenaline IV every four minutes:', '1 mg IV for an adult.', 'See the paediatric drug dose tables for a child.',
  'If in VF or VT after three shocks, including shocks delivered prior to ambulance arrival:', 'Administer amiodarone:', '300 mg IV for an adult.', 'See the paediatric drug dose tables for a child.',
  'If in VF or VT after six shocks, including shocks delivered prior to ambulance arrival, administer a second dose of amiodarone:', '150 mg IV for an adult.', 'See the paediatric drug dose tables for a child.',
  'Maximum joule setting for an adult.', 'See the paediatric drug dose tables for joule settings for a child.',
  'The following pages contain tables of paediatric drug doses. They are based on rounding the child’s weight up to 5, 10, 20, 30 or 40 kg.',
  'The usual recommended defibrillation energy for a child is 4 J/kg, but this may not be available for all defibrillators. If the recommended defibrillation energy level is not available, select the next highest level.',
  'A no-shock cycle is counted only when recorded.'];
const SPECIAL = ['See the ‘cardiac arrest secondary to trauma’ guideline if the cardiac arrest is secondary to trauma.', 'Cardiac arrest secondary to drowning',
  'Cardiac arrest secondary to hanging', 'Cardiac arrest secondary to asthma', 'Cardiac arrest secondary to anaphylaxis', 'Cardiac arrest secondary to cyclic antidepressant poisoning',
  'Cardiac arrest during pregnancy greater than 20 weeks', 'Cardiac arrest secondary to hypothermia', 'Cardiac arrest secondary to hyperkalaemia', 'Cardiac arrest secondary to opiate poisoning'];

test('A29: the Guidance opening text, word for word; item 1 and the last line are app text', () => {
  const intro = arrest().card('guidance-intro', { request: 'guidance-intro' });
  assert.deepEqual(texts(intro.lines), INTRO);
  const kinds = intro.lines.map((l) => l.kind);
  assert.deepEqual([kinds[0], kinds.at(-1)], ['app', 'app']);
  assert.ok(kinds.slice(1, -1).every((kind) => kind === 'guideline'));
  assert.deepEqual(intro.sources, ['EAS 3.14 p1', 'EAS 7.2 p1', 'EAS 7.2 p2']);
});

test('A29: the special situations: the trauma sentence and the nine headings as printed', () => {
  const special = arrest().card('special-situations', { request: 'special-situations' });
  assert.deepEqual(texts(special.lines), SPECIAL);
  assert.deepEqual(special.sources, ['EAS 3.14 p1', 'EAS 3.14 p16', 'EAS 3.14 p17', 'EAS 3.14 p18']);
});

test('A29: no "capped at 200 J" anywhere', () => {
  assert.doesNotMatch(CARD_TEXT, /capped/i);
  assert.doesNotMatch(CARD_TEXT, /200 J/);
});
