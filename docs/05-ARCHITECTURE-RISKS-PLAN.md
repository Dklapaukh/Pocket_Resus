# Architecture recommendation, risk register, missing source, staged plan

Read-only phase. Nothing in the app, clinical logic or UI was changed.

## 1. Architecture recommendation

**Keep it a no-framework static PWA. Convert to native ES modules, add Vite only for dev server/tests, keep TypeScript optional.**

Why this is the smallest maintainable step:

| Option considered | Verdict |
|---|---|
| Keep global scripts, just reformat and comment | Cheapest, but leaves the global-variable coupling (`s`, `tab`, `sheet`, `commit` shared across five files) and load-order fragility. Does not meet "easy for a human programmer to maintain" |
| **ES modules + plain JS with JSDoc types, Vitest for tests, no UI framework** | **Recommended.** Same runtime model and output as today (static files, no server), so parity risk is lowest. Pure engine files (`core.js`, `rhythm-care.js`, `log-view.js`) already export via `module.exports`, so they port almost verbatim into tested modules |
| Same, but full TypeScript | Reasonable upgrade after parity. Types on the event and session shapes would catch real bugs, but adds a build step. Defer; start with JSDoc `@typedef` for `Session` and `Event` |
| React / Redux / backend / database | Not justified. The app is single-user, offline, one screen with sheets. No need |

Target layout (maps your `03-ARCHITECTURE.md` onto the real code):

```
src/
  clinical/        dose.js  energy.js  magnesium.js  fluids.js  reference-data/ (checklists, equipment, causes, tutorial text)
  domain/          session.js (fresh, counts, phase)  events.js  transitions.js (begin, startOutcome, completeOutcome, rosc, rearrest, end)  undo.js
  timing/          clock.js (injectable now())  cycle.js  reminders.js (adrenaline 4 min, 30 s pre-warning, amiodarone prompts)
  persistence/     storage.js (versioned load/save, never silently discard)  migrations.js
  exports/         log-filter.js  export-text.js  export-json.js  clipboard.js
  application/     commands.js (recordDrug, recordShock, editEvent, voidEvent…)  one place that does snapshot → mutate → save → notify
  ui/              views/ (live, log, guidance, checklist)  sheets/ (weight, rhythm, drug, equipment, note, edit, settings…)  render.js  events.js  styles/
tests/             unit/  transitions/  golden/  e2e/
```

Design rules to carry through:

1. **Strangler approach, not a rewrite.** Port the three pure engine files first with their behaviour pinned by golden tests, then move code out of `app.js` function by function.
2. **One clinical authority.** All dose/energy/threshold numbers live in `clinical/` as data + pure functions. `guidance.js` arithmetic (RSI doses, ETT formulae) moves there. UI never computes doses.
3. **One time source.** `timing/clock.js` exposes `now()`; tests inject a fake. Keep wall-clock semantics (parity), but isolate them so a monotonic option is a one-file change later.
4. **One commit path.** Every user action goes through `application/commands.js` (snapshot → change → save → render), replacing the 30+ ad-hoc `commit(()=>…)` calls that currently mix validation with UI.
5. **Event shape unchanged.** Keep exactly the current stored fields (`id, type, title, details, at, createdAt, …`, `audit`, `voided`) and storage key `resus-pocket-v1` so existing sessions load, and JSON exports remain comparable.
6. **CSS consolidated last.** Keep the five stylesheets and their order until screenshot baselines exist; only then merge into component styles.
7. **Dead code is documented, not silently dropped:** `causesView`, `liveChecklist`, pause/resume, "record rhythm only", slider-based equipment input, the one-step shock path in `core.js check()`. Each gets an entry in `docs/removed-or-dormant.md` with the decision (see D3, D4).
8. **Annotate for a human reader:** one header comment per module (purpose, inputs, what it must never do), JSDoc on every exported function, and a `docs/` set: architecture, "how to change a dose safely", "how to add a checklist", "how to bump the cache version".

## 2. Risk register

