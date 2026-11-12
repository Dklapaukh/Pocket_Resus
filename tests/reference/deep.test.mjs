// Stage 0 safety net, DEEP set: replays EVERY recorded case (not only the fast set that `npm test`
// runs). Run with `npm run test:deep` (about 10 minutes on a 2-core machine).
import { referenceSuite } from './lib/suite.mjs';

referenceSuite({ deep: true });
