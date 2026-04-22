// Thai alphabet poem ("ABC song") — each consonant gets an anchor word and a
// rhyming extension. Source: thai-language.com/id/590098
//
// All `rom` fields use strict IPA with tone diacritics. See CLAUDE.md.

export interface PoemEntry {
  letter: string;
  anchorThai: string;   // e.g. "กอ ไก่"
  anchorRom: string;    // IPA, e.g. "kɔː kàj"
  extThai: string;      // e.g. "ในเล้า" — empty for ก
  extRom: string;       // IPA, e.g. "naj láw"
  meaning: string;      // full English gloss: "the eggs in the coop"
}

export const POEM: PoemEntry[] = [
  { letter: 'ก', anchorThai: 'กอ เอ๋ย กอ ไก่', anchorRom: 'kɔː ʔɤ̌ːj kɔː kàj', extThai: '',           extRom: '',                meaning: 'chicken' },
  { letter: 'ข', anchorThai: 'ขอ ไข่',     anchorRom: 'kʰɔ̌ː kʰàj',        extThai: 'ในเล้า',      extRom: 'naj láw',          meaning: 'the eggs in the coop' },
  { letter: 'ฃ', anchorThai: 'ขอ ขวด',     anchorRom: 'kʰɔ̌ː kʰùat',       extThai: 'ของเรา',      extRom: 'kʰɔ̌ːŋ raw',        meaning: 'the bottle that is ours' },
  { letter: 'ค', anchorThai: 'คอ ควาย',   anchorRom: 'kʰɔː kʰwaːj',       extThai: 'เข้านา',       extRom: 'kʰâw naː',         meaning: 'the buffalo who enters the rice paddy' },
  { letter: 'ฅ', anchorThai: 'ฅอ ฅน',      anchorRom: 'kʰɔː kʰon',         extThai: 'ขึงขัง',       extRom: 'kʰɯ̌ŋ kʰǎŋ',        meaning: 'the serious person' },
  { letter: 'ฆ', anchorThai: 'ฆอ ระฆัง',   anchorRom: 'kʰɔː rá.kʰaŋ',      extThai: 'ข้างฝา',       extRom: 'kʰâːŋ fǎː',         meaning: 'the bell beside the wall' },
  { letter: 'ง', anchorThai: 'งอ งู',       anchorRom: 'ŋɔː ŋuː',           extThai: 'ใจกล้า',       extRom: 'tɕaj klâː',         meaning: 'the fearless snake' },
  { letter: 'จ', anchorThai: 'จอ จาน',     anchorRom: 'tɕɔː tɕaːn',        extThai: 'ใช้ดี',         extRom: 'tɕʰáj diː',          meaning: 'the plate, so useful' },
  { letter: 'ฉ', anchorThai: 'ฉอ ฉิ่ง',     anchorRom: 'tɕʰɔ̌ː tɕʰìŋ',       extThai: 'ตีดัง',         extRom: 'tiː daŋ',            meaning: 'the finger cymbals, struck loudly' },
  { letter: 'ช', anchorThai: 'ชอ ช้าง',    anchorRom: 'tɕʰɔː tɕʰáːŋ',      extThai: 'วิ่งหนี',       extRom: 'wîŋ nǐː',            meaning: 'the elephant who runs away' },
  { letter: 'ซ', anchorThai: 'ซอ โซ่',     anchorRom: 'sɔː sôː',           extThai: 'ล่ามที',        extRom: 'lâːm tʰiː',          meaning: 'the chain, to tie him up' },
  { letter: 'ฌ', anchorThai: 'ฌอ เฌอ',     anchorRom: 'tɕʰɔː tɕʰɤː',       extThai: 'คู่กัน',        extRom: 'kʰûː kan',           meaning: 'the pair of bushes' },
  { letter: 'ญ', anchorThai: 'ญอ หญิง',    anchorRom: 'jɔː jǐŋ',           extThai: 'โสภา',         extRom: 'sǒː.pʰaː',           meaning: 'the beautiful girl' },
  { letter: 'ฎ', anchorThai: 'ดอ ชฎา',     anchorRom: 'dɔː tɕʰá.daː',      extThai: 'สวมพลัน',      extRom: 'sǔam pʰlan',         meaning: 'the dance hat, hastily donned' },
  { letter: 'ฏ', anchorThai: 'ตอ ปฏัก',    anchorRom: 'tɔː pà.tàk',        extThai: 'หุนหัน',        extRom: 'hǔn.hǎn',            meaning: 'the harpoon, hasty and rash' },
  { letter: 'ฐ', anchorThai: 'ฐอ ฐาน',     anchorRom: 'tʰɔ̌ː tʰǎːn',        extThai: 'เข้ามารอง',    extRom: 'kʰâw maː rɔːŋ',      meaning: 'the pedestal, giving support' },
  { letter: 'ฑ', anchorThai: 'ฑอ มณโฑ',   anchorRom: 'tʰɔː mon.tʰoː',     extThai: 'หน้าขาว',       extRom: 'nâː kʰǎːw',          meaning: "Montho with her pale face" },
  { letter: 'ฒ', anchorThai: 'ฒอ ผู้เฒ่า', anchorRom: 'tʰɔː pʰûː.tʰâw',    extThai: 'เดินย่อง',     extRom: 'dɤːn jɔ̂ŋ',            meaning: 'the old man who walks feebly' },
  { letter: 'ณ', anchorThai: 'ณอ เณร',     anchorRom: 'nɔː neːn',          extThai: 'ไม่มอง',        extRom: 'mâj mɔːŋ',           meaning: "the novice monk who may not stare" },
  { letter: 'ด', anchorThai: 'ดอ เด็ก',    anchorRom: 'dɔː dèk',           extThai: 'ต้องนิมนต์',   extRom: 'tɔ̂ŋ ní.mon',          meaning: 'the children, who invite him in' },
  { letter: 'ต', anchorThai: 'ตอ เต่า',    anchorRom: 'tɔː tàw',           extThai: 'หลังตุง',       extRom: 'lǎŋ tuŋ',            meaning: 'the turtle with bulging back' },
  { letter: 'ถ', anchorThai: 'ถอ ถุง',     anchorRom: 'tʰɔ̌ː tʰǔŋ',         extThai: 'แบกขน',         extRom: 'bɛ̀ːk kʰǒn',          meaning: 'the bag for carrying things' },
  { letter: 'ท', anchorThai: 'ทอ ทหาร',   anchorRom: 'tʰɔː tʰá.hǎːn',     extThai: 'อดทน',           extRom: 'ʔòt.tʰon',           meaning: 'the enduring soldier' },
  { letter: 'ธ', anchorThai: 'ธอ ธง',      anchorRom: 'tʰɔː tʰoŋ',         extThai: 'คนนิยม',        extRom: 'kʰon ní.jom',        meaning: 'the favorite flag' },
  { letter: 'น', anchorThai: 'นอ หนู',     anchorRom: 'nɔː nǔː',           extThai: 'ขวักไขว่',      extRom: 'kʰwàk kʰwàj',        meaning: 'the mice scurrying helter-skelter' },
  { letter: 'บ', anchorThai: 'บอ ใบไม้',   anchorRom: 'bɔː baj.máːj',      extThai: 'ทับถม',         extRom: 'tʰáp.tʰǒm',          meaning: 'the leaves piling up' },
  { letter: 'ป', anchorThai: 'ปอ ปลา',     anchorRom: 'pɔː plaː',          extThai: 'ตากลม',          extRom: 'taː klom',           meaning: 'the beady-eyed fish' },
  { letter: 'ผ', anchorThai: 'ผอ ผึ้ง',    anchorRom: 'pʰɔ̌ː pʰɯ̂ŋ',         extThai: 'ทำรัง',          extRom: 'tʰam raŋ',           meaning: 'the bees building a hive' },
  { letter: 'ฝ', anchorThai: 'ฝอ ฝา',      anchorRom: 'fɔ̌ː fǎː',           extThai: 'ทนทาน',          extRom: 'tʰon.tʰaːn',         meaning: 'the very durable lid' },
  { letter: 'พ', anchorThai: 'พอ พาน',     anchorRom: 'pʰɔː pʰaːn',        extThai: 'วางตั้ง',       extRom: 'waːŋ tâŋ',           meaning: 'the tray, all laid out' },
  { letter: 'ฟ', anchorThai: 'ฟอ ฟัน',     anchorRom: 'fɔː fan',           extThai: 'สะอาดจัง',      extRom: 'sà.ʔàːt tɕaŋ',       meaning: 'the teeth, so very clean' },
  { letter: 'ภ', anchorThai: 'ภอ สำเภา',   anchorRom: 'pʰɔː sǎm.pʰaw',     extThai: 'กางใบ',          extRom: 'kaːŋ baj',           meaning: 'the junk unfurling its sails' },
  { letter: 'ม', anchorThai: 'มอ ม้า',     anchorRom: 'mɔː máː',           extThai: 'คึกคัก',         extRom: 'kʰɯ́k.kʰák',          meaning: 'the unruly horse' },
  { letter: 'ย', anchorThai: 'ยอ ยักษ์',   anchorRom: 'jɔː ják',           extThai: 'เขี้ยวใหญ่',    extRom: 'kʰîaw jàj',          meaning: 'the giant with big fangs' },
  { letter: 'ร', anchorThai: 'รอ เรือ',    anchorRom: 'rɔː rɯa',           extThai: 'พายไป',          extRom: 'pʰaːj paj',          meaning: 'the boat that paddles by' },
  { letter: 'ล', anchorThai: 'ลอ ลิง',     anchorRom: 'lɔː liŋ',           extThai: 'ไต่ราว',         extRom: 'tàj raːw',           meaning: 'the monkey climbing the handrail' },
  { letter: 'ว', anchorThai: 'วอ แหวน',   anchorRom: 'wɔː wɛ̌ːn',          extThai: 'ลงยา',           extRom: 'loŋ jaː',            meaning: 'the ring, decorated with enamel' },
  { letter: 'ศ', anchorThai: 'ศอ ศาลา',   anchorRom: 'sɔ̌ː sǎː.laː',       extThai: 'เงียบเหงา',     extRom: 'ŋîap ŋǎw',           meaning: 'the pavilion, peaceful and lonely' },
  { letter: 'ษ', anchorThai: 'ษอ ฤๅษี',   anchorRom: 'sɔ̌ː rɯː.sǐː',       extThai: 'หนวดยาว',       extRom: 'nùat jaːw',          meaning: 'the hermit with his long beard' },
  { letter: 'ส', anchorThai: 'สอ เสือ',    anchorRom: 'sɔ̌ː sɯ̌a',           extThai: 'ดาวคะนอง',     extRom: 'daːw kʰá.nɔːŋ',      meaning: 'the ferocious leopard' },
  { letter: 'ห', anchorThai: 'หอ หีบ',     anchorRom: 'hɔ̌ː hìːp',          extThai: 'ใส่ผ้า',        extRom: 'sàj pʰâː',           meaning: 'the box filled with clothes' },
  { letter: 'ฬ', anchorThai: 'ฬอ จุฬา',   anchorRom: 'lɔː tɕù.laː',       extThai: 'ท่าผยอง',        extRom: 'tʰâː pʰà.jɔːŋ',      meaning: 'the swaggering boy kite' },
  { letter: 'อ', anchorThai: 'ออ อ่าง',    anchorRom: 'ʔɔː ʔàːŋ',          extThai: 'เนืองนอง',       extRom: 'nɯaŋ.nɔːŋ',          meaning: 'the overflowing bowls' },
  { letter: 'ฮ', anchorThai: 'ฮอ นกฮูก',  anchorRom: 'hɔː nók.hûːk',      extThai: 'ตาโต',            extRom: 'taː toː',            meaning: 'the owl with huge eyes' },
];

