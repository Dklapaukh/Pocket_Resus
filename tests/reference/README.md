# Reference recordings (stage 0 safety net)

**What this is.** Thousands of generated cases were played on the reference app (v22 plus approved
change A8, commit named in each file's header) through the fake browser: a "person" taps buttons,
types into boxes and lets time pass, only doing what could be done on a phone (nothing greyed out,
hidden or behind an open pop-up is pressed). After **every step** everything visible was recorded
(header with weight and clocks, the Live screen with its cards and status lines, any pop-up and what
is typed in it, the message strip, the tabs and text size, any app error, exported text), and,
separately, what the app saved on the phone. Later stages must leave all of it identical.

| File | What |
|---|---|
| `screens.json` | what the person sees, step by step (one line per case) |
| `saved-sessions.json` | what the app saved, and any complete JSON record downloaded, step by step |
| `lib/cases.mjs` | the case generator: 12 themes, seeded, fixed clock (read this to see what is exercised) |
| `lib/driver.mjs` | the "person" tapping the real app in the fake browser |
| `record.mjs` | makes the recordings (run on purpose only) |
| `show.mjs` | readable before/after for one case |
| `coverage.mjs`, `census.mjs` | which code lines, and which clinical behaviours, the cases reach |
| `deep.test.mjs` | replays every recorded case (`npm run test:deep`) |

The screens and the saved session are in separate files on purpose: a later stage adds one field to
the saved session; that changes `saved-sessions.json` only, and `screens.json` must stay as it is.

**How it was made.** `node tests/reference/record.mjs --commit <reference commit>`. The app is taken
from that commit with `git archive` (not from the working copy). Each case is fixed by its number: the
seed, the theme and the clock (start 14 Nov 2023 22:13:20 UTC, time zone UTC) never change, so the same
commit and generator give byte-identical files. For each step a 4-character fingerprint of each surface
that changed is kept, plus a full-strength fingerprint of the whole case, so the files stay small but
any difference is found and located (case, step, surface).

**What runs where.**
- `npm test` runs `tests/reference-screens.test.mjs`: the **fast set** (the first `fastCases` cases,
  every theme equally), and `tests/reference-planted-changes.test.mjs` (see below).
- `npm run test:deep` replays **every** recorded case.

**When a test fails.** The message names the case, the step, the surface and the taps just before.
Then `node tests/reference/show.mjs <case> --step <n>` (add `--part saved` for the saved session,
`--full` for everything) plays that case on the reference commit and on the working copy and prints
the readable before/after.

**The rule (same as golden files).** These recordings are never edited, and never re-recorded to make
a test pass. They are re-recorded only for an owner-approved A-table change (doc 07), from the commit
that contains that change, and the commit message says so. If the case generator itself must change,
raise `GENERATOR_VERSION` in `lib/cases.mjs` and re-record from the SAME reference commit as before
(the header says which), so the recording still describes the reference. If only the saved session
changes on purpose, re-record and check that `screens.json` is byte-for-byte unchanged.

**Planted changes.** `tests/reference-planted-changes.test.mjs` copies the app to a temporary folder,
makes one realistic small edit (a dose, an energy, a lock time, a status line, a pop-up trigger, the A8
rule, …), replays the fast set until the first difference and requires one. It also fails if an edit's
search text is no longer in the source exactly once, so the proof cannot quietly stop working; if code
moves, update the search text to the new code with the same kind of change.

**Size (recorded from commit 91843ae, generator version 1).** 3,600 cases, 255,830 steps, 6 screen
surfaces and 2 saved surfaces per step; `screens.json` 2.2 MB, `saved-sessions.json` 0.85 MB. The fast
set is the first 360 cases (30 per theme, about 1 minute); the deep set is all 3,600 (about 8 minutes).

**What the cases reach** (`coverage.mjs`, fast set): 2,381 of 2,485 code lines in `src/app` and
`src/engine` (95.8%); the full set reaches the same lines. `census.mjs` shows every behaviour on the
stage 0 list in at least 3 fast-set cases and at least 48 of all cases. Not reached, and why:
- no button or element leads there: the "arrest-checklist" action, the `data-checklist` tap branch,
  the size slider / size unit / cannula gauge handlers, an invalid tube size (only valid sizes can be
  chosen), the amiodarone-after-torsades warning in the manual form (the amiodarone card is never shown
  after torsades), the engine's one-step shock/no-shock record (the app always uses two steps), the old
  `careMode` rule (kept for the side-by-side test);
- the phone's browser blocks it first: a correction with a zero or negative dose (the dose box refuses it);
- safety checks behind greyed-out buttons (e.g. the adrenaline lock check when the button is already
  greyed out): a person cannot tap a greyed-out button;
- "Enter weight" / "Weight needed" on a card: only possible with an invalid weight in damaged saved data;
- browser features the fake browser lacks: install prompt, screen wake lock, clipboard API, layout
  (note box height, tutorial scroll progress), another tab changing the session, storage full;
- repair of damaged saved sessions (covered by `step2-saved-session-repair`, `a6-…` and
  `cross-tab-session` tests).
Results depend on the Node and jsdom versions named in the file headers (time and date formatting).
