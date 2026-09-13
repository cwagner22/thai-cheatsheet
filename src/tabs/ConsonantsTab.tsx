import { useState } from 'react';
import {
  byClass,
  MID_UNPAIRED_GROUPS,
  SONORANT_GROUPS,
  HIGH_LOW_PAIRS,
} from '../data/consonants';
import type { Consonant, SoundGroup, HighLowPair } from '../data/consonants';
import styles from './ConsonantsTab.module.css';

type View = 'sound' | 'class';

function Tags({ c }: { c: Consonant }) {
  return c.sonorant ? <span className="sonorant-tag">SONORANT</span> : null;
}

/** Render the final-sound cell. Three cases:
 *  - "—" means the consonant has no final form (can't end a syllable).
 *  - final === initial: render a trema (¨) as a "ditto" mark.
 *  - otherwise: show the final value as-is. */
function FinalSound({ initial, final }: { initial: string; final: string }) {
  if (final === '—') {
    return <span className={styles.finalNone}>—</span>;
  }
  if (final === initial) {
    return <span className={styles.finalSame}>¨</span>;
  }
  return <>{final}</>;
}

/** Derive the final-sound display for a group of consonants from the
 *  per-letter `final` values. If at least one letter has a real final, we
 *  drop the "—" entries (no need to show "no final" alongside the real
 *  finals — the real one is what matters for writing). When the remaining
 *  reals still differ, stack them vertically. */
function GroupFinal({ initial, letters }: { initial: string; letters: Consonant[] }) {
  const all = [...new Set(letters.map(l => l.final))];
  const reals = all.filter(f => f !== '—');
  const uniques = reals.length > 0 ? reals : all;
  if (uniques.length === 1) {
    return <FinalSound initial={initial} final={uniques[0]} />;
  }
  return (
    <span className={styles.finalMixed}>
      {uniques.map(f => (
        <FinalSound key={f} initial={initial} final={f} />
      ))}
    </span>
  );
}

