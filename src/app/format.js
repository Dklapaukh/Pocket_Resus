/* Display helpers (escape, clock, time, notes, guideline links and short messages).
   Shared screen state, including the toast timeout, lives in st (see state.js). */
import { $ } from './base.js';
import { st } from './state.js';

/* Make text safe to put inside HTML (stops typed notes being treated as page code). */
export const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/* Milliseconds -> clock text: MM:SS, or HH:MM:SS from one hour (always two digits each). */
export function clock(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000)),
    h = Math.floor(sec / 3600);
  return (
    (h ? h.toString().padStart(2, '0') + ':' : '') +
    Math.floor((sec % 3600) / 60)
      .toString()
      .padStart(2, '0') +
    ':' +
    (sec % 60).toString().padStart(2, '0')
  );
}

/* Milliseconds left -> clock text, rounded up to the next whole second (so 00:00 shows only at zero). */
export function countdown(ms) {
  return clock(Math.ceil(Math.max(0, ms) / 1000) * 1000);
}

/* Timestamp -> 24-hour time of day with seconds (HH:MM:SS, NZ format), as shown in the log. */
export function time(at) {
  return new Date(at).toLocaleTimeString('en-NZ', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/* Timestamp -> local date-time text in the form used by time inputs (YYYY-MM-DDTHH:MM). */
export function local(at) {
  const d = new Date(at);
  return new Date(at - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/* Escape the text, then show references such as "EAS 3.14" or "CPG 3.14" as an italic "EAS guideline 3.14"
   (ANZCOR references keep the ANZCOR name). */
export function formatGuidelineReference(value) {
  return esc(value).replace(
    /\b(EAS|CPG|ANZCOR)(?: guideline)?\s+(\d+\.\d+)/g,
    (_, issuer, number) =>
      '<em>' + (issuer === 'ANZCOR' ? 'ANZCOR' : 'EAS') + ' guideline ' + number + '</em>',
  );
}

/* Restyle guideline references found in the text inside a screen area. */
export function normalizeGuidelineReferences(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
    nodes = [];
  let node;
  while ((node = walker.nextNode()))
    if (!node.parentElement.closest('em,script,style,textarea,code,pre')) nodes.push(node);
  for (const textNode of nodes) {
    const text = textNode.nodeValue,
      re = /\b(EAS|CPG|ANZCOR)(?: guideline)?\s+(\d+\.\d+(?:\s*(?:\/|and|,)\s*\d+\.\d+)*)/g;
    let m,
      last = 0,
      fragment = document.createDocumentFragment(),
      found = false;
    while ((m = re.exec(text))) {
      found = true;
      fragment.append(document.createTextNode(text.slice(last, m.index)));
      const issuer = m[1] === 'ANZCOR' ? 'ANZCOR' : 'EAS',
        parts = m[2].split(/(\s*(?:\/|and|,)\s*)/);
      for (const part of parts) {
        if (/^\d/.test(part)) {
          const em = document.createElement('em');
          em.textContent = issuer + ' guideline ' + part;
          fragment.append(em);
        } else fragment.append(document.createTextNode(part));
      }
      last = re.lastIndex;
    }
    if (found) {
      fragment.append(document.createTextNode(text.slice(last)));
      textNode.replaceWith(fragment);
    }
  }
}

/* Grow a note box to fit what has been typed. */
export function fitNote(field) {
  if (!field.getClientRects().length) return;
  field.style.height = 'auto';
  field.style.height = field.scrollHeight + 2 + 'px';
}

/* Resize every note box in the open pop-up. */
export function fitNotes() {
  document.querySelectorAll('#sheet textarea').forEach(fitNote);
}

/* Hide optional time/notes boxes behind a tap-to-open line so pop-ups stay short. */
export function compactOptionalFields() {
  const root = $('sheet');
  for (const field of root.querySelectorAll(
    'form input[name="at"][type="time"],form [name="notes"]',
  )) {
    if (field.closest('#editForm')) continue;
    const label = field.closest('label');
    if (!label) continue;
    const details = document.createElement('details'),
      summary = document.createElement('summary'),
      isTime = field.name === 'at';
    details.className = 'optional-entry ' + (isTime ? 'optional-time' : 'optional-note');
    const update = () => {
      if (isTime) summary.textContent = 'Time: ' + field.value + ' · Edit';
      else if (field.value.trim()) summary.textContent = 'Note added · Edit';
      else summary.textContent = '+ Add note';
    };
    update();
    details.append(summary);
    label.before(details);
    details.append(label);
    field.addEventListener('input', update);
    field.addEventListener('change', update);
  }
}


/* Show a short message at the bottom for 4 seconds. */
export function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(st.toastTimeout);
  st.toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 4000);
}
