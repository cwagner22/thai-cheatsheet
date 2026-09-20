/**
 * Where the syllables are in the native recording.
 *
 * Fluent Thai arrives as two or three stretches of voice for five syllables,
 * so the boundaries cannot be read off silences alone. They are found by a
 * small dynamic programme instead: each of the N−1 boundaries is placed at a
 * frame that is quiet (an energy dip), ideally unvoiced (a stop or a pause),
 * and not far from where the phrase's own syllable lengths say it should
 * fall. The native voice is a fixed recording, so this is computed once per
 * phrase and cached with it.
 */

import type { Frame } from './capture';
import type { Phrase } from '../data/phrases';
import type { ToneName } from './toneLookup';
import { toneOf } from './contour';

export interface SyllableSpec {
  thai: string;
  ipa: string;
  tone: ToneName;
  /** Relative expected duration; the phrase's proportions, not a target. */
  weight: number;
  /** A clipped, unstressed lead-in syllable (see isMinor). */
  minor: boolean;
}

export interface SyllableSpan extends SyllableSpec {
  /** Native-voice time, in ms of the reference capture. */
  startMs: number;
  endMs: number;
}

/** Phonemes only: tone diacritics stripped, so the final character is the
 *  syllable's final sound. */
const bare = (ipa: string) => ipa.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/** A syllable closed by a stop is cut off rather than allowed to ring. */
const isDead = (ipa: string) => /[ptkʔ]$/.test(bare(ipa));
const isLong = (ipa: string) => ipa.includes('ː');
/** A short vowel with nothing after it — /sà/ in สวัสดี, /kà/ in กะทิ. Thai
 *  allows that shape only as an unstressed lead-in to the next syllable, so
 *  it is spoken as a clipped half-syllable, shorter even than a stopped one. */
const isMinor = (ipa: string) => !isLong(ipa) && /[aeiouɛɔɤɯə]$/.test(bare(ipa));

/** Relative lengths — a prior for where each boundary falls, which the
 *  energy term below corrects. */
export function syllableSpecs(phrase: Phrase): SyllableSpec[] {
  const flat = phrase.words.flatMap(w => w.syllables);
  return flat.map((s, i) => ({
    thai: s.thai,
    ipa: s.ipa,
    tone: toneOf(s.ipa),
    minor: isMinor(s.ipa),
    weight:
      (isLong(s.ipa) ? 1.5 : 1) *
      (isDead(s.ipa) ? 0.72 : 1) *
      (isMinor(s.ipa) ? 0.5 : 1) *
      (i === flat.length - 1 ? 1.3 : 1),
  }));
}

/** Absolute floor on a syllable's length; keeps boundaries from bunching. */
const MIN_SYLLABLE_MS = 70;
/** A syllable may not come out shorter than this share of its expected
 *  length; otherwise a boundary slides onto the fade-out before a silence
 *  and two boundaries pile up around one gap. */
const MIN_SHARE_OF_EXPECTED = 0.5;
/** Pull toward the expected position: a boundary an eighth of the phrase
 *  from where it belongs costs more than a full-depth energy dip saves. */
const PROPORTION_WEIGHT = 25;
/** Preference for the onset of voicing after a silence over a mere dip. */
const GAP_BONUS = 0.45;
/** An unvoiced stretch at least this long is a silence: a stop, a pause, or
 *  the aspiration of a ค/ข/พ/ท onset. Shorter breaks are the detector losing
 *  a frame or two, not a gap in the speech. */
const GAP_MIN_MS = 40;
/** Frames this close before a silence are a fade-out, not a boundary; the
 *  boundary is where the next syllable starts. */
const FADE_MS = 60;

