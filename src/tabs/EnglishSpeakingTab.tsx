import { useCallback, useEffect, useRef, useState } from 'react';
import { ENGLISH_PHRASES, englishIpa, englishText, type EnglishPhrase } from '../data/englishPhrases';
import { ttsFetchUrl } from '../lib/reference';
import { FALLBACK_TARGET_DB, boostDb, raise, speechLevelDb } from '../lib/loudness';
import { ENVELOPE_STEP_MS, Waveform, envelopeOf } from '../components/Waveform';
import { analyseSamples } from '../lib/offlineCapture';
import { speechBounds } from '../lib/align';
import { FormantStrip } from '../components/FormantStrip';
import { spectrogramOf, type Spectrogram } from '../lib/spectrogram';
import { startCapture } from '../lib/capture';
import { takeFinished } from '../lib/endOfTake';
import { startRecognition } from '../lib/recognize';
import {
  WHISPER_OPTIONS,
  deleteDownload,
  hasWebGpu,
  isDownloaded,
  needsGpu,
  setWhisperChoice,
  transcribe,
  whisperChoice,
  type WhisperOption,
} from '../lib/whisper';
import { matchWords, words } from '../lib/wordMatch';
import { assess } from '../lib/pronunciation';
import { PronunciationResult, type Check } from '../components/PronunciationResult';
import { writeRoute } from '../lib/route';
import styles from './EnglishSpeakingTab.module.css';

const LAST_PHRASE_KEY = 'english.phrase';
/** Time axis before anything has been heard. */
const FALLBACK_WINDOW_MS = 3000;
/** Headroom past the native length before a take may end by itself: room
 *  to start late, since there is no count-in. */
const WINDOW_TAIL_MS = 800;
/** See Waveform's minScale: the peak level of quiet speech on a laptop
 *  microphone is well above it, room noise under noise suppression well
 *  below. */
const TAKE_MIN_SCALE = 0.02;

type Track = 'native' | 'you';

/** Audio trimmed to where its sound is, ready to draw and to play. */
interface Clip {
  buffer: AudioBuffer;
  /** Where the sound starts and ends inside `buffer`, in ms. */
  startMs: number;
  endMs: number;
  envelope: Float32Array;
  spectrogram: Spectrogram;
}

/** What the recogniser made of a take. */
interface Heard {
  text: string;
  /** False while the recogniser may still revise it. */
  final: boolean;
  error: string | null;
  /** The browser's own speech service, or Whisper running in the page. */
  by: 'browser' | 'whisper';
  /** The Whisper model's label, when `by` is whisper. */
  model?: string;
  /** Why the browser's service gave nothing, when Whisper stood in for it. */
  browserError?: string;
  /** Shown in place of the words while there are none yet. */
  status?: string;
}


/** Whether each take is also scored by Azure's pronunciation assessment. */
const PRON_CHECK_KEY = 'english.pronCheck';

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    window.localStorage.setItem(key, on ? '1' : '0');
  } catch {
    // Storage may be unavailable; the choice lasts until the page closes.
  }
}

/** Whether takes try the browser's own speech service before Whisper. */
const BROWSER_STT_KEY = 'english.browserStt';

