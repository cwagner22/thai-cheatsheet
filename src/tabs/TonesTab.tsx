import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THAI_TONES, NORTHERN_TONES } from '../data/tones';
import { ToneCard } from '../components/ToneCard';
import styles from './TonesTab.module.css';

type Lang = 'thai' | 'northern';

type ToneName = 'Mid' | 'Low' | 'Falling' | 'High' | 'Rising';

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
function ToneGlyph({ name, color }: { name: ToneName; color?: string }) {
  const mark = TONE_MARK[name];
  if (!mark) return null;
  return (
    <span
      className={`${styles.toneGlyph} ${styles.toneGlyphCombining}`}
      style={{ color: color ?? TONE_COLOR[name] }}
      title={`${name} tone`}
    >
      {mark}
    </span>
  );
}

/** Map ToneName to its THAI_TONES entry (for popover content). */
function toneEntry(name: ToneName) {
  return THAI_TONES.find(t => t.nameEn === name);
}

/** Wraps a child (the tone mark glyph) so clicking/tapping it reveals the
 *  matching contour card in a floating popover. Hover does not open the
 *  popover, but the cursor signals it's clickable. */
function TonePopover({ tone, children }: { tone: ToneName; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    // Use document-relative coords so the popover scrolls with the page,
    // staying anchored to the trigger cell instead of fixed in the viewport.
    setPos({
      x: r.left + r.width / 2 + window.scrollX,
      y: r.bottom + window.scrollY + 8,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  const entry = toneEntry(tone);
  if (!entry) return <>{children}</>;

  return (
    <span
      ref={wrapperRef}
      className={styles.tonePopoverTrigger}
      onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
    >
      {children}
      {open && pos && createPortal(
        <div
          className={styles.tonePopover}
          style={{ left: pos.x, top: pos.y }}
        >
          <ToneCard tone={entry} />
        </div>,
        document.body
      )}
    </span>
  );
}


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
          → Yes: check the tone mark table below for the mark + class.<br /><br />
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
          <strong>Unified tone table</strong>
        </p>
        <table className={styles.toneTable}>
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '14.5%' }} />
            <col style={{ width: '14.5%' }} />
            <col style={{ width: '14.5%' }} />
            <col style={{ width: '14.5%' }} />
            <col style={{ width: '14.5%' }} />
            <col style={{ width: '14.5%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Class</th>
              <th>Live</th>
              <th>Dead short</th>
              <th>
                Dead long<br />
                <ToneGlyph name="Low" color="#fff" />
              </th>
              <th><ToneGlyph name="Falling" color="#fff" /></th>
              <th><ToneGlyph name="High" color="#fff" /></th>
              <th><ToneGlyph name="Rising" color="#fff" /></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.cellMid}>Mid</td>
              <td style={{ background: '#dbeafe' }}><ToneGlyph name="Mid" /></td>
              <td rowSpan={2} colSpan={2} style={{ background: '#fee2e2', verticalAlign: 'middle' }}>
                <TonePopover tone="Low"><ToneGlyph name="Low" /></TonePopover>
              </td>
              <td rowSpan={2} style={{ background: '#ede9fe', verticalAlign: 'middle' }}>
                <TonePopover tone="Falling"><ToneGlyph name="Falling" /></TonePopover>
              </td>
              <td>
                <TonePopover tone="High"><ToneGlyph name="High" /></TonePopover>
              </td>
              <td>
                <TonePopover tone="Rising"><ToneGlyph name="Rising" /></TonePopover>
              </td>
            </tr>
            <tr>
              <td className={styles.cellHigh}>High</td>
              <td>
                <TonePopover tone="Rising"><ToneGlyph name="Rising" /></TonePopover>
              </td>
            </tr>
            <tr>
              <td className={styles.cellLow}>Low</td>
              <td style={{ background: '#dbeafe' }}><ToneGlyph name="Mid" /></td>
              <td>
                <TonePopover tone="High"><ToneGlyph name="High" /></TonePopover>
              </td>
              <td>
                <TonePopover tone="Falling"><ToneGlyph name="Falling" /></TonePopover>
              </td>
              <td>
                <TonePopover tone="High"><ToneGlyph name="High" /></TonePopover>
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '0.83rem', color: '#666', marginTop: 10 }}>
          Only mid class uses all 4 marks, reaching all 5 tones. A tone mark never gives Mid.
        </p>
      </div>

      <div className="tone-rules" style={{ marginTop: 24 }}>
        <h2 style={{ margin: '0 0 6px 0' }}>Pronunciation — Contour Visualization</h2>
        <p style={{ fontSize: '0.83rem', color: '#555', margin: '0 0 6px 0' }}>
          Each tone plotted as a pitch curve over time. Vertical scale = Chao tone letters (1 = lowest pitch, 5 = highest). Horizontal = duration.
        </p>
        <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 4px 0' }}>
          Names below abbreviate the full form prefixed with{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>เสียง</span>{' '}
          <em>(/sǐaŋ/, "tone")</em> — e.g.{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>เสียงสามัญ</span>,{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>เสียงจัตวา</span>,{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>เสียง</span>T1, etc.
        </p>
        <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 10px 0' }}>
          Tone marks themselves take{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>ไม้</span>{' '}
          <em>(/máj/, "stick")</em> — e.g.{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>ไม้เอก</span>,{' '}
          <span style={{ fontFamily: 'var(--thai-font)' }}>ไม้โท</span>{' '}
          (hover the corner glyph on a card for IPA).
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
        <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>คา · ข่า · ค่า · ค้า · ขา</span>
        {' '}<span style={{ color: '#666' }}>(kʰaː · kʰàː · kʰâː · kʰáː · kʰǎː) = <em>stuck · galangal · cost · to trade · leg</em></span>
        {' '}— all 5 tones in canonical order (Mid · Low · Falling · High · Rising).<br />
        <strong>Alt drill (one mid-class letter + all 4 tone marks):</strong>{' '}
        <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.05rem' }}>ปา · ป่า · ป้า · ป๊า · ป๋า</span>
        {' '}<span style={{ color: '#666' }}>(paː · pàː · pâː · páː · pǎː) = <em>throw · forest · aunt · dad · dad (slang)</em></span>
        {' '}— showcases no-mark, ่, ้, ๊, ๋ all on one mid-class initial.
      </div>
    </div>
  );
}
