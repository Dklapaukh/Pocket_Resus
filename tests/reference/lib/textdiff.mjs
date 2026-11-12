// Reference recordings (stage 0): readable line-by-line differences between two versions of a surface.

/* Readable lines: HTML split at tags; JSON pretty-printed; "|" parts of a surface on their own lines. */
export function lines(text) {
  if (!text) return [];
  if (/^[[{]/.test(text)) { try { return JSON.stringify(JSON.parse(text), null, 1).split('\n'); } catch {} }
  return text.replace(/></g, '>\n<').replace(/\|/g, '\n|').split('\n');
}

/* Line difference (longest common subsequence). "-" = before, "+" = after. `context` matching lines are
   kept around each change (Infinity = keep every line); longer runs are shortened to "… n matching line(s)". */
export function diff(a, b, context = 0) {
  const n = a.length, m = b.length;
  if (n * m > 4e6) return ['(too long to compare line by line; use show.mjs --full)'];
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { ops.push(['=', a[i]]); i++; j++; }
    else if (i < n && (j === m || L[i + 1][j] >= L[i][j + 1])) ops.push(['-', a[i++]]);
    else ops.push(['+', b[j++]]);
  }
  const out = [];
  for (let k = 0; k < ops.length;) {
    if (ops[k][0] !== '=') { out.push(`  ${ops[k][0]} ${ops[k][1]}`); k++; continue; }
    let e = k; while (e < ops.length && ops[e][0] === '=') e++;
    const run = ops.slice(k, e), keepStart = k === 0 ? 0 : context, keepEnd = e === ops.length ? 0 : context;
    if (run.length <= keepStart + keepEnd) run.forEach(([, t]) => out.push('    ' + t));
    else {
      run.slice(0, keepStart).forEach(([, t]) => out.push('    ' + t));
      out.push(`    … ${run.length - keepStart - keepEnd} matching line(s)`);
      run.slice(run.length - keepEnd).forEach(([, t]) => out.push('    ' + t));
    }
    k = e;
  }
  return out;
}
