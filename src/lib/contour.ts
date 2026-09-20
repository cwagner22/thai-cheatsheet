/**
 * Pitch contours as the Speaking tab compares them: the learner's against
 * the native reference's, both in semitones against each speaker's own
 * register, so a bass and a soprano share one axis.
 */

import type { ToneName } from './toneLookup';
import type { Frame } from './capture';
import { foldOctave, hzToSemitones, registerHz as registerHzOf } from './pitch';
import { dtwAlign, SPEECH_SHARE } from './align';
import type { SyllableSpan } from './segment';
import { TONE_FEEL } from '../data/tones';

/** Keyed by combining diacritic; the IPA is decomposed first because some
 *  vowels have a precomposed form (à) and some do not (ɯ̌). */
const TONE_BY_DIACRITIC: Record<string, ToneName> = {
  '̀': 'Low',
  '́': 'High',
  '̂': 'Falling',
  '̌': 'Rising',
};

export function toneOf(ipa: string): ToneName {
  for (const ch of ipa.normalize('NFD')) {
    const tone = TONE_BY_DIACRITIC[ch];
    if (tone) return tone;
  }
  return 'Mid';
}

export interface TrackPoint {
  ms: number;
  st: number;
}

/** Voiced runs shorter than this are the click of an onset or the creak of a
 *  release, not a syllable. Three frames is 64 ms — the gate's own minimum
 *  for a self-standing run, and longer than any click. */
const MIN_SEGMENT_FRAMES = 3;

/** A voice cannot move this far between neighbouring frames; a step this
 *  size is an octave error, and the line is broken there rather than drawn
 *  as a wall across the panel. */
const MAX_JUMP_ST = 4;

/** The speaker's own register, from the voiced frames of a track. */
export function registerHz(frames: Frame[]): number {
  return registerHzOf(frames.flatMap(f => (f.hz === null ? [] : [f.hz])));
}

/** One run per voiced stretch, so the line breaks where the voice stopped
 *  instead of bridging a pause. */
export function buildSegments(
  frames: Frame[],
  refHz: number,
  mapTime: (t: number) => number = t => t,
): TrackPoint[][] {
  const runs: TrackPoint[][] = [];
  let current: TrackPoint[] = [];
  for (const frame of frames) {
    if (frame.hz === null) {
      runs.push(current);
      current = [];
      continue;
    }
    current.push({ ms: mapTime(frame.t), st: hzToSemitones(foldOctave(frame.hz, refHz), refHz) });
  }
  runs.push(current);
  return runs.map(smooth).flatMap(splitOnJumps).filter(run => run.length >= MIN_SEGMENT_FRAMES);
}

/** Five-point median: octave errors come in twos and threes, which a
 *  three-point window passes through. */
function smooth(segment: TrackPoint[]): TrackPoint[] {
  if (segment.length < 5) return segment;
  return segment.map((point, i) => {
    if (i < 2 || i > segment.length - 3) return point;
    const window = [
      segment[i - 2].st, segment[i - 1].st, point.st, segment[i + 1].st, segment[i + 2].st,
    ].sort((a, b) => a - b);
    return { ms: point.ms, st: window[2] };
  });
}

function splitOnJumps(segment: TrackPoint[]): TrackPoint[][] {
  const out: TrackPoint[][] = [];
  let current: TrackPoint[] = [];
  for (const point of segment) {
    const previous = current[current.length - 1];
    if (previous && Math.abs(point.st - previous.st) > MAX_JUMP_ST) {
      out.push(current);
      current = [];
    }
    current.push(point);
  }
  out.push(current);
  return out;
}

export type SyllableVerdict = 'good' | 'high' | 'low' | 'flat' | 'shape' | 'missing';

export interface SyllableScore {
  /** The native syllable scored — or, when the learner ran several
   *  together, one span covering all of them with their spellings joined. */
  span: SyllableSpan;
  /** The syllables `span` covers, when there is more than one, each with
   *  its own tone — a merged chip still colours every syllable by its own
   *  tone, not by the first one's. */
  parts?: { thai: string; tone: ToneName }[];
  verdict: SyllableVerdict;
  /** Mean semitones above (+) or below (−) the native voice on this syllable. */
  levelSt: number;
  /** Net rise (+) or fall (−) across the syllable, in semitones. */
  learnerNet: number;
  referenceNet: number;
  /** One short sentence, or '' when the syllable landed. */
  hint: string;
}

