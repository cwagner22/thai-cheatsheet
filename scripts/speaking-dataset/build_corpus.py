"""Build $DATA/corpus.jsonl: the mono, word, sent and app text sets with labels.

Usage: build_corpus.py <DATA dir>   (expects <DATA>/phrases_raw.json from
dump_phrases.mjs). Items flagged ``"extra": true`` pad the dataset's hours on
the local and Microsoft voices only; the rate-limited Google voice skips them.
"""

from __future__ import annotations

import collections
import difflib
import json
import random
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from label import (  # noqa: E402
    THAI_ONLY,
    label_text,
    live_or_dead,
    tone_of_app_ipa,
    vowel_length,
)
from sentences import SENTENCES  # noqa: E402
from pythainlp.corpus import thai_syllables, thai_words  # noqa: E402
from pythainlp.corpus.tnc import word_freqs  # noqa: E402

MONO_PER_TONE = 300
MONO_EXTRA_PER_TONE = 100
WORD_MAIN = 1200
WORD_EXTRA = 700
WORD_PATTERN_CAP = 20
TONES = ["Mid", "Low", "Falling", "High", "Rising"]


def strip_tone(ipa: str) -> str:
    """Toneless, lengthless IPA key, used to align two transcriptions."""
    base = "".join(c for c in unicodedata.normalize("NFD", ipa) if not unicodedata.combining(c))
    return base.replace("ː", "")


def syls(item: dict) -> list[dict]:
    return [s for w in item["words"] for s in w["syllables"]]


def build_mono(freq: dict[str, int]) -> list[dict]:
    cands = sorted(
        (w for w in thai_syllables() & thai_words() if THAI_ONLY.match(w)),
        key=lambda w: (-freq.get(w, 0), w),
    )
    buckets: dict[str, list[dict]] = {t: [] for t in TONES}
    need = MONO_PER_TONE + MONO_EXTRA_PER_TONE
    for w in cands:
        if all(len(b) >= need for b in buckets.values()):
            break
        lab = label_text(w)
        if lab is None or len(syls(lab)) != 1:
            continue
        tone = syls(lab)[0]["tone"]
        if len(buckets[tone]) >= need:
            continue
        s = syls(lab)[0]
        buckets[tone].append(
            {
                "text": w,
                "words": lab["words"],
                "gt": lab["gt"],
                "freq": freq.get(w, 0),
                "syllableType": live_or_dead(s["ipa"]),
                "vowelLength": vowel_length(s["ipa"]),
                "_tltkRaw": lab["_tltkRaw"],
                "_g2pToneAgree": lab["_g2pToneAgree"],
            }
        )
    out = []
    for tone in TONES:
        for i, it in enumerate(buckets[tone]):
            it["extra"] = i >= MONO_PER_TONE
            out.append(it)
    # Interleave tones in frequency order so ids do not encode the tone.
    main = sorted([i for i in out if not i["extra"]], key=lambda i: -i["freq"])
    extra = sorted([i for i in out if i["extra"]], key=lambda i: -i["freq"])
    return main + extra


def build_word(freq: dict[str, int]) -> list[dict]:
    cands = sorted(
        (w for w in thai_words() if THAI_ONLY.match(w) and freq.get(w, 0) > 0 and len(w) >= 2),
        key=lambda w: (-freq[w], w),
    )
    pattern_count: collections.Counter = collections.Counter()
    out: list[dict] = []
    for w in cands:
        if len(out) >= WORD_MAIN + WORD_EXTRA:
            break
        lab = label_text(w)
        if lab is None:
            continue
        ss = syls(lab)
        if not 2 <= len(ss) <= 4:
            continue
        pat = "-".join(s["tone"] for s in ss)
        if pattern_count[pat] >= WORD_PATTERN_CAP:
            continue
        pattern_count[pat] += 1
        out.append(
            {
                "text": w,
                "words": lab["words"],
                "gt": lab["gt"],
                "freq": freq[w],
                "extra": len(out) >= WORD_MAIN,
                "_tltkRaw": lab["_tltkRaw"],
                "_g2pToneAgree": lab["_g2pToneAgree"],
            }
        )
    return out


