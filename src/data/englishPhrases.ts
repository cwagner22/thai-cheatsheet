/**
 * English practice sentences for the English Speaking page, in General
 * American IPA. Content words carry their citation form; the function words
 * (the, and, a, than, her) carry the weak form a speaker actually uses
 * mid-sentence, since that is what the native voice says.
 */

export interface EnglishWord {
  /** As printed, with any punctuation that follows it. */
  text: string;
  /** Phonemic IPA without slashes. */
  ipa: string;
}

export interface EnglishPhrase {
  id: string;
  words: EnglishWord[];
  /** What the sentence drills, in plain words. */
  focus: string;
}

/** Pairs of text and IPA, split on whitespace in step. */
function phrase(id: string, text: string, ipa: string, focus: string): EnglishPhrase {
  const texts = text.split(/\s+/);
  const ipas = ipa.split(/\s+/);
  if (texts.length !== ipas.length) throw new Error(`${id}: ${texts.length} words but ${ipas.length} IPA forms`);
  return { id, words: texts.map((t, i) => ({ text: t, ipa: ipas[i] })), focus };
}

export const ENGLISH_PHRASES: EnglishPhrase[] = [
  phrase(
    'she-won',
    'She won her run',
    'ʃiː wʌn hɚ ɹʌn',
    '“Won” and “run” share the short, relaxed /ʌ/ of “cup”. “Her” is /ɚ/: one r-coloured vowel with the tongue bunched back, no separate “e” then “r”.',
  ),
  phrase(
    'one-more-run',
    'Really one more run',
    'ˈɹɪli wʌn mɔːɹ ɹʌn',
    '“One” sounds exactly like “won”: start from rounded lips, /w/. For every /ɹ/ the tongue tip curls up but never touches the roof of the mouth, unlike the /l/ in “really”.',
  ),
  phrase(
    'low-row',
    'Run and write the low row. Throw it.',
    'ɹʌn ənd ɹaɪt ðə loʊ ɹoʊ θɹoʊ ɪt',
    '“Low” against “row”: for /l/ the tongue tip presses behind the top teeth, for /ɹ/ it touches nothing. /oʊ/ is a glide, the lips closing in towards “oo” at the end. “Throw” starts with the tongue between the teeth.',
  ),
  phrase(
    'grow-up',
    'Grow up, I grew more than you',
    'ɡɹoʊ ʌp aɪ ɡɹuː mɔːɹ ðən juː',
    '“Grow” and “grew” start the same, /ɡɹ/, and differ only in the vowel: /oʊ/ glides, /uː/ stays on a tight “oo”. “Grow up” runs together, the glide carrying straight into “up”.',
  ),
  phrase(
    'low-point',
    'The law is at a low point',
    'ðə lɔː ɪz æt ə loʊ pɔɪnt',
    '“Law” holds one steady open /ɔː/, the jaw dropped; “low” glides and closes. Same /l/, so the vowel alone tells them apart. “Point” glides the other way, /ɔɪ/, towards “ee”.',
  ),
  phrase(
    'raw-meat',
    'I saw the raw meat. We row the boat and go down the road.',
    'aɪ sɔː ðə ɹɔː miːt wiː ɹoʊ ðə boʊt ənd ɡoʊ daʊn ðə ɹoʊd',
    '“Saw” and “raw” hold a steady /ɔː/; “row”, “boat”, “go” and “road” all glide, /oʊ/. “Raw” against “row” is the same /ɹ/ with the two different vowels.',
  ),
  phrase(
    'her-race',
    'Her one race or run',
    'hɝː wʌn ɹeɪs ɔːɹ ɹʌn',
    '“Her” is a single r-coloured vowel, /ɝː/, the tongue bunched from the start; “or” is two sounds, an open rounded /ɔː/ that then moves to /ɹ/. “Race” glides, /eɪ/; “run” is the short /ʌ/ of “cup”.',
  ),
];

export const englishText = (p: EnglishPhrase): string => p.words.map(w => w.text).join(' ');

/** The whole sentence in IPA, with a minor break `|` after a comma and a
 *  major break `‖` between sentences. */
export function englishIpa(p: EnglishPhrase): string {
  const parts: string[] = [];
  p.words.forEach((w, i) => {
    parts.push(w.ipa);
    if (i === p.words.length - 1) return;
    if (/[.!?]$/.test(w.text)) parts.push('‖');
    else if (/[,;:]$/.test(w.text)) parts.push('|');
  });
  return `/${parts.join(' ')}/`;
}
