# Clinical rule and recording inventory

This is a source-to-implementation index of the current application at base
`72b3eeb` plus the local readability edits. It describes software behaviour,
not independent clinical validation. Source labels below are those recorded by
the application or decisions log; they do not assert that every displayed
phrase or calculation has been checked against the cited passage. The bundled
EAS exports are dated 24 September 2026 according to the app. Page numbers
are provided only where the app links to one. Decisions in docs 06 and 07
supersede earlier project notes. Tests establish software behaviour, not
clinical approval.

## Assessment and medicine references

| Rule and boundaries currently implemented | Trace | Source / decision and review status | Test entry points |
| --- | --- | --- | --- |
| Weight accepts >0 to 500 kg, at most one decimal; age estimate: under 1 year 5 kg, integer ages 1–10 `(age+4)×2` kg, 11–14 `age×3` kg; otherwise no estimate. | `engine/core.js`: `validWeight`, `estimate`; `app/sheets.js`: `openWeight`; `app/events.js`: `save-weight` | EAS 7.2 (`cpg-paediatric-equipment.pdf`); app warns estimate may underestimate and excludes newborn resuscitation. Exact passage and age-boundary review outstanding. | `characterisation`, `golden`, `dom-golden` |
| Weight ≤40 kg is child; dose bands round up to 5, 10, 20, 30, 40 kg. Adrenaline band/100 mg, amiodarone first band×5 mg. Above 40 kg or empty weight, engine reference is adult 1 mg adrenaline and 300/150 mg amiodarone. Invalid weight yields no reference. Engine also calculates band×2.5 mg for second amiodarone; the live child card suppresses it. | `core.js`: `dose`, `isPaediatric`; `app/state.js`: `drugDose`; `app/views.js`: `drugCard` | EAS 7.2; C4 and weight-band decisions; C6b rejects the child second-dose number as unsourced. Empty-weight reference and whether a card can actually record are separate questions. Exact table cells need independent review. | `characterisation`, `golden`, `c6b2-second-amiodarone`, `dom-golden` |
| Energy is 4 J/kg of the rounded-up band, 200 J above 40 kg; prompt for paediatric pads when calculated energy ≤100 J (currently through 20 kg). An empty weight defaults to 200 J in the shock reference, while header requests weight. | `core.js`: `joules`, `needsPaediatricPads`; `engine/log-view.js`: `shockEnergy`; `app/views.js`: `weightHeader` | A1 and C3, docs 06/07. Owner retained pad threshold; doc 06 records no EAS source found for that threshold. Adult EAS wording is maximum defibrillator setting, while app caps at 200 J. | `a1-energy`, `engine-fidelity`, `dom-golden` |
| CPR cycle 120 s; adrenaline review 240 s after latest active dose; countdown warns at 30 and 15 s. A timer reaching zero does not record treatment. | `core.js`: `CYCLE`, `ADR`, `timing`, `begin`; `app/views.js`: `tick` | EAS 3.14 (`cpg-cardiac-arrest.pdf`); reminder presentation is app behaviour. Exact passage and reminder thresholds need independent review. | `golden`, `side-by-side`, `dom-golden` |
| Amiodarone appears at 3 counted shocks, including previous shocks and irrespective of current rhythm, unless another lower card takes precedence; once shown it persists for the patient, also when a dose exists. At one dose and <6 shocks adult shows due after 6; child offers an empty manual dose form with clinical advice. At ≥6 shocks adult reference is 150 mg and child shows clinical advice. Torsades history withholds routine amiodarone. | `app/views.js`: `amioDue`, `amioCardVisible`, `drugCard`; `app/state.js`: `secondAmioEarly`, `childSecondAmio`, `careMode` | EAS 3.14/14.4 (`cpg-drugs/eas-14-4.pdf`); A2, A2b, C5, C6b, C6b-2 and A2c in docs 06/07. The early child manual-entry path records what was given; it is not a suggested second dose. | `a2-amiodarone-card`, `a2b-amiodarone-gate`, `c6b2-second-amiodarone` |
| Latest relevant PEA or Asystole selects fluids; VF/VT/Torsades select magnesium if torsades has occurred, otherwise amiodarone. Other/Unknown do not themselves trigger fluids. The older engine helper is PEA-only and is not the live selector. | `app/state.js`: `latestLowerRhythm`, `careMode`; `engine/rhythm-care.js`: `careMode`, `hasTorsades` | A2c owner decision; whether Other should trigger fluids remains open. Do not silently resolve it. | `a2c-fluids-non-shockable`, `dom-golden` |
| Magnesium reference: adult/empty weight 10 mmol; child bands 20/30/40 kg give 4/6/8 mmol; 5/10 kg have no listed dose and seek advice. Routine card permits up to two recorded doses and requires confirmation for repeat. | `engine/rhythm-care.js`: `magnesiumReference`, `supportStats`; `app/session.js`: `recordSupport`; `app/views.js`: `supportCard`; `app/sheets.js`: `supportAdministration` | EAS 3.14, 14.27 and 7.2; C6a retained. Administration text and exact source passages need independent review. | `characterisation`, `golden`, `a5-double-tap-guard`, `dom-golden` |
| Fluids reference requires valid weight: child exact weight ×20–40 mL; adult 1,000–2,000 mL. Actual volume is manually entered; total includes active mL events. | `engine/rhythm-care.js`: `fluidReference`, `supportStats`; `app/session.js`: `recordSupport`; `app/sheets.js`: `supportAdministration` | EAS 3.14; A2c governs card selection, not the volume. Exact source and scope need independent review. | `characterisation`, `golden`, `a2c-fluids-non-shockable` |
| Adrenaline quick record locked for 210 s after latest active dose; magnesium and fluids quick paths locked for 5 s. Manual Other form is separate; undo or correction can affect derived locks. Special situation disables routine prompts; ROSC/end also restrict routine recording. | `app/state.js`: `A5_LOCK_MS`, `lockLeft`; `app/session.js`: `recordSupport`; `app/events.js`; `app/views.js`: `drugCard`, `tick` | A5 owner decision, not a guideline dosing interval. | `a5-double-tap-guard`, `dom-golden` |
| Administration instructions: adrenaline adult undiluted; child 1 mg diluted to 10 mL (0.1 mg/mL). Amiodarone undiluted; magnesium preparation, repeat, timing and line caution appear in its info sheet. | `app/sheets.js`: `administration`, `torsadesSnippet`, `supportAdministration` | App cites EAS 3.14, 14.3, 14.4, 14.27 and 7.2; bundled drug PDFs exist for 14.3/14.4, 14.27 is linked online. Exact text and applicability need independent review. | `dom-golden`, `characterisation` |
| RSI uses exact entered weight: fentanyl 2 mcg/kg, ketamine 2 mg/kg or reduced 1 mg/kg, blocker 2 mg/kg; each capped at 200 in its displayed unit. Above 40 kg blocker rounded to nearest 50 mg before cap. Conditional indications and alternatives are displayed alongside. | `app/views.js`: `guidance`, `referenceSheet` | EAS 9.3 (`cpg-rsi.pdf`); exact passage, rounding boundary and all conditions need independent review. References do not record administrations. | `dom-golden` (scenario coverage only; no claim of exhaustive boundaries) |
| Age <1 shows cuffed ETT 3–4 mm and length size×3 cm; ages 1–14 show age/4+3.5 mm and age/2+12 cm. iGel ranges displayed 2–5 through 90+ kg. Equipment choices, sites and colours are fixed lists, not automatic selections. | `app/views.js`: `referenceSheet`; `app/data.js`: `ARREST_EQUIPMENT`, `ARREST_SITES`, `COLOURS`; `app/sheets.js`: `openEquipment` | App links EAS 7.2 and credits Intersurgical for iGel ranges/colours. Exact age zero behaviour and source passages require review. | `dom-golden` (scenario coverage only) |

