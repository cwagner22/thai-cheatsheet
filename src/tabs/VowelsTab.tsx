import { VOWEL_SECTIONS } from '../data/vowels';
import type { VowelEntry, VowelSection } from '../data/vowels';
import styles from './VowelsTab.module.css';

function VowelSide({ entry }: { entry?: VowelEntry }) {
  if (!entry) {
    return <div className="vowel-card-side" aria-hidden />;
  }
  return (
    <div className="vowel-card-side">
      <div className="vowel-form">{entry.form}</div>
      <span className="vowel-ipa">{entry.ipa}{entry.rare ? ' (rare)' : ''}</span>
      {entry.example && (
        <span className="vowel-example">{entry.example} {entry.exampleGloss}</span>
      )}
      {entry.closed && (
        <div className={styles.closedBlock}>
          <span className={styles.closedLabel}>+ final</span>
          <div className={styles.closedForm}>{entry.closed}</div>
          {entry.closedExample && (
            <span className={styles.closedExample}>
              {entry.closedExample}
              {entry.closedGloss && <span className={styles.closedGloss}> {entry.closedGloss}</span>}
            </span>
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