def build_sent() -> tuple[list[dict], list[tuple[str, str]]]:
    out, dropped = [], []
    for t in dict.fromkeys(SENTENCES):
        lab = label_text(t)
        if lab is None:
            dropped.append((t, "labeller failed"))
            continue
        n = len(syls(lab))
        if not 4 <= n <= 16:
            dropped.append((t, f"{n} syllables"))
            continue
        out.append(
            {
                "text": t,
                "words": lab["words"],
                "gt": lab["gt"],
                "_tltkRaw": lab["_tltkRaw"],
                "_g2pToneAgree": lab["_g2pToneAgree"],
            }
        )
    return out, dropped


def align(gold: list[dict], auto: list[dict]) -> list[int | None]:
    """For each gold syllable, the index of its auto syllable (or None)."""
    a = [strip_tone(s["ipa"]) for s in gold]
    b = [strip_tone(s["ipa"]) for s in auto]
    m: list[int | None] = [None] * len(a)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                m[i1 + k] = j1 + k
    return m


def build_app(phrases: list[dict]) -> list[dict]:
    out = []
    for p in phrases:
        words = [
            {
                "gloss": w["gloss"],
                "syllables": [
                    {"thai": s["thai"], "ipa": s["ipa"], "tone": tone_of_app_ipa(s["ipa"])}
                    for s in w["syllables"]
                ],
            }
            for w in p["words"]
        ]
        text = "".join(s["thai"] for w in words for s in w["syllables"])
        item = {"text": text, "words": words, "phraseId": p["id"], "meaning": p["meaning"]}
        lab = label_text(text)
        gold = syls(item)
        if lab is None:
            item["gt"] = {"tltk": [None] * len(gold), "pythainlp": [None] * len(gold), "agree": False}
            item["auto"] = None
        else:
            auto = syls(lab)
            m = align(gold, auto)
            tl = [auto[j]["tone"] if j is not None else None for j in m]
            pt = [lab["gt"]["pythainlp"][j] if j is not None else None for j in m]
            item["gt"] = {"tltk": tl, "pythainlp": pt, "agree": tl == pt}
            item["auto"] = {"words": lab["words"], "gt": lab["gt"]}
        out.append(item)
    return out


