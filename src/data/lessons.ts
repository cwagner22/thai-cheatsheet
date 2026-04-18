import type { ZoneId } from './zones';

export interface Lesson {
  id: number;                // mirrors thai-notes lesson numbering for familiarity
  title: string;              // e.g. "Far Left Upper · drill"
  kind: 'drill' | 'words' | 'review' | 'pangram';
  /** Zones covered by this lesson; used to decide keyboard highlight. */
  zones: ZoneId[];
  /**
   * Zones this lesson is *primarily teaching*. Only these zones will expose
   * this lesson as an in-overlay tab. Cumulative lessons that happen to use
   * all prior zones don't want to clutter each zone card's tab list.
   */
  primaryZones?: ZoneId[];
  /** Short instruction shown at top of the practice area. */
  instruction: string;
  /** Lines of practice text to type, in order. */
  lines: string[];
}

/* -------------------------------------------------------------------------
 * Drill generators
 *
 * We generate our own drills from key sets so the app doesn't depend on
 * any external lesson content. Each drill progresses:
 *   1. Key repetition blocks (e.g., XXXX YYYY XXXX YYYY)
 *   2. Alternating pairs   (e.g., XY XY XY)
 *   3. Random-looking mix  (seeded, deterministic)
 * ----------------------------------------------------------------------- */

// Deterministic PRNG so drills are stable across reloads.
// Uses Math.imul + unsigned right shift to stay in 32-bit unsigned range.
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 9301) + 49297) >>> 0;
    return (s % 233280) / 233280;
  };
}

function blockLine(keys: string[], blockSize = 4, groups = 8): string {
  const line: string[] = [];
  for (let i = 0; i < groups; i++) {
    const k = keys[i % keys.length];
    line.push(k.repeat(blockSize));
  }
  return line.join('');
}

function alternatingLine(keys: string[], length = 32): string {
  let out = '';
  for (let i = 0; i < length; i++) out += keys[i % keys.length];
  return out;
}

function mixedLine(keys: string[], length: number, seed: number): string {
  const rand = prng(seed);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += keys[Math.floor(rand() * keys.length)];
  }
  return out;
}

function drillLines(keys: string[], baseSeed: number): string[] {
  return [
    blockLine(keys, 4, keys.length * 2),
    blockLine(keys, 2, keys.length * 4),
    alternatingLine(keys, 32),
    mixedLine(keys, 32, baseSeed + 1),
    mixedLine(keys, 32, baseSeed + 7),
    mixedLine(keys, 40, baseSeed + 13),
  ];
}

/* -------------------------------------------------------------------------
 * Curated short Thai word lists per zone (common vocabulary using only
 * the keys available by the time that zone is reached).
 *
 * These are short common words — not copied from any single source.
 * ----------------------------------------------------------------------- */

// Home row: ฟ ห ก ด เ ้ ่ า ส ว + space
const WORDS_HOME = ['กา', 'หา', 'ดาว', 'สาว', 'ว่า', 'หาด', 'สด', 'หก', 'กว่า', 'ก่า', 'ห่าง', 'ส่ง'];

// Home + Bottom: + ผ ป แ อ ท ม ใ ฝ ื ิ
const WORDS_HOME_BOTTOM = [
  'อก', 'อาหาร', 'แม่', 'แก่', 'ป่า', 'ปาก', 'ผม', 'ผสม', 'มา', 'มาก', 'ใส่', 'ใหม่',
  'ทา', 'ทอด', 'ห่ม', 'แดด', 'สม', 'อด', 'หมอ', 'ดอก', 'ออก', 'หมวก', 'แปด', 'แผ่',
];

// After top row added: + ๆ ไ ำ พ ั ี ร น ย ะ
const WORDS_TOP = [
  'ไป', 'ไหน', 'นี้', 'นั้น', 'น้ำ', 'นาย', 'รัก', 'รอ', 'หรือ', 'ไร', 'ยิน', 'ยาม',
  'พ่อ', 'พาย', 'สาม', 'สามี', 'ดี', 'ดี่', 'สี', 'มี', 'ทำ', 'รำ', 'หนี', 'หนู',
];

// After ง บ ล added
const WORDS_NGBL = [
  'ลง', 'ลูก', 'ลิง', 'บาง', 'บ้าน', 'บน', 'งาน', 'งู', 'เงิน', 'เลย', 'กลาง', 'หลัง',
  'หลาย', 'เล่น', 'แบ่ง', 'สบาย', 'เพียง', 'ลืม',
];

