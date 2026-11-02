# Hand-off (read this first in any new chat)

## Working tool
Currently: chat + zip upload (owner has no paid plan). IF the owner subscribes (Pro or above), switch to Claude Code (desktop app, Code tab): see `docs/08-CLAUDE-CODE-SETUP.md` and `CLAUDE.md`. Chat is kept for clinical decisions either way. Owner may only have a phone for some steps: the phone check works on a phone, uploading a multi-folder zip needs a computer.

## Project
Rebuild Pocket Resus (https://github.com/Dklapaukh/Pocket_Resus, branch `main`, live at dklapaukh.github.io/Pocket_Resus) into a clear, well-annotated, tested codebase that **reproduces the current app exactly**. Owner is a clinician with limited technical knowledge: explain terms simply, recommend one best option, keep replies short, show full option text when offering choices. NZ EAS CPGs (PDFs in repo are confirmed current) are ALWAYS the clinical authority.

## State
- Phase 1 (read-only audit) done. Documents: `01-REPOSITORY-AUDIT-COMPLETED.md`, `02-FEATURE-CONTRACT-COMPLETED.md`, `05-ARCHITECTURE-RISKS-PLAN.md`, `06-DECISIONS-LOG.md`, `baseline/` (engine script, output, file hashes).
- `main` = v16. **Baseline SHA `1dde71144e319868bc09df3f2bb2312724ae8eb6`**; `sw.js` cache `resus-pocket-v16-timer-spacing` confirmed; all 16 app files match `baseline/file-hashes.sha256`.
- Two screenshot sets taken from the live phone UI (Chrome, portrait, 1080×2340). Set 2 shows the v16 layout (countdown smaller, "+ Previous shock" no longer overlapping). Log tab (all), Log tab (interventions only) and the "…" menu are now filed in `baseline/screenshots/` with `baseline/BASELINE-NOTES.md`. The menu list scrolls and only the top part was captured.
- **Stage 0 done (engine level) and Stage 1 done** (2 Nov 2026): golden file made from the original engine; engine ported unchanged to `src/engine/`; `npm test` = 39 passing (golden, 300 random side-by-side runs, baseline script output, line-for-line fidelity, app-files-unchanged guard, plain-English characterisation). Tests were also shown to fail when a dose or energy number is altered. App, clinical logic and UI untouched.
- Not done in Stage 0: browser (Playwright) scenarios and multi-size screenshots (no browser here); real exported logs/JSON.
- **Stage 2a done** (2 Nov 2026): screen safety net built. A fake browser (jsdom, dev tool only) runs the real original app, taps/types through 6 scenarios (88 steps: tabs and menus, adult VF run to end/new patient, paediatric 15 kg + torsades + PEA + fluids, ROSC/re-arrest/post-ROSC checklist, no weight + previous shocks + note/IV/intubation/edit/void/checklist/custom medicine, reload mid-cycle + corrupt/wrong-version saved data). Captures header, main screen, sheet, toast, nav and saved data after every step; stored as hashes in `tests/golden/dom-original.json`. `npm test` = 48 passing. Proven to fail when an energy number, button wording or checklist wording is changed. Clock fixed, time zone fixed to UTC, repeatable.
- **Stage 2b done** (2 Nov 2026, needs upload + phone check): `app.js`, `guidance.js`, `explain-me.js`, `checklists.js`, `equipment.js` converted into 9 modules in `src/app/` (`base, state, data, format, session, views, sheets, events, main`) by a mechanical converter (`tools/split.mjs`): logic text unchanged, loose shared variables became one object `st` (e.g. `s` is `st.s`). `index.html` now loads only `src/app/main.js` (module); `sw.js` offline list updated and cache renamed `resus-pocket-v17-modules`. All 6 screen scenarios (88 steps) match the original golden hashes exactly. `npm test` = 51 passing (new `tests/modules.test.mjs`; `app-unchanged` now skips `index.html` and `sw.js`). Proven to fail when a button wording is changed. The original root JS files (`app.js`, `core.js`, etc.) are still in the repo, unused by the page, because older tests compare against them; move to `legacy/` at cleanup. Dormant code (pause handler, `causesView`, `liveChecklist`, record-rhythm-only sheet) is still present in the modules, verbatim.
- **Stage 2b confirmed:** owner uploaded it and the phone check passed (3 Nov 2026).
- **Stage 2c done** (3 Nov 2026, needs upload + phone check): dormant code removed from `src/app/` (pause handler, record-rhythm-only sheet, causes screen, single-item live checklist, "record action" note path, `liveCheckIndex`); listed in `docs/removed-or-dormant.md`. Saved/imported logs containing old pause/resume/rhythm/cause events still display. 4Hs/4Ts guidance prompts kept. Files changed: `events.js`, `sheets.js`, `state.js`, `views.js`. `npm test` = 51 passing; all 88 screen steps still match the original hashes. Unused CSS for the removed screens left for the CSS stage.
- **Stage 2c confirmed:** owner uploaded it and all phone checks passed (3 Nov 2026).
- **Stage 2d done** (3 Nov 2026, needs upload + phone check): all 9 modules in `src/app/` reformatted with Prettier (single quotes, width 100; run through `npx prettier@3`, **not** added to the repo) and given plain-English comments (file headers plus one above each function / listener). No logic changed: every module was tested after formatting, 51 passing, all 88 screen steps match the original hashes. Comments were written from the code, not just function names; if you find one that is wrong, fix the comment. `sw.js` not changed (network-first, so no cache bump needed).
- Next: **Stage 3**: check clinical flags C3–C6 against the online EAS guidelines (`docs/06-DECISIONS-LOG.md`, `docs/05-ARCHITECTURE-RISKS-PLAN.md` D2). Needs the owner to name the clinical reviewer first; preserve current behaviour until they respond. Also still open: unused CSS/images cleanup (see `docs/removed-or-dormant.md`).
- Stage 2 not covered by the fake browser: real layout/pixels, wake lock, install prompt, service worker, clipboard (these stay for the Playwright/phone checks).

## Decisions made by owner
1. Not rebuilt (historical): pause/resume, Reviewed/Suspected causes screen, "record rhythm only", VF/VT/torsades images, single-item live checklist. 4Hs/4Ts **guidance prompts** are kept.
2. Weights round **up** to CPG bands for drug doses (5, 10, 20, 30, 40 kg; above 40 kg treated as adult, "41 kg = 50 kg").
3. "+ Previous shock" just adds 1 to the shock count (no sheet): keep.
4. App is portrait only.
5. Old behaviour is reproduced FIRST. The changes below are made afterwards, one at a time, each with its own test and owner approval.

## Approved changes: apply only AFTER parity is proven
| ID | Change | Status |
|---|---|---|
| A1 | **Shock energy:** round weight up to the CPG weight band, multiply by 4 J/kg (bottom of the EAS 7.2 range), cap 200 J. Current app uses exact weight × 4 (42 kg shows 168 J; would become 50 kg → 200 J; 25 kg shows 100 J; would become 30 kg → 120 J). Owner said "round up to nearest 5 kg". The guideline bands are 5/10/20/30/40, which differ at 15 kg (5 kg steps: 60 J; bands: 20 kg band → 80 J) | **Owner confirmed: bands** (2 Nov 2026). Not yet applied |
| A2 | **Amiodarone card must not show from the start.** Proposed rule: appears when due (3 shocks in VF/VT including previous shocks; second dose at 6), stays once shown. Uses existing `amioDue` logic. Needs a decision on what fills the space before then | Owner confirmed proposed rule (**yes**, 2 Nov 2026). Still to decide: what fills the space before the card appears. Not yet applied |
| A3 | Portrait lock: add `"orientation":"portrait"` to `manifest.webmanifest` (works for the installed app, not for a normal browser tab) | Approved in principle |
| A4 | Countdown digits look too small in v16; enlarge without re-creating the "+ Previous shock" overlap | Approved in principle; size to be tuned with owner |
| A5 | Possible guard against double-tap recording a drug twice | Propose after testing; needs approval |
| A6 | Keep a backup of an unreadable saved session instead of silently discarding it | Awaiting owner yes/no |

## Open clinical flags (preserve current behaviour until ruled)
C3 paediatric pads prompt at ≤100 J (source?); C4 weights under 5 kg accepted; C5 amiodarone prompt requires current rhythm VF/VT; C6 check magnesium 20/30/40 kg bands and amiodarone second-dose values against EAS 7.2/14.4. After A1, the pads prompt threshold (energy ≤100 J) must be re-checked because it is tied to energy.

## Observations to preserve or fix later
- Post-ROSC live screen scrolls slightly (Post ROSC checklist button partly below the fold).
- `rhythms/` folder and two `.txt` files on GitHub are unused: leave until a deliberate cleanup.

## Working rules (token efficiency)
Read files on demand from the repo (`git clone`), not from pasted text. Do not re-print large files. Work stage by stage; stop at each checkpoint with a 5-line summary. Update this file at each checkpoint.

## Starter message for a new chat
"Continue the Pocket Resus rebuild. Read `07-HANDOFF-AND-CHANGE-BACKLOG.md` first, clone https://github.com/Dklapaukh/Pocket_Resus, and read the other numbered documents only when you need them. Start Stage 0."
