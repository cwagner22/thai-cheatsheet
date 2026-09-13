import { useState } from 'react';
import { THAI_TONES, NORTHERN_TONES, NORTHERN_TONE_BOX, type ToneBoxOutcome } from '../data/tones';
import { ToneCard } from '../components/ToneCard';
import styles from './TonesTab.module.css';

type Lang = 'thai' | 'northern';

type ToneName = 'Mid' | 'Low' | 'Falling' | 'High' | 'Rising';

/** Look up a THAI_TONES entry by its English name — for the Standard Thai table below. */
const thaiTone = (name: ToneName) => THAI_TONES.find(t => t.nameEn === name)!;

/** Look up a NORTHERN_TONES entry by its Gedney box code — for the tone box table below. */
const northernTone = (name: string) => NORTHERN_TONES.find(t => t.name === name)!;

/** Contour-graph colors from THAI_TONES — kept in sync by hand for now so
 *  this file doesn't depend on the data module just for a tiny lookup. */
const TONE_COLOR: Record<ToneName, string> = {
  Mid: '#2563eb',     // blue
  Low: '#dc2626',     // red
  Falling: '#7c3aed', // purple
  High: '#16a34a',    // green
  Rising: '#db2777',  // pink
};

/** Tone-mark glyph by tone name. Mid has no mark — the cell stays empty. */
const TONE_MARK: Record<ToneName, string> = {
  Mid: '',
  Low: '่',
  Falling: '้',
  High: '๊',
  Rising: '๋',
};

/** Render the tone mark in tone color. Used in the unified tone table.
 *  Mid (empty mark) renders nothing — the cell stays blank.
 *  `color` overrides the default tone color (used in header, where dark
 *  background needs white). Same CSS class as the cells so header & cells
 *  land at the same horizontal X within the column. */
function ToneGlyph({ name, color, fontSize }: { name: ToneName; color?: string; fontSize?: string }) {
  const mark = TONE_MARK[name];
  if (!mark) return null;
  return (
    <span
      className={`${styles.toneGlyph} ${styles.toneGlyphCombining}`}
      style={{ color: color ?? TONE_COLOR[name], fontSize }}
      title={`${name} tone`}
    >
      {mark}
    </span>
  );
}

/** Renders a bare combining tone mark (่ ้ ๊ ๋) with a real base to attach to,
 *  via the same CSS trick as ToneGlyph. A combining mark with no preceding
 *  glyph in its own text run has nothing to attach to, so the browser draws
 *  a dotted-circle placeholder before it — this avoids that.
 *  `fontSize` defaults to the class's own (large, card-sized) glyph; pass a
 *  smaller value when the mark sits inline next to ordinary-sized text, or
 *  it'll dwarf that text — the padding/offset that centers it over its
 *  assumed base are both em-relative, so they scale down with it. */
function MarkGlyph({ mark, color, title, fontSize }: { mark: string; color?: string; title?: string; fontSize?: string }) {
  return (
    <span className={`${styles.toneGlyph} ${styles.toneGlyphCombining}`} style={{ color, fontSize }} title={title}>
      {mark}
    </span>
  );
}

/** Renders one tone-box cell as the full contour card(s) for its outcome(s),
 *  embedded directly rather than behind a click. The one cell where Chiang
 *  Mai's mid-class letters split by which letters they are carries two,
 *  each labeled with the letters it covers so it's unambiguous without
 *  cross-referencing the prose above the table. */
