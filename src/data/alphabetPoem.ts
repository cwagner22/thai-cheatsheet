// Thai alphabet poem ("ABC song") — each consonant gets an anchor word and a
// rhyming extension. Source: thai-language.com/id/590098

export interface PoemEntry {
  letter: string;
  anchorThai: string;   // e.g. "กอ ไก่"
  anchorRom: string;    // e.g. "gor gài"
  extThai: string;      // e.g. "ในเล้า" — empty for ก (just "gor eoey gor gai")
  extRom: string;       // e.g. "nai láo"
  meaning: string;      // full English gloss: "the eggs in the coop"
}

export const POEM: PoemEntry[] = [
  { letter: 'ก', anchorThai: 'กอ เอ๋ย กอ ไก่', anchorRom: 'gor ěuy gor gài', extThai: '',           extRom: '',               meaning: 'chicken' },
  { letter: 'ข', anchorThai: 'ขอ ไข่',     anchorRom: 'khǒr khài',      extThai: 'ในเล้า',      extRom: 'nai láo',        meaning: 'the eggs in the coop' },
  { letter: 'ฃ', anchorThai: 'ขอ ขวด',     anchorRom: 'khǒr khùat',     extThai: 'ของเรา',      extRom: 'khǒng rao',      meaning: 'the bottle that is ours' },
  { letter: 'ค', anchorThai: 'คอ ควาย',   anchorRom: 'kor khwaai',     extThai: 'เข้านา',       extRom: 'khâo naa',       meaning: 'the buffalo who enters the rice paddy' },
  { letter: 'ฅ', anchorThai: 'ฅอ ฅน',      anchorRom: 'kor khon',       extThai: 'ขึงขัง',       extRom: 'khǔeng khǎng',   meaning: 'the serious person' },
  { letter: 'ฆ', anchorThai: 'ฆอ ระฆัง',   anchorRom: 'kor rá-kang',    extThai: 'ข้างฝา',       extRom: 'khâang fǎa',     meaning: 'the bell beside the wall' },
  { letter: 'ง', anchorThai: 'งอ งู',       anchorRom: 'ngor nguu',      extThai: 'ใจกล้า',       extRom: 'jai klâa',       meaning: 'the fearless snake' },
  { letter: 'จ', anchorThai: 'จอ จาน',     anchorRom: 'jor jaan',       extThai: 'ใช้ดี',         extRom: 'chái dee',       meaning: 'the plate, so useful' },
  { letter: 'ฉ', anchorThai: 'ฉอ ฉิ่ง',     anchorRom: 'chǒr chìng',     extThai: 'ตีดัง',         extRom: 'dtii dang',      meaning: 'the finger cymbals, struck loudly' },
  { letter: 'ช', anchorThai: 'ชอ ช้าง',    anchorRom: 'chor cháang',    extThai: 'วิ่งหนี',       extRom: 'wîng nǐi',       meaning: 'the elephant who runs away' },
  { letter: 'ซ', anchorThai: 'ซอ โซ่',     anchorRom: 'sor sôh',        extThai: 'ล่ามที',        extRom: 'lâam thee',      meaning: 'the chain, to tie him up' },
  { letter: 'ฌ', anchorThai: 'ฌอ เฌอ',     anchorRom: 'chor chuuhr',    extThai: 'คู่กัน',        extRom: 'khûu gan',       meaning: 'the pair of bushes' },
  { letter: 'ญ', anchorThai: 'ญอ หญิง',    anchorRom: 'yor yǐng',       extThai: 'โสภา',         extRom: 'sǒh-phaa',       meaning: 'the beautiful girl' },
  { letter: 'ฎ', anchorThai: 'ดอ ชฎา',     anchorRom: 'dor chá-daa',    extThai: 'สวมพลัน',      extRom: 'sǔam phlan',     meaning: 'the dance hat, hastily donned' },
  { letter: 'ฏ', anchorThai: 'ตอ ปฏัก',    anchorRom: 'dtor bpà-dtàk',  extThai: 'หุนหัน',        extRom: 'hǔn-hǎn',        meaning: 'the harpoon, hasty and rash' },
  { letter: 'ฐ', anchorThai: 'ฐอ ฐาน',     anchorRom: 'thǒr thǎan',     extThai: 'เข้ามารอง',    extRom: 'khâo maa rong',  meaning: 'the pedestal, giving support' },
  { letter: 'ฑ', anchorThai: 'ฑอ มณโฑ',   anchorRom: 'thor mon-tho',   extThai: 'หน้าขาว',       extRom: 'nâa khǎao',      meaning: "Montho with her pale face" },
  { letter: 'ฒ', anchorThai: 'ฒอ ผู้เฒ่า', anchorRom: 'thor phûu-thâo', extThai: 'เดินย่อง',     extRom: 'deern yông',     meaning: 'the old man who walks feebly' },
  { letter: 'ณ', anchorThai: 'ณอ เณร',     anchorRom: 'nor naehn',      extThai: 'ไม่มอง',        extRom: 'mâi mong',       meaning: "the novice monk who may not stare" },
  { letter: 'ด', anchorThai: 'ดอ เด็ก',    anchorRom: 'dor dèk',        extThai: 'ต้องนิมนต์',   extRom: 'dtông ní-mon',   meaning: 'the children, who invite him in' },
  { letter: 'ต', anchorThai: 'ตอ เต่า',    anchorRom: 'dtor dtào',      extThai: 'หลังตุง',       extRom: 'lǎng dtung',     meaning: 'the turtle with bulging back' },
  { letter: 'ถ', anchorThai: 'ถอ ถุง',     anchorRom: 'thǒr thǔng',     extThai: 'แบกขน',         extRom: 'bàek khǒn',      meaning: 'the bag for carrying things' },
  { letter: 'ท', anchorThai: 'ทอ ทหาร',   anchorRom: 'thor thá-hǎan',  extThai: 'อดทน',           extRom: 'òt-thon',        meaning: 'the enduring soldier' },
  { letter: 'ธ', anchorThai: 'ธอ ธง',      anchorRom: 'thor thong',     extThai: 'คนนิยม',        extRom: 'khon ní-yom',    meaning: 'the favorite flag' },
  { letter: 'น', anchorThai: 'นอ หนู',     anchorRom: 'nor nǔu',        extThai: 'ขวักไขว่',      extRom: 'khwàk khwài',    meaning: 'the mice scurrying helter-skelter' },
  { letter: 'บ', anchorThai: 'บอ ใบไม้',   anchorRom: 'bor bai-máai',   extThai: 'ทับถม',         extRom: 'tháp thǒm',      meaning: 'the leaves piling up' },
  { letter: 'ป', anchorThai: 'ปอ ปลา',     anchorRom: 'bpor bplaa',     extThai: 'ตากลม',          extRom: 'dtaa klom',      meaning: 'the beady-eyed fish' },
  { letter: 'ผ', anchorThai: 'ผอ ผึ้ง',    anchorRom: 'phǒr phûeng',    extThai: 'ทำรัง',          extRom: 'tham rang',      meaning: 'the bees building a hive' },
  { letter: 'ฝ', anchorThai: 'ฝอ ฝา',      anchorRom: 'fǒr fǎa',        extThai: 'ทนทาน',          extRom: 'thon-thaan',     meaning: 'the very durable lid' },
  { letter: 'พ', anchorThai: 'พอ พาน',     anchorRom: 'phor phaan',     extThai: 'วางตั้ง',       extRom: 'waang dtâng',    meaning: 'the tray, all laid out' },
  { letter: 'ฟ', anchorThai: 'ฟอ ฟัน',     anchorRom: 'for fan',        extThai: 'สะอาดจัง',      extRom: 'sà-àat jang',    meaning: 'the teeth, so very clean' },
  { letter: 'ภ', anchorThai: 'ภอ สำเภา',   anchorRom: 'phor sǎm-phao',  extThai: 'กางใบ',          extRom: 'kaang bai',      meaning: 'the junk unfurling its sails' },
  { letter: 'ม', anchorThai: 'มอ ม้า',     anchorRom: 'mor máa',        extThai: 'คึกคัก',         extRom: 'khúek-khák',     meaning: 'the unruly horse' },
  { letter: 'ย', anchorThai: 'ยอ ยักษ์',   anchorRom: 'yor yák',        extThai: 'เขี้ยวใหญ่',    extRom: 'khîao yài',      meaning: 'the giant with big fangs' },
  { letter: 'ร', anchorThai: 'รอ เรือ',    anchorRom: 'ror ruea',       extThai: 'พายไป',          extRom: 'phaai bpai',     meaning: 'the boat that paddles by' },
  { letter: 'ล', anchorThai: 'ลอ ลิง',     anchorRom: 'lor ling',       extThai: 'ไต่ราว',         extRom: 'dtài raao',      meaning: 'the monkey climbing the handrail' },
  { letter: 'ว', anchorThai: 'วอ แหวน',   anchorRom: 'wor wǎen',       extThai: 'ลงยา',           extRom: 'long yaa',       meaning: 'the ring, decorated with enamel' },
  { letter: 'ศ', anchorThai: 'ศอ ศาลา',   anchorRom: 'sǒr sǎa-laa',    extThai: 'เงียบเหงา',     extRom: 'ngîap ngǎo',     meaning: 'the pavilion, peaceful and lonely' },
  { letter: 'ษ', anchorThai: 'ษอ ฤๅษี',   anchorRom: 'sǒr rue-sǐi',    extThai: 'หนวดยาว',       extRom: 'nùat yaao',      meaning: 'the hermit with his long beard' },
  { letter: 'ส', anchorThai: 'สอ เสือ',    anchorRom: 'sǒr sǔea',       extThai: 'ดาวคะนอง',     extRom: 'daao khá-nong',  meaning: 'the ferocious leopard' },
  { letter: 'ห', anchorThai: 'หอ หีบ',     anchorRom: 'hǒr hìip',       extThai: 'ใส่ผ้า',        extRom: 'sài phâa',       meaning: 'the box filled with clothes' },
  { letter: 'ฬ', anchorThai: 'ฬอ จุฬา',   anchorRom: 'lor jù-laa',     extThai: 'ท่าผยอง',        extRom: 'thâa phà-yong',  meaning: 'the swaggering boy kite' },
  { letter: 'อ', anchorThai: 'ออ อ่าง',    anchorRom: 'or àang',        extThai: 'เนืองนอง',       extRom: 'nueang-nong',    meaning: 'the overflowing bowls' },
  { letter: 'ฮ', anchorThai: 'ฮอ นกฮูก',  anchorRom: 'hor nók-hûuk',   extThai: 'ตาโต',            extRom: 'dtaa dtoh',      meaning: 'the owl with huge eyes' },
];

