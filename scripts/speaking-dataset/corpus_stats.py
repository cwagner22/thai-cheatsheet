"""Recompute labeller agreement stats from $DATA/corpus.jsonl.

Usage: corpus_stats.py <DATA>  -> prints JSON and writes $DATA/labeller_stats.json.
Agreement is per syllable, tltk (the label used) vs pythainlp tone_detector;
for the app set, both are also scored against the hand-authored gold tones.
"""

from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

TONES = ["Mid", "Low", "Falling", "High", "Rising"]


def syls(item: dict) -> list[dict]:
    return [s for w in item["words"] for s in w["syllables"]]


def main() -> None:
    data = Path(sys.argv[1])
    items = [json.loads(l) for l in (data / "corpus.jsonl").open()]
    out: dict = {"sets": {}}
    for name in ("mono", "word", "sent"):
        for scope in ("all", "main"):
            its = [i for i in items if i["set"] == name and (scope == "all" or not i.get("extra"))]
            tot = agree = null = 0
            per = {t: [0, 0] for t in TONES}
            conf: collections.Counter = collections.Counter()
            for i in its:
                for a, b in zip(i["gt"]["tltk"], i["gt"]["pythainlp"]):
                    tot += 1
                    per[a][1] += 1
                    if b is None:
                        null += 1
                    elif a == b:
                        agree += 1
                        per[a][0] += 1
                    else:
                        conf[f"{a}->{b}"] += 1
            out["sets"][f"{name}/{scope}"] = {
                "items": len(its), "syllables": tot, "agree": agree,
                "agreeRate": round(agree / tot, 4), "pythainlpNull": null,
                "itemsAllAgree": sum(i["gt"]["agree"] for i in its),
                "itemAgreeRate": round(sum(i["gt"]["agree"] for i in its) / len(its), 4),
                "perTone(tltk label)": {t: f"{a}/{n} ({a / n:.1%})" for t, (a, n) in per.items() if n},
                "topDisagreements(tltk->pythainlp)": dict(conf.most_common(8)),
            }
    allsyl = [(a, b) for i in items if i["set"] != "app" for a, b in zip(i["gt"]["tltk"], i["gt"]["pythainlp"])]
    out["overallAutoSets"] = {"syllables": len(allsyl), "agree": sum(a == b for a, b in allsyl),
                              "agreeRate": round(sum(a == b for a, b in allsyl) / len(allsyl), 4)}
    app = [i for i in items if i["set"] == "app"]
    g = [(s["tone"], a, b, i["id"], s["thai"]) for i in app for s, a, b in zip(syls(i), i["gt"]["tltk"], i["gt"]["pythainlp"])]
    out["appGold"] = {
        "phrases": len(app), "syllables": len(g),
        "tltkCorrect": sum(x == a for x, a, *_ in g), "pythainlpCorrect": sum(x == b for x, _, b, *_ in g),
        "unaligned": sum(a is None for _, a, *_ in g),
        "tltkErrors": [f"{i} {t}: gold {x}, tltk {a}" for x, a, b, i, t in g if a is not None and a != x],
        "pythainlpErrors": [f"{i} {t}: gold {x}, pythainlp {b}" for x, a, b, i, t in g if b != x],
    }
    out["appGold"]["tltkAccuracy"] = round(out["appGold"]["tltkCorrect"] / len(g), 4)
    out["appGold"]["pythainlpAccuracy"] = round(out["appGold"]["pythainlpCorrect"] / len(g), 4)
    ipa_diff = []
    for i in app:
        if i.get("auto"):
            auto = [s["ipa"] for s in syls(i["auto"])]
            gold = [s["ipa"] for s in syls(i)]
            if auto != gold:
                ipa_diff.append(f'{i["id"]}: gold {".".join(gold)} | auto {".".join(auto)}')
    out["appGold"]["ipaDifferences"] = ipa_diff
    mono = [i for i in items if i["set"] == "mono" and not i.get("extra")]
    out["monoMain"] = {
        "tone": dict(collections.Counter(syls(i)[0]["tone"] for i in mono)),
        "syllableType": dict(collections.Counter(i["syllableType"] for i in mono)),
        "vowelLength": dict(collections.Counter(i["vowelLength"] for i in mono)),
        "tone/type": dict(sorted(collections.Counter(f'{syls(i)[0]["tone"]}/{i["syllableType"]}' for i in mono).items())),
        "minTncFreq": min(i["freq"] for i in mono),
    }
    word = [i for i in items if i["set"] == "word" and not i.get("extra")]
    out["wordMain"] = {
        "syllableCount": dict(sorted(collections.Counter(len(syls(i)) for i in word).items())),
        "distinctTonePatterns": len({"-".join(i["gt"]["tltk"]) for i in word}),
        "minTncFreq": min(i["freq"] for i in word),
    }
    sent = [i for i in items if i["set"] == "sent"]
    out["sent"] = {"syllableCount": dict(sorted(collections.Counter(len(syls(i)) for i in sent).items())),
                   "toneCounts": dict(collections.Counter(s["tone"] for i in sent for s in syls(i)))}
    (data / "labeller_stats.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
