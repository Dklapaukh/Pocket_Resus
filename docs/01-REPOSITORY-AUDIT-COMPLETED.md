# Repository audit — Resus Pocket (completed, read-only phase)

Audited artefact: `resus-pocket-github-latest__3_.zip` (37 files, 4.0 MB, file dates 2026-10-29).
Nothing in the app was modified. Working copy extracted to a scratch directory only.
Hashes of every code file: `baseline/file-hashes.sha256`.

## 1. Provenance

| Field | Value | Confidence |
|---|---|---|
| Remote URL | **Unknown** — zip contains no `.git` | Unknown |
| Branch / commit SHA | **Unknown** — same reason | Unknown |
| License | **None found** (no LICENSE file) | Confirmed absent |
| Package manager / runtime | **None.** No `package.json`, lockfile, bundler or transpiler | Confirmed |
| Framework | **None.** Vanilla JavaScript, classic `<script>` tags, global scope | Confirmed |
| Tests / CI / deployment workflow | **None found** (no test files, no `.github/`, no README) | Confirmed absent |
| Hosting configuration | None in the zip (no `_headers`, `vercel.json`, `CNAME`, etc.). Static hosting assumed | Inferred |
| Latest hand-edits | `sw.js` and `rhythm-care.css` are ~6 hours newer than everything else (17:42/17:43 vs 11:48); `app.js` 11:57 | Confirmed (mtime) |
| Build marker | Service-worker cache name `resus-pocket-v16-timer-spacing` | Confirmed |

## 2. Source completeness verdict

**Complete source for a no-build static app; incomplete repository.**

- Identifiers are not minified and there are no sourcemaps, bundles or `dist/` folder, so the JavaScript and CSS are the canonical source and also the deployed output. Nothing needs reverse-engineering from minified code. (Confirmed)
- The code is, however, **densely compacted**: `app.js` is 64 KB in 278 lines; most functions are one-liners; HTML is built by long template strings. The style looks machine-compacted rather than human-authored. It is readable only with effort. (Confirmed)
- Missing: git history, remote, SHA, tests, tooling, README, licence, any record of how the guideline PDFs were produced, any design documentation. See `05-ARCHITECTURE-RISKS-PLAN.md` §3.

## 3. File inventory

