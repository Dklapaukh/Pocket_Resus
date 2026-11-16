# Pocket Resus: developer starting point

Pocket Resus is a static, phone-oriented cardiac arrest support app. The live
page is `index.html`; it loads `src/app/main.js`. No build is needed to serve
the app. Serve the repository over localhost (rather than opening the HTML as
a file) to exercise modules and offline features. Do not use real patient data
while developing or testing.

The original app's checklist list is kept, frozen, as `tests/fixtures/original-checklists.js`:
the generated reference cases pick checklists from it. The live page does not load it.

Where things are:
- [DECISIONS.md](DECISIONS.md): the guiding principle, every owner decision and
  ruling, the current state, the build queue, what waits for the owner and the
  A-table of approved changes. Read its sections 4 to 7 first in any new chat.
- [GUIDELINE-TRACE.md](GUIDELINE-TRACE.md): the trace from every clinical value
  on screen to its guideline and page, with the deviations list.
- This README: tests, the code map, saved-session recovery and how the build is run.
- Clinical numbers and wording live only in `src/rules/nz-eas.yaml`.

Old references in code and commit messages: "doc 06", "doc 07" and "doc 18" are
now DECISIONS.md; "doc 11" is GUIDELINE-TRACE.md; "doc 10", "doc 17" and
"doc 19" are this README.

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
reference recording or weaken a test merely to make a change pass.

`tests/reference/` holds the wider safety net (recorded screens and saved
sessions for thousands of generated cases; read `tests/reference/README.md`).
`npm test` replays the first part; `npm run test:deep` replays all of it
(about 8 minutes). Never edit a recording or re-record to make a test pass.

For an additional local desktop-browser check, run
`node tools/check-offline-browser.cjs` with Playwright available to Node and
Chrome installed. It starts a temporary localhost server, uses test data and
an accelerated clock, then checks offline reload and session recovery. This
is not a substitute for testing an installed app on a phone.

## How we work
- Claude (claude.ai, repo attached) reads, edits, tests, commits and pushes. Build work is on branch
  `rules-editor`; `main` is the live app (owner decision 10).
- Carry on with approved work without routine checkpoints. Stop only for a clinical or design
  decision, an approval, or an owner action such as a phone check.
- To the owner: explain simply, recommend one option, show the full text of every option, one
  decision at a time. When a chat gets long, give a ready-to-paste prompt for a new chat.
- **Timeline (owner decision 12):** goal is store publication by the end of December 2026; it can move.
  The owner is away 18 Nov to 2 Dec 2026 with a phone only (can answer questions and do phone checks).
- **Models (owner decision 13):** no Fable after 15 Nov 2026. Opus's weekly allowance sets the pace.
- **Unattended running:** the scheduled task "Pocket Resus build" starts a fresh Opus chat every
  3 hours (README "How the build is run"). Every chat first runs `sh tools/build-progress.sh check`. The owner can pause
  the task in the Claude app under scheduled tasks.

## Code map
This map describes the current implementation, not clinical authorisation. NZ EAS source
documents and recorded clinical decisions remain authoritative; verify sources and applicability
before changing any clinical rule.

### Follow a user action
1. `index.html` loads `src/app/main.js`. The main module imports `events.js`,
   draws the screen, starts the display tick and registers the service worker.
2. `src/app/events.js` receives taps and form submissions. `sheets.js` builds
   and manages dialogs. `session.js` coordinates many actions and saves.
3. `state.js` holds `st.s`, the saved patient session, separate in-memory
   screen state, and selectors for the active session. `session.js` saves
   `st.s` to browser storage. A visible card or reference is not itself a
   recorded administration.
4. `src/engine/core.js` holds core events, counts, timing and dose/energy
   calculations. `src/engine/rhythm-care.js` adds rhythm and support helpers;
   `log-view.js` derives log entries. `src/engine/index.js` assembles exports.
5. `views.js` renders screens and updates clocks. `format.js` provides display
   formatting; `data.js` holds the tutorial slides. Checklists, equipment, guideline wording and
   links are in the rule set `src/rules/nz-eas.yaml` (DECISIONS.md section 9), read at start-up by
   `src/rules/load.js` and `parse.js`.

