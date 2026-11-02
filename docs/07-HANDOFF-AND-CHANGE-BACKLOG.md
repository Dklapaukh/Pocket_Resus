# Hand-off (read this first in any new chat)

## Working tool
Currently: chat + zip upload (owner has no paid plan). IF the owner subscribes (Pro or above), switch to Claude Code (desktop app, Code tab): see `docs/08-CLAUDE-CODE-SETUP.md` and `CLAUDE.md`. Chat is kept for clinical decisions either way. Owner may only have a phone for some steps: the phone check works on a phone, uploading a multi-folder zip needs a computer.

## Project
Rebuild Pocket Resus (https://github.com/Dklapaukh/Pocket_Resus, branch `main`, live at dklapaukh.github.io/Pocket_Resus) into a clear, well-annotated, tested codebase that **reproduces the current app exactly**. Owner is a clinician with limited technical knowledge: explain terms simply, recommend one best option, keep replies short, show full option text when offering choices. NZ EAS CPGs (PDFs in repo are confirmed current) are ALWAYS the clinical authority.

## State
- **Done and confirmed on the phone:** Phase 1 audit; Stages 0, 1 (engine ported, golden tests); 2a (screen safety net); 2b (modules in `src/app/`); 2c (dormant code removed); 2d (formatting + comments, **uploaded? not yet confirmed**). Detail: `docs/09-STAGE-HISTORY.md`. Baseline SHA `1dde71144e319868bc09df3f2bb2312724ae8eb6` (v16); `docs/baseline/` holds the original engine script, output and file hashes.
- **Stage 3 done** (3 Nov 2026, docs only): owner ruled **C3 Keep, C4 Keep (see A1 ruling), C5 Keep, C6a Keep, C6b seek clinical advice** (`docs/06-DECISIONS-LOG.md`). Values were checked against the bundled EAS PDF export dated 24.09.2026; the live 7.2 page could not be opened by the tool.
- **A1 applied** (3 Nov 2026, **needs upload + phone check**): `joules()` in `src/engine/core.js` now = 4 J/kg of the CPG weight band (5/10/20/30/40 kg, rounded up, 200 J above 40 kg, weights under 5 kg use the 5 kg band = 20 J). Owner rulings: apply to everyone; pads prompt keeps rule "energy ≤100 J" so it now covers weights up to 20 kg only. Also changed: the energy tooltip and one guidance sentence in `views.js`. Checked on the 6 screen scenarios: the only differences from before were 60 J → 80 J (15 kg) and the tooltip. `npm test` = 53 passing (new `tests/a1-energy.test.mjs`; golden files regenerated on purpose, differences limited to energy and pads fields). `sw.js` not changed (network-first).
- Next: **A2** (amiodarone card only when due; still to decide what fills the space before it appears), then A3, A4, A5, A6, then the CSS/unused-file cleanup. **C6b** stays open until the owner gets clinical advice (child second amiodarone dose, half of first, has no EAS source).
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
| A2 | **Amiodarone card must not show from the start.** Proposed rule: appears when due (3 shocks in VF/VT including previous shocks; second dose at 6), stays once shown. Uses existing `amioDue` logic. Needs a decision on what fills the space before then | Owner confirmed proposed rule (**yes**, 2 Nov 2026). Still to decide: what fills the space before the card appears. Not yet applied |
| A3 | Portrait lock: add `"orientation":"portrait"` to `manifest.webmanifest` (works for the installed app, not for a normal browser tab) | Approved in principle |
| A4 | Countdown digits look too small in v16; enlarge without re-creating the "+ Previous shock" overlap | Approved in principle; size to be tuned with owner |
| A5 | Possible guard against double-tap recording a drug twice | Propose after testing; needs approval |
| A6 | Keep a backup of an unreadable saved session instead of silently discarding it | Awaiting owner yes/no |

## Open clinical flags (preserve current behaviour until ruled)
C3, C5, C6a ruled **Keep**; C4 Keep for doses (energy now uses the 5 kg band under A1) (3 Nov 2026). **C6b open:** child second amiodarone dose (half of first) has no EAS source; owner seeking clinical advice; behaviour preserved. Pads prompt (≤100 J) re-checked after A1: now applies to weights up to 20 kg (owner ruled 3 Nov 2026).

## Observations to preserve or fix later
- Post-ROSC live screen scrolls slightly (Post ROSC checklist button partly below the fold).
- `rhythms/` folder and two `.txt` files on GitHub are unused: leave until a deliberate cleanup.

## Working rules (token efficiency)
Read files on demand from the repo (`git clone`), not from pasted text. Do not re-print large files. Work stage by stage; stop at each checkpoint with a 5-line summary. Update this file at each checkpoint.

## End-of-task routine (keeps chats cheap)
Why: every message in a chat makes Claude re-read the whole conversation, so long chats cost more and get slower; a fresh chat only needs this file (about 3,000 tokens). So: **one task (or one stage) per chat.** At each checkpoint Claude must (1) update this file (State, Next) and `06` if a decision was made, (2) give the zip + upload/phone steps, and (3) finish with a ready-to-paste **Starter message** for the next chat, naming the exact next task and any decision needed, with full option text. Keep this file short: move finished-stage detail to `docs/09-STAGE-HISTORY.md`. Exception: if the next step is a quick answer to a question just asked, stay in the same chat.

## Starter message for a new chat
"Continue the Pocket Resus rebuild. Read `07-HANDOFF-AND-CHANGE-BACKLOG.md` first, clone https://github.com/Dklapaukh/Pocket_Resus, and read the other numbered documents only when you need them. Do the task named under State › Next. Follow the End-of-task routine."
