# Removed or dormant code

Owner decision 1 (historical features not rebuilt). Removed from `src/app/` in Stage 2c (3 Nov 2026).
The original root files (`app.js`, etc.) still contain all of it until cleanup, so nothing is lost.
After removal, all 6 screen scenarios (88 steps) still match the original golden hashes.

| Removed | Was in | Why it was safe |
|---|---|---|
| Pause / resume handler (`action==='pause'`) | `events.js` | No button on any screen sent this action |
| "Record rhythm only" sheet and its button handler (`data-only-rhythm`) | `events.js` | No button opened it |
| Reviewed / Suspected / Record action screen (`causesView`, `causeState`) and its click handler | `views.js`, `events.js` | Never shown; no tab or button led to it |
| Single-item live checklist (`liveChecklist`), its ‹ › handler, the auto-advance after ticking, and `liveCheckIndex` | `views.js`, `events.js`, `state.js` | Never shown on the live screen |
| "Record action" version of the note sheet (cause path in `openNote` and note submit) | `sheets.js`, `events.js` | Only reachable from the removed causes screen |

## Deliberately kept
- 4Hs/4Ts **guidance prompts** (`CAUSES` list, `data-cause-guide`): in use (decision 1).
- Log display and editing of old `pause`, `resume`, `rhythm` and `cause` events, so saved sessions or imported logs that contain them still open.
- The rhythm-picking sheet used when recording a shock / no shock / ROSC (its context is also called `rhythm`: different feature, in use).

## Left for later cleanup
- Unused CSS for the removed screens (e.g. `.live-checklist`, `.cause`, `.cause-actions`) in the stylesheets: handle at the CSS stage so pixels are checked on a phone.
- Unused VF/VT/torsades images and the `rhythms/` folder.
