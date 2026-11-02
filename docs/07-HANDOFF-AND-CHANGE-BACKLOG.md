# Hand-off (read this first in any new chat)

## Project
Rebuild Pocket Resus (https://github.com/Dklapaukh/Pocket_Resus, branch `main`, live at dklapaukh.github.io/Pocket_Resus) into a clear, well-annotated, tested codebase that **reproduces the current app exactly**. Owner is a clinician with limited technical knowledge: explain terms simply, recommend one best option, keep replies short, show full option text when offering choices. NZ EAS CPGs (PDFs in repo are confirmed current) are ALWAYS the clinical authority.

## State
- Phase 1 (read-only audit) done. Documents: `01-REPOSITORY-AUDIT-COMPLETED.md`, `02-FEATURE-CONTRACT-COMPLETED.md`, `05-ARCHITECTURE-RISKS-PLAN.md`, `06-DECISIONS-LOG.md`, `baseline/` (engine script, output, file hashes).
- Owner has uploaded the latest local files (v16, cache `v16-timer-spacing`) to `main`. Get the new commit SHA with `git ls-remote` and record it. Before Stage 0, confirm `sw.js` on `main` contains `v16-timer-spacing`.
- Two screenshot sets taken from the live phone UI (Chrome, portrait, 1080×2340). Set 2 shows the v16 layout (countdown smaller, "+ Previous shock" no longer overlapping). Still wanted from owner: Log tab (all), Log tab (interventions only), the "…" settings menu.
- Next: Stage 0 (baseline scripts + golden tests) → Stage 1 (port and pin the engine files). See plan in `05`.

## Decisions made by owner
1. Not rebuilt (historical): pause/resume, Reviewed/Suspected causes screen, "record rhythm only", VF/VT/torsades images, single-item live checklist. 4Hs/4Ts **guidance prompts** are kept.
2. Weights round **up** to CPG bands for drug doses (5, 10, 20, 30, 40 kg; above 40 kg treated as adult, "41 kg = 50 kg").
3. "+ Previous shock" just adds 1 to the shock count (no sheet): keep.
4. App is portrait only.
5. Old behaviour is reproduced FIRST. The changes below are made afterwards, one at a time, each with its own test and owner approval.

## Approved changes: apply only AFTER parity is proven
| ID | Change | Status |
|---|---|---|
| A1 | **Shock energy:** round weight up to the CPG weight band, multiply by 4 J/kg (bottom of the EAS 7.2 range), cap 200 J. Current app uses exact weight × 4 (42 kg shows 168 J; would become 50 kg → 200 J; 25 kg shows 100 J; would become 30 kg → 120 J). Owner said "round up to nearest 5 kg". The guideline bands are 5/10/20/30/40, which differ at 15 kg (5 kg steps: 60 J; bands: 20 kg band → 80 J) | **One question open:** confirm bands (recommended) vs every-5-kg |
| A2 | **Amiodarone card must not show from the start.** Proposed rule: appears when due (3 shocks in VF/VT including previous shocks; second dose at 6), stays once shown. Uses existing `amioDue` logic. Needs a decision on what fills the space before then | Owner agrees card should not show from the start; **confirm proposed rule** |
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
