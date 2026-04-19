import {
  TRUE_CLUSTERS,
  FALSE_CLUSTERS,
  LEADING_HO,
  LEADING_OR,
} from '../data/clusters';
import styles from './ClustersTab.module.css';

function TrueClusterCell({ entry }: { entry?: { form: string; ipa: string; example: string; gloss: string } }) {
  if (!entry) return <td style={{ textAlign: 'center', color: '#ccc' }}>—</td>;
  return (
    <td style={{ textAlign: 'center' }}>
      <span className="thai-letter">{entry.form}</span>{' '}
      <span className={styles.ipa}>{entry.ipa}</span><br />
      <span className={styles.ex}>{entry.example} {entry.gloss}</span>
    </td>
  );
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

      <table style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th style={{ background: '#dc2626', width: 140 }}>Cluster</th>
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
                    <span className="thai-name">{e.word}</span> {e.gloss}
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
                          <span className="thai-name">{e.word}</span> {e.gloss}
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

      <table style={{ marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ background: '#16a34a' }}>หอ นำ</th>
            <th style={{ background: '#16a34a' }}>Sounds like</th>
            <th style={{ background: '#16a34a' }}>Example</th>
            <th style={{ background: '#16a34a' }}>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {LEADING_HO.map(row => (
            <tr key={row.cluster}>
              <td><span className="thai-letter">{row.cluster}</span></td>
              <td className="initial-sound">{row.sound}</td>
              <td><span className="thai-name">{row.example}</span></td>
              <td>{row.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th style={{ background: '#16a34a' }}>ออ นำ</th>
            <th style={{ background: '#16a34a' }}>Sounds like</th>
            <th style={{ background: '#16a34a' }}>Example</th>
            <th style={{ background: '#16a34a' }}>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {LEADING_OR.map(row => (
            <tr key={row.cluster}>
              <td><span className="thai-letter">{row.cluster}</span></td>
              <td className="initial-sound">{row.sound}</td>
              <td><span className="thai-name">{row.examples}</span></td>
              <td>{row.meaning}</td>
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
          <span className="thai-name" style={{ fontSize: '1.1rem' }}>ขนม</span> → /kʰa-nom/ (snack) &nbsp;•&nbsp;
          <span className="thai-name" style={{ fontSize: '1.1rem' }}>สนุก</span> → /sa-nuk/ (fun) &nbsp;•&nbsp;
          <span className="thai-name" style={{ fontSize: '1.1rem' }}>แขนง</span> → /kʰa-nɛːŋ/ (branch)
        </p>
        <p style={{ marginTop: 6 }}>
          Some clusters produce <strong>/aː/</strong> (long) instead:{' '}
          <span className="thai-name" style={{ fontSize: '1.1rem' }}>มรกต</span> → /mɔː-ra-got/ (emerald) &nbsp;•&nbsp;
          <span className="thai-name" style={{ fontSize: '1.1rem' }}>ทราบ</span> → handled as false cluster above
        </p>
      </div>

      <div className="tone-rules">
        <h2>Cluster Rules</h2>

        <p style={{ marginBottom: 10 }}><strong>Tone rule for clusters:</strong></p>
        <div className={styles.ruleBox}>
          <strong>If 2nd consonant is a sonorant</strong> (ง น ม ย ร ล ว):<br />
          → Tone is determined by the <strong>1st consonant's class</strong><br />
          <span className={styles.ex}>
            ปลูก /bpluːk/ — low tone from mid-class ป &nbsp;•&nbsp; สนุก /sa-nuk/ — low tone from high-class ส
          </span><br /><br />
          <strong>If 2nd consonant is NOT a sonorant:</strong><br />
          → Tone is determined by the <strong>2nd consonant's class</strong><br />
          <span className={styles.ex}>
            แสดง /sa-dɛːŋ/ — mid tone from mid-class ด &nbsp;•&nbsp; เฉพาะ /tɕʰa-pʰɔ/ — low tone from low-class พ
          </span>
        </div>

        <p style={{ marginBottom: 10 }}><strong>Orthography:</strong></p>
        <div className={styles.ruleBox}>
          <strong>Preposed vowels</strong> go before the <em>entire</em> cluster:{' '}
          <span className="thai-name" style={{ fontSize: '1.05rem' }}>โปรด</span> not ป<span style={{ color: 'red' }}>โ</span>รด<br />
          <strong>Tone marks &amp; superscript vowels</strong> sit above the <em>2nd</em> consonant:{' '}
          <span className="thai-name" style={{ fontSize: '1.05rem' }}>กล้อง</span> (mark on ล not ก)<br />
          <strong>Subscript vowels</strong> go under the <em>2nd</em> consonant:{' '}
          <span className="thai-name" style={{ fontSize: '1.05rem' }}>พริ้ม</span> (อิ under ร not พ)
        </div>
      </div>
    </div>
  );
}
