// Rules editor stage E1: the tightened rule-set checker (src/rules/check.js) against a LIBRARY OF BAD RULE SETS.
// Each bad rule set is the reference rules file with ONE small, named text change, a
// different kind of fault each time, across all five parts. Every one must be rejected, and a message must
// start with the place the fault is at and say what is wrong. The reference itself must pass with no errors.
//
// A change is made by finding an exact piece of the file's text and replacing it. If that piece is not found
// exactly once, the test FAILS (so a change that quietly does nothing, or hits the wrong place, can never
// make a fault look "rejected"). The six holes found by an earlier review are tagged hole a to hole f.
// The text edited is the frozen JSON copy of the reference (tests/baseline/nz-eas-before-yaml.json): the
// checker works on values, and tests/rules-yaml-same-as-baseline.test.mjs proves src/rules/nz-eas.yaml holds
// exactly the same values. Two tests below also send every bad rule set through the YAML writer and reader
// to show a fault is not lost or changed on the way (for example text such as "500" stays text).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkRuleSet, RELATIONSHIP_RULES } from '../src/rules/check.js';
import { readYamlStrict } from '../src/rules/parse.js';
import { rulesFileText } from '../src/rules/write.js';

import { withApprovedChangesInJsonText } from './helpers/approved-changes.mjs';

// Approved A-table changes (tests/helpers/approved-changes.mjs) are made in the frozen copies before comparing.
const text = withApprovedChangesInJsonText(readFileSync(new URL('./baseline/nz-eas-before-yaml.json', import.meta.url), 'utf8'));
const reference = JSON.parse(text);
const count = (haystack, needle) => haystack.split(needle).length - 1;

