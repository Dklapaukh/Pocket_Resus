# Storage recovery investigation

**Fixed 12 Nov 2026 (doc 07 step 2).** Start-up and updates from another tab now use one check,
`restoreSaved` in `src/engine/core.js`: a version 1 save with an event list and a start time is
loaded; any missing part is filled with the new-session default (recorded events and audit
history are never changed); a valid comma weight is converted; undo copies get the same
treatment and an unusable undo copy is dropped. The raw save is kept under
`resus-pocket-v1-repaired-backup` (separate from the A6 unreadable backup, so neither overwrites
the other). No message is shown for a repair. A complete, normal save is loaded untouched.
Test: `tests/step2-saved-session-repair.test.mjs`. Investigation as written before the fix:

This is a software investigation, not clinical validation. No real session
was inspected. The issue below was reproduced with deliberately constructed
data in the test harness; its occurrence on a real device is unknown.

## Incomplete data can pass the startup check

The startup check in `src/app/state.js` accepts a version 1 object when
`events` is an array and `appStart` is finite. It does not check every field
used by the app. In the jsdom test harness, storing this constructed value
under `resus-pocket-v1` is enough to pass that check:

```json
{"version":1,"events":[],"appStart":1}
```

No unreadable-data backup is created for that value. Opening Settings then
fails because `openSettings` reads `st.s.undo.length`, but `undo` is absent.
The handler reports an unhandled promise rejection in the harness. This is a
demonstrated defect for the constructed state; it does not establish that a
normal session or any particular prior release produces this state.

The cross-tab handler checks only version and event array before replacing
the in-memory session, which is a separate entry path. Undo can restore an
earlier snapshot. A saved comma-formatted weight is another constructed edge
case; see [doc 11](11-CLINICAL-RULE-INVENTORY.md).

## Before changing recovery

Work from real, representative historical session schemas where available,
using fictional or appropriately de-identified data. Decide how to preserve
the original record and make recovery visible without silently replacing a
potentially useful session. The existing unreadable-data backup retains only
one raw copy and has no in-app restore screen. Assess startup, cross-tab and
undo together, and test storage-write failures, valid historical sessions,
incomplete sessions, and retention of events and audit history. Changes to
clinical calculations or displayed guidance require their own review.
