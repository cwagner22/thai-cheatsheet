"""Analyses the app's pipeline output (batch.ts) against Praat ground truth.

    uv run -q --python 3.12 --with numpy --with scikit-learn python \
        scripts/speaking-dataset/analyse.py <data dir> [pitch|glides|fp|all]

pitch   the app's pitch track against Praat's, per voice
glides  each native contour syllable: does the app's "cuts the glide
        short" note agree with the glide Praat measures on the same span
fp      native-against-native scoring: how often a native voice is flagged
synth   wrong-tone takes (synth.py): changed syllables caught, others spared
"""

from __future__ import annotations

import collections
import glob
import json
import math
import sys
from pathlib import Path

import numpy as np

DIRECTION = {"Mid": 0, "Low": -1, "Falling": -1, "High": 1, "Rising": 1}
MIN_WANT_ST = 2.5
FLAGS = {"high", "low", "flat", "shape", "missing"}
# The app's frame at t covers the 2048 samples (42.7 ms at 48 kHz) ending
# at t; Praat stamps a frame at its window's centre.
APP_CENTRE_MS = 21.3


def jsonl(path: str):
    with open(path, encoding="utf8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def load_corpus(data: Path) -> dict[str, dict]:
    return {it["id"]: it for it in jsonl(str(data / "corpus.jsonl"))}


def syllables(item: dict) -> list[dict]:
    return [s for w in item["words"] for s in w["syllables"]]


def load_praat(data: Path, voice: str, cid: str) -> dict | None:
    p = data / "praat" / voice / f"{cid}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())


def praat_at(pr: dict, ms: np.ndarray) -> np.ndarray:
    """Praat F0 (Hz, nan unvoiced) at the given times, nearest frame."""
    t = np.asarray(pr["t"], float) * 1000
    f0 = np.array([np.nan if v is None else v for v in pr["f0"]], float)
    idx = np.clip(np.searchsorted(t, ms), 1, len(t) - 1)
    left = idx - 1
    nearer = np.where(np.abs(t[left] - ms) <= np.abs(t[idx] - ms), left, idx)
    out = f0[nearer]
    out[np.abs(t[nearer] - ms) > 12] = np.nan
    return out


def fold_hz(hz: np.ndarray, ref: float) -> np.ndarray:
    """The app's foldOctave: halve or double into [ref / 1.5, ref * 1.5]."""
    out = np.array(hz, float)
    for _ in range(4):
        out = np.where(out / ref > 1.5, out / 2, out)
        out = np.where(ref / out > 1.5, out * 2, out)
    return out


def fold(hz: np.ndarray, ref: float) -> np.ndarray:
    """Semitones from `ref`, octave-folded the way the app folds."""
    return 12 * np.log2(fold_hz(hz, ref) / ref)


def register(hz: np.ndarray) -> float:
    """The app's registerHz: a median, then the median of octave-folded values."""
    v = hz[~np.isnan(hz)]
    if len(v) == 0:
        return float("nan")
    rough = float(np.median(v))
    return float(np.median(fold_hz(v, rough)))


def pct(ys: np.ndarray, q: float) -> float:
    s = np.sort(ys)
    return float(s[min(len(s) - 1, max(0, int(round(q * (len(s) - 1)))))])


def travel(xs: np.ndarray, direction: int) -> float:
    """The app's travel(): trimmed extreme of one half against the other."""
    if len(xs) < 2:
        return 0.0
    half = max(1, len(xs) // 2)
    a, b = xs[:half], xs[half:]
    hi = lambda ys: pct(ys, 0.85) if len(ys) >= 4 else float(ys.max())
    lo = lambda ys: pct(ys, 0.15) if len(ys) >= 4 else float(ys.min())
    return hi(a) - lo(b) if direction < 0 else hi(b) - lo(a)


def app_rows(data: Path):
    for path in sorted(glob.glob(str(data / "app" / "frames-*.jsonl"))):
        yield from jsonl(path)


# ---------------------------------------------------------------- pitch
def pitch(data: Path) -> None:
    stats = collections.defaultdict(lambda: collections.Counter())
    errs = collections.defaultdict(list)
    for row in app_rows(data):
        pr = load_praat(data, row["voice"], row["id"])
        if pr is None:
            continue
        t = np.asarray(row["t"], float) - APP_CENTRE_MS
        app = np.array([np.nan if v is None else v for v in row["hz"]], float)
        ref = praat_at(pr, t)
        v = row["voice"]
        av, pv = ~np.isnan(app), ~np.isnan(ref)
        s = stats[v]
        s["praat_voiced"] += int(pv.sum())
        s["app_voiced"] += int(av.sum())
        s["both"] += int((av & pv).sum())
        both = av & pv
        d = 12 * np.log2(app[both] / ref[both])
        s["gross"] += int((np.abs(d) > 3).sum())
        s["octave"] += int((np.abs(np.abs(d) - 12) < 2).sum())
        errs[v].extend(np.abs(d[np.abs(d) <= 3]).tolist())
    print("\n## pitch track vs Praat (frames)")
    print(f"{'voice':10} {'recall':>7} {'precis':>7} {'gross>3st':>9} {'octave':>7} {'median|d|':>9} {'p90|d|':>7}")
    for v, s in sorted(stats.items()):
        e = np.asarray(errs[v])
        print(
            f"{v:10} {s['both'] / max(1, s['praat_voiced']):7.3f} {s['both'] / max(1, s['app_voiced']):7.3f}"
            f" {s['gross'] / max(1, s['both']):9.4f} {s['octave'] / max(1, s['both']):7.4f}"
            f" {np.median(e) if len(e) else float('nan'):9.3f} {np.percentile(e, 90) if len(e) else float('nan'):7.3f}"
        )


# ---------------------------------------------------------------- glides
def glides(data: Path) -> None:
    corpus = load_corpus(data)
    table = collections.defaultdict(collections.Counter)
    examples = collections.defaultdict(list)
    by_tone = collections.defaultdict(list)
    for row in app_rows(data):
        item = corpus.get(row["id"])
        pr = load_praat(data, row["voice"], row["id"])
        if not item or pr is None or not row["spans"]:
            continue
        syl = syllables(item)
        if len(syl) != len(row["spans"]):
            continue
        tp = np.asarray(pr["t"], float) * 1000
        f0 = np.array([np.nan if v is None else v for v in pr["f0"]], float)
        reg = register(f0)
        mism = set(row["mismatches"] or [])
        for i, (s, span, judged) in enumerate(zip(syl, row["spans"], row["judged"])):
            direction = DIRECTION[s["tone"]]
            if direction == 0:
                continue
            # Same stretch the app judged: its own points plus any spill.
            if judged:
                lo, hi = judged[0][0], judged[-1][0]
            else:
                lo, hi = span
            sel = (tp >= lo - APP_CENTRE_MS) & (tp <= hi - APP_CENTRE_MS) & ~np.isnan(f0)
            xs = fold(f0[sel], reg)
            if len(xs) < 4 or len(judged) < 3:
                continue
            praat_travel = travel(xs, direction)
            app_travel = travel(np.asarray([p[1] for p in judged]), direction)
            note = i in mism
            glide = praat_travel >= MIN_WANT_ST
            key = (row["voice"], item["set"])
            cell = ("note" if note else "no-note") + "/" + ("praat-glide" if glide else "praat-flat")
            table[key][cell] += 1
            by_tone[(row["voice"], item["set"], s["tone"])].append(praat_travel)
            if note and glide:
                examples["note-but-praat-glides"].append((row["voice"], row["id"], s["thai"], s["tone"], round(praat_travel, 1), round(app_travel, 1)))
            if not note and not glide:
                examples["no-note-but-praat-flat"].append((row["voice"], row["id"], s["thai"], s["tone"], round(praat_travel, 1), round(app_travel, 1)))
    print("\n## glide notes (contour syllables of every clip as native)")
    print(f"{'voice/set':22} {'n':>6} {'note':>6} {'agree':>6} {'note,Praat glides':>18} {'no note,Praat flat':>19}")
    for key, c in sorted(table.items()):
        n = sum(c.values())
        agree = c["note/praat-flat"] + c["no-note/praat-glide"]
        print(
            f"{key[0] + '/' + key[1]:22} {n:6} {(c['note/praat-flat'] + c['note/praat-glide']) / n:6.2f}"
            f" {agree / n:6.2f} {c['note/praat-glide'] / n:18.3f} {c['no-note/praat-flat'] / n:19.3f}"
        )
    print("\n## Praat travel in the taught direction, median (share ≥ 2.5 st)")
    for key, xs in sorted(by_tone.items()):
        a = np.asarray(xs)
        print(f"  {key[0]:10} {key[1]:5} {key[2]:8} n={len(a):5} median={np.median(a):5.1f} glides={np.mean(a >= MIN_WANT_ST):.2f}")
    for k, ex in examples.items():
        print(f"\n## {k} (first 15 of {len(ex)}): voice id syllable tone praatTravel appTravel")
        for e in ex[:15]:
            print("  ", *e)


# ---------------------------------------------------------------- fp
def fp(data: Path) -> None:
    corpus = load_corpus(data)
    rates = collections.defaultdict(collections.Counter)
    by_tone = collections.defaultdict(collections.Counter)
    for path in sorted(glob.glob(str(data / "app" / "compare-*.jsonl"))):
        for row in jsonl(path):
            item = corpus.get(row["id"])
            if not item:
                continue
            key = (row["ref"] + ">" + row["lrn"], item["set"])
            c = rates[key]
            c["pairs"] += 1
            if not row["scored"]:
                c["not scored"] += 1
                continue
            syl = syllables(item)
            flagged = False
            for s, v in zip(syl, row["verdicts"]):
                c["syllables"] += 1
                c[v["v"]] += 1
                by_tone[(row["ref"] + ">" + row["lrn"], s["tone"])][v["v"]] += 1
                flagged |= v["v"] in FLAGS
            c["flagged pairs"] += int(flagged)
    print("\n## native against native: share of syllables per verdict")
    cols = ["good", "unsure", "high", "low", "flat", "shape", "missing"]
    print(f"{'pair/set':28} {'pairs':>6} {'unscored':>8} {'flagged':>8} " + " ".join(f"{c:>7}" for c in cols))
    for key, c in sorted(rates.items()):
        n = max(1, c["syllables"])
        print(
            f"{key[0] + '/' + key[1]:28} {c['pairs']:6} {c['not scored'] / max(1, c['pairs']):8.3f}"
            f" {c['flagged pairs'] / max(1, c['pairs'] - c['not scored']):8.3f} "
            + " ".join(f"{c[k] / n:7.3f}" for k in cols)
        )
    print("\n## flag rate by tone (syllables flagged / scored)")
    for key, c in sorted(by_tone.items()):
        n = sum(c.values())
        f = sum(c[k] for k in FLAGS)
        print(f"  {key[0]:18} {key[1]:8} n={n:6} flagged={f / max(1, n):.3f} " + " ".join(f"{k}={c[k]}" for k in cols if c[k]))


# ---------------------------------------------------------------- synth
def synth(data: Path) -> None:
    """Wrong-tone takes: detection on the changed syllables, false flags on
    the untouched ones and on the unchanged controls."""
    corpus = load_corpus(data)
    for path in sorted(glob.glob(str(data / "app" / "synth-compare-*.jsonl"))):
        c = collections.defaultdict(collections.Counter)
        by_swap = collections.defaultdict(collections.Counter)
        for row in jsonl(path):
            item = corpus.get(row["id"])
            if not item or not row["scored"]:
                c[row["voice"]]["unscored"] += 1
                continue
            syl = syllables(item)
            changed = dict(zip(row["changed"], row["to"]))
            kind = "ctrl" if not changed else "edit"
            for i, v in enumerate(row["verdicts"]):
                flag = v["v"] in FLAGS
                if kind == "ctrl":
                    c[row["voice"]]["ctrl syl"] += 1
                    c[row["voice"]]["ctrl flagged"] += flag
                elif i in changed:
                    c[row["voice"]]["changed syl"] += 1
                    c[row["voice"]]["changed flagged"] += flag
                    c[row["voice"]]["changed unsure"] += v["v"] == "unsure"
                    swap = f"{syl[i]['tone']}>{changed[i]}"
                    by_swap[swap]["n"] += 1
                    by_swap[swap][v["v"]] += 1
                else:
                    c[row["voice"]]["other syl"] += 1
                    c[row["voice"]]["other flagged"] += flag
        print(f"\n## wrong-tone takes, {Path(path).stem}")
        print(f"{'voice':10} {'detected':>9} {'unsure':>7} {'false:other':>11} {'false:ctrl':>10} {'unscored':>8}")
        for v, s in sorted(c.items()):
            print(
                f"{v:10} {s['changed flagged'] / max(1, s['changed syl']):9.3f} {s['changed unsure'] / max(1, s['changed syl']):7.3f}"
                f" {s['other flagged'] / max(1, s['other syl']):11.3f} {s['ctrl flagged'] / max(1, s['ctrl syl']):10.3f} {s['unscored']:8}"
            )
        print("  by swap (label>made): n, share flagged, verdicts")
        for k, s in sorted(by_swap.items()):
            f = sum(s[x] for x in FLAGS)
            print(f"    {k:16} n={s['n']:4} flagged={f / s['n']:.2f} " + " ".join(f"{x}={s[x]}" for x in ["good", "unsure", *sorted(FLAGS)] if s[x]))


if __name__ == "__main__":
    data = Path(sys.argv[1])
    what = sys.argv[2] if len(sys.argv) > 2 else "all"
    for name, fn in [("pitch", pitch), ("glides", glides), ("fp", fp), ("synth", synth)]:
        if what in (name, "all"):
            fn(data)
