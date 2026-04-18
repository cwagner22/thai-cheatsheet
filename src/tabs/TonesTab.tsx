import { useState } from 'react';
import { THAI_TONES, NORTHERN_TONES } from '../data/tones';
import { ToneCard } from '../components/ToneCard';
import styles from './TonesTab.module.css';

type Lang = 'thai' | 'northern';

export function TonesTab() {
  const [lang, setLang] = useState<Lang>('thai');
  const tones = lang === 'thai' ? THAI_TONES : NORTHERN_TONES;

  return (
    <div id="tab-tones">
      <div className="tone-rules">
        <h2>Tone Calculation</h2>
        <p style={{ marginBottom: 10 }}>
          Start with the <strong>initial consonant's class</strong>, then follow these steps:
        </p>

        <div className={styles.stepBox}>
          <strong>Step 1 — Is there a tone mark?</strong><br />
          → Yes: check the tone mark table below. The mark + class = your tone.<br /><br />
          <strong>Step 2 — No tone mark. Is the syllable live?</strong><br />
          → <strong style={{ color: '#2563eb' }}>Mid</strong> or{' '}
          <strong style={{ color: '#dc2626' }}>Low</strong> class → <strong>mid tone</strong><br />
          → <strong style={{ color: '#16a34a' }}>High</strong> class → <strong>rising tone</strong>
          <br /><br />
          <strong>Step 3 — No tone mark, dead syllable.</strong><br />
          → <strong style={{ color: '#2563eb' }}>Mid</strong> or{' '}
          <strong style={{ color: '#16a34a' }}>High</strong> class → <strong>low tone</strong>{' '}
          (short or long vowel, doesn't matter)<br />
          → <strong style={{ color: '#dc2626' }}>Low</strong> class + short vowel →{' '}
          <strong>high tone</strong><br />
          → <strong style={{ color: '#dc2626' }}>Low</strong> class + long vowel →{' '}
          <strong>falling tone</strong>
        </div>

        <p style={{ marginBottom: 6 }}><strong>Live vs Dead:</strong></p>
        <p style={{ fontSize: '0.83rem', marginBottom: 14 }}>
          <strong>Live</strong> = you can hold it — ends in a sonorant (ง น ณ ม ญ ร ล ฬ ย ว)
          or an open long vowel.<br />
          <strong>Dead</strong> = ends abruptly — ends in a stop (/k/, /t/, /p/) or a short vowel
          with no final.
        </p>

        <p style={{ marginBottom: 6 }}>
          <strong>Unified tone table</strong>{' '}
          <span style={{ fontSize: '0.78rem', color: '#666' }}>
            (ไม้เอก merged into Dead-long since they produce the same tones)
          </span>
        </p>
        <table className={styles.toneTable}>
          <thead>
            <tr>
              <th>Class</th>
              <th>Live<br /><span className={styles.subcol}>(no mark)</span></th>
              <th>Dead<br /><span className={styles.subcol}>(short)</span></th>
              <th className={styles.thaiCol}>
                <span style={{ fontSize: '1.1rem' }}>ก่</span>{' '}
                <span className={styles.subcol}>ไม้เอก</span><br />
                <span className={styles.subcolEn}>= Dead (long)</span>
              </th>
              <th className={styles.thaiCol}>
                <span style={{ fontSize: '1.1rem' }}>ก้</span>{' '}
                <span className={styles.subcol}>ไม้โท</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.cellMid}>Mid</td>
              <td style={{ background: '#d1fae5' }}>Mid</td>
              <td rowSpan={2} colSpan={2} style={{ background: '#fed7aa', verticalAlign: 'middle' }}>Low</td>
              <td rowSpan={2} style={{ background: '#ddd6fe', verticalAlign: 'middle' }}>Falling</td>
            </tr>
            <tr>
              <td className={styles.cellHigh}>High</td>
              <td>Rising</td>
            </tr>
            <tr>
              <td className={styles.cellLow}>Low</td>
              <td style={{ background: '#d1fae5' }}>Mid</td>
              <td>High</td>
              <td>Falling</td>
              <td>High</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.legendNote}>
          <span className={styles.legendGreen}>green</span> Mid &amp; Low share Mid tone (live) &nbsp;
          <span className={styles.legendOrange}>orange</span> Mid &amp; High share Low on dead syllables &nbsp;
          <span className={styles.legendPurple}>purple</span> Mid &amp; High → Falling with ไม้โท
        </p>

        <p style={{ marginTop: 14, marginBottom: 4 }}>
          <strong>The other two tone marks (Mid class only):</strong>
        </p>
        <p style={{ fontSize: '0.83rem' }}>
          • <span style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: '1.1rem' }}>ก๊</span>{' '}
          <span style={{ fontFamily: "'Noto Serif Thai', serif" }}>ไม้ตรี</span> →{' '}
          <strong>High</strong> tone.
        </p>
        <p style={{ fontSize: '0.83rem' }}>
          • <span style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: '1.1rem' }}>ก๋</span>{' '}
          <span style={{ fontFamily: "'Noto Serif Thai', serif" }}>ไม้จัตวา</span> →{' '}
          <strong>Rising</strong> tone.
        </p>
        <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 4 }}>
          Used only on Mid-class letters (it's how Mid gets its High and Rising tones, since the
          Dead / ไม้เอก / ไม้โท columns cover Low and Falling).
        </p>

        <p style={{ marginTop: 14, marginBottom: 4 }}><strong>Tips:</strong></p>
        <p style={{ fontSize: '0.83rem' }}>• <strong>ไม้เอก = Dead-long behavior</strong> for every class. Memorize one, get both.</p>
        <p style={{ fontSize: '0.83rem' }}>• <strong>Only Mid class uses all 4 tone marks</strong> and can produce all 5 tones.</p>
        <p style={{ fontSize: '0.83rem' }}>• <strong>With a tone mark, the result is never Mid tone.</strong></p>
      </div>

      <div className="tone-rules" style={{ marginTop: 24 }}>
        <h2 style={{ margin: '0 0 6px 0' }}>Pronunciation — Contour Visualization</h2>
        <p style={{ fontSize: '0.83rem', color: '#555', margin: '0 0 10px 0' }}>
          Each tone plotted as a pitch curve over time. Vertical scale = Chao tone letters (1 = lowest pitch, 5 = highest). Horizontal = duration.
        </p>
      </div>

      <div className={styles.langToggle}>
        <button
          className={`${styles.langBtn} ${lang === 'thai' ? styles.langBtnActive : ''}`}
          onClick={() => setLang('thai')}
        >
          Thai ไทย · 5 tones
        </button>
        <button
          className={`${styles.langBtn} ${lang === 'northern' ? styles.langBtnActive : ''}`}
          onClick={() => setLang('northern')}
        >
          Northern Thai คำเมือง · 8 tones
        </button>
      </div>

      <div className={styles.grid}>
        {tones.map((t, i) => <ToneCard key={i} tone={t} />)}
      </div>

      <div className={styles.drillBox}>
        <strong>How to practice:</strong> say each tone while tracing the curve with your finger or voice.<br />
        <strong>Classic drill (5 real words):</strong>{' '}
        <span style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: '1.05rem' }}>คา · ข่า · ค่า · ค้า · ขา</span>
        {' '}<span style={{ color: '#666' }}>(khaa · khàa · khâa · kháa · khǎa) = <em>stuck · galangal · cost · to trade · leg</em></span>
        {' '}— all 5 tones in canonical order (Mid · Low · Falling · High · Rising).<br />
        <strong>Alt drill (one mid-class letter + all 4 tone marks):</strong>{' '}
        <span style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: '1.05rem' }}>ปา · ป่า · ป้า · ป๊า · ป๋า</span>
        {' '}<span style={{ color: '#666' }}>(paa · pàa · pâa · páa · pǎa) = <em>throw · forest · aunt · dad · dad (slang)</em></span>
        {' '}— showcases no-mark, ่, ้, ๊, ๋ all on one mid-class initial.
      </div>
    </div>
  );
}
