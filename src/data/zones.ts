export type ZoneId =
  | 'flu'  // Far Left Upper
  | 'fru'  // Far Right Upper
  | 'tl'   // Top Left
  | 'tr'   // Top Right
  | 'lh'   // Left Home
  | 'rh'   // Right Home
  | 'frc'  // Far Right Clutter
  | 'bl'   // Bottom Left
  | 'br';  // Bottom Right

export type FingerRole =
  | 'pinky' | 'ring' | 'middle' | 'index'
  | 'index-left' | 'index-right'
  | 'pinky-right' | 'pinky-down';

export interface ZoneRow {
  finger: string;
  key: string;           // display char (e.g., 'ภ', '้', 'ุ')
  combining?: boolean;   // render circle placeholder before?
  mnemonic: string;      // React-friendly markdown-ish — we'll render as plain text with simple bold
}

export interface ShiftRow {
  base: string;      // base key (unshifted)
  shifted: string;   // punctuation or letter that shifts produce
  mnemonic: string;
  isPunct?: boolean; // if shifted is punctuation (rendered in <kbd>)
}

export interface Zone {
  id: ZoneId;
  title: string;
  arrow: string;       // emoji(s) indicating direction, e.g. '⬆️⬅️'
  color: string;       // hex used for border/title
  bg: string;          // hex light background
  headBg: string;      // hex table header bg
  headBorder: string;  // hex table header border
  // Primary row's character list for the card title (rendered right of title)
  titleKeys: string[];
  rows: ZoneRow[];
  shiftRows?: ShiftRow[];
  // Narrative line shown above table (optional, only for zones that mechanics)
  intro?: string;
  practice: { drills: number[]; words: number[]; extras?: { lesson: number; note: string }[] };
}

const trainerUrl = 'https://thai-notes.com/typing/typingtrainer.html';
export const TRAINER_URL = trainerUrl;