/* [name, part, find, replace, place the message must start with, words the message must contain, hole tag (if any)] */
const BAD = [
  // ---------- part 1: numbers ----------
  ['a negative dose', 'numbers', '"adrenalineMg": 1,', '"adrenalineMg": -1,', 'numbers.adult.adrenalineMg', 'above 0'],
  ['an adrenaline interval of zero', 'numbers', '"adrenalineIntervalMs": 240000', '"adrenalineIntervalMs": 0', 'numbers.timing.adrenalineIntervalMs', 'above 0'],
  ['an adult shock energy of 5000 J', 'numbers', '"shockJ": 200\n', '"shockJ": 5000\n', 'numbers.adult.shockJ', 'no more than'],
  ['text where a weight number belongs', 'numbers', '"maxKg": 500,', '"maxKg": "500",', 'numbers.weight.maxKg', 'must be a number'],
  ['a fraction where a count belongs (magnesium doses)', 'numbers', '"maxDoses": 2\n', '"maxDoses": 2.5\n', 'numbers.magnesium.maxDoses', 'whole number'],
  ['a fraction in the amiodarone shock counts', 'numbers', '"dueAtShocks": [3, 6]', '"dueAtShocks": [3, 6.5]', 'numbers.amiodarone.dueAtShocks.1', 'whole number'],
  ['a dose far beyond any plausible dose', 'numbers', '"amiodaroneFirstMg": 300,', '"amiodaroneFirstMg": 30000,', 'numbers.adult.amiodaroneFirstMg', 'no more than'],
  // A18 (14 Nov 2026): the tube formula became band-table sizes; same kinds of fault, re-pointed
  ['a tube size of zero', 'numbers', '"ettSizesMm": [4,5]', '"ettSizesMm": [0,5]', 'numbers.childBands.2.ettSizesMm.0', 'above 0'],
  ['a negative length at lips', 'numbers', '"ettLengthCm": 15', '"ettLengthCm": -15', 'numbers.childBands.2.ettLengthCm', 'above 0'],
  ['two tube sizes in the wrong order', 'numbers', '"ettSizesMm": [5,6]', '"ettSizesMm": [6,5]', 'numbers.childBands.3.ettSizesMm.1', 'larger than the first'],
  ['a time given in words', 'numbers', '"cprCycleMs": 120000,', '"cprCycleMs": "two minutes",', 'numbers.timing.cprCycleMs', 'must be a whole number'],
  ['an RSI dose per kg of zero', 'numbers', '"mcgPerKg": 2,', '"mcgPerKg": 0,', 'numbers.rsi.fentanyl.mcgPerKg', 'above 0'],
  ['a double-tap lock that is negative', 'numbers', '"magnesium": 5000,', '"magnesium": -5000,', 'numbers.doubleTapLockMs.magnesium', 'of 0 or more'],
  ['weight bands out of order', 'numbers', '"maxKg": 20,\n        "adrenalineMg": 0.2', '"maxKg": 4,\n        "adrenalineMg": 0.2', 'numbers.childBands.2.maxKg', 'rising order'],
  ['amiodarone shock counts not rising', 'numbers', '"dueAtShocks": [3, 6]', '"dueAtShocks": [6, 3]', 'numbers.amiodarone.dueAtShocks.1', 'must rise'],
  ['quick start choices out of order', 'numbers', '"quickChoicesMin": [5, 10, 15, 20]', '"quickChoicesMin": [5, 15, 10, 20]', 'numbers.resusStart.quickChoicesMin.2', 'must rise'],
  ['the "prepare" message after the warning', 'numbers', '"prepareAtMs": 15000,', '"prepareAtMs": 45000,', 'numbers.timing.prepareAtMs', 'warning time'],
  ['a warning that is not a whole number of seconds', 'numbers', '"warningAtMs": 30000,', '"warningAtMs": 30500,', 'numbers.timing.warningAtMs', 'whole number of seconds'],
  // A16 (14 Nov 2026): the age formulas became age rows from the EAS 7.2 band table headings; same kind of fault, re-pointed
  ['age rows out of order', 'numbers', '"maxAge": 10,\n          "weightKg": 30', '"maxAge": 4,\n          "weightKg": 30', 'numbers.ageEstimate.bands.2.maxAge', 'rising order'],
  ['the oldest accepted age not above the last age row', 'numbers', '"adultUpToAge": 14', '"adultUpToAge": 13', 'numbers.ageEstimate.adultUpToAge', 'must be above'],
  ['a rhythm that is both shockable and not', 'numbers', '"shock": ["VF", "VT", "Torsades"],\n      "noshock": ["PEA",', '"shock": ["VF", "VT", "Torsades"],\n      "noshock": ["VF",', 'numbers.rhythms.noshock.0', 'both shockable and not'],
  ['hole e: an unknown event type in the interventions list', 'numbers', '"equipment",\n        "note"\n', '"equipment",\n        "notes"\n', 'numbers.log.interventionEventTypes.12', 'not a kind of event the app records', 'e'],
  ['hole f: "mg" removed from the medicine units', 'numbers', '"units": ["mg", ', '"units": [', 'numbers.medicineForm.units', 'must include "mg"', 'f'],
  ['the IV route removed from the medicine routes', 'numbers', '"routes": ["IV", ', '"routes": [', 'numbers.medicineForm.routes', 'must include "IV"'],
  ['a product name containing markup', 'numbers', '"fluidShort": "NaCl 0.9%"', '"fluidShort": "<b>NaCl</b> 0.9%"', 'numbers.products.fluidShort', 'plain text'],
  // ---------- part 2: wording ----------
  ['hole a: an entry drops its own {gap}', 'wording', '"captionDueLate": "Rhythm check due · +{late}"', '"captionDueLate": "Rhythm check due · late"', 'wording.liveScreen.captionDueLate', 'must contain {late}', 'a'],
  ['hole b: a rule-set gap inside a log entry (would be saved as "undefined")', 'wording', '"shockWithEnergy": "{rhythm} · {energy} J"', '"shockWithEnergy": "{rhythm} · {energy} J of {adultShockJ} J"', 'wording.eventDetails.shockWithEnergy', 'not one of this entry\'s own gaps', 'b'],
  ['hole c: "30" typed in place of {warningSeconds}', 'wording', '"captionWarning": "{warningSeconds} seconds remaining"', '"captionWarning": "30 seconds remaining"', 'wording.liveScreen.captionWarning', 'must contain {warningSeconds}', 'c'],
  ['a gap that belongs to another entry', 'wording', '"padsPrompt": "Use paediatric pads"', '"padsPrompt": "Use paediatric pads up to {padsUpToJ} J"', 'wording.padsPrompt', 'it uses no gaps at all'],
  ['a gap nobody fills', 'wording', '"padsPrompt": "Use paediatric pads"', '"padsPrompt": "Use paediatric pads {nobody}"', 'wording.padsPrompt', 'cannot be filled'],
  ['bold that is never closed', 'wording', '"padsPrompt": "Use paediatric pads"', '"padsPrompt": "<b>Use paediatric pads"', 'wording.padsPrompt', 'needs its closing tag'],
  ['markup that is not allowed (italic with <i>)', 'wording', '"padsPrompt": "Use paediatric pads"', '"padsPrompt": "Use <i>paediatric</i> pads"', 'wording.padsPrompt', 'only <b>, <em> and <br>'],
  ['a half-written {gap}', 'wording', '"padsPrompt": "Use paediatric pads"', '"padsPrompt": "Use paediatric pads {"', 'wording.padsPrompt', 'curly bracket'],
  ['the word "undefined" typed into a sentence', 'wording', '"padsPrompt": "Use paediatric pads"', '"padsPrompt": "Use paediatric pads undefined"', 'wording.padsPrompt', 'undefined'],
  ['an empty sentence', 'wording', '"padsPrompt": "Use paediatric pads"', '"padsPrompt": "  "', 'wording.padsPrompt', 'must be some text'],
  ['a sentence the app needs is missing', 'wording', '    "padsPrompt": "Use paediatric pads",\n', '', 'wording.padsPrompt', 'is missing'],
  ['a sentence nobody uses (typing slip)', 'wording', '"padsPrompt": "Use paediatric pads"', '"padsPromt": "Use paediatric pads"', 'wording.padsPromt', 'not a wording entry the app knows'],
  ['a list of paragraphs that is one sentence', 'wording', '"guidanceIntro": [', '"guidanceIntro": "one sentence", "unusedOld": [', 'wording.guidanceIntro', 'must be a list'],
  ['a gap dropped from one paragraph of a list entry', 'wording', 'NZCPG cardiac arrest: every {adrenalineEveryMin} minutes.', 'NZCPG cardiac arrest: every 4 minutes.', 'wording.adrenalineHow', 'must contain {adrenalineEveryMin}'],
  // ---------- part 3: checklists and causes ----------
  ['two checklists with the same id', 'checklists', '"id": "postrosc",', '"id": "arrest",', 'checklists.lists.1.id', 'used by another checklist'],
  ['a checklist the app opens is gone', 'checklists', '"id": "rsi",', '"id": "rsx",', 'checklists.lists', 'no checklist with id "rsi"'],
  ['an empty checklist item', 'checklists', '"Initiate documentation.",', '"",', 'checklists.lists.0.items.', 'must be some text'],
  ['a checklist item with a {gap} nobody fills', 'checklists', '"Initiate documentation.",', '"Initiate {documentation}.",', 'checklists.lists.0.items.', 'must not contain a {gap}'],
  ['a checklist PDF name that is not a PDF', 'checklists', '"pdf": "cpg-post-rosc.pdf#page=2"', '"pdf": "cpg-post-rosc#page=2"', 'checklists.lists.1.pdf', 'PDF file name'],
  ['a reversible cause with no id', 'checklists', '"id": "temperature",', '"idd": "temperature",', 'checklists.causes.', 'is missing'],
  // Markup in part 3. The checklist items, labels and codes are put on screen as plain text, so they take no tag at all;
  // the introduction and the cause texts are put on screen as HTML, so only bold, italic and a line break are allowed.
  ['a script tag in a checklist item', 'checklists', '"Initiate documentation.",', '"Initiate documentation.<script>alert(1)</script>",', 'checklists.lists.0.items.10', 'must be plain text; <script> is not allowed'],
  ['an image with a handler in a checklist item', 'checklists', '"Team leader identified.",', '"Team leader identified.<img src=x onerror=alert(1)>",', 'checklists.lists.0.items.0', 'must be plain text; <img'],
  ['a link in a checklist item', 'checklists', '"Roles allocated and confirmed.",', '"Roles allocated and confirmed.<a href=\\"https://example.com\\">more</a>",', 'checklists.lists.0.items.1', 'must be plain text; <a href'],
  ['a tag that is never closed (and has no end) in a checklist item', 'checklists', '"Oxygen flow and supply adequate.",', '"Oxygen flow and supply adequate.<b",', 'checklists.lists.0.items.6', 'must be plain text; <b'],
  ['allowed bold in a checklist item (items take no markup)', 'checklists', '"12 lead ECG.",', '"<b>12 lead ECG.</b>",', 'checklists.lists.1.items.7', 'must be plain text; <b>'],
  ['a stray > in a checklist item', 'checklists', '"Pre-oxygenate by mask.",', '"Pre-oxygenate by mask >",', 'checklists.lists.2.items.0', 'must be plain text; >'],
  ['a script tag in a checklist label', 'checklists', '"label": "Post ROSC checklist",', '"label": "Post ROSC checklist<script>alert(1)</script>",', 'checklists.lists.1.label', 'must be plain text; <script>'],
  ['a tag in a checklist code', 'checklists', '"code": "EAS 3.15",', '"code": "EAS 3.15<br>",', 'checklists.lists.1.code', 'must be plain text; <br>'],
  ['a script tag in a checklist introduction', 'checklists', '"intro": "Prepare for RSI while awaiting CCP backup.",', '"intro": "Prepare for RSI while awaiting CCP backup.<script>alert(1)</script>",', 'checklists.lists.2.intro', 'uses <script>'],
  ['a link in a checklist introduction', 'checklists', '"intro": "Prepare for RSI while awaiting CCP backup.",', '"intro": "Prepare for RSI <a href=\\"https://example.com\\">while</a> awaiting CCP backup.",', 'checklists.lists.2.intro', 'uses <a href'],
  ['bold never closed in a checklist introduction', 'checklists', '"intro": "Prepare for RSI while awaiting CCP backup.",', '"intro": "<b>Prepare for RSI while awaiting CCP backup.",', 'checklists.lists.2.intro', 'needs its closing tag'],
  ['an image with a handler in a reversible cause text', 'checklists', '"text": "Review airway patency, oxygen supply, ventilation and waveform capnography."', '"text": "Review airway patency.<img src=x onerror=alert(1)>"', 'checklists.causes.0.text', 'uses <img'],
  ['a script tag in a reversible cause name', 'checklists', '"name": "Hypoxia",', '"name": "Hypoxia<script>alert(1)</script>",', 'checklists.causes.0.name', 'uses <script>'],
  ['a tag that is never ended in a reversible cause short name', 'checklists', '"plain": "Low oxygen",', '"plain": "Low oxygen <b",', 'checklists.causes.0.plain', 'stray < or >'],
  ['a checklist id that would break the page (a quote and a colon)', 'checklists', '"id": "arrest",', '"id": "arr\\"est:1",', 'checklists.lists.0.id', 'only letters, digits'],
  // ---------- part 4: equipment ----------
  ['hole d: markup in an equipment question', 'equipment', '"question": "Outcome"', '"question": "<b>Outcome</b>"', 'equipment.forms.outcome.question', 'plain text', 'd'],
  ['a gap in an equipment question', 'equipment', '"bladeQuestion": "Blade"', '"bladeQuestion": "Blade {size}"', 'equipment.forms.laryngoscopy.bladeQuestion', 'plain text'],
  ['a colour that is not a colour', 'equipment', '"Large": "#f4cc28"', '"Large": "yellow"', 'equipment.colours.io.Large', 'must be a colour'],
  ['sizes out of order', 'equipment', '"sizes": ["3", "4", "5", "6", "7", "8", "9"]', '"sizes": ["3", "4", "6", "5", "7", "8", "9"]', 'equipment.devices.intubation.sizes', 'in order'],
  ['the same size twice', 'equipment', '"sizes": ["24", "22", "20", "18", "16"]', '"sizes": ["24", "22", "22", "18", "16"]', 'equipment.devices.iv.sizes', 'same item more than once'],
  ['the largest tube size is negative', 'equipment', '"maxTubeSizeMm": 12', '"maxTubeSizeMm": -12', 'equipment.maxTubeSizeMm', 'above 0'],
  ['length-at-lips limits the wrong way round', 'equipment', '"lipsMaxCm": 50', '"lipsMaxCm": 0.5', 'equipment.forms.intubation.lipsMinCm', 'smallest length'],
  // A15 (14 Nov 2026): the iGel weight list was deleted; the LMA per band took its place (same kinds of fault: impossible numbers)
  ['an LMA size of zero', 'numbers', '"lmaSize": 1,', '"lmaSize": 0,', 'numbers.childBands.0.lmaSize', 'above 0'],
  ['a negative LMA cuff volume', 'numbers', '"lmaCuffMl": 4\n', '"lmaCuffMl": -4\n', 'numbers.childBands.0.lmaCuffMl', 'above 0'],
  ['a laryngoscopy method with no blade list', 'equipment', '"methods": ["Video", "Direct"]', '"methods": ["Video", "Indirect"]', 'equipment.forms.laryngoscopy.methods', 'blade list'],
  // ---------- part 5: sources ----------
  ['a web link that is not secure', 'sources', '"web": "https://cpg.stjohn.org.nz/tabs/medicines/page/magnesium-sulphate-eas"', '"web": "http://cpg.stjohn.org.nz/tabs/medicines/page/magnesium-sulphate-eas"', 'sources.guidelines.magnesium.web', 'secure web address'],
  ['a guideline page number of zero', 'sources', '"offlinePage": 2,', '"offlinePage": 0,', 'sources.guidelines.cardiacArrest.offlinePage', 'above 0'],
  ['a guideline PDF name that is not a PDF', 'sources', '"pdf": "cpg-rsi.pdf"', '"pdf": "cpg-rsi"', 'sources.guidelines.rsi.pdf', 'PDF file name'],
  ['a guidance link to a guideline that does not exist', 'sources', '"guidanceLinks": ["cardiacArrest", "postRosc", "paediatric", "rsi"]', '"guidanceLinks": ["cardiacArrest", "postRosc", "paediatric", "rsii"]', 'sources.guidanceLinks.3', 'not a guideline'],
  ['export date with markup', 'sources', '"exportDate": "24 September 2026"', '"exportDate": "<em>24 September 2026</em>"', 'sources.exportDate', 'plain text'],
  // ---------- the file as a whole ----------
  ['a note that explains nothing', 'notes', '"numbers.timing.cprCycleMs":', '"numbers.timing.cprCycleMinutes":', 'notes.numbers.timing.cprCycleMinutes', 'does not exist'],
  ['a part that is not one of the five', 'whole file', '"checklists": {', '"checklist": {', 'checklist', 'not a part of the rule set'],
];

