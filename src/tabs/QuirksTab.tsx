import styles from './QuirksTab.module.css';

function Thai({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: '1.1rem' }}>{children}</span>;
}

function ThaiInline({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: "'Noto Serif Thai', serif" }}>{children}</span>;
}

export function QuirksTab() {
  return (
    <div id="tab-quirks">
      <h2 style={{ marginTop: 0, marginBottom: 6 }}>Spelling-sound irregularities</h2>
      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 14 }}>
        Gotchas that aren't already covered by the main Consonants / Vowels / Clusters tabs.
      </p>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          1. <ThaiInline>การันต์</ThaiInline> — silent-letter mark{' '}
          <span className={styles.quirkSub}>(thanthakhat ◌์)</span>
        </h3>
        <p className={styles.para}>
          A small <strong>◌์</strong> above a consonant silences it. Used in Sanskrit/Pali loanwords
          to preserve etymology while trimming pronunciation.
        </p>
        <div className={styles.examples}>
          <Thai>สัตว์</Thai> /sàt/ animal · <Thai>จันทร์</Thai> /jan/ Monday ·{' '}
          <Thai>เสาร์</Thai> /sǎo/ Saturday · <Thai>ศุกร์</Thai> /sùk/ Friday
        </div>
        <p className={styles.hint}>
          <strong>Rule of thumb:</strong> the mark cancels the letter it sits on <em>and</em> often
          any cluster-mate just before it. Treat the word as if the silenced letters weren't written
          — including for tone rules.
        </p>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          2. <ThaiInline>อ</ThaiInline> as silent vowel carrier
        </h3>
        <p className={styles.para}>
          Thai vowels can't stand alone — they need a consonant to hang on. When a word{' '}
          <em>starts</em> with a vowel sound, <strong>อ</strong> sits silently as the carrier.
        </p>
        <div className={styles.examples}>
          <Thai>อาหาร</Thai> /aa-hǎan/ food · <Thai>เอา</Thai> /ao/ take ·{' '}
          <Thai>อิน</Thai> /in/ (slang)
        </div>
        <p className={styles.hint}>
          Carrier อ still counts as mid-class for tone rules — that's why อา, อิ, อุ, เอ default
          to mid tone with no mark.
        </p>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          3. Unwritten short <ThaiInline>โ-ะ</ThaiInline> /o/ in closed single syllables
        </h3>
        <p className={styles.para}>
          You already know the unwritten /a/ between two consonants (Clusters → non-conforming).
          There's a sibling: when a single-syllable word is just <strong>two consonants</strong>,
          an unwritten short <strong>/o/</strong> fills the gap.
        </p>
        <div className={styles.examples}>
          <Thai>นก</Thai> /nók/ bird · <Thai>คน</Thai> /khon/ person ·{' '}
          <Thai>ผม</Thai> /phǒm/ I (m.) · <Thai>จบ</Thai> /jòp/ finish
        </div>
        <p className={styles.hint}>
          <strong>Tell them apart from /a/ clusters:</strong> two syllables pronounced = /a/
          inserted. One short stressed syllable = /o/ inserted.
        </p>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          4. Silent <ThaiInline>ร</ThaiInline> in final clusters{' '}
          <span className={styles.quirkSub}>(no ◌์ needed)</span>
        </h3>
        <p className={styles.para}>
          When <strong>ร</strong> is the second letter of a final cluster, it's simply dropped — no
          thanthakhat required. This is a native convention, not a Sanskrit quirk.
        </p>
        <div className={styles.examples}>
          <Thai>สมัคร</Thai> /sa-màk/ apply · <Thai>บัตร</Thai> /bàt/ card ·{' '}
          <Thai>จักร</Thai> /jàk/ wheel · <Thai>มิตร</Thai> /mít/ friend
        </div>
      </div>

      <div className="tone-rules">
        <h3 className={styles.quirkH}>
          5. Class inheritance in 2-syllable words{' '}
          <span className={styles.quirkSubWarn}>(the big gotcha)</span>
        </h3>
        <p className={styles.para}>
          In unwritten-/a/ words, the{' '}
          <strong>first consonant's class often determines the tone of the second syllable</strong>,
          not the second consonant's class. The first consonant acts like a silent leading ห/อ for
          the whole word.
        </p>
        <div className={styles.examples}>
          <Thai>ขนม</Thai> /kha-nǒm/ — ข (high) makes นม rise, even though ม alone is low class<br />
          <Thai>ตลาด</Thai> /ta-làat/ — ต (mid) makes ลาด follow mid-class rules → low tone (dead)<br />
          <Thai>สนุก</Thai> /sa-nùk/ — ส (high) → นุก gets low tone (dead-short, high class rule)
        </div>
        <p className={styles.hint}>
          This is the #1 reason the "consonant class + live/dead" rule can seem to break on longer words.
        </p>
      </div>
    </div>
  );
}
