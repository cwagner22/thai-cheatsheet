import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PHRASE_GROUPS, ipaOf, ipaOfWord, thaiOf, thaiOfWord, type Phrase, type PhraseGroup } from '../data/phrases';
import {
  CUSTOM_GROUP,
  buildCustom,
  draftOf,
  draftSyllables,
  isCustom,
  loadCustom,
  saveCustom,
  toneFromSpelling,
  type CustomDraft,
} from '../lib/customPhrases';
import type { ToneName } from '../lib/toneLookup';
import { TONE_COLOR } from '../data/tones';
import { startCapture, type CaptureHandle, type Frame } from '../lib/capture';
import { SPEECH_SHARE } from '../lib/align';
import {
  buildSegments,
  compareToReference,
  registerHz,
  syllableTone,
  textbookMismatches,
  type Comparison,
  type SyllableVerdict,
} from '../lib/contour';
import { cachedReference, captureReference, playReference, type Playback, type Reference } from '../lib/reference';
import { PhraseScope, type ScopeData } from '../components/PhraseScope';
import scopeStyles from '../components/PhraseScope.module.css';
import { speakThai } from '../lib/speak';
import { readRoute, writeRoute } from '../lib/route';
import styles from './SpeakingTab.module.css';

const COUNT_IN_STEPS = 3;
const COUNT_IN_MS = 700;

/** Time axis when no reference has been heard yet, and the headroom added to
 *  a reference's length once one has: room to start late and to run on. */
const FALLBACK_WINDOW_MS = 2400;
const WINDOW_TAIL_MS = 500;
/** Margins around the learner's speech once the finished take is fitted to
 *  the panel. */
const FIT_LEAD_MS = 150;
const FIT_TAIL_MS = 250;

/** A take may overrun the time axis while the learner is still making
 *  sound, so the final particle is not cut off; capped so a noisy room
 *  cannot keep the microphone open. */
const OVERRUN_LIMIT = 1.8;
const TRAILING_SILENCE_MS = 260;

type Status = 'idle' | 'listening' | 'counting' | 'recording' | 'done' | 'denied';
type ReferenceStatus = 'none' | 'loading' | 'playing' | 'ready' | 'failed';
/** Which panel a playhead is running across, if any. */
type Playing = 'native' | 'you' | null;

const BUILT_IN = PHRASE_GROUPS.flatMap(g => g.phrases);
/** The sentence's type size at the top of the page, in rem: full size for a
 *  short sentence, scaled down as far as this to keep a long one on one line. */
const SENTENCE_MAX_REM = 3.4;
const SENTENCE_MIN_REM = 1.5;
const TONE_CYCLE: ToneName[] = ['Mid', 'Low', 'Falling', 'High', 'Rising'];
const LAST_PHRASE_KEY = 'speaking.phrase';

const NATIVE_LABEL = 'Native · Google Translate';
const YOU_LABEL = 'You';

function emptyScope(windowMs: number, label: string, emptyText: string, gain: number): ScopeData {
  return { windowMs, spectra: [], segments: [], ghost: null, elapsedMs: null, gain, label, emptyText, syllables: null, showTextbook: true };
}