| Path | Lines / size | Purpose | Source vs generated | Risk | Destination in new architecture |
|---|---|---|---|---|---|
| `index.html` | 9 lines | App shell: header clocks, `<main>`, bottom nav, `<dialog id=sheet>`, toast, script order | Source | Low | `index.html` (script order becomes ES module imports) |
| `core.js` | 34 lines / 4 KB | Pure engine: `fresh`, weight validation, `estimate`, `joules`, `dose`, `counts`, `timing`, `snapshot/undo`, `add`, `begin`, `check`. Exports to `globalThis.Resus` and `module.exports` | Source | **High (clinical)** | `domain/` (state, events, transitions) + `clinical/` (dose, energy) + `timing/` |
| `rhythm-care.js` | 42 lines | Pure: torsades/PEA care mode, magnesium and fluid references, `startOutcome` / `completeOutcome` (two-step rhythm recording), `addPreAppShock`, `checklistPrompt`. Extends `Resus` | Source | **High (clinical)** | `clinical/` + `domain/` |
| `log-view.js` | 29 lines | Pure: log filtering (`logEntries`), checklist start/finish summarisation, `shockEnergy` default (200 J if weight blank) | Source | Medium (export fidelity) | `exports/` + `domain/` selectors; `shockEnergy` moves to `clinical/` |
| `checklists.js` | 15 lines | Four checklists (arrest, post-ROSC, RSI prep, RSI) as data | Source (data) | Medium (clinical text) | `clinical/data/checklists` |
| `equipment.js` | 10 lines | Airway/access equipment sizes and IV/IO sites as data | Source (data) | Low | `clinical/data/equipment` |
| `app.js` | 278 lines / 64 KB | Everything else: state `s`, persistence, all views, all sheets, all event handlers, rendering, ticking, reference-link formatting, cause list, support cards | Source | **High** (monolith, mixes UI + clinical wiring) | Split across `application/`, `persistence/`, `ui/` |
| `guidance.js` | 6 lines | Guidance tab, RSI dose and tube-size references (**clinical arithmetic inside UI code**), click handlers | Source | **High (clinical)** | Arithmetic → `clinical/`; markup → `ui/` |
| `explain-me.js` | 17 lines | Tutorial slide data + sheet with progress bar | Source | Low | `ui/tutorial` + data file |
| `sw.js` | 5 lines | Service worker: precache 37 paths on install, network-first with cache fallback | Source | Medium (offline behaviour; manual cache-name bump) | `sw.js` (generate precache list) |
| `style.css`, `phone.css`, `precision.css`, `explain-me.css`, `rhythm-care.css` | 6 / 112 / 139 / 24 / 67 lines (≈209 / 353 / 368 / 27 / 80 rules) | Layered stylesheets: later files override earlier ones | Source | **High for parity** (cascade order is behaviour) | Consolidate **only after** visual baseline exists |
| `manifest.webmanifest`, `icon*.{png,svg}` | small | PWA manifest and icons | Source/assets | Low | unchanged |
| `cpg-*.pdf`, `cpg-drugs/*.pdf` | 8 PDFs, ≈2.9 MB | Offline copies of NZ CPG guidelines (EAS 3.14, 3.15, 7.2, 9.2–9.4, 14.3, 14.4) | Third-party content | **Rights/provenance unknown** | `public/guidelines/` with provenance file |
| `tutorial/step-01…10.png` | 10 PNG, ≈1.2 MB | Tutorial screenshots (step-07 and step-08 are byte-identical in size, 158,289 bytes; verify) | Generated assets | Medium (may show stale UI) | `public/tutorial/` |

## 4. Architectural facts that matter for the rebuild

