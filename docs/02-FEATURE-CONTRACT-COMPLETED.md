# Behavioural feature contract — verified against the repository snapshot

Status key: **Present** (code evidence) · **Different** (exists but not as the contract describes) · **Absent** · **Uncertain** (needs a real browser or a clinician).
"Visual" items cannot be confirmed without rendering; they are marked Uncertain even where CSS exists.
File references are to the zip contents. "L" = line in the 278-line `app.js`.

## Live arrest screen

| Contract item | Status | Evidence | Notes / open question |
|---|---|---|---|
| Compact mobile-first live screen, no scrolling for active workflow | **Uncertain** | `body.live-mode` toggled in `render()`; `.live-dashboard` in `liveView()`; layout in `phone.css` / `precision.css` | Cannot render. Needs screenshots at ≥6 viewport sizes incl. short phones and landscape |
| Session clock + resuscitation duration | **Present** | `index.html` `#appClock`, `#resusClock`; `core.js timing()`; `tick()` every 250 ms | Resus clock is editable (`openResusTime`), must be ≤ app start; freezes at ROSC/end (`(s.end??now)-resusStart`) |
| Patient weight entry | **Present** | `openWeight()`; keypad `data-key`; `validWeight` | Also "estimate from age" (`R.estimate`). Weight change mid-session is allowed, logged as a `weight` event; no timer is changed by it |
| Weight-dependent energy | **Present** | `core.js joules()`; `weightHeader()` shows energy + "est." | 4 J/kg of *actual* weight, cap 200 J. See clinical flag C2 |
| Default 200 J if weight absent | **Present** (blank only) | `log-view.js shockEnergy()` → 200 when weight is blank; `null` (empty box) when weight is invalid such as 0 | Pre-fills the optional energy box in the shock sheet |
| Two-minute CPR/rhythm cycle, prominent countdown, perimeter trace | **Present** | `CYCLE=120000`; `#cycleClock` shows `countdown()` (rounds up); SVG `rect.ring-fill` with `pathLength=120`, `stroke-dashoffset` set each tick | Visual prominence Uncertain |
| 30/15-second markings or indicators | **Present (text/state), perimeter marks Uncertain** | `tick()` caption "30 seconds remaining" (≤30 s), "Prepare for rhythm check" (≤15 s); class `prepare` | Whether tick marks are drawn on the ring is a CSS question |
| Yellow warning near 15 seconds | **Present** | class `prepare` on `#timerPanel` when running and 0 < left ≤ 15 s; `precision.css` `.prepare{background:#fffdf5…}` `.ring-fill{stroke:#a77512}` | Pale cream/amber; check contrast |
| Rhythm-check prompt | **Present** | `tick()` shows `#rhythmCheck` only when `due` (left = 0); `canRhythmCheck()` also guards the action; caption shows "+mm:ss" when more than 1 s late | A rhythm check cannot be started early (only unexpected ROSC can) |
| Shock / no-shock actions | **Present, two-step** | `openRhythmCheck()` → `R.startOutcome()` records the event immediately (rhythm `Unknown`) and starts the next cycle, then `openRhythm()` collects rhythm + optional energy | Recording on first tap is behaviour to preserve exactly. Dismissing the rhythm sheet leaves rhythm `Unknown` |
| Cycle history | **Present** | `openCycleLog()` (tap the cycle heading) lists start / shock / no-shock / re-arrest with times and "Cycle n"; earlier counts shown as counts only | — |
| Shock counter with lightning icon | **Present** | `.dial-shocks` with `svg.shock-bolt`; `R.counts()` | Counts exclude voided events; include prior-shock counts |
| Discreet **+ Previous shock**, no disturbance to cycle, no overlap | **Present (logic) / Uncertain (overlap)** | `data-action="previous-shock"` → `R.addPreAppShock()`: event at `appStart-1`, `preApp`, `timeUnknown`, `needsReview` | Adds to shock count, does not touch deadline/phase. Overlap with countdown needs a visual check. Log shows "Before app · Time not set" and an edit prompt |
| ROSC control and post-ROSC state | **Present** | "♡ ROSC" button (visible in Ready/Active); `R.check(...,'rosc')` sets phase `ROSC`, clears deadline, stores remaining time, freezes resus clock; app jumps to the Post-ROSC checklist | ROSC rhythm choices: Sinus rhythm, Organised rhythm, AF, Other, Unknown |
| Re-arrest / restart CPR | **Present** | `action==='rearrest'` → `R.begin()` + `rearrest` event; button replaces Start when phase is ROSC | Cycle number continues counting; resus clock resumes (end cleared) |
| Pause / resume | **Different (unreachable)** | Handler `action==='pause'` exists; no button in any markup; `tick()` has a "Paused · resus clock continues" caption | Dead path in current UI; reload would also un-pause. Decision D3 |
| End session | **Present** | `confirm-end` sheet; phase `Ended`; recording disabled until Undo | Contract did not list it |
| Rhythm branches VF/VT/torsades/PEA/other | **Present** | `rhythm-care.js careMode()` | VF, VT ("Pulseless VT"), Torsades (shock); PEA, Asystole, Other, Unknown (no shock). Latest relevant rhythm decides PEA vs not |
| Torsades substitutes magnesium for amiodarone | **Present** | `careMode()` returns `magnesium` if any active event has rhythm Torsades (and latest relevant rhythm is not PEA); amiodarone card replaced by `supportCard('magnesium')`; amiodarone record button reads "Withhold · torsades" if it were shown; Torsades selection needs an explicit confirm sheet | Persists for the rest of the session once recorded, unless voided/undone |
| PEA substitutes fluids | **Present** | `careMode()` returns `fluids` when the latest relevant rhythm is PEA; fluids button opens a free-entry volume form (no preset volume is recorded) | Guideline reference ranges shown only |

