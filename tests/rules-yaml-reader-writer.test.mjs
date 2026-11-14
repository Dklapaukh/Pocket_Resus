// Step E1b (doc 19): the rules file is YAML. This file proves the three things that make YAML as safe as the
// JSON it replaced:
//   1. THE READER (src/rules/parse.js) reads YAML strictly. A library of YAML traps (below) shows that each
//      one is either REFUSED with a plain message or READ EXACTLY AS TYPED; none is silently turned into
//      something else. Where a trap is read as something valid but surprising (for example the word yes as
//      TEXT, or null), the rule-set checker (src/rules/check.js) is shown stopping the harm.
//   2. THE WRITER (src/rules/write.js) quotes every dangerous text: hundreds of awkward texts, and every
//      text in the real rules file, come back exactly.
//   3. THE VENDORED READER (src/vendor/js-yaml.mjs) is byte for byte the npm package, pinned to one version.
// The test name of each trap says what happens to it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as acornParse } from 'acorn';
import { load as libraryLoad, YAML11_SCHEMA, CORE_SCHEMA } from '../src/vendor/js-yaml.mjs';
import { parseRules, readYamlStrict, checkPlainValues } from '../src/rules/parse.js';
import { rulesFileText, isPlainlySafe } from '../src/rules/write.js';
import { checkRuleSet } from '../src/rules/check.js';
import { withApprovedChanges } from './helpers/approved-changes.mjs';

const at = (path) => new URL('../' + path, import.meta.url);
const yamlText = readFileSync(at('src/rules/nz-eas.yaml'), 'utf8');
const SLOT = 'cprCycleMs: 120000'; // a real setting that must be a whole number of milliseconds (numbers.timing)
const TEXT_SLOT = 'noDoseRecorded: No dose recorded'; // a real setting that must be text (wording.liveCards)

/* The real rules file with one line changed. */
const withSlot = (value) => yamlText.replace(SLOT, 'cprCycleMs: ' + value);
const END = '...\n'; // the end mark line every rules file ends with (small examples below add it to their end)
const refusal = (text) => { try { readYamlStrict(text); } catch (error) { return error.message; } return null; };
const problemsAtSlot = (file) => checkRuleSet(file).filter((p) => p.startsWith('numbers.timing.cprCycleMs: '));

/* ---------- 1. The traps ---------- */

