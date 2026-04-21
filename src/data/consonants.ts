export type ConsonantClass = 'mid' | 'high' | 'low';

export interface Consonant {
  num: number;
  letter: string;
  name: string;       // Thai name e.g. "กอ ไก่"
  meaning: string;    // English meaning e.g. "chicken"
  nameShort: string;  // Thai object only, e.g. "ไก่"
  nameRom: string;    // IPA of nameShort, e.g. "kàj"
  initial: string;    // IPA initial e.g. "/k/"
  final: string;      // IPA final e.g. "/k/" or "—"
  type: string;       // e.g. "stop (unaspirated)", "nasal", "fricative"
  klass: ConsonantClass;
  rare?: boolean;
  obsolete?: boolean;
  sonorant?: boolean;
}

export const CONSONANTS: Consonant[] = [
  { num: 1,  letter: 'ก', name: 'กอ ไก่',      nameShort: 'ไก่',    nameRom: 'kàj',         meaning: 'chicken',       initial: '/k/',   final: '/k/', type: 'stop (unaspirated)', klass: 'mid' },
  { num: 2,  letter: 'ข', name: 'ขอ ไข่',      nameShort: 'ไข่',    nameRom: 'kʰàj',        meaning: 'egg',           initial: '/kʰ/',  final: '/k/', type: 'stop (aspirated)',  klass: 'high' },
  { num: 3,  letter: 'ฃ', name: 'ขอ ขวด',      nameShort: 'ขวด',   nameRom: 'kʰùat',       meaning: 'bottle',        initial: '/kʰ/',  final: '/k/', type: 'stop (aspirated)',  klass: 'high', obsolete: true },
  { num: 4,  letter: 'ค', name: 'คอ ควาย',    nameShort: 'ควาย',  nameRom: 'kʰwaːj',      meaning: 'buffalo',       initial: '/kʰ/',  final: '/k/', type: 'stop (aspirated)',  klass: 'low' },
  { num: 5,  letter: 'ฅ', name: 'ฅอ ฅน',      nameShort: 'ฅน',    nameRom: 'kʰon',        meaning: 'person',        initial: '/kʰ/',  final: '/k/', type: 'stop (aspirated)',  klass: 'low', obsolete: true },
  { num: 6,  letter: 'ฆ', name: 'ฆอ ระฆัง',   nameShort: 'ระฆัง', nameRom: 'rá.kʰaŋ',     meaning: 'bell',          initial: '/kʰ/',  final: '/k/', type: 'stop (aspirated)',  klass: 'low', rare: true },
  { num: 7,  letter: 'ง', name: 'งอ งู',       nameShort: 'งู',    nameRom: 'ŋuː',         meaning: 'snake',         initial: '/ŋ/',   final: '/ŋ/', type: 'nasal',              klass: 'low', sonorant: true },
  { num: 8,  letter: 'จ', name: 'จอ จาน',     nameShort: 'จาน',   nameRom: 'tɕaːn',       meaning: 'plate',         initial: '/tɕ/',  final: '/t/', type: 'stop (affricate)',   klass: 'mid' },
  { num: 9,  letter: 'ฉ', name: 'ฉอ ฉิ่ง',     nameShort: 'ฉิ่ง',   nameRom: 'tɕʰìŋ',       meaning: 'cymbals',       initial: '/tɕʰ/', final: '—',   type: 'stop (aspirated affricate)', klass: 'high' },
  { num: 10, letter: 'ช', name: 'ชอ ช้าง',    nameShort: 'ช้าง',  nameRom: 'tɕʰáːŋ',      meaning: 'elephant',      initial: '/tɕʰ/', final: '/t/', type: 'stop (aspirated affricate)', klass: 'low' },
  { num: 11, letter: 'ซ', name: 'ซอ โซ่',     nameShort: 'โซ่',   nameRom: 'sôː',         meaning: 'chain',         initial: '/s/',   final: '/t/', type: 'fricative',          klass: 'low' },
  { num: 12, letter: 'ฌ', name: 'ฌอ เฌอ',     nameShort: 'เฌอ',   nameRom: 'tɕʰɤː',       meaning: 'tree',          initial: '/tɕʰ/', final: '—',   type: 'stop (aspirated affricate)', klass: 'low', rare: true },
  { num: 13, letter: 'ญ', name: 'ญอ หญิง',    nameShort: 'หญิง',  nameRom: 'jǐŋ',         meaning: 'woman',         initial: '/j/',   final: '/n/', type: 'palatal',            klass: 'low', sonorant: true },
  { num: 14, letter: 'ฎ', name: 'ดอ ชฎา',     nameShort: 'ชฎา',   nameRom: 'tɕʰá.daː',    meaning: 'headdress',     initial: '/d/',   final: '/t/', type: 'stop (unaspirated)', klass: 'mid', rare: true },
  { num: 15, letter: 'ฏ', name: 'ตอ ปฏัก',    nameShort: 'ปฏัก',  nameRom: 'pà.tàk',      meaning: 'goad/spear',    initial: '/t/',   final: '/t/', type: 'stop (unaspirated)', klass: 'mid', rare: true },
  { num: 16, letter: 'ฐ', name: 'ฐอ ฐาน',     nameShort: 'ฐาน',   nameRom: 'tʰǎːn',       meaning: 'pedestal',      initial: '/tʰ/',  final: '/t/', type: 'stop (aspirated)',   klass: 'high', rare: true },
  { num: 17, letter: 'ฑ', name: 'ฑอ มณโฑ',   nameShort: 'มณโฑ',  nameRom: 'mon.tʰoː',    meaning: 'Montho',        initial: '/tʰ/',  final: '/t/', type: 'stop (aspirated)',   klass: 'low', rare: true },
  { num: 18, letter: 'ฒ', name: 'ฒอ ผู้เฒ่า', nameShort: 'ผู้เฒ่า', nameRom: 'pʰûː.tʰâw',   meaning: 'elder',         initial: '/tʰ/',  final: '/t/', type: 'stop (aspirated)',   klass: 'low', rare: true },
  { num: 19, letter: 'ณ', name: 'ณอ เณร',     nameShort: 'เณร',   nameRom: 'neːn',        meaning: 'novice monk',   initial: '/n/',   final: '/n/', type: 'nasal',              klass: 'low', sonorant: true, rare: true },
  { num: 20, letter: 'ด', name: 'ดอ เด็ก',    nameShort: 'เด็ก',  nameRom: 'dèk',         meaning: 'child',         initial: '/d/',   final: '/t/', type: 'stop (unaspirated)', klass: 'mid' },
  { num: 21, letter: 'ต', name: 'ตอ เต่า',    nameShort: 'เต่า',  nameRom: 'tàw',         meaning: 'turtle',        initial: '/t/',   final: '/t/', type: 'stop (unaspirated)', klass: 'mid' },
  { num: 22, letter: 'ถ', name: 'ถอ ถุง',     nameShort: 'ถุง',   nameRom: 'tʰǔŋ',        meaning: 'bag',           initial: '/tʰ/',  final: '/t/', type: 'stop (aspirated)',   klass: 'high' },
  { num: 23, letter: 'ท', name: 'ทอ ทหาร',   nameShort: 'ทหาร',  nameRom: 'tʰá.hǎːn',    meaning: 'soldier',       initial: '/tʰ/',  final: '/t/', type: 'stop (aspirated)',   klass: 'low' },
  { num: 24, letter: 'ธ', name: 'ธอ ธง',      nameShort: 'ธง',    nameRom: 'tʰoŋ',        meaning: 'flag',          initial: '/tʰ/',  final: '/t/', type: 'stop (aspirated)',   klass: 'low' },
  { num: 25, letter: 'น', name: 'นอ หนู',     nameShort: 'หนู',   nameRom: 'nǔː',         meaning: 'mouse',         initial: '/n/',   final: '/n/', type: 'nasal',              klass: 'low', sonorant: true },
  { num: 26, letter: 'บ', name: 'บอ ใบไม้',   nameShort: 'ใบไม้', nameRom: 'baj.máːj',    meaning: 'leaf',          initial: '/b/',   final: '/p/', type: 'stop (unaspirated)', klass: 'mid' },
  { num: 27, letter: 'ป', name: 'ปอ ปลา',     nameShort: 'ปลา',   nameRom: 'plaː',        meaning: 'fish',          initial: '/p/',   final: '/p/', type: 'stop (unaspirated)', klass: 'mid' },
  { num: 28, letter: 'ผ', name: 'ผอ ผึ้ง',    nameShort: 'ผึ้ง',  nameRom: 'pʰɯ̂ŋ',        meaning: 'bee',           initial: '/pʰ/',  final: '—',   type: 'stop (aspirated)',   klass: 'high' },
  { num: 29, letter: 'ฝ', name: 'ฝอ ฝา',      nameShort: 'ฝา',    nameRom: 'fǎː',         meaning: 'lid',           initial: '/f/',   final: '—',   type: 'fricative',          klass: 'high' },
  { num: 30, letter: 'พ', name: 'พอ พาน',     nameShort: 'พาน',   nameRom: 'pʰaːn',       meaning: 'tray',          initial: '/pʰ/',  final: '/p/', type: 'stop (aspirated)',   klass: 'low' },
  { num: 31, letter: 'ฟ', name: 'ฟอ ฟัน',     nameShort: 'ฟัน',   nameRom: 'fan',         meaning: 'tooth',         initial: '/f/',   final: '/p/', type: 'fricative',          klass: 'low' },
  { num: 32, letter: 'ภ', name: 'ภอ สำเภา',   nameShort: 'สำเภา', nameRom: 'sǎm.pʰaw',    meaning: 'junk (ship)',   initial: '/pʰ/',  final: '/p/', type: 'stop (aspirated)',   klass: 'low', rare: true },
  { num: 33, letter: 'ม', name: 'มอ ม้า',     nameShort: 'ม้า',   nameRom: 'máː',         meaning: 'horse',         initial: '/m/',   final: '/m/', type: 'nasal',              klass: 'low', sonorant: true },
  { num: 34, letter: 'ย', name: 'ยอ ยักษ์',   nameShort: 'ยักษ์', nameRom: 'ják',         meaning: 'giant/ogre',    initial: '/j/',   final: '/j/', type: 'semivowel',          klass: 'low', sonorant: true },
  { num: 35, letter: 'ร', name: 'รอ เรือ',    nameShort: 'เรือ',  nameRom: 'rɯa',         meaning: 'boat',          initial: '/r/',   final: '/n/', type: 'trill',              klass: 'low', sonorant: true },
  { num: 36, letter: 'ล', name: 'ลอ ลิง',     nameShort: 'ลิง',   nameRom: 'liŋ',         meaning: 'monkey',        initial: '/l/',   final: '/n/', type: 'lateral',            klass: 'low', sonorant: true },
  { num: 37, letter: 'ว', name: 'วอ แหวน',   nameShort: 'แหวน',  nameRom: 'wɛ̌ːn',        meaning: 'ring',          initial: '/w/',   final: '/w/', type: 'semivowel',          klass: 'low', sonorant: true },
  { num: 38, letter: 'ศ', name: 'ศอ ศาลา',   nameShort: 'ศาลา',  nameRom: 'sǎː.laː',     meaning: 'pavilion',      initial: '/s/',   final: '/t/', type: 'fricative',          klass: 'high', rare: true },
  { num: 39, letter: 'ษ', name: 'ษอ ฤๅษี',   nameShort: 'ฤๅษี',  nameRom: 'rɯː.sǐː',     meaning: 'hermit',        initial: '/s/',   final: '/t/', type: 'fricative',          klass: 'high', rare: true },
  { num: 40, letter: 'ส', name: 'สอ เสือ',    nameShort: 'เสือ',  nameRom: 'sɯ̌a',         meaning: 'tiger',         initial: '/s/',   final: '/t/', type: 'fricative',          klass: 'high' },
  { num: 41, letter: 'ห', name: 'หอ หีบ',     nameShort: 'หีบ',   nameRom: 'hìːp',        meaning: 'chest/box',     initial: '/h/',   final: '—',   type: 'glottal fricative',  klass: 'high' },
  { num: 42, letter: 'ฬ', name: 'ฬอ จุฬา',   nameShort: 'จุฬา',  nameRom: 'tɕù.laː',     meaning: 'kite',          initial: '/l/',   final: '/n/', type: 'lateral',            klass: 'low', sonorant: true, rare: true },
  { num: 43, letter: 'อ', name: 'ออ อ่าง',    nameShort: 'อ่าง',  nameRom: 'ʔàːŋ',        meaning: 'basin',         initial: '/ʔ/',   final: '—',   type: 'glottal',            klass: 'mid' },
  { num: 44, letter: 'ฮ', name: 'ฮอ นกฮูก',  nameShort: 'นกฮูก', nameRom: 'nók.hûːk',    meaning: 'owl',           initial: '/h/',   final: '—',   type: 'glottal fricative',  klass: 'low' },
];

