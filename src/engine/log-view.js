/* LOG VIEW: which events the log screen and text export show. Both use the same filters.

   Rewritten for readability on 11 Nov 2026 (owner-approved); results are identical to the original
   (see tests/side-by-side.test.mjs). */
import { RULES } from '../rules/nz-eas.js';
import * as R from './core.js';

/* Event types shown under the "Interventions only" filter. */
const INTERVENTIONS = new Set([
  'start', 'rearrest', 'shock', 'noshock', 'rosc', 'end',
  'adrenaline', 'amiodarone', 'magnesium', 'fluids', 'medicine', 'equipment', 'note',
]);

/* Summary rows for the "times" checklist display: when each checklist was started, reopened
   and finished. Checklist events have a key like "<list id>:<item number>". */
export function checklistTimes(events, lists) {
  const rows = [];
  for (const list of lists) {
    const checkedItems = new Map();
    let started = false;
    let complete = false;
    const listEvents = events.filter((event) => event.type === 'checklist' && event.key?.startsWith(list.id + ':'));
    for (const event of listEvents) {
      const index = Number(event.key.split(':')[1]);
      if (!Number.isInteger(index) || index < 0 || index >= list.items.length) continue; // not a real item
      const addRow = (kind, details) => rows.push({
        id: event.id + ':' + kind,
        type: 'checklist-summary',
        title: list.label + ' · ' + kind,
        details,
        at: event.at,
        synthetic: true,
        checklistId: list.id,
      });
      if (!started && event.checked) {
        addRow('started', 'First item checked');
        started = true;
      }
      if (complete && !event.checked) {
        addRow('started', 'Reopened for review');
        complete = false;
      }
      checkedItems.set(index, !!event.checked);
      if (started && !complete && list.items.every((_, i) => checkedItems.get(i))) {
        addRow('finished', 'All ' + list.items.length + ' items checked');
        complete = true;
      }
    }
  }
  return rows;
}

/* Log rows in time order.
   scope 'interventions' = treatment events only (plus causes marked treated);
   checklists 'times' = replace individual checklist ticks with start/finish summary rows;
   includeVoided = also show voided events. */
export function logEntries(session, lists, { scope = 'all', checklists = 'items', includeVoided = true } = {}) {
  const activeEvents = R.active(session).slice().sort((a, b) => a.at - b.at);
  const events = includeVoided ? session.events : activeEvents;
  if (scope === 'interventions') {
    return events
      .filter((event) => INTERVENTIONS.has(event.type) || (event.type === 'cause' && event.status === 'treated'))
      .slice()
      .sort((a, b) => a.at - b.at);
  }
  const rows = checklists === 'times'
    ? [...events.filter((event) => event.type !== 'checklist'), ...checklistTimes(activeEvents, lists)]
    : events.slice();
  return rows.sort((a, b) => a.at - b.at);
}

/* Default energy for the shock form: adult energy when no weight is entered. */
export function shockEnergy(session) {
  return String(session.weight).trim() === '' ? RULES.numbers.adult.shockJ : R.joules(session.weight);
}
