"""Sanity check: mean Praat F0 shape per labelled tone on the mono set.

Usage: tone_sanity.py <DATA>. For each voice and tone, the voiced F0 of each
mono clip is converted to semitones relative to that voice's median F0 over
all mono clips, sampled at 10/50/90 % of the clip's longest voiced run, and
averaged. Thai citation tones should come out roughly as Mid level, Low low
and falling, Falling high then falling, High high/rising, Rising low then up.
"""

from __future__ import annotations

import json
import math
import statistics
import sys
from pathlib import Path


def longest_run(f0: list) -> list[float]:
    best: list[float] = []
    cur: list[float] = []
    for v in f0 + [None]:
        if v:
            cur.append(v)
        else:
            if len(cur) > len(best):
                best = cur
            cur = []
    return best


def main() -> None:
    data = Path(sys.argv[1])
    items = [json.loads(l) for l in (data / "corpus.jsonl").open()]
    mono = {i["id"]: i["words"][0]["syllables"][0]["tone"] for i in items if i["set"] == "mono"}
    out = {}
    for vdir in sorted((data / "praat").iterdir()):
        runs = {}
        for cid, tone in mono.items():
            f = vdir / f"{cid}.json"
            if f.exists():
                r = longest_run(json.loads(f.read_text())["f0"])
                if len(r) >= 5:
                    runs[cid] = (tone, r)
        if not runs:
            continue
        ref = statistics.median(v for _, r in runs.values() for v in r)
        per: dict = {}
        for tone, r in runs.values():
            st = [12 * math.log2(v / ref) for v in r]
            pts = [st[int(p * (len(st) - 1))] for p in (0.1, 0.5, 0.9)]
            per.setdefault(tone, []).append(pts)
        out[vdir.name] = {
            "refHz": round(ref),
            **{t: {"n": len(p), "st@10/50/90%": [round(statistics.mean(x[k] for x in p), 1) for k in range(3)]}
               for t, p in sorted(per.items())},
        }
    print(json.dumps(out, indent=1))
    (data / "tone_sanity.json").write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