/* The bad rule set for one entry; throws unless its search text is in the file exactly once. */
function badSet([name, , find, replace]) {
  const found = count(text, find);
  assert.equal(found, 1, `"${name}": the text to change must be in the reference file exactly once (found ${found} times): ${JSON.stringify(find)}`);
  assert.notEqual(find, replace, `"${name}": the change must change something`);
  return JSON.parse(text.replace(find, () => replace));
}

test('the reference rule set is accepted with no errors (default checks, every relationship rule on, and all off)', () => {
  assert.deepEqual(checkRuleSet(reference), []);
  assert.deepEqual(checkRuleSet(reference, { relationshipRules: RELATIONSHIP_RULES.map((r) => r.id) }), []);
  assert.deepEqual(checkRuleSet(reference, { relationshipRules: [] }), []);
});

test('the library has at least 30 bad rule sets, of different kinds, covering all five parts and holes a to f', () => {
  assert.ok(BAD.length >= 30, `only ${BAD.length} bad rule sets`);
  assert.equal(new Set(BAD.map((b) => b[0])).size, BAD.length, 'two bad rule sets share a name');
  assert.equal(new Set(BAD.map((b) => b[2] + '=>' + b[3])).size, BAD.length, 'two bad rule sets make the same change');
  for (const part of ['numbers', 'wording', 'checklists', 'equipment', 'sources']) assert.ok(BAD.filter((b) => b[1] === part).length >= 4, `too few bad rule sets for part ${part}`);
  assert.deepEqual(['a', 'b', 'c', 'd', 'e', 'f'].filter((hole) => !BAD.some((b) => b[6] === hole)), [], 'a hole from the earlier review has no bad rule set');
});

