/**
 * The citation-form tone shapes, taken from the Tones tab's cards so the two
 * tabs teach one curve. An optional overlay, not the target: connected
 * speech departs from them by several semitones.
 */

import { THAI_TONES } from '../data/tones';
import type { ToneName } from './toneLookup';

/** Chao's five pitch levels, spread over this many semitones each, so the
 *  whole tone space spans about nine semitones around the register. */
const SEMITONES_PER_LEVEL = 2.2;

const CHAO_BY_TONE = Object.fromEntries(
  THAI_TONES.map(t => [t.nameEn as ToneName, [...t.chao].map(Number)]),
) as Record<ToneName, number[]>;

/** Semitones relative to the speaker's register, evenly spaced across the
 *  syllable. */
export function textbookContour(tone: ToneName): number[] {
  return CHAO_BY_TONE[tone].map(level => (level - 3) * SEMITONES_PER_LEVEL);
}

/** The contour's height at `pos` running 0..1 across the syllable. */
export function contourAt(contour: number[], pos: number): number {
  if (contour.length === 1) return contour[0];
  const scaled = Math.min(Math.max(pos, 0), 1) * (contour.length - 1);
  const i = Math.min(Math.floor(scaled), contour.length - 2);
  return contour[i] + (contour[i + 1] - contour[i]) * (scaled - i);
}
