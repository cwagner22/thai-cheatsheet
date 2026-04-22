import React, { useState, useMemo } from 'react';
import {
  VOWELS,
  VOWEL_ROWS,
  VOWEL_COLS,
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
  playIpaSound,
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

/** Primary language has an example for this phoneme. */
function isPrimaryUsed(examples: Partial<Record<ExampleLang, string>>, primary: ExampleLang): boolean {
  return !!examples[primary];
}

// ============ Vowels ============

function VowelSymbol({
  entry,
  visibleLangs,
  primaryUsed,
  showOther,
}: {
  entry: IPAVowel;
  visibleLangs: ExampleLang[];
  primaryUsed: boolean;
  showOther: boolean;
}) {
  // Coloring: when `showOther` is off, everything shown is primary-used, so
  // use a neutral background. When it's on, primary-used cells get the green
  // tint; non-primary ones stay muted grey.
  const toneClass = !showOther ? '' : primaryUsed ? styles.used : styles.unused;
  const clickable = !showOther || primaryUsed;
  return (
    <div
      className={`${styles.vowelSymbolGroup} ${toneClass} ${clickable ? styles.playable : ''}`}
      onClick={clickable ? () => playIpaSound(entry.wiki) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playIpaSound(entry.wiki); } } : undefined}
      aria-label={clickable ? `Play ${entry.symbol}` : undefined}
    >
      <span className={styles.vowelSymbol}>{entry.symbol}</span>
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
  primaryLang,
  showOther,
}: {
  row: VowelRow;
  col: VowelCol;
  visibleLangs: ExampleLang[];
  primaryLang: ExampleLang;
  showOther: boolean;
}) {
  const cellVowels = VOWELS.filter(v => v.row === row && v.col === col);
  const unrounded = cellVowels.find(v => !v.rounded);
  const rounded = cellVowels.find(v => v.rounded);

  const shouldShow = (v: IPAVowel | undefined) =>
    !!v && (showOther || isPrimaryUsed(v.examples, primaryLang));

  const showUnrounded = shouldShow(unrounded);
  const showRounded = shouldShow(rounded);

  if (!showUnrounded && !showRounded) {
    return <div className={styles.vowelCell} />;
  }

  // Always render both slots (filled or placeholder) so a single vowel stays
  // anchored to its correct side — unrounded on the left, rounded on the right.
  return (
    <div className={styles.vowelCell}>
      {showUnrounded && unrounded ? (
        <VowelSymbol
          entry={unrounded}
          visibleLangs={visibleLangs}
          primaryUsed={isPrimaryUsed(unrounded.examples, primaryLang)}
          showOther={showOther}
        />
      ) : (
        <div className={styles.vowelSlotPlaceholder} aria-hidden />
      )}
      {showRounded && rounded ? (
        <VowelSymbol
          entry={rounded}
          visibleLangs={visibleLangs}
          primaryUsed={isPrimaryUsed(rounded.examples, primaryLang)}
          showOther={showOther}
        />
      ) : (
        <div className={styles.vowelSlotPlaceholder} aria-hidden />
      )}
    </div>
  );
}

