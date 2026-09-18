let ttsAudio: HTMLAudioElement | null = null;

/** Every call gets a ticket; only the newest one may keep reporting
 *  progress. Without it, a queue that was cut off mid-run would go on
 *  telling its caller which word is playing while a different queue is
 *  actually sounding, leaving two highlights on screen at once. */
let currentRun = 0;
let endCurrentReport: (() => void) | null = null;

/** One <audio> element per word, kept for the life of the page so a word
 *  spoken twice replays from that element's own buffer instead of going
 *  back to the endpoint — the clips here are fixed syllables a learner
 *  taps over and over, and the response carries no cache headers of its
 *  own. Evicted oldest-first once the map is full (a Map iterates in
 *  insertion order, so the first key is the one added longest ago);
 *  eviction only drops the element, and speaking that word again just
 *  re-fetches it. */
const CACHE_LIMIT = 200;
const clips = new Map<string, HTMLAudioElement>();

function clipFor(word: string): HTMLAudioElement {
  const cached = clips.get(word);
  if (cached) return cached;
  const audio = new Audio(
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=th&q=${encodeURIComponent(word)}`,
  );
  if (clips.size >= CACHE_LIMIT) {
    const oldest = clips.keys().next();
    if (!oldest.done) clips.delete(oldest.value);
  }
  clips.set(word, audio);
  return audio;
}

/** Speaks one or more Thai words via Google Translate's TTS voice — much
 *  closer to native pronunciation (correct tones included) than the
 *  browser's built-in SpeechSynthesis, which usually has no Thai voice at
 *  all. A list plays as separate clips back-to-back, so each word gets its
 *  own natural pause instead of being read as one run-on phrase.
 *
 *  Requires `<meta name="referrer" content="no-referrer">` in index.html —
 *  this endpoint 404s any request carrying a Referer header from outside
 *  google.com, and <audio> elements have no per-element way to suppress it.
 *
 *  `onWord` reports which word of the list is sounding, by index, and null
 *  once the list is finished or another call takes over — for callers that
 *  mark the word being spoken. */
export function speakThai(words: string | string[], onWord?: (index: number | null) => void) {
  const queue = Array.isArray(words) ? [...words] : [words];
  ttsAudio?.pause();
  endCurrentReport?.();
  const run = ++currentRun;
  endCurrentReport = onWord ? () => onWord(null) : null;
  let index = -1;
  const playNext = () => {
    if (run !== currentRun) return;
    const word = queue.shift();
    index += 1;
    if (!word) {
      onWord?.(null);
      if (run === currentRun) endCurrentReport = null;
      return;
    }
    onWord?.(index);
    const audio = clipFor(word);
    ttsAudio = audio;
    // Assigned rather than added: a reused element would otherwise collect
    // one handler per play, each still advancing the queue it was created
    // for, so a word played n times would drive n parallel readings.
    audio.onended = playNext;
    // A clip cut off mid-word by the next call to this function stays
    // parked where it stopped; rewind before replaying it. Guarded so a
    // freshly created element, which has no media loaded yet, is untouched.
    if (audio.currentTime) audio.currentTime = 0;
    audio.play().catch(() => playNext());
  };
  playNext();
}
