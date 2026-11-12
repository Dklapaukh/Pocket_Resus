// Reference recordings (stage 0): how a played case is stored compactly and compared.
//
// For every step and every surface (header, main screen, pop-up, ...) we keep a SHORT fingerprint
// (4 characters, from a SHA-256 hash of the full HTML/text), and only when that surface CHANGED since
// the previous step. Each step is: one character saying which surfaces changed, then their
// fingerprints. A full-strength fingerprint of the whole case (every surface of every step, in full)
// is kept as well, so even a difference the short fingerprints happened to miss is still caught.
// The short ones are there to say WHERE the first difference is: which case, step and surface.
import { createHash } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'; // 64 = up to 6 surfaces
const short = (text) => createHash('sha256').update(text).digest('base64url').slice(0, 4);
export const fingerprint = (text, len = 16) => createHash('sha256').update(text).digest('hex').slice(0, len);

/* steps: [{ label, screens: {...}, saved: {...} }]; part: 'screens' or 'saved'; names: surface order. */
export function encodePart(steps, part, names) {
  if (names.length > 6) throw new Error('at most 6 surfaces per part');
  const chain = createHash('sha256');
  let prev = Object.fromEntries(names.map((n) => [n, '']));
  let out = '';
  for (const step of steps) {
    let mask = 0, hashes = '';
    names.forEach((n, i) => {
      const text = step[part][n] ?? '';
      chain.update(n + '\u0000' + text + '\u0001');
      if (text !== prev[n]) { mask |= 1 << i; hashes += short(text); }
    });
    out += ALPHABET[mask] + hashes;
    prev = Object.fromEntries(names.map((n) => [n, step[part][n] ?? '']));
  }
  return { s: out, c: chain.digest('hex').slice(0, 16) };
}

/* Split an encoded string back into one entry per step: { surface: fingerprint } for changed ones. */
export function decodePart(s, names) {
  const steps = [];
  for (let i = 0; i < s.length;) {
    const mask = ALPHABET.indexOf(s[i++]);
    if (mask < 0) throw new Error('damaged recording at character ' + (i - 1));
    const changed = {};
    names.forEach((n, b) => { if (mask & (1 << b)) { changed[n] = s.slice(i, i + 4); i += 4; } });
    steps.push(changed);
  }
  return steps;
}

export function encodeCase(info, steps, screenNames, savedNames) {
  return {
    id: info.id,
    theme: info.theme,
    n: steps.length,
    a: fingerprint(steps.map((x) => x.label).join('\n'), 12), // the actions taken, in order
    screens: encodePart(steps, 'screens', screenNames),
    saved: encodePart(steps, 'saved', savedNames),
  };
}

/* Compare one part of a played case with its recording. Returns null if identical, otherwise the
   first difference: { step (1-based), surfaces: [...], note }. */
export function comparePart(recorded, now, part, names) {
  const want = recorded[part], got = now[part];
  if (want.s === got.s && want.c === got.c) return null;
  const a = decodePart(want.s, names), b = decodePart(got.s, names);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (!a[i] || !b[i]) return { step: i + 1, surfaces: [], note: `the case has ${b.length} steps now but ${a.length} were recorded` };
    const differ = names.filter((n) => a[i][n] !== b[i][n]);
    if (differ.length) return { step: i + 1, surfaces: differ, note: '' };
  }
  return { step: null, surfaces: [], note: 'every short fingerprint matches but the full fingerprint of the case differs (a rare clash); use the show tool' };
}

/* Write a recording: a header, then one case per line (readable diffs in git, small file). */
export function writeRecording(header, cases, part) {
  const lines = cases.map((c) => JSON.stringify({ id: c.id, theme: c.theme, n: c.n, a: c.a, c: c[part].c, s: c[part].s }));
  return '{\n"header": ' + JSON.stringify(header, null, 1) + ',\n"cases": [\n' + lines.join(',\n') + '\n]}\n';
}

/* Read a recording back into { header, cases: Map(id -> { id, theme, n, a, [part]: { s, c } }) }. */
export function readRecording(text, part) {
  const data = JSON.parse(text);
  const cases = new Map(data.cases.map((c) => [c.id, { id: c.id, theme: c.theme, n: c.n, a: c.a, [part]: { s: c.s, c: c.c } }]));
  return { header: data.header, cases };
}
