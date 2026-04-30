export interface ToneEntry {
  /** Primary label (Standard: Thai class name "สามัญ"; Northern: "T1"–"T8"). */
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

export const NORTHERN_TONES: ToneEntry[] = [
  {
    name: 'T1', nameEn: 'Mid Rising', color: '#db2777',
    desc: 'contour', chao: '324', ipa: '˧˨˦',
    path: 'M 14,40 L 85,55 L 155,25',
    example: 'หา', exampleGloss: 'hǎː · search',
  },
  {
    name: 'T2', nameEn: 'High Rising', color: '#db2777',
    desc: 'contour', chao: '435', ipa: '˦˧˥',
    path: 'M 14,25 L 85,40 L 155,10',
    example: 'บิน', exampleGloss: 'bin · to fly',
  },
  {
    name: 'T3', nameEn: 'Low Level', color: '#dc2626',
    desc: 'contour', chao: '22', ipa: '˨˨',
    path: 'M 14,55 L 155,55',
    example: 'ไข่', exampleGloss: 'kʰàj · egg',
  },
  {
    name: 'T4', nameEn: 'High Falling', color: '#7c3aed',
    desc: 'contour', chao: '453', ipa: '˦˥˧',
    path: 'M 14,25 L 85,10 L 155,40',
    example: 'พี่', exampleGloss: 'pʰîː · older sibling',
  },
  {
    name: 'T5', nameEn: 'High Falling', color: '#7c3aed',
    desc: 'contour', chao: '553', ipa: '˥˥˧',
    path: 'M 14,10 L 85,10 L 155,40',
    example: 'ข้าว', exampleGloss: 'kʰâːw · rice',
  },
  {
    name: 'T6', nameEn: 'High', color: '#16a34a',
    desc: 'contour', chao: '454', ipa: '˦˥˦',
    path: 'M 14,25 L 85,10 L 155,25',
    example: 'น้ำ', exampleGloss: 'nám · water',
  },
  {
    name: 'T7', nameEn: 'Low Rising', color: '#db2777',
    desc: 'contour', chao: '24', ipa: '˨˦',
    path: 'M 14,55 L 155,25',
    example: 'หมัด', exampleGloss: 'màt · flea',
  },
  {
    name: 'T8', nameEn: 'High Falling', color: '#7c3aed',
    desc: 'contour', chao: '441', ipa: '˦˦˩',
    path: 'M 14,25 L 85,25 L 155,70',
    example: 'มีด', exampleGloss: 'mîːt · knife',
  },
];
