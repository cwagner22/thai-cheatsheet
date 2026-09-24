/**
 * How well the app lays the native voice's words onto a learner's take:
 * native = Google, learner = an edge-tts voice whose word timings are known
 * (edge-tts WordBoundary events, <data dir>/boundaries). Each learner clip
 * is scored as said, and again read word by word, with a random 250–600 ms
 * pause inserted before every word.
 *
 *   tsx scripts/speaking-dataset/alignbench.ts <data dir> [max items] [--verbose]
 *       [--paused-only] [--weights '{"content":1}']  (overrides PAUSE_WEIGHTS)
 *
 * Prints, per condition, the error between where the app puts each word's
 * start on the take (compareToReference's inverseTime of the native word's
 * first syllable slot) and where the word starts: median, 90th percentile,
 * and the share within 60 and 120 ms; for the word-by-word reading, also
 * the share of words laid on the right piece of the take. The first word
 * is left out: every alignment pins it. The edge-tts stamps run early — a
 * clip's first word sounds 100–140 ms after its stamp — so read the fluent
 * errors for their spread, not their median.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { capture, readWav } from '../speaking-harness/cap';
import { segmentReference, syllableSpecs } from '../../src/lib/segment';
import { compareToReference } from '../../src/lib/contour';
import { PAUSE_WEIGHTS } from '../../src/lib/align';
import type { Phrase } from '../../src/data/phrases';

/** The app's frame at t covers the window ending at t, so an onset at
 *  audio time T first shows at about T + 30 ms (see speaking-harness/eval.ts). */
const LAG_MS = 30;

const [data, maxArg] = process.argv.slice(2);
const max = Number(maxArg ?? 400);
const verbose = process.argv.includes('--verbose');
const wAt = process.argv.indexOf('--weights');
if (wAt > 0) Object.assign(PAUSE_WEIGHTS, JSON.parse(process.argv[wAt + 1]));
const onlyPaused = process.argv.includes('--paused-only');
const items = readFileSync(`${data}/corpus.jsonl`, 'utf8').trim().split('\n').map(l => JSON.parse(l))
  .filter(it => it.set === 'sent' || it.set === 'app');
const tmp = `${data}/alignbench/${process.pid}`;
mkdirSync(tmp, { recursive: true });

function writeWav(path: string, rate: number, samples: Float32Array): void {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((x, i) => buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x * 32767))), 44 + i * 2));
  writeFileSync(path, buf);
}

// Deterministic pauses, so conditions compare on the same takes.
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const errs: Record<string, number[]> = {};
const add = (k: string, e: number) => (errs[k] ??= []).push(e);
let n = 0;
for (const it of items) {
  if (n >= max) break;
  const refPath = `${data}/audio/google/${it.id}.wav`;
  if (!existsSync(refPath)) continue;
  const phrase: Phrase = { id: it.id, meaning: '', words: it.words.map((w: Phrase['words'][0]) => ({ gloss: '', syllables: w.syllables })) };
  const ref = capture(refPath);
  const spans = segmentReference(ref, syllableSpecs(phrase));
  if (!spans) continue;
  const firstSyl: number[] = [];
  let k = 0;
  for (const w of it.words) { firstSyl.push(k); k += w.syllables.length; }
  for (const voice of ['niwat', 'premwadee']) {
    const bPath = `${data}/boundaries/${voice}/${it.id}.json`;
    const lPath = `${data}/audio/${voice}/${it.id}.wav`;
    if (!existsSync(bPath) || !existsSync(lPath)) continue;
    const b = JSON.parse(readFileSync(bPath, 'utf8')).words as { text: string; start: number }[];
    const words = it.words.map((w: Phrase['words'][0]) => w.syllables.map(s => s.thai).join(''));
    if (b.length !== words.length || b.some((x, i) => x.text !== words[i])) continue;
    const truth = b.map(x => x.start * 1000);
    const score = (path: string, gt: number[], cond: string, pauseAt?: number[]) => {
      const c = compareToReference(ref, capture(path), spans);
      if (!c) return add(`${cond}:unscored`, 1);
      if (pauseAt) add(`${cond}:read as cut off`, c.unsaidFrom !== null ? 1 : 0);
      firstSyl.forEach((s, w) => {
        if (w === 0) return;
        const at = c.inverseTime(spans[s].startMs);
        const e = at - (gt[w] + LAG_MS);
        // Read word by word, the word start belongs anywhere in the pause
        // before the word or its first 150 ms; outside that, the word has
        // been laid on another piece of the take.
        if (pauseAt) add(`${cond}:placed`, at >= pauseAt[w] - 60 && at <= gt[w] + 150 ? 1 : 0);
        add(cond, Math.abs(e));
        add(`${cond}:signed`, e);
        if (cond.endsWith('fluent')) {
          const onset = spans[s].ipa.normalize('NFD');
          const cls = /^(tɕ|[ptkbdʔ])/.test(onset) ? 'stop' : /^[sfh]/.test(onset) ? 'fricative' : 'sonorant';
          add(`${cond}:signed:${cls}`, e);
        }
        if (verbose && Math.abs(e) > 200) console.log(`  ${cond} ${it.id} word ${w} ${words[w]} error ${Math.round(e)} ms byWord=${c.byWord} said=${c.unsaidFrom}`);
      });
    };
    if (!onlyPaused) score(lPath, truth, `${voice} fluent`);
    // The same clip read word by word.
    const { rate, samples } = readWav(lPath);
    const cuts = truth.slice(1).map(t => Math.round((t / 1000) * rate));
    const pauses = cuts.map(() => Math.round((0.25 + rand() * 0.35) * rate));
    const out = new Float32Array(samples.length + pauses.reduce((a, x) => a + x, 0));
    let src = 0, dst = 0;
    const gt = [truth[0]];
    const pauseAt = [0];
    cuts.forEach((cut, i) => {
      out.set(samples.subarray(src, cut), dst);
      pauseAt.push(((dst + cut - src) / rate) * 1000);
      dst += cut - src + pauses[i];
      src = cut;
      gt.push((dst / rate) * 1000);
    });
    out.set(samples.subarray(src), dst);
    const pPath = `${tmp}/${voice}-${it.id}.wav`;
    writeWav(pPath, rate, out);
    score(pPath, gt, `${voice} word by word`, pauseAt);
  }
  n++;
}
const pct = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor(q * (xs.length - 1))];
for (const [k, xs] of Object.entries(errs).sort()) {
  if (k.endsWith(':unscored')) { console.log(`${k.padEnd(30)} ${xs.length}`); continue; }
  if (k.endsWith(':read as cut off')) { console.log(`${k.padEnd(30)} complete takes read as cut off: ${(xs.reduce((a, x) => a + x, 0) / xs.length).toFixed(3)} of ${xs.length}`); continue; }
  if (k.endsWith(':placed')) { console.log(`${k.padEnd(30)} words laid on the right piece: ${(xs.reduce((a, x) => a + x, 0) / xs.length).toFixed(3)}`); continue; }
  if (k.includes(':signed')) { console.log(`${k.padEnd(30)} median signed error ${pct(xs, 0.5).toFixed(0)} ms (+ = app late)`); continue; }
  console.log(
    `${k.padEnd(30)} words=${String(xs.length).padStart(5)} median=${pct(xs, 0.5).toFixed(0).padStart(4)} ms p90=${pct(xs, 0.9).toFixed(0).padStart(4)} ms <60ms=${(xs.filter(x => x < 60).length / xs.length).toFixed(2)} <120ms=${(xs.filter(x => x < 120).length / xs.length).toFixed(2)}`,
  );
}
