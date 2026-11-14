// Stage 1 (doc 19): the first rule-set checker (src/rules/check.js) covers the five existing parts.
// The real rules file must pass; each deliberately broken copy below (one kind of fault each) must be
// rejected with a plain-English message that names the place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { checkRuleSet } from '../src/rules/check.js';
import { readYamlStrict } from '../src/rules/parse.js';
import { Resus as R } from '../src/engine/index.js';

const original = readYamlStrict(readFileSync(new URL('../src/rules/nz-eas.yaml', import.meta.url), 'utf8'));
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
  // A18 (14 Nov 2026): the tube formula became band-table sizes; same kind of fault (a zero that must be above 0), re-pointed
  ['a tube size of zero', (c) => { c.numbers.childBands[2].ettSizesMm[0] = 0; }, 'numbers.childBands.2.ettSizesMm.0: must be a number above 0'],
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
  // Stage 2: timer messages, quick choices, correction-form rhythms, log settings, equipment forms and screen wording.
  ['the "30 seconds remaining" time after the end of the cycle', (c) => { c.numbers.timing.warningAtMs = 999999; }, 'numbers.timing.warningAtMs: the warning time'],
  ['a warning time that is not a whole number of seconds', (c) => { c.numbers.timing.warningAtMs = 30500; }, 'numbers.timing.warningAtMs: must be a whole number of seconds'],
  ['the "prepare" message coming before the warning', (c) => { c.numbers.timing.prepareAtMs = 45000; }, 'numbers.timing.prepareAtMs: the "prepare" time'],
  ['a prepare time of zero', (c) => { c.numbers.timing.prepareAtMs = 0; }, 'numbers.timing.prepareAtMs: must be a whole number above 0'],
  ['an adrenaline highlight longer than the adrenaline interval', (c) => { c.numbers.timing.adrenalineHighlightMs = 300000; }, 'numbers.timing.adrenalineHighlightMs: the highlight time'],
  ['a negative lateness limit', (c) => { c.numbers.timing.overdueShownAfterMs = -1; }, 'numbers.timing.overdueShownAfterMs: must be a whole number of 0 or more'],
  ['a timer setting is a word', (c) => { c.numbers.timing.warningAtMs = '30000'; }, 'numbers.timing.warningAtMs: must be a whole number'],
  ['quick start choices out of order', (c) => { c.numbers.resusStart.quickChoicesMin = [5, 15, 10]; }, 'numbers.resusStart.quickChoicesMin.2: minutes must rise'],
  ['a quick start choice of 0 minutes', (c) => { c.numbers.resusStart.quickChoicesMin[0] = 0; }, 'numbers.resusStart.quickChoicesMin.0: must be a whole number above 0'],
  ['a quick start choice of a fraction', (c) => { c.numbers.resusStart.quickChoicesMin[1] = 7.5; }, 'numbers.resusStart.quickChoicesMin.1: must be a whole number'],
  ['no quick start choices', (c) => { c.numbers.resusStart.quickChoicesMin = []; }, 'numbers.resusStart.quickChoicesMin: must be a list with at least one'],
  ['a correction-form rhythm that does not exist', (c) => { c.numbers.correctionRhythms.shock.push('Wobbly'); }, 'numbers.correctionRhythms.shock.4: "Wobbly" is not a rhythm'],
  ['a correction form that cannot keep a recorded rhythm', (c) => { c.numbers.correctionRhythms.shock = ['Unknown', 'VF', 'Torsades']; }, 'numbers.correctionRhythms.shock: must offer "VT"'],
  ['an empty correction-form rhythm list', (c) => { c.numbers.correctionRhythms.rosc = []; }, 'numbers.correctionRhythms.rosc: must be a list with at least one item'],
  ['no event types counted as interventions', (c) => { c.numbers.log.interventionEventTypes = []; }, 'numbers.log.interventionEventTypes: must be a list with at least one item'],
  ['an intervention event type with no name', (c) => { c.numbers.log.interventionEventTypes[2] = ''; }, 'numbers.log.interventionEventTypes.2: must be some text'],
  ['no medicine units', (c) => { c.numbers.medicineForm.units = []; }, 'numbers.medicineForm.units: must be a list with at least one item'],
  ['a medicine route twice', (c) => { c.numbers.medicineForm.routes[1] = 'IV'; }, 'numbers.medicineForm.routes: has the same item more than once'],
  ['a device group that names an unknown device', (c) => { c.equipment.accessDevices.push('catheter'); }, 'equipment.accessDevices.2: "catheter" is not a device type'],
  ['every device listed under Access', (c) => { c.equipment.accessDevices = ['iv', 'io', 'opa', 'npa', 'igel', 'laryngoscopy', 'intubation']; }, 'equipment.accessDevices: leaves no device for the Airway list'],
  ['the equipment form questions are missing', (c) => { delete c.equipment.forms; }, 'equipment.forms: must be a group of settings'],
  ['a laryngoscopy method that has no blade list', (c) => { c.equipment.forms.laryngoscopy.methods = ['Video', 'Fibreoptic']; }, 'equipment.forms.laryngoscopy.methods: each method must be the name of a blade list'],
  ['three laryngoscopy methods', (c) => { c.equipment.forms.laryngoscopy.methods.push('Other'); }, 'equipment.forms.laryngoscopy.methods: must have exactly two methods'],
  ['no view grades', (c) => { c.equipment.forms.laryngoscopy.views = []; }, 'equipment.forms.laryngoscopy.views: must be a list with at least one item'],
  ['a length-at-lips range the wrong way round', (c) => { c.equipment.forms.intubation.lipsMinCm = 60; }, 'equipment.forms.intubation.lipsMinCm: the smallest length'],
  ['a length-at-lips limit of zero', (c) => { c.equipment.forms.intubation.lipsMaxCm = 0; }, 'equipment.forms.intubation.lipsMaxCm: must be a number above 0'],
  ['an empty form question', (c) => { c.equipment.forms.outcome.question = ''; }, 'equipment.forms.outcome.question: must be some text'],
  ['no confirmation methods', (c) => { c.equipment.forms.intubation.confirmMethods = []; }, 'equipment.forms.intubation.confirmMethods: must be a list with at least one item'],
  ['screen wording that is empty', (c) => { c.wording.liveCards.reviewInactive = ' '; }, 'wording.liveCards.reviewInactive: must be some text'],
  ['screen wording with a {gap} the app cannot fill', (c) => { c.wording.toasts.recordedDose = 'Recorded {dose} {nobodySuppliesThis}'; }, 'wording.toasts.recordedDose: {nobodySuppliesThis} cannot be filled'],
  ['screen wording with a tag that is not allowed', (c) => { c.wording.errors.energy = '<b>Check</b> <i>the energy</i>'; }, 'wording.errors.energy: uses <i>'],
  ['screen wording with a broken {gap} bracket', (c) => { c.wording.liveCards.doseMgIv = '{dose mg IV'; }, 'wording.liveCards.doseMgIv: has a curly bracket'],
  ['screen wording nobody uses (typing slip)', (c) => { c.wording.liveCards.reviewInactiv = 'x'; }, 'wording.liveCards.reviewInactiv: is not a wording entry the app knows'],
  ['wording two levels down that is empty', (c) => { c.wording.rhythmSheet.titles.shock = ''; }, 'wording.rhythmSheet.titles.shock: must be some text'],
  ['a wording group that is a sentence', (c) => { c.wording.toasts = 'Record copied'; }, 'wording.toasts: must be a group of wording entries'],
  ['the timer message loses its seconds {gap}', (c) => { c.wording.liveScreen.captionWarning = '{seconds} seconds remaining'; }, 'wording.liveScreen.captionWarning: {seconds} cannot be filled'],
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

