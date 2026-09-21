/**
 * One analyser loop for the microphone and the native voice alike, so any
 * difference between the two pictures is in the voices, not the processing.
 * The analyser settings are the reference visualiser's
 * (thai_phonetic_spectrogram_pitch_visualizer.html); its colour ramp and
 * sensitivity were chosen against these bytes.
 */

import { detectPitch, rms } from './pitch';
import { gateVoicing, VOICING, type VoicingGate } from './voicing';

export interface Frame {
  /** Milliseconds since the capture started. */
  t: number;
  /** null when the frame was unvoiced — a stop, a pause, or silence. */
  hz: number | null;
  rms: number;
  /** The detector's 0..1 periodicity for the frame; 0 with no candidate.
   *  Kept so the voicing gate can be re-run over a whole take. */
  clarity: number;
  /** Share of the frame's spectral energy above SPEECH_BAND_HZ, 0..1 — the
   *  vowel formants of a voice against the low harmonics of a hum. Absent
   *  when the frames came without a spectrum. */
  highShare?: number;
  /** The frame's spectral shape, see bandLevels. Absent without a spectrum. */
  bands?: number[];
}

export interface SpectrumColumn {
  ms: number;
  /** Byte magnitudes, bin 0 at DC, already trimmed to SPEC_MAX_HZ. */
  data: Uint8Array;
}

export interface Capture {
  frames: Frame[];
  spectra: SpectrumColumn[];
}

/** Top of the spectrogram's frequency axis, the reference visualiser's
 *  default. The scope labels its axis from this and the capture slices the
 *  analyser's bins to it. */
export const SPEC_MAX_HZ = 3500;

/** Above this a voice carries its formants; a machine hum or a low rumble
 *  keeps nearly all its energy below it. */
export const SPEECH_BAND_HZ = 300;

/** The analyser's byte scale is decibels from minDecibels (−100) to
 *  maxDecibels (−30); back to linear amplitude so the band shares are
 *  shares of energy, not of a log scale. */
const byteToAmplitude = (b: number) => 10 ** ((b / 255) * 70 / 20 - 5);

/** Edges of the coarse bands the alignment compares, in Hz: about a third
 *  of an octave each from the first-formant region to the top of the
 *  spectrogram, so a vowel's formants land in different bands from another
 *  vowel's while a speaker's formants stay in the same ones. */
export const BAND_EDGES_HZ = [150, 250, 400, 600, 850, 1150, 1500, 1900, 2400, 3000, 3500];

/** The frame's spectral shape: mean energy per band in decibels with the
 *  frame's own mean level taken out. Two frames of one vowel read alike
 *  whether spoken softly or loudly, and two different vowels differ by
 *  tens of decibels where their formants fall — which is what lets the
 *  alignment match /iː/ to /iː/ inside a run of voice, where loudness and
 *  pitch alone tell it nothing. */
export function bandLevels(bytes: Uint8Array, binHz: number): number[] {
  const levels: number[] = [];
  for (let b = 0; b + 1 < BAND_EDGES_HZ.length; b++) {
    const lo = Math.max(1, Math.round(BAND_EDGES_HZ[b] / binHz));
    const hi = Math.max(lo + 1, Math.min(bytes.length, Math.round(BAND_EDGES_HZ[b + 1] / binHz)));
    let sum = 0;
    for (let k = lo; k < hi; k++) sum += byteToAmplitude(bytes[k]) ** 2;
    levels.push(10 * Math.log10(sum / (hi - lo) + 1e-12));
  }
  const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
  return levels.map(v => v - mean);
}

export function highBandShare(bytes: Uint8Array, binHz: number): number {
  const lo = Math.max(1, Math.round(SPEECH_BAND_HZ / binHz));
  let low = 0;
  let high = 0;
  for (let k = 1; k < bytes.length; k++) {
    const a = byteToAmplitude(bytes[k]);
    if (k < lo) low += a;
    else high += a;
  }
  return high / (low + high || 1);
}

export interface CaptureHandle {
  /** Grows while the capture runs; the same object throughout, so a caller
   *  can hold it and read the tail. */
  readonly capture: Capture;
  stop(): void;
}

