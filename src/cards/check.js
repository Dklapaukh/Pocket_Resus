/* CARD CHECKER: reads a whole card rule file and lists every problem in plain English. An empty list means
   the file passed. Each problem starts with the place it is about, for example
   "cards[2] (amiodarone-1).show_when[3]: shocks_at_least must be a whole number from 1 to 100 (found 0)".

   The card format is CARDS-DESIGN.md section 2 (owner-approved cards plan, 15 Nov 2026). One card is one
   guideline instruction the app acts on. The checker makes sure that:
     - every card has only the known fields, each of the right kind;
     - "when it shows" uses only the seven fixed conditions (no "or", no formulas: editor decision 13), and the
       conditions can all be true together;
     - every guideline sentence ({text, source}) names its guideline and page(s), and is found WORD FOR WORD on
       one of those pages of the packaged PDF (owner rulings D6 and Q9). Spacing, curly quotes and dash styles
       are ignored, nothing else;
     - app text ({app_text}) is never a dose unless an owner ruling is cited;
     - a dose taken from a table names a table and column that exist.
   It is a pure function: it reads only what it is given and changes nothing. It holds no clinical values.
   The phone never runs it; the tests do (and the rules editor will). */

import { readYamlStrict } from '../rules/parse.js';

// The names at the top of a card file, in this order (anything missing, extra or out of order is refused).
export const FILE_NAMES = ['about', 'guidelines', 'settings', 'tables', 'cards', 'checklists'];

// Where a card is drawn on the screen.
export const PLACES = ['top', 'lower', 'header', 'guidance'];

// The seven conditions (CARDS-DESIGN.md section 2). Two are plain words; five take a value.
export const WORD_CONDITIONS = ['arrest_running', 'on_request'];
export const VALUE_CONDITIONS = ['latest_rhythm', 'shocks_at_least', 'ever_recorded', 'never_recorded', 'doses_at_least'];

// Every field a card may have. The first five are required.
const REQUIRED_FIELDS = ['id', 'title', 'place', 'show_when', 'lines'];
const CARD_FIELDS = [...REQUIRED_FIELDS, 'group', 'dose', 'record', 'timer', 'repeat', 'details', 'pop_up_on_show', 'lock_s', 'note'];

// Wide limits that block the impossible. They are not clinical opinions.
const LIMITS = { shocks: [1, 100], doses: [1, 20], timerMin: [1, 60], lockS: [0, 600], repeatMax: [1, 20] };

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const isMap = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isWhole = (value, [low, high]) => Number.isInteger(value) && value >= low && value <= high;
const show = (value) => JSON.stringify(value);

/* ---------- Comparing card text with the guideline ---------- */

/* Makes two pieces of text comparable: the same letters and words in the same order count as the same, whatever
   the spacing, line breaks, quote style (‘ ’ “ ”) or dash style (‐ – —). Nothing else is changed. */