**Cards (being built, not used by the app yet; `CARDS-DESIGN.md`).** `src/cards/check.js` is the
card checker: fields, the seven conditions, citations, and every guideline sentence compared word for
word with `src/cards/guideline-text.json` (the packaged PDFs' text, page by page, made by
`node tools/extract-guideline-text.mjs`; re-run it when a PDF changes). Tests:
`tests/cards-checker.test.mjs` (good file `tests/fixtures/cards/good.yaml` and the bad files),
`tests/cards-guideline-text.test.mjs`. `src/cards/` is not in the `sw.js` list until step C5.

The app uses shared state. Read the call sites
before moving a function: a display function can also update screen-only state,
and recording has persistence and redraw side effects.

The main app module dependencies now run in one direction: event and session
actions call views and sheets; views call sheets; views and sheets read state,
formatting and fixed data. Clinical decisions live in the engine (`src/engine/drug-cards.js`); state.js holds screen memory so views
do not need to import session actions just to render. `events.js` connects the
modules to browser events. Shared state and side effects still matter: this
graph is a tracing aid, not a claim that every function is pure.

`sw.js` explicitly lists the modules to cache for offline use. Adding or
renaming a module also requires a deliberate offline-cache and update review;
changing imports alone can leave an installed offline app incomplete. The
current readability work retains the existing module paths and cache list.

### Where to trace important behaviour
| Question | Start here | Notes |
| --- | --- | --- |
| CPR cycle or adrenaline clock | `core.js`: `CYCLE`, `ADR`, `timing`, `begin`; `views.js`: `tick` | Deadlines derive from recorded times. Check background and reload behaviour on real devices. |
| Weight, energy, medication references | `core.js`: `validWeight`, `dose`, `joules`; `views.js`: `weightHeader`, `drugCard` | Suggested values and actually recorded interventions are different. `joules` has the approved A1 change. |
| Amiodarone visibility and second dose | `engine/drug-cards.js`: `amiodaroneDue`, `doseFor`, `childAmiodaroneAdvice`, `childSecondAmiodarone`, `secondAmiodaroneEarly`; `views.js`: `amioCardVisible`, `drugCard` | See A2/A2b/C6b-2 and their tests and decisions. Do not infer a child second dose from the raw engine calculation. |
| Lower medication/support card | `engine/drug-cards.js`: `latestLowerRhythm`, `lowerCard`; `views.js`: `liveView` | `lowerCard` (A2c, A7) is the live rule. The engine's older `careMode` (PEA only) is not used by the app; `tests/a2c-fluids-non-shockable.test.mjs` checks it is unchanged. |
| Double-tap guards | `engine/drug-cards.js`: `lockLeft` (times in `RULES.doubleTapLockMs`); `session.js`: `recordSupport`; `events.js`; `views.js` | UI disabling and recording guards both matter; manual entry follows a separate path. |
| Rhythm and shock recording | `rhythm-care.js`: `startOutcome`, `completeOutcome`; `session.js`: `saveRhythm` | A previous shock can lack an actual time; do not invent one. Corrected and voided events affect derived state. |
| Recovery and storage | `core.js`: `restoreSaved`; `state.js`, `events.js` (other tab), `session.js`: `save`, `main.js` | Incomplete saves are filled in and comma weights converted (raw copy under the repaired-backup key). Only one unreadable raw backup is kept. The warning does not provide an in-app restore tool. |
| Log and export | `src/engine/log-view.js`, `state.js`: `logRows`, `sheets.js`: `exportText`, `events.js`: `downloadCompleteRecord` | Text uses log filters; complete JSON retains events and audit but leaves out undo snapshots. A display filter is not a clinical event. |

The source references above identify where to investigate; they are not an
exhaustive source-to-rule audit or evidence of independent clinical validation.
`GUIDELINE-TRACE.md` traces each clinical value to its guideline page;
DECISIONS.md holds the guiding principle and owner decisions.

