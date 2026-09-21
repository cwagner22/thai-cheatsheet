/**
 * Segments every phrase's native clip and prints the slots, with the times
 * at which silences end so a boundary can be checked against them.
 *
 *   pnpm dlx tsx scripts/speaking-harness/natives.ts <clip dir> [phrase id]
 *
 * See eval.ts for how to fetch the clips.
 */
import { capture } from './cap';
import { existsSync } from 'node:fs';
import { PHRASE_GROUPS } from '../../src/data/phrases';
import { segmentReference, syllableSpecs } from '../../src/lib/segment';
import { buildSegments, registerHz } from '../../src/lib/contour';
import type { Frame } from '../../src/lib/capture';

const dir = process.argv[2];
const only = process.argv[3];
const gaps = (frames: Frame[]) => {
  const out: number[] = [];
  let run = 0;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].hz === null) { run++; continue; }
    if (run >= 2 && frames.slice(0, i).some(f => f.hz !== null)) out.push(frames[i].t);
    run = 0;
  }
  return out;
};
for (const g of PHRASE_GROUPS) for (const p of g.phrases) {
  if (only && p.id !== only) continue;
  const path = `${dir}/${p.id}.wav`;
  if (!existsSync(path)) continue;
  const frames = capture(path);
  const reg = registerHz(frames);
  const pts = buildSegments(frames, reg).flat();
  const spans = segmentReference(frames, syllableSpecs(p));
  console.log(`\n## ${p.id}   gaps end at: ${gaps(frames).map(t => (t / 1000).toFixed(2)).join(' ')}`);
  const row = (label: string, sp: { thai: string; startMs: number; endMs: number; tone: string }[] | null) => {
    if (!sp) return console.log(`  ${label}: (null)`);
    console.log(`  ${label}: ` + sp.map(x => {
      const xs = pts.filter(q => q.ms >= x.startMs && q.ms <= x.endMs).map(q => q.st);
      const mean = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
      return `${x.thai}[${(x.startMs / 1000).toFixed(2)}-${(x.endMs / 1000).toFixed(2)} ${mean.toFixed(1)}]`;
    }).join(' '));
  };
  row('slots', spans);
}
