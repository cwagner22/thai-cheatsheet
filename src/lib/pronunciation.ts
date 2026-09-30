/**
 * Pronunciation assessment by Azure's Speech service: the take is scored
 * against the sentence it was meant to be, word by word and sound by sound.
 * Unlike a transcript, which a recogniser smooths towards whatever sentence
 * is likely, this says how close each sound came to a native speaker's.
 *
 * The Azure key never reaches the page. In development Vite's dev server
 * adds it (see vite.config.ts); the deployed site goes through the relay
 * Worker in worker/tts-proxy, which holds it as a secret.
 */

import { encodeWav, to16k } from './audio16k';

export interface PhonemeScore {
  /** IPA symbol. */
  phoneme: string;
  /** 0–100. */
  score: number;
}

export interface WordScore {
  word: string;
  score: number;
  /** `None`, or how the word departs from the sentence: `Omission` (not
   *  said), `Insertion` (said but not in the sentence), `Mispronunciation`. */
  error: string;
  phonemes: PhonemeScore[];
}

export interface Assessment {
  /** What the service recognised. */
  text: string;
  /** Overall score, from accuracy, fluency and completeness. */
  pronunciation: number;
  /** How close the sounds came to a native speaker's. */
  accuracy: number;
  /** How natural the pauses between words were. */
  fluency: number;
  /** Share of the sentence's words that were said. */
  completeness: number;
  /** Stress, intonation, rhythm and speed; absent if not returned. */
  prosody?: number;
  words: WordScore[];
}

/** Where assessment requests go, or null when the build has no relay. */
function endpoint(): string | null {
  if (import.meta.env.DEV) return '/pron';
  const relay = (import.meta.env.VITE_TTS_PROXY as string | undefined)?.replace(/\/$/, '');
  return relay ? `${relay}/pronunciation` : null;
}

export type AssessLanguage = 'en-US' | 'th-TH';

/** The request's parameters travel base64-encoded JSON in one header, as
 *  the REST API for short audio takes them. Prosody scores and IPA phoneme
 *  names are English-only; for Thai the service scores each sound but
 *  leaves it unnamed. */
function assessmentHeader(referenceText: string, language: AssessLanguage): string {
  const params = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: 'True',
    ...(language === 'en-US' ? { EnableProsodyAssessment: 'True', PhonemeAlphabet: 'IPA' } : {}),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(params));
  return btoa(String.fromCharCode(...bytes));
}

interface AzureWord {
  Word: string;
  AccuracyScore?: number;
  ErrorType?: string;
  Phonemes?: { Phoneme: string; AccuracyScore?: number; PronunciationAssessment?: { AccuracyScore?: number } }[];
  PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string };
}
interface AzureBest {
  Display?: string;
  AccuracyScore?: number;
  FluencyScore?: number;
  CompletenessScore?: number;
  PronScore?: number;
  ProsodyScore?: number;
  Words?: AzureWord[];
}

/** Scores the take in `buffer` between `startMs` and `endMs` against
 *  `referenceText`. Throws with a message fit to show when the service is
 *  not set up, refuses the key, or hears no speech. */
export async function assess(
  buffer: AudioBuffer,
  startMs: number,
  endMs: number,
  referenceText: string,
  language: AssessLanguage = 'en-US',
): Promise<Assessment> {
  const url = endpoint();
  if (!url) throw new Error('This build has no relay to send the take to.');
  const wav = encodeWav(await to16k(buffer, startMs, endMs));
  const response = await fetch(`${url}?language=${language}&format=detailed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      Accept: 'application/json',
      'Pronunciation-Assessment': assessmentHeader(referenceText, language),
    },
    body: wav,
  });
  if (response.status === 404 || response.status === 503) {
    throw new Error('not set up yet, the Azure Speech key is missing.');
  }
  if (response.status === 401 || response.status === 403) throw new Error('Azure refused the Speech key.');
  if (!response.ok) throw new Error(`Azure answered ${response.status}.`);
  const body = (await response.json()) as { RecognitionStatus: string; NBest?: AzureBest[] };
  const best = body.NBest?.[0];
  if (body.RecognitionStatus !== 'Success' || !best) {
    throw new Error(body.RecognitionStatus === 'InitialSilenceTimeout' ? 'Azure heard no speech.' : `Azure: ${body.RecognitionStatus}.`);
  }
  return {
    text: best.Display ?? '',
    pronunciation: best.PronScore ?? 0,
    accuracy: best.AccuracyScore ?? 0,
    fluency: best.FluencyScore ?? 0,
    completeness: best.CompletenessScore ?? 0,
    prosody: best.ProsodyScore,
    words: (best.Words ?? []).map(w => ({
      word: w.Word,
      // Older responses nest the word's scores one level down.
      score: w.AccuracyScore ?? w.PronunciationAssessment?.AccuracyScore ?? 0,
      error: w.ErrorType ?? w.PronunciationAssessment?.ErrorType ?? 'None',
      phonemes: (w.Phonemes ?? []).map(p => ({
        phoneme: p.Phoneme,
        score: p.AccuracyScore ?? p.PronunciationAssessment?.AccuracyScore ?? 0,
      })),
    })),
  };
}
