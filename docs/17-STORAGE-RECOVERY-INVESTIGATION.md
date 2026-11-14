# 17. Saved-session recovery (how it works now)

Start-up and updates from another tab use one check, `restoreSaved` in `src/engine/core.js`:
- A version 1 save with an event list and a start time is loaded. Any missing part is filled with
  the new-session default; recorded events and audit history are never changed.
- A valid comma weight ("15,5") is converted to a decimal point. Undo copies get the same
  treatment; an unusable undo copy is dropped.
- When a repair was made, the raw save is kept under `resus-pocket-v1-repaired-backup`. No message
  is shown. A complete, normal save is loaded untouched.
- A save that fails the check is copied to `resus-pocket-v1-unreadable-backup` (A6: one copy only,
  with a short message, no restore screen) and a new case starts.

Test: `tests/step2-saved-session-repair.test.mjs`. The app has a JSON export but no import.

Before changing recovery: work from real historical save formats (fictional or de-identified
data), keep the original record, make recovery visible rather than silently replacing a session,
and test start-up, cross-tab and undo together, including storage-write failures.
