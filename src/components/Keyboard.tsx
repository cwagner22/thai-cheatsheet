import { ROWS, ZONE_COLORS, KEY_WIDTH } from '../data/keyboard';
import type { KbKey } from '../data/keyboard';
import type { ZoneId } from '../data/zones';
import styles from './Keyboard.module.css';

interface KeyboardProps {
  /** Zones to render in full color. Others (if any zones selected) will be dimmed. */
  highlightedZones?: ZoneId[] | null;
  /** Click handler for interactive zones (hover + click).  */
  onZoneClick?: (z: ZoneId) => void;
  /** Zone currently under hover (for border emphasis). */
  hoveredZone?: ZoneId | null;
  onZoneHover?: (z: ZoneId | null) => void;
  /** Char being cued next during typing practice (highlight that key). */
  activeChar?: string | null;
}

function isHighlighted(zone: ZoneId | null, highlighted: ZoneId[] | null | undefined): boolean {
  if (!highlighted || highlighted.length === 0) return true;
  if (zone == null) return false;
  return highlighted.includes(zone);
}

function KbKeyCell({
  k,
  highlighted,
  clickable,
  hovered,
  onClick,
  onHover,
  isActiveChar,
}: {
  k: KbKey;
  highlighted: boolean;
  clickable: boolean;
  hovered: boolean;
  onClick?: () => void;
  onHover?: () => void;
  isActiveChar: boolean;
}) {
  const zoneColors = k.zone ? ZONE_COLORS[k.zone] : null;
  const style: React.CSSProperties = {
    width: KEY_WIDTH,
    ...(zoneColors && highlighted
      ? { background: zoneColors.bg, borderColor: zoneColors.border }
      : {}),
    ...(hovered && zoneColors
      ? { boxShadow: `0 0 0 3px ${zoneColors.border}` }
      : {}),
    ...(isActiveChar
      ? { background: '#fde047', borderColor: '#ca8a04' }
      : {}),
    ...(clickable ? { cursor: 'pointer' } : {}),
    ...(highlighted ? {} : { opacity: 0.28 }),
  };
  return (
    <div
      className={styles.key}
      style={style}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={clickable ? onHover : undefined}
      onMouseLeave={clickable ? () => onHover?.() : undefined}
    >
      <span className={`${styles.shift} ${k.combiningShift ? styles.combining : ''}`}>{k.shift}</span>
      <span
        className={`${styles.main} ${k.combining ? styles.combining : ''}`}
        style={k.small ? { fontSize: '0.9rem' } : undefined}
      >
        {k.main}
      </span>
    </div>
  );
}

export function Keyboard({ highlightedZones, onZoneClick, hoveredZone, onZoneHover, activeChar }: KeyboardProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.rows}>
        {ROWS.map((row, ri) => (
          <div key={ri} className={styles.row} style={{ marginLeft: row.offset }}>
            {row.keys.map((k, ki) => {
              const zoneHigh = isHighlighted(k.zone, highlightedZones);
              const clickable = !!(k.zone && onZoneClick);
              const hovered = k.zone === hoveredZone;
              const isActive = activeChar != null && (k.main === activeChar || k.shift === activeChar);
              return (
                <KbKeyCell
                  key={ki}
                  k={k}
                  highlighted={zoneHigh}
                  clickable={clickable}
                  hovered={hovered}
                  isActiveChar={isActive}
                  onClick={clickable && k.zone ? () => onZoneClick?.(k.zone!) : undefined}
                  onHover={() => onZoneHover?.(k.zone ?? null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className={styles.legend}>
        Lower char = default · upper char = Shift · zone colors match cards below
      </p>
    </div>
  );
}
