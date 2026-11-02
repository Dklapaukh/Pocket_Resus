# Verification and clinical safety

## Test matrix
- Pure tests: weight/dose/energy calculations at boundary values; missing/invalid input; clock formatting; event timestamps; filter/export fidelity.
- Transition tests: start → rhythm check → shock/no shock → repeat; rhythm branch switching; ROSC → re-arrest; prior shock; reset; medication record/review.
- Timing tests: fake clocks, background/sleep, refresh, drift, duplicate taps, deadlines and alerts.
- Persistence tests: save/reload, corrupt or unavailable storage, migrations, session isolation.
- UI tests: narrow/short phones, landscape, tablet, zoom, long text, keyboard/touch, no overlap or unintended scroll on active screen.
- Accessibility: contrast, focus order, screen-reader labels, colour-independent cues, touch targets, reduced motion.
- Golden-master tests: screenshots and event exports from original versus rebuilt app for identical scripted scenarios.

## Clinical safety gate
All clinical algorithms, drug doses, weight thresholds, shock energies, timing recommendations, reference citations and patient-specific displays require clinician-led review against the approved guideline version. Do not invent a dose, fix a perceived clinical issue silently, or substitute general internet medical advice. Flag discrepancies for decision. Separate technical verification from independent clinical validation, human-factors testing, governance approval and regulatory assessment.

## Release gates
Code review by human developer; clinical review by authorised clinician(s); documented regression results; staging smoke test; offline/device behaviour review; security/privacy review; deployment rollback plan. No release solely because tests pass.
