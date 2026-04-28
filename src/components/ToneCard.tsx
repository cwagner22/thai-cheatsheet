import type { ToneEntry } from '../data/tones';
import styles from './ToneCard.module.css';

export function ToneCard({ tone }: { tone: ToneEntry }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <strong style={{ color: tone.color }}>{tone.name}</strong>
        <span>
          {tone.thaiName && (
            <span className={styles.thaiName}>เสียง{tone.thaiName}</span>
          )}{' '}
          <span className={styles.code}>{tone.code}</span>
        </span>
      </div>
      <div className={styles.desc}>
        {tone.desc} · {tone.chao} <span className={styles.ipa}>{tone.ipa}</span>
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
        <span className={styles.exampleWord}>{tone.example}</span>{' '}
        <span className={styles.exampleGloss}>{tone.exampleGloss}</span>
      </div>
    </div>
  );
}
