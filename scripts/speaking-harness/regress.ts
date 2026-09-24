/**
 * Regression over saved takes and synthetic wrong takes.
 *
 *   tsx scripts/speaking-harness/regress.ts <clip dir> <take dir> [--judge model.json]
 *
 * For each take named take-<phrase id>*.wav: the verdicts the tab would give.
 * For each native clip: the verdicts for the clip against itself (must be
 * all clear) and against a copy with every pitch movement mirrored around
 * the register (should be flagged on most syllables that glide).
 * With --judge, each syllable also shows the learned judge's probability
 * that it is a different tone (see scripts/speaking-dataset/judge.py),
 * starred above the 3% threshold.
 */
import { readdirSync, existsSync } from 'node:fs';
import { capture } from './cap';
import { PHRASE_GROUPS } from '../../src/data/phrases';
import { segmentReference, syllableSpecs } from '../../src/lib/segment';
import { compareToReference } from '../../src/lib/contour';
import { registerHz } from '../../src/lib/pitch';
import type { Frame } from '../../src/lib/capture';
import { readFileSync } from 'node:fs';
import { judgeFeatures, judgeProbability, type JudgeModel } from '../speaking-dataset/toneJudge';

const [clips, takes] = process.argv.slice(2);
const judgeAt = process.argv.indexOf('--judge');
const judge: JudgeModel | null = judgeAt > 0 ? JSON.parse(readFileSync(process.argv[judgeAt + 1], 'utf8')) : null;
const phrases = PHRASE_GROUPS.flatMap(g => g.phrases);
const FLAG = new Set(['high', 'low', 'flat', 'shape', 'missing']);
const row = (ref: Frame[], lrn: Frame[], id: string) => {
  const spans = segmentReference(ref, syllableSpecs(phrases.find(p => p.id === id)!));
  const c = spans && compareToReference(ref, lrn, spans);
  if (!c) return { text: 'not scored', flags: 0, n: 0 };
  return {
    text: c.syllables
      .map((s, i, all) => {
        const f = judge && judgeFeatures(s, i === all.length - 1);
        const p = f && judge ? judgeProbability(f, judge) : null;
        const mark = p === null ? '' : `[${p.toFixed(2)}${p > judge!.thresholds['3'] ? '*' : ''}]`;
        return `${s.span.thai}${FLAG.has(s.verdict) ? `:${s.verdict}` : s.verdict === 'unsure' ? ':?' : ''}${mark}`;
      })
      .join(' '),
    flags: c.syllables.filter(s => FLAG.has(s.verdict)).length,
    n: c.syllables.length,
  };
};
console.log('## saved takes');
for (const f of readdirSync(takes).filter(f => f.endsWith('.wav')).sort()) {
  const p = phrases.find(ph => f.startsWith(`take-${ph.id}`));
  if (!p || !existsSync(`${clips}/${p.id}.wav`)) continue;
  console.log(`${f.padEnd(34)} ${row(capture(`${clips}/${p.id}.wav`), capture(`${takes}/${f}`), p.id).text}`);
}
console.log('\n## native vs itself (want clear) · vs mirrored (want flags)');
let selfFlags = 0, mirFlags = 0, mirN = 0;
for (const p of phrases) {
  if (!existsSync(`${clips}/${p.id}.wav`)) continue;
  const ref = capture(`${clips}/${p.id}.wav`);
  const reg = registerHz(ref.flatMap(f => (f.hz === null ? [] : [f.hz])));
  const mirrored = ref.map(f => {
    if (f.hz === null) return f;
    const st = Math.max(-6, Math.min(6, 12 * Math.log2(f.hz / reg)));
    return { ...f, hz: reg * 2 ** (-st / 12) };
  });
  const self = row(ref, ref, p.id);
  const mir = row(ref, mirrored, p.id);
  selfFlags += self.flags; mirFlags += mir.flags; mirN += mir.n;
  console.log(`${p.id.padEnd(18)} self: ${self.text.padEnd(44)} mirrored: ${mir.text}`);
}
console.log(`\nself flags: ${selfFlags} (want 0) · mirrored flags: ${mirFlags}/${mirN}`);