export function sameWords(text) {
  return String(text).normalize('NFC')
    .replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl') // the PDF's "fi" and "fl" joined letters
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* A guideline page as one line of comparable text, plus where its sentences and lines may start and end. A card
   sentence must start and end on these places: it cannot be a fragment cut from the middle of a sentence or a word
   ("50 mg" inside "150 mg", "administer ..." without the "Do not" before it).
   A place is: the start or end of the text; a full stop, colon, semicolon, question or exclamation mark followed by
   a word that does not start with a small letter; or a line break, unless the next line starts with a small letter
   (then the line was only wrapped). bodies is a list of page bodies; consecutive pages are joined as one. */
export function comparableText(bodies) {
  const lines = bodies.join('\n\n').split('\n').map(sameWords);
  let text = '';
  const starts = new Set(), ends = new Set();
  let breakBefore = true; // a blank line (or the start) always ends what came before
  for (const line of lines) {
    if (!line) { breakBefore = true; continue; }
    const wrapped = !breakBefore && /^[a-z]/.test(line);
    if (text) {
      if (!wrapped) ends.add(text.length);
      text += ' ';
    }
    if (!wrapped) starts.add(text.length);
    const offset = text.length;
    text += line;
    for (const m of line.matchAll(/[.:;?!](?= (?![a-z]))/g)) { ends.add(offset + m.index + 1); starts.add(offset + m.index + 2); }
    breakBefore = false;
  }
  ends.add(text.length);
  return { text, starts, ends };
}

// True when wanted appears in place (from comparableText) starting and ending on a sentence or line boundary.
export function foundWhole(wanted, place) {
  for (let at = place.text.indexOf(wanted); at >= 0; at = place.text.indexOf(wanted, at + 1)) {
    if (place.starts.has(at) && place.ends.has(at + wanted.length)) return true;
  }
  return false;
}

/* The body of one exported PDF page: without the export header (up to "View online at cpg.stjohn.org.nz") and the
   footer (from the last "Clinical Practice Guidelines"). Card text is compared with the body only, so the export
   header and footer can never pass as guideline text, and a sentence that runs on to the next page is found across
   the page break. */
const HEADER_END = 'View online at cpg.stjohn.org.nz';
const FOOTER_START = 'Clinical Practice Guidelines';
export function pageBody(pageText) {
  const start = pageText.indexOf(HEADER_END);
  const end = pageText.lastIndexOf(FOOTER_START);
  const from = start < 0 ? 0 : start + HEADER_END.length;
  return pageText.slice(from, end < from ? pageText.length : end);
}

/* ---------- Sources ---------- */

/* A source is one or more parts joined by " · ", for example "EAS 3.14 p1", "EAS 7.2 p5, p8, p10-11" or
   "Owner ruling A10 · EAS 3.14 p1". Returns { eas: [{ code, pages: [n, ...] }], rulings: [text], problem }. */
const EAS_PART = /^EAS (\d+(?:\.\d+)?) (p\d+(?:[-–]\d+)?(?:, p\d+(?:[-–]\d+)?)*)$/;
const RULING_PART = /^Owner ruling \S.*$/;
export function readSource(source) {
  const result = { eas: [], rulings: [], problem: null };
  if (!isText(source)) { result.problem = 'needs a source (guideline and page, for example "EAS 3.14 p1")'; return result; }
  for (const part of source.split(' · ')) {
    const eas = EAS_PART.exec(part);
    if (eas) {
      const pages = [];
      for (const item of eas[2].split(', ')) {
        const [from, to = from] = item.slice(1).split(/[-–]/).map(Number);
        if (from < 1 || to < from) { result.problem = 'has a page range that runs backwards or starts at 0: "' + item + '"'; return result; }
        for (let page = from; page <= to; page++) pages.push(page);
      }
      result.eas.push({ code: eas[1], pages });
    } else if (RULING_PART.test(part)) {
      result.rulings.push(part);
    } else {
      result.problem = 'has a part that is not "EAS <number> p<page>" or "Owner ruling <which>": "' + part + '"';
      return result;
    }
  }
  return result;
}

/* ---------- The checker ---------- */

/* Reads the text of a card file strictly (the same strict YAML reader as the live rule set: no anchors, tags or
   comments; must end with the "..." line) and checks its top-level names. Throws one plain-English error. */
export function readCardFile(text) {
  const file = readYamlStrict(text);
  if (!isMap(file)) throw new Error('the card file is empty or has the wrong shape.');
  const names = Object.keys(file);
  if (names.join() !== FILE_NAMES.join()) throw new Error('the card file must hold exactly these parts, in this order: ' + FILE_NAMES.join(', ') + ' (found: ' + names.join(', ') + ').');
  return file;
}

/* Checks a whole card file (as returned by readCardFile). guidelineText is src/cards/guideline-text.json:
   { "<pdf file>": ["page 1 text", ...] }. Returns the list of problems (empty when the file passes). */
export function checkCardFile(file, guidelineText) {
  const problems = [];
  const problem = (where, message) => problems.push(where + ': ' + message);
  if (!isMap(file)) return ['the file: is not a map of parts'];
  for (const name of FILE_NAMES) if (!(name in file)) problem(name, 'this part is missing');
  for (const name of Object.keys(file)) if (!FILE_NAMES.includes(name)) problem(name, 'is not a part a card file may have');

  if (!isText(file.about)) problem('about', 'needs a short plain-English description of the file');
  const guidelines = checkGuidelines(file.guidelines, guidelineText, problem);
  const rhythms = checkSettings(file.settings, problem);
  const tables = checkTables(file.tables, guidelines, guidelineText, problem);
  const context = { guidelines, guidelineText, tables, rhythms, problem };
  checkCards(file.cards, context);
  checkChecklists(file.checklists, context);
  return problems;
}

// Marks a guideline whose pdf field is wrong: reported once at the guideline, not again at every line citing it.
const BROKEN = Symbol('a guideline whose pdf field is wrong (reported at the guideline, not at every line citing it)');

/* guidelines: { "3.14": { title, pdf, web? }, ... }. pdf is the packaged file, or null when the guideline is
   online only (then no sentence can cite it, because it cannot be compared). Returns code -> pdf (or null). */
function checkGuidelines(guidelines, guidelineText, problem) {
  const known = new Map();
  if (!isMap(guidelines) || !Object.keys(guidelines).length) { problem('guidelines', 'needs at least one guideline'); return known; }
  for (const [code, entry] of Object.entries(guidelines)) {
    const where = 'guidelines.' + code;
    if (!/^\d+(\.\d+)?$/.test(code)) problem(where, 'the guideline number must look like 3.14');
    if (!isMap(entry)) { problem(where, 'must be a map with title and pdf'); known.set(code, BROKEN); continue; }
    for (const key of Object.keys(entry)) if (!['title', 'pdf', 'web'].includes(key)) problem(where, '"' + key + '" is not a guideline field (title, pdf, web)');
    if (!isText(entry.title)) problem(where + '.title', 'needs the guideline title');
    const packaged = isText(entry.pdf) && guidelineText && entry.pdf in guidelineText;
    if (entry.pdf !== null && !packaged) problem(where + '.pdf', 'must be a packaged PDF listed in the guideline text extract, or null (found ' + show(entry.pdf) + ')');
    if ('web' in entry && !(isText(entry.web) && entry.web.startsWith('https://'))) problem(where + '.web', 'must start with https://');
    known.set(code, packaged ? entry.pdf : entry.pdf === null ? null : BROKEN); // BROKEN: already reported once here
  }
  return known;
}

/* settings: { rhythms: { shock: [...], noshock: [...], rosc: [...] } }. Returns the rhythm names a rhythm check
   can record (shock and no-shock lists; ROSC rhythms never count for a card, A8). */
function checkSettings(settings, problem) {
  const rhythms = new Set();
  if (!isMap(settings)) { problem('settings', 'must be a map'); return rhythms; }
  for (const key of Object.keys(settings)) if (key !== 'rhythms') problem('settings.' + key, 'is not a known setting');
  const lists = settings.rhythms;
  if (!isMap(lists)) { problem('settings.rhythms', 'needs the lists shock, noshock and rosc'); return rhythms; }
  for (const key of Object.keys(lists)) if (!['shock', 'noshock', 'rosc'].includes(key)) problem('settings.rhythms.' + key, 'is not a rhythm list (shock, noshock, rosc)');
  for (const key of ['shock', 'noshock', 'rosc']) {
    const list = lists[key];
    if (!Array.isArray(list) || !list.length || !list.every(isText)) { problem('settings.rhythms.' + key, 'must be a list of rhythm names'); continue; }
    if (new Set(list).size !== list.length) problem('settings.rhythms.' + key, 'has a rhythm twice');
    if (key === 'rosc') continue;
    for (const name of list) {
      if (rhythms.has(name)) problem('settings.rhythms.' + key, '"' + name + '" is in both the shock and no-shock lists');
      rhythms.add(name);
    }
  }
  return rhythms;
}

/* tables: { name: { source, key, rows: [ {key column, other columns...}, ... ] } }. The values themselves are
   checked against the guideline by the table test; here only the shape. Returns name -> set of column names. */
function checkTables(tables, guidelines, guidelineText, problem) {
  const known = new Map();
  if (!isMap(tables)) { problem('tables', 'must be a map of tables (it may be empty: {})'); return known; }
  for (const [name, table] of Object.entries(tables)) {
    const where = 'tables.' + name;
    if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) problem(where, 'a table name is letters and digits, starting with a small letter');
    if (!isMap(table)) { problem(where, 'must be a map with source, key and rows'); continue; }
    for (const field of Object.keys(table)) if (!['source', 'key', 'rows'].includes(field)) problem(where, '"' + field + '" is not a table field (source, key, rows)');
    checkSourceOnly(table.source, where + '.source', { guidelines, guidelineText, problem }, { needsGuideline: true });
    if (!Array.isArray(table.rows) || !table.rows.length || !table.rows.every(isMap)) { problem(where + '.rows', 'must be a list of rows'); continue; }
    const columns = Object.keys(table.rows[0]);
    table.rows.forEach((row, i) => {
      if (Object.keys(row).join() !== columns.join()) problem(where + '.rows[' + i + ']', 'must have the same columns, in the same order, as the first row');
      for (const [column, cell] of Object.entries(row)) {
        const ok = cell === null || typeof cell === 'number' || typeof cell === 'string' || (Array.isArray(cell) && cell.every((x) => typeof x === 'number'));
        if (!ok) problem(where + '.rows[' + i + '].' + column, 'a cell is a number, text, a list of numbers, or null for a "-" cell');
      }
    });
    if (!columns.includes(table.key)) { problem(where + '.key', 'must name the column the rows are looked up by'); continue; }
    const keys = table.rows.map((row) => row[table.key]);
    if (!keys.every((value) => typeof value === 'number') || keys.some((value, i) => i && value <= keys[i - 1])) problem(where + '.key', 'the "' + table.key + '" column must be numbers in increasing order');
    known.set(name, new Set(columns.filter((column) => column !== table.key)));
  }
  return known;
}

