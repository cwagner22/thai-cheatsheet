"""Repair specific items of an existing corpus.jsonl in place, keeping ids.

Usage: repair_corpus.py <DATA>

Rebuilding the corpus renumbers every item, which would orphan clips already
generated, so fixes to a handful of items are applied here instead:
- a mono item whose text fails label.THAI_ONLY (e.g. ฯลฯ) is replaced by the
  most frequent unused monosyllable of the same tone, under the same id;
- syllable IPA that tltk garbles is corrected from a fixed table, and the
  item gets "labelFixes" listing what was changed;
- every IPA string is put in Unicode NFC, the form the app's phrases.ts uses.
Any wav/praat/boundary files of a replaced item are deleted so that the
generators and praat_gt.py redo them.
"""

from __future__ import annotations

import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from label import THAI_ONLY, label_text, live_or_dead, vowel_length  # noqa: E402
from pythainlp.corpus import thai_syllables, thai_words  # noqa: E402
from pythainlp.corpus.tnc import word_freqs  # noqa: E402

# (item text, syllable thai, wrong ipa) -> right ipa. กาลเทศะ is /kaː.lá.tʰeː.sà/;
# tltk writes the เท syllable as "tʰaeː", which is not a Thai vowel.
IPA_FIXES = {("กาลเทศะ", "เท", "tʰaeː"): "tʰeː"}


def main() -> None:
    data = Path(sys.argv[1])
    path = data / "corpus.jsonl"
    items = [json.loads(l) for l in path.open()]
    used = {i["text"] for i in items}
    freq = dict(word_freqs())
    cands = sorted(
        (w for w in thai_syllables() & thai_words() if THAI_ONLY.match(w) and w not in used),
        key=lambda w: (-freq.get(w, 0), w),
    )
    for it in items:
        if it["set"] == "mono" and not THAI_ONLY.match(it["text"]):
            tone = it["words"][0]["syllables"][0]["tone"]
            for w in cands:
                lab = label_text(w)
                if lab is None:
                    continue
                ss = [s for x in lab["words"] for s in x["syllables"]]
                if len(ss) == 1 and ss[0]["tone"] == tone:
                    break
            else:
                raise SystemExit(f"no replacement for {it['id']}")
            cands.remove(w)
            print(f"{it['id']}: {it['text']} -> {w} ({tone})")
            it.update(text=w, words=lab["words"], gt=lab["gt"], freq=freq.get(w, 0),
                      syllableType=live_or_dead(ss[0]["ipa"]), vowelLength=vowel_length(ss[0]["ipa"]))
            it["replaced"] = True
            for sub in ("audio", "praat", "boundaries"):
                for f in (data / sub).glob(f"*/{it['id']}.*"):
                    f.unlink()
                    print(f"  deleted {f}")
        for w in it["words"] + ((it.get("auto") or {}).get("words") or []):
            for s in w["syllables"]:
                s["ipa"] = unicodedata.normalize("NFC", s["ipa"])
                key = (it["text"], s["thai"], s["ipa"])
                if key in IPA_FIXES:
                    s["ipa"] = IPA_FIXES[key]
                    it.setdefault("labelFixes", []).append(f"{s['thai']}: {key[2]} -> {s['ipa']}")
                    print(f"{it['id']}: fixed {key} -> {s['ipa']}")
    tmp = path.with_suffix(".jsonl.tmp")
    with tmp.open("w") as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")
    tmp.replace(path)


if __name__ == "__main__":
    main()