for (const entry of BAD) {
  const [name, , , , place, says] = entry;
  test(`bad rule set rejected: ${name}`, () => {
    const set = badSet(entry);
    const problems = checkRuleSet(set);
    assert.ok(problems.length >= 1, 'the bad rule set was accepted');
    const atPlace = problems.filter((p) => p.startsWith(place));
    assert.ok(atPlace.length, `no message starts with the place "${place}". Got:\n${problems.join('\n')}`);
    assert.ok(atPlace.some((p) => p.includes(says)), `no message at "${place}" says "${says}". Got:\n${atPlace.join('\n')}`);
    for (const p of problems) assert.match(p, /^[\w.-]+: |^the rule set: /, 'a message must start with its place: ' + p);
  });
}

test('the reference the bad sets are edited from has the same values as the real YAML rules file', () => {
  assert.deepStrictEqual(readYamlStrict(readFileSync(new URL('../src/rules/nz-eas.yaml', import.meta.url), 'utf8')), reference);
});

test('every bad rule set gives the same checker messages after being written as YAML and read back', () => {
  for (const entry of BAD) {
    const set = badSet(entry);
    const viaYaml = readYamlStrict(rulesFileText(set));
    assert.deepStrictEqual(viaYaml, set, `"${entry[0]}" changed on the way through YAML`);
    assert.deepEqual(checkRuleSet(viaYaml), checkRuleSet(set), `"${entry[0]}" is judged differently after YAML`);
  }
});

