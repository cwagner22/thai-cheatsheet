import { useEffect, useRef, type ReactNode } from 'react';
import { SPEC_MAX_HZ, type SpectrumColumn } from '../lib/capture';
import type { TrackPoint } from '../lib/contour';
import type { SyllableSpan } from '../lib/segment';
import { contourAt, textbookContour } from '../lib/textbook';
import { TONE_COLOR } from '../data/tones';
import styles from './PhraseScope.module.css';

export interface ScopeData {
  /** Full width of the time axis. */
  windowMs: number;
  /** Time at the left edge, so a finished take can be fitted to the panel
   *  on its own timing. */
  originMs?: number;
  spectra: SpectrumColumn[];
  /** This voice's own pitch, in semitones against its own register. */
  segments: TrackPoint[][];
  /** Another voice's pitch on the same axis, drawn behind this one. */
  ghost: TrackPoint[][] | null;
  /** Position of the playhead while a capture is running; null when not. */
  elapsedMs: number | null;
  /** The reference visualiser's sensitivity gain: byte values are multiplied
   *  by this before the colour ramp. */
  gain: number;
  label: string;
  emptyText: string;
  /** Syllable slots on this axis, from the native recording. */
  syllables?: SyllableSpan[] | null;
  /** Draw the citation-form tone shape over each syllable slot. */
  showTextbook?: boolean;
}

/** The visible pitch range. The native voice spans roughly −7..+4 st around
 *  its register; this leaves room either side for a learner who is off. */
const ST_MIN = -10;
const ST_MAX = 10;

const PAD_L = 36;
/** Wider than the left: the right edge carries the pitch scale, a second
 *  axis over the same plot. */
const PAD_R = 34;
const PAD_T = 10;
const PAD_B = 10;

/** The pitch scale is inset from the top and bottom of the plot so a contour
 *  at the edge of a speaker's range still has somewhere to be drawn. */
const PITCH_INSET = 0.09;

const FAINT = 'rgba(226, 232, 240, 0.16)';
/** Half-height of a textbook band, in semitones. */
const BAND_HALF_ST = 1.7;
const OWN_LINE = '#ffffff';
const GHOST_LINE = 'rgba(251, 191, 36, 0.95)';

/**
 * The colour ramp of the reference visualiser
 * (thai_phonetic_spectrogram_pitch_visualizer.html). The banding at the
 * quarter points is the ramp's shape; smoothing it changes the look.
 */
function getInfernoColor(val: number): string {
  // val is 0..255
  const norm = val / 255;
  let r: number, g: number, b: number;

  if (norm < 0.25) {
    r = Math.floor(norm * 4 * 120);
    g = 0;
    b = Math.floor(norm * 4 * 180);
  } else if (norm < 0.5) {
    r = Math.floor(120 + (norm - 0.25) * 4 * 135);
    g = Math.floor((norm - 0.25) * 4 * 80);
    b = Math.floor(180 - (norm - 0.25) * 4 * 180);
  } else if (norm < 0.75) {
    r = 255;
    g = Math.floor(80 + (norm - 0.5) * 4 * 120);
    b = 0;
  } else {
    r = 255;
    g = Math.floor(200 + (norm - 0.75) * 4 * 55);
    b = Math.floor((norm - 0.75) * 4 * 255);
  }
  return `rgb(${r},${g},${b})`;
}

/** Looked up once per bin per column, so the ramp is evaluated once up front
 *  rather than several hundred thousand times a second. */
const INFERNO = Array.from({ length: 256 }, (_, i) => getInfernoColor(i));

/**
 * One voice on one panel: its spectrogram filling the plot, its pitch drawn
 * over it on a right-hand semitone axis — on the frequency axis every F0
 * would sit in the bottom few percent, unreadable. Praat's arrangement.
 *
 * Data arrives through a ref and the canvas redraws from a frame loop while
 * `live` is set, so a running capture never re-renders React.
 */
