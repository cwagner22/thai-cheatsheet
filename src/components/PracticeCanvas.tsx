import { useEffect, useRef } from 'react';
import styles from './PracticeCanvas.module.css';

// Thai combining-mark code points (vowel signs, tone marks) that take no
// horizontal advance — exclude them when estimating how wide a word slot
// should be.
function visibleWidth(s: string): number {
  let n = 0;
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    const combining =
      (code >= 0x0E31 && code <= 0x0E31) ||
      (code >= 0x0E34 && code <= 0x0E3A) ||
      (code >= 0x0E47 && code <= 0x0E4E);
    if (!combining) n++;
  }
  return n;
}

interface Props {
  /** If provided, renders a faded guide letter behind the canvas for tracing. */
  guide?: string;
  /**
   * Size preset:
   *  - 'default' — square letter slot
   *  - 'compact' — smaller square for confusables
   *  - 'word'    — rectangular slot that scales width to the guide word
   */
  variant?: 'default' | 'compact' | 'word';
  /**
   * When true (and variant='word'), the slot fills its container width
   * instead of being sized by the guide's character count. Used in pangrams
   * so every phrase — short or long — gets the same wide tracing area.
   */
  block?: boolean;
}

/**
 * Drawing slot: captures pointer strokes, per-slot clear button. Size is
 * driven by CSS classes so the media query can shrink slots on mobile; the
 * canvas bitmap resolution is measured from the rendered element on mount.
 */
export function PracticeCanvas({ guide, variant = 'default', block = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#1a1a1a';
    };
    setup();

    // Re-size bitmap if the viewport resizes (mobile rotation, responsive layout
    // shift). Re-setup clears existing strokes — acceptable for this app.
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pos(e);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };

  const onUp = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  const sizeClass =
    variant === 'compact' ? styles.sizeCompact :
    variant === 'word' ? styles.sizeWord :
    styles.sizeDefault;

  // For word slots, widen the box to roughly fit the guide. Thai combining
  // marks take no horizontal space, so we subtract them from the char count.
  // Multiplier scales with the 2.6rem font-size; slight padding on both ends
  // so the faded guide isn't glued to the dashed border. `block` mode skips
  // this and lets CSS fill the container instead.
  const wordStyle =
    variant === 'word' && guide && !block
      ? { width: Math.max(72, visibleWidth(guide) * 36 + 20) }
      : undefined;

  const blockClass = block && variant === 'word' ? styles.block : '';

  return (
    <div className={`${styles.slot} ${sizeClass} ${blockClass}`} style={wordStyle}>
      {guide && <div className={styles.guide}>{guide}</div>}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}
