// A24 (D5, owner ruling 15 Nov 2026): the EAS reversible causes replace the ANZCOR prompts. EAS 3.14 p13.
// Step C3 checks the ENGINE and the card file: the card shows the heading and eight causes word for word when it is
// opened from Guidance, in any rhythm and whether or not an arrest is running; no ANZCOR text anywhere; the guideline
// has its website link and its packaged PDF (page 13 is cited).
// Screen checks added at C4: the Guidance tab shows the heading and the eight causes; the caption's "Reversible
// causes: ..." is gone; the button "EAS 3.14 Cardiac Arrest" opens the website online and cpg-cardiac-arrest.pdf#page=13
// offline (airplane mode).
// Step C4 (owner decisions 22 and 23e, A37 item 10, which wins on what is drawn): the card is titled "Reversible
// causes" and draws the eight causes; "Potentially reversible causes of PEA include:" stays in the card file as a
// trace-only line (checked here); the link button is not drawn (the Settings tab links EAS 3.14, A32).
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, CARDS, SHOWN_TEXT, fileLines } from './helpers/card-sessions.mjs';

const CAUSES = ['Potentially reversible causes of PEA include:', 'Hypoxia.', 'Hypothermia.', 'Hypovolaemia (including anaphylaxis).',
  'Hyper/hypokalaemia (and other metabolic abnormalities).', 'Tension pneumothorax.', 'Tamponade (cardiac).', 'Toxins (poisoning).',
  'Thrombosis (pulmonary and coronary).'];

test('A24: opened from Guidance, the card shows the eight causes word for word, each cited EAS 3.14 p13; the lead-in is in the file only (A37)', () => {
  const card = arrest().card('reversible-causes', { request: 'reversible-causes' });
  assert.deepEqual(texts(card.lines), CAUSES.slice(1));
  assert.deepEqual(fileLines('reversible-causes'), [CAUSES[0] + ' [trace]', ...CAUSES.slice(1)]);
  assert.equal(card.title, 'Reversible causes', 'owner decision 23e');
  assert.deepEqual(card.sources, ['EAS 3.14 p13']);
  assert.equal(card.place, 'guidance');
});

test('A24: shown in any rhythm, with or without an arrest running; never shown unless asked for', () => {
  for (const c of [arrest({ start: false }), arrest().noShock('PEA'), arrest().shock('VF'), arrest().noShock('Asystole'), arrest().shock().rosc()]) {
    assert.deepEqual(texts(c.card('reversible-causes', { request: 'reversible-causes' }).lines), CAUSES.slice(1));
    assert.equal(c.card('reversible-causes'), undefined);
  }
});

test('A24: no ANZCOR text anywhere the app can show (owner notes left out); EAS 3.14 has its website and its packaged PDF', () => {
  assert.doesNotMatch(SHOWN_TEXT, /ANZCOR/);
  assert.equal(CARDS.guidelines['3.14'].pdf, 'cpg-cardiac-arrest.pdf');
  assert.equal(CARDS.guidelines['3.14'].web, 'https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/cardiac-arrest-eas');
});
