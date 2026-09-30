/**
 * An offline wideband spectrogram for the English Speaking page, the kind
 * phoneticians read formants from: a short analysis window blurs the
 * individual harmonics of the voice together, so what stands out are the
 * broad resonance bands (formants) that tell vowels apart and that /ɹ/ and
 * /l/ move. The Thai tab's live analyser uses a long window instead, which
 * resolves harmonics for pitch and blurs formants.
 */

/** Top of the frequency axis. F1–F3 of any adult voice fall under it. */
export const SPECTRO_MAX_HZ = 5000;
/** Analysis window. Around 5 ms is the textbook wideband window: shorter
 *  than one glottal period of most voices, so harmonics do not resolve. */
const WINDOW_MS = 6;
const HOP_MS = 4;
const FFT_SIZE = 512;
/** Levels further than this under the loudest cell are drawn as blank
 *  paper. Praat's default is 50 dB; on white at this size that leaves the
 *  noise between formants mid-grey, so the bands stop standing out. */
const DYNAMIC_RANGE_DB = 42;
/** Contrast curve over the 0..1 level: above 1 it keeps the weak cells
 *  pale and saves the dark end for the formant peaks. */
const CONTRAST = 1.6;
/** First-order pre-emphasis. Voiced speech loses about 6 dB per octave, so
 *  without it F3 and above are drawn far fainter than F1. */
const PRE_EMPHASIS = 0.97;

export interface Spectrogram {
  /** One column per HOP_MS, each 0..1 from blank to darkest, bin 0 at 0 Hz. */
  columns: Float32Array[];
  hopMs: number;
  /** Frequency of each bin step, in Hz. */
  binHz: number;
}

/** In-place iterative radix-2 FFT over `re`/`im` (length a power of two). */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const step = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k++) {
        const wr = Math.cos(step * k);
        const wi = Math.sin(step * k);
        const a = start + k;
        const b = a + size / 2;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

/** The spectrogram of `samples` from `startMs` to `endMs`, scaled to its own
 *  loudest cell so a quiet take and a loud one read alike. */
export function spectrogramOf(samples: Float32Array, rate: number, startMs: number, endMs: number): Spectrogram {
  const win = Math.min(FFT_SIZE, Math.round((WINDOW_MS / 1000) * rate));
  const hop = (HOP_MS / 1000) * rate;
  const binHz = rate / FFT_SIZE;
  const bins = Math.min(FFT_SIZE / 2, Math.ceil(SPECTRO_MAX_HZ / binHz));
  const hann = Float64Array.from({ length: win }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1)));
  const from = Math.round((startMs / 1000) * rate);
  const to = Math.min(samples.length, Math.round((endMs / 1000) * rate));
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const raw: Float32Array[] = [];
  let top = -Infinity;
  for (let pos = from; pos + win <= to; pos += hop) {
    const at = Math.round(pos);
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < win; i++) {
      const prev = at + i > 0 ? samples[at + i - 1] : 0;
      re[i] = (samples[at + i] - PRE_EMPHASIS * prev) * hann[i];
    }
    fft(re, im);
    const column = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      const db = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-20);
      column[k] = db;
      if (db > top) top = db;
    }
    raw.push(column);
  }
  for (const column of raw) {
    for (let k = 0; k < column.length; k++) {
      column[k] = Math.max(0, 1 - (top - column[k]) / DYNAMIC_RANGE_DB) ** CONTRAST;
    }
  }
  return { columns: raw, hopMs: HOP_MS, binHz };
}