## Workflow, documentation and recording rules

| Behaviour | Trace | Source / decision and review status | Test entry points |
| --- | --- | --- | --- |
| Rhythm check after cycle expiry records shock or no-shock immediately with unknown rhythm; completing the sheet updates that event. ROSC stops clocks and opens post-ROSC checklist; re-arrest starts a new cycle. Allowed rhythms and shock energy validation are explicit. | `engine/rhythm-care.js`: `startOutcome`, `completeOutcome`; `core.js`: `check`, `begin`; `app/session.js`: `saveRhythm`; `app/events.js`: `rearrest` | Workflow of original app; no inference that rhythm or treatment occurred from a timer. Review source/clinical appropriateness independently. | `golden`, `side-by-side`, `dom-golden` |
| Previous shock records a countable event with unknown time before app start; earlier counts in history need not have individual timestamps. | `engine/rhythm-care.js`: `addPreAppShock`; `core.js`: `counts`; `app/events.js`: history and previous-shock actions | Owner decision 3 and A2b. | `a2b-amiodarone-gate`, `dom-golden` |
| Arrest, post-ROSC, RSI preparation and RSI checklists record checked/unchecked item events; a tick is review, not treatment. The arrest checklist attention prompt needs active CPR, ≥90 s remaining and an active adrenaline event. | `app/data.js`: `ARREST_CHECKLISTS`; `app/events.js` change handler; `app/views.js`: `checkStatus`, `checksView`; `engine/rhythm-care.js`: `checklistPrompt` | Labels link EAS 3.14 page 2, 3.15 page 2, 9.2 and 9.4 respectively. Exact item-by-item transcription and prompt policy require review. | `golden`, `dom-golden` |
| Eight 4H/4T guidance prompts are fixed text; they do not record a diagnosis or treatment. | `app/data.js`: `CAUSES`; `app/views.js`: `guidanceGrid` | App cites ANZCOR 11.2 for reversible causes and local protocol. Clinical wording/source mapping remains to review. | `dom-golden` |
| Custom medicine form records actual name, positive dose, unit, route and time; equipment and notes are recorded separately. The form can record a dose even where routine suggestions are restricted. | `app/sheets.js`: `openDrug`, `openEquipment`, `openNote`; `app/events.js`: submit handler | Recording workflow, not a dosage recommendation. | `dom-golden`, `c6b2-second-amiodarone` |
| Corrections retain prior values in audit, update derived counters and medicine clocks, and do not restart a cycle. Voids remain in audit but leave active counts; state-change events cannot be voided here and their times cannot be changed here. Undo restores the previous snapshot. | `app/events.js`: edit and void handlers; `app/session.js`: `syncRhythm`; `core.js`: `active`, `counts`, `undo` | App audit policy; independently review clinical record requirements. | `golden`, `side-by-side`, `dom-golden` |
| Log filters select all events or interventions; checklist summary synthesizes start/finish from active ticks. Text export uses the chosen view and excludes voided entries; JSON retains session/audit data. | `engine/log-view.js`: `logEntries`, `checklistTimes`; `app/sheets.js`: `exportText`, `exportSheet`; `app/state.js`: `logRows` | App recording/export policy; not a clinical rule. Clipboard and real-device export need device checks. | `golden`, `side-by-side`, `dom-golden` |

