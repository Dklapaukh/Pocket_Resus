// Finds every comment in the frozen baseline rules file (tests/baseline/nz-eas-v22-a8.js) and works out
// which value it explains, as a dotted path such as "numbers.timing.cprCycleMs". The JSON rules file
// cannot hold comments, so each one is kept as a plain-English note under "notes" at that path.
//
// Rule: a comment after a value on the same line explains that value. A comment on its own line(s)
// explains the next value that follows it. Comments before "export const RULES" are the file header.
// Several comments for one value are joined with a blank line.
import { parse } from 'acorn';

// Comment text with its markers removed and its line breaks and indents turned into single spaces.
export function plainCommentText(comment) {
  const lines = comment.value.split('\n').map((line) => line.replace(/^\s*\*?\s?/, '').trim());
  return lines.join('\n').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// As above, but a blank line inside a block comment stays a paragraph break.
export function commentParagraphs(comment) {
  return comment.value.split('\n').map((line) => line.trim()).join('\n').split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export function baselineComments(source) {
  const comments = [];
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true, onComment: comments });
  const decl = ast.body.find((n) => n.type === 'ExportNamedDeclaration').declaration.declarations[0];
  const props = []; // every property of the rules object, with its dotted path
  (function walk(node, path) {
    if (node.type === 'ObjectExpression') {
      for (const p of node.properties) {
        const key = p.key.type === 'Identifier' ? p.key.name : String(p.key.value);
        const here = path ? path + '.' + key : key;
        props.push({ path: here, start: p.start, end: p.end, endLine: p.loc.end.line });
        walk(p.value, here);
      }
    } else if (node.type === 'ArrayExpression') node.elements.forEach((e, i) => walk(e, path + '.' + i));
  })(decl.init, '');
  const rulesStart = ast.body.find((n) => n.type === 'ExportNamedDeclaration').start;
  return comments.map((c, index) => {
    let path;
    if (c.start < rulesStart) path = index === 0 ? 'BASELINE-MARKER' : 'about';
    else {
      const sameLine = props.filter((p) => p.endLine === c.loc.start.line && p.end <= c.start);
      if (sameLine.length) path = sameLine.reduce((a, b) => (b.end >= a.end ? b : a)).path;
      else path = props.find((p) => p.start >= c.end).path;
    }
    return { index, path, text: plainCommentText(c), paragraphs: commentParagraphs(c) };
  });
}