| Claim | File / function | Confidence | Open question |
|---|---|---|---|
| State is one mutable global object `s`, serialised whole to `localStorage['resus-pocket-v1']` | `app.js` L1–4, `save()` | Confirmed | None |
| Persisted schema `version:1`; load accepts it only if `events` is an array and `appStart` finite; **anything else silently becomes a fresh session** (no migration, no backup of the rejected data) | `app.js` L4 | Confirmed | Is silent data discard acceptable? |
| Undo = up to 30 full-state snapshots stored **inside** the persisted object | `core.js snapshot()` | Confirmed | Storage growth with long sessions (quota failure path exists: `storageOK` banner) |
| Clock source is wall-clock `Date.now()` for everything; deadlines are absolute epoch ms; no monotonic clock; tick is `setInterval(tick,250)` | `core.js timing()`, `app.js` last lines | Confirmed | Behaviour if device clock or timezone is changed mid-session: untested |
| Background/sleep: no timers run while hidden, but deadlines are absolute so display catches up on `visibilitychange`; no background alarm (the app says so itself) | `app.js` visibilitychange, `install` sheet text | Confirmed | None |
| Reload while a cycle is running keeps the original deadline (absolute). Reload while "paused" resumes it (see pause note below) | `app.js` L5 | Confirmed | None |
| Events carry occurrence time `at` and record time `createdAt`, with random-UUID `id` | `core.js add()` | Confirmed | `at` can be user-edited; `createdAt` is not shown anywhere |
| Corrections never delete: edits push the prior state into `ev.audit`; "void" flips `voided`; counts and exports ignore voided events | `app.js` editForm / `data-void` handlers | Confirmed | None |
| Cross-tab sync: `storage` event replaces `s` wholesale (last writer wins) and shows a toast | `app.js` storage listener | Confirmed | Two devices/tabs recording at once: untested |
| Two-step rhythm recording: pressing Shock/No-shock immediately records the event with rhythm `Unknown` and starts the next 2-min cycle; the rhythm sheet then fills in rhythm and energy. Pending state persists and **re-opens the sheet on reload** | `rhythm-care.js startOutcome/completeOutcome`; `app.js` `if(s.pendingRhythm)openRhythm(...)` | Confirmed | If the sheet is dismissed without choosing, the event stays `Unknown`; no re-prompt until reload |
| `core.js check()` still contains an older one-step shock/no-shock path; the UI only uses it for ROSC | `core.js check()`; `app.js saveRhythm()` | Confirmed | Dead branch for shock/no-shock; remove only with tests |
| **`pause` / `resume` handler exists but nothing in the UI triggers it** (`data-action="pause"` appears nowhere in markup) | `app.js` action==='pause' | Confirmed unreachable from code; needs browser confirmation | Remove, keep dormant, or expose? (decision D3) |
| **"Record rhythm only" sheet (`action==='rhythm'`) is unreachable**; same for the range-slider equipment code (`data-size`, `sizeUnit`, `sizeRead`, `data-gauge`) | `app.js`, `guidance.js` | Confirmed (no triggering markup) | Dead code from older versions; keep out of the rebuild unless a hidden path exists |
| Guidance, RSI doses and tube sizes are computed inside `guidance.js` template strings | `guidance.js referenceSheet()` | Confirmed | Needs extraction to pure functions + tests |
| Script coupling: `guidance.js` and `explain-me.js` use `s`, `tab`, `checklist`, `sheet`, `commit`, `esc`… from `app.js`'s global scope; `app.js` calls `openExplainMe` / `guidanceGrid` that are defined in scripts loaded **after** it | `index.html`, `guidance.js`, `explain-me.js` | Confirmed | Works only because calls happen after all scripts load. Any reorder breaks it |
| Rendering is full `innerHTML` replacement of `<main>` every state change; user text is escaped via `esc()` | `app.js render()`, `esc` | Confirmed | Security review should still confirm every interpolation (e.g. `${c.name}`, `${e.type}` are unescaped but sourced from constants/internal values) |
| External network use: none at runtime except opening 3 links to `cpg.stjohn.org.nz` and `anzcor.org`; no analytics, no backend, no fonts from CDN | grep of all JS/HTML | Confirmed | Privacy review is therefore simple: data stays on device |
| Service worker precaches 36 of 37 files (all except itself); every precached path exists on disk | node check | Confirmed | Cache name is bumped by hand; stale-cache risk if forgotten |
| Accessibility present: `role=timer`, `role=status` live region, `aria-label`s, `dialog`, `prefers-reduced-motion` in tutorial scroll | `app.js`, `index.html`, `explain-me.js` | Confirmed (markup only) | Contrast, focus order and touch-target size unverified without a browser |
| Existing checks run | `node --check` on every JS file: **all pass**. No other tests exist | Confirmed | — |

## 5. Clinical constants found in code (evidence only; **no judgement made**)

All require clinician-led review. Cross-check against the bundled PDFs is noted where I could do it by text extraction.

