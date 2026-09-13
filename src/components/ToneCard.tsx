import type { ToneEntry } from '../data/tones';
import styles from './ToneCard.module.css';

/** Northern Thai's descriptive names run long (e.g. "High rising-falling
 *  (glottalized)") — too long for the caption to stay one line at card
 *  width. The parenthetical is the least load-bearing part (a phonation
 *  detail, not the contour shape the caption is naming), so it moves to a
 *  tooltip instead of wrapping the caption onto a second line. */
function splitCaption(nameEn: string): { short: string; full?: string } {
  const match = nameEn.match(/^(.*?)\s*(\(.+\))$/);
  return match ? { short: match[1], full: nameEn } : { short: nameEn };
}

/** `example`/`exampleGloss` override the entry's own — a single ToneEntry
 *  gets reused across every class + environment that lands on its tone, but
 *  the entry can only carry one baked-in example word, which is only ever
 *  correct for one of those combinations. Callers embedding the same tone in
 *  a specific class/environment cell should pass a word that actually fits
 *  that cell, rather than defaulting to whichever combination the entry's
 *  own example happened to be written for. */
export function ToneCard({
  tone, example, exampleGloss, highlighted, compact,
}: { tone: ToneEntry; example?: string; exampleGloss?: string; highlighted?: boolean; compact?: boolean }) {
  const word = example ?? tone.example;
  const gloss = exampleGloss ?? tone.exampleGloss;
  const caption = tone.nameEn ? splitCaption(tone.nameEn) : null;
  return (
    <div className={`${styles.card} ${compact ? styles.compact : ''} ${highlighted ? styles.cardMatch : ''}`}>
      {/* Absolutely positioned against the card itself, not the title row —
         a flex-end position still moves with however long the title runs,
         which for a single-bar glyph like Mid tone's ˧ read as a stray
         fragment rather than a fixed corner tag. The badge background keeps
         a single thin bar visible instead of nearly invisible. */}
      <span
        className={`${styles.cornerIpa} ${styles.label}`}
        style={{ cursor: 'help' }}
        data-tooltip={`Chao tone letter · pitch ${tone.chao} (1=low, 5=high)`}
      >
        {tone.ipa}
      </span>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            {/* {tone.name}{tone.mark} sit in the same text run with nothing
               between them — the mark then has the name's own last
               character to combine onto, same as in ordinary Thai prose, so
               it shapes and positions correctly without the dotted-circle/
               orphaned-mark handling standalone mark glyphs need elsewhere
               in this app (there, no base character precedes the mark). */}
            <span className={styles.thaiTitle} style={{ color: tone.color }}>
              {tone.name}{tone.mark}
            </span>
            {tone.nameIpa && (
              <span className={styles.titleIpa} style={{ color: tone.color }}>
                {tone.nameIpa}
              </span>
            )}
          </div>
          {caption && (
            <div
              className={`${styles.engCaption} ${caption.full ? styles.label : ''}`}
              style={{ cursor: caption.full ? 'help' : undefined }}
              data-tooltip={caption.full}
            >
              {caption.short} tone
            </div>
          )}
        </div>
      </div>
      <div className={styles.chart}>
        <svg viewBox="0 0 160 80" preserveAspectRatio="none" className={styles.svg}>
          {[10, 25, 40, 55, 70].map(y => (
            <line key={y} x1="12" y1={y} x2="160" y2={y} stroke="#eee" strokeDasharray="2,3" />
          ))}
          <path d={tone.path} stroke={tone.color} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* Plain HTML, not SVG text — the chart stretches non-uniformly to
           fill whatever width the card gets (viewBox 160×80 vs. an actual
           box that's rarely exactly 2:1), which skews vector text into
           visibly warped digits. These sit outside that coordinate system
           so they stay undistorted at any card width. */}
        <span className={styles.axisLabel} style={{ top: '16%' }}>5</span>
        <span className={styles.axisLabel} style={{ top: '54%' }}>3</span>
        <span className={styles.axisLabel} style={{ top: '91%' }}>1</span>
      </div>
      <div className={styles.example}>
        <span
          className={`${styles.exampleWord} ${styles.label}`}
          style={{ cursor: gloss ? 'help' : undefined }}
          data-tooltip={gloss}
        >
          {word}
        </span>
      </div>
    </div>
  );
}
