// Scripted "taps" that drive the real screens. After every step the visible HTML and the
// saved data are captured. Used to prove the rebuilt app draws exactly what the old one did.
const MIN = 60000;
const weight = (a, digits) => { a.click('[data-action=weight]'); for (const k of digits) a.click(`[data-key="${k}"]`); a.click('[data-action=save-weight]'); };
const shock = (a, rhythm = 'VF', energy) => { a.click('[data-action=rhythm-check]'); a.click('[data-outcome=shock]'); if (energy !== undefined) a.type('#shockEnergy', energy); a.click(`[data-record-rhythm=${rhythm}]`); if (rhythm === 'Torsades') a.click('[data-confirm-torsades]'); };
const noShock = (a, rhythm = 'PEA') => { a.click('[data-action=rhythm-check]'); a.click('[data-outcome=noshock]'); a.click(`[data-record-rhythm="${rhythm}"]`); };
const close = a => a.click('[data-close]');
const menu = a => a.click('[data-action=settings]');   // the "•••" menu holds large text, export, undo, end, new

export const SCENARIOS = {
  'fresh-tabs-and-menus'(a, snap) {
    snap('fresh'); a.click('[data-tab=guidance]'); snap('guidance tab'); a.click('[data-tab=log]'); snap('log tab');
    a.click('[data-tab=checks]'); snap('arrest checklist'); a.click('[data-tab=live]'); snap('live');
    a.click('[data-action=settings]'); snap('settings'); close(a); a.click('[data-action=resus-time]'); snap('resus time'); close(a);
    a.click('[data-action=weight]'); snap('weight sheet'); a.click('[data-key="7"]'); a.click('[data-key="."]'); a.click('[data-key="5"]'); snap('weight 7.5 typed');
    a.click('[data-key="⌫"]'); a.click('[data-key="⌫"]'); a.click('[data-key="⌫"]'); a.click('[data-action=save-weight]'); snap('empty weight rejected');
    a.type('#ageInput', '6'); a.click('[data-action=estimate]'); snap('age estimate'); a.click('[data-action=save-weight]'); snap('estimated weight saved');
    menu(a); a.click('[data-action=large]'); snap('large text on'); close(a);
    a.click('[data-action=airway]'); snap('airway menu'); close(a); a.click('[data-action=access]'); snap('access menu'); close(a);
    menu(a); a.click('[data-action=history]'); snap('history');
  },
  'adult-vf-full-run'(a, snap) {
    weight(a, '70'); snap('weight 70'); a.click('[data-action=start]'); snap('started');
    a.advance(30000); snap('+30s'); a.advance(90000); snap('+2min cycle due');
    shock(a, 'VF', '200'); snap('shock 1'); a.advance(2 * MIN); shock(a, 'VF'); snap('shock 2');
    a.click('[data-drug=adrenaline]'); snap('adrenaline given'); a.advance(2 * MIN); snap('+2min'); shock(a, 'VF'); snap('shock 3');
    a.click('[data-drug-info=amiodarone]'); snap('amiodarone info'); close(a); a.click('[data-drug=amiodarone]'); snap('amiodarone 300');
    a.advance(2 * MIN); shock(a, 'VT'); snap('shock 4 VT'); a.advance(2 * MIN); shock(a, 'VF'); snap('shock 5');
    a.click('[data-drug=amiodarone]'); snap('amiodarone 150'); a.advance(4 * MIN); snap('+4min adrenaline due');
    a.click('[data-tab=log]'); snap('log all'); a.select('#logScope', 'interventions'); snap('log interventions');
    menu(a); a.click('[data-action=export]'); snap('export sheet'); a.click('[data-action=copy]'); snap('copy'); a.click('[data-action=download-text]'); snap('download text'); close(a);
    a.click('[data-tab=live]'); menu(a); a.click('#undo'); snap('undo last action'); menu(a);
    a.click('[data-action=end]'); snap('end confirm'); a.click('[data-action=confirm-end]'); snap('ended'); a.click('[data-drug=adrenaline]'); snap('record after end');
    menu(a); a.click('[data-action=new]'); snap('new patient confirm'); a.click('[data-action=confirm-new]'); snap('new patient');
  },
  'paediatric-15kg-torsades-pea'(a, snap) {
    weight(a, '15'); snap('15 kg (pads prompt)'); a.click('[data-action=start]'); a.advance(2 * MIN); snap('due');
    shock(a, 'Torsades', '60'); snap('torsades confirmed'); a.click('[data-support=magnesium]'); snap('magnesium (after torsades)');
    a.click('[data-drug-info=magnesium]'); snap('magnesium info'); close(a);
    a.advance(2 * MIN); noShock(a, 'PEA'); snap('PEA recorded'); close(a); snap('PEA closed');
    a.click('[data-support=fluids]'); snap('fluids sheet'); a.type('#drugForm [name=dose]', '300'); a.submit('#drugForm'); snap('fluids recorded');
    a.click('[data-drug=adrenaline]'); snap('adrenaline');
    a.click('[data-tab=log]'); snap('log'); a.click('[data-tab=live]');
    menu(a); a.check('#specialInput', true); snap('special situation'); close(a); snap('special situation closed');
  },
  'rosc-and-rearrest'(a, snap) {
    weight(a, '50'); a.click('[data-action=start]'); a.advance(2 * MIN); a.click('[data-action=rhythm-check]'); a.click('[data-outcome=rosc]'); snap('rosc sheet');
    a.click('[data-record-rhythm="Sinus rhythm"]'); snap('rosc recorded -> post ROSC checklist'); a.click('[data-check="postrosc:0"]'); snap('post-rosc item ticked');
    a.click('[data-tab=live]'); snap('live after rosc'); a.click('[data-action=rearrest]'); snap('rearrest'); a.advance(2 * MIN); snap('+2min after rearrest');
    noShock(a, 'Asystole'); snap('asystole'); menu(a); a.click('#undo'); snap('undone');
    a.click('[data-outcome=rosc]'); snap('unexpected rosc sheet'); close(a);
  },
  'no-weight-previous-shock-edit-void'(a, snap) {
    a.click('[data-action=start]'); snap('started without weight'); a.click('[data-action=previous-shock]'); a.click('[data-action=previous-shock]'); snap('2 previous shocks');
    a.click('[data-action=cycle-log]'); snap('cycle log'); close(a);
    a.click('[data-drug=adrenaline]'); snap('adrenaline without weight');
    a.click('[data-action=note]'); snap('note sheet'); a.type('#noteForm [name=text]', 'Pads on'); a.submit('#noteForm'); snap('note recorded');
    a.click('[data-action=interventions]'); snap('interventions'); a.click('[data-equipment=iv]'); snap('iv form'); a.submit('#equipmentForm'); snap('iv recorded');
    a.click('[data-action=interventions]'); a.click('[data-equipment=intubation]'); snap('intubation form'); a.type('#equipmentForm [name=size]', '7.5'); a.submit('#equipmentForm'); snap('intubation recorded');
    a.click('[data-tab=log]'); snap('log'); const edit = a.window.document.querySelector('[data-edit]'); if (edit) { a.click(edit); snap('edit sheet'); a.submit('#editForm'); snap('edit saved'); }
    const v = a.window.document.querySelector('[data-void]'); if (v) { a.click(v); snap('voided'); }
    a.click('[data-tab=guidance]'); snap('guidance'); a.click('[data-tab=checks]'); a.click('[data-check="arrest:0"]'); a.click('[data-check="arrest:1"]'); snap('arrest checks ticked');
    a.click('[data-tab=live]'); a.click('[data-action=note]'); a.click('[data-custom-drug=other]'); snap('custom medicine sheet'); a.type('#drugForm [name=name]', 'Calcium'); a.type('#drugForm [name=dose]', '10'); a.click('#drugForm [name=route]'); snap('custom medicine filled');
  },
  'reload-mid-cycle-and-storage'(a, snap, reopen) {
    weight(a, '70'); a.click('[data-action=start]'); a.advance(45000); snap('before reload');
    const b = reopen(a.surfaces().stored); b.advance(10000); snap('after reload', b);
    b.click('[data-action=settings]'); snap('settings after reload', b);
    const c = reopen('{not json'); snap('corrupt saved data', c);
    const d = reopen(JSON.stringify({ version: 2, events: [] })); snap('wrong version saved data', d);
  },
};