| ID | Risk | Likelihood | Impact | Evidence | Mitigation |
|---|---|---|---|---|---|
| R1 | **Clinical logic changes unnoticed during refactor** | Medium | **Critical** | Doses, energy, thresholds spread over `core.js`, `rhythm-care.js`, `log-view.js`, `guidance.js`, `app.js` | Golden tests generated from the *original* code before any move (`baseline/baseline-core-engine.js` is the seed); clinician review gate; no formula edits during refactor |
| R2 | Clinical questions in current behaviour (C1–C6 in feature contract) | Certain | High | Contract file, "Clinical flags" | Raise with clinical lead; **preserve behaviour until a ruling**; record ruling in clinical data file with version/date |
| R3 | Timer correctness under wall-clock change, sleep, background tab | Medium | High | `Date.now()` everywhere; absolute deadlines | Characterise current behaviour with fake-clock tests; keep semantics; isolate clock; do not claim background alarms (the app already states none are guaranteed) |
| R4 | **Silent data loss on load**: any saved state that fails the shape check, or malformed JSON, is replaced by a new session with no backup | Low–Medium | High | `app.js` L4 | Preserve behaviour for parity, but write the rejected blob to a recovery key and tell the user. Needs approval because it is a (safe) behaviour addition |
| R5 | Storage growth: undo keeps 30 full snapshots **inside** the saved object, saved on every action | Medium on long events | Medium | `core.js snapshot()` | Test with 500-event sessions; keep behaviour; consider storing deltas only after parity |
| R6 | Duplicate recording from fast double taps; no guard found | Medium | High (double adrenaline) | `data-drug` handler | Characterise on a real device. If confirmed, propose a guard as an *approved* change (D5), not a silent one |
| R7 | Multi-tab or two-device writes overwrite each other (last write wins; `storage` event replaces state) | Low | Medium | storage listener | Document; test; no change in parity phase |
| R8 | **Visual parity cannot be proved without a browser baseline**; layered CSS with overrides; `!important` used 9 times (style 1, phone 4, precision 4) | High | High for UX | `style → phone → precision → explain-me → rhythm-care` cascade | Stage 0 baseline on real Chrome/Safari at fixed viewports; pixel-diff in CI; consolidate CSS last |
| R9 | Tutorial screenshots may be stale; `step-07.png` and `step-08.png` have identical byte sizes | Medium | Low | zip listing | Compare images; regenerate from rebuilt app after sign-off |
| R10 | **Guideline PDFs and any imagery: provenance and redistribution rights unknown** | Unknown | Medium–High | 8 PDFs bundled; no licence file | Ask owner for permission/source statement; add `PROVENANCE.md` |
| R11 | Service-worker staleness: cache name bumped by hand; network-first only after first load | Medium | Medium | `sw.js` | Generate precache list and version from the build; test update flow; keep rollback to old deployment |
| R12 | Hidden coupling by global scope and script order | Certain today | Medium | `guidance.js`, `explain-me.js` | Resolved by the module conversion (stage 2) |
| R13 | Unescaped interpolation in a few template strings | Low | Low–Medium | e.g. `${c.name}`, `${e.type}` from constants | Replace string templates with a small safe `html` tagged-template helper; security review |
| R14 | No tests, no CI, no repository metadata: cannot reproduce "current GitHub HEAD" exactly | Certain | Medium | zip contents | Need repo URL + SHA (see §3); hash manifest recorded |
| R15 | Accessibility and touch-target gaps unverified | Unknown | Medium | `phone.css` has `min-height` values 16–32 px | Audit with axe + manual; report only, do not change in parity phase |

## 3. Missing-source / missing-information list

1. Repository URL, default branch, and **commit SHA** for this snapshot (zip has no `.git`). Confirm the zip equals current HEAD.
2. Git history (to explain the late `sw.js` / `rhythm-care.css` edits and the "v16-timer-spacing" cache name).
3. Deployment details: host, domain, how files get published, any server headers or redirects not in the zip.
4. Any build or generation scripts. The code looks generated or compacted (278-line, 64 KB `app.js`; tutorial slide JSON in one line). If a generator or a larger source tree exists, it is the true canonical source.
5. Screenshots / recordings of the real running app on real phones, plus a few exported logs and `resus-pocket-v1` JSON blobs from real sessions.
6. The "prior product discussions" behind the feature contract, specifically any features the contract expects but this commit lacks: rhythm imagery (VF/VT/torsades), live-screen compact checklist, a Reviewed/Suspected causes screen, a pause control.
7. Clinical source versions: which EAS guideline editions are authoritative; the text of EAS 14.27 (magnesium) which is cited but not bundled; EAS 14.3/14.4 pages used.
8. Rights/provenance for the 8 PDFs and the 10 tutorial images.
9. Licence for the code.
10. Intended browsers/devices (older Safari? low-end Android?): affects `at()`, `dialog`, `wakeLock`, optional chaining usage.

