import React, { useState, useMemo } from 'react';
import {
  VOWELS,
  VOWEL_ROWS,
  VOWEL_COLS,
  CONSONANTS,
  MANNERS,
  PLACES,
  LANGUAGE_OPTIONS,
  MANNER_DESCRIPTIONS,
  PLACE_DESCRIPTIONS,
  CATEGORY_DESCRIPTIONS,
  CLICKS,
  IMPLOSIVES,
  EJECTIVES,
  OTHER_SYMBOLS,
  AFFRICATES,
  findConsonant,
  isImpossible,
  wikiUrl,
  parseBold,
} from '../data/ipa';
import type {
  ExampleLang,
  IPAVowel,
  IPAConsonant,
  IPALabelled,
  VowelRow,
  VowelCol,
  Place,
} from '../data/ipa';
import styles from './IPATab.module.css';

// Render a bold-marked example word: "**k**ey" → <strong>k</strong>ey
function Example({ word, className }: { word: string; className?: string }) {
  const parts = parseBold(word);
  return (
    <span className={className}>
      {parts.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <React.Fragment key={i}>{p.text}</React.Fragment>))}
    </span>
  );
}

function hasAnyExample(examples: Partial<Record<ExampleLang, string>>, langs: ExampleLang[]): boolean {
  return langs.some(l => !!examples[l]);
}

// ============ Vowels ============

function VowelSymbol({
  entry,
  visibleLangs,
}: {
  entry: IPAVowel;
  visibleLangs: ExampleLang[];
}) {
  const used = hasAnyExample(entry.examples, visibleLangs);
  const Tag = used ? 'a' : 'span';
  const props = used ? { href: wikiUrl(entry.wiki), target: '_blank' as const, rel: 'noopener' } : {};
  return (
    <div className={`${styles.vowelSymbolGroup} ${used ? '' : styles.unused}`}>
      <Tag className={styles.vowelSymbol} {...props}>{entry.symbol}</Tag>
      {visibleLangs.map(l => {
        const w = entry.examples[l];
        if (!w) return null;
        return <Example key={l} word={w} className={`${styles.vowelExample} ${styles[`lang-${l}`] ?? ''}`} />;
      })}
    </div>
  );
}

function VowelCell({
  row,
  col,
  visibleLangs,
}: {
  row: VowelRow;
  col: VowelCol;
  visibleLangs: ExampleLang[];
}) {
  const cellVowels = VOWELS.filter(v => v.row === row && v.col === col)
    .sort((a, b) => Number(a.rounded) - Number(b.rounded));
  return (
    <div className={styles.vowelCell}>
      {cellVowels.map(v => <VowelSymbol key={v.symbol} entry={v} visibleLangs={visibleLangs} />)}
    </div>
  );
}