## Medications and interventions

| Contract item | Status | Evidence | Notes |
|---|---|---|---|
| Adrenaline and amiodarone cards | **Present** | `drugCard()` | Card shows weight-derived dose, `Record x mg IV`, "Administration ⓘ", "Other…" |
| Time since last administration / next-dose timing | **Present** | Adrenaline: countdown to 4 min, then "+mm:ss … 4 min elapsed · review". Amiodarone: time since last dose | `timing()`; `tick()` |
| 30-second adrenaline pre-warning | **Present** | `adrenalineCard.attention` when ≤ 30 s to review | — |
| Timestamped recording | **Present** | `R.add()` stores `at` (occurrence) and `createdAt`; manual doses take a user time (future times rejected) | — |
| Administration reference | **Present** | `administration()`; links to `cpg-drugs/eas-14-3.pdf`, `eas-14-4.pdf` | Includes dilution text for children ≤40 kg |
| Additional dose/action option | **Present** | "Other…" → `openDrug()`; "Record an earlier adrenaline dose" under Earlier counts | Free-text medicine name; `adrenaline`, `amiodarone`, `magnesium`, `0.9% sodium chloride` are matched case-insensitively to special types |
| Amiodarone prompts (3rd / 6th shock) | **Present** | `tick()` `amioDue`; max 2 doses; blocked when torsades | Counts include "earlier" shocks |
| Paediatric dose presentation | **Present** | `R.dose()` bands; `child` class; "Use paediatric pads" prompt | Clinical flags C1, C2 |
| Special-situation mode | **Present** | Settings checkbox `specialInput`; disables routine dose buttons and review prompts | Not in contract |
| Separate airway and vascular-access controls | **Present** | Two live tiles (`data-action="airway"`, `"access"`) plus a combined "Airway / access" button | `openInterventions()` |
| IV sites | **Present** | `ARREST_SITES.iv` = ACF, Forearm, Hand, Foot, EJ × Left/Right; cannula 24/22/20/18/16 G, colour-coded | Outcome Successful/Unsuccessful |
| IO sites | **Present** | Proximal tibia, Proximal humerus, Distal Femur × Left/Right; sizes Large/Medium/Small | — |
| Airway options | **Present** | OPA 0–5, NPA 6–8, iGel 1–5, Laryngoscopy (video/direct, blade, forceps, view grade), Intubation (size, bougie/stylet, length at lips, confirmation methods) | "Record Laryngoscopy and add Intubation" chained button |
| Additional manual events with time stamps | **Present** | `+ Event` → `openNote()`; time editable | — |