function readBrowserStt(): boolean {
  try {
    return window.localStorage.getItem(BROWSER_STT_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeBrowserStt(on: boolean): void {
  try {
    window.localStorage.setItem(BROWSER_STT_KEY, on ? '1' : '0');
  } catch {
    // Storage may be unavailable; the choice lasts until the page closes.
  }
}

interface Position {
  track: Track;
  ms: number;
  playing: boolean;
}

/** Decoded native voices, one per sentence, kept for the page's life. */
const natives = new Map<string, Promise<AudioBuffer>>();

function loadNative(ctx: AudioContext, phrase: EnglishPhrase): Promise<AudioBuffer> {
  const hit = natives.get(phrase.id);
  if (hit) return hit;
  const loading = (async () => {
    const response = await fetch(ttsFetchUrl(englishText(phrase), 'en'));
    if (!response.ok) throw new Error(`TTS fetch failed: ${response.status}`);
    return ctx.decodeAudioData(await response.arrayBuffer());
  })();
  natives.set(phrase.id, loading);
  loading.catch(() => natives.delete(phrase.id));
  return loading;
}

/** Margins kept around the voice when a clip is trimmed to it. Wider after
 *  than before: a sentence that ends on a quiet consonant (the /n/ of "run",
 *  the release of a final /t/) fades rather than stops, and trailing
 *  silence costs nothing where a clipped word loses the take. */
const TRIM_LEAD_MS = 100;
const TRIM_TAIL_MS = 250;

/** Where the voice in `buffer` starts and ends, in ms, by the Thai tab's
 *  speechBounds: anchored on voiced frames and run out over the loud
 *  frames beside them. A loudness cut-off alone either trims a quiet final
 *  consonant or, in a room whose noise sits 30 dB under the voice, runs on
 *  to the end of the recording. The whole clip when nothing is voiced. */
function voiceSpan(buffer: AudioBuffer): { startMs: number; endMs: number } {
  const totalMs = buffer.duration * 1000;
  const frames = analyseSamples(buffer.getChannelData(0), buffer.sampleRate).frames;
  const bounds = frames.length ? speechBounds(frames) : null;
  if (!bounds) return { startMs: 0, endMs: totalMs };
  // A frame's time marks the end of its 2048-sample analysis window.
  const windowMs = (2048 / buffer.sampleRate) * 1000;
  return {
    startMs: Math.max(0, frames[bounds[0]].t - windowMs - TRIM_LEAD_MS),
    endMs: Math.min(totalMs, frames[bounds[1]].t + TRIM_TAIL_MS),
  };
}

function clipOf(buffer: AudioBuffer): Clip {
  const samples = buffer.getChannelData(0);
  const bounds = voiceSpan(buffer);
  return {
    buffer,
    ...bounds,
    envelope: envelopeOf(samples, buffer.sampleRate, bounds.startMs, bounds.endMs),
    spectrogram: spectrogramOf(samples, buffer.sampleRate, bounds.startMs, bounds.endMs),
  };
}

const clipMs = (clip: Clip | null) => (clip ? clip.endMs - clip.startMs : 0);
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function initialPhrase(): EnglishPhrase {
  let wanted: string | null = null;
  try {
    wanted = window.localStorage.getItem(LAST_PHRASE_KEY);
  } catch {
    wanted = null;
  }
  return ENGLISH_PHRASES.find(p => p.id === wanted) ?? ENGLISH_PHRASES[0];
}

export function EnglishSpeakingTab() {
  const [phrase, setPhrase] = useState<EnglishPhrase>(initialPhrase);
  const [native, setNative] = useState<Clip | null>(null);
  const [nativeStatus, setNativeStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [take, setTake] = useState<Clip | null>(null);
  const [recording, setRecording] = useState<'idle' | 'recording' | 'denied'>('idle');
  const [live, setLive] = useState<Float32Array | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [heard, setHeard] = useState<Heard | null>(null);
  const [sttModel, setSttModel] = useState<WhisperOption>(whisperChoice);
  const [browserStt, setBrowserStt] = useState(readBrowserStt);
  /** Read by a take in progress, which outlives the render it began in. */
  const sttModelRef = useRef(sttModel);
  sttModelRef.current = sttModel;
  const browserSttRef = useRef(browserStt);
  browserSttRef.current = browserStt;
  const [pronCheck, setPronCheck] = useState(() => readFlag(PRON_CHECK_KEY, false));
  const pronCheckRef = useRef(pronCheck);
  pronCheckRef.current = pronCheck;
  const [check, setCheck] = useState<Check | null>(null);
  /** The You panel's fold-out: recognition settings or how to compare. */
  const [drawer, setDrawer] = useState<'settings' | 'help' | null>(null);
  const checksRef = useRef(new Map<string, Check>());
  /** Like takeSeqRef, for checks: a result for an older take is dropped. */
  const checkSeqRef = useRef(0);
  // The default and any saved choice may need a GPU this browser lacks.
  useEffect(() => {
    if (!needsGpu(sttModel)) return;
    void hasWebGpu().then(ok => {
      if (!ok) setSttModel(WHISPER_OPTIONS.find(o => !needsGpu(o)) ?? WHISPER_OPTIONS[0]);
    });
    // Checked once, for the choice the page opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const frameRef = useRef(0);
  /** Takes kept per sentence, so going back to one shows the last attempt. */
  const takesRef = useRef(new Map<string, Clip>());
  /** The recording as the browser made it, for Save; kept per sentence. */
  const [takeFile, setTakeFile] = useState<string | null>(null);
  const takeFilesRef = useRef(new Map<string, string>());
  const heardRef = useRef(new Map<string, Heard>());
  /** The sentence on screen and the newest take, so a transcript that comes
   *  back late for another sentence or an older take is not shown. */
  const phraseIdRef = useRef(phrase.id);
  const takeSeqRef = useRef(0);
  const stopRecordingRef = useRef<((keep: boolean) => void) | null>(null);

  const ensureCtx = () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  };

  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const source = sourceRef.current;
    sourceRef.current = null;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
  }, []);

  useEffect(() => {
    writeRoute('english');
    phraseIdRef.current = phrase.id;
    try {
      window.localStorage.setItem(LAST_PHRASE_KEY, phrase.id);
    } catch {
      // Storage may be unavailable; the sentence is simply not remembered.
    }
    stopPlayback();
    stopRecordingRef.current?.(false);
    setPosition(null);
    setTake(takesRef.current.get(phrase.id) ?? null);
    setTakeFile(takeFilesRef.current.get(phrase.id) ?? null);
    setHeard(heardRef.current.get(phrase.id) ?? null);
    setCheck(checksRef.current.get(phrase.id) ?? null);
    setNative(null);
    setNativeStatus('loading');
    let cancelled = false;
    loadNative(ensureCtx(), phrase).then(
      buffer => {
        if (cancelled) return;
        setNative(clipOf(buffer));
        setNativeStatus('ready');
      },
      () => !cancelled && setNativeStatus('failed'),
    );
    return () => {
      cancelled = true;
    };
  }, [phrase, stopPlayback]);

  useEffect(
    () => () => {
      stopPlayback();
      stopRecordingRef.current?.(false);
    },
    [stopPlayback],
  );

  /** Plays one track from `fromMs` into its trimmed sound. */
  const play = useCallback(
    (track: Track, clip: Clip, fromMs = 0) => {
      stopPlayback();
      const ctx = ensureCtx();
      if (ctx.state === 'suspended') void ctx.resume();
      const lengthMs = clip.endMs - clip.startMs;
      const offsetMs = fromMs >= lengthMs - 20 ? 0 : fromMs;
      const source = ctx.createBufferSource();
      source.buffer = clip.buffer;
      source.connect(ctx.destination);
      source.start(0, (clip.startMs + offsetMs) / 1000, (lengthMs - offsetMs) / 1000);
      sourceRef.current = source;
      // The playhead runs on the page clock: some browsers advance
      // ctx.currentTime in steps of a second or more, which would park the
      // playhead and then jump it.
      const startedAt = performance.now();
      source.onended = () => {
        if (sourceRef.current !== source) return;
        sourceRef.current = null;
        cancelAnimationFrame(frameRef.current);
        setPosition(null);
      };
      const tick = () => {
        const ms = Math.min(lengthMs, offsetMs + performance.now() - startedAt);
        setPosition({ track, ms, playing: true });
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();
    },
    [stopPlayback],
  );

  /** Play or pause, SoundCloud-style: pausing keeps the position. */
  const toggle = useCallback(
    (track: Track, clip: Clip | null) => {
      if (!clip) return;
      if (position?.track === track && position.playing) {
        stopPlayback();
        setPosition({ ...position, playing: false });
        return;
      }
      play(track, clip, position?.track === track ? position.ms : 0);
    },
    [position, play, stopPlayback],
  );

  /** Shows `next` for take `seq` of sentence `id`, unless a newer take or
   *  another sentence has taken the screen since. */
  const keepHeard = useCallback((id: string, seq: number, next: Heard) => {
    if (seq !== takeSeqRef.current) return;
    heardRef.current.set(id, next);
    if (phraseIdRef.current === id) setHeard(next);
  }, []);

  /** Transcribes a take with the chosen Whisper model, in the page. */
  const whisperTake = useCallback(
    async (id: string, seq: number, clip: Clip, browserError?: string) => {
      const option = sttModelRef.current;
      const base = { text: '', final: false, error: null, by: 'whisper', model: option.label, browserError } as const;
      keepHeard(id, seq, { ...base, status: 'transcribing…' });
      try {
        const text = await transcribe(option, clip.buffer, clip.startMs, clip.endMs, (loaded, total) => {
          const pct = total ? Math.round((loaded / total) * 100) : 0;
          // A finished download is followed by several seconds of building
          // the model in memory, which reports no progress of its own.
          const status =
            pct >= 100
              ? `loading ${option.label} into memory…`
              : `downloading ${option.label} (once): ${pct}% of ${option.mb} MB`;
          keepHeard(id, seq, { ...base, status });
        });
        keepHeard(id, seq, { ...base, text, final: true });
      } catch {
        keepHeard(id, seq, { ...base, final: true, error: 'whisper' });
      }
    },
    [keepHeard],
  );

  /** Scores a take with Azure's pronunciation assessment. */
  const checkTake = useCallback(async (id: string, clip: Clip, reference: string): Promise<boolean> => {
    const seq = ++checkSeqRef.current;
    const keep = (next: Check) => {
      if (seq !== checkSeqRef.current) return;
      checksRef.current.set(id, next);
      if (phraseIdRef.current === id) setCheck(next);
    };
    keep({ status: 'pending' });
    try {
      keep({ status: 'done', result: await assess(clip.buffer, clip.startMs, clip.endMs, reference) });
      return true;
    } catch (error) {
      keep({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }, []);

  const record = useCallback(async () => {
    stopPlayback();
    setPosition(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
    } catch {
      setRecording('denied');
      return;
    }
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const input = ctx.createMediaStreamSource(stream);
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    const id = phrase.id;

    const seq = ++takeSeqRef.current;
    let resolveClip: (clip: Clip | null) => void = () => undefined;
    const clipReady = new Promise<Clip | null>(resolve => {
      resolveClip = resolve;
    });
    checksRef.current.delete(id);
    setCheck(null);
    ++checkSeqRef.current;
    const runWhisper = async (browserError?: string) => {
      const clip = await clipReady;
      if (clip) await whisperTake(id, seq, clip, browserError);
    };
    // With the pronunciation check on, its word scores are the feedback and
    // speech-to-text runs only if the check fails.
    const checking = pronCheckRef.current;
    if (checking) {
      heardRef.current.delete(id);
      setHeard(null);
      void clipReady.then(async clip => {
        if (clip && !(await checkTake(id, clip, englishText(phrase)))) await whisperTake(id, seq, clip);
      });
    }
    let text = '';
    const recognition = checking
      ? null
      : browserSttRef.current
      ? startRecognition(
          'en-US',
          t => {
            text = t;
            keepHeard(id, seq, { text, final: false, error: null, by: 'browser' });
          },
          error => {
            if (text) {
              keepHeard(id, seq, { text, final: true, error: null, by: 'browser' });
              return;
            }
            // Nothing heard, for whatever reason: Whisper gets this take.
            void runWhisper(error ?? 'no words');
          },
        )
      : null;
    if (!checking) {
      keepHeard(id, seq, { text: '', final: false, error: null, by: recognition ? 'browser' : 'whisper', status: 'listening…' });
      if (!recognition) void runWhisper();
    }

    const levels: number[] = [];
    const windowMs = (clipMs(native) || FALLBACK_WINDOW_MS) + WINDOW_TAIL_MS;
    let done = false;
    let keep = true;
    const finish = (keepTake: boolean) => {
      if (done) return;
      done = true;
      keep = keepTake;
      stopRecordingRef.current = null;
      capture.stop();
      if (keepTake) recognition?.stop();
      else recognition?.abort();
      if (recorder.state !== 'inactive') recorder.stop();
      input.disconnect();
      stream.getTracks().forEach(t => t.stop());
      setRecording('idle');
      setLive(null);
    };
    recorder.onstop = async () => {
      if (!keep || !chunks.length) {
        resolveClip(null);
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const file = URL.createObjectURL(blob);
      const old = takeFilesRef.current.get(id);
      if (old) URL.revokeObjectURL(old);
      takeFilesRef.current.set(id, file);
      if (phraseIdRef.current === id) setTakeFile(file);
      const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
      const samples = decoded.getChannelData(0);
      // Raised to the native voice's loudness for playback: raw speech from
      // a microphone sits 15-30 dB under mastered TTS audio.
      const target =
        (native && speechLevelDb(native.buffer.getChannelData(0), native.buffer.sampleRate)) ?? FALLBACK_TARGET_DB;
      const db = boostDb(speechLevelDb(samples, decoded.sampleRate), target);
      const buffer = ctx.createBuffer(1, samples.length, decoded.sampleRate);
      buffer.getChannelData(0).set(raise(samples, decoded.sampleRate, db));
      const clip = clipOf(buffer);
      takesRef.current.set(id, clip);
      setTake(clip);
      resolveClip(clip);
    };
    // Runs on the audio clock, so it keeps time (and can end the take) in a
    // background tab where animation frames stop.
    const capture = startCapture(ctx, input, {
      onFrame: (elapsed, c) => {
        const level = c.frames.length ? c.frames[c.frames.length - 1].rms : 0;
        while (levels.length < elapsed / ENVELOPE_STEP_MS) levels.push(level);
        setLive(Float32Array.from(levels));
      },
      // Not before the learner has said anything: with no count-in, a slow
      // start would otherwise read as a finished, silent take.
      shouldStop: (elapsed, c) =>
        c.frames.some(f => f.hz !== null) ? takeFinished(elapsed, c.frames, windowMs) : elapsed >= windowMs * 3,
      onStop: () => finish(true),
    });
    stopRecordingRef.current = finish;
    recorder.start();
    setRecording('recording');
    setTake(null);
  }, [native, phrase, stopPlayback, keepHeard, whisperTake, checkTake]);

  /** Moves to the neighbouring sentence, wrapping at the ends. */
  const step = useCallback((delta: number) => {
    setPhrase(current => {
      const i = ENGLISH_PHRASES.findIndex(p => p.id === current.id);
      return ENGLISH_PHRASES[(i + delta + ENGLISH_PHRASES.length) % ENGLISH_PHRASES.length];
    });
  }, []);

  // The Thai tab's keys: Space records (and here also stops a take), S plays
  // the native voice, R replays the take, A/D step sentences. While
  // recording only Space works.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'A' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (recording === 'recording') stopRecordingRef.current?.(true);
        else void record();
      } else if (recording === 'recording') {
        return;
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        toggle('native', native);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        toggle('you', take);
      } else if (e.code === 'KeyD' || e.code === 'KeyA') {
        e.preventDefault();
        step(e.code === 'KeyD' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recording, record, toggle, native, take, step]);

  const nativeMs = clipMs(native);
  const takeMs = clipMs(take);
  const liveMs = live ? live.length * ENVELOPE_STEP_MS : 0;
  const windowMs = Math.max(nativeMs || FALLBACK_WINDOW_MS, takeMs, liveMs);
  const positionOf = (track: Track) => (position?.track === track ? position.ms : null);
  const isPlaying = (track: Track) => position?.track === track && position.playing;

  return (
    <div className={styles.page}>
      <div className={styles.work}>
      <div className={styles.poster} aria-live="polite">
        <p className={styles.sentence}>
          {phrase.words.map((w, i) => (
            <span key={i} className={styles.word}>
              <span className={styles.wordText}>{w.text}</span>
              <span className={styles.wordIpa}>{w.ipa}</span>
            </span>
          ))}
        </p>
        <p className={styles.focus}>{phrase.focus}</p>
      </div>

      <section className={styles.track}>
        <button
          type="button"
          className={styles.play}
          onClick={() => toggle('native', native)}
          disabled={!native}
          aria-label={isPlaying('native') ? 'Pause the native voice' : 'Play the native voice'}
        >
          {isPlaying('native') ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className={styles.trackMain}>
          <div className={styles.trackHead}>
            <span className={styles.trackLabel}>Native · Google Translate</span>
            <span className={styles.time}>
              {positionOf('native') !== null && `${seconds(positionOf('native')!)} / `}
              {native ? seconds(nativeMs) : ''}
            </span>
          </div>
          <Waveform
            envelope={native?.envelope ?? null}
            label="Loudness"
            windowMs={windowMs}
            progressMs={positionOf('native')}
            onSeek={ms => native && play('native', native, ms)}
            emptyText={nativeStatus === 'failed' ? 'The native voice could not be loaded.' : 'Loading the native voice…'}
          />
          <FormantStrip
            spectrogram={native?.spectrogram ?? null}
            windowMs={windowMs}
            progressMs={positionOf('native')}
            onSeek={ms => native && play('native', native, ms)}
          />
        </div>
      </section>

      <section className={styles.track}>
        <button
          type="button"
          className={styles.play}
          onClick={() => toggle('you', take)}
          disabled={!take || recording === 'recording'}
          aria-label={isPlaying('you') ? 'Pause your take' : 'Play your take'}
        >
          {isPlaying('you') ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className={styles.trackMain}>
          <div className={styles.trackHead}>
            <span className={styles.trackLabel}>You</span>
            <span className={styles.time}>
              {recording === 'recording'
                ? seconds(liveMs)
                : take && `${positionOf('you') !== null ? `${seconds(positionOf('you')!)} / ` : ''}${seconds(takeMs)}`}
            </span>
            {takeFile && recording !== 'recording' && (
              <a className={styles.save} href={takeFile} download={`take-${phrase.id}.webm`} title="Save the recording as made">
                ⤓ Save
              </a>
            )}
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconFirst} ${drawer === 'help' ? styles.iconOn : ''}`}
              onClick={() => setDrawer(d => (d === 'help' ? null : 'help'))}
              aria-expanded={drawer === 'help'}
              aria-label="How to compare"
              title="How to compare"
            >
              ?
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${drawer === 'settings' ? styles.iconOn : ''}`}
              onClick={() => setDrawer(d => (d === 'settings' ? null : 'settings'))}
              aria-expanded={drawer === 'settings'}
              aria-label="Speech recognition settings"
              title="Speech recognition settings"
            >
              <GearIcon />
            </button>
            <button
              type="button"
              className={`${styles.record} ${recording === 'recording' ? styles.recordOn : ''}`}
              onClick={() => (recording === 'recording' ? stopRecordingRef.current?.(true) : void record())}
            >
              <span className={styles.recordDot} aria-hidden />
              {recording === 'recording' ? 'Stop' : take ? 'Record again' : 'Record'}
            </button>
          </div>
          {drawer === 'help' && (
            <p className={styles.drawer}>
              <b>How to compare.</b> Your loudness bars should rise and fall in the same rhythm as the native
              voice’s. In the spectrogram, the dark horizontal bands show which vowel was said: yours should sit at
              the same heights, and bend where the native ones bend (a gliding vowel, like the one in “low”).
            </p>
          )}
          {drawer === 'settings' && (
            <div className={styles.drawer}>
            <SttSettings
              model={sttModel}
              onModel={option => {
                setWhisperChoice(option);
                setSttModel(option);
              }}
              browserStt={browserStt}
              onBrowserStt={on => {
                writeBrowserStt(on);
                setBrowserStt(on);
              }}
              revision={heard?.final ? heard : null}
              pronCheck={pronCheck}
              onPronCheck={on => {
                writeFlag(PRON_CHECK_KEY, on);
                setPronCheck(on);
              }}
            />
            </div>
          )}
          <Waveform
            envelope={recording === 'recording' ? live : (take?.envelope ?? null)}
            label="Loudness"
            windowMs={windowMs}
            progressMs={positionOf('you')}
            onSeek={ms => take && play('you', take, ms)}
            minScale={TAKE_MIN_SCALE}
            emptyText={
              recording === 'denied'
                ? 'Microphone access was refused. Allow it in the browser to record.'
                : 'Press Record and say the sentence. It stops by itself when you finish.'
            }
          />
          {take && recording !== 'recording' && (
            <FormantStrip
              spectrogram={take.spectrogram}
              windowMs={windowMs}
              progressMs={positionOf('you')}
              onSeek={ms => play('you', take, ms)}
            />
          )}
          {check && (
            <PronunciationResult
              check={check}
              onAgain={
                take && recording !== 'recording' && check.status !== 'pending'
                  ? () => void checkTake(phrase.id, take, englishText(phrase))
                  : undefined
              }
            />
          )}
          {!check && pronCheck && take && recording !== 'recording' && (
            <button type="button" className={styles.again} onClick={() => void checkTake(phrase.id, take, englishText(phrase))}>
              Check pronunciation
            </button>
          )}
          {heard && (!check || check.status === 'error') && (
            <HeardLine
              phrase={phrase}
              heard={heard}
              onAgain={
                take && recording !== 'recording' && heard.final
                  ? () => void whisperTake(phrase.id, ++takeSeqRef.current, take)
                  : undefined
              }
              againLabel={`Transcribe again with ${sttModel.label}`}
            />
          )}
        </div>
      </section>

      <p className={styles.keys}>
        <kbd>Space</kbd> record / stop · <kbd>S</kbd> listen · <kbd>R</kbd> replay you · <kbd>A</kbd>
        <kbd>D</kbd> sentence
      </p>
      </div>

      <aside className={styles.rail} aria-label="Sentences">
        <div className={styles.railHead}>
          <b>Sentences</b>
          <span className={styles.railKeys}>
            <kbd>A</kbd> <kbd>D</kbd>
          </span>
        </div>
      <ol className={styles.list}>
        {ENGLISH_PHRASES.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              className={`${styles.item} ${p.id === phrase.id ? styles.itemActive : ''}`}
              onClick={e => {
                setPhrase(p);
                // A mouse click leaves the focus on this button, where the
                // hotkeys are ignored so Space can still press a focused
                // button; keyboard users keep their focus.
                if (e.detail > 0) e.currentTarget.blur();
              }}
              aria-current={p.id === phrase.id ? 'true' : undefined}
            >
              <span className={styles.itemNo}>{i + 1}</span>
              <span className={styles.itemBody}>
                <span className={styles.itemText}>{englishText(p)}</span>
                <span className={styles.itemIpa}>{englishIpa(p)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      </aside>
    </div>
  );
}

const RECOGNITION_ERRORS: Record<string, string> = {
  whisper:
    'Whisper could not transcribe the take: the model failed to download or to start. A CPU model in the speech recognition settings avoids the GPU.',
};

/** What the recogniser heard, each word marked by whether it lines up with
 *  the sentence, and the sentence's words it never heard. */
function HeardLine({
  phrase,
  heard,
  onAgain,
  againLabel,
}: {
  phrase: EnglishPhrase;
  heard: Heard;
  /** Runs the take through Whisper again; absent while that cannot be done. */
  onAgain?: () => void;
  againLabel: string;
}) {
  const target = phrase.words.map(w => w.text);
  const said = words(heard.text);
  const match = matchWords(target, said);
  const missed = target.filter((_, i) => !match.target[i]);
  if (heard.error) {
    return (
      <p className={styles.heard}>
        {RECOGNITION_ERRORS[heard.error] ?? `Speech recognition failed (${heard.error}).`}
        {onAgain && (
          <button type="button" className={styles.again} onClick={onAgain}>
            {againLabel}
          </button>
        )}
      </p>
    );
  }
  return (
    <div className={styles.heard} aria-live="polite">
      <span className={styles.heardLabel}>Heard</span>
      {said.length === 0 ? (
        <span className={styles.heardWaiting}>{heard.final ? 'nothing' : (heard.status ?? 'listening…')}</span>
      ) : (
        <span>
          {said.map((w, i) => (
            <span key={i} className={heard.final ? (match.heard[i] ? styles.hit : styles.miss) : undefined}>
              {w}{' '}
            </span>
          ))}
        </span>
      )}
      {heard.final && said.length > 0 && (
        <span className={styles.heardScore}>
          {target.length - missed.length}/{target.length} words
          {missed.length > 0 && <> · missed: {missed.map(w => w.replace(/[.,!?]$/, '')).join(', ')}</>}
        </span>
      )}
      <span className={styles.heardBy}>
        {heard.by === 'whisper' ? `Whisper ${heard.model ?? ''}, on this device` : 'Browser speech service'}
        {heard.browserError && ` (browser service failed: ${heard.browserError})`}
      </span>
      {onAgain && (
        <button type="button" className={styles.again} onClick={onAgain}>
          {againLabel}
        </button>
      )}
    </div>
  );
}

/** Which recogniser a take goes to, and which Whisper model. */
function SttSettings({
  model,
  onModel,
  browserStt,
  onBrowserStt,
  revision,
  pronCheck,
  onPronCheck,
}: {
  model: WhisperOption;
  onModel: (option: WhisperOption) => void;
  browserStt: boolean;
  onBrowserStt: (on: boolean) => void;
  /** Changes when a transcript finishes, which may have downloaded a model. */
  revision: unknown;
  pronCheck: boolean;
  onPronCheck: (on: boolean) => void;
}) {
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [check, setCheck] = useState(0);
  const [gpu, setGpu] = useState(true);
  useEffect(() => {
    void hasWebGpu().then(setGpu);
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all(WHISPER_OPTIONS.map(async o => [o.id, await isDownloaded(o).catch(() => false)] as const)).then(
      entries => !cancelled && setDownloaded(Object.fromEntries(entries)),
    );
    return () => {
      cancelled = true;
    };
  }, [revision, check]);

  return (
    <div>
      <p className={styles.settingsTitle}>Speech recognition</p>
      <label className={styles.browserStt}>
        <input type="checkbox" checked={browserStt} onChange={e => onBrowserStt(e.target.checked)} />
        <span>
          Try the browser’s own speech service first. Chrome, Edge and Safari have one (Chrome and Edge send the
          audio to their servers); when it fails or hears nothing, Whisper takes over for that take.
        </span>
      </label>
      <div className={styles.options} role="radiogroup" aria-label="Whisper model">
        {WHISPER_OPTIONS.map(o => (
          <label
            key={o.id}
            className={`${styles.option} ${o.id === model.id ? styles.optionOn : ''} ${!gpu && needsGpu(o) ? styles.optionOff : ''}`}
          >
            <input
              type="radio"
              name="whisper-model"
              checked={o.id === model.id}
              disabled={!gpu && needsGpu(o)}
              onChange={() => onModel(o)}
            />
            <span className={styles.optionName}>{o.label}</span>
            <span className={styles.optionNote}>
              {o.mb} MB · {o.note}
            </span>
            <span className={styles.optionState}>
              {downloaded[o.id] ? (
                <>
                  downloaded
                  <button
                    type="button"
                    className={styles.optionDelete}
                    onClick={e => {
                      e.preventDefault();
                      void deleteDownload(o).then(() => setCheck(c => c + 1));
                    }}
                  >
                    Delete
                  </button>
                </>
              ) : !gpu && needsGpu(o) ? (
                'this browser has no WebGPU'
              ) : (
                'downloads on first use'
              )}
            </span>
          </label>
        ))}
      </div>
      <label className={styles.browserStt}>
        <input type="checkbox" checked={pronCheck} onChange={e => onPronCheck(e.target.checked)} />
        <span>
          <b>Pronunciation check (test).</b> Scores each take against the sentence, word by word and sound by sound,
          with Azure’s pronunciation assessment. Sends the take to Microsoft and needs an Azure Speech key on the
          server side (see worker/tts-proxy/README.md).
        </span>
      </label>
      <p className={styles.settingsNote}>
        Whisper runs inside this page: free, no account, and the audio stays on this device. Models download once
        from Hugging Face and stay in the browser’s cache.
      </p>
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-2.5a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
    </svg>
  );
}