test('the bad rule sets do not change the reference they are made from', () => {
  assert.deepEqual(checkRuleSet(JSON.parse(text)), []);
  assert.equal(count(text, '"captionWarning": "{warningSeconds} seconds remaining"'), 1);
});

/* ---------- Clinical relationship rules: named, described, and only on when switched on ---------- */

test('every relationship rule has a name and a plain-English description, and the default list is the ones marked on', () => {
  assert.ok(RELATIONSHIP_RULES.length >= 8); // 9 until A15 (14 Nov 2026) deleted the iGel list and its rule
  for (const r of RELATIONSHIP_RULES) { assert.match(r.id, /^[a-z][A-Za-z]+$/); assert.ok(r.plain.length > 30 && r.plain.endsWith('.'), r.id); assert.equal(typeof r.onByDefault, 'boolean'); }
  assert.throws(() => checkRuleSet(reference, { relationshipRules: ['notARule'] }), /not the name of a relationship rule/);
});

/* [rule name, text to change, replacement, place the message starts with]. Each fault breaks only that relationship. */
const RELATIONSHIPS = [
  ['childNotAboveAdult', '"adrenalineMg": 0.4,', '"adrenalineMg": 5,', 'numbers.childBands.4.adrenalineMg'],
  ['bandEnergyIsWeightTimesJoulesPerKg', '"shockJ": 160,', '"shockJ": 150,', 'numbers.childBands.4.shockJ'], // ',' since A11 added a line after it
  ['lastBandReachesAdultWeight', '"maxKg": 40,\n        "adrenalineMg": 0.4', '"maxKg": 35,\n        "adrenalineMg": 0.4', 'numbers.childBands'],
  ['adultEnergyWithinRecordableLimit', '"maxRecordableJ": 1000', '"maxRecordableJ": 150', 'numbers.adult.shockJ'],
  ['adultRoundedWeightWithinMaxWeight', '"adultRoundedToKg": 50', '"adultRoundedToKg": 600', 'numbers.weight.adultRoundedToKg'],
  ['ampouleFitsDilutedVolume', '"ampouleMl": 5,', '"ampouleMl": 50,', 'numbers.preparation.magnesium.ampouleMl'],
  ['bandDosesRiseWithWeight', '"amiodaroneFirstMg": 100,', '"amiodaroneFirstMg": 10,', 'numbers.childBands.2.amiodaroneFirstMg'],
  ['secondAmiodaroneNotAboveFirst', '"amiodaroneSecondMg": 150,', '"amiodaroneSecondMg": 450,', 'numbers.adult.amiodaroneSecondMg'],
  // igelRangesLeaveNoGap was deleted with the iGel list (A15, 14 Nov 2026)
];