## 4. Staged implementation plan

Each stage ends with a human-reviewable checkpoint. No stage changes clinical behaviour.

| Stage | Work | Exit gate |
|---|---|---|
| **0. Baseline on real devices** | Commit snapshot to git; record SHA. Playwright script that drives scripted scenarios (adult VF ×4 + amiodarone; paediatric 15 kg; torsades; PEA; ROSC → re-arrest; missing weight; weight change mid-session; previous shock; edit/void; checklist ticks; filtered export; reload mid-cycle; storage blocked). Capture screenshots at 360×640, 390×844, 412×915, 360×500 (short), 844×390 landscape, 768×1024, 200% zoom, large-text on; export logs and JSON | Baseline bundle approved by you; confirms or corrects every **Uncertain** row of the contract |
| **1. Pin the engine** | Port `core.js`, `rhythm-care.js`, `log-view.js` to modules unchanged; add tests: all boundary weights, transitions, counts, care-mode switching, undo, filtering/export byte-for-byte against baseline output | 100% of baseline engine output reproduced; old and new engines run side by side in a test |
| **2. Module skeleton** | Introduce `src/` layout; move `app.js` into modules **without changing markup output** (compare `innerHTML` strings for each view in each scenario); add `persistence/` with recovery behaviour identical to today | DOM snapshot equality for all baseline scenarios |
| **3. Clinical extraction** | Move RSI/ETT arithmetic and all constants into `clinical/` with provenance fields; checklists/equipment/causes/tutorial to data files | Clinician walks the clinical data file against the guidelines; flags C1–C6 answered or deferred in writing |
| **4. Timing and events** | Injectable clock; `commands.js` as the single mutation path; duplicate-tap characterisation tests | Timing tests pass with fake clocks; double-tap behaviour documented |
| **5. UI migration** | Views and sheets as separate files; centralised event delegation; consolidate CSS only if pixel diffs stay within agreed tolerance | Visual diff ≤ tolerance at every baseline viewport |
| **6. Docs and tooling** | README, `docs/` guides, lint/format, CI, JSDoc/type-check, generated service-worker manifest | Human developer completes "add a checklist" and "change a dose band" from docs alone |
| **7. Staging and release gates** | Deploy to a separate URL beside the old app; offline/airplane test; rollback route = keep old deployment untouched; security/privacy review; independent clinical validation and governance sign-off per `04-TEST-AND-SAFETY.md` | All release gates ticked. **No claim of clinical readiness from this work** |

## 5. Decisions that genuinely matter (full text)

Only D1 blocks Stage 0. The others can wait until the stage named.

- **D1 (blocks Stage 0):** Please provide the repository URL, branch and commit SHA for the code in this zip, or confirm that the zip is the exact HEAD you want treated as the baseline. Also tell me whether a screenshot/recording baseline from your real phone can be supplied, or whether you want me to set up the Playwright capture scripts to run on your own machine.
- **D2 (Stage 3):** Who is the clinical reviewer for flags C1–C6, and should the rebuild preserve today's behaviour for all six until they respond? My recommendation is yes, preserve.
- **D3 (Stage 2):** The pause/resume handler is unreachable from the interface. Options: (a) leave it out of the rebuild and list it in `removed-or-dormant.md`; (b) port it unchanged but unreachable; (c) expose a Pause button (a UX change that needs your approval). My recommendation is (a).
- **D4 (Stage 2):** `causesView()` (Reviewed / Suspected / Record action with timestamps) and `liveChecklist()` (single-item live checklist) exist in code but never render. Options: (a) omit, record as dormant; (b) port as dormant modules; (c) restore them to the UI. My recommendation is (a) because your instruction is to reproduce the app exactly as it is.
- **D5 (Stage 4):** If duplicate taps on a Record button prove able to double-record on real devices, should I (a) preserve and document it, or (b) propose a guard for your approval? My recommendation is (b), implemented only after approval.
- **D6 (Stage 2):** Is it acceptable to add one non-visible safety behaviour to persistence: saving a copy of any session that fails to load into a recovery key rather than discarding it? My recommendation is yes, but it is a behaviour change so I will not do it without your approval.
