/**
 * Pitch contours as the Speaking tab compares them: the learner's against
 * the native reference's, both in semitones against each speaker's own
 * register, so a bass and a soprano share one axis.
 */

import type { ToneName } from './toneLookup';
import type { Frame } from './capture';
import { foldOctave, hzToSemitones, registerHz as registerHzOf } from './pitch';
import { dtwAlign, pauseAlign, speechBounds, SPEECH_SHARE } from './align';
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

export const syllableTone = (syllable: { ipa: string; tone?: ToneName }): ToneName =>
  syllable.tone ?? toneOf(syllable.ipa);

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

/** `unsaid`: the take ended before the syllable (see Comparison.unsaidFrom);
 *  not a fault in how it was said, so never counted as a miss. */
export type SyllableVerdict = 'good' | 'flat' | 'shape' | 'missing' | 'unsure' | 'unsaid';

export interface SyllableScore {
  /** The native syllable scored — or, when the learner ran several
   *  together, one span covering all of them with their spellings joined. */
  span: SyllableSpan;
  /** The syllables scored together with this one, when the learner ran
   *  several into one run; each entry of the group carries the same list. */
  parts?: { thai: string; tone: ToneName }[];
  verdict: SyllableVerdict;
  /** Mean semitones above (+) or below (−) the native voice on this syllable. */
  levelSt: number;
  /** Net rise (+) or fall (−) across the syllable, in semitones. */
  learnerNet: number;
  referenceNet: number;
  /** One short sentence, or '' when the syllable landed. */
  hint: string;
  /** The pitch points the verdict was reached on, in semitones from each
   *  voice's register on the native voice's clock; `…Swing` without the
   *  points in an onset slide (ONSET_MS). Absent on syllables not scored. */
  points?: { ref: TrackPoint[]; lrn: TrackPoint[]; refSwing: number[]; lrnSwing: number[] };
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
  /** The take was read in pieces and aligned on its pauses. */
  byWord: boolean;
  /** Index of the first native syllable the take never reached — it ended
   *  or was stopped before them — or null when it reached them all. */
  unsaidFrom: number | null;
}

/** Not enough voiced audio to say anything honest about. */
const MIN_VOICED_FRAMES = 8;
/** A take whose speech lasts less than this share of the native's is not a
 *  reading of the sentence — a word, a cough, a click — and is not scored;
 *  the alignment would stretch whatever it is across every slot. */
const MIN_SPEECH_SHARE = 0.3;
/* No verdict is reached on a syllable's pitch level — "too high", "too
 * low" — only on its movement. Across four native voices reading the same
 * 4,500 texts, one syllable's mean level differs between two natives by
 * 2.7–3.5 st at the 90th percentile, while in connected speech the mean
 * levels of mid, low and high syllables sit 0.1–0.7 st apart
 * (scripts/speaking-dataset/levels.py): a level check flags natives as
 * often as it catches a wrong tone. */
/** A glide the native voice makes must travel at least this far to count
 *  as shown — below it the band is hidden and the syllable not judged for
 *  movement — and before a learner can be called flat against it; asking for a third of a
 *  two-semitone drift is asking for tenths, which alignment jitter decides. */
const MIN_WANT_ST = 2.5;
/** The learner's movement on a syllable, as a share of the native voice's,
 *  under which it reads as flat. Native voices differ widely in how far
 *  they carry a glide in connected speech — one makes a third of another's
 *  on one syllable in six — so only a glide all but missing is called flat.
 *  Set, with SWING_ST, from native voices scored against each other and
 *  syllables re-pitched to a wrong tone (scripts/speaking-dataset/sweep.py):
 *  at 1/3 and 2.5 st, 15% of native syllables were flagged for 35% of the
 *  wrong ones caught; here, 9% for 25%. */
const FLAT_SHARE = 0.1;
/** A swing this much larger than the native voice's own on a syllable —
 *  on a level tone in either direction, on a contour tone against it — is
 *  the wrong tone. Measured against the native's swing, not zero: connected
 *  speech drifts on every syllable, and the native voice doing the same
 *  thing must always pass. */
const SWING_ST = 3.5;

/** The first stretch of voice after every break in voicing does not count
 *  towards a swing. Voice starting up — at the start of the take, after a
 *  pause, after the closure of a stop or the hiss of an /s/ — starts with
 *  an onset slide, five semitones over the first 80 ms being ordinary, that
 *  no listener hears as a tone, and that read as a mid syllable "falling":
 *  ดี after the /t/ of วัส, ไทย after a pause in a take read word by word.
 *  It still counts towards a glide the tone asks for: an onset cannot fake
 *  flatness, and a low tone's fall may well begin in it. */