for (const [rule, find, replace, place] of RELATIONSHIPS) {
  test(`relationship rule "${rule}": reported only when switched on`, () => {
    assert.equal(count(text, find), 1, `search text must be in the file exactly once: ${find}`);
    const set = JSON.parse(text.replace(find, () => replace));
    const on = checkRuleSet(set, { relationshipRules: [rule] }).filter((p) => p.startsWith(place));
    assert.ok(on.length, `switched on, nothing at ${place}`);
    const withoutIt = checkRuleSet(set, { relationshipRules: RELATIONSHIP_RULES.map((r) => r.id).filter((id) => id !== rule) });
    assert.deepEqual(on.filter((message) => withoutIt.includes(message)), [], 'switched off, the rule must say nothing');
    const defaultOn = RELATIONSHIP_RULES.find((r) => r.id === rule).onByDefault;
    assert.equal(on.some((message) => checkRuleSet(set).includes(message)), defaultOn, defaultOn ? 'marked on by default but silent' : 'marked off by default but reported');
  });
}

test('with no relationship rules switched on, an editor can change a clinical number without being stopped', () => {
  const set = JSON.parse(text.replace('"adrenalineMg": 0.4,', () => '"adrenalineMg": 5,').replace('"shockJ": 160,', () => '"shockJ": 150,'));
  assert.ok(checkRuleSet(set).length >= 2);
  assert.deepEqual(checkRuleSet(set, { relationshipRules: [] }), []);
});

