export interface ToneEntry {
  /** Display label, e.g. "Mid" or "High Rising" */
  name: string;
  /** Thai name, e.g. "สามัญ" (Thai only) */
  thaiName?: string;
  /** Gedney / T-label in small caps at top-right, e.g. "A2" or "T1" */
  code: string;
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
    name: 'Mid', thaiName: 'สามัญ', code: 'A2', color: '#2563eb',
    desc: 'Mid', chao: '33332', ipa: '˧',
    path: 'M 14,40 L 50,40 L 90,40 L 125,40 L 155,55',
    example: 'ปี', exampleGloss: 'piː · year',
  },
  {
    name: 'Low', thaiName: 'เอก', code: 'B1', color: '#dc2626',
    desc: 'Low', chao: '21111', ipa: '˨˩',
    path: 'M 14,55 L 50,70 L 90,70 L 125,70 L 155,70',
    example: 'ไข่', exampleGloss: 'kʰàj · egg',
  },
  {
    name: 'Falling', thaiName: 'โท', code: 'B4', color: '#7c3aed',
    desc: 'Falling', chao: '552', ipa: '˥˩',
    path: 'M 14,10 L 85,10 L 155,55',
    example: 'พี่', exampleGloss: 'pʰîː · older sibling',
  },
  {
    name: 'High', thaiName: 'ตรี', code: 'C4', color: '#16a34a',
    desc: 'High', chao: '45', ipa: '˦˥',
    path: 'M 14,25 L 155,10',
    example: 'น้ำ', exampleGloss: 'nám · water',
  },
  {
    name: 'Rising', thaiName: 'จัตวา', code: 'A1', color: '#db2777',
    desc: 'Rising', chao: '214', ipa: '˩˩˦',
    path: 'M 14,55 L 85,70 L 155,25',
    example: 'หา', exampleGloss: 'hǎː · search',
  },
];

export const NORTHERN_TONES: ToneEntry[] = [
  {
    name: 'Mid Rising', code: 'T1', color: '#db2777',
    desc: 'contour', chao: '324', ipa: '˧˨˦',
    path: 'M 14,40 L 85,55 L 155,25',
    example: 'หา', exampleGloss: 'hǎː · search',
  },
  {
    name: 'High Rising', code: 'T2', color: '#db2777',
    desc: 'contour', chao: '435', ipa: '˦˧˥',
    path: 'M 14,25 L 85,40 L 155,10',
    example: 'บิน', exampleGloss: 'bin · to fly',
  },
  {
    name: 'Low Level', code: 'T3', color: '#dc2626',
    desc: 'contour', chao: '22', ipa: '˨˨',
    path: 'M 14,55 L 155,55',
    example: 'ไข่', exampleGloss: 'kʰàj · egg',
  },
  {
    name: 'High Falling', code: 'T4', color: '#7c3aed',
    desc: 'contour', chao: '453', ipa: '˦˥˧',
    path: 'M 14,25 L 85,10 L 155,40',
    example: 'พี่', exampleGloss: 'pʰîː · older sibling',
  },
  {
    name: 'High Falling', code: 'T5', color: '#7c3aed',
    desc: 'contour', chao: '553', ipa: '˥˥˧',
    path: 'M 14,10 L 85,10 L 155,40',
    example: 'ข้าว', exampleGloss: 'kʰâːw · rice',
  },
  {
    name: 'High', code: 'T6', color: '#16a34a',
    desc: 'contour', chao: '454', ipa: '˦˥˦',
    path: 'M 14,25 L 85,10 L 155,25',
    example: 'น้ำ', exampleGloss: 'nám · water',
  },
  {
    name: 'Low Rising', code: 'T7', color: '#db2777',
    desc: 'contour', chao: '24', ipa: '˨˦',
    path: 'M 14,55 L 155,25',
    example: 'หมัด', exampleGloss: 'màt · flea',
  },
  {
    name: 'High Falling', code: 'T8', color: '#7c3aed',
    desc: 'contour', chao: '441', ipa: '˦˦˩',
    path: 'M 14,25 L 85,25 L 155,70',
    example: 'มีด', exampleGloss: 'mîːt · knife',
  },
];
