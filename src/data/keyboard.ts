import type { ZoneId } from './zones';

// One physical key on the Kedmanee layout.
// `main` = unshifted character rendered at bottom
// `shift` = shifted character rendered at top
// `zone` = which finger-zone this key belongs to (for coloring / highlighting)
// `combining` = the unshifted char is a combining mark (render a placeholder circle before it)
// `combiningShift` = same for the shifted char
export interface KbKey {
  main: string;
  shift: string;
  zone: ZoneId | null; // null = uncolored (number row ends / obsolete ฃ ฅ)
  combining?: boolean;
  combiningShift?: boolean;
  // Small font for specific characters (punctuation on number row)
  small?: boolean;
}

export interface KbRow {
  offset: number; // px from left
  keys: KbKey[];
}

export const KEY_WIDTH = 50;
export const KEY_GAP = 4;

export const ROWS: KbRow[] = [
  {
    offset: 0,
    keys: [
      { main: '_', shift: '%', zone: null, small: true },
      { main: 'ๅ', shift: '+', zone: null, small: true },
      { main: '/', shift: '๑', zone: null, small: true },
      { main: '-', shift: '๒', zone: null, small: true },
      { main: 'ภ', shift: '๓', zone: 'flu' },
      { main: 'ถ', shift: '๔', zone: 'flu' },
      { main: 'ุ', shift: 'ู', zone: 'flu', combining: true, combiningShift: true },
      { main: 'ึ', shift: '฿', zone: 'fru', combining: true },
      { main: 'ค', shift: '๕', zone: 'fru' },
      { main: 'ต', shift: '๖', zone: 'fru' },
      { main: 'จ', shift: '๗', zone: 'fru' },
      { main: 'ข', shift: '๘', zone: 'fru' },
      { main: 'ช', shift: '๙', zone: 'fru' },
    ],
  },
  {
    offset: 81,
    keys: [
      { main: 'ๆ', shift: '๐', zone: 'tl' },
      { main: 'ไ', shift: '"', zone: 'tl' },
      { main: 'ำ', shift: 'ฎ', zone: 'tl' },
      { main: 'พ', shift: 'ฑ', zone: 'tl' },
      { main: 'ะ', shift: 'ธ', zone: 'tl' },
      { main: 'ั', shift: 'ํ', zone: 'tr', combining: true, combiningShift: true },
      { main: 'ี', shift: '๊', zone: 'tr', combining: true, combiningShift: true },
      { main: 'ร', shift: 'ณ', zone: 'tr' },
      { main: 'น', shift: 'ฯ', zone: 'tr' },
      { main: 'ย', shift: 'ญ', zone: 'tr' },
      { main: 'บ', shift: 'ฐ', zone: 'frc' },
      { main: 'ล', shift: ',', zone: 'frc' },
      { main: 'ฃ', shift: 'ฅ', zone: null },
    ],
  },
  {
    offset: 108,
    keys: [
      { main: 'ฟ', shift: 'ฤ', zone: 'lh' },
      { main: 'ห', shift: 'ฆ', zone: 'lh' },
      { main: 'ก', shift: 'ฏ', zone: 'lh' },
      { main: 'ด', shift: 'โ', zone: 'lh' },
      { main: 'เ', shift: 'ฌ', zone: 'lh' },
      { main: '้', shift: '็', zone: 'rh', combining: true, combiningShift: true },
      { main: '่', shift: '๋', zone: 'rh', combining: true, combiningShift: true },
      { main: 'า', shift: 'ษ', zone: 'rh' },
      { main: 'ส', shift: 'ศ', zone: 'rh' },
      { main: 'ว', shift: 'ซ', zone: 'rh' },
      { main: 'ง', shift: '.', zone: 'frc' },
    ],
  },
  {
    offset: 135,
    keys: [
      { main: 'ผ', shift: '(', zone: 'bl' },
      { main: 'ป', shift: ')', zone: 'bl' },
      { main: 'แ', shift: 'ฉ', zone: 'bl' },
      { main: 'อ', shift: 'ฮ', zone: 'bl' },
      { main: 'ิ', shift: 'ฺ', zone: 'bl', combining: true, combiningShift: true },
      { main: 'ื', shift: '์', zone: 'br', combining: true, combiningShift: true },
      { main: 'ท', shift: '?', zone: 'br' },
      { main: 'ม', shift: 'ฒ', zone: 'br' },
      { main: 'ใ', shift: 'ฬ', zone: 'br' },
      { main: 'ฝ', shift: 'ฦ', zone: 'br' },
    ],
  },
];

export const ZONE_COLORS: Record<ZoneId, { bg: string; border: string }> = {
  flu: { bg: '#fef3c7', border: '#d97706' },
  fru: { bg: '#dbeafe', border: '#2563eb' },
  tl:  { bg: '#fee2e2', border: '#dc2626' },
  tr:  { bg: '#dcfce7', border: '#16a34a' },
  lh:  { bg: '#ede9fe', border: '#7c3aed' },
  rh:  { bg: '#ffedd5', border: '#ea580c' },
  frc: { bg: '#fce7f3', border: '#db2777' },
  bl:  { bg: '#cffafe', border: '#0891b2' },
  br:  { bg: '#f3e8ff', border: '#9333ea' },
};
