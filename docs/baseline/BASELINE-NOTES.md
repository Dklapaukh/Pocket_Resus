# Baseline notes

## Source baseline
- Repo: https://github.com/Dklapaukh/Pocket_Resus, branch `main`
- **Commit SHA: `1dde71144e319868bc09df3f2bb2312724ae8eb6`** (recorded 2 Nov 2026, Stage 0)
- `sw.js` on `main`: cache name `resus-pocket-v16-timer-spacing` (confirmed)
- All 16 app files match `file-hashes.sha256`; `baseline-core-engine.output.txt` is reproduced exactly by the original engine.

## Real-phone screenshots (Chrome, Android, portrait, 1080×2340, 2 Nov 2026, v16)
Folder: `screenshots/`. Session shown: weight 42 kg, shock energy 168 J (confirms today's exact-weight × 4 J/kg, change A1).

| File | Shows |
|---|---|
| `01-settings-menu-top.jpg` | "…" menu, titled "Session & display". Visible items: Tutorial, Undo last action, Larger text, Screen kept awake (ticked), Add to home screen, Earlier shocks / doses / cycles, Edit resus start, Clinical guidance & sources, Export event log (cut off). The menu scrolls; anything below "Export event log" is not captured |
| `02-log-all-events-top.jpg` | Log tab, top. Header (Pt weight, App session, Resus duration, "…"). "Event log", Export button, Show = All events, Checklists = Each item, help text, date/time-zone line, "+ Add event / earlier event" |
| `03-…-scrolled-1.jpg`, `04-…-scrolled-2-before-app-shock.jpg` | Log, All events, scrolled. Rows show clock time, "+mm:ss resus" offset, title, details, edit pencil. The "Before app" shock row says "Time not set" and has an "Add time / edit details" button |
| `05-log-interventions-only.jpg` | Show = Interventions only. The Checklists box is greyed out and the help text says checklist items are excluded |
| `06-log-all-events-checklist-items.jpg` | All events with each checklist tick/untick listed as its own row ("Checked: …", "Unmarked: …") |

Header reads "Resus start 13:52:40 · ROSC" or "· Active" under the filter text (state-dependent).

## Test baseline (Stage 0/1)
- `tests/golden/engine.golden.json` is generated from the ORIGINAL root engine files (`core.js`, `rhythm-care.js`, `log-view.js`).
- Run all checks with `npm test`. Regenerate golden data only on purpose: `npm run golden`.
- Not yet captured (needs a real browser, not available in this environment): Playwright scripted scenarios and viewport screenshots at the other sizes; exported logs and `resus-pocket-v1` JSON from real sessions.
- Engine code only covers part of the app: `rearrest`, weight change, edit/void and checklist ticking logic live in `app.js` and are covered from Stage 2.