// Confusable pairs — letters that look almost the same, distinguished by a
// small detail. Some cards stack multiple rows when the contrast spans more
// than one pair (e.g. ด/ต vs ค, where the dental pair loops left and the
// velar family loops right). `practiceWords` (optional) lists real words that
// mix the contrasted letters, for hands-on tracing practice.
export interface ConfusablePair {
  rows: string[][];
  /** Letters shown as reference only (no practice slots) — e.g. obsolete letters referenced in the note. */
  displayOnly?: string[];
  note: string;
  practiceWords?: { word: string; rom: string; gloss: string }[];
}

export const CONFUSABLES: ConfusablePair[] = [
  {
    rows: [['ถ', 'ภ']],
    note: 'ถ has its loop opening left; ภ opens right with a hook',
    practiceWords: [
      { word: 'ถุง',     rom: 'tʰǔŋ',         gloss: 'bag' },
      { word: 'ถาม',     rom: 'tʰǎːm',        gloss: 'ask' },
      { word: 'ถนน',     rom: 'tʰà.nǒn',      gloss: 'road' },
      { word: 'ภาษา',    rom: 'pʰaː.sǎː',     gloss: 'language' },
      { word: 'ภาพ',     rom: 'pʰâːp',        gloss: 'picture' },
      { word: 'ภาพถ่าย', rom: 'pʰâːp.tʰàːj',  gloss: 'photograph' },
    ],
  },
  {
    rows: [['บ', 'ป', 'ษ']],
    note: 'same bowl — บ flat top, ป tick, ษ curled notch',
    practiceWords: [
      { word: 'บ้าน',    rom: 'bâːn',        gloss: 'house' },
      { word: 'ปลา',     rom: 'plaː',        gloss: 'fish' },
      { word: 'ปี',       rom: 'piː',         gloss: 'year' },
      { word: 'บาป',     rom: 'bàːp',        gloss: 'sin' },
      { word: 'พิเศษ',   rom: 'pʰí.sèːt',    gloss: 'special' },
      { word: 'อังกฤษ',  rom: 'ʔaŋ.krìt',    gloss: 'English' },
    ],
  },
  {
    rows: [['ด', 'ต'], ['ค', 'ฅ']],
    displayOnly: ['ฅ'],
    note: 'ด and ต: the head-loop is drawn going LEFT (ต is the dented form of ด).\nค (and obsolete ฅ): the loop is drawn going RIGHT.',
    // Practice words from Learn Thai Happily's ค vs ด worksheet — mix of
    // ค-only, ด-only, and words containing both letters.
    practiceWords: [
      { word: 'ค้างคืน', rom: 'kʰáːŋ.kʰɯːn',  gloss: 'stay overnight' },
      { word: 'คนไทย',   rom: 'kʰon.tʰaj',     gloss: 'Thai person' },
      { word: 'คุกคาม',  rom: 'kʰúk.kʰaːm',    gloss: 'threaten' },
      { word: 'ดวงดี',   rom: 'duaŋ.diː',      gloss: 'lucky' },
      { word: 'ดีเด่น',  rom: 'diː.dèn',       gloss: 'outstanding' },
      { word: 'ดวงดาว',  rom: 'duaŋ.daːw',     gloss: 'star' },
      { word: 'ดินแดน',  rom: 'din.dɛːn',      gloss: 'territory' },
      { word: 'คำพูด',   rom: 'kʰam.pʰûːt',    gloss: 'speech' },
      { word: 'ความดี',  rom: 'kʰwaːm.diː',    gloss: 'goodness' },
      { word: 'ความคิด', rom: 'kʰwaːm.kʰít',   gloss: 'idea' },
      { word: 'คดโกง',   rom: 'kʰót.koːŋ',     gloss: 'dishonest' },
      { word: 'โดดเด่น', rom: 'dòːt.dèn',      gloss: 'prominent' },
    ],
  },
  {
    rows: [['พ', 'ผ']],
    note: 'same body — พ has tail below, ผ has tail up',
    practiceWords: [
      { word: 'ผม',      rom: 'pʰǒm',             gloss: 'I / hair' },
      { word: 'ผิว',     rom: 'pʰǐw',             gloss: 'skin' },
      { word: 'แผน',     rom: 'pʰɛ̌ːn',            gloss: 'plan' },
      { word: 'พ่อ',     rom: 'pʰɔ̂ː',             gloss: 'father' },
      { word: 'พูด',     rom: 'pʰûːt',            gloss: 'speak' },
      { word: 'ผลไม้',   rom: 'pʰǒn.la.máːj',     gloss: 'fruit' },
    ],
  },
  {
    rows: [['ฟ', 'ฝ']],
    note: 'same body — ฟ has tail down, ฝ has tail up',
    practiceWords: [
      { word: 'ฝน',     rom: 'fǒn',       gloss: 'rain' },
      { word: 'ฝัน',    rom: 'fǎn',       gloss: 'dream' },
      { word: 'ฝาก',    rom: 'fàːk',      gloss: 'deposit' },
      { word: 'ฟัน',    rom: 'fan',       gloss: 'tooth' },
      { word: 'ฟ้า',    rom: 'fáː',       gloss: 'sky' },
      { word: 'ฝ่าฟัน', rom: 'fàː.fan',   gloss: 'struggle through' },
    ],
  },
  {
    rows: [['ข', 'ช']],
    note: 'ข has two notches, ช has one',
    practiceWords: [
      { word: 'ข้าว',     rom: 'kʰâːw',          gloss: 'rice' },
      { word: 'ขาย',      rom: 'kʰǎːj',          gloss: 'sell' },
      { word: 'ช้าง',     rom: 'tɕʰáːŋ',         gloss: 'elephant' },
      { word: 'ชื่อ',     rom: 'tɕʰɯ̂ː',          gloss: 'name' },
      { word: 'ข้าวเช้า', rom: 'kʰâːw.tɕʰáːw',   gloss: 'breakfast' },
      { word: 'ชาวเขา',   rom: 'tɕʰaːw.kʰǎw',    gloss: 'hill tribe' },
    ],
  },
];

// Class mnemonic sentences (also shown on the Consonants tab). Each sentence
// contains only letters of a single class — a classic memorization aid.
export const MID_MNEMONIC = {
  thai: 'ไก่จิกเด็กตายบนปากโอ่ง',
  rom: 'kàj tɕìk dèk taːj bon pàːk ʔòːŋ',
  meaning: 'A chicken pecks a child to death on top of a jar',
  keyLetters: ['ก', 'จ', 'ด', 'ต', 'บ', 'ป', 'อ'],
  words: ['ไก่', 'จิก', 'เด็ก', 'ตาย', 'บน', 'ปาก', 'โอ่ง'],
};

export const HIGH_MNEMONIC = {
  thai: 'ผีฝากถุงข้าวสารให้ฉัน',
  rom: 'pʰǐː fàːk tʰǔŋ kʰâːw sǎːn hâj tɕʰǎn',
  meaning: 'A ghost entrusts a bag of rice to me',
  keyLetters: ['ผ', 'ฝ', 'ถ', 'ข', 'ส', 'ห', 'ฉ'],
  words: ['ผี', 'ฝาก', 'ถุง', 'ข้าว', 'สาร', 'ให้', 'ฉัน'],
};
