/**
 * The page side of whisper.worker.ts: hands a take to the worker and gets
 * back what Whisper heard. Free and private: the model runs in the browser
 * and the audio never leaves the device.
 */

import { to16k } from './audio16k';

const HUB = 'https://huggingface.co';
const CACHE_NAME = 'transformers-cache';
const CHOICE_KEY = 'english.whisperModel';

type Precision = 'fp16' | 'q8';
type Device = 'webgpu' | 'wasm';

export interface WhisperOption {
  id: string;
  label: string;
  /** What the choice trades, in a few words. */
  note: string;
  /** Hugging Face hub repository. */
  model: string;
  /** Weight precision and processor per part: the encoder listens, the
   *  decoder writes the words. */
  dtype: { encoder_model: Precision; decoder_model_merged: Precision };
  device: { encoder_model: Device; decoder_model_merged: Device };
  /** The weight files `dtype` selects, which make up nearly all the download. */
  files: string[];
  mb: number;
}

/** Whisper always encodes a 30-second window, however short the take, so
 *  the encoder is most of the work: on the GPU in half precision it runs
 *  several times faster than 8-bit on the CPU. The GPU gains nothing from
 *  8-bit weights, and the decoder writes only a handful of words, so it
 *  stays 8-bit on the CPU either way. */
export const WHISPER_OPTIONS: WhisperOption[] = [
  {
    id: 'base-gpu',
    label: 'Base · GPU',
    note: 'Fast; needs WebGPU',
    model: 'onnx-community/whisper-base.en',
    dtype: { encoder_model: 'fp16', decoder_model_merged: 'q8' },
    device: { encoder_model: 'webgpu', decoder_model_merged: 'wasm' },
    files: ['onnx/encoder_model_fp16.onnx', 'onnx/decoder_model_merged_quantized.onnx'],
    mb: 95,
  },
  {
    id: 'small-gpu',
    label: 'Small · GPU',
    note: 'Bigger model, fewest mistakes; needs WebGPU',
    model: 'onnx-community/whisper-small.en',
    dtype: { encoder_model: 'fp16', decoder_model_merged: 'q8' },
    device: { encoder_model: 'webgpu', decoder_model_merged: 'wasm' },
    files: ['onnx/encoder_model_fp16.onnx', 'onnx/decoder_model_merged_quantized.onnx'],
    mb: 334,
  },
  {
    id: 'base-8bit',
    label: 'Base · CPU',
    note: 'Smallest download; works without WebGPU',
    model: 'onnx-community/whisper-base.en',
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    device: { encoder_model: 'wasm', decoder_model_merged: 'wasm' },
    files: ['onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'],
    mb: 77,
  },
  {
    id: 'small-8bit',
    label: 'Small · CPU',
    note: 'Fewest mistakes without WebGPU, but slow',
    model: 'onnx-community/whisper-small.en',
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    device: { encoder_model: 'wasm', decoder_model_merged: 'wasm' },
    files: ['onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'],
    mb: 249,
  },
];

export const needsGpu = (option: WhisperOption): boolean =>
  Object.values(option.device).includes('webgpu');

/** Whether this browser can run the GPU options: WebGPU present and a
 *  graphics adapter behind it. */
export async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

export function whisperChoice(): WhisperOption {
  let id: string | null = null;
  try {
    id = window.localStorage.getItem(CHOICE_KEY);
  } catch {
    id = null;
  }
  return WHISPER_OPTIONS.find(o => o.id === id) ?? WHISPER_OPTIONS[0];
}

export function setWhisperChoice(option: WhisperOption): void {
  try {
    window.localStorage.setItem(CHOICE_KEY, option.id);
  } catch {
    // Storage may be unavailable; the choice lasts until the page closes.
  }
}

const fileUrl = (option: WhisperOption, file: string) => `${HUB}/${option.model}/resolve/main/${file}`;

/** Whether the option's weight files are already in the browser's cache. */
export async function isDownloaded(option: WhisperOption): Promise<boolean> {
  if (!('caches' in window)) return false;
  const cache = await caches.open(CACHE_NAME);
  const hits = await Promise.all(option.files.map(f => cache.match(fileUrl(option, f))));
  return hits.every(Boolean);
}

/** Removes the option's weight files from the cache. A file another option
 *  shares (the two Base choices use the same decoder, as do the two Small
 *  ones) stays while that option is downloaded. */
export async function deleteDownload(option: WhisperOption): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  const kept = new Set<string>();
  for (const other of WHISPER_OPTIONS) {
    if (other.id === option.id || !(await isDownloaded(other))) continue;
    other.files.forEach(f => kept.add(fileUrl(other, f)));
  }
  await Promise.all(option.files.map(f => fileUrl(option, f)).filter(u => !kept.has(u)).map(u => cache.delete(u)));
}

let worker: Worker | null = null;
let nextId = 0;

function getWorker(): Worker {
  if (!worker) worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

/** What Whisper hears in `buffer` between `startMs` and `endMs`.
 *  `onDownload` reports the model download, which happens on first use. */
export async function transcribe(
  option: WhisperOption,
  buffer: AudioBuffer,
  startMs: number,
  endMs: number,
  onDownload?: (loaded: number, total: number) => void,
): Promise<string> {
  const audio = await to16k(buffer, startMs, endMs);
  const w = getWorker();
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as { id: number; type: string; text?: string; message?: string; loaded?: number; total?: number };
      if (msg.id !== id) return;
      if (msg.type === 'progress') {
        onDownload?.(msg.loaded ?? 0, msg.total ?? 0);
        return;
      }
      w.removeEventListener('message', onMessage);
      if (msg.type === 'result') resolve(msg.text ?? '');
      else reject(new Error(msg.message));
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ id, model: option.model, dtype: option.dtype, device: option.device, audio }, [audio.buffer]);
  });
}
