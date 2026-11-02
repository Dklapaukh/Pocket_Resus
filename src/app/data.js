/* Fixed lists: checklists, equipment, causes, colours, guideline links, tutorial slides.
   Converted mechanically from the original app files in Stage 2b: logic unchanged;
   shared variables are now st.<name>. */

export const ARREST_CHECKLISTS=[
 {id:'arrest',label:'Arrest checklist',code:'EAS 3.14',pdf:'cpg-cardiac-arrest.pdf#page=2',items:[
 'Team leader identified.','Roles allocated and confirmed.','CPR feedback device and metronome on if available.','Defibrillator screen visible to the team leader.','Airway adjunct or ETT in place and ventilation adequate.','ETCO2 attached and waveform visible.','Oxygen flow and supply adequate.','IV/IO access secure, two sites if possible.','Consider underlying and reversible causes.','Appropriate medicines administered.','Initiate documentation.','Communication with family/bystanders.']},
 {id:'postrosc',label:'Post ROSC checklist',code:'EAS 3.15',pdf:'cpg-post-rosc.pdf#page=2',items:[
 'Airway and ventilation are adequate/secure.','Vital signs, including blood glucose level.','Backup for RSI called for if indicated.','IV access secure.','ETCO2 35–45 mmHg if ventilated.','Sedation and neuromuscular blockade if indicated.','BP above target.','12 lead ECG.','Confirm appropriate transport destination.']},
 {id:'preparation',label:'Preparation for RSI',code:'EAS 9.2 · Airway Backup Checklist',pdf:'cpg-preparation-rsi.pdf',intro:'Prepare for RSI while awaiting CCP backup.',items:[
 'Pre-oxygenate by mask.','Attach monitor, including ETCO2.','Gain IV access, preferably in two sites.','Prepare a running line of 0.9% sodium chloride.','Position the patient for optimal airway control.','Place an ETT holder under the patient’s head.','Ensure suction is working and turn it off.','Prepare a manual ventilation bag with PEEP valve.','Maximise space and clear away unnecessary equipment.','Consider travelling toward backup.']},
 {id:'rsi',label:'RSI checklist',code:'EAS 9.4',pdf:'cpg-rsi-checklist.pdf',items:[
 'Roles assigned — Team leader.','Roles assigned — Airway.','Roles assigned — Airway assistant.','Roles assigned — Drugs and monitoring.',
 'Patient prepared — Check oxygen supply and pre-oxygenate.','Patient prepared — Consider nasal prongs.','Patient prepared — Position optimised.','Patient prepared — IV access patent. Running line attached.','Patient prepared — Consider marking surgical airway landmarks.',
 'Monitoring attached and visible — Baseline vital signs.','Monitoring attached and visible — Pulse oximetry, capnography, and cycling BP.',
 'Equipment checked and ready — PPE.','Equipment checked and ready — Manual ventilation bag with PEEP valve set to 5 cmH2O.','Equipment checked and ready — OPA, SGA, and surgical airway equipment.','Equipment checked and ready — Laryngoscope.','Equipment checked and ready — ETT and 10 ml cuff syringe.','Equipment checked and ready — ETT holder in place.','Equipment checked and ready — Suction.','Equipment checked and ready — Bougie and stylet.',
 'Medicines drawn up, labelled and doses confirmed — Fentanyl (if indicated).','Medicines drawn up, labelled and doses confirmed — Ketamine.','Medicines drawn up, labelled and doses confirmed — Neuromuscular blocker.','Medicines drawn up, labelled and doses confirmed — Post intubation sedation.','Medicines drawn up, labelled and doses confirmed — Metaraminol.',
 'Team briefing — Airway plan, including failed intubation.','Team briefing — Medication plan.','Team briefing — Anticipated complications.','Team briefing — Any concerns before proceeding?']}
];

export const ARREST_EQUIPMENT={
 iv:{name:'IV cannulation',sizes:['24','22','20','18','16']},
 io:{name:'IO access',sizes:['Large','Medium','Small']},
 opa:{name:'OPA',sizes:['0','1','2','3','4','5']},
 npa:{name:'NPA',sizes:['6','7','8']},
 igel:{name:'iGel',sizes:['1','1.5','2','2.5','3','4','5']},
 laryngoscopy:{name:'Laryngoscopy',sizes:['00','0','1','2','3','4','5']},
 intubation:{name:'Intubation',sizes:['3','4','5','6','7','8','9']}
};

export const ARREST_SITES={iv:['ACF','Forearm','Hand','Foot','EJ'],io:['Proximal tibia','Proximal humerus','Distal Femur']};

