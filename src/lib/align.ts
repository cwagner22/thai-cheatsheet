/**
 * Lays the learner's take onto the native voice's timeline by dynamic time
 * warping, so a syllable held twice as long as the native's still lands in
 * its own slot. Driven by loudness and voicing, only lightly by pitch: if
 * pitch drove it, wrong tones would be warped until they looked right.
 */

import type { Frame } from './capture';
import { foldOctave, hzToSemitones, registerHz } from './pitch';

export interface Warp {
  /** Learner capture time → native time. */
  mapTime: (t: number) => number;
  /** Native time → learner capture time, for laying the native pitch and
   *  syllable slots on the learner's own timeline. */
  inverse: (t: number) => number;
}

/** Widest the warp may stray from the diagonal, as a share of the shorter
 *  track. Wide enough for a hesitation or a drawn-out vowel; narrow enough
 *  that the first syllable cannot be matched to the last. */
const BAND = 0.3;

/** How much each cue steers the alignment; one object so a harness can
 *  re-weight it. Pitch does not steer at all: it is the quantity being
 *  scored, and any weight on it lets the warp slide a wrong contour onto
 *  the right one — a take with every glide mirrored aligned itself into
 *  passing on a third of its syllables. Voicing is kept small because a
 *  syllable the pitch tracker lost — an aspirated final ครับ — is unvoiced
 *  but loud, and weighted heavily voicing matches it to the native's
 *  silence before ครับ instead of to ครับ. Energy carries the alignment. */
export const ALIGN_WEIGHTS = {
  pitch: 0,
  voiced: 0.4,
  energy: 3.0,
  /** Per decibel of mean difference between two voiced frames' spectral
   *  shapes (Frame.bands). Inside one run of voice — เรากินเมื่อวานนี้ is a
   *  second of it with no break — energy is nearly flat and the warp is
   *  free to slide a syllable into its neighbour's slot; the vowels are
   *  not flat, and /i/ against /a/ differs by ten decibels or more where
   *  their formants sit, the same vowel by two or three. */
  bands: 0.25,
};

/** Energy is compared in decibels, floored here: on a linear scale a quiet
 *  syllable sits closer to silence than to a loud one. */
const ENERGY_FLOOR_DB = -40;

interface Feat {
  t: number;
  st: number;
  voiced: number;
  energy: number;
  bands: number[] | null;
}

/** A frame at least this loud, relative to the take's loudest, counts as
 *  speech when finding where the utterance starts and ends. Energy rather
 *  than voicing, so a syllable the pitch tracker lost is not trimmed off;
 *  low, because a trailing particle can sit 30 dB under the loudest vowel. */
export const SPEECH_SHARE = 0.03;

function features(frames: Frame[]): Feat[] | null {
  const voiced = frames.flatMap((f, i) => (f.hz === null ? [] : [i]));
  if (voiced.length < 8) return null;
  const ref = registerHz(voiced.map(i => frames[i].hz as number));
  const peakAll = Math.max(...frames.map(f => f.rms)) || 1;
  let first = 0;
  while (first < frames.length && frames[first].rms < SPEECH_SHARE * peakAll) first++;
  let last = frames.length - 1;
  while (last > first && frames[last].rms < SPEECH_SHARE * peakAll) last--;
  const slice = frames.slice(first, last + 1);
  const peak = Math.max(...slice.map(f => f.rms)) || 1;
  return slice.map(f => ({
    t: f.t,
    st: f.hz === null ? 0 : hzToSemitones(foldOctave(f.hz, ref), ref),
    voiced: f.hz === null ? 0 : 1,
    energy: Math.max(0, 1 - (20 * Math.log10(Math.max(f.rms, 1e-6) / peak)) / ENERGY_FLOOR_DB),
    bands: f.bands ?? null,
  }));
}

