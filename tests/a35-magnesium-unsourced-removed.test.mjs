// A35 (D12, owner ruling 16 Nov 2026): the two unsourced magnesium sentences are removed until EAS 14.27 is packaged.
// Step C3 checks the ENGINE and the card file: for an adult and a child after torsades, no magnesium card line, dose,
// repeat line or pop-up line holds the adult dilution to 10 mL or "Avoid the IV line carrying a concurrent adrenaline
// infusion because precipitation can occur"; neither is anywhere in the card file; EAS 14.27 has no packaged PDF.
// Screen checks added at C4: the adult and child magnesium pop-ups have neither sentence (the wording is deleted with
// the old rule file at C5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, CARDS, CARD_TEXT } from './helpers/card-sessions.mjs';

const UNSOURCED = [/precipitation/i, /concurrent adrenaline infusion/i, /dilute[^"]*10 m[lL]/i];

for (const weight of ['70', '20', '']) {
  test('A35: ' + (weight ? weight + ' kg' : 'no weight') + ', torsades, one dose: neither sentence anywhere on the magnesium card', () => {
    const shown = JSON.stringify(arrest({ weight }).shock('Torsades').dose('magnesium', 10, 'mmol').card('magnesium'));
    for (const pattern of UNSOURCED) assert.doesNotMatch(shown, pattern);
  });
}

test('A35: neither sentence is in the card file; EAS 14.27 is online only', () => {
  assert.doesNotMatch(CARD_TEXT, /precipitation|concurrent adrenaline infusion/i);
  assert.equal(CARDS.guidelines['14.27'].pdf, null);
});
