export interface TrueCluster {
  initial: string;          // e.g. "ก"
  plusR?: { form: string; ipa: string; example: string; gloss: string };
  plusL?: { form: string; ipa: string; example: string; gloss: string };
  plusW?: { form: string; ipa: string; example: string; gloss: string };
}

export const TRUE_CLUSTERS: TrueCluster[] = [
  {
    initial: 'ก',
    plusR: { form: 'กร', ipa: '/gr/',  example: 'เกรง',   gloss: 'fear' },
    plusL: { form: 'กล', ipa: '/gl/',  example: 'กล้อง',  gloss: 'camera' },
    plusW: { form: 'กว', ipa: '/gw/',  example: 'กว่า',   gloss: 'more' },
  },
  {
    initial: 'ข',
    plusR: { form: 'ขร', ipa: '/kʰr/', example: 'ขรึม',  gloss: 'grim' },
    plusL: { form: 'ขล', ipa: '/kʰl/', example: 'ขลุ่ย', gloss: 'flute' },
    plusW: { form: 'ขว', ipa: '/kʰw/', example: 'ขวัญ',  gloss: 'spirit' },
  },
  {
    initial: 'ค',
    plusR: { form: 'คร', ipa: '/kʰr/', example: 'ครู',    gloss: 'teacher' },
    plusL: { form: 'คล', ipa: '/kʰl/', example: 'คลอง',   gloss: 'canal' },
    plusW: { form: 'คว', ipa: '/kʰw/', example: 'ความ',   gloss: 'meaning' },
  },
  {
    initial: 'ต',
    plusR: { form: 'ตร', ipa: '/dtr/', example: 'ตรง',    gloss: 'straight' },
  },
  {
    initial: 'ป',
    plusR: { form: 'ปร', ipa: '/bpr/', example: 'เปรียบ', gloss: 'compare' },
    plusL: { form: 'ปล', ipa: '/bpl/', example: 'ปลา',    gloss: 'fish' },
  },
  {
    initial: 'ผ',
    plusL: { form: 'ผล', ipa: '/pʰl/', example: 'ผลัด',   gloss: 'take turns' },
  },
  {
    initial: 'พ',
    plusR: { form: 'พร', ipa: '/pʰr/', example: 'พระ',    gloss: 'monk' },
    plusL: { form: 'พล', ipa: '/pʰl/', example: 'พลอย',   gloss: 'gem' },
  },
];

export interface FalseCluster {
  cluster: string;   // "ทร"
  sounds: string;    // IPA "/s/ or /t/"
  note?: string;     // any extra text line
  examples: { word: string; gloss: string }[];
  altExamples?: { word: string; gloss: string }[];
  altLabel?: string;
}

export const FALSE_CLUSTERS: FalseCluster[] = [
  {
    cluster: 'ทร',
    sounds: '/s/',
    note: 'or /t/',
    examples: [
      { word: 'ทราบ', gloss: 'know' },
      { word: 'ทราย', gloss: 'sand' },
    ],
    altLabel: 'Some words use /t/:',
    altExamples: [
      { word: 'โทร', gloss: 'call' },
      { word: 'ทรง', gloss: 'shape' },
      { word: 'ทรุด', gloss: 'sink' },
    ],
  },
  {
    cluster: 'สร',
    sounds: '/s/',
    examples: [
      { word: 'สร้าง', gloss: 'build' },
      { word: 'เสร็จ', gloss: 'done' },
    ],
  },
  {
    cluster: 'จร',
    sounds: '/j/',
    examples: [
      { word: 'จริง', gloss: 'true' },
      { word: 'จราจร', gloss: 'traffic' },
    ],
  },
];

export interface LeadingCluster {
  cluster: string;
  sound: string;
  example: string;
  meaning: string;
}

export const LEADING_HO: LeadingCluster[] = [
  { cluster: 'หง', sound: '/ŋ/', example: 'หง่อย', meaning: 'listless' },
  { cluster: 'หน', sound: '/n/', example: 'หนู',    meaning: 'mouse' },
  { cluster: 'หม', sound: '/m/', example: 'หมา',    meaning: 'dog' },
  { cluster: 'หญ', sound: '/j/', example: 'หญิง',  meaning: 'female' },
  { cluster: 'หย', sound: '/j/', example: 'หยุด',  meaning: 'stop' },
  { cluster: 'หร', sound: '/r/', example: 'หรือ',  meaning: 'or' },
  { cluster: 'หล', sound: '/l/', example: 'หลับ',  meaning: 'sleep' },
  { cluster: 'หว', sound: '/w/', example: 'หวัง',  meaning: 'hope' },
];

export const LEADING_OR: { cluster: string; sound: string; examples: string; meaning: string }[] = [
  { cluster: 'อย', sound: '/j/', examples: 'อยู่ • อย่า • อย่าง • อยาก', meaning: 'be at • don\'t • kind • want' },
];
