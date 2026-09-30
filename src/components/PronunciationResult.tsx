import type { Assessment } from '../lib/pronunciation';
import styles from './PronunciationResult.module.css';

/** A take's pronunciation check, from sending it to the result. */
export type Check = { status: 'pending' } | { status: 'done'; result: Assessment } | { status: 'error'; message: string };

/** Azure's own bands for its 0–100 scores. */
const band = (score: number) => (score >= 80 ? styles.good : score >= 60 ? styles.fair : styles.poor);

/** The pronunciation check's scores: the overall ones, then each word with
 *  the score of each of its sounds (where the service names them). */
export function PronunciationResult({
  check,
  onAgain,
  showHeard = false,
}: {
  check: Check;
  onAgain?: () => void;
  /** Also print the text the service recognised. */
  showHeard?: boolean;
}) {
  if (check.status === 'pending') return <p className={styles.checkNote}>Checking pronunciation…</p>;
  if (check.status === 'error') {
    return (
      <p className={styles.checkNote}>
        Pronunciation check: {check.message}{' '}
        {onAgain && (
          <button type="button" className={styles.again} onClick={onAgain}>
            Try again
          </button>
        )}
      </p>
    );
  }
  const r = check.result;
  const totals: [string, number | undefined][] = [
    ['Overall', r.pronunciation],
    ['Accuracy', r.accuracy],
    ['Fluency', r.fluency],
    ['Completeness', r.completeness],
    ['Prosody', r.prosody],
  ];
  return (
    <div className={styles.check}>
      <div className={styles.checkTotals}>
        <span className={styles.label}>Pronunciation</span>
        {totals.map(([name, v]) =>
          v === undefined ? null : (
            <span key={name} className={styles.total}>
              {name} <b className={band(v)}>{Math.round(v)}</b>
            </span>
          ),
        )}
        {onAgain && (
          <button type="button" className={styles.again} onClick={onAgain}>
            Check again
          </button>
        )}
      </div>
      {showHeard && r.text && (
        <p className={styles.heard}>
          <span className={styles.label}>Heard</span> {r.text}
        </p>
      )}
      <div className={styles.checkWords}>
        {r.words.map((w, i) => (
          <div
            key={i}
            className={`${styles.checkWord} ${w.error === 'Omission' ? styles.omitted : ''} ${w.error === 'Insertion' ? styles.inserted : ''}`}
            title={w.error === 'None' ? undefined : w.error}
          >
            <span className={`${styles.checkWordText} ${w.error === 'Omission' ? '' : band(w.score)}`}>
              {w.error === 'Insertion' ? '+' : ''}
              {w.word}
            </span>
            <span className={styles.checkWordScore}>{w.error === 'Omission' ? 'not said' : Math.round(w.score)}</span>
            {w.phonemes.some(p => p.phoneme) && (
              <span className={styles.phonemes}>
                {w.phonemes.filter(p => p.phoneme).map((p, j) => (
                  <span key={j} className={`${styles.phoneme} ${band(p.score)}`} title={`${Math.round(p.score)}/100`}>
                    {p.phoneme}
                  </span>
                ))}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
