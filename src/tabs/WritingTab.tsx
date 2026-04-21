import { POEM, CONFUSABLES, MID_MNEMONIC, HIGH_MNEMONIC } from '../data/alphabetPoem';
import type { PoemEntry } from '../data/alphabetPoem';
import { CONSONANTS } from '../data/consonants';
import { LESSONS } from '../data/lessons';
import { PracticeCanvas } from '../components/PracticeCanvas';
import styles from './WritingTab.module.css';

const CLASS_STYLE = { mid: styles.classMid, high: styles.classHigh, low: styles.classLow } as const;
const LETTER_SLOT_COUNT = 4;
const WORD_ROW_REPEAT = 3;

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

/** Row of word canvases. */
function WordRow({ words }: { words: string[] }) {
  return (
    <div className={styles.wordRow}>
      {words.map((w, i) => (
        <PracticeCanvas key={`${w}-${i}`} variant="word" guide={w} />
      ))}
    </div>
  );
}

/** Stack of {@link WORD_ROW_REPEAT} identical word rows for repeated practice. */
function WordRowStack({ words }: { words: string[] }) {
  return (
    <>
      {Array.from({ length: WORD_ROW_REPEAT }).map((_, rep) => (
        <WordRow key={rep} words={words} />
      ))}
    </>
  );
}

function LetterRow({ letter }: { letter: string }) {
  const entry = POEM.find(p => p.letter === letter);
  const meta = consonantFor(letter);
  if (!entry || !meta) return null;
  return (
    <div className={styles.row}>
      <div className={styles.rowTop}>
        <div className={styles.rowLetter}>{entry.letter}</div>
        <div className={styles.rowMeta}>
          <div className={styles.poemThai}>
            <span className={`${styles.classTag} ${CLASS_STYLE[meta.klass]}`}>{meta.klass}</span>
            {renderAnchor(entry.anchorThai, meta.nameShort)}
            {entry.extThai && <span className={styles.poemExt}>{entry.extThai}</span>}
            {meta.rare && <span className={styles.rareFlag}>rare</span>}
            {meta.obsolete && <span className={styles.obsoleteFlag}>obsolete</span>}
          </div>
          <div className={styles.poemRom}>
            {entry.anchorRom}
            {entry.extRom && <span className={styles.poemRomExt}>{entry.extRom}</span>}
          </div>
          <div className={styles.poemMeaning}>{entry.meaning}</div>
        </div>
        <div className={styles.slots}>
          {Array.from({ length: LETTER_SLOT_COUNT }).map((_, i) => (
            <PracticeCanvas key={i} guide={i === 0 ? entry.letter : undefined} />
          ))}
        </div>
      </div>
      <WordRowStack words={poemWords(entry)} />
    </div>
  );
}

function ConfusableCard({ letters, note }: { letters: string[]; note: string }) {
  return (
    <div className={styles.confusable}>
      <div className={styles.confusableLetters}>
        {letters.map(l => (
          <div key={l} className={styles.confusablePair}>
            <div className={styles.confusableLetter}>{l}</div>
            <div className={styles.confusableSlots}>
              <PracticeCanvas variant="compact" guide={l} />
              <PracticeCanvas variant="compact" />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.confusableNote}>{note}</div>
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
  const keys = new Set(data.keyLetters);
  return (
    <div className={styles.mnemonicCard}>
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
    </div>
  );
}

export function WritingTab() {
  const pangramLessons = LESSONS.filter(l => l.kind === 'pangram');

  return (
    <div id="tab-writing">
      <a
        className={styles.videoBookmark}
        href="https://www.youtube.com/watch?v=pXV-MzO4Acs"
        target="_blank"
        rel="noopener"
      >
        <span className={styles.videoIcon} aria-hidden>▶</span>
        <span>
          <strong>Video:</strong> how to write the Thai alphabet on YouTube
        </span>
        <span className={styles.videoArrow} aria-hidden>↗</span>
      </a>
      <div className={styles.intro}>
        <p>
          Handwriting practice. Each letter row has four single-letter slots (first has a faded
          guide) and a row of word slots for tracing the alphabet-song phrase. Hover a slot and tap{' '}
          <strong>×</strong> to clear just that one.
        </p>
        <p>
          Thai letters are drawn in <strong>one continuous stroke</strong>, usually starting from
          the head (small loop or hook). Go slow — muscle memory beats speed.
        </p>
      </div>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader}>Alphabet — ก to ฮ</div>
        <span className={styles.sectionSub}>44 consonants in alphabetical order</span>
      </div>

      <div className={styles.list}>
        {POEM.map(p => (
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
          <ConfusableCard key={c.letters.join('')} letters={c.letters} note={c.note} />
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
            <div key={i} className={styles.pangramLineBlock}>
              <div className={styles.pangramLine}>{line}</div>
              <WordRowStack words={line.split(/\s+/).filter(Boolean)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
