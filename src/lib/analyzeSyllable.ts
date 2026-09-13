import { CONSONANTS, type ConsonantClass } from '../data/consonants';

/**
 * Simplified single-syllable Thai analyzer, for driving the tone-table
 * lookup demo. Handles a single leading consonant, one of Thai's genuine or
 * pseudo initial clusters (ปลา, ตรง, สร้าง — the class always comes from the
 * first letter, so the second is just dropped once recognized), or a ห-นำ
 * digraph (ห silencing itself before a low-class sonorant ง น ม ย ร ล ว,
 * which then reads as high class) — plus one vowel and an optional final.
 * Two leading consonants that AREN'T one of those recognized pairs return
 * null rather than guessing which one governs the tone.
 */

export type ToneMark = 'ek' | 'tho' | 'tri' | 'chattawa';

const MARK_CHAR: Record<string, ToneMark> = {
  '่': 'ek',       // ่ ไม้เอก
  '้': 'tho',      // ้ ไม้โท
  '๊': 'tri',      // ๊ ไม้ตรี
  '๋': 'chattawa', // ๋ ไม้จัตวา
};

const LEADING_VOWELS = new Set(['เ', 'แ', 'โ', 'ใ', 'ไ']);
const SONORANTS_FOR_HO_NAM = new Set(['ง', 'น', 'ม', 'ย', 'ร', 'ล', 'ว']);
const IS_CONSONANT = (ch: string) => ch >= 'ก' && ch <= 'ฮ';

/** Thai's closed list of two-letter initial clusters. Genuine (ควบแท้) —
 *  both letters audibly pronounced together — plus pseudo (ควบไม่แท้),
 *  where the ร is silent or changes the first letter's sound (ทราบ /sâːp/,
 *  สร้าง /sâːŋ/). Either way, the tone class comes from the first letter
 *  only. Any other two-consonant sequence isn't a recognized cluster. */
const CLUSTER_PAIRS = new Set([
  'กร', 'กล', 'กว', 'ขร', 'ขล', 'ขว', 'คร', 'คล', 'คว', 'ตร', 'ปร', 'ปล', 'ผล', 'พร', 'พล',
  'จร', 'ซร', 'ทร', 'ศร', 'สร',
]);

export interface SyllableAnalysis {
  /** The letter whose class governs the tone (the ห-นำ sonorant itself if
   *  that pattern applied, not the silent ห — its class is already folded
   *  into `klass`). */
  initial: string;
  klass: ConsonantClass;
  mark: ToneMark | null;
  /** Only meaningful when `mark` is null. */
  isLive: boolean;
  vowelLength: 'short' | 'long';
  hasFinal: boolean;
}

const consonantByLetter = new Map(CONSONANTS.map(c => [c.letter, c]));

/** Stop finals (/k/ /t/ /p/) make a syllable dead; sonorant finals (the
 *  rest) keep it live. Consonants that can't end a syllable ("—") or
 *  aren't recognized fall back to null — caller should bail out. */
function finalIsStop(letter: string): boolean | null {
  const info = consonantByLetter.get(letter);
  if (!info || info.final === '—') return null;
  return /[ktp]/.test(info.final);
}

export function analyzeSyllable(raw: string): SyllableAnalysis | null {
  let s = raw.trim();
  if (!s) return null;

  let mark: ToneMark | null = null;
  const chars = [...s];
  for (const ch of chars) {
    if (MARK_CHAR[ch]) { mark = MARK_CHAR[ch]; break; }
  }
  s = chars.filter(ch => !MARK_CHAR[ch]).join('');

  // ์ (thanthakhat) silences the letter right before it — drop both.
  s = s.replace(/.์/gu, '');

  const shortened = s.includes('็'); // ็ mai taikhu forces a short vowel
  s = s.replace(/็/gu, '');

  let leadVowel = '';
  while (s.length && LEADING_VOWELS.has(s[0])) {
    leadVowel += s[0];
    s = s.slice(1);
  }

  if (!s.length || !IS_CONSONANT(s[0])) return null;
  let initial = s[0];
  let rest = s.slice(1);
  let klass: ConsonantClass;

  // ห-นำ: silent ห before a low-class sonorant reassigns that sonorant to
  // high class. Only fires when ห is immediately followed by exactly one
  // of those sonorants and then a vowel (not another consonant) — this is
  // the narrow, common case, not the full set of ห-นำ words.
  if (initial === 'ห' && rest.length && SONORANTS_FOR_HO_NAM.has(rest[0]) && (rest.length === 1 || !IS_CONSONANT(rest[1]))) {
    initial = rest[0];
    klass = 'high';
    rest = rest.slice(1);
  } else {
    const info = consonantByLetter.get(initial);
    if (!info) return null;
    klass = info.klass;
    if (rest.length && CLUSTER_PAIRS.has(initial + rest[0])) {
      // A recognized cluster — the class already came from the first
      // letter, so just drop the second rather than misreading it as
      // the final consonant.
      rest = rest.slice(1);
    } else if (rest.length > 1 && IS_CONSONANT(rest[0])) {
      // Two consonants in a row that ISN'T a recognized cluster — could be
      // a final we'd misread, or a combination outside this analyzer's
      // scope. Not confident enough to guess, so bail.
      return null;
    }
  }

  if (!rest.length) {
    // Bare initial (+ leading vowel only), no other vowel sign or final.
    if (!leadVowel) return null; // e.g. a lone consonant — not a real syllable
    const isAiDiphthong = leadVowel === 'ใ' || leadVowel === 'ไ';
    return {
      initial, klass, mark,
      isLive: isAiDiphthong || !shortened,
      vowelLength: shortened ? 'short' : 'long',
      hasFinal: false,
    };
  }

  // ะ marks an open, short syllable — but only when it's the last character.
  // ะ anywhere else (e.g. "ระตู", the ระ- of ประตู after the ปร- cluster is
  // dropped) means the short vowel closes a DIFFERENT syllable than the one
  // we're parsing — a sign this is actually multiple syllables run
  // together, not something to confidently answer for.
  const eIdx = rest.indexOf('ะ');
  if (eIdx !== -1 && eIdx !== rest.length - 1) return null;
  if (rest.endsWith('ะ')) {
    return { initial, klass, mark, isLive: false, vowelLength: 'short', hasFinal: false };
  }

  const hasMaiHanAkat = rest.includes('ั');
  const strippedForFinal = rest.replace(/[ะัาิีึืุูอำ]/gu, '');
  // More than one leftover consonant means more structure than a single
  // vowel + one final accounts for — likely another syllable, not a final
  // we can pick out reliably.
  if (strippedForFinal.length > 1) return null;
  const finalLetter = strippedForFinal.length ? strippedForFinal[0] : null;

  let vowelLength: 'short' | 'long';
  if (shortened || hasMaiHanAkat) vowelLength = 'short';
  else if (/[ีูา]|ือ/.test(rest) || leadVowel) vowelLength = 'long'; // า ี ู ือ, or any เ/แ/โ/ใ/ไ-based vowel
  else if (/[ึุิ]/.test(rest)) vowelLength = 'short';
  else vowelLength = rest.length && !finalLetter ? 'long' /* bare อ = /ɔː/ */ : 'short'; // implicit vowel, e.g. นก

  if (!finalLetter) {
    return { initial, klass, mark, isLive: vowelLength === 'long', vowelLength, hasFinal: false };
  }
  const stop = finalIsStop(finalLetter);
  if (stop === null) return null;
  return { initial, klass, mark, isLive: !stop, vowelLength, hasFinal: true };
}
