// Stage 0 safety net (doc 19): thousands of generated cases were played on the reference app (v22 + A8)
// through the fake browser, tapping and typing like a person, and every screen and the saved session
// were recorded after every step (tests/reference/). This test replays the FAST set of those cases on
// the current app and requires an exact match. `npm run test:deep` replays every recorded case.
// On a difference it names the case, step and surface; `node tests/reference/show.mjs <case> --step <n>`
// prints the readable before/after. Never re-record to make this pass (tests/reference/README.md).
import { referenceSuite } from './reference/lib/suite.mjs';

referenceSuite({ deep: false });
