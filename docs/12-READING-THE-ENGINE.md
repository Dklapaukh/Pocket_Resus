# Reading the compact engine

The three files in `src/engine/` retain compact original logic because
`tests/engine-fidelity.test.mjs` compares their logic lines against the root
baseline, with the separately pinned A1 energy change. The syntax-tree test
is additional protection, not a replacement. Do not reformat those lines or
weaken either check just to improve their appearance. This guide gives the
compact code a readable outline without changing it.

## Core: one session and its events

`fresh(now)` creates a session in Ready phase with a two-minute remaining
cycle, empty events and undo history. Timestamps are milliseconds since the
epoch. `validWeight` accepts a positive number up to 500 with at most one
decimal place. `estimate`, `isPaediatric`, `dose`, `joules` and
`needsPaediatricPads` derive references; they do not record treatment. Their
clinical boundaries and decisions are indexed in the clinical-rule inventory.

`active` excludes voided events. `counts` combines earlier counts with active
shock, no-shock and amiodarone events, in event-time order for the no-shock
streak. `latest` returns the latest active event of a type. `timing` computes
remaining cycle time and medicine clocks from timestamps; an expired timer
never creates an event.

`snapshot` saves a copy for undo, retaining at most 30 snapshots. `add` appends
an event; it does not snapshot on its own. Callers must understand which
operations take a snapshot before changing state. `begin` starts a cycle.
`check` validates a recorded outcome, snapshots, appends it, and either stops
at ROSC or starts another cycle. `undo` returns a restored session rather than
mutating all fields of the current one in place.

### Reading an example without executing treatment

For a valid weight of 15 kg, `dose` selects the first band that is at least
the weight: 20 kg. Its returned reference includes 0.2 mg adrenaline and
100 mg for first amiodarone. This calculation creates no event. The engine
also returns a second amiodarone value, but the live child workflow applies
the later C6b decisions instead of showing that value as a recommendation.
The separate A1 `joules` rule uses the 20 kg band and returns 80 J. These
examples explain current code, not independent confirmation of dosing.

`timing` derives its result each time it is called. For example, after a
cycle begins at time T, its deadline is T + 120,000 milliseconds. At T +
120,000, the computed time left is zero. Neither `timing` nor the screen
tick appends an event. Similarly, the adrenaline field is the latest active
adrenaline event's time plus 240,000 milliseconds minus now; it can become
negative after the review time. The display chooses how to present it.

`counts` sorts active shock and no-shock events by their recorded time to
derive the streak, starting with the earlier recorded streak. A shock resets
that streak; a no-shock increments it. It also adds prior counts to active
events. Voided events are not in `active`; correcting an event's time can
change its ordering and therefore the derived streak. None of these
projections is an extra entry in the record.

## Rhythm and support

`hasTorsades` checks the current rhythm and active events. The engine's
`careMode` is the original PEA-only selector; the live screen instead uses
`app/state.js` and its later A2c decision. `magnesiumReference` and
`fluidReference` return suggestions, while `supportStats` summarizes active
recorded events. Do not confuse a reference with an administration.

`startOutcome` records the selected shock/no-shock and starts a cycle before
its rhythm details are completed. `completeOutcome` updates that pending event
only when the ID and allowed rhythm match. `addPreAppShock` explicitly marks
its time as unknown. `checklistPrompt` derives the arrest-checklist reminder
from active state, time remaining and an active adrenaline event.

For a permitted rhythm check, `startOutcome` snapshots first, records the
chosen shock or no-shock with rhythm `Unknown`, starts the next cycle and
stores the event ID in `pendingRhythm`. `completeOutcome` only updates that
same pending, non-voided event after checking its allowed rhythm and energy;
it takes another snapshot before updating. The app has separate steps for
confirmation, saving and dialogs, so follow `selectRhythm` and `saveRhythm`
as well as these engine functions.

## Log projection

`logEntries` derives rows for the selected scope and checklist display. In
checklist-times mode, `checklistTimes` creates synthetic start/finish rows
from active item events; those rows are not new clinical events. Voided-event
handling depends on the requested option. `shockEnergy` supplies the shock
reference, with a 200 J default when weight is empty.

The synthetic checklist rows are assembled from active item events sorted by
recorded time. A first checked item yields a start row; all items checked
yields a finish row. Unchecking after completion can yield a reopened row.
Those summaries are generated for display or export, not appended to the
session's event list. The intervention filter is a separate path, and its
voided-event inclusion depends on the caller's `includeVoided` choice.

Trace the caller as well as the engine before changing anything: the app has
additional visibility, recording, correction and lock rules. See
[the code map](10-DEVELOPER-CODE-MAP.md) and
[clinical inventory](11-CLINICAL-RULE-INVENTORY.md).
