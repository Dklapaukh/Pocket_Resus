# Hand-off (read this first in any new chat)

## Working tool
Currently: chat + zip upload (owner has no paid plan). IF the owner subscribes (Pro or above), switch to Claude Code (desktop app, Code tab): see `docs/08-CLAUDE-CODE-SETUP.md` and `CLAUDE.md`. Chat is kept for clinical decisions either way. Owner may only have a phone for some steps: the phone check works on a phone, uploading a multi-folder zip needs a computer.

## Project
Rebuild Pocket Resus (https://github.com/Dklapaukh/Pocket_Resus, branch `main`, live at dklapaukh.github.io/Pocket_Resus) into a clear, well-annotated, tested codebase that **reproduces the current app exactly**. Owner is a clinician with limited technical knowledge: explain terms simply, recommend one best option, keep replies short, show full option text when offering choices. NZ EAS CPGs (PDFs in repo are confirmed current) are ALWAYS the clinical authority.

## State
- **Done and confirmed on the phone:** Phase 1 audit; Stages 0, 1 (engine ported, golden tests); 2a (screen safety net); 2b (modules in `src/app/`); 2c (dormant code removed); 2d (formatting + comments, **uploaded? not yet confirmed**). Detail: `docs/09-STAGE-HISTORY.md`. Baseline SHA `1dde71144e319868bc09df3f2bb2312724ae8eb6` (v16); `docs/baseline/` holds the original engine script, output and file hashes.
- **Stage 3 done** (3 Nov 2026, docs only): owner ruled **C3 Keep, C4 Keep (see A1 ruling), C5 Keep, C6a Keep, C6b seek clinical advice** (`docs/06-DECISIONS-LOG.md`). Values were checked against the bundled EAS PDF export dated 24.09.2026; the live 7.2 page could not be opened by the tool.
- **A1 confirmed:** owner uploaded it and the phone check passed (3 Nov 2026). Detail in `docs/09-STAGE-HISTORY.md`.
- **A2 + C6b applied** (3 Nov 2026, **needs upload + phone check**): amiodarone card is hidden until a dose is due (3 VF/VT shocks, second dose at 6, earlier shocks count). Until then the lower drug slot shows a grey tile: "Amiodarone / Not yet due. Review after 3 shocks in VF / pulseless VT (second dose after 6, counting earlier shocks)." (no dose, no button). Once shown the card stays for that patient (also after undo/void; also whenever a dose is recorded, so it survives a reload). **C6b (owner ruling): for a child (40 kg or less) with one dose recorded and 6 shocks reached, the card dose line and its disabled button read "Seek clinical advice"; "Other…" still logs a dose; the Administration pop-up says "second dose: seek clinical advice".** Files: `src/app/{views,session,events,sheets,state}.js`, `precision.css` (one appended block). `sw.js` not changed. `npm test` = 60 passing. Phone check: tile in the lower slot at start, card at the 3rd VF shock, child 6th shock text, text fits in small and large-text mode.
- **A3 applied** (3 Nov 2026, **needs upload + phone check**): `"orientation": "portrait"` added to `manifest.webmanifest`. Only the installed (home-screen) app is locked; a normal browser tab is not. New `tests/a3-manifest-orientation.test.mjs`; `app-unchanged` lists the manifest as changed on purpose. `sw.js` unchanged. `npm test` = 62 passing. Phone check: remove the old home-screen icon, reload the site, add to home screen again (Android reads the manifest at install), then rotate the phone: it must stay upright. **Owner phone check (3 Nov 2026): FAILED, the app still rotated.** Cause not yet known; see Next.
- **A2 phone check (owner, 3 Nov 2026):** grey tile at start confirmed; gate bug found (previous shocks did not open the card).
- **A2b applied** (3 Nov 2026, **needs upload + phone check**): owner rule built. The amiodarone card opens when the shock counter reaches 3 (second dose at 6), counting "+ Previous shock", **whatever the current rhythm** (asystole or "Not recorded" is fine). Torsades at any point: magnesium holds the lower slot and amiodarone never shows. PEA at the latest rhythm check: lower slot = fluids; a later VF/VT brings amiodarone back if 3+ shocks and no torsades (with torsades history it returns to magnesium). Only change: the VF/VT-current-rhythm condition removed from `amioDue()` in `src/app/views.js` (engine `careMode` untouched). New `tests/a2b-amiodarone-gate.test.mjs` (10 tests; 2 shown to fail on the old gate). `npm test` = 72 passing. Phone check: (1) start, tap "+ Previous shock" 3 times: grey tile becomes the amiodarone card at the 3rd tap; (2) 3 shocks then record Asystole: card stays; (3) 3 shocks then PEA: fluids card, then a VF shock: amiodarone card returns; (4) a torsades shock at any point: magnesium card, no amiodarone.
- **C6b ruling (owner, 3 Nov 2026, NOT yet built):** between the first dose and 6 shocks, a child's card shows "Seek clinical advice" and adds a **"Select dose"** button (instead of the half-dose number and Record button). Needs one clarification before building: what "Select dose" does (see Next).
- Next: **A3-fix** (portrait lock did not work on the owner's phone; needs phone type, see Starter message), then **C6b-2** (child card between dose 1 and 6 shocks; first needs the "Select dose" answer), then A4, A5, A6, then the CSS/unused-file cleanup. **Test files:** upload `tests/` too.
- **Open edge case (owner may rule later):** the lower slot follows the LATEST of PEA/VF/VT/Torsades. So PEA followed by an Asystole check still shows fluids (asystole is ignored for the choice). Kept as in v16 (C5).
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
| A1 | **Shock energy:** round weight up to the CPG weight band, multiply by 4 J/kg (bottom of the EAS 7.2 range), cap 200 J. Current app uses exact weight × 4 (42 kg shows 168 J; would become 50 kg → 200 J; 25 kg shows 100 J; would become 30 kg → 120 J). Owner said "round up to nearest 5 kg". The guideline bands are 5/10/20/30/40, which differ at 15 kg (5 kg steps: 60 J; bands: 20 kg band → 80 J) | **Applied 3 Nov 2026** (owner: bands; apply to everyone incl. <5 kg; pads rule stays ≤100 J). Needs upload + phone check |
| A2 | **Amiodarone card must not show from the start.** Proposed rule: appears when due (3 shocks in VF/VT including previous shocks; second dose at 6), stays once shown. Uses existing `amioDue` logic. Needs a decision on what fills the space before then | **Applied 3 Nov 2026** (grey tile confirmed on phone). Gate corrected by **A2b** (3 Nov 2026, needs upload + phone check) |
| A3 | Portrait lock: add `"orientation":"portrait"` to `manifest.webmanifest` (works for the installed app, not for a normal browser tab) | **Applied 3 Nov 2026; phone check FAILED (app rotated)**, being investigated |
| A4 | Countdown digits look too small in v16; enlarge without re-creating the "+ Previous shock" overlap | Approved in principle; size to be tuned with owner |
| A5 | Possible guard against double-tap recording a drug twice | Propose after testing; needs approval |
| A6 | Keep a backup of an unreadable saved session instead of silently discarding it | Awaiting owner yes/no |

## Open clinical flags (preserve current behaviour until ruled)
C3, C5, C6a ruled **Keep**; C4 Keep for doses (energy now uses the 5 kg band under A1) (3 Nov 2026). **C6b:** child second amiodarone dose (half of first) has no EAS source; owner ruled the card reads "Seek clinical advice" (applied 3 Nov 2026, see State); the interim number question is open. Pads prompt (≤100 J) re-checked after A1: now applies to weights up to 20 kg (owner ruled 3 Nov 2026).

## Observations to preserve or fix later
- Post-ROSC live screen scrolls slightly (Post ROSC checklist button partly below the fold).
- `rhythms/` folder and two `.txt` files on GitHub are unused: leave until a deliberate cleanup.

## Working rules (token efficiency)
Read files on demand from the repo (`git clone`), not from pasted text. Do not re-print large files. Work stage by stage; stop at each checkpoint with a 5-line summary. Update this file at each checkpoint.

## End-of-task routine (keeps chats cheap)
Why: every message in a chat makes Claude re-read the whole conversation, so long chats cost more and get slower; a fresh chat only needs this file (about 3,000 tokens). So: **one task (or one stage) per chat.** At each checkpoint Claude must (1) update this file (State, Next) and `06` if a decision was made, (2) give the zip + upload/phone steps, and (3) finish with a ready-to-paste **Starter message** for the next chat, naming the exact next task and any decision needed, with full option text. Keep this file short: move finished-stage detail to `docs/09-STAGE-HISTORY.md`. Exception: if the next step is a quick answer to a question just asked, stay in the same chat.

## Starter message for a new chat
"Continue the Pocket Resus rebuild. Read `07-HANDOFF-AND-CHANGE-BACKLOG.md` first, clone https://github.com/Dklapaukh/Pocket_Resus, and read the other numbered documents only when you need them. Do the task named under State › Next. Follow the End-of-task routine. Status: A2b uploaded and phone check [passed / failed: say what you saw]. My phone for the A3 check is [iPhone or iPad / Android phone]. Next task: A3-fix. I am the clinical reviewer (D2). Show the full text of any options."