// Refused: the reader stops with one plain message (it always starts "the rules file cannot be read (").
const REFUSED = [
  ['an empty value (a name with nothing after it)', 'a:\n', /left empty/],
  ['a date 2026-09-24', 'a: 2026-09-24\n', /looks like a number or date/],
  ['a time 12:30', 'a: 12:30\n', /looks like a number or date/],
  ['a number with a leading zero 012', 'a: 012\n', /looks like a number or date/],
  ['a number with an exponent 1e3', 'a: 1e3\n', /looks like a number or date/],
  ['a number with an underscore 1_000', 'a: 1_000\n', /looks like a number or date/],
  ['a number starting with a point .5', 'a: .5\n', /looks like a number or date/],
  ['a number with a plus sign +5', 'a: +5\n', /looks like a number or date/],
  ['a number with a trailing point 5.', 'a: 5.\n', /looks like a number or date/],
  ['a number with a trailing zero 1.50', 'a: 1.50\n', /looks like a number or date/],
  ['minus zero -0', 'a: -0\n', /looks like a number or date/],
  ['a number too large to hold, 1e999', 'a: 1e999\n', /looks like a number or date/],
  ['a repeated key', 'a: 1\na: 2\n', /duplicated mapping key at line 2/],
  ['a repeated key written once with quotes', 'a: 1\n"a": 2\n', /duplicated mapping key/],
  ['a repeated number key 1 and "1"', '1: x\n"1": y\n', /duplicated mapping key/],
  ['an anchor', 'a: &x 1\n', /YAML anchor \(&name\) at line 1/],
  ['an anchor and its alias', 'a: &x 1\nb: *x\n', /YAML anchor/],
  ['an alias on its own', 'a: *x\n', /YAML alias \(\*name\) at line 1/],
  ['an anchor on a whole group', 'a: &g\n  b: 1\nc: *g\n', /YAML anchor/],
  ['an explicit tag !!str', 'a: !!str 5\n', /YAML tag \(! or !!\) at line 1/],
  ['an explicit tag !!binary', 'a: !!binary aGVsbG8=\n', /YAML tag/],
  ['an explicit tag !!timestamp', 'a: !!timestamp 2026-09-24\n', /YAML tag/],
  ['an explicit local tag !mine', 'a: !mine x\n', /YAML tag/],
  ['an explicit tag on a group', 'a: !!map\n  b: 1\n', /YAML tag/],
  ['a tab used to indent', 'a:\n\tb: 1\n', /not valid YAML: tab characters must not be used in indentation at line 2/],
  ['two documents', 'a: 1\n---\nb: 2\n', /not valid YAML: it must hold exactly one document/],
  ['no document at all (an empty file)', '', /exactly one document/],
  ['only a comment', '# nothing here\n', /not valid YAML|comment/],
  ['an unquoted colon and space inside text', 'a: Dose: 5 mg\n', /not valid YAML: .*at line 1/],
  ['an unquoted space and # inside text (it would silently cut the text)', 'a: Dose 5 mg #check\n', /# comment at line 1/],
  ['a comment on its own line', '# note\na: 1\n', /# comment at line 1/],
  ['a % directive', '%YAML 1.2\n---\na: 1\n', /% directive/],
  ['an unfinished quote', 'a: "never closed\n', /not valid YAML/],
  ['an unfinished list', 'a: [1, 2\n', /not valid YAML/],
  ['a "complex" key (a list used as a name)', '? [1, 2]\n: 3\n', /not valid YAML/],
  ['bad indentation', 'a:\n    b: 1\n  c: 2\n', /not valid YAML/],
  ['a value left empty inside braces', 'a: {b: }\n', /left empty/],
];
for (const [what, text, says] of REFUSED) {
  test(`trap REFUSED with a plain message: ${what}`, () => {
    const message = refusal(text + END);
    assert.ok(message, 'the reader accepted it');
    assert.match(message, /^the rules file cannot be read \(.+\)\.$/);
    assert.match(message, says);
    assert.doesNotMatch(message, /\n|<anonymous>|at .*\.m?js:\d/, 'one plain line, no code trace');
    assert.throws(() => parseRules(text + END), /^Error: the rules file cannot be read \(/);
  });
}

test('trap REFUSED: a plain * & or ! or # inside ordinary wording is NOT mistaken for an anchor, alias, tag or comment', () => {
  const file = readYamlStrict('a: Tom & Jerry * 2 ! 3 and "quoted"\nb: "x # y & *z !w"\nc: \'q # r\'\nd: x&y *z !w#v\n' + END);
  assert.deepEqual(file, { a: 'Tom & Jerry * 2 ! 3 and "quoted"', b: 'x # y & *z !w', c: 'q # r', d: 'x&y *z !w#v' });
});

// Read exactly as typed: the value is text (or a plain number or null), never something else.
// "number slot" traps are also put in a real number setting, to show the checker stops them there.
const READ_AS_TYPED = [
  ['yes is TEXT "yes", not true', 'yes', 'yes'],
  ['no is TEXT "no", not false', 'no', 'no'],
  ['on is TEXT "on", not true', 'on', 'on'],
  ['off is TEXT "off", not false', 'off', 'off'],
  ['Yes is TEXT "Yes", not true', 'Yes', 'Yes'],
  ['NO is TEXT "NO", not false', 'NO', 'NO'],
  ['y is TEXT "y"', 'y', 'y'],
  ['~ is TEXT "~", not null', '~', '~'],
  ['Null is TEXT "Null", not null', 'Null', 'Null'],
  ['NULL is TEXT "NULL", not null', 'NULL', 'NULL'],
  ['True is TEXT "True", not true', 'True', 'True'],
  ['TRUE is TEXT "TRUE", not true', 'TRUE', 'TRUE'],
  ['0x1F is TEXT "0x1F", not 31', '0x1F', '0x1F'],
  ['0o17 is TEXT "0o17", not 15', '0o17', '0o17'],
  ['.inf is TEXT ".inf", not infinity', '.inf', '.inf'],
  ['-.INF is TEXT "-.INF", not infinity', '-.INF', '-.INF'],
  ['.nan is TEXT ".nan", not NaN', '.nan', '.nan'],
  ['NaN is TEXT "NaN"', 'NaN', 'NaN'],
  ['a quoted "500" is TEXT "500", not a number', '"500"', '500'],
  ['a quoted "true" is TEXT "true"', '"true"', 'true'],
  ['a quoted "2026-09-24" is TEXT, a date as words', '"2026-09-24"', '2026-09-24'],
  ['a quoted "012" is TEXT "012"', '"012"', '012'],
  ['a single-quoted \'1e3\' is TEXT "1e3"', "'1e3'", '1e3'],
];
for (const [what, typed, expected] of READ_AS_TYPED) {
  test(`trap READ AS TYPED: ${what}; in a number setting the checker stops it`, () => {
    const file = readYamlStrict(withSlot(typed));
    assert.strictEqual(file.numbers.timing.cprCycleMs, expected);
    assert.strictEqual(typeof file.numbers.timing.cprCycleMs, 'string');
    const problems = problemsAtSlot(file);
    assert.equal(problems.length, 1, 'the checker must stop text in a number setting');
    assert.match(problems[0], /must be a whole number above 0/);
    assert.deepEqual(readYamlStrict(yamlText.replace(TEXT_SLOT, 'noDoseRecorded: ' + typed)).wording.liveCards.noDoseRecorded, expected, 'and as a text setting it is exactly the text typed');
  });
}

test('trap READ AS TYPED: null is null (the word the file uses for "no number"); in a setting that may not be empty the checker stops it', () => {
  const file = readYamlStrict(withSlot('null'));
  assert.strictEqual(file.numbers.timing.cprCycleMs, null);
  assert.match(problemsAtSlot(file)[0], /found null/);
  assert.strictEqual(readYamlStrict(yamlText).numbers.childBands[0].magnesiumMmol, null, 'the three real "no number" places still read as null');
  assert.deepEqual(checkRuleSet(readYamlStrict(yamlText)), []);
});

test('trap READ AS TYPED: true and false are booleans; in a number setting or a text setting the checker stops them', () => {
  assert.strictEqual(readYamlStrict(withSlot('true')).numbers.timing.cprCycleMs, true);
  assert.equal(problemsAtSlot(readYamlStrict(withSlot('true'))).length, 1);
  const inText = readYamlStrict(yamlText.replace(TEXT_SLOT, 'noDoseRecorded: false'));
  assert.ok(checkRuleSet(inText).some((p) => p.startsWith('wording.liveCards.noDoseRecorded: must be some text')));
});

test('trap READ AS TYPED: a plain number 12 where TEXT is needed is a number; the checker stops it', () => {
  const file = readYamlStrict(yamlText.replace(TEXT_SLOT, 'noDoseRecorded: 12'));
  assert.strictEqual(file.wording.liveCards.noDoseRecorded, 12);
  assert.ok(checkRuleSet(file).some((p) => p.startsWith('wording.liveCards.noDoseRecorded: must be some text')));
});

test('trap READ AS TYPED: a plain whole number is a number and the checker accepts it in a number setting', () => {
  for (const [typed, value] of [['0', 0], ['7', 7], ['120000', 120000], ['-3', -3], ['0.05', 0.05], ['12.5', 12.5]]) {
    assert.strictEqual(readYamlStrict(withSlot(typed)).numbers.timing.cprCycleMs, value, typed);
  }
});

test('trap READ AS TYPED: a merge key << is an ordinary name "<<" (nothing is merged); the checker stops it as an unknown setting', () => {
  const file = readYamlStrict(yamlText.replace(SLOT, SLOT + '\n    <<:\n      adrenalineIntervalMs: 1'));
  assert.deepEqual(file.numbers.timing['<<'], { adrenalineIntervalMs: 1 });
  assert.strictEqual(file.numbers.timing.adrenalineIntervalMs, 240000, 'the real setting is not overwritten');
  assert.ok(checkRuleSet(file).some((p) => p.startsWith('numbers.timing.<<: is not a setting the app knows')));
});

test('trap READ AS TYPED: a name __proto__ is an ordinary name; it changes nothing about other groups', () => {
  const file = readYamlStrict('__proto__:\n  polluted: 1\nb: 2\n' + END);
  assert.deepEqual(Object.keys(file), ['__proto__', 'b']);
  assert.equal(Object.getPrototypeOf(file), Object.prototype);
  assert.equal({}.polluted, undefined);
});

test('trap READ AS TYPED: a very long line (30 000 characters) is read whole, with no folding, and written back whole', () => {
  const long = 'dose '.repeat(6000).trim();
  const file = readYamlStrict('a: ' + long + '\nb: "' + long + '"\n' + END);
  assert.equal(file.a, long);
  assert.equal(file.b, long);
  const written = rulesFileText({ a: long, b: long + ' 1:2' });
  assert.equal(written.split('\n').length, 4, 'one line each (and the end mark and the last line break), never wrapped');
  assert.deepStrictEqual(readYamlStrict(written), { a: long, b: long + ' 1:2' });
});

test('trap READ AS TYPED: line endings of Windows (CR LF) and a byte-order mark at the start read the same values as the real file', () => {
  const expected = readYamlStrict(yamlText);
  assert.deepStrictEqual(readYamlStrict(yamlText.replace(/\n/g, '\r\n')), expected);
  assert.deepStrictEqual(readYamlStrict('\uFEFF' + yamlText), expected);
});

test('trap READ AS TYPED: a multi-line quoted text keeps its line breaks; a plain text spread over two lines is joined with ONE space (the writer never writes it that way)', () => {
  assert.equal(readYamlStrict('a: "one\\ntwo"\n' + END).a, 'one\ntwo');
  assert.equal(readYamlStrict('a: one\n  two\n' + END).a, 'one two');
});

test('the value check refuses anything that is not a finite number, true/false, text, null, a list or a plain map', () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined, () => 1, new Date(0), new Map(), Symbol('x'), 10n, /x/, new (class A {})(), Object.create(null)]) {
    assert.throws(() => checkPlainValues({ a: [bad] }), /not a number, true\/false, text, a list or a map \(at the file\.a\[0\]\)/, typeof bad);
  }
  for (const good of [0, -1.5, 'x', '', true, false, null, [], {}, [1, 'a', [null]], { a: { b: [true] } }]) assert.doesNotThrow(() => checkPlainValues(good));
  assert.throws(() => rulesFileText({ a: NaN }), /not a number/);
  assert.throws(() => rulesFileText({ a: Infinity }), /not a number/);
});

