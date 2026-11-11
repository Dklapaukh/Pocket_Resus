/* DRUG CARDS: the rules behind the Live screen's drug cards, moved here from the app layer on
   12 Nov 2026 (doc 07 step 2) with identical results. Numbers and wording come from the rules file.

   lowerCard           which card fills the lower slot: fluids, amiodarone or magnesium (A2c, A7)
   amiodaroneDue       a first or second amiodarone dose is due now (A2, A2b)
   childAmiodaroneAdvice / childSecondAmiodarone / secondAmiodaroneEarly   (C6b, C6b-2)
   doseFor             the adrenaline or next amiodarone dose reference in mg
   lockLeft            double-tap protection time left for a card (A5) */
import { RULES } from '../rules/nz-eas.js';
import * as R from './core.js';
import { hasTorsades } from './rhythm-care.js';

/* The rhythm that decides the lower card: the latest active rhythm check (or ROSC / rhythm entry)
   whose rhythm is in one of the lower-card lists; otherwise the session's current rhythm. */
export function latestLowerRhythm(session) {
  const { fluidRhythms, amiodaroneRhythms } = RULES.lowerCard;
  const latest = R.active(session)
    .filter(
      (event) =>
        ['shock', 'noshock', 'rhythm', 'rosc'].includes(event.type) &&
        [...fluidRhythms, ...amiodaroneRhythms].includes(event.rhythm),
    )
    .sort((a, b) => a.at - b.at)
    .at(-1);
  return latest?.rhythm || session.rhythm;
}

/* 'fluids' after a non-shockable rhythm; otherwise 'magnesium' if torsades was ever recorded,
   else 'amiodarone'. */
export function lowerCard(session) {
  if (RULES.lowerCard.fluidRhythms.includes(latestLowerRhythm(session))) return 'fluids';
  return hasTorsades(session) ? 'magnesium' : 'amiodarone';
}

/* A dose is due when the shock count (earlier shocks included) reaches the next entry of
   dueAtShocks, while the session is running, not under manual review, and torsades never recorded.
   The current rhythm does not matter here (A2b); lowerCard decides whether the card is shown. */
export function amiodaroneDue(session) {
  const c = R.counts(session);
  const dueAt = RULES.amiodarone.dueAtShocks;
  return (
    session.phase === 'Active' &&
    !session.special &&
    !hasTorsades(session) &&
    c.amio >= 0 && c.amio < dueAt.length &&
    c.shocks >= dueAt[c.amio]
  );
}

/* All amiodarone doses allowed have been recorded. */
export function amiodaroneDosesComplete(session) {
  return R.counts(session).amio >= RULES.amiodarone.dueAtShocks.length;
}

/* C6b: a child who has had one amiodarone dose: the second dose has no EAS source, so the card
   shows "Seek clinical advice" instead of a number. */
export function childAmiodaroneAdvice(session) {
  return R.isPaediatric(session) && R.counts(session).amio === 1;
}

/* C6b: as above, once the shock count for the second dose has been reached. */
export function childSecondAmiodarone(session) {
  return childAmiodaroneAdvice(session) && R.counts(session).shocks >= RULES.amiodarone.dueAtShocks[1];
}

/* C6b-2: one dose recorded and the second dose's shock count not yet reached. */
export function secondAmiodaroneEarly(session) {
  const c = R.counts(session);
  return c.amio === 1 && c.shocks < RULES.amiodarone.dueAtShocks[1];
}

/* The dose reference in mg for the adrenaline card, or the next amiodarone dose; null with no reference. */
export function doseFor(session, type) {
  const reference = R.dose(session);
  if (!reference) return null;
  if (type === 'adrenaline') return reference.adr;
  return R.counts(session).amio === 0 ? reference.amio1 : reference.amio2;
}

/* A5: milliseconds until the card can record again (0 = free). An undone or voided dose frees it. */
export function lockLeft(session, type, now = Date.now()) {
  const lockMs = Object.hasOwn(RULES.doubleTapLockMs, type) ? RULES.doubleTapLockMs[type] : 0;
  const last = R.active(session)
    .filter((event) => event.type === type)
    .sort((a, b) => a.at - b.at)
    .at(-1);
  if (!last || !lockMs) return 0;
  const gone = now - last.at;
  return gone >= 0 && gone < lockMs ? lockMs - gone : 0;
}
