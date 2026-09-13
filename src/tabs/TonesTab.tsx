import { useState, useMemo, type ReactNode } from 'react';
import { THAI_TONES, NORTHERN_TONES, NORTHERN_TONE_BOX, type ToneBoxOutcome } from '../data/tones';
import { ToneCard } from '../components/ToneCard';
import { analyzeSyllable } from '../lib/analyzeSyllable';
import { standardCellMatch, northernCellMatch, type CellMatch, type NorthernCellMatch } from '../lib/toneLookup';
import styles from './TonesTab.module.css';

type Lang = 'thai' | 'northern';

/** Merged-cell ids per table, for the "split/merge all" button — see
 *  splitCells in TonesTab. */
const THAI_SPLIT_IDS = ['mid-high-dead', 'mid-high-maitho'] as const;
const NORTHERN_SPLIT_IDS = ['high-mid-deadshort', 'high-mid-deadlong', 'high-mid-maitho'] as const;

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
/** `matched` highlights the cell's one outcome; cells that hold two (only
 *  the Mid row's split Normal cell) instead use `highlightCode` to pick
 *  which of the two, since "the whole cell matched" isn't precise enough
 *  there. */
function ToneBoxCell({
  outcomes, matched, highlightCode,
}: { outcomes: ToneBoxOutcome[]; matched?: boolean; highlightCode?: string | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {outcomes.map(({ code, letters, example, exampleGloss }) => (
        <div key={code}>
          {letters && (
            <div style={{ fontFamily: 'var(--thai-font)', fontSize: '0.75rem', color: '#888', marginBottom: 2, paddingLeft: 8 }}>
              {letters}
            </div>
          )}
          <ToneCard
            tone={northernTone(code)} example={example} exampleGloss={exampleGloss}
            highlighted={outcomes.length > 1 ? code === highlightCode : !!matched}
            compact
          />
        </div>
      ))}
    </div>
  );
}

/** Icons for SplitAllButton below — a merged single card vs. separate ones. */
function SplitIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2" width="5.5" height="12" rx="1.2" />
      <rect x="9" y="2" width="5.5" height="12" rx="1.2" />
    </svg>
  );
}

function MergeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
      <line x1="8" y1="2" x2="8" y2="14" strokeDasharray="1.6,1.6" />
    </svg>
  );
}

/** One button controlling every merged cell in a table at once — cells that
 *  fold several class/environment combinations sharing one tone into a
 *  single spanning card. Splitting shows each combination as its own cell
 *  with its own example; merging folds them back into the default view. */
function SplitAllButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button type="button" className={styles.splitAllBtn} onClick={onClick}>
      {expanded ? <MergeIcon /> : <SplitIcon />}
      {expanded ? 'Merge cells' : 'Split cells'}
    </button>
  );
}

/** A <td> that spans multiple rows/columns while merged, or stands alone
 *  once split apart — used for every cell SplitAllButton controls. */
function SplitTd({
  rowSpan, colSpan, children,
}: {
  rowSpan?: number; colSpan?: number; children: ReactNode;
}) {
  return (
    <td rowSpan={rowSpan} colSpan={colSpan} style={{ verticalAlign: 'middle' }}>
      {children}
    </td>
  );
}

/** Type-and-match box: analyzes whichever word is selected (the last one
 *  typed, by default) and reports which card of the table above it lands
 *  on. Once there's more than one word typed, the text plays back next to
 *  the input with every word clickable — clicking one selects it in place
 *  of "the last word", so you can go back and inspect an earlier word
 *  without retyping it; with just one word there's nothing to disambiguate,
 *  so it stays hidden. `note` carries whatever the caller's lookup
 *  (standard or Northern) produced when there's nothing to highlight. */
function TryIt({
  input, onInput, selectedIndex, onSelectWord, note,
}: {
  input: string;
  onInput: (v: string) => void;
  selectedIndex: number;
  onSelectWord: (i: number) => void;
  note?: string | null;
}) {
  const wordMatches = [...input.matchAll(/\S+/g)];
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ marginBottom: 6 }}><strong>Try it</strong></p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={input}
          onChange={e => onInput(e.target.value)}
          placeholder="Type a Thai syllable, e.g. ตา"
          style={{
            fontFamily: 'var(--thai-font)', fontSize: '1.1rem', padding: '8px 10px',
            width: '100%', maxWidth: 280, border: '1px solid #ccc', borderRadius: 6,
          }}
        />
        {wordMatches.length > 1 && (
          <div style={{ fontFamily: 'var(--thai-font)', fontSize: '1.1rem' }}>
            {wordMatches.map((m, i) => (
              <span
                key={i}
                onClick={() => onSelectWord(i)}
                title="Click to analyze this word"
                style={{
                  cursor: 'pointer',
                  marginRight: 6,
                  paddingBottom: 1,
                  fontWeight: i === selectedIndex ? 700 : 400,
                  color: i === selectedIndex ? '#b45309' : undefined,
                  borderBottom: i === selectedIndex ? '3px solid #f59e0b' : '1px solid #ccc',
                }}
              >
                {m[0]}
              </span>
            ))}
          </div>
        )}
      </div>
      {note && (
        <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: 6 }}>{note}</p>
      )}
      <p style={{ fontSize: '0.78rem', color: '#888', marginTop: 6 }}>
        One syllable at a time — the last one, if you type more than one (click another
        to inspect it instead). For a multi-syllable word, try splitting it into
        syllables separated by spaces.
      </p>
    </div>
  );
}


