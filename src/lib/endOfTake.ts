/**
 * When a take is over: the rule both Speaking pages use to close the
 * microphone by themselves once the learner has finished the sentence.
 */

import { PAUSE_MS } from './align';
import type { Frame } from './capture';

/** A take may overrun the time axis while the learner is still making
 *  sound, so the final word is not cut off; capped so a noisy room cannot
 *  keep the microphone open. */
export const OVERRUN_LIMIT = 2.5;
/** Silence this long after the native length ends a take said in one go;
 *  the 2.5x cap above is what stops a noisy room keeping the microphone
 *  open. */
const TRAILING_SILENCE_MS = 600;
/** A learner reading word by word pauses between words for half a second
 *  or more, so once a take holds pauses (PAUSE_MS or longer, between two
 *  voiced frames) it ends only after this much silence, or one and a half
 *  times the longest pause so far if that is longer. */
const PAUSED_SILENCE_MS = 1500;

/** The longest gap between two voiced frames of a capture, in ms. */
function longestPause(frames: Frame[]): number {
  let longest = 0;
  let lastVoiced: number | null = null;
  for (const f of frames) {
    if (f.hz === null) continue;
    if (lastVoiced !== null) longest = Math.max(longest, f.t - lastVoiced);
    lastVoiced = f.t;
  }
  return longest;
}

/** Whether a take `elapsedMs` long, on a time axis `windowMs` wide (the
 *  native length plus headroom), is finished: past the axis and silent for
 *  long enough, or past OVERRUN_LIMIT times the axis whatever the sound. */
export function takeFinished(elapsedMs: number, frames: Frame[], windowMs: number): boolean {
  if (elapsedMs < windowMs) return false;
  const pause = longestPause(frames);
  const silence = pause >= PAUSE_MS ? Math.max(PAUSED_SILENCE_MS, 1.5 * pause) : TRAILING_SILENCE_MS;
  const stillSpeaking = frames.some(f => f.hz !== null && f.t > elapsedMs - silence);
  return !stillSpeaking || elapsedMs >= windowMs * OVERRUN_LIMIT;
}
