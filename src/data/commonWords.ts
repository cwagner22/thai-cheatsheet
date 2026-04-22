/**
 * Three common beginner-friendly words for each consonant, used as tracing
 * practice on the Writing tab. Deliberately avoids any word that appears in
 * the alphabet poem (see alphabetPoem.ts POEM entries), so practice extends
 * the learner's vocabulary beyond the song.
 *
 * Where possible the headline consonant is the initial; for rare letters we
 * fall back to medial/final examples.
 */

export type PracticeWord = { word: string; rom: string; gloss: string };

export const COMMON_WORDS: Record<string, PracticeWord[]> = {
  ก: [
    { word: 'กิน',    rom: 'gin',       gloss: 'eat' },
    { word: 'กลับ',   rom: 'glàp',      gloss: 'return' },
    { word: 'กาแฟ',   rom: 'gaafɛɛ',    gloss: 'coffee' },
  ],
  ข: [
    { word: 'ข้าว',   rom: 'khâaw',     gloss: 'rice' },
    { word: 'ขา',     rom: 'khǎa',      gloss: 'leg' },
    { word: 'ของ',    rom: 'khɔ̌ɔŋ',     gloss: 'thing / of' },
  ],
  // ฃ, ฅ — obsolete; their only attested words appear in the poem, so we
  // leave them without practice vocab.
  ค: [
    { word: 'คุณ',    rom: 'khun',      gloss: 'you' },
    { word: 'ครับ',   rom: 'khráp',     gloss: 'polite (M)' },
    { word: 'คุย',    rom: 'khuy',      gloss: 'chat' },
  ],
  ฆ: [
    { word: 'ฆ่า',     rom: 'khâa',       gloss: 'to kill' },
    { word: 'เมฆ',    rom: 'mêek',       gloss: 'cloud' },
    { word: 'โฆษณา',  rom: 'khôotsanaa', gloss: 'advertisement' },
  ],
  ง: [
    { word: 'งาน',    rom: 'ngaan',     gloss: 'work' },
    { word: 'เงิน',   rom: 'ngɤn',      gloss: 'money' },
    { word: 'ง่าย',   rom: 'ngâay',     gloss: 'easy' },
  ],
  จ: [
    { word: 'จำ',     rom: 'cam',       gloss: 'remember' },
    { word: 'จริง',   rom: 'ciŋ',       gloss: 'real' },
    { word: 'จะ',     rom: 'càʔ',       gloss: 'will (future)' },
  ],
  ฉ: [
    { word: 'ฉัน',    rom: 'chǎn',      gloss: 'I' },
    { word: 'ฉลาด',   rom: 'chàlàat',   gloss: 'smart' },
    { word: 'ฉาก',    rom: 'chàak',     gloss: 'scene' },
  ],
  ช: [
    { word: 'เช้า',   rom: 'cháaw',     gloss: 'morning' },
    { word: 'ชื่อ',   rom: 'chɯ̂ɯ',      gloss: 'name' },
    { word: 'ชอบ',    rom: 'chɔ̂ɔp',     gloss: 'like' },
  ],
  ซ: [
    { word: 'ซื้อ',   rom: 'sɯ́ɯ',       gloss: 'buy' },
    { word: 'ซ้าย',   rom: 'sáay',      gloss: 'left' },
    { word: 'ซอย',    rom: 'sɔɔy',      gloss: 'alley' },
  ],
  ฌ: [
    { word: 'ฌาน',    rom: 'chaan',     gloss: 'meditation' },
  ],
  ญ: [
    { word: 'ญาติ',    rom: 'yâat',     gloss: 'relative' },
    { word: 'ญี่ปุ่น', rom: 'yîipùn',   gloss: 'Japan' },
    { word: 'บุญ',     rom: 'bun',      gloss: 'merit' },
  ],
  ฎ: [
    { word: 'กฎ',     rom: 'kòt',       gloss: 'rule' },
    { word: 'ปรากฏ',  rom: 'praakòt',   gloss: 'appear' },
  ],
  ฏ: [
    { word: 'ปฏิบัติ', rom: 'pàtìbàt',   gloss: 'practice' },
    { word: 'ปฏิทิน',  rom: 'pàtìtʰin',  gloss: 'calendar' },
  ],
  ฐ: [
    { word: 'ฐานะ',   rom: 'thǎanáʔ',   gloss: 'status' },
  ],
  ฑ: [
    { word: 'มณฑล',   rom: 'monthon',   gloss: 'province' },
    { word: 'บัณฑิต', rom: 'bandìt',    gloss: 'graduate' },
  ],
  ฒ: [
    { word: 'วัฒนา',  rom: 'wátthanaa', gloss: 'develop' },
    { word: 'วุฒิ',   rom: 'wútthí',    gloss: 'qualification' },
  ],
  ณ: [
    { word: 'คุณ',    rom: 'khun',      gloss: 'you / virtue' },
    { word: 'ณ',      rom: 'náʔ',       gloss: 'at (formal)' },
  ],
  ด: [
    { word: 'ดู',     rom: 'duu',       gloss: 'look' },
    { word: 'ดำ',     rom: 'dam',       gloss: 'black' },
    { word: 'เดือน',  rom: 'dɯan',      gloss: 'month' },
  ],
  ต: [
    { word: 'ต้ม',    rom: 'tôm',       gloss: 'boil' },
    { word: 'ใต้',    rom: 'tâay',      gloss: 'under' },
    { word: 'ตัว',    rom: 'tua',       gloss: 'body / self' },
  ],
  ถ: [
    { word: 'ถนน',    rom: 'thànǒn',    gloss: 'road' },
    { word: 'ถ้า',    rom: 'thâa',      gloss: 'if' },
    { word: 'ถาม',    rom: 'thǎam',     gloss: 'ask' },
  ],
  ท: [
    { word: 'ที่',    rom: 'thîi',      gloss: 'place / at' },
    { word: 'ไทย',    rom: 'thay',      gloss: 'Thai' },
    { word: 'ทะเล',   rom: 'thálee',    gloss: 'sea' },
  ],
  ธ: [
    { word: 'ธนาคาร', rom: 'thánaakhaan', gloss: 'bank' },
    { word: 'ธรรม',   rom: 'tham',        gloss: 'dharma' },
    { word: 'ธรรมดา', rom: 'thammadaa',   gloss: 'ordinary' },
  ],
  น: [
    { word: 'น้ำ',    rom: 'náam',      gloss: 'water' },
    { word: 'นอน',    rom: 'nɔɔn',      gloss: 'sleep' },
    { word: 'นี่',    rom: 'nîi',       gloss: 'this' },
  ],
  บ: [
    { word: 'บ้าน',   rom: 'bâan',      gloss: 'house' },
    { word: 'บาท',    rom: 'bàat',      gloss: 'baht' },
    { word: 'บิน',    rom: 'bin',       gloss: 'fly' },
  ],
  ป: [
    { word: 'ประตู',  rom: 'pràtuu',    gloss: 'door' },
    { word: 'ปี',     rom: 'pii',       gloss: 'year' },
    { word: 'ปาก',    rom: 'pàak',      gloss: 'mouth' },
  ],
  ผ: [
    { word: 'ผม',     rom: 'phǒm',      gloss: 'I (M) / hair' },
    { word: 'ผัด',    rom: 'phàt',      gloss: 'stir-fry' },
    { word: 'ผิว',    rom: 'phǐw',      gloss: 'skin' },
  ],
  ฝ: [
    { word: 'ฝน',     rom: 'fǒn',       gloss: 'rain' },
    { word: 'ฝาก',    rom: 'fàak',      gloss: 'entrust' },
    { word: 'ฝึก',    rom: 'fɯ̀k',       gloss: 'practice' },
  ],
  พ: [
    { word: 'พ่อ',    rom: 'phɔ̂ɔ',      gloss: 'father' },
    { word: 'พูด',    rom: 'phûut',     gloss: 'speak' },
    { word: 'พี่',    rom: 'phîi',      gloss: 'older sibling' },
  ],
  ฟ: [
    { word: 'ไฟ',     rom: 'fay',       gloss: 'fire' },
    { word: 'ฟ้า',    rom: 'fáa',       gloss: 'sky' },
    { word: 'ฟัง',    rom: 'faŋ',       gloss: 'listen' },
  ],
  ภ: [
    { word: 'ภาษา',   rom: 'phaasǎa',   gloss: 'language' },
    { word: 'ภาพ',    rom: 'phâap',     gloss: 'picture' },
    { word: 'ภูเขา',  rom: 'phuukhǎw',  gloss: 'mountain' },
  ],
  ม: [
    { word: 'แม่',    rom: 'mɛ̂ɛ',       gloss: 'mother' },
    { word: 'มาก',    rom: 'mâak',      gloss: 'much / very' },
    { word: 'มือ',    rom: 'mɯɯ',       gloss: 'hand' },
  ],
  ย: [
    { word: 'ยาก',    rom: 'yâak',      gloss: 'difficult' },
    { word: 'ยิ้ม',   rom: 'yím',       gloss: 'smile' },
    { word: 'ยืน',    rom: 'yɯɯn',      gloss: 'stand' },
  ],
  ร: [
    { word: 'รัก',    rom: 'rák',       gloss: 'love' },
    { word: 'ร้อน',   rom: 'rɔ́ɔn',      gloss: 'hot' },
    { word: 'ร้าน',   rom: 'ráan',      gloss: 'shop' },
  ],
  ล: [
    { word: 'ลุง',    rom: 'luŋ',       gloss: 'uncle' },
    { word: 'เล็ก',   rom: 'lék',       gloss: 'small' },
    { word: 'ลม',     rom: 'lom',       gloss: 'wind' },
  ],
  ว: [
    { word: 'วัน',    rom: 'wan',       gloss: 'day' },
    { word: 'เวลา',   rom: 'weelaa',    gloss: 'time' },
    { word: 'วาด',    rom: 'wâat',      gloss: 'draw' },
  ],
  ศ: [
    { word: 'ศูนย์',  rom: 'sǔun',      gloss: 'zero / center' },
    { word: 'ศาสนา',  rom: 'sàatsanǎa', gloss: 'religion' },
    { word: 'เศษ',    rom: 'sèet',      gloss: 'bits / remainder' },
  ],
  ษ: [
    { word: 'ภาษา',    rom: 'phaasǎa', gloss: 'language' },
    { word: 'รักษา',   rom: 'ráksǎa',  gloss: 'treat / preserve' },
    { word: 'กษัตริย์', rom: 'kàsàt',   gloss: 'king' },
  ],
  ส: [
    { word: 'สวัสดี', rom: 'sàwàtdii',  gloss: 'hello' },
    { word: 'สอง',    rom: 'sɔ̌ɔŋ',      gloss: 'two' },
    { word: 'สี',     rom: 'sǐi',       gloss: 'color' },
  ],
  ห: [
    { word: 'หมา',    rom: 'mǎa',       gloss: 'dog' },
    { word: 'ห้า',    rom: 'hâa',       gloss: 'five' },
    { word: 'หิว',    rom: 'hǐw',       gloss: 'hungry' },
  ],
  ฬ: [
    { word: 'กีฬา',   rom: 'kiilaa',    gloss: 'sport' },
    { word: 'วาฬ',    rom: 'waan',      gloss: 'whale' },
  ],
  อ: [
    { word: 'อาหาร',  rom: 'ʔaahǎan',   gloss: 'food' },
    { word: 'อะไร',   rom: 'ʔàray',     gloss: 'what' },
    { word: 'อัน',    rom: 'ʔan',       gloss: 'piece (classifier)' },
  ],
  ฮ: [
    { word: 'ฮา',       rom: 'haa',       gloss: 'funny' },
    { word: 'ฮัลโหล',   rom: 'hanlǒo',    gloss: 'hello (phone)' },
    { word: 'ฮิปโป',    rom: 'híppoo',    gloss: 'hippo' },
  ],
};

export const WORD_BOX_COUNT = 4;
