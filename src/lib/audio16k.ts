/**
 * Takes as speech services want them: mono at 16 kHz, the rate Whisper was
 * trained on and one of the two formats Azure's short-audio API accepts.
 */

export const RATE_16K = 16000;

/** `buffer` from `startMs` to `endMs`, mixed to mono and resampled to 16 kHz. */
export async function to16k(buffer: AudioBuffer, startMs: number, endMs: number): Promise<Float32Array> {
  const seconds = Math.max(0.1, (endMs - startMs) / 1000);
  const offline = new OfflineAudioContext(1, Math.ceil(seconds * RATE_16K), RATE_16K);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0, startMs / 1000, seconds);
  return (await offline.startRendering()).getChannelData(0);
}

/** 16-bit PCM WAV of mono samples at `rate`. */
export function encodeWav(samples: Float32Array, rate = RATE_16K): Blob {
  const data = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => data.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  data.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  data.setUint32(16, 16, true); // fmt chunk size
  data.setUint16(20, 1, true); // PCM
  data.setUint16(22, 1, true); // mono
  data.setUint32(24, rate, true);
  data.setUint32(28, rate * 2, true); // bytes per second
  data.setUint16(32, 2, true); // bytes per frame
  data.setUint16(34, 16, true); // bits per sample
  text(36, 'data');
  data.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => data.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
  return new Blob([data.buffer], { type: 'audio/wav' });
}