function ToneBoxCell({ outcomes }: { outcomes: ToneBoxOutcome[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {outcomes.map(({ code, letters, example, exampleGloss }) => (
        <div key={code}>
          {letters && (
            <div style={{ fontFamily: 'var(--thai-font)', fontSize: '0.75rem', color: '#888', textAlign: 'center', marginBottom: 2 }}>
              {letters}
            </div>
          )}
          <ToneCard tone={northernTone(code)} example={example} exampleGloss={exampleGloss} />
        </div>
      ))}
    </div>
  );
}


export function TonesTab() {
  const [lang, setLang] = useState<Lang>('thai');

  return (
    <div id="tab-tones">
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
          Northern Thai คำเมือง · 6 tones
        </button>
      </div>

      {lang === 'thai' && (
      <div className="tone-rules">
        <h2>Tone Calculation</h2>
        <p style={{ marginBottom: 10 }}>
          Start with the <strong>initial consonant's class</strong>, then follow these steps:
        </p>

        <div className={styles.stepBox}>
          <strong>Step 1 — Is there a tone mark?</strong><br />
          → Yes: check the tone mark table below for the mark + class.<br /><br />
          <strong>Step 2 — No tone mark, live syllable:</strong><br />
          → <strong style={{ color: '#2563eb' }}>Mid</strong> or{' '}
          <strong style={{ color: '#dc2626' }}>Low</strong> class → <strong>mid tone</strong><br />
          → <strong style={{ color: '#16a34a' }}>High</strong> class → <strong>rising tone</strong>
          <br /><br />
          <strong>Step 3 — No tone mark, dead syllable:</strong><br />
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
          <strong>Unified tone table</strong>
        </p>
        <table className={styles.toneTable}>
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '21.75%' }} />
            <col style={{ width: '21.75%' }} />
            <col style={{ width: '21.75%' }} />
            <col style={{ width: '21.75%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Class</th>
              <th>Live</th>
              <th>Dead short</th>
              <th>
                Dead long<br />
                <span className={styles.headerMarkRow}>
                  Mai Ek <ToneGlyph name="Low" color="#fff" fontSize="1.2rem" />
                </span>
              </th>
              <th>
                <span className={styles.headerMarkRow}>
                  Mai Tho <ToneGlyph name="Falling" color="#fff" fontSize="1.2rem" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.cellMid}>Mid</td>
              <td><ToneCard tone={thaiTone('Mid')} /></td>
              <td rowSpan={2} colSpan={2} style={{ verticalAlign: 'middle' }}>
                <ToneCard tone={thaiTone('Low')} example="ถูก" exampleGloss="tʰùːk · correct" />
              </td>
              <td rowSpan={2} style={{ verticalAlign: 'middle' }}>
                <ToneCard tone={thaiTone('Falling')} example="ป้า" exampleGloss="pâː · aunt" />
              </td>
            </tr>
            <tr>
              <td className={styles.cellHigh}>High</td>
              <td><ToneCard tone={thaiTone('Rising')} /></td>
            </tr>
            <tr>
              <td className={styles.cellLow}>Low</td>
              <td>
                <ToneCard tone={thaiTone('Mid')} example="มา" exampleGloss="maː · to come" />
              </td>
              <td><ToneCard tone={thaiTone('High')} example="นก" exampleGloss="nók · bird" /></td>
              <td><ToneCard tone={thaiTone('Falling')} example="มาก" exampleGloss="mâːk · much" /></td>
              <td><ToneCard tone={thaiTone('High')} /></td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '0.83rem', color: '#666', marginTop: 10 }}>
          Table covers ่ and ้ only. Mid class also has ๊ (→ High) and ๋ (→ Rising), not shown
          here. No mark ever gives Mid — only the unmarked reading does.
        </p>
      </div>
      )}

      {lang === 'northern' && (
      <div className="tone-rules">
        <h2>Tone Box — Northern Thai คำเมือง (Chiang Mai)</h2>
        <p style={{ fontSize: '0.83rem', marginBottom: 10 }}>
          Same three consonant classes as Standard Thai, but they land on a different
          6-tone system, and the tone depends on the syllable environment (below) rather
          than a fixed per-class rule. Cells show the Gedney box category that produces
          each tone — click one for its contour.
        </p>
        <p style={{ fontSize: '0.83rem', marginBottom: 14 }}>
          No ๊ or ๋ columns — those two marks are Standard Thai-only inventions, layered on
          top of the older A/B/C/dead system Northern's tones come from, and this source
          doesn't cover what tone they'd take here. Mai Ek isn't its own column either —
          it always matches unmarked Dead long, so the two are merged below.
        </p>

        <p style={{ marginBottom: 6 }}>
          <strong>Tone box</strong> <span style={{ fontWeight: 400, color: '#666' }}>(Gedney 1999)</span>
        </p>
        <table className={styles.toneTable}>
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '21.75%' }} />
            <col style={{ width: '21.75%' }} />
            <col style={{ width: '21.75%' }} />
            <col style={{ width: '21.75%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Class</th>
              <th>Normal</th>
              <th>Dead (short)</th>
              <th>
                Dead (long)<br />
                <span className={styles.headerMarkRow}>
                  Mai Ek <MarkGlyph mark="่" color="#fff" title="Mai Ek" fontSize="1.2rem" />
                </span>
              </th>
              <th>
                <span className={styles.headerMarkRow}>
                  Mai Tho <MarkGlyph mark="้" color="#fff" title="Mai Tho" fontSize="1.2rem" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.cellHigh}>High</td>
              <td><ToneBoxCell outcomes={NORTHERN_TONE_BOX[0].cells[0]} /></td>
              <td rowSpan={2} style={{ verticalAlign: 'middle' }}>
                <ToneBoxCell outcomes={NORTHERN_TONE_BOX[0].cells[1]} />
              </td>
              <td rowSpan={2} style={{ verticalAlign: 'middle' }}>
                <ToneBoxCell outcomes={NORTHERN_TONE_BOX[0].cells[2]} />
              </td>
              <td rowSpan={2} style={{ verticalAlign: 'middle' }}>
                <ToneBoxCell outcomes={NORTHERN_TONE_BOX[0].cells[3]} />
              </td>
            </tr>
            <tr>
              <td className={styles.cellMid}>Mid</td>
              <td><ToneBoxCell outcomes={NORTHERN_TONE_BOX[1].cells[0]} /></td>
            </tr>
            <tr>
              <td className={styles.cellLow}>Low</td>
              {NORTHERN_TONE_BOX[2].cells.map((cell, i) => (
                <td key={i}><ToneBoxCell outcomes={cell} /></td>
              ))}
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '0.83rem', color: '#666', marginTop: 10 }}>
          Source: Gedney (1999), as tabulated in Wikipedia's{' '}
          <a href="https://en.wikipedia.org/wiki/Lanna_language#Tones" target="_blank" rel="noreferrer">
            Lanna language
          </a>{' '}
          article. Dead syllables don't add new tones — every cell above reuses one of
          the 6 live-syllable tones.
        </p>
      </div>
      )}

      <div className="tone-rules" style={{ marginTop: 24 }}>
        <p style={{ fontSize: '0.83rem', color: '#555', margin: '0 0 6px 0' }}>
          Each card above plots its tone as a pitch curve over time. Vertical scale = Chao
          tone letters (1 = lowest pitch, 5 = highest). Horizontal = duration.
        </p>
        {lang === 'thai' && (
        <>
        <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 4px 0' }}>
          Card names abbreviate the full form prefixed with{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>เสียง</span>{' '}
          <em>(/sǐaŋ/, "tone")</em> — e.g.{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>เสียงสามัญ</span>,{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>เสียงจัตวา</span>, etc.
        </p>
        <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 10px 0' }}>
          Tone marks themselves take{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>ไม้</span>{' '}
          <em>(/máj/, "stick")</em> — e.g.{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>ไม้เอก</span>,{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>ไม้โท</span>{' '}
          (hover a card's corner glyph for IPA).
        </p>
        </>
        )}
        {lang === 'northern' && (
        <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 10px 0' }}>
          Card names are Gedney box codes — which class + environment combinations
          (see the table above) produce that tone.
        </p>
        )}
        <p style={{ fontSize: '0.83rem', margin: '0 0 10px 0' }}>
          <strong>Number of unique tones: {lang === 'thai' ? THAI_TONES.length : NORTHERN_TONES.length}</strong>
        </p>
        <div className={styles.grid}>
          {(lang === 'thai' ? THAI_TONES : NORTHERN_TONES).map((t, i) => <ToneCard key={i} tone={t} />)}
        </div>
      </div>

      {lang === 'thai' && (
      <div className={styles.drillBox}>
        <strong>How to practice:</strong> say each tone while tracing the curve with your finger or voice.<br />
        <strong>Classic drill (5 real words):</strong>{' '}
        <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>คา · ข่า · ค่า · ค้า · ขา</span>
        {' '}<span style={{ color: '#666' }}>(kʰaː · kʰàː · kʰâː · kʰáː · kʰǎː) = <em>stuck · galangal · cost · to trade · leg</em></span>
        {' '}— all 5 tones in canonical order (Mid · Low · Falling · High · Rising).<br />
        <strong>Alt drill (one mid-class letter + all 4 tone marks):</strong>{' '}
        <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ปา · ป่า · ป้า · ป๊า · ป๋า</span>
        {' '}<span style={{ color: '#666' }}>(paː · pàː · pâː · páː · pǎː) = <em>throw · forest · aunt · dad · dad (slang)</em></span>
        {' '}— showcases no-mark, ่, ้, ๊, ๋ all on one mid-class initial.
      </div>
      )}
    </div>
  );
}
