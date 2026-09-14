import { useState } from 'react';
import { byClass, CONSONANTS } from '../data/consonants';
import type { Consonant, SoundGroup } from '../data/consonants';
import styles from './ConsonantsTab.module.css';

function Tags({ c }: { c: Consonant }) {
  return c.sonorant ? <span className="sonorant-tag">SONORANT</span> : null;
}

/** Render the final-sound cell. Two cases:
 *  - "—" means the consonant has no final form (can't end a syllable).
 *  - otherwise: show the final value, dimmed when it's identical to the
 *    initial (a distinct ditto glyph doesn't share the column's font metrics
 *    and never visually lines up with the plain-text rows around it). */
function FinalSound({ initial, final }: { initial: string; final: string }) {
  if (final === '—') {
    return <span className={styles.finalNone}>—</span>;
  }
  if (final === initial) {
    return <span className={styles.finalSame}>{final}</span>;
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

/** Letter + name as one unit — shared by ClassTable's two layouts (one per
 *  row when ungrouped, several side by side in a cell when grouped by
 *  sound) so a consonant looks the same regardless of which table it's in. */
function LetterName({ c }: { c: Consonant }) {
  const dim = c.obsolete ? { opacity: 0.4 } : undefined;
  return (
    <span
      className={styles.label}
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, cursor: 'help' }}
      data-tooltip={`/${c.nameRom}/ · ${c.meaning}`}
    >
      <span className="thai-letter" style={dim}>{c.letter}</span>
      <span className="thai-name" style={dim}>
        {c.name}
        {c.rare && <span className="rare-tag"> R</span>}
        {c.obsolete && <span className="obsolete-tag"> OBS</span>}
      </span>
    </span>
  );
}

/** A ไตรยางศ์ mnemonic sentence, each word's leading consonant (the one it
 *  stands for) underlined in place — replaces a separate letters list below
 *  the sentence with the same information, attached to the word that
 *  actually carries it. The tooltip is the usual `/ipa/ · gloss` pattern,
 *  for this word itself (matching the sentence's own translation) — not
 *  that letter's unrelated alphabet name; ผ's alphabet name is "ผึ้ง" (bee),
 *  which has nothing to do with "ผี" (ghost) just because they share an
 *  initial. */
