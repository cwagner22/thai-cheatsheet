export type VowelEntry = {
  form: string;
  ipa: string;
  example?: string;
  exampleGloss?: string;
  closed?: string;
  closedExample?: string;
  closedGloss?: string;
  closedNote?: string;
  note?: string;
  rare?: boolean;
};

export type VowelPair = {
  short?: VowelEntry;
  long?: VowelEntry;
};

export type VowelSection = {
  title: string;
  color: string;
  subtitle?: string;
  pairs: VowelPair[];
  singleColumn?: boolean;
};

// ◌ marks where the consonant goes. When a vowel has a different shape
// inside a closed syllable (final consonant), `closed` shows that form.
export const VOWEL_SECTIONS: VowelSection[] = [
  {
    title: 'Basic Vowels — 9 Pairs',
    color: '#7c3aed',
    pairs: [
      {
        short: {
          form: '◌ะ',
          ipa: '/a/',
          example: 'กะ',
          exampleGloss: 'estimate',
          closed: '◌ั◌',
          closedExample: 'ฉัน',
          closedGloss: 'I',
        },
        long: { form: '◌า', ipa: '/aː/', example: 'กา', exampleGloss: 'crow' },
      },
      {
        short: { form: '◌ิ', ipa: '/i/', example: 'กิน', exampleGloss: 'eat' },
        long: { form: '◌ี', ipa: '/iː/', example: 'กี่', exampleGloss: 'how many' },
      },
      {
        short: { form: '◌ึ', ipa: '/ɯ/', example: 'นึก', exampleGloss: 'think' },
        long: { form: '◌ือ', ipa: '/ɯː/', example: 'มือ', exampleGloss: 'hand' },
      },
      {
        short: { form: '◌ุ', ipa: '/u/', example: 'กุบ', exampleGloss: 'snap' },
        long: { form: '◌ู', ipa: '/uː/', example: 'กู', exampleGloss: 'I (rude)' },
      },
      {
        short: {
          form: 'เ◌ะ',
          ipa: '/e/',
          example: 'เกะกะ',
          exampleGloss: 'messy',
          closed: 'เ◌็◌',
          closedExample: 'เล็ก',
          closedGloss: 'small',
        },
        long: { form: 'เ◌', ipa: '/eː/', example: 'เก', exampleGloss: 'old' },
      },
      {
        short: {
          form: 'แ◌ะ',
          ipa: '/ɛ/',
          example: 'แกะ',
          exampleGloss: 'sheep',
          closed: 'แ◌็◌',
          closedExample: 'แข็ง',
          closedGloss: 'hard',
        },
        long: { form: 'แ◌', ipa: '/ɛː/', example: 'แก', exampleGloss: 'you' },
      },
      {
        short: {
          form: 'โ◌ะ',
          ipa: '/o/',
          example: 'โต๊ะ',
          exampleGloss: 'table',
          closed: '◌◌',
          closedExample: 'คน',
          closedGloss: 'person',
          closedNote: 'vowel becomes invisible',
        },
        long: { form: 'โ◌', ipa: '/oː/', example: 'โต', exampleGloss: 'grow' },
      },
      {
        short: {
          form: 'เ◌าะ',
          ipa: '/ɔ/',
          example: 'เกาะ',
          exampleGloss: 'island',
          closed: '◌็อ◌',
          closedExample: 'ล็อก',
          closedGloss: 'lock',
        },
        long: { form: '◌อ', ipa: '/ɔː/', example: 'กอ', exampleGloss: 'hug' },
      },
      {
        short: { form: 'เ◌อะ', ipa: '/ɤ/', example: 'เลอะ', exampleGloss: 'messy' },
        long: {
          form: 'เ◌อ',
          ipa: '/ɤː/',
          example: 'เธอ',
          exampleGloss: 'she',
          closed: 'เ◌ิ◌',
          closedExample: 'เลิก',
          closedGloss: 'quit',
        },
      },
    ],
  },
  {
    title: 'Diphthongs — 3 Pairs',
    color: '#0891b2',
    pairs: [
      {
        short: { form: 'เ◌ียะ', ipa: '/ia/', example: 'เกี๊ยะ', exampleGloss: 'clog' },
        long: { form: 'เ◌ีย', ipa: '/iaː/', example: 'เสีย', exampleGloss: 'broken' },
      },
      {
        short: { form: 'เ◌ือะ', ipa: '/ɯa/', example: 'เลือะ', exampleGloss: 'rare', rare: true },
        long: { form: 'เ◌ือ', ipa: '/ɯaː/', example: 'เสือ', exampleGloss: 'tiger' },
      },
      {
        short: { form: '◌ัวะ', ipa: '/ua/', example: 'ผัวะ', exampleGloss: 'rare', rare: true },
        long: {
          form: '◌ัว',
          ipa: '/uaː/',
          example: 'ตัว',
          exampleGloss: 'body',
          closed: '◌ว◌',
          closedExample: 'สวน',
          closedGloss: 'garden',
        },
      },
    ],
  },
  {
    title: 'Special Forms',
    color: '#64748b',
    singleColumn: true,
    pairs: [
      {
        short: {
          form: '◌ำ',
          ipa: '/am/',
          example: 'ทำ',
          exampleGloss: 'do',
          note: 'short /a/ + /m/ in one symbol',
        },
      },
      {
        short: {
          form: 'ฤ',
          ipa: '/rɯ/ or /ri/',
          example: 'ฤดู',
          exampleGloss: 'season',
          note: 'acts as low-class consonant + vowel',
        },
      },
      {
        short: {
          form: 'ฤๅ',
          ipa: '/rɯː/',
          example: 'ฤๅษี',
          exampleGloss: 'hermit',
          note: 'long form, very rare',
        },
      },
    ],
  },
  {
    title: 'Vowel + Glide Endings (ย / ว)',
    subtitle: 'Vowels ending in ย /j/ or ว /w/ glide',
    color: '#b45309',
    pairs: [
      {
        short: { form: 'ไ◌ / ใ◌', ipa: '/aj/', example: 'ไม่', exampleGloss: 'not' },
        long: { form: '◌าย', ipa: '/aːj/', example: 'สบาย', exampleGloss: 'well' },
      },
      {
        short: { form: 'เ◌า', ipa: '/aw/', example: 'เขา', exampleGloss: 'he' },
        long: { form: '◌าว', ipa: '/aːw/', example: 'ขาว', exampleGloss: 'white' },
      },
      {
        long: { form: '◌อย', ipa: '/ɔːj/', example: 'น้อย', exampleGloss: 'little' },
      },
      {
        long: { form: 'โ◌ย', ipa: '/oːj/', example: 'โดย', exampleGloss: 'by' },
      },
      {
        long: { form: 'เ◌ย', ipa: '/ɤːj/', example: 'เคย', exampleGloss: 'ever' },
      },
      {
        short: { form: 'เ◌็ว', ipa: '/ew/', example: 'เร็ว', exampleGloss: 'fast' },
        long: { form: 'เ◌ว', ipa: '/eːw/', example: 'เอว', exampleGloss: 'waist' },
      },
      {
        short: { form: 'แ◌็ว', ipa: '/ɛw/', rare: true },
        long: { form: 'แ◌ว', ipa: '/ɛːw/', example: 'แมว', exampleGloss: 'cat' },
      },
      {
        long: { form: 'เ◌ียว', ipa: '/iaw/', example: 'เขียว', exampleGloss: 'green' },
      },
      {
        short: { form: 'อิว', ipa: '/iw/', example: 'หิว', exampleGloss: 'hungry' },
      },
      {
        long: { form: 'เ◌ือย', ipa: '/ɯaj/', example: 'เหนื่อย', exampleGloss: 'tired' },
      },
      {
        short: { form: '◌วย', ipa: '/uaj/', example: 'สวย', exampleGloss: 'pretty' },
        long: { form: '◌วาย', ipa: '/uaːj/', rare: true },
      },
      {
        short: { form: 'อุย', ipa: '/uj/', example: 'ทุย', exampleGloss: 'rare', rare: true },
      },
    ],
  },
];