test('the number of traps: at least 15 different kinds are covered by name', () => {
  assert.ok(REFUSED.length + READ_AS_TYPED.length >= 15);
});

/* ---------- 1b. A file cut short, the end mark and the names at the top ---------- */

// Every rules file ends with the end mark line "...". A file that stops anywhere before it (a transfer that
// stopped early, a half-saved file) is refused, wherever it was cut, even inside the last part (notes).
const NO_MARK_MESSAGE = /^the rules file cannot be read \(it is incomplete: its last line, \.\.\., is missing, so the file may have been cut short\)\.$/;
const BODY = yamlText.slice(0, -END.length); // the real file without its end mark

const END_MARK_TRAPS = [
  ['no end mark at all', BODY, NO_MARK_MESSAGE],
  ['the end mark without its last line break', yamlText.slice(0, -1), NO_MARK_MESSAGE],
  ['the end mark cut to two full stops', BODY + '..\n', NO_MARK_MESSAGE],
  ['the end mark with a space after it', BODY + '... \n', NO_MARK_MESSAGE],
  ['text after the end mark', yamlText + 'a: 1\n', NO_MARK_MESSAGE],
  ['text after the end mark and a second end mark', yamlText + 'a: 1\n...\n', /end mark \.\.\. before the last line/],
  ['the end mark twice', yamlText + END, /end mark \.\.\. before the last line/],
  ['an end mark in the middle', yamlText.replace('\nnumbers:\n', '\n...\nnumbers:\n'), /end mark \.\.\. before the last line/],
  ['a second document after an end mark', BODY + '...\n---\nb: 1\n...\n', /end mark \.\.\. before the last line/],
  ['a blank line then the end mark with a second blank line after it', BODY + '...\n\n', NO_MARK_MESSAGE],
  ['an empty file', '', NO_MARK_MESSAGE],
];
for (const [what, text, says] of END_MARK_TRAPS) {
  test(`trap REFUSED (end mark): ${what}`, () => {
    assert.match(refusal(text) ?? 'it was read', says);
    assert.throws(() => parseRules(text), { message: says });
  });
}