export interface Comparison {
  /** Per native syllable, when the reference could be segmented. */
  syllables: SyllableScore[];
  /** Both voices laid on the reference's timeline. */
  referenceSegments: TrackPoint[][];
  learnerSegments: TrackPoint[][];
  /** Learner capture time → reference time. */
  mapTime: (t: number) => number;
  /** Reference time → learner capture time. */
  inverseTime: (t: number) => number;
  /** The learner's pitch on the learner's own timeline, unwarped. */
  learnerSegmentsRaw: TrackPoint[][];
  /** First to last frame carrying speech energy. Energy rather than voicing,
   *  so a final syllable the pitch tracker lost still counts. */
  learnerMs: number;
  referenceMs: number;
  learnerHz: number;
  referenceHz: number;
  /** Loudest frame of the take. */
  learnerPeakRms: number;
}

/** Not enough voiced audio to say anything honest about. */
const MIN_VOICED_FRAMES = 8;
/** Within this the learner sits at the native voice's level on a syllable. */
const LEVEL_TOL_ST = 1.7;
/** Below this the native voice is not really moving on a syllable, and no
 *  movement is asked of the learner either. */
const MOVING_ST = 1.2;
/** The learner's movement on a syllable, as a share of the native voice's,
 *  under which it reads as flat. The synthetic voice swings wide at the
 *  start of a sentence; a learner who makes a third of that has audibly
 *  made the tone. */
const FLAT_SHARE = 1 / 3;
/** Learner voiced points in a slot relative to the native's, above which the
 *  slot holds a neighbour's material as well as its own. */
const SURPLUS_RATIO = 1.5;

/** Which way each tone moves in citation form: −1 falls, +1 rises, 0 level.
 *  The native voice also drifts the other way on a syllable — a low tone
 *  climbing out of its trough toward a mid neighbour — and that drift is
 *  coarticulation, not the tone. Movement is only asked of the learner when
 *  it goes the way the tone goes. */
const TONE_DIRECTION: Record<ToneName, -1 | 0 | 1> = {
  Mid: 0,
  Low: -1,
  Falling: -1,
  High: 1,
  Rising: 1,
};

/** The side of the native voice a tone may sit on without fault: lower on a
 *  tone that is or ends low, higher on one that is or ends high, is the tone
 *  done more clearly. Only the wrong side is reported. The synthetic voice
 *  often cuts a falling tone on a stopped syllable into creak at the top,
 *  so its measurable part is the high onset alone; a learner lower than
 *  that is not wrong. */
const TONE_SIDE: Record<ToneName, -1 | 0 | 1> = {
  Mid: 0,
  Low: -1,
  Falling: -1,
  High: 1,
  Rising: 1,
};

/** A hint ends with the tone's throat cue: something to do, not only what
 *  was measured. */
const cue = (span: SyllableSpan) => (TONE_FEEL[span.tone] ? ` · ${span.tone.toLowerCase()} tone: ${TONE_FEEL[span.tone]}` : '');

/** Learner speech frames landing in each slot, relative to the native
 *  slot's. Separates a slot with sound in it that was too brief to read
 *  from a slot with nothing in it at all. It cannot tell a skipped syllable
 *  from a stretched neighbour: the warp pins both ends, so the syllable
 *  before an unsaid one is stretched across the empty slot. */
function speechInSlots(
  spans: SyllableSpan[],
  reference: Frame[],
  learner: Frame[],
  mapTime: (t: number) => number,
): number[] {
  const lrnPeak = Math.max(...learner.map(f => f.rms)) || 1;
  const landed = learner.filter(f => f.rms >= SPEECH_SHARE * lrnPeak).map(f => mapTime(f.t));
  const refPeak = Math.max(...reference.map(f => f.rms)) || 1;
  return spans.map(span => {
    const native = reference.filter(f => f.rms >= SPEECH_SHARE * refPeak && f.t >= span.startMs && f.t <= span.endMs).length;
    const mine = landed.filter(ms => ms >= span.startMs && ms <= span.endMs).length;
    return native ? mine / native : 1;
  });
}

interface SlotGroup {
  idx: number[];
  /** The learner ran these together and the alignment could not separate
   *  them; the read-out says so. */
  ran: boolean;
}

/** Which native slots are scored together. Two syllables spoken as one
 *  voiced run have no energy boundary for the alignment to find, and the
 *  native's quiet second syllable gets matched to the learner's next pause
 *  instead. The signature is a slot with too few learner points beside one
 *  holding well over its native share; those are scored as one. */
