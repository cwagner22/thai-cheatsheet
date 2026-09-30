import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Waveform.module.css';

/** One envelope value per ENVELOPE_STEP_MS of audio. */
export const ENVELOPE_STEP_MS = 10;

const BAR_W = 2;
const BAR_GAP = 1;
/** Share of the height above the baseline; the rest is the reflection. */
const TOP_SHARE = 0.72;
/** A bar is never drawn shorter than this, so silence still reads as a
 *  track rather than as nothing. */
const MIN_BAR_PX = 1;

const BASE = '#c9ccd1';
const BASE_REFLECT = '#e3e5e8';
const HOVER = '#ffb38a';
const HOVER_REFLECT = '#ffd9c4';
const PLAYED = '#ff5500';
const PLAYED_REFLECT = '#ffbb99';

/**
 * Peak level per ENVELOPE_STEP_MS window, from `startMs` to `endMs` of the
 * samples. Peaks rather than RMS: a waveform in the SoundCloud style shows
 * how far the signal swings, and RMS flattens consonant bursts into the
 * noise floor.
 */
export function envelopeOf(samples: Float32Array, rate: number, startMs = 0, endMs?: number): Float32Array {
  const step = Math.max(1, Math.round((ENVELOPE_STEP_MS / 1000) * rate));
  const from = Math.max(0, Math.round((startMs / 1000) * rate));
  const to = Math.min(samples.length, endMs === undefined ? samples.length : Math.round((endMs / 1000) * rate));
  const out = new Float32Array(Math.max(0, Math.ceil((to - from) / step)));
  for (let k = 0; k < out.length; k++) {
    let peak = 0;
    const end = Math.min(to, from + (k + 1) * step);
    for (let i = from + k * step; i < end; i++) {
      const a = Math.abs(samples[i]);
      if (a > peak) peak = a;
    }
    out[k] = peak;
  }
  return out;
}

/**
 * Where the sound in an envelope starts and ends, in ms: the first and last
 * window reaching a tenth of the envelope's own loudest, widened by `padMs`.
 * Relative to the take itself, so a quiet microphone and a loud one trim
 * alike. Null when the envelope is silent.
 */
export function soundBounds(envelope: Float32Array, padMs = 80): { startMs: number; endMs: number } | null {
  let max = 0;
  for (const v of envelope) if (v > max) max = v;
  if (max <= 0) return null;
  const gate = max * 0.1;
  let first = -1;
  let last = -1;
  envelope.forEach((v, i) => {
    if (v < gate) return;
    if (first < 0) first = i;
    last = i;
  });
  const total = envelope.length * ENVELOPE_STEP_MS;
  return {
    startMs: Math.max(0, first * ENVELOPE_STEP_MS - padMs),
    endMs: Math.min(total, (last + 1) * ENVELOPE_STEP_MS + padMs),
  };
}

/**
 * A SoundCloud-style waveform: thin bars over a baseline with a paler
 * reflection under it, the played part in orange, a lighter tint up to the
 * pointer, and a click anywhere to seek there.
 *
 * `windowMs` is the width of the time axis; two panels given the same value
 * share one scale, so the native voice and a take can be read against each
 * other. The envelope is scaled to its own loudest bar, as SoundCloud
 * scales each track.
 */
export function Waveform({
  envelope,
  windowMs,
  progressMs,
  onSeek,
  height = 96,
  emptyText,
  minScale = 0,
  label,
  children,
}: {
  envelope: Float32Array | null;
  windowMs: number;
  /** Played position; null when not playing and not paused part-way. */
  progressMs: number | null;
  onSeek?: (ms: number) => void;
  height?: number;
  emptyText: string;
  /** The level drawn at full height is never less than this, so a take of
   *  room noise alone is not stretched into a wall of bars. */
  minScale?: number;
  /** Names the graph, in its top-left corner. */
  label?: string;
  /** Shown over the panel, e.g. a count-in. */
  children?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const baseline = Math.round(height * TOP_SHARE);
    const pitch = BAR_W + BAR_GAP;
    const bars = Math.floor(width / pitch);
    const msPerBar = windowMs / Math.max(1, bars);
    let max = minScale;
    if (envelope) for (const v of envelope) if (v > max) max = v;

    if (!envelope?.length) {
      ctx.fillStyle = '#e8e9ec';
      ctx.fillRect(0, baseline, width, 1);
      return;
    }
    for (let b = 0; b < bars; b++) {
      const startMs = b * msPerBar;
      const lo = Math.floor(startMs / ENVELOPE_STEP_MS);
      if (lo >= envelope.length) break;
      const hi = Math.min(envelope.length, Math.max(lo + 1, Math.ceil((startMs + msPerBar) / ENVELOPE_STEP_MS)));
      let level = 0;
      for (let k = lo; k < hi; k++) if (envelope[k] > level) level = envelope[k];
      if (max > 0) level /= max;
      const up = Math.max(MIN_BAR_PX, level * (baseline - 4));
      const down = Math.max(MIN_BAR_PX, level * (height - baseline - 2));
      const played = progressMs !== null && startMs < progressMs;
      const hovered = hoverMs !== null && startMs < hoverMs;
      const x = b * pitch;
      ctx.fillStyle = played ? PLAYED : hovered ? HOVER : BASE;
      ctx.fillRect(x, baseline - up, BAR_W, up);
      ctx.fillStyle = played ? PLAYED_REFLECT : hovered ? HOVER_REFLECT : BASE_REFLECT;
      ctx.fillRect(x, baseline + 1, BAR_W, down);
    }
  }, [envelope, windowMs, progressMs, hoverMs, width, height, minScale]);

  const msAt = (clientX: number, el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - box.left) / box.width)) * windowMs;
  };
  const seekable = Boolean(onSeek && envelope?.length);

  return (
    <div
      className={styles.wave}
      style={{ height, cursor: seekable ? 'pointer' : 'default' }}
      onPointerMove={seekable ? e => setHoverMs(msAt(e.clientX, e.currentTarget)) : undefined}
      onPointerLeave={() => setHoverMs(null)}
      onClick={seekable ? e => onSeek?.(msAt(e.clientX, e.currentTarget)) : undefined}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      {label && <span className={styles.label}>{label}</span>}
      {!envelope?.length && !children && <span className={styles.empty}>{emptyText}</span>}
      {children && <div className={styles.overlay}>{children}</div>}
    </div>
  );
}
