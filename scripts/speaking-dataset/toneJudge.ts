/**
 * The features a learned judge sees for one scored syllable: the native
 * voice's pitch and the learner's over the stretch the verdict was reached
 * on, reduced to numbers that do not depend on either voice's pitch range
 * or speed. Used by batch.ts and synthbatch.ts when writing training rows,
 * and by regress.ts to score saved takes with an exported model.
 */

import type { SyllableScore, TrackPoint } from '../../src/lib/contour';
import { isDead, isLong } from '../../src/lib/segment';
import type { ToneName } from '../../src/lib/toneLookup';

const TONES: ToneName[] = ['Mid', 'Low', 'Falling', 'High', 'Rising'];
/** Points each contour is resampled to, evenly over its own time span. */
const SHAPE_POINTS = 8;

function resample(points: TrackPoint[], n: number): number[] {
  const pts = [...points].sort((a, b) => a.ms - b.ms);
  const t0 = pts[0].ms;
  const t1 = pts[pts.length - 1].ms;
  return Array.from({ length: n }, (_, k) => {
    const t = t0 + ((t1 - t0) * k) / (n - 1 || 1);
    let j = 0;
    while (j < pts.length - 2 && pts[j + 1].ms < t) j++;
    const a = pts[j];
    const b = pts[Math.min(j + 1, pts.length - 1)];
    return b.ms === a.ms ? a.st : a.st + ((t - a.ms) / (b.ms - a.ms)) * (b.st - a.st);
  });
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** contour.ts's travel(): trimmed extreme of one half against the other. */
function travel(xs: number[], dir: -1 | 1): number {
  if (xs.length < 2) return 0;
  const pct = (ys: number[], q: number) => {
    const sorted = [...ys].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
  };
  const half = Math.max(1, xs.length >> 1);
  const a = xs.slice(0, half);
  const b = xs.slice(half);
  const high = (ys: number[]) => (ys.length >= 4 ? pct(ys, 0.85) : Math.max(...ys));
  const low = (ys: number[]) => (ys.length >= 4 ? pct(ys, 0.15) : Math.min(...ys));
  return dir < 0 ? high(a) - low(b) : high(b) - low(a);
}

function slope(xs: number[]): number {
  const n = xs.length;
  const mx = (n - 1) / 2;
  const my = mean(xs);
  let num = 0;
  let den = 0;
  xs.forEach((y, i) => {
    num += (i - mx) * (y - my);
    den += (i - mx) ** 2;
  });
  return den ? (num / den) * (n - 1) : 0;
}

function corr(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  a.forEach((x, i) => {
    num += (x - ma) * (b[i] - mb);
    da += (x - ma) ** 2;
    db += (b[i] - mb) ** 2;
  });
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** Names of the features, in order; the training scripts key on them. */
export const FEATURE_NAMES: string[] = [
  ...Array.from({ length: SHAPE_POINTS }, (_, k) => `ref${k}`),
  ...Array.from({ length: SHAPE_POINTS }, (_, k) => `lrn${k}`),
  ...Array.from({ length: SHAPE_POINTS }, (_, k) => `diff${k}`),
  'refUp', 'refDown', 'lrnUp', 'lrnDown',
  'refSwUp', 'refSwDown', 'lrnSwUp', 'lrnSwDown',
  'refRange', 'lrnRange', 'refSlope', 'lrnSlope', 'corr', 'level',
  ...TONES.map(t => `tone${t}`),
  'refN', 'lrnN', 'nativeMs', 'final', 'dead', 'long',
];

/** Feature vector for a single scored syllable, or null when it was not
 *  scored on its own (run together with others, minor, missing). */
export function judgeFeatures(score: SyllableScore, final: boolean): number[] | null {
  const p = score.points;
  if (!p || score.parts || score.span.minor || p.ref.length < 3 || p.lrn.length < 3) return null;
  const ref = resample(p.ref, SHAPE_POINTS);
  const lrn = resample(p.lrn, SHAPE_POINTS);
  const rm = mean(ref);
  const lm = mean(lrn);
  const refShape = ref.map(x => x - rm);
  const lrnShape = lrn.map(x => x - lm);
  const rs = [...p.ref].sort((a, b) => a.ms - b.ms).map(q => q.st);
  const ls = [...p.lrn].sort((a, b) => a.ms - b.ms).map(q => q.st);
  const sw = (xs: number[], dir: -1 | 1) => (xs.length >= 3 ? travel(xs, dir) : 0);
  return [
    ...refShape,
    ...lrnShape,
    ...lrnShape.map((x, k) => x - refShape[k]),
    travel(rs, 1), travel(rs, -1), travel(ls, 1), travel(ls, -1),
    sw(p.refSwing, 1), sw(p.refSwing, -1), sw(p.lrnSwing, 1), sw(p.lrnSwing, -1),
    Math.max(...rs) - Math.min(...rs), Math.max(...ls) - Math.min(...ls),
    slope(ref), slope(lrn), corr(ref, lrn), lm - rm,
    ...TONES.map(t => (score.span.tone === t ? 1 : 0)),
    rs.length, ls.length, score.span.endMs - score.span.startMs,
    final ? 1 : 0, isDead(score.span.ipa) ? 1 : 0, isLong(score.span.ipa) ? 1 : 0,
  ];
}

/** A gradient-boosted tree ensemble as exported by
 *  scripts/speaking-dataset/judge.py (scikit-learn's histogram boosting):
 *  per tree, parallel node arrays. A sample goes left when its feature is
 *  at or below the node's threshold; leaf values already carry the
 *  learning rate, so the log-odds are the base plus the leaves reached. */
export interface JudgeModel {
  base: number;
  trees: { f: number[]; t: number[]; l: number[]; r: number[]; leaf: number[]; v: number[] }[];
  /** Probability above which a syllable is called a miss, keyed by the
   *  share of native syllables that would be flagged at it (held-out). */
  thresholds: Record<string, number>;
}

/** Probability that the learner's syllable is a different tone from the
 *  native's, for a feature vector from judgeFeatures. */
export function judgeProbability(features: number[], model: JudgeModel): number {
  let logit = model.base;
  for (const tree of model.trees) {
    let node = 0;
    while (!tree.leaf[node]) node = features[tree.f[node]] <= tree.t[node] ? tree.l[node] : tree.r[node];
    logit += tree.v[node];
  }
  return 1 / (1 + Math.exp(-logit));
}
