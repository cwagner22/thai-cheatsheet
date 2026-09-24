"""Generate TTS clips for one voice: $DATA/audio/<voice>/<id>.wav.

Usage: gen_audio.py <voice> <DATA> [--extra] [--sets app,sent,...]
  voice: google | premwadee | niwat | kanya
  --extra  also voice the items flagged "extra" in corpus.jsonl.
  --sets   only voice these sets (default: all).

Resumable: a clip whose wav exists is skipped, and every wav is written to a
temporary name and renamed, so an interrupted run never leaves a truncated
clip that a later run would mistake for a finished one. Output is 48 kHz mono
16-bit PCM with 100-300 ms of silence at each end (padded when the voice
returns less; never trimmed).
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

SR = 48000
PAD_TARGET = 0.15
PAD_MIN = 0.10
SET_ORDER = {"app": 0, "sent": 1, "word": 2, "mono": 3}
EDGE_VOICES = {"premwadee": "th-TH-PremwadeeNeural", "niwat": "th-TH-NiwatNeural"}
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


def log(msg: str) -> None:
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def edge_silence(x: np.ndarray) -> tuple[float, float]:
    """Leading and trailing silence in seconds, from 10 ms frame RMS.

    Silence is any frame more than 40 dB below the loudest frame (floor 1e-4
    of full scale, so a near-silent clip does not count its noise as speech).
    """
    hop = SR // 100
    n = len(x) // hop
    if n == 0:
        return 0.0, 0.0
    rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1))
    thr = max(rms.max() * 0.01, 1e-4)
    voiced = np.nonzero(rms > thr)[0]
    if len(voiced) == 0:
        return len(x) / SR, 0.0
    return float(voiced[0] * hop / SR), float((n - 1 - voiced[-1]) * hop / SR + (len(x) - n * hop) / SR)


def to_wav(src: Path, dst: Path) -> float:
    """Convert any audio file to the dataset format and pad thin silences.

    Returns the seconds of silence prepended, so times measured on the source
    audio can be shifted onto the wav.
    """
    tmp = dst.with_suffix(".tmp.wav")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR),
         "-sample_fmt", "s16", "-f", "wav", str(tmp)],
        check=True,
    )
    with wave.open(str(tmp)) as w:
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    x = pcm.astype(np.float32) / 32768.0
    lead, trail = edge_silence(x)
    pre = int(round((PAD_TARGET - lead) * SR)) if lead < PAD_MIN else 0
    post = int(round((PAD_TARGET - trail) * SR)) if trail < PAD_MIN else 0
    if pre or post:
        pcm = np.concatenate([np.zeros(pre, np.int16), pcm, np.zeros(post, np.int16)])
        with wave.open(str(tmp), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
    os.replace(tmp, dst)
    return pre / SR


def load_items(data: Path, extra: bool, voice: str) -> list[dict]:
    items = [json.loads(l) for l in (data / "corpus.jsonl").open()]
    if not extra:
        items = [i for i in items if not i.get("extra")]
    items.sort(key=lambda i: (SET_ORDER[i["set"]], bool(i.get("extra"))))
    out_dir = data / "audio" / voice
    return [i for i in items if not (out_dir / f'{i["id"]}.wav').exists()]


def run_google(data: Path, items: list[dict]) -> None:
    import requests

    out_dir = data / "audio" / "google"
    status = data / "google_status.json"
    sess = requests.Session()
    sess.headers["User-Agent"] = UA
    last = 0.0
    blocked_since: float | None = None
    total_blocked = 0.0
    n_429 = n_err = done = 0
    backoffs: list[dict] = []
    for idx, it in enumerate(items):
        backoff = 30
        while True:
            wait = 1.2 - (time.time() - last)
            if wait > 0:
                time.sleep(wait)
            last = time.time()
            url = (
                "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=th&q="
                + urllib.parse.quote(it["text"])
            )
            try:
                r = sess.get(url, timeout=30)
                code = r.status_code
            except requests.RequestException as e:
                code, r = -1, None
                log(f"request error {e!r}")
            if code == 200 and r is not None and len(r.content) > 500:
                if blocked_since is not None:
                    total_blocked += time.time() - blocked_since
                    blocked_since = None
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                    f.write(r.content)
                to_wav(Path(f.name), out_dir / f'{it["id"]}.wav')
                os.unlink(f.name)
                done += 1
                break
            if code in (429,) or code >= 500 or code == -1:
                n_429 += code == 429
                n_err += code != 429
                if blocked_since is None:
                    blocked_since = time.time()
                blocked_for = time.time() - blocked_since
                backoffs.append({"at": time.strftime("%H:%M:%S"), "id": it["id"], "code": code, "sleep": backoff})
                if blocked_for > 15 * 60:
                    log(f"blocked for {blocked_for/60:.1f} min; stopping google job")
                    status.write_text(json.dumps({"stopped": True, "reason": f"HTTP {code} for >15 min",
                                                  "done": done, "remaining": len(items) - idx,
                                                  "n429": n_429, "nErr": n_err, "backoffs": backoffs}, indent=1))
                    return
                log(f"HTTP {code} on {it['id']}; backing off {backoff}s")
                time.sleep(backoff)
                backoff = min(backoff * 2, 480)
                continue
            log(f"HTTP {code} ({len(r.content) if r is not None else 0} bytes) on {it['id']}: skipping")
            n_err += 1
            break
        if done % 100 == 0 and done:
            log(f"google {done}/{len(items)}")
    status.write_text(json.dumps({"stopped": False, "done": done, "n429": n_429, "nErr": n_err,
                                  "totalBlockedSec": round(total_blocked), "backoffs": backoffs}, indent=1))
    log(f"google finished: {done} new clips")


async def edge_try(voice_id: str, it: dict, out_dir: Path, bnd_dir: Path) -> None:
    """One edge-tts request for one clip; raises on any failure."""
    import edge_tts

    c = edge_tts.Communicate(it["text"], voice_id, boundary="WordBoundary")
    audio = bytearray()
    bounds = []
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio.extend(ch["data"])
        elif ch["type"] == "WordBoundary":
            bounds.append({"text": ch["text"], "start": ch["offset"] / 1e7, "dur": ch["duration"] / 1e7})
    if len(audio) < 500:
        raise RuntimeError("empty audio")
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(audio)
    pad = await asyncio.to_thread(to_wav, Path(f.name), out_dir / f'{it["id"]}.wav')
    os.unlink(f.name)
    # edge-tts reports times on its own mp3; shift them by the silence to_wav
    # prepended so they index the saved wav.
    for bd in bounds:
        bd["start"] = round(bd["start"] + pad, 4)
        bd["dur"] = round(bd["dur"], 4)
    (bnd_dir / f'{it["id"]}.json').write_text(
        json.dumps({"source": "edge-tts WordBoundary events, seconds into the wav",
                    "padStartSec": round(pad, 4), "words": bounds}, ensure_ascii=False))


async def run_edge(voice: str, data: Path, items: list[dict]) -> None:
    """Four workers over a shared queue.

    NoAudioReceived comes back in bursts (for Premwadee on most requests at
    times) and the same text usually succeeds a few tries later, so a failed
    clip goes to the back of the queue instead of stalling its worker.
    """
    out_dir = data / "audio" / voice
    bnd_dir = data / "boundaries" / voice
    bnd_dir.mkdir(parents=True, exist_ok=True)
    q: asyncio.Queue = asyncio.Queue()
    for it in items:
        q.put_nowait((it, 0))
    stats = {"done": 0, "failedAttempts": 0, "gaveUp": []}

    async def worker() -> None:
        while True:
            try:
                it, n = q.get_nowait()
            except asyncio.QueueEmpty:
                return
            try:
                await edge_try(EDGE_VOICES[voice], it, out_dir, bnd_dir)
                stats["done"] += 1
                if stats["done"] % 200 == 0:
                    log(f"{voice} {stats['done']}/{len(items)} (failed attempts {stats['failedAttempts']})")
            except Exception as e:  # noqa: BLE001
                stats["failedAttempts"] += 1
                if n + 1 >= 40:
                    stats["gaveUp"].append(it["id"])
                    log(f"{voice} giving up on {it['id']}: {e!r}"[:160])
                else:
                    q.put_nowait((it, n + 1))
                    await asyncio.sleep(0.5)

    await asyncio.gather(*(worker() for _ in range(4)))
    log(f"{voice} finished: {stats['done']} new, {stats['failedAttempts']} failed attempts, "
        f"gave up on {stats['gaveUp']}")
    with (data / "logs" / f"{voice}_stats.jsonl").open("a") as f:
        f.write(json.dumps({"at": time.strftime("%F %T"), "todo": len(items), **stats}) + "\n")


def kanya_one(it: dict, out_dir: Path) -> bool:
    with tempfile.TemporaryDirectory() as td:
        aiff = Path(td) / "k.aiff"
        try:
            subprocess.run(["say", "-v", "Kanya", "-o", str(aiff), it["text"]], check=True, timeout=60)
            to_wav(aiff, out_dir / f'{it["id"]}.wav')
            return True
        except Exception as e:  # noqa: BLE001
            log(f"kanya {it['id']}: {e!r}")
            return False


def run_kanya(data: Path, items: list[dict]) -> None:
    out_dir = data / "audio" / "kanya"
    done = 0
    with ThreadPoolExecutor(4) as ex:
        for ok in ex.map(lambda it: kanya_one(it, out_dir), items):
            done += ok
            if done % 200 == 0:
                log(f"kanya {done}/{len(items)}")
    log(f"kanya finished: {done}/{len(items)}")


def main() -> None:
    voice, data = sys.argv[1], Path(sys.argv[2])
    extra = "--extra" in sys.argv
    (data / "audio" / voice).mkdir(parents=True, exist_ok=True)
    for stale in (data / "audio" / voice).glob("*.tmp.wav"):
        stale.unlink()
    items = load_items(data, extra, voice)
    if "--sets" in sys.argv:
        wanted = set(sys.argv[sys.argv.index("--sets") + 1].split(","))
        items = [i for i in items if i["set"] in wanted]
    log(f"{voice}: {len(items)} clips to generate")
    if voice == "google":
        run_google(data, items)
    elif voice in EDGE_VOICES:
        asyncio.run(run_edge(voice, data, items))
    elif voice == "kanya":
        run_kanya(data, items)
    else:
        raise SystemExit(f"unknown voice {voice}")


if __name__ == "__main__":
    main()
