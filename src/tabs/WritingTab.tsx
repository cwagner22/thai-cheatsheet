import { useCallback, useMemo, useRef, useState } from 'react';
import { POEM, CONFUSABLES, MID_MNEMONIC, HIGH_MNEMONIC } from '../data/alphabetPoem';
import type { PoemEntry } from '../data/alphabetPoem';
import { CONSONANTS, MID_UNPAIRED_GROUPS, SONORANT_GROUPS, HIGH_LOW_PAIRS } from '../data/consonants';
import { LESSONS } from '../data/lessons';
import { COMMON_WORDS, WORD_BOX_COUNT } from '../data/commonWords';
import type { PracticeWord } from '../data/commonWords';
import { PracticeCanvas } from '../components/PracticeCanvas';
import styles from './WritingTab.module.css';

const CLASS_STYLE = { mid: styles.classMid, high: styles.classHigh, low: styles.classLow } as const;
const LETTER_SLOT_COUNT = 4;

function consonantFor(letter: string) {
  return CONSONANTS.find(c => c.letter === letter);
}

/** Break a poem phrase like "กอ ไก่ ในเล้า" into its space-separated word tokens. */
function poemWords(entry: PoemEntry): string[] {
  const full = entry.extThai ? `${entry.anchorThai} ${entry.extThai}` : entry.anchorThai;
  return full.split(/\s+/).filter(Boolean);
}

/**
 * Render the anchor phrase with both letter-naming parts bolded: the call-out
 * prefix (e.g. "กอ", "ขอ") and the object short-name (e.g. "ไก่", "ไข่").
 * For ก — "กอ เอ๋ย กอ ไก่" — both occurrences of the prefix get bolded while
 * the interjection "เอ๋ย" stays plain.
 */
function renderAnchor(anchorThai: string, name: string) {
  const firstSpace = anchorThai.indexOf(' ');
  const prefix = firstSpace === -1 ? anchorThai : anchorThai.slice(0, firstSpace);
  const tokens = anchorThai.split(/(\s+)/);
  return (
    <>
      {tokens.map((t, i) =>
        t === prefix || t === name ? (
          <span key={i} className={styles.poemName}>{t}</span>
        ) : (
          <span key={i}>{t}</span>
        )
      )}
    </>
  );
}

function clearCanvasesIn(container: Element | null) {
  if (!container) return;
  container.querySelectorAll('canvas').forEach(c => {
    const ctx = c.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
  });
}

