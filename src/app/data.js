/* Fixed lists: equipment, colours, guideline links and tutorial slides. Checklists and reversible
   causes moved to the rules file (src/rules/nz-eas.js, part 3) on 12 Nov 2026. */

/* Airway and access equipment types and their size choices. */
export const ARREST_EQUIPMENT = {
  iv: { name: 'IV cannulation', sizes: ['24', '22', '20', '18', '16'] },
  io: { name: 'IO access', sizes: ['Large', 'Medium', 'Small'] },
  opa: { name: 'OPA', sizes: ['0', '1', '2', '3', '4', '5'] },
  npa: { name: 'NPA', sizes: ['6', '7', '8'] },
  igel: { name: 'iGel', sizes: ['1', '1.5', '2', '2.5', '3', '4', '5'] },
  laryngoscopy: { name: 'Laryngoscopy', sizes: ['00', '0', '1', '2', '3', '4', '5'] },
  intubation: { name: 'Intubation', sizes: ['3', '4', '5', '6', '7', '8', '9'] },
};

/* IV / IO access site choices. */
export const ARREST_SITES = {
  iv: ['ACF', 'Forearm', 'Hand', 'Foot', 'EJ'],
  io: ['Proximal tibia', 'Proximal humerus', 'Distal Femur'],
};

/* Colours shown beside cannula, IO and iGel sizes. */
export const COLOURS = {
  iv: { 24: '#f4cc28', 22: '#439be0', 20: '#ef99ba', 18: '#68b88b', 16: '#aeb2b3' },
  io: { Large: '#f4cc28', Medium: '#439be0', Small: '#ef99ba' },
  igel: {
    1: '#ef99ba',
    1.5: '#88c9ee',
    2: '#aeb2b3',
    2.5: '#fff',
    3: '#f4cc28',
    4: '#68b88b',
    5: '#ee9b43',
  },
};

/* Links to the NZ EAS guideline pages. */
export const CARDIAC_CPG =
  'https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/cardiac-arrest-eas';

export const MAGNESIUM_CPG = 'https://cpg.stjohn.org.nz/tabs/medicines/page/magnesium-sulphate-eas';

/* Slides of the Explain-me tutorial (screenshots in the tutorial folder). */
export const EXPLAIN_ME_SLIDES = [
  {
    title: 'Set the patient’s weight',
    image: 'tutorial/step-01.png',
    action: 'Tap <b>Pt weight (kg)</b>. Enter the weight, then tap <b>Use weight</b>.',
    note: 'Doses are calculated from weight using local guidelines, including paediatric weight bands. Energy appears in the header too.',
    alt: 'Resus Pocket screen detail: Set the patient’s weight',
  },
  {
    title: 'Record a medicine',
    image: 'tutorial/step-02.png',
    action: 'Check the displayed dose and route. Tap <b>Record</b> on the medicine card.',
    note: 'The event is timestamped. The medicine review clock updates. Use <b>Other…</b> for another dose, route or time.',
    alt: 'Resus Pocket screen detail: Record a medicine',
  },
  {
    title: 'Check how to give it',
    image: 'tutorial/step-03.png',
    action: 'Tap <b>Administration</b> beneath the Record button.',
    note: 'Open the instructions and linked local guideline. These links stay available for paediatric doses.',
    alt: 'Resus Pocket screen detail: Check how to give it',
  },
  {
    title: 'Add airway or access',
    image: 'tutorial/step-04.png',
    action: 'Tap <b>Airway</b> or <b>Access</b>, then select the intervention.',
    note: 'Choose the size and relevant details, then tap <b>Record</b>. Colour-coded choices reduce typing; IV/IO sites use left/right plus location.',
    alt: 'IV cannulation: 18G, Right ACF, Unsuccessful selected',
  },
  {
    title: 'Follow the cycle timer',
    image: 'tutorial/step-05.png',
    action:
      'Tap <b>Start CPR</b> to begin. At zero, tap <b>Rhythm check</b>, choose the outcome, then the rhythm.',
    note: 'The card turns yellow at 15 seconds. Adrenaline highlights 30 seconds before review. Timer expiry records no treatment.',
    alt: 'Resus Pocket screen detail: Follow the cycle timer',
  },
  {
    title: 'Review cycles and timing',
    image: 'tutorial/step-06.png',
    action: 'Tap the <b>CPR cycle / shock count</b> to see timestamped cycle history.',
    note: 'Tap <b>Resus duration</b> to set an earlier start; the app clock stays separate. Unexpected ROSC sits at the timer’s top right.',
    alt: 'Resus Pocket screen detail: Review cycles and timing',
  },
  {
    title: 'Find weight-based RSI doses',
    image: 'tutorial/step-07.png',
    action: 'Open <b>Guidance → RSI doses</b>.',
    note: 'RSI dose references are calculated from the entered weight using local guidelines. Open the full RSI CPG for context. <b>Tube sizes & age</b> has equipment references.',
    alt: 'Resus Pocket screen detail: Find weight-based RSI doses',
  },
  {
    title: 'Use a checklist or cause prompt',
    image: 'tutorial/step-08.png',
    action:
      'Open <b>Arrest checklist</b> from the footer. Find the other checklists under <b>Guidance</b>.',
    note: 'Each tick is timestamped. Checklists open full-screen with Back. The 4 Hs and 4 Ts are together in Guidance; tap a cause for its prompt.',
    alt: 'Resus Pocket screen detail: Use a checklist or cause prompt',
  },
  {
    title: 'Add an event or correction',
    image: 'tutorial/step-09.png',
    action: 'Tap <b>+ Event</b> to add a note or an earlier event.',
    note: 'Open <b>Log</b> to review colour-coded entries. Use an entry’s edit control to correct it. <b>••• → Undo last action</b> reverses the last action.',
    alt: 'Resus Pocket screen detail: Add an event or correction',
  },
  {
    title: 'Copy the event log',
    image: 'tutorial/step-10.png',
    action: 'Tap <b>Log</b>, then <b>Export</b>. Paste the copied text where you need it.',
    note: 'Each line contains <b>hh:mm:ss + key details</b>. Export before starting a new patient or clearing browser data; the session saves on this device.',
    alt: 'Resus Pocket screen detail: Copy the event log',
  },
];