function VowelChart({
  visibleLangs,
  primaryLang,
  showOther,
}: {
  visibleLangs: ExampleLang[];
  primaryLang: ExampleLang;
  showOther: boolean;
}) {
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
          {VOWEL_COLS.map(c => (
            <VowelCell
              key={`${r}-${c}`}
              row={r}
              col={c}
              visibleLangs={visibleLangs}
              primaryLang={primaryLang}
              showOther={showOther}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============ Consonants ============

function ConsonantCell({
  entry,
  visibleLangs,
  primaryUsed,
  showOther,
}: {
  entry: IPAConsonant;
  visibleLangs: ExampleLang[];
  primaryUsed: boolean;
  showOther: boolean;
}) {
  // When "show other" is off, every shown cell is primary-used → render
  // neutral. When it's on, primary-used cells get green; others grey.
  const toneClass = !showOther
    ? styles.consonantCellPlain
    : primaryUsed
      ? styles.consonantCellUsed
      : styles.consonantCellUnused;
  const cls = `${styles.consonantCell} ${toneClass}`;
  const clickable = !showOther || primaryUsed;
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
  if (clickable) {
    return (
      <button
        type="button"
        className={`${cls} ${styles.playable}`}
        onClick={() => playIpaSound(entry.wiki)}
        aria-label={`Play ${entry.symbol}`}
      >
        {inner}
      </button>
    );
  }
  return <span className={cls}>{inner}</span>;
}

function ConsonantTable({
  visibleLangs,
  primaryLang,
  showOther,
}: {
  visibleLangs: ExampleLang[];
  primaryLang: ExampleLang;
  showOther: boolean;
}) {
  // A consonant entry renders only when the primary language uses it, or
  // when "show other" is on (to include secondary-language & reference sounds).
  const cellShouldRender = (m: string, p: string, voiced: boolean) => {
    const entry = findConsonant(m as IPAConsonant['manner'], p as Place, voiced);
    if (!entry) return false;
    if (showOther) return true;
    return isPrimaryUsed(entry.examples, primaryLang);
  };

  // Show a place column only if at least one cell in it renders.
  const visiblePlaces = useMemo(() => {
    return PLACES.filter(p =>
      MANNERS.some(m =>
        cellShouldRender(m.key, p.key, false) || cellShouldRender(m.key, p.key, true)
      )
    );
  }, [visibleLangs, showOther]);

  // Hide a row (manner) entirely if no place has a renderable cell.
  const visibleManners = useMemo(() => {
    return MANNERS.filter(m =>
      visiblePlaces.some(p =>
        cellShouldRender(m.key, p.key, false) || cellShouldRender(m.key, p.key, true)
      )
    );
  }, [visibleLangs, showOther, visiblePlaces]);

  if (visiblePlaces.length === 0 || visibleManners.length === 0) {
    return <p className={styles.emptyNote}>No pulmonic consonants to show for the selected languages.</p>;
  }

  return (
    <div className={styles.consonantTableWrap}>
      <table className={styles.consonantTable}>
        <thead>
          <tr>
            <th className={styles.mannerHeader}></th>
            {visiblePlaces.map(p => (
              <th key={p.key} colSpan={2}>
                <abbr className={styles.abbr} title={PLACE_DESCRIPTIONS[p.key]}>{p.label}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleManners.map(m => (
            <tr key={m.key}>
              <th className={styles.mannerHeader}>
                <abbr className={styles.abbr} title={MANNER_DESCRIPTIONS[m.key]}>{m.label}</abbr>
              </th>
              {visiblePlaces.flatMap(p => (
                ([false, true] as const).map(voiced => {
                  const entry = findConsonant(m.key, p.key as Place, voiced);
                  const render = cellShouldRender(m.key, p.key, voiced);
                  const key = `${m.key}-${p.key}-${voiced ? 'v' : 'u'}`;
                  if (!render || !entry) return <td key={key}>&nbsp;</td>;
                  return (
                    <td key={key}>
                      <ConsonantCell
                        entry={entry}
                        visibleLangs={visibleLangs}
                        primaryUsed={isPrimaryUsed(entry.examples, primaryLang)}
                        showOther={showOther}
                      />
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

function LabelledList({
  items,
  visibleLangs,
  primaryLang,
  showOther,
}: {
  items: IPALabelled[];
  visibleLangs: ExampleLang[];
  primaryLang: ExampleLang;
  showOther: boolean;
}) {
  const shown = items.filter(item => showOther || isPrimaryUsed(item.examples, primaryLang));
  if (shown.length === 0) return null;
  return (
    <ul className={styles.labelledList}>
      {shown.map(item => {
        const primaryUsed = isPrimaryUsed(item.examples, primaryLang);
        // Same coloring rule as the main table: neutral when the checkbox is
        // off (since everything shown is primary-used), green/grey when on.
        const toneClass = !showOther
          ? styles.labelledPlain
          : primaryUsed
            ? ''
            : styles.labelledUnused;
        const clickable = !showOther || primaryUsed;
        return (
          <li key={item.symbol} className={`${styles.labelledItem} ${toneClass}`}>
            {clickable ? (
              <button
                type="button"
                className={`${styles.labelledCell} ${styles.playable}`}
                onClick={() => playIpaSound(item.wiki)}
                aria-label={`Play ${item.symbol}`}
              >
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
              </button>
            ) : (
              <span className={styles.labelledCell}>
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
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** True when a labelled-list section has at least one item to show. */
function hasAnyItem(items: IPALabelled[], primaryLang: ExampleLang, showOther: boolean): boolean {
  return items.some(item => showOther || isPrimaryUsed(item.examples, primaryLang));
}

// ============ Tab ============

export function IPATab() {
  const [primaryLang, setPrimaryLang] = useState<ExampleLang>('th');
  const [exampleLangs, setExampleLangs] = useState<Set<ExampleLang>>(() => new Set(['th', 'en', 'fr']));
  const [showOther, setShowOther] = useState<boolean>(false);

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
        if (lang === primaryLang) return prev;
        next.delete(lang);
      } else {
        next.add(lang);
      }
      return next;
    });
  };

  const visibleLangs = useMemo<ExampleLang[]>(() => {
    const ordered: ExampleLang[] = [primaryLang];
    LANGUAGE_OPTIONS.forEach(o => {
      if (o.value !== primaryLang && exampleLangs.has(o.value)) ordered.push(o.value);
    });
    return ordered;
  }, [primaryLang, exampleLangs]);

  // Section visibility checks for Non-pulmonic / Other / Affricates.
  const showClicks     = hasAnyItem(CLICKS,        primaryLang, showOther);
  const showImplosives = hasAnyItem(IMPLOSIVES,    primaryLang, showOther);
  const showEjectives  = hasAnyItem(EJECTIVES,     primaryLang, showOther);
  const showNonPulmonic = showClicks || showImplosives || showEjectives;
  const showOtherSection = hasAnyItem(OTHER_SYMBOLS, primaryLang, showOther);
  const showAffricates   = hasAnyItem(AFFRICATES,    primaryLang, showOther);

  const primaryLabel = LANGUAGE_OPTIONS.find(o => o.value === primaryLang)?.label ?? primaryLang;

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
        <div className={styles.ctrlRow}>
          <label>
            <input
              type="checkbox"
              checked={showOther}
              onChange={e => setShowOther(e.target.checked)}
            />{' '}
            Also show sounds not used in {primaryLabel} (full IPA reference)
          </label>
        </div>
      </div>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#7c3aed' }}>Vowels</div>
        <span className={styles.sectionSub}>right = rounded</span>
      </div>

      <VowelChart visibleLangs={visibleLangs} primaryLang={primaryLang} showOther={showOther} />

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader} style={{ background: '#0f172a' }}>Pulmonic consonants</div>
        <span className={styles.sectionSub}>left = voiceless, right = voiced</span>
      </div>

      <ConsonantTable visibleLangs={visibleLangs} primaryLang={primaryLang} showOther={showOther} />

      {showNonPulmonic && (
        <>
          <div className="class-section" style={{ marginBottom: 8 }}>
            <div className={styles.sectionHeader} style={{ background: '#0891b2' }}>Non-pulmonic consonants</div>
            <span className={styles.sectionSub}>Sounds made without lung airflow.</span>
          </div>
          <div className={styles.threeCol}>
            {showClicks && (
              <div>
                <h4 className={styles.subHeading}>
                  <abbr className={styles.abbr} title={CATEGORY_DESCRIPTIONS.Clicks}>Clicks</abbr>
                </h4>
                <LabelledList items={CLICKS} visibleLangs={visibleLangs} primaryLang={primaryLang} showOther={showOther} />
              </div>
            )}
            {showImplosives && (
              <div>
                <h4 className={styles.subHeading}>
                  <abbr className={styles.abbr} title={CATEGORY_DESCRIPTIONS['Voiced implosives']}>Voiced implosives</abbr>
                </h4>
                <LabelledList items={IMPLOSIVES} visibleLangs={visibleLangs} primaryLang={primaryLang} showOther={showOther} />
              </div>
            )}
            {showEjectives && (
              <div>
                <h4 className={styles.subHeading}>
                  <abbr className={styles.abbr} title={CATEGORY_DESCRIPTIONS.Ejectives}>Ejectives</abbr>
                </h4>
                <LabelledList items={EJECTIVES} visibleLangs={visibleLangs} primaryLang={primaryLang} showOther={showOther} />
              </div>
            )}
          </div>
        </>
      )}

      {showOtherSection && (
        <>
          <div className="class-section" style={{ marginTop: 18, marginBottom: 8 }}>
            <div className={styles.sectionHeader} style={{ background: '#b45309' }} title={CATEGORY_DESCRIPTIONS['Other symbols']}>
              Other symbols
            </div>
            <span className={styles.sectionSub}>{CATEGORY_DESCRIPTIONS['Other symbols']}</span>
          </div>
          <LabelledList items={OTHER_SYMBOLS} visibleLangs={visibleLangs} primaryLang={primaryLang} showOther={showOther} />
        </>
      )}

      {showAffricates && (
        <>
          <div className="class-section" style={{ marginTop: 18, marginBottom: 8 }}>
            <div className={styles.sectionHeader} style={{ background: '#16a34a' }} title={CATEGORY_DESCRIPTIONS.Affricates}>
              Affricates
            </div>
            <span className={styles.sectionSub}>{CATEGORY_DESCRIPTIONS.Affricates}</span>
          </div>
          <LabelledList items={AFFRICATES} visibleLangs={visibleLangs} primaryLang={primaryLang} showOther={showOther} />
        </>
      )}

      <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 16 }}>
        Layout adapted from{' '}
        <a href="https://www.ipachart.com/" target="_blank" rel="noopener">ipachart.com</a>. Click any
        cell to hear the sound (audio sourced from Wikimedia Commons). Hover over any
        <em> manner</em> or <em>place</em> label for a short description.
      </p>
    </div>
  );
}
