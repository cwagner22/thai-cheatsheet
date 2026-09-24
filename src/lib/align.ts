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

/** Cumulative cost of the cheapest warping path between two feature
 *  tracks, within the band; null when the path cannot reach the end. */
function accumulate(a: Feat[], b: Feat[]): Float64Array[] | null {
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
  return Number.isFinite(acc[n - 1][m - 1]) ? acc : null;
}

export function dtwAlign(reference: Frame[], learner: Frame[]): Warp | null {
  const a = features(reference);
  const b = features(learner);
  if (!a || !b) return null;
  const acc = accumulate(a, b);
  if (!acc) return null;
  const n = a.length;
  const m = b.length;
  const INF = Number.POSITIVE_INFINITY;

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
export function interpolate(anchors: [number, number][]): (t: number) => number {
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

/** A silence at least this long in a take, between stretches of speech, is
 *  a pause between words. Well above the closure of a stop (under 150 ms),
 *  well below the gap a learner leaves reading word by word. */
export const PAUSE_MS = 220;

interface Stretch {
  startMs: number;
  endMs: number;
}

/** Stretches of speech in a take, split at pauses. */
function speechStretches(frames: Frame[]): Stretch[] {
  const peak = Math.max(...frames.map(f => f.rms)) || 1;
  const out: Stretch[] = [];
  let open: Stretch | undefined;
  for (const f of frames) {
    if (f.rms < SPEECH_SHARE * 3 * peak) continue;
    if (open && f.t - open.endMs < PAUSE_MS) {
      open.endMs = f.t;
    } else {
      if (open) out.push(open);
      open = { startMs: f.t, endMs: f.t };
    }
  }
  if (open) out.push(open);
  return out;
}

/** A run of pitched frames at least this long counts as one syllable's
 *  vowel when counting syllables in a stretch; shorter ones are a voiced
 *  onset or a tracker blip. */
const NUCLEUS_MS = 50;

/** The costs pauseAlign weighs when it hands each stretch of a take read
 *  in pieces a run of native syllables; one object so a harness can
 *  re-weight it (scripts/speaking-dataset/alignbench.ts). */
export const PAUSE_WEIGHTS = {
  /** A pause falling inside a word rather than between words: a learner
   *  reading in pieces mostly breaks between words, but not always —
   *  ภาษา | ไทย is a natural place to breathe. */
  splitInWord: 0.35,
  /** Per vowel of difference between those heard in a stretch (nuclei())
   *  and the syllables of the native run it is given. Durations
   *  alone are misled by a learner holding one word twice as long as the
   *  native: ผมพูด said briskly and ไทย drawn out, and the cheapest split
   *  by length hands ผม a stretch of its own and pushes every word after
   *  it one slot late. */
  count: 0.6,
  /** Per native syllable left unsaid at the end of the take: more than
   *  one vowel miscounted, so a take that said everything is not read as
   *  cut off because two of its syllables ran together. At the vowel
   *  count's own cost, a quarter of a fast voice's complete word-by-word
   *  takes were read as cut off (alignbench.ts); at this, under 1 %. */
  unsaid: 0.8,
};

/** Vowels in a stretch: runs of pitched frames, each at least NUCLEUS_MS
 *  long. Thai syllables mostly begin with a consonant that breaks the voice
 *  — a stop, an aspirate, /s/ — so a count of voiced runs follows the
 *  syllable count; where two syllables join through a nasal (มา.นะ) it
 *  undercounts, which is why the count only adds a cost and never decides. */
function nuclei(frames: Frame[], stretch: Stretch): number {
  let count = 0;
  let runStart: number | null = null;
  let lastT = stretch.startMs;
  const close = () => {
    if (runStart !== null && lastT - runStart >= NUCLEUS_MS) count++;
    runStart = null;
  };
  for (const f of frames) {
    if (f.t < stretch.startMs || f.t > stretch.endMs) continue;
    if (f.hz === null) close();
    else {
      if (runStart === null) runStart = f.t;
      lastT = f.t;
    }
  }
  close();
  return Math.max(1, count);
}

/**
 * Alignment for a take read in pieces — word by word, or a phrase at a
 * time. Pure time warping has nothing to match a pause against when the
 * native voice runs straight through, and every slot after the first pause
 * drifts. Here each stretch of the take between pauses is matched to a run
 * of consecutive native syllables, the runs chosen so that every stretch
 * keeps roughly the take's overall pace and breaks fall between words where
 * they can; then each stretch is warped onto its run alone, and a pause
 * maps onto the syllable boundary it sits at.
 *
 * `units` are the native voice's syllables in order; `nativeEndMs` closes
 * the last one. `said` counts the units the take reached; the rest were
 * not said. Returns null when the take has no pause worth anchoring on.
 */
export function pauseAlign(
  reference: Frame[],
  learner: Frame[],
  units: { startMs: number; wordStart: boolean }[],
  nativeEndMs: number,
): (Warp & { said: number }) | null {
  let chunks = speechStretches(learner);
  const wordStartsMs = units.map(u => u.startMs);
  const words = wordStartsMs.length;
  if (chunks.length < 2 || words < 2) return null;
  // More stretches than words: a pause inside a word. Rejoin at the
  // shortest pauses until each stretch can hold a word.
  while (chunks.length > words) {
    let k = 0;
    for (let i = 1; i < chunks.length - 1; i++) {
      if (chunks[i + 1].startMs - chunks[i].endMs < chunks[k + 1].startMs - chunks[k].endMs) k = i;
    }
    chunks = [...chunks.slice(0, k), { startMs: chunks[k].startMs, endMs: chunks[k + 1].endMs }, ...chunks.slice(k + 2)];
  }
  const C = chunks.length;
  const wordEnd = (w: number) => (w + 1 < words ? wordStartsMs[w + 1] : nativeEndMs);
  const nativeMs = (a: number, b: number) => wordEnd(b) - wordStartsMs[a];
  const spoken = chunks.reduce((sum, c) => sum + (c.endMs - c.startMs), 0);
  const heard = chunks.map(c => nuclei(learner, c));
  const W = PAUSE_WEIGHTS;
  const PAD_MS = 60;

  // Cheapest way to give the stretches the units 0..last, each stretch a
  // run of consecutive units, at the pace those units imply.
  const solve = (last: number) => {
    const pace = spoken / Math.max(1, nativeMs(0, last));
    const cost = (c: number, a: number, b: number) => {
      const r = (chunks[c].endMs - chunks[c].startMs + 20) / Math.max(20, nativeMs(a, b)) / pace;
      return (
        Math.log(r) ** 2 +
        W.count * Math.abs(heard[c] - (b - a + 1)) +
        (c > 0 && !units[a].wordStart ? W.splitInWord : 0)
      );
    };
    // best[c][w]: cheapest way to give stretches 0..c the units 0..w.
    const INF = Number.POSITIVE_INFINITY;
    const best = Array.from({ length: C }, () => new Array<number>(last + 1).fill(INF));
    const from = Array.from({ length: C }, () => new Array<number>(last + 1).fill(-1));
    for (let w = 0; w <= last; w++) best[0][w] = cost(0, 0, w);
    for (let c = 1; c < C; c++) {
      for (let w = c; w <= last; w++) {
        for (let v = c - 1; v < w; v++) {
          const total = best[c - 1][v] + cost(c, v + 1, w);
          if (total < best[c][w]) {
            best[c][w] = total;
            from[c][w] = v;
          }
        }
      }
    }
    const runs: [number, number][] = [];
    for (let c = C - 1, w = last; c >= 0; c--) {
      const v = c > 0 ? from[c][w] : -1;
      runs.unshift([v + 1, w]);
      w = v;
    }
    return { total: best[C - 1][last], runs };
  };
  // A take can stop before the sentence does — the learner stopped the
  // recording. Every ending is tried, each unit left unsaid at a price
  // (W.unsaid), so the last stretch need not be handed the rest of the
  // sentence just because nothing else is left to take it.
  let chosen = solve(words - 1);
  let said = words;
  for (let last = C - 1; last < words - 1; last++) {
    const option = solve(last);
    const total = option.total + W.unsaid * (words - 1 - last);
    if (total < chosen.total + W.unsaid * (words - said)) {
      chosen = option;
      said = last + 1;
    }
  }
  const runs = chosen.runs;

  const anchors: [number, number][] = [];
  runs.forEach(([a, b], c) => {
    const chunk = chunks[c];
    const n0 = wordStartsMs[a];
    const n1 = wordEnd(b);
    const pad = PAD_MS;
    const lrnPart = learner.filter(f => f.t >= chunk.startMs - pad && f.t <= chunk.endMs + pad);
    const refPart = reference.filter(f => f.t >= n0 && f.t <= n1);
    const local = dtwAlign(refPart, lrnPart);
    const linear = (t: number) => n0 + ((t - chunk.startMs) / Math.max(1, chunk.endMs - chunk.startMs)) * (n1 - n0);
    for (const f of lrnPart) {
      if (f.t < chunk.startMs || f.t > chunk.endMs) continue;
      const m = local ? Math.min(n1, Math.max(n0, local.mapTime(f.t))) : linear(f.t);
      const prev = anchors[anchors.length - 1];
      anchors.push([f.t, prev ? Math.max(prev[1], m) : m]);
    }
  });
  if (anchors.length < 2) return null;
  return { mapTime: interpolate(anchors), inverse: interpolate(anchors.map(([x, y]) => [y, x])), said };
}
