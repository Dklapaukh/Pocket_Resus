# Reference recordings (stage 0 safety net)

**What this is.** Thousands of generated cases were played on the reference app (v22 plus approved
changes A8 to A12, A16 and A18, commit named in each file's header; re-recorded for A9 from 062e27a, A10 from 04d2b32, A11 from ae7f337, A12 from 7ed57db, A16 from 1093424 and A18 from 24e73f1, 14 Nov 2026) through the fake browser: a "person" taps buttons,
types into boxes and lets time pass, only doing what could be done on a phone (nothing greyed out,
hidden or behind an open pop-up is pressed). After **every step** everything visible was recorded
(header with weight and clocks, the Live screen with its cards and status lines, any pop-up and what
is typed in it, the message strip, the tabs and text size, any app error, exported text), and,
separately, what the app saved on the phone. Later stages must leave all of it identical.

| File | What |
|---|---|
| `screens.json` | what the person sees, step by step (one line per case) |
| `saved-sessions.json` | what the app saved, and any complete JSON record downloaded, step by step |
| `lib/cases.mjs` | the case generator: 9 fixed sweeps (cases 0-8) then 12 themes in turn, seeded, fixed clock (read this to see what is exercised) |
| `lib/driver.mjs` | the "person" tapping the real app in the fake browser |
| `record.mjs` | makes the recordings (run on purpose only) |
| `show.mjs` | readable before/after for one case |
| `coverage.mjs`, `census.mjs` | which code lines, and which clinical behaviours, the cases reach |
| `deep.test.mjs` | replays every recorded case (`npm run test:deep`) |

The screens and the saved session are in separate files on purpose: a later stage adds one field to
the saved session; that changes `saved-sessions.json` only, and `screens.json` must stay as it is.
This works for an ADDED saved field. If a later stage RENAMES or REMOVES a saved field, the cases
themselves may play differently, because the "person" paces the case by reading what the app saved
(for example how long the cycle has left, or the last adrenaline time). That gives false alarms in
`screens.json` (differences that are not app faults), never missed faults. Then: first make the case
generator read the new name (raise `GENERATOR_VERSION`, re-record from the SAME reference commit and
check the screens are unchanged), and only then re-record for the saved-session change.

**How it was made.** `node tests/reference/record.mjs --commit 91843ae` (since A18: `--commit 24e73f1`) (the commit named in the file
headers; how many cases, and how many are in the fast set, come from `RECORDED_CASES` and `FAST_CASES`
in `lib/cases.mjs`, so this plain command reproduces the committed files). The app is taken
from that commit with `git archive` (not from the working copy). Each case is fixed by its number: the
seed, the theme and the clock (start 14 Nov 2023 22:13:20 UTC, time zone UTC; the midnight case and every
40th regular case start just before midnight instead) never change, so the same
commit and generator give byte-identical files. For each step a 4-character fingerprint of each surface
that changed is kept, plus a full-strength fingerprint of the whole case, so the files stay small but
any difference is found and located (case, step, surface). Typed or chosen values in boxes are recorded
too (pop-up, Live screen, Log filters). The tools put the reference app in a new temporary folder (system
temp folder, named `pocket-resus-reference-…`) and remove it again when they finish.

**What runs where.**
- `npm test` runs `tests/reference-screens.test.mjs`: the **fast set** (the first `fastCases` cases,
  every theme equally), and `tests/reference-planted-changes.test.mjs` (see below).
- `npm run test:deep` replays **every** recorded case.

**When a test fails.** The message names the case, the step, the surface, the taps just before and the
lines around the first change (taken from the reference commit when git is available). If this
computer's Node major version or jsdom version differs from the one in the file headers, the message
says so first: time and date text can then differ everywhere.
Then `node tests/reference/show.mjs <case> --step <n>` (add `--part saved` for the saved session,
`--full` for everything) plays that case on the reference commit and on the working copy and prints
the readable before/after.

**The rule (same as golden files).** These recordings are never edited, and never re-recorded to make
a test pass. They are re-recorded only for an owner-approved A-table change (doc 07), from the commit
that contains that change, and the commit message says so. If the case generator itself must change,
raise `GENERATOR_VERSION` in `lib/cases.mjs` and re-record from the SAME reference commit as before
(the header says which), so the recording still describes the reference. If only the saved session
changes on purpose, re-record and check that `screens.json` is byte-for-byte unchanged.
To check that a re-record is byte-identical to what is committed: run the plain command above on a clean
working copy, then `git status --short tests/reference` must show nothing (or
`git diff --exit-code -- tests/reference/screens.json tests/reference/saved-sessions.json` exits with 0).

**Planted changes.** `tests/reference-planted-changes.test.mjs` copies the app to a temporary folder,
makes one realistic small edit (a dose, an energy, a lock time, a status line, a pop-up trigger, the A8
rule, one age in the weight estimate, one tube size, midnight times, …) and requires the recordings to
find a difference. Each edit names a hint (a fast-set case that catches it), replayed first to keep
`npm test` quick; if the hint no longer catches it, the whole fast set is replayed and the output says
so and gives the new hint. `PLANTED_FULL_SCAN=1` ignores all hints. The
unchanged app is first replayed on every hint case and must match exactly; a change only counts as
caught on a case where the unchanged app matches (so a change that does nothing can never pass). It also fails if an edit's search
text is no longer in the source exactly once, so the proof cannot quietly stop working; if code moves,
update the search text to the new code with the same kind of change.

**Sweeps (cases 0-8, always in the fast set).** Per-value formulas and tables are tried value by value,
not by chance: weight from age and tube sizes for every whole year 0-15 plus 0.01, 0.5, 0.99, 10.5, 14.5,
16, 120, 121 and bad entries; just below, on and just above every weight-band edge (5, 10, 20, 30, 40
kg), RSI cap and rounding edges, maximum and refused weights, each in the adrenaline, amiodarone,
magnesium, fluids and RSI pop-ups and cards; every equipment size, both laryngoscopy blade lists, every
access site, every checklist item and reversible cause; a case running across midnight; every time
threshold just below, on and just above it (cycle captions at 30 s and 15 s, yellow panel, due at 0,
overdue "+" after 1 s, checklist reminder at 90 s left, adrenaline lock 3 min 30 s and highlight 30 s
before review, adrenaline overdue after 4 min, magnesium and fluids 5 s locks, the one-hour clock style);
and the characters ' " < > & typed into every free-text box that is shown again (event notes, medicine
names, dose notes, equipment notes, corrected details, unit and route), then the Log and every export.

**Size (recorded from commit 91843ae, generator version 3).** 3,609 cases (9 sweeps + 3,600 themed),
258,234 steps, 6 screen surfaces and 2 saved surfaces per step; `screens.json` 2.2 MB,
`saved-sessions.json` 0.85 MB. The fast set is the first 249 cases (the 9 sweeps and 20 per theme,
under a minute); it still shows every behaviour on the stage 0 list (`census.mjs --to 248`).
The deep set is all 3,609 (about 8-10 minutes).

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

**Rules file in the fake browser (stage 1).** The clinical rules are `src/rules/nz-eas.yaml`, read by
`src/rules/load.js`. A phone fetches that file; the fake browser cannot, so `tests/helpers/rules-for-fake-browser.mjs`
leaves the loader out of the bundle and gives the app the rule set read (with the same reader,
`src/rules/parse.js`) from the `nz-eas.yaml` of the app folder being run. The reference commit (before the
rules file) has no loader and runs as it was. A planted-change copy is edited in its own `nz-eas.yaml`.
