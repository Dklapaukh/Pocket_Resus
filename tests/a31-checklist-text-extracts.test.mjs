// A31 (D6, owner ruling 15 Nov 2026): tube, age and checklist text word for word. EAS 7.2 p1; EAS 3.14 p2-3; EAS 3.15
// p2-3; EAS 9.2 p1; EAS 9.4 p1-2.
// Step C3 checks the ENGINE and the card file: the tube sizes card shows the caution sentence and, for a child, the
// band's cuffed ETT size(s), length at lips, LMA size and cuff (adult: the adult line); the age-based weight card shows
// the EAS 7.2 p1 sentence; every checklist item is found word for word on its cited page (the card checker), with the
// EAS 9.4 section headings once each and not ticked. (The full PDF order of each list is checked by
// tests/cards-rule-file.test.mjs.)
// Screen checks added at C4: the Tube sizes and weight sheets show the two sentences; the four checklists show their
// PDF titles, "35-45" with the printed hyphen, and the RSI checklist section headings once each.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, CARDS, GUIDELINE_TEXT } from './helpers/card-sessions.mjs';
import { checkCardFile } from '../src/cards/check.js';

test('A31: tube sizes: the caution sentence, and the 15 kg band values (4 or 5 mm, 15 cm, LMA 2, cuff 10 mL)', () => {
  const tubes = arrest({ weight: '15' }).card('tubes-lma', { request: 'tubes-lma' });
  assert.deepEqual(texts(tubes.lines), ['Children may require a different sized SGA, ETT or length at lips than that predicted by the formulae.']);
  assert.deepEqual(texts(tubes.dose.lines), ['cell:ettSizesMm=[4,5]', 'cell:ettLengthCm=15', 'cell:lmaSize=2', 'cell:lmaCuffMl=10']);
});

test('A31: tube sizes for an adult (60 kg): the adult line, no band values', () => {
  const tubes = arrest({ weight: '60' }).card('tubes-lma', { request: 'tubes-lma' });
  assert.deepEqual(tubes.dose.lines, [{ kind: 'app', text: 'Not shown for adults (over 40 kg or 14 years).', source: 'Owner ruling A18 · EAS 7.2 p1' }]);
});

test('A31: the age-based weight sentence word for word', () => {
  const age = arrest().card('weight-from-age', { request: 'weight-from-age' });
  assert.deepEqual(texts(age.lines), ['If the weight is not known, it can be estimated from the child’s age using formulae, noting that the formulae are a guide only and tend to underestimate true weight.']);
  assert.deepEqual(age.sources, ['EAS 7.2 p1']);
});

test('A31: every checklist item is found word for word on its cited page; section headings once, not ticked', () => {
  assert.deepEqual(checkCardFile(CARDS, GUIDELINE_TEXT), []);
  assert.deepEqual(CARDS.checklists.map((list) => list.title), ['Cardiac arrest checklist', 'Post cardiac arrest checklist', 'Airway Backup Checklist', 'RSI Checklist']);
  assert.ok(CARDS.checklists.find((list) => list.id === 'postrosc').items.some((item) => item.text === 'ETCO2 35-45 mmHg if ventilated.'));
  assert.equal(CARDS.checklists.find((list) => list.id === 'preparation').items[0].text, 'This checklist should be used to prepare a patient for RSI while awaiting CCP backup.');
  const rsi = CARDS.checklists.find((list) => list.id === 'rsi').items;
  const headings = rsi.filter((item) => item.tick === false).map((item) => item.text);
  assert.equal(new Set(headings).size, headings.length);
  for (const item of rsi.filter((i) => i.tick !== false)) for (const heading of headings) assert.ok(!item.text.includes(heading), 'heading repeated in "' + item.text + '"');
});
