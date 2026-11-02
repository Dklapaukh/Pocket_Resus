# Hand-off (read this first in any new chat)

## Project
Rebuild Pocket Resus (https://github.com/Dklapaukh/Pocket_Resus, branch `main`, live at dklapaukh.github.io/Pocket_Resus) into a clear, well-annotated, tested codebase that **reproduces the current app exactly**. Owner is a clinician with limited technical knowledge: explain terms simply, recommend one best option, keep replies short, show full option text when offering choices. NZ EAS CPGs (PDFs in repo are confirmed current) are ALWAYS the clinical authority.

## State
- Phase 1 (read-only audit) done. Documents: `01-REPOSITORY-AUDIT-COMPLETED.md`, `02-FEATURE-CONTRACT-COMPLETED.md`, `05-ARCHITECTURE-RISKS-PLAN.md`, `06-DECISIONS-LOG.md`, `baseline/` (engine script, output, file hashes).
- `main` = v16. **Baseline SHA `1dde71144e319868bc09df3f2bb2312724ae8eb6`**; `sw.js` cache `resus-pocket-v16-timer-spacing` confirmed; all 16 app files match `baseline/file-hashes.sha256`.
- Two screenshot sets taken from the live phone UI (Chrome, portrait, 1080×2340). Set 2 shows the v16 layout (countdown smaller, "+ Previous shock" no longer overlapping). Log tab (all), Log tab (interventions only) and the "…" menu are now filed in `baseline/screenshots/` with `baseline/BASELINE-NOTES.md`. The menu list scrolls and only the top part was captured.
- **Stage 0 done (engine level) and Stage 1 done** (2 Nov 2026): golden file made from the original engine; engine ported unchanged to `src/engine/`; `npm test` = 39 passing (golden, 300 random side-by-side runs, baseline script output, line-for-line fidelity, app-files-unchanged guard, plain-English characterisation). Tests were also shown to fail when a dose or energy number is altered. App, clinical logic and UI untouched.
- Not done in Stage 0: browser (Playwright) scenarios and multi-size screenshots (no browser here); real exported logs/JSON.
- **Stage 2a done** (2 Nov 2026): screen safety net built. A fake browser (jsdom, dev tool only) runs the real original app, taps/types through 6 scenarios (88 steps: tabs and menus, adult VF run to end/new patient, paediatric 15 kg + torsades + PEA + fluids, ROSC/re-arrest/post-ROSC checklist, no weight + previous shocks + note/IV/intubation/edit/void/checklist/custom medicine, reload mid-cycle + corrupt/wrong-version saved data). Captures header, main screen, sheet, toast, nav and saved data after every step; stored as hashes in `tests/golden/dom-original.json`. `npm test` = 48 passing. Proven to fail when an energy number, button wording or checklist wording is changed. Clock fixed, time zone fixed to UTC, repeatable.
- Next: **Stage 2b** (move `app.js`, `guidance.js`, `explain-me.js` into `src/` modules with the same output; the DOM tests must still match). Needs the Stage 2a files uploaded to `main` first. Note: jsdom cannot run `<script type="module">`, so the test loader will bundle the modules for the fake browser; `index.html` and `sw.js` file list will change on purpose in 2b (guard test to be updated then). Open decisions for 2b: D3 (pause handler), D4 (dormant causes/single-item checklist), D6 (=A6 backup of unreadable saved session).
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
