# CSS cleanup step 2 (4 Nov 2026, owner chose Option 1)

Deleted the CSS rules that name a class or id used by **no live screen** (the page `index.html` and `src/`; the old root `app.js` etc. do not count, they are dormant). All belonged to features the owner removed earlier (decision 1) or to old layouts.

**Totals:** 134 whole rules deleted, 8 rules kept but with their one dead selector taken out of a shared list (for example `.weight-row .weight-button, .weight-row .weight-joules` became `.weight-row .weight-button`), and 1 media block removed because it became empty (`precision.css`). The handoff said 132: the two extra are `.mark.m15` and `.mark.m30` in `style.css`.

| File | Before | After |
|---|---|---|
| `style.css` | 14,642 bytes | 12,226 |
| `phone.css` | 24,456 | 19,639 |
| `precision.css` | 33,272 | 31,376 |
| `rhythm-care.css` | 8,269 | 8,171 |

The appended A2 block (`precision.css`) and A4 block (`rhythm-care.css`) were not touched.

## How it was checked

1. For each rule, every class and id in its selector was searched for in `index.html` and `src/**/*.js` (plain text search, so lenient). The app only ever adds or removes classes by literal name (no names built from pieces), so nothing in use was removed.
2. Real Chrome, before and after (`tools/snapshot-computed-styles.py`): 120 screen states (about 20 screens and pop-ups at 3 phone sizes, normal and larger text), 14,840 element comparisons of computed style and position: **no difference** (a few timing-driven elements vary by themselves between two runs of identical code and were allowed for).
3. `tools/check-countdown-layout.py`: output identical before and after (0 overlaps, same digit sizes).
4. `npm test`: 112 passing (108 + 4 new in `tests/css-cleanup-step2.test.mjs`; 5 of its 6 tests fail on the old CSS). `tests/golden/` untouched.
5. New fingerprints are in `baseline/css-cleanup-step2-hashes.sha256`; the original v16 ones stay in `baseline/file-hashes.sha256`. `precision.css` and `rhythm-care.css` fingerprints cover the part before the A2 / A4 block.

## Rules removed, by file (selector only)

### `style.css`
Deleted: `.brand-row`, `.brand-cross`, `.weight-joules`, `.weight-joules b`, `.timer-top`, `.timer-top button`, `.mark.m30`, `.mark.m15`, `.count-box`, `.count-box strong`, `.count-box span`, `.count-box small`, `.event-actions`, `.event-actions button`, `.event-actions small`, `.rhythm-line`, `.rhythm-line button`, `.page-intro`, `.cause-group`, `.cause-actions`, `.cause-actions button`, `.cause-status`, `.segmented`, `.segmented button`, `.segmented button[aria-pressed=true]`, `.gauge-ticks`, `.status-banner`, `.status-banner b`, `.special-banner`, `.large .event-actions button`, `.brand-row h1`.

Shared lists trimmed: `.large .page-intro,.large .sheet-content  ->  .large .sheet-content`.

### `phone.css`
Deleted: `.weight-row .weight-joules`, `.weight-joules b`, `.weight-joules span`, `.weight-joules>span:first-child`, `.weight-joules>span:first-child+b`, `.timer-top`, `.timer-corner`, `.timer-top button`, `.timer-top .unexpected-rosc`, `.timer-panel.due .timer-top`, `.timer-panel.ready .timer-top`, `.count-box`, `.count-box strong`, `.count-box span`, `.count-box small`, `.current-rhythm`, `.live-checklist`, `.live-check-heading`, `.live-check-heading>button`, `.live-check-heading>span`, `.live-check-heading>div`, `.live-check-heading>div button`, `.live-check-item`, `.live-check-item input`, `.live-check-item small`, `.live-check-item time`, `.site-picker`, `.site-picker>span`, `.site-picker .toggle`, `.site-picker .toggle span`, `.entry-progress`, `.large.live-mode .live-check-item`, `.timer-panel:not(.ready):not(.due):not(.stopped) .timer-top`, `.timer-panel.stopped .timer-top`, `.counts .count-box:first-child`, `.tube-strip`, `.tube-strip .toggle`, `.tube-strip .toggle span`, `.tube-strip small`, `.gauge-ticks button`, `.gauge-ticks`, `#headerWeight .weight-joules`, `#headerWeight .weight-joules b`, `#headerWeight .weight-joules span`, `.counts .count-box`, `.counts .count-box span`.

Shared lists trimmed: `.weight-row .weight-button,.weight-row .weight-joules  ->  .weight-row .weight-button`; `.weight-row .weight-button,.weight-row .weight-joules  ->  .weight-row .weight-button`; `#headerWeight .weight-button,#headerWeight .weight-joules  ->  #headerWeight .weight-button`.

### `precision.css`
Deleted: `#headerWeight .weight-joules`, `#headerWeight .weight-joules b`, `#headerWeight .weight-joules span`, `.live-mode .timer-panel .timer-top,.live-mode .timer-panel .timer-corner`, `.live-mode .timer-panel .timer-corner button`, `.live-mode #pauseCycle`, `.ring-marks path`, `.ring-marks text`, `.counts .count-box`, `.counts .count-box:first-child`, `.counts .count-box span`, `.counts .count-box strong`, `.segmented button[aria-pressed=true]`, `.segmented button`, `.live-mode #timerPanel #pauseCycle`.

Shared lists trimmed: `.primary,.check-back,.segmented button[aria-pressed=true],.toggle input:checked+span  ->  .primary,.check-back,.toggle input:checked+span`; `.notice,.special-banner  ->  .notice`; `#headerWeight .weight-button,#headerWeight .weight-joules  ->  #headerWeight .weight-button`; `#headerWeight .weight-button strong,#headerWeight .weight-joules b  ->  #headerWeight .weight-button strong`.

Also: removed now-empty @media block.

### `rhythm-care.css`
Deleted: `.rhythm-credits`, `.rhythm-credits p`.
