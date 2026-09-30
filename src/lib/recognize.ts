/**
 * Speech to text through the browser's Web Speech API, so the English page
 * can show what a recogniser made of a take. Chrome and Edge send the audio
 * to their vendor's servers for this and need a connection; Safari runs it
 * on the device; Firefox has no implementation, and callers get null.
 */

/** The parts of the Web Speech API used here; TypeScript's DOM library does
 *  not declare it. */
interface RecognitionResultList {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface RecognitionEvent {
  results: RecognitionResultList;
}
interface RecognitionErrorEvent {
  error: string;
}
interface RecognitionEngine {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => RecognitionEngine;

function engine(): RecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface Recognition {
  /** Ends listening; results still in flight are delivered, then onEnd. */
  stop(): void;
  /** Ends listening and drops anything not yet delivered. */
  abort(): void;
}

/** Listens until stopped. `onText` receives the whole transcript so far
 *  each time it changes, interim words included; `onEnd` fires once, with
 *  the error code if the recogniser gave up (`no-speech`, `network`,
 *  `not-allowed`, …). */
export function startRecognition(
  lang: string,
  onText: (text: string) => void,
  onEnd: (error: string | null) => void,
): Recognition | null {
  const Engine = engine();
  if (!Engine) return null;
  const rec = new Engine();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let error: string | null = null;
  rec.onresult = e => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    onText(text.trim());
  };
  // "aborted" is this module's own abort(), not a failure.
  rec.onerror = e => {
    if (e.error !== 'aborted') error = e.error;
  };
  rec.onend = () => onEnd(error);
  try {
    rec.start();
  } catch {
    return null;
  }
  return {
    stop: () => rec.stop(),
    abort: () => {
      rec.onresult = null;
      rec.onend = null;
      rec.abort();
    },
  };
}