test('the rules marked off by default are exactly the ones written but not yet approved', () => {
  assert.deepEqual(RELATIONSHIP_RULES.filter((r) => !r.onByDefault).map((r) => r.id), ['bandDosesRiseWithWeight', 'secondAmiodaroneNotAboveFirst']);
});

/* ---------- Every number has a type, a unit and a range ---------- */

test('a number with no type, unit and range in the checker is reported (so a new setting cannot slip in)', () => {
  const set = JSON.parse(text);
  set.equipment.forms.intubation.somethingNew = 5;
  const problems = checkRuleSet(set);
  assert.ok(problems.some((p) => p.startsWith('equipment.forms.intubation.somethingNew: ')), problems.join('\n'));
});

test('every kind of impossible value is blocked in every number setting: below the range, above it, text, and a fraction in a count', () => {
  const walk = (node, path, out) => {
    if (typeof node === 'number') out.push(path);
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (path || k !== 'notes') walk(v, path ? path + '.' + k : k, out);
    return out;
  };
  const places = ['numbers', 'equipment', 'sources'].flatMap((part) => walk(reference[part], part, []));
  assert.ok(places.length > 100, 'expected well over 100 numbers in the rule set');
  const set = (obj, path, value) => { const parts = path.split('.'); let node = obj; for (const p of parts.slice(0, -1)) node = node[p]; node[parts.at(-1)] = value; };
  for (const path of places) {
    for (const [what, value] of [['text', 'abc'], ['a huge value', 1e9], ['a negative value', -1], ['not a number', NaN]]) {
      const c = JSON.parse(text); set(c, path, value);
      const problems = checkRuleSet(c);
      assert.ok(problems.some((p) => p.startsWith(path + ': ')), `${what} at ${path} was not reported at that place. Got:\n${problems.slice(0, 5).join('\n')}`);
    }
  }
});

/* ---------- Markup in part 3: every text of the checklists and causes, not only a few chosen ones ---------- */