export const byClass = (k: ConsonantClass) => CONSONANTS.filter(c => c.klass === k);

/** Groupings used in the "By Sound" view. */
export interface SoundGroup {
  sound: string;          // IPA initial, e.g. "/k/"
  final: string;          // IPA final, or "/n/ /j/" for y, "—" for none
  letters: Consonant[];
}

export const MID_UNPAIRED_GROUPS: SoundGroup[] = [
  { sound: '/k/', final: '/k/', letters: [c('ก')] },
  { sound: '/tɕ/', final: '/t/', letters: [c('จ')] },
  { sound: '/d/', final: '/t/', letters: [c('ด'), c('ฎ')] },
  { sound: '/t/', final: '/t/', letters: [c('ต'), c('ฏ')] },
  { sound: '/b/', final: '/p/', letters: [c('บ')] },
  { sound: '/p/', final: '/p/', letters: [c('ป')] },
  { sound: '/ʔ/', final: '—', letters: [c('อ')] },
];

export const SONORANT_GROUPS: SoundGroup[] = [
  { sound: '/ŋ/', final: '/ŋ/', letters: [c('ง')] },
  { sound: '/j/', final: '/n/ /j/', letters: [c('ญ'), c('ย')] },
  { sound: '/n/', final: '/n/', letters: [c('น'), c('ณ')] },
  { sound: '/m/', final: '/m/', letters: [c('ม')] },
  { sound: '/r/', final: '/n/', letters: [c('ร')] },
  { sound: '/l/', final: '/n/', letters: [c('ล'), c('ฬ')] },
  { sound: '/w/', final: '/w/', letters: [c('ว')] },
];

