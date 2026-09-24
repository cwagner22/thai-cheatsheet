/**
 * Scores the wrong-tone takes made by synth.py against the app's native
 * voice, the way the tab would.
 *
 *   tsx scripts/speaking-dataset/synthbatch.ts <data dir> [reference voice]
 *
 * Writes <data dir>/app/synth-compare.jsonl: per take {id, voice, changed,
 * to, scored, verdicts[]}. The reference defaults to google.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { capture } from '../speaking-harness/cap';
import { segmentReference, syllableSpecs } from '../../src/lib/segment';
import { compareToReference } from '../../src/lib/contour';
import type { Phrase } from '../../src/data/phrases';
import { judgeFeatures } from './toneJudge';
import type { Frame } from '../../src/lib/capture';

const [data, refVoice = 'google'] = process.argv.slice(2);
const items = new Map<string, Phrase>();
for (const l of readFileSync(`${data}/corpus.jsonl`, 'utf8').trim().split('\n')) {
  const it = JSON.parse(l);
  items.set(it.id, { id: it.id, meaning: '', words: it.words.map((w: Phrase['words'][0]) => ({ gloss: '', syllables: w.syllables })) });
}
const refs = new Map<string, { frames: Frame[]; spans: ReturnType<typeof segmentReference> }>();
const out: string[] = [];
const r1 = (x: number) => Math.round(x * 10) / 10;
for (const l of readFileSync(`${data}/synth/manifest.jsonl`, 'utf8').trim().split('\n')) {
  const take = JSON.parse(l);
  const phrase = items.get(take.id);
  const refPath = `${data}/audio/${refVoice}/${take.id}.wav`;
  if (!phrase || !existsSync(refPath) || !existsSync(take.path)) continue;
  if (!refs.has(take.id)) {
    const frames = capture(refPath);
    refs.set(take.id, { frames, spans: segmentReference(frames, syllableSpecs(phrase)) });
  }
  const ref = refs.get(take.id)!;
  if (!ref.spans) continue;
  const c = compareToReference(ref.frames, capture(take.path), ref.spans);
  out.push(
    JSON.stringify({
      id: take.id,
      voice: take.voice,
      ref: refVoice,
      changed: take.changed,
      to: take.to,
      scored: !!c,
      verdicts: c?.syllables.map((s, i, all) => ({ v: s.verdict, lv: r1(s.levelSt), ln: r1(s.learnerNet), rn: r1(s.referenceNet), n: s.parts?.length ?? 1, f: judgeFeatures(s, i === all.length - 1)?.map(x => Math.round(x * 1000) / 1000) ?? null })) ?? [],
    }),
  );
}
writeFileSync(`${data}/app/synth-compare-${refVoice}.jsonl`, out.join('\n') + '\n');
console.log(`${out.length} takes scored against ${refVoice}`);
