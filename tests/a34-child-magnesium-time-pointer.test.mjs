// A34 (D10, owner ruling 16 Nov 2026): child magnesium time pointer. EAS 7.2 p4-5.
// Step C3 checks the ENGINE and the card file: 20 kg, torsades: the magnesium pop-up lines end with the app text
// "Administration time: see EAS 7.2, dilution 13" (no time is shown for a child); an adult (and no weight) does not
// get the line.
// Screen checks added at C4: the child magnesium pop-up shows the pointer line; the adult pop-up does not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts } from './helpers/card-sessions.mjs';

const POINTER = 'Administration time: see EAS 7.2, dilution 13';
const details = (weight) => arrest({ weight }).shock('Torsades').card('magnesium').details;

test('A34: 20 kg: the pointer line is shown, as app text citing owner ruling A34', () => {
  assert.deepEqual(details('20').at(-1), { kind: 'app', text: POINTER, source: 'Owner ruling A34 · EAS 7.2 p4-5' });
});

test('A34: no time is shown for a child: no "minutes" line beyond the adult dose sentence', () => {
  const lines = texts(details('20'));
  assert.deepEqual(lines.filter((line) => /minute/.test(line)), ['10 mmol (2.5 g) over 1-2 minutes for an adult.']);
});

test('A34: an adult (70 kg, or no weight) does not get the pointer line', () => {
  for (const weight of ['70', '']) assert.ok(!texts(details(weight)).includes(POINTER), weight || 'no weight');
});
