/* Shared engine and DOM shortcuts, plus keys for the current session and its
   unreadable-data backup. Shared session state lives in st (see state.js). */
import { Resus } from '../engine/index.js';

/* Wording from the rules file shown as paragraphs: <p>…</p> for each entry. */
export const paras = (key, values) => [].concat(Resus.guideText(key, values)).map((text) => `<p>${text}</p>`).join('');

/* One piece of wording from the rules file (part 2) as plain text, with its {gaps} filled,
   e.g. T('liveCards.recordDoseMgIv', { dose: 1 }). Wording that is a list comes back as a list. */
export const T = (key, values) => Resus.guideText(key, values);

export const R = Resus,
  $ = (id) => document.getElementById(id),
  KEY = 'resus-pocket-v1',
  BACKUP_KEY = 'resus-pocket-v1-unreadable-backup', // A6: raw copy of a saved session the app could not read
  REPAIRED_BACKUP_KEY = 'resus-pocket-v1-repaired-backup'; // raw copy of a saved session that was repaired on loading
