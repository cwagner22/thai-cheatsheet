import { useEffect, useRef, useState } from 'react';
import {
  TRUE_CLUSTERS,
  FALSE_CLUSTERS,
  LEADING_HO,
  LEADING_OR,
} from '../data/clusters';
import { speakThai } from '../lib/speak';
import styles from './ClustersTab.module.css';

/** How long a tap keeps the translation on screen. */
const REVEAL_MS = 1800;

/** A Thai example: click to hear it, hover for its IPA and translation.
 *
 *  The IPA is printed beside the word *and* repeated in the tooltip. Every
 *  section of this tab is about how a spelling maps to a sound, so the
 *  transcription has to stay readable at a glance — but it sits dimmed
 *  next to the Thai so the script leads, and the tooltip is where it can
 *  be read at full contrast alongside the meaning.
 *
 *  A tap both plays the word and flashes the tooltip, because a touch
 *  screen has no hover to show it with and audio and a label don't collide
 *  — one gesture can carry both. `data-show` only paints on a device
 *  without hover (see the stylesheet), so a mouse click doesn't pin a
 *  bubble that hovering is already showing. */
function Example({ word, ipa, gloss, className = 'thai-name' }: {
  word: string;
  ipa: string;
  gloss?: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const play = () => {
    speakThai(word);
    setRevealed(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setRevealed(false), REVEAL_MS);
  };

  return (
    <>
      <span
        className={`${className} ${styles.label}`}
        style={{ cursor: 'pointer' }}
        data-tooltip={gloss ? `/${ipa}/ · ${gloss}` : `/${ipa}/`}
        data-show={revealed ? '' : undefined}
        onClick={play}
      >
        {word}
      </span>{' '}
      <span className={styles.ipa}>/{ipa}/</span>
    </>
  );
}

function TrueClusterCell({
  entry,
}: {
  entry?: { form: string; ipa: string; example: string; rom: string; gloss: string };
}) {
  if (!entry) return <td style={{ textAlign: 'center', color: '#ccc' }}>—</td>;
  return (
    <td style={{ textAlign: 'center' }}>
      <span className="thai-letter">{entry.form}</span>{' '}
      <span className={styles.ipa}>{entry.ipa}</span><br />
      <span className={styles.ex}>
        <Example word={entry.example} ipa={entry.rom} gloss={entry.gloss} />
      </span>
    </td>
  );
}

function ThaiInline({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'var(--thai-font)' }}>{children}</span>;
}

