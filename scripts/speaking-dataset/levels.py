"""Is a syllable's pitch level comparable across native voices?

    uv run -q --python 3.12 --with numpy python scripts/speaking-dataset/levels.py <data dir>

Each voice's clip is cut into syllables by the app's own segmentation and
each syllable reduced to its mean pitch, in semitones from the voice's
register, under several normalisations. For each normalisation: the noise
(how far two native voices differ on the same syllable) against the signal
(how far apart the tones sit within one voice). A level check can only be
trusted where the signal clearly exceeds the noise.
"""

from __future__ import annotations

import collections
import itertools
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from analyse import app_rows, load_corpus, syllables  # noqa: E402

TONES = ["Mid", "Low", "Falling", "High", "Rising"]


def norms(levels: np.ndarray, spread: float) -> dict[str, np.ndarray]:
    n = len(levels)
    idx = np.arange(n)
    out = {"raw": levels, "range": levels / max(spread, 1e-6) * 6}
    if n >= 3:
        slope, icpt = np.polyfit(idx, levels, 1)
        out["declination"] = levels - (slope * idx + icpt)
    else:
        out["declination"] = levels - levels.mean()
    nb = np.array([np.mean([levels[j] for j in (i - 1, i + 1) if 0 <= j < n]) if n > 1 else levels[i] for i in range(n)])
    out["neighbours"] = levels - nb
    out["sentence mean"] = levels - levels.mean()
    return out


def main() -> None:
    data = Path(sys.argv[1])
    corpus = load_corpus(data)
    per = collections.defaultdict(dict)  # id -> voice -> {norm: levels}
    for row in app_rows(data):
        item = corpus.get(row["id"])
        if not item or not row["spans"] or item["set"] not in ("sent", "app"):
            continue
        syl = syllables(item)
        if len(syl) != len(row["judged"]):
            continue
        lv = np.array([np.mean([p[1] for p in pts]) if len(pts) >= 3 else np.nan for pts in row["judged"]])
        if np.isnan(lv).any():
            continue
        allst = np.array([p[1] for pts in row["judged"] for p in pts])
        spread = np.percentile(allst, 90) - np.percentile(allst, 10)
        per[row["id"]][row["voice"]] = (norms(lv, spread), [s["tone"] for s in syl])
    names = ["raw", "range", "declination", "neighbours", "sentence mean"]
    for name in names:
        noise = collections.defaultdict(list)
        by_tone = collections.defaultdict(lambda: collections.defaultdict(list))
        for cid, voices in per.items():
            for v, (nm, tones) in voices.items():
                for t, x in zip(tones, nm[name]):
                    by_tone[v][t].append(x)
            for a, b in itertools.combinations(sorted(voices), 2):
                noise[f"{a}~{b}"].extend(np.abs(voices[a][0][name] - voices[b][0][name]).tolist())
        allnoise = np.concatenate([np.asarray(x) for x in noise.values()])
        print(f"\n## {name}: native-vs-native |difference| p50 {np.median(allnoise):.2f} p90 {np.percentile(allnoise, 90):.2f} p95 {np.percentile(allnoise, 95):.2f}")
        for v, tt in sorted(by_tone.items()):
            means = {t: np.mean(tt[t]) for t in TONES if tt[t]}
            sds = {t: np.std(tt[t]) for t in TONES if tt[t]}
            print(f"   {v:10} " + "  ".join(f"{t[:3]} {means[t]:+5.2f}±{sds[t]:.2f}" for t in TONES if t in means))
        # Separation of the level-defined pairs, pooled over voices, in units of the native noise p90.
        pooled = collections.defaultdict(list)
        for v, tt in by_tone.items():
            for t in TONES:
                pooled[t].extend(tt[t])
        p90 = np.percentile(allnoise, 90)
        for a, b in [("Mid", "Low"), ("Mid", "High"), ("Low", "High")]:
            d = abs(np.mean(pooled[a]) - np.mean(pooled[b]))
            print(f"   {a}-{b}: gap of means {d:.2f} st = {d / p90:.2f} × native p90 noise")


if __name__ == "__main__":
    main()