function checkCards(cards, context) {
  const { problem } = context;
  if (!Array.isArray(cards) || !cards.length) { problem('cards', 'must be a list of at least one card'); return; }
  const ids = new Set();
  const groups = new Map(); // group name -> places used
  cards.forEach((card, i) => {
    const where = 'cards[' + i + ']' + (isMap(card) && isText(card.id) ? ' (' + card.id + ')' : '');
    if (!isMap(card)) { problem(where, 'a card must be a map of fields'); return; }
    for (const field of REQUIRED_FIELDS) if (!(field in card)) problem(where, 'is missing the field "' + field + '"');
    for (const field of Object.keys(card)) if (!CARD_FIELDS.includes(field)) problem(where + '.' + field, 'is not a card field');

    if ('id' in card) {
      if (!(typeof card.id === 'string' && ID.test(card.id))) problem(where + '.id', 'must be small letters, digits and single hyphens, for example "amiodarone-1"');
      else if (ids.has(card.id)) problem(where + '.id', 'another card already has this id');
      else ids.add(card.id);
    }
    if ('title' in card && !isText(card.title)) problem(where + '.title', 'needs the card title');
    if ('place' in card && !PLACES.includes(card.place)) problem(where + '.place', 'must be one of ' + PLACES.join(', ') + ' (found ' + show(card.place) + ')');
    if ('group' in card) {
      if (!(typeof card.group === 'string' && ID.test(card.group))) problem(where + '.group', 'must be small letters, digits and single hyphens');
      else groups.set(card.group, [...(groups.get(card.group) || []), card.place]);
    }
    if ('note' in card && !isText(card.note)) problem(where + '.note', 'a note is plain-English text (or leave the field out)');

    const hasRecord = 'record' in card;
    const maxDoses = isMap(card.repeat) && Number.isInteger(card.repeat.max) ? card.repeat.max : null;
    if ('show_when' in card) checkShowWhen(card.show_when, where + '.show_when', context, { hasRecord, maxDoses });
    if ('lines' in card) checkLines(card.lines, where + '.lines', context, { allowEmpty: false });
    if ('dose' in card) checkDose(card.dose, where + '.dose', context);
    if (hasRecord) checkRecord(card.record, where + '.record', 'dose' in card, problem);
    if ('timer' in card) {
      const timer = card.timer;
      if (!hasRecord) problem(where + '.timer', 'a timer counts from a recorded dose, so the card needs "record"');
      if (!isMap(timer) || Object.keys(timer).sort().join() !== 'every_min,from') problem(where + '.timer', 'must be { every_min: <minutes>, from: last_dose }');
      else {
        if (!isWhole(timer.every_min, LIMITS.timerMin)) problem(where + '.timer.every_min', 'must be a whole number of minutes from 1 to 60 (found ' + show(timer.every_min) + ')');
        if (timer.from !== 'last_dose') problem(where + '.timer.from', 'must be last_dose (found ' + show(timer.from) + ')');
      }
    }
    if ('repeat' in card) {
      const repeat = card.repeat;
      if (!hasRecord) problem(where + '.repeat', 'a dose limit needs "record"');
      if (!isMap(repeat) || !('max' in repeat) || Object.keys(repeat).some((key) => !['max', 'confirm'].includes(key))) problem(where + '.repeat', 'must be { max: <doses> } with optional confirm lines');
      else {
        if (!isWhole(repeat.max, LIMITS.repeatMax)) problem(where + '.repeat.max', 'must be a whole number of doses from 1 to 20 (found ' + show(repeat.max) + ')');
        if ('confirm' in repeat) {
          if (repeat.max === 1) problem(where + '.repeat.confirm', 'confirm lines are asked before a repeat dose, but max is 1 so there is no repeat');
          checkLines(repeat.confirm, where + '.repeat.confirm', context, { allowEmpty: false });
        }
      }
    }
    if ('details' in card) checkLines(card.details, where + '.details', context, { allowEmpty: true, allowOnly: true });
    if ('pop_up_on_show' in card) {
      if (typeof card.pop_up_on_show !== 'boolean') problem(where + '.pop_up_on_show', 'must be true or false');
      else if (card.pop_up_on_show && !(Array.isArray(card.details) && card.details.length)) problem(where + '.pop_up_on_show', 'opens the details pop-up, so the card needs at least one details line');
    }
    if ('lock_s' in card && !isWhole(card.lock_s, LIMITS.lockS)) problem(where + '.lock_s', 'must be a whole number of seconds from 0 to 600 (found ' + show(card.lock_s) + ')');
    if ('lock_s' in card && !hasRecord) problem(where + '.lock_s', 'a lock follows a recorded dose, so the card needs "record"');
  });
  for (const [group, places] of groups) {
    if (places.length < 2) problem('cards', 'group "' + group + '" has only one card; a group picks the first matching card of two or more');
    if (new Set(places).size > 1) problem('cards', 'the cards of group "' + group + '" must all have the same place');
  }
}

