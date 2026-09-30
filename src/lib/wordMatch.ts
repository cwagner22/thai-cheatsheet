/**
 * Lines up what a speech recogniser heard against the sentence that was
 * meant, word by word, for the English page's "Heard" line.
 */

/** Words that sound the same. A recogniser picks between them from context,
 *  not from the sound, so hearing "won" for "one" says nothing about the
 *  speaker and counts as a match. Each group maps to its first member. */
const HOMOPHONES: string[][] = [
  ['one', 'won', '1'],
  ['write', 'right', 'rite', 'wright'],
  ['row', 'roe', 'rho'],
  ['road', 'rode', 'rowed'],
  ['meat', 'meet', 'mete'],
  ['i', 'eye', 'aye'],
  ['we', 'wee'],
  ['you', 'u', 'ewe', 'yew'],
  ['low', 'lo'],
  ['throw', 'throe'],
  ['to', 'too', 'two', '2'],
  ['for', 'four', '4'],
  ['and', '&'],
];
const CANONICAL = new Map(HOMOPHONES.flatMap(group => group.map(w => [w, group[0]] as const)));

/** Lower case, punctuation off the ends, homophones folded together. */
function key(word: string): string {
  const bare = word.toLowerCase().replace(/^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&']+$/gu, '').replace(/’/g, "'");
  return CANONICAL.get(bare) ?? bare;
}

export const words = (text: string): string[] => text.split(/\s+/).filter(w => key(w) !== '');

export interface WordMatch {
  /** For each target word, whether the recogniser heard it. */
  target: boolean[];
  /** For each heard word, whether it lines up with a target word. */
  heard: boolean[];
}

/** Longest common subsequence of the two word lists, so one missed or
 *  extra word does not knock every word after it out of line. */
export function matchWords(target: string[], heard: string[]): WordMatch {
  const a = target.map(key);
  const b = heard.map(key);
  const n = a.length;
  const m = b.length;
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const result: WordMatch = { target: new Array(n).fill(false), heard: new Array(m).fill(false) };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.target[i] = true;
      result.heard[j] = true;
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return result;
}