### Engine and rule-set files
The engine works out counts, timers and the log, and looks doses, energies and sizes up in the
rule set. It never records a clinical event by itself.

| File | What it holds |
|---|---|
| `src/rules/nz-eas.yaml` | Every clinical number and sentence (plain data; one place to check against the CPG) |
| `src/rules/load.js`, `parse.js`, `write.js`, `check.js` | Loader, strict YAML reader, byte-for-byte writer, checker (the app never loads the checker) |
| `src/engine/core.js` | Session record, weight checks and bands, adrenaline and amiodarone references, shock energy, counts, timers, undo, saved-session repair |
| `src/engine/drug-cards.js` | Which drug card shows and what it says (amiodarone gate, lower card, locks) |
| `src/engine/rhythm-care.js` | Torsades, magnesium and fluid references, two-step rhythm checks, "+ Previous shock", checklist prompt |
| `src/engine/log-view.js` | Log filters shared by the log screen and text export |
| `src/engine/index.js` | Combines these into the `Resus` object the app uses |

How correctness is proven: `tests/reference/` (thousands of recorded cases, read its README), the A-row tests and
`tests/rules-file.test.mjs`, which checks rule-set values against the guideline tables. The
engine's own `careMode` is the original PEA-only rule, not used by the app.

### Session storage and recovery
`st.s` is the in-memory session; `save` writes it as JSON under
`resus-pocket-v1`. A `commit` snapshots the session, performs the change,
attempts to save, redraws and may show a message. A failed storage write shows
the storage warning; `commit` does not roll the in-memory change back.

Start-up and updates from another tab use one check, `restoreSaved` in `src/engine/core.js`:
- A version 1 save with an event list and a start time is loaded. Any missing part is filled with
  the new-session default; recorded events and audit history are never changed.
- A valid comma weight ("15,5") is converted to a decimal point. Undo copies get the same
  treatment; an unusable undo copy is dropped.
- When a repair was made, the raw save is kept under `resus-pocket-v1-repaired-backup`. No message
  is shown. A complete, normal save is loaded untouched.
- A save that fails the check is copied to `resus-pocket-v1-unreadable-backup` (A6: one copy only,
  with a short message, no restore screen) and a new case starts.

Test: `tests/step2-saved-session-repair.test.mjs`. The app has a JSON export but no import.

Before changing recovery: work from real historical save formats (fictional or de-identified
data), keep the original record, make recovery visible rather than silently replacing a session,
and test start-up, cross-tab and undo together, including storage-write failures.

### Example traces
- **Suggested versus recorded medicine:** `drugCard` in `views.js` gets a
  reference from `R.doseFor` (`engine/drug-cards.js`) and decides what to show. A tap
  reaches `recordQuickDrug` in `events.js`, which rechecks the guard before
  `commit` adds an event. Manual entry instead uses `openDrug` and
  `submitDrug`; `medicineEntryName` chooses a form default and
  `manualMedicineType` maps recognised names to event types
  used by the counts and clocks. Opening a reference or form does not
  itself record a dose.
- **Rhythm and the lower card:** `startOutcome` can record the selected
  outcome before rhythm details are completed: `recordOutcome` in `events.js`
  saves it and opens the rhythm dialog. `selectRhythm` and
  `saveRhythm` complete it; `latestLowerRhythm` and `lowerCard` in `engine/drug-cards.js`
  then select what `lowerDrugCard` renders. The engine's older PEA-only
  `careMode` is a different function.
- **Correction and audit:** `editEvent` builds the form, and
  `submitCorrection` validates it, retains the earlier event in audit,
  updates fields and synchronizes rhythm inside `commit`. The separate
  `toggleEventVoid` changes void status. Both use `auditBeforeChange` to
  retain the earlier event without nesting its existing audit history.
- **Elapsed cycle:** `R.timing` derives remaining time from the stored
  timestamps; `tick`, `tickCycle` and `tickMedicines` update the display.
  A timer reaching zero does not call an event-recording function.
