/* RULES FILE READER: turns the text of nz-eas.json into the rule set the app uses.

   It keeps only the five parts (numbers, wording, checklists, equipment, sources) and ignores the
   "about" and "notes" entries, which are explanations for people. If the text is not valid JSON, or one
   of the five parts is missing, it stops with a plain-English message: the app must never start with a
   partial rule set. The full pre-publish checks are in check.js and run in the tests, not on the phone.
   This file holds no clinical numbers or wording. */
export const PARTS = ['numbers', 'wording', 'checklists', 'equipment', 'sources'];

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function parseRules(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error('the rules file cannot be read (it is not valid JSON).');
  }
  if (!isPlainObject(file)) throw new Error('the rules file is empty or has the wrong shape.');
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
