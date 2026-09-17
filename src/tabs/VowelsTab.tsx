import { useEffect, useRef, useState } from 'react';
import { VOWEL_SECTIONS } from '../data/vowels';
import type { VowelEntry, VowelSection } from '../data/vowels';
import { speakThai } from '../lib/speak';
import styles from './VowelsTab.module.css';

/** An example word: click to hear it, hover for the translation. The gloss
 *  lives in the tooltip rather than beside the word so the Thai itself is
 *  the only thing competing for attention in a card this small.
 *
 *  A tap both plays the word and flashes the gloss, because a touch screen
 *  has no hover to show it with and audio and a label don't collide — one
 *  gesture can carry both. `data-show` only paints on a device without
 *  hover (see the stylesheet), so a mouse click doesn't pin a bubble that
 *  hovering is already showing. */
const REVEAL_MS = 1800;

function ExampleWord({ word, gloss, className }: { word: string; gloss?: string; className: string }) {
  const [revealed, setRevealed] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const play = () => {
    speakThai(word);
    setRevealed(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setRevealed(false), REVEAL_MS);
  };

  return (
    <span
      className={`${className} ${styles.label}`}
      style={{ cursor: 'pointer' }}
      data-tooltip={gloss}
      data-show={revealed ? '' : undefined}
      onClick={play}
    >
      {word}
    </span>
  );
}

function VowelSide({ entry }: { entry?: VowelEntry }) {
  if (!entry) {
    return <div className="vowel-card-side" aria-hidden />;
  }
  return (
    <div className="vowel-card-side">
      <div className="vowel-form">{entry.form}</div>
      <span className="vowel-ipa">{entry.ipa}{entry.rare ? ' (rare)' : ''}</span>
      {entry.example && (
        <ExampleWord word={entry.example} gloss={entry.exampleGloss} className="vowel-example" />
      )}
      {entry.closed && (
        <div className={styles.closedBlock}>
          <span className={styles.closedLabel}>+ final</span>
          <div className={styles.closedForm}>{entry.closed}</div>
          {entry.closedExample && (
            <ExampleWord
              word={entry.closedExample}
              gloss={entry.closedGloss}
              className={styles.closedExample}
            />
          )}
          {entry.closedNote && (
            <span className={styles.closedNote}>{entry.closedNote}</span>
          )}
        </div>
      )}
      {entry.note && <span className={styles.note}>{entry.note}</span>}
    </div>
  );
}

function VowelSectionBlock({ section }: { section: VowelSection }) {
  return (
    <>
      <div className="class-section">
        <div className="class-header" style={{ background: section.color }}>
          {section.title}
        </div>
        {section.subtitle && <p className={styles.sectionSub}>{section.subtitle}</p>}
      </div>
      {!section.singleColumn && (
        <div className="vowel-grid-header">
          <div className="vowel-grid-header-card"><span>SHORT</span><span>LONG</span></div>
          <div className="vowel-grid-header-card"><span>SHORT</span><span>LONG</span></div>
          <div className="vowel-grid-header-card"><span>SHORT</span><span>LONG</span></div>
        </div>
      )}
      <div className="vowel-grid">
        {section.pairs.map((pair, i) => (
          <div key={i} className="vowel-card">
            <VowelSide entry={pair.short} />
            <VowelSide entry={pair.long} />
          </div>
        ))}
      </div>
    </>
  );
}

export function VowelsTab() {
  return (
    <div id="tab-vowels">
      <div className="tone-rules">
        <h2>Thai Vowels</h2>
        <p>
          9 basic pairs + 3 diphthong pairs + 3 special forms + 12 glide endings. The circle (◌)
          shows where the consonant goes.
        </p>
      </div>

      {VOWEL_SECTIONS.map((section, i) => (
        <VowelSectionBlock key={i} section={section} />
      ))}
    </div>
  );
}