export function segmentReference(frames: Frame[], specs: SyllableSpec[]): SyllableSpan[] | null {
  const voiced = frames.flatMap((f, i) => (f.hz === null ? [] : [i]));
  if (voiced.length < 8 || specs.length === 0) return null;
  const i0 = voiced[0];
  const i1 = voiced[voiced.length - 1];
  const t0 = frames[i0].t;
  const t1 = frames[i1].t;
  const span = t1 - t0;
  const n = specs.length;
  if (n === 1 || span < MIN_SYLLABLE_MS * n) {
    return [{ ...specs[0], startMs: t0, endMs: t1 }];
  }

  // Energy, lightly smoothed and scaled to the loudest voiced frame.
  const energy = frames.map((_, i) => {
    const a = frames[Math.max(0, i - 1)].rms;
    const b = frames[i].rms;
    const c = frames[Math.min(frames.length - 1, i + 1)].rms;
    return (a + b + c) / 3;
  });
  let peak = 0;
  for (let i = i0; i <= i1; i++) peak = Math.max(peak, energy[i]);
  if (peak <= 0) return null;

  const total = specs.reduce((s, x) => s + x.weight, 0);
  const cumulative: number[] = [];
  specs.reduce((acc, x) => {
    cumulative.push(acc + x.weight);
    return acc + x.weight;
  }, 0);
  const expected = (k: number) => t0 + (span * cumulative[k - 1]) / total;
  /** Shortest the k-th syllable (0-based) is allowed to be. */
  const minLen = (k: number) =>
    Math.max(MIN_SYLLABLE_MS, (MIN_SHARE_OF_EXPECTED * span * specs[k].weight) / total);
  /** Shortest the syllables from k onward can take together. */
  const minTail = (k: number) => specs.slice(k).reduce((acc, _, i) => acc + minLen(k + i), 0);
  const minHead = (k: number) => specs.slice(0, k).reduce((acc, _, i) => acc + minLen(i), 0);

  // Every silence becomes exactly one candidate boundary, at the first
  // voiced frame after it; the silence itself and the fade-out before it are
  // ruled out. Interior voiced frames compete on energy alone.
  const INF = Number.POSITIVE_INFINITY;
  const local = new Float64Array(frames.length).fill(INF);
  for (let i = i0; i <= i1; i++) {
    if (frames[i].hz !== null) local[i] = energy[i] / peak;
  }
  let g = i0;
  while (g <= i1) {
    if (frames[g].hz !== null) {
      g++;
      continue;
    }
    let end = g;
    while (end + 1 <= i1 && frames[end + 1].hz === null) end++;
    const gapMs = frames[Math.min(end + 1, i1)].t - frames[g].t;
    if (gapMs >= GAP_MIN_MS) {
      for (let i = g; i <= end; i++) local[i] = INF;
      for (let i = g - 1; i >= i0 && frames[g].t - frames[i].t <= FADE_MS; i--) local[i] = INF;
      if (end + 1 <= i1) local[end + 1] = -GAP_BONUS;
    }
    g = end + 1;
  }

  const cost = (i: number, k: number) => {
    if (local[i] === INF) return INF;
    const dev = (frames[i].t - expected(k)) / span;
    return local[i] + PROPORTION_WEIGHT * dev * dev;
  };

  // best[k][i]: cheapest way to place boundaries 1..k with boundary k at
  // frame i. Boundaries are ordered and at least a syllable's minimum apart.
  const best: number[][] = [];
  const from: number[][] = [];
  for (let k = 1; k < n; k++) {
    best.push(new Array(frames.length).fill(INF));
    from.push(new Array(frames.length).fill(-1));
    for (let i = i0; i <= i1; i++) {
      if (frames[i].t - t0 < minHead(k)) continue;
      if (t1 - frames[i].t < minTail(k)) continue;
      const own = cost(i, k);
      if (own === INF) continue;
      if (k === 1) {
        best[0][i] = own;
        continue;
      }
      let bestPrev = INF;
      let bestJ = -1;
      for (let j = i0; j < i; j++) {
        // Syllable k-1 runs from boundary j to boundary i.
        if (frames[i].t - frames[j].t < minLen(k - 1)) break;
        if (best[k - 2][j] < bestPrev) {
          bestPrev = best[k - 2][j];
          bestJ = j;
        }
      }
      if (bestJ >= 0) {
        best[k - 1][i] = bestPrev + own;
        from[k - 1][i] = bestJ;
      }
    }
  }

  let endI = -1;
  let endCost = INF;
  for (let i = i0; i <= i1; i++) {
    if (best[n - 2][i] < endCost) {
      endCost = best[n - 2][i];
      endI = i;
    }
  }
  if (endI < 0) return null;

  const boundaries: number[] = [];
  for (let k = n - 1, i = endI; k >= 1; k--) {
    boundaries.unshift(frames[i].t);
    i = from[k - 1][i];
  }

  const edges = [t0, ...boundaries, t1];
  return specs.map((spec, k) => ({ ...spec, startMs: edges[k], endMs: edges[k + 1] }));
}
