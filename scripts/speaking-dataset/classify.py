"""Tone classifier on Praat pitch contours, over the app's syllable slots.

    uv run -q --python 3.12 --with numpy --with scikit-learn python \
        scripts/speaking-dataset/classify.py <data dir> [--source praat|app]

Each syllable becomes a fixed-length contour: semitones from the clip's
register at 12 evenly spaced points of its voiced frames, plus the frames'
spread and duration, and whether the syllable ends in a stop. Trained with
the voice and the text both held out: each voice is scored by models
trained on the other three voices' takes of other texts. Prints accuracy per voice and
set, the confusion matrix, and the syllables every voice seems to say with
a tone other than the label — label errors or TTS mistakes.

Writes <data dir>/analysis/tone-probs.jsonl: per (voice, id, syllable
index) the predicted probability of each tone, out of fold.
"""

from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import GroupKFold

sys.path.insert(0, str(Path(__file__).parent))
from analyse import APP_CENTRE_MS, app_rows, fold, load_corpus, load_praat, register, syllables  # noqa: E402

TONES = ["Mid", "Low", "Falling", "High", "Rising"]
POINTS = 12
STOP_FINAL = set("ptkʔ")


def bare(ipa: str) -> str:
    import unicodedata

    return "".join(c for c in unicodedata.normalize("NFD", ipa) if not unicodedata.combining(c))


def contour(ms: np.ndarray, st: np.ndarray) -> np.ndarray | None:
    ok = ~np.isnan(st)
    if ok.sum() < 4:
        return None
    ms, st = ms[ok], st[ok]
    grid = np.linspace(ms[0], ms[-1], POINTS)
    return np.interp(grid, ms, st)


def features(data: Path, source: str):
    corpus = load_corpus(data)
    X, y, groups, meta = [], [], [], []
    for row in app_rows(data):
        item = corpus.get(row["id"])
        if not item or not row["spans"]:
            continue
        syl = syllables(item)
        if len(syl) != len(row["spans"]):
            continue
        if source == "praat":
            pr = load_praat(data, row["voice"], row["id"])
            if pr is None:
                continue
            tp = np.asarray(pr["t"], float) * 1000 + APP_CENTRE_MS
            f0 = np.array([np.nan if v is None else v for v in pr["f0"]], float)
            reg = register(f0)
            st_all = np.where(np.isnan(f0), np.nan, fold(np.nan_to_num(f0, nan=reg), reg))
        n = len(syl)
        for i, (s, span) in enumerate(zip(syl, row["spans"])):
            if source == "praat":
                sel = (tp >= span[0]) & (tp <= span[1])
                c = contour(tp[sel], st_all[sel])
            else:
                pts = np.asarray(row["judged"][i], float) if row["judged"][i] else np.zeros((0, 2))
                c = contour(pts[:, 0], pts[:, 1]) if len(pts) else None
            if c is None:
                continue
            b = bare(s["ipa"])
            f = np.concatenate([
                c,
                c - c.mean(),
                [c.max() - c.min(), span[1] - span[0], float(b[-1:] in STOP_FINAL), float("ː" in b), float(i == n - 1), float(n == 1)],
            ])
            X.append(f)
            y.append(TONES.index(s["tone"]))
            groups.append(row["id"])
            meta.append((row["voice"], row["id"], i, s["thai"], s["tone"], item["set"]))
    return np.asarray(X), np.asarray(y), np.asarray(groups), meta


def main() -> None:
    data = Path(sys.argv[1])
    source = sys.argv[sys.argv.index("--source") + 1] if "--source" in sys.argv else "praat"
    X, y, groups, meta = features(data, source)
    print(f"{len(y)} syllables from {len(set(groups))} items, source={source}")
    probs = np.zeros((len(y), len(TONES)))
    voice = np.asarray([m[0] for m in meta])
    # Voice and text both held out: a learner is never one of the training
    # voices, and a text heard in training would leak its tones.
    for v in sorted(set(voice)):
        for train, test in GroupKFold(n_splits=4).split(X, y, groups):
            tr = train[voice[train] != v]
            te = test[voice[test] == v]
            model = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.08, random_state=0)
            model.fit(X[tr], y[tr])
            probs[te] = model.predict_proba(X[te])
    pred = probs.argmax(1)
    acc = collections.defaultdict(list)
    for m, p, t in zip(meta, pred, y):
        acc[(m[0], m[5])].append(p == t)
    print("\n## accuracy, out of fold")
    for k, v in sorted(acc.items()):
        print(f"  {k[0]:10} {k[1]:5} n={len(v):6} acc={np.mean(v):.3f}")
    print("\n## confusion (rows = label, cols = predicted):", " ".join(TONES))
    print(confusion_matrix(y, pred))
    out = data / "analysis"
    out.mkdir(exist_ok=True)
    with open(out / f"tone-probs-{source}.jsonl", "w", encoding="utf8") as fh:
        for m, pr in zip(meta, probs):
            fh.write(json.dumps({"voice": m[0], "id": m[1], "i": m[2], "thai": m[3], "tone": m[4], "set": m[5], "p": [round(float(x), 3) for x in pr]}, ensure_ascii=False) + "\n")
    # Syllables every voice that said them seems to say with one other tone.
    by = collections.defaultdict(list)
    for m, pr in zip(meta, probs):
        by[(m[1], m[2])].append((m[0], pr, m[3], m[4]))
    odd = []
    for (cid, i), rows in by.items():
        if len(rows) < 3:
            continue
        label = TONES.index(rows[0][3])
        mean = np.mean([r[1] for r in rows], axis=0)
        if mean[label] < 0.15 and mean.max() > 0.6:
            odd.append((mean.max(), cid, i, rows[0][2], rows[0][3], TONES[int(mean.argmax())]))
    odd.sort(reverse=True)
    print(f"\n## every voice disagrees with the label ({len(odd)}): id syllable label heard p")
    for p, cid, i, thai, label, heard in odd[:40]:
        print(f"  {cid:12} {i:2} {thai:8} {label:8} → {heard:8} {p:.2f}")


if __name__ == "__main__":
    main()