function ClassTable({ klass, headerClass }: { klass: Consonant['klass']; headerClass: string }) {
  const rows = byClass(klass);
  return (
    <table>
      <thead className={headerClass}>
        <tr>
          <th style={{ width: 50 }}>#</th>
          <th style={{ width: 55 }}>Letter</th>
          <th>Name</th>
          <th>Initial</th>
          <th>Final</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(c => {
          // See the equivalent comment on PairLetter — dimming has to sit on
          // the letter/name themselves, not on the tooltip's own positioned
          // ancestor, or an obsolete letter's dim washes out its tooltip too.
          const dim = c.obsolete ? { opacity: 0.4 } : undefined;
          const tooltip = `/${c.nameRom}/ · ${c.meaning}`;
          return (
            <tr key={c.num}>
              <td>{c.num}</td>
              <td className={`thai-letter ${styles.label}`} style={{ cursor: 'help' }} data-tooltip={tooltip}>
                <span style={dim}>{c.letter}</span>
              </td>
              <td className={styles.label} style={{ cursor: 'help' }} data-tooltip={tooltip}>
                <span className="thai-name" style={dim}>
                  {c.name}
                  {c.rare && <span className="rare-tag"> R</span>}
                  {c.obsolete && <span className="obsolete-tag"> OBS</span>}
                </span>
              </td>
              <td className="initial-sound">{c.initial}</td>
              <td className="final-sound"><FinalSound initial={c.initial} final={c.final} /></td>
              <td className="sound-type">
                {c.type}{' '}<Tags c={c} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Cards are too narrow for the translation and IPA to sit inline, so both
 *  move into a hover tooltip on the letter (same mechanism as the tone
 *  cards). Only obsolete letters (no longer written at all) fade — rare
 *  letters are still in active use, so they stay at full opacity. */
function PairLetter({ c }: { c: Consonant }) {
  // Dimming has to sit on the letter/name themselves, not on the tooltip's
  // own positioned ancestor — opacity applies to a whole subtree, so an
  // obsolete letter's dim would otherwise wash out its own tooltip text too.
  const dim = c.obsolete ? { opacity: 0.4 } : undefined;
  return (
    <span
      className={`pair-letter ${styles.label}`}
      style={{ cursor: 'help' }}
      data-tooltip={`/${c.nameRom}/ · ${c.meaning}`}
    >
      <span className="thai-letter" style={dim}>{c.letter}</span>
      <span className="thai-name" style={dim}>
        {c.nameShort}
        {c.rare && <span className="rare-tag"> R</span>}
        {c.obsolete && <span className="obsolete-tag"> OBS</span>}
      </span>
    </span>
  );
}

function SoundGroupRow({ g }: { g: SoundGroup }) {
  return (
    <tr>
      <td className="initial-sound">{g.sound}</td>
      <td>
        <div className="pair-cell">
          {g.letters.map(c => <PairLetter key={c.letter} c={c} />)}
        </div>
      </td>
      <td className="final-sound" style={{ whiteSpace: 'nowrap' }}>
        <GroupFinal initial={g.sound} letters={g.letters} />
      </td>
    </tr>
  );
}

function HighLowRow({ p }: { p: HighLowPair }) {
  return (
    <tr>
      <td className="initial-sound">{p.sound}</td>
      <td>
        <div className="pair-cell">
          {p.high.map(c => <PairLetter key={c.letter} c={c} />)}
        </div>
      </td>
      <td>
        <div className="pair-cell">
          {p.low.map(c => <PairLetter key={c.letter} c={c} />)}
        </div>
      </td>
      <td className="final-sound">
        <GroupFinal initial={p.sound} letters={[...p.high, ...p.low]} />
      </td>
    </tr>
  );
}

function ByClassView() {
  return (
    <>
      <div className="legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#2563eb' }} /> Mid Class (กลาง) — 9</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#16a34a' }} /> High Class (สูง) — 11</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#dc2626' }} /> Low Class (ต่ำ) — 24</div>
      </div>

      <div className="class-section">
        <div className="class-header mid">Mid Class — อักษรกลาง (9)</div>
        <span className={styles.sectionSub}>Unaspirated — always Mid</span>
        <div className={styles.mnemBoxMid}>
          <strong>Mnemonic:</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ไก่ จิก เด็ก ตาย บน ปาก โอ่ง</span>
          <span style={{ color: '#666' }}> — <em>"A chicken pecks a dead child on top of a jar"</em></span><br />
          <span className={styles.mnemLetters}>→ ก · จ · ด/ฎ · ต/ฏ · บ · ป · อ</span>
        </div>
        <ClassTable klass="mid" headerClass="mid" />
      </div>

      <div className="class-section">
        <div className="class-header high">High Class — อักษรสูง (11)</div>
        <div className={styles.mnemBoxHigh}>
          <strong>Mnemonic:</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ผี ฝาก ถุง ข้าว สาร ให้ ฉัน</span>
          <span style={{ color: '#666' }}> — <em>"A ghost entrusts a bag of rice to me"</em></span><br />
          <span className={styles.mnemLetters}>→ ผ · ฝ · ถ/ฐ · ข/ฃ · ส/ศ/ษ · ห · ฉ</span>
        </div>
        <ClassTable klass="high" headerClass="high" />
      </div>

      <div className="class-section">
        <div className="class-header low">Low Class — อักษรต่ำ (24)</div>
        <div className={styles.mnemBoxLow}>
          <strong>Mnemonic:</strong> <em>everything not in the Mid or High mnemonic</em>{' '}— no sentence to memorize; it's the largest class by elimination.
        </div>
        <ClassTable klass="low" headerClass="low" />
      </div>

      <div className="tone-rules">
        <h2>How to Remember the Classes</h2>
        <p style={{ marginBottom: 10 }}>21 sounds split into <strong>3 groups of 7</strong>. Ask yourself one question about the sound:</p>

        <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={{ background: '#555', color: '#fff', padding: 8, textAlign: 'center' }}>Test</th>
              <th style={{ background: '#555', color: '#fff', padding: 8, textAlign: 'center' }}>Sounds</th>
              <th style={{ background: '#555', color: '#fff', padding: 8, textAlign: 'center' }}>Class</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}><strong>Unaspirated stop?</strong><br /><span style={{ fontSize: '0.78rem', color: '#666' }}>plains</span></td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee', fontFamily: 'var(--thai-font)' }}>/k/ ก • /tɕ/ จ • /d/ ด • /t/ ต • /b/ บ • /p/ ป • /ʔ/ อ</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'center' }}><strong style={{ color: '#2563eb' }}>Always MID</strong></td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}><strong>Can you hum it?</strong><br /><span style={{ fontSize: '0.78rem', color: '#666' }}>sonorants</span></td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee', fontFamily: 'var(--thai-font)' }}>/ŋ/ ง • /n/ น • /m/ ม • /j/ ย • /r/ ร • /l/ ล • /w/ ว</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'center' }}><strong style={{ color: '#dc2626' }}>Always LOW</strong></td>
            </tr>
            <tr>
              <td style={{ padding: 8 }}><strong>Does air come out?</strong><br /><span style={{ fontSize: '0.78rem', color: '#666' }}>aspirates &amp; fricatives</span></td>
              <td style={{ padding: 8, fontFamily: 'var(--thai-font)' }}>/kʰ/ • /tɕʰ/ • /s/ • /tʰ/ • /pʰ/ • /f/ • /h/</td>
              <td style={{ padding: 8, textAlign: 'center' }}><strong style={{ color: '#16a34a' }}>HIGH</strong> or <strong style={{ color: '#dc2626' }}>LOW</strong><br /><span style={{ fontSize: '0.78rem', color: '#666' }}>(each sound has both — check the tables above)</span></td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: 12, fontSize: '0.85rem' }}><strong>Extra tips for the high/low pairs:</strong></p>
        <p style={{ marginTop: 4, fontSize: '0.83rem' }}>• Most sounds have <strong>one high-class letter and two+ low-class letters</strong> — when in doubt, low is the safer guess.</p>
        <p style={{ marginTop: 4, fontSize: '0.83rem' }}>• The <strong>high-class letter usually comes first</strong> in the alphabet (e.g. ข before ค, ฉ before ช, ถ before ท).</p>
        <p style={{ marginTop: 4, fontSize: '0.83rem' }}>
          • An <strong>unmarked Rising tone always means high class</strong> — e.g. ส เสือ, ฝ ฝา, ถ ถุง (6 of the 11 high-class
          names are themselves Rising tone: ฐาน, ถุง, ฝา, ศาลา, ฤๅษี, เสือ). No other class can produce Rising without a mark.
        </p>
        <p style={{ marginTop: 4, fontSize: '0.83rem' }}>
          • The same trick works for low class: most low-class names carry <strong>no tone mark</strong> (20 of 24 — ช้าง, โซ่,
          ผู้เฒ่า, and ม้า are the marked exceptions), and for those, an unmarked dead syllable's High or Falling tone always
          means low class (mid/high classes give Low tone there instead).
        </p>
      </div>

      <div className="tone-rules">
        <h2>Other Notes</h2>
        <p><strong>Only 8 final sounds exist in Thai:</strong> /k/, /t/, /p/ (stops) and /ŋ/, /n/, /m/, /j/, /w/ (sonorants). Many different initial consonants collapse to the same final.</p>
        <p style={{ marginTop: 8 }}><strong>ห นำ (leading ห):</strong> Low-class sonorants (น ม ง ย ร ล ว) have no high-class letter. Putting a silent ห in front bumps them to high-class tone rules. That's all it does — ห is silent, it just changes the tone.</p>
      </div>
    </>
  );
}

function BySoundView() {
  return (
    <>
      <div className="legend" style={{ marginBottom: 14 }}>
        <div className="legend-item"><span className="rare-tag">R</span> rare letter</div>
        <div className="legend-item"><span className="obsolete-tag">OBS</span> obsolete, no longer written</div>
      </div>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className="class-header mid">Mid Class — Unpaired (9)</div>
        <span className={styles.sectionSub}>Unaspirated — always Mid</span>
      </div>
      <table className="pair-table" style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th style={{ background: '#2563eb', width: 60 }}>Sound</th>
            <th style={{ background: '#2563eb' }}>Letters</th>
            <th style={{ background: '#2563eb', width: 50 }}>Final</th>
          </tr>
        </thead>
        <tbody>
          {MID_UNPAIRED_GROUPS.map(g => <SoundGroupRow key={g.sound} g={g} />)}
        </tbody>
      </table>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className="class-header low">Sonorants — Always Low (10)</div>
        <span className={styles.sectionSub}>Can you hum it? Then it's always low class. Use silent ห to shift tone.</span>
      </div>
      <table className="pair-table" style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th style={{ background: '#dc2626', width: 60 }}>Sound</th>
            <th style={{ background: '#dc2626' }}>Letters</th>
            <th style={{ background: '#dc2626', width: 120 }}>Final</th>
          </tr>
        </thead>
        <tbody>
          {SONORANT_GROUPS.map(g => <SoundGroupRow key={g.sound} g={g} />)}
        </tbody>
      </table>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className="class-header" style={{ background: '#7c3aed' }}>
          High / Low Pairs — Same Sound, Different Class (25)
        </div>
      </div>
      <p className={styles.pairSub}>
        Usually one <strong style={{ color: '#16a34a' }}>high</strong> and one or more{' '}
        <strong style={{ color: '#dc2626' }}>low</strong>, so when in doubt, guess low.
      </p>
      <p className={styles.pairSub}>
        Exception: /s/ has three high (ศ ษ ส) vs one low (ซ).
      </p>
      <table className="pair-table" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th style={{ background: '#7c3aed', width: 60 }}>Sound</th>
            <th style={{ background: '#16a34a' }}>High Class</th>
            <th style={{ background: '#dc2626' }}>Low Class</th>
            <th style={{ background: '#7c3aed', width: 50 }}>Final</th>
          </tr>
        </thead>
        <tbody>
          {HIGH_LOW_PAIRS.map(p => <HighLowRow key={p.sound} p={p} />)}
        </tbody>
      </table>

      <div className="tone-rules" style={{ marginTop: 18 }}>
        <h2>Classical class mnemonics (ไตรยางศ์)</h2>
        <div className={styles.mnemBoxMid} style={{ marginTop: 10 }}>
          <strong>Mid Class (9):</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ไก่ จิก เด็ก ตาย บน ปาก โอ่ง</span>
          <span style={{ color: '#666' }}> — <em>"A chicken pecks a dead child on top of a jar"</em></span><br />
          <span className={styles.mnemLetters}>→ ก · จ · ด/ฎ · ต/ฏ · บ · ป · อ</span>
        </div>
        <div className={styles.mnemBoxHigh}>
          <strong>High Class (11):</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ผี ฝาก ถุง ข้าว สาร ให้ ฉัน</span>
          <span style={{ color: '#666' }}> — <em>"A ghost entrusts a bag of rice to me"</em></span><br />
          <span className={styles.mnemLetters}>→ ผ · ฝ · ถ/ฐ · ข/ฃ · ส/ศ/ษ · ห · ฉ</span>
        </div>
        <div className={styles.mnemBoxLow}>
          <strong>Low Class (24):</strong> <em>everything not in the Mid or High mnemonic</em> — memorized by elimination.
        </div>
      </div>
    </>
  );
}

export function ConsonantsTab() {
  const [view, setView] = useState<View>('class');
  return (
    <div id="tab-consonants">
      <a
        className={styles.videoBookmark}
        href="https://www.youtube.com/watch?v=pxLHURprYuI"
        target="_blank"
        rel="noopener"
      >
        <span className={styles.videoIcon} aria-hidden>▶</span>
        <span>
          <strong>Video:</strong> เพลง ก เอ๋ย ก ไก่ — Thai alphabet song
        </span>
        <span className={styles.videoArrow} aria-hidden>↗</span>
      </a>
      <div className="view-toggle">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>View:</span>
        <button className={`view-btn ${view === 'class' ? 'active' : ''}`} onClick={() => setView('class')}>By Class</button>
        <button className={`view-btn ${view === 'sound' ? 'active' : ''}`} onClick={() => setView('sound')}>By Sound</button>
      </div>
      {view === 'class' ? <ByClassView /> : <BySoundView />}
    </div>
  );
}
