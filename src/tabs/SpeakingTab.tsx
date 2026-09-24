import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PHRASE_GROUPS, ipaOfWord, thaiOf, thaiOfWord, type Phrase, type PhraseGroup } from '../data/phrases';
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
import { TONE_COLOR, TONE_FEEL, THAI_TONES } from '../data/tones';
import { startCapture, type CaptureHandle, type Frame } from '../lib/capture';
import { PAUSE_MS, SPEECH_SHARE } from '../lib/align';
import {
  buildSegments,
  compareToReference,
  registerHz,
  syllableTone,
  textbookMismatches,
  type Comparison,
  type SyllableVerdict,
  type TrackPoint,
} from '../lib/contour';
import { cachedReference, loadReference as fetchReference, playReference, type Playback, type Reference } from '../lib/reference';
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
const OVERRUN_LIMIT = 2.5;
/** Silence this long after the native length ends a take said in one go;
 *  the 2.5x cap above is what stops a noisy room keeping the microphone
 *  open. */
const TRAILING_SILENCE_MS = 600;
/** A learner reading word by word pauses between words for half a second
 *  or more, so once a take holds pauses (PAUSE_MS or longer, between two
 *  voiced frames) it ends only after this much silence, or one and a half
 *  times the longest pause so far if that is longer. */
const PAUSED_SILENCE_MS = 1500;

/** The longest gap between two voiced frames of a capture, in ms. */
function longestPause(frames: Frame[]): number {
  let longest = 0;
  let lastVoiced: number | null = null;
  for (const f of frames) {
    if (f.hz === null) continue;
    if (lastVoiced !== null) longest = Math.max(longest, f.t - lastVoiced);
    lastVoiced = f.t;
  }
  return longest;
}

