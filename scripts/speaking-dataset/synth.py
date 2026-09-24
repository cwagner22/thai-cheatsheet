"""Wrong-tone takes with a known answer: native clips with one or two
syllables re-pitched to another tone by Praat's overlap-add resynthesis.

    uv run -q --python 3.12 --with numpy --with praat-parselmouth python \
        scripts/speaking-dataset/synth.py <data dir> <voice> [max items]

A syllable's new contour is the target tone's shape — one of the voice's
own citation contours from the mono set, picked at random, mean removed and
scaled by 0.6–1.3 — laid over the syllable's voiced frames at its original
mean level, so only the shape changes; with fewer than 20 mono clips of the
tone for the voice, a textbook shape stands in. Each item also
gets an unchanged resynthesis, the control that measures what the
resynthesis alone does to the scores.

Syllable spans come from the app's own segmentation of that clip
(app/frames-*.jsonl). Writes <data dir>/synth/<voice>/<id>__<tag>.wav and
<data dir>/synth/manifest.jsonl lines {id, voice, path, changed, to}.
"""

from __future__ import annotations

import glob
import json
import random
import sys
from pathlib import Path

import numpy as np
import parselmouth
from parselmouth.praat import call

sys.path.insert(0, str(Path(__file__).parent))
from analyse import APP_CENTRE_MS, DIRECTION, fold, jsonl, load_corpus, load_praat, register, syllables  # noqa: E402

TONES = ["Mid", "Low", "Falling", "High", "Rising"]
# The tones a learner confuses a tone with, most telling first.
WRONG = {
    "Mid": ["Falling", "Rising", "Low"],
    "Low": ["Rising", "High", "Mid"],
    "Falling": ["Rising", "Mid", "High"],
    "High": ["Low", "Falling", "Mid"],
    "Rising": ["Falling", "Mid", "High"],
}
# Semitones at 5 evenly spaced points, used when the voice has no mono set.
TEXTBOOK = {
    "Mid": [0, 0, 0, -0.3, -0.6],
    "Low": [0.5, 0, -1, -2, -3],
    "Falling": [1.5, 2.5, 1.5, -1, -3.5],
    "High": [-1, -0.5, 0.5, 2, 3],
    "Rising": [-1, -2.5, -2.5, 0, 3.5],
}
POINTS = 12


def minor(ipa: str) -> bool:
    """The app's isMinor (segment.ts): a short open syllable such as the
    /sa/ of สวัสดี, which carries no tone anyone hears and is not judged."""
    import re
    import unicodedata

    bare = "".join(c for c in unicodedata.normalize("NFD", ipa) if not unicodedata.combining(c))
    long = "ː" in bare or re.search(r"ia|ɯa|ua|iə|ɯə|uə", bare)
    return not long and bool(re.search(r"[aeiouɛɔɤɯə]$", bare))


def templates(data: Path, voice: str) -> dict[str, list[np.ndarray]]:
    corpus = load_corpus(data)
    shapes: dict[str, list[np.ndarray]] = {t: [] for t in TONES}
    for path in glob.glob(str(data / "app" / "frames-*.jsonl")):
        for row in jsonl(path):
            item = corpus.get(row["id"])
            if row["voice"] != voice or not item or item["set"] != "mono":
                continue
            pr = load_praat(data, voice, row["id"])
            if pr is None:
                continue
            f0 = np.array([np.nan if v is None else v for v in pr["f0"]], float)
            ok = ~np.isnan(f0)
            if ok.sum() < 8:
                continue
            st = fold(f0[ok], register(f0))
            c = np.interp(np.linspace(0, 1, POINTS), np.linspace(0, 1, len(st)), st)
            shapes[syllables(item)[0]["tone"]].append(c - c.mean())
    out = {}
    for t in TONES:
        if len(shapes[t]) >= 20:
            out[t] = shapes[t]
        else:
            tb = np.asarray(TEXTBOOK[t], float)
            c = np.interp(np.linspace(0, 1, POINTS), np.linspace(0, 1, len(tb)), tb)
            out[t] = [c - c.mean()]
    return out


