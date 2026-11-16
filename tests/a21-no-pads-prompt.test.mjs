// A21 (D2, owner ruling 15 Nov 2026): the paediatric pads prompt is removed.
// Step C3 checks the ENGINE and the card file: no card, line, dose or details line mentions pads, for 5, 10, 20 kg
// and an adult.
// Screen checks added at C4: the Live header shows no "Use paediatric pads" for 5, 10, 20 kg or an adult; the wording
// padsPrompt and padsPromptWithLimit and the number numbers.shock.paediatricPadsUpToJ are deleted with the old file (C5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, CARD_TEXT } from './helpers/card-sessions.mjs';

for (const weight of ['5', '10', '20', '70']) {
  test('A21: ' + weight + ' kg: no card shown mentions pads', () => {
    const c = arrest({ weight }).shock('VF').shock('VF').shock('VF');
    const shown = JSON.stringify(c.cards({ request: ['guidance-intro', 'special-situations', 'tubes-lma'] }));
    assert.doesNotMatch(shown, /pads/i);
  });
}

test('A21: the card file holds no pads prompt or pads energy limit', () => {
  assert.doesNotMatch(CARD_TEXT, /pads/i);
});