export const ZONES: Zone[] = [
  {
    id: 'flu',
    title: 'Far Left Upper',
    arrow: '⬆️⬅️',
    color: '#d97706',
    bg: '#fffbeb',
    headBg: '#fef3c7',
    headBorder: '#fde68a',
    titleKeys: ['ภ', 'ถ', '◌ุ'],
    rows: [
      { finger: 'middle', key: 'ภ', mnemonic: 'a **junk** (สำเ**ภ**า) — loop opens *left* → sits on the *left*' },
      { finger: 'index', key: 'ถ', mnemonic: 'a **sack** (**ถ**ุง) — loop opens *right* → sits on the *right*' },
      { finger: 'index →', key: '◌ุ', combining: true, mnemonic: 'short /u/ vowel below' },
    ],
    shiftRows: [
      { base: '◌ุ', shifted: '◌ู', mnemonic: 'long /uː/ — two dots = "longer"' },
    ],
    practice: { drills: [18], words: [21] },
  },
  {
    id: 'fru',
    title: 'Far Right Upper',
    arrow: '⬆️➡️',
    color: '#2563eb',
    bg: '#eff6ff',
    headBg: '#dbeafe',
    headBorder: '#bfdbfe',
    titleKeys: ['◌ึ', 'ค', 'ต', 'จ', 'ข', 'ช'],
    rows: [
      { finger: 'index ←', key: '◌ึ', combining: true, mnemonic: 'short /ɯ/ vowel above' },
      { finger: 'index', key: 'ค', mnemonic: 'a **buffalo** (**ค**วาย)…' },
      { finger: 'middle', key: 'ต', mnemonic: '…and a **turtle** (เ**ต**่า)…' },
      { finger: 'ring', key: 'จ', mnemonic: '…share a **plate** (**จ**าน)…' },
      { finger: 'pinky', key: 'ข', mnemonic: '…with an **egg** (ไ**ข**่)…' },
      { finger: 'pinky →', key: 'ช', mnemonic: '…watched by an **elephant** (**ช**้าง)' },
    ],
    practice: { drills: [19], words: [21], extras: [{ lesson: 20, note: 'adds ◌ึ ช' }] },
  },
  {
    id: 'tl',
    title: 'Top Left',
    arrow: '↖️',
    color: '#dc2626',
    bg: '#fef2f2',
    headBg: '#fee2e2',
    headBorder: '#fecaca',
    titleKeys: ['ๆ', 'ไ', '◌ำ', 'พ', 'ะ'],
    rows: [
      { finger: 'pinky', key: 'ๆ', mnemonic: '**Quickly** (เร็ว **ๆ**)…' },
      { finger: 'ring', key: 'ไ', mnemonic: '…**go** (**ไ**ป)…' },
      { finger: 'middle', key: '◌ำ', combining: true, mnemonic: '…and **dance** (ร**ำ**)…' },
      { finger: 'index', key: 'พ', mnemonic: '…next to the **tray** (**พ**าน)' },
      { finger: 'index →', key: 'ะ', mnemonic: 'short /a/ vowel after' },
    ],
    shiftRows: [
      { base: '◌ำ', shifted: 'ฎ', mnemonic: 'a **headdress** (ช**ฎ**า) worn when dancing รำ' },
      { base: 'พ', shifted: 'ฑ', mnemonic: '**Montho** (ม**ณโฑ**) on her พ่อ\'s shoulders' },
      { base: 'ะ', shifted: 'ธ', mnemonic: 'Ploy Chermarn (เ**ฌ**อมาลย์) holds a **flag** (**ธ**ง)' },
    ],
    practice: { drills: [9], words: [12], extras: [{ lesson: 27, note: 'adds ธ' }] },
  },
  {
    id: 'tr',
    title: 'Top Right',
    arrow: '↗️',
    color: '#16a34a',
    bg: '#f0fdf4',
    headBg: '#dcfce7',
    headBorder: '#bbf7d0',
    titleKeys: ['◌ั', '◌ี', 'ร', 'น', 'ย'],
    rows: [
      { finger: 'index ←', key: '◌ั', combining: true, mnemonic: 'short /a/ vowel above' },
      { finger: 'index', key: '◌ี', combining: true, mnemonic: '**Again** (อ**ี**กครั้งหนึ่ง)…' },
      { finger: 'middle', key: 'ร', mnemonic: '…a **boat** (เ**ร**ือ)…' },
      { finger: 'ring', key: 'น', mnemonic: '…with a **mouse** (ห**น**ู) in it…' },
      { finger: 'pinky', key: 'ย', mnemonic: '…chased by an **ogre** (**ย**ักษ์)' },
    ],
    shiftRows: [
      { base: '◌ั', shifted: '◌ํ', mnemonic: 'นิคหิต (nikkhahit) — nasal /am/ marker' },
      { base: '◌ี', shifted: '◌๊', mnemonic: 'ไม้ตรี (tone-mark 3)' },
      { base: 'ร', shifted: 'ณ', mnemonic: '**novice** (เ**ณ**ร) studying at โ**ร**งเรียน (school)' },
      { base: 'น', shifted: 'ฯ', mnemonic: 'paiyan-noi — "et cetera" abbreviation mark' },
      { base: 'ย', shifted: 'ญ', mnemonic: 'same start sound — **ogre** & ห**ญ**ิง (woman) cohabit' },
    ],
    practice: { drills: [10], words: [12] },
  },
  {
    id: 'lh',
    title: 'Left Home',
    arrow: '⬅️',
    color: '#7c3aed',
    bg: '#f5f3ff',
    headBg: '#ede9fe',
    headBorder: '#ddd6fe',
    titleKeys: ['ฟ', 'ห', 'ก', 'ด', 'เ'],
    rows: [
      { finger: 'pinky', key: 'ฟ', mnemonic: 'a **tooth** (**ฟ**ัน)…' },
      { finger: 'ring', key: 'ห', mnemonic: '…sits on a **chest** (**ห**ีบ)…' },
      { finger: 'middle', key: 'ก', mnemonic: '…with a **chicken** (ไ**ก**่) next to it…' },
      { finger: 'index', key: 'ด', mnemonic: '…and a **child** (เ**ด**็ก) looking on' },
      { finger: 'index →', key: 'เ', mnemonic: 'pre-posed vowel /eː/' },
    ],
    shiftRows: [
      { base: 'ฟ', shifted: 'ฤ', mnemonic: 'a **tooth** pulled out, leaving the odd vowel ฤ (/rɯ/)' },
      { base: 'ห', shifted: 'ฆ', mnemonic: 'a **bell** (ระ**ฆ**ัง) on the chest' },
      { base: 'ก', shifted: 'ฏ', mnemonic: 'chasing the **chicken** with a ป**ฏ**ัก spear' },
      { base: 'ด', shifted: 'โ', mnemonic: 'the **child** yells "D\'oh!" Homer-style' },
      { base: 'เ', shifted: 'ฌ', mnemonic: 'a **tree** (เ**ฌ**อ) — same spot as pre-posed เ' },
    ],
    practice: { drills: [1], words: [4], extras: [{ lesson: 22, note: 'โ' }, { lesson: 27, note: 'ฌ' }] },
  },
  {
    id: 'rh',
    title: 'Right Home',
    arrow: '➡️',
    color: '#ea580c',
    bg: '#fff7ed',
    headBg: '#ffedd5',
    headBorder: '#fed7aa',
    titleKeys: ['◌้', '◌่', 'า', 'ส', 'ว'],
    rows: [
      { finger: 'index ←', key: '◌้', combining: true, mnemonic: 'ไม้โท (tone-mark 2)' },
      { finger: 'index', key: '◌่', combining: true, mnemonic: 'index **draws a vertical tick** — ไม้เอก (tone-mark 1)' },
      { finger: 'middle', key: 'า', mnemonic: 'you **open your mouth to say "hahh"**' },
      { finger: 'ring', key: 'ส', mnemonic: 'your ring finger doesn\'t have a ring on it — it\'s got a **tiny tiger** (เ**ส**ือ)' },
      { finger: 'pinky', key: 'ว', mnemonic: '…so the **ring** (แห**ว**น) got bumped to your pinky' },
    ],
    shiftRows: [
      { base: '◌้', shifted: '◌็', mnemonic: 'ไม้ไต่คู้ (mai-taikhu) — shortens a vowel' },
      { base: '◌่', shifted: '◌๋', mnemonic: 'ไม้จัตวา (tone-mark 4)' },
      { base: 'ว', shifted: 'ซ', mnemonic: 'a **chain** (โ**ซ**่) — looks like ว with a zigzag' },
      { base: 'ส', shifted: 'ศ', mnemonic: '**ศาลา** (saalaa) sheltering the tiger' },
      { base: 'า', shifted: 'ษ', mnemonic: '**hermit** (ฤๅ**ษ**ี) beside the saalaa' },
    ],
    practice: { drills: [2], words: [4], extras: [{ lesson: 13, note: 'adds ้' }, { lesson: 43, note: 'ศ ษ' }] },
  },
  {
    id: 'frc',
    title: 'Far Right Clutter',
    arrow: '➡️➡️',
    color: '#db2777',
    bg: '#fdf2f8',
    headBg: '#fce7f3',
    headBorder: '#fbcfe8',
    titleKeys: ['ง', 'บ', 'ล'],
    intro: 'All three reached by stretching the right pinky further right (ง on home row), then further up (บ ล on row above).',
    rows: [
      { finger: 'home row →', key: 'ง', mnemonic: 'a **snake** (**ง**ู) on the ground (home row)' },
      { finger: 'top row → (near)', key: 'บ', mnemonic: 'a **leafy** (ใ**บ**) tree…' },
      { finger: 'top row → (far)', key: 'ล', mnemonic: '…with a **monkey** (**ล**ิง) climbing highest' },
    ],
    shiftRows: [
      { base: 'ง', shifted: '.', isPunct: true, mnemonic: 'full stop / period' },
      { base: 'บ', shifted: 'ฐ', mnemonic: 'a pedestal / base (**ฐ**าน) under the tree' },
      { base: 'ล', shifted: ',', isPunct: true, mnemonic: 'comma' },
    ],
    practice: { drills: [16], words: [17] },
  },
  {
    id: 'bl',
    title: 'Bottom Left',
    arrow: '↙️',
    color: '#0891b2',
    bg: '#ecfeff',
    headBg: '#cffafe',
    headBorder: '#a5f3fc',
    titleKeys: ['ผ', 'ป', 'แ', 'อ', '◌ิ'],
    rows: [
      { finger: 'pinky', key: 'ผ', mnemonic: 'a **bee** (**ผ**ึ้ง)…' },
      { finger: 'ring', key: 'ป', mnemonic: '…and a **fish** (**ป**ลา)…' },
      { finger: 'middle', key: 'แ', mnemonic: '…both **peek** (**แ**อบดู)…' },
      { finger: 'index', key: 'อ', mnemonic: '…at a **bowl** (**อ**่าง)' },
      { finger: 'index →', key: '◌ิ', combining: true, mnemonic: 'short /i/ vowel above' },
    ],
    shiftRows: [
      { base: 'ผ', shifted: '(', isPunct: true, mnemonic: 'open paren — leftmost key' },
      { base: 'ป', shifted: ')', isPunct: true, mnemonic: 'close paren — right next to open' },
      { base: 'แ', shifted: 'ฉ', mnemonic: 'small **cymbals** (**ฉ**ิ่ง) — shape is แ + extra stroke' },
      { base: 'อ', shifted: 'ฮ', mnemonic: 'an **owl** (นก**ฮ**ูก) — same key as อ, similar shape' },
    ],
    practice: { drills: [5], words: [8], extras: [{ lesson: 44, note: 'ฮ' }] },
  },
  {
    id: 'br',
    title: 'Bottom Right',
    arrow: '↘️',
    color: '#9333ea',
    bg: '#faf5ff',
    headBg: '#f3e8ff',
    headBorder: '#e9d5ff',
    titleKeys: ['◌ื', 'ท', 'ม', 'ใ', 'ฝ'],
    rows: [
      { finger: 'index ←', key: '◌ื', combining: true, mnemonic: 'long /ɯː/ vowel above' },
      { finger: 'index', key: 'ท', mnemonic: 'the **soldier** (**ท**หาร)…' },
      { finger: 'middle', key: 'ม', mnemonic: '…on a **horse** (**ม**้า)…' },
      { finger: 'ring', key: 'ใ', mnemonic: '…**uses** (**ใ**ช้)…' },
      { finger: 'pinky', key: 'ฝ', mnemonic: '…a **lid** (**ฝ**า) as a shield' },
    ],
    shiftRows: [
      { base: 'ท', shifted: '?', isPunct: true, mnemonic: 'the **soldier** has a question' },
      { base: 'ม', shifted: 'ฒ', mnemonic: 'หมู ("Moo", nickname) grows into an **old man** (ผู้เ**ฒ่**า)' },
      { base: 'ใ', shifted: 'ฬ', mnemonic: 'a **mute** (**ใ**บ้) flies a **kite** (จุ**ฬ**า)' },
      { base: 'ฝ', shifted: 'ฦ', mnemonic: 'so rare it\'s virtually obsolete — safe to ignore' },
    ],
    practice: { drills: [6], words: [8], extras: [{ lesson: 44, note: 'ฬ' }] },
  },
];

export function zoneById(id: ZoneId): Zone {
  const z = ZONES.find(z => z.id === id);
  if (!z) throw new Error(`Unknown zone: ${id}`);
  return z;
}
