/* RULES FILE WRITER: turns the whole rules file (as read by parse.js) into the ONE standard layout of
   nz-eas.yaml. Not loaded by the phone app; the tests use it now and the rules editor will use it to save.

   The layout (so a one-value change is a one-line difference):
     - 2-space indent, no comments, no anchors, no tags, one value per line, no wrapping or folding;
     the last line is the end mark "..." (so a cut-short file is always refused);
     - text is written plain only when it is plainly safe: it starts with a letter, has no colon, #,
       quote-mark trouble, tab or line break, no space at either end, and is not a word YAML treats as
       something else (true, false, null, yes, no, on, off, y, n, nan, inf, infinity, ~);
     - ALL other text (digits first, colons, #, empty, leading/trailing spaces, line breaks, symbols
       first) is written in "double quotes", so it can never be mistaken for a number, true/false,
       null or a date.
   The file on disk must be exactly rulesFileText(readYamlStrict(file)): a test proves it, so "open, save
   without edits" leaves the file unchanged. This file holds no clinical numbers or wording. */
import { dump, JSON_SCHEMA, DEFAULT_SCALAR_STYLE_RULES, SCALAR_STYLE_PLAIN, SCALAR_STYLE_DOUBLE_QUOTED } from '../vendor/js-yaml.mjs';
import { checkPlainValues, END_MARK } from './parse.js';

const WORDS_YAML_MIGHT_READ_AS_OTHER_THINGS = /^(true|false|null|yes|no|on|off|y|n|nan|inf|infinity|~)$/i;
// starts with a letter; after that only letters, digits, symbols and ordinary single spaces: no colon, #,
// double quote, backslash, tab, line break, odd space characters or invisible characters
const PLAINLY_SAFE_TEXT = /^\p{L}(?:[^:#"\\\p{C}\p{Z}]| )*$/u;

/* True if this text can be written without quotes and still be read back as the same text. */
export function isPlainlySafe(text) {
  return PLAINLY_SAFE_TEXT.test(text) && !text.endsWith(' ') && !WORDS_YAML_MIGHT_READ_AS_OTHER_THINGS.test(text);
}

/* One extra styling rule on top of the library's own safety rules: any text (or name) that is not plainly
   safe gets double quotes. Line breaks never become | or > blocks: they are written as \n inside quotes. */
function quoteUnlessPlainlySafe(layout) {
  const isText = layout.node.tag === JSON_SCHEMA.defaultScalarTag.tagName; // numbers, true/false and null stay as they are
  if (isText && layout.style === SCALAR_STYLE_PLAIN && !isPlainlySafe(layout.node.value)) layout.style = SCALAR_STYLE_DOUBLE_QUOTED;
}

const {
  applyQuoteFlowKeysOption, applyForceQuotesOption, tryLongOrMultilineAsBlock, // not used: no block styles, no force option
  ...libraryRulesWeKeep
} = DEFAULT_SCALAR_STYLE_RULES;

const WRITER_OPTIONS = {
  schema: JSON_SCHEMA,         // the same rules the reader uses (numbers, true/false and null are the only special values)
  indent: 2,
  lineWidth: -1,               // never wrap or fold a line
  noRefs: true,                // never write anchors or aliases
  quoteStyle: 'double',
  scalarStyleRules: [quoteUnlessPlainlySafe, ...Object.values(libraryRulesWeKeep)],
};

/* Returns the text of the rules file for this object: exactly one layout, ending in the end mark line
   (see END_MARK in parse.js) so that a file cut short can always be told from a whole one.
   Throws a plain message if anything in it is not a finite number, true/false, text, null, a list or a map. */
export function rulesFileText(wholeFile) {
  checkPlainValues(wholeFile);
  return dump(wholeFile, WRITER_OPTIONS) + END_MARK + '\n';
}
