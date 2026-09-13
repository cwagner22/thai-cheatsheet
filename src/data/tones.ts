export interface ToneEntry {
  /** Primary label (Standard: Thai class name "สามัญ"; Northern: Gedney box code, e.g. "A1–2"). */
  name: string;
  /** English description shown in parentheses, e.g. "Mid", "Mid Rising". */
  nameEn?: string;
  /** IPA for the full name (with เสียง prefix), shown as tooltip on hover. */
  nameIpa?: string;
  /** Tone-mark glyph for the top-right corner (Standard Thai only). */
  mark?: string;
  /** Thai name of the tone mark, e.g. "ไม้เอก". */
  markName?: string;
  /** IPA pronunciation of the mark name, shown as tooltip with markName. */
  markIpa?: string;
  /** Color used for the line/title */
  color: string;
  /** Short description line (kind + Chao contour digits + IPA letters) */
  desc: string;
  /** Chao contour digits, e.g. "33332" or "214" */
  chao: string;
  /** IPA tone letters, e.g. "˧" or "˨˩˦" */
  ipa: string;
  /** SVG path for the pitch contour (viewBox 0 0 160 80). */
  path: string;
  /** Example Thai word */
  example: string;
  /** IPA reading + gloss, e.g. "piː · year" */
  exampleGloss: string;
}

export const THAI_TONES: ToneEntry[] = [
  {
    name: 'สามัญ', nameEn: 'Mid', nameIpa: '/sǎː.man/', color: '#2563eb',
    desc: 'Mid', chao: '33332', ipa: '˧',
    path: 'M 14,40 L 50,40 L 90,40 L 125,40 L 155,55',
    example: 'ปี', exampleGloss: 'piː · year',
  },
  {
    name: 'เอก', nameEn: 'Low', nameIpa: '/èːk/',
    mark: '่', markName: 'ไม้เอก', markIpa: '/máj.èːk/', color: '#dc2626',
    desc: 'Low', chao: '21111', ipa: '˨˩',
    path: 'M 14,55 L 50,70 L 90,70 L 125,70 L 155,70',
    example: 'ไข่', exampleGloss: 'kʰàj · egg',
  },
  {
    name: 'โท', nameEn: 'Falling', nameIpa: '/tʰoː/',
    mark: '้', markName: 'ไม้โท', markIpa: '/máj.tʰoː/', color: '#7c3aed',
    desc: 'Falling', chao: '552', ipa: '˥˩',
    path: 'M 14,10 L 85,10 L 155,55',
    example: 'พี่', exampleGloss: 'pʰîː · older sibling',
  },
  {
    name: 'ตรี', nameEn: 'High', nameIpa: '/triː/',
    mark: '๊', markName: 'ไม้ตรี', markIpa: '/máj.triː/', color: '#16a34a',
    desc: 'High', chao: '45', ipa: '˦˥',
    path: 'M 14,25 L 155,10',
    example: 'น้ำ', exampleGloss: 'nám · water',
  },
  {
    name: 'จัตวา', nameEn: 'Rising', nameIpa: '/tɕàt.tà.waː/',
    mark: '๋', markName: 'ไม้จัตวา', markIpa: '/máj.tɕàt.tà.waː/', color: '#db2777',
    desc: 'Rising', chao: '214', ipa: '˩˩˦',
    path: 'M 14,55 L 85,70 L 155,25',
    example: 'หา', exampleGloss: 'hǎː · search',
  },
];

/** Northern Thai (Kham Mueang), Chiang Mai dialect — 6 phonemic tones, named
 *  and valued per Gedney (1999, p. 725) as tabulated in the "Lanna language"
 *  Wikipedia article's tone-box comparison. `name` is the Gedney box code
 *  (which consonant-class/environment categories yield this tone); `nameEn`
 *  is the descriptive tone name. Dead (checked) syllables don't add new
 *  tones — every cell in NORTHERN_TONE_BOX below reuses one of these 6. */