test('every single text in part 3 (checklists and causes) rejects a script tag, an image with a handler, a link and an unclosed tag, at its own place', () => {
  const places = [];
  (function walk(node, path) {
    if (typeof node === 'string') places.push(path);
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  })(reference.checklists, 'checklists');
  assert.ok(places.length > 100, 'expected well over 100 texts in part 3');
  const set = (obj, path, value) => { const parts = path.split('.'); let node = obj; for (const p of parts.slice(0, -1)) node = node[p]; node[parts.at(-1)] = value; };
  const get = (obj, path) => path.split('.').reduce((node, p) => node[p], obj);
  for (const path of places) {
    for (const tag of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<a href="https://example.com">', '<b']) {
      const c = JSON.parse(text); set(c, path, get(c, path) + tag);
      const problems = checkRuleSet(c);
      assert.ok(problems.some((p) => p.startsWith(path + ': ')), `${tag} added to ${path} was not reported at that place. Got:\n${problems.slice(0, 3).join('\n')}`);
    }
  }
});

/* ---------- A double quote (or a bad link) must not be able to add hidden code to a page attribute ---------- */

const withChange = (path, value) => {
  const c = JSON.parse(text); const parts = path.split('.'); let node = c;
  for (const p of parts.slice(0, -1)) node = node[p];
  node[parts.at(-1)] = value;
  return c;
};

test('a double quote that would add an attribute to the page is rejected, with a message that says what to do (the reviewer\'s two examples)', () => {
  const aria = checkRuleSet(withChange('wording.popups.closeAria', 'Close" data-injected="yes'));
  assert.ok(aria.some((p) => p.startsWith('wording.popups.closeAria: ') && p.includes('double quotes are not allowed') && p.includes('use single quotes')), aria.join('\n'));
  const web = checkRuleSet(withChange('sources.guidelines.magnesium.web', 'https://x"onclick="alert(1)'));
  assert.ok(web.some((p) => p.startsWith('sources.guidelines.magnesium.web: ')), web.join('\n'));
  assert.ok(web.some((p) => p.includes('no quotes')), web.join('\n'));
});

test('a double quote appended to EVERY string value in the five parts, one at a time, is rejected at that place', () => {
  const places = []; // each place is the list of setting names leading to a text (a name may itself contain a dot, such as 1.5)
  (function walk(node, keys) {
    if (typeof node === 'string') places.push(keys);
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, [...keys, k]);
  })({ numbers: reference.numbers, wording: reference.wording, checklists: reference.checklists, equipment: reference.equipment, sources: reference.sources }, []);
  assert.ok(places.length > 600, 'expected hundreds of texts, found ' + places.length);
  for (const keys of places) {
    const c = JSON.parse(text); let node = c;
    for (const k of keys.slice(0, -1)) node = node[k];
    node[keys.at(-1)] += '" x="1';
    const path = keys.join('.');
    assert.ok(checkRuleSet(c).some((p) => p.startsWith(path + ': ')), `a double quote added to ${path} was not reported at that place`);
  }
});

test('web addresses: javascript: and http:// are refused; so are quotes, spaces, < > and a backslash', () => {
  for (const bad of ['javascript:alert(1)', 'http://cpg.stjohn.org.nz/x', 'https://x y', 'https://x<b', 'https://x\\y', "https://x'y", 'data:text/html,hi']) {
    const problems = checkRuleSet(withChange('sources.guidelines.cardiacArrest.web', bad));
    assert.ok(problems.some((p) => p.startsWith('sources.guidelines.cardiacArrest.web: ')), `${bad} was accepted`);
  }
});

test('PDF names: "../", a leading "/", a scheme, quotes and spaces are refused, in both places a PDF name is kept', () => {
  for (const bad of ['../secret.pdf', 'files/../secret.pdf', '/etc/x.pdf', 'https://x.pdf', 'javascript:x.pdf', 'a b.pdf', 'a".pdf', 'a<b.pdf']) {
    assert.ok(checkRuleSet(withChange('sources.guidelines.rsi.pdf', bad)).some((p) => p.startsWith('sources.guidelines.rsi.pdf: ')), `${bad} was accepted in sources`);
    assert.ok(checkRuleSet(withChange('checklists.lists.0.pdf', bad)).some((p) => p.startsWith('checklists.lists.0.pdf: ')), `${bad} was accepted in checklists`);
  }
  assert.deepEqual(checkRuleSet(reference), []);
});
