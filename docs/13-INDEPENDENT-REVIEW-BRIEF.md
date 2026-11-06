# Independent clinical review brief

The owner is the clinical reviewer. Independent review is planned for later,
after the code is up to scratch and the other key goals are achieved; do not
ask the owner to arrange it as a routine checkpoint. This brief prepares for
that later review; it is not an approval or a change request.
The app is local and undeployed. Source comparisons in
[the rule inventory](11-CLINICAL-RULE-INVENTORY.md) are limited software
checks, not clinical validation. Review the actual bundled EAS exports dated
24 September 2026, the applicable current authority, the implementation, and
the recorded decisions in docs 06 and 07. A checked checklist item records
review; it does not prove an intervention occurred.

Please record the reviewer, date, source edition and pages, population,
decision, rationale and any follow-up for each question. Do not treat the
existing app as the authority for a recommendation.

1. **Amiodarone:** Assess A2b's visibility after three counted shocks
   regardless of current rhythm, persistence of the card, the child
   second-dose manual-entry path and the displayed advice. EAS 3.14 and 14.4
   frame arrest treatment around VF/VT. The brief dialog mentions torsades
   but omits other contraindications listed in EAS 14.4 p. 1. Assess the
   presentation and source context, including C6b and C6b-2.
2. **Fluids and rhythm:** Assess A2c's fluids card for asystole as well as
   PEA, and the unresolved Other-rhythm question. EAS 3.14 p. 2 places the
   quoted fluids passage under PEA. Decide whether presentation and scope are
   appropriate; do not infer treatment from card visibility.
3. **Magnesium:** Assess paediatric band applicability and administration
   timing in torsades. EAS 7.2 pp. 4–5 gives preparation and a general
   administration time; EAS 3.14 p. 2 describes a separate adult
   cardiac-arrest timing. The app gives the adult timing and paediatric
   preparation but no paediatric timing. Review source context before drawing
   a conclusion.
4. **Energy, pads and weight:** Assess the A1 band-based energy choice,
   adult 200 J cap versus the source's maximum-setting wording, the
   paediatric pad threshold, and age/weight boundaries. EAS 7.2 table ranges
   and app lower-end values are documented in the inventory. No source for
   the pad threshold has been established in that inventory.
5. **RSI and airway:** Assess the abbreviated fentanyl indications and
   timing, weight calculations, rounding and caps, newborn applicability,
   fractional ages, and tube-size and length formulae against EAS 9.3 and
   7.2. EAS 7.2 p. 1's cuffed-tube rows overlap at one year; the app uses
   the formula at exactly one year. The app's summary omits some source context.
6. **Recording and review:** Assess whether the checklist, correction,
   export, undo, display guards and special-situation workflows meet clinical
   and local record requirements. Timer expiry and displayed references do
   not themselves record a treatment. Software tests are not evidence of
   clinical suitability.

Additional real-device checks remain separate: offline loading after a
successful first load, background timing and return to the foreground,
installation, wake lock, and clipboard/export. Do not deploy merely to carry
out this review; decide the appropriate test environment first.