## Checklists and references

| Contract item | Status | Evidence | Notes |
|---|---|---|---|
| Arrest checklist, checkbox progress, timestamps | **Present** | `ARREST_CHECKLISTS[0]` (12 items), `checksView()`; each tick logged as `checklist` event with key `id:index` | Un-ticks are logged too ("Unmarked: …") |
| Full-screen checklist | **Present** | `checks` tab with "← Back"; hides normal layout via `checklist-mode` | — |
| Other checklists | **Present** | Post ROSC (EAS 3.15, 9 items), Preparation for RSI (EAS 9.2, 10), RSI (EAS 9.4, 28) under Guidance | Contract mentions only arrest |
| Checklist attention cue | **Present** | Bottom-nav "Arrest checklist" highlights (`checklist-attention`) when Active, ≥ 90 s left, and adrenaline recorded | Not in contract |
| Compact one-item live checklist | **Absent (dead code)** | `liveChecklist()` is defined but never called | Do not rebuild unless D4 says so |
| Reversible causes 4Hs/4Ts | **Present (prompts only)** | `CAUSES` (8); Guidance tab shows 8 buttons that open a read-only prompt sheet (`data-cause-guide`) | The richer `causesView()` (Reviewed / Suspected / Record action, with timestamps) is defined but **never rendered** (`render()` has no branch for it), so cause *status* events cannot be created from the current UI. The contract's "checkbox progress and time stamps" applies to checklists, not causes |
| RSI doses by weight | **Present** | `guidance.js referenceSheet('rsi')` | Arithmetic in UI file. Rounding rule for >40 kg: nearest 50 mg |
| Tube sizes / paediatric references | **Present** | `referenceSheet('tubes')`: age formulae, age→weight estimate, iGel ranges | — |
| Citations styled *EAS guideline X.X* | **Present** | `formatGuidelineReference()` and `normalizeGuidelineReferences()` rewrite "EAS/CPG/ANZCOR n.n" into `<em>EAS guideline n.n</em>` after every render | Note `ANZCOR` keeps its own prefix. Lists like "3.14 / 14.27" are split |
| Clinical imagery for VF/VT/torsades | **Absent** | `rhythmImages()` returns three **text** buttons only; no rhythm images in the zip | If the contract expects images, they are missing from this commit |
| Tutorial with progress indicator and app-specific examples | **Present** | `explain-me.js`: 10 slides with real screenshots, progress bar (`role=progressbar`), Back/Next | Screenshots may not match the current UI (Uncertain) |
| Offline guideline PDFs | **Present** | 8 PDFs precached by `sw.js` | Provenance/rights unknown |

## Log and export

| Contract item | Status | Evidence | Notes |
|---|---|---|---|
| Chronological event log with event times | **Present** | `logView()`; sorted by `at`; **display is newest-first** (`rows.slice().reverse()`) | Each row shows time and ± elapsed from resus start |
| Filter: interventions only | **Present** | `logScope`; `log-view.js INTERVENTIONS` = start, rearrest, shock, noshock, rosc, end, adrenaline, amiodarone, magnesium, fluids, medicine, equipment, note, plus causes with status `treated` | Checklist ticks, weight, resus-time, history, context, rhythm-only events are excluded |
| Checklist view summarising start/finish | **Present** | `checklistDisplay='times'` → `checklistTimes()` creates synthetic "started" / "finished" rows | "Reopened for review" produces another "started" |
| Export copies the *currently filtered* log | **Present** | `exportText()` = `logRows(false)` (same filters, **voided excluded**) | Export is **oldest-first**, one line per event: `HH:MM:SS Title — details` (24-hour `en-NZ`); pre-app events read "Before app · time not set" |
| Clipboard behaviour | **Present** | `copyLog()`: `navigator.clipboard`, fallback hidden textarea + `execCommand('copy')`, toast on failure | — |
| Also text and JSON file download | **Present** | `download-text`, `download-json` (JSON includes audit trail, timezone, export time; excludes `undo`) | Not in contract |
| Session persistence and recovery | **Present** | `localStorage['resus-pocket-v1']`; load on start; deadline survives reload; pending rhythm sheet re-opens | See audit §4 |
| Unavailable-storage behaviour | **Present (untested)** | `save()` catches errors → `#storageError` banner "Saving unavailable. Keep this page open and export the log." Load failure silently creates a fresh session | Must be tested explicitly; silent discard on load is a risk (R4) |
| Session reset | **Present** | "New patient / clear session" requires confirmation, offers Export first; keeps "larger text" preference | — |
| Undo | **Present** | Settings → "↶ Undo last action", up to 30 snapshots | Also persisted |

