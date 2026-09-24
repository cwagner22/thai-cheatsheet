"""Scan $DATA/audio and write $DATA/clips.jsonl plus $DATA/summary.json.

Usage: finalize.py <DATA>. Idempotent: rebuilt from the wav files on disk.
Each clip line: {"id","voice","path","durSec","set","extra","leadSilSec",
"trailSilSec","speechSec","peak"} (path is relative to $DATA; speechSec is
durSec minus the leading and trailing silence).
"""

from __future__ import annotations

import collections
import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from gen_audio import SR, edge_silence  # noqa: E402


def main() -> None:
    data = Path(sys.argv[1])
    corpus = {json.loads(l)["id"]: json.loads(l) for l in (data / "corpus.jsonl").open()}
    clips = []
    problems = []
    for vdir in sorted((data / "audio").iterdir()):
        if not vdir.is_dir():
            continue
        for wav in sorted(vdir.glob("*.wav")):
            if wav.name.endswith(".tmp.wav"):
                continue
            if wav.stem not in corpus:
                problems.append(f"orphan clip {wav}")
                continue
            with wave.open(str(wav)) as w:
                fmt = (w.getnchannels(), w.getsampwidth(), w.getframerate())
                x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            if fmt != (1, 2, SR):
                problems.append(f"bad format {fmt} {wav}")
            lead, trail = edge_silence(x)
            clips.append({
                "id": wav.stem, "voice": vdir.name, "path": str(wav.relative_to(data)),
                "durSec": round(len(x) / SR, 3), "set": corpus[wav.stem]["set"],
                "extra": bool(corpus[wav.stem].get("extra")),
                "leadSilSec": round(lead, 3), "trailSilSec": round(trail, 3),
                "speechSec": round(max(len(x) / SR - lead - trail, 0.0), 3),
                "peak": round(float(np.abs(x).max()), 3),
            })
    with (data / "clips.jsonl").open("w") as f:
        for c in clips:
            f.write(json.dumps(c) + "\n")
    summ: dict = {"voices": {}, "totalHours": round(sum(c["durSec"] for c in clips) / 3600, 3),
                  "totalSpeechHours": round(sum(c["speechSec"] for c in clips) / 3600, 3)}
    for v in sorted({c["voice"] for c in clips}):
        cs = [c for c in clips if c["voice"] == v]
        per = collections.defaultdict(lambda: [0, 0.0])
        for c in cs:
            k = c["set"] + ("+extra" if c["extra"] else "")
            per[k][0] += 1
            per[k][1] += c["durSec"]
        summ["voices"][v] = {
            "clips": len(cs), "hours": round(sum(c["durSec"] for c in cs) / 3600, 3),
            "speechHours": round(sum(c["speechSec"] for c in cs) / 3600, 3),
            "perSet": {k: {"clips": n, "hours": round(s / 3600, 3), "meanSec": round(s / n, 2)}
                       for k, (n, s) in sorted(per.items())},
            "leadSil<0.1": sum(c["leadSilSec"] < 0.1 for c in cs),
            "trailSil<0.1": sum(c["trailSilSec"] < 0.1 for c in cs),
            "leadSil>0.3": sum(c["leadSilSec"] > 0.3 for c in cs),
            "trailSil>0.3": sum(c["trailSilSec"] > 0.3 for c in cs),
            "leadSilMedian": round(float(np.median([c["leadSilSec"] for c in cs])), 3),
            "trailSilMedian": round(float(np.median([c["trailSilSec"] for c in cs])), 3),
            "silentOrNearSilent(peak<0.02)": [c["id"] for c in cs if c["peak"] < 0.02],
        }
        missing = [i for i, it in corpus.items()
                   if not (data / "audio" / v / f"{i}.wav").exists() and (v != "google" or not it.get("extra"))]
        summ["voices"][v]["missingNonExtra" if v == "google" else "missing"] = missing
    per_set_all = collections.defaultdict(float)
    for c in clips:
        per_set_all[c["set"]] += c["durSec"]
    summ["hoursPerSetAllVoices"] = {k: round(s / 3600, 3) for k, s in sorted(per_set_all.items())}
    summ["problems"] = problems
    (data / "summary.json").write_text(json.dumps(summ, indent=1))
    print(json.dumps({k: v for k, v in summ.items()}, indent=1)[:6000])


if __name__ == "__main__":
    main()