/* show_when: a list of conditions, all of which must be true. Exactly one of arrest_running and on_request; an
   on_request card has no other condition (it is opened by hand). */
function checkShowWhen(list, where, { rhythms, problem }, { hasRecord, maxDoses }) {
  if (!Array.isArray(list) || !list.length) { problem(where, 'must be a list of at least one condition'); return; }
  const seen = new Map();
  list.forEach((condition, i) => {
    const at = where + '[' + i + ']';
    let name, value;
    if (typeof condition === 'string') {
      name = condition;
      if (!WORD_CONDITIONS.includes(name)) { problem(at, show(name) + ' is not a condition; the conditions are ' + [...WORD_CONDITIONS, ...VALUE_CONDITIONS].join(', ')); return; }
    } else if (isMap(condition) && Object.keys(condition).length === 1) {
      [[name, value]] = Object.entries(condition);
      if (!VALUE_CONDITIONS.includes(name)) { problem(at, show(name) + ' is not a condition that takes a value; those are ' + VALUE_CONDITIONS.join(', ')); return; }
    } else { problem(at, 'a condition is a word (arrest_running) or one name with its value ({shocks_at_least: 3}); no "or", no formulas'); return; }
    if (seen.has(name)) { problem(at, name + ' is used twice; put both values in one condition or use another card'); return; }
    seen.set(name, value);
    const knownRhythm = (rhythm) => typeof rhythm === 'string' && rhythms.has(rhythm);
    if (name === 'latest_rhythm') {
      if (!Array.isArray(value) || !value.length || !value.every(knownRhythm)) problem(at, 'latest_rhythm needs a list of rhythms from settings.rhythms shock or noshock (found ' + show(value) + ')');
      else if (new Set(value).size !== value.length) problem(at, 'latest_rhythm lists a rhythm twice');
    }
    if ((name === 'ever_recorded' || name === 'never_recorded') && !knownRhythm(value)) problem(at, name + ' needs one rhythm from settings.rhythms shock or noshock (found ' + show(value) + ')');
    if (name === 'shocks_at_least' && !isWhole(value, LIMITS.shocks)) problem(at, 'shocks_at_least must be a whole number from 1 to 100 (found ' + show(value) + ')');
    if (name === 'doses_at_least') {
      if (!isWhole(value, LIMITS.doses)) problem(at, 'doses_at_least must be a whole number from 1 to 20 (found ' + show(value) + ')');
      if (!hasRecord) problem(at, 'doses_at_least counts this card\'s drug, so the card needs "record"');
      else if (maxDoses !== null && Number.isInteger(value) && value >= maxDoses) problem(at, 'the card would show only after its dose limit (repeat.max ' + maxDoses + ') is reached, so it could never be used');
    }
  });
  const timing = ['arrest_running', 'on_request'].filter((name) => seen.has(name));
  if (timing.length !== 1) problem(where, 'needs exactly one of arrest_running (shown during the arrest) or on_request (opened from the Guidance tab)');
  if (seen.has('on_request') && seen.size > 1) problem(where, 'an on_request card is opened by hand, so it takes no other condition');
  // Conditions that can never all be true together.
  const latest = Array.isArray(seen.get('latest_rhythm')) ? seen.get('latest_rhythm') : [];
  const never = seen.get('never_recorded');
  if (never !== undefined && (seen.get('ever_recorded') === never)) problem(where, '"' + never + '" cannot be both ever_recorded and never_recorded');
  if (never !== undefined && latest.length && latest.every((rhythm) => rhythm === never)) problem(where, 'the latest rhythm cannot be "' + never + '" if it was never recorded');
}

