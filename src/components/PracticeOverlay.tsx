import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lesson } from '../data/lessons';
import { Keyboard } from './Keyboard';
import styles from './PracticeOverlay.module.css';

interface PracticeOverlayProps {
  lessons: Lesson[];
  initialLessonId: number;
  title: string;
  onExit: () => void;
  onLessonChange?: (lesson: Lesson) => void;
}

interface DrillStats {
  correctChars: number;
  totalChars: number;
  mistakes: number;
  elapsedMs: number;
}

export function PracticeOverlay({ lessons, initialLessonId, title, onExit, onLessonChange }: PracticeOverlayProps) {
  const [lessonId, setLessonId] = useState(initialLessonId);
  const lesson = lessons.find(l => l.id === lessonId) ?? lessons[0];

  // Which line we're on (0-indexed) and how many chars typed of it.
  const [lineIdx, setLineIdx] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stats, setStats] = useState<DrillStats>({ correctChars: 0, totalChars: 0, mistakes: 0, elapsedMs: 0 });
  const [mistakeMap, setMistakeMap] = useState<Set<string>>(new Set()); // keys: `${lineIdx}:${i}`

  const lines = lesson.lines;
  const currentLine = lines[lineIdx] ?? '';
  const finished = lineIdx >= lines.length;

  useEffect(() => {
    // Reset when lesson changes
    setLineIdx(0);
    setCursor(0);
    setStartedAt(null);
    setStats({ correctChars: 0, totalChars: 0, mistakes: 0, elapsedMs: 0 });
    setMistakeMap(new Set());
    onLessonChange?.(lesson);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Keyboard handler
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, [lessonId, lineIdx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit]);

  function onInput(e: React.FormEvent<HTMLTextAreaElement>) {
    if (finished) return;
    const target = e.currentTarget;
    const typed = target.value;
    // Only the last-typed character matters. We compare character-by-character.
    // Reset the textarea so it doesn't accumulate (keeps layout simple for combining marks).
    if (typed.length === 0) return;
    if (!startedAt) setStartedAt(Date.now());

    // Accept all typed chars, advance the cursor by however many match consecutively.
    let c = cursor;
    let mistakesAdded = 0;
    let correctAdded = 0;
    const newMistakes = new Set(mistakeMap);

    for (const ch of typed) {
      const target = currentLine[c];
      if (target === undefined) break;
      if (ch === target) {
        correctAdded++;
        c++;
      } else {
        mistakesAdded++;
        newMistakes.add(`${lineIdx}:${c}`);
        // Don't advance cursor — force retype
        break;
      }
    }

    setStats(s => ({
      ...s,
      correctChars: s.correctChars + correctAdded,
      totalChars: s.totalChars + correctAdded + mistakesAdded,
      mistakes: s.mistakes + mistakesAdded,
      elapsedMs: startedAt ? Date.now() - startedAt : 0,
    }));
    setMistakeMap(newMistakes);

    // Line complete?
    if (c >= currentLine.length) {
      setLineIdx(i => i + 1);
      setCursor(0);
    } else {
      setCursor(c);
    }

    // Clear textarea so the next keypress is fresh
    target.value = '';
  }

  // Compute WPM: chars-per-minute / 5 (standard typing speed metric).
  const wpm = useMemo(() => {
    if (!startedAt || stats.correctChars === 0) return 0;
    const minutes = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
    return Math.round((stats.correctChars / 5) / minutes);
  }, [stats.correctChars, startedAt, stats.elapsedMs]);

  const accuracy = stats.totalChars === 0
    ? 100
    : Math.round((stats.correctChars / stats.totalChars) * 100);

  // Next character to highlight on keyboard
  const nextChar = !finished ? currentLine[cursor] : null;

  return (
    <div className={styles.overlay}>
      <div className={styles.headerBar}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.sub}>{lesson.instruction}</p>
        </div>
        <button className={styles.exit} onClick={onExit} title="Exit (Esc)">
          <span>Exit</span>
          <kbd className={styles.kbd}>Esc</kbd>
        </button>
      </div>

      {lessons.length > 1 && (
        <div className={styles.tabs}>
          {lessons.map(l => (
            <button
              key={l.id}
              className={`${styles.tab} ${l.id === lessonId ? styles.tabActive : ''}`}
              onClick={() => setLessonId(l.id)}
            >
              {lessonKindIcon(l.kind)} {capitalize(l.title.split(' · ')[1] ?? l.title)} · L{l.id}
            </button>
          ))}
        </div>
      )}

      <div className={styles.stats}>
        <span>Line <strong>{Math.min(lineIdx + 1, lines.length)}</strong>/{lines.length}</span>
        <span>·</span>
        <span>WPM <strong>{wpm}</strong></span>
        <span>·</span>
        <span>Accuracy <strong>{accuracy}%</strong></span>
        <span>·</span>
        <span>Mistakes <strong>{stats.mistakes}</strong></span>
      </div>

      <Keyboard highlightedZones={lesson.zones} activeChar={nextChar} />

      <div className={styles.drillArea}>
        {finished ? (
          <div className={styles.done}>
            <p className={styles.doneTitle}>🎉 Done!</p>
            <p>WPM {wpm} · Accuracy {accuracy}% · {stats.mistakes} mistakes</p>
            <button
              className={styles.retry}
              onClick={() => {
                setLineIdx(0); setCursor(0); setStartedAt(null);
                setStats({ correctChars: 0, totalChars: 0, mistakes: 0, elapsedMs: 0 });
                setMistakeMap(new Set());
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className={styles.lines}>
            {lines.map((ln, li) => (
              <DrillLine
                key={li}
                text={ln}
                lineIdx={li}
                cursor={li === lineIdx ? cursor : li < lineIdx ? ln.length : 0}
                active={li === lineIdx}
                done={li < lineIdx}
                mistakeMap={mistakeMap}
                isolateChars={lesson.kind === 'drill'}
              />
            ))}
          </div>
        )}

        {/* Hidden textarea that captures input (including Thai IME). Keeps focus for keystroke capture. */}
        <textarea
          ref={inputRef}
          className={styles.input}
          onInput={onInput}
          onBlur={e => {
            const t = e.currentTarget;
            setTimeout(() => t.focus(), 0);
          }}
          autoFocus
          aria-label="Typing practice input"
        />
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function lessonKindIcon(kind: Lesson['kind']): string {
  switch (kind) {
    case 'drill': return '🎯';
    case 'words': return '📝';
    case 'review': return '📚';
    case 'pangram': return '🏁';
  }
}

// Thai combining marks (tone marks, above/below vowels) and SARA AM. These
// render "on top of" a base consonant in Thai fonts, so when they appear
// in the drill text without a consonant immediately before them, the glyph
// visually bleeds onto the preceding character — which breaks the per-char
// cursor highlight (yellow background ends up in empty space).
const COMBINING_RE = /[\u0E31\u0E33-\u0E3A\u0E47-\u0E4E]/;
function isThaiConsonant(ch: string): boolean {
  if (!ch) return false;
  const code = ch.codePointAt(0)!;
  return code >= 0x0E01 && code <= 0x0E2E;
}

function DrillLine({ text, lineIdx, cursor, active, done, mistakeMap, isolateChars }: {
  text: string;
  lineIdx: number;
  cursor: number;
  active: boolean;
  done: boolean;
  mistakeMap: Set<string>;
  /** When true, every combining mark in the line gets an explicit ◌ base
   * so its glyph has stable bounds and the cursor highlight aligns with
   * what the user sees — even when a consonant precedes it. Enabled for
   * drill lines (key-sequence practice). Disabled for word lines so real
   * Thai words like `คำ` render naturally. */
  isolateChars?: boolean;
}) {
  const chars = text.split('');
  return (
    <div className={`${styles.line} ${active ? styles.lineActive : ''} ${done ? styles.lineDone : ''}`}>
      {chars.map((ch, i) => {
        const isDone = done || i < cursor;
        const isCursor = active && i === cursor;
        // Only show "mistake" styling if the cursor is *currently* on that
        // position (i.e., the user is stuck there). Once the cursor advances
        // past it, the character is treated as done (green) and the total
        // mistake count in the stats bar is the historical record.
        const isMistake = isCursor && mistakeMap.has(`${lineIdx}:${i}`);
        const cls = [
          styles.ch,
          isDone ? styles.chDone : '',
          isCursor ? styles.chCursor : '',
          isMistake ? styles.chMistake : '',
        ].filter(Boolean).join(' ');
        const isComb = COMBINING_RE.test(ch);
        const prev = i > 0 ? chars[i - 1] : '';
        const needsBase = isComb && (isolateChars || !isThaiConsonant(prev));
        const display = ch === ' ' ? '\u00A0' : (needsBase ? '◌' + ch : ch);
        return <span key={i} className={cls}>{display}</span>;
      })}
    </div>
  );
}