export const CAUSES=[
{id:'oxygen',group:'4 Hs',name:'Hypoxia',plain:'Low oxygen',text:'Review airway patency, oxygen supply, ventilation and waveform capnography.'},
{id:'volume',group:'4 Hs',name:'Hypovolaemia',plain:'Low circulating volume',text:'Consider bleeding or fluid loss. Look for the cause and review volume replacement in the applicable CPG.'},
{id:'metabolic',group:'4 Hs',name:'Hypo / hyperkalaemia',plain:'Potassium or metabolic disturbance',text:'Consider renal failure, dialysis, medicines and other metabolic causes. Review relevant history, ECG and available point-of-care results.'},
{id:'temperature',group:'4 Hs',name:'Hypo / hyperthermia',plain:'Low or high body temperature',text:'Review exposure and core temperature if available. Temperature-related arrest can require a modified approach; use the specific CPG.'},
{id:'tension',group:'4 Ts',name:'Tension pneumothorax',plain:'Pressure in the chest',text:'Consider the history, chest findings and ventilation difficulty. Use the specific CPG for assessment and treatment.'},
{id:'tamponade',group:'4 Ts',name:'Cardiac tamponade',plain:'Pressure around the heart',text:'Consider trauma and other relevant history. Use ultrasound only if available, within scope, and without interrupting CPR.'},
{id:'toxins',group:'4 Ts',name:'Toxins',plain:'Poisoning or medicines',text:'Ask about medicines, substances, overdose and scene clues. Seek the relevant toxicology guidance.'},
{id:'thrombosis',group:'4 Ts',name:'Thrombosis',plain:'Coronary or pulmonary clot',text:'Consider myocardial infarction or pulmonary embolism from the history and findings. Use the relevant CPG and specialist advice.'}
];

export const COLOURS={iv:{24:'#f4cc28',22:'#439be0',20:'#ef99ba',18:'#68b88b',16:'#aeb2b3'},io:{Large:'#f4cc28',Medium:'#439be0',Small:'#ef99ba'},igel:{1:'#ef99ba',1.5:'#88c9ee',2:'#aeb2b3',2.5:'#fff',3:'#f4cc28',4:'#68b88b',5:'#ee9b43'}};

export const CARDIAC_CPG='https://cpg.stjohn.org.nz/tabs/guidelines/cardiac-eas/page/cardiac-arrest-eas';

export const MAGNESIUM_CPG='https://cpg.stjohn.org.nz/tabs/medicines/page/magnesium-sulphate-eas';

export const EXPLAIN_ME_SLIDES=[{"title": "Set the patient’s weight", "image": "tutorial/step-01.png", "action": "Tap <b>Pt weight (kg)</b>. Enter the weight, then tap <b>Use weight</b>.", "note": "Doses are calculated from weight using local guidelines, including paediatric weight bands. Energy appears in the header too.", "alt": "Resus Pocket screen detail: Set the patient’s weight"}, {"title": "Record a medicine", "image": "tutorial/step-02.png", "action": "Check the displayed dose and route. Tap <b>Record</b> on the medicine card.", "note": "The event is timestamped. The medicine review clock updates. Use <b>Other…</b> for another dose, route or time.", "alt": "Resus Pocket screen detail: Record a medicine"}, {"title": "Check how to give it", "image": "tutorial/step-03.png", "action": "Tap <b>Administration</b> beneath the Record button.", "note": "Open the instructions and linked local guideline. These links stay available for paediatric doses.", "alt": "Resus Pocket screen detail: Check how to give it"}, {"title": "Add airway or access", "image": "tutorial/step-04.png", "action": "Tap <b>Airway</b> or <b>Access</b>, then select the intervention.", "note": "Choose the size and relevant details, then tap <b>Record</b>. Colour-coded choices reduce typing; IV/IO sites use left/right plus location.", "alt": "IV cannulation: 18G, Right ACF, Unsuccessful selected"}, {"title": "Follow the cycle timer", "image": "tutorial/step-05.png", "action": "Tap <b>Start CPR</b> to begin. At zero, tap <b>Rhythm check</b>, choose the outcome, then the rhythm.", "note": "The card turns yellow at 15 seconds. Adrenaline highlights 30 seconds before review. Timer expiry records no treatment.", "alt": "Resus Pocket screen detail: Follow the cycle timer"}, {"title": "Review cycles and timing", "image": "tutorial/step-06.png", "action": "Tap the <b>CPR cycle / shock count</b> to see timestamped cycle history.", "note": "Tap <b>Resus duration</b> to set an earlier start; the app clock stays separate. Unexpected ROSC sits at the timer’s top right.", "alt": "Resus Pocket screen detail: Review cycles and timing"}, {"title": "Find weight-based RSI doses", "image": "tutorial/step-07.png", "action": "Open <b>Guidance → RSI doses</b>.", "note": "RSI dose references are calculated from the entered weight using local guidelines. Open the full RSI CPG for context. <b>Tube sizes & age</b> has equipment references.", "alt": "Resus Pocket screen detail: Find weight-based RSI doses"}, {"title": "Use a checklist or cause prompt", "image": "tutorial/step-08.png", "action": "Open <b>Arrest checklist</b> from the footer. Find the other checklists under <b>Guidance</b>.", "note": "Each tick is timestamped. Checklists open full-screen with Back. The 4 Hs and 4 Ts are together in Guidance; tap a cause for its prompt.", "alt": "Resus Pocket screen detail: Use a checklist or cause prompt"}, {"title": "Add an event or correction", "image": "tutorial/step-09.png", "action": "Tap <b>+ Event</b> to add a note or an earlier event.", "note": "Open <b>Log</b> to review colour-coded entries. Use an entry’s edit control to correct it. <b>••• → Undo last action</b> reverses the last action.", "alt": "Resus Pocket screen detail: Add an event or correction"}, {"title": "Copy the event log", "image": "tutorial/step-10.png", "action": "Tap <b>Log</b>, then <b>Export</b>. Paste the copied text where you need it.", "note": "Each line contains <b>hh:mm:ss + key details</b>. Export before starting a new patient or clearing browser data; the session saves on this device.", "alt": "Resus Pocket screen detail: Copy the event log"}];
