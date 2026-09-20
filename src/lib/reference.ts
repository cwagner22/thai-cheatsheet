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

const buffers = new Map<string, AudioBuffer>();
const references = new Map<string, Reference>();

/** translate_tts serves audio without CORS headers, so a page can play it
 *  but not read its samples. In development Vite proxies it at /tts (see
 *  vite.config.ts); the deployed site has no proxy and the fetch fails. */
export function ttsFetchUrl(text: string): string {
  const query = `ie=UTF-8&client=tw-ob&tl=th&q=${encodeURIComponent(text)}`;
  return import.meta.env.DEV
    ? `/tts?${query}`
    : `https://translate.google.com/translate_tts?${query}`;
}

export const cachedReference = (phraseId: string): Reference | null =>
  references.get(phraseId) ?? null;

async function loadBuffer(ctx: AudioContext, text: string): Promise<AudioBuffer> {
  const hit = buffers.get(text);
  if (hit) return hit;
  const response = await fetch(ttsFetchUrl(text));
  if (!response.ok) throw new Error(`TTS fetch failed: ${response.status}`);
  const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  buffers.set(text, buffer);
  return buffer;
}

/** Plays the phrase's native rendition (silently, if asked) and captures it
 *  through the same graph as the microphone. */
export function captureReference(
  ctx: AudioContext,
  phrase: Phrase,
  options: { audible: boolean; onFrame?: (elapsedMs: number, capture: Capture) => void },
): { done: Promise<Reference>; handle: Promise<CaptureHandle> } {
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
      // A little run-on after the buffer ends, so the analyser's smoothing
      // has released the last syllable and the tail is captured as silence.
      source.onended = () => window.setTimeout(() => capture.stop(), 160);
      source.start();
    });
  })();

  return { done, handle };
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
