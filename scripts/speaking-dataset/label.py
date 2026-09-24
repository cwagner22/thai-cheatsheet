"""Automatic syllable/IPA/tone labelling of Thai text for the speaking dataset.

Pipeline per text: pythainlp word segmentation, then per word tltk ``th2ipa``
(IPA + tone digit per syllable) and tltk ``g2p`` (Thai spelling per syllable),
then an independent tone cross-check with pythainlp ``tone_detector`` on each
syllable's Thai spelling. IPA is rewritten into the app's convention (see the
repository CLAUDE.md): strict IPA consonants, ``ː`` for length, and the tone as
a combining diacritic right after the first vowel letter.
"""

from __future__ import annotations

import re
import unicodedata
import warnings
from typing import Any

warnings.filterwarnings("ignore")

import tltk  # noqa: E402
from pythainlp.tokenize import word_tokenize  # noqa: E402
from pythainlp.util import tone_detector  # noqa: E402

TONES = ["Mid", "Low", "Falling", "High", "Rising"]
# tltk th2ipa tone digits: 1=Mid 2=Low 3=Falling 4=High 5=Rising.
TLTK_TONE = {str(i + 1): t for i, t in enumerate(TONES)}
DETECTOR_TONE = {"m": "Mid", "l": "Low", "f": "Falling", "h": "High", "r": "Rising"}
DIACRITIC = {"Mid": "", "Low": "̀", "Falling": "̂", "High": "́", "Rising": "̌"}
DIACRITIC_TONE = {v: k for k, v in DIACRITIC.items() if v}
VOWEL_LETTERS = set("aeiouɛɔɤɯə")

THAI_CONSONANTS = set("กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ")
HIGH_CLASS = set("ขฃฉฐถผฝศษสห")
MID_CLASS = set("กจฎฏดตบปอ")
# Unpaired low-class sonorants: the only consonants whose tone class is changed
# by a preceding high/mid consonant (อักษรนำ, e.g. the น of สนุก reads as หน).
SONORANTS = set("งญณนมยรลวฬ")
# Thai letters, vowels and tone marks only: no digits, no ฯ (abbreviation
# mark, U+0E2F) and no ๆ (repetition mark, U+0E46), whose spoken forms are
# not spelled out in the text (ฯลฯ is read "และอื่นๆ").
THAI_ONLY = re.compile("^[\\u0e01-\\u0e2e\\u0e30-\\u0e3a\\u0e40-\\u0e45\\u0e47-\\u0e4e]+$")


def tltk_to_app_ipa(syl: str) -> tuple[str, str]:
    """Convert one tltk th2ipa syllable (e.g. ``cʰaːŋ4``) to (app IPA, tone name).

    tltk writes จ/ฉ-ช as ``c``/``cʰ``, the open-o as ``ᴐ`` (U+1D10, a small-cap
    letter, not IPA), and long diphthongs as ``iːa``/``ɯːa``/``uːa``; the app
    writes ``tɕ``/``tɕʰ``, ``ɔ`` and ``ia``/``ɯa``/``ua``.
    """
    m = re.fullmatch(r"(.+?)([1-5])", syl)
    if not m:
        raise ValueError(f"no tone digit in tltk syllable {syl!r}")
    body, digit = m.groups()
    tone = TLTK_TONE[digit]
    body = body.replace("ᴐ", "ɔ").replace("c", "tɕ")
    body = body.replace("iːa", "ia").replace("ɯːa", "ɯa").replace("uːa", "ua")
    mark = DIACRITIC[tone]
    if mark:
        for i, ch in enumerate(body):
            if ch in VOWEL_LETTERS:
                body = body[: i + 1] + mark + body[i + 1 :]
                break
        else:
            raise ValueError(f"no vowel in tltk syllable {syl!r}")
    # NFC to match the app's phrases.ts, where à é are precomposed and ɔ̀ ɯ̂
    # (no precomposed form exists) keep the combining mark.
    return unicodedata.normalize("NFC", body), tone


def tone_of_app_ipa(ipa: str) -> str:
    """Read the tone back off an app-convention IPA syllable's diacritic."""
    for ch in unicodedata.normalize("NFD", ipa):
        if ch in DIACRITIC_TONE:
            return DIACRITIC_TONE[ch]
    return "Mid"


def _is_minor(rom: str) -> bool:
    """A g2p syllable like ``sa1``/``?a1``/``tha3``: onset + short a, no final."""
    return re.fullmatch(r"[^aeiouAEIOU@xOU]*a[0-4]", rom) is not None


def _split_chunk(thai: str, roms: list[str]) -> list[tuple[str, bool]]:
    """Split one g2p Thai chunk into one spelling per syllable.

    g2p gives a single Thai string for chunks such as สวัส (``sa1'wat1``) or
    วิท (``wit3'tha3``). A minor first syllable takes the chunk's first
    consonant (ส + วัส); a minor syllable after a closed one reuses the shared
    final consonant (วิท + ท, ผล + ล). Returns (spelling, is_minor) pairs.
    """
    if len(roms) == 1:
        return [(thai, False)]
    out: list[tuple[str, bool]] = []
    rest = thai
    for rom in roms[:-1]:
        if _is_minor(rom) and rest and rest[0] in THAI_CONSONANTS and len(rest) > 1:
            n = 2 if rest[1] == "ะ" else 1
            out.append((rest[:n], True))
            rest = rest[n:]
        else:
            out.append((rest, False))
            tail = rest[-1] if rest and rest[-1] in THAI_CONSONANTS else ""
            rest = tail
    out.append((rest or thai, _is_minor(roms[-1])))
    return out


