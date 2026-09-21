/**
 * Scores the segmenter against hand-labelled syllable onsets in the native
 * voice's clips, over a grid of SEGMENT_WEIGHTS. Prints mean absolute onset
 * error per configuration, best first.
 *
 *   pnpm dlx tsx scripts/speaking-harness/eval.ts <clip dir>
 *   GRID='{"highShare":[0,1],"final":[1.6,1.9]}' pnpm dlx tsx scripts/speaking-harness/eval.ts <clip dir>
 *
 * Clips: for each phrase id and text (see src/data/phrases.ts), fetch
 * https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=th&q=<text>
 * with a browser User-Agent and convert with
 * `ffmpeg -i <id>.mp3 -ac 1 -ar 48000 <dir>/<id>.wav`.
 *
 * The labels were read off Praat formant, intensity and F0 tables: a
 * syllable starts at its onset consonant — the nasal murmur, the burst
 * after a stop closure, the first voiced frame after aspiration.
 */
import { capture } from './cap';
import { PHRASE_GROUPS } from '../../src/data/phrases';
import { segmentReference, syllableSpecs, SEGMENT_WEIGHTS } from '../../src/lib/segment';

const dir = process.argv[2];
/** Hand-checked syllable onsets (s) from formant tables; null = unknown. */
/** Hand-checked syllable onsets in Praat time (s), from formant tables;
 *  null = unknown. The app's frame ending at t covers the 43 ms before it,
 *  so an onset shows up about 30 ms later there; PRAAT_LAG corrects. */
const PRAAT_LAG = 0.03;
const TRUTH: Record<string, (number | null)[]> = {
  ranthiraokin: [0.14, 0.50, 0.72, 1.02, 1.19, 1.52, 1.76, 2.00, 2.28, 2.56, 2.72, 2.94],
  maimai: [0.12, 0.42, 0.72, 0.94, 1.30],
  sabaidi: [null, null, null, 1.00, 1.21],
  phothamngansret: [null, 0.47, 0.68, 1.04, 1.32, null, 1.81, 2.09, 2.60, 2.77],
  phutthai: [null, 0.55, 0.81, 1.05, 1.37, null, null, 2.03],
  thafontok: [0.23, 0.49, 0.79, 1.09, 1.35, 1.45, 1.75],
  khraikhai: [0.21, 0.61, 0.95, 1.29],
  maipenrai: [0.12, 0.42, 0.68],
  yindi: [0.12, 0.44, 0.74, 0.90, 1.22, 1.44],
  wannicron: [0.12, 0.42, 0.70, 0.94, 1.14, 1.60],
};
const phrases = PHRASE_GROUPS.flatMap(g => g.phrases).filter(p => TRUTH[p.id]);
const frames = new Map(phrases.map(p => [p.id, capture(`${dir}/${p.id}.wav`)]));

const grid: Record<string, number[]> = JSON.parse(process.env.GRID ?? '{}');
const keys = Object.keys(grid);
const configs: Record<string, number>[] = [{}];
for (const k of keys) {
  const next: Record<string, number>[] = [];
  for (const c of configs) for (const v of grid[k]) next.push({ ...c, [k]: v });
  configs.splice(0, configs.length, ...next);
}
const rows: { cfg: string; total: number; per: string }[] = [];
for (const cfg of configs) {
  Object.assign(SEGMENT_WEIGHTS, cfg);
  let sum = 0;
  let count = 0;
  const per: string[] = [];
  for (const p of phrases) {
    const spans = segmentReference(frames.get(p.id)!, syllableSpecs(p));
    if (!spans) { per.push(`${p.id}=null`); continue; }
    let e = 0;
    let n = 0;
    TRUTH[p.id].forEach((t, k) => {
      if (t === null || k === 0) return;
      e += Math.abs(spans[k].startMs / 1000 - (t + PRAAT_LAG));
      n++;
    });
    per.push(`${p.id}=${Math.round((e / n) * 1000)}`);
    sum += e;
    count += n;
  }
  rows.push({ cfg: JSON.stringify(cfg), total: Math.round((sum / count) * 1000), per: per.join(' ') });
}
rows.sort((a, b) => a.total - b.total);
for (const r of rows) console.log(`${String(r.total).padStart(4)} ms  ${r.cfg}  ${r.per}`);