type Status = 'idle' | 'listening' | 'counting' | 'recording' | 'done' | 'denied';
type ReferenceStatus = 'none' | 'loading' | 'ready' | 'failed';
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
  return { windowMs, spectra: [], segments: [], ghost: null, elapsedMs: null, gain, label, emptyText, syllables: null };
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
    const hidden = new Set(reference.syllables ? textbookMismatches(reference.frames, reference.syllables) : []);
    setMismatches(reference.syllables ? reference.syllables.filter((_, i) => hidden.has(i)).map(s => s.thai) : []);
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
    };
    // The learner's panel stays bare until there is a take: the native
    // voice's slots mean nothing laid over silence.
    youScope.current = { ...youScope.current, windowMs };
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

  /** Fetches and analyses the native voice, then draws it whole. */
  const loadReferenceNow = useCallback(async (): Promise<Reference | null> => {
    const ctx = ensureCtx();
    setRefStatus('loading');
    nativeScope.current = emptyScope(FALLBACK_WINDOW_MS, NATIVE_LABEL, 'fetching the native voice…', gainRef.current);
    redraw();
    try {
      const reference = await fetchReference(ctx, phrase);
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
  }, [phrase, showReference]);

  const loadReference = useCallback(
    (): Promise<Reference | null> => {
      if (loadingRef.current) return loadingRef.current;
      const run = loadReferenceNow().finally(() => {
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
    if (!cachedReference(phrase.id)) void loadReference();
  }, [phrase, loadReference]);

  /** Plays the native voice with a playhead; resolves when it has ended or
   *  been cut off. */
  const playNative = useCallback(async (): Promise<void> => {
    const reference = referenceRef.current ?? (await loadReference());
    if (!reference) return;
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
      // Same time scale as the native panel above, so a syllable held twice
      // as long looks twice as long. A take that runs past the panel's width
      // is drawn wider and scrolls, never squeezed to fit.
      const originMs = Math.max(0, start - FIT_LEAD_MS);
      const viewMs = nativeScope.current.windowMs;
      youScope.current = {
        ...youScope.current,
        originMs,
        viewMs,
        windowMs: Math.max(viewMs, end + FIT_TAIL_MS - originMs),
        spectra: handle.capture.spectra,
        segments: result.learnerSegmentsRaw,
        ghost: result.referenceSegments.flatMap(seg => splitAtPauses(seg.map(p => ({ ms: result.inverseTime(p.ms), st: p.st })))),
        syllables: reference?.syllables
          ? reference.syllables.map(sp => ({
              ...sp,
              startMs: result.inverseTime(sp.startMs),
              endMs: result.inverseTime(sp.endMs),
            }))
          : null,
        elapsedMs: null,
      };
    } else if (handle) {
      const voiced = frames.filter(f => f.hz !== null);
      youScope.current = {
        ...youScope.current,
        segments: voiced.length >= 8 ? buildSegments(frames, registerHz(frames)) : [],
        elapsedMs: null,
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
      await loadReference();
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
    // While recording the panel shows the learner's own sound and nothing
    // else — no native line, no slots. All of that
    // returns with the scored take, fitted to what was actually said.
    youScope.current = { ...emptyScope(windowMs, YOU_LABEL, '', gainRef.current), originMs: 0, viewMs: windowMs };
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
              // No playhead while recording: the take is scored on its own
              // clock, and a marker only invites the learner to chase it.
              elapsedMs: null,
              gain: gainRef.current,
              // A take running past the native length widens the panel
              // rather than falling off its right edge.
              windowMs: Math.max(youScope.current.windowMs, elapsed + FIT_TAIL_MS),
            };
          },
          shouldStop: (elapsed, capture) => {
            if (elapsed < windowMs) return false;
            const pause = longestPause(capture.frames);
            const silence = pause >= PAUSE_MS ? Math.max(PAUSED_SILENCE_MS, 1.5 * pause) : TRAILING_SILENCE_MS;
            const stillSpeaking = capture.frames.some(f => f.hz !== null && f.t > elapsed - silence);
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
        nativeLive={playing === 'native'}
        busy={busy}
        playing={playing}
        onListen={listen}
        onListenToTake={listenToTake}
        onRecord={record}
        onStop={finish}
        gain={gain}
        onGain={onGain}
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

/** A gap this long between two neighbouring native pitch points, once
 *  carried onto the take's clock, is a pause the learner made where the
 *  native voice ran straight on; neighbouring native frames are about 20 ms
 *  apart, and even a vowel held four times the native length leaves them
 *  under 100 ms apart. */
const GHOST_BREAK_MS = 200;

/** Splits a native pitch run carried onto the take's clock wherever it
 *  crosses a pause of the learner's, so the dashed line does not run flat
 *  through the silence between two words. */
function splitAtPauses(run: TrackPoint[]): TrackPoint[][] {
  const out: TrackPoint[][] = [[]];
  run.forEach((p, i) => {
    if (i > 0 && p.ms - run[i - 1].ms > GHOST_BREAK_MS) out.push([]);
    out[out.length - 1].push(p);
  });
  return out.filter(r => r.length > 1);
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
}) {
  const sentenceRef = useRef<HTMLParagraphElement | null>(null);
  // Clear misses, by syllable index in the sentence, highlighted in place.
  const flagged = new Map<number, string>();
  if (status === 'done') {
    comparison?.syllables.forEach((score, i) => {
      if (isFlag(score.verdict)) flagged.set(i, `${FLAG_LABEL[score.verdict]}${score.hint ? ` — ${score.hint}` : ''}`);
    });
  }
  let syllableIndex = 0;
  // The sentence is one line however long it is: the type is scaled down
  // from its full size until it fits the column. Re-run on resize and when
  // the sentence changes.
  useLayoutEffect(() => {
    const el = sentenceRef.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = `${SENTENCE_MAX_REM}rem`;
      delete el.dataset.wrap;
      // Measured left-aligned: a centred line that overflows spills past
      // both edges, and scrollWidth counts only the right-hand spill.
      el.style.justifyContent = 'flex-start';
      const available = el.clientWidth;
      const needed = el.scrollWidth;
      el.style.justifyContent = '';
      if (needed > available && needed > 0) {
        const rem = (SENTENCE_MAX_REM * available) / needed - 0.05;
        el.style.fontSize = `${Math.max(SENTENCE_MIN_REM, rem)}rem`;
        // Too long for one line even at the smallest size: break between
        // words into balanced lines rather than overflow.
        if (rem < SENTENCE_MIN_REM) el.dataset.wrap = '';
      }
    };
    fit();
    // Thai type that arrives after the first fit changes the width needed.
    void document.fonts?.ready.then(fit);
    // Width only, and on the next frame: fitting changes the block's size,
    // and resizing an observed element inside its own callback loops the
    // observer.
    let lastWidth = el.parentElement?.clientWidth ?? 0;
    let frame = 0;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    observer.observe(el.parentElement ?? el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [phrase]);

  // Docked inside the learner's panel while it is empty or filling; once
  // the take is scored it moves under the panel, off the end of the take.
  const recordButton =
    status === 'recording' ? (
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
                : 'Practice'}
      </button>
    );

  return (
    <div className={styles.panel}>

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
                {refStatus === 'loading' ? 'Fetching…' : playing === 'native' ? 'Playing…' : '▶ Listen'}
              </button>
              <button
                type="button"
                className={scopeStyles.tool}
                onClick={() => speakThai(phrase.words.map(thaiOfWord), onSpokenWord)}
                disabled={busy}
              >
                Word by word
              </button>
            </>
          }
        />

        <header className={styles.poster}>
          <div className={styles.posterText}>
            <p className={styles.sentence} ref={sentenceRef}>
              {phrase.words.map((word, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.wordBtn} ${spokenWord === i ? styles.wordSpeaking : ''}`}
                  onClick={() => speakThai(thaiOfWord(word))}
                  data-tooltip={[ipaOfWord(word) && `/${ipaOfWord(word)}/`, word.gloss].filter(Boolean).join(' · ') || undefined}
                  aria-label={`${thaiOfWord(word)} — play`}
                >
                  {word.syllables.map((syl, j) => {
                    const index = syllableIndex++;
                    const flag = flagged.get(index);
                    return (
                      <span key={j} className={styles.syl}>
                        <span
                          className={flag ? styles.sylFlag : undefined}
                          style={{ color: TONE_COLOR[syllableTone(syl)] }}
                          title={flag}
                        >
                          {syl.thai}
                        </span>
                        <ToneGlyph tone={syllableTone(syl)} />
                      </span>
                    );
                  })}
                </button>
              ))}
            </p>
            <p className={styles.gloss}>{phrase.meaning}</p>
          </div>
        </header>

        <PhraseScope
          data={youScope}
          live={live}
          revision={revision}
          height={280}
          overlay={status === 'counting' ? <span key={countIn} className={scopeStyles.count}>{countIn}</span> : null}
          dock={status === 'done' ? null : recordButton}
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

      <div className={styles.statusRow}>
        <StatusLine status={status} refStatus={refStatus} />
        <div className={styles.rowEnd}>
          <span className={styles.keys}>
            <kbd>Space</kbd> record · <kbd>L</kbd> listen · <kbd>←</kbd><kbd>→</kbd> sentence
          </span>
          {status === 'done' && recordButton}
        </div>
      </div>

      {mismatches.length > 0 && (
        <p className={styles.glyphNote}>
          On <span className={styles.hintThai}>{mismatches.join(' ')}</span> this voice cuts the glide short:
          the shape under the syllable is the tone, the line above is what this voice did with it.
        </p>
      )}

      {status === 'done' && <Report comparison={comparison} hasReference={refStatus === 'ready'} />}

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
        <span className={styles.legend}>
          <span className={`${styles.legendSwatch} ${styles.swatchOwn}`} /> your pitch
          <span className={styles.legendSwatch} style={{ background: '#fbbf24', marginLeft: 12 }} /> native pitch (dashed)
        </span>
      </div>
      <p className={styles.scopeHint}>Sensitivity changes the picture only, never what is measured.</p>

      {phrase.note && <p className={styles.note}>{phrase.note}</p>}
    </div>
  );
}

/** One line under the sentence saying what is happening, or what went wrong,
 *  in the place the learner is already looking. */
function StatusLine({ status, refStatus }: { status: Status; refStatus: ReferenceStatus }) {
  if (status === 'denied') {
    return (
      <p className={`${styles.status} ${styles.statusError}`}>
        The microphone is blocked. Allow it for this page in the browser, then record again — nothing
        is uploaded; the analysis runs here.
      </p>
    );
  }
  if (refStatus === 'failed') {
    return (
      <p className={`${styles.status} ${styles.statusError}`}>
        The native voice can't be fetched in this build (no TTS relay — see worker/tts-proxy/README.md).
        You can still record; there is nothing to lay the take against.
      </p>
    );
  }
  const text =
    status === 'listening'
      ? 'The native voice first — your recording starts right after.'
      : status === 'counting'
        ? 'Read the sentence; start when the count ends.'
        : status === 'recording'
          ? 'Recording — at your own pace; it stops when you go quiet.'
          : null;
  return text ? <p className={styles.status}>{text}</p> : null;
}

/** Only clear misses get a label; anything else is shown plain. A green
 *  tick would claim the syllable was right, and the analysis cannot know
 *  that — only that nothing contradicted it. */
const FLAG_LABEL: Partial<Record<SyllableVerdict, string>> = {
  flat: '— flat',
  shape: '~ wrong way',
  missing: '· not heard',
};
const isFlag = (verdict: SyllableVerdict) => verdict in FLAG_LABEL;

function Report({ comparison, hasReference }: { comparison: Comparison | null; hasReference: boolean }) {
  if (!hasReference) {
    return <div className={styles.report}><p className={styles.notice}>Recorded. Without the native voice there is nothing to compare it to.</p></div>;
  }
  if (!comparison) {
    return (
      <div className={styles.report}>
        <p className={styles.notice}>
          Not enough voice to compare — say the whole sentence, a little closer to the microphone.
        </p>
      </div>
    );
  }
  const pace = comparison.learnerMs / comparison.referenceMs;
  // Advice about the microphone, not a judgement of the voice: below this
  // peak the frames the analysis can read thin out.
  const quiet = comparison.learnerPeakRms < 0.03;
  const peakDb = Math.round(20 * Math.log10(comparison.learnerPeakRms));
  const scores = comparison.syllables;
  const flags = scores.filter(s => isFlag(s.verdict));
  const merged = [...new Set(scores.filter(s => s.parts).map(s => s.parts!.map(p => p.thai).join(' + ')))];
  const unsaid =
    comparison.unsaidFrom !== null ? scores.slice(comparison.unsaidFrom).map(s => s.span.thai).join(' ') : '';
  const hints = flags.filter(s => s.hint).slice(0, 4);

  return (
    <div className={styles.report}>
      <p className={styles.reportHead}>
        <strong>
          {scores.length === 0
            ? 'Recorded.'
            : flags.length === 0
              ? 'Nothing flagged.'
              : `${flags.length} ${flags.length === 1 ? 'syllable' : 'syllables'} to work on.`}
        </strong>
        <span className={styles.refHz}>
          {' '}· {(comparison.learnerMs / 1000).toFixed(1)} s vs {(comparison.referenceMs / 1000).toFixed(1)} s
          {comparison.byWord ? ' — read in pieces' : pace > 1.25 ? ' — slower than native, fine for now' : ''}
        </span>
      </p>
      {(quiet || pace < 0.8 || unsaid) && (
        <div className={styles.notices}>
          {unsaid && (
            <p className={styles.notice}>
              Your take ends before <span className={styles.hintThai}>{unsaid}</span>, so those were not heard.
              Press Stop yourself if the recording ever ends before you do.
            </p>
          )}
          {quiet && (
            <p className={styles.notice}>
              Quiet take (peak {peakDb} dB). Move closer to the microphone or raise its input level —
              quiet syllables are the first ones the analysis loses.
            </p>
          )}
          {pace < 0.8 && (
            <p className={styles.notice}>You went faster than the native voice; slow down so each tone has room.</p>
          )}
        </div>
      )}
      {scores.length > 0 && (
        <p className={styles.paceLine}>
          Highlighted syllables are clear misses; an unmarked syllable is not a pass, just nothing the
          analysis could fault.{merged.length > 0 && ` ${merged.join(', ')} ran together in your take and are judged together.`}
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

const TONE_PATH = Object.fromEntries(THAI_TONES.map(t => [t.nameEn, t.path])) as Record<ToneName, string>;

/** The tone's citation shape, drawn small under its syllable: what the tone
 *  is, kept apart from the spectrogram, which shows only what a voice did.
 *  Same path as the Tones tab's cards, so one shape is taught everywhere. */
function ToneGlyph({ tone }: { tone: ToneName }) {
  return (
    <svg className={styles.glyph} viewBox="0 0 160 80" preserveAspectRatio="none" aria-hidden>
      <title>{`${tone} tone — ${TONE_FEEL[tone]}`}</title>
      <path d={TONE_PATH[tone]} stroke={TONE_COLOR[tone]} strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