test('the real file cut at the end (the original cut test: its last 40 characters missing) is refused', () => {
  assert.match(refusal(yamlText.slice(0, yamlText.length - 40)) ?? 'it was read', NO_MARK_MESSAGE);
  assert.throws(() => parseRules(yamlText.slice(0, yamlText.length - 40)), { message: NO_MARK_MESSAGE });
});

test('the real file cut at EVERY character, and at every line break, is refused (nothing short of the whole file is read)', () => {
  let cuts = 0;
  for (let length = 0; length < yamlText.length; length++) {
    const cut = yamlText.slice(0, length);
    let read = false;
    try { parseRules(cut); read = true; } catch (error) { assert.match(error.message, NO_MARK_MESSAGE, 'cut at ' + length); }
    assert.equal(read, false, 'a file cut after ' + length + ' characters was read');
    cuts++;
  }
  assert.equal(cuts, yamlText.length);
  let lineCuts = 0;
  for (let at = yamlText.indexOf('\n'); at !== -1 && at < yamlText.length - END.length; at = yamlText.indexOf('\n', at + 1)) {
    assert.match(refusal(yamlText.slice(0, at + 1)) ?? 'it was read', NO_MARK_MESSAGE, 'cut after line break at ' + at);
    lineCuts++;
  }
  assert.ok(lineCuts > 1000, 'the file has well over 1000 lines');
  assert.ok(yamlText.length - yamlText.lastIndexOf('\nnotes:\n') > 300, 'the last 300 characters are inside notes, the last part');
});

