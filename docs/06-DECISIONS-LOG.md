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

## Still open
| ID | Question | Status |
|---|---|---|
| C2 | ~~Energy from exact weight~~ | **Closed:** replaced by change A1 (band × 4 J/kg), applied 3 Nov 2026 |
| C6b | Child **second amiodarone dose** in the app (half of the first) has no source: EAS 7.2 has one amiodarone row only; 3.14 and 14.4 say "see paediatric dose tables" | **Owner: seek clinical advice** (3 Nov 2026). **3 Nov 2026 (A2 task): owner ruled the card reads "Seek clinical advice" when a child's second dose is due; applied** (dose line + disabled button + Administration pop-up). **Owner ruling 3 Nov 2026 on the interim number:** show "Seek clinical advice" plus a "Select dose" button between the first dose and 6 shocks (not built yet; see doc 07 › State) |
| Dormant | `liveChecklist()` (single-item checklist on live screen) is unused | Recommend dropping, same reason as decision 1 |