function groupSlots(spans: SyllableSpan[], ref: number[][], lrn: number[][]): SlotGroup[] {
  const surplus = (idx: number[]) => {
    const l = idx.reduce((sum, i) => sum + lrn[i].length, 0);
    const r = idx.reduce((sum, i) => sum + ref[i].length, 0);
    return r > 0 && l / r > SURPLUS_RATIO;
  };
  const groups: SlotGroup[] = [];
  for (let k = 0; k < spans.length; k++) {
    const prev = groups[groups.length - 1];
    // A minor syllable is meant to be brief; it is never short of points.
    const brief = !spans[k].minor && lrn[k].length < 3 && ref[k].length >= 3;
    if (brief && prev && surplus(prev.idx)) {
      prev.idx.push(k);
      prev.ran = true;
    } else if (brief && k + 1 < spans.length && surplus([k + 1])) {
      groups.push({ idx: [k, k + 1], ran: true });
      k++;
    } else {
      groups.push({ idx: [k], ran: false });
    }
  }
  return groups;
}

function scoreSyllables(
  spans: SyllableSpan[],
  refPoints: TrackPoint[],
  lrnPoints: TrackPoint[],
  speech: number[],
): SyllableScore[] {
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  /** Last third against first third. */
  const net = (xs: number[]) => {
    const third = Math.max(1, Math.round(xs.length / 3));
    return mean(xs.slice(-third)) - mean(xs.slice(0, third));
  };
  /** How far the pitch travelled down (−1) or up (+1) across the syllable,
   *  peak of one half to trough of the other. A fall that happens early and
   *  then holds is a full fall to the ear; averaged by thirds it shrinks. */
  const travel = (xs: number[], dir: -1 | 1) => {
    const half = Math.max(1, xs.length >> 1);
    const a = xs.slice(0, half);
    const b = xs.slice(half);
    return dir < 0 ? Math.max(...a) - Math.min(...b) : Math.max(...b) - Math.min(...a);
  };
  const within = (points: TrackPoint[], span: SyllableSpan) =>
    points.filter(p => p.ms >= span.startMs && p.ms <= span.endMs).map(p => p.st);

  const ref = spans.map(span => within(refPoints, span));
  const lrn = spans.map(span => within(lrnPoints, span));

  return groupSlots(spans, ref, lrn).map(({ idx, ran }) => {
    const first = spans[idx[0]];
    const last = spans[idx[idx.length - 1]];
    const parts = idx.map(i => ({ thai: spans[i].thai, tone: spans[i].tone }));
    const span: SyllableSpan =
      idx.length === 1
        ? first
        : { ...first, thai: parts.map(p => p.thai).join(''), ipa: idx.map(i => spans[i].ipa).join('.'), endMs: last.endMs };
    const refSt = idx.flatMap(i => ref[i]);
    const lrnSt = idx.flatMap(i => lrn[i]);
    const same = <T,>(pick: (span: SyllableSpan) => T, fallback: T): T => {
      const values = new Set(idx.map(i => pick(spans[i])));
      return values.size === 1 ? [...values][0] : fallback;
    };
    const taught = same(sp => TONE_DIRECTION[sp.tone], 0 as -1 | 0 | 1);
    const side = same(sp => TONE_SIDE[sp.tone], 0 as -1 | 0 | 1);
    const minor = idx.every(i => spans[i].minor);
    const base = {
      span,
      ...(ran ? { parts } : {}),
      learnerNet: lrnSt.length >= 3 ? net(lrnSt) : 0,
      referenceNet: refSt.length >= 3 ? net(refSt) : 0,
    };

    // A minor syllable carries no tone anyone hears; present is enough, and
    // holding it longer is never asked.
    if (minor) {
      return lrnSt.length > 0 || speech[idx[0]] >= 0.15
        ? { ...base, verdict: 'good' as const, levelSt: 0, hint: '' }
        : {
            ...base, verdict: 'missing' as const, levelSt: 0,
            hint: `nothing landed on ${span.thai} — a light /${span.ipa}/ ahead of the next syllable is all it takes; it is meant to be short`,
          };
    }

    if (lrnSt.length < 3 || refSt.length < 3) {
      const nativeMs = Math.round(span.endMs - span.startMs);
      const hint =
        speech[idx[0]] < 0.15
          ? `nothing landed on ${span.thai} — was it said, or run into the syllable before it?`
          : `${span.thai} was too brief to read a tone — the native voice holds it for about ${nativeMs} ms`;
      return { ...base, verdict: 'missing' as const, levelSt: 0, hint };
    }

    const levelSt = mean(lrnSt) - mean(refSt);
    if (Math.abs(levelSt) > LEVEL_TOL_ST && Math.sign(levelSt) !== side) {
      const above = levelSt > 0;
      return {
        ...base, levelSt, verdict: above ? ('high' as const) : ('low' as const),
        hint: `your pitch on ${span.thai} sits about ${Math.abs(levelSt).toFixed(1)} st ${above ? 'higher' : 'lower'} than the native voice — ${above ? 'start it lower' : 'bring it up'}${cue(span)}`,
      };
    }

    const { referenceNet } = base;
    if (taught !== 0 && Math.sign(referenceNet) === taught && Math.abs(referenceNet) >= MOVING_ST) {
      const want = travel(refSt, taught);
      const got = travel(lrnSt, taught);
      const against = travel(lrnSt, taught < 0 ? 1 : -1);
      const way = taught < 0 ? 'down' : 'up';
      if (against > got && against >= 0.6) {
        return {
          ...base, levelSt, verdict: 'shape' as const,
          hint: `the native pitch slides ${way} across ${span.thai}; yours goes the other way${cue(span)}`,
        };
      }
      if (got < FLAT_SHARE * want) {
        return {
          ...base, levelSt, verdict: 'flat' as const,
          hint: `the native pitch slides ${way} about ${want.toFixed(0)} st across ${span.thai}; yours moved ${got.toFixed(1)} st${cue(span)}`,
        };
      }
    }
    return { ...base, levelSt, verdict: 'good' as const, hint: '' };
  });
}

