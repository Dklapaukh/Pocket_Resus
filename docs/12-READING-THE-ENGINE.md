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
- The engine's own `careMode` is the original PEA-only rule. The live app uses `careMode` in
  `src/app/state.js` (A2c, A7). Planned: move the live rule into the engine (doc 07).
- Clinical rules still in the app layer (amiodarone gate, child second dose, A5 locks, wording)
  are listed in doc 07 as the next step.
