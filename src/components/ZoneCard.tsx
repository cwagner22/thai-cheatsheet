import type { Zone } from '../data/zones';
import { TRAINER_URL } from '../data/zones';
import styles from './ZoneCard.module.css';

interface ZoneCardProps {
  zone: Zone;
  onPracticeClick: () => void;
  onHover?: (hovered: boolean) => void;
  isHovered?: boolean;
}

/** Render a mnemonic with simple **bold** markers → <strong>. */
function renderMnemonic(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

function Circle({ char, combining }: { char: string; combining?: boolean }) {
  // Render just the character; combining marks show alone as in the polished keyboard.
  return <span className={styles.keyGlyph}>{combining ? char.replace(/^◌/, '') : char}</span>;
}

export function ZoneCard({ zone, onPracticeClick, onHover, isHovered }: ZoneCardProps) {
  const style: React.CSSProperties = {
    background: zone.bg,
    borderLeftColor: zone.color,
    ...(isHovered ? { boxShadow: `0 0 0 3px ${zone.color}` } : {}),
  };

  return (
    <div
      className={styles.card}
      style={style}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onClick={onPracticeClick}
    >
      <div className={styles.header}>
        <strong style={{ color: zone.color }}>
          {zone.arrow} {zone.title}
        </strong>
        <span className={styles.titleKeys}>
          {zone.titleKeys.map((k, i) => (
            <span key={i} className={styles.titleKey}>{k.replace(/^◌/, '')}</span>
          ))}
        </span>
      </div>

      {zone.intro && <p className={styles.intro}>{zone.intro}</p>}

      <table className={styles.table}>
        <thead>
          <tr style={{ background: zone.headBg }}>
            <th style={{ borderColor: zone.headBorder }}>{zone.rows.some(r => r.finger.includes('stretch') || r.finger.includes('row')) ? 'Finger / position' : 'Finger'}</th>
            <th style={{ borderColor: zone.headBorder, fontFamily: "'Noto Serif Thai', serif", fontSize: '1.1rem' }}>Key</th>
            <th style={{ borderColor: zone.headBorder }}>Mnemonic</th>
          </tr>
        </thead>
        <tbody>
          {zone.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.finger}</td>
              <td className={styles.keyCell}>
                <Circle char={r.key} combining={r.combining} />
              </td>
              <td>{renderMnemonic(r.mnemonic)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {zone.shiftRows && zone.shiftRows.length > 0 && (
        <>
          <p className={styles.shiftLabel}><strong>Shift layer:</strong></p>
          <table className={styles.table}>
            <thead>
              <tr style={{ background: zone.headBg }}>
                <th style={{ borderColor: zone.headBorder, fontFamily: "'Noto Serif Thai', serif", fontSize: '1.1rem' }}>Key</th>
                <th style={{ borderColor: zone.headBorder }}>+⇧</th>
                <th style={{ borderColor: zone.headBorder }}>Mnemonic</th>
              </tr>
            </thead>
            <tbody>
              {zone.shiftRows.map((sr, i) => (
                <tr key={i}>
                  <td className={styles.keyCell}><Circle char={sr.base} combining={sr.base.startsWith('◌')} /></td>
                  <td className={styles.keyCell}>
                    {sr.isPunct ? <kbd>{sr.shifted}</kbd> : <Circle char={sr.shifted} />}
                  </td>
                  <td>{renderMnemonic(sr.mnemonic)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className={styles.practice} style={{ color: zone.color, borderColor: zone.headBorder }}>
        🎯 <strong>Practice:</strong>{' '}
        {zone.practice.drills.map(d => (
          <span key={d}>
            <a href={TRAINER_URL} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>Lesson {d}</a>
            {' '}(drill){' '}
          </span>
        ))}
        {zone.practice.words.length > 0 && (
          <>
            ·{' '}
            <strong>
              <a href={TRAINER_URL} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>
                Lesson {zone.practice.words.join(', ')}
              </a>
            </strong>{' '}
            (Thai words)
          </>
        )}
        {zone.practice.extras?.map((ex, i) => (
          <span key={i}>
            {' '}·{' '}
            <a href={TRAINER_URL} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>Lesson {ex.lesson}</a>
            {' '}({ex.note})
          </span>
        ))}
      </p>
    </div>
  );
}