test('the end mark is not data: the values read are exactly the values of the frozen JSON file, with nothing extra', () => {
  const frozen = withApprovedChanges(JSON.parse(readFileSync(at('tests/baseline/nz-eas-before-yaml.json'), 'utf8'))); // plus approved A-table changes
  assert.deepStrictEqual(readYamlStrict(yamlText), frozen);
  assert.deepEqual(Object.keys(readYamlStrict(yamlText)), ['about', 'numbers', 'wording', 'checklists', 'equipment', 'sources', 'notes']);
});

// The top-level names must be exactly about, numbers, wording, checklists, equipment, sources, notes, in that order.
const NAMES = ['about', 'numbers', 'wording', 'checklists', 'equipment', 'sources', 'notes'];
const whole = () => readYamlStrict(yamlText);
const NAME_TRAPS = [
  ['a part missing: wording', () => { const f = whole(); delete f.wording; return f; }, /missing part: wording\./],
  ['about missing', () => { const f = whole(); delete f.about; return f; }, /missing part: about\./],
  ['notes missing', () => { const f = whole(); delete f.notes; return f; }, /missing part: notes\./],
  ['everything missing but notes', () => ({ notes: whole().notes }), /missing part: about, numbers, wording, checklists, equipment, sources\./],
  ['an extra name at the end', () => ({ ...whole(), extra: 1 }), /part it should not have: extra\./],
  ['an extra name at the start', () => ({ extra: 1, ...whole() }), /part it should not have: extra\./],
  ['a spelling mistake in a name (Numbers)', () => { const { numbers, ...rest } = whole(); return { ...rest, Numbers: numbers }; }, /missing part: numbers\./],
  ['numbers and wording swapped', () => { const f = whole(); return { ...f, numbers: f.wording, wording: f.numbers }; }, null], // same names, same order: values are the checker's job
  ['two parts in the other order', () => { const { numbers, wording, ...rest } = whole(); return { about: rest.about, wording, numbers, ...rest }; }, /wrong order/],
  ['about moved to the end', () => { const { about, ...rest } = whole(); return { ...rest, about }; }, /wrong order/],
  ['notes moved to the start', () => { const { notes, ...rest } = whole(); return { notes, ...rest }; }, /wrong order/],
  ['the whole file reversed', () => Object.fromEntries(Object.entries(whole()).reverse()), /wrong order/],
];
for (const [what, make, says] of NAME_TRAPS) {
  test(`trap REFUSED (top-level names): ${what}`, () => {
    const text = rulesFileText(make());
    if (says) assert.throws(() => parseRules(text), says);
    else assert.doesNotThrow(() => parseRules(text));
  });
}