export interface CaptureOptions {
  /** Overrides the voiced/unvoiced gate; see voicing.ts. */
  voicing?: VoicingGate;
  onFrame?: (elapsedMs: number, capture: Capture) => void;
  /** Checked after every frame; returning true ends the capture. */
  shouldStop?: (elapsedMs: number, capture: Capture) => boolean;
  onStop?: (capture: Capture) => void;
}

/** Samples handed to the processor per callback. 1024 at 48 kHz is a frame
 *  every 21 ms — twice the analyser's window rate, so nothing is skipped —
 *  and it is the smallest size that stays glitch-free on modest machines. */
const PROCESSOR_BUFFER = 1024;

export function startCapture(
  ctx: AudioContext,
  source: AudioNode,
  options: CaptureOptions = {},
): CaptureHandle {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.2;
  source.connect(analyser);

  // The frame clock is the audio graph, not the screen: requestAnimationFrame
  // stalls whenever the page is not being composited (hidden tab, occluded
  // window), while onaudioprocess fires every PROCESSOR_BUFFER samples
  // regardless and time is counted in samples. ScriptProcessorNode is
  // deprecated, but an AudioWorklet cannot read an AnalyserNode, and the
  // analyser is what keeps this byte-identical to the reference visualiser.
  const processor = ctx.createScriptProcessor(PROCESSOR_BUFFER, 1, 1);
  const sink = ctx.createGain();
  sink.gain.value = 0;
  source.connect(processor);
  processor.connect(sink);
  sink.connect(ctx.destination);

  // Level and pitch come from inputBuffer, kept in a rolling window the size
  // of the analyser's, not from analyser.getFloatTimeDomainData(): when the
  // main thread is throttled the callbacks arrive late in bursts, and each
  // would read the analyser's *current* window — right timestamps, wrong
  // audio. Only the spectrogram bytes come from the analyser.
  const window = new Float32Array(analyser.fftSize);
  const freqBuf = new Uint8Array(analyser.frequencyBinCount);
  const specBins = Math.max(
    1,
    Math.round((SPEC_MAX_HZ / (ctx.sampleRate / 2)) * analyser.frequencyBinCount),
  );

  // `candidates` is every frame the detector could read; `capture.frames`
  // is the same list after the voicing gate. The gate judges each frame by
  // its neighbours and by the take's loudest frame, so it is re-run over the
  // whole take on every callback.
  const gate = options.voicing ?? VOICING;
  const candidates: Frame[] = [];
  const capture: Capture = { frames: [], spectra: [] };
  let processed = 0;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    processor.onaudioprocess = null;
    for (const [from, to] of [
      [source, analyser],
      [source, processor],
      [processor, sink],
      [sink, ctx.destination],
    ] as const) {
      try {
        from.disconnect(to);
      } catch {
        // Already disconnected by the source ending; nothing to undo.
      }
    }
    options.onStop?.(capture);
  };

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    if (stopped) return;
    processed += PROCESSOR_BUFFER;
    const elapsed = (processed / ctx.sampleRate) * 1000;
    const input = event.inputBuffer.getChannelData(0);
    window.copyWithin(0, input.length);
    window.set(input, window.length - input.length);
    analyser.getByteFrequencyData(freqBuf);

    const level = rms(window);
    const pitch = level > gate.silence ? detectPitch(window, ctx.sampleRate) : null;
    const spectrum = freqBuf.slice(0, specBins);
    candidates.push({
      t: elapsed,
      hz: pitch?.hz ?? null,
      rms: level,
      clarity: pitch?.clarity ?? 0,
      highShare: highBandShare(spectrum, ctx.sampleRate / analyser.fftSize),
      bands: bandLevels(spectrum, ctx.sampleRate / analyser.fftSize),
    });
    capture.frames = gateVoicing(candidates, gate);
    capture.spectra.push({ ms: elapsed, data: spectrum });

    options.onFrame?.(elapsed, capture);
    if (options.shouldStop?.(elapsed, capture)) stop();
  };

  return { capture, stop };
}
