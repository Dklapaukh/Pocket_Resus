/* RULES FILE READER: turns the text of nz-eas.yaml into the rule set the app uses.

   It keeps only the five parts (numbers, wording, checklists, equipment, sources) and ignores the
   "about" and "notes" entries, which are explanations for people. The file must hold exactly the names
   about, numbers, wording, checklists, equipment, sources, notes in that order, and must end with the end
   mark line "..." (so a file cut short is refused). If the text is not valid YAML, uses
   anything beyond plain values, or one of the five parts is missing, it stops with a plain-English
   message: the app must never start with a partial or surprising rule set. The full pre-publish checks
   are in check.js and run in the tests, not on the phone. This file holds no clinical numbers or wording.

   STRICT READING. The reader is js-yaml (src/vendor/js-yaml.mjs) in its strictest schema, the "JSON schema":
     - only the words true, false and null are special; yes, no, on, off, ~ and 0x1F stay plain TEXT,
       exactly as typed; a plain value that starts like a number but is not one (012, 1e3, .5, +5, a date
       such as 2026-09-24) is refused, so it is never guessed at;
     - a name used twice in the same map is an error; the file must hold exactly one document;
     - anchors and aliases (&x, *x), tags (!, !!), % directives and # comments are refused (see below);
     - an empty value (a name followed by nothing) is refused: write null, or "" for empty text.
   Everything the reader returns is a finite number, true/false, text, null, a list or a plain map.
   (null is allowed because the rule set uses it for "no number", for example no magnesium dose listed;
   check.js, run in the tests, only allows it in those places.) */
import { parseEvents, constructFromEvents, JSON_SCHEMA, EVENT_ID, SCALAR_STYLE_PLAIN } from '../vendor/js-yaml.mjs';

export const PARTS = ['numbers', 'wording', 'checklists', 'equipment', 'sources'];

// The names at the top of the rules file, in the one order the standard layout writes them. Anything
// missing, extra or in another order is refused (see readRulesFile).
export const FILE_NAMES = ['about', ...PARTS, 'notes'];

/* THE END MARK. The standard layout ends with the YAML "end of document" line (three full stops on a line
   of their own). A file that stops anywhere before it, even inside the last part, is a cut-short file and is
   refused: a half-sent file must never start the app with half the rules. The mark is not data. */
export const END_MARK = '...';
const ENDS_WITH_MARK = /(?:^|\n)\.\.\.\r?\n$/;
const A_MARK_LINE = /^\.\.\.(?:[ \t]|$)/;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

// A plain value that starts like a number must BE a plain number (12 or 12.5). 1e3, 5., 1.50, +5, .5, 012, a
// date such as 2026-09-24 or 1-2 are refused rather than guessed at; text that starts with a digit is
// written in quotes.
const LOOKS_LIKE_NUMBER = /^[-+]?\.?\d[\d.:eE+_-]*$/;
const PLAIN_NUMBER = /^(0|-?(?:[1-9]\d*|0(?=\.))(\.\d*[1-9])?)$/; // no leading zero, no trailing zero, no -0

const cannotRead = (why) => new Error('the rules file cannot be read (' + why + ').');
const lineOf = (text, offset) => 'line ' + (text.slice(0, offset).split('\n').length);

/* Looks through the reader's list of events (one per value, list or map) and refuses what the rule set
   must never contain. Each event knows where in the text its anchor, tag or value starts, so a * or & or #
   inside ordinary wording is never mistaken for one. */
function refuseAnythingBeyondPlainValues(text, events) {
  let after = 0; // where the last value ended: the text between values is only layout
  for (const event of events) {
    if (event.type === EVENT_ID.DOCUMENT && event.directives.length) throw cannotRead('it starts with a % directive, which is not allowed');
    if (event.type === EVENT_ID.ALIAS) throw cannotRead('it uses a YAML alias (*name) at ' + lineOf(text, event.anchorStart) + ', which is not allowed');
    if (event.anchorStart >= 0) throw cannotRead('it uses a YAML anchor (&name) at ' + lineOf(text, event.anchorStart) + ', which is not allowed');
    if (event.tagStart >= 0) throw cannotRead('it uses a YAML tag (! or !!) at ' + lineOf(text, event.tagStart) + ', which is not allowed');
    if (event.type !== EVENT_ID.SCALAR) continue;
    if (event.valueStart === event.valueEnd && event.style === SCALAR_STYLE_PLAIN) throw cannotRead('a value is left empty at ' + lineOf(text, event.valueStart) + '; write null for no number, or "" for empty text');
    const written = text.slice(event.valueStart, event.valueEnd);
    if (event.style === SCALAR_STYLE_PLAIN && LOOKS_LIKE_NUMBER.test(written) && !PLAIN_NUMBER.test(written)) {
      throw cannotRead('"' + written + '" at ' + lineOf(text, event.valueStart) + ' looks like a number or date but is not a plain number; write numbers like 12 or 12.5, and put text in quotes');
    }
    const layout = text.slice(after, event.valueStart);
    if (layout.includes('#')) throw cannotRead('it has a # comment at ' + lineOf(text, after + layout.indexOf('#')) + ', which is not allowed; put notes in the "notes" entry');
    after = event.valueEnd;
  }
  const end = text.slice(after);
  if (end.includes('#')) throw cannotRead('it has a # comment at ' + lineOf(text, after + end.indexOf('#')) + ', which is not allowed');
}