// Confusable pairs — letters that look almost the same, distinguished by a
// small detail. Useful for handwriting to notice the difference.
export interface ConfusablePair {
  letters: string[];
  note: string;
}

export const CONFUSABLES: ConfusablePair[] = [
  { letters: ['ถ', 'ภ'], note: 'ถ has its loop opening left; ภ opens right with a hook' },
  { letters: ['บ', 'ป', 'ษ'], note: 'same bowl — บ flat top, ป tick, ษ curled notch' },
  { letters: ['ด', 'ต'], note: 'ด has a round top; ต has a pointed spike' },
  { letters: ['พ', 'ผ'], note: 'same body — พ has tail below, ผ has tail up' },
  { letters: ['ฟ', 'ฝ'], note: 'same body — ฟ has tail down, ฝ has tail up' },
  { letters: ['ค', 'ด'], note: 'ค has two loops, ด has one with a tick' },
  { letters: ['ข', 'ช'], note: 'ข has two notches, ช has one' },
];

// Class mnemonic sentences (also shown on the Consonants tab). Each sentence
// contains only letters of a single class — a classic memorization aid.
export const MID_MNEMONIC = {
  thai: 'ไก่จิกเด็กตายบนปากโอ่ง',
  rom: 'gài jìk dèk dtaai bon bpàak òhng',
  meaning: 'A chicken pecks a child to death on top of a jar',
  keyLetters: ['ก', 'จ', 'ด', 'ต', 'บ', 'ป', 'อ'],
  words: ['ไก่', 'จิก', 'เด็ก', 'ตาย', 'บน', 'ปาก', 'โอ่ง'],
};

export const HIGH_MNEMONIC = {
  thai: 'ผีฝากถุงข้าวสารให้ฉัน',
  rom: 'phǐi fàak thǔng khâao sǎan hâi chǎn',
  meaning: 'A ghost entrusts a bag of rice to me',
  keyLetters: ['ผ', 'ฝ', 'ถ', 'ข', 'ส', 'ห', 'ฉ'],
  words: ['ผี', 'ฝาก', 'ถุง', 'ข้าว', 'สาร', 'ให้', 'ฉัน'],
};
