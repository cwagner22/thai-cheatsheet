/**
 * Offline capture for the harness: a wav file through the app's own
 * analyseSamples (src/lib/offlineCapture.ts), the loop the native voice is
 * analysed with in the browser.
 */
import { readFileSync } from 'node:fs';
import { analyseSamples } from '../../src/lib/offlineCapture';
import type { Frame } from '../../src/lib/capture';

export function readWav(path: string): { rate: number; samples: Float32Array } {
  const buf = readFileSync(path);
  const rate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  let off = 12;
  while (off < buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'data') {
      const n = Math.floor(size / (bits / 8));
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(off + 8 + i * 2) / 32768;
      return { rate, samples: out };
    }
    off += 8 + size;
  }
  throw new Error('no data chunk');
}

export function capture(path: string): Frame[] {
  const { rate, samples } = readWav(path);
  return analyseSamples(samples, rate).frames;
}