function ClearButton({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const onClick = useCallback(() => clearCanvasesIn(containerRef.current), [containerRef]);
  return (
    <div className={styles.clearRow}>
      <button type="button" className={styles.clearBtn} onClick={onClick}>
        Clear
      </button>
    </div>
  );
}

/** Row of word canvases. `block` forces each slot to fill the row. */
function WordRow({ words, block = false }: { words: string[]; block?: boolean }) {
  return (
    <div className={styles.wordRow}>
      {words.map((w, i) => (
        <PracticeCanvas key={`${w}-${i}`} variant="word" guide={w} block={block} />
      ))}
    </div>
  );
}

const WORD_ROW_REPEAT = 3;

/** Stack of {@link WORD_ROW_REPEAT} identical word rows for repeated practice. */
function WordRowStack({ words, block = false }: { words: string[]; block?: boolean }) {
  return (
    <>
      {Array.from({ length: WORD_ROW_REPEAT }).map((_, rep) => (
        <WordRow key={rep} words={words} block={block} />
      ))}
    </>
  );
}

/**
 * For each practice word, show the word + romanization + gloss on the left
 * and {@link WORD_BOX_COUNT} tracing canvases on the right.
 */
function PracticeWordList({ words }: { words: PracticeWord[] }) {
  if (words.length === 0) return null;
  return (
    <div className={styles.practiceList}>
      {words.map(pw => (
        <div key={pw.word} className={styles.practiceItem}>
          <div className={styles.practiceGloss}>
            <span className={styles.practiceWordLine}>
              <span className={styles.practiceWord}>{pw.word}</span>
              <span className={styles.practiceRom}>{pw.rom}</span>
            </span>
            <span className={styles.practiceMeaning}>{pw.gloss}</span>
          </div>
          <div className={styles.practiceSlots}>
            {Array.from({ length: WORD_BOX_COUNT }).map((_, i) => (
              <PracticeCanvas key={i} variant="word" guide={pw.word} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LetterRow({ letter }: { letter: string }) {
  const entry = POEM.find(p => p.letter === letter);
  const meta = consonantFor(letter);
  const rowRef = useRef<HTMLDivElement>(null);
  if (!entry || !meta) return null;
  return (
    <div ref={rowRef} className={styles.row}>
      <div className={styles.letterHeader}>
        <span className={`${styles.classTag} ${CLASS_STYLE[meta.klass]}`}>{meta.klass}</span>
        <span className={styles.letterHeaderName}>{meta.name}</span>
        <span className={styles.letterHeaderRom}>/{meta.nameRom}/</span>
        <span className={styles.letterHeaderMeaning}>{meta.meaning}</span>
        {meta.rare && <span className={styles.rareFlag}>rare</span>}
        {meta.obsolete && <span className={styles.obsoleteFlag}>obsolete</span>}
      </div>
      <div className={styles.rowTop}>
        <div className={styles.rowLetter}>{entry.letter}</div>
        <div className={styles.slots}>
          {Array.from({ length: LETTER_SLOT_COUNT }).map((_, i) => (
            <PracticeCanvas key={i} guide={i === 0 ? entry.letter : undefined} />
          ))}
        </div>
      </div>
      <div className={styles.poemExample}>
        <div className={styles.poemExampleLine}>
          <span className={styles.poemExampleThai}>
            {renderAnchor(entry.anchorThai, meta.nameShort)}
            {entry.extThai && <span className={styles.poemExt}>{entry.extThai}</span>}
          </span>
          <span className={styles.poemExampleRom}>
            {entry.anchorRom}
            {entry.extRom && <span className={styles.poemRomExt}>{entry.extRom}</span>}
          </span>
        </div>
        <div className={styles.poemExampleMeaning}>{entry.meaning}</div>
      </div>
      <WordRowStack words={poemWords(entry)} />
      <PracticeWordList words={COMMON_WORDS[letter] ?? []} />
      <ClearButton containerRef={rowRef} />
    </div>
  );
}

function ConfusableCard({
  rows,
  displayOnly,
  note,
  practiceWords,
}: {
  rows: string[][];
  displayOnly?: string[];
  note: string;
  practiceWords?: { word: string; rom: string; gloss: string }[];
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const displayOnlySet = new Set(displayOnly ?? []);
  return (
    <div ref={cardRef} className={styles.confusable}>
      {rows.map((letters, i) => (
        <div key={i} className={styles.confusableLetters}>
          {letters.map(l => {
            const isDisplayOnly = displayOnlySet.has(l);
            return (
              <div key={l} className={styles.confusablePair}>
                <div className={styles.confusableLetter}>
                  {l}
                  {isDisplayOnly && <span className={styles.obsoleteLabel}>obsolete</span>}
                </div>
                <div className={styles.confusableSlots}>
                  {isDisplayOnly ? (
                    // Invisible placeholders preserve row alignment with the
                    // real practice letters next to this one.
                    <>
                      <div className={styles.slotPlaceholder} aria-hidden />
                      <div className={styles.slotPlaceholder} aria-hidden />
                      <div className={styles.slotPlaceholder} aria-hidden />
                    </>
                  ) : (
                    <>
                      <PracticeCanvas variant="compact" guide={l} />
                      <PracticeCanvas variant="compact" />
                      <PracticeCanvas variant="compact" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div className={styles.confusableNote}>{note}</div>
      {practiceWords && practiceWords.length > 0 && (
        <div className={styles.practiceList}>
          {practiceWords.map(pw => (
            <div key={pw.word} className={styles.practiceItem}>
              <div className={styles.practiceGloss}>
                <span className={styles.practiceWordLine}>
                  <span className={styles.practiceWord}>{pw.word}</span>
                  <span className={styles.practiceRom}>{pw.rom}</span>
                </span>
                <span className={styles.practiceMeaning}>{pw.gloss}</span>
              </div>
              <div className={styles.practiceSlots}>
                <PracticeCanvas variant="word" guide={pw.word} />
                <PracticeCanvas variant="word" guide={pw.word} />
                <PracticeCanvas variant="word" guide={pw.word} />
              </div>
            </div>
          ))}
        </div>
      )}
      <ClearButton containerRef={cardRef} />
    </div>
  );
}

function MnemonicCard({
  data,
  highlightClass,
}: {
  data: { thai: string; rom: string; meaning: string; keyLetters: string[]; words: string[] };
  highlightClass: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const keys = new Set(data.keyLetters);
  return (
    <div ref={cardRef} className={styles.mnemonicCard}>
      <div className={styles.mnemonicSentence}>
        {Array.from(data.thai).map((ch, i) =>
          keys.has(ch) ? (
            <span key={i} className={highlightClass}>{ch}</span>
          ) : (
            <span key={i}>{ch}</span>
          )
        )}
      </div>
      <div className={styles.mnemonicRom}>{data.rom}</div>
      <div className={styles.mnemonicMeaning}>{data.meaning}</div>
      <WordRowStack words={data.words} />
      <ClearButton containerRef={cardRef} />
    </div>
  );
}

function PangramLine({ line }: { line: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className={styles.pangramLineBlock}>
      <div className={styles.pangramLine}>{line}</div>
      <WordRowStack words={[line]} block />
      <ClearButton containerRef={ref} />
    </div>
  );
}

type AlphabetSort = 'alphabet' | 'class' | 'sound';

const CLASS_ORDER: Record<'mid' | 'high' | 'low', number> = { mid: 0, high: 1, low: 2 };

/**
 * Flat letter order used for the "By sound" sort. Mirrors the Consonants tab
 * grouping: mid unpaired → sonorants → high/low pairs (high first, then low
 * within each pair). Letters not found (shouldn't happen) sink to the end.
 */
const SOUND_ORDER: string[] = [
  ...MID_UNPAIRED_GROUPS.flatMap(g => g.letters.map(l => l.letter)),
  ...SONORANT_GROUPS.flatMap(g => g.letters.map(l => l.letter)),
  ...HIGH_LOW_PAIRS.flatMap(p => [...p.high, ...p.low].map(l => l.letter)),
];

export function WritingTab() {
  const tabRef = useRef<HTMLDivElement>(null);
  const pangramLessons = LESSONS.filter(l => l.kind === 'pangram');
  const clearAll = useCallback(() => clearCanvasesIn(tabRef.current), []);
  const [sort, setSort] = useState<AlphabetSort>('alphabet');

  const orderedPoem = useMemo(() => {
    if (sort === 'alphabet') return POEM;
    if (sort === 'sound') {
      return [...POEM].sort((a, b) => {
        const ia = SOUND_ORDER.indexOf(a.letter);
        const ib = SOUND_ORDER.indexOf(b.letter);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    }
    return [...POEM].sort((a, b) => {
      const ka = consonantFor(a.letter)?.klass;
      const kb = consonantFor(b.letter)?.klass;
      const da = ka ? CLASS_ORDER[ka] : 99;
      const db = kb ? CLASS_ORDER[kb] : 99;
      if (da !== db) return da - db;
      // Preserve alphabetical order within each class group.
      return POEM.indexOf(a) - POEM.indexOf(b);
    });
  }, [sort]);

  return (
    <div ref={tabRef} id="tab-writing">
      <div className={styles.videoBookmark}>
        <span className={styles.videoIcon} aria-hidden>▶</span>
        <span className={styles.videoLinks}>
          <strong>How to write the Thai alphabet:</strong>{' '}
          <a href="https://www.youtube.com/watch?v=pXV-MzO4Acs" target="_blank" rel="noopener">
            full walkthrough ↗
          </a>
          {' · '}
          <a href="https://www.youtube.com/watch?v=6Sm39k3CRFA" target="_blank" rel="noopener">
            shorter version ↗
          </a>
        </span>
      </div>
      <div className={styles.intro}>
        <p>
          Handwriting practice. Each letter row has four single-letter slots (first has a faded
          guide), three repeated word-slot rows for tracing the alphabet-song phrase, and three
          common words with four tracing boxes each. Use the{' '}
          <strong>Clear</strong> button on any card to wipe just its slots.
        </p>
        <p>
          Thai letters are drawn in <strong>one continuous stroke</strong>, usually starting from
          the head (small loop or hook). Go slow — muscle memory beats speed.
        </p>
      </div>

      <div className={styles.clearAllBar}>
        <button type="button" className={styles.clearAllBtn} onClick={clearAll}>
          Clear all
        </button>
      </div>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader}>Alphabet</div>
        <span className={styles.sectionSub}>
          {sort === 'alphabet' && '44 consonants in alphabetical order'}
          {sort === 'class' && '44 consonants grouped by class (mid → high → low)'}
          {sort === 'sound' && '44 consonants grouped by sound (same as Consonants tab)'}
        </span>
      </div>

      <div className={styles.sortToggle} role="radiogroup" aria-label="Sort alphabet">
        <button
          type="button"
          role="radio"
          aria-checked={sort === 'alphabet'}
          className={`${styles.sortBtn} ${sort === 'alphabet' ? styles.sortBtnActive : ''}`}
          onClick={() => setSort('alphabet')}
        >
          Alphabetical
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={sort === 'class'}
          className={`${styles.sortBtn} ${sort === 'class' ? styles.sortBtnActive : ''}`}
          onClick={() => setSort('class')}
        >
          By class
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={sort === 'sound'}
          className={`${styles.sortBtn} ${sort === 'sound' ? styles.sortBtnActive : ''}`}
          onClick={() => setSort('sound')}
        >
          By sound
        </button>
      </div>

      <div className={styles.list}>
        {orderedPoem.map(p => (
          <LetterRow key={p.letter} letter={p.letter} />
        ))}
      </div>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#7c3aed' }}>
          Confusable pairs
        </div>
        <span className={styles.sectionSub}>Letters that look almost the same</span>
      </div>

      <div className={styles.confusableGrid}>
        {CONFUSABLES.map(c => (
          <ConfusableCard
            key={c.rows.flat().join('')}
            rows={c.rows}
            displayOnly={c.displayOnly}
            note={c.note}
            practiceWords={c.practiceWords}
          />
        ))}
      </div>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#2563eb' }}>
          Class mnemonics
        </div>
        <span className={styles.sectionSub}>
          Two sentences — each uses only Mid-class or only High-class letters. Practice word by
          word.
        </span>
      </div>

      <MnemonicCard data={MID_MNEMONIC} highlightClass={styles.mnemonicHighlightMid} />
      <MnemonicCard data={HIGH_MNEMONIC} highlightClass={styles.mnemonicHighlight} />

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#16a34a' }}>
          Pangrams
        </div>
        <span className={styles.sectionSub}>
          Sentences that use every letter of the alphabet — trace phrase by phrase.
        </span>
      </div>

      {pangramLessons.map(lesson => (
        <div key={lesson.id} className={styles.pangramCard}>
          <div className={styles.pangramLabel}>{lesson.title}</div>
          {lesson.lines.map((line, i) => (
            <PangramLine key={i} line={line} />
          ))}
        </div>
      ))}
    </div>
  );
}