export function SpeakingTab() {
  const [custom, setCustom] = useState<Phrase[]>(() => loadCustom());
  const all = useMemo(() => [...BUILT_IN, ...custom], [custom]);
  const [editing, setEditing] = useState<{ id: string | null; draft: CustomDraft } | null>(null);
  const [phrase, setPhrase] = useState<Phrase>(() => {
    const known = [...BUILT_IN, ...loadCustom()];
    let wanted = readRoute().sub;
    if (!wanted) {
      try {
        wanted = window.localStorage.getItem(LAST_PHRASE_KEY) ?? undefined;
      } catch {
        wanted = undefined;
      }
    }
    return known.find(p => p.id === wanted) ?? known[0];
  });
  // The address carries the tab only; the sentence is remembered here so a
  // reload lands on it without a URL to trim.
  useEffect(() => {
    writeRoute('speaking');
    try {
      window.localStorage.setItem(LAST_PHRASE_KEY, phrase.id);
    } catch {
      // Storage may be unavailable; the sentence is simply not remembered.
    }
  }, [phrase]);
  const pick = useCallback(
    (id: string) => {
      const next = all.find(p => p.id === id);
      if (next) setPhrase(current => (current.id === next.id ? current : next));
    },
    [all],
  );
  /** Moves to the neighbouring sentence, wrapping at the ends. */
  const step = useCallback(
    (delta: number) => {
      const i = all.findIndex(p => p.id === phrase.id);
      setPhrase(all[(i + delta + all.length) % all.length]);
    },
    [all, phrase],
  );

  /** Saves the sentence being edited. An edited sentence gets a new id, so
   *  anything cached under the old one — the native voice, the last take —
   *  is simply left behind. */
  const saveEdit = useCallback(
    (draft: CustomDraft) => {
      if (!editing) return;
      const built = buildCustom(draft);
      if (!built) return;
      const next = editing.id ? custom.map(p => (p.id === editing.id ? built : p)) : [...custom, built];
      setCustom(next);
      saveCustom(next);
      setEditing(null);
      setPhrase(built);
    },
    [editing, custom],
  );
  const deleteEdit = useCallback(() => {
    if (!editing?.id) return;
    const next = custom.filter(p => p.id !== editing.id);
    setCustom(next);
    saveCustom(next);
    setEditing(null);
    if (phrase.id === editing.id) setPhrase(BUILT_IN[0]);
  }, [editing, custom, phrase]);
  // A hash typed or pasted while the tab is open selects that sentence.
  useEffect(() => {
    const onHash = () => {
      const wanted = readRoute().sub;
      const next = all.find(p => p.id === wanted);
      if (next) setPhrase(current => (current.id === next.id ? current : next));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [all]);
  const [status, setStatus] = useState<Status>('idle');
  const [refStatus, setRefStatus] = useState<ReferenceStatus>('none');
  const [countIn, setCountIn] = useState(COUNT_IN_STEPS);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [spokenWord, setSpokenWord] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const [gain, setGain] = useState(1.8);
  const [showTextbook, setShowTextbook] = useState(true);
  const [playing, setPlaying] = useState<Playing>(null);
  /** Whether the native voice has been heard in full for the current
   *  sentence. The first take of a sentence plays it first; later takes go
   *  straight to the count-in. */
  const [heard, setHeard] = useState(false);
  const [mismatches, setMismatches] = useState<string[]>([]);
  const heardRef = useRef<Set<string>>(new Set());

  const audioCtxRef = useRef<AudioContext | null>(null);
  const referenceRef = useRef<Reference | null>(null);
  /** The reference load in flight, if any; two captures of the same audio
   *  racing each other leave the top panel half overwritten. */
  const loadingRef = useRef<Promise<Reference | null> | null>(null);
  const captureRef = useRef<CaptureHandle | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timersRef = useRef<number[]>([]);
  /** What is being played back, so a phrase change or a new playback can
   *  silence it and take its playhead down. */
  const playbackRef = useRef<{ frame: number; stop: () => void } | null>(null);
  const gainRef = useRef(gain);
  gainRef.current = gain;
  const textbookRef = useRef(showTextbook);
  textbookRef.current = showTextbook;

  const nativeScope = useRef<ScopeData>(
    emptyScope(FALLBACK_WINDOW_MS, NATIVE_LABEL, 'fetching the native voice…', 1.8),
  );
  const youScope = useRef<ScopeData>(
    emptyScope(FALLBACK_WINDOW_MS, YOU_LABEL, 'your voice appears here', 1.8),
  );
  const redraw = () => setRevision(r => r + 1);

  const ensureCtx = () => {
    const ctx =
      audioCtxRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    return ctx;
  };

  const windowFor = (reference: Reference | null) =>
    reference ? reference.durationMs + WINDOW_TAIL_MS : FALLBACK_WINDOW_MS;

  const stopPlayback = useCallback(() => {
    const current = playbackRef.current;
    if (!current) return;
    playbackRef.current = null;
    cancelAnimationFrame(current.frame);
    current.stop();
    nativeScope.current = { ...nativeScope.current, elapsedMs: null };
    youScope.current = { ...youScope.current, elapsedMs: null };
    setPlaying(null);
    redraw();
  }, []);

  /** Runs a playhead across `scope` while `positionMs` advances, on the
   *  scope's own time axis. The panel is marked live meanwhile, so it
   *  repaints itself from the ref each frame. */
  const runPlayhead = useCallback(
    (which: Exclude<Playing, null>, positionMs: () => number, durationMs: number, stop: () => void) => {
      stopPlayback();
      const scope = which === 'native' ? nativeScope : youScope;
      const tick = () => {
        const ms = positionMs();
        if (ms >= durationMs) {
          stopPlayback();
          return;
        }
        scope.current = { ...scope.current, elapsedMs: ms };
        const current = playbackRef.current;
        if (current) current.frame = requestAnimationFrame(tick);
      };
      playbackRef.current = { frame: requestAnimationFrame(tick), stop };
      setPlaying(which);
    },
    [stopPlayback],
  );

  /** Shows a finished reference on the top panel and widens both axes to it. */
  const showReference = useCallback((reference: Reference) => {
    setMismatches(reference.syllables ? textbookMismatches(reference.frames, reference.syllables) : []);
    const windowMs = windowFor(reference);
    nativeScope.current = {
      windowMs,
      spectra: reference.spectra,
      segments: buildSegments(reference.frames, registerHz(reference.frames)),
      ghost: null,
      elapsedMs: null,
      gain: gainRef.current,
      label: NATIVE_LABEL,
      emptyText: '',
      syllables: reference.syllables,
      showTextbook: textbookRef.current,
    };
    youScope.current = { ...youScope.current, windowMs, syllables: reference.syllables, showTextbook: textbookRef.current };
    redraw();
  }, []);

  const releaseAll = useCallback(() => {
    stopPlayback();
    captureRef.current?.stop();
    captureRef.current = null;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, [stopPlayback]);

  useEffect(() => () => releaseAll(), [releaseAll]);

  // Changing phrase mid-take would otherwise compare the new phrase against
  // audio recorded for the old one.
  useEffect(() => {
    releaseAll();
    setStatus('idle');
    setComparison(null);
    setTakeUrl(url => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    loadingRef.current = null;
    setHeard(heardRef.current.has(phrase.id));
    setMismatches([]);
    const cached = cachedReference(phrase.id);
    referenceRef.current = cached;
    youScope.current = emptyScope(windowFor(cached), YOU_LABEL, 'your voice appears here', gainRef.current);
    if (cached) {
      setRefStatus('ready');
      showReference(cached);
    } else {
      setRefStatus('none');
      nativeScope.current = emptyScope(
        FALLBACK_WINDOW_MS, NATIVE_LABEL, 'fetching the native voice…', gainRef.current,
      );
      redraw();
    }
  }, [phrase, releaseAll, showReference]);

  /** Fetches, plays (or not) and captures the native voice, drawing it live. */
  const loadReferenceNow = useCallback(
    async (audible: boolean): Promise<Reference | null> => {
      const ctx = ensureCtx();
      setRefStatus('loading');
      nativeScope.current = emptyScope(FALLBACK_WINDOW_MS, NATIVE_LABEL, 'fetching the native voice…', gainRef.current);
      redraw();
      try {
        const { done, handle } = captureReference(ctx, phrase, {
          audible,
          onFrame: (elapsed, capture) => {
            const voiced = capture.frames.filter(f => f.hz !== null);
            nativeScope.current = {
              ...nativeScope.current,
              spectra: capture.spectra,
              segments: voiced.length >= 8 ? buildSegments(capture.frames, registerHz(capture.frames)) : [],
              elapsedMs: elapsed,
              emptyText: '',
            };
          },
        });
        void handle.then(() => setRefStatus(audible ? 'playing' : 'loading'));
        const reference = await done;
        referenceRef.current = reference;
        setRefStatus('ready');
        showReference(reference);
        return reference;
      } catch {
        setRefStatus('failed');
        nativeScope.current = emptyScope(
          FALLBACK_WINDOW_MS, NATIVE_LABEL, 'native voice unavailable here', gainRef.current,
        );
        redraw();
        return null;
      }
    },
    [phrase, showReference],
  );

  const loadReference = useCallback(
    (audible: boolean): Promise<Reference | null> => {
      if (loadingRef.current) return loadingRef.current;
      const run = loadReferenceNow(audible).finally(() => {
        loadingRef.current = null;
      });
      loadingRef.current = run;
      return run;
    },
    [loadReferenceNow],
  );

  // The native voice is fetched as soon as a sentence is chosen. The tab is
  // only reached by a click, which is the user activation the audio graph
  // needs; a failure is not retried until the sentence changes.
  useEffect(() => {
    if (!cachedReference(phrase.id)) void loadReference(false);
  }, [phrase, loadReference]);

  /** Plays the native voice with a playhead; resolves when it has ended or
   *  been cut off. */
  const playNative = useCallback((): Promise<void> => {
    const reference = referenceRef.current;
    if (!reference) return loadReference(true).then(() => undefined);
    const ctx = ensureCtx();
    const playback: Playback = playReference(ctx, reference);
    return new Promise(resolve => {
      playback.source.onended = () => {
        heardRef.current.add(reference.phraseId);
        setHeard(true);
        resolve();
      };
      runPlayhead(
        'native',
        () => (ctx.currentTime - playback.startedAt) * 1000,
        playback.durationMs,
        () => {
          try {
            playback.source.stop();
          } catch {
            // Already ended.
          }
        },
      );
    });
  }, [loadReference, runPlayhead]);

  const listen = useCallback(() => {
    void playNative();
  }, [playNative]);

  /** Plays the recorded take with a playhead over the learner's panel; the
   *  recorder and the capture start together, so their clocks agree. */
  const listenToTake = useCallback(() => {
    if (!takeUrl) return;
    const audio = new Audio(takeUrl);
    void audio.play();
    runPlayhead(
      'you',
      () => audio.currentTime * 1000,
      Number.POSITIVE_INFINITY,
      () => audio.pause(),
    );
    audio.onended = () => stopPlayback();
  }, [takeUrl, runPlayhead, stopPlayback]);

  const finish = useCallback(() => {
    const handle = captureRef.current;
    captureRef.current = null;
    handle?.stop();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    const frames: Frame[] = handle?.capture.frames ?? [];
    const reference = referenceRef.current;
    const result = reference ? compareToReference(reference.frames, frames, reference.syllables) : null;
    setComparison(result);
    setStatus('done');

    if (result && handle) {
      // The take is shown as spoken, on its own time axis; the native pitch
      // and syllable slots are carried onto it through the alignment's
      // inverse.
      const peak = Math.max(...frames.map(f => f.rms)) || 1;
      const speech = frames.filter(f => f.rms >= SPEECH_SHARE * peak);
      const start = speech.length ? speech[0].t : 0;
      const end = speech.length ? speech[speech.length - 1].t : frames[frames.length - 1]?.t ?? 0;
      const originMs = Math.max(0, start - FIT_LEAD_MS);
      youScope.current = {
        ...youScope.current,
        originMs,
        windowMs: Math.max(FALLBACK_WINDOW_MS / 2, end + FIT_TAIL_MS - originMs),
        spectra: handle.capture.spectra,
        segments: result.learnerSegmentsRaw,
        ghost: result.referenceSegments.map(seg => seg.map(p => ({ ms: result.inverseTime(p.ms), st: p.st }))),
        syllables: reference?.syllables
          ? reference.syllables.map(sp => ({
              ...sp,
              startMs: result.inverseTime(sp.startMs),
              endMs: result.inverseTime(sp.endMs),
            }))
          : null,
        elapsedMs: null,
        prompter: false,
      };
    } else if (handle) {
      const voiced = frames.filter(f => f.hz !== null);
      youScope.current = {
        ...youScope.current,
        segments: voiced.length >= 8 ? buildSegments(frames, registerHz(frames)) : [],
        elapsedMs: null,
        prompter: false,
      };
    }
    redraw();
  }, []);

  const record = useCallback(async () => {
    setComparison(null);
    setTakeUrl(url => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });

    if (!referenceRef.current && refStatus !== 'failed') {
      await loadReference(false);
    }
    // The first take of a sentence is preceded by the native voice, so the
    // learner has the model in their ear; a retry goes straight to the
    // count-in. A sentence change during playback abandons the take.
    const reference = referenceRef.current;
    if (reference && !heardRef.current.has(reference.phraseId)) {
      setStatus('listening');
      await playNative();
      if (referenceRef.current?.phraseId !== reference.phraseId) return;
    }
    const windowMs = windowFor(referenceRef.current);
    const target = referenceRef.current;
    youScope.current = {
      ...emptyScope(windowMs, YOU_LABEL, '', gainRef.current),
      originMs: 0,
      syllables: target?.syllables ?? null,
      showTextbook: textbookRef.current,
      // The native pitch and the sentence are on the panel before the first
      // sound: both time axes start at zero, so the reference's own timing
      // is this panel's timing until the take is fitted afterwards.
      ghost: target ? buildSegments(target.frames, registerHz(target.frames)) : null,
      prompter: !!target?.syllables,
    };
    redraw();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // The reference visualiser's constraints. The browser's noise
          // suppression is what gives the black background between words.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
    } catch {
      setStatus('denied');
      return;
    }
    streamRef.current = stream;
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    const chunks: BlobPart[] = [];
    try {
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        if (chunks.length) setTakeUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
      };
      recorderRef.current = recorder;
    } catch {
      // Playback of the take is a bonus; the analysis does not need it.
      recorderRef.current = null;
    }

    // Count-in, so the learner can start on the beat the reference starts on
    // and the live line means something before it is stretched into place.
    setStatus('counting');
    for (let step = 0; step < COUNT_IN_STEPS; step++) {
      timersRef.current.push(
        window.setTimeout(() => setCountIn(COUNT_IN_STEPS - step), step * COUNT_IN_MS),
      );
    }
    timersRef.current.push(
      window.setTimeout(() => {
        setStatus('recording');
        // Started with the capture so the take's clock is the panel's.
        recorderRef.current?.start();
        const source = ctx.createMediaStreamSource(stream);
        captureRef.current = startCapture(ctx, source, {
          onFrame: (elapsed, capture) => {
            const voiced = capture.frames.filter(f => f.hz !== null);
            youScope.current = {
              ...youScope.current,
              spectra: capture.spectra,
              segments: voiced.length >= 8 ? buildSegments(capture.frames, registerHz(capture.frames)) : [],
              elapsedMs: elapsed,
              gain: gainRef.current,
            };
          },
          shouldStop: (elapsed, capture) => {
            if (elapsed < windowMs) return false;
            const stillSpeaking = capture.frames.some(
              f => f.hz !== null && f.t > elapsed - TRAILING_SILENCE_MS,
            );
            return !stillSpeaking || elapsed >= windowMs * OVERRUN_LIMIT;
          },
          onStop: () => {
            // Auto-stop from inside the loop; a manual Stop already ran finish.
            if (captureRef.current) finish();
          },
        });
      }, COUNT_IN_STEPS * COUNT_IN_MS),
    );
  }, [refStatus, loadReference, playNative, finish]);

  const live = status === 'recording';
  const busy =
    status === 'listening' ||
    status === 'counting' ||
    status === 'recording' ||
    refStatus === 'loading' ||
    refStatus === 'playing' ||
    playing !== null;

  // Space records (or records again), L plays the native voice.
  useEffect(() => {
    if (busy) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'A' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        void record();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        listen();
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        step(e.code === 'ArrowRight' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, record, listen, step]);

  const onToggleTextbook = () => {
    const next = !showTextbook;
    setShowTextbook(next);
    nativeScope.current = { ...nativeScope.current, showTextbook: next };
    youScope.current = { ...youScope.current, showTextbook: next };
    redraw();
  };

  const onGain = (g: number) => {
    setGain(g);
    // Both scopes read from refs, not props, so the value has to be written
    // there too — bumping the revision alone redraws with the old gain.
    nativeScope.current = { ...nativeScope.current, gain: g };
    youScope.current = { ...youScope.current, gain: g };
    redraw();
  };

  return (
    <div id="tab-speaking" className={styles.page}>
      <div className={styles.work}>
      <PracticePanel
        phrase={phrase}
        status={status}
        refStatus={refStatus}
        countIn={countIn}
        comparison={comparison}
        takeUrl={takeUrl}
        spokenWord={spokenWord}
        onSpokenWord={setSpokenWord}
        nativeScope={nativeScope}
        youScope={youScope}
        revision={revision}
        heard={heard}
        mismatches={mismatches}
        live={live || playing === 'you'}
        nativeLive={refStatus === 'loading' || refStatus === 'playing' || playing === 'native'}
        busy={busy}
        playing={playing}
        onListen={listen}
        onListenToTake={listenToTake}
        onRecord={record}
        onStop={finish}
        gain={gain}
        onGain={onGain}
        showTextbook={showTextbook}
        onToggleTextbook={onToggleTextbook}
      />

      </div>
      <SentenceRail
        groups={[...PHRASE_GROUPS, { ...CUSTOM_GROUP, phrases: custom }]}
        currentId={phrase.id}
        editing={editing}
        onPick={pick}
        onAdd={() => setEditing({ id: null, draft: { thai: '', meaning: '', ipa: '', tones: {} } })}
        onEdit={p => setEditing({ id: p.id, draft: draftOf(p) })}
        onSave={saveEdit}
        onDelete={deleteEdit}
        onCancel={() => setEditing(null)}
      />
    </div>
  );
}

function PracticePanel({
  phrase,
  status,
  refStatus,
  countIn,
  comparison,
  takeUrl,
  spokenWord,
  onSpokenWord,
  nativeScope,
  youScope,
  revision,
  live,
  nativeLive,
  busy,
  playing,
  heard,
  mismatches,
  onListen,
  onListenToTake,
  onRecord,
  onStop,
  gain,
  onGain,
  showTextbook,
  onToggleTextbook,
}: {
  phrase: Phrase;
  status: Status;
  refStatus: ReferenceStatus;
  countIn: number;
  comparison: Comparison | null;
  takeUrl: string | null;
  spokenWord: number | null;
  onSpokenWord: (i: number | null) => void;
  nativeScope: { current: ScopeData };
  youScope: { current: ScopeData };
  revision: number;
  live: boolean;
  nativeLive: boolean;
  busy: boolean;
  playing: Playing;
  heard: boolean;
  /** Native syllables whose movement contradicts their tone's direction. */
  mismatches: string[];
  onListen: () => void;
  onListenToTake: () => void;
  onRecord: () => void;
  onStop: () => void;
  gain: number;
  onGain: (g: number) => void;
  showTextbook: boolean;
  onToggleTextbook: () => void;
}) {
  const speaking = status === 'listening' || status === 'counting' || status === 'recording';
  const sentenceRef = useRef<HTMLParagraphElement | null>(null);
  // The sentence is one line however long it is: the type is scaled down
  // from its full size until it fits the column. Re-run on resize and when
  // the sentence or the layout mode changes.
  useLayoutEffect(() => {
    const el = sentenceRef.current;
    if (!el) return;
    const fit = () => {
      if (speaking) {
        el.style.fontSize = '';
        return;
      }
      el.style.fontSize = `${SENTENCE_MAX_REM}rem`;
      const available = el.clientWidth;
      const needed = el.scrollWidth;
      if (needed > available && needed > 0) {
        el.style.fontSize = `${Math.max(SENTENCE_MIN_REM, (SENTENCE_MAX_REM * available) / needed - 0.05)}rem`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [phrase, speaking]);

  return (
    <div className={styles.panel}>
      <header className={`${styles.poster} ${speaking ? styles.posterLive : ''}`}>
        <div className={styles.posterText}>
          <p className={styles.sentence} ref={sentenceRef}>
            {phrase.words.map((word, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.wordBtn} ${spokenWord === i ? styles.wordSpeaking : ''}`}
                onClick={() => speakThai(thaiOfWord(word))}
                title={`/${ipaOfWord(word)}/ · ${word.gloss}`}
              >
                {word.syllables.map((syl, j) => (
                  <span key={j} style={{ color: TONE_COLOR[syllableTone(syl)] }}>{syl.thai}</span>
                ))}
              </button>
            ))}
          </p>
          <div className={styles.under}>
            {ipaOf(phrase).trim() && <span className={styles.posterIpa}>/{ipaOf(phrase)}/</span>}
            <span className={styles.gloss}>{phrase.meaning}</span>
            {!speaking && <span className={styles.tap}>· tap a word to hear it</span>}
          </div>
        </div>
        <div className={styles.act}>
          {status === 'recording' ? (
            <button type="button" className={`${styles.recBtn} ${styles.stopping}`} onClick={onStop}>
              <span className={styles.recDot} />Stop
            </button>
          ) : (
            <button type="button" className={styles.recBtn} onClick={onRecord} disabled={busy}>
              <span className={styles.recDot} />
              {status === 'listening'
                ? 'Listen…'
                : status === 'counting'
                  ? 'Get ready…'
                  : status === 'done'
                    ? 'Try again'
                    : heard
                      ? 'Record'
                      : 'Listen, then record'}
            </button>
          )}
          <span className={styles.keys}>
            <kbd>Space</kbd> records · <kbd>L</kbd> native voice · <kbd>←</kbd> <kbd>→</kbd> sentences
          </span>
        </div>
      </header>

      <details className={styles.method}>
        <summary>How to practise a tone — the throat first, the lines second</summary>
        <p>
          A tone is remembered as what your throat does, not as a line to read or a rule to work
          out from the spelling. The pictures here are for checking afterwards; while you speak,
          attend to the sensation.
        </p>
        <ol>
          <li><b>Hear</b> the native voice: level, dipping, rising, or peak-and-drop. Don't look at the letters.</li>
          <li><b>Feel</b> what your throat does to make that shape. The cues are on the Tones page: low is relaxed and dropped, falling is a quick tighten then release, high is held tension, rising starts loose and tightens.</li>
          <li><b>Check</b> your line against the dashed native one — after the take, not during it. Where they part is where the throat did something else.</li>
          <li><b>Lock it in</b>: repeat until the sensation and the sound arrive together; the meaning then rides on that.</li>
        </ol>
      </details>

      <div className={styles.stack}>
        <PhraseScope
          data={nativeScope}
          live={nativeLive}
          revision={revision}
          height={280}
          tools={
            <>
              <button type="button" className={scopeStyles.tool} onClick={onListen} disabled={busy}>
                {refStatus === 'loading'
                  ? 'Fetching…'
                  : refStatus === 'playing' || playing === 'native'
                    ? 'Playing…'
                    : '▶ Listen'}
              </button>
              <button
                type="button"
                className={`${scopeStyles.tool} ${scopeStyles.secondary}`}
                onClick={() => speakThai(phrase.words.map(thaiOfWord), onSpokenWord)}
                disabled={busy}
              >
                Word by word
              </button>
            </>
          }
        />
        <PhraseScope
          data={youScope}
          live={live}
          revision={revision}
          height={280}
          overlay={status === 'counting' ? <span key={countIn} className={scopeStyles.count}>{countIn}</span> : null}
          tools={
            takeUrl && status === 'done' ? (
              <>
                <button type="button" className={scopeStyles.tool} onClick={onListenToTake} disabled={busy}>
                  {playing === 'you' ? 'Playing…' : '▶ Listen'}
                </button>
                <a className={scopeStyles.tool} href={takeUrl} download={`take-${phrase.id}.webm`}>
                  ⤓ Save
                </a>
              </>
            ) : null
          }
        />
      </div>

      <div className={styles.scopeTools}>
        <label className={styles.gainLabel} htmlFor="spec-gain">Sensitivity</label>
        <input
          id="spec-gain"
          type="range"
          min="0.6"
          max="4"
          step="0.1"
          value={gain}
          onChange={e => onGain(parseFloat(e.target.value))}
          className={styles.gainSlider}
        />
        <span className={styles.gainValue}>{gain.toFixed(1)}×</span>
        <button
          type="button"
          className={`${styles.switch} ${showTextbook ? styles.switchOn : ''}`}
          onClick={onToggleTextbook}
          aria-pressed={showTextbook}
        >
          <i /> textbook tones
        </button>
        <span className={styles.legend}>
          <span className={styles.legendSwatch} style={{ background: '#fff' }} /> your pitch
          <span className={styles.legendSwatch} style={{ background: '#fbbf24', marginLeft: 12 }} /> native pitch (dashed)
          {showTextbook && <><span className={styles.legendSwatch} style={{ background: '#7c3aed', marginLeft: 12 }} /> textbook tone shape</>}
        </span>
      </div>
      <p className={styles.scopeHint}>
        Sensitivity changes the picture only, never what is measured.
        {mismatches.length > 0 && (
          <>
            {' '}On <span className={styles.hintThai}>{mismatches.join(' ')}</span> the native voice does not make
            the textbook shape — connected speech cuts the glide short — so follow the amber line there.
          </>
        )}
      </p>

      {refStatus === 'failed' && (
        <p className={styles.denied}>
          The native voice can't be fetched here — this build has no TTS relay configured (see
          worker/tts-proxy/README.md). You can still record; there is just nothing to lay your take
          against.
        </p>
      )}
      {status === 'denied' && (
        <p className={styles.denied}>
          The microphone is blocked. Allow microphone access for this page in your browser, then try
          recording again — nothing is uploaded, all of the analysis runs here.
        </p>
      )}
      {status === 'listening' && (
        <p className={styles.hintLine}>The native voice first — your recording starts right after.</p>
      )}
      {status === 'recording' && (
        <p className={styles.hintLine}>Listening… say the sentence as the playhead moves.</p>
      )}
      {status === 'done' && <Report comparison={comparison} hasReference={refStatus === 'ready'} />}
      {status === 'done' && !busy && (
        <p className={styles.scopeHint}>Space, or Try again, records another take.</p>
      )}

      {phrase.note && <p className={styles.note}>{phrase.note}</p>}
    </div>
  );
}

const SYLLABLE_LABEL: Record<SyllableVerdict, string> = {
  good: '✓ on target',
  high: '↑ too high',
  low: '↓ too low',
  flat: '— flat',
  shape: '~ wrong way',
  missing: '· not heard',
};
const chipClass = (verdict: SyllableVerdict) =>
  verdict === 'good' ? styles.scoreGood : verdict === 'missing' ? '' : styles.scoreOff;

function Report({ comparison, hasReference }: { comparison: Comparison | null; hasReference: boolean }) {
  if (!hasReference) {
    return <p className={styles.hintLine}>Recorded. Without the native reference there is nothing to compare it to.</p>;
  }
  if (!comparison) {
    return (
      <p className={styles.hintLine}>
        Not enough voice to compare — say the whole sentence, a little closer to the microphone.
      </p>
    );
  }
  const pace = comparison.learnerMs / comparison.referenceMs;
  const quiet = comparison.learnerPeakRms < 0.03;
  const scores = comparison.syllables;
  const onTarget = scores.filter(s => s.verdict === 'good').length;
  const merged = [...new Set(scores.filter(s => s.parts).map(s => s.parts!.map(p => p.thai).join(' + ')))];
  const hints = scores.filter(s => s.verdict !== 'good' && s.hint).slice(0, 3);

  return (
    <div className={styles.report}>
      <p className={styles.reportHead}>
        <strong>
          {scores.length === 0
            ? 'Recorded.'
            : onTarget === scores.length
              ? `All ${scores.length} syllables on target.`
              : `${onTarget} of ${scores.length} syllables on target.`}
        </strong>
        <span className={styles.refHz}>
          {' '}· {(comparison.learnerMs / 1000).toFixed(1)} s vs {(comparison.referenceMs / 1000).toFixed(1)} s
          {pace < 0.8 ? ' — slow down; the tones need room' : pace > 1.25 ? ' — slower than native, fine for now' : ''}
          {quiet ? ` · quiet take (peak ${Math.round(20 * Math.log10(comparison.learnerPeakRms))} dB), get closer to the mic` : ''}
        </span>
      </p>
      {scores.length > 0 && (
        <div className={styles.scoreRow}>
          {scores.map((score, i) => (
            <span
              key={i}
              className={`${styles.scoreChip} ${chipClass(score.verdict)}`}
              title={score.hint || `${score.span.tone} tone — matched the native voice`}
            >
              <span className={styles.scoreThai} style={{ color: TONE_COLOR[score.span.tone] }}>{score.span.thai}</span>
              <span className={styles.scoreLabel}>{SYLLABLE_LABEL[score.verdict]}</span>
            </span>
          ))}
        </div>
      )}
      {merged.length > 0 && (
        <p className={styles.paceLine}>
          {merged.join(', ')} ran together in your take and are judged together.
        </p>
      )}
      {hints.length > 0 && (
        <ul className={styles.hintList}>
          {hints.map((score, i) => (
            <li key={i}>
              <span className={styles.hintThai}>
                {(score.parts ?? [{ thai: score.span.thai, tone: score.span.tone }]).map((part, j) => (
                  <span key={j} style={{ color: TONE_COLOR[part.tone] }}>{part.thai}</span>
                ))}
              </span>{' '}
              <span className={styles.hintTone}>
                ({(score.parts ?? [score.span]).map(p => p.tone.toLowerCase()).join(' + ')})
              </span>{' '}
              {score.hint}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SentenceRail({
  groups, currentId, editing, onPick, onAdd, onEdit, onSave, onDelete, onCancel,
}: {
  groups: PhraseGroup[];
  currentId: string;
  editing: { id: string | null; draft: CustomDraft } | null;
  onPick: (id: string) => void;
  onAdd: () => void;
  onEdit: (phrase: Phrase) => void;
  onSave: (draft: CustomDraft) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <aside className={styles.rail} aria-label="Sentences">
      <div className={styles.railHead}>
        <b>Sentences</b>
        <span className={styles.railKeys}><kbd>←</kbd> <kbd>→</kbd></span>
      </div>
      {editing && <SentenceEditor key={editing.id ?? 'new'} initial={editing.draft} existing={!!editing.id} onSave={onSave} onDelete={onDelete} onCancel={onCancel} />}
      {groups.map(group =>
        group.phrases.length === 0 && group.id !== CUSTOM_GROUP.id ? null : (
          <div key={group.id}>
            <h3 className={styles.railGroup} title={group.blurb}>{group.title}</h3>
            {group.phrases.map(p => (
              <div key={p.id} className={`${styles.item} ${p.id === currentId ? styles.itemOn : ''}`}>
                <button type="button" className={styles.itemMain} onClick={() => onPick(p.id)} aria-current={p.id === currentId ? 'true' : undefined}>
                  <span className={styles.itemThai}>
                    {p.words.flatMap((w, i) => w.syllables.map((s, j) => (
                      <span key={`${i}-${j}`} style={{ color: TONE_COLOR[syllableTone(s)] }}>{s.thai}</span>
                    )))}
                  </span>
                  <span className={styles.itemMeaning}>{p.meaning}</span>
                </button>
                {isCustom(p) && (
                  <button type="button" className={styles.itemEdit} onClick={() => onEdit(p)} aria-label={`Edit ${thaiOf(p)}`}>✎</button>
                )}
              </div>
            ))}
            {group.id === CUSTOM_GROUP.id && !editing && (
              <button type="button" className={styles.add} onClick={onAdd}>+ Add a sentence</button>
            )}
          </div>
        ),
      )}
    </aside>
  );
}

/** Thai with a space between syllables and a slash between words; the tone
 *  of each syllable is read from its spelling and shown in colour, and a
 *  tap on a syllable cycles it when the reading is wrong. */
function SentenceEditor({ initial, existing, onSave, onDelete, onCancel }: {
  initial: CustomDraft;
  existing: boolean;
  onSave: (draft: CustomDraft) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CustomDraft>(initial);
  const words = draftSyllables(draft.thai);
  const flat = words.flat();
  const cycle = (i: number) => {
    const current = draft.tones[i] ?? toneFromSpelling(flat[i]);
    const next = TONE_CYCLE[(TONE_CYCLE.indexOf(current) + 1) % TONE_CYCLE.length];
    setDraft({ ...draft, tones: { ...draft.tones, [i]: next } });
  };
  let index = 0;
  return (
    <form
      className={styles.editor}
      onSubmit={e => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <label>
        Thai — a space between syllables, <code>/</code> between words
        <input
          className={styles.editorThai}
          value={draft.thai}
          onChange={e => setDraft({ ...draft, thai: e.target.value, tones: {} })}
          placeholder="ไป ไหน / มา"
          autoFocus
          required
        />
      </label>
      {flat.length > 0 && (
        <p className={styles.preview}>
          {words.map((word, w) => (
            <span key={w} className={styles.previewWord}>
              {word.map(syl => {
                const i = index++;
                const tone = draft.tones[i] ?? toneFromSpelling(syl);
                return (
                  <button type="button" key={i} className={styles.previewSyl} style={{ color: TONE_COLOR[tone] }} onClick={() => cycle(i)} title={`${tone} tone — tap to change`}>
                    {syl}
                  </button>
                );
              })}
            </span>
          ))}
          <span className={styles.previewHint}>tap a syllable to change its tone</span>
        </p>
      )}
      <label>
        Meaning
        <input value={draft.meaning} onChange={e => setDraft({ ...draft, meaning: e.target.value })} placeholder="Where have you been?" />
      </label>
      <label>
        IPA <span className={styles.optional}>optional, one per syllable</span>
        <input value={draft.ipa} onChange={e => setDraft({ ...draft, ipa: e.target.value })} placeholder="paj nǎj / maː" />
      </label>
      <div className={styles.editorRow}>
        <button type="submit" className={styles.editorSave}>{existing ? 'Save' : 'Add'}</button>
        <button type="button" className={styles.editorQuiet} onClick={onCancel}>Cancel</button>
        {existing && <button type="button" className={`${styles.editorQuiet} ${styles.editorDelete}`} onClick={onDelete}>Delete</button>}
      </div>
    </form>
  );
}
