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

## Still open
| ID | Question | Status |
|---|---|---|
| C2 | Shock energy is calculated from the **exact** weight (4 J/kg), not from the rounded-up band. Drug doses use the rounded-up band. Example: 5.1 kg → doses use the 10 kg band, but energy shows 20.4 J (bundled EAS 7.2 lists 40–50 J for the 10 kg band). 41 kg → doses as for 50 kg, energy 164 J (not 200 J) | Needs clinical ruling against the online EAS guideline. **Rebuild keeps current numbers until ruled** |
| C3–C6 | Pads prompt source; weights under 5 kg; amiodarone prompt rule; magnesium/second-dose table values | To check against the online EAS guidelines in Stage 3 |
| Dormant | `liveChecklist()` (single-item checklist on live screen) is unused | Recommend dropping, same reason as decision 1 |