## Locating passages in the bundled exports

Page numbers below are PDF pages as well as printed page numbers. These are
navigation pointers based on text extraction, not a visual or clinical review
of the source tables.

- EAS 3.14 pages 1–2: cycle and drug timing, shockable rhythm, torsades,
  PEA fluid guidance and the arrest checklist. The source describes fluids
  under PEA; A2c deliberately extends the app's card to Asystole. The app's
  A2b visibility gate also counts shocks regardless of current rhythm, while
  the guideline's amiodarone instruction is framed around VF/VT.
- EAS 7.2 page 1: weight bands, age estimates, tube formulae and energy;
  page 2: adrenaline preparation; pages 4–5: magnesium preparation and the
  first weight table; subsequent pages contain the other band tables.
  The app's under-1 tube-length display does not separately implement the
  newborn formula listed on page 1. Applicability needs clinical review.
- EAS 9.3 pages 1–2 and 4: RSI drug conditions, calculated doses and
  summary tables. EAS 14.3 page 2: cardiac-arrest adrenaline preparation;
  EAS 14.4 pages 1–2: indications, contraindications and arrest doses.
- EAS 3.15 page 2, EAS 9.2 page 1 and EAS 9.4 page 1 are the linked
  post-ROSC, preparation and RSI checklist locations respectively; compare
  each item visually before calling it a verified transcription.

## Focused passage comparison, 6 November 2026

The following comparisons were made against rendered pages of the bundled
24 September 2026 exports and the live code. They are a limited software
source review, not independent clinical validation or a review of the whole
CPG. Existing behaviour and owner decisions have not been changed.

