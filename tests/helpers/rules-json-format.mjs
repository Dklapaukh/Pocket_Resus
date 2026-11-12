// The one agreed layout of src/rules/nz-eas.json, so a person can read it and a one-value change is a
// one-line difference:
//   - 2-space indent; every key of an object on its own line;
//   - a list of plain values (numbers, words) stays on one line if the line fits in 100 characters,
//     otherwise one value per line; a list of objects is always one object per block.
// tests/rules-json-same-as-baseline.test.mjs requires the file to be written exactly this way.
const WIDTH = 100;
const scalar = (v) => v === null || typeof v !== 'object';

export function formatRulesJson(value) {
  return format(value, 0, 0) + '\n';
}

function format(value, indent, prefixLength) {
  if (scalar(value)) return JSON.stringify(value);
  const pad = ' '.repeat(indent), inner = ' '.repeat(indent + 2);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every(scalar)) {
      const oneLine = '[' + value.map((v) => JSON.stringify(v)).join(', ') + ']';
      if (indent + prefixLength + oneLine.length + 1 <= WIDTH) return oneLine;
    }
    return '[\n' + value.map((v) => inner + format(v, indent + 2, 0)).join(',\n') + '\n' + pad + ']';
  }
  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  return '{\n' + keys.map((k) => {
    const prefix = JSON.stringify(k) + ': ';
    return inner + prefix + format(value[k], indent + 2, prefix.length);
  }).join(',\n') + '\n' + pad + '}';
}
