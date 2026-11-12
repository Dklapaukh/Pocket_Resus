// Stage 1 (doc 19): the first rule-set checker (src/rules/check.js) covers the five existing parts.
// The real rules file must pass; each deliberately broken copy below (one kind of fault each) must be
// rejected with a plain-English message that names the place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { checkRuleSet } from '../src/rules/check.js';
import { Resus as R } from '../src/engine/index.js';

const original = JSON.parse(readFileSync(new URL('../src/rules/nz-eas.json', import.meta.url), 'utf8'));
const copy = () => JSON.parse(JSON.stringify(original));

test('the real rules file passes the checker with no problems', () => {
  assert.deepEqual(checkRuleSet(original), []);
});

test('the checker knows the same {gap} names the engine fills, and the same wording entries', () => {
  const source = readFileSync(new URL('../src/rules/check.js', import.meta.url), 'utf8');
  const listed = [...source.match(/const ENGINE_GAPS = \[([^\]]*)\]/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
  assert.deepEqual([...listed].sort(), Object.keys(R.wordingGaps()).sort());
  // every wording entry the app has is known to the checker and nothing else is
  const broken = copy(); broken.wording.aNewEntryNobodyUses = 'text';
  assert.match(checkRuleSet(broken).join('\n'), /wording\.aNewEntryNobodyUses: is not a wording entry/);
  for (const key of Object.keys(original.wording)) {
    const c = copy(); delete c.wording[key];
    // the note that explains the removed entry (if any) is reported too; the entry itself is reported as missing
    assert.deepEqual(checkRuleSet(c).filter((p) => !p.startsWith('notes.')), [`wording.${key}: is missing`]);
  }
});

test('every PDF file the rules name exists in the app folder', () => {
  const names = [...original.checklists.lists.map((l) => l.pdf), ...Object.values(original.sources.guidelines).map((g) => g.pdf)].filter(Boolean);
  assert.ok(names.length >= 8);
  for (const name of names) assert.ok(existsSync(new URL('../' + name.split('#')[0], import.meta.url)), name + ' is missing');
});

/* The library of broken copies: [what is wrong, how to break a copy, text the message must contain].
   Each must be rejected, and the message must name the place. */
const BROKEN = [
  ['a part is missing', (c) => { delete c.checklists; }, 'checklists: part is missing'],
  ['a part has the wrong kind of value', (c) => { c.equipment = []; }, 'equipment: part is missing or is not a group'],
  ['an unknown extra part', (c) => { c.colours = {}; }, 'colours: is not a part'],
  ['a setting is missing', (c) => { delete c.numbers.timing.cprCycleMs; }, 'numbers.timing.cprCycleMs: is missing'],
  ['a setting nobody uses (typing slip)', (c) => { c.numbers.timing.cprCycleMS = 1; }, 'numbers.timing.cprCycleMS: is not a setting the app knows'],
  ['a number is a word', (c) => { c.numbers.weight.maxKg = '500'; }, 'numbers.weight.maxKg: must be a number'],
  ['a number is not finite', (c) => { c.numbers.adult.shockJ = Infinity; }, 'numbers.adult.shockJ'],
  ['a number is negative', (c) => { c.numbers.adult.adrenalineMg = -1; }, 'numbers.adult.adrenalineMg: must be a number above 0'],
  ['a whole number has a fraction', (c) => { c.numbers.magnesium.maxDoses = 1.5; }, 'numbers.magnesium.maxDoses: must be a whole number'],
  ['a time of zero', (c) => { c.numbers.timing.adrenalineIntervalMs = 0; }, 'numbers.timing.adrenalineIntervalMs: must be a whole number above 0'],
  ['weight bands out of order', (c) => { c.numbers.childBands[2].maxKg = 4; }, 'numbers.childBands.2.maxKg: bands must go in rising order'],
  ['two bands with the same weight', (c) => { c.numbers.childBands[3].maxKg = 20; }, 'numbers.childBands.3.maxKg: bands must go in rising order'],
  ['the bands stop short of the adult limit', (c) => { c.numbers.childBands.pop(); }, 'numbers.childBands: the last band'],
  ['a band row loses a value', (c) => { delete c.numbers.childBands[1].shockJ; }, 'numbers.childBands.1.shockJ: is missing'],
  ['a child dose above the adult dose', (c) => { c.numbers.childBands[4].adrenalineMg = 5; }, 'numbers.childBands.4.adrenalineMg: the child value'],
  ['a band energy that is not weight times joules per kg', (c) => { c.numbers.childBands[2].shockJ = 90; }, 'numbers.childBands.2.shockJ: must be the band weight'],
  ['the adult energy above the highest recordable energy', (c) => { c.numbers.adult.shockJ = 2000; }, 'numbers.adult.shockJ: the adult energy'],
  ['smallest fluid volume above the largest', (c) => { c.numbers.adult.fluidsMinMl = 5000; }, 'numbers.adult.fluidsMinMl'],
  ['a checklist reminder longer than the CPR cycle', (c) => { c.numbers.timing.checklistPromptMinLeftMs = 999999; }, 'numbers.timing.checklistPromptMinLeftMs: the time left'],
  ['amiodarone due list too short for the app', (c) => { c.numbers.amiodarone.dueAtShocks = [3]; }, 'numbers.amiodarone.dueAtShocks: must be a list of at least two'],
  ['amiodarone shock counts not rising', (c) => { c.numbers.amiodarone.dueAtShocks = [6, 3]; }, 'numbers.amiodarone.dueAtShocks.1: shock counts must rise'],
  ['a lower-card rhythm that does not exist', (c) => { c.numbers.lowerCard.fluidRhythms.push('Wobbly'); }, 'numbers.lowerCard.fluidRhythms.3: "Wobbly" is not a rhythm'],
  ['a rhythm claimed by two cards', (c) => { c.numbers.lowerCard.fluidRhythms.push('VF'); }, 'numbers.lowerCard: "VF" is in both lists'],
  ['an empty rhythm list', (c) => { c.numbers.rhythms.shock = []; }, 'numbers.rhythms.shock: must be a list with at least one item'],
  ['a divisor of zero', (c) => { c.numbers.tubes.sizeAgeDivisor = 0; }, 'numbers.tubes.sizeAgeDivisor: must be a number above 0'],
  ['a function in the rule set', (c) => { c.numbers.weight.maxKg = () => 500; }, 'numbers.weight.maxKg'],
  ['a value that is not data (undefined)', (c) => { c.numbers.timing.cprCycleMs = undefined; }, 'numbers.timing.cprCycleMs'],
  ['a {gap} that cannot be filled', (c) => { c.wording.padsPrompt = 'Use pads up to {nobodySuppliesThis} J'; }, 'wording.padsPrompt: {nobodySuppliesThis} cannot be filled'],
  ['a {gap} inside a wording list', (c) => { c.wording.adrenalineHow[1] += ' {oops}'; }, 'wording.adrenalineHow: {oops} cannot be filled'],
  ['a broken {gap} bracket', (c) => { c.wording.padsPrompt = 'Use pads {'; }, 'wording.padsPrompt: has a curly bracket'],
  ['wording with a tag that is not allowed', (c) => { c.wording.referenceOnly = '<script>x</script>'; }, 'wording.referenceOnly: uses <script>'],
  ['empty wording', (c) => { c.wording.padsPrompt = '  '; }, 'wording.padsPrompt: must be some text'],
  ['a wording list that is a sentence', (c) => { c.wording.guidanceIntro = 'one sentence'; }, 'wording.guidanceIntro: must be a list'],
  ['a checklist with no items', (c) => { c.checklists.lists[1].items = []; }, 'checklists.lists.1.items: must be a list with at least one item'],
  ['a checklist the app opens is gone', (c) => { c.checklists.lists.splice(3, 1); }, 'checklists.lists: has no checklist with id "rsi"'],
  ['two checklists with the same id', (c) => { c.checklists.lists[1].id = 'arrest'; }, 'checklists.lists.1.id: "arrest" is used by another'],
  ['a checklist item twice', (c) => { c.checklists.lists[0].items[1] = c.checklists.lists[0].items[0]; }, 'checklists.lists.0.items: has the same item more than once'],
  ['a reversible cause with no guidance text', (c) => { c.checklists.causes[2].text = ''; }, 'checklists.causes.2.text: must be some text'],
  ['a device with no sizes', (c) => { c.equipment.devices.iv.sizes = []; }, 'equipment.devices.iv.sizes: must be a list with at least one item'],
  ['an intubation size the app would refuse', (c) => { c.equipment.devices.intubation.sizes.push('15'); }, 'equipment.devices.intubation.sizes.7: "15" must be a number above 0 and no more than equipment.maxTubeSizeMm'],
  ['a colour for a size that does not exist', (c) => { c.equipment.colours.iv['26'] = '#ffffff'; }, 'equipment.colours.iv.26: "26" is not one of the iv sizes'],
  ['a colour that is not a colour', (c) => { c.equipment.colours.io.Large = 'yellow'; }, 'equipment.colours.io.Large: must be a colour'],
  ['iGel ranges out of order', (c) => { c.equipment.igelRanges[3].minKg = 1; }, 'equipment.igelRanges.3.minKg: ranges must go in rising order'],
  ['an iGel size with no row', (c) => { c.equipment.igelRanges.splice(2, 1); }, 'equipment.igelRanges: has no row for iGel size "2"'],
  ['an "and above" range that is not last', (c) => { c.equipment.igelRanges[0].maxKg = null; }, 'equipment.igelRanges.0.maxKg: "and above"'],
  ['a guideline link with no PDF name', (c) => { c.sources.guidelines.rsi.pdf = 'rsi'; }, 'sources.guidelines.rsi.pdf: must be a PDF file name'],
  ['a web link that is not https', (c) => { c.sources.guidelines.magnesium.web = 'cpg.stjohn.org.nz/x'; }, 'sources.guidelines.magnesium.web: must be a secure web address'],
  ['a listed link to a guideline that does not exist', (c) => { c.sources.guidanceLinks.push('nonsense'); }, 'sources.guidanceLinks.4: "nonsense" is not a guideline'],
  ['a listed link whose guideline has no label', (c) => { c.sources.guidanceLinks[0] = 'adrenaline'; }, 'sources.guidanceLinks.0: "adrenaline" is listed as a link but has no label'],
  ['a note that explains nothing', (c) => { c.notes['numbers.timing.cprCycleMinutes'] = 'old note'; }, 'notes.numbers.timing.cprCycleMinutes: explains a value that does not exist'],
  ['an empty note', (c) => { c.notes['numbers.weight.maxKg'] = ''; }, 'notes.numbers.weight.maxKg: must be some text'],
];

for (const [fault, breakIt, expected] of BROKEN) {
  test('rejects a copy where: ' + fault, () => {
    const c = copy();
    breakIt(c);
    const problems = checkRuleSet(c);
    assert.ok(problems.length >= 1, 'the broken copy was accepted');
    assert.ok(problems.some((p) => p.includes(expected)), `no message names the place. Wanted "${expected}", got:\n${problems.join('\n')}`);
    for (const p of problems) assert.ok(/^[\w.]*: /.test(p) || p.startsWith('the rule set'), 'a message must start with its place: ' + p);
  });
}

test('the library holds at least 15 different kinds of fault, and a few notes with a dot in the place name are understood', () => {
  assert.ok(BROKEN.length >= 15);
  const c = copy(); c.notes['equipment.colours.igel.1.5'] = 'colour for iGel size 1.5';
  assert.deepEqual(checkRuleSet(c), []);
  assert.deepEqual(checkRuleSet(null).length, 1);
  assert.equal(checkRuleSet(copy()).length, 0, 'checking does not change the file it is given');
});
