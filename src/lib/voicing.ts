/**
 * The voiced/unvoiced decision, made relative to each take rather than by a
 * fixed threshold. A held vowel reads clarity above 0.7 in any voice and
 * noise below 0.4, but syllable onsets, releases and quiet low tones read in
 * between, and where exactly depends on the speaker, microphone and room.
 * So a frame above `confident` is voiced on its own; a frame between
 * `marginal` and `confident` is voiced only if its pitch continues a voiced
 * neighbour's within `maxStepSt` — speech cannot jump several semitones in
 * one 21 ms frame, noise can. Level is gated the same way, against the
 * take's own loudest frame.
 */

import type { Frame } from './capture';
import { hzToSemitones } from './pitch';

export interface VoicingGate {
  /** Clarity at or above which a frame is voiced on its own. */
  confident: number;
  /** Clarity below which a frame is unvoiced whatever its neighbours. */
  marginal: number;
  /** Largest pitch step, in semitones, a marginal frame may take from the
   *  accepted frame beside it. */
  maxStepSt: number;
  /** Level below which a frame is unvoiced, as a share of the take's loudest
   *  frame. Relative, never absolute: microphone levels differ by 40 dB
   *  between setups, and a fixed floor cuts a quiet speaker's final syllable
   *  off. 0.05 is −26 dB, under a trailing particle and above room noise. */
  levelShare: number;
  /** Absolute level under which a frame is not analysed — digital silence,
   *  where a periodic hum would otherwise read as a voice. */
  silence: number;
  /** A run of this many marginal frames whose pitches continue one another
   *  is voiced with no confident frame among them: a short, quiet, aspirated
   *  syllable can be marginal from onset to release, while noise does not
   *  hold one pitch across three frames. */
  minRun: number;
  /** Widest dip, in frames, a run may grow across when the pitch candidates
   *  through it stay continuous; 40 ms is a vowel transition, not a pause. */
  maxGap: number;
  /** The take's loudest frame must exceed its quietest tenth by at least
   *  this factor for anything in it to count as voice. Speech over a take
   *  always spans 40 dB or more from its silences; a take with nothing said
   *  spans 2–3× at most, and every other gate here is relative to the peak,
   *  so without this a silent room is analysed as a quiet voice and its
   *  noise-suppression residue drawn as pitch. 12× is 22 dB. */
  minDynamicRange: number;
}

export const VOICING: VoicingGate = {
  confident: 0.7,
  marginal: 0.4,
  maxStepSt: 3,
  levelShare: 0.05,
  silence: 1e-4,
  minRun: 3,
  maxGap: 2,
  minDynamicRange: 12,
};

/** Returns the frames with `hz` nulled wherever the gate rejects the frame.
 *  `frames` should carry every candidate the detector produced, however
 *  unclear: a dip is bridged on its candidate's pitch, not its clarity. */
export function gateVoicing(frames: readonly Frame[], gate: VoicingGate = VOICING): Frame[] {
  const n = frames.length;
  const levels = frames.map(f => f.rms).sort((a, b) => a - b);
  const peak = levels[n - 1] ?? 0;
  const quiet = levels[Math.floor(n * 0.1)] ?? 0;
  if (peak < gate.minDynamicRange * quiet || peak <= gate.silence) {
    return frames.map(f => (f.hz === null ? f : { ...f, hz: null }));
  }
  const floor = gate.levelShare * peak;
  const audible = (f: Frame) => f.hz !== null && f.rms >= floor;

  const voiced = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (audible(frames[i]) && frames[i].clarity >= gate.confident) voiced[i] = 1;
  }

  const continues = (from: number, to: number): boolean => {
    const f = frames[to];
    const prev = frames[from].hz;
    if (f.hz === null || prev === null || !audible(f) || f.clarity < gate.marginal) return false;
    return Math.abs(hzToSemitones(f.hz, prev)) <= gate.maxStepSt;
  };

  // A run of marginal frames that agree with one another seeds itself.
  let run = 0;
  for (let i = 0; i < n; i++) {
    const starts = audible(frames[i]) && frames[i].clarity >= gate.marginal;
    run = starts && (run === 0 || continues(i - 1, i)) ? run + 1 : starts ? 1 : 0;
    if (run >= gate.minRun) for (let k = i - run + 1; k <= i; k++) voiced[k] = 1;
  }

  // Grow every run outward in both directions, a frame at a time. A dip of
  // up to `maxGap` frames is crossed when a frame beyond it passes the gate
  // and every candidate across the dip stays on the pitch line: clarity
  // sags where a vowel changes or the voice weakens, and a run split there
  // is fragments too short to score. Noise does not land candidates on the
  // line between two voiced frames.
  const onLine = (from: number, to: number): boolean => {
    const a = frames[from].hz;
    const b = frames[to].hz;
    return a !== null && b !== null && Math.abs(hzToSemitones(b, a)) <= gate.maxStepSt;
  };
  const passes = (i: number) => audible(frames[i]) && frames[i].clarity >= gate.marginal;
  const grow = (from: number, step: 1 | -1) => {
    for (let i = from; i >= 0 && i < n; i += step) {
      const prev = i - step;
      if (prev < 0 || prev >= n || !voiced[prev] || voiced[i]) continue;
      if (continues(prev, i)) {
        voiced[i] = 1;
        continue;
      }
      for (let g = 1; g <= gate.maxGap; g++) {
        const j = i + g * step;
        if (j < 0 || j >= n || !passes(j)) continue;
        let chained = true;
        for (let k = prev; k !== j && chained; k += step) chained = onLine(k, k + step);
        if (!chained) continue;
        for (let k = i; k !== j + step; k += step) voiced[k] = 1;
        break;
      }
    }
  };
  grow(1, 1);
  grow(n - 2, -1);

  return frames.map((f, i) => (voiced[i] || f.hz === null ? f : { ...f, hz: null }));
}