def _detect(spelling: str, minor: bool, prev: tuple[str, bool] | None) -> str | None:
    """pythainlp tone for one syllable spelling, or None when it cannot say.

    A minor syllable is spelled as a bare consonant, which tone_detector would
    read as a live syllable with an inherent o; appending ะ gives the short
    dead a it really has. A sonorant onset after a high- or mid-class minor
    syllable takes that syllable's class (อักษรนำ: สนุก reads as ส + หนุก,
    ตลาด as ต + ลาด toned like อาด), so the spelling is rewritten to carry
    that class before it is handed to tone_detector.
    """
    s = spelling
    if minor and len(s) == 1 and s in THAI_CONSONANTS:
        s = s + "ะ"
    if prev is not None and prev[1] and s:
        # Skip leading vowels (เ แ โ ใ ไ) to reach the syllable's onset.
        i = 0
        while i < len(s) and s[i] in "เแโใไ":
            i += 1
        if i < len(s) and s[i] in SONORANTS:
            lead = prev[0][0]
            if lead in HIGH_CLASS:
                s = s[:i] + "ห" + s[i:]
            elif lead in MID_CLASS:
                # No spelling makes a sonorant mid class, so swap in อ, which
                # is mid class and silent: ร่อย of อร่อย is toned like อ่อย.
                s = s[:i] + "อ" + s[i + 1 :]
    try:
        t = tone_detector(s)
    except Exception:
        return None
    return DETECTOR_TONE.get(t) if t else None


def label_word(word: str) -> dict[str, Any] | None:
    """Label one pythainlp word; None if tltk fails or its two views disagree."""
    ipa_raw = tltk.nlp.th2ipa(word).replace("<s/>", " ")
    ipa_syls = [s for s in re.split(r"[\s.]+", ipa_raw) if s]
    g2p_raw = tltk.nlp.g2p(word)
    if "<tr/>" not in g2p_raw:
        return None
    thai_part, rom_part = g2p_raw.split("<tr/>", 1)
    thai_chunks = [c for c in re.split(r"[~|\s]+", thai_part) if c]
    rom_chunks = [c for c in re.split(r"[~|\s]+", rom_part.replace("<s/>", "")) if c]
    if len(thai_chunks) != len(rom_chunks):
        return None
    pieces: list[tuple[str, bool]] = []
    roms: list[str] = []
    for tc, rc in zip(thai_chunks, rom_chunks):
        rs = rc.split("'")
        pieces.extend(_split_chunk(tc, rs))
        roms.extend(rs)
    if len(pieces) != len(ipa_syls) or not ipa_syls:
        return None
    syllables = []
    prev: tuple[str, bool] | None = None
    for (spell, minor), rom, isyl in zip(pieces, roms, ipa_syls):
        try:
            ipa, tone = tltk_to_app_ipa(isyl)
        except (ValueError, KeyError):
            return None
        g2p_digit = rom[-1]
        syllables.append(
            {
                "thai": spell,
                "ipa": ipa,
                "tone": tone,
                "_det": _detect(spell, minor, prev),
                "_g2pAgree": g2p_digit.isdigit() and int(g2p_digit) + 1 == int(isyl[-1]),
                "_tltk": isyl,
            }
        )
        prev = (spell, minor)
    return {"syllables": syllables}


def _label_with_split(word: str) -> list[dict[str, Any]] | None:
    """Label a word, or split it in two dictionary words when tltk fails.

    tltk loses syllables on some compounds that pythainlp keeps whole, e.g.
    สิบห้า comes back as ``si2.`` with ห้า missing; its halves สิบ + ห้า
    label cleanly, so the halves become two words.
    """
    lw = label_word(word)
    if lw is not None:
        return [lw]
    from pythainlp.corpus import thai_words

    vocab = thai_words()
    for k in range(1, len(word)):
        a, b = word[:k], word[k:]
        if a in vocab and b in vocab:
            la, lb = label_word(a), label_word(b)
            if la is not None and lb is not None:
                return [la, lb]
    return None


def label_text(text: str) -> dict[str, Any] | None:
    """Label a whole Thai text: words, syllables, and the gt agreement block."""
    if not THAI_ONLY.match(text):
        return None
    words = []
    for w in word_tokenize(text, keep_whitespace=False):
        parts = _label_with_split(w)
        if parts is None:
            return None
        words.extend(parts)
    tl = [s["tone"] for w in words for s in w["syllables"]]
    pt = [s["_det"] for w in words for s in w["syllables"]]
    raw = [s["_tltk"] for w in words for s in w["syllables"]]
    g2p_ok = all(s["_g2pAgree"] for w in words for s in w["syllables"])
    for w in words:
        for s in w["syllables"]:
            del s["_det"], s["_g2pAgree"], s["_tltk"]
    return {
        "words": words,
        "gt": {"tltk": tl, "pythainlp": pt, "agree": tl == pt},
        "_tltkRaw": raw,
        "_g2pToneAgree": g2p_ok,
    }


def live_or_dead(ipa: str) -> str:
    """'dead' for a stop final or a short vowel with no final, else 'live'."""
    base = "".join(c for c in unicodedata.normalize("NFD", ipa) if not unicodedata.combining(c))
    if re.search(r"[ptk]$", base):
        return "dead"
    if re.search(r"[aeiouɛɔɤɯ]$", base) and not base.endswith("ː"):
        # A final short vowel; diphthongs ia/ɯa/ua count as long (live).
        if re.search(r"(ia|ɯa|ua)$", base):
            return "live"
        return "dead"
    return "live"


def vowel_length(ipa: str) -> str:
    """'long' if the syllable has ː or a diphthong ia/ɯa/ua, else 'short'."""
    base = "".join(c for c in unicodedata.normalize("NFD", ipa) if not unicodedata.combining(c))
    return "long" if ("ː" in base or re.search(r"(ia|ɯa|ua)", base)) else "short"
