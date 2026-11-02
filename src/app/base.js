/* Shortcuts every other module uses: the arrest engine (R), $ (find element by id) and the saved-data key.
   Logic is the same as the original app files; shared memory lives in st (see state.js). */
import { Resus } from '../engine/index.js';

export const R = Resus,
  $ = (id) => document.getElementById(id),
  KEY = 'resus-pocket-v1';