| Source passage | Comparison with implementation | Follow-up |
| --- | --- | --- |
| EAS 3.14 pp. 1–2: two-minute cycles, IV adrenaline every four minutes, adult amiodarone after three and six shocks in VF/VT, including earlier shocks. | Timer intervals and adult reference amounts match those stated. The app gate counts shocks regardless of current rhythm (A2b) and may continue to show the card; visibility is not an instruction that the guideline's rhythm condition is met. | Preserve A2b; clinical reviewer should assess presentation in context. Reminder thresholds and recording guards are app policies. |
| EAS 3.14 p. 2: withhold amiodarone if torsades is present or has occurred; adult magnesium 10 mmol over 1–2 minutes, repeat once if persistent or recurrent; fluids 1–2 L adult or 20–40 mL/kg child under PEA. | References and repeat limit correspond to these passages. A2c also offers fluids after asystole; Other remains unresolved. | Preserve decisions and seek clinical review of the extension; check paediatric magnesium tables separately. |
| EAS 7.2 p. 1: age-based weight estimates and airway formulae; 4 J/kg; drug tables based on rounded-up bands. | The listed formulae and bands are represented in the app. The app has discrete integer age boundaries for the weight estimate, applies a separate approved band-based energy rule, and does not separately display the newborn length formula. The source presents newborn and under-one length rows. | Clinical review of fractional-age gaps, newborn applicability, and A1's energy interpretation remains outstanding. |
| EAS 9.3 pp. 1–2 and 4: conditional fentanyl, ketamine, and alternative neuromuscular blockers; adult and child dose tables and maxima. | App calculations express the stated weight-based values and caps. The app's brief fentanyl summary says hypertension without the source's adult systolic threshold or child context, and omits timing immediately before ketamine. The source includes wider RSI indications, assessment and procedure context that the summary does not reproduce. | Review whether the abbreviated wording is appropriate; use the full guideline for context. Check rounding and every boundary separately. Do not change wording or recommendations without clinical decision. |

Additional visual comparison: EAS 14.3 page 2's cardiac-arrest administration
section specifies undiluted IV bolus for adults and children rounded to 50 kg
or more, and dilution of 1 mg to 10 mL with 0.9% sodium chloride for children
rounded to 40 kg or less, followed by drawing up the dose for IV bolus. The
adrenaline reference dialog describes these same preparation boundaries and
concentration. This is a comparison of that administration passage only;
it does not verify dosage tables, other indications, or clinical applicability.
Visual review of EAS 14.3 p. 1 also shows role-specific authorised practice
levels and indications beyond cardiac arrest. The app's adrenaline dialog
is a cardiac-arrest reference and does not determine a user's practice level
or reproduce those other indications. Applicability and local authorisation
remain for clinical review; this comparison makes no recommendation.

Additional visual comparison: EAS 14.4 page 2 lists 300 mg for an adult in
cardiac arrest and a possible 150 mg second dose if VF or VT persists after
six shocks; it directs the reader to paediatric tables for a child. The app's
adult reference displays 300/150 mg and its child dialog says to seek clinical
advice for the second dose. The page also includes cautions and pregnancy
context that the short app dialog does not reproduce. The app's shock-count
visibility gate is governed by A2b and is not a check that VF/VT is present.
This comparison does not verify paediatric table cells, all contraindications,
or whether the abbreviated presentation is clinically appropriate.
EAS 14.4 page 3's cardiac-arrest administration line specifies an undiluted
IV bolus, as does the app's amiodarone dialog. That page separately describes
tachydysrhythmia administration; the app's arrest reference does not cover
that separate use.
Visual comparison of EAS 14.4 page 1: its arrest indication is framed as
VF/VT after three shocks. It also lists contraindications including severe
allergy, severe iodine allergy, cyclic-antidepressant-associated VT, and
torsades. The app dialog explicitly warns about torsades, but does not list
the other contraindications; its A2b card gate does not establish the current
rhythm. The app offers a special-situation switch and a guideline link, but
this comparison does not determine whether that presentation is sufficient.
Clinical review of the omitted context is required; no app rule was changed.

