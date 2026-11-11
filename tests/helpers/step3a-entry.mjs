// Test-only entry: the real app, plus a handle on the Guidance & sources pop-up so the safety net can
// record it (no button opens it in v21). Nothing here changes what the app does.
import '../../src/app/main.js';
import { guidance } from '../../src/app/views.js';
window.__step3a = { guidance };