/* Throws a plain message if anything inside is not a finite number, true/false, text, null, a list or a
   plain map. (Also used by the writer, so what is written is always what can be read.) */
export function checkPlainValues(value, where = 'the file') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) { value.forEach((item, i) => checkPlainValues(item, where + '[' + i + ']')); return; }
  if (isPlainObject(value)) { for (const [key, item] of Object.entries(value)) checkPlainValues(item, where + '.' + key); return; }
  throw new Error('the rules file has a value that is not a number, true/false, text, a list or a map (at ' + where + ').');
}

/* Reads the WHOLE text of a rules file, strictly (see the top of this file), and returns the file as
   plain values in the order written. The text must end with the end mark line (see END_MARK) and have it
   nowhere else. Throws one plain-English error if anything is wrong. */
export function readYamlStrict(text) {
  if (typeof text !== 'string') throw cannotRead('it is not valid YAML');
  if (!ENDS_WITH_MARK.test(text)) throw cannotRead('it is incomplete: its last line, ' + END_MARK + ', is missing, so the file may have been cut short');
  const lines = text.split('\n');
  if (lines.slice(0, -2).some((line) => A_MARK_LINE.test(line))) throw cannotRead('it has the end mark ' + END_MARK + ' before the last line, which is not allowed');
  let documents;
  try {
    const events = parseEvents(text, {});
    refuseAnythingBeyondPlainValues(text, events);
    documents = constructFromEvents(events, { source: text, schema: JSON_SCHEMA });
  } catch (error) {
    if (error && /^the rules file cannot be read/.test(error.message)) throw error;
    const where = error && error.mark ? ' at line ' + (error.mark.line + 1) : '';
    throw cannotRead('it is not valid YAML: ' + ((error && (error.reason || error.message)) || 'unknown problem').split('\n')[0] + where);
  }
  if (documents.length !== 1) throw cannotRead('it is not valid YAML: it must hold exactly one document');
  checkPlainValues(documents[0]);
  return documents[0];
}

/* Reads a rules file and checks its top-level names: exactly FILE_NAMES, in that order. Returns the whole
   file (about and notes too). Throws one plain-English error if anything is wrong. */
export function readRulesFile(text) {
  const file = readYamlStrict(text);
  if (!isPlainObject(file)) throw new Error('the rules file is empty or has the wrong shape.');
  const names = Object.keys(file);
  const absent = FILE_NAMES.filter((name) => !names.includes(name));
  if (absent.length) throw new Error('the rules file is missing part: ' + absent.join(', ') + '.');
  const unknown = names.filter((name) => !FILE_NAMES.includes(name));
  if (unknown.length) throw new Error('the rules file has a part it should not have: ' + unknown.join(', ') + '.');
  if (names.join() !== FILE_NAMES.join()) throw new Error('the rules file has its parts in the wrong order (it must be: ' + FILE_NAMES.join(', ') + ').');
  return file;
}

export function parseRules(text) {
  const file = readRulesFile(text);
  const missing = PARTS.filter((part) => !isPlainObject(file[part]));
  if (missing.length) throw new Error('the rules file is missing part: ' + missing.join(', ') + '.');
  return Object.fromEntries(PARTS.map((part) => [part, file[part]]));
}

/* The one message shown on the page when the rules cannot be loaded. */
export function rulesProblemMessage(error) {
  return 'The clinical rules could not be loaded, so the app has not started and no doses or timers are shown. ' +
    'Close the app and open it again while you are online. If this message stays, use your clinical guidelines and tell the app owner. ' +
    'Reason: ' + (error && error.message ? error.message : 'unknown') + (/[.!]$/.test(String(error && error.message)) ? '' : '.');
}
