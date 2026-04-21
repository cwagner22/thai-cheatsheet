// All `rom`/`ipa` fields use strict IPA with tone diacritics. See CLAUDE.md.

export interface TrueCluster {
  initial: string;          // e.g. "ก"
  plusR?: { form: string; ipa: string; example: string; rom: string; gloss: string };
  plusL?: { form: string; ipa: string; example: string; rom: string; gloss: string };
  plusW?: { form: string; ipa: string; example: string; rom: string; gloss: string };
}

export const TRUE_CLUSTERS: TrueCluster[] = [
  {
    initial: 'ก',
    plusR: { form: 'กร', ipa: '/kr/',  example: 'เกรง',   rom: 'kreːŋ',   gloss: 'fear' },
    plusL: { form: 'กล', ipa: '/kl/',  example: 'กล้อง',  rom: 'klɔ̂ːŋ',   gloss: 'camera' },
    plusW: { form: 'กว', ipa: '/kw/',  example: 'กว่า',   rom: 'kwàː',    gloss: 'more' },
  },
  {
    initial: 'ข',
    plusR: { form: 'ขร', ipa: '/kʰr/', example: 'ขรึม',  rom: 'kʰrɯ̌m',   gloss: 'grim' },
    plusL: { form: 'ขล', ipa: '/kʰl/', example: 'ขลุ่ย', rom: 'kʰlùj',   gloss: 'flute' },
    plusW: { form: 'ขว', ipa: '/kʰw/', example: 'ขวัญ',  rom: 'kʰwǎn',   gloss: 'spirit' },
  },
  {
    initial: 'ค',
    plusR: { form: 'คร', ipa: '/kʰr/', example: 'ครู',    rom: 'kʰruː',   gloss: 'teacher' },
    plusL: { form: 'คล', ipa: '/kʰl/', example: 'คลอง',   rom: 'kʰlɔːŋ',  gloss: 'canal' },
    plusW: { form: 'คว', ipa: '/kʰw/', example: 'ความ',   rom: 'kʰwaːm',  gloss: 'meaning' },
  },
  {
    initial: 'ต',
    plusR: { form: 'ตร', ipa: '/tr/',  example: 'ตรง',    rom: 'troŋ',    gloss: 'straight' },
  },
  {
    initial: 'ป',
    plusR: { form: 'ปร', ipa: '/pr/',  example: 'เปรียบ', rom: 'prìap',   gloss: 'compare' },
    plusL: { form: 'ปล', ipa: '/pl/',  example: 'ปลา',    rom: 'plaː',    gloss: 'fish' },
  },
  {
    initial: 'ผ',
    plusL: { form: 'ผล', ipa: '/pʰl/', example: 'ผลัด',   rom: 'pʰlàt',   gloss: 'take turns' },
  },
  {
    initial: 'พ',
    plusR: { form: 'พร', ipa: '/pʰr/', example: 'พระ',    rom: 'pʰrá',    gloss: 'monk' },
    plusL: { form: 'พล', ipa: '/pʰl/', example: 'พลอย',   rom: 'pʰlɔːj',  gloss: 'gem' },
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
    note: 'or /tʰ/',
    examples: [
      { word: 'ทราบ', rom: 'sâːp', gloss: 'know' },
      { word: 'ทราย', rom: 'saːj', gloss: 'sand' },
      { word: 'ทรง',  rom: 'soŋ',  gloss: 'shape' },
      { word: 'ทรุด', rom: 'sút',  gloss: 'sink' },
    ],
    altLabel: 'Rare /tʰ/ exception:',
    altExamples: [
      { word: 'โทร',  rom: 'tʰoː', gloss: 'phone call' },
    ],
  },
  {
    cluster: 'สร',
    sounds: '/s/',
    examples: [
      { word: 'สร้าง', rom: 'sâːŋ', gloss: 'build' },
      { word: 'เสร็จ', rom: 'sèt',  gloss: 'done' },
    ],
  },
  {
    cluster: 'จร',
    sounds: '/tɕ/',
    examples: [
      { word: 'จริง',   rom: 'tɕiŋ',         gloss: 'true' },
      { word: 'จราจร', rom: 'tɕa.raː.tɕɔn', gloss: 'traffic' },
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
  { cluster: 'หง', sound: '/ŋ/', example: 'หง่อย', rom: 'ŋɔ̀j',  meaning: 'listless' },
  { cluster: 'หน', sound: '/n/', example: 'หนู',    rom: 'nǔː',  meaning: 'mouse' },
  { cluster: 'หม', sound: '/m/', example: 'หมา',    rom: 'mǎː',  meaning: 'dog' },
  { cluster: 'หญ', sound: '/j/', example: 'หญิง',  rom: 'jǐŋ',  meaning: 'female' },
  { cluster: 'หย', sound: '/j/', example: 'หยุด',  rom: 'jùt',  meaning: 'stop' },
  { cluster: 'หร', sound: '/r/', example: 'หรือ',  rom: 'rɯ̌ː',  meaning: 'or' },
  { cluster: 'หล', sound: '/l/', example: 'หลับ',  rom: 'làp',  meaning: 'sleep' },
  { cluster: 'หว', sound: '/w/', example: 'หวัง',  rom: 'wǎŋ',  meaning: 'hope' },
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
      { word: 'อยู่',   rom: 'jùː',   meaning: 'be at' },
      { word: 'อย่า',   rom: 'jàː',   meaning: "don't" },
      { word: 'อย่าง', rom: 'jàːŋ', meaning: 'kind' },
      { word: 'อยาก',  rom: 'jàːk', meaning: 'want' },
    ],
  },
];
