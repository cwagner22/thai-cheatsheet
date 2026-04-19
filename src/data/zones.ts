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
  /** Concise English label for row-layout cards (e.g., "buffalo"). */
  shortEng?: string;
  /** Thai anchor word for row-layout cards (e.g., "ควาย"). */
  shortThai?: string;
  /** Whether this key sits under the index finger's resting position. */
  indexHome?: boolean;
}

export interface ShiftRow {
  base: string;      // base key (unshifted)
  shifted: string;   // punctuation or letter that shifts produce
  mnemonic: string;
  isPunct?: boolean; // if shifted is punctuation (rendered in <kbd>)
  /** Short English phrase for row-layout shift cells (supports **bold**). */
  shortEng?: string;
  /** Thai anchor word for row-layout shift cells. */
  shortThai?: string;
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
  /**
   * Layout style for the card body.
   * - 'table' (default): Finger | Key | Mnemonic rows in a table.
   * - 'row': horizontal sequence of keys with short English + Thai anchors;
   *   only the index position is labelled.
   */
  layout?: 'table' | 'row';
  /**
   * One-line narrative that ties all the keys together. Shown under the
   * key row in the row layout. Supports **bold** / *italic* markers.
   */
  story?: string;
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
    titleKeys: [],
    layout: 'row',
    rows: [
      { finger: 'middle', key: 'ภ', mnemonic: 'Asian sailboat', shortEng: '**Asian sailboat** · loop ←', shortThai: 'สำเภา' },
      { finger: 'index', key: 'ถ', indexHome: true, mnemonic: 'bag', shortEng: 'a **bag** · loop →', shortThai: 'ถุง' },
      { finger: 'index →', key: '◌ุ', combining: true, mnemonic: 'short /u/ below', shortEng: 'short /u/ below', shortThai: '' },
    ],
    shiftRows: [
      { base: '◌ุ', shifted: '◌ู', mnemonic: 'long /uː/', shortEng: 'long /uː/', shortThai: '' },
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
    titleKeys: [],
    layout: 'row',
    rows: [
      { finger: 'index ←', key: '◌ึ', combining: true, mnemonic: 'short /ɯ/', shortEng: 'short /ɯ/', shortThai: '' },
      { finger: 'index', key: 'ค', indexHome: true, mnemonic: 'buffalo', shortEng: 'A **buffalo**', shortThai: 'ควาย' },
      { finger: 'middle', key: 'ต', mnemonic: 'turtle', shortEng: 'and **turtle**', shortThai: 'เต่า' },
      { finger: 'ring', key: 'จ', mnemonic: 'plate', shortEng: 'share a **plate**', shortThai: 'จาน' },
      { finger: 'pinky', key: 'ข', mnemonic: 'egg', shortEng: 'with an **egg**', shortThai: 'ไข่' },
      { finger: 'pinky →', key: 'ช', mnemonic: 'elephant', shortEng: 'watched by an **elephant**', shortThai: 'ช้าง' },
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
    titleKeys: [],
    layout: 'row',
    rows: [
      { finger: 'pinky', key: 'ๆ', mnemonic: 'Quickly', shortEng: '**Quickly**', shortThai: 'เร็ว ๆ' },
      { finger: 'ring', key: 'ไ', mnemonic: 'go', shortEng: '**go**', shortThai: 'ไป' },
      { finger: 'middle', key: '◌ำ', combining: true, mnemonic: 'dance', shortEng: 'and **dance**', shortThai: 'รำ' },
      { finger: 'index', key: 'พ', indexHome: true, mnemonic: 'tray', shortEng: 'next to the **tray**', shortThai: 'พาน' },
      { finger: 'index →', key: 'ะ', mnemonic: 'short /a/', shortEng: 'short /a/ after', shortThai: '' },
    ],
    shiftRows: [
      { base: '◌ำ', shifted: 'ฎ', mnemonic: 'headdress', shortEng: 'with a **headdress**', shortThai: 'ชฎา' },
      { base: 'พ', shifted: 'ฑ', mnemonic: 'Montho', shortEng: '**Montho** (queen) dancing', shortThai: 'มณโฑ' },
      { base: 'ะ', shifted: 'ธ', mnemonic: 'flag', shortEng: 'with a **flag**', shortThai: 'ธง' },
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
    titleKeys: [],
    layout: 'row',
    rows: [
      { finger: 'index ←', key: '◌ั', combining: true, mnemonic: 'short /a/', shortEng: 'short /a/ above', shortThai: '' },
      { finger: 'index', key: '◌ี', combining: true, indexHome: true, mnemonic: 'again', shortEng: '**Again**', shortThai: 'อีก' },
      { finger: 'middle', key: 'ร', mnemonic: 'boat', shortEng: 'a **boat**', shortThai: 'เรือ' },
      { finger: 'ring', key: 'น', mnemonic: 'mouse', shortEng: 'with a **mouse**', shortThai: 'หนู' },
      { finger: 'pinky', key: 'ย', mnemonic: 'ogre', shortEng: 'chased by an **ogre**', shortThai: 'ยักษ์' },
    ],
    shiftRows: [
      { base: '◌ั', shifted: '◌ํ', mnemonic: 'nasal /am/', shortEng: 'nasal /am/', shortThai: 'นิคหิต' },
      { base: '◌ี', shifted: '◌๊', mnemonic: 'tone 3', shortEng: 'tone 3', shortThai: 'ไม้ตรี' },
      { base: 'ร', shifted: 'ณ', mnemonic: 'novice', shortEng: 'a **novice**', shortThai: 'เณร' },
      { base: 'น', shifted: 'ฯ', mnemonic: 'et cetera', shortEng: '**et cetera** mark', shortThai: '' },
      { base: 'ย', shifted: 'ญ', mnemonic: 'woman', shortEng: '**woman** (ogre)', shortThai: 'หญิง' },
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
    titleKeys: [],
    layout: 'row',
    rows: [
      { finger: 'pinky', key: 'ฟ', mnemonic: 'tooth', shortEng: 'a **tooth**', shortThai: 'ฟัน' },
      { finger: 'ring', key: 'ห', mnemonic: 'chest', shortEng: 'on a **chest**', shortThai: 'หีบ' },
      { finger: 'middle', key: 'ก', mnemonic: 'chicken', shortEng: 'with a **chicken**', shortThai: 'ไก่' },
      { finger: 'index', key: 'ด', indexHome: true, mnemonic: 'child', shortEng: 'and a **child**', shortThai: 'เด็ก' },
      { finger: 'index →', key: 'เ', mnemonic: 'pre-vowel', shortEng: 'pre-vowel /eː/', shortThai: '' },
    ],
    shiftRows: [
      { base: 'ฟ', shifted: 'ฤ', mnemonic: 'odd vowel /rɯ/', shortEng: 'odd vowel /rɯ/', shortThai: '' },
      { base: 'ห', shifted: 'ฆ', mnemonic: 'bell', shortEng: 'a **bell**', shortThai: 'ระฆัง' },
      { base: 'ก', shifted: 'ฏ', mnemonic: 'spear', shortEng: 'a **spear**', shortThai: 'ปฏัก' },
      { base: 'ด', shifted: 'โ', mnemonic: 'pre-vowel', shortEng: 'pre-vowel /oː/', shortThai: '' },
      { base: 'เ', shifted: 'ฌ', mnemonic: 'tree', shortEng: 'a **tree**', shortThai: 'เฌอ' },
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
    titleKeys: [],
    layout: 'row',
    rows: [
      { finger: 'index ←', key: '◌้', combining: true, mnemonic: 'tone 2', shortEng: 'tone 2', shortThai: 'ไม้โท' },
      { finger: 'index', key: '◌่', combining: true, indexHome: true, mnemonic: 'tone 1', shortEng: 'tone 1 — vertical tick', shortThai: 'ไม้เอก' },
      { finger: 'middle', key: 'า', mnemonic: 'hahh', shortEng: 'mouth says **hahh**', shortThai: '/aː/' },
      { finger: 'ring', key: 'ส', mnemonic: 'tiger', shortEng: '**tiger** on ring finger', shortThai: 'เสือ' },
      { finger: 'pinky', key: 'ว', mnemonic: 'ring', shortEng: '**ring** bumped to pinky', shortThai: 'แหวน' },
    ],
    shiftRows: [
      { base: '◌้', shifted: '◌็', mnemonic: 'shortens vowel', shortEng: 'shortens vowel', shortThai: 'ไม้ไต่คู้' },
      { base: '◌่', shifted: '◌๋', mnemonic: 'tone 4', shortEng: 'tone 4', shortThai: 'ไม้จัตวา' },
      { base: 'ว', shifted: 'ซ', mnemonic: 'chain', shortEng: 'with a **chain**', shortThai: 'โซ่' },
      { base: 'ส', shifted: 'ศ', mnemonic: 'pavilion', shortEng: 'at a **pavilion**', shortThai: 'ศาลา' },
      { base: 'า', shifted: 'ษ', mnemonic: 'hermit', shortEng: 'a **hermit**', shortThai: 'ฤๅษี' },
    ],
    practice: { drills: [2], words: [4], extras: [{ lesson: 13, note: 'adds ้' }, { lesson: 43, note: 'ศ ษ' }] },
  },
  {
    id: 'bl',
    title: 'Bottom Left',
    arrow: '↙️',
    color: '#0891b2',
    bg: '#ecfeff',
    headBg: '#cffafe',
    headBorder: '#a5f3fc',
    titleKeys: [],
    layout: 'row',
    rows: [
      { finger: 'pinky', key: 'ผ', mnemonic: 'bee', shortEng: 'A **bee**', shortThai: 'ผึ้ง' },
      { finger: 'ring', key: 'ป', mnemonic: 'fish', shortEng: 'and a **fish**', shortThai: 'ปลา' },
      { finger: 'middle', key: 'แ', mnemonic: 'peek', shortEng: 'both **peek**', shortThai: 'แอบดู' },
      { finger: 'index', key: 'อ', indexHome: true, mnemonic: 'bowl', shortEng: 'at a **bowl**', shortThai: 'อ่าง' },
      { finger: 'index →', key: '◌ิ', combining: true, mnemonic: 'short /i/', shortEng: 'short /i/ above', shortThai: '' },
    ],
    shiftRows: [
      { base: 'ผ', shifted: '(', isPunct: true, mnemonic: 'open paren', shortEng: 'open paren', shortThai: '' },
      { base: 'ป', shifted: ')', isPunct: true, mnemonic: 'close paren', shortEng: 'close paren', shortThai: '' },
      { base: 'แ', shifted: 'ฉ', mnemonic: 'cymbals', shortEng: 'small **cymbals**', shortThai: 'ฉิ่ง' },
      { base: 'อ', shifted: 'ฮ', mnemonic: 'owl', shortEng: 'an **owl**', shortThai: 'นกฮูก' },
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
    titleKeys: [],
    layout: 'row',
    rows: [
      { finger: 'index ←', key: '◌ื', combining: true, mnemonic: 'long /ɯː/', shortEng: 'long /ɯː/ above', shortThai: '' },
      { finger: 'index', key: 'ท', indexHome: true, mnemonic: 'soldier', shortEng: 'A **soldier**', shortThai: 'ทหาร' },
      { finger: 'middle', key: 'ม', mnemonic: 'horse', shortEng: 'on a **horse**', shortThai: 'ม้า' },
      { finger: 'ring', key: 'ใ', mnemonic: 'uses', shortEng: '**uses**', shortThai: 'ใช้' },
      { finger: 'pinky', key: 'ฝ', mnemonic: 'lid', shortEng: 'a **lid** as shield', shortThai: 'ฝา' },
    ],
    shiftRows: [
      { base: 'ท', shifted: '?', isPunct: true, mnemonic: 'question', shortEng: '**?**', shortThai: '' },
      { base: 'ม', shifted: 'ฒ', mnemonic: 'old man', shortEng: 'the **old man**', shortThai: 'ผู้เฒ่า' },
      { base: 'ใ', shifted: 'ฬ', mnemonic: 'kite', shortEng: 'with his **kite**', shortThai: 'จุฬา' },
      { base: 'ฝ', shifted: 'ฦ', mnemonic: 'obsolete', shortEng: 'unused', shortThai: '' },
    ],
    practice: { drills: [6], words: [8], extras: [{ lesson: 44, note: 'ฬ' }] },
  },
  {
    id: 'frc',
    title: 'Far Right Clutter',
    arrow: '➡️➡️',
    color: '#db2777',
    bg: '#fdf2f8',
    headBg: '#fce7f3',
    headBorder: '#fbcfe8',
    titleKeys: [],
    layout: 'row',
    intro: 'All three reached by stretching the right pinky further right (ง on home row), then further up (บ ล on row above).',
    rows: [
      { finger: 'home row →', key: 'ง', mnemonic: 'snake', shortEng: 'A **snake**', shortThai: 'งู' },
      { finger: 'top row → (near)', key: 'บ', mnemonic: 'leafy tree', shortEng: 'a **leafy** tree', shortThai: 'ใบ' },
      { finger: 'top row → (far)', key: 'ล', mnemonic: 'monkey', shortEng: 'with a **monkey**', shortThai: 'ลิง' },
    ],
    shiftRows: [
      { base: 'ง', shifted: '.', isPunct: true, mnemonic: 'period', shortEng: 'period', shortThai: '' },
      { base: 'บ', shifted: 'ฐ', mnemonic: 'pedestal', shortEng: 'a **pedestal**', shortThai: 'ฐาน' },
      { base: 'ล', shifted: ',', isPunct: true, mnemonic: 'comma', shortEng: 'comma', shortThai: '' },
    ],
    practice: { drills: [16], words: [17] },
  },
];

export function zoneById(id: ZoneId): Zone {
  const z = ZONES.find(z => z.id === id);
  if (!z) throw new Error(`Unknown zone: ${id}`);
  return z;
}
