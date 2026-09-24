/**
 * Runs the Speaking tab's own pipeline over the dataset built by
 * build_*.py: capture, pitch, native segmentation, textbook-mismatch notes,
 * and native-against-native scoring. Writes JSON lines for analyse.py.
 *
 *   tsx scripts/speaking-dataset/batch.ts <data dir> <shard> <shards>
 *
 * Output: <data dir>/app/frames-<shard>.jsonl  one line per clip
 *           {id, voice, t[], hz[], rms[], spans[{startMs,endMs}], mismatches[], judged[[ms,st]...]}
 *         <data dir>/app/compare-<shard>.jsonl one line per (reference, learner) pair
 *           {id, ref, lrn, byWord, verdicts[{verdict, levelSt, learnerNet, referenceNet}]}
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { capture } from '../speaking-harness/cap';
import { segmentReference, syllableSpecs } from '../../src/lib/segment';
import {
  buildSegments,
  compareToReference,
  judgedPoints,
  registerHz,
  spillTails,
  textbookMismatches,
} from '../../src/lib/contour';
import type { Phrase } from '../../src/data/phrases';
import { judgeFeatures } from './toneJudge';
import type { Frame } from '../../src/lib/capture';

interface Item {
  id: string;
  set: string;
  text: string;
  words: { syllables: { thai: string; ipa: string; tone: Phrase['words'][0]['syllables'][0]['tone'] }[] }[];
}

const [data, shardArg, shardsArg] = process.argv.slice(2);
const shard = Number(shardArg ?? 0);
const shards = Number(shardsArg ?? 1);
const items: Item[] = readFileSync(`${data}/corpus.jsonl`, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const VOICES = ['google', 'premwadee', 'niwat', 'kanya'];
/** Google against itself as the control, then every ordered pair of
 *  different voices: the judge's features only compare two contours, so
 *  any native voice can stand in for the reference. */
const PAIRS: [string, string][] = [
  ['google', 'google'],
  ...VOICES.flatMap(a => VOICES.filter(b => b !== a).map(b => [a, b] as [string, string])),
];

mkdirSync(`${data}/app`, { recursive: true });
const framesOut = `${data}/app/frames-${shard}.jsonl`;
const compareOut = `${data}/app/compare-${shard}.jsonl`;
const done = new Set<string>();
if (existsSync(framesOut)) {
  for (const l of readFileSync(framesOut, 'utf8').split('\n')) if (l) done.add(JSON.parse(l).id);
} else writeFileSync(framesOut, '');
if (!existsSync(compareOut)) writeFileSync(compareOut, '');

const r1 = (x: number) => Math.round(x * 10) / 10;
let n = 0;
for (let k = shard; k < items.length; k += shards) {
  const item = items[k];
  if (done.has(item.id)) continue;
  const phrase: Phrase = {
    id: item.id,
    meaning: '',
    words: item.words.map(w => ({ gloss: '', syllables: w.syllables.map(s => ({ thai: s.thai, ipa: s.ipa, tone: s.tone })) })),
  };
  const specs = syllableSpecs(phrase);
  const clips = new Map<string, { frames: Frame[]; spans: ReturnType<typeof segmentReference> }>();
  const rows: string[] = [];
  for (const voice of VOICES) {
    const path = `${data}/audio/${voice}/${item.id}.wav`;
    if (!existsSync(path)) continue;
    let frames: Frame[];
    try {
      frames = capture(path);
    } catch {
      continue;
    }
    const spans = segmentReference(frames, specs);
    clips.set(voice, { frames, spans });
    const segs = buildSegments(frames, registerHz(frames));
    const judged = spans ? judgedPoints(spillTails(spans, segs)) : [];
    rows.push(
      JSON.stringify({
        id: item.id,
        voice,
        reg: r1(registerHz(frames)),
        t: frames.map(f => Math.round(f.t)),
        hz: frames.map(f => (f.hz === null ? null : r1(f.hz))),
        rms: frames.map(f => Math.round(f.rms * 1e5) / 1e5),
        spans: spans?.map(s => [Math.round(s.startMs), Math.round(s.endMs)]) ?? null,
        mismatches: spans ? textbookMismatches(frames, spans) : null,
        judged: judged.map(pts => pts.map(p => [Math.round(p.ms), r1(p.st)])),
      }),
    );
  }
  for (const [ref, lrn] of PAIRS) {
    const a = clips.get(ref);
    const b = clips.get(lrn);
    if (!a?.spans || !b) continue;
    const c = compareToReference(a.frames, b.frames, a.spans);
    appendFileSync(
      compareOut,
      JSON.stringify({
        id: item.id,
        ref,
        lrn,
        scored: !!c,
        byWord: c?.byWord ?? null,
        verdicts:
          c?.syllables.map((s, i, all) => ({ v: s.verdict, lv: r1(s.levelSt), ln: r1(s.learnerNet), rn: r1(s.referenceNet), n: s.parts?.length ?? 1, f: judgeFeatures(s, i === all.length - 1)?.map(x => Math.round(x * 1000) / 1000) ?? null })) ?? [],
      }) + '\n',
    );
  }
  appendFileSync(framesOut, rows.map(r => r + '\n').join(''));
  if (++n % 50 === 0) console.log(`shard ${shard}: ${n} items`);
}
console.log(`shard ${shard}: done, ${n} items`);
