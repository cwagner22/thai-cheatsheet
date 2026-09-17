let ttsAudio: HTMLAudioElement | null = null;

/** Speaks one or more Thai words via Google Translate's TTS voice — much
 *  closer to native pronunciation (correct tones included) than the
 *  browser's built-in SpeechSynthesis, which usually has no Thai voice at
 *  all. A list plays as separate clips back-to-back, so each word gets its
 *  own natural pause instead of being read as one run-on phrase.
 *
 *  Requires `<meta name="referrer" content="no-referrer">` in index.html —
 *  this endpoint 404s any request carrying a Referer header from outside
 *  google.com, and <audio> elements have no per-element way to suppress it. */
export function speakThai(words: string | string[]) {
  const queue = Array.isArray(words) ? [...words] : [words];
  ttsAudio?.pause();
  const playNext = () => {
    const word = queue.shift();
    if (!word) return;
    const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=th&q=${encodeURIComponent(word)}`);
    ttsAudio = audio;
    audio.addEventListener('ended', playNext);
    audio.play().catch(() => playNext());
  };
  playNext();
}
