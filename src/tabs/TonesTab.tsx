import { useState, useMemo, type ReactNode } from 'react';
import { THAI_TONES, NORTHERN_TONES, NORTHERN_TONE_BOX, TONE_COLOR, type ToneBoxOutcome, TONE_FEEL } from '../data/tones';
import { CONSONANTS, byClass, groupByInitial, TONE_PAIRS, type ConsonantClass, type Consonant, type TonePair } from '../data/consonants';
import { ToneCard } from '../components/ToneCard';
import { analyzeSyllable, type ToneMark } from '../lib/analyzeSyllable';
import { standardCellMatch, northernCellMatch, type CellMatch, type NorthernCellMatch } from '../lib/toneLookup';
import { speakThai } from '../lib/speak';
import { PlayButton } from '../components/PlayButton';
import styles from './TonesTab.module.css';

type Lang = 'thai' | 'northern';

/** Merged-cell ids per table, for the "split/merge all" button — see
 *  splitCells in TonesTab. */
const THAI_SPLIT_IDS = ['mid-high-dead', 'mid-high-maitho'] as const;
const NORTHERN_SPLIT_IDS = ['mid-high-deadshort', 'mid-high-deadlong', 'mid-high-maitho'] as const;

type ToneName = 'Mid' | 'Low' | 'Falling' | 'High' | 'Rising';

/** Look up a THAI_TONES entry by its English name — for the Standard Thai table below. */
const thaiTone = (name: ToneName) => THAI_TONES.find(t => t.nameEn === name)!;

/** "คุณปู่ไม่รู้หรือ" ("Doesn't grandpa know?") — one word per tone, in
 *  canonical order (Mid · Low · Falling · High · Rising), for the practice
 *  sentence below. */
const PRACTICE_SENTENCE: { word: string; ipa: string; gloss: string; tone: ToneName }[] = [
  { word: 'คุณ', ipa: 'kʰun', gloss: 'you / title', tone: 'Mid' },
  { word: 'ปู่', ipa: 'pùː', gloss: 'grandpa', tone: 'Low' },
  { word: 'ไม่', ipa: 'mâj', gloss: 'not', tone: 'Falling' },
  { word: 'รู้', ipa: 'rúː', gloss: 'know', tone: 'High' },
  { word: 'หรือ', ipa: 'rɯ̌ː', gloss: 'or?', tone: 'Rising' },
];

/** A vocal mnemonic per tone — an emotional reading that naturally produces
 *  the right pitch contour, rather than a rule to calculate it from. `—`
 *  marks a cell with nothing more specific to add than the sentence itself. */
const TONE_CUE: Record<ToneName, { cue: string; comment: string }> = {
  Mid: { cue: '—', comment: 'Slight, natural — with a pinch at the end.' },
  Low: { cue: 'Huuh — praying', comment: '—' },
  Falling: { cue: 'Heyy — shocked', comment: 'Falls more than you might expect.' },
  High: { cue: 'Whaat — annoyed', comment: 'Opposite pitch from Falling — practice the two back-to-back, out of comfort.' },
  Rising: { cue: 'Well — asking a question / surprised', comment: '—' },
};

/** Five compound words combining two of the syllables above — real
 *  connected speech built from this drill's own vocabulary. */
const HIGH_COMPOUND_WORDS: { word: string; ipa: string; gloss: string }[] = [
  { word: 'ผู้ให้', ipa: 'pʰûː.hâj', gloss: 'giver, donor' },
  { word: 'เฝ้าไข้', ipa: 'fâw.kʰâj', gloss: 'to nurse a sick person' },
  { word: 'เข้าถ้ำ', ipa: 'kʰâw.tʰâm', gloss: 'to enter a cave' },
  { word: 'สู้เขา', ipa: 'sûː.kʰǎw', gloss: 'fight them! / hang in there!' },
  { word: 'ผ่าเข่า', ipa: 'pʰàː.kʰàw', gloss: 'knee surgery' },
];

/** Three compound words combining two of the syllables above. */
const LOW_COMPOUND_WORDS: { word: string; ipa: string; gloss: string }[] = [
  { word: 'ซื้อที่', ipa: 'sɯ́ː.tʰîː', gloss: 'to buy land/a location' },
  { word: 'รู้ไว้', ipa: 'rúː.wáj', gloss: 'know this, keep in mind' },
  { word: 'ล้ำค่า', ipa: 'lám.kʰâː', gloss: 'priceless, highly valuable' },
];

/** Look up a NORTHERN_TONES entry by its Gedney box code — for the tone box table below. */
const northernTone = (name: string) => NORTHERN_TONES.find(t => t.name === name)!;

/** Tone-mark glyph by tone name. Mid has no mark — the cell stays empty. */
const TONE_MARK: Record<ToneName, string> = {
  Mid: '',
  Low: '่',
  Falling: '้',
  High: '๊',
  Rising: '๋',
};

/** Class header colors — matches .cellMid/.cellHigh/.cellLow in the CSS
 *  module and the class-header colors used elsewhere in the app. */
const CLASS_COLOR: Record<ConsonantClass, string> = {
  mid: '#2563eb',
  high: '#16a34a',
  low: '#dc2626',
};

const CLASS_LABEL: Record<ConsonantClass, string> = {
  mid: 'Mid class',
  high: 'High class',
  low: 'Low class',
};

/** One practice video per class, for the matrix's class tabs. */
const CLASS_VIDEO: Record<ConsonantClass, { href: string; label: string }> = {
  mid: { href: 'https://www.youtube.com/watch?v=LpU5Pngmq9c', label: 'ฝึกผันเสียงอักษรกลาง ครูนกเล็ก — Mid class tone drill' },
  high: { href: 'https://www.youtube.com/watch?v=fniDdFIKMvA', label: 'ฝึกผันเสียงอักษรสูง ครูนกเล็ก — High class tone drill' },
  low: { href: 'https://www.youtube.com/watch?v=t4iClxXLuoU', label: 'ฝึกผันเสียงวรรณยุกต์ไทย อักษรต่ำ ครูนกเล็ก — Low class tone drill' },
};

/** Six mid-class compound words, both syllables mid-class initials. */
const MID_COMPOUND_WORDS: { word: string; ipa: string; gloss: string }[] = [
  { word: 'จ่าดำ', ipa: 'tɕàː.dam', gloss: 'a name, "Sgt. Dam"' },
  { word: 'จำได้', ipa: 'tɕam.dâj', gloss: 'to remember' },
  { word: 'ไก่ป่า', ipa: 'kàj.pàː', gloss: 'wild chicken' },
  { word: 'ปู่ตา', ipa: 'pùː.taː', gloss: 'grandfathers; guardian spirits' },
  { word: 'ปาเป้า', ipa: 'paː.pâw', gloss: 'to play darts' },
  { word: 'เก่าแก่', ipa: 'kàw.kɛ̀ː', gloss: 'old, time-honored' },
];

type CompoundWord = { word: string; ipa: string; gloss: string };

const CLASS_COMPOUND_WORDS: Record<ConsonantClass, CompoundWord[]> = {
  mid: MID_COMPOUND_WORDS,
  high: HIGH_COMPOUND_WORDS,
  low: LOW_COMPOUND_WORDS,
};

/** Everyday two-syllable words that open with each letter, shown under that
 *  letter's matrix so the single syllables above it land in something a
 *  learner would actually say. Spelling and meaning are dictionary-checked
 *  and the IPA follows the pronunciation given there; a letter with no
 *  entry falls back to its class's compounds. Rare and obsolete letters
 *  have none — they barely start words at all. */
