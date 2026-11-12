# Pocket Resus: developer starting point

Pocket Resus is a static, phone-oriented cardiac arrest support app. The live
page is `index.html`; it loads `src/app/main.js`. No build is needed to serve
the app. Serve the repository over localhost (rather than opening the HTML as
a file) to exercise modules and offline features. Do not use real patient data
while developing or testing.

The root JavaScript files such as `core.js` and `app.js` are historical
baselines used by tests. They are not the modules loaded by the live page.
For a focused software review, start with the
[software review guide](docs/16-SOFTWARE-REVIEW-GUIDE.md).
Start with [the code map](docs/10-DEVELOPER-CODE-MAP.md) before changing code.
The current decisions and handover are in
[doc 07](docs/07-HANDOFF-AND-CHANGE-BACKLOG.md). The source comparison,
independent review questions and readability assessment are in
[docs 11](docs/11-CLINICAL-RULE-INVENTORY.md),
[13](docs/13-INDEPENDENT-REVIEW-BRIEF.md), and
[14](docs/14-READABILITY-ASSESSMENT.md).

## Tests

Install the dependencies from `package-lock.json` with `npm ci`, then run
`node --test --test-concurrency=2 --test-reporter=dot 'tests/*.test.mjs'`.
These packages are for development and testing; the app does not
need a build step. Use a checkout that preserves LF line endings: several
baseline tests intentionally compare source text and file hashes. On Windows,
for a fresh clone use `git -c core.autocrlf=false clone <repository URL>`.

The automated suite includes behaviour and regression checks, but does not
replace clinical review or real-device checks of layout, offline operation,
installation, clipboard, wake lock and background timing. Do not update a
golden file or weaken a test merely to make a change pass.

`tests/reference/` holds the wider safety net (recorded screens and saved
sessions for thousands of generated cases; read `tests/reference/README.md`).
`npm test` replays the first part; `npm run test:deep` replays all of it
(about 8 minutes). Never edit a recording or re-record to make a test pass.

For an additional local desktop-browser check, run
`node tools/check-offline-browser.cjs` with Playwright available to Node and
Chrome installed. It starts a temporary localhost server, uses test data and
an accelerated clock, then checks offline reload and session recovery. This
is not a substitute for testing an installed app on a phone.