| Item | Where | Value in code | PDF cross-check |
|---|---|---|---|
| Cycle length | `core.js CYCLE` | 120 s | Matches EAS 3.14 narrative ("every 2 minutes" not extracted) — not independently checked |
| Adrenaline interval | `core.js ADR` | 240 s review; card highlights at ≤30 s remaining | EAS 3.14 says every four minutes (line 29) ✔ |
| Weight validity | `validWeight` | digits with ≤1 decimal, >0 and ≤500 kg. **No lower floor** (0.1 kg is valid) | n/a |
| Paediatric threshold | `isPaediatric` | ≤40 kg | PDF: doses by band to 40 kg; >40 kg "can usually be given adult doses, but clinical judgement" ✔ |
| Paediatric bands | `dose()` | 5/10/20/30/40 kg, rounded **up** | PDF line 52 ✔ |
| Adrenaline | `dose()` | band/100 mg (0.05, 0.1, 0.2, 0.3, 0.4); adult 1 mg | 5/10/20 kg bands ✔ (30/40 not extracted) |
| Amiodarone | `dose()` | first 5 mg/kg-band, second 2.5 mg/kg-band; adult 300 then 150 | 5/10/20 kg first dose ✔ (second dose and adult not extracted) |
| **Adult dose boundary** | `dose()` | any weight **>40 kg** gets adult doses (1 mg adrenaline, 300 mg amiodarone). The in-app administration text says "adults and children rounded to 50 kg or more: undiluted; children 40 kg or less: dilute" | **Flag:** the guideline text implies a 40–50 kg zone that the app treats as adult. Needs clinician decision, not a code fix |
| Defibrillation energy | `joules()` | `min(round(w×40)/10, 200)` = 4 J/kg of **actual weight** (decimals possible, e.g. 20.4 J), cap 200 J. Blank weight → 200 J default (`log-view.js shockEnergy`); invalid weight (e.g. 0) → blank | **Flag:** PDF gives joule **ranges per band** (5 kg: 20–25 J; 10 kg: 40–50 J; 20 kg: 80–100 J) and says "if not available select the next highest". App shows exact 4 J/kg. Needs clinician decision |
| Paediatric pads | `needsPaediatricPads` | prompt when energy ≤100 J (weight ≤25 kg) | Not found in PDF text I extracted — confirm source |
| Weight estimate from age | `estimate()` | <1 y: 5 kg; whole years 1–10: (age+4)×2; whole years 11–14: age×3; fractional ages ≥1 or >14 → none | Matches in-app text (EAS 7.2) — table not independently extracted |
| Magnesium | `magnesiumReference` | adult/blank 10 mmol; 20 kg band 4, 30 kg band 6, 40 kg band 8 mmol; 5 and 10 kg bands → "seek clinical advice" | 5 and 10 kg dashes ✔; 20/30/40 not extracted |
| Fluids | `fluidReference` | adult 1000–2000 mL; child 20–40 mL/kg | EAS 3.14 lines 84–85 ✔ |
| Amiodarone prompts | `tick()` | due when rhythm VF/VT, no torsades, (shocks ≥3 and 0 doses) or (shocks ≥6 and 1 dose); max 2 doses | EAS 3.14 "3 shocks / 6 shocks" not extracted — confirm |
| RSI doses | `guidance.js` | fentanyl 2 mcg/kg ≤200; ketamine 2 mg/kg ≤200 (reduced 1 mg/kg); roc/sux 2 mg/kg ≤200, adults >40 kg rounded to nearest 50 mg | Not cross-checked |
| ETT formulae | `guidance.js` | cuffed: age/4+3.5 mm; length: age/2+12 cm; <1 y: 3–4 mm, size×3 cm | Not cross-checked |

**Latent inconsistency (not reachable via UI today):** `validWeight` and `dose()` accept a comma decimal (`4,5`), but `magnesiumReference`/`fluidReference` read `+s.weight` directly and would return NaN. The weight form normalises commas before storing, so this cannot occur through the interface. The rebuild must keep one normalisation point.

## 6. Behaviour baseline captured so far

- `baseline/baseline-core-engine.js` + `.output.txt`: scripted run of the pure engine. 18 weights from boundaries (blank, 0, 0.1, 5, 5.1, 10, 10.1, 20, 30, 40, 40.1, 50, 100, 500, 500.1, text, comma, 3-digit decimal) × dose, energy, pads, magnesium, fluids, default energy; age-estimate table; a 7-event scenario (cycle start → 4 VF shocks → torsades shock → PEA no-shock → ROSC) showing care-mode switching (amiodarone → magnesium → fluids), counts, undo depth and export text.
- **Not captured (blocked):** screenshots at multiple sizes, interaction recordings, UI-generated event-log exports. This environment has no browser binary and cannot download one. These are the first things to capture on a machine with Chrome/Playwright (plan stage 0).
- Existing test results: none exist. Known bugs: none documented; observed code-level issues are in the risk register.
