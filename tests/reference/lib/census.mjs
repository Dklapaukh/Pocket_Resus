// Reference recordings (stage 0): which clinical behaviours each played case actually shows.
// Used by tests/reference/coverage.mjs --census to report, for each behaviour on the stage 0 list,
// in how many generated cases it appears (an honest count, not a guess from the story code).
import { RULES as CLINICAL } from '../../../src/rules/load.js';
import { SWEEP_AGES, SWEEP_WEIGHTS } from './cases.mjs';

const parsed = new WeakMap();
const sess = (step) => {
  if (!parsed.has(step)) { let v = {}; try { v = JSON.parse(step.saved.stored) || {}; } catch {} parsed.set(step, v); }
  return parsed.get(step);
};
const ev = (step) => sess(step).events || [];
const title = (step) => /<h2 id="sheetTitle">([^<]*)<\/h2>/.exec(step.screens.sheet)?.[1] || '';
const open = (step) => step.screens.sheet.includes('|open=true');
const child = (step) => { const w = +sess(step).weight; return w > 0 && w <= 40; };

/* name -> test(step, previous step, all steps so far). True if the case shows it at this step. */
const RULES = {
  // weights
  ...Object.fromEntries(['0.5', '3', '5', '5.1', '7.5', '10', '10.1', '12', '15', '20', '20.1', '25', '30', '30.1', '35', '40', '40.1', '41', '42', '50', '80', '120', '500']
    .map((w) => [`weight ${w} kg saved`, (s) => s.screens.header.includes(`<strong>${w} kg</strong>`)])),
  'no weight all case': () => false, // filled in at the end
  'invalid weight refused': (s) => s.screens.sheet.includes('Enter weight above zero'),
  'age estimate shown in weight box': (s) => s.label.includes('data-action=estimate') && /weightInput=\d/.test(s.screens.sheet),
  'age estimate refused': (s) => s.screens.sheet.includes('Use an infant age'),
  'estimated weight saved (est.)': (s) => s.screens.header.includes('· est.'),
  'weight changed mid-case': (s, p, all) => s.label.includes('save-weight') && ev(s).filter((e) => e.type === 'weight').length >= 2 && ev(s).some((e) => e.type === 'start'),
  'pads prompt in header': (s) => s.screens.header.includes('pads-prompt'),
  'pads prompt in weight pop-up': (s) => /id="weightPadPrompt" class="pads-entry">/.test(s.screens.sheet) && open(s),
  // rhythms
  ...Object.fromEntries(['VF', 'VT', 'Torsades'].map((r) => [`shock ${r}`, (s) => ev(s).some((e) => e.type === 'shock' && e.rhythm === r && !e.preApp)])),
  ...Object.fromEntries(['PEA', 'Asystole', 'Other', 'Unknown'].map((r) => [`no-shock ${r}`, (s) => ev(s).some((e) => e.type === 'noshock' && e.rhythm === r && e.details === r)])),
  ...Object.fromEntries(['Sinus rhythm', 'Organised rhythm', 'AF', 'Other', 'Unknown'].map((r) => [`ROSC ${r}`, (s) => ev(s).some((e) => e.type === 'rosc' && e.rhythm === r)])),
  'shock rhythm left unrecorded (pop-up closed)': (s) => ev(s).some((e) => e.details === 'Rhythm not recorded') && !open(s),
  'invalid energy refused': (s) => title(s) === 'Record shock delivered' && s.screens.sheet.includes('Check the recorded energy'),
  'Confirm Torsades shown': (s) => title(s) === 'Confirm Torsades',
  'Confirm Torsades: back to rhythms': (s) => s.label.includes('data-back-rhythms'),
  'Confirm Torsades: confirmed': (s) => s.label.includes('data-confirm-torsades') && ev(s).some((e) => e.rhythm === 'Torsades'),
  ...Object.fromEntries(['PEA', 'Asystole', 'Other'].map((r) => [`fluid pop-up after ${r}`, (s, p) => /fluid guidance/.test(title(s)) && ev(s).filter((e) => e.type === 'noshock').at(-1)?.rhythm === r])),
  'ROSC Other, re-arrest, then more checks': (s) => { const e = ev(s).filter((x) => !x.voided).sort((a, b) => a.at - b.at); const i = e.findIndex((x) => x.type === 'rosc' && x.rhythm === 'Other'); return i >= 0 && e.slice(i).some((x) => x.type === 'rearrest') && e.slice(e.findIndex((x, k) => k > i && x.type === 'rearrest')).some((x) => ['shock', 'noshock'].includes(x.type)); },
  're-arrest then more checks and doses': (s) => { const e = ev(s).filter((x) => !x.voided).sort((a, b) => a.at - b.at); const i = e.findIndex((x) => x.type === 'rearrest'); return i >= 0 && e.slice(i).some((x) => ['shock', 'noshock'].includes(x.type)) && e.slice(i).some((x) => ['adrenaline', 'amiodarone', 'magnesium', 'fluids'].includes(x.type)); },
  'second ROSC': (s) => ev(s).filter((e) => e.type === 'rosc' && !e.voided).length >= 2,
  'ROSC before CPR started': (s) => { const e = ev(s); const r = e.find((x) => x.type === 'rosc'); return r && !e.some((x) => x.type === 'start' && x.at <= r.at); },
  // doses
  'adrenaline (adult)': (s) => !child(s) && ev(s).some((e) => e.type === 'adrenaline'),
  'adrenaline (child)': (s) => child(s) && ev(s).some((e) => e.type === 'adrenaline' && e.weight === sess(s).weight),
  'adrenaline tap while locked (A5)': (s) => s.label.includes('data-drug=adrenaline') && s.label.includes('greyed out'),
  'adrenaline lock frees itself': (s, p) => p && /data-drug="adrenaline" data-a5-free/.test(p.screens.main) && !/data-drug="adrenaline" data-a5-free/.test(s.screens.main) && s.label.startsWith('wait'),
  'amiodarone first dose (adult)': (s) => !child(s) && ev(s).some((e) => e.type === 'amiodarone' && e.title === 'Amiodarone' && e.details === '300 mg IV'),
  'amiodarone first dose (child)': (s) => child(s) && ev(s).some((e) => e.type === 'amiodarone' && e.group === 'Child'),
  'amiodarone second dose (adult 150)': (s) => ev(s).some((e) => e.type === 'amiodarone' && e.details === '150 mg IV'),
  '"Due after 6 shocks"': (s) => s.screens.main.includes('Due after 6 shocks'),
  '"Seek clinical advice"': (s) => s.screens.main.includes('Seek clinical advice'),
  '"Select dose" form': (s) => title(s) === 'Select amiodarone dose',
  'child second dose recorded by form': (s) => child(s) && ev(s).filter((e) => e.type === 'amiodarone' && !e.voided).length >= 2,
  'amiodarone "Not yet due" tile': (s) => s.screens.main.includes('id="amiodaronePending"'),
  'amiodarone card stays after shock voided/undone': (s) => s.screens.main.includes('id="amiodaroneCard"') && /Review at 3 shocks/.test(s.screens.main),
  '"2 doses recorded" (amiodarone)': (s) => /data-drug="amiodarone"[^>]*>2 doses recorded/.test(s.screens.main),
  'magnesium first dose': (s) => ev(s).some((e) => e.type === 'magnesium'),
  '"Repeat magnesium?"': (s) => title(s) === 'Repeat magnesium?',
  'magnesium repeat confirmed': (s) => s.label.includes('data-confirm-magnesium'),
  'magnesium maximum reached': (s) => s.screens.main.includes('2 doses · clinical review'),
  'magnesium tap within 5 s ignored': (s, p) => s.label.includes('data-support=magnesium') && p && ev(s).length === ev(p).length && !open(s) && !s.label.includes('greyed'),
  // A9 (14 Nov 2026): this text was "Dose: clinical review" in recordings made before A9
  'magnesium "Seek clinical advice" (5/10 kg)': (s) => s.screens.main.includes('Magnesium\nSeek clinical advice') || s.screens.main.includes('Dose: clinical review'),
  'fluids card': (s) => s.screens.main.includes('id="fluidsCard"'),
  'fluids recorded by form': (s) => ev(s).some((e) => e.type === 'fluids'),
  'fluids total shown': (s) => /mL recorded · review total/.test(s.screens.main),
  'manual entry: known name (joins counts)': (s) => ev(s).some((e) => ['adrenaline', 'amiodarone', 'magnesium', 'fluids'].includes(e.type) && e.route && e.title !== ({ adrenaline: 'Adrenaline', amiodarone: 'Amiodarone', magnesium: 'Magnesium' })[e.type] && e.notes !== undefined),
  'manual entry: other medicine': (s) => ev(s).some((e) => e.type === 'medicine'),
  'manual entry: refused (missing field)': (s) => s.screens.sheet.includes('Enter medicine, actual dose and route'),
  'manual entry: earlier time': (s) => ev(s).some((e) => e.notes !== undefined && e.at < e.createdAt - 60000),
  'manual entry: route IO/IM/Other': (s) => ev(s).some((e) => ['IO', 'IM', 'Other'].includes(e.route)),
  'manual entry: unit changed': (s) => ev(s).some((e) => e.notes !== undefined && ['mcg', 'g', 'mL'].includes(e.unit) && e.type !== 'fluids'),
  // counts and start time
  '+ Previous shock': (s) => ev(s).some((e) => e.preApp),
  'previous shock reviewed (time added)': (s) => ev(s).some((e) => e.preApp && e.needsReview === false),
  'earlier counts saved': (s) => ev(s).some((e) => e.type === 'history'),
  'earlier counts refused': (s) => s.screens.sheet.includes('Use whole numbers 0–100'),
  ...Object.fromEntries(['5', '10', '15', '20'].map((m) => [`resus start ${m} min earlier`, (s) => s.label.includes(`data-earlier=${m}`)])),
  'resus start saved': (s) => ev(s).some((e) => e.type === 'resus-time'),
  'resus start refused': (s) => s.screens.sheet.includes('Resus start must be'),
  // corrections
  'event voided': (s) => ev(s).some((e) => e.voided),
  'void restored': (s) => ev(s).some((e) => !e.voided && (e.audit || []).some((a) => a.before.voided)),
  'rhythm changed by correction': (s) => ev(s).some((e) => (e.audit || []).some((a) => a.before.rhythm && a.before.rhythm !== e.rhythm)),
  'shock changed to Torsades by correction': (s) => ev(s).some((e) => e.type === 'shock' && e.rhythm === 'Torsades' && (e.audit || []).some((a) => a.before.rhythm !== 'Torsades')),
  'dose changed by correction': (s) => ev(s).some((e) => (e.audit || []).some((a) => a.before.dose !== undefined && a.before.dose !== e.dose)),
  'state-change time refused': (s) => s.screens.sheet.includes('State-change times cannot be changed'),
  'undo': (s) => s.screens.toast.startsWith('Last action undone'),
  // case flow
  'ROSC then post-ROSC checklist ticked': (s) => ev(s).some((e) => e.key?.startsWith('postrosc:')),
  'Post ROSC button on Live': (s) => s.label.includes('data-action=postrosc'),
  're-arrest': (s) => ev(s).some((e) => e.type === 'rearrest'),
  'session ended': (s) => ev(s).some((e) => e.type === 'end'),
  'tap after end (blocked)': (s) => s.screens.toast.startsWith('Session ended. Undo'),
  'new patient': (s) => s.screens.toast.startsWith('New patient'),
  'special situation on': (s) => s.screens.header.includes('special-flag'),
  'special situation on during CPR': (s) => s.screens.header.includes('special-flag') && sess(s).phase === 'Active',
  'special situation off again': (s) => ev(s).some((e) => e.type === 'context' && e.details === 'Routine prompts enabled'),
  '"Manual review" on a card': (s) => s.screens.main.includes('>Manual review<'),
  'cards say "ROSC recorded"': (s) => /class="record"[^>]*>ROSC recorded/.test(s.screens.main),
  'cards say "Session ended"': (s) => /class="record"[^>]*>Session ended/.test(s.screens.main),
  // timer moments
  '"30 seconds remaining"': (s) => s.screens.main.includes('>30 seconds remaining<'),
  '"Prepare for rhythm check" (yellow)': (s) => s.screens.main.includes('>Prepare for rhythm check<') && /timer-panel[^"]*prepare/.test(s.screens.main),
  'countdown at 00:30 exactly': (s) => s.screens.main.includes('id="cycleClock" role="timer" aria-label="Time remaining in CPR cycle">00:30<'),
  'countdown at 00:15 exactly': (s) => s.screens.main.includes('>00:15<') && s.screens.main.includes('Prepare for rhythm check'),
  '"Rhythm check due"': (s) => s.screens.main.includes('>Rhythm check due<'),
  '"Rhythm check due · +" (overdue)': (s) => s.screens.main.includes('Rhythm check due · +'),
  'adrenaline review highlight': (s) => /class="drug attention" id="adrenalineCard"/.test(s.screens.main),
  'adrenaline "4 min elapsed · review"': (s) => s.screens.main.includes('4 min elapsed · review'),
  'arrest-checklist reminder on': (s) => s.screens.frame.includes('checklist-attention'),
  'clock over one hour': (s) => s.screens.header.includes('long-clock'),
  'phone away and back': (s) => s.label.startsWith('phone away'),
  // pop-ups
  ...Object.fromEntries(['Adrenaline · reference', 'Amiodarone · reference', 'Magnesium · administration', 'Fluids · administration'].flatMap((t) => [
    [`${t} (adult)`, (s) => title(s) === t && !child(s)], [`${t} (child)`, (s) => title(s) === t && child(s)]])),
  'reload': (s) => s.label.startsWith('reload'),
  'reload reopens the rhythm pop-up': (s) => s.label.startsWith('reload') && open(s) && /Record (shock delivered|no-shock cycle)/.test(title(s)),
  // other tabs
  'Log: all': (s) => s.screens.main.includes('<h2>Event log</h2>'),
  'Log: interventions only': (s) => s.screens.main.includes('value="interventions" selected'),
  'Log: checklist start & finish': (s) => s.screens.main.includes('value="times" selected'),
  'Log: checklist reopened': (s) => s.screens.main.includes('Reopened for review'),
  'Log: empty': (s) => s.screens.main.includes('No events in this view yet'),
  'Guidance tab': (s) => s.screens.main.includes('<h2>Guidance</h2>'),
  ...Object.fromEntries(['Arrest', 'Post ROSC', 'Preparation', 'RSI'].map((c) => [`checklist ${c} open`, (s) => new RegExp(`<h2>[^<]*${c}[^<]*</h2>`, 'i').test(s.screens.main) && s.screens.main.includes('check-item')])),
  'RSI dose pop-up': (s) => title(s) === 'RSI dose references',
  'tube sizes pop-up': (s) => title(s) === 'Tube sizes &amp; age criteria',
  'reversible cause pop-up': (s) => /<h3>/.test(s.screens.sheet) && s.label.includes('data-cause-guide'),
  ...Object.fromEntries(['IV cannulation', 'IO access', 'OPA', 'NPA', 'iGel', 'Laryngoscopy', 'Intubation'].map((d) => [`equipment recorded: ${d}`, (s) => ev(s).some((e) => e.type === 'equipment' && e.title === d)])),
  'note recorded': (s) => ev(s).some((e) => e.type === 'note'),
  'export: text download': (s) => s.screens.export.startsWith('download'),
  'export: copy': (s) => s.screens.export.startsWith('copy'),
  'export: complete JSON': (s) => s.saved.jsonExport !== '',
  'tutorial': (s) => title(s) === 'Tutorial',
  'larger text': (s) => s.screens.frame.startsWith('large') || / large/.test(s.screens.frame.split('|')[0]),
  'app error recorded (should be none)': (s) => !s.screens.frame.endsWith('errors=') && /errors=./.test(s.screens.frame),
};

/* Per-value checks: every age, every weight edge in every pop-up, every equipment size. */
const typed = (step, field, value) => !!step && step.label.includes(`id=${field}`) && step.label.endsWith(`with "${value}"`);
const devices = CLINICAL.equipment.devices;
const equipment = (s, name, part) => ev(s).some((e) => e.type === 'equipment' && e.title === name && e.details.split(' · ').includes(part));
Object.assign(RULES, {
  ...Object.fromEntries(SWEEP_AGES.map((a) => [`weight from age "${a}"`, (s, p) => s.label.includes('data-action=estimate') && typed(p, 'ageInput', a)])),
  ...Object.fromEntries(SWEEP_AGES.map((a) => [`tube sizes for age "${a}"`, (s, p) => s.label.includes('data-save-age') && typed(p, 'referenceAge', a)])),
  ...Object.fromEntries(SWEEP_WEIGHTS.filter((w) => +w > 0 && +w <= 500).flatMap((w) => ['Adrenaline · reference', 'Amiodarone · reference', 'Magnesium · administration', 'Fluids · administration', 'RSI dose references']
    .map((t) => [`${t} at ${w} kg`, (s) => title(s) === t && s.screens.header.includes(`<strong>${String(+w)} kg</strong>`)]))),
  ...Object.fromEntries(Object.entries(devices).flatMap(([id, d]) => (id === 'laryngoscopy' ? [] : d.sizes).map((v) => [`${d.name} size ${v}`, (s) => equipment(s, d.name, 'size: ' + v)]))),
  ...Object.fromEntries(['Video', 'Direct'].flatMap((m) => CLINICAL.equipment.blades[m].map((v) => [`Laryngoscopy ${m} blade ${v}`, (s) => ev(s).some((e) => e.title === 'Laryngoscopy' && e.details.includes('method: ' + m) && e.details.split(' · ').includes('size: ' + v))]))),
  ...Object.fromEntries(['iv', 'io'].flatMap((k) => CLINICAL.equipment.sites[k].map((v) => [`${devices[k].name} site ${v}`, (s) => ev(s).some((e) => e.title === devices[k].name && / site: (Left |Right )?/.test(' ' + e.details) && e.details.includes(v))]))),
  'event after midnight in the Log': (s) => /<time>00:\d\d:\d\d<small>/.test(s.screens.main),
  'midnight: text export with 00:xx times': (s) => /\n00:\d\d:\d\d /.test(s.screens.export),
});

/* The set of behaviour names a played case shows. */
export function censusOf(steps) {
  const seen = new Set();
  steps.forEach((s, i) => { for (const [name, test] of Object.entries(RULES)) if (!seen.has(name)) { try { if (test(s, steps[i - 1], steps)) seen.add(name); } catch {} } });
  if (!steps.some((s) => /Pt weight \(kg\)<\/span><strong>[\d.]+ kg/.test(s.screens.header))) seen.add('no weight all case');
  return [...seen];
}
export const CENSUS_NAMES = Object.keys(RULES);