- **Startup and offline:** `state.js` loads or replaces the saved session;
  `main.js` starts rendering and registers `sw.js`. The worker's explicit
  asset list enables offline caching after installation. The list and a
  simulated offline install/fetch path are tested; they cannot establish
  device behavior. A storage event from another tab is handled in
  `events.js`, which replaces the active in-memory session and redraws.
  Undo restores a snapshot through `R.undo` and then saves it (see "Session storage and recovery").

### Safe refactoring
- Engine changes must keep the reference recordings (`tests/reference/`), the A-row tests
  and `tests/rules-file.test.mjs` passing.
- Run the full suite before and after a coherent change. Read failing tests;
  do not re-record reference outputs to hide differences.
- Keep event occurrence, displayed suggestions, clinical actions actually
  recorded, corrections and undo distinct. Preserve offline and storage paths.
- A rule set for another service needs its own packaged guideline, citations, checks and
  scenario tests (DECISIONS.md section 9).

## How the build is run

### Roles and models
Fable is no longer available: no step may name it.

| Role | Model · effort | Notes |
|---|---|---|
| Orchestrator (you) | Opus · high | Runs tests, briefs agents, checks proofs, commits, updates docs. Writes no step code |
| Worker, routine step | Sonnet · high | Steps with an exact specification: A-rows, data moves, tools, wrappers |
| Worker, hard step | Opus · high (xhigh where the card says) | New designs: editor screens, rule tables, card builder, checker grammar |
| Reviewer, every step | Opus · high, fresh agent | Has not seen the worker's reasoning. Independence comes from the fresh start and a different method (planted faults, real browser), since worker and reviewer may be the same model |

Why this differs from the Fable plan: the hard stages are cut smaller, each starts with a short
design note that is reviewed before any code, and every chat does **one step**. That keeps each
chat small and means a usage limit or a mistake costs one step at most.

### The loop for one step
1. `sh tools/build-progress.sh check`. BUSY: stop at once. Saved unfinished work: `restore`, run
   the full tests on it before believing its note, and carry on from there.
2. `git fetch origin main`; if `main` has commits the branch lacks (the owner sometimes edits on
   GitHub), merge them first, keeping the branch's version of a doc where they clash and telling
   the owner what was on `main`.
3. Take the first step in the progress table in DECISIONS.md section 5 that is not done and not waiting for the owner.
   Read its card below. If no step is free, stop and say so in one line.
4. Run `npm test`, then `npm run test:deep` (two separate commands; about 7 and 9 minutes; deep run
   in the foreground with a 10-minute limit). Both must pass before anything is changed. Skip this
   when the last commit's message records both passing on that same commit (owner decision 21).
5. `sh tools/build-progress.sh save "starting <step>"`. Start the worker with: the card, the "Rules
   for every agent" below, the exact files to read, and the instruction to save a snapshot at least
   once an hour. One step per worker. Agents start in the background; wait for the report.
6. When it reports, run both test commands yourself (never trust a reported result) and
   `git diff --exit-code -- tests/reference/screens.json tests/reference/saved-sessions.json`
   (must be clean unless the card says recordings change). Read the diff summary.
7. Commit to `rules-editor` labelled "awaiting independent review". Start the reviewer with your
   test results for that commit (it does not repeat those runs), the diff scope and the card's
   proof. It must: read every changed test for loosening; trace edited text from the rule set to
   the screen; plant at least 8 new faults in a scratch copy (never in the repo) and confirm each
   is caught; run a real-browser check (start, a short case, offline, slow and damaged rules file)
   when the loader, `sw.js`, screen markup or the file format changed.
8. Blocking findings go back to the same worker, then to the **same** reviewer by message. One
   review round; non-blocking findings go on the "Carried forward" list (DECISIONS.md section 8).
9. Update DECISIONS.md (progress table, A-table, waiting list) and GUIDELINE-TRACE.md if anything clinical on screen
   changed. Put the proof in the commit message. Push (see "Git"). Then stop: one step per chat.