/* A list of lines. Each line is {text, source} (guideline words, compared with the PDF) or {app_text} with an
   optional source (the app's own words, drawn so they never look like guidance).
   Two optional marks (added in step C2 for approved rows that need them):
     - only: adult | child  (details lines only): the line is shown for that patient only (A34: the child magnesium
       pop-up adds a pointer line that an adult never sees);
     - tick: false  (checklist items only): the line is shown but is not ticked, for a printed section heading or an
       opening sentence (A31: EAS 9.4 section headings shown once; the EAS 9.2 opening sentence). */
function checkLines(lines, where, context, { allowEmpty, allowOnly = false, allowTick = false }) {
  if (!Array.isArray(lines) || (!allowEmpty && !lines.length)) { problem(context, where, 'must be a list of ' + (allowEmpty ? '' : 'at least one ') + 'line'); return; }
  lines.forEach((line, i) => checkLine(line, where + '[' + i + ']', context, { allowOnly, allowTick }));
}
const problem = (context, where, message) => context.problem(where, message);

function checkLine(line, where, context, { isDose = false, allowCell = false, allowOnly = false, allowTick = false }) {
  if (!isMap(line)) { problem(context, where, 'a line is {text, source} or {app_text}'); return; }
  if ('only' in line) {
    if (!allowOnly) problem(context, where + '.only', '"only" (adult or child) is allowed in details lines only');
    else if (!['adult', 'child'].includes(line.only)) problem(context, where + '.only', 'must be adult or child (found ' + show(line.only) + ')');
  }
  if ('tick' in line) {
    if (!allowTick) problem(context, where + '.tick', '"tick: false" is allowed in checklist items only');
    else if (line.tick !== false) problem(context, where + '.tick', 'must be false (a line that is shown but not ticked); leave it out for an item that is ticked (found ' + show(line.tick) + ')');
  }
  const keys = Object.keys(line).filter((key) => key !== 'only' && key !== 'tick').sort().join();
  if (allowCell && 'table' in line) { checkCell(line, where, context); return; }
  if (keys === 'source,text') {
    checkPlainWords(line.text, where + '.text', context);
    const source = checkSourceOnly(line.source, where + '.source', context, { needsGuideline: true });
    if (source && isText(line.text)) checkWordForWord(line.text, source, where, context);
  } else if (keys === 'app_text' || keys === 'app_text,source') {
    checkPlainWords(line.app_text, where + '.app_text', context);
    const source = 'source' in line ? checkSourceOnly(line.source, where + '.source', context, {}) : null;
    if (isDose && !(source && source.rulings.length)) problem(context, where, 'a dose in the app\'s own words needs a source that cites an owner ruling ("Owner ruling ... · EAS ...")');
  } else {
    problem(context, where, 'a line is {text, source} or {app_text} (with an optional source)' + (allowCell ? ', or a table cell {table, column, source}' : '') + '; found the fields ' + (keys || 'none'));
  }
}