const LETTER_COMPOUNDS: Record<string, CompoundWord[]> = {
  // mid
  'ก': [
    { word: 'กาแฟ', ipa: 'kaː.fɛː', gloss: 'coffee' },
    { word: 'กางเกง', ipa: 'kaːŋ.keːŋ', gloss: 'trousers' },
    { word: 'การบ้าน', ipa: 'kaːn.bâːn', gloss: 'homework' },
  ],
  'จ': [{ word: 'จริงใจ', ipa: 'tɕiŋ.tɕaj', gloss: 'sincere, straight with someone' }],
  'ด': [
    { word: 'ดีใจ', ipa: 'diː.tɕaj', gloss: 'glad, pleased' },
    { word: 'ดูแล', ipa: 'duː.lɛː', gloss: 'to look after, take care of' },
    { word: 'ดอกไม้', ipa: 'dɔ̀ːk.máːj', gloss: 'flower' },
  ],
  'ต': [
    { word: 'ตาบอด', ipa: 'taː.bɔ̀ːt', gloss: 'blind' },
    { word: 'ตื่นเต้น', ipa: 'tɯ̀ːn.tên', gloss: 'excited' },
  ],
  'บ': [
    { word: 'บางที', ipa: 'baːŋ.tʰiː', gloss: 'sometimes; maybe' },
    { word: 'บ้านเมือง', ipa: 'bâːn.mɯaŋ', gloss: 'the country, the nation' },
  ],
  'ป': [{ word: 'ป่าไม้', ipa: 'pàː.máːj', gloss: 'forest, woodland' }],
  'อ': [
    { word: 'อาหาร', ipa: 'ʔaː.hǎːn', gloss: 'food' },
    { word: 'อากาศ', ipa: 'ʔaː.kàːt', gloss: 'air; weather' },
  ],
  // high
  'ข': [{ word: 'ขอบคุณ', ipa: 'kʰɔ̀ːp.kʰun', gloss: 'thank you' }],
  'ฉ': [
    { word: 'ฉลาด', ipa: 'tɕʰà.làːt', gloss: 'clever, sharp' },
    { word: 'ฉีดยา', ipa: 'tɕʰìːt.jaː', gloss: 'to give an injection' },
    { word: 'ฉับพลัน', ipa: 'tɕʰàp.pʰlan', gloss: 'sudden, at once' },
  ],
  'ถ': [
    { word: 'ถี่ถ้วน', ipa: 'tʰìː.tʰûan', gloss: 'thorough, meticulous' },
    { word: 'ถือสา', ipa: 'tʰɯ̌ː.sǎː', gloss: 'to take offence at (usu. negated)' },
  ],
  'ผ': [
    { word: 'ผู้ชาย', ipa: 'pʰûː.tɕʰaːj', gloss: 'man' },
    { word: 'ผีเสื้อ', ipa: 'pʰǐː.sɯ̂a', gloss: 'butterfly' },
  ],
  'ฝ': [{ word: 'ฝีมือ', ipa: 'fǐː.mɯː', gloss: 'skill, craftsmanship' }],
  'ส': [{ word: 'สีสัน', ipa: 'sǐː.sǎn', gloss: 'colours; vividness' }],
  'ห': [
    { word: 'หัวใจ', ipa: 'hǔa.tɕaj', gloss: 'heart' },
    { word: 'ห้องน้ำ', ipa: 'hɔ̂ŋ.náːm', gloss: 'bathroom' },
  ],
  // low
  'ค': [
    { word: 'ค้าขาย', ipa: 'kʰáː.kʰǎːj', gloss: 'to trade, do business' },
    { word: 'คุณค่า', ipa: 'kʰun.kʰâː', gloss: 'value, worth' },
    { word: 'ความรัก', ipa: 'kʰwaːm.rák', gloss: 'love' },
  ],
  'ช': [
    { word: 'ชื่อเสียง', ipa: 'tɕʰɯ̂ː.sǐaŋ', gloss: 'fame, reputation' },
    { word: 'ชาเย็น', ipa: 'tɕʰaː.jen', gloss: 'iced tea' },
    { word: 'ช้างเผือก', ipa: 'tɕʰáːŋ.pʰɯ̀ak', gloss: 'white elephant' },
  ],
  'ซ': [
    { word: 'ซื้อขาย', ipa: 'sɯ́ː.kʰǎːj', gloss: 'to buy and sell' },
    { word: 'ซ่อมแซม', ipa: 'sɔ̂m.sɛːm', gloss: 'to repair, mend' },
  ],
  'ท': [
    { word: 'ท่าทาง', ipa: 'tʰâː.tʰaːŋ', gloss: 'manner, bearing' },
    { word: 'ทำงาน', ipa: 'tʰam.ŋaːn', gloss: 'to work' },
    { word: 'ทั่วไป', ipa: 'tʰûa.paj', gloss: 'general, ordinary' },
  ],
  'ธ': [
    { word: 'ธุระ', ipa: 'tʰú.ráʔ', gloss: 'an errand, business to attend to' },
    { word: 'ธรรมดา', ipa: 'tʰam.má.daː', gloss: 'ordinary, the usual' },
  ],
  'น': [
    { word: 'น่ารัก', ipa: 'nâː.rák', gloss: 'cute, lovable' },
    { word: 'น้ำแข็ง', ipa: 'nám.kʰɛ̌ŋ', gloss: 'ice' },
  ],
  'พ': [
    { word: 'พ่อแม่', ipa: 'pʰɔ̂ː.mɛ̂ː', gloss: 'parents' },
    { word: 'พี่น้อง', ipa: 'pʰîː.nɔ́ːŋ', gloss: 'siblings' },
  ],
  'ฟ': [
    { word: 'ฟ้าผ่า', ipa: 'fáː.pʰàː', gloss: 'a lightning strike' },
    { word: 'ฟันปลอม', ipa: 'fan.plɔːm', gloss: 'false teeth' },
    { word: 'ฟุตบอล', ipa: 'fút.bɔn', gloss: 'football' },
  ],
  'ม': [
    { word: 'มือถือ', ipa: 'mɯː.tʰɯ̌ː', gloss: 'mobile phone' },
    { word: 'ม้าลาย', ipa: 'máː.laːj', gloss: 'zebra' },
    { word: 'มากมาย', ipa: 'mâːk.maːj', gloss: 'plentiful, no end of' },
  ],
  'ย': [
    { word: 'ยิ้มแย้ม', ipa: 'jím.jɛ́ːm', gloss: 'beaming, all smiles' },
    { word: 'ยากจน', ipa: 'jâːk.tɕon', gloss: 'poor, destitute' },
  ],
  'ร': [
    { word: 'ร้านค้า', ipa: 'ráːn.kʰáː', gloss: 'a shop' },
    { word: 'เรื่องราว', ipa: 'rɯ̂aŋ.raːw', gloss: 'a story, the whole account' },
    { word: 'รู้สึก', ipa: 'rúː.sɯ̀k', gloss: 'to feel' },
  ],
  'ล': [
    { word: 'ลูกหลาน', ipa: 'lûːk.lǎːn', gloss: 'children and grandchildren, descendants' },
    { word: 'ลำบาก', ipa: 'lam.bàːk', gloss: 'hard, a struggle' },
  ],
  'ว': [
    { word: 'วันนี้', ipa: 'wan.níː', gloss: 'today' },
    { word: 'ไว้ใจ', ipa: 'wáj.tɕaj', gloss: 'to trust' },
    { word: 'วุ่นวาย', ipa: 'wûn.waːj', gloss: 'chaotic, in a fuss' },
  ],
  'ฮ': [
    { word: 'ฮ่องเต้', ipa: 'hɔ̂ŋ.têː', gloss: 'Chinese emperor' },
    { word: 'ฮึดฮัด', ipa: 'hɯ́t.hát', gloss: 'to huff in annoyance' },
  ],
};

/** The compound-word table: word, IPA, meaning. Sits under a matrix rather
 *  than beside the chant, so the syllables above it are the ones it's
 *  built from. */
function CompoundWords({ words, subtitle }: { words: CompoundWord[]; subtitle: string }) {
  if (words.length === 0) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ marginBottom: 6, fontSize: '0.85rem' }}>
        <strong>Compound words</strong>{' '}
        <span style={{ fontWeight: 400, color: '#666', fontSize: '0.82rem' }}>— {subtitle}</span>
      </p>
      <table className={styles.cueTable}>
        <tbody>
          {words.map(({ word, ipa, gloss }) => (
            <tr key={word}>
              <td
                className={styles.cueThaiWord}
                style={{ width: '1%', whiteSpace: 'nowrap', cursor: 'pointer' }}
                onClick={() => speakThai(word)}
              >
                {word}
              </td>
              <td style={{ width: '1%', whiteSpace: 'nowrap', color: '#888', fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" }}>
                /{ipa}/
              </td>
              <td style={{ color: '#888', fontSize: '0.85rem' }}>{gloss}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Bookmark-style link to a practice video, accent-colored per class. */
function ClassVideoLink({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={styles.videoBookmark}
      style={{ borderLeftColor: color }}
    >
      <span className={styles.videoIcon} style={{ background: color }} aria-hidden>▶</span>
      <span>
        <strong>Video:</strong> {label}
      </span>
      <span className={styles.videoArrow} aria-hidden>↗</span>
    </a>
  );
}

/** Which tone marks are orthographically legal on each consonant class — ๊
 *  and ๋ are only ever written over mid-class letters (see the note below
 *  the unified tone table below). Drives the per-class length of the
 *  chant: 5 steps for mid, 3 for high/low. */
const LEGAL_MARKS: Record<ConsonantClass, (ToneMark | null)[]> = {
  mid: [null, 'ek', 'tho', 'tri', 'chattawa'],
  high: [null, 'ek', 'tho'],
  low: [null, 'ek', 'tho'],
};

/** One step of the tone-mark chant: the mark applied and the tone it
 *  produces on an open long-vowel syllable. isLive stays true throughout —
 *  the chant cycles marks, not live/dead register, which the unified table
 *  above already covers on its own axis. Reuses standardCellMatch so the
 *  outcome can never drift from that table. */
function chantSequence(klass: ConsonantClass): { mark: ToneMark | null; tone: ToneName }[] {
  return LEGAL_MARKS[klass].map(mark => ({
    mark,
    tone: standardCellMatch({ initial: '', klass, mark, isLive: true, vowelLength: 'long', hasFinal: false }).tone,
  }));
}

/** Render the tone mark in tone color. Used in the unified tone table.
 *  Mid (empty mark) renders nothing — the cell stays blank.
 *  `color` overrides the default tone color (used in header, where dark
 *  background needs white). Same CSS class as the cells so header & cells
 *  land at the same horizontal X within the column. */
function ToneGlyph({ name, color, fontSize }: { name: ToneName; color?: string; fontSize?: string }) {
  const mark = TONE_MARK[name];
  if (!mark) return null;
  return (
    <span
      className={`${styles.toneGlyph} ${styles.toneGlyphCombining}`}
      style={{ color: color ?? TONE_COLOR[name], fontSize }}
      title={`${name} tone`}
    >
      {mark}
    </span>
  );
}

/** Renders a bare combining tone mark (่ ้ ๊ ๋) with a real base to attach to,
 *  via the same CSS trick as ToneGlyph. A combining mark with no preceding
 *  glyph in its own text run has nothing to attach to, so the browser draws
 *  a dotted-circle placeholder before it — this avoids that.
 *  `fontSize` defaults to the class's own (large, card-sized) glyph; pass a
 *  smaller value when the mark sits inline next to ordinary-sized text, or
 *  it'll dwarf that text — the padding/offset that centers it over its
 *  assumed base are both em-relative, so they scale down with it. */
function MarkGlyph({ mark, color, title, fontSize }: { mark: string; color?: string; title?: string; fontSize?: string }) {
  return (
    <span className={`${styles.toneGlyph} ${styles.toneGlyphCombining}`} style={{ color, fontSize }} title={title}>
      {mark}
    </span>
  );
}

/** Renders one tone-box cell as the full contour card(s) for its outcome(s),
 *  embedded directly rather than behind a click. The one cell where Chiang
 *  Mai's mid-class letters split by which letters they are carries two,
 *  each labeled with the letters it covers so it's unambiguous without
 *  cross-referencing the prose above the table. */
/** `matched` highlights the cell's one outcome; cells that hold two (only
 *  the Mid row's split Normal cell) instead use `highlightCode` to pick
 *  which of the two, since "the whole cell matched" isn't precise enough
 *  there. */
function ToneBoxCell({
  outcomes, matched, highlightCode,
}: { outcomes: ToneBoxOutcome[]; matched?: boolean; highlightCode?: string | null }) {
  return (
    <div className={styles.boxCellStack}>
      {outcomes.map(({ code, letters, example, exampleGloss }) => (
        <div key={code}>
          {letters && (
            <div style={{ fontFamily: 'var(--thai-font)', fontSize: '0.75rem', color: '#888', marginBottom: 2, paddingLeft: 8 }}>
              {letters}
            </div>
          )}
          <ToneCard
            tone={northernTone(code)} example={example} exampleGloss={exampleGloss}
            highlighted={outcomes.length > 1 ? code === highlightCode : !!matched}
            compact
          />
        </div>
      ))}
    </div>
  );
}

/** Icons for SplitAllButton below — a merged single card vs. separate ones. */
function SplitIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2" width="5.5" height="12" rx="1.2" />
      <rect x="9" y="2" width="5.5" height="12" rx="1.2" />
    </svg>
  );
}

function MergeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
      <line x1="8" y1="2" x2="8" y2="14" strokeDasharray="1.6,1.6" />
    </svg>
  );
}

/** One button controlling every merged cell in a table at once — cells that
 *  fold several class/environment combinations sharing one tone into a
 *  single spanning card. Splitting shows each combination as its own cell
 *  with its own example; merging folds them back into the default view. */
function SplitAllButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button type="button" className={styles.splitAllBtn} onClick={onClick}>
      {expanded ? <MergeIcon /> : <SplitIcon />}
      {expanded ? 'Merge cells' : 'Split cells'}
    </button>
  );
}

/** A <td> that spans multiple rows/columns while merged, or stands alone
 *  once split apart — used for every cell SplitAllButton controls. */
