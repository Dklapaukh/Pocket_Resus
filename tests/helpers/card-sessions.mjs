// Builds sessions for the card engine tests (step C3) with the APP'S OWN recording routines (src/engine/core.js and
// rhythm-care.js, unchanged), so every session is exactly what the app saves today: shocks, no-shock checks, rhythm
// not recorded, "+ Previous shock", earlier counts, doses, ROSC, re-arrest, end, voided events, weight.
// Then it asks the new engine (src/cards/engine.js) which cards show, using the real card file.
import { readFileSync } from 'node:fs';
import * as core from '../../src/engine/core.js';
import * as care from '../../src/engine/rhythm-care.js';
import { readCardFile } from '../../src/cards/check.js';
import { cardsNow } from '../../src/cards/engine.js';

const ROOT = new URL('../..', import.meta.url);
export const CARD_TEXT = readFileSync(new URL('src/cards/nz-eas-cards.yaml', ROOT), 'utf8');
export const CARDS = readCardFile(CARD_TEXT);
export const GUIDELINE_TEXT = JSON.parse(readFileSync(new URL('src/cards/guideline-text.json', ROOT), 'utf8'));
export const MIN = 60000;
export const T0 = 1700000000000;
// The app's largest accepted weight (an input limit, read from the live rules file).
export const MAX_WEIGHT_KG = core.RULES.numbers.weight.maxKg;

/* A new patient, CPR started (unless start: false), weight as typed ('' = no weight). Each step moves the case
   clock on as the app would (a rhythm check two minutes after the last) and fails loudly if the app's engine
   refuses it. */
export function arrest({ weight = '', start = true, file = CARDS } = {}) {
  const s = core.fresh(T0);
  s.weight = weight;
  let now = T0;
  if (start) core.begin(s, now);
  const must = (ok, what) => { if (!ok) throw new Error('the app engine refused: ' + what); };
  const c = {
    s,
    get now() { return now; },
    advance(ms) { now += ms; return c; },
    shock(rhythm = 'VF') { now += 2 * MIN; must(core.check(s, 'shock', rhythm, '', now), 'shock ' + rhythm); return c; },
    noShock(rhythm) { now += 2 * MIN; must(core.check(s, 'noshock', rhythm, '', now), 'no shock ' + rhythm); return c; },
    // Step one of a rhythm check only: shock or no shock recorded, the rhythm not (yet) chosen.
    notRecorded(outcome = 'shock') { now += 2 * MIN; must(care.startOutcome(s, outcome, now), 'rhythm not recorded'); return c; },
    previousShock() { care.addPreAppShock(s, now); return c; },
    earlier({ shocks = 0, amiodarone = 0 } = {}) { s.priorShocks = shocks; s.priorAmio = amiodarone; return c; },
    rosc(rhythm = 'Sinus rhythm') { now += 2 * MIN; must(core.check(s, 'rosc', rhythm, '', now), 'ROSC ' + rhythm); return c; },
    rearrest() { core.begin(s, now); core.add(s, 'rearrest', 'Re-arrest', '', now); return c; },
    end() { s.phase = 'Ended'; s.deadline = null; s.end = now; core.add(s, 'end', 'Session ended', '', now); return c; },
    dose(drug, amount = 1, unit = 'mg') { core.add(s, drug, drug, '', now, { dose: amount, unit }); return c; },
    // Voids (crosses out) the latest event of a type, as the log's correction sheet does.
    voidLast(type) { const event = s.events.filter((e) => e.type === type && !e.voided).at(-1); event.voided = true; event.correctedAt = now; return c; },
    special(on = true) { s.special = on; return c; },
    cards(options = {}) { return cardsNow(file, s, now, { maxWeightKg: MAX_WEIGHT_KG, ...options }); },
    ids(options = {}) { return c.cards(options).map((card) => card.id); },
    card(id, options = {}) { return c.cards(options).find((card) => card.id === id); },
    // The ids of the cards in one place (for example 'lower').
    at(place, options = {}) { return c.cards(options).filter((card) => card.place === place).map((card) => card.id); },
  };
  return c;
}

// The text of a list of shown lines (dose lines that are table cells show as "cell:<column>=<value>").
export const texts = (lines) => lines.map((line) => (line.kind === 'cell' ? 'cell:' + line.column + '=' + JSON.stringify(line.value) : line.kind === 'guideline' || line.kind === 'app' ? line.text : line.kind));

// Every piece of text in the card file that the app can show: all text except the owner notes ("note", never shown)
// and the file's "about" description. One string, pieces joined by new lines.
export const SHOWN_TEXT = (function collect(node, key) {
  if (key === 'note' || key === 'about') return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map((item) => collect(item)).join('\n');
  if (node && typeof node === 'object') return Object.entries(node).map(([name, value]) => collect(value, name)).join('\n');
  return '';
})(CARDS);

/* One part of a card AS WRITTEN IN THE CARD FILE (not what the engine returns): the text of each line, with " [trace]"
   after a line marked trace_only (kept in the file for audit and never drawn: owner decision 22, A37), " [app]" after
   app text, and "cell:<column>" for a table cell. part is 'lines', 'details', 'dose.adult', 'dose.child' or
   'repeat.confirm'. */
export function fileLines(id, part = 'lines') {
  const card = CARDS.cards.find((c) => c.id === id);
  if (!card) throw new Error('no card "' + id + '" in the card file');
  const value = part.split('.').reduce((node, name) => node?.[name], card);
  return [].concat(value ?? []).map((line) => ('table' in line ? 'cell:' + line.column : 'app_text' in line ? line.app_text + ' [app]' : line.text + (line.trace_only ? ' [trace]' : '')));
}

// Adds " [trace]" to each text, for comparing with fileLines.
export const traced = (list) => list.map((text) => text + ' [trace]');