// Text on screen is plain words: no leftover {gap} and no bold or italic marks.
function checkPlainWords(text, where, context) {
  if (!isText(text)) { problem(context, where, 'must be text that is not empty'); return; }
  if (/[{}]/.test(text)) problem(context, where, 'has { or }: card text is written out in full, with no {gaps}');
  if (/[*_]/.test(text)) problem(context, where, 'has * or _ (bold or italic marks); card text is plain');
}

/* Checks a source. Every EAS part must name a known guideline and pages that exist in its PDF. needsGuideline:
   at least one EAS part is required (guideline text and table cells). Returns the read source, or null. */
function checkSourceOnly(source, where, { guidelines, guidelineText, problem: report }, { needsGuideline = false }) {
  const read = readSource(source);
  if (read.problem) { report(where, read.problem); return null; }
  if (needsGuideline && !read.eas.length) { report(where, 'must name the guideline and page, for example "EAS 3.14 p1"'); return null; }
  for (const { code, pages } of read.eas) {
    if (!guidelines.has(code)) { report(where, 'EAS ' + code + ' is not in the guidelines part'); return null; }
    const pdf = guidelines.get(code);
    if (pdf === null || pdf === BROKEN) continue; // online only (refused for guideline text by checkWordForWord), or already reported
    const count = (guidelineText[pdf] || []).length;
    const missing = pages.filter((page) => page > count);
    if (missing.length) { report(where, 'EAS ' + code + ' (' + pdf + ') has ' + count + ' pages; there is no page ' + missing.join(', ')); return null; }
  }
  return read;
}

