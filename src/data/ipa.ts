// IPA reference data — vowels, pulmonic & non-pulmonic consonants, affricates.
// Adapted from the layout of ipachart.com (captured at /Users/chris/Dev/ipa-chart).
//
// All example words use **bold markers** around the letter(s) that produce the
// phoneme. E.g. `t: '**t**ea'` renders as <strong>t</strong>ea.
//
// Each entry has a `wiki` slug pointing at the Wikipedia article where the
// audio clip (sourced from Wikimedia Commons) is embedded.

export type ExampleLang = 'en' | 'fr' | 'de' | 'es' | 'it' | 'th';

export const LANGUAGE_OPTIONS: { value: ExampleLang; label: string }[] = [
  { value: 'th', label: 'Thai' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
];

// --- Descriptions for tooltips -------------------------------------------

export const MANNER_DESCRIPTIONS: Record<string, string> = {
  plosive: 'Air is stopped completely, then released (e.g. p, t, k).',
  nasal: 'Air flows through the nose while the mouth is blocked (e.g. m, n, ŋ).',
  trill: 'The articulator vibrates against another (e.g. rolled r).',
  tap: 'A single quick tap, shorter than a trill (e.g. Spanish pero).',
  fricative: 'Air is forced through a narrow channel, creating turbulence (e.g. f, s, h).',
  'lat-fricative': 'Friction along the sides of the tongue (rare — Welsh "ll").',
  approximant: 'Articulators approach but don\'t create turbulence (e.g. w, y, English r).',
  'lat-approximant': 'Air flows around the sides of the tongue (e.g. l).',
};

export const PLACE_DESCRIPTIONS: Record<string, string> = {
  bilabial: 'Both lips together (e.g. p, b, m).',
  labiodental: 'Lower lip against upper teeth (e.g. f, v).',
  dental: 'Tongue tip against upper teeth (e.g. English th).',
  alveolar: 'Tongue tip at the ridge behind the upper teeth (e.g. t, d, n, s).',
  'post-alveolar': 'Tongue just behind the alveolar ridge (e.g. sh, zh, ch).',
  retroflex: 'Tongue tip curled back (rare in English; common in Hindi).',
  palatal: 'Tongue body against the hard palate (e.g. y).',
  velar: 'Tongue back against the soft palate (e.g. k, g, ng).',
  uvular: 'Tongue root against the uvula (e.g. French r).',
  pharyngeal: 'Constriction in the pharynx (e.g. Arabic ħ).',
  glottal: 'At the vocal folds (e.g. h, the stop in "uh-oh").',
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Clicks: 'Suction-based consonants — pull air inward with the tongue. Common in southern African languages (Xhosa, Zulu).',
  'Voiced implosives': 'Stops where the larynx drops, sucking air inward while voiced. Found in Sindhi, Hausa, Vietnamese.',
  Ejectives: 'Stops where the closed glottis pushes air outward like a pop. Common in Caucasian, Ethiopian, and Native American languages.',
  Affricates: 'A stop smoothly transitioning into a fricative at the same place — pronounced as a single unit (e.g. English "ch", "j").',
  'Other symbols': 'Articulations that don\'t fit the main pulmonic grid — co-articulations, double-place sounds, or rare phones.',
};

// --- Vowels -----------------------------------------------------------------

export type VowelRow =
  | 'close'
  | 'near-close'
  | 'close-mid'
  | 'mid'
  | 'open-mid'
  | 'near-open'
  | 'open';

export type VowelCol = 'front' | 'near-front' | 'central' | 'near-back' | 'back';

export const VOWEL_ROWS: VowelRow[] = [
  'close', 'near-close', 'close-mid', 'mid', 'open-mid', 'near-open', 'open',
];
export const VOWEL_COLS: VowelCol[] = [
  'front', 'near-front', 'central', 'near-back', 'back',
];

export interface IPAVowel {
  symbol: string;
  row: VowelRow;
  col: VowelCol;
  rounded: boolean;
  examples: Partial<Record<ExampleLang, string>>;
  wiki: string;
  /** Audio basename on Commons when it differs from `wiki` (some don't match). */
  audio?: string;
}

export const VOWELS: IPAVowel[] = [
  // close
  { symbol: 'i', row: 'close', col: 'front',   rounded: false, examples: { en: 's**ea**t', fr: 's**i**', it: 'v**i**no', es: 's**í**', de: 'B**ie**r', th: '**กี่**' },     wiki: 'Close_front_unrounded_vowel' },
  { symbol: 'y', row: 'close', col: 'front',   rounded: true,  examples: { fr: 't**u**', de: '**ü**ber' },                                                                   wiki: 'Close_front_rounded_vowel' },
  { symbol: 'ɨ', row: 'close', col: 'central', rounded: false, examples: {},                                                                                                   wiki: 'Close_central_unrounded_vowel' },
  { symbol: 'ʉ', row: 'close', col: 'central', rounded: true,  examples: {},                                                                                                   wiki: 'Close_central_rounded_vowel' },
  { symbol: 'ɯ', row: 'close', col: 'back',    rounded: false, examples: { th: '**มือ**' },                                                                                   wiki: 'Close_back_unrounded_vowel' },
  { symbol: 'u', row: 'close', col: 'back',    rounded: true,  examples: { en: 'b**oo**t', fr: 't**ou**t', de: 'g**u**t', es: 't**ú**', it: 'l**u**na', th: '**กู**' },      wiki: 'Close_back_rounded_vowel' },
  // near-close
  { symbol: 'ɪ', row: 'near-close', col: 'near-front', rounded: false, examples: { en: 'b**i**t', de: 'b**i**tte' }, wiki: 'Near-close_near-front_unrounded_vowel' },
  { symbol: 'ʏ', row: 'near-close', col: 'near-front', rounded: true,  examples: { de: 'H**ü**tte' },                 wiki: 'Near-close_near-front_rounded_vowel' },
  { symbol: 'ʊ', row: 'near-close', col: 'near-back',  rounded: true,  examples: { en: 'p**u**t', de: 'M**u**tter' }, wiki: 'Near-close_near-back_rounded_vowel' },
  // close-mid
  { symbol: 'e', row: 'close-mid', col: 'front',   rounded: false, examples: { en: 's**ay**', fr: '**é**té', de: 'z**eh**n', es: 'p**e**ro', it: 'p**e**sca', th: '**เ**ก' }, wiki: 'Close-mid_front_unrounded_vowel' },
  { symbol: 'ø', row: 'close-mid', col: 'front',   rounded: true,  examples: { fr: 'd**eu**x', de: 'sch**ö**n' },       wiki: 'Close-mid_front_rounded_vowel' },
  { symbol: 'ɘ', row: 'close-mid', col: 'central', rounded: false, examples: {},                                         wiki: 'Close-mid_central_unrounded_vowel' },
  { symbol: 'ɵ', row: 'close-mid', col: 'central', rounded: true,  examples: {},                                         wiki: 'Close-mid_central_rounded_vowel' },
  { symbol: 'ɤ', row: 'close-mid', col: 'back',    rounded: false, examples: { th: '**เธอ**' },                      wiki: 'Close-mid_back_unrounded_vowel' },
  { symbol: 'o', row: 'close-mid', col: 'back',    rounded: true,  examples: { en: 'g**o**', fr: '**eau**', de: 'B**oo**t', es: 's**o**l', it: 'n**o**me', th: '**โ**ต' }, wiki: 'Close-mid_back_rounded_vowel' },
  // mid
  { symbol: 'ə', row: 'mid', col: 'central', rounded: false, examples: { en: '**a**bout', fr: 'l**e**', de: 'bitt**e** ' }, wiki: 'Mid-central_vowel' },
  // open-mid
  { symbol: 'ɛ', row: 'open-mid', col: 'front',   rounded: false, examples: { en: 'b**e**d', fr: 'pr**è**s', de: 'B**ä**r', it: 'p**e**sca (open)', th: '**แ**ก' }, wiki: 'Open-mid_front_unrounded_vowel' },
  { symbol: 'œ', row: 'open-mid', col: 'front',   rounded: true,  examples: { fr: 's**œu**r', de: 'K**ö**nner' },          wiki: 'Open-mid_front_rounded_vowel' },
  { symbol: 'ɜ', row: 'open-mid', col: 'central', rounded: false, examples: { en: 'b**ir**d' },                              wiki: 'Open-mid_central_unrounded_vowel' },
  { symbol: 'ɞ', row: 'open-mid', col: 'central', rounded: true,  examples: {},                                               wiki: 'Open-mid_central_rounded_vowel' },
  { symbol: 'ʌ', row: 'open-mid', col: 'back',    rounded: false, examples: { en: 'c**u**t' },                               wiki: 'Open-mid_back_unrounded_vowel' },
  { symbol: 'ɔ', row: 'open-mid', col: 'back',    rounded: true,  examples: { en: 'th**ough**t', fr: 'p**o**rt', de: 'S**o**nne', it: 'n**o**tte', th: 'ก**อ**' }, wiki: 'Open-mid_back_rounded_vowel' },
  // near-open
  { symbol: 'æ', row: 'near-open', col: 'front',   rounded: false, examples: { en: 'c**a**t' }, wiki: 'Near-open_front_unrounded_vowel' },
  { symbol: 'ɐ', row: 'near-open', col: 'central', rounded: false, examples: { de: 'bess**er**' }, wiki: 'Near-open_central_unrounded_vowel' },
  // open
  { symbol: 'a', row: 'open', col: 'front', rounded: false, examples: { en: 'sp**a**', fr: 'l**a**', de: 'M**a**nn', es: 'c**a**sa', it: 'c**a**sa', th: 'ก**า**' }, wiki: 'Open_front_unrounded_vowel' },
  { symbol: 'ɶ', row: 'open', col: 'front', rounded: true,  examples: {},                                 wiki: 'Open_front_rounded_vowel' },
  { symbol: 'ɑ', row: 'open', col: 'back',  rounded: false, examples: { en: 'f**a**ther', fr: 'p**a**s' }, wiki: 'Open_back_unrounded_vowel' },
  { symbol: 'ɒ', row: 'open', col: 'back',  rounded: true,  examples: { en: 'l**o**t (UK)' },               wiki: 'Open_back_rounded_vowel' },
];

// --- Pulmonic consonants ----------------------------------------------------

export type Manner =
  | 'plosive'
  | 'nasal'
  | 'trill'
  | 'tap'
  | 'fricative'
  | 'lat-fricative'
  | 'approximant'
  | 'lat-approximant';

export type Place =
  | 'bilabial'
  | 'labiodental'
  | 'dental'
  | 'alveolar'
  | 'post-alveolar'
  | 'retroflex'
  | 'palatal'
  | 'velar'
  | 'uvular'
  | 'pharyngeal'
  | 'glottal';

export const MANNERS: { key: Manner; label: string }[] = [
  { key: 'plosive',          label: 'Plosive' },
  { key: 'nasal',            label: 'Nasal' },
  { key: 'trill',            label: 'Trill' },
  { key: 'tap',              label: 'Tap or Flap' },
  { key: 'fricative',        label: 'Fricative' },
  { key: 'lat-fricative',    label: 'Lateral Fricative' },
  { key: 'approximant',      label: 'Approximant' },
  { key: 'lat-approximant',  label: 'Lateral Approximant' },
];

export const PLACES: { key: Place; label: string }[] = [
  { key: 'bilabial',      label: 'Bilabial' },
  { key: 'labiodental',   label: 'Labiodental' },
  { key: 'dental',        label: 'Dental' },
  { key: 'alveolar',      label: 'Alveolar' },
  { key: 'post-alveolar', label: 'Post-alveolar' },
  { key: 'retroflex',     label: 'Retroflex' },
  { key: 'palatal',       label: 'Palatal' },
  { key: 'velar',         label: 'Velar' },
  { key: 'uvular',        label: 'Uvular' },
  { key: 'pharyngeal',    label: 'Pharyngeal' },
  { key: 'glottal',       label: 'Glottal' },
];

export interface IPAConsonant {
  symbol: string;
  manner: Manner;
  place: Place;
  voiced: boolean;
  examples: Partial<Record<ExampleLang, string>>;
  wiki: string;
  /** Audio basename on Commons when it differs from `wiki` (some don't match). */
  audio?: string;
}

/** Places where an articulation is physically impossible (kept dark grey). */
export const IMPOSSIBLE: Array<[Manner, Place, boolean]> = [
  ['nasal', 'pharyngeal', false], ['nasal', 'pharyngeal', true],
  ['nasal', 'glottal', false],    ['nasal', 'glottal', true],
  ['trill', 'labiodental', true], ['trill', 'retroflex', true],
  ['trill', 'palatal', false], ['trill', 'palatal', true],
  ['trill', 'velar', false], ['trill', 'velar', true],
  ['trill', 'pharyngeal', false], ['trill', 'pharyngeal', true],
  ['trill', 'glottal', false], ['trill', 'glottal', true],
  ['tap', 'bilabial', false], ['tap', 'bilabial', true],
  ['tap', 'labiodental', false],
  ['tap', 'palatal', false], ['tap', 'palatal', true],
  ['tap', 'velar', false], ['tap', 'velar', true],
  ['tap', 'uvular', false], ['tap', 'uvular', true],
  ['tap', 'pharyngeal', false], ['tap', 'pharyngeal', true],
  ['tap', 'glottal', false], ['tap', 'glottal', true],
  ['lat-fricative', 'bilabial', false], ['lat-fricative', 'bilabial', true],
  ['lat-fricative', 'labiodental', false], ['lat-fricative', 'labiodental', true],
  ['lat-fricative', 'pharyngeal', false], ['lat-fricative', 'pharyngeal', true],
  ['lat-fricative', 'glottal', false], ['lat-fricative', 'glottal', true],
  ['approximant', 'pharyngeal', false], ['approximant', 'pharyngeal', true],
  ['approximant', 'glottal', false], ['approximant', 'glottal', true],
  ['lat-approximant', 'bilabial', false], ['lat-approximant', 'bilabial', true],
  ['lat-approximant', 'labiodental', false], ['lat-approximant', 'labiodental', true],
  ['lat-approximant', 'dental', false], ['lat-approximant', 'dental', true],
  ['lat-approximant', 'uvular', false], ['lat-approximant', 'uvular', true],
  ['lat-approximant', 'pharyngeal', false], ['lat-approximant', 'pharyngeal', true],
  ['lat-approximant', 'glottal', false], ['lat-approximant', 'glottal', true],
];

export const CONSONANTS: IPAConsonant[] = [
  // Plosive
  { symbol: 'p', manner: 'plosive', place: 'bilabial',  voiced: false, examples: { en: '**p**ea',  fr: '**p**as',  de: '**P**ark', es: '**p**ero', it: '**p**ane', th: '**ป**ลา' },  wiki: 'Voiceless_bilabial_plosive' },
  { symbol: 'b', manner: 'plosive', place: 'bilabial',  voiced: true,  examples: { en: '**b**ee',  fr: '**b**eau', de: '**B**ier', es: '**b**ar',  it: '**b**ene', th: '**บ้**าน' }, wiki: 'Voiced_bilabial_plosive' },
  { symbol: 't', manner: 'plosive', place: 'alveolar',  voiced: false, examples: { en: '**t**ea',  fr: '**t**out', de: '**T**ee',  es: '**t**ú',   it: '**t**u',   th: 'เ**ต่**า' }, wiki: 'Voiceless_alveolar_plosive' },
  { symbol: 'd', manner: 'plosive', place: 'alveolar',  voiced: true,  examples: { en: '**d**eed', fr: '**d**eux', de: '**d**u',   es: '**d**ar',  it: '**d**are', th: 'เ**ด็**ก' }, wiki: 'Voiced_alveolar_plosive' },
  { symbol: 'ʈ', manner: 'plosive', place: 'retroflex', voiced: false, examples: {}, wiki: 'Voiceless_retroflex_plosive' },
  { symbol: 'ɖ', manner: 'plosive', place: 'retroflex', voiced: true,  examples: {}, wiki: 'Voiced_retroflex_plosive' },
  { symbol: 'c', manner: 'plosive', place: 'palatal',   voiced: false, examples: {}, wiki: 'Voiceless_palatal_plosive' },
  { symbol: 'ɟ', manner: 'plosive', place: 'palatal',   voiced: true,  examples: {}, wiki: 'Voiced_palatal_plosive' },
  { symbol: 'k', manner: 'plosive', place: 'velar',     voiced: false, examples: { en: '**k**ey',  fr: '**qu**i',  de: '**K**opf', es: '**c**asa', it: '**c**asa', th: 'ไ**ก่**' }, wiki: 'Voiceless_velar_plosive' },
  { symbol: 'g', manner: 'plosive', place: 'velar',     voiced: true,  examples: { en: '**g**o',   fr: '**g**are', de: '**g**ut',  es: '**g**ato', it: '**g**atto' },                 wiki: 'Voiced_velar_plosive' },
  { symbol: 'q', manner: 'plosive', place: 'uvular',    voiced: false, examples: {}, wiki: 'Voiceless_uvular_plosive' },
  { symbol: 'ɢ', manner: 'plosive', place: 'uvular',    voiced: true,  examples: {}, wiki: 'Voiced_uvular_plosive' },
  { symbol: 'ʔ', manner: 'plosive', place: 'glottal',   voiced: false, examples: { en: 'uh-**’**-oh', de: 'be**’**acht', th: '**อ่**าง' }, wiki: 'Glottal_stop' },

  // Nasal
  { symbol: 'm', manner: 'nasal', place: 'bilabial',    voiced: true, examples: { en: '**m**e',  fr: '**m**ère', de: '**M**ond', es: '**m**adre', it: '**m**adre', th: '**ม้**า' }, wiki: 'Bilabial_nasal' },
  { symbol: 'ɱ', manner: 'nasal', place: 'labiodental', voiced: true, examples: { en: 'sy**m**phony' }, wiki: 'Labiodental_nasal' },
  { symbol: 'n', manner: 'nasal', place: 'alveolar',    voiced: true, examples: { en: '**n**o',  fr: '**n**on',  de: '**N**ein', es: '**n**o',    it: '**n**o',   th: 'ห**นู**' }, wiki: 'Alveolar_nasal' },
  { symbol: 'ɳ', manner: 'nasal', place: 'retroflex',   voiced: true, examples: {}, wiki: 'Retroflex_nasal' },
  { symbol: 'ɲ', manner: 'nasal', place: 'palatal',     voiced: true, examples: { fr: 'a**gn**eau', es: 'ni**ñ**o', it: 'a**gn**ello' }, wiki: 'Palatal_nasal' },
  { symbol: 'ŋ', manner: 'nasal', place: 'velar',       voiced: true, examples: { en: 'si**ng**', de: 'si**ng**en', th: '**งู**' }, wiki: 'Velar_nasal' },
  { symbol: 'ɴ', manner: 'nasal', place: 'uvular',      voiced: true, examples: {}, wiki: 'Uvular_nasal' },

  // Trill
  { symbol: 'ʙ', manner: 'trill', place: 'bilabial', voiced: true, examples: {}, wiki: 'Bilabial_trill' },
  { symbol: 'r', manner: 'trill', place: 'alveolar', voiced: true, examples: { es: 'pe**rr**o', it: '**r**osa', th: 'เ**รือ**' }, wiki: 'Voiced_alveolar_trill', audio: 'Alveolar_trill' },
  { symbol: 'ʀ', manner: 'trill', place: 'uvular',   voiced: true, examples: { fr: '**r**ouge', de: '**r**ot' },                 wiki: 'Voiced_uvular_trill',   audio: 'Uvular_trill' },

  // Tap or Flap
  { symbol: 'ⱱ', manner: 'tap', place: 'labiodental', voiced: true, examples: {}, wiki: 'Labiodental_flap' },
  { symbol: 'ɾ', manner: 'tap', place: 'alveolar',    voiced: true, examples: { en: 'bu**tt**er (US)', es: 'pe**r**o', it: 'ca**r**o' }, wiki: 'Alveolar_tap_and_flap' },
  { symbol: 'ɽ', manner: 'tap', place: 'retroflex',   voiced: true, examples: {}, wiki: 'Retroflex_flap' },

  // Fricative
  { symbol: 'ɸ', manner: 'fricative', place: 'bilabial',       voiced: false, examples: {}, wiki: 'Voiceless_bilabial_fricative' },
  { symbol: 'β', manner: 'fricative', place: 'bilabial',       voiced: true,  examples: { es: 'la**v**a (spirant)' }, wiki: 'Voiced_bilabial_fricative' },
  { symbol: 'f', manner: 'fricative', place: 'labiodental',    voiced: false, examples: { en: '**f**ee', fr: '**f**ou', de: '**F**isch', es: '**f**uente', it: '**f**ine', th: '**ฟั**น' }, wiki: 'Voiceless_labiodental_fricative' },
  { symbol: 'v', manner: 'fricative', place: 'labiodental',    voiced: true,  examples: { en: '**v**ee', fr: '**v**ous', de: '**W**elt', it: '**v**ino' }, wiki: 'Voiced_labiodental_fricative' },
  { symbol: 'θ', manner: 'fricative', place: 'dental',         voiced: false, examples: { en: '**th**igh', es: '**c**ielo (Spain)' }, wiki: 'Voiceless_dental_fricative' },
  { symbol: 'ð', manner: 'fricative', place: 'dental',         voiced: true,  examples: { en: '**th**y', es: 'na**d**a (spirant)' }, wiki: 'Voiced_dental_fricative' },
  { symbol: 's', manner: 'fricative', place: 'alveolar',       voiced: false, examples: { en: '**s**ee', fr: '**s**a',  de: '**S**tadt', es: '**s**a',  it: '**s**ole', th: 'เ**สือ**' }, wiki: 'Voiceless_alveolar_fricative' },
  { symbol: 'z', manner: 'fricative', place: 'alveolar',       voiced: true,  examples: { en: '**z**oo', fr: '**z**éro', de: '**S**ee', it: '**s**mog' }, wiki: 'Voiced_alveolar_fricative' },
  { symbol: 'ʃ', manner: 'fricative', place: 'post-alveolar',  voiced: false, examples: { en: '**sh**y', fr: '**ch**at', de: '**sch**on', it: 'pe**sc**e' }, wiki: 'Voiceless_postalveolar_fricative' },
  { symbol: 'ʒ', manner: 'fricative', place: 'post-alveolar',  voiced: true,  examples: { en: 'vi**s**ion', fr: '**j**our' }, wiki: 'Voiced_postalveolar_fricative' },
  { symbol: 'ʂ', manner: 'fricative', place: 'retroflex',      voiced: false, examples: {}, wiki: 'Voiceless_retroflex_fricative' },
  { symbol: 'ʐ', manner: 'fricative', place: 'retroflex',      voiced: true,  examples: {}, wiki: 'Voiced_retroflex_fricative' },
  { symbol: 'ç', manner: 'fricative', place: 'palatal',        voiced: false, examples: { de: 'i**ch**' }, wiki: 'Voiceless_palatal_fricative' },
  { symbol: 'ʝ', manner: 'fricative', place: 'palatal',        voiced: true,  examples: {}, wiki: 'Voiced_palatal_fricative' },
  { symbol: 'x', manner: 'fricative', place: 'velar',          voiced: false, examples: { de: 'Ba**ch**', es: '**j**amón' }, wiki: 'Voiceless_velar_fricative' },
  { symbol: 'ɣ', manner: 'fricative', place: 'velar',          voiced: true,  examples: { es: 'pa**g**ar (spirant)' }, wiki: 'Voiced_velar_fricative' },
  { symbol: 'χ', manner: 'fricative', place: 'uvular',         voiced: false, examples: {}, wiki: 'Voiceless_uvular_fricative' },
  { symbol: 'ʁ', manner: 'fricative', place: 'uvular',         voiced: true,  examples: { fr: '**r**ouge (std.)', de: '**r**ot (std.)' }, wiki: 'Voiced_uvular_fricative' },
  { symbol: 'ħ', manner: 'fricative', place: 'pharyngeal',     voiced: false, examples: {}, wiki: 'Voiceless_pharyngeal_fricative' },
  { symbol: 'ʕ', manner: 'fricative', place: 'pharyngeal',     voiced: true,  examples: {}, wiki: 'Voiced_pharyngeal_fricative' },
  { symbol: 'h', manner: 'fricative', place: 'glottal',        voiced: false, examples: { en: '**h**i', de: '**H**aus', th: '**หี**บ' }, wiki: 'Voiceless_glottal_fricative' },
  { symbol: 'ɦ', manner: 'fricative', place: 'glottal',        voiced: true,  examples: {}, wiki: 'Voiced_glottal_fricative' },

  // Lateral Fricative
  { symbol: 'ɬ', manner: 'lat-fricative', place: 'alveolar', voiced: false, examples: {}, wiki: 'Voiceless_alveolar_lateral_fricative' },
  { symbol: 'ɮ', manner: 'lat-fricative', place: 'alveolar', voiced: true,  examples: {}, wiki: 'Voiced_alveolar_lateral_fricative' },

  // Approximant
  { symbol: 'ʋ', manner: 'approximant', place: 'labiodental', voiced: true, examples: {}, wiki: 'Labiodental_approximant' },
  { symbol: 'ɹ', manner: 'approximant', place: 'alveolar',    voiced: true, examples: { en: '**r**ed' }, wiki: 'Alveolar_approximant' },
  { symbol: 'ɻ', manner: 'approximant', place: 'retroflex',   voiced: true, examples: {}, wiki: 'Retroflex_approximant' },
  { symbol: 'j', manner: 'approximant', place: 'palatal',     voiced: true, examples: { en: '**y**es', fr: '**y**eux', de: '**j**a', es: '**ll**amar', it: '**i**eri', th: '**ยั**กษ์' }, wiki: 'Palatal_approximant' },
  { symbol: 'ɰ', manner: 'approximant', place: 'velar',       voiced: true, examples: {}, wiki: 'Voiced_velar_approximant' },

  // Lateral Approximant
  { symbol: 'l', manner: 'lat-approximant', place: 'alveolar',  voiced: true, examples: { en: '**l**ay', fr: '**l**a', de: '**L**iebe', es: '**l**una', it: '**l**una', th: '**ลิ**ง' }, wiki: 'Alveolar_lateral_approximant' },
  { symbol: 'ɭ', manner: 'lat-approximant', place: 'retroflex', voiced: true, examples: {}, wiki: 'Retroflex_lateral_approximant' },
  { symbol: 'ʎ', manner: 'lat-approximant', place: 'palatal',   voiced: true, examples: { it: 'fi**gl**io' }, wiki: 'Palatal_lateral_approximant' },
  { symbol: 'ʟ', manner: 'lat-approximant', place: 'velar',     voiced: true, examples: {}, wiki: 'Velar_lateral_approximant' },
];

export function isImpossible(manner: Manner, place: Place, voiced: boolean): boolean {
  return IMPOSSIBLE.some(([m, p, v]) => m === manner && p === place && v === voiced);
}

export function findConsonant(manner: Manner, place: Place, voiced: boolean): IPAConsonant | undefined {
  return CONSONANTS.find(c => c.manner === manner && c.place === place && c.voiced === voiced);
}

export function wikiUrl(slug: string): string {
  return `https://en.wikipedia.org/wiki/${slug}`;
}

/**
 * URL to the Wikimedia Commons audio clip for a phoneme. By convention the
 * file is named identically to the Wikipedia article slug (e.g. article
 * `Voiceless_velar_plosive` → file `Voiceless_velar_plosive.ogg`).
 * Special:FilePath redirects to the actual CDN URL.
 */
export function audioUrl(slug: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${slug}.ogg`;
}

let currentAudio: HTMLAudioElement | null = null;

/** Play the IPA reference recording for a phoneme. Stops any previous clip.
 *  Uses `entry.audio` when set, falling back to the Wikipedia article slug. */
export function playIpaSound(entry: { wiki: string; audio?: string }): void {
  const slug = entry.audio ?? entry.wiki;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const a = new Audio(audioUrl(slug));
  currentAudio = a;
  a.play().catch(err => {
    // Most likely: no audio file exists for this slug, or the browser
    // blocked playback. Log quietly instead of surfacing as an error.
    // eslint-disable-next-line no-console
    console.warn(`[ipa] could not play audio for "${slug}":`, err?.message ?? err);
  });
}

// --- Non-pulmonic consonants ---------------------------------------------

export interface IPALabelled {
  symbol: string;
  label: string;
  examples: Partial<Record<ExampleLang, string>>;
  wiki: string;
  /** Audio basename on Commons when it differs from `wiki` (some don't match). */
  audio?: string;
}

export const CLICKS: IPALabelled[] = [
  { symbol: 'ʘ', label: 'Bilabial',         examples: {}, wiki: 'Bilabial_click' },
  { symbol: 'ǀ', label: 'Dental',           examples: {}, wiki: 'Dental_click' },
  { symbol: 'ǃ', label: '(Post)alveolar',   examples: {}, wiki: 'Postalveolar_click' },
  { symbol: 'ǂ', label: 'Palatoalveolar',   examples: {}, wiki: 'Palatoalveolar_click' },
  { symbol: 'ǁ', label: 'Alveolar lateral', examples: {}, wiki: 'Alveolar_lateral_click' },
];

export const IMPLOSIVES: IPALabelled[] = [
  { symbol: 'ɓ', label: 'Bilabial',         examples: {}, wiki: 'Voiced_bilabial_implosive' },
  { symbol: 'ɗ', label: 'Dental/alveolar',  examples: {}, wiki: 'Voiced_alveolar_implosive' },
  { symbol: 'ʄ', label: 'Palatal',          examples: {}, wiki: 'Voiced_palatal_implosive' },
  { symbol: 'ɠ', label: 'Velar',            examples: {}, wiki: 'Voiced_velar_implosive' },
  { symbol: 'ʛ', label: 'Uvular',           examples: {}, wiki: 'Voiced_uvular_implosive' },
];

export const EJECTIVES: IPALabelled[] = [
  { symbol: 'pʼ', label: 'Bilabial',           examples: {}, wiki: 'Bilabial_ejective_plosive' },
  { symbol: 'tʼ', label: 'Dental/alveolar',    examples: {}, wiki: 'Alveolar_ejective_plosive' },
  { symbol: 'kʼ', label: 'Velar',              examples: {}, wiki: 'Velar_ejective_plosive' },
  { symbol: 'sʼ', label: 'Alveolar fricative', examples: {}, wiki: 'Alveolar_ejective_fricative' },
];

export const OTHER_SYMBOLS: IPALabelled[] = [
  { symbol: 'ʍ', label: 'Voiceless labial-velar fricative',    examples: { en: '**wh**at (some dialects)' }, wiki: 'Voiceless_labio-velar_fricative' },
  { symbol: 'w', label: 'Voiced labial-velar approximant',     examples: { en: '**w**e', fr: 'o**u**i', th: 'แห**ว**น' }, wiki: 'Voiced_labio-velar_approximant' },
  { symbol: 'ɥ', label: 'Voiced labial-palatal approximant',   examples: { fr: 'l**u**i' }, wiki: 'Labial-palatal_approximant' },
  { symbol: 'ʜ', label: 'Voiceless epiglottal fricative',      examples: {}, wiki: 'Voiceless_epiglottal_fricative' },
  { symbol: 'ʢ', label: 'Voiced epiglottal fricative',         examples: {}, wiki: 'Voiced_epiglottal_fricative' },
  { symbol: 'ʡ', label: 'Epiglottal plosive',                  examples: {}, wiki: 'Voiceless_epiglottal_plosive' },
  { symbol: 'ɕ', label: 'Voiceless alveolo-palatal fricative', examples: {}, wiki: 'Voiceless_alveolo-palatal_fricative' },
  { symbol: 'ʑ', label: 'Voiced alveolo-palatal fricative',    examples: {}, wiki: 'Voiced_alveolo-palatal_fricative' },
  { symbol: 'ɺ', label: 'Alveolar lateral flap',               examples: {}, wiki: 'Alveolar_lateral_flap' },
  { symbol: 'ɧ', label: 'Simultaneous ʃ and x',                examples: {}, wiki: 'Voiceless_dorso-palatal_velar_fricative' },
];

export const AFFRICATES: IPALabelled[] = [
  { symbol: 't͡s', label: 'Voiceless alveolar affricate',         examples: { en: 'ca**ts**', fr: '**ts**ar', de: '**z**eit', it: 'pi**zz**a' },            wiki: 'Voiceless_alveolar_affricate' },
  { symbol: 't͡ʃ', label: 'Voiceless palato-alveolar affricate',  examples: { en: '**ch**urch', es: 'mu**ch**o', it: '**c**ena' },                         wiki: 'Voiceless_palato-alveolar_affricate' },
  { symbol: 't͡ɕ', label: 'Voiceless alveolo-palatal affricate',  examples: { th: '**จ**าน' },                                                              wiki: 'Voiceless_alveolo-palatal_affricate' },
  { symbol: 'ʈ͡ʂ', label: 'Voiceless retroflex affricate',        examples: {}, wiki: 'Voiceless_retroflex_affricate' },
  { symbol: 'd͡z', label: 'Voiced alveolar affricate',            examples: { it: 'me**zz**o' }, wiki: 'Voiced_alveolar_affricate' },
  { symbol: 'd͡ʒ', label: 'Voiced post-alveolar affricate',       examples: { en: '**j**udge', it: '**g**iorno' }, wiki: 'Voiced_postalveolar_affricate' },
  { symbol: 'd͡ʑ', label: 'Voiced alveolo-palatal affricate',     examples: {}, wiki: 'Voiced_alveolo-palatal_affricate' },
  { symbol: 'ɖ͡ʐ', label: 'Voiced retroflex affricate',           examples: {}, wiki: 'Voiced_retroflex_affricate' },
];

// --- Helpers --------------------------------------------------------------

/** Split a "**bold** text" example string into segments for rendering. */
export function parseBold(s: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false });
  return out;
}