// After far-upper corners learned (ถ ภ ค ต จ ข ช + ุ ู ึ)
const WORDS_CORNERS = [
  'คน', 'ควาย', 'คืน', 'จาน', 'ข้าว', 'ไข่', 'ถาม', 'ภาพ', 'ตา', 'เต่า', 'ช้าง', 'ชอบ',
  'รู้จัก', 'ตึก', 'ขึ้น', 'คืน', 'ค่ะ', 'จริง',
];

/* -------------------------------------------------------------------------
 * Actual lessons
 * ----------------------------------------------------------------------- */

export const LESSONS: Lesson[] = [
  // ========== SOLO DRILLS (one zone each) ==========
  {
    id: 1,
    title: 'Left Home · drill',
    kind: 'drill',
    zones: ['lh'],
    primaryZones: ['lh'],
    instruction: 'Place left hand in home position: pinky on ฟ, ring on ห, middle on ก, index on ด. Keep fingers curved; use the lightest touch.',
    lines: drillLines(['ฟ', 'ห', 'ก', 'ด'], 101),
  },
  {
    id: 2,
    title: 'Right Home · drill',
    kind: 'drill',
    zones: ['rh'],
    primaryZones: ['rh'],
    instruction: 'Right-hand home position: index on ่, middle on า, ring on ส, pinky on ว. When typing a consonant with a tone mark, type the consonant first, then the mark.',
    lines: [
      'สสสสววววสสววสสววสวสวสวสว',
      'ส่ส่ส่ส่ว่ว่ว่ว่สาสาวาวาสาสาวาวา',
      'ส่าส่าว่าว่าส่าส่าว่าว่า',
      blockLine(['ว', 'ส', 'า', '่'], 3, 8),
      mixedLine(['ว', 'ส', 'า'], 32, 202),
      mixedLine(['ส่', 'ว่', 'สา', 'วา'], 16, 212),
    ],
  },
  {
    id: 3,
    title: 'Home row · both hands',
    kind: 'drill',
    zones: ['lh', 'rh'],
    primaryZones: ['lh', 'rh'],
    instruction: 'Both hands in home position. Aim for steady rhythm — don\'t rush the easy bits.',
    lines: drillLines(['ฟ', 'ห', 'ก', 'ด', '่', 'า', 'ส', 'ว'], 303),
  },
  {
    id: 4,
    title: 'Home row · Thai words',
    kind: 'words',
    zones: ['lh', 'rh'],
    primaryZones: ['lh', 'rh'],
    instruction: 'Real Thai words built from home-row keys only. Press space with either thumb between words.',
    lines: chunkWords(WORDS_HOME, 8, 4),
  },
  {
    id: 5,
    title: 'Bottom Left · drill',
    kind: 'drill',
    zones: ['bl'],
    primaryZones: ['bl'],
    instruction: 'Left hand on the bottom row: pinky ผ, ring ป, middle แ, index อ. Return to home position after each keystroke.',
    lines: drillLines(['ผ', 'ป', 'แ', 'อ'], 505),
  },
  {
    id: 6,
    title: 'Bottom Right · drill',
    kind: 'drill',
    zones: ['br'],
    primaryZones: ['br'],
    instruction: 'Right hand on the bottom row: index ท, middle ม, ring ใ, pinky ฝ.',
    lines: drillLines(['ท', 'ม', 'ใ', 'ฝ'], 606),
  },
  {
    id: 7,
    title: 'Bottom row · both hands',
    kind: 'drill',
    zones: ['bl', 'br'],
    primaryZones: ['bl', 'br'],
    instruction: 'Both hands on the bottom row. Don\'t look at the keyboard — feel for the bumps on ด and ่.',
    lines: drillLines(['ผ', 'ป', 'แ', 'อ', 'ท', 'ม', 'ใ', 'ฝ'], 707),
  },
  {
    id: 8,
    title: 'Home + bottom · Thai words',
    kind: 'words',
    zones: ['lh', 'rh', 'bl', 'br'],
    primaryZones: ['bl', 'br'],
    instruction: 'Thai words that use home + bottom rows together.',
    lines: chunkWords(WORDS_HOME_BOTTOM, 7, 4),
  },
  {
    id: 9,
    title: 'Top Left · drill',
    kind: 'drill',
    zones: ['tl'],
    primaryZones: ['tl'],
    instruction: 'Left hand on the top row: pinky ๆ, ring ไ, middle ำ, index พ. Index-stretch → ะ.',
    lines: drillLines(['ๆ', 'ไ', 'ำ', 'พ'], 909),
  },
  {
    id: 10,
    title: 'Top Right · drill',
    kind: 'drill',
    zones: ['tr'],
    primaryZones: ['tr'],
    instruction: 'Right hand on the top row: index ี, middle ร, ring น, pinky ย. Short /a/ vowel ั is above the ี position.',
    lines: drillLines(['ี', 'ร', 'น', 'ย'], 1010),
  },
  {
    id: 11,
    title: 'Top row · both hands',
    kind: 'drill',
    zones: ['tl', 'tr'],
    primaryZones: ['tl', 'tr'],
    instruction: 'Both hands on the top row.',
    lines: drillLines(['ๆ', 'ไ', 'ำ', 'พ', 'ี', 'ร', 'น', 'ย'], 1111),
  },
  {
    id: 12,
    title: 'Top row · Thai words',
    kind: 'words',
    zones: ['tl', 'tr', 'lh', 'rh', 'bl', 'br'],
    primaryZones: ['tl', 'tr'],
    instruction: 'Thai words using all three rows learned so far.',
    lines: chunkWords(WORDS_TOP, 6, 4),
  },
  {
    id: 16,
    title: 'Right pinky stretch · drill',
    kind: 'drill',
    zones: ['frc'],
    primaryZones: ['frc'],
    instruction: 'Right pinky stretches further right: ง on the home row, then up and further for บ and ล.',
    lines: drillLines(['ง', 'บ', 'ล'], 1616),
  },
  {
    id: 17,
    title: 'ง บ ล · Thai words',
    kind: 'words',
    zones: ['frc', 'lh', 'rh', 'bl', 'br', 'tl', 'tr'],
    primaryZones: ['frc'],
    instruction: 'Thai words containing ง บ or ล.',
    lines: chunkWords(WORDS_NGBL, 6, 3),
  },
  {
    id: 18,
    title: 'Far Left Upper · drill',
    kind: 'drill',
    zones: ['flu'],
    primaryZones: ['flu'],
    instruction: 'Left hand jumps to the top row: middle on ภ, index on ถ. Index-stretch-right gives ุ; Shift + ุ gives ู.',
    lines: [
      blockLine(['ภ', 'ถ'], 4, 8),
      'ภุภุภุภุถุถุถุถุภูภูภูภูถูถูถูถูภุภุถุถุภูภูถูถู',
      'ถภุถุภูภถุถูภุภูถุถภุถูภภุถูภุถูถภถุ',
      mixedLine(['ภ', 'ถ', 'ภุ', 'ถุ', 'ภู', 'ถู'], 20, 1801),
      mixedLine(['ภ', 'ถ', 'ุ', 'ู'], 36, 1807),
    ],
  },
  {
    id: 19,
    title: 'Far Right Upper · drill',
    kind: 'drill',
    zones: ['fru'],
    primaryZones: ['fru'],
    instruction: 'Right hand on the top-right keys: index ค, middle ต, ring จ, pinky ข. A buffalo, a turtle, a plate with an egg.',
    lines: drillLines(['ค', 'ต', 'จ', 'ข'], 1919),
  },
  {
    id: 20,
    title: 'Far Right Upper · extensions ึ ช',
    kind: 'drill',
    zones: ['fru'],
    primaryZones: ['fru'],
    instruction: 'Add the index-stretch-left ึ and pinky-stretch-right ช.',
    lines: [
      blockLine(['ค', 'ต', 'จ', 'ข', 'ช'], 4, 10),
      'คึตึจึขึชึคึตึจึขึชึ',
      mixedLine(['ค', 'ต', 'จ', 'ข', 'ช', 'ึ'], 30, 2001),
      mixedLine(['คึ', 'ตึ', 'จึ', 'ขึ', 'ชึ'], 18, 2011),
    ],
  },
  {
    id: 21,
    title: 'Corners · Thai words',
    kind: 'words',
    zones: ['flu', 'fru', 'lh', 'rh', 'bl', 'br', 'tl', 'tr'],
    primaryZones: ['flu', 'fru'],
    instruction: 'Thai words that use the Far Left + Far Right upper corners along with everything prior.',
    lines: chunkWords(WORDS_CORNERS, 6, 3),
  },

  // ========== FULL-KEYBOARD / REVIEW LESSONS ==========
  {
    id: 42,
    title: 'Alphabet review · ก → ว',
    kind: 'review',
    zones: ['flu', 'fru', 'tl', 'tr', 'lh', 'rh', 'frc', 'bl', 'br'],
    instruction: 'Type the first 30 consonants in alphabet order. Don\'t look at the keyboard.',
    lines: Array(5).fill('กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลว'),
  },
  {
    id: 46,
    title: 'Full alphabet · ก → ฮ',
    kind: 'review',
    zones: ['flu', 'fru', 'tl', 'tr', 'lh', 'rh', 'frc', 'bl', 'br'],
    instruction: 'The full 42-consonant alphabet, twice.',
    lines: [
      'กขคฆงจฉชซฌญฎฏฐฑฒณ',
      'ดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ',
      'กขคฆงจฉชซฌญฎฏฐฑฒณ',
      'ดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ',
    ],
  },
  {
    id: 49,
    title: 'Common Thai words · part 1',
    kind: 'words',
    zones: ['flu', 'fru', 'tl', 'tr', 'lh', 'rh', 'frc', 'bl', 'br'],
    instruction: 'Everyday Thai words — nouns, verbs, and helpers you\'ll see constantly.',
    lines: [
      'นี้ บ้าน หนึ่ง ทาง หมาย กิน ตก เป็น',
      'คิด เข้า คน ปลา รถ ผู้ วัน โรง เงิน',
      'เล่น ร้อน เห็น ช่าง พูด เอา ขึ้น ไฟ ให้',
      'มี ข้าว เสียง เวลา ขี้ งาน ว่า ดิน ไป',
      'ของ ท้อง ออก ถึง การ รับ แม่ ดี',
      'ราช เดิน ต่อ ตาม มือ ทำ นัก มา เครื่อง',
    ],
  },
  {
    id: 50,
    title: 'Common Thai words · part 2',
    kind: 'words',
    zones: ['flu', 'fru', 'tl', 'tr', 'lh', 'rh', 'frc', 'bl', 'br'],
    instruction: 'Second half of the top-100 common words.',
    lines: [
      'เรือ หา เจ้า ได้ ดู ความ ลูก กลาง',
      'หู ไม่ คำ ผ้า ตัว ใจ กัน ยา',
      'ใน น่า ลง แต่ น้ำ หน้า ติด นาย',
      'พระ ปาก เสีย ตา จะ อยู่ หัว กับ',
      'รู้ ที่ โรค ไว้ แล้ว เมือง อย่าง ข้อ',
      'ฟ้า พล ต้น หลัง ชาติ ไม้ สี มัน',
    ],
  },
  {
    id: 51,
    title: 'Pangrams · set 1',
    kind: 'pangram',
    zones: ['flu', 'fru', 'tl', 'tr', 'lh', 'rh', 'frc', 'bl', 'br'],
    instruction: 'Each sentence uses every letter of the Thai alphabet. Go slow — these have many Shift-layer jumps.',
    lines: [
      'เป็นมนุษย์สุดประเสริฐเลิศคุณค่า กว่าบรรดาฝูงสัตว์เดรัจฉาน',
      'จงฝ่าฟันพัฒนาวิชาการ อย่าล้างผลาญฤๅเข่นฆ่าบีฑาใคร',
      'ไม่ถือโทษโกรธแช่งซัดฮึดฮัดด่า หัดอภัยเหมือนกีฬาอัชฌาสัย',
      'ปฏิบัติประพฤติกฎกำหนดใจ พูดจาให้จ๊ะๆ จ๋าๆ น่าฟังเอยฯ',
    ],
  },
  {
    id: 52,
    title: 'Pangrams · set 2',
    kind: 'pangram',
    zones: ['flu', 'fru', 'tl', 'tr', 'lh', 'rh', 'frc', 'bl', 'br'],
    instruction: 'Two more pangrams — the graduation drills.',
    lines: [
      'ธรรมคุณหนุนความดีฑีฆรัตน์ สรรพสัตว์วัฏวจรถอนวิถี',
      'อริยสัจตรัสสังโยคโลกโมฬี ดังกุมภีร์ผลาญชิวหาบีฑาทนต์',
      'โลกอุดรวจรวัฏตรัสวิสุทธิ์ ธรรมวุฒิภจรไปในเวหน',
      'ฟังเทเวศน์วิเศษก้องฉันต้องมนต์ ฝ่าผจญอินทขิลวิญญูฌาณ',
    ],
  },
];

function chunkWords(words: string[], perLine: number, lines: number): string[] {
  const out: string[] = [];
  for (let li = 0; li < lines; li++) {
    const start = li * perLine;
    const slice = words.slice(start, start + perLine);
    out.push(slice.length ? slice.join(' ') : words.slice(0, perLine).join(' '));
  }
  return out;
}

export function lessonsForZone(z: ZoneId): Lesson[] {
  // Only lessons whose *primary* focus is this zone (solo drill, row-partner
  // drill, row-words). Cumulative lessons that use this zone incidentally
  // should not clutter the overlay's tab list.
  return LESSONS.filter(l => l.primaryZones?.includes(z));
}

export function endgameLessons(): Lesson[] {
  return LESSONS.filter(l => [42, 46, 49, 50, 51, 52].includes(l.id));
}

export function lessonById(id: number): Lesson | undefined {
  return LESSONS.find(l => l.id === id);
}
