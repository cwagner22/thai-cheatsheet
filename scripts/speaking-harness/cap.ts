/**
 * Emulates src/lib/capture.ts offline: 1024-sample hops over a 2048-sample rolling
 * window; level and pitch from the window, and an AnalyserNode-style byte
 * spectrum (Blackman window, |X|/N, 0.2 time smoothing, −100..−30 dB → 0..255)
 * for highShare and bands, so voicing.ts and align.ts see what they see in
 * the browser.
 */
import { readFileSync } from 'node:fs';
import { detectPitch, rms } from '../../src/lib/pitch';
import { gateVoicing, VOICING } from '../../src/lib/voicing';
import { highBandShare, bandLevels, SPEC_MAX_HZ, type Frame } from '../../src/lib/capture';

export function readWav(path: string): { rate: number; samples: Float32Array } {
  const buf = readFileSync(path);
  const rate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  let off = 12;
  while (off < buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'data') {
      const n = Math.floor(size / (bits / 8));
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(off + 8 + i * 2) / 32768;
      return { rate, samples: out };
    }
    off += 8 + size;
  }
  throw new Error('no data chunk');
}

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
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const FFT = 2048;
const blackman = Float64Array.from({ length: FFT }, (_, n) =>
  0.42 - 0.5 * Math.cos((2 * Math.PI * n) / FFT) + 0.08 * Math.cos((4 * Math.PI * n) / FFT),
);

export function capture(path: string): Frame[] {
  const { rate, samples } = readWav(path);
  const HOP = 1024;
  const window = new Float32Array(FFT);
  const smoothed = new Float64Array(FFT / 2);
  const re = new Float64Array(FFT);
  const im = new Float64Array(FFT);
  const binHz = rate / FFT;
  const specBins = Math.max(1, Math.round((SPEC_MAX_HZ / (rate / 2)) * (FFT / 2)));
  const candidates: Frame[] = [];
  let processed = 0;
  for (let pos = 0; pos + HOP <= samples.length; pos += HOP) {
    processed += HOP;
    const input = samples.subarray(pos, pos + HOP);
    window.copyWithin(0, input.length);
    window.set(input, window.length - input.length);
    for (let i = 0; i < FFT; i++) {
      re[i] = window[i] * blackman[i];
      im[i] = 0;
    }
    fft(re, im);
    const bytes = new Uint8Array(FFT / 2);
    for (let k = 0; k < FFT / 2; k++) {
      const mag = Math.hypot(re[k], im[k]) / FFT;
      smoothed[k] = 0.2 * smoothed[k] + 0.8 * mag;
      const db = 20 * Math.log10(smoothed[k] + 1e-20);
      bytes[k] = Math.max(0, Math.min(255, Math.round(((db + 100) / 70) * 255)));
    }
    const spectrum = bytes.slice(0, specBins);
    const level = rms(window);
    const pitch = level > VOICING.silence ? detectPitch(window, rate) : null;
    candidates.push({
      t: (processed / rate) * 1000,
      hz: pitch?.hz ?? null,
      rms: level,
      clarity: pitch?.clarity ?? 0,
      highShare: highBandShare(spectrum, binHz),
      bands: bandLevels(spectrum, binHz),
    });
  }
  return gateVoicing(candidates, VOICING);
}
