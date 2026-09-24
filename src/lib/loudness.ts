/**
 * Loudness matching for playing a take back. Raw speech from any microphone
 * lands 15–30 dB under mastered audio such as the native voice, so a take
 * played as recorded is barely audible beside it. The take itself stays raw
 * for the pitch analysis; only the copy that is played is raised, the way a
 * recording app normalises a memo after the fact rather than while capturing.
 */

/** Gating block. BS.1770 uses 400 ms, which leaves a one-second take with
 *  only a handful of blocks; 100 ms keeps enough of them to gate on. */
const BLOCK_S = 0.1;
/** Blocks under this are silence whatever the speaker. */
const ABSOLUTE_GATE_DB = -70;
/** Blocks this far under the mean of the ungated ones are pauses and breath,
 *  not speech; leaving them in would make a take with long gaps read quieter
 *  than it sounds. */
const RELATIVE_GATE_DB = -10;
/** Upper bound on the raise, so a take of near-silence is not blown up into
 *  a wall of amplified room noise. */
const MAX_BOOST_DB = 36;
/** Speech loudness to match when there is no native voice to match. */
export const FALLBACK_TARGET_DB = -20;
/** Peak ceiling after the raise, just under full scale. */
const CEILING = 10 ** (-1 / 20);
/** The limiter's window: long enough to span a period of a low voice
 *  (~9 ms at 110 Hz), so a gain change never lands inside a single cycle and
 *  distorts it. */
const LIMIT_WINDOW_S = 0.012;
/** How fast the limiter lets go after a peak. */
const RELEASE_S = 0.08;

const toDb = (power: number) => 10 * Math.log10(power);

/** Speech loudness in dB of mean power, gated as BS.1770 gates (absolute,
 *  then relative to the ungated mean) but without its K-weighting filter;
 *  both sides of a comparison are measured the same way. Null for silence. */
export function speechLevelDb(samples: Float32Array, rate: number): number | null {
  const size = Math.max(1, Math.round(BLOCK_S * rate));
  const powers: number[] = [];
  for (let start = 0; start + size <= samples.length; start += size) {
    let sum = 0;
    for (let i = start; i < start + size; i++) sum += samples[i] * samples[i];
    powers.push(sum / size);
  }
  const audible = powers.filter(p => p > 0 && toDb(p) > ABSOLUTE_GATE_DB);
  if (!audible.length) return null;
  const gate = toDb(audible.reduce((a, b) => a + b, 0) / audible.length) + RELATIVE_GATE_DB;
  const speech = audible.filter(p => toDb(p) > gate);
  return toDb(speech.reduce((a, b) => a + b, 0) / speech.length);
}

/** The raise, in dB, that brings a take up to `targetDb`. */
export function boostDb(takeDb: number | null, targetDb: number): number {
  if (takeDb === null) return 0;
  return Math.min(MAX_BOOST_DB, targetDb - takeDb);
}

/** `samples` raised by `db`, with a look-ahead limiter holding every peak
 *  under the ceiling. A plain gain would clip: speech peaks sit ~18 dB over
 *  its average, so a take raised to the native voice's loudness would
 *  otherwise need headroom it does not have.
 *
 *  The gain curve is the minimum of the gain each sample needs, taken over a
 *  window centred on it, then averaged over a window of the same width.
 *  Every value averaged at a peak comes from a window containing that peak,
 *  so the smoothed gain there is no higher than the peak needs: the
 *  reduction ramps in ahead of the peak instead of stepping at it. */
export function raise(samples: Float32Array, rate: number, db: number): Float32Array {
  const gain = 10 ** (db / 20);
  const n = samples.length;
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const level = Math.abs(samples[i]) * gain;
    need[i] = level > CEILING ? CEILING / level : 1;
  }

  const half = Math.max(1, Math.round((LIMIT_WINDOW_S * rate) / 2));
  // Sliding minimum over [i - half, i + half] with a monotonic deque.
  const windowMin = new Float32Array(n);
  const deque = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (let j = 0; j < n + half; j++) {
    if (j < n) {
      while (tail > head && need[deque[tail - 1]] >= need[j]) tail--;
      deque[tail++] = j;
    }
    const i = j - half;
    if (i < 0) continue;
    while (deque[head] < i - half) head++;
    windowMin[i] = need[deque[head]];
  }

  // Box average of the same width, from a running sum.
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + windowMin[i];
  const release = 1 - Math.exp(-1 / (RELEASE_S * rate));
  const out = new Float32Array(n);
  let g = 1;
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n, i + half + 1);
    const smooth = (prefix[hi] - prefix[lo]) / (hi - lo);
    g = smooth < g ? smooth : g + (smooth - g) * release;
    out[i] = Math.max(-1, Math.min(1, samples[i] * gain * g));
  }
  return out;
}