## UI and ergonomics

| Contract item | Status | Evidence | Notes |
|---|---|---|---|
| Dark-green header/footer, compact cards, thin category accent borders | **Uncertain** | `theme-color #174f3d`; `data-event-type` hooks; CSS present | Needs visual baseline |
| High-contrast cues; colour-independent | **Uncertain** | Cycle states also change text captions (good). Contrast not measured | — |
| Touch targets | **Uncertain** | `phone.css` contains `min-height` values as small as 16–32 px for some elements | Measure which are interactive |
| No accidental interaction / double-recording | **Uncertain** | No debounce or idempotency guard on `Record` buttons found; each tap synchronously commits and re-renders | A fast double-tap before re-render is the risk. Needs device test (R6) |
| Larger text mode | **Present** | `s.largeText` → `body.large` | Not in contract |
| Wake lock | **Present** | `requestWakeSilently()` on Start; settings toggle | Not in contract |
| Install prompt / PWA | **Present** | manifest, service worker, `beforeinstallprompt` | — |

## Clinical and edge cases (what the code does today)

| Case | Observed behaviour (evidence) |
|---|---|
| Start | `begin()`: phase Active, deadline = now + 120 s, cycle +1; logs `start` |
| Repeated rhythm checks | Allowed only when countdown = 0; each starts the next cycle immediately |
| Weight change mid-session | Replaces weight; doses, energy, pads prompt and references recompute at once; earlier events keep the weight they recorded (`weight`, `weightBasis` stored on dose events) |
| Missing weight | Adrenaline/amiodarone show **adult doses** (1 mg, 300/150 mg); magnesium adult 10 mmol; fluids "Enter weight"; energy 200 J default |
| Invalid weight (0, >500, non-numeric) | Rejected by the weight form; stored value cannot be invalid via UI |
| Duplicate taps | No guard found (R6) |
| Page refresh | State restored; running cycle continues from absolute deadline; pending rhythm sheet re-opens |
| Device sleep / clock drift | Deadlines are absolute `Date.now()`; display catches up on return; wall-clock changes shift deadlines (R3) |
| Filtered export / reset | As above |
| Which actions change timers | Only: Start, rhythm check outcomes (shock/no-shock), re-arrest, ROSC, end, undo, reload-while-paused. Doses, checklists, equipment, notes, weight changes and causes do **not** touch the cycle timer. Adrenaline recording starts the 4-minute review clock; amiodarone/magnesium/fluid recording starts their "since" clocks |

## Clinical flags raised (for decision, **not** changed)

| ID | Flag |
|---|---|
| C1 | Weight >40 kg is treated as adult for adrenaline/amiodarone. Administration text refers to "50 kg or more" for undiluted adult bolus. The 40–50 kg zone needs a clinician ruling on intended behaviour |
| C2 | Energy is exact 4 J/kg of actual weight (can show 20.4 J). Bundled EAS 7.2 lists joule ranges per weight band and says to select the next highest available level |
| C3 | Paediatric pads prompt at ≤100 J (≈ ≤25 kg): source not located in the extracted PDF text |
| C4 | Weights below 5 kg (including 0.1 kg) are accepted and use the 5 kg band; there is no lower bound or "newborn" handling in the weight form (the estimate form says it excludes newborn resuscitation) |
| C5 | Amiodarone due-prompts require the *current* rhythm to be VF/VT; after a no-shock cycle the prompt disappears even if shock count ≥3 |
| C6 | Magnesium for the 20/30/40 kg bands (4/6/8 mmol) and amiodarone second-dose values need checking against EAS 7.2 and EAS 14.4 |