function SplitTd({
  rowSpan, colSpan, children,
}: {
  rowSpan?: number; colSpan?: number; children: ReactNode;
}) {
  return (
    <td rowSpan={rowSpan} colSpan={colSpan} style={{ verticalAlign: 'middle' }}>
      {children}
    </td>
  );
}

/** Type-and-match box: analyzes whichever word is selected (the last one
 *  typed, by default) and reports which card of the table above it lands
 *  on. Once there's more than one word typed, the text plays back next to
 *  the input with every word clickable — clicking one selects it in place
 *  of "the last word", so you can go back and inspect an earlier word
 *  without retyping it; with just one word there's nothing to disambiguate,
 *  so it stays hidden. `note` carries whatever the caller's lookup
 *  (standard or Northern) produced when there's nothing to highlight. */
function TryIt({
  input, onInput, selectedIndex, onSelectWord, note,
}: {
  input: string;
  onInput: (v: string) => void;
  selectedIndex: number;
  onSelectWord: (i: number) => void;
  note?: string | null;
}) {
  const wordMatches = [...input.matchAll(/\S+/g)];
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ marginBottom: 6 }}><strong>Try it</strong></p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={input}
          onChange={e => onInput(e.target.value)}
          placeholder="Type a Thai syllable, e.g. ตา"
          style={{
            fontFamily: 'var(--thai-font)', fontSize: '1.1rem', padding: '8px 10px',
            width: '100%', maxWidth: 280, border: '1px solid #ccc', borderRadius: 6,
          }}
        />
        {wordMatches.length > 1 && (
          <div style={{ fontFamily: 'var(--thai-font)', fontSize: '1.1rem' }}>
            {wordMatches.map((m, i) => (
              <span
                key={i}
                onClick={() => onSelectWord(i)}
                title="Click to analyze this word"
                style={{
                  cursor: 'pointer',
                  marginRight: 6,
                  paddingBottom: 1,
                  fontWeight: i === selectedIndex ? 700 : 400,
                  color: i === selectedIndex ? '#b45309' : undefined,
                  borderBottom: i === selectedIndex ? '3px solid #f59e0b' : '1px solid #ccc',
                }}
              >
                {m[0]}
              </span>
            ))}
          </div>
        )}
      </div>
      {note && (
        <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: 6 }}>{note}</p>
      )}
      <p style={{ fontSize: '0.78rem', color: '#888', marginTop: 6 }}>
        One syllable at a time — the last one, if you type more than one (click another
        to inspect it instead). For a multi-syllable word, try splitting it into
        syllables separated by spaces.
      </p>
    </div>
  );
}


/** Generates the classic Darun Suksa tone-mark chant (ปา ป่า ป้า ป๊า ป๋า and
 *  the like) for any chosen consonant, in place of the two hand-picked words
 *  in the drill box above. Fixed on the open syllable /aː/ so only the mark
 *  varies from card to card. */
/** The "5 tones in 1 sentence" practice drill: a real sentence where each
 *  word happens to carry a different tone in canonical order, paired with a
 *  vocal mnemonic per tone (TONE_CUE) instead of the class/mark rule. */
