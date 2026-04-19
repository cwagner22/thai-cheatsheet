import type { Zone } from '../data/zones';
import styles from './ZoneCard.module.css';

interface ZoneCardProps {
  zone: Zone;
  onPracticeClick: () => void;
  onHover?: (hovered: boolean) => void;
  isHovered?: boolean;
}

/**
 * Render a mnemonic with simple **bold** / *italic* markers.
 *
 * Combining-mark fix: when a Thai combining mark (above/below vowels, tone
 * marks) directly follows a closing `**`, the element boundary between
 * `<strong>ถ</strong>` and the trailing text node breaks Unicode text
 * shaping — the combining mark renders as a lonely ◌ circle. Solution: in
 * the split-token array, pull leading Thai combining marks of a plain
 * segment into the *preceding* bold/italic segment so they render together
 * inside the same element.
 */
const THAI_COMBINING_RE = /^[\u0E30-\u0E3A\u0E47-\u0E4E]+/;

function isBoldOrItalic(s: string): 2 | 1 | 0 {
  if (s.startsWith('**') && s.endsWith('**') && s.length >= 4) return 2;
  if (s.startsWith('*') && s.endsWith('*') && s.length >= 3 && !s.startsWith('**')) return 1;
  return 0;
}

function renderMnemonic(text: string): React.ReactNode {
  const raw = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  // Post-process the token list: move leading combining marks of a plain
  // segment into the preceding bold/italic segment.
  const parts: string[] = [];
  for (const part of raw) {
    const prev = parts[parts.length - 1];
    const marker = prev ? isBoldOrItalic(prev) : 0;
    if (marker) {
      const m = part.match(THAI_COMBINING_RE);
      if (m) {
        const marks = m[0];
        const delim = '*'.repeat(marker);
        parts[parts.length - 1] = prev.slice(0, -marker) + marks + delim;
        const remainder = part.slice(marks.length);
        if (remainder) parts.push(remainder);
        continue;
      }
    }
    if (part) parts.push(part);
  }
  return parts.map((part, i) => {
    if (isBoldOrItalic(part) === 2) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (isBoldOrItalic(part) === 1) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

function Circle({ char }: { char: string; combining?: boolean }) {
  // Keep the ◌ prefix on combining marks. An isolated combining mark has
  // zero advance width, which makes `text-align: center` useless — the
  // browser draws a fallback dotted circle out of flow and the cell appears
  // left-aligned. Rendering the explicit ◌ DOTTED CIRCLE (U+25CC) as a
  // visible base gives the mark a normal-width glyph to attach to.
  return <span className={styles.keyGlyph}>{char}</span>;
}

function KeyRow({ zone, color }: { zone: Zone; color: string }) {
  const hasIndex = zone.rows.some(r => r.indexHome);
  return (
    <div className={styles.rowLayout}>
      {hasIndex && (
        <div className={styles.rowMarker} aria-hidden>
          {zone.rows.map((r, i) => (
            <div key={i} className={styles.rowMarkerCell}>
              {r.indexHome && (
                <span className={styles.indexTag} style={{ color }}>
                  index ↓
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className={styles.rowKeys}>
        {zone.rows.map((r, i) => (
          <div key={i} className={styles.rowKeyCell}>
            <div className={styles.rowKeyChar}>{r.key}</div>
            {r.shortThai && <div className={styles.rowKeyThai}>{r.shortThai}</div>}
            {r.shortEng && (
              <div className={styles.rowKeyEng}>{renderMnemonic(r.shortEng)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ZoneCard({ zone, onPracticeClick, onHover, isHovered }: ZoneCardProps) {
  const style: React.CSSProperties = {
    background: zone.bg,
    borderLeftColor: zone.color,
    ...(isHovered ? { boxShadow: `0 0 0 3px ${zone.color}` } : {}),
  };

  const isRowLayout = zone.layout === 'row';

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
        {zone.titleKeys.length > 0 && (
          <span className={styles.titleKeys}>
            {zone.titleKeys.map((k, i) => (
              <span key={i} className={styles.titleKey}>{k}</span>
            ))}
          </span>
        )}
      </div>

      {zone.intro && <p className={styles.intro}>{zone.intro}</p>}

      {isRowLayout ? (
        <KeyRow zone={zone} color={zone.color} />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr style={{ background: zone.headBg }}>
              <th style={{ borderColor: zone.headBorder }}>{zone.rows.some(r => r.finger.includes('stretch') || r.finger.includes('row')) ? 'Finger / position' : 'Finger'}</th>
              <th style={{ borderColor: zone.headBorder }}>Key</th>
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
      )}

      {zone.shiftRows && zone.shiftRows.length > 0 && (
        <>
          <p className={styles.shiftLabel}><strong>Shift layer:</strong></p>
          <table className={styles.table}>
            <thead>
              <tr style={{ background: zone.headBg }}>
                <th style={{ borderColor: zone.headBorder }}>Key</th>
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
    </div>
  );
}
