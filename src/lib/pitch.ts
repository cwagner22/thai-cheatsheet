/**
 * F0 tracking by McLeod's normalised square difference function. Plain
 * autocorrelation's peak heights scale with energy and settle on twice the
 * true period — an octave error, which on a tone display looks like a wrong
 * tone. NSDF keeps peak heights comparable across lags, and the height of
 * the chosen peak is a 0..1 "clarity" the voicing gate can use.
 */

/** Human speech F0 range to search. */
const MIN_F0 = 60;
const MAX_F0 = 500;

/** Audio is decimated to roughly this rate; nothing above a few kHz bears
 *  on F0. */
const WORK_RATE = 11025;

/** A peak this close to the tallest one wins even if it comes earlier.
 *  Picking the earliest tall peak rather than the tallest is what keeps the
 *  result on the true period instead of a multiple of it. */
const PEAK_RATIO = 0.9;

export interface PitchResult {
  hz: number;
  /** 0..1 — how periodic the frame is. */
  clarity: number;
}

export function rms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

/** Semitones of `hz` above `ref`. */
export function hzToSemitones(hz: number, ref: number): number {
  return 12 * Math.log2(hz / ref);
}

/** Folds a frequency into the octave around `ref`, undoing octave errors.
 *  The boundary at 1.5× (seven semitones) is wider than Thai's tone space
 *  (±5 around the median) and well short of an octave. */
export function foldOctave(hz: number, ref: number): number {
  let folded = hz;
  while (folded / ref > 1.5) folded /= 2;
  while (ref / folded > 1.5) folded *= 2;
  return folded;
}

/** The speaker's own register: a median taken twice, the second pass over
 *  frequencies folded into the octave around the first, so octave errors
 *  do not drag it. */
export function registerHz(hz: number[]): number {
  const rough = median(hz);
  return median(hz.map(v => foldOctave(v, rough)));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Frames whose best peak is below `clarityFloor` come back null. The
 *  voiced/unvoiced decision proper is made afterwards, per take, by
 *  voicing.ts; the floor here only drops frames no gate could ever accept. */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  clarityFloor = 0,
): PitchResult | null {
  const factor = Math.max(1, Math.floor(sampleRate / WORK_RATE));
  const rate = sampleRate / factor;
  const n = Math.floor(buffer.length / factor);

  // Averaging each group of `factor` samples decimates and low-passes in one
  // pass; without the averaging, energy above the new Nyquist would alias
  // down into the range we are about to search.
  const x = new Float32Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < factor; j++) sum += buffer[i * factor + j];
    x[i] = sum / factor;
    mean += x[i];
  }
  mean /= n || 1;
  for (let i = 0; i < n; i++) x[i] -= mean;

  const minLag = Math.floor(rate / MAX_F0);
  const maxLag = Math.min(Math.floor(rate / MIN_F0), n - 1);
  if (maxLag <= minLag + 2) return null;

  const nsdf = new Float32Array(maxLag + 2);
  for (let lag = 1; lag <= maxLag; lag++) {
    let correlation = 0;
    let energy = 0;
    for (let i = 0; i + lag < n; i++) {
      const a = x[i];
      const b = x[i + lag];
      correlation += a * b;
      energy += a * a + b * b;
    }
    nsdf[lag] = energy > 0 ? (2 * correlation) / energy : 0;
  }

  // Each run of positive NSDF holds one candidate period, its tallest point.
  // The scan starts at lag 1, not minLag: the shoulder NSDF leaves after
  // lag 0 has to be walked off first, and for a high voice the true period
  // is barely longer than minLag — starting there walks through the genuine
  // first peak and reports the octave below. Short peaks are dropped after.
  const peaks: number[] = [];
  let lag = 1;
  while (lag <= maxLag && nsdf[lag] > 0) lag++;
  while (lag <= maxLag) {
    if (nsdf[lag] <= 0) { lag++; continue; }
    let best = lag;
    while (lag <= maxLag && nsdf[lag] > 0) {
      if (nsdf[lag] > nsdf[best]) best = lag;
      lag++;
    }
    if (best >= minLag) peaks.push(best);
  }
  if (peaks.length === 0) return null;

  let tallest = 0;
  for (const p of peaks) tallest = Math.max(tallest, nsdf[p]);
  if (tallest < clarityFloor) return null;

  const threshold = tallest * PEAK_RATIO;
  const chosen = peaks.find(p => nsdf[p] >= threshold);
  if (chosen === undefined) return null;

  // Parabolic interpolation recovers the fraction of a sample the decimated
  // lag grid cannot.
  const y0 = nsdf[chosen - 1] ?? nsdf[chosen];
  const y1 = nsdf[chosen];
  const y2 = nsdf[chosen + 1] ?? nsdf[chosen];
  const curvature = y0 - 2 * y1 + y2;
  const period = curvature !== 0 ? chosen + (y0 - y2) / (2 * curvature) : chosen;

  const hz = rate / period;
  if (!Number.isFinite(hz) || hz < MIN_F0 || hz > MAX_F0) return null;
  return { hz, clarity: y1 };
}
