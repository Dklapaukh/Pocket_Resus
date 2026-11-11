# Engine and rules guide

The engine is the part of the app that works out doses, energies, timers, counts and the log.
It never records a clinical event by itself; it only calculates from recorded events.

| File | What it holds |
|---|---|
| `src/rules/nz-eas.js` | **Every clinical number the engine uses** (weight bands, doses, energies, fluid volumes, timings, allowed rhythms). Plain data, one place to audit against the CPG. |
| `src/engine/core.js` | Session record, weight checks and bands, adrenaline/amiodarone references, shock energy, counts, timers, undo, complete rhythm checks. |
| `src/engine/rhythm-care.js` | Torsades, magnesium and fluid references, two-step rhythm checks, "+ Previous shock", checklist prompt. |
| `src/engine/log-view.js` | Log filters shared by the log screen and text export. |
| `src/engine/index.js` | Combines the three files into the `Resus` object the app uses. |

## How correctness is proven
The readable engine replaced the original compact one on 11 Nov 2026 (owner-approved):
- `tests/side-by-side.test.mjs` runs the original engine (root `core.js` etc., plus A1) and the
  current one through 3000 random case sequences; every state and derived value must match.
- `tests/golden.test.mjs` and `tests/dom-golden.test.mjs` compare against recordings of the
  original app.
- `tests/rules-file.test.mjs` checks each rules-file value against the EAS tables (page notes
  in the test).
Changing one value (tested with a magnesium dose) fails all three.

## Known quirks kept on purpose
- Magnesium and child fluid references read the weight without the decimal-comma conversion,
  so a saved weight like "15,5" gives no band / NaN (normal entry never saves this; doc 11).
- The engine's own `careMode` is the original PEA-only rule, kept only for the side-by-side test.
  The live app uses `lowerCard` in `src/engine/drug-cards.js` (A2c, A7).
- The drug-card rules (amiodarone gate, child second dose, A5 locks) are in `src/engine/drug-cards.js`
  since 12 Nov 2026, with their numbers and reference wording in the rules file. Longer guideline
  extracts (checklists, guidance pop-ups) are still text in `src/app/data.js` and `sheets.js`.
