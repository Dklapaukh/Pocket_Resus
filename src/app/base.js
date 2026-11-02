/* Shortcuts every other module uses: the arrest engine (R), $ (find element by id) and the saved-data key.
   Converted mechanically from the original app files in Stage 2b: logic unchanged;
   shared variables are now st.<name>. */
import {Resus} from '../engine/index.js';

export const R=Resus, $=id=>document.getElementById(id), KEY='resus-pocket-v1';
