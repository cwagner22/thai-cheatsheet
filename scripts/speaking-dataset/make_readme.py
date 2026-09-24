"""Write $DATA/README.md from summary.json, labeller_stats.json and the logs.

Usage: make_readme.py <DATA>. Run finalize.py and corpus_stats.py first.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def h(x: float) -> str:
    return f"{x:.2f} h"


def main() -> None:
    data = Path(sys.argv[1])
    summ = json.loads((data / "summary.json").read_text())
    st = json.loads((data / "labeller_stats.json").read_text())
    items = [json.loads(l) for l in (data / "corpus.jsonl").open()]
    g1 = json.loads((data / "logs" / "google_status_app_sent.json").read_text())
    g2p = data / "google_status.json"
    g2 = json.loads(g2p.read_text()) if g2p.exists() else {}
    tone = json.loads((data / "tone_sanity.json").read_text()) if (data / "tone_sanity.json").exists() else {}
    edge_stats = {}
    for v in ("premwadee", "niwat"):
        p = data / "logs" / f"{v}_stats.jsonl"
        if p.exists():
            rows = [json.loads(l) for l in p.open()]
            edge_stats[v] = (sum(r["done"] for r in rows), sum(r["failedAttempts"] for r in rows),
                             sum((r["gaveUp"] for r in rows), []))

    sets = ["app", "sent", "word", "mono"]
    count = {s: sum(1 for i in items if i["set"] == s) for s in sets}
    extra = {s: sum(1 for i in items if i["set"] == s and i.get("extra")) for s in sets}
    voices = ["google", "premwadee", "niwat", "kanya"]
    L = []
    w = L.append
    w("# Thai Lab speaking dataset (TTS, labelled)\n")
    w("Synthetic Thai speech with syllable-level IPA and tone labels and Praat pitch/intensity "
      "tracks, for testing the Speaking tab's pitch/tone pipeline offline. Everything here is "
      "machine-generated: four TTS voices reading a text corpus, labels from tltk (cross-checked "
      "with pythainlp), except the `app` set whose labels are the hand-authored ones in "
      "`src/data/phrases.ts`.\n")
    w("Scripts: `/Users/chris/Dev/thai-cheatsheet/scripts/speaking-dataset/` (not committed).\n")

    w("## Totals\n")
    w(f"- **All voices: {h(summ['totalHours'])} of audio (sum of `durSec`)**, of which "
      f"{h(summ['totalSpeechHours'])} lies between the first and last non-silent frame "
      "(`speechSec`; see Known problems about the edge-tts trailing silence).")
    w(f"- Corpus: {len(items)} text items — " + ", ".join(
        f"{s} {count[s]}" + (f" ({count[s] - extra[s]} main + {extra[s]} extra)" if extra[s] else "")
        for s in sets) + ".")
    w("- `extra` items (flagged `\"extra\": true` in corpus.jsonl) exist only to add hours on the "
      "three voices that are not rate limited; the Google voice does not voice them.\n")
    w("| voice | engine | clips | hours (durSec) | speech hours | app | sent | word | word extra | mono | mono extra |")
    w("|---|---|---|---|---|---|---|---|---|---|---|")
    eng = {"google": "Google Translate TTS (female)", "premwadee": "edge-tts th-TH-PremwadeeNeural (female)",
           "niwat": "edge-tts th-TH-NiwatNeural (male)", "kanya": "macOS `say -v Kanya` (female)"}
    for v in voices:
        d = summ["voices"].get(v)
        if not d:
            w(f"| {v} | {eng[v]} | 0 | – | – | | | | | | |")
            continue
        ps = d["perSet"]

        def cell(k: str) -> str:
            return f"{ps[k]['clips']} / {ps[k]['hours']:.2f} h" if k in ps else "–"

        w(f"| {v} | {eng[v]} | {d['clips']} | {d['hours']:.2f} | {d['speechHours']:.2f} | {cell('app')} | "
          f"{cell('sent')} | {cell('word')} | {cell('word+extra')} | {cell('mono')} | {cell('mono+extra')} |")
    w("")
    w("Hours per set, all voices: " + ", ".join(f"{k} {v:.2f} h" for k, v in summ["hoursPerSetAllVoices"].items()) + ".\n")
    gm = summ["voices"].get("google", {}).get("missingNonExtra", [])
    if gm:
        w(f"Google is missing {len(gm)} non-extra clips (see Google throttling below): "
          + ", ".join(f"{s} {sum(1 for x in gm if x.startswith(s + '-'))}" for s in sets) + ".\n")

    w("## Layout\n")
    w("```")
    w("corpus.jsonl            one line per text item (schema below)")
    w("clips.jsonl             one line per clip: id, voice, path (relative to this dir), durSec,")
    w("                        plus set, extra, leadSilSec, trailSilSec, speechSec, peak")
    w("audio/<voice>/<id>.wav  48 kHz mono 16-bit PCM")
    w("praat/<voice>/<id>.json Praat pitch + intensity for that clip")
    w("boundaries/<voice>/<id>.json  edge-tts WordBoundary timings (premwadee, niwat only)")
    w("summary.json            per-voice/per-set counts and hours, silence stats, missing clips")
    w("labeller_stats.json     tltk vs pythainlp agreement, gold-vs-auto on the app set, set balance")
    w("tone_sanity.json        mean F0 shape per labelled tone on the mono set, per voice")
    w("logs/                   generation logs; google_status_app_sent.json = Google stats for app+sent")
    w("google_status.json      Google stats for the word+mono run")
    w("```\n")
    w("### corpus.jsonl\n")
    w("```json")
    w('{"id": "sent-0012", "set": "sent", "text": "คุณชื่ออะไรครับ",')
    w(' "words": [{"syllables": [{"thai": "คุณ", "ipa": "kʰun", "tone": "Mid"}]}, ...],')
    w(' "gt": {"tltk": ["Mid", ...], "pythainlp": ["Mid", ...], "agree": true}}')
    w("```")
    w("- `words` = pythainlp `word_tokenize` words; syllables and IPA from tltk `th2ipa`, Thai spelling "
      "per syllable from tltk `g2p` (informational: minor syllables get a best-guess spelling such as "
      "ส of สวัสดี, and a consonant shared by two syllables is repeated, วิท + ท of วิทยา).")
    w("- `tone` is tltk's. `gt.tltk` repeats it per syllable; `gt.pythainlp` is pythainlp "
      "`tone_detector` on the syllable spelling (null where it returns nothing); `gt.agree` = all equal.")
    w("- IPA follows the repo CLAUDE.md: strict IPA (tɕ, tɕʰ, ɔ, ɤ, ɯ …), ː for length, tone as a "
      "combining diacritic after the first vowel letter, no slashes or dots inside a syllable, Unicode NFC "
      "like phrases.ts. tltk's `c`/`cʰ`/`ᴐ`/`iːa ɯːa uːa` become `tɕ`/`tɕʰ`/`ɔ`/`ia ɯa ua`.")
    w("- mono items also carry `freq` (TNC count), `syllableType` (live/dead), `vowelLength`; word items `freq`.")
    w("- app items carry the gold `words` (with `gloss`), `phraseId`, `meaning`, and `auto` = the automatic "
      "labelling of the same text; their `gt` arrays are the automatic tones aligned to the gold syllables.\n")
    w("### praat/<voice>/<id>.json\n")
    w("`{\"t\": [...], \"f0\": [Hz or null when unvoiced], \"tInt\": [...], \"intensityDb\": [...], \"params\": {...}}` — "
      "parselmouth `to_pitch_ac(time_step=0.01, pitch_floor, pitch_ceiling)` with floor/ceiling "
      "60/300 Hz for niwat and 100/500 Hz for the three female voices; `to_intensity(time_step=0.01)`.\n")

    w("## How it was made\n")
    w("1. `dump_phrases.mjs` (node --experimental-strip-types) exports `ALL_PHRASES` from `src/data/phrases.ts`.")
    w("2. `build_corpus.py` (+ `label.py`, `sentences.py`) builds the four sets:")
    w("   - **mono**: `thai_syllables() ∩ thai_words()`, Thai letters only, ranked by TNC word frequency "
      "(`pythainlp.corpus.tnc.word_freqs`), kept if tltk gives one syllable; the 300 most frequent per tone "
      f"are main, the next 100 per tone extra. Main-set min TNC count {st['monoMain']['minTncFreq']}; "
      f"live/dead {st['monoMain']['syllableType']}, vowel length {st['monoMain']['vowelLength']}, "
      f"tone/type {st['monoMain']['tone/type']}.")
    w(f"   - **word**: `thai_words()` ranked by TNC frequency, 2–4 syllables, at most 20 words per tone "
      f"pattern (so the frequent Mid-Mid etc. do not dominate); first 1200 main, next 700 extra. Main: "
      f"syllable counts {st['wordMain']['syllableCount']}, {st['wordMain']['distinctTonePatterns']} distinct "
      f"tone patterns, min TNC count {st['wordMain']['minTncFreq']}.")
    w(f"   - **sent**: {count['sent']} hand-written everyday sentences (greetings, food, travel, shopping, "
      "numbers spelled out, work, family, health, questions with ไหม/หรือ/อะไร/ใคร/ทำไม, particles "
      f"ครับ/ค่ะ/คะ/นะ), 4–16 syllables; syllable counts {st['sent']['syllableCount']}; tone counts "
      f"{st['sent']['toneCounts']}. 656 were written; the 3-syllable ones and one tltk failure were dropped.")
    w(f"   - **app**: the {count['app']} practice sentences of phrases.ts (the file has 20, not ~30), "
      "syllables/IPA copied verbatim, tone read from the IPA diacritic.")
    w("   When tltk drops syllables on a pythainlp word (e.g. สิบห้า → `si2.`), the word is split into two "
      "dictionary words that label cleanly (สิบ + ห้า); items that still fail are dropped.")
    w("3. `repair_corpus.py` fixed items in place without renumbering (see Known problems).")
    w("4. `gen_audio.py <voice>`: resumable (skips existing wavs, atomic writes), ffmpeg to 48 kHz mono s16; "
      "if the leading or trailing silence (frames 40 dB below the loudest) is under 100 ms it is padded to "
      "150 ms; nothing is trimmed. Google: one request per ≥1.2 s, sequential, 429/5xx/timeouts back off "
      "30 s, 60 s, 120 s … (cap 480 s), stop after 15 min of continuous blocking; order app, sent, word, mono. "
      "edge-tts: 4 concurrent requests per voice, failed requests re-queued. Kanya: `say` → aiff → wav, 4 in parallel.")
    w("5. `praat_gt.py` (multiprocessing), `finalize.py` (clips.jsonl, summary.json), `corpus_stats.py`, "
      "`tone_sanity.py`, `make_readme.py`.\n")

    w("## Automatic labeller agreement\n")
    o = st["overallAutoSets"]
    w(f"tltk vs pythainlp `tone_detector`, per syllable, mono+word+sent (incl. extra): "
      f"**{o['agree']}/{o['syllables']} = {o['agreeRate']:.1%}**.\n")
    w("| set | items | syllables | syllable agreement | items fully agreeing |")
    w("|---|---|---|---|---|")
    for k, v in st["sets"].items():
        w(f"| {k} | {v['items']} | {v['syllables']} | {v['agreeRate']:.1%} | {v['itemAgreeRate']:.1%} |")
    w("")
    w("Per tone (tltk label; share where pythainlp agrees), mono main: "
      + ", ".join(f"{t} {x}" for t, x in st["sets"]["mono/main"]["perTone(tltk label)"].items())
      + ". Most frequent disagreements (tltk→pythainlp), word main: "
      + ", ".join(f"{k} {n}" for k, n in st["sets"]["word/main"]["topDisagreements(tltk->pythainlp)"].items()) + ".\n")
    w("Spot checks of disagreements show tltk right in most cases: pythainlp's rule-based detector misreads "
      "silent letters (แพทย์, ญาติ, ชาติ), short dead syllables with low-class onsets (รถ, พบ, คด read as "
      "Falling), loanwords (เว็บ, ล็อก) and the first syllable of บริ-/ปริ- words. Where they disagree the "
      "label used is tltk's; treat `gt.agree == false` items as less certain.\n")
    a = st["appGold"]
    w("### Automatic vs gold on the app set\n")
    w(f"{a['phrases']} phrases, {a['syllables']} syllables, {a['unaligned']} unaligned: "
      f"**tltk tone {a['tltkCorrect']}/{a['syllables']} = {a['tltkAccuracy']:.1%}**, "
      f"pythainlp tone {a['pythainlpCorrect']}/{a['syllables']} = {a['pythainlpAccuracy']:.1%}.")
    if a["tltkErrors"]:
        w("tltk errors: " + "; ".join(a["tltkErrors"]) + ".")
    if a["pythainlpErrors"]:
        w("pythainlp errors: " + "; ".join(a["pythainlpErrors"]) + ".")
    if a["ipaDifferences"]:
        w("\nIPA differences (tone always equal; only vowel length):\n")
        for d in a["ipaDifferences"]:
            w(f"- {d}")
    w("")

    w("## Google throttling\n")
    w(f"- app+sent run: {g1.get('done')} clips, {g1.get('n429')} HTTP 429s, {g1.get('nErr')} other errors "
      f"(read timeouts), {g1.get('totalBlockedSec', 0) / 60:.0f} min spent backing off; ~9–10 clips/min sustained over both runs: "
      "Google answers ~15–70 requests at the 1.2 s pace, then 429s until a 30–240 s back-off clears.")
    if g2:
        if g2.get("stopped"):
            w(f"- word+mono run: **stopped** ({g2.get('reason')}) after {g2.get('done')} clips; "
              f"{g2.get('remaining')} left. {g2.get('n429')} 429s, {g2.get('nErr')} other errors.")
        else:
            w(f"- word+mono run: {g2.get('done')} clips, {g2.get('n429')} 429s, {g2.get('nErr')} other errors, "
              f"{g2.get('totalBlockedSec', 0) / 60:.0f} min backing off. Never blocked for 15 min straight.")
    w("")

    w("## Known problems\n")
    ed = {v: summ["voices"][v] for v in ("premwadee", "niwat") if v in summ["voices"]}
    if ed:
        w("- **edge-tts trailing silence (premwadee, niwat)**: every clip ends with ~1 s of silence "
          "(median trailing " + ", ".join(f"{v} {d['trailSilMedian']} s" for v, d in ed.items())
          + "; leading " + ", ".join(f"{v} {d['leadSilMedian']} s" for v, d in ed.items())
          + "), and edge returns most short utterances exactly 1.872 s long, so nearly all mono/word "
          "clips have that duration regardless of content. As asked, nothing was trimmed; use "
          "`speechSec` / `trailSilSec` in clips.jsonl when the silence matters. This is why durSec "
          "hours are far above speech hours for these two voices.")
    gd = summ["voices"].get("google")
    if gd:
        w(f"- Google clips: median leading/trailing silence {gd['leadSilMedian']}/{gd['trailSilMedian']} s; "
          f"{gd['trailSil>0.3']} clips have more than 300 ms trailing (not trimmed).")
    if edge_stats:
        w("- edge-tts `NoAudioReceived` (failed requests, each retried until it succeeded): " + "; ".join(
            f"{v} {fails} over {done} clips" + (f", gave up on {', '.join(gave)}" if gave else "")
            for v, (done, fails, gave) in edge_stats.items())
          + ". Premwadee fails in bursts, at times on most requests, and ran at 20–75 clips/min against "
          "~240 for Niwat.")
    w("- tltk writes some -ย diphthongs and ได้/ไม้ with a long vowel (`rɔ̀ːj`, `dâːj`, `máːj`) where "
      "phrases.ts writes them short (`rɔ̀j`, `dâj`, `máj`); tones are unaffected, but IPA vowel length in the "
      "auto sets follows tltk.")
    w("- The `thai` spelling of syllables is heuristic (minor syllables, shared consonants, silent letters "
      "stay attached, e.g. แพทย์).")
    w("- Some mono entries are rare or bound forms that happen to be in both word lists (e.g. เด, เส, เข); "
      "all have TNC frequency ≥ the minimum above.")
    fixes = [i for i in items if i.get("replaced") or i.get("labelFixes")]
    for i in fixes:
        if i.get("replaced"):
            w(f"- `{i['id']}` was ฯลฯ (abbreviation mark, spoken as และอื่นๆ; the Thai-only filter missed ฯ "
              f"at build time); replaced in place by {i['text']} (same tone) and re-voiced for all voices.")
        for f in i.get("labelFixes", []):
            w(f"- `{i['id']}` {i['text']}: tltk IPA hand-fixed ({f}); `labelFixes` records it.")
    w("- Kanya realises tones less distinctly than the other voices on isolated words (its Rising "
      "barely rises and its High is nearly level in tone_sanity.json); its labels are still the "
      "dictionary tones.")
    w("- Tone labels come from dictionary pronunciation; a TTS voice may realise a tone differently "
      "(e.g. sentence-final particles, or reduced tones in fast speech). No clip was checked by ear. "
      "`tone_sanity.json` shows the expected mean contours per tone on the mono set:")
    for v, x in tone.items():
        w(f"  - {v} (ref {x['refHz']} Hz), semitones at 10/50/90 %: " + ", ".join(
            f"{t} {y['st@10/50/90%']}" for t, y in x.items() if t != "refHz"))
    w("")
    (data / "README.md").write_text("\n".join(L) + "\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()
