import { useState } from 'react';
import { ZONES, TRAINER_URL } from '../data/zones';
import type { ZoneId } from '../data/zones';
import { Keyboard } from '../components/Keyboard';
import { ZoneCard } from '../components/ZoneCard';
import { PracticeOverlay } from '../components/PracticeOverlay';
import { lessonsForZone, endgameLessons, lessonById } from '../data/lessons';
import styles from './TypingTab.module.css';

type PracticeState =
  | { kind: 'zone'; zoneId: ZoneId }
  | { kind: 'lesson'; lessonId: number }
  | null;

export function TypingTab() {
  const [practice, setPractice] = useState<PracticeState>(null);
  const [hoveredZone, setHoveredZone] = useState<ZoneId | null>(null);
  // Zones currently highlighted during practice (updated by PracticeOverlay on lesson change)
  const [activeZones, setActiveZones] = useState<ZoneId[] | null>(null);

  // In-practice rendering
  if (practice) {
    let lessons = [];
    let title = '';
    let initialId = 0;
    if (practice.kind === 'zone') {
      const zone = ZONES.find(z => z.id === practice.zoneId)!;
      lessons = lessonsForZone(practice.zoneId);
      title = `${zone.arrow}  ${zone.title}`;
      initialId = lessons[0]?.id ?? 0;
    } else {
      const l = lessonById(practice.lessonId)!;
      lessons = [l];
      title = l.title;
      initialId = l.id;
    }

    if (lessons.length === 0) {
      // Fallback: no lessons defined for this zone, exit.
      setPractice(null);
      return null;
    }

    return (
      <div id="tab-typing">
        <PracticeOverlay
          lessons={lessons}
          initialLessonId={initialId}
          title={title}
          onExit={() => { setPractice(null); setActiveZones(null); }}
          onLessonChange={l => setActiveZones(l.zones)}
        />
      </div>
    );
  }

  // Default overview rendering
  return (
    <div id="tab-typing">
      <div className="tone-rules" style={{ marginBottom: 14 }}>
        <p style={{ fontSize: '0.9rem' }}>
          The standard Thai keyboard is the <strong>Kedmanee</strong> layout (เกษมณี).
          Click any zone below (or tap a zone on the keyboard) to open an interactive practice
          — or try the full-keyboard drills at the bottom. External reference trainer:{' '}
          <a href={TRAINER_URL} target="_blank" rel="noopener" style={{ color: '#2563eb' }}>
            thai-notes.com typing trainer
          </a>.
        </p>
      </div>

      <Keyboard
        highlightedZones={activeZones}
        hoveredZone={hoveredZone}
        onZoneHover={setHoveredZone}
        onZoneClick={zoneId => setPractice({ kind: 'zone', zoneId })}
      />

      <div className={styles.zoneGrid}>
        {ZONES.map(z => (
          <ZoneCard
            key={z.id}
            zone={z}
            isHovered={hoveredZone === z.id}
            onHover={h => setHoveredZone(h ? z.id : null)}
            onPracticeClick={() => setPractice({ kind: 'zone', zoneId: z.id })}
          />
        ))}
      </div>

      <div className="tone-rules" style={{ marginTop: 18 }}>
        <p style={{ fontWeight: 700, margin: '0 0 6px' }}>💡 Typing tips</p>
        <p style={{ fontSize: '0.86rem', margin: '4px 0' }}>
          <strong>Typing order:</strong> <em>consonant → above/below vowel → tone mark</em>.
          Combining marks attach to whatever was typed just before them.
        </p>
        <p style={{ fontSize: '0.86rem', margin: '4px 0' }}>
          <strong>Exception:</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}> ำ </span>
          is a full key, so a tone mark comes <em>before</em> it. E.g.,{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ต่ำ</span>
          {' '}= <kbd>ต</kbd> <kbd>่</kbd> <kbd>ำ</kbd>.
        </p>
        <p style={{ fontSize: '0.86rem', margin: '4px 0' }}>
          <strong>Pre-posed vowels</strong>{' '}
          (<span style={{ fontFamily: 'var(--thai-font)' }}>เ แ โ ใ ไ</span>)
          are typed <em>in reading order</em>.
        </p>
        <p style={{ fontSize: '0.86rem', margin: '4px 0' }}>
          <strong>Find home position by touch.</strong> The{' '}
          <kbd>ด</kbd> and <kbd>ก</kbd> keys have small bumps — never look down.
        </p>
        <p style={{ fontSize: '0.86rem', margin: '4px 0' }}>
          <strong>Shift side-rule.</strong> Always press the <em>opposite</em> Shift key from the letter.
        </p>
      </div>

      <h2 className={styles.endgameHeader}>🏁 Full-keyboard practice (spans all zones)</h2>
      <p className={styles.endgameSub}>
        Once the zones feel comfortable, these drills exercise everything together.
      </p>
      <div className={styles.endgameGrid}>
        {endgameLessons().map(l => (
          <button
            key={l.id}
            className={styles.endgameCard}
            data-kind={l.kind}
            onClick={() => setPractice({ kind: 'lesson', lessonId: l.id })}
          >
            <p className={styles.endgameTitle}>{l.title}</p>
            <p className={styles.endgameDesc}>{l.instruction}</p>
            <span className={styles.endgameId}>Lesson {l.id} →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
