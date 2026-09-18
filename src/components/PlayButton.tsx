import { speakThai } from '../lib/speak';
import styles from './PlayButton.module.css';

/** A small round play button that speaks one or more Thai words on click —
 *  for sections that want a single "play this" affordance rather than
 *  making every word individually clickable. Uses an SVG triangle rather
 *  than the ▶ character, which renders with uneven built-in padding across
 *  fonts and never sits centered in a circle. */
export function PlayButton({ words, title, size = 26, onWord }: {
  words: string | string[];
  title?: string;
  size?: number;
  /** Passed straight to speakThai — see there. */
  onWord?: (index: number | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => speakThai(words, onWord)}
      title={title ?? 'Play audio'}
      aria-label={title ?? 'Play audio'}
      className={styles.button}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
  );
}
