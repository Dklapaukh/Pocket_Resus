// Test-only entry: the real app, plus handles on pop-ups no button reaches in these scenarios (the
// Guidance & sources pop-up is not opened by any button in v21; the amiodarone form cannot be opened
// after torsades). Nothing here changes what the app does.
import '../../src/app/main.js';
import { guidance } from '../../src/app/views.js';
import { openDrug } from '../../src/app/sheets.js';
window.__step3a = { guidance, openDrug };
