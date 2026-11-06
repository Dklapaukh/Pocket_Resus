# Developer code map

This map describes the current implementation, not clinical authorisation.
NZ EAS source documents and recorded clinical decisions remain authoritative;
verify sources and applicability before changing any clinical rule.

## Follow a user action

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
   formatting; `data.js` provides app reference and checklist content.

The app uses shared state. Read the call sites
before moving a function: a display function can also update screen-only state,
and recording has persistence and redraw side effects.

The main app module dependencies now run in one direction: event and session
actions call views and sheets; views call sheets; views and sheets read state,
formatting and fixed data. State-derived decisions live in `state.js` so views
do not need to import session actions just to render. `events.js` connects the
modules to browser events. Shared state and side effects still matter: this
graph is a tracing aid, not a claim that every function is pure.

`sw.js` explicitly lists the modules to cache for offline use. Adding or
renaming a module also requires a deliberate offline-cache and update review;
changing imports alone can leave an installed offline app incomplete. The
current readability work retains the existing module paths and cache list.

## Where to trace important behaviour

| Question | Start here | Notes |
| --- | --- | --- |
| CPR cycle or adrenaline clock | `core.js`: `CYCLE`, `ADR`, `timing`, `begin`; `views.js`: `tick` | Deadlines derive from recorded times. Check background and reload behaviour on real devices. |
| Weight, energy, medication references | `core.js`: `validWeight`, `dose`, `joules`; `views.js`: `weightHeader`, `drugCard` | Suggested values and actually recorded interventions are different. `joules` has the approved A1 change. |
| Amiodarone visibility and second dose | `views.js`: `amioDue`, `amioCardVisible`, `drugCard`; `state.js`: `drugDose`, `childSecondAmio`, `secondAmioEarly` | See A2/A2b/C6b-2 and their tests and decisions. Do not infer a child second dose from the raw engine calculation. |
| Lower medication/support card | `state.js`: `latestLowerRhythm`, `careMode`; `views.js`: `liveView` | The app's A2c `careMode` includes Asystole. The older engine helper is retained for fidelity and differs; follow the actual import. |
| Double-tap guards | `state.js`: `A5_LOCK_MS`, `lockLeft`; `session.js`: `recordSupport`; `events.js`; `views.js` | UI disabling and recording guards both matter; manual entry follows a separate path. |
| Rhythm and shock recording | `rhythm-care.js`: `startOutcome`, `completeOutcome`; `session.js`: `saveRhythm` | A previous shock can lack an actual time; do not invent one. Corrected and voided events affect derived state. |
| Recovery and storage | `state.js`, `session.js`: `save`, `main.js` | Only one unreadable raw backup is kept. The warning does not provide an in-app restore tool. |
| Log and export | `src/engine/log-view.js`, `state.js`: `logRows`, `sheets.js`: `exportText`, `events.js`: `downloadCompleteRecord` | Text uses log filters; complete JSON retains events and audit but leaves out undo snapshots. A display filter is not a clinical event. |

The source references above identify where to investigate; they are not an
exhaustive source-to-rule audit or evidence of independent clinical validation.
`docs/11-CLINICAL-RULE-INVENTORY.md` maps clinical references and recording paths, with review gaps. `docs/06-DECISIONS-LOG.md` and `docs/07-HANDOFF-AND-CHANGE-BACKLOG.md` record
decisions and history. Later dated decisions supersede older narrative notes.

For a readable walkthrough of the fidelity-pinned compact engine, see
[Reading the engine](12-READING-THE-ENGINE.md).

## Session storage and recovery

`st.s` is the in-memory session; `save` writes it as JSON under
`resus-pocket-v1`. A `commit` snapshots the session, performs the change,
attempts to save, redraws and may show a message. A failed storage write shows
the storage warning; `commit` does not roll the in-memory change back.

At startup, `state.js` accepts a parsed session if its version is 1, its
`events` is an array and `appStart` is finite. These are shallow checks, not
complete validation of every field. If saved text fails those checks, the app
tries to retain the raw text under `resus-pocket-v1-unreadable-backup`, starts
a fresh session and reports whether the copy succeeded. Only the newest
unreadable backup is kept. If nothing was saved, it starts fresh without that
recovery message. `main.js` then saves and draws the selected session.

The cross-tab storage handler uses a different, narrower check: version 1 and
an event array. It replaces the in-memory session and redraws, without running
the startup recovery path. Undo restores a previous snapshot and saves it.
Neither path is a JSON import feature or a general session repair tool. See the
comma-weight investigation in doc 11 before changing how stored data is read.

## Example traces

- **Suggested versus recorded medicine:** `drugCard` in `views.js` gets a
  reference from `drugDose` in `state.js` and decides what to show. A tap
  reaches `recordQuickDrug` in `events.js`, which rechecks the guard before
  `commit` adds an event. Manual entry instead uses `openDrug` and
  `submitDrug`; `medicineEntryName` chooses a form default and
  `manualMedicineType` maps recognised names to event types
  used by the counts and clocks. Opening a reference or form does not
  itself record a dose.
- **Rhythm and the lower card:** `startOutcome` can record the selected
  outcome before rhythm details are completed: `recordOutcome` in `events.js`
  saves it and opens the rhythm dialog. `selectRhythm` and
  `saveRhythm` complete it; `latestLowerRhythm` and `careMode` in `state.js`
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
  Undo restores a snapshot through `R.undo` and then saves it. Neither
  startup, cross-tab loading nor undo normalizes every saved field; see
  the comma-weight compatibility investigation in doc 11.

## Safe refactoring

- Keep the existing line-by-line engine fidelity check intact until an equally
  strong, explicitly reviewed replacement exists. It currently requires the
  compact original logic lines, except the pinned A1 energy change.
- Run the full suite before and after a coherent change. Read failing tests;
  do not regenerate golden outputs to hide differences.
- Keep event occurrence, displayed suggestions, clinical actions actually
  recorded, corrections and undo distinct. Preserve offline and storage paths.
- A future guideline pack needs its own version, source, reviewed rules and
  scenario checks. The current app does not yet implement editable packs.