// Stage 2: every single new wording entry, quick choice and setting is required (deleting any one is reported by name).
test('every stage 2 wording entry and setting is required: deleting any one is reported as missing, by name', () => {
  const walk = (node, path, out) => {
    if (typeof node === 'string' || Array.isArray(node) || typeof node === 'number') out.push(path);
    else for (const [k, v] of Object.entries(node)) walk(v, path ? path + '.' + k : k, out);
    return out;
  };
  const leaves = walk(original.wording.liveCards, 'liveCards', []).concat(
    ...['drugNames', 'eventTitles', 'eventDetails', 'toasts', 'errors', 'settings', 'log', 'rhythmSheet'].map((g) => walk(original.wording[g], g, [])));
  assert.ok(leaves.length > 100);
  for (const leaf of leaves) {
    const c = copy();
    const parts = leaf.split('.');
    let node = c.wording;
    for (const part of parts.slice(0, -1)) node = node[part];
    delete node[parts.at(-1)];
    assert.deepEqual(checkRuleSet(c).filter((p) => !p.startsWith('notes.')), [`wording.${leaf}: is missing`]);
  }
  for (const key of ['overdueShownAfterMs', 'prepareAtMs', 'warningAtMs', 'adrenalineHighlightMs']) {
    const c = copy(); delete c.numbers.timing[key];
    assert.deepEqual(checkRuleSet(c).filter((p) => !p.startsWith('notes.')), [`numbers.timing.${key}: is missing`]);
  }
  for (const group of ['resusStart', 'correctionRhythms', 'log', 'medicineForm']) {
    const c = copy(); delete c.numbers[group];
    assert.ok(checkRuleSet(c).some((p) => p.startsWith(`numbers.${group}:`)), group);
  }
});