export function TonesTab() {
  const [lang, setLang] = useState<Lang>('thai');
  const [input, setInput] = useState('');
  // null = "track the last word typed"; a number pins a specific word after
  // the user clicks it in the TryIt playback, until they type again.
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  // Which merged table cells (keyed below, e.g. "mid-high-dead") are
  // currently split apart into their separate class/environment cells.
  const [splitCells, setSplitCells] = useState<Set<string>>(new Set());
  // Split/merge every id in the group together, so the button reflects a
  // single all-or-nothing state rather than each cell's own toggle.
  const toggleAll = (ids: readonly string[]) => setSplitCells(prev => {
    const allSplit = ids.every(id => prev.has(id));
    const next = new Set(prev);
    ids.forEach(id => (allSplit ? next.delete(id) : next.add(id)));
    return next;
  });

  const wordMatches = useMemo(() => [...input.matchAll(/\S+/g)], [input]);
  const selectedIndex = selectedIdx !== null && selectedIdx < wordMatches.length ? selectedIdx : wordMatches.length - 1;
  const selectedWord = wordMatches[selectedIndex]?.[0] ?? '';

  const analysis = useMemo(() => (selectedWord ? analyzeSyllable(selectedWord) : null), [selectedWord]);
  const standardMatch: CellMatch | null = useMemo(
    () => (analysis ? standardCellMatch(analysis) : selectedWord ? { key: null, tone: 'Mid', note: 'Couldn’t parse this as a single syllable — it may be a multi-syllable word.' } : null),
    [analysis, selectedWord]
  );
  const northernMatch: NorthernCellMatch | null = useMemo(
    () => (analysis ? northernCellMatch(analysis) : selectedWord ? { cellKey: null, code: null, note: 'Couldn’t parse this as a single syllable — it may be a multi-syllable word.' } : null),
    [analysis, selectedWord]
  );

  // Typing anything new snaps the selection back to tracking the last word.
  const handleInput = (v: string) => { setInput(v); setSelectedIdx(null); };

  // The merged Dead cell folds 4 combinations (Mid/High × dead-short/dead-long)
  // into one key ('mid+high-dead') since they all land on Low tone — split
  // apart, each of the 4 needs picking out individually. Mai Ek (มาร์กเอก) always
  // counts as "long" here regardless of the syllable's actual vowel length,
  // matching the column header "Dead long / Mai Ek", which folds both together.
  const deadMatch = (klass: 'mid' | 'high', col: 'short' | 'long') =>
    standardMatch?.key === 'mid+high-dead' &&
    analysis?.klass === klass &&
    (analysis?.mark === 'ek' ? col === 'long' : analysis?.vowelLength === col);

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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ margin: 0 }}><strong>Unified tone table</strong></p>
          <SplitAllButton
            expanded={THAI_SPLIT_IDS.every(id => splitCells.has(id))}
            onClick={() => toggleAll(THAI_SPLIT_IDS)}
          />
        </div>
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
              <td>
                <ToneCard tone={thaiTone('Mid')} highlighted={standardMatch?.key === 'mid-live'} />
              </td>
              {splitCells.has('mid-high-dead') ? (
                <>
                  <td>
                    <ToneCard
                      tone={thaiTone('Low')} example="ตก" exampleGloss="tòk · to fall"
                      highlighted={deadMatch('mid', 'short')}
                    />
                  </td>
                  <td>
                    <ToneCard
                      tone={thaiTone('Low')} example="จาก" exampleGloss="tɕàːk · from"
                      highlighted={deadMatch('mid', 'long')}
                    />
                  </td>
                </>
              ) : (
                <SplitTd rowSpan={2} colSpan={2}>
                  <ToneCard
                    tone={thaiTone('Low')} example="ถูก" exampleGloss="tʰùːk · correct"
                    highlighted={standardMatch?.key === 'mid+high-dead'}
                  />
                </SplitTd>
              )}
              {splitCells.has('mid-high-maitho') ? (
                <SplitTd>
                  <ToneCard
                    tone={thaiTone('Falling')} example="ป้า" exampleGloss="pâː · aunt"
                    highlighted={standardMatch?.key === 'mid+high-maitho' && analysis?.klass === 'mid'}
                  />
                </SplitTd>
              ) : (
                <SplitTd rowSpan={2}>
                  <ToneCard
                    tone={thaiTone('Falling')} example="ป้า" exampleGloss="pâː · aunt"
                    highlighted={standardMatch?.key === 'mid+high-maitho'}
                  />
                </SplitTd>
              )}
            </tr>
            <tr>
              <td className={styles.cellHigh}>High</td>
              <td>
                <ToneCard tone={thaiTone('Rising')} highlighted={standardMatch?.key === 'high-live'} />
              </td>
              {splitCells.has('mid-high-dead') && (
                <>
                  <td>
                    <ToneCard
                      tone={thaiTone('Low')} example="ผัก" exampleGloss="pʰàk · vegetable"
                      highlighted={deadMatch('high', 'short')}
                    />
                  </td>
                  <td>
                    <ToneCard
                      tone={thaiTone('Low')} example="ถูก" exampleGloss="tʰùːk · correct"
                      highlighted={deadMatch('high', 'long')}
                    />
                  </td>
                </>
              )}
              {splitCells.has('mid-high-maitho') && (
                <SplitTd>
                  <ToneCard
                    tone={thaiTone('Falling')} example="ข้าว" exampleGloss="kʰâːw · rice"
                    highlighted={standardMatch?.key === 'mid+high-maitho' && analysis?.klass === 'high'}
                  />
                </SplitTd>
              )}
            </tr>
            <tr>
              <td className={styles.cellLow}>Low</td>
              <td>
                <ToneCard
                  tone={thaiTone('Mid')} example="มา" exampleGloss="maː · to come"
                  highlighted={standardMatch?.key === 'low-live'}
                />
              </td>
              <td>
                <ToneCard
                  tone={thaiTone('High')} example="นก" exampleGloss="nók · bird"
                  highlighted={standardMatch?.key === 'low-deadshort'}
                />
              </td>
              <td>
                <ToneCard
                  tone={thaiTone('Falling')} example="มาก" exampleGloss="mâːk · much"
                  highlighted={standardMatch?.key === 'low-deadlong'}
                />
              </td>
              <td>
                <ToneCard tone={thaiTone('High')} highlighted={standardMatch?.key === 'low-maitho'} />
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '0.83rem', color: '#666', marginTop: 10 }}>
          Table covers ่ and ้ only. Mid class also has ๊ (→ High) and ๋ (→ Rising), not shown
          here. Mid tone only ever comes unmarked — no mark produces it.
        </p>

        <TryIt
          input={input} onInput={handleInput}
          selectedIndex={selectedIndex} onSelectWord={setSelectedIdx}
          note={standardMatch?.note}
        />
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ margin: 0 }}>
            <strong>Tone box</strong> <span style={{ fontWeight: 400, color: '#666' }}>(Gedney 1999)</span>
          </p>
          <SplitAllButton
            expanded={NORTHERN_SPLIT_IDS.every(id => splitCells.has(id))}
            onClick={() => toggleAll(NORTHERN_SPLIT_IDS)}
          />
        </div>
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
              <td>
                <ToneBoxCell
                  outcomes={NORTHERN_TONE_BOX[0].cells[0]}
                  matched={northernMatch?.cellKey === 'high-normal'}
                  highlightCode={northernMatch?.cellKey === 'high-normal' ? northernMatch.code : null}
                />
              </td>
              {(['deadshort', 'deadlong', 'maitho'] as const).map((col, i) => {
                const id = `high-mid-${col}`;
                const cellKey = `high+mid-${col}`;
                return splitCells.has(id) ? (
                  <SplitTd key={id}>
                    <ToneBoxCell
                      outcomes={NORTHERN_TONE_BOX[0].cells[i + 1]}
                      matched={northernMatch?.cellKey === cellKey && analysis?.klass === 'high'}
                    />
                  </SplitTd>
                ) : (
                  <SplitTd key={id} rowSpan={2}>
                    <ToneBoxCell outcomes={NORTHERN_TONE_BOX[0].cells[i + 1]} matched={northernMatch?.cellKey === cellKey} />
                  </SplitTd>
                );
              })}
            </tr>
            <tr>
              <td className={styles.cellMid}>Mid</td>
              <td>
                <ToneBoxCell
                  outcomes={NORTHERN_TONE_BOX[1].cells[0]}
                  highlightCode={northernMatch?.cellKey === 'mid-normal' ? northernMatch.code : null}
                />
              </td>
              {(['deadshort', 'deadlong', 'maitho'] as const).map((col, i) => {
                const id = `high-mid-${col}`;
                const cellKey = `high+mid-${col}`;
                return splitCells.has(id) && (
                  <SplitTd key={id}>
                    <ToneBoxCell
                      outcomes={NORTHERN_TONE_BOX[1].cells[i + 1]}
                      matched={northernMatch?.cellKey === cellKey && analysis?.klass === 'mid'}
                    />
                  </SplitTd>
                );
              })}
            </tr>
            <tr>
              <td className={styles.cellLow}>Low</td>
              {(['low-normal', 'low-deadshort', 'low-deadlong', 'low-maitho'] as const).map((key, i) => (
                <td key={key}>
                  <ToneBoxCell outcomes={NORTHERN_TONE_BOX[2].cells[i]} matched={northernMatch?.cellKey === key} />
                </td>
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

        <TryIt
          input={input} onInput={handleInput}
          selectedIndex={selectedIndex} onSelectWord={setSelectedIdx}
          note={northernMatch?.note}
        />
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
          {(lang === 'thai' ? THAI_TONES : NORTHERN_TONES).map((t, i) => (
            <ToneCard key={i} tone={t} compact={lang === 'northern'} />
          ))}
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