export function ClustersTab() {
  return (
    <div id="tab-clusters">
      <div className="tone-rules">
        <h2>Consonant Clusters — อักษรควบ</h2>
        <p>
          When two consonants appear together without a vowel between them, they form a cluster. Thai
          has three types.
        </p>
      </div>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className="class-header" style={{ background: '#2563eb' }}>True Clusters — อักษรควบแท้</div>
        <span className={styles.sectionSub}>Both consonants are pronounced together</span>
      </div>

      <table style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th style={{ background: '#2563eb', width: 80 }} />
            <th style={{ background: '#2563eb', textAlign: 'center', fontFamily: 'var(--thai-font)', fontSize: '1.2rem' }}>+ ร</th>
            <th style={{ background: '#2563eb', textAlign: 'center', fontFamily: 'var(--thai-font)', fontSize: '1.2rem' }}>+ ล</th>
            <th style={{ background: '#2563eb', textAlign: 'center', fontFamily: 'var(--thai-font)', fontSize: '1.2rem' }}>+ ว</th>
          </tr>
        </thead>
        <tbody>
          {TRUE_CLUSTERS.map(row => (
            <tr key={row.initial}>
              <td><span className="thai-letter">{row.initial}</span></td>
              <TrueClusterCell entry={row.plusR} />
              <TrueClusterCell entry={row.plusL} />
              <TrueClusterCell entry={row.plusW} />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className="class-header" style={{ background: '#dc2626' }}>False Clusters — อักษรควบไม่แท้</div>
        <span className={styles.sectionSub}>The ร is silent — only the first consonant is heard</span>
      </div>

      <table style={{ marginBottom: 18, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '22%' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th style={{ background: '#dc2626' }}>Cluster</th>
            <th style={{ background: '#dc2626' }}>Sounds like</th>
            <th style={{ background: '#dc2626' }}>Examples</th>
          </tr>
        </thead>
        <tbody>
          {FALSE_CLUSTERS.map(fc => (
            <tr key={fc.cluster}>
              <td><span className="thai-letter">{fc.cluster}</span></td>
              <td className="initial-sound">
                {fc.sounds}{fc.note && <> <span style={{ fontSize: '0.75rem', color: '#888' }}>{fc.note}</span></>}
              </td>
              <td>
                {fc.examples.map((e, i) => (
                  <span key={i}>
                    {i > 0 && ' • '}
                    <Example word={e.word} ipa={e.rom} gloss={e.gloss} />
                  </span>
                ))}
                {fc.altExamples && (
                  <>
                    <br />
                    <span className={styles.altNote}>
                      {fc.altLabel}{' '}
                      {fc.altExamples.map((e, i) => (
                        <span key={i}>
                          {i > 0 && ' • '}
                          <Example word={e.word} ipa={e.rom} gloss={e.gloss} />
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className="class-header" style={{ background: '#16a34a' }}>Leading Consonants — อักษรนำ</div>
        <span className={styles.sectionSub}>Silent ห or อ shifts tone class for sonorants</span>
      </div>

      <div className="tone-rules" style={{ marginBottom: 10, padding: '12px 16px' }}>
        <p style={{ marginBottom: 8 }}>
          <strong>Why?</strong> Sonorants (ง น ม ย ร ล ว) are always low class, so they can only
          produce mid, high, and falling tones on their own. Prepending a silent <strong>ห</strong>{' '}
          (high class) unlocks rising and low tones.
        </p>
      </div>

      <table style={{ marginBottom: 10, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '22%' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th style={{ background: '#16a34a' }}>หอ นำ</th>
            <th style={{ background: '#16a34a' }}>Sounds like</th>
            <th style={{ background: '#16a34a' }}>Example</th>
          </tr>
        </thead>
        <tbody>
          {LEADING_HO.map(row => (
            <tr key={row.cluster}>
              <td><span className="thai-letter">{row.cluster}</span></td>
              <td className="initial-sound">{row.sound}</td>
              <td>
                <Example word={row.example} ipa={row.rom} gloss={row.meaning} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ marginBottom: 18, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '22%' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th style={{ background: '#16a34a' }}>ออ นำ</th>
            <th style={{ background: '#16a34a' }}>Sounds like</th>
            <th style={{ background: '#16a34a' }}>Examples</th>
          </tr>
        </thead>
        <tbody>
          {LEADING_OR.map(row => (
            <tr key={row.cluster}>
              <td><span className="thai-letter">{row.cluster}</span></td>
              <td className="initial-sound">{row.sound}</td>
              <td>
                {row.examples.map((e, i) => (
                  <span key={i}>
                    {i > 0 && ' • '}
                    <Example word={e.word} ipa={e.rom} gloss={e.meaning} />
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="class-section" style={{ marginBottom: 8 }}>
        <div className="class-header" style={{ background: '#64748b' }}>Non-Conforming Clusters</div>
        <span className={styles.sectionSub}>Two consonants that don't form a true cluster — an unwritten /a/ is inserted</span>
      </div>

      <div className="tone-rules" style={{ marginBottom: 18 }}>
        <p>
          When two consonants can't merge into a true cluster, a short <strong>/a/</strong>{' '}
          sub-syllable is inserted between them. This /a/ is not written. No tone mark can be used
          on these.
        </p>
        <p style={{ marginTop: 6 }}>
          <Example word="ขนม" ipa="kʰà.nǒm" gloss="snack" className={styles.exampleWord} /> &nbsp;•&nbsp;
          <Example word="สนุก" ipa="sà.nùk" gloss="fun" className={styles.exampleWord} /> &nbsp;•&nbsp;
          <Example word="แขนง" ipa="kʰà.nɛ̌ːŋ" gloss="branch" className={styles.exampleWord} />
        </p>
        <p style={{ marginTop: 6 }}>
          Some clusters produce <strong>/aː/</strong> (long) instead:{' '}
          <Example word="มรกต" ipa="mɔː.rá.kòt" gloss="emerald" className={styles.exampleWord} /> &nbsp;•&nbsp;
          <span className={styles.exampleWord}>ทราบ</span> → handled as false cluster above
        </p>
      </div>

      <div className="tone-rules">
        <h2>Cluster Rules</h2>

        <p style={{ marginBottom: 10 }}><strong>Tone rule for clusters:</strong></p>
        <div className={styles.ruleBox}>
          <strong>If 2nd consonant is a sonorant</strong> (ง น ม ย ร ล ว):<br />
          → Tone is determined by the <strong>1st consonant's class</strong><br />
          <span className={styles.ex}>
            <Example word="ปลูก" ipa="plùːk" gloss="to plant" /> — low tone from mid-class ป
            &nbsp;•&nbsp; <Example word="สนุก" ipa="sà.nùk" gloss="fun" /> — low tone from high-class ส
          </span><br /><br />
          <strong>If 2nd consonant is NOT a sonorant:</strong><br />
          → Tone is determined by the <strong>2nd consonant's class</strong><br />
          <span className={styles.ex}>
            <Example word="แสดง" ipa="sà.dɛːŋ" gloss="to show, perform" /> — mid tone from mid-class ด
            &nbsp;•&nbsp; <Example word="เฉพาะ" ipa="tɕʰà.pʰɔ́ʔ" gloss="specific, only" /> — low tone from low-class พ
          </span>
        </div>

        <p style={{ marginBottom: 10 }}><strong>Orthography:</strong></p>
        <div className={styles.ruleBox}>
          <strong>Preposed vowels</strong> go before the <em>entire</em> cluster:{' '}
          <Example word="โปรด" ipa="pròːt" gloss="please" className={styles.exampleWord} /> — not ป
          <span style={{ color: 'red' }}>โ</span>รด<br />
          <strong>Tone marks &amp; superscript vowels</strong> sit above the <em>2nd</em> consonant:{' '}
          <Example word="กล้อง" ipa="klɔ̂ːŋ" gloss="camera" className={styles.exampleWord} /> — mark on ล not ก<br />
          <strong>Subscript vowels</strong> go under the <em>2nd</em> consonant:{' '}
          <Example word="พริ้ม" ipa="pʰrím" gloss="lovely" className={styles.exampleWord} /> — อิ under ร not พ
        </div>
      </div>

      <div className="class-section" style={{ marginTop: 28, marginBottom: 8 }}>
        <div className="class-header" style={{ background: '#0f172a' }}>Spelling-sound irregularities</div>
        <span className={styles.sectionSub}>Other gotchas beyond clusters</span>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          1. <ThaiInline>การันต์</ThaiInline> — silent-letter mark{' '}
          <span className={styles.quirkSub}>(thanthakhat ◌์)</span>
        </h3>
        <p className={styles.quirkPara}>
          A small <strong>◌์</strong> above a consonant silences it. Used in Sanskrit/Pali loanwords
          to preserve etymology while trimming pronunciation.
        </p>
        <div className={styles.quirkExamples}>
          <Example word="สัตว์" ipa="sàt" gloss="animal" className={styles.exampleWord} /> ·{' '}
          <Example word="จันทร์" ipa="tɕan" gloss="Monday" className={styles.exampleWord} /> ·{' '}
          <Example word="เสาร์" ipa="sǎw" gloss="Saturday" className={styles.exampleWord} /> ·{' '}
          <Example word="ศุกร์" ipa="sùk" gloss="Friday" className={styles.exampleWord} />
        </div>
        <p className={styles.quirkHint}>
          <strong>Rule of thumb:</strong> the mark cancels the letter it sits on <em>and</em> often
          any cluster-mate just before it. Treat the word as if the silenced letters weren't written
          — including for tone rules.
        </p>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          2. <ThaiInline>อ</ThaiInline> as silent vowel carrier
        </h3>
        <p className={styles.quirkPara}>
          Thai vowels can't stand alone — they need a consonant to hang on. When a word{' '}
          <em>starts</em> with a vowel sound, <strong>อ</strong> sits silently as the carrier.
        </p>
        <div className={styles.quirkExamples}>
          <Example word="อาหาร" ipa="ʔaː.hǎːn" gloss="food" className={styles.exampleWord} /> ·{' '}
          <Example word="เอา" ipa="ʔaw" gloss="take" className={styles.exampleWord} /> ·{' '}
          <Example word="อิน" ipa="ʔin" gloss="slang: feel it" className={styles.exampleWord} />
        </div>
        <p className={styles.quirkHint}>
          Carrier อ still counts as mid-class for tone rules — that's why อา, อิ, อุ, เอ default
          to mid tone with no mark.
        </p>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          3. Unwritten short <ThaiInline>โ-ะ</ThaiInline> /o/ in closed single syllables
        </h3>
        <p className={styles.quirkPara}>
          You already know the unwritten /a/ between two consonants (Non-conforming clusters above).
          There's a sibling: when a single-syllable word is just <strong>two consonants</strong>,
          an unwritten short <strong>/o/</strong> fills the gap.
        </p>
        <div className={styles.quirkExamples}>
          <Example word="นก" ipa="nók" gloss="bird" className={styles.exampleWord} /> ·{' '}
          <Example word="คน" ipa="kʰon" gloss="person" className={styles.exampleWord} /> ·{' '}
          <Example word="ผม" ipa="pʰǒm" gloss="I, masc." className={styles.exampleWord} /> ·{' '}
          <Example word="จบ" ipa="tɕòp" gloss="finish" className={styles.exampleWord} />
        </div>
        <p className={styles.quirkHint}>
          <strong>Tell them apart from /a/ clusters:</strong> two syllables pronounced = /a/
          inserted. One short stressed syllable = /o/ inserted.
        </p>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          4. Silent <ThaiInline>ร</ThaiInline> in final clusters{' '}
          <span className={styles.quirkSub}>(no ◌์ needed)</span>
        </h3>
        <p className={styles.quirkPara}>
          When <strong>ร</strong> is the second letter of a final cluster, it's simply dropped — no
          thanthakhat required. This is a native convention, not a Sanskrit quirk.
        </p>
        <div className={styles.quirkExamples}>
          <Example word="สมัคร" ipa="sà.màk" gloss="apply" className={styles.exampleWord} /> ·{' '}
          <Example word="บัตร" ipa="bàt" gloss="card" className={styles.exampleWord} /> ·{' '}
          <Example word="จักร" ipa="tɕàk" gloss="wheel" className={styles.exampleWord} /> ·{' '}
          <Example word="มิตร" ipa="mít" gloss="friend" className={styles.exampleWord} />
        </div>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          5. Class inheritance in 2-syllable words{' '}
          <span className={styles.quirkSubWarn}>(the big gotcha)</span>
        </h3>
        <p className={styles.quirkPara}>
          In unwritten-/a/ words, the{' '}
          <strong>first consonant's class often determines the tone of the second syllable</strong>,
          not the second consonant's class. The first consonant acts like a silent leading ห/อ for
          the whole word.
        </p>
        <div className={styles.quirkExamples}>
          <Example word="ขนม" ipa="kʰà.nǒm" gloss="snack" className={styles.exampleWord} /> — ข (high) makes นม rise, even though ม alone is low class<br />
          <Example word="ตลาด" ipa="tà.làːt" gloss="market" className={styles.exampleWord} /> — ต (mid) makes ลาด follow mid-class rules → low tone (dead)<br />
          <Example word="สนุก" ipa="sà.nùk" gloss="fun" className={styles.exampleWord} /> — ส (high) → นุก gets low tone (dead-short, high class rule)
        </div>
        <p className={styles.quirkHint}>
          This is the #1 reason the "consonant class + live/dead" rule can seem to break on longer words.
        </p>
      </div>
    </div>
  );
}