const ONSET_MS = 80;

/** Times, on the `mapTime` timeline, of the voiced frames within ONSET_MS
 *  of voice starting up. Found frame by frame on the voice's own timeline,
 *  since a warp onto the native voice folds a learner's pause to nothing. */
function onsetTimes(frames: Frame[], mapTime: (t: number) => number): Set<number> {
  const out = new Set<number>();
  let opened = Number.NEGATIVE_INFINITY;
  let voiced = false;
  for (const f of frames) {
    if (f.hz === null) {
      voiced = false;
      continue;
    }
    if (!voiced) opened = f.t;
    voiced = true;
    if (f.t - opened < ONSET_MS) out.add(mapTime(f.t));
  }
  return out;
}

/** Fewer native points than this in a slot and its glide is not judged: a
 *  hundred milliseconds of contour shifts by a frame under any alignment
 *  jitter, and the same clip played back through the microphone path was
 *  called flat on such a slot. */
const MIN_GLIDE_POINTS = 6;

/** Learner voiced points in a slot relative to the native's, above which the
 *  slot holds a neighbour's material as well as its own. */
const SURPLUS_RATIO = 1.5;
/** A learner voiced point this close to the boundary of an empty slot means
 *  the neighbouring run starts or ends right at it — the empty syllable was
 *  spoken inside that run. */
const ABUT_MS = 45;

/** Which way each tone moves in citation form: −1 falls, +1 rises, 0 level.
 *  The native voice also drifts the other way on a syllable — a low tone
 *  climbing out of its trough toward a mid neighbour — and that drift is
 *  coarticulation, not the tone. Movement is only asked of the learner when
 *  it goes the way the tone goes. */