export const NORTHERN_TONES: ToneEntry[] = [
  {
    name: 'A1–2', nameEn: 'Low-rising', color: '#db2777',
    desc: 'contour', chao: '14', ipa: '˩˦',
    path: 'M 14,70 L 155,25',
    example: 'เหลา', exampleGloss: 'laːw · to sharpen',
  },
  {
    name: 'B1–3', nameEn: 'Mid-low', color: '#dc2626',
    desc: 'contour', chao: '22', ipa: '˨˨',
    path: 'M 14,55 L 155,55',
    example: 'เหล่า', exampleGloss: 'laːw · forest; group',
  },
  {
    name: 'C1–3', nameEn: 'High-falling (glottalized)', color: '#7c3aed',
    desc: 'contour', chao: '53ʔ', ipa: '˥˧ʔ',
    path: 'M 14,10 L 155,40',
    example: 'เหล้า', exampleGloss: 'laːw · liquor',
  },
  {
    name: 'A3–4', nameEn: 'Mid-high', color: '#16a34a',
    desc: 'contour', chao: '44', ipa: '˦˦',
    path: 'M 14,25 L 155,25',
    example: 'เลา', exampleGloss: 'laːw · pretty; reed',
  },
  {
    name: 'B4', nameEn: 'Falling', color: '#ea580c',
    desc: 'contour', chao: '41', ipa: '˦˩',
    path: 'M 14,25 L 155,70',
    example: 'เล่า', exampleGloss: 'laːw · to tell (a story)',
  },
  {
    name: 'C4', nameEn: 'High rising-falling (glottalized)', color: '#2563eb',
    desc: 'contour', chao: '454ʔ', ipa: '˦˥˦ʔ',
    path: 'M 14,25 L 84.5,10 L 155,25',
    example: 'เล้า', exampleGloss: 'laːw · coop, pen',
  },
];

/** One outcome in a tone-box cell: a Gedney box code, optionally scoped to
 *  which specific letters it applies to (used only where a class splits). */
export interface ToneBoxOutcome {
  code: string;
  /** Which letters this code applies to, when the row's class isn't specific
   *  enough on its own — e.g. Mid class splits by letter for live syllables. */
  letters?: string;
  /** A word matching this exact class + environment, overriding the plain
   *  NORTHERN_TONES entry's own example — that example is written for only
   *  one of the several cells its tone appears in, and is wrong (mismatched
   *  class or syllable shape) in the others. */
  example?: string;
  exampleGloss?: string;
}

/** One row of the Northern Thai tone box: which NORTHERN_TONES.name results
 *  for this consonant class in each syllable environment. Column order
 *  matches the Standard Thai table above (Normal · Dead short · Dead long ·
 *  Mai Tho). Mai Ek isn't its own column — it always lands on the same tone
 *  as unmarked Dead long, for every class, so it folds into that column
 *  (same device the Standard Thai table uses above).
 *
 *  Modern Thai's 9 mid-class letters split into (at least) two groups here:
 *  ก ต ป pattern with High class in every environment, while ด บ อ pattern
 *  with Low class for live syllables specifically but with High for
 *  everything else — hence the Mid row's first cell carries both outcomes,
 *  each labeled with the letters it covers. The source (below) only confirms
 *  these 6 of the 9 letters; จ ฎ ฏ aren't attested either way. */
export interface ToneBoxRow {
  cls: string;
  cells: [ToneBoxOutcome[], ToneBoxOutcome[], ToneBoxOutcome[], ToneBoxOutcome[]];
}

export const NORTHERN_TONE_BOX: ToneBoxRow[] = [
  {
    cls: 'High',
    cells: [
      [{ code: 'A1–2' }],
      [{ code: 'A1–2', example: 'ผัก', exampleGloss: 'pʰak · vegetable' }],
      [{ code: 'B1–3' }],
      [{ code: 'C1–3' }],
    ],
  },
  {
    cls: 'Mid',
    // Only the Normal cell renders on this row — Dead short/long and Mai Tho
    // are covered by High's rowSpan above (same tone, same rendered cell),
    // so there's nothing to show a Mid-specific example for here.
    cells: [
      [
        { code: 'A1–2', letters: 'ก ต ป', example: 'ตา', exampleGloss: 'taː · eye' },
        { code: 'A3–4', letters: 'ด บ อ', example: 'ดี', exampleGloss: 'diː · good' },
      ],
      [{ code: 'A1–2' }], [{ code: 'B1–3' }], [{ code: 'C1–3' }],
    ],
  },
  {
    cls: 'Low',
    cells: [
      [{ code: 'A3–4' }],
      [{ code: 'C1–3', example: 'มด', exampleGloss: 'mot · ant' }],
      [{ code: 'B4' }],
      [{ code: 'C4' }],
    ],
  },
];