/* The text must be found word for word on one of the cited pages, or across the break between two cited pages
   that follow each other. */
function checkWordForWord(text, source, where, { guidelines, guidelineText, problem: report }) {
  const wanted = sameWords(text);
  const places = [];
  for (const { code, pages } of source.eas) {
    const pdf = guidelines.get(code);
    if (pdf === BROKEN) return; // the guideline's pdf field is wrong: already reported
    if (pdf === null) { report(where, 'EAS ' + code + ' has no packaged PDF, so this sentence cannot be checked word for word'); return; }
    const pageList = guidelineText[pdf];
    for (const page of pages) {
      places.push(comparableText([pageBody(pageList[page - 1])]));
      if (pages.includes(page + 1)) places.push(comparableText([pageBody(pageList[page - 1]), pageBody(pageList[page])]));
    }
  }
  if (!places.some((place) => foundWhole(wanted, place))) report(where, 'not found word for word on ' + source.eas.map(({ code, pages }) => 'EAS ' + code + ' p' + pages.join(', p')).join(' or ') + ': "' + text + '"');
}

/* dose: { adult: <line, table cell, or a list of them>, child: <the same> }. An empty ("-") table cell is shown by
   the app as "Seek clinical advice" (decision 7 rule 3); that is the engine's job, not the file's. The adult part may
   use a table cell too since step C2 (the RSI doses for an adult come from the EAS 9.3 adult table, A12). */