def main() -> None:
    data = Path(sys.argv[1])
    freq = dict(word_freqs())
    random.seed(7)

    def number(sets: list[tuple[str, list[dict]]]) -> list[dict]:
        out = []
        for name, lst in sets:
            width = 2 if name == "app" else 4
            for n, it in enumerate(lst, 1):
                out.append({"id": f"{name}-{n:0{width}d}", "set": name, **it})
        return out

    def write(items: list[dict]) -> None:
        tmp = data / "corpus.jsonl.tmp"
        with tmp.open("w") as f:
            for i in items:
                i = {k: v for k, v in i.items() if not k.startswith("_")}
                f.write(json.dumps(i, ensure_ascii=False) + "\n")
        tmp.replace(data / "corpus.jsonl")

    app = build_app(json.loads((data / "phrases_raw.json").read_text()))
    sent, dropped = build_sent()
    # The app and sent sets are written first so the Google voice, which is
    # rate limited and voices them first, can start while the rest is built.
    write(number([("app", app), ("sent", sent)]))
    print(f"wrote app+sent ({len(app)}+{len(sent)})", flush=True)
    word = build_word(freq)
    print(f"built word ({len(word)})", flush=True)
    mono = build_mono(freq)
    print(f"built mono ({len(mono)})", flush=True)
    items = number([("app", app), ("sent", sent), ("word", word), ("mono", mono)])

    # Conversion eyeball log: tltk raw syllable -> app IPA.
    auto_items = [i for i in items if i["set"] != "app"]
    pairs = [(r, s["ipa"], s["tone"], s["thai"]) for i in auto_items for r, s in zip(i["_tltkRaw"], syls(i))]
    print("== 30 random tltk -> app IPA conversions ==")
    for r, ipa, tone, thai in random.sample(pairs, 30):
        print(f"  {thai:<8} {r:<10} -> {ipa:<10} {tone}")
    inv = collections.Counter(ch for _, ipa, _, _ in pairs for ch in unicodedata.normalize("NFD", ipa))
    print("== IPA character inventory ==")
    print("  " + " ".join(f"{c!r}:{n}" for c, n in sorted(inv.items())))

    # Labeller agreement stats.
    stats: dict = {"sets": {}}
    for name in ("mono", "word", "sent"):
        its = [i for i in items if i["set"] == name]
        tot = agree = unknown = 0
        per_tone: dict[str, list[int]] = {t: [0, 0] for t in TONES}
        conf: collections.Counter = collections.Counter()
        for i in its:
            for a, b in zip(i["gt"]["tltk"], i["gt"]["pythainlp"]):
                tot += 1
                per_tone[a][1] += 1
                if b is None:
                    unknown += 1
                elif a == b:
                    agree += 1
                    per_tone[a][0] += 1
                else:
                    conf[f"{a}->{b}"] += 1
        stats["sets"][name] = {
            "items": len(its),
            "itemsMain": sum(1 for i in its if not i.get("extra")),
            "itemsExtra": sum(1 for i in its if i.get("extra")),
            "syllables": tot,
            "syllableAgree": agree,
            "syllableAgreeRate": round(agree / tot, 4) if tot else None,
            "pythainlpNull": unknown,
            "itemAgree": sum(1 for i in its if i["gt"]["agree"]),
            "itemAgreeRate": round(sum(1 for i in its if i["gt"]["agree"]) / len(its), 4),
            "perToneAgree": {t: f"{a}/{n}" for t, (a, n) in per_tone.items()},
            "topDisagreements(tltk->pythainlp)": dict(conf.most_common(10)),
            "g2pVsTh2ipaToneMismatchItems": sum(1 for i in its if not i["_g2pToneAgree"]),
        }
    if mono:
        mi = [i for i in items if i["set"] == "mono" and not i["extra"]]
        stats["monoMainBalance"] = {
            "tone": dict(collections.Counter(syls(i)[0]["tone"] for i in mi)),
            "syllableType": dict(collections.Counter(i["syllableType"] for i in mi)),
            "vowelLength": dict(collections.Counter(i["vowelLength"] for i in mi)),
            "toneXtype": dict(collections.Counter(f'{syls(i)[0]["tone"]}/{i["syllableType"]}' for i in mi)),
            "freqZero": sum(1 for i in mi if i["freq"] == 0),
            "minFreq": min(i["freq"] for i in mi),
        }
    wi = [i for i in items if i["set"] == "word" and not i["extra"]]
    stats["wordMain"] = {
        "syllableCount": dict(collections.Counter(len(syls(i)) for i in wi)),
        "distinctTonePatterns": len({"-".join(i["gt"]["tltk"]) for i in wi}),
        "minFreq": min(i["freq"] for i in wi),
    }
    # Gold (hand-authored app phrases) vs automatic labels, per syllable.
    g_tot = g_tl = g_pt = g_unaligned = 0
    g_conf: collections.Counter = collections.Counter()
    g_rows = []
    for i in (x for x in items if x["set"] == "app"):
        gold = [s["tone"] for s in syls(i)]
        for k, (g, a, b) in enumerate(zip(gold, i["gt"]["tltk"], i["gt"]["pythainlp"])):
            g_tot += 1
            if a is None:
                g_unaligned += 1
            elif a == g:
                g_tl += 1
            else:
                g_conf[f"{g}->{a}"] += 1
                g_rows.append(f'{i["id"]} {syls(i)[k]["thai"]} gold={g} tltk={a}')
            if b == g:
                g_pt += 1
    stats["appGold"] = {
        "phrases": sum(1 for x in items if x["set"] == "app"),
        "syllables": g_tot,
        "tltkCorrect": g_tl,
        "tltkAccuracy": round(g_tl / g_tot, 4),
        "pythainlpCorrect": g_pt,
        "pythainlpAccuracy": round(g_pt / g_tot, 4),
        "unaligned": g_unaligned,
        "tltkErrors(gold->tltk)": dict(g_conf),
        "tltkErrorList": g_rows,
        "autoSyllableCountMismatch": [
            x["id"]
            for x in items
            if x["set"] == "app" and x["auto"] and len(syls(x["auto"])) != len(syls(x))
        ],
    }
    stats["sentDropped"] = dropped
    print("== stats ==")
    print(json.dumps(stats, ensure_ascii=False, indent=1))

    write(items)
    (data / "labeller_stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=1))
    print(f"wrote {len(items)} items")


if __name__ == "__main__":
    main()
