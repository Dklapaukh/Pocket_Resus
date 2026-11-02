# Target architecture (proposal, adapt to actual source)

Keep layers separate:

1. `domain/` — typed session state, events, clinical workflow transitions, invariants; no UI or browser dependencies.
2. `clinical/` — versioned reference data, medication rules, dose/energy calculations, provenance, validation.
3. `timing/` — monotonic clock abstraction, cycle deadlines, reminders, reconciliation after background/sleep.
4. `application/` — commands/use cases coordinating domain logic and persistence; deterministic event recording.
5. `persistence/` — versioned session storage, migrations, recoverability, safe failure handling.
6. `ui/` — components, responsive layout, keyboard/touch interactions and accessibility; no embedded clinical arithmetic.
7. `exports/` — pure selectors and clipboard formatting; filters never mutate canonical log.
8. `tests/` — unit, transition, integration, visual and end-to-end regression tests.

Use the existing stack if maintainable; do not introduce React, Redux, databases, backend or dependencies merely for fashion. Explicitly compare simpler alternatives.

Model clinical workflow as explicit named states and guarded transitions. Record user actions as timestamped events with stable IDs and separate **event occurrence time** from **display clock**. Keep derived values derived, not independently mutable. Prevent duplicate event recording. Document storage limitations and offline operation.

### Future compatibility (not an immediate deliverable)
Support a data-driven conditional flowchart/workflow engine with nodes, guarded edges, actions, timers, forms and logs. Later provide a visual editor, validation, simulation and publishing. Do **not** build a no-code platform during this parity rebuild. Active workflow screens should adapt to device dimensions without scrolling; editing/reference views may scroll.