export function dtwAlign(reference: Frame[], learner: Frame[]): Warp | null {
  const a = features(reference);
  const b = features(learner);
  if (!a || !b) return null;
  const n = a.length;
  const m = b.length;
  const band = Math.max(3, Math.round(BAND * Math.min(n, m)));

  const { pitch: wPitch, voiced: wVoiced, energy: wEnergy, bands: wBands } = ALIGN_WEIGHTS;
  // Compared on every pair of frames, not only voiced ones: silence has a
  // flat shape, a vowel a peaked one, so a voiced frame set against a
  // silent one pays here too. Waived for unvoiced pairs, the cheapest path
  // through a long vowel was to match it against the other take's silence.
  const shapeGap = (x: Feat, y: Feat): number => {
    if (!x.bands || !y.bands) return 0;
    let sum = 0;
    for (let b = 0; b < x.bands.length; b++) sum += Math.abs(x.bands[b] - y.bands[b]);
    return sum / x.bands.length;
  };
  const dist = (x: Feat, y: Feat) =>
    (x.voiced && y.voiced ? wPitch * Math.abs(x.st - y.st) : 0) +
    wVoiced * Math.abs(x.voiced - y.voiced) +
    wEnergy * Math.abs(x.energy - y.energy) +
    wBands * shapeGap(x, y);

  const INF = Number.POSITIVE_INFINITY;
  const acc: Float64Array[] = Array.from({ length: n }, () => new Float64Array(m).fill(INF));
  for (let i = 0; i < n; i++) {
    const centre = Math.round((i / (n - 1 || 1)) * (m - 1));
    const lo = Math.max(0, centre - band);
    const hi = Math.min(m - 1, centre + band);
    for (let j = lo; j <= hi; j++) {
      const d = dist(a[i], b[j]);
      if (i === 0 && j === 0) {
        acc[i][j] = d;
        continue;
      }
      const up = i > 0 ? acc[i - 1][j] : INF;
      const left = j > 0 ? acc[i][j - 1] : INF;
      const diag = i > 0 && j > 0 ? acc[i - 1][j - 1] : INF;
      const prev = Math.min(up, left, diag);
      if (prev < INF) acc[i][j] = prev + d;
    }
  }
  if (!Number.isFinite(acc[n - 1][m - 1])) return null;

  // Both ends pinned: a path free to stop early stops just before a final
  // syllable that is present but unlike the native's (unvoiced, quieter)
  // and crams it into the last few steps.
  //
  // Walk back along the cheapest path, collecting for each learner frame
  // the native times it was matched to.
  const matched: number[][] = Array.from({ length: m }, () => []);
  let i = n - 1;
  let j = m - 1;
  matched[j].push(a[i].t);
  while (i > 0 || j > 0) {
    const up = i > 0 ? acc[i - 1][j] : INF;
    const left = j > 0 ? acc[i][j - 1] : INF;
    const diag = i > 0 && j > 0 ? acc[i - 1][j - 1] : INF;
    if (diag <= up && diag <= left) {
      i--;
      j--;
    } else if (up <= left) {
      i--;
    } else {
      j--;
    }
    matched[j].push(a[i].t);
  }

  // One anchor per learner frame: its mean matched native time. Monotone by
  // construction of the path.
  const anchors = b.map((f, k) => {
    const ts = matched[k];
    return [f.t, ts.reduce((s, v) => s + v, 0) / ts.length] as [number, number];
  });

  // Outside the matched span time passes at its own rate; the span's
  // average stretch would fling whatever trails the utterance across the
  // panel whenever the final syllable was itself stretched.
  return { mapTime: interpolate(anchors), inverse: interpolate(anchors.map(([a, b]) => [b, a])) };
}

/** Piecewise-linear through monotone anchors, unit slope beyond the ends.
 *  Anchors may repeat an x (several learner frames matched to one native
 *  frame, or the reverse); the first of a run wins, which keeps the function
 *  single-valued. */
function interpolate(anchors: [number, number][]): (t: number) => number {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  return (t: number): number => {
    if (t <= first[0]) return first[1] + (t - first[0]);
    if (t >= last[0]) return last[1] + (t - last[0]);
    let lo = 0;
    let hi = anchors.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (anchors[mid][0] <= t) lo = mid;
      else hi = mid;
    }
    const [x0, y0] = anchors[lo];
    const [x1, y1] = anchors[hi];
    return x1 === x0 ? y0 : y0 + ((t - x0) / (x1 - x0)) * (y1 - y0);
  };
}
