import type { ToneEntry } from '../data/tones';
import styles from './ToneCard.module.css';

/** `example`/`exampleGloss` override the entry's own — a single ToneEntry
 *  gets reused across every class + environment that lands on its tone, but
 *  the entry can only carry one baked-in example word, which is only ever
 *  correct for one of those combinations. Callers embedding the same tone in
 *  a specific class/environment cell should pass a word that actually fits
 *  that cell, rather than defaulting to whichever combination the entry's
 *  own example happened to be written for. */
export function ToneCard({ tone, example, exampleGloss }: { tone: ToneEntry; example?: string; exampleGloss?: string }) {
  const word = example ?? tone.example;
  const gloss = exampleGloss ?? tone.exampleGloss;
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <strong
          className={styles.label}
          style={{ color: tone.color, cursor: tone.nameIpa ? 'help' : undefined }}
          data-tooltip={tone.nameIpa}
        >
          {tone.name}
          {tone.nameEn && <span className={styles.nameEn}> ({tone.nameEn})</span>}
        </strong>
      </div>
      <svg viewBox="0 0 160 80" preserveAspectRatio="none" className={styles.svg}>
        {[10, 25, 40, 55, 70].map(y => (
          <line key={y} x1="12" y1={y} x2="160" y2={y} stroke="#eee" strokeDasharray="2,3" />
        ))}
        <text x="0" y="13" fontSize="8" fill="#bbb">5</text>
        <text x="0" y="43" fontSize="8" fill="#bbb">3</text>
        <text x="0" y="73" fontSize="8" fill="#bbb">1</text>
        <path d={tone.path} stroke={tone.color} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className={styles.example}>
        <span
          className={`${styles.exampleWord} ${styles.label}`}
          style={{ cursor: gloss ? 'help' : undefined }}
          data-tooltip={gloss}
        >
          {word}
        </span>
        <span className={styles.ipa}>{tone.ipa}</span>
      </div>
    </div>
  );
}