test('the standard names are exactly about, numbers, wording, checklists, equipment, sources, notes and the real file has them in that order', () => {
  assert.deepEqual(NAMES, Object.keys(JSON.parse(readFileSync(at('tests/baseline/nz-eas-before-yaml.json'), 'utf8'))), 'the same order as the frozen JSON file');
  assert.deepEqual(Object.keys(whole()), NAMES);
  assert.doesNotThrow(() => parseRules(yamlText));
});

/* ---------- 2. The writer ---------- */

// Awkward texts: every piece of YAML that could be mistaken for something else, alone and with
// characters in front of it or behind it.
const WORDS = ['yes', 'no', 'on', 'off', 'Yes', 'NO', 'true', 'True', 'FALSE', 'null', 'Null', '~', 'y', 'n', 'Y', 'N', '012', '0x1F', '0o17', '1e3', '1E3', '1_000', '.5', '+5', '-5', '5.', '1.50', '-0',
  '2026-09-24', '12:30', '.inf', '-.inf', '.nan', 'NaN', 'Infinity', '1e999', 'a: b', 'a:b', 'a #b', 'a#b', '#', ':', '- x', '-', '?', '? x', '---', '...', '<<', '=', '&x', '*x', '!!str', '!x', '|', '>', '{a}', '[a]', '{', '}', '[', ']',
  'x\ny', 'x\r\ny', 'x\ty', 'é', '😀', '\u2028', '\u00a0', '\ufeff', 'say "hi"', "it's", 'back\\slash', '"', "'", '%YAML', '@x', '`x', ',', '', ' ', '  x', 'x  ', '0', '10', '3.14'];
const FRONT = ['', ' ', '- ', '? ', ': ', '# ', '& ', '* ', '! ', '| ', '> ', "'", '"', '%', '@', '`', '[', '{', ',', '~', '\t'];
const AWKWARD = [...new Set(FRONT.flatMap((front) => WORDS.map((word) => front + word)).concat(WORDS.map((word) => word + ' '), WORDS.map((word) => word + ' #x'), WORDS.map((word) => 'x ' + word + ' y')))];
const REAL_TEXTS = [];
(function collect(value) {
  if (typeof value === 'string') REAL_TEXTS.push(value);
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) { REAL_TEXTS.push(key); collect(item); }
})(readYamlStrict(yamlText));

