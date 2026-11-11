/* Combined engine: same names the old global `Resus` object had once core.js,
   rhythm-care.js and log-view.js were all loaded, plus the drug-card rules (drug-cards.js). */
import * as core from './core.js';
import * as rhythm from './rhythm-care.js';
import * as logView from './log-view.js';
import * as drugCards from './drug-cards.js';
export const Resus = { ...core, ...rhythm, ...logView, ...drugCards };
