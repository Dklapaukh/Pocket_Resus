# Decisions log

## Baseline facts
- GitHub: https://github.com/Dklapaukh/Pocket_Resus, branch `main`, commit `1476ba1465c0f9372ef26df6267b03fa7bf72614` (29 Oct 2026, "Add files via upload").
- **GitHub `main` is OLDER than the uploaded zip.** Identical: `core.js`, `rhythm-care.js`, `guidance.js` and others. Different: `app.js` (zip adds compact entry screens and auto-sizing note boxes), `rhythm-care.css` (zip adds compact entry-screen styling), `sw.js` (GitHub cache `v13-log-filters`; zip `v16-timer-spacing`).
- GitHub also holds files the zip lacks: `rhythms/` (vf.png, vt.svg, torsades.svg, SOURCES.txt), `GITHUB-SETUP.txt`, `GITHUB-UPDATE.txt`. No code in either version references `rhythms/`.
- **Baseline for the rebuild = the uploaded zip** (newest, contains your latest changes). Its file hashes are in `baseline/file-hashes.sha256`.

## Owner decisions (recorded)
| # | Decision | Effect on rebuild |
|---|---|---|
| 1 | Pause/resume, Reviewed/Suspected causes screen, "record rhythm only", and VF/VT/Torsades images are historical and not needed | Not rebuilt. Not carried over. 4Hs/4Ts **guidance prompts** (live feature) are kept |
| 2 | Weights are always rounded up to the next CPG weight band (e.g. 41 kg treated as 50 kg) | Drug-dose behaviour for >40 kg is intended; flag C1 closed |
| 3 | The NZ EAS Clinical Practice Guidelines are ALWAYS the authority | Every number in `clinical/` must cite an EAS guideline number; any code/guideline difference is reported, never silently kept or fixed |
| 4 | **C3 Keep:** paediatric pads prompt at energy ≤100 J stays. No EAS source found (EAS 3.14 only says anterior/posterior pads for small children) | Rule kept; threshold re-checked after A1, see decision 9 |
| 5 | **C4 Keep:** weights under 5 kg accepted; doses use the 5 kg band, energy = exact weight × 4 | Doses unchanged. Energy for <5 kg now follows A1 (5 kg band = 20 J), see decision 8 |
| 6 | **C5 Keep:** amiodarone prompt matches EAS 3.14 (300 mg after 3 shocks, 150 mg after 6, withhold in torsades) | No change (3 Nov 2026) |
| 7 | **C6a Keep:** magnesium 4/6/8 mmol for 20/30/40 kg, none for 5/10 kg, matches bundled EAS 7.2 table (PDF export dated 24.09.2026; live page could not be opened by the tool) | No change (3 Nov 2026) |
| 8 | **A1 applied to everyone, including weights under 5 kg** (3 Nov 2026): energy = 4 J/kg × CPG weight band (rounded up), 200 J above 40 kg | Code + tests changed. Examples: 3 kg 20 J; 15 kg 80 J; 25 kg 120 J; 42 kg 200 J |
| 9 | **Pads prompt keeps the rule "energy ≤100 J"** (3 Nov 2026) | After A1 it covers weights up to 20 kg (80 J); 21 to 40 kg no longer get the prompt (25 kg did before) |
| 10 | **A2b amiodarone gate (owner rule, 3 Nov 2026):** card opens at 3 shocks (second dose at 6), counting previous shocks, whatever the current rhythm; torsades at any point = magnesium keeps the lower slot, amiodarone never; PEA at the latest check = fluids, and a later VF/VT can bring amiodarone back if criteria are met | Built in `amioDue()` (`views.js`); engine unchanged; 10 tests |
| 12 | **A6 (owner, 4 Nov 2026): build it, with a message.** A saved session the app cannot read is copied to `resus-pocket-v1-unreadable-backup` before a new case starts, and a short message is shown (a different one if the copy cannot be stored) | Built in `state.js` + `main.js`; one backup only; no restore screen; 6 tests |

## 11 Nov 2026
- **Engine safeguard replaced (owner-approved):** the exact-line fidelity and syntax-tree tests were retired so the engine could be rewritten readably with clinical numbers in `src/rules/nz-eas.js`. Equivalence is now proven by 3000 side-by-side random sequences against the original engine, the golden recordings, and a rules-file test against the EAS tables.
- **A7:** "Other" triggers fluids. **Not added:** fentanyl hypertension threshold; extra amiodarone contraindications.

## 14 Nov 2026 (editor decisions are numbered in doc 18)
- **Rule set file format: YAML** (doc 18 decision 9). Replaces plain JSON (chosen 12 Nov 2026, built in stage 1). Built in step E1b; live from the next release.
- **Editor:** no version-history screens, only the current version number (doc 18 decision 26). A rule set goes live when confirmed in the editor (doc 18 decision 20; replaces "goes live through GitHub", 12 Nov 2026).
- **Store apps:** developer accounts under the owner's personal name. **Design principle:** the app is not a clinical calculator; it shows only what the guideline dose tables say (doc 18 decision 27; what is still calculated is listed in doc 11).
- **A8:** "Option A" meant updating the step 2 comparison test. **v23** passed the owner's phone check.

## Still open
| ID | Question | Status |
|---|---|---|
| C2 | ~~Energy from exact weight~~ | **Closed:** replaced by change A1 (band × 4 J/kg), applied 3 Nov 2026 |
| 11 | **A2c fluids for any non-shockable rhythm (owner, 3 Nov 2026):** PEA or Asystole at the latest check = fluids; VF/VT bring amiodarone (or magnesium after torsades) back; "Other" does not trigger (**superseded by A7, 11 Nov 2026: owner ruled "Other" triggers fluids**). Wording (Option 1): heading "Fluids · guideline extract", pop-up "Non-shockable rhythm · fluid guidance" after PEA or Asystole, body text unchanged | Built in `careMode()` (`session.js`); engine unchanged; 11 tests |
| C6b | Child **second amiodarone dose** in the app (half of the first) has no source: EAS 7.2 has one amiodarone row only; 3.14 and 14.4 say "see paediatric dose tables" | **Owner: seek clinical advice** (3 Nov 2026). **3 Nov 2026 (A2 task): owner ruled the card reads "Seek clinical advice" when a child's second dose is due; applied** (dose line + disabled button + Administration pop-up). **Owner ruling 3 Nov 2026 on the interim number:** show "Seek clinical advice" plus a "Select dose" button between the first dose and 6 shocks (built as C6b-2, 3 Nov 2026: Select dose = option A, an empty dose box, nothing suggested; the second dose of either age group is only an option from the 6th shock) |
| Dormant | `liveChecklist()` (single-item checklist on live screen) is unused | Recommend dropping, same reason as decision 1 |