test(`the writer returns each of ${AWKWARD.length} awkward texts exactly: as a value, as a name, in a list, and when read by a looser YAML reader`, () => {
  assert.ok(AWKWARD.length >= 300);
  const wholeFile = { values: Object.fromEntries(AWKWARD.map((text, i) => ['v' + i, text])), names: Object.fromEntries(AWKWARD.map((text) => [text, 1])), list: AWKWARD };
  const written = rulesFileText(wholeFile);
  const back = readYamlStrict(written);
  assert.deepStrictEqual(back, wholeFile);
  assert.equal(JSON.stringify(back), JSON.stringify(wholeFile), 'same order too');
  assert.equal(rulesFileText(back), written, 'writing what was read gives the identical text');
  // Even a reader that guesses MORE (YAML 1.1: yes/no/on/off, dates, hex...) reads every text back as the same text.
  for (const schema of [YAML11_SCHEMA, CORE_SCHEMA]) {
    const loose = libraryLoad(written, { schema });
    assert.deepStrictEqual(loose.values, wholeFile.values, 'values, loose reader');
    assert.deepStrictEqual(loose.list, wholeFile.list, 'list, loose reader');
    assert.deepStrictEqual(Object.keys(loose.names), Object.keys(wholeFile.names), 'names, loose reader');
  }
});

test(`the writer returns every text and name in the real rules file (${REAL_TEXTS.length}) exactly`, () => {
  assert.ok(REAL_TEXTS.length > 1000);
  const back = readYamlStrict(rulesFileText({ list: REAL_TEXTS }));
  assert.deepStrictEqual(back.list, REAL_TEXTS);
});

test('the writer quotes text that could be mistaken for anything else, and leaves simple words plain', () => {
  const written = rulesFileText({ a: 'yes', b: '12', c: '', d: ' x', e: 'x ', f: 'a: b', g: 'a #b', h: 'x\ny', i: '2026-09-24', j: '~', k: 'null', l: 'Adrenaline 1 mg', m: 'Seek clinical advice', n: 5, o: true, p: null, q: 'true' });
  assert.equal(written, [
    'a: "yes"', 'b: "12"', 'c: ""', 'd: " x"', 'e: "x "', 'f: "a: b"', 'g: "a #b"', 'h: "x\\ny"', 'i: "2026-09-24"', 'j: "~"', 'k: "null"',
    'l: Adrenaline 1 mg', 'm: Seek clinical advice', '"n": 5', 'o: true', 'p: null', 'q: "true"', '...', ''].join('\n'));
  for (const text of ['Adrenaline 1 mg', 'Seek clinical advice', 'Cycle {number}']) assert.equal(isPlainlySafe(text), true, text);
  for (const text of ['yes', 'No', '12', '', ' x', 'x ', 'a: b', 'a #b', 'a#b', 'x\ny', '- x', '~', 'null', 'True', '.5']) assert.equal(isPlainlySafe(text), false, JSON.stringify(text));
});

test('the writer layout: 2-space indent, one value per line, lists with "- ", empty list [] and empty group {}, no wrapping, no anchors, no tags, ends with the end mark line and one line break', () => {
  const written = rulesFileText({ a: { b: [1, { c: 'x', d: [] }, 'z'], e: {} }, f: null });
  assert.equal(written, 'a:\n  b:\n    - 1\n    - c: x\n      d: []\n    - z\n  e: {}\nf: null\n...\n');
  const shared = { x: 1 };
  assert.equal(rulesFileText({ a: shared, b: shared }), 'a:\n  x: 1\nb:\n  x: 1\n...\n', 'the same object used twice is written out twice, never as an anchor');
});

test('the real rules file is exactly what the writer writes, and writing what the reader reads gives it back byte for byte', () => {
  assert.equal(rulesFileText(readYamlStrict(yamlText)), yamlText);
  assert.equal(rulesFileText(readYamlStrict(rulesFileText(readYamlStrict(yamlText)))), yamlText);
  assert.ok(yamlText.endsWith('\n...\n') && !yamlText.endsWith('\n\n...\n') && !yamlText.includes('\r') && !yamlText.includes('\t') && !yamlText.startsWith('\uFEFF'));
});

