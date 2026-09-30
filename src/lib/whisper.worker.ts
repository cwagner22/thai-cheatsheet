/**
 * Whisper speech recognition, run inside the page on a worker thread so the
 * model's few seconds of work never freeze the UI. The model files come from
 * the Hugging Face hub on first use and are kept in the browser's Cache
 * Storage (`transformers-cache`).
 *
 *   in:  { id, model, dtype, device, audio: Float32Array }   audio: mono, 16 kHz
 *   out: { id, type: 'progress', loaded, total } while the model downloads
 *        { id, type: 'result', text } | { id, type: 'error', message }
 */

import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

type Dtype = Record<string, 'fp16' | 'q8'>;
type Device = Record<string, 'webgpu' | 'wasm'>;

/** One model in memory at a time: each takes hundreds of MB once loaded. */
let current: { key: string; ready: Promise<AutomaticSpeechRecognitionPipeline> } | null = null;

function load(
  model: string,
  dtype: Dtype,
  device: Device,
  onProgress: (loaded: number, total: number) => void,
): Promise<AutomaticSpeechRecognitionPipeline> {
  const key = `${model} ${JSON.stringify(dtype)} ${JSON.stringify(device)}`;
  if (current?.key === key) return current.ready;
  const previous = current;
  const ready = (async () => {
    if (previous) await (await previous.ready.catch(() => null))?.dispose();
    return (await pipeline('automatic-speech-recognition', model, {
      device,
      dtype,
      progress_callback: info => {
        if (info.status === 'progress_total') onProgress(info.loaded, info.total);
      },
    })) as AutomaticSpeechRecognitionPipeline;
  })();
  current = { key, ready };
  ready.catch(() => {
    if (current?.ready === ready) current = null;
  });
  return ready;
}

self.onmessage = async (
  event: MessageEvent<{ id: number; model: string; dtype: Dtype; device: Device; audio: Float32Array }>,
) => {
  const { id, model, dtype, device, audio } = event.data;
  try {
    const transcriber = await load(model, dtype, device, (loaded, total) =>
      self.postMessage({ id, type: 'progress', loaded, total }),
    );
    const output = await transcriber(audio);
    const text = Array.isArray(output) ? output.map(o => o.text).join(' ') : output.text;
    self.postMessage({ id, type: 'result', text: text.trim() });
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