function VowelChart({ visibleLangs }: { visibleLangs: ExampleLang[] }) {
  const rowLabels: Record<VowelRow, string> = {
    'close': 'Close', 'near-close': 'Near-close', 'close-mid': 'Close-mid',
    'mid': 'Mid', 'open-mid': 'Open-mid', 'near-open': 'Near-open', 'open': 'Open',
  };
  const colLabels: Record<VowelCol, string> = {
    'front': 'Front', 'near-front': 'Near-front', 'central': 'Central',
    'near-back': 'Near-back', 'back': 'Back',
  };
  return (
    <div className={styles.vowelGrid}>
      <div />
      {VOWEL_COLS.map(c => <div key={c} className={styles.vowelColHeader}>{colLabels[c]}</div>)}
      {VOWEL_ROWS.map(r => (
        <React.Fragment key={r}>
          <div className={styles.vowelRowHeader}>{rowLabels[r]}</div>
          {VOWEL_COLS.map(c => <VowelCell key={`${r}-${c}`} row={r} col={c} visibleLangs={visibleLangs} />)}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============ Consonants ============

function ConsonantCell({
  entry,
  visibleLangs,
}: {
  entry: IPAConsonant | undefined;
  visibleLangs: ExampleLang[];
}) {
  if (!entry) return <span className={styles.consonantCell}>&nbsp;</span>;
  const used = hasAnyExample(entry.examples, visibleLangs);
  const cls = `${styles.consonantCell} ${used ? styles.consonantCellUsed : styles.consonantCellUnused}`;
  const inner = (
    <>
      <span className={styles.consonantSymbol}>{entry.symbol}</span>
      {visibleLangs.map(l => {
        const w = entry.examples[l];
        if (!w) return null;
        return <Example key={l} word={w} className={`${styles.consonantExample} ${styles[`lang-${l}`] ?? ''}`} />;
      })}
    </>
  );
  if (used) {
    return <a className={cls} href={wikiUrl(entry.wiki)} target="_blank" rel="noopener">{inner}</a>;
  }
  return <span className={cls}>{inner}</span>;
}

function ConsonantTable({ visibleLangs }: { visibleLangs: ExampleLang[] }) {
  // Hide columns (places) where no consonant has any example in the
  // currently-visible languages. Keeps the table narrow on mobile.
  const visiblePlaces = useMemo(() => {
    return PLACES.filter(p =>
      CONSONANTS.some(c => c.place === p.key && hasAnyExample(c.examples, visibleLangs))
    );
  }, [visibleLangs]);

  return (
    <div className={styles.consonantTableWrap}>
      <table className={styles.consonantTable}>
        <thead>
          <tr>
            <th className={styles.mannerHeader}></th>
            {visiblePlaces.map(p => (
              <th key={p.key} colSpan={2} title={PLACE_DESCRIPTIONS[p.key]}>
                <abbr className={styles.abbr}>{p.label}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MANNERS.map(m => (
            <tr key={m.key}>
              <th className={styles.mannerHeader} title={MANNER_DESCRIPTIONS[m.key]}>
                <abbr className={styles.abbr}>{m.label}</abbr>
              </th>
              {visiblePlaces.flatMap(p => (
                ([false, true] as const).map(voiced => {
                  const impossible = isImpossible(m.key, p.key as Place, voiced);
                  const entry = findConsonant(m.key, p.key as Place, voiced);
                  const key = `${m.key}-${p.key}-${voiced ? 'v' : 'u'}`;
                  const classes = [
                    impossible ? styles.consonantCellImpossible : '',
                    voiced ? '' : styles.placeGroupDivider,
                  ].filter(Boolean).join(' ');
                  if (impossible) return <td key={key} className={classes}>&nbsp;</td>;
                  return (
                    <td key={key} className={classes}>
                      <ConsonantCell entry={entry} visibleLangs={visibleLangs} />
                    </td>
                  );
                })
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Labelled list (non-pulmonic, other, affricates) ============

function LabelledList({ items, visibleLangs }: { items: IPALabelled[]; visibleLangs: ExampleLang[] }) {
  return (
    <ul className={styles.labelledList}>
      {items.map(item => {
        const used = hasAnyExample(item.examples, visibleLangs);
        const Tag = used ? 'a' : 'span';
        const props = used ? { href: wikiUrl(item.wiki), target: '_blank' as const, rel: 'noopener' } : {};
        return (
          <li key={item.symbol} className={`${styles.labelledItem} ${used ? '' : styles.labelledUnused}`}>
            <Tag className={styles.labelledCell} {...props}>
              <span className={styles.labelledSymbol}>{item.symbol}</span>
              <span className={styles.labelledText}>
                {item.label}
                {visibleLangs.map(l => {
                  const w = item.examples[l];
                  if (!w) return null;
                  return (
                    <span key={l} className={`${styles.labelledExampleTag} ${styles[`lang-${l}`] ?? ''}`}>
                      <Example word={w} />
                    </span>
                  );
                })}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

// ============ Tab ============

export function IPATab() {
  const [primaryLang, setPrimaryLang] = useState<ExampleLang>('th');
  const [exampleLangs, setExampleLangs] = useState<Set<ExampleLang>>(() => new Set(['th', 'en', 'fr']));

  const handlePrimaryChange = (lang: ExampleLang) => {
    setPrimaryLang(lang);
    setExampleLangs(prev => {
      const next = new Set(prev);
      next.add(lang); // primary language must always be shown
      return next;
    });
  };

  const toggleExampleLang = (lang: ExampleLang) => {
    setExampleLangs(prev => {
      const next = new Set(prev);
      if (next.has(lang)) {
        if (lang === primaryLang) return prev; // can't deselect primary
        next.delete(lang);
      } else {
        next.add(lang);
      }
      return next;
    });
  };

  // Render languages in a stable order: primary first, then others in the
  // LANGUAGE_OPTIONS order.
  const visibleLangs = useMemo<ExampleLang[]>(() => {
    const ordered: ExampleLang[] = [primaryLang];
    LANGUAGE_OPTIONS.forEach(o => {
      if (o.value !== primaryLang && exampleLangs.has(o.value)) ordered.push(o.value);
    });
    return ordered;
  }, [primaryLang, exampleLangs]);

  return (
    <div id="tab-ipa">
      <div className={styles.intro}>
        <p>
          The <strong>International Phonetic Alphabet</strong> — a universal set of symbols for the
          sounds of spoken language. Each symbol represents one distinct sound. The bold letter(s)
          in every example word are the actual phoneme.
        </p>
        <p>
          <strong>Vowel chart:</strong> the grid is shaped like a cross-section of the mouth —
          horizontal axis = tongue position (front → back), vertical axis = tongue height (close at
          top → open/low at bottom). The slanted trapezoid in the classical IPA chart reflects the
          fact that open-front vowels can be pronounced more outward than close-front ones (there's
          more room at the bottom of the oral cavity).
        </p>
        <p>
          <strong>Cell shading:</strong>{' '}
          <span className={styles.legendChip} style={{ background: '#ecfccb' }} /> green = used in
          a selected language &nbsp;·&nbsp;{' '}
          <span className={styles.legendChip} style={{ background: '#ececec' }} /> light grey =
          not used in selected languages (but exists in IPA) &nbsp;·&nbsp;{' '}
          <span className={styles.legendChip} style={{ background: '#d4d4d4' }} /> dark grey =
          physically impossible articulation (e.g. a pharyngeal nasal).
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.ctrlRow}>
          <label>Language:</label>
          <select
            value={primaryLang}
            onChange={e => handlePrimaryChange(e.target.value as ExampleLang)}
          >
            {LANGUAGE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.ctrlRow}>
          <label>Examples:</label>
          <div className={styles.tagRow}>
            {LANGUAGE_OPTIONS.map(o => {
              const active = exampleLangs.has(o.value);
              const isPrimary = o.value === primaryLang;
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.langTag} ${active ? styles.langTagActive : ''} ${isPrimary ? styles.langTagLocked : ''}`}
                  onClick={() => toggleExampleLang(o.value)}
                  disabled={isPrimary}
                  title={isPrimary ? 'Primary language — always shown' : ''}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#7c3aed' }}>Vowels</div>
        <span className={styles.sectionSub}>
          Where symbols appear in pairs, the one on the right is rounded.
        </span>
      </div>

      <VowelChart visibleLangs={visibleLangs} />

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#0f172a' }}>Pulmonic consonants</div>
        <span className={styles.sectionSub}>
          Within each place-of-articulation column pair, left = voiceless, right = voiced. Only columns that are used in the selected languages are shown.
        </span>
      </div>

      <ConsonantTable visibleLangs={visibleLangs} />

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#0891b2' }}>Non-pulmonic consonants</div>
        <span className={styles.sectionSub}>Sounds made without lung airflow.</span>
      </div>
      <div className={styles.threeCol}>
        <div>
          <h4 className={styles.subHeading} title={CATEGORY_DESCRIPTIONS.Clicks}>
            <abbr className={styles.abbr}>Clicks</abbr>
          </h4>
          <LabelledList items={CLICKS} visibleLangs={visibleLangs} />
        </div>
        <div>
          <h4 className={styles.subHeading} title={CATEGORY_DESCRIPTIONS['Voiced implosives']}>
            <abbr className={styles.abbr}>Voiced implosives</abbr>
          </h4>
          <LabelledList items={IMPLOSIVES} visibleLangs={visibleLangs} />
        </div>
        <div>
          <h4 className={styles.subHeading} title={CATEGORY_DESCRIPTIONS.Ejectives}>
            <abbr className={styles.abbr}>Ejectives</abbr>
          </h4>
          <LabelledList items={EJECTIVES} visibleLangs={visibleLangs} />
        </div>
      </div>

      <div className="class-section" style={{ marginTop: 18, marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#b45309' }} title={CATEGORY_DESCRIPTIONS['Other symbols']}>
          Other symbols
        </div>
        <span className={styles.sectionSub}>{CATEGORY_DESCRIPTIONS['Other symbols']}</span>
      </div>
      <LabelledList items={OTHER_SYMBOLS} visibleLangs={visibleLangs} />

      <div className="class-section" style={{ marginTop: 18, marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#16a34a' }} title={CATEGORY_DESCRIPTIONS.Affricates}>
          Affricates
        </div>
        <span className={styles.sectionSub}>{CATEGORY_DESCRIPTIONS.Affricates}</span>
      </div>
      <LabelledList items={AFFRICATES} visibleLangs={visibleLangs} />

      <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 16 }}>
        Layout adapted from{' '}
        <a href="https://www.ipachart.com/" target="_blank" rel="noopener">ipachart.com</a>. Audio &amp;
        details via each symbol's Wikipedia article (sourced from Wikimedia Commons). Hover over any
        <em> manner</em> or <em>place</em> label for a short description.
      </p>
    </div>
  );
}