test('a file with the same values written in another layout is read the same but is NOT the standard file (so the editor and tests can tell)', () => {
  const other = yamlText.replace('cprCycleMs: 120000', 'cprCycleMs: 120000   ').replace('  weight:\n', '\n  weight:\n');
  assert.deepStrictEqual(readYamlStrict(other), readYamlStrict(yamlText));
  assert.notEqual(rulesFileText(readYamlStrict(other)), other);
});

/* ---------- 3. The vendored reader ---------- */

test('src/vendor/js-yaml.mjs is byte for byte the file in node_modules/js-yaml, and its licence is the package licence', () => {
  assert.ok(readFileSync(at('src/vendor/js-yaml.mjs')).equals(readFileSync(at('node_modules/js-yaml/dist/js-yaml.mjs'))));
  assert.ok(readFileSync(at('src/vendor/js-yaml.LICENSE')).equals(readFileSync(at('node_modules/js-yaml/LICENSE'))));
  assert.match(readFileSync(at('src/vendor/js-yaml.LICENSE'), 'utf8'), /MIT License/);
});

test('package.json pins js-yaml to one exact version (no ^ or ~), the installed package and the lock file agree', () => {
  const pinned = JSON.parse(readFileSync(at('package.json'), 'utf8')).devDependencies['js-yaml'];
  assert.match(pinned, /^\d+\.\d+\.\d+$/, 'must be an exact version, not a range');
  assert.equal(pinned, '5.5.0');
  assert.equal(JSON.parse(readFileSync(at('node_modules/js-yaml/package.json'), 'utf8')).version, pinned);
  const lock = JSON.parse(readFileSync(at('package-lock.json'), 'utf8'));
  assert.equal(lock.packages['node_modules/js-yaml'].version, pinned);
  assert.equal(lock.packages[''].devDependencies['js-yaml'], pinned);
  assert.match(readFileSync(at('src/vendor/js-yaml.mjs'), 'utf8').split('\n')[0], new RegExp('js-yaml ' + pinned.replace(/\./g, '\\.')), 'the file itself says its version');
});

test('the vendored reader is one self-contained module: it imports nothing, so a phone can load it from its own folder', () => {
  // ecmaVersion 2022 (class fields, ??=): works in every browser the app already needs (Safari 15.4, Chrome 93 for Array.at)
  const tree = acornParse(readFileSync(at('src/vendor/js-yaml.mjs'), 'utf8'), { ecmaVersion: 2022, sourceType: 'module' });
  assert.deepEqual(tree.body.filter((node) => node.type === 'ImportDeclaration'), []);
  assert.deepEqual(tree.body.filter((node) => node.type === 'ExportNamedDeclaration' && node.source), [], 'it re-exports nothing from elsewhere');
  assert.ok(!/\brequire\(|import\(/.test(readFileSync(at('src/vendor/js-yaml.mjs'), 'utf8')));
  assert.ok(!/\(\?<[=!]/.test(readFileSync(at('src/vendor/js-yaml.mjs'), 'utf8')), 'no regex look-behind (older Safari cannot even load a file that has one)');
});

test('the lock-in test does not scan the vendored reader (it holds no clinical text), and the reader is not in the scanned folders', () => {
  const lockIn = readFileSync(at('tests/step3a-lock-in.test.mjs'), 'utf8');
  const dirs = lockIn.match(/const DIRS = \[([^\]]*)\]/)[1];
  assert.ok(!dirs.includes('vendor'), 'the lock-in test scans: ' + dirs);
  assert.ok(dirs.includes('src/rules'), 'but it still scans the reader and writer written for the app (src/rules)');
});

test('the shipped app files (not the vendored reader) say where the reader comes from, and the licence file is kept next to it', () => {
  assert.match(readFileSync(at('src/rules/parse.js'), 'utf8'), /from '\.\.\/vendor\/js-yaml\.mjs'/);
  assert.ok(readFileSync(at('src/vendor/js-yaml.LICENSE'), 'utf8').length > 500);
});
