// A20 (D1, owner ruling 15 Nov 2026): fluids after PEA only. EAS 3.14 Cardiac Arrest, p2.
// Step C3 checks the ENGINE and the card file: the lower cards by the latest recorded rhythm (PEA: fluids; Asystole:
// blank; torsades earlier: magnesium as well), "rhythm not recorded" changes nothing, an older session's "Other" is
// not PEA, the fluids pop-up opens after PEA only and is titled with its first line, and "Other" is no no-shock choice.
// Screen checks added at C4 (when the screens are rewired): the no-shock rhythm check and the correction sheet offer
// PEA and Asystole only; the Live lower card is blank after Asystole; the fluids pop-up opens after PEA only, titled
// "If the patient is in PEA"; 20 kg PEA card reads "400 mL IV". (The old a2c and a7 tests move to this row at C4/C5.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrest, texts, CARDS } from './helpers/card-sessions.mjs';

const lower = (c) => c.at('lower');

test('A20: PEA shows the fluids card, and its pop-up opens when it first shows', () => {
  const c = arrest({ weight: '20' }).noShock('PEA');
  assert.deepEqual(lower(c), ['fluids']);
  const fluids = c.card('fluids');
  assert.equal(fluids.pop_up_on_show, true);
  assert.equal(fluids.details[0].text, 'If the patient is in PEA', 'the pop-up is titled with the guideline heading');
  assert.deepEqual(texts(fluids.dose.lines), ['cell:fluidsTableMl=400', '20-40 ml/kg IV for a child.'], '20 kg: 400 mL from the EAS 7.2 table');
});

test('A20: Asystole leaves the lower card blank', () => {
  assert.deepEqual(lower(arrest({ weight: '20' }).noShock('Asystole')), []);
  assert.deepEqual(lower(arrest({ weight: '20' }).noShock('PEA').noShock('Asystole')), []);
});

test('A20: torsades then PEA shows fluids and magnesium', () => {
  assert.deepEqual(lower(arrest({ weight: '20' }).shock('Torsades').noShock('PEA')), ['magnesium', 'fluids']);
});

test('A20: torsades then Asystole shows magnesium only', () => {
  assert.deepEqual(lower(arrest({ weight: '20' }).shock('Torsades').noShock('Asystole')), ['magnesium']);
});

test('A20: "Rhythm not recorded" changes nothing; an older session\'s "Other" counts as not PEA; ROSC "Other" is ignored (A8)', () => {
  assert.deepEqual(lower(arrest().noShock('PEA').notRecorded('noshock')), ['fluids']);
  assert.deepEqual(lower(arrest().noShock('PEA').noShock('Other')), []);
  assert.deepEqual(lower(arrest().noShock('PEA').rosc('Other').rearrest()), ['fluids']);
});

test('A20: no "Other" among the no-shock choices; fluids only while the latest rhythm is PEA', () => {
  assert.deepEqual(CARDS.settings.rhythms.noshock, ['PEA', 'Asystole']);
  assert.deepEqual(CARDS.cards.find((c) => c.id === 'fluids').show_when, ['arrest_running', { latest_rhythm: ['PEA'] }]);
});
