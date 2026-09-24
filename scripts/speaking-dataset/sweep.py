"""Sweeps the rule thresholds of contour.ts's flat and shape verdicts over
the dataset, recomputing each verdict from the stored features.

    uv run -q --python 3.12 --with numpy --with scikit-learn python \
        scripts/speaking-dataset/sweep.py <data dir>

For each setting: the share of right syllables flagged (native voices
against each other, untouched syllables) and of wrong ones caught
(re-pitched by synth.py), both over syllables scored on their own.
"""

from __future__ import annotations

import itertools
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from judge import rows  # noqa: E402

NAMES = None


def main() -> None:
    data = Path(sys.argv[1])
    X, y, ref, lrn, item, rule = rows(data)
    X = X.astype(float)
    sys.path.insert(0, str(Path(__file__).parent))
    names = [
        *[f"ref{k}" for k in range(8)], *[f"lrn{k}" for k in range(8)], *[f"diff{k}" for k in range(8)],
        "refUp", "refDown", "lrnUp", "lrnDown", "refSwUp", "refSwDown", "lrnSwUp", "lrnSwDown",
        "refRange", "lrnRange", "refSlope", "lrnSlope", "corr", "level",
        "toneMid", "toneLow", "toneFalling", "toneHigh", "toneRising",
        "refN", "lrnN", "nativeMs", "final", "dead", "long",
    ]
    c = {n: X[:, i] for i, n in enumerate(names)}
    direction = c["toneLow"] * -1 + c["toneFalling"] * -1 + c["toneHigh"] + c["toneRising"]
    with_it = np.where(direction < 0, c["lrnDown"], c["lrnUp"])
    want_raw = np.where(direction < 0, c["refDown"], c["refUp"])
    against = np.where(direction < 0, c["lrnSwUp"], c["lrnSwDown"])
    ref_against = np.where(direction < 0, c["refSwUp"], c["refSwDown"])
    swing_level = np.maximum(c["lrnSwUp"] - c["refSwUp"], c["lrnSwDown"] - c["refSwDown"])
    pos, neg = y == 1, y == 0
    print(f"{pos.sum()} wrong, {neg.sum()} right; current rules: caught {rule[pos].mean():.3f}, false {rule[neg].mean():.3f}")
    print(f"{'min want':>8} {'flat share':>10} {'swing':>6} {'glide pts':>9}  {'false':>6} {'caught':>6}  {'flat F/C':>11} {'shape F/C':>11}")
    results = []
    for min_want, flat_share, swing, glide_pts in itertools.product([2.5, 3.5, 4.5], [1 / 3, 0.2, 0.1], [2.5, 3.5, 4.5, 6], [6]):
        want = np.where(c["refN"] >= glide_pts, want_raw, 0)
        flat = (direction != 0) & (want >= min_want) & (with_it < flat_share * want)
        shape_level = (direction == 0) & (swing_level >= swing)
        shape_contour = (direction != 0) & (against - ref_against >= swing) & (against > with_it)
        shape = shape_level | shape_contour
        flag = flat | shape
        results.append((flag[neg].mean(), flag[pos].mean(), min_want, flat_share, swing, glide_pts, flat[neg].mean(), flat[pos].mean(), shape[neg].mean(), shape[pos].mean()))
    for fp, tp, mw, fs, sw, gp, ff, fc, sf, sc in sorted(results):
        print(f"{mw:8.1f} {fs:10.2f} {sw:6.1f} {gp:9d}  {fp:6.3f} {tp:6.3f}  {ff:5.3f}/{fc:5.3f} {sf:5.3f}/{sc:5.3f}")


if __name__ == "__main__":
    main()
