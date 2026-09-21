/**
 * Runs the Speaking tab's pipeline on a native clip and a take, both as
 * 48 kHz mono 16-bit wav, and prints what the tab would: the native slots,
 * the per-syllable verdicts, where the take's frames landed, and how much
 * the alignment stretched each slot.
 *
 *   pnpm dlx tsx scripts/speaking-harness/harness.ts <phrase id> <native.wav> <take.wav>
 *
 * A take saved from the tab is webm; `ffmpeg -i take.webm -ac 1 -ar 48000 take.wav`.
 * QUIET=1 skips the per-frame pitch dump.
 */
import { foldOctave, hzToSemitones, registerHz } from '../../src/lib/pitch';
import type { Frame } from '../../src/lib/capture';
import { segmentReference, syllableSpecs } from '../../src/lib/segment';
import { compareToReference, buildSegments, textbookMismatches } from '../../src/lib/contour';
import { PHRASE_GROUPS } from '../../src/data/phrases';
import { capture } from './cap';

const QUIET = !!process.env.QUIET;

const phraseId = process.argv[2] ?? 'ranthiraokin';
const nativePath = process.argv[3] ?? 'native.wav';
const takePath = process.argv[4] ?? 'take.wav';
const phrase = PHRASE_GROUPS.flatMap(g => g.phrases).find(p => p.id === phraseId)!;

const ref = capture(nativePath);
const lrn = capture(takePath);
const refHz = registerHz(ref.flatMap(f => (f.hz === null ? [] : [f.hz])));
const lrnHz = registerHz(lrn.flatMap(f => (f.hz === null ? [] : [f.hz])));
console.log(`native register ${refHz.toFixed(1)} Hz, take register ${lrnHz.toFixed(1)} Hz`);

const st = (f: Frame, reg: number) => (f.hz === null ? null : hzToSemitones(foldOctave(f.hz, reg), reg));
const line = (frames: Frame[], reg: number) =>
  frames.map(f => `${(f.t / 1000).toFixed(2)}:${st(f, reg) === null ? '-' : (st(f, reg) as number).toFixed(1)}`).join(' ');
if (!QUIET) { console.log('\nNATIVE st per frame (app tracker):\n' + line(ref, refHz)); console.log('\nTAKE st per frame (app tracker):\n' + line(lrn, lrnHz)); }

const spans = segmentReference(ref, syllableSpecs(phrase));
if (!spans) throw new Error('could not segment');
const refPts = buildSegments(ref, refHz).flat();
console.log('\nNATIVE syllable slots:');
for (const sp of spans) {
  const xs = refPts.filter(p => p.ms >= sp.startMs && p.ms <= sp.endMs).map(p => p.st);
  const mean = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
  const third = Math.max(1, Math.round(xs.length / 3));
  const net = xs.length >= 3 ? xs.slice(-third).reduce((a, b) => a + b, 0) / third - xs.slice(0, third).reduce((a, b) => a + b, 0) / third : NaN;
  console.log(
    `  ${sp.thai.padEnd(6)} ${sp.tone.padEnd(7)} ${(sp.startMs / 1000).toFixed(2)}–${(sp.endMs / 1000).toFixed(2)}s  n=${xs.length} mean=${mean.toFixed(1)} net=${net.toFixed(1)}  [${xs.map(x => x.toFixed(1)).join(' ')}]`,
  );
}
console.log('textbook mismatches:', textbookMismatches(ref, spans).map(i => spans[i].thai).join(' '));

const cmp = compareToReference(ref, lrn, spans);
if (!cmp) throw new Error('no comparison');
console.log('\nSCORES:');
for (const s of cmp.syllables) {
  console.log(`  ${s.span.thai.padEnd(8)} ${s.span.tone.padEnd(7)} ${s.verdict.padEnd(8)} level=${s.levelSt.toFixed(1)} lrnNet=${s.learnerNet.toFixed(1)} refNet=${s.referenceNet.toFixed(1)} ${s.hint}`);
}
const lrnPts = cmp.learnerSegments.flat();
console.log('\nLEARNER points per native slot (warped onto native time):');
for (const sp of spans) {
  const xs = lrnPts.filter(p => p.ms >= sp.startMs && p.ms <= sp.endMs);
  console.log(
    `  ${sp.thai.padEnd(6)} n=${xs.length} learner-time ${xs.length ? (cmp.inverseTime(xs[0].ms) / 1000).toFixed(2) + '–' + (cmp.inverseTime(xs[xs.length - 1].ms) / 1000).toFixed(2) : '-'}  st=[${xs.map(p => p.st.toFixed(1)).join(' ')}]`,
  );
}

console.log('\nWARP: learner slot length / native slot length, and learner span per native slot');
for (const sp of spans) {
  const a = cmp.inverseTime(sp.startMs);
  const b = cmp.inverseTime(sp.endMs);
  console.log(`  ${sp.thai.padEnd(6)} native ${((sp.endMs - sp.startMs) / 1000).toFixed(2)}s → learner ${(a / 1000).toFixed(2)}–${(b / 1000).toFixed(2)} (×${((b - a) / (sp.endMs - sp.startMs)).toFixed(2)})`);
}