export function PhraseScope({
  data,
  live,
  revision,
  height = 300,
  tools,
}: {
  data: { current: ScopeData };
  live: boolean;
  /** Bumped by the caller when the data changed while not live. */
  revision: number;
  height?: number;
  /** Controls for this voice, shown in the panel's top-right corner. */
  tools?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const specRef = useRef<HTMLCanvasElement | null>(null);
  /** Columns already painted into the offscreen spectrogram and the array
   *  they came from; a different array means a different take. */
  const paintedRef = useRef<PaintState>({ source: null, count: 0, gain: 0, windowMs: 0, originMs: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frame = 0;
    const render = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = parent.clientWidth;
      const cssHeight = height;
      if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        // The offscreen spectrogram is sized in the same pixels, so a resize
        // invalidates everything painted into it.
        paintedRef.current = { source: null, count: 0, gain: 0, windowMs: 0, originMs: 0 };
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, cssWidth, cssHeight, data.current, specRef, paintedRef);
    };

    render();
    if (!live) return;
    const loop = () => {
      render();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [data, live, revision, height]);

  return (
    <div className={styles.scope}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {tools && <div className={styles.tools}>{tools}</div>}
    </div>
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ScopeData,
  specRef: { current: HTMLCanvasElement | null },
  paintedRef: { current: PaintState },
) {
  const { windowMs, spectra, segments, ghost, elapsedMs } = data;
  const origin = data.originMs ?? 0;
  const plotW = w - PAD_L - PAD_R;
  const plotH = h - PAD_T - PAD_B;
  const top = PAD_T;

  const x = (ms: number) => PAD_L + ((ms - origin) / windowMs) * plotW;
  const y = (st: number) => {
    const t = (st - ST_MIN) / (ST_MAX - ST_MIN);
    return top + plotH * (1 - PITCH_INSET) - t * plotH * (1 - 2 * PITCH_INSET);
  };
  const yHz = (hz: number) => top + plotH * (1 - hz / SPEC_MAX_HZ);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, w, h);

  drawSpectrogram(ctx, spectra, data.gain, specRef, paintedRef, {
    left: PAD_L,
    top,
    width: plotW,
    height: plotH,
    windowMs,
    originMs: origin,
  });

  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'middle';

  // --- frequency scale, left ---
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(226,232,240,0.6)';
  for (const hz of [3500, 2500, 1500, 500]) {
    if (hz > SPEC_MAX_HZ) continue;
    ctx.fillText(hz >= 1000 ? `${hz / 1000}k` : `${hz}`, PAD_L - 6, Math.min(yHz(hz), top + plotH - 7));
  }

  // --- pitch scale, right, with gridlines across the plot ---
  ctx.textAlign = 'left';
  for (const st of [-5, 0, 5]) {
    ctx.strokeStyle = st === 0 ? 'rgba(226,232,240,0.26)' : FAINT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, Math.round(y(st)) + 0.5);
    ctx.lineTo(w - PAD_R, Math.round(y(st)) + 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(226,232,240,0.6)';
    ctx.fillText(st > 0 ? `+${st}` : `${st}`, w - PAD_R + 6, y(st));
  }
  // Units at the foot of each scale: at the head they collide with the
  // topmost value, which on the left is the frequency ceiling itself.
  ctx.fillStyle = 'rgba(226,232,240,0.4)';
  ctx.textAlign = 'right';
  ctx.fillText('Hz', PAD_L - 6, top + plotH - 7);
  ctx.textAlign = 'left';
  ctx.fillText('st', w - PAD_R + 6, top + plotH - 7);

  // --- panel label ---
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  const lw = ctx.measureText(data.label).width;
  ctx.fillStyle = 'rgba(5,7,13,0.72)';
  ctx.fillRect(PAD_L + 6, top + 6, lw + 14, 20);
  ctx.fillStyle = 'rgba(226,232,240,0.9)';
  ctx.fillText(data.label, PAD_L + 13, top + 16);
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';

  if (spectra.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(226,232,240,0.35)';
    ctx.fillText(data.emptyText, PAD_L + plotW / 2, top + plotH / 2);
  }

  // --- syllable slots: boundary ticks, optional textbook bands, labels ---
  if (data.syllables && data.syllables.length) {
    const edges = [...data.syllables.map(s => s.startMs), data.syllables[data.syllables.length - 1].endMs];
    ctx.strokeStyle = 'rgba(226,232,240,0.28)';
    ctx.lineWidth = 1;
    for (const ms of edges) {
      const px = Math.round(x(ms)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, top + plotH);
      ctx.stroke();
    }

    if (data.showTextbook) {
      const bandPx = Math.abs(y(0) - y(BAND_HALF_ST)) * 2;
      for (const syl of data.syllables) {
        const contour = textbookContour(syl.tone);
        const path = new Path2D();
        for (let i = 0; i <= 24; i++) {
          const pos = i / 24;
          path[i === 0 ? 'moveTo' : 'lineTo'](
            x(syl.startMs + (syl.endMs - syl.startMs) * pos),
            y(contourAt(contour, pos)),
          );
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(5,7,13,0.45)';
        ctx.lineWidth = bandPx + 4;
        ctx.stroke(path);
        ctx.strokeStyle = TONE_COLOR[syl.tone];
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = bandPx;
        ctx.stroke(path);
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.stroke(path);
        ctx.restore();
      }
    }

    ctx.textAlign = 'center';
    ctx.font = '600 14px "Noto Serif Thai", serif';
    for (const syl of data.syllables) {
      const cx = (x(syl.startMs) + x(syl.endMs)) / 2;
      const tw = ctx.measureText(syl.thai).width;
      ctx.fillStyle = 'rgba(5,7,13,0.72)';
      ctx.fillRect(cx - tw / 2 - 5, top + plotH - 26, tw + 10, 20);
      ctx.fillStyle = TONE_COLOR[syl.tone];
      ctx.fillText(syl.thai, cx, top + plotH - 16);
    }
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  }

  // --- pitch lines: ghost first, own on top ---
  const trace = (track: TrackPoint[][], colour: string, width: number, dash: number[]) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const segment of track) {
      const path = () => {
        ctx.beginPath();
        // Out-of-range points break the line rather than being pinned to
        // the edge: clamping draws a confident flat stroke along the top or
        // bottom at a pitch the speaker never produced.
        let drawing = false;
        for (const point of segment) {
          if (point.st < ST_MIN || point.st > ST_MAX) {
            drawing = false;
            continue;
          }
          const px = x(point.ms);
          const py = y(point.st);
          if (drawing) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
          drawing = true;
        }
        ctx.stroke();
      };
      // A dark casing under the line: white or amber straight onto a bright
      // formant is barely a colour at all, and a loud vowel is exactly where
      // the line has to be legible.
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(5,7,13,0.8)';
      ctx.lineWidth = width + 3;
      path();
      ctx.setLineDash(dash);
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      path();
    }
    ctx.restore();
  };
  if (ghost) trace(ghost, GHOST_LINE, 2.2, [6, 4]);
  trace(segments, OWN_LINE, 2.5, []);

  // --- playhead ---
  if (elapsedMs !== null) {
    const px = Math.round(x(Math.min(elapsedMs, origin + windowMs))) + 0.5;
    ctx.strokeStyle = 'rgba(248,250,252,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px, top + plotH);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(226,232,240,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD_L + 0.5, top + 0.5, plotW - 1, plotH - 1);
}

interface SpecBox {
  left: number;
  top: number;
  width: number;
  height: number;
  windowMs: number;
  originMs: number;
}

interface PaintState {
  source: SpectrumColumn[] | null;
  count: number;
  gain: number;
  windowMs: number;
  originMs: number;
}

/** Spectrogram columns accumulate into an offscreen canvas and are blitted
 *  in one call. Repainting every column on every frame would be tens of
 *  thousands of fills a frame once a take is a few seconds long. */
function drawSpectrogram(
  ctx: CanvasRenderingContext2D,
  spectra: SpectrumColumn[],
  gain: number,
  specRef: { current: HTMLCanvasElement | null },
  paintedRef: { current: PaintState },
  box: SpecBox,
) {
  if (!specRef.current) specRef.current = document.createElement('canvas');
  const off = specRef.current;
  const w = Math.max(1, Math.round(box.width));
  const h = Math.max(1, Math.round(box.height));
  if (off.width !== w || off.height !== h) {
    off.width = w;
    off.height = h;
    paintedRef.current = { source: null, count: 0, gain, windowMs: box.windowMs, originMs: box.originMs };
  }
  const octx = off.getContext('2d');
  if (!octx) return;

  const painted = paintedRef.current;
  if (
    painted.source !== spectra ||
    painted.count > spectra.length ||
    painted.gain !== gain ||
    painted.windowMs !== box.windowMs ||
    painted.originMs !== box.originMs
  ) {
    octx.clearRect(0, 0, w, h);
    painted.source = spectra;
    painted.count = 0;
    painted.gain = gain;
    painted.windowMs = box.windowMs;
    painted.originMs = box.originMs;
  }

  const x = (ms: number) => ((ms - box.originMs) / box.windowMs) * w;

  for (let i = painted.count; i < spectra.length; i++) {
    const column = spectra[i];
    // Each column fills the span back to the one before it. Measured
    // forward, the newest column has no successor yet and is never
    // revisited, leaving a comb of one-frame stripes.
    const from = i > 0 ? x(spectra[i - 1].ms) : x(column.ms) - 2;
    const to = x(column.ms);
    const left = Math.floor(from);
    const sliceWidth = Math.max(1, Math.ceil(to - from) + 1);

    const data = column.data;
    const binCount = data.length;
    const heightFactor = h / binCount;

    if (heightFactor >= 1) {
      // The reference visualiser's inner loop; the x span above stands in
      // for its fixed 2px scroll step.
      for (let b = 0; b < binCount; b++) {
        const val = Math.min(255, data[b] * gain);
        if (val > 10) {
          octx.fillStyle = INFERNO[val | 0];
          const yy = h - b * heightFactor;
          octx.fillRect(left, yy - heightFactor, sliceWidth, heightFactor + 0.5);
        }
      }
    } else {
      // Fewer pixel rows than bins (a phone): one rect per bin would leave
      // draw order, not loudness, deciding which bin shows in a row.
      for (let row = 0; row < h; row++) {
        const b0 = Math.floor((row * binCount) / h);
        const b1 = Math.max(b0 + 1, Math.floor(((row + 1) * binCount) / h));
        let peak = 0;
        for (let b = b0; b < b1; b++) if (data[b] > peak) peak = data[b];
        const val = Math.min(255, peak * gain);
        if (val > 10) {
          octx.fillStyle = INFERNO[val | 0];
          octx.fillRect(left, h - 1 - row, sliceWidth, 1);
        }
      }
    }
  }

  painted.count = spectra.length;

  ctx.drawImage(off, box.left, box.top);
}