### Rules for every agent (copy into each worker and reviewer brief)
- **The guiding principle (DECISIONS.md section 1) governs every change:** the app shows NZ EAS CPG content, as
  written, and calculates only what a guideline says. Anything clinical on screen has a row in GUIDELINE-TRACE.md.
- Branch `rules-editor` only. Never touch `main`.
- Run the tests before and after. **If any test fails, stop and explain in plain English.** Never
  edit `tests/golden/` or the reference recordings, never loosen or delete a test to make it pass.
- **No clinical change** unless it is an approved row in the A-table (DECISIONS.md section 7). Every other step must
  leave every screen identical to the reference (recorded screens and random-case comparisons).
- Clinical numbers and wording live only in `src/rules/nz-eas.yaml` (plain data, ends with `...`).
  The lock-in test must keep passing and is extended when more moves into data.
- Ask the owner before: deleting files, installing packages, anything outside the current step.
- The app is plain static files with no build step, offline, portrait phone. Keep it that way.
- After changing any file the app ships (the `sw.js` list, or `sw.js`), run
  `node tools/set-cache-name.mjs` or the tests fail.
- Comments in plain English; the owner is a clinician. Name blocks generally (DECISIONS.md section 9, editor decision 24).
- Reports under 300 words; never paste file contents. Read only the files and line ranges named.

### Stop conditions
A failing test you cannot explain as a defect of the step and fix within the rules; any clinical
question; any design choice not settled in DECISIONS.md; an owner phone check; a release. In an
attended chat, ask the owner (plain English, one decision, full text of every option, one
recommended). In an unattended chat, write the question under "Waiting for the owner" in DECISIONS.md in
the same form and move to a step that is not blocked, or stop.

### Running unattended
The scheduled task "Pocket Resus build" starts a fresh Opus chat every 3 hours with the prompt
below. To change it, update the task and this section together. An unattended chat never pushes to
`main` and never makes a clinical or design choice. It may re-record the reference recordings
(owner decision 19) only when the what-changed report shows that every difference belongs to an
approved A-row or cards step and the reviewer has no blocking findings: commit the change, then
`node tests/reference/record.mjs --commit <it>`, check the recordings differ only where the report
said, run `npm test` and the deep run, and commit the recordings.

```
Continue the Pocket Resus build (github.com/Dklapaukh/Pocket_Resus). This is an UNATTENDED run started by a schedule: the owner is not watching and cannot answer questions now.

1. Attach the repo with push access (owner Dklapaukh, repo Pocket_Resus), clone it, fetch and check out branch `rules-editor`, run `npm ci`.
2. FIRST run `sh tools/build-progress.sh check`. If it prints BUSY, another chat is already working: stop immediately, do nothing else, and say so in one line.
3. Read `CLAUDE.md`, then `DECISIONS.md` sections 4 to 8, then all of "How the build is run" in `README.md`. Read `GUIDELINE-TRACE.md` and DECISIONS.md sections 1 to 3 and 9 only where the step card says so.
4. If DECISIONS.md shows that every remaining step is waiting for the owner, stop at once and say so in one line.
5. Otherwise act as the orchestrator in README "How the build is run" and follow "The loop for one step" exactly, for ONE step: the first step in the progress table in DECISIONS.md section 5 that is not done and not waiting for the owner (or the saved unfinished work, if the check in step 2 reported any). Use the worker and reviewer models and effort levels in README. Never use Fable.
6. Limits: never push to `main`; never make a clinical or design decision (write it under "Waiting for the owner" in DECISIONS.md with the full text of every option and one recommendation); never edit `tests/golden/`; re-record the reference recordings only as README "Running unattended" allows; never loosen a test. If a test fails and you cannot explain and fix it within the rules, stop and write a plain-English explanation at the top of the progress table in DECISIONS.md. If a model reports a usage limit, do not retry in a loop and do not swap models: note it in DECISIONS.md and stop.
7. Update DECISIONS.md (and GUIDELINE-TRACE.md if anything clinical on screen changed), commit and push to `rules-editor`, then run `sh tools/build-progress.sh save "IDLE: <what is next>"`.
8. Finish with a short plain-English summary for the owner (a clinician, not a programmer): what was done, what was proved, what is next, and at most one question.
```