export const TONE_DIRECTION: Record<ToneName, -1 | 0 | 1> = {
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
 *  voiced run have no energy boundary for the alignment to find; the run
 *  lands in one slot and the other is left empty. The signature is an empty
 *  slot beside one that either holds well over its native share or whose
 *  voice starts or ends right at the shared boundary; those are scored as
 *  one and reported on each of their syllables. */
function groupSlots(spans: SyllableSpan[], ref: number[][], lrn: TrackPoint[][]): SlotGroup[] {
  const surplus = (idx: number[]) => {
    const l = idx.reduce((sum, i) => sum + lrn[i].length, 0);
    const r = idx.reduce((sum, i) => sum + ref[i].length, 0);
    return r > 0 && l / r > SURPLUS_RATIO;
  };
  const abuts = (i: number, ms: number) => lrn[i].some(p => Math.abs(p.ms - ms) <= ABUT_MS);
  const groups: SlotGroup[] = [];
  for (let k = 0; k < spans.length; k++) {
    const prev = groups[groups.length - 1];
    // A minor syllable is meant to be brief; it is never short of points.
    const brief = !spans[k].minor && lrn[k].length < 3 && ref[k].length >= 3;
    const last = prev ? prev.idx[prev.idx.length - 1] : -1;
    if (brief && prev && (surplus(prev.idx) || abuts(last, spans[k].startMs))) {
      prev.idx.push(k);
      prev.ran = true;
    } else if (brief && k + 1 < spans.length && (surplus([k + 1]) || abuts(k + 1, spans[k].endMs))) {
      groups.push({ idx: [k, k + 1], ran: true });
      k++;
    } else {
      groups.push({ idx: [k], ran: false });
    }
  }
  return groups;
}

/** How far a contour travelled down (−1) or up (+1), from the high side of
 *  its first half to the low side of its second, or the reverse. A fall
 *  that happens early and then holds is a full fall to the ear; averaged by
 *  thirds it shrinks. The sides are trimmed percentiles rather than the
 *  extremes, so a stray frame cannot make a swing. A rising tone's dip
 *  before the rise sits in the first half and does not cancel the rise. */
function travel(xs: number[], dir: -1 | 1): number {
  const pct = (ys: number[], q: number) => {
    const sorted = [...ys].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
  };
  const half = Math.max(1, xs.length >> 1);
  const a = xs.slice(0, half);
  const b = xs.slice(half);
  const high = (ys: number[]) => (ys.length >= 4 ? pct(ys, 0.85) : Math.max(...ys));
  const low = (ys: number[]) => (ys.length >= 4 ? pct(ys, 0.15) : Math.min(...ys));
  return dir < 0 ? high(a) - low(b) : high(b) - low(a);
}

/** How far a rising (+1) tone ends above its lowest point, or a falling
 *  (−1) tone below its highest. A Thai rising tone dips before it rises,
 *  and in connected speech the dip can take most of the syllable — สอง in
 *  เอาสองกิโล falls 7 st and rises 3 st in its last fifth — so travel,
 *  which compares the slot's halves, finds the second half no higher than
 *  the first and reads no rise at all. Measured into the end, not as the
 *  largest rise anywhere: a pitch that bumps up early and sinks back, as a
 *  rising tone said low does, has no rise where the tone puts it. Each
 *  point is first the median of itself and its neighbours, so a stray frame
 *  cannot make a glide. */
function turnGlide(xs: number[], dir: -1 | 1): number {
  const ys = xs.map((_, i) => {
    const w = xs.slice(Math.max(0, i - 1), i + 2).sort((a, b) => a - b);
    return w[w.length >> 1];
  });
  const end = ys[ys.length - 1];
  return dir > 0 ? end - Math.min(...ys) : Math.max(...ys) - end;
}

/** How far a syllable's end runs against a rising (+1) or falling (−1)
 *  tone: from the highest point of its second half down to its end, or
 *  from the lowest up. A rising tone said low or falling — the rise missed,
 *  the pitch sinking where it should climb — ends this way; native voices
 *  seldom do, whatever else they do with the glide. */
function endAgainst(xs: number[], dir: -1 | 1): number {
  const ys = xs.map((_, i) => {
    const w = xs.slice(Math.max(0, i - 1), i + 2).sort((a, b) => a - b);
    return w[w.length >> 1];
  });
  const tail = ys.slice(ys.length >> 1);
  const end = ys[ys.length - 1];
  return dir > 0 ? Math.max(...tail) - end : end - Math.min(...tail);
}

/** A contour tone whose end runs against it by this much more than the
 *  native voice's does is the wrong tone. Set on the speaking dataset
 *  (native voices scored against Google, and syllables re-pitched to a
 *  wrong tone): at 2 st, 3% of native rising syllables and 6% of falling
 *  ones end this way, against 21% and 26% of the wrong ones. */
const END_AGAINST_ST = 2;

/** The glide a tone asks for, measured the way that tone makes it: from the
 *  turning point for the contour tones, across the slot for the others. */
function glideOf(xs: number[], tone: ToneName, dir: -1 | 1): number {
  return tone === 'Rising' || tone === 'Falling' ? turnGlide(xs, dir) : travel(xs, dir);
}

/** How far a contour tone's glide may run into the next syllable, at most,
 *  and as a share of that syllable. Thai rising and falling tones finish
 *  late: in ไหนมา the rise of ไหน happens across the /n.m/ nasal and ends
 *  in มา's onset, so a slot cut at the consonant holds the dip without the
 *  rise. */
const SPILL_MS = 110;
const SPILL_SHARE = 0.4;
/** The last share of a slot in which a restart of the voice that carries
 *  on into the next slot is taken as the next syllable's onset. */
const ONSET_SHARE_OF_SLOT = 0.25;

/** Each syllable's pitch points, and the points its glide spills into the
 *  next syllable: that syllable's first points, taken only while the voice
 *  runs on unbroken from one into the other. A glide carries across a
 *  nasal or a vowel-to-vowel junction; it cannot carry across the silent
 *  closure of a final stop (นิด.หน่อย has one after the /t/) or a pause,
 *  and past one of those the next syllable's onset would be read as the
 *  end of this one's tone. `segments` are runs of unbroken voicing
 *  (buildSegments). */
export function spillTails(spans: SyllableSpan[], segments: TrackPoint[][]): { own: TrackPoint[][]; tails: TrackPoint[][] } {
  const segOf = new Map<TrackPoint, number>();
  segments.forEach((seg, i) => seg.forEach(p => segOf.set(p, i)));
  const points = segments.flat();
  const own = spans.map(span => points.filter(p => p.ms >= span.startMs && p.ms <= span.endMs));
  // A run of voice that starts in the last stretch of a slot and carries
  // on into the next slot is the next syllable's onset, the slot boundary
  // having landed a frame or two late: after นิด's /t/ closure the voice
  // comes back for หน่อย 20 ms before the boundary, and counted as นิด it
  // hands นิด หน่อย's fall — and, through the spill below, 100 ms more of it.
  for (let k = 0; k + 1 < spans.length; k++) {
    const span = spans[k];
    const last = own[k][own[k].length - 1];
    if (!last) continue;
    const seg = segOf.get(last);
    const run = own[k].filter(p => segOf.get(p) === seg);
    const late = span.endMs - ONSET_SHARE_OF_SLOT * (span.endMs - span.startMs);
    const carriesOn = own[k + 1].some(p => segOf.get(p) === seg);
    if (run.length < own[k].length && run[0].ms >= late && carriesOn) {
      own[k] = own[k].filter(p => segOf.get(p) !== seg);
      own[k + 1] = [...run, ...own[k + 1].filter(p => !run.includes(p))];
    }
  }
  const tails = spans.map((span, k) => {
    const next = spans[k + 1];
    const last = own[k][own[k].length - 1];
    // A minor lead-in syllable carries no glide of its own to spill.
    if (!next || !last || span.minor || TONE_DIRECTION[span.tone] === 0) return [];
    const reach = span.endMs + Math.min(SPILL_MS, SPILL_SHARE * (next.endMs - next.startMs));
    const seg = segOf.get(last);
    return points.filter(p => p.ms > span.endMs && p.ms <= reach && segOf.get(p) === seg);
  });
  return { own, tails };
}

/** The points each syllable is judged on: its own, plus its spill where
 *  `spills(k)` allows it. Points one syllable takes from the next are not
 *  judged again on the next, so a level syllable is not charged with its
 *  neighbour's rise. */
export function judgedPoints(
  { own, tails }: { own: TrackPoint[][]; tails: TrackPoint[][] },
  spills: (k: number) => boolean = () => true,
): TrackPoint[][] {
  const kept = tails.map((tail, k) => (spills(k) ? tail : []));
  return own.map((pts, k) => {
    const taken = k > 0 ? new Set(kept[k - 1]) : null;
    return [...(taken ? pts.filter(p => !taken.has(p)) : pts), ...kept[k]];
  });
}

function scoreSyllables(
  spans: SyllableSpan[],
  refSegments: TrackPoint[][],
  lrnSegments: TrackPoint[][],
  speech: number[],
  onsets: { ref: Set<number>; lrn: Set<number> },
): SyllableScore[] {
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  /** Last third against first third. */
  const net = (xs: number[]) => {
    const third = Math.max(1, Math.round(xs.length / 3));
    return mean(xs.slice(-third)) - mean(xs.slice(0, third));
  };
  const within = (points: TrackPoint[], span: { startMs: number; endMs: number }) =>
    points.filter(p => p.ms >= span.startMs && p.ms <= span.endMs);
  const refPoints = refSegments.flat();
  const lrnPoints = lrnSegments.flat();
  // A syllable the spill leaves too few points to judge, in either voice,
  // falls back to its bare slot in both: the spill is a refinement, not a
  // reason to call a syllable missing.
  //
  // A syllable spills in both voices or in neither. The native voice may
  // run on into the next syllable where the learner stops — pausing, or
  // aspirating the next consonant — and a glide measured over the native's
  // spill is one the learner's own syllable was never given room to match.
  const refSpill = spillTails(spans, refSegments);
  const lrnSpill = spillTails(spans, lrnSegments);
  const both = (k: number) => refSpill.tails[k].length > 0 && lrnSpill.tails[k].length > 0;
  const refJudged = judgedPoints(refSpill, both);
  const lrnJudged = judgedPoints(lrnSpill, both);
  const fits = spans.map((_, k) => refJudged[k].length >= 3 && lrnJudged[k].length >= 3);
  const refPts = spans.map((span, k) => (fits[k] ? refJudged[k] : within(refPoints, span)));
  const lrnPts = spans.map((span, k) => (fits[k] ? lrnJudged[k] : within(lrnPoints, span)));

  const ref = refPts.map(pts => pts.map(p => p.st));
  const refSwing = refPts.map(pts => pts.filter(p => !onsets.ref.has(p.ms)).map(p => p.st));
  const lrnSwing = lrnPts.map(pts => pts.filter(p => !onsets.lrn.has(p.ms)).map(p => p.st));
  const lrn = lrnPts.map(pts => pts.map(p => p.st));

  // One score per group, then one entry per syllable: a group's syllables
  // share its verdict, and the chips keep the native voice's split.
  return groupSlots(spans, ref, lrnPts).flatMap(({ idx, ran }) => {
    const score = scoreGroup(idx, ran);
    return idx.map((i, j) => ({ ...score, span: spans[i], hint: j === 0 ? score.hint : '' }));
  });

  function scoreGroup(idx: number[], ran: boolean): SyllableScore {
    const first = spans[idx[0]];
    const last = spans[idx[idx.length - 1]];
    const parts = idx.map(i => ({ thai: spans[i].thai, tone: spans[i].tone }));
    const span: SyllableSpan =
      idx.length === 1
        ? first
        : { ...first, thai: parts.map(p => p.thai).join(''), ipa: idx.map(i => spans[i].ipa).join('.'), endMs: last.endMs };
    const refSt = idx.flatMap(i => ref[i]);
    const lrnSt = idx.flatMap(i => lrn[i]);
    const refSw = idx.flatMap(i => refSwing[i]);
    const lrnSw = idx.flatMap(i => lrnSwing[i]);
    const same = <T,>(pick: (span: SyllableSpan) => T, fallback: T): T => {
      const values = new Set(idx.map(i => pick(spans[i])));
      return values.size === 1 ? [...values][0] : fallback;
    };
    const taught = same(sp => TONE_DIRECTION[sp.tone], 0 as -1 | 0 | 1);
    const minor = idx.every(i => spans[i].minor);
    const base = {
      span,
      ...(ran ? { parts } : {}),
      points: { ref: idx.flatMap(i => refPts[i]), lrn: idx.flatMap(i => lrnPts[i]), refSwing: refSw, lrnSwing: lrnSw },
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

    // Syllables run together whose tones move different ways have no one
    // shape to hold the run to: พูด falling into ภา mid is neither level
    // nor a fall.
    if (new Set(idx.map(i => TONE_DIRECTION[spans[i].tone])).size > 1) {
      return {
        ...base, levelSt, verdict: 'unsure' as const,
        hint: `${parts.map(p => p.thai).join(' + ')} ran together and their tones move different ways, so their shape is not judged`,
      };
    }

    // Swings are measured past the onset; glides the tone asks for, below,
    // on the whole slot.
    const swingable = lrnSw.length >= 3 && refSw.length >= 3;
    const up = swingable ? travel(lrnSw, 1) : 0;
    const down = swingable ? travel(lrnSw, -1) : 0;
    const refUp = swingable ? travel(refSw, 1) : 0;
    const refDown = swingable ? travel(refSw, -1) : 0;

    // A level tone swung well beyond what the native voice does on it is the
    // wrong tone, whatever the average level: a mid syllable said falling.
    if (taught === 0 && Math.max(up - refUp, down - refDown) >= SWING_ST) {
      const way = down - refDown > up - refUp ? 'falls' : 'rises';
      return {
        ...base, levelSt, verdict: 'shape' as const,
        hint: `${span.thai} is a mid tone and stays level; yours ${way} about ${Math.max(up, down).toFixed(0)} st${cue(span)}`,
      };
    }
    if (taught !== 0) {
      const against = swingable ? travel(lrnSw, taught < 0 ? 1 : -1) : 0;
      const refAgainst = swingable ? travel(refSw, taught < 0 ? 1 : -1) : 0;
      const way = taught < 0 ? 'down' : 'up';
      const tone = same(sp => sp.tone, first.tone);
      if ((tone === 'Rising' || tone === 'Falling') && lrnSt.length >= 4 && refSt.length >= 4) {
        const late = endAgainst(lrnSt, taught);
        if (late - endAgainst(refSt, taught) >= END_AGAINST_ST) {
          return {
            ...base, levelSt, verdict: 'shape' as const,
            hint: `${span.thai} is a ${tone.toLowerCase()} tone and ends going ${way}; yours ${taught > 0 ? 'falls' : 'rises'} about ${late.toFixed(0)} st at the end${cue(span)}`,
          };
        }
      }
      const withIt = glideOf(lrnSt, tone, taught);
      if (against - refAgainst >= SWING_ST && against > withIt) {
        return {
          ...base, levelSt, verdict: 'shape' as const,
          hint: `${span.thai} goes ${way}; yours goes the other way by about ${against.toFixed(0)} st${cue(span)}`,
        };
      }
      const want = refSt.length >= MIN_GLIDE_POINTS ? glideOf(refSt, tone, taught) : 0;
      if (want >= MIN_WANT_ST) {
        if (withIt < FLAT_SHARE * want) {
          return {
            ...base, levelSt, verdict: 'flat' as const,
            hint: `the native pitch slides ${way} about ${want.toFixed(0)} st across ${span.thai}; yours moved ${withIt.toFixed(1)} st${cue(span)}`,
          };
        }
      } else if (span.tone === 'Falling' || span.tone === 'Rising') {
        // A contour tone the native voice does not itself glide on here
        // cannot be judged from this clip; saying so beats a green tick.
        return {
          ...base, levelSt, verdict: 'unsure' as const,
          hint: `the native voice does not glide ${way} on ${span.thai} in this clip, so your ${span.tone.toLowerCase()} tone there is not judged`,
        };
      }
    }
    return { ...base, levelSt, verdict: 'good' as const, hint: '' };
  }
}

/** Indices of native syllables on which the native voice does not make its
 *  tone's glide — a rising tone realised as a fall, a falling tone whose
 *  drop lands in a glottal stop after a high onset. Connected speech does
 *  this often, and the read-out names those syllables so the learner
 *  knows why the line does not follow the tone glyph there. */
export function textbookMismatches(reference: Frame[], syllables: SyllableSpan[]): number[] {
  const judged = judgedPoints(spillTails(syllables, buildSegments(reference, registerHz(reference))));
  return syllables.flatMap((span, i) => {
    const taught = TONE_DIRECTION[span.tone];
    if (taught === 0) return [];
    const st = judged[i].map(p => p.st);
    if (st.length < 3) return [];
    return glideOf(st, span.tone, taught) < MIN_WANT_ST ? [i] : [];
  });
}

function speechSpanMs(frames: Frame[]): number {
  const bounds = speechBounds(frames);
  return bounds ? frames[bounds[1]].t - frames[bounds[0]].t : 0;
}

export function compareToReference(
  reference: Frame[],
  learner: Frame[],
  syllables?: SyllableSpan[] | null,
): Comparison | null {
  const rv = reference.filter(f => f.hz !== null);
  const lv = learner.filter(f => f.hz !== null);
  if (rv.length < MIN_VOICED_FRAMES || lv.length < MIN_VOICED_FRAMES) return null;
  if (speechSpanMs(learner) < MIN_SPEECH_SHARE * speechSpanMs(reference)) return null;

  const referenceHz = registerHz(reference);
  const learnerHz = registerHz(learner);
  const r0 = rv[0].t;
  const r1 = rv[rv.length - 1].t;
  const l0 = lv[0].t;
  const l1 = lv[lv.length - 1].t;
  // A take read in pieces is anchored on its pauses first; otherwise time
  // warping, with a uniform stretch only as the fallback — one lingered
  // vowel under a stretch pushes every later syllable into its
  // neighbour's slot.
  const byWord =
    syllables && syllables.length > 1 ? pauseAlign(reference, learner, syllables, syllables[syllables.length - 1].endMs) : null;
  const warp = byWord ?? dtwAlign(reference, learner);
  const scale = (r1 - r0) / Math.max(1, l1 - l0);
  const mapTime = warp ? warp.mapTime : (t: number) => r0 + (t - l0) * scale;
  const inverseTime = warp ? warp.inverse : (t: number) => l0 + (t - r0) / scale;

  const referenceSegments = buildSegments(reference, referenceHz);
  const learnerSegments = buildSegments(learner, learnerHz, mapTime);
  const unsaidFrom = byWord && syllables && byWord.said < syllables.length ? byWord.said : null;
  const said = syllables ? syllables.slice(0, unsaidFrom ?? syllables.length) : [];

  return {
    byWord: !!byWord,
    unsaidFrom,
    syllables: said.length
      ? [
          ...scoreSyllables(
            said,
            referenceSegments,
            learnerSegments,
            speechInSlots(said, reference, learner, mapTime),
            { ref: onsetTimes(reference, t => t), lrn: onsetTimes(learner, mapTime) },
          ),
          // Not reached: scored apart, so none is run together with the
          // last syllable said.
          ...(syllables ?? []).slice(said.length).map(span => ({
            span,
            verdict: 'unsaid' as const,
            levelSt: 0,
            learnerNet: 0,
            referenceNet: 0,
            hint: '',
          })),
        ]
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
