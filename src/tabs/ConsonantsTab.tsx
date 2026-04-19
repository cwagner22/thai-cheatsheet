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
  return (
    <>
      {c.sonorant && <span className="sonorant-tag">SONORANT</span>}
      {c.rare && <span className="rare-tag">RARE</span>}
      {c.obsolete && <span className="obsolete-tag">OBSOLETE</span>}
    </>
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
          <th>Meaning</th>
          <th>Initial</th>
          <th>Final</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(c => (
          <tr key={c.num}>
            <td>{c.num}</td>
            <td className="thai-letter">{c.letter}</td>
            <td className="thai-name">{c.name}</td>
            <td>{c.meaning}</td>
            <td className="initial-sound">{c.initial}</td>
            <td className="final-sound">{c.final}</td>
            <td className="sound-type">
              {c.type}{' '}<Tags c={c} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PairLetter({ c, dim }: { c: Consonant; dim?: boolean }) {
  return (
    <span className="pair-letter" style={dim ? { opacity: 0.4 } : undefined}>
      <span className="thai-letter">{c.letter}</span>
      <span className="thai-name">{c.nameShort}</span>
      <span className="pair-eng">
        {c.meaning}{c.rare && <span className="rare-tag"> R</span>}{c.obsolete && <span className="obsolete-tag"> OBS</span>}
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
      <td className="final-sound" style={{ whiteSpace: 'nowrap' }}>{g.final}</td>
    </tr>
  );
}

function HighLowRow({ p }: { p: HighLowPair }) {
  return (
    <tr>
      <td className="initial-sound">{p.sound}</td>
      <td>
        <div className="pair-cell">
          {p.high.map(c => <PairLetter key={c.letter} c={c} dim={c.obsolete} />)}
        </div>
      </td>
      <td>
        <div className="pair-cell">
          {p.low.map(c => <PairLetter key={c.letter} c={c} dim={c.obsolete} />)}
        </div>
      </td>
      <td className="final-sound">{p.final}</td>
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
        <div className={styles.mnemBoxMid}>
          <strong>Mnemonic:</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ไก่ จิก เด็ก ตาย บน ปาก โอ่ง</span>
          <span style={{ color: '#666' }}> — <em>"A chicken pecks a dead child on top of a jar"</em></span><br />
          <span className={styles.mnemLetters}>→ ก  จ  ฎ ฏ  ด ต  บ  ป  อ</span>
        </div>
        <ClassTable klass="mid" headerClass="mid" />
      </div>

      <div className="class-section">
        <div className="class-header high">High Class — อักษรสูง (11)</div>
        <div className={styles.mnemBoxHigh}>
          <strong>Mnemonic:</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ผี ฝาก ถุง ข้าว สาร ให้ ฉัน</span>
          <span style={{ color: '#666' }}> — <em>"A ghost entrusts a bag of rice to me"</em></span><br />
          <span className={styles.mnemLetters}>→ ผ  ฝ  ถ ฐ  ข ฃ  ส ศ ษ  ห  ฉ</span>
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
        <p style={{ marginTop: 4, fontSize: '0.83rem' }}>• The <strong>consonant names are designed so the tone reveals the class</strong> — e.g. ส เสือ (rising tone) must be high class because a low-class consonant can't produce a rising tone without a tone mark.</p>
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
      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className="class-header mid">Mid Class — Unpaired (9)</div>
        <span className={styles.sectionSub}>Unaspirated stops — only one class, no pairs to worry about</span>
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
        Same sound, different class — which changes the tone. Usually one{' '}
        <strong style={{ color: '#16a34a' }}>high</strong> and one or more{' '}
        <strong style={{ color: '#dc2626' }}>low</strong>. Exception: /s/ has three high (ศ ษ ส) vs one low (ซ).
      </p>
      <table className="pair-table">
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
        <h2>Tips</h2>
        <p><strong>When in doubt, guess low class</strong> — most sounds have more low-class letters than high-class.</p>
        <p style={{ marginTop: 4 }}><strong>The consonant name reveals the class</strong> — e.g. สอ เสือ (rising tone) must be high class, because low-class consonants can't produce a rising tone without a tone mark.</p>

        <p style={{ marginTop: 14, marginBottom: 6 }}><strong>Classical class mnemonics (ไตรยางศ์):</strong></p>
        <div className={styles.mnemBoxMid}>
          <strong>Mid Class (9):</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ไก่ จิก เด็ก ตาย บน ปาก โอ่ง</span>
          <span style={{ color: '#666' }}> — <em>"A chicken pecks a dead child on top of a jar"</em></span><br />
          <span className={styles.mnemLetters}>→ ก  จ  ฎ ฏ  ด ต  บ  ป  อ</span>
        </div>
        <div className={styles.mnemBoxHigh}>
          <strong>High Class (11):</strong>{' '}
          <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ผี ฝาก ถุง ข้าว สาร ให้ ฉัน</span>
          <span style={{ color: '#666' }}> — <em>"A ghost entrusts a bag of rice to me"</em></span><br />
          <span className={styles.mnemLetters}>→ ผ  ฝ  ถ ฐ  ข ฃ  ส ศ ษ  ห  ฉ</span>
        </div>
        <div className={styles.mnemBoxLow}>
          <strong>Low Class (24):</strong> <em>everything not in the Mid or High mnemonic</em> — memorized by elimination.
        </div>
      </div>
    </>
  );
}

export function ConsonantsTab() {
  const [view, setView] = useState<View>('sound');
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
          <strong>Video:</strong> alphabet walkthrough on YouTube
        </span>
        <span className={styles.videoArrow} aria-hidden>↗</span>
      </a>
      <div className="view-toggle">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>View:</span>
        <button className={`view-btn ${view === 'sound' ? 'active' : ''}`} onClick={() => setView('sound')}>By Sound</button>
        <button className={`view-btn ${view === 'class' ? 'active' : ''}`} onClick={() => setView('class')}>By Class</button>
      </div>
      {view === 'sound' ? <BySoundView /> : <ByClassView />}
    </div>
  );
}
