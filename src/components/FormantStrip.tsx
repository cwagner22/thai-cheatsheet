import { useEffect, useRef, useState } from 'react';
import { SPECTRO_MAX_HZ, type Spectrogram } from '../lib/spectrogram';
import styles from './Waveform.module.css';

/** Ink for the darkest cell: the page's own ink, so the strip reads as part
 *  of the page rather than as an instrument panel. */
const INK = [15, 15, 16];
const PLAYHEAD = '#ff5500';
const LABELS_HZ = [1000, 2000, 3000, 4000];

/**
 * A wideband spectrogram on white, on the same time axis as the Waveform
 * above it: darker is louder, and the dark horizontal bands are the
 * formants. Clicking seeks like the waveform does.
 */
export function FormantStrip({
  spectrogram,
  windowMs,
  progressMs,
  onSeek,
  height = 116,
}: {
  spectrogram: Spectrogram | null;
  windowMs: number;
  progressMs: number | null;
  onSeek?: (ms: number) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<{ source: Spectrogram; image: HTMLCanvasElement } | null>(null);
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

    if (!spectrogram?.columns.length) return;
    // Painted once per spectrogram at one pixel per cell, then scaled onto
    // the panel; a resize or a playhead move only redoes the blit.
    if (imageRef.current?.source !== spectrogram) {
      const cols = spectrogram.columns.length;
      const bins = spectrogram.columns[0].length;
      const image = document.createElement('canvas');
      image.width = cols;
      image.height = bins;
      const ictx = image.getContext('2d');
      if (!ictx) return;
      const pixels = ictx.createImageData(cols, bins);
      spectrogram.columns.forEach((column, c) => {
        for (let k = 0; k < bins; k++) {
          const v = column[k];
          const at = ((bins - 1 - k) * cols + c) * 4;
          pixels.data[at] = 255 - v * (255 - INK[0]);
          pixels.data[at + 1] = 255 - v * (255 - INK[1]);
          pixels.data[at + 2] = 255 - v * (255 - INK[2]);
          pixels.data[at + 3] = 255;
        }
      });
      ictx.putImageData(pixels, 0, 0);
      imageRef.current = { source: spectrogram, image };
    }
    const { image } = imageRef.current;
    const spanMs = spectrogram.columns.length * spectrogram.hopMs;
    const topHz = spectrogram.columns[0].length * spectrogram.binHz;
    const drawnH = height * Math.min(1, topHz / SPECTRO_MAX_HZ);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, 0, height - drawnH, (spanMs / windowMs) * width, drawnH);

    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (const hz of LABELS_HZ) {
      const y = height * (1 - hz / SPECTRO_MAX_HZ);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(width - 26, y - 6, 26, 12);
      ctx.fillStyle = '#8a8d94';
      ctx.fillText(`${hz / 1000}k`, width - 3, y);
    }

    if (progressMs !== null) {
      const x = Math.round((progressMs / windowMs) * width) + 0.5;
      ctx.strokeStyle = PLAYHEAD;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }, [spectrogram, windowMs, progressMs, width, height]);

  const seekable = Boolean(onSeek && spectrogram?.columns.length);
  return (
    <div
      className={styles.strip}
      style={{ height, cursor: seekable ? 'pointer' : 'default' }}
      onClick={
        seekable
          ? e => {
              const box = e.currentTarget.getBoundingClientRect();
              onSeek?.(Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * windowMs);
            }
          : undefined
      }
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <span className={styles.label}>Spectrogram</span>
    </div>
  );
}