**Prompt for a chat the owner starts** (paste as is):

```
Continue the Pocket Resus build (github.com/Dklapaukh/Pocket_Resus). Attach the repo with push access, check out branch `rules-editor`, run `npm ci`, then `sh tools/build-progress.sh check`. Read `CLAUDE.md`, then `DECISIONS.md` sections 4 to 8, then "How the build is run" in `README.md`. Then ask me the next question under "Waiting for the owner" in DECISIONS.md (one at a time, full text of every option, one recommended). Then act as the orchestrator in README "How the build is run" for the next free step. Explain simply. Update the docs before you finish so this same prompt works again.
```

### Usage limits
Opus does the orchestrating, the reviews and the hard steps, so the weekly Opus allowance sets the
pace. Keep it for where it matters: tight briefs; Sonnet for every routine step; no agent reads
docs it was not pointed to; one review round. If Opus reports a limit: note the reset time in
DECISIONS.md and stop. Do not review Opus-or-Sonnet work with a weaker reviewer to keep going.

### Release (attended chats only; owner decision 10)
1. Everything for the release is done and reviewed; the "before the next release" items in DECISIONS.md section 8 are done.
2. Guideline currency: compare each guideline's online version with the packaged export; record
   the result in GUIDELINE-TRACE.md section 7. A changed guideline stops the release and goes to the owner.
3. Merge `main` in; run `npm test` and the deep run on the merged commit.
4. `node tools/set-cache-name.mjs v25` (the next label); tests again.
5. Push `rules-editor`, then `git push origin HEAD:main` (fast-forward only, never force).
6. Tell the owner and ask for the phone checks: installs and opens in airplane mode; Start works;
   a shock and a drug record; leave the app in the background past one cycle and return (the clock
   catches up, nothing was recorded by time passing); reload keeps the case; then each line in
   the A-table (DECISIONS.md section 7) "Phone check" column. On both an Android phone and an iPhone if possible.
7. Be ready to put the previous version back with one commit.

### Git
- `git pull --rebase` fails on this branch (it replays old `main` commits). Before a push:
  `git fetch origin rules-editor`, then `git merge-base --is-ancestor origin/rules-editor HEAD`;
  if the remote has new commits, `git pull --no-rebase`, re-run the tests, then push.
- Half-finished work never goes on `rules-editor`: snapshots go to the scratch branch
  `rules-editor-wip` through `tools/build-progress.sh save`. A worker's save also marks the build
  busy, so a scheduled run that starts meanwhile stops by itself.
- A stop hook asks for uncommitted work to be committed: commit only a tested tree.

### Orchestrator notes (keep short; replace, do not append)
- The safety net is `tests/reference/` (read its README); the reference is commit 99388e2.
  `record.mjs` takes about 10 minutes on 2 cores: start it detached and run nothing else beside it.
- Approved changes are listed with their row in `tests/helpers/approved-changes.mjs`; the identical-to-reference tests compare with the
  frozen copies (`tests/baseline/`) plus exactly those swaps.
- The fake-browser tests bypass `src/rules/load.js`: only a real browser proves the loader. The
  pre-installed Playwright Chromium and `tools/check-offline-browser.cjs` are available.
- When a step moves text or values into the rule set: re-point planted-change search texts, add new
  wording keys to the checker's table, freeze additions in a new file under `tests/baseline/`
  (never edit an earlier frozen file).
- When a file format changes, ask what kinds of damage the new format tolerates that the old one
  did not, and serve a damaged file to a real browser.
- A restored snapshot's note can be wrong: run the full tests before believing it.
- Agents cannot be resumed from another chat: never end a chat mid-review. If a chat does stop
  there, the next chat fixes the noted findings and starts a fresh reviewer on the whole step.
- Typical cost of a step so far: worker 10 to 25 minutes, reviewer 10 to 15, fixes 10 to 20.