function checkDose(dose, where, context) {
  if (!isMap(dose) || Object.keys(dose).sort().join() !== 'adult,child') { problem(context, where, 'must be { adult: ..., child: ... }'); return; }
  for (const who of ['adult', 'child']) {
    const lines = Array.isArray(dose[who]) ? dose[who] : [dose[who]];
    if (!lines.length) problem(context, where + '.' + who, 'needs at least one line or table cell');
    lines.forEach((line, i) => checkLine(line, where + '.' + who + (Array.isArray(dose[who]) ? '[' + i + ']' : ''), context, { isDose: true, allowCell: true }));
  }
}

// A table cell: { table, column, source }. The table and column must exist (the values are checked by the table test).
function checkCell(cell, where, context) {
  if (Object.keys(cell).sort().join() !== 'column,source,table') { problem(context, where, 'a table cell is exactly { table, column, source }'); return; }
  checkSourceOnly(cell.source, where + '.source', context, { needsGuideline: true });
  const columns = context.tables.get(cell.table);
  if (!columns) problem(context, where + '.table', 'there is no table "' + cell.table + '" in the tables part');
  else if (!columns.has(cell.column)) problem(context, where + '.column', 'table "' + cell.table + '" has no column "' + cell.column + '"');
}

// record: { drug, amount: dose | typed, unit }. "dose" records the dose shown, so the card needs a dose.
function checkRecord(record, where, hasDose, report) {
  if (!isMap(record) || Object.keys(record).sort().join() !== 'amount,drug,unit') { report(where, 'must be { drug, amount, unit }'); return; }
  if (!(typeof record.drug === 'string' && ID.test(record.drug))) report(where + '.drug', 'must be small letters, digits and single hyphens');
  if (!['dose', 'typed'].includes(record.amount)) report(where + '.amount', 'must be dose (the dose shown) or typed (typed in, never pre-filled) (found ' + show(record.amount) + ')');
  if (record.amount === 'dose' && !hasDose) report(where + '.amount', 'records the dose shown, but the card has no dose');
  if (!isText(record.unit)) report(where + '.unit', 'needs the unit, for example mg');
}

// checklists: [{ id, title, items: [lines] }]. Titles are headings; items are lines like card lines.
function checkChecklists(checklists, context) {
  if (!Array.isArray(checklists)) { problem(context, 'checklists', 'must be a list (it may be empty: [])'); return; }
  const ids = new Set();
  checklists.forEach((list, i) => {
    const where = 'checklists[' + i + ']';
    if (!isMap(list) || Object.keys(list).sort().join() !== 'id,items,title') { problem(context, where, 'a checklist is exactly { id, title, items }'); return; }
    if (!(typeof list.id === 'string' && ID.test(list.id))) problem(context, where + '.id', 'must be small letters, digits and single hyphens');
    else if (ids.has(list.id)) problem(context, where + '.id', 'another checklist already has this id');
    else ids.add(list.id);
    if (!isText(list.title)) problem(context, where + '.title', 'needs the checklist title');
    checkLines(list.items, where + '.items', context, { allowEmpty: false, allowTick: true });
  });
}