function PracticeSentence() {
  return (
    <div className={styles.practiceBlock}>
      <p style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Practice sentence</strong>
        <PlayButton words={PRACTICE_SENTENCE.map(w => w.word)} title="Play the whole sentence" />
      </p>
      <p className={styles.practiceSentence}>
        {PRACTICE_SENTENCE.map(({ word, ipa, gloss, tone }, i) => (
          <span
            key={i}
            className={`${styles.practiceWord} ${styles.label}`}
            style={{ color: TONE_COLOR[tone], cursor: 'pointer' }}
            data-tooltip={`/${ipa}/ · ${gloss} · ${tone} tone`}
            onClick={() => speakThai(word)}
          >
            {word}
          </span>
        ))}
      </p>
      <p style={{ fontSize: '0.85rem', color: '#666', margin: '14px 0 4px' }}>
        <em>"Doesn't grandpa know?"</em>
      </p>

      <table className={styles.cueTable}>
        <thead>
          <tr><th>Tone</th><th>Vocal cue</th><th>Comment</th><th>Thai word</th></tr>
        </thead>
        <tbody>
          {PRACTICE_SENTENCE.map(({ word, ipa, gloss, tone }) => {
            const { cue, comment } = TONE_CUE[tone];
            return (
              <tr key={tone}>
                <td className={styles.cueTone} style={{ color: TONE_COLOR[tone] }}>{tone}</td>
                <td>{cue}</td>
                <td style={{ color: '#666' }}>
                  {comment !== '—' && <div>{comment}</div>}
                  <div className="tone-feel">{TONE_FEEL[tone]}</div>
                </td>
                <td
                  className={`${styles.cueThaiWord} ${styles.label}`}
                  style={{ cursor: 'pointer' }}
                  data-tooltip={`/${ipa}/`}
                  onClick={() => speakThai(word)}
                >
                  {word}{' '}
                  <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'Inter, sans-serif' }}>
                    · {gloss}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ClassVideoLink
        href="https://www.youtube.com/watch?v=-qUQirAAN6Q"
        label="5 Thai Tones in 1 Sentence — Let's Learn Thai with Kanitsa"
        color="#b45309"
      />
    </div>
  );
}

/** The glyph actually written for a given mark. ToneCard's own corner badge
 *  always shows the *resulting* tone's own defining mark — fine for
 *  mid/high class, where that's also the mark actually applied, but wrong
 *  for low class, which remaps ่/้ to a different tone than their own name
 *  (mai ek produces Falling there, not Low). Low class's chant cards show
 *  this above the card instead, alongside the unmodified badge. */
const CHANT_MARK_GLYPH: Record<'ek' | 'tho' | 'tri' | 'chattawa', string> = {
  ek: '่', tho: '้', tri: '๊', chattawa: '๋',
};

/** Combining tone diacritic per CLAUDE.md's IPA convention, placed on a
 *  syllable's vowel to spell its pronunciation. */
const TONE_DIACRITIC: Record<ToneName, string> = {
  Mid: '', Low: '̀', Falling: '̂', High: '́', Rising: '̌',
};

/** Each basic vowel's form, split into three parts around the consonant
 *  slot so a tone mark can be inserted in the one correct spot: `pre`
 *  (a leading vowel like เ/แ/โ, written before the consonant), `attach`
 *  (a combining vowel sign — ี/ื/ู and the like — glued directly to the
 *  consonant, zero advance width, stacking above/below it), and `trail`
 *  (a baseline character like า/อ that follows on the line). The mark
 *  goes after `attach` but before `trail`: real Thai encodes กี่ as
 *  ก+ี+่ (vowel sign, then mark, nothing trailing) and ป้า as ป+้+า
 *  (mark, then the baseline า) — the two don't take the mark in the same
 *  relative position, so a single "append after the consonant" or
 *  "append at the end" rule gets one of them wrong. ipa core/example/
 *  gloss mirror the Basic Vowels section in src/data/vowels.ts. */
const VOWEL_ROWS: { pre: string; attach: string; trail: string; core: string; example: string; gloss: string }[] = [
  { pre: '', attach: '', trail: 'า', core: 'aː', example: 'กา', gloss: 'crow' },
  { pre: '', attach: 'ี', trail: '', core: 'iː', example: 'กี่', gloss: 'how many' },
  { pre: '', attach: 'ื', trail: 'อ', core: 'ɯː', example: 'มือ', gloss: 'hand' },
  { pre: '', attach: 'ู', trail: '', core: 'uː', example: 'กู', gloss: 'I (rude)' },
  { pre: 'เ', attach: '', trail: '', core: 'eː', example: 'เก', gloss: 'old' },
  { pre: 'แ', attach: '', trail: '', core: 'ɛː', example: 'แก', gloss: 'you' },
  { pre: 'โ', attach: '', trail: '', core: 'oː', example: 'โต', gloss: 'grow' },
  { pre: '', attach: '', trail: 'อ', core: 'ɔː', example: 'กอ', gloss: 'clump (of plants)' },
  { pre: 'เ', attach: '', trail: 'อ', core: 'ɤː', example: 'เธอ', gloss: 'she' },
];

/** Real words verified by letter+vowel+mark, keyed by the exact constructed
 *  syllable — a supplement to each row's single vowels.ts example (which is
 *  usually built on a different consonant, so it only ever matches that one
 *  letter). Audited across all 41 non-obsolete consonants; a class/letter
 *  with no comment-and-entries below (e.g. ฎ, ฏ, ฐ, ศ, ษ, ญ, ฑ, ฒ, ณ, ฬ)
 *  genuinely has zero real bare open-syllable words for these 9 vowel
 *  shapes, not an unaudited gap. Some entries are vulgar or slang — labeled
 *  inline — kept because this app doesn't otherwise censor real vocabulary.
 *  The ห นำ block at the end covers the silent-ห spellings, which belong to
 *  the letter after the ห rather than to ห itself. Every entry below is
 *  checked against a dictionary; a syllable the matrix can build but no
 *  dictionary lists simply has no entry here and shows without a gloss. */
const KNOWN_GLOSSES: Record<string, string> = {
  // --- mid class ---
  // ก
  'กา': 'crow (bird)', 'กี่': 'how many; weaving loom',
  'กู': 'I, me (rude/informal)', 'กู่': 'to shout, call out', 'กู้': 'to rescue; to borrow money',
  'เก': 'nerdy, dorky (slang)', 'เก๊': 'fake, counterfeit', 'เก๋': 'stylish, chic',
  'แก': 'you (informal, to a peer)', 'แก่': 'old', 'แก้': 'to fix, solve, correct',
  'โก้': 'stylish, classy', 'โก๋': 'a dandy (retro slang)',
  'กอ': 'clump, cluster (of plants)', 'ก่อ': 'to build; to start (trouble)',
  'เก้อ': 'awkward, embarrassed',
  // จ
  'จ่า': 'sergeant (rank)', 'จ้า': 'yeah! (cheerful reply); brightly', 'จ๋า': 'affectionate calling particle',
  'จี่': 'to grill, toast over fire', 'จี้': 'to poke, jab; a pendant',
  'จู่': 'suddenly; to raid, attack', 'จู๋': 'willy, pee-pee (child slang)',
  'เจ': 'vegan (Chinese Buddhist diet)', 'เจ๊': 'big sister (Chinese-Thai)',
  'จอ': 'screen (TV, monitor)', 'จ่อ': 'to aim at; about to happen', 'จ้อ': 'to chat non-stop, gab', 'จ๋อ': 'monkey (informal)',
  'เจอ': 'to meet, find, encounter',
  // ฎ, ฏ — no real bare-syllable words for either letter
  // ด
  'ด่า': 'to scold, curse, insult',
  'ดี': 'good', 'ดี๊': 'elated, overjoyed',
  'ดื้อ': 'stubborn, disobedient',
  'ดู': 'to look, watch',
  'แด่': 'to, for (formal dedication)',
  'เด้อ': '"okay?" (Isan final particle)', 'เด๋อ': 'goofy, dazed, klutzy',
  // ต
  'ตา': 'eye; maternal grandfather',
  'ตี': 'to hit, beat', 'ตี๋': 'young Thai-Chinese guy (slang)',
  'ตื้อ': 'thick-headed, foggy', 'ตื๊อ': 'to pester, nag',
  'ตู่': 'to falsely claim', 'ตู้': 'cabinet, cupboard',
  'แต่': 'but',
  'โต': 'big, grown-up', 'โต้': 'to argue, debate, counter',
  'ตอ': 'tree stump', 'ต่อ': 'to connect, continue; wasp; per', 'ต้อ': 'cataract (eye condition)',
  'เต๋อ': 'goofy, dorky (informal)',
  // บ
  'บ่า': 'shoulder', 'บ้า': 'crazy, mad', 'บ๋า': 'waiter! (summoning call)',
  'บี้': 'to squash, crush flat',
  'บื้อ': 'dumb, oafish (informal)',
  'บู่': 'a white flower; goby fish', 'บู๊': 'action, martial arts (genre)',
  'เบ้': 'to grimace, pull a face', 'เบ๊': 'underling, lackey',
  'แบ': 'to spread flat, splay open',
  'โบ๋': 'empty, hollow, deserted',
  'บ่อ': 'well, pit, pond',
  'เบ้อ': 'huge, oversized (informal)',
  // ป
  'ปา': 'to throw', 'ป่า': 'forest', 'ป้า': 'aunt', 'ป๊า': 'dad (informal)', 'ป๋า': 'dad (slang)',
  'ปี': 'year', 'ปี่': 'Thai oboe (instrument)',
  'ปู': 'crab', 'ปู่': 'grandfather', 'ปู้': 'to wreck (ปู้ยี่ปู้ยำ)', 'ปู๊': 'horn/whistle sound', 'ปู๋': 'female genitals (vulgar)',
  'เป้': 'a carrier, sling', 'เป๋': 'to swerve, wobble',
  'โป๊': 'revealing, skimpy',
  'ปอ': 'jute (plant fiber)',
  'เป๋อ': 'dazed, out of it',
  // อ
  'อา': "father's younger sibling", 'อ้า': 'to open, gape (mouth)',
  'อี': "demeaning prefix for a woman's name", 'อี๋': 'ew!, yuck! (disgust)',
  'อือ': 'uh-huh, yeah (grunt of assent)', 'อื้อ': 'loud, buzzing, in an uproar',
  'อู่': 'dock, garage; cradle', 'อู้': 'to slack off, loaf around',
  'เอ': 'hmm? (pondering)',
  'แอ๊': 'to act cutesy (slang)', 'แอ๋': 'dead drunk (informal)',
  'โอ': 'oh! (exclamation)', 'โอ้': 'oh my! (exclamation)', 'โอ๋': 'to soothe, coddle (a child)',
  'ออ': 'to flock, crowd together', 'อ้อ': 'oh, I see', 'อ๋อ': 'ahh, I get it now',
  'เออ': 'yeah, uh-huh (informal)', 'เอ่อ': 'um... (hesitation); to well up', 'เอ๋อ': 'dopey, dim-witted, dazed',

  // --- high class ---
  // ข
  'ขา': 'leg', 'ข่า': 'galangal (herb)', 'ข้า': 'I, servant (archaic)',
  'ขี่': 'to ride (a vehicle/animal)', 'ขี้': 'feces; prefix "prone to"',
  'ขื่อ': 'lintel (house-frame beam)',
  'ขู่': 'to threaten',
  'ขอ': 'to ask for, request', 'ข้อ': 'joint; item, clause',
  // ฉ
  'ฉ่า': 'sizzling sound; a spicy stir-fry',
  'ฉี่': 'to pee, urine (childish)',
  'เฉ': 'to veer, swerve, tilt',
  'แฉ': 'to expose, reveal (a scandal)',
  'ฉ้อ': 'to defraud, cheat (ฉ้อโกง)',
  // ฐ — no real bare-syllable words
  // ถ
  'ถา': 'to swoop, dive down', 'ถ้า': 'if',
  'ถี่': 'close together, frequent',
  'ถือ': 'to hold; to observe, regard',
  'ถู': 'to scrub, wipe',
  'แถ': 'to glide, skid sideways',
  'โถ': 'a lidded pot; also "oh dear!"',
  'ถ่อ': 'punting pole; to pole a boat',
  // ผ
  'ผา': 'cliff',
  'ผ่า': 'to cut open, split',
  'ผ้า': 'cloth, fabric',
  'ผี': 'ghost',
  'ผู้': 'person (prefix/classifier)',
  'แผ่': 'to spread out, extend flat',
  'โผ': 'to swoop, dart; a name list',
  // ฝ
  'ฝา': 'lid, cover',
  'ฝ่า': 'to push through; palm, sole',
  'ฝ้า': 'ceiling; dark skin patches',
  'ฝี': 'abscess, boil',
  'ฝ่อ': 'to shrivel, wither; to lose heart',
  // ศ, ษ — no real bare-syllable words for either letter
  // ส
  'ส่า': 'yeast sediment; a skin rash',
  'สี': 'color; to grind (สีข้าว)',
  'สี่': 'four',
  'สื่อ': 'media; to communicate',
  'สู่': 'to, towards',
  'สู้': 'to fight',
  'แส่': 'to meddle, pry',
  'แส้': 'whip',
  'ส่อ': 'to indicate, show signs of',
  // ห
  'หา': 'to search for, look for',
  'ห่า': 'cholera (archaic); a vulgar curse',
  'ห้า': 'five',
  'หี': 'female genitals (vulgar)',
  'หือ': 'huh?; to protest, talk back',
  'หู': 'ear',
  'แห': 'casting net (fishing)',
  'แห่': 'to parade in a crowd',
  'หอ': 'hall, tower (building)',
  'ห่อ': 'to wrap; a bundle, package',
  'ห้อ': 'bruised (blood under the skin)',
  'โห่': 'to cheer or jeer in unison',
  'เห่อ': 'to be smitten with a new fad',

  // --- low class ---
  // ค
  'คา': 'to be stuck, lodged', 'ค่า': 'value, cost, price', 'ค้า': 'to trade',
  'คี่': 'odd (number)',
  'คือ': 'is, means (copula)',
  'คู่': 'a pair, couple',
  'แค่': 'only, just',
  'โค': 'cattle, ox (formal)',
  'คอ': 'neck; fan, enthusiast',
  // ฆ
  'ฆ่า': 'to kill',
  // ง
  'งา': 'sesame; (elephant) tusk', 'งู': 'snake',
  'แง่': 'aspect, angle, point of view',
  'โง่': 'stupid, foolish',
  'งอ': 'bent, curved, crooked', 'ง้อ': 'to make up with, appease',
  // ช
  'ชา': 'tea', 'ช้า': 'slow',
  'ชี': 'ascetic; root of แม่ชี, "nun"', 'ชี้': 'to point (at)',
  'ชื่อ': 'name',
  'ชู': 'to lift, raise, hold up', 'ชู้': 'illicit lover, paramour',
  'แช่': 'to soak, marinate, immerse',
  'ช่อ': 'bouquet, cluster (of flowers)',
  // ซ
  'ซา': 'to subside, abate', 'ซ่า': 'fizzy; flashy, brash',
  'ซี': 'civil-service pay grade (informal)', 'ซี่': 'slat, prong, spoke', 'ซี้': '(slang) to die',
  'ซื่อ': 'honest', 'ซื้อ': 'to buy',
  'เซ': 'to stagger, totter, sway',
  'แซ่': 'Chinese clan name/surname',
  'โซ': 'famished, faint from hunger', 'โซ่': 'chain',
  'ซอ': 'Thai fiddle',
  'เซ่อ': 'foolish, gawky, dumbstruck',
  // ฌ
  'เฌอ': '(archaic/poetic) tree',
  // ญ, ฑ, ฒ, ณ — no real bare-syllable words for any of these four letters
  // ท
  'ทา': 'to apply, spread on', 'ท่า': 'pier, wharf; pose, stance', 'ท้า': 'to challenge, dare',
  'ที': 'time, turn, occasion', 'ที่': 'place; that, which; ordinal marker',
  'ทื่อ': 'blunt, dull (of a blade)',
  'ทู่': 'blunt, not pointed',
  'เท': 'to pour', 'เท่': '(informal) cool, stylish',
  'แท้': 'genuine, real, authentic',
  'โท': 'second (formal ordinal)',
  'ทอ': 'to weave', 'ท่อ': 'pipe, tube, duct', 'ท้อ': 'discouraged; peach (fruit)',
  // ธ
  'โธ่': 'oh dear!, oh no! (exasperation)', 'เธอ': 'you (intimate); she (literary)',
  // น
  'นา': 'rice field', 'น่า': 'worthy of, -able (prefix)', 'น้า': "mother's younger sibling",
  'นี่': 'this (pronoun)', 'นี้': 'this (follows the noun)',
  'แน่': 'sure, certain',
  'นอ': 'horn (of an animal)',
  'เน้อ': '"ok?, right?" (Northern particle)',
  // พ
  'พา': 'to take (someone) along', 'พี่': 'older sibling',
  'พู': 'lobe, segment', 'พู่': 'tassel, tuft',
  'แพ': 'raft', 'แพ้': 'to lose; to be allergic to',
  'โพ': 'the Bodhi tree',
  'พอ': 'enough', 'พ่อ': 'father', 'พ้อ': 'to complain reproachfully',
  'เพ้อ': 'to be delirious, to rave',
  // ฟ
  'ฟา': 'the note "fa" (solfège)',
  'ฟ้า': 'sky; light blue',
  'ฟู': 'fluffy, puffed up', 'ฟู่': 'fizzing/hissing sound',
  'แฟ': 'sweetheart, partner (colloquial)',
  'เฟ้อ': 'inflated, excessive',
  // ภ
  'ภู': 'mountain, hill',
  'ภู่': 'tuft, tassel; carpenter bee',
  // ม
  'มา': 'to come', 'ม้า': 'horse',
  'มี': 'to have',
  'มือ': 'hand', 'มื้อ': 'meal (classifier)',
  'มู': 'luck-seeking, occult (modern slang)',
  'แม่': 'mother', 'แม้': 'although, even if',
  'โม่': 'to grind; a millstone', 'โม้': 'to boast, brag',
  'มอ': 'small hill, mound',
  // ย
  'ยา': 'medicine', 'ย่า': 'paternal grandmother',
  'ยี': 'to rub, crush between fingers', 'ยี่': 'two- (as in ยี่สิบ, twenty)', 'ยี้': 'yuck! (disgust)',
  'ยื้อ': 'to tug over; to drag out, stall',
  'ยู้': 'to push, shove',
  'เย้': 'yay!, hooray!',
  'แย่': 'terrible, in bad shape', 'แย้': 'a butterfly lizard',
  'โย้': 'to lean, tilt, sag',
  'ยอ': 'to flatter, praise', 'ย่อ': 'to shrink, abbreviate',
  // ร
  'รา': 'mold, fungus', 'ร่า': 'cheerful, jovial',
  'รี': 'oval, elongated', 'รี่': 'to rush straight forward',
  'รื้อ': 'to tear down, dismantle',
  'รู': 'hole', 'รู้': 'to know',
  'เร่': 'to peddle around; to hurry',
  'แร่': 'mineral, ore',
  'โร่': 'to rush forth (colloquial)',
  'รอ': 'to wait',
  'เรอ': 'to burp, belch',
  // ล
  'ลา': 'donkey; to say goodbye', 'ล่า': 'to hunt', 'ล้า': 'tired, weary',
  'ลี้': 'to flee, go into hiding',
  'ลือ': 'to be rumored; renowned',
  'ลื้อ': 'you (informal, Chinese-derived)',
  'ลู่': 'track, lane; to droop/wilt',
  'เล': 'the sea (Southern/informal)',
  'แล': 'to look, gaze; and (archaic)', 'แล่': 'to slice, fillet',
  'โล': 'kilo(gram) (colloquial)', 'โล่': 'shield', 'โล้': 'to rock, swing',
  'ล่อ': 'to lure, entice; a mule', 'ล้อ': 'wheel; to tease, mock',
  'เลอ': 'surpassing, excellent (literary)',
  // ว
  'วา': 'wa, a length unit (~2 m); arm span',
  'ว่า': 'to say; that; to scold',
  'ว้า': 'wow!, oh! (surprise or dismay)',
  'วี': 'to fan (air onto something)',
  'วอ': 'a palanquin (archaic)',
  'เว่อ': 'over-the-top, exaggerated',
  // ฬ — no real bare-syllable words
  // ฮ
  'ฮา': 'funny, hilarious', 'ฮ่า': 'ha (laughter, usu. ฮ่าๆ)',
  'เฮ้': 'hey! (interjection)',
  'โฮ': 'to bawl, cry loudly',
  'เฮ้อ': 'sigh... (exasperation, relief)',
  'ฮื่อ': 'uh-huh, yeah (informal)',
  'ฮู้': 'to know (Northern Thai)',
  'ฮ่อ': 'Haw — Yunnanese Chinese',

  // --- ห นำ (silent ห) forms ---
  // Only the 10 single low-class letters take these, and only the two
  // spellings the letter can't otherwise reach: no mark (Rising) and ่
  // (Low). ห + ญ/ณ/ฬ yields nothing real for these vowel shapes.
  // ง
  'หงอ': 'cowed, afraid to fight back', 'หงี่': 'randy, lustful (crude)',
  'แหง': 'for sure (usu. แหงๆ)', 'แหง่': 'buffalo calf; a clingy kid (ลูกแหง่)',
  'โหง': 'a violent, unnatural death (ตายโหง)',
  // น
  'หนา': 'thick', 'หนี': 'to flee, run away',
  'หนู': 'mouse, rat; I/you (a girl or child)', 'หน่อ': 'sprout, shoot; offspring',
  'แหน': 'to guard jealously (หวงแหน)', 'โหน': 'to hang from, swing by the arms',
  // ม
  'หมา': 'dog', 'หมี': 'bear', 'หมี่': 'rice noodles', 'หมู': 'pig; easy, a pushover',
  'หมู่': 'group, batch', 'หมอ': 'doctor; an expert', 'หม่า': 'to soak, steep',
  'แหม': 'oh, come on! (interjection)', 'โหม': 'to go all out, pour it on',
  'เหม่': 'hey! (angry shout)', 'เหม่อ': 'absent-minded, staring blankly',
  // ย
  'หย่า': 'to divorce', 'แหย': 'timid, sheepish', 'แหย่': 'to poke at; to tease',
  // ร
  'หรือ': 'or', 'หรู': 'fancy, luxurious', 'หรี่': 'to dim, turn down',
  'หรอ': 'to wear away (สึกหรอ); also "really?"', 'เหรอ': 'really? (question particle)',
  'โหร': 'astrologer',
  // ล
  'หลา': 'yard (0.91 m)', 'หล่อ': 'to cast (metal); handsome', 'โหล': 'a dozen',
  'โหล่': 'last, in last place', 'เหล่': 'cross-eyed', 'เหลอ': 'blank-faced, clueless',
  // ว
  'หวี': 'comb', 'หวือ': 'whoosh (sound)', 'เหว': 'ravine, chasm',
  'เหว่': 'lonely, desolate (ว้าเหว่)', 'โหว่': 'gaping, holed through',
};


/** One consonant button in the matrix's picker. */
function LetterButton({ c, active, onClick }: { c: Consonant; active: boolean; onClick: () => void }) {
  const color = CLASS_COLOR[c.klass];
  // The same R / OBS chips the consonants page prints after a letter's name,
  // here pinned to the button's corner: out of the flow, and with the tag's
  // own margin dropped, so a flagged button stays exactly the size of an
  // unflagged one and the row of letters keeps an even rhythm.
  const flag = c.obsolete
    ? { tag: 'obsolete-tag', text: 'OBS', title: 'obsolete letter' }
    : c.rare
      ? { tag: 'rare-tag', text: 'R', title: 'rare letter' }
      : null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={flag?.title}
      style={{
        position: 'relative',
        fontFamily: 'var(--thai-font)', fontSize: '1.05rem', lineHeight: 1,
        padding: '6px 10px 7px', borderRadius: 8,
        cursor: 'pointer', fontWeight: 500,
        border: `1.5px solid ${active ? color : '#ddd'}`,
        background: active ? `${color}1a` : '#fff',
        color: active ? color : '#333',
      }}
    >
      {c.letter}
      {flag && (
        <span
          className={flag.tag}
          style={{ position: 'absolute', bottom: -7, right: -4, margin: 0, lineHeight: 1.3, pointerEvents: 'none' }}
        >
          {flag.text}
        </span>
      )}
    </button>
  );
}

/** One column of the vowel x tone matrix. `silentH` marks a column spelled
 *  with a leading silent ห (ห นำ): the ห is written but not pronounced, and
 *  it hands the syllable to the high-class rules, which is the only way a
 *  single low-class letter can spell the two tones it otherwise can't. */
type MatrixColumn = { mark: ToneMark | null; tone: ToneName; silentH?: boolean };

const columnKey = (col: MatrixColumn) => `${col.silentH ? 'h-' : ''}${col.mark ?? 'none'}`;

/** Position in the canonical tone order — THAI_TONES is already listed in it. */
const toneOrder = (tone: ToneName) => THAI_TONES.findIndex(t => t.nameEn === tone);

/** The ห นำ columns worth adding for a low-class letter: the high-class
 *  chant minus every tone the letter already reaches on its own. Derived
 *  rather than listed so it stays right if the chant tables ever change —
 *  today it yields Rising (no mark) and Low (่), while ้ is left out
 *  because plain ่ already spells Falling for a low-class letter. */
function silentHColumns(base: MatrixColumn[]): MatrixColumn[] {
  return chantSequence('high')
    .filter(h => !base.some(b => b.tone === h.tone))
    .map(h => ({ ...h, silentH: true }));
}

/** ห นำ is only available to the 10 single low-class letters (อักษรเดี่ยว,
 *  the sonorants). The other low-class letters each have a high-class twin
 *  (ค/ข, ช/ฉ, ท/ถ ...) and reach the missing tones by switching to it, so
 *  offering them a silent ห would spell words that don't exist. */
const canTakeSilentH = (c: Consonant) => c.klass === 'low' && !!c.sonorant;

/** A Thai term that stands on its own: click to hear it, hover for its IPA
 *  and what it is. Everything but the word itself lives in the tooltip —
 *  two terms side by side show the contrast between them faster than a
 *  sentence explaining it would. */
function Term({ word, ipa, note }: { word: string; ipa: string; note?: string }) {
  return (
    <span
      className={styles.label}
      style={{ fontFamily: 'var(--thai-font)', cursor: 'pointer' }}
      data-tooltip={note ? `/${ipa}/ · ${note}` : `/${ipa}/`}
      onClick={() => speakThai(word)}
    >
      {word}
    </span>
  );
}

/** Thai glyphs quoted inside an English sentence — the Thai face, at the
 *  size of the copy around them. */
function ThaiInline({ children, color }: { children: ReactNode; color?: string }) {
  return <span style={{ fontFamily: 'var(--thai-font)', color }}>{children}</span>;
}

/** Which spellings of a pair produce each tone, derived from the same
 *  lookup the rest of this tab uses rather than listed by hand: the
 *  low-class letter with each mark it can take, then the high-class
 *  partner with each of its own, grouped by the tone that comes out.
 *  Falling ends up with two spellings — ค่า and ข้า say the same thing —
 *  which is exactly the overlap this view exists to show. */
function pairColumns(): { tone: ToneName; spellings: { side: ConsonantClass; mark: ToneMark | null }[] }[] {
  const spellings = (['low', 'high'] as const).flatMap(side =>
    LEGAL_MARKS[side].map(mark => ({
      side,
      mark,
      tone: standardCellMatch({ initial: '', klass: side, mark, isLive: true, vowelLength: 'long', hasFinal: false }).tone,
    })));
  return THAI_TONES.map(t => t.nameEn as ToneName).map(tone => ({
    tone,
    spellings: spellings.filter(sp => sp.tone === tone).map(({ side, mark }) => ({ side, mark })),
  }));
}

const PAIR_COLUMNS = pairColumns();

/** How the partner spelling is written, for the column header: a twin
 *  letter stands on its own, a silent ห goes in front of the low letter. */
const partnerBase = (pair: TonePair, letter: string) => (pair.high ? pair.high.letter : 'ห' + letter);

/** A matrix column header: the tone's own card, and under it how this
 *  column is spelled — each base letter in its class colour, followed by
 *  the mark written on it (or "no mark"). Shared by both matrices so a
 *  reader moving between them reads the same header twice, and the case and
 *  letter-spacing the table's `th` rule applies are reset once, here,
 *  rather than reaching into the card. */
function ToneColumnHeader({ tone, spellings }: {
  tone: ToneName;
  spellings: { base: string; color: string; mark: ToneMark | null }[];
}) {
  return (
    <th style={{ color: TONE_COLOR[tone], textTransform: 'none', letterSpacing: 0, verticalAlign: 'top' }}>
      <div className={styles.colHeaderStack}>
        <ToneCard tone={thaiTone(tone)} compact hideExample />
        <span
          style={{
            display: 'block', marginTop: 7, marginBottom: 2, fontSize: '1.05rem',
            fontWeight: 400, color: '#666',
          }}
        >
          {spellings.map((sp, n) => (
            // One spelling per line: a tone with two of them (ว + ่ and หว + ้
            // both spell Falling) reads as two recipes, not one run-on string.
            <span key={`${sp.base}-${sp.mark ?? 'none'}`} style={{ display: 'block', marginTop: n > 0 ? 2 : 0 }}>
              <ThaiInline color={sp.color}>{sp.base}</ThaiInline>
              {/* The mark takes the line's own grey: the card right above it
                  already carries the tone colour, and repeating it here only
                  competes with the class colour on the letter. */}
              {sp.mark && <> + <MarkGlyph mark={CHANT_MARK_GLYPH[sp.mark]} fontSize="1.05rem" /></>}
            </span>
          ))}
        </span>
      </div>
    </th>
  );
}

/** One spelling in a pair-matrix cell: the syllable, its tone color, the
 *  IPA behind a tooltip and the gloss under it — the same treatment the
 *  single-letter matrix gives its cells, so a reader moving between the two
 *  views reads them the same way. */
function PairSpelling({ syll, ipa, gap }: { syll: string; ipa: string; gap?: boolean }) {
  const gloss = KNOWN_GLOSSES[syll];
  return (
    <span style={{ display: 'block', marginTop: gap ? 7 : 0 }}>
      <span
        className={styles.label}
        style={{ cursor: 'pointer' }}
        data-tooltip={`/${ipa}/`}
        onClick={() => speakThai(syll)}
      >
        {syll}
      </span>
      {gloss && <span className={styles.cellGloss}>{gloss}</span>}
    </span>
  );
}

/** One sound, spelled across all five tones. A low-class letter can only
 *  reach three of them; this view sets it beside the partner that covers
 *  the other two, so the whole tone range of a single sound reads as one
 *  table instead of two class tables a reader has to join up themselves. */
function PairMatrix() {
  const [sound, setSound] = useState(TONE_PAIRS[0].sound);
  // Row and column of the cell sounding right now; null between runs.
  const [playing, setPlaying] = useState<{ row: number; col: number } | null>(null);
  const pair = TONE_PAIRS.find(p => p.sound === sound) ?? TONE_PAIRS[0];
  const [letter, setLetter] = useState(pair.low[0].letter);
  const lowLetter = pair.low.some(l => l.letter === letter) ? letter : pair.low[0].letter;
  const bareInitial = pair.sound.replace(/\//g, '');

  const selectPair = (p: TonePair) => {
    setSound(p.sound);
    setLetter(p.low[0].letter);
  };

  const spell = (v: (typeof VOWEL_ROWS)[number], side: ConsonantClass, mark: ToneMark | null) =>
    v.pre
    + (side === 'high' ? partnerBase(pair, lowLetter) : lowLetter)
    + v.attach + (mark ? CHANT_MARK_GLYPH[mark] : '') + v.trail;

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 10 }}>
        One sound, both spellings. The low-class letter covers Mid, Falling and High; its partner —
        a high-class twin, or a silent <ThaiInline>ห</ThaiInline> for the letters that have no twin —
        covers Low and Rising.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginBottom: 10 }}>
        {TONE_PAIRS.map(p => {
          const active = p.sound === pair.sound;
          return (
            <div key={p.sound} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: '0.62rem', color: '#999', fontFamily: 'monospace' }}>{p.sound}</span>
              <button
                type="button"
                onClick={() => selectPair(p)}
                style={{
                  fontFamily: 'var(--thai-font)', fontSize: '1.05rem', lineHeight: 1,
                  padding: '6px 10px 7px', borderRadius: 8, cursor: 'pointer', fontWeight: 500,
                  border: `1.5px solid ${active ? PAIR_TAB_COLOR : '#ddd'}`,
                  background: active ? `${PAIR_TAB_COLOR}14` : '#fff',
                }}
              >
                {/* Each half in its own class colour — the same red and green
                    the class tabs use — so the button itself says which
                    letter is the low one and which covers the two tones it
                    can't reach. */}
                <span style={{ color: CLASS_COLOR.low }}>{p.low.map(l => l.letter).join(' ')}</span>
                <span style={{ color: '#bbb' }}> · </span>
                <span style={{ color: CLASS_COLOR.high }}>{p.high ? p.high.letter : 'ห นำ'}</span>
              </button>
            </div>
          );
        })}
      </div>
      {pair.low.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: '0.78rem', color: '#888' }}>Low letter:</span>
          {pair.low.map(l => (
            <LetterButton key={l.letter} c={l} active={l.letter === lowLetter} onClick={() => setLetter(l.letter)} />
          ))}
        </div>
      )}

      <div className={styles.tableScroll}>
        <table className={`${styles.cueTable} ${styles.matrixTable}`}>
          <thead>
            <tr>
              <th></th>
              {PAIR_COLUMNS.map(col => (
                <ToneColumnHeader
                  key={col.tone}
                  tone={col.tone}
                  spellings={col.spellings.map(sp => ({
                    base: sp.side === 'high' ? partnerBase(pair, lowLetter) : lowLetter,
                    color: CLASS_COLOR[sp.side],
                    mark: sp.mark,
                  }))}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {VOWEL_ROWS.map((v, i) => {
              // One clip per tone, not per spelling: where a tone has two
              // spellings they are homophones, so playing both would repeat
              // the same sound. The queue therefore lines up with the columns.
              const rowSylls = PAIR_COLUMNS.map(col => spell(v, col.spellings[0].side, col.spellings[0].mark));
              return (
                <tr key={i}>
                  {/* No letter here: the unmarked column right beside it
                      spells this exact syllable already. The cell earns its
                      keep as the row's play control instead. */}
                  <td style={{ textAlign: 'center' }}>
                    <PlayButton
                      words={rowSylls}
                      title={`Play the ${v.pre}◌${v.attach}${v.trail} row`}
                      size={24}
                      onWord={col => setPlaying(col === null ? null : { row: i, col })}
                    />
                  </td>
                  {PAIR_COLUMNS.map((col, ci) => {
                    const ipa = bareInitial + v.core[0] + TONE_DIACRITIC[col.tone] + v.core.slice(1);
                    const isPlaying = playing?.row === i && playing.col === ci;
                    return (
                      <td
                        key={col.tone}
                        className={`${styles.cueThaiWord} ${isPlaying ? styles.playingCell : ''}`}
                        style={{ color: TONE_COLOR[col.tone] }}
                      >
                        {col.spellings.map((sp, n) => (
                          <PairSpelling
                            key={`${sp.side}-${sp.mark ?? 'none'}`}
                            syll={spell(v, sp.side, sp.mark)}
                            ipa={ipa}
                            gap={n > 0}
                          />
                        ))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <CompoundWords
        words={[
          ...(LETTER_COMPOUNDS[lowLetter] ?? []),
          ...(pair.high ? LETTER_COMPOUNDS[pair.high.letter] ?? [] : []),
        ]}
        subtitle={`everyday words that start with ${lowLetter}${pair.high ? ` or ${pair.high.letter}` : ''}`}
      />
    </div>
  );
}

/** The paired view isn't one class, so it gets its own tab colour rather
 *  than borrowing a class's. */
const PAIR_TAB_COLOR = '#7c3aed';

/** The matrix's four views: one per consonant class, plus the paired view
 *  that puts a low-class letter next to the partner covering its missing
 *  two tones. */
type MatrixMode = ConsonantClass | 'pair';

/** One consonant, shown two ways: the tone chant on a fixed vowel up top
 *  and that same consonant's full vowel range against those marks below.
 *  Ties the vowel and tone systems to one shared letter instead of
 *  teaching them with no common example. */
function VowelToneMatrix() {
  const [activeClass, setActiveClass] = useState<MatrixMode>('mid');
  // In the paired view the letter picker below is idle — it keeps the last
  // single-letter class so the state it holds is still valid on the way back.
  const [letter, setLetter] = useState('ป');
  const consonant = CONSONANTS.find(c => c.letter === letter)!;
  // In the paired view the letter picker below is idle — it keeps the last
  // single-letter class so the state it holds is still valid on the way back.
  const pickerClass: ConsonantClass = activeClass === 'pair' ? consonant.klass : activeClass;
  const classLetters = useMemo(() => byClass(pickerClass).filter(c => !c.obsolete), [pickerClass]);
  const bareInitial = consonant.initial.replace(/\//g, '');
  const [showSilentH, setShowSilentH] = useState(false);
  const [groupBySound, setGroupBySound] = useState(true);
  // Which cell the row's play button is sounding right now, as row index and
  // column index; null between runs.
  const [playing, setPlaying] = useState<{ row: number; col: number } | null>(null);
  const silentHAvailable = canTakeSilentH(consonant);
  const sequence = useMemo<MatrixColumn[]>(() => {
    const base = chantSequence(consonant.klass);
    if (!(showSilentH && silentHAvailable)) return base;
    // Sorted by tone rather than by mark: with the ห นำ columns added the
    // letter covers all five tones, and reading them in the canonical order
    // (Mid · Low · Falling · High · Rising) matters more than keeping the
    // two spelling devices in separate blocks.
    return [...base, ...silentHColumns(base)]
      .sort((a, b) => toneOrder(a.tone) - toneOrder(b.tone));
  }, [consonant.klass, showSilentH, silentHAvailable]);

  // Switching class tabs also jumps the selected letter to that class's
  // first one, so the picker and the grids below always agree. Low class
  // opens on its first single letter (ง) instead of ค: only the single
  // letters can take the ห นำ columns, so landing on a paired one would
  // hide that toggle behind a letter change.
  const selectClass = (klass: ConsonantClass) => {
    setActiveClass(klass);
    const letters = byClass(klass).filter(c => !c.obsolete);
    const first = letters.find(canTakeSilentH) ?? letters[0];
    if (first) setLetter(first.letter);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ marginBottom: 8 }}>
        <strong>Vowel &times; tone matrix</strong>{' '}
        <span style={{ fontWeight: 400, color: '#666', fontSize: '0.82rem' }}>
          {activeClass === 'pair'
            ? '— one sound, both of its spellings: all five tones against every vowel'
            : '— one consonant: every legal tone mark up top, every vowel against those marks below'}
        </span>
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['mid', 'high', 'low', 'pair'] as const).map(mode => {
          const active = mode === activeClass;
          const color = mode === 'pair' ? PAIR_TAB_COLOR : CLASS_COLOR[mode];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => (mode === 'pair' ? setActiveClass('pair') : selectClass(mode))}
              style={{
                fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700, padding: '7px 16px',
                borderRadius: 6, cursor: 'pointer', border: `2px solid ${color}`,
                background: active ? color : '#fff',
                color: active ? '#fff' : color,
              }}
            >
              {mode === 'pair' ? 'High + Low pair' : CLASS_LABEL[mode]}
            </button>
          );
        })}
      </div>
      {activeClass === 'pair' ? <PairMatrix /> : (
        <>
        <div style={{ marginBottom: 14 }}>
          <ClassVideoLink
            href={CLASS_VIDEO[activeClass].href}
            label={CLASS_VIDEO[activeClass].label}
            color={CLASS_COLOR[activeClass]}
          />
        </div>
        <label
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8,
            fontSize: '0.78rem', color: '#555', cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={groupBySound}
            onChange={e => setGroupBySound(e.target.checked)}
          />
          Group by sound
        </label>
        {groupBySound ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginBottom: 10 }}>
            {groupByInitial(classLetters).map(g => (
              <div key={g.sound} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: '0.62rem', color: '#999', fontFamily: 'monospace' }}>{g.sound}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {g.letters.map(c => (
                    <LetterButton key={c.letter} c={c} active={c.letter === letter} onClick={() => setLetter(c.letter)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {classLetters.map(c => (
              <LetterButton key={c.letter} c={c} active={c.letter === letter} onClick={() => setLetter(c.letter)} />
            ))}
          </div>
        )}
        <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 12 }}>
          {consonant.klass === 'mid'
            ? 'Mid class takes all 4 marks — the only class with a full 5-tone chant.'
            : 'No ๊ or ๋ here — those two marks are only ever written over mid-class letters.'}
        </p>
        {consonant.klass === 'low' && (silentHAvailable ? (
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
              fontSize: '0.78rem', color: '#555', cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showSilentH}
              onChange={e => setShowSilentH(e.target.checked)}
            />
            <span>
              Add <ThaiInline>ห นำ</ThaiInline> — the silent ห that lends{' '}
              <ThaiInline>{letter}</ThaiInline> the Low and Rising tones it can't spell on its own.
            </span>
          </label>
        ) : (
          <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 12 }}>
            <ThaiInline>{letter}</ThaiInline> reaches Low and Rising through its high-class twin,
            not through a silent ห — that is only for the 10 single low-class letters{' '}
            (<ThaiInline>ง ญ ณ น ม ย ร ล ว ฬ</ThaiInline>).
          </p>
        ))}

        <div className={styles.tableScroll}>
          <table className={`${styles.cueTable} ${styles.matrixTable}`}>
            <thead>
              <tr>
                <th></th>
                {sequence.map(col => (
                  <ToneColumnHeader
                    key={columnKey(col)}
                    tone={col.tone}
                    spellings={[{
                      base: col.silentH ? 'ห' + letter : letter,
                      color: col.silentH ? CLASS_COLOR.high : CLASS_COLOR[consonant.klass],
                      mark: col.mark,
                    }]}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {VOWEL_ROWS.map((v, i) => {
                // A tone mark sits on the letter carrying the vowel, so in a ห นำ
                // spelling it follows the second consonant rather than the ห:
                // เ + ห + ง + ◌ื + ◌่ + อ = เหงื่อ.
                const rowSylls = sequence.map(({ mark, silentH }) =>
                  v.pre + (silentH ? 'ห' : '') + letter + v.attach + (mark ? CHANT_MARK_GLYPH[mark] : '') + v.trail);
                return (
                <tr key={i}>
                  <td style={{ textAlign: 'center' }}>
                    <PlayButton
                      words={rowSylls}
                      title={`Play the ${v.pre}◌${v.attach}${v.trail} row`}
                      size={24}
                      onWord={col => setPlaying(col === null ? null : { row: i, col })}
                    />
                  </td>
                  {sequence.map((col, colIndex) => {
                    const { tone } = col;
                    const color = TONE_COLOR[tone];
                    const syll = rowSylls[colIndex];
                    const ipa = bareInitial + v.core[0] + TONE_DIACRITIC[tone] + v.core.slice(1);
                    // Prefer a verified real word for this exact syllable
                    // (KNOWN_GLOSSES) over v.example, which is one fixed word
                    // per row from vowels.ts, usually built on a different
                    // consonant than whatever's selected here, and sometimes
                    // itself already carries a mark (กี่ for the ◌ี row) —
                    // matching it requires the exact same letter *and* mark,
                    // not just "the unmarked column."
                    const gloss = KNOWN_GLOSSES[syll] ?? (syll === v.example ? v.gloss : undefined);
                    const isPlaying = playing?.row === i && playing.col === colIndex;
                    return (
                      <td
                        key={columnKey(col)}
                        className={`${styles.cueThaiWord} ${isPlaying ? styles.playingCell : ''}`}
                      >
                        <span
                          className={styles.label}
                          style={{ color, cursor: 'pointer' }}
                          data-tooltip={`/${ipa}/`}
                          onClick={() => speakThai(syll)}
                        >
                          {syll}
                        </span>
                        {gloss && <span className={styles.cellGloss}>{gloss}</span>}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <CompoundWords
          words={LETTER_COMPOUNDS[letter] ?? CLASS_COMPOUND_WORDS[consonant.klass]}
          subtitle={LETTER_COMPOUNDS[letter]
            ? `everyday words that start with ${letter}`
            : `${CLASS_LABEL[consonant.klass].toLowerCase()} pairs — ${letter} starts few words of its own`}
        />
        </>
      )}
    </div>
  );
}

export function TonesTab() {
  const [lang, setLang] = useState<Lang>('thai');
  const [input, setInput] = useState('');
  // null = "track the last word typed"; a number pins a specific word after
  // the user clicks it in the TryIt playback, until they type again.
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  // Which merged table cells (keyed below, e.g. "mid-high-dead") are
  // currently split apart into their separate class/environment cells.
  // Split to begin with: the classes sharing a cell land on the same tone
  // but not on the same example word, and the example is the part a reader
  // checks themselves against.
  const [splitCells, setSplitCells] = useState<Set<string>>(
    () => new Set<string>([...THAI_SPLIT_IDS, ...NORTHERN_SPLIT_IDS]),
  );
  // Split/merge every id in the group together, so the button reflects a
  // single all-or-nothing state rather than each cell's own toggle.
  const toggleAll = (ids: readonly string[]) => setSplitCells(prev => {
    const allSplit = ids.every(id => prev.has(id));
    const next = new Set(prev);
    ids.forEach(id => (allSplit ? next.delete(id) : next.add(id)));
    return next;
  });

  const wordMatches = useMemo(() => [...input.matchAll(/\S+/g)], [input]);
  const selectedIndex = selectedIdx !== null && selectedIdx < wordMatches.length ? selectedIdx : wordMatches.length - 1;
  const selectedWord = wordMatches[selectedIndex]?.[0] ?? '';

  const analysis = useMemo(() => (selectedWord ? analyzeSyllable(selectedWord) : null), [selectedWord]);
  const standardMatch: CellMatch | null = useMemo(
    () => (analysis ? standardCellMatch(analysis) : selectedWord ? { key: null, tone: 'Mid', note: 'Couldn’t parse this as a single syllable — it may be a multi-syllable word.' } : null),
    [analysis, selectedWord]
  );
  const northernMatch: NorthernCellMatch | null = useMemo(
    () => (analysis ? northernCellMatch(analysis) : selectedWord ? { cellKey: null, code: null, note: 'Couldn’t parse this as a single syllable — it may be a multi-syllable word.' } : null),
    [analysis, selectedWord]
  );

  // Typing anything new snaps the selection back to tracking the last word.
  const handleInput = (v: string) => { setInput(v); setSelectedIdx(null); };

  // The merged Dead cell folds 4 combinations (Mid/High × dead-short/dead-long)
  // into one key ('mid+high-dead') since they all land on Low tone — split
  // apart, each of the 4 needs picking out individually. Mai Ek (มาร์กเอก) always
  // counts as "long" here regardless of the syllable's actual vowel length,
  // matching the column header "Dead & Long / Mai Ek", which folds both
  // together.
  const deadMatch = (klass: 'mid' | 'high', col: 'short' | 'long') =>
    standardMatch?.key === 'mid+high-dead' &&
    analysis?.klass === klass &&
    (analysis?.mark === 'ek' ? col === 'long' : analysis?.vowelLength === col);

  return (
    <div id="tab-tones">
      <div className={styles.langToggle}>
        <button
          className={`${styles.langBtn} ${lang === 'thai' ? styles.langBtnActive : ''}`}
          onClick={() => setLang('thai')}
        >
          Thai ไทย · 5 tones
        </button>
        <button
          className={`${styles.langBtn} ${lang === 'northern' ? styles.langBtnActive : ''}`}
          onClick={() => setLang('northern')}
        >
          Northern Thai คำเมือง · 6 tones
        </button>
      </div>

      {lang === 'thai' && (
      <div className="tone-rules">
        <h2>Tone Calculation</h2>
        <p style={{ marginBottom: 10 }}>
          Start with the <strong>initial consonant's class</strong>, then follow these steps:
        </p>

        <div className={styles.stepBox}>
          <strong>Step 1 — Is there a tone mark?</strong><br />
          → Yes: check the tone mark table below for the mark + class.<br /><br />
          <strong>Step 2 — No tone mark, live syllable:</strong><br />
          → <strong style={{ color: '#2563eb' }}>Mid</strong> or{' '}
          <strong style={{ color: '#dc2626' }}>Low</strong> class → <strong>mid tone</strong><br />
          → <strong style={{ color: '#16a34a' }}>High</strong> class → <strong>rising tone</strong>
          <br /><br />
          <strong>Step 3 — No tone mark, dead syllable:</strong><br />
          → <strong style={{ color: '#2563eb' }}>Mid</strong> or{' '}
          <strong style={{ color: '#16a34a' }}>High</strong> class → <strong>low tone</strong>{' '}
          (short or long vowel, doesn't matter)<br />
          → <strong style={{ color: '#dc2626' }}>Low</strong> class + short vowel →{' '}
          <strong>high tone</strong><br />
          → <strong style={{ color: '#dc2626' }}>Low</strong> class + long vowel →{' '}
          <strong>falling tone</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ margin: 0 }}><strong>Unified tone table</strong></p>
          <SplitAllButton
            expanded={THAI_SPLIT_IDS.every(id => splitCells.has(id))}
            onClick={() => toggleAll(THAI_SPLIT_IDS)}
          />
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.toneTable}>
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '21.75%' }} />
              <col style={{ width: '21.75%' }} />
              <col style={{ width: '21.75%' }} />
              <col style={{ width: '21.75%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Class</th>
                <th>
                  Live
                  <span className={styles.headerHint}>
                    <span className={styles.openVowelTag}>OPEN LONG VOWEL</span>
                    <br />
                    or ends with <span className="sonorant-tag">SONORANT</span>
                  </span>
                </th>
                <th>Dead &amp; Short</th>
                <th>
                  Dead &amp; Long<br />
                  <span className={styles.headerMarkRow}>
                    Mai Ek <ToneGlyph name="Low" color="#fff" fontSize="1.2rem" />
                  </span>
                </th>
                <th>
                  <span className={styles.headerMarkRow}>
                    Mai Tho <ToneGlyph name="Falling" color="#fff" fontSize="1.2rem" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.cellMid}>Mid</td>
                <td>
                  <ToneCard tone={thaiTone('Mid')} highlighted={standardMatch?.key === 'mid-live'} />
                </td>
                {splitCells.has('mid-high-dead') ? (
                  <>
                    <td>
                      <ToneCard
                        tone={thaiTone('Low')} example="ตก" exampleGloss="tòk · to fall"
                        highlighted={deadMatch('mid', 'short')}
                      />
                    </td>
                    <td>
                      <ToneCard
                        tone={thaiTone('Low')} example="จาก" exampleGloss="tɕàːk · from"
                        highlighted={deadMatch('mid', 'long')}
                      />
                    </td>
                  </>
                ) : (
                  <SplitTd rowSpan={2} colSpan={2}>
                    <ToneCard
                      tone={thaiTone('Low')} example="ถูก" exampleGloss="tʰùːk · correct"
                      highlighted={standardMatch?.key === 'mid+high-dead'}
                    />
                  </SplitTd>
                )}
                {splitCells.has('mid-high-maitho') ? (
                  <SplitTd>
                    <ToneCard
                      tone={thaiTone('Falling')} example="ป้า" exampleGloss="pâː · aunt"
                      highlighted={standardMatch?.key === 'mid+high-maitho' && analysis?.klass === 'mid'}
                    />
                  </SplitTd>
                ) : (
                  <SplitTd rowSpan={2}>
                    <ToneCard
                      tone={thaiTone('Falling')} example="ป้า" exampleGloss="pâː · aunt"
                      highlighted={standardMatch?.key === 'mid+high-maitho'}
                    />
                  </SplitTd>
                )}
              </tr>
              <tr>
                <td className={styles.cellHigh}>High</td>
                <td>
                  <ToneCard tone={thaiTone('Rising')} highlighted={standardMatch?.key === 'high-live'} />
                </td>
                {splitCells.has('mid-high-dead') && (
                  <>
                    <td>
                      <ToneCard
                        tone={thaiTone('Low')} example="ผัก" exampleGloss="pʰàk · vegetable"
                        highlighted={deadMatch('high', 'short')}
                      />
                    </td>
                    <td>
                      <ToneCard
                        tone={thaiTone('Low')} example="ถูก" exampleGloss="tʰùːk · correct"
                        highlighted={deadMatch('high', 'long')}
                      />
                    </td>
                  </>
                )}
                {splitCells.has('mid-high-maitho') && (
                  <SplitTd>
                    <ToneCard
                      tone={thaiTone('Falling')} example="ข้าว" exampleGloss="kʰâːw · rice"
                      highlighted={standardMatch?.key === 'mid+high-maitho' && analysis?.klass === 'high'}
                    />
                  </SplitTd>
                )}
              </tr>
              <tr>
                <td className={styles.cellLow}>Low</td>
                <td>
                  <ToneCard
                    tone={thaiTone('Mid')} example="มา" exampleGloss="maː · to come"
                    highlighted={standardMatch?.key === 'low-live'}
                  />
                </td>
                <td>
                  <ToneCard
                    tone={thaiTone('High')} example="นก" exampleGloss="nók · bird"
                    highlighted={standardMatch?.key === 'low-deadshort'}
                  />
                </td>
                <td>
                  <ToneCard
                    tone={thaiTone('Falling')} example="มาก" exampleGloss="mâːk · much"
                    highlighted={standardMatch?.key === 'low-deadlong'}
                  />
                </td>
                <td>
                  <ToneCard tone={thaiTone('High')} highlighted={standardMatch?.key === 'low-maitho'} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: '0.83rem', color: '#666', marginTop: 10 }}>
          Mid class has two more marks of its own:{' '}
          <MarkGlyph mark="◌๊" color={TONE_COLOR.High} fontSize="1.1rem" /> → High and{' '}
          <MarkGlyph mark="◌๋" color={TONE_COLOR.Rising} fontSize="1.1rem" /> → Rising.
        </p>
        <p style={{ fontSize: '0.83rem', color: '#666', marginTop: 8 }}>
          Mid and high class are one register: the Live column is the only place they part —
          every other cell gives them the same tone.
        </p>
        <p style={{ fontSize: '0.83rem', color: '#666', marginTop: 8 }}>
          Dead syllables add no tones of their own — every dead cell repeats one already in its
          row. Mid and high class give Low in both dead columns. Low class is the only one where
          the two differ: High when the vowel is short (the same cell as Mai Tho), Falling when
          it is long.
        </p>

        <TryIt
          input={input} onInput={handleInput}
          selectedIndex={selectedIndex} onSelectWord={setSelectedIdx}
          note={standardMatch?.note}
        />
      </div>
      )}

      {lang === 'northern' && (
      <div className="tone-rules">
        <h2>Tone Box — Northern Thai คำเมือง (Chiang Mai)</h2>
        <p style={{ fontSize: '0.83rem', marginBottom: 10 }}>
          Same three consonant classes as Standard Thai, but they land on a different
          6-tone system, and the tone depends on the syllable environment (below) rather
          than a fixed per-class rule. Cells show the Gedney box category that produces
          each tone — click one for its contour.
        </p>
        <p style={{ fontSize: '0.83rem', marginBottom: 14 }}>
          No ๊ or ๋ columns — those two marks are Standard Thai-only inventions, layered on
          top of the older A/B/C/dead system Northern's tones come from, and this source
          doesn't cover what tone they'd take here. Mai Ek isn't its own column either —
          it always matches an unmarked dead syllable with a long vowel, so the two are
          merged below.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ margin: 0 }}>
            <strong>Tone box</strong> <span style={{ fontWeight: 400, color: '#666' }}>(Gedney 1999)</span>
          </p>
          <SplitAllButton
            expanded={NORTHERN_SPLIT_IDS.every(id => splitCells.has(id))}
            onClick={() => toggleAll(NORTHERN_SPLIT_IDS)}
          />
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.toneTable}>
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '21.75%' }} />
              <col style={{ width: '21.75%' }} />
              <col style={{ width: '21.75%' }} />
              <col style={{ width: '21.75%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Class</th>
                <th>Normal</th>
                <th>Dead &amp; Short</th>
                <th>
                  Dead &amp; Long<br />
                  <span className={styles.headerMarkRow}>
                    Mai Ek <MarkGlyph mark="่" color="#fff" title="Mai Ek" fontSize="1.2rem" />
                  </span>
                </th>
                <th>
                  <span className={styles.headerMarkRow}>
                    Mai Tho <MarkGlyph mark="้" color="#fff" title="Mai Tho" fontSize="1.2rem" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.cellMid}>Mid</td>
                <td>
                  <ToneBoxCell
                    outcomes={NORTHERN_TONE_BOX[0].cells[0]}
                    highlightCode={northernMatch?.cellKey === 'mid-normal' ? northernMatch.code : null}
                  />
                </td>
                {(['deadshort', 'deadlong', 'maitho'] as const).map((col, i) => {
                  const id = `mid-high-${col}`;
                  const cellKey = `high+mid-${col}`;
                  // Merged, the spanning cell is drawn from the High entry —
                  // that is the row carrying the example word for these three.
                  return splitCells.has(id) ? (
                    <SplitTd key={id}>
                      <ToneBoxCell
                        outcomes={NORTHERN_TONE_BOX[0].cells[i + 1]}
                        matched={northernMatch?.cellKey === cellKey && analysis?.klass === 'mid'}
                      />
                    </SplitTd>
                  ) : (
                    <SplitTd key={id} rowSpan={2}>
                      <ToneBoxCell outcomes={NORTHERN_TONE_BOX[1].cells[i + 1]} matched={northernMatch?.cellKey === cellKey} />
                    </SplitTd>
                  );
                })}
              </tr>
              <tr>
                <td className={styles.cellHigh}>High</td>
                <td>
                  <ToneBoxCell
                    outcomes={NORTHERN_TONE_BOX[1].cells[0]}
                    matched={northernMatch?.cellKey === 'high-normal'}
                    highlightCode={northernMatch?.cellKey === 'high-normal' ? northernMatch.code : null}
                  />
                </td>
                {(['deadshort', 'deadlong', 'maitho'] as const).map((col, i) => {
                  const id = `mid-high-${col}`;
                  const cellKey = `high+mid-${col}`;
                  return splitCells.has(id) && (
                    <SplitTd key={id}>
                      <ToneBoxCell
                        outcomes={NORTHERN_TONE_BOX[1].cells[i + 1]}
                        matched={northernMatch?.cellKey === cellKey && analysis?.klass === 'high'}
                      />
                    </SplitTd>
                  );
                })}
              </tr>
              <tr>
                <td className={styles.cellLow}>Low</td>
                {(['low-normal', 'low-deadshort', 'low-deadlong', 'low-maitho'] as const).map((key, i) => (
                  <td key={key}>
                    <ToneBoxCell outcomes={NORTHERN_TONE_BOX[2].cells[i]} matched={northernMatch?.cellKey === key} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: '0.83rem', color: '#666', marginTop: 10 }}>
          Source: Gedney (1999), as tabulated in Wikipedia's{' '}
          <a href="https://en.wikipedia.org/wiki/Lanna_language#Tones" target="_blank" rel="noreferrer">
            Lanna language
          </a>{' '}
          article. Dead syllables don't add new tones — every cell above reuses one of
          the 6 live-syllable tones.
        </p>

        <TryIt
          input={input} onInput={handleInput}
          selectedIndex={selectedIndex} onSelectWord={setSelectedIdx}
          note={northernMatch?.note}
        />
      </div>
      )}

      <div className="tone-rules" style={{ marginTop: 24 }}>
        <p style={{ fontSize: '0.83rem', margin: '0 0 10px 0' }}>
          <strong>Number of unique tones: {lang === 'thai' ? THAI_TONES.length : NORTHERN_TONES.length}</strong>
        </p>
        <div className={styles.grid}>
          {(lang === 'thai' ? THAI_TONES : NORTHERN_TONES).map((t, i) => (
            <ToneCard key={i} tone={t} compact={lang === 'northern'} />
          ))}
        </div>
        {/* Under the cards, not above them: every sentence here points at
            something printed on a card, so it only reads as an explanation
            once the reader has the cards in front of them. */}
        {lang === 'thai' && (
        <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 14px 0', lineHeight: 1.9 }}>
          <Term word="เสียง" ipa="sǐaŋ" />: sound, ex:{' '}
          <Term word="เสียงเอก" ipa="sǐaŋ.èːk" note="Low tone" /><br />
          <Term word="ไม้" ipa="máj" />: stick, ex:{' '}
          <Term word="ไม้เอก" ipa="máj.èːk" note="Low tone mark" />
        </p>
        )}
        {lang === 'northern' && (
        <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 14px 0' }}>
          Card names are Gedney box codes — which class + environment combinations
          (see the table above) produce that tone.
        </p>
        )}
        {lang === 'thai' && <PracticeSentence />}
      </div>

      {lang === 'thai' && <VowelToneMatrix />}
    </div>
  );
}
