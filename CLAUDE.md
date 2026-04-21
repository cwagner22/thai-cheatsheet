# Thai Cheat Sheet — project notes

## Pronunciation notation: IPA only, with tone diacritics

All Thai pronunciation in this app uses **strict IPA**, not Paiboon or RTGS
romanization. This is intentional and non-negotiable.

### Consonants — IPA, not Paiboon

| Thai | ✅ IPA | ❌ Paiboon (do not use) |
|---|---|---|
| ก | /k/ | g |
| ข ค ฆ | /kʰ/ | kh |
| ต ฏ | /t/ | dt |
| ท ถ ฐ ฑ ฒ ธ | /tʰ/ | t |
| ป | /p/ | bp |
| ผ ภ พ | /pʰ/ | p |
| จ | /tɕ/ | j |
| ฉ ช ฌ | /tɕʰ/ | ch |
| ด ฎ | /d/ | d |
| บ | /b/ | b |
| ง | /ŋ/ | ng |
| ย ญ | /j/ | y |
| ร | /r/ | r |
| ล ฬ | /l/ | l |
| ว | /w/ | w |
| ส ศ ษ ซ | /s/ | s |
| ห ฮ | /h/ | h |
| อ (silent vowel carrier / glottal) | /ʔ/ | — |
| ม | /m/ | m |
| น ณ | /n/ | n |
| ฟ ฝ | /f/ | f |

### Vowels — IPA symbols

| Thai | ✅ IPA | ❌ Common non-IPA |
|---|---|---|
| อะ / อั | /a/ | a |
| อา | /aː/ | aa |
| อิ | /i/ | i |
| อี | /iː/ | ii / ee |
| อึ | /ɯ/ | ue / eu |
| อื | /ɯː/ | uue / eu |
| อุ | /u/ | u |
| อู | /uː/ | uu / oo |
| เอะ / เอ็ | /e/ | e |
| เอ | /eː/ | eh / e |
| แอะ | /ɛ/ | ae |
| แอ | /ɛː/ | aae |
| โอะ / implicit /o/ | /o/ | o |
| โอ | /oː/ | oh |
| เอาะ | /ɔ/ | aw / o |
| ออ | /ɔː/ | aw / or |
| เออะ | /ɤ/ | oe / er |
| เออ | /ɤː/ | oer |
| เอีย | /ia/ or /iə/ | ia |
| เอือ | /ɯa/ or /ɯə/ | uea |
| อัว | /ua/ or /uə/ | ua |
| ไอ / ใอ | /aj/ | ai |
| เอา | /aw/ | ao |
| อำ | /am/ | am |
| อัย | /aj/ | ai |

Use **ː** (triangular colon) for long vowels, not an ASCII colon or doubled vowel.

### Tones — diacritics on the vowel (not Chao tone letters)

| Tone | Mark | Example |
|---|---|---|
| Mid | no mark | /kaː/ |
| Low | ̀ (grave) | /kàː/ |
| Falling | ̂ (circumflex) | /kâː/ |
| High | ́ (acute) | /káː/ |
| Rising | ̌ (caron) | /kǎː/ |

Place the diacritic on the **first vowel** of a diphthong
(e.g. /kàj/, /kʰâːj/, /kʰɯ̂ŋ/).

### Syllable boundaries

Use **`.`** to separate syllables inside a multi-syllable word:
`/rá.kʰaŋ/`, `/tʰá.hǎːn/`, `/pʰûː.tʰâw/`.

### Slashes

Wrap IPA transcriptions in `/.../` (phonemic), e.g. `/kàj/`, not `[kàj]`.

## Common traps that keep slipping back in

- **Do not** write `/gài/` — it looks like IPA because of the slashes but
  the `g` is Paiboon. Write `/kàj/`.
- **Do not** write `/jaan/` for จาน — write `/tɕaːn/`.
- **Do not** write `/dtào/` for เต่า — write `/tàw/`.
- **Do not** write `/bpii/` for ปี — write `/piː/`.
- **Do not** use `aa`, `uu`, `ii`, `ee`, `oo` for long vowels. Use `aː`, `uː`,
  `iː`, `eː`, `oː`.
- **Do not** write `ch` for ฉ/ช unless it is part of actual IPA (it is not;
  IPA is `tɕʰ`).

## Files that hold pronunciation data

When adding or changing Thai examples, update these — all must follow the rules
above:

- `src/data/consonants.ts` — `nameRom` on every consonant
- `src/data/clusters.ts` — `rom` on every cluster/word example
- `src/data/alphabetPoem.ts` — `anchorRom`, `extRom`, `practiceWords[].rom`
- `src/tabs/ClustersTab.tsx` — inline IPA in Non-Conforming, Cluster Rules,
  Orthography, and all quirks sections
