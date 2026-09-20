/**
 * The native reference: Google Translate's Thai voice saying the phrase,
 * fetched as audio and run through the same capture loop as the microphone.
 * The voice is the target; textbook citation contours miss connected
 * speech by several semitones.
 */

import { startCapture, type Capture, type CaptureHandle } from './capture';
import { thaiOf, type Phrase } from '../data/phrases';
import { segmentReference, syllableSpecs, type SyllableSpan } from './segment';

export interface Reference extends Capture {
  phraseId: string;
  text: string;
  buffer: AudioBuffer;
  /** Time of the last captured frame — the extent of the shared time axis. */
  durationMs: number;
  /** Where each syllable falls in this recording; null when it could not be
   *  segmented (too little voiced audio). */
  syllables: SyllableSpan[] | null;
}

/** Captured past the end of the clip, so the analyser's smoothing has
 *  released the last syllable and the tail is captured as silence. */
export const RUN_ON_MS = 160;

const buffers = new Map<string, Promise<AudioBuffer>>();
const references = new Map<string, Reference>();
/** Captures in flight, one per phrase. Two callers asking for the same
 *  phrase at once — a mount effect run twice, Listen pressed during the
 *  automatic load — share one capture; two racing captures of the same
 *  audio would each paint the panel with their own frames. */
const pending = new Map<string, { done: Promise<Reference>; handle: Promise<CaptureHandle> }>();

/** translate_tts serves audio without CORS headers, so a page can play it
 *  but not read its samples. In development Vite proxies it at /tts (see
 *  vite.config.ts); the deployed site goes through the relay Worker in
 *  worker/tts-proxy, whose URL is VITE_TTS_PROXY at build time. With neither,
 *  the fetch fails and the tab runs without a native voice. */
export function ttsFetchUrl(text: string): string {
  if (import.meta.env.DEV) return `/tts?ie=UTF-8&client=tw-ob&tl=th&q=${encodeURIComponent(text)}`;
  const relay = (import.meta.env.VITE_TTS_PROXY as string | undefined)?.replace(/\/$/, '');
  return relay
    ? `${relay}/?q=${encodeURIComponent(text)}`
    : `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=th&q=${encodeURIComponent(text)}`;
}

export const cachedReference = (phraseId: string): Reference | null =>
  references.get(phraseId) ?? null;

function loadBuffer(ctx: AudioContext, text: string): Promise<AudioBuffer> {
  const hit = buffers.get(text);
  if (hit) return hit;
  const loading = (async () => {
    const response = await fetch(ttsFetchUrl(text));
    if (!response.ok) throw new Error(`TTS fetch failed: ${response.status}`);
    return ctx.decodeAudioData(await response.arrayBuffer());
  })();
  buffers.set(text, loading);
  loading.catch(() => buffers.delete(text));
  return loading;
}

/** Plays the phrase's native rendition (silently, if asked) and captures it
 *  through the same graph as the microphone. */
export function captureReference(
  ctx: AudioContext,
  phrase: Phrase,
  options: {
    audible: boolean;
    onFrame?: (elapsedMs: number, capture: Capture) => void;
    /** Called as playback starts, with the clip's length; the capture runs
     *  RUN_ON_MS past it. */
    onStart?: (clipMs: number) => void;
  },
): { done: Promise<Reference>; handle: Promise<CaptureHandle> } {
  const inFlight = pending.get(phrase.id);
  if (inFlight) return inFlight;

  let resolveHandle!: (h: CaptureHandle) => void;
  const handle = new Promise<CaptureHandle>(r => (resolveHandle = r));

  const done = (async () => {
    const text = thaiOf(phrase);
    const buffer = await loadBuffer(ctx, text);
    if (ctx.state === 'suspended') await ctx.resume();

    return new Promise<Reference>(resolve => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const out = ctx.createGain();
      out.gain.value = options.audible ? 1 : 0;
      source.connect(out);
      out.connect(ctx.destination);

      const capture = startCapture(ctx, source, {
        onFrame: options.onFrame,
        onStop: result => {
          const reference: Reference = {
            ...result,
            phraseId: phrase.id,
            text,
            buffer,
            durationMs: result.frames.length ? result.frames[result.frames.length - 1].t : 0,
            syllables: segmentReference(result.frames, syllableSpecs(phrase)),
          };
          references.set(phrase.id, reference);
          resolve(reference);
        },
      });
      resolveHandle(capture);
      source.onended = () => window.setTimeout(() => capture.stop(), RUN_ON_MS);
      source.start();
      options.onStart?.(buffer.duration * 1000);
    });
  })();

  const entry = { done, handle };
  pending.set(phrase.id, entry);
  done.finally(() => pending.delete(phrase.id)).catch(() => undefined);
  return entry;
}

export interface Playback {
  source: AudioBufferSourceNode;
  /** `ctx.currentTime` at which the audio began; the capture's clock
   *  started with the source, so (currentTime − startedAt) is capture time. */
  startedAt: number;
  durationMs: number;
}

/** Replays a reference already captured, audibly, with no analysis. */
export function playReference(ctx: AudioContext, reference: Reference): Playback {
  const source = ctx.createBufferSource();
  source.buffer = reference.buffer;
  source.connect(ctx.destination);
  if (ctx.state === 'suspended') void ctx.resume();
  source.start();
  return { source, startedAt: ctx.currentTime, durationMs: reference.buffer.duration * 1000 };
}
