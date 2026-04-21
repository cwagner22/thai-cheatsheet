export interface TrueCluster {
  initial: string;          // e.g. "ก"
  plusR?: { form: string; ipa: string; example: string; rom: string; gloss: string };
  plusL?: { form: string; ipa: string; example: string; rom: string; gloss: string };
  plusW?: { form: string; ipa: string; example: string; rom: string; gloss: string };
}

export const TRUE_CLUSTERS: TrueCluster[] = [
  {
    initial: 'ก',
    plusR: { form: 'กร', ipa: '/gr/',  example: 'เกรง',   rom: 'greng',   gloss: 'fear' },
    plusL: { form: 'กล', ipa: '/gl/',  example: 'กล้อง',  rom: 'glâwng',  gloss: 'camera' },
    plusW: { form: 'กว', ipa: '/gw/',  example: 'กว่า',   rom: 'gwàa',    gloss: 'more' },
  },
  {
    initial: 'ข',
    plusR: { form: 'ขร', ipa: '/kʰr/', example: 'ขรึม',  rom: 'khrǔm',   gloss: 'grim' },
    plusL: { form: 'ขล', ipa: '/kʰl/', example: 'ขลุ่ย', rom: 'khlùi',   gloss: 'flute' },
    plusW: { form: 'ขว', ipa: '/kʰw/', example: 'ขวัญ',  rom: 'khwǎn',   gloss: 'spirit' },
  },
  {
    initial: 'ค',
    plusR: { form: 'คร', ipa: '/kʰr/', example: 'ครู',    rom: 'khruu',   gloss: 'teacher' },
    plusL: { form: 'คล', ipa: '/kʰl/', example: 'คลอง',   rom: 'khlawng', gloss: 'canal' },
    plusW: { form: 'คว', ipa: '/kʰw/', example: 'ความ',   rom: 'khwaam',  gloss: 'meaning' },
  },
  {
    initial: 'ต',
    plusR: { form: 'ตร', ipa: '/dtr/', example: 'ตรง',    rom: 'dtrong',  gloss: 'straight' },
  },
  {
    initial: 'ป',
    plusR: { form: 'ปร', ipa: '/bpr/', example: 'เปรียบ', rom: 'bprìap',  gloss: 'compare' },
    plusL: { form: 'ปล', ipa: '/bpl/', example: 'ปลา',    rom: 'bplaa',   gloss: 'fish' },
  },
  {
    initial: 'ผ',
    plusL: { form: 'ผล', ipa: '/pʰl/', example: 'ผลัด',   rom: 'phlàt',   gloss: 'take turns' },
  },
  {
    initial: 'พ',
    plusR: { form: 'พร', ipa: '/pʰr/', example: 'พระ',    rom: 'phrá',    gloss: 'monk' },
    plusL: { form: 'พล', ipa: '/pʰl/', example: 'พลอย',   rom: 'phlooi',  gloss: 'gem' },
  },
];

export interface FalseCluster {
  cluster: string;   // "ทร"
  sounds: string;    // IPA "/s/ or /t/"
  note?: string;     // any extra text line
  examples: { word: string; rom: string; gloss: string }[];
  altExamples?: { word: string; rom: string; gloss: string }[];
  altLabel?: string;
}

export const FALSE_CLUSTERS: FalseCluster[] = [
  {
    cluster: 'ทร',
    sounds: '/s/',
    note: 'or /t/',
    examples: [
      { word: 'ทราบ', rom: 'sâap',   gloss: 'know' },
      { word: 'ทราย', rom: 'saai',   gloss: 'sand' },
    ],
    altLabel: 'Some words use /t/:',
    altExamples: [
      { word: 'โทร',  rom: 'thoh',   gloss: 'call' },
      { word: 'ทรง',  rom: 'song',   gloss: 'shape' },
      { word: 'ทรุด', rom: 'sút',    gloss: 'sink' },
    ],
  },
  {
    cluster: 'สร',
    sounds: '/s/',
    examples: [
      { word: 'สร้าง', rom: 'sâang', gloss: 'build' },
      { word: 'เสร็จ', rom: 'sèt',   gloss: 'done' },
    ],
  },
  {
    cluster: 'จร',
    sounds: '/j/',
    examples: [
      { word: 'จริง',   rom: 'jing',      gloss: 'true' },
      { word: 'จราจร', rom: 'ja-raa-jon', gloss: 'traffic' },
    ],
  },
];

export interface LeadingCluster {
  cluster: string;
  sound: string;
  example: string;
  rom: string;
  meaning: string;
}

export const LEADING_HO: LeadingCluster[] = [
  { cluster: 'หง', sound: '/ŋ/', example: 'หง่อย', rom: 'ngòi',  meaning: 'listless' },
  { cluster: 'หน', sound: '/n/', example: 'หนู',    rom: 'nǔu',   meaning: 'mouse' },
  { cluster: 'หม', sound: '/m/', example: 'หมา',    rom: 'mǎa',   meaning: 'dog' },
  { cluster: 'หญ', sound: '/j/', example: 'หญิง',  rom: 'yǐng',  meaning: 'female' },
  { cluster: 'หย', sound: '/j/', example: 'หยุด',  rom: 'yùt',   meaning: 'stop' },
  { cluster: 'หร', sound: '/r/', example: 'หรือ',  rom: 'rǔe',   meaning: 'or' },
  { cluster: 'หล', sound: '/l/', example: 'หลับ',  rom: 'làp',   meaning: 'sleep' },
  { cluster: 'หว', sound: '/w/', example: 'หวัง',  rom: 'wǎng',  meaning: 'hope' },
];

export interface LeadingOrCluster {
  cluster: string;
  sound: string;
  examples: { word: string; rom: string; meaning: string }[];
}

export const LEADING_OR: LeadingOrCluster[] = [
  {
    cluster: 'อย',
    sound: '/j/',
    examples: [
      { word: 'อยู่',   rom: 'yùu',   meaning: 'be at' },
      { word: 'อย่า',   rom: 'yàa',   meaning: "don't" },
      { word: 'อย่าง', rom: 'yàang', meaning: 'kind' },
      { word: 'อยาก',  rom: 'yàak',  meaning: 'want' },
    ],
  },
];