function MnemonicSentence({ words }: { words: { word: string; ipa: string; gloss: string }[] }) {
  return (
    <span style={{ fontFamily: 'var(--thai-font)', fontSize: '1.3rem' }}>
      {words.map(({ word, ipa, gloss }, i) => {
        // A handful of these words open with a leading vowel (เ แ โ ใ ไ),
        // written before the consonant it belongs to even though it's
        // pronounced after — ไก่, เด็ก, โอ่ง, ให้ all start with one. The
        // mnemonic consonant is the first actual ก–ฮ character, not word[0].
        const idx = [...word].findIndex(ch => ch >= 'ก' && ch <= 'ฮ');
        const letter = idx >= 0 ? word[idx] : word[0];
        return (
          <span key={i}>
            {i > 0 && ' '}
            {/* The tooltip covers the whole word, not just the underlined
               letter — the gloss describes the word ("ghost" for ผี), so
               hovering anywhere on it should surface that, not just the one
               character singled out for the ไตรยางศ์ teaching point. */}
            <span className={styles.label} style={{ cursor: 'help' }} data-tooltip={`/${ipa}/ · ${gloss}`}>
              {idx > 0 && word.slice(0, idx)}
              <span style={{ textDecoration: 'underline', fontWeight: 700 }}>{letter}</span>
              {word.slice(idx + 1)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** A letter or a consonant's own name-word, tooltipped the usual way — for
 *  referencing specific consonants inline in prose (not a full mnemonic
 *  sentence, which needs its own gloss per `MnemonicSentence` above). */
function ConsonantWord({ text, by }: { text: string; by: 'letter' | 'nameShort' }) {
  const c = CONSONANTS.find(x => (by === 'letter' ? x.letter === text : x.nameShort === text));
  return (
    <span
      className={styles.label}
      style={{ cursor: c ? 'help' : undefined }}
      data-tooltip={c ? `/${c.nameRom}/ · ${c.meaning}` : undefined}
    >
      {text}
    </span>
  );
}

/** Groups a class's letters by shared sound (e.g. ด/ฎ both /d/), same shape
 *  as the By Sound view's own groups — letters that sound identical stay
 *  distinct entries (different history, different rarity) but read as one
 *  row instead of one apiece. */
function groupByInitial(rows: Consonant[]): SoundGroup[] {
  const order: string[] = [];
  const map = new Map<string, Consonant[]>();
  for (const c of rows) {
    if (!map.has(c.initial)) {
      order.push(c.initial);
      map.set(c.initial, []);
    }
    map.get(c.initial)!.push(c);
  }
  return order.map(sound => ({ sound, final: '', letters: map.get(sound)! }));
}

function ClassTable({ klass, headerClass, groupBySound }: { klass: Consonant['klass']; headerClass: string; groupBySound?: boolean }) {
  const rows = byClass(klass);

  if (groupBySound) {
    return (
      <table>
        <thead className={headerClass}>
          <tr>
            <th style={{ width: 180 }}>Sound (Initial → Final)</th>
            <th>Letters</th>
          </tr>
        </thead>
        <tbody>
          {groupByInitial(rows).map(g => (
            <tr key={g.sound}>
              <td className={styles.soundCell}>
                <div className={styles.soundRow}>
                  <span className="initial-sound">{g.sound}</span>
                  <span className={styles.soundArrow}>→</span>
                  <GroupFinal initial={g.sound} letters={g.letters} />
                </div>
                <div className={styles.soundType}>
                  {g.letters[0].type}{' '}<Tags c={g.letters[0]} />
                </div>
              </td>
              <td><div className="pair-cell">{g.letters.map(c => <LetterName key={c.letter} c={c} />)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table>
      <thead className={headerClass}>
        <tr>
          <th style={{ width: 50 }}>#</th>
          <th style={{ width: 210, textAlign: 'left' }}>Letter</th>
          <th>Sound (Initial → Final)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(c => {
          return (
            <tr key={c.num}>
              <td>{c.num}</td>
              <td style={{ textAlign: 'left' }}><LetterName c={c} /></td>
              <td className={styles.soundCell}>
                <div className={styles.soundRow}>
                  <span className="initial-sound">{c.initial}</span>
                  <span className={styles.soundArrow}>→</span>
                  <FinalSound initial={c.initial} final={c.final} />
                </div>
                <div className={styles.soundType}>
                  {c.type}{' '}<Tags c={c} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** One shared `checked`/`onChange` pair, rendered once per class section —
 *  each instance is just a view onto the same state, so ticking any one
 *  updates all three together rather than needing separate sync logic. */
function GroupBySoundToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 10, fontSize: '0.78rem', fontWeight: 400, color: '#555', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      Group by sound
    </label>
  );
}

/** Same bookmark-link treatment as the alphabet-song video at the top of
 *  this tab, but accent-colored per class instead of the fixed red — this
 *  one links to a tone-drill video for that specific class rather than the
 *  whole alphabet. */
function ClassVideoLink({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={styles.videoBookmark}
      style={{ borderLeftColor: color }}
    >
      <span className={styles.videoIcon} style={{ background: color }} aria-hidden>▶</span>
      <span>
        <strong>Video:</strong> {label}
      </span>
      <span className={styles.videoArrow} aria-hidden>↗</span>
    </a>
  );
}

function ByClassView() {
  const [groupBySound, setGroupBySound] = useState(false);
  return (
    <>
      <div className="legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#2563eb' }} /> Mid Class (กลาง) — 9</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#16a34a' }} /> High Class (สูง) — 11</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#dc2626' }} /> Low Class (ต่ำ) — 24</div>
      </div>

      <div className="class-section">
        <div className="class-header mid">Mid Class — อักษรกลาง (9)</div>
        <GroupBySoundToggle checked={groupBySound} onChange={setGroupBySound} />
        <ClassVideoLink
          href="https://www.youtube.com/watch?v=LpU5Pngmq9c"
          label="ฝึกผันเสียงอักษรกลาง ครูนกเล็ก — Mid class tone drill"
          color="#2563eb"
        />
        {/* class-header is display:inline-block — its own margin-bottom
           doesn't collapse with a following block's margin-top the way two
           plain blocks would, it sums with it instead. marginTop:0 here
           avoids stacking on top of that; marginBottom alone (which does
           collapse normally against .mnemBoxMid's own 0 margin-top) is what
           produces a matching gap on the other side. */}
        <div style={{ marginTop: 0, marginBottom: 8 }}>
          <span className={styles.sectionSub} style={{ marginLeft: 0 }}>Unaspirated — always Mid</span>
        </div>
        <div className={styles.mnemBoxMid}>
          <strong>Mnemonic:</strong>{' '}
          <MnemonicSentence words={[
            { word: 'ไก่', ipa: 'kàj', gloss: 'chicken' },
            { word: 'จิก', ipa: 'tɕìk', gloss: 'peck' },
            { word: 'เด็ก', ipa: 'dèk', gloss: 'child' },
            { word: 'ตาย', ipa: 'taːj', gloss: 'dead' },
            { word: 'บน', ipa: 'bon', gloss: 'on top of' },
            { word: 'ปาก', ipa: 'pàːk', gloss: 'mouth/rim (of a jar)' },
            { word: 'โอ่ง', ipa: 'ʔòːŋ', gloss: 'jar' },
          ]} />
          <span style={{ color: '#666' }}> — <em>"A chicken pecks a dead child on top of a jar"</em></span>
        </div>
        <ClassTable klass="mid" headerClass="mid" groupBySound={groupBySound} />
      </div>

      <div className="class-section">
        <div className="class-header high">High Class — อักษรสูง (11)</div>
        <GroupBySoundToggle checked={groupBySound} onChange={setGroupBySound} />
        <ClassVideoLink
          href="https://www.youtube.com/watch?v=fniDdFIKMvA"
          label="ฝึกผันเสียงอักษรสูง ครูนกเล็ก — High class tone drill"
          color="#16a34a"
        />
        <div className={styles.mnemBoxHigh}>
          <strong>Mnemonic:</strong>{' '}
          <MnemonicSentence words={[
            { word: 'ผี', ipa: 'pʰǐː', gloss: 'ghost' },
            { word: 'ฝาก', ipa: 'fàːk', gloss: 'Leave / Give' },
            { word: 'ถุง', ipa: 'tʰǔŋ', gloss: 'bag' },
            { word: 'ข้าว', ipa: 'kʰâːw', gloss: 'rice' },
            { word: 'สาร', ipa: 'sǎːn', gloss: '(milled) — ข้าวสาร is one word, "milled rice"' },
            { word: 'ให้', ipa: 'hâj', gloss: 'give to' },
            { word: 'ฉัน', ipa: 'tɕʰǎn', gloss: 'me' },
          ]} />
          <span style={{ color: '#666' }}> — <em>"A ghost gave a bag of milled rice to me"</em></span>
        </div>
        <p style={{ fontSize: '0.83rem', color: '#555', marginBottom: 10 }}>
          <strong>Unmarked Rising tone always means high class:</strong>{' '}
          <ConsonantWord text="ส" by="letter" /> <ConsonantWord text="เสือ" by="nameShort" />,{' '}
          <ConsonantWord text="ฝ" by="letter" /> <ConsonantWord text="ฝา" by="nameShort" />, and{' '}
          <ConsonantWord text="ถ" by="letter" /> <ConsonantWord text="ถุง" by="nameShort" /> are all recognizable this
          way — 6 of the 11 high-class letters have names that are themselves Rising tone (
          <ConsonantWord text="ฐาน" by="nameShort" />, <ConsonantWord text="ถุง" by="nameShort" />,{' '}
          <ConsonantWord text="ฝา" by="nameShort" />, <ConsonantWord text="ศาลา" by="nameShort" />,{' '}
          <ConsonantWord text="ฤๅษี" by="nameShort" />, <ConsonantWord text="เสือ" by="nameShort" />). There's no tone
          mark that gives high class a Rising tone — marking it always shifts to Low (่) or Falling (้) instead, so
          unmarked is the only way high class ever produces Rising.
        </p>
        <ClassTable klass="high" headerClass="high" groupBySound={groupBySound} />
      </div>

      <div className="class-section">
        <div className="class-header low">Low Class — อักษรต่ำ (24)</div>
        <GroupBySoundToggle checked={groupBySound} onChange={setGroupBySound} />
        <ClassVideoLink
          href="https://www.youtube.com/watch?v=t4iClxXLuoU"
          label="ฝึกผันเสียงวรรณยุกต์ไทย อักษรต่ำ ครูนกเล็ก — Low class tone drill"
          color="#dc2626"
        />
        <div className={styles.mnemBoxLow}>
          <strong>Mnemonic:</strong> <em>everything not in the Mid or High mnemonic</em>{' '}— no sentence to memorize; it's the largest class by elimination.
        </div>
        <p style={{ fontSize: '0.83rem', color: '#555', marginBottom: 10 }}>
          <strong><span className="sonorant-tag">SONORANTS</span> (ง น ม ย ร ล ว) can't reach Rising tone on their
          own:</strong> low class alone can only reach 3 of the 5 tones (Mid, Falling, High) — never Rising or Low.
          Most other low-class sounds swap to a high-class twin instead when a rising tone is needed (ค→ข, ท→ถ,
          พ→ผ...), but sonorants have no high-class twin at all. <strong>ห นำ (leading ห)</strong> is the fix: a
          silent ห in front borrows high-class tone rules, the only way to get a Rising tone out of them. That's all
          it does — ห is silent, it just changes the tone.
        </p>
        <ClassTable klass="low" headerClass="low" groupBySound={groupBySound} />
      </div>

      <div className="tone-rules">
        <h2>Other Notes</h2>
        <p><strong>Only 8 final sounds exist in Thai:</strong> /k/, /t/, /p/ (stops) and /ŋ/, /n/, /m/, /j/, /w/ (sonorants). Many different initial consonants collapse to the same final.</p>
      </div>

      <div className="legend" style={{ marginTop: 4 }}>
        <div className="legend-item"><span className="rare-tag">R</span> rare letter</div>
        <div className="legend-item"><span className="obsolete-tag">OBS</span> obsolete, no longer written</div>
      </div>
    </>
  );
}

export function ConsonantsTab() {
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
      <ByClassView />
    </div>
  );
}