/** Native syllables on which the native voice moves against its own tone's
 *  direction — a rising tone realised as a fall, a falling tone whose drop
 *  lands in creak after a rising onset. Connected speech does this often,
 *  and on those syllables the textbook band and the native line disagree
 *  on screen; the read-out names them so the learner knows which to follow. */
export function textbookMismatches(reference: Frame[], syllables: SyllableSpan[]): string[] {
  const points = buildSegments(reference, registerHz(reference)).flat();
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return syllables
    .filter(span => {
      const taught = TONE_DIRECTION[span.tone];
      if (taught === 0) return false;
      const st = points.filter(p => p.ms >= span.startMs && p.ms <= span.endMs).map(p => p.st);
      if (st.length < 3) return false;
      const third = Math.max(1, Math.round(st.length / 3));
      const net = mean(st.slice(-third)) - mean(st.slice(0, third));
      return Math.abs(net) >= MOVING_ST && Math.sign(net) !== taught;
    })
    .map(span => span.thai);
}

/** First to last frame at least SPEECH_SHARE of the take's loudest. */
function speechSpanMs(frames: Frame[]): number {
  const peak = Math.max(...frames.map(f => f.rms)) || 1;
  let a = 0;
  while (a < frames.length && frames[a].rms < SPEECH_SHARE * peak) a++;
  let b = frames.length - 1;
  while (b > a && frames[b].rms < SPEECH_SHARE * peak) b--;
  return b > a ? frames[b].t - frames[a].t : 0;
}

export function compareToReference(
  reference: Frame[],
  learner: Frame[],
  syllables?: SyllableSpan[] | null,
): Comparison | null {
  const rv = reference.filter(f => f.hz !== null);
  const lv = learner.filter(f => f.hz !== null);
  if (rv.length < MIN_VOICED_FRAMES || lv.length < MIN_VOICED_FRAMES) return null;

  const referenceHz = registerHz(reference);
  const learnerHz = registerHz(learner);
  const r0 = rv[0].t;
  const r1 = rv[rv.length - 1].t;
  const l0 = lv[0].t;
  const l1 = lv[lv.length - 1].t;
  // A uniform stretch is only the fallback: one lingered vowel under it
  // pushes every later syllable into its neighbour's slot.
  const warp = dtwAlign(reference, learner);
  const scale = (r1 - r0) / Math.max(1, l1 - l0);
  const mapTime = warp ? warp.mapTime : (t: number) => r0 + (t - l0) * scale;
  const inverseTime = warp ? warp.inverse : (t: number) => l0 + (t - r0) / scale;

  const referenceSegments = buildSegments(reference, referenceHz);
  const learnerSegments = buildSegments(learner, learnerHz, mapTime);
  const refPoints = referenceSegments.flat();
  const lrnPoints = learnerSegments.flat();

  return {
    syllables:
      syllables && syllables.length
        ? scoreSyllables(syllables, refPoints, lrnPoints, speechInSlots(syllables, reference, learner, mapTime))
        : [],
    referenceSegments,
    learnerSegments,
    learnerSegmentsRaw: buildSegments(learner, learnerHz),
    mapTime,
    inverseTime,
    learnerMs: speechSpanMs(learner),
    referenceMs: speechSpanMs(reference),
    learnerHz,
    referenceHz,
    learnerPeakRms: Math.max(...learner.map(f => f.rms)),
  };
}
