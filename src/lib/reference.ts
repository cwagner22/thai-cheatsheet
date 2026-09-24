/**
 * The native reference: Google Translate's Thai voice saying the phrase,
 * fetched as audio and analysed in one pass by analyseSamples, which
 * computes what the microphone's live capture loop computes.
 * The voice is the target; textbook citation contours miss connected
 * speech by several semitones.
 */

import type { Capture } from './capture';
import { analyseSamples } from './offlineCapture';
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

/** Silence analysed past the end of the clip, so the analyser's smoothing
 *  has released the last syllable and the tail reads as silence. */
export const RUN_ON_MS = 160;

const buffers = new Map<string, Promise<AudioBuffer>>();
const references = new Map<string, Reference>();
/** Loads in flight, one per phrase, so two callers asking at once — a
 *  mount effect run twice, Listen pressed during the automatic load —
 *  share one fetch. */
const pending = new Map<string, Promise<Reference>>();

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

/** Fetches and analyses the phrase's native rendition; resolves as soon as
 *  the audio is decoded — no playback needed. */
export function loadReference(ctx: AudioContext, phrase: Phrase): Promise<Reference> {
  const hit = references.get(phrase.id);
  if (hit) return Promise.resolve(hit);
  const inFlight = pending.get(phrase.id);
  if (inFlight) return inFlight;
  const done = (async () => {
    const text = thaiOf(phrase);
    const buffer = await loadBuffer(ctx, text);
    const channel = buffer.getChannelData(0);
    const samples = new Float32Array(channel.length + Math.round((RUN_ON_MS / 1000) * buffer.sampleRate));
    samples.set(channel);
    const result: Capture = analyseSamples(samples, buffer.sampleRate);
    const reference: Reference = {
      ...result,
      phraseId: phrase.id,
      text,
      buffer,
      durationMs: result.frames.length ? result.frames[result.frames.length - 1].t : 0,
      syllables: segmentReference(result.frames, syllableSpecs(phrase)),
    };
    references.set(phrase.id, reference);
    return reference;
  })();
  pending.set(phrase.id, done);
  done.finally(() => pending.delete(phrase.id)).catch(() => undefined);
  return done;
}

export interface Playback {
  source: AudioBufferSourceNode;
  /** `ctx.currentTime` at which the audio began; the capture's clock
   *  started with the source, so (currentTime − startedAt) is capture time. */
  startedAt: number;
  durationMs: number;
}

/** Plays a loaded reference, audibly, with no analysis. */
export function playReference(ctx: AudioContext, reference: Reference): Playback {
  const source = ctx.createBufferSource();
  source.buffer = reference.buffer;
  source.connect(ctx.destination);
  if (ctx.state === 'suspended') void ctx.resume();
  source.start();
  return { source, startedAt: ctx.currentTime, durationMs: reference.buffer.duration * 1000 };
}