export interface HighLowPair {
  sound: string;
  final: string;
  high: Consonant[];
  low: Consonant[];
}

export const HIGH_LOW_PAIRS: HighLowPair[] = [
  { sound: '/kʰ/', final: '/k/', high: [c('ข'), c('ฃ')], low: [c('ค'), c('ฅ'), c('ฆ')] },
  { sound: '/tɕʰ/', final: '/t/', high: [c('ฉ')], low: [c('ช'), c('ฌ')] },
  { sound: '/tʰ/', final: '/t/', high: [c('ฐ'), c('ถ')], low: [c('ฑ'), c('ฒ'), c('ท'), c('ธ')] },
  { sound: '/pʰ/', final: '/p/', high: [c('ผ')], low: [c('พ'), c('ภ')] },
  { sound: '/f/', final: '/p/', high: [c('ฝ')], low: [c('ฟ')] },
  { sound: '/s/', final: '/t/', high: [c('ศ'), c('ษ'), c('ส')], low: [c('ซ')] },
  { sound: '/h/', final: '—', high: [c('ห')], low: [c('ฮ')] },
];

function c(letter: string): Consonant {
  const found = CONSONANTS.find(x => x.letter === letter);
  if (!found) throw new Error(`unknown consonant ${letter}`);
  return found;
}
