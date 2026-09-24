/**
 * The capture loop of capture.ts run over a whole recording at once, for
 * audio that is already in hand — the native voice's clip, a saved take.
 * The live loop reads its spectrum from an AnalyserNode and can only run
 * as fast as the audio plays; this computes the same bytes the way the Web
 * Audio specification defines the analyser (Blackman window, magnitude
 * over N, time smoothing, decibels from −100 to −30 truncated to a byte),
 * over the same 1024-sample hops of a 2048-sample window, so the frames
 * match the live loop's without waiting for playback.
 */

import { bandLevels, highBandShare, SPEC_MAX_HZ, type Capture, type Frame } from './capture';
import { detectPitch, rms } from './pitch';
import { gateVoicing, VOICING, type VoicingGate } from './voicing';

const FFT = 2048;
const HOP = 1024;
/** The analyser's smoothingTimeConstant in capture.ts. */
const SMOOTHING = 0.2;
const MIN_DB = -100;
const MAX_DB = -30;

const blackman = Float64Array.from({ length: FFT }, (_, n) =>
  0.42 - 0.5 * Math.cos((2 * Math.PI * n) / FFT) + 0.08 * Math.cos((4 * Math.PI * n) / FFT),
);

/** In-place radix-2 FFT. */
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

/** Frames and spectrogram columns for a mono recording at `rate` Hz. */
export function analyseSamples(samples: Float32Array, rate: number, gate: VoicingGate = VOICING): Capture {
  const window = new Float32Array(FFT);
  const smoothed = new Float64Array(FFT / 2);
  const re = new Float64Array(FFT);
  const im = new Float64Array(FFT);
  const binHz = rate / FFT;
  const specBins = Math.max(1, Math.round((SPEC_MAX_HZ / (rate / 2)) * (FFT / 2)));
  const candidates: Frame[] = [];
  const spectra: Capture['spectra'] = [];
  let processed = 0;
  for (let pos = 0; pos + HOP <= samples.length; pos += HOP) {
    processed += HOP;
    window.copyWithin(0, HOP);
    window.set(samples.subarray(pos, pos + HOP), FFT - HOP);
    for (let i = 0; i < FFT; i++) {
      re[i] = window[i] * blackman[i];
      im[i] = 0;
    }
    fft(re, im);
    const bytes = new Uint8Array(specBins);
    for (let k = 0; k < FFT / 2; k++) {
      smoothed[k] = SMOOTHING * smoothed[k] + (1 - SMOOTHING) * (Math.hypot(re[k], im[k]) / FFT);
      if (k >= specBins) continue;
      const db = 20 * Math.log10(smoothed[k] + 1e-20);
      bytes[k] = Math.max(0, Math.min(255, Math.floor(((db - MIN_DB) / (MAX_DB - MIN_DB)) * 255)));
    }
    const ms = (processed / rate) * 1000;
    const level = rms(window);
    const pitch = level > gate.silence ? detectPitch(window, rate) : null;
    candidates.push({
      t: ms,
      hz: pitch?.hz ?? null,
      rms: level,
      clarity: pitch?.clarity ?? 0,
      highShare: highBandShare(bytes, binHz),
      bands: bandLevels(bytes, binHz),
    });
    spectra.push({ ms, data: bytes });
  }
  return { frames: gateVoicing(candidates, gate), spectra };
}
