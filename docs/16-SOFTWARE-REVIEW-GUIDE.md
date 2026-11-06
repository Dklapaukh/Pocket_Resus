# Software review guide

This guide is for a software reviewer new to the project. Pocket Resus is a
static, offline-capable cardiac arrest support and event-recording app. The
owner is a clinician. This review is about software quality and traceability;
it is not a request to approve clinical guidance. Independent clinical review
is planned separately. Use fictional data only.

## Start here

1. Read the [developer code map](10-DEVELOPER-CODE-MAP.md), especially session
   storage and the example traces. `index.html` loads `src/app/main.js`.
2. Read [the engine guide](12-READING-THE-ENGINE.md). The compact engine source
   is intentional: an exact-line test pins it to the original logic, with the
   separately approved A1 energy change. The root JavaScript files are test
   baselines, not the code loaded by the live page.
3. See the [readability assessment](14-READABILITY-ASSESSMENT.md) for the
   author's subjective assessment and known limits, and the [clinical rule
   inventory](11-CLINICAL-RULE-INVENTORY.md) for source and review gaps.

## Run the checks

Follow the [README](../README.md#tests). Use an LF-preserving checkout: some
tests deliberately compare exact source lines or baseline file hashes. The
full Node suite checks behaviour, displayed output, original engine fidelity,
storage and several event workflows. Do not weaken the fidelity test or update
golden files just to make a refactor pass. The optional local Chrome script
needs Playwright and Chrome in addition to the package-lock dependencies.

## Useful questions for a fresh reader

- Can you trace a suggested medicine reference separately from a recorded
  administration, including the guards and manual-entry path?
- Can you trace a rhythm outcome from the initial action to the final rhythm,
  the selected lower card and the saved event?
- Can you follow a correction, void, undo and complete JSON export, and see
  which values are retained in the audit trail?
- Can you follow startup, write failure, cross-tab updates and unreadable-data
  backup? Validation is deliberately shallow and differs across load paths;
  the code map, comma-weight note in doc 11 and [storage investigation](17-STORAGE-RECOVERY-INVESTIGATION.md)
  explain the limits.
- Can you understand timer expiry and offline cache upgrades without assuming
  that time passing records treatment? The v19 release passed desktop tests;
  the preceding v18 build, not v19, was reported as passing the phone check.

Concrete confusing locations, incorrect comments, missing tests and suggested
improvements are more useful than a numerical readability score. Keep
clinical questions separate from software findings and preserve recorded
behaviour and the engine fidelity check while investigating.
