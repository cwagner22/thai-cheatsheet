"""Trains and evaluates a learned tone judge on the app's own features.

    uv run -q --python 3.12 --with numpy --with scikit-learn python \
        scripts/speaking-dataset/judge.py <data dir> [--export out.json]

Rows (see batch.ts / synthbatch.ts, features from src/lib/toneJudge.ts):
  wrong  a syllable synth.py re-pitched to another tone        label 1
  right  every other scored syllable of one native voice against
         another: untouched syllables of re-pitched takes,
         unchanged resyntheses, plain clips                        label 0
A take is never scored against its own voice here: a learner is not the
reference speaker.

Evaluated with a voice AND the text held out: for each voice, a model
trained on rows that involve neither that voice (as reference or learner)
nor texts in the test fold scores the rows where that voice is the
learner. Reports the share of wrong syllables caught at thresholds set for
a given false-flag rate on right ones, beside the current rules' flags.
"""

from __future__ import annotations

import glob
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GroupKFold

sys.path.insert(0, str(Path(__file__).parent))
from analyse import FLAGS, jsonl  # noqa: E402

QS = (1, 2, 3, 5, 10)


def rows(data: Path):
    X, y, ref, lrn, item, rule = [], [], [], [], [], []

    def add(f, label, r, l, i, v):
        X.append(f); y.append(label); ref.append(r); lrn.append(l); item.append(i); rule.append(v in FLAGS)

    for path in glob.glob(str(data / "app" / "compare-*.jsonl")):
        for r in jsonl(path):
            if r["ref"] == r["lrn"] or not r["scored"]:
                continue
            for v in r["verdicts"]:
                if v.get("f"):
                    add(v["f"], 0, r["ref"], r["lrn"], r["id"], v["v"])
    for path in glob.glob(str(data / "app" / "synth-compare-*.jsonl")):
        for r in jsonl(path):
            if not r["scored"] or r["ref"] == r["voice"]:
                continue
            changed = set(r["changed"])
            for i, v in enumerate(r["verdicts"]):
                if v.get("f"):
                    add(v["f"], int(i in changed), r["ref"], r["voice"], r["id"], v["v"])
    return tuple(np.asarray(a) for a in (X, y, ref, lrn, item, rule))


def model() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(max_iter=400, learning_rate=0.06, max_leaf_nodes=24, l2_regularization=1.0, random_state=0)


def fit(X, y):
    w = np.where(y == 1, (y == 0).sum() / max(1, y.sum()), 1.0)
    return model().fit(X, y, sample_weight=w)


def main() -> None:
    data = Path(sys.argv[1])
    X, y, ref, lrn, item, rule = rows(data)
    X = X.astype(float)
    print(f"{len(y)} syllables: {y.sum()} wrong, {len(y) - y.sum()} right")
    voices = sorted(set(lrn))
    score = np.full(len(y), np.nan)
    folds = list(GroupKFold(n_splits=4).split(X, y, item))
    for v in voices:
        for train_idx, test_idx in folds:
            test = np.zeros(len(y), bool); test[test_idx] = True; test &= lrn == v
            train = np.zeros(len(y), bool); train[train_idx] = True; train &= (lrn != v) & (ref != v)
            score[test] = fit(X[train], y[train]).predict_proba(X[test])[:, 1]
    np.save(data / "analysis" / "judge-scores.npy", score) if (data / "analysis").exists() else None
    print("\n## held-out voice as learner: wrong syllables caught at a false-flag rate on right ones")
    print(f"{'learner':10} {'ref':10} {'rules: caught':>13} {'rules: false':>12} " + " ".join(f"{'@' + str(q) + '%':>6}" for q in QS))
    for v in voices:
        for r in ["all", *sorted(set(ref))]:
            sel = (lrn == v) & ((ref == r) if r != "all" else True)
            pos, neg = sel & (y == 1), sel & (y == 0)
            if pos.sum() < 30:
                continue
            cells = []
            for q in QS:
                thr = np.quantile(score[neg], 1 - q / 100)
                cells.append(f"{np.mean(score[pos] > thr):6.2f}")
            print(f"{v:10} {r:10} {rule[pos].mean():13.2f} {rule[neg].mean():12.3f} " + " ".join(cells))
    neg = y == 0
    for q in (2, 3, 5):
        thr = np.quantile(score[neg], 1 - q / 100)
        print(f"pooled threshold for {q}% false flags: {thr:.3f}; caught {np.mean(score[y == 1] > thr):.2f}")
    if "--export" in sys.argv:
        out = sys.argv[sys.argv.index("--export") + 1]
        m = fit(X, y)
        # Parity rows for the TypeScript evaluator: features and sklearn's
        # probability, so src/lib/toneJudge.ts can be checked against it.
        rng = np.random.default_rng(0)
        pick = rng.choice(len(y), 200, replace=False)
        json.dump({"X": X[pick].tolist(), "p": m.predict_proba(X[pick])[:, 1].tolist()}, open(out + ".parity.json", "w"))
        thresholds = {q: float(np.quantile(score[y == 0], 1 - q / 100)) for q in (2, 3, 5)}
        trees = []
        for pred in m._predictors:
            nodes = pred[0].nodes
            trees.append({
                "f": nodes["feature_idx"].tolist(),
                "t": [round(float(x), 6) for x in nodes["num_threshold"]],
                "l": nodes["left"].tolist(),
                "r": nodes["right"].tolist(),
                "leaf": nodes["is_leaf"].astype(int).tolist(),
                "v": [round(float(x), 6) for x in nodes["value"]],
                "nanLeft": nodes["missing_go_to_left"].astype(int).tolist(),
            })
        base = float(np.ravel(m._baseline_prediction)[0])
        json.dump({"base": base, "trees": trees, "thresholds": thresholds}, open(out, "w"))
        print(f"exported {len(trees)} trees to {out}")


if __name__ == "__main__":
    main()