def resynth(wav: Path, edits: list[tuple[float, float, np.ndarray, float]], dst: Path) -> None:
    """edits: (start s, end s, semitone offsets from the clip's register at
    evenly spaced points, carry s), applied to the clip's pitch tier. For
    `carry` seconds after the edit the original points are dropped, so the
    pitch moves from the new contour's end back to the original line
    instead of jumping: the app judges a gliding syllable together with the
    start of the next one, and a speaker who ends a syllable low starts the
    next one from there."""
    sound = parselmouth.Sound(str(wav))
    manip = call(sound, "To Manipulation", 0.01, 60, 500)
    tier = call(manip, "Extract pitch tier")
    pitch = sound.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=500)
    f0 = pitch.selected_array["frequency"]
    reg = register(np.where(f0 > 0, f0, np.nan))
    for start, end, shape, carry in edits:
        call(tier, "Remove points between", start, end + carry)
        for x, st in zip(np.linspace(start, end, len(shape)), shape):
            call(tier, "Add point", float(x), float(reg * 2 ** (st / 12)))
    call([tier, manip], "Replace pitch tier")
    out = call(manip, "Get resynthesis (overlap-add)")
    out.save(str(dst), "WAV")


def main() -> None:
    data = Path(sys.argv[1])
    voice = sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 400
    rng = random.Random(7)
    corpus = load_corpus(data)
    shapes = templates(data, voice)
    dst = data / "synth" / voice
    dst.mkdir(parents=True, exist_ok=True)
    manifest = open(data / "synth" / "manifest.jsonl", "a", encoding="utf8")
    rows = [r for p in glob.glob(str(data / "app" / "frames-*.jsonl")) for r in jsonl(p) if r["voice"] == voice]
    rows = [r for r in rows if corpus.get(r["id"], {}).get("set") in ("sent", "app", "word") and r["spans"]]
    rng.shuffle(rows)
    made = 0
    for row in rows:
        if made >= limit:
            break
        item = corpus[row["id"]]
        syl = syllables(item)
        if len(syl) != len(row["spans"]) or len(syl) < 2:
            continue
        pr = load_praat(data, voice, row["id"])
        if pr is None:
            continue
        tp = np.asarray(pr["t"], float) * 1000 + APP_CENTRE_MS
        f0 = np.array([np.nan if v is None else v for v in pr["f0"]], float)
        reg = register(f0)
        # Syllables with enough voice to carry a contour, not minor ones.
        usable = []
        for i, (s, (a, b)) in enumerate(zip(syl, row["spans"])):
            if minor(s["ipa"]):
                continue
            sel = (tp >= a) & (tp <= b) & ~np.isnan(f0)
            if sel.sum() >= 10:
                usable.append((i, tp[sel][0], tp[sel][-1], float(np.mean(fold(f0[sel], reg)))))
        if not usable:
            continue
        wav = data / "audio" / voice / f"{row['id']}.wav"
        ctrl = dst / f"{row['id']}__ctrl.wav"
        if not ctrl.exists():
            resynth(wav, [], ctrl)
        manifest.write(json.dumps({"id": row["id"], "voice": voice, "path": str(ctrl), "changed": [], "to": []}) + "\n")
        picks = rng.sample(usable, k=min(len(usable), 1 if len(syl) < 5 else 2))
        edits, changed, to = [], [], []
        for i, a, b, level in sorted(picks):
            target = rng.choice(WRONG[syl[i]["tone"]][:2])
            # Praat's times are window centres; the app's are frame ends.
            # The spill the app's judging window takes from the next syllable
            # (contour.ts, SPILL_MS and SPILL_SHARE), for a gliding label.
            nxt = row["spans"][i + 1] if i + 1 < len(row["spans"]) else None
            carry = min(110, 0.4 * (nxt[1] - nxt[0])) / 1000 if nxt and DIRECTION[syl[i]["tone"]] else 0.0
            # One real citation token of the target tone, scaled: learners
            # overdo some glides and underdo others.
            shape = shapes[target][rng.randrange(len(shapes[target]))] * rng.uniform(0.6, 1.3)
            edits.append(((a - APP_CENTRE_MS) / 1000, (b - APP_CENTRE_MS) / 1000, level + shape, carry))
            changed.append(i)
            to.append(target)
        tag = "-".join(f"{i}{t[0]}" for i, t in zip(changed, to))
        out = dst / f"{row['id']}__{tag}.wav"
        if not out.exists():
            resynth(wav, edits, out)
        manifest.write(json.dumps({"id": row["id"], "voice": voice, "path": str(out), "changed": changed, "to": to}) + "\n")
        made += 1
    print(f"{voice}: {made} wrong-tone items (+ controls)")


if __name__ == "__main__":
    main()
