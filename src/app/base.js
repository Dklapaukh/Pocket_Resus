/* Shared engine and DOM shortcuts, plus keys for the current session and its
   unreadable-data backup. Shared session state lives in st (see state.js). */
import { Resus } from '../engine/index.js';

export const R = Resus,
  $ = (id) => document.getElementById(id),
  KEY = 'resus-pocket-v1',
  BACKUP_KEY = 'resus-pocket-v1-unreadable-backup', // A6: raw copy of a saved session the app could not read
  REPAIRED_BACKUP_KEY = 'resus-pocket-v1-repaired-backup'; // raw copy of a saved session that was repaired on loading