Additional visual comparison: EAS 7.2 pages 4–5 describes a paediatric
magnesium preparation of 1 mmol/mL using 5 mL from a 10 mmol/5 mL ampoule,
diluted to 10 mL with 0.9% sodium chloride. The app's magnesium dialog
describes that preparation. The source continues with an approximately
15-minute administration instruction; the app separately describes a 1–2
minute **adult cardiac-arrest** administration and does not give a
paediatric administration time. The applicability of these passages to the
torsades workflow needs clinical review; no timing conclusion is inferred.
The 5 kg cardiac-arrest table on page 5 lists adrenaline 0.05 mg,
amiodarone 25 mg and manual defibrillation 20–25 J. The app's 5 kg band
references are 0.05 mg, 25 mg and 20 J, respectively; the energy selection
reflects the separately recorded A1 rule rather than the full table range.
The same cardiac-arrest cells on pages 8, 10, 12 and 14 list, for the
10/20/30/40 kg bands respectively, adrenaline 0.1/0.2/0.3/0.4 mg and
amiodarone 50/100/150/200 mg. These match the app's band reference values.
The source energy ranges are 40–50/80–100/120–150/160–200 J; the app's
A1 rule selects their lower endpoints. Magnesium rows on pages 7, 9, 11,
13 and 15 show dashes for 5 and 10 kg, then 4/6/8 mmol for 20/30/40 kg,
matching the app's reference values. These are cell comparisons, not a
validation of band selection, repeat dosing, indications or applicability.

On a further visual review of EAS 7.2 p. 1, the cuffed ETT size table labels
one row "Newborn to 1 year" and the next "1 year and over". The app uses
the formula at exactly age 1 and the 3–4 mm range below 1. The printed row
labels overlap at that boundary; their intended interpretation and whether
the app's presentation is suitable need clinical review. The same page has
a separate newborn length formula that the app does not separately display.

### Checklist text comparison

A text-extraction comparison (not a visual proof or clinical validation) found
all checklist items represented in the app in the same order as EAS 3.14
pp. 2–3, EAS 3.15 pp. 2–3, EAS 9.2 p. 1 and EAS 9.4 pp. 1–2. The app
expands EAS 9.4 section headings into each item and uses plain `ETCO2` and
`cmH2O` text for subscript notation. These are checklist-review ticks, not
recordings that interventions occurred. The source documents contain wider
clinical context beyond their checklists. Visual item-by-item confirmation and
clinical review remain outstanding.

Visual follow-up: the nine post-cardiac-arrest checklist items in EAS 3.15
pages 2–3 appear in the same order and wording in the app, except that the
app writes `ETCO2` without the source's subscript. This checks the checklist
text only; it does not verify the surrounding treatment guidance, the meaning
of a checked item, or clinical appropriateness. Visual comparison also found
the arrest checklist (3.14 pp. 2–3) and airway backup checklist (9.2 p. 1)
represented in order, with plain `ETCO2` in the app. The RSI checklist
(9.4 pp. 1–2) is represented in order, with each section heading repeated
before its items and `cmH2O` written without subscripts. The 9.2 introductory
sentence is shortened in the app. This is a transcription comparison, not
clinical validation or an assessment of the checklist workflow.

## Review still required

### Software edge case: comma in a stored weight

The normal save-weight path converts a comma to a decimal point before
storing the weight. A direct engine check with a session weight of `15,5`
shows that `validWeight` and the adrenaline/amiodarone band calculation
accept it, while `magnesiumReference` and `fluidReference` use numeric
coercion without that conversion. In that constructed state the magnesium
basis contains an undefined band and the fluid bounds are non-finite. In a
simulated reload of that constructed state with PEA, the fluids card displayed
`NaN–NaN mL IV`; this is an observed software defect for that state, not a
clinical recommendation. Both
the historical root app and current weight form normalize before saving;
the current startup and cross-tab paths accept session objects without
normalizing every field. We have not established whether any genuine saved
session can contain such a weight; this is a software compatibility question,
not a clinical ruling.
The fidelity-pinned engine and existing behavior have not been changed.
Investigate real migration/import paths and an appropriately reviewed fix
before treating comma-formatted persisted weights as supported.

This inventory covers the live clinical references and their recording paths,
but does **not** complete an independent passage-by-passage source audit. A
clinical reviewer must verify each cited edition, page/table, population,
units, conditions, and any local authority before clinical use; inspect the
actual PDF rather than treating the labels above as proof. Specific unresolved
items include the pad threshold, the Other-rhythm fluids question, the child
second amiodarone source, RSI and airway boundaries, and exact checklist and
administration wording. Some broad regression tests exercise scenarios rather
than every listed boundary. Offline operation, background timing, install,
wake lock and clipboard still require real-device checks.
