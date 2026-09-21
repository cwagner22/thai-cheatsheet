/**
 * Practice sentences for the Speaking tab — real things a learner would say,
 * not isolated drill syllables. Each is authored down to the syllable so the
 * tab can lay a tone target under every one of them; the tone itself is never
 * stored, it is read back off the IPA diacritic (see toneOf in toneTarget.ts),
 * which keeps the two from ever disagreeing.
 *
 * IPA here follows the project rules in CLAUDE.md: strict IPA consonants and
 * vowels, ː for length, tone diacritic on the first vowel of a diphthong.
 */

import type { ToneName } from '../lib/toneLookup';

export interface PhraseSyllable {
  thai: string;
  /** One syllable, no slashes, no syllable dot — the dot is added when
   *  syllables are joined back into a word's transcription. Empty on a
   *  learner's own sentence typed without IPA. */
  ipa: string;
  /** Set only where the tone cannot be read from `ipa` — a learner's own
   *  sentence, where it comes from the spelling or the learner's correction.
   *  Built-in sentences carry the tone in the IPA diacritic alone. */
  tone?: ToneName;
}

export interface PhraseWord {
  syllables: PhraseSyllable[];
  gloss: string;
}

export interface Phrase {
  id: string;
  words: PhraseWord[];
  /** Idiomatic English for the phrase as a whole. */
  meaning: string;
  /** Optional aside — a tone trap, a register note, a spelling quirk. */
  note?: string;
}

export interface PhraseGroup {
  id: string;
  title: string;
  blurb: string;
  phrases: Phrase[];
}

/** Thai is written without spaces between words, so the phrase is joined
 *  solid — this is the string handed to text-to-speech. */
export const thaiOf = (phrase: Phrase): string =>
  phrase.words.map(w => w.syllables.map(s => s.thai).join('')).join('');

export const thaiOfWord = (word: PhraseWord): string =>
  word.syllables.map(s => s.thai).join('');

/** Syllables inside a word join with `.`, words with a space. */
export const ipaOf = (phrase: Phrase): string =>
  phrase.words.map(ipaOfWord).join(' ');

export const ipaOfWord = (word: PhraseWord): string =>
  word.syllables.map(s => s.ipa).filter(Boolean).join('.');

export const syllableCount = (phrase: Phrase): number =>
  phrase.words.reduce((n, w) => n + w.syllables.length, 0);

const KHRAP: PhraseWord = {
  syllables: [{ thai: 'ครับ', ipa: 'kʰráp' }],
  gloss: 'polite particle (male speaker)',
};

export const PHRASE_GROUPS: PhraseGroup[] = [
  {
    id: 'courtesy',
    title: 'Greetings & courtesy',
    blurb:
      'The phrases you will say a dozen times a day. Short enough that every ' +
      'syllable is worth getting right.',
    phrases: [
      {
        id: 'sawatdi',
        meaning: 'Hello.',
        note:
          'Spelled with three syllables but usually said as two — /sà.wàt.diː/ ' +
          'collapses toward /wàt.diː/ in quick speech.',
        words: [
          {
            gloss: 'hello',
            syllables: [
              { thai: 'ส', ipa: 'sà' },
              { thai: 'วัส', ipa: 'wàt' },
              { thai: 'ดี', ipa: 'diː' },
            ],
          },
          KHRAP,
        ],
      },
      {
        id: 'khopkhun',
        meaning: 'Thank you very much.',
        words: [
          {
            gloss: 'thank you',
            syllables: [
              { thai: 'ขอบ', ipa: 'kʰɔ̀ːp' },
              { thai: 'คุณ', ipa: 'kʰun' },
            ],
          },
          { gloss: 'very much', syllables: [{ thai: 'มาก', ipa: 'mâːk' }] },
          KHRAP,
        ],
      },
      {
        id: 'khothot',
        meaning: 'Sorry. / Excuse me.',
        words: [
          {
            gloss: 'sorry',
            syllables: [
              { thai: 'ขอ', ipa: 'kʰɔ̌ː' },
              { thai: 'โทษ', ipa: 'tʰôːt' },
            ],
          },
          KHRAP,
        ],
      },
      {
        id: 'yindi',
        meaning: 'Pleased to meet you.',
        words: [
          {
            gloss: 'glad',
            syllables: [
              { thai: 'ยิน', ipa: 'jin' },
              { thai: 'ดี', ipa: 'diː' },
            ],
          },
          { gloss: 'that', syllables: [{ thai: 'ที่', ipa: 'tʰîː' }] },
          { gloss: 'got to', syllables: [{ thai: 'ได้', ipa: 'dâj' }] },
          {
            gloss: 'be acquainted',
            syllables: [
              { thai: 'รู้', ipa: 'rúː' },
              { thai: 'จัก', ipa: 'tɕàk' },
            ],
          },
        ],
      },
      {
        id: 'maipenrai',
        meaning: "Never mind. / It's fine.",
        words: [
          { gloss: 'not', syllables: [{ thai: 'ไม่', ipa: 'mâj' }] },
          { gloss: 'be', syllables: [{ thai: 'เป็น', ipa: 'pen' }] },
          { gloss: 'anything', syllables: [{ thai: 'ไร', ipa: 'raj' }] },
        ],
      },
    ],
  },
  {
    id: 'everyday',
    title: 'Everyday sentences',
    blurb:
      'Longer runs, where tone has to survive a whole phrase instead of one ' +
      'careful word.',
    phrases: [
      {
        id: 'sabaidi',
        meaning: 'How are you?',
        words: [
          { gloss: 'you', syllables: [{ thai: 'คุณ', ipa: 'kʰun' }] },
          {
            gloss: 'well',
            syllables: [
              { thai: 'ส', ipa: 'sà' },
              { thai: 'บาย', ipa: 'baːj' },
              { thai: 'ดี', ipa: 'diː' },
            ],
          },
          { gloss: 'question particle', syllables: [{ thai: 'ไหม', ipa: 'mǎj' }] },
        ],
      },
      {
        id: 'painaima',
        meaning: 'Where have you been?',
        note: 'A greeting as much as a question — the answer can be as vague as you like.',
        words: [
          { gloss: 'go', syllables: [{ thai: 'ไป', ipa: 'paj' }] },
          { gloss: 'where', syllables: [{ thai: 'ไหน', ipa: 'nǎj' }] },
          { gloss: 'come', syllables: [{ thai: 'มา', ipa: 'maː' }] },
        ],
      },
      {
        id: 'aroimak',
        meaning: 'Delicious!',
        note:
          'อ leads ร่อย here, so the second syllable takes mid-class rules and ' +
          'ไม้เอก gives it low, not falling.',
        words: [
          {
            gloss: 'delicious',
            syllables: [
              { thai: 'อ', ipa: 'ʔà' },
              { thai: 'ร่อย', ipa: 'rɔ̀j' },
            ],
          },
          { gloss: 'very', syllables: [{ thai: 'มาก', ipa: 'mâːk' }] },
        ],
      },
      {
        id: 'thaorai',
        meaning: 'How much is it?',
        words: [
          {
            gloss: 'how much',
            syllables: [
              { thai: 'เท่า', ipa: 'tʰâw' },
              { thai: 'ไหร่', ipa: 'ràj' },
            ],
          },
          KHRAP,
        ],
      },
      {
        id: 'maikhaotjai',
        meaning: "I don't understand.",
        words: [
          { gloss: 'I (male)', syllables: [{ thai: 'ผม', ipa: 'pʰǒm' }] },
          { gloss: 'not', syllables: [{ thai: 'ไม่', ipa: 'mâj' }] },
          {
            gloss: 'understand',
            syllables: [
              { thai: 'เข้า', ipa: 'kʰâw' },
              { thai: 'ใจ', ipa: 'tɕaj' },
            ],
          },
        ],
      },
      {
        id: 'wannicron',
        meaning: 'It is very hot today.',
        words: [
          {
            gloss: 'today',
            syllables: [
              { thai: 'วัน', ipa: 'wan' },
              { thai: 'นี้', ipa: 'níː' },
            ],
          },
          {
            gloss: 'weather',
            syllables: [
              { thai: 'อา', ipa: 'ʔaː' },
              { thai: 'กาศ', ipa: 'kàːt' },
            ],
          },
          { gloss: 'hot', syllables: [{ thai: 'ร้อน', ipa: 'rɔ́ːn' }] },
          { gloss: 'very', syllables: [{ thai: 'มาก', ipa: 'mâːk' }] },
        ],
      },
      {
        id: 'phutthai',
        meaning: 'I speak a little Thai.',
        note: 'All five tones appear here — a good one to come back to.',
        words: [
          { gloss: 'I (male)', syllables: [{ thai: 'ผม', ipa: 'pʰǒm' }] },
          { gloss: 'speak', syllables: [{ thai: 'พูด', ipa: 'pʰûːt' }] },
          {
            gloss: 'Thai language',
            syllables: [
              { thai: 'ภา', ipa: 'pʰaː' },
              { thai: 'ษา', ipa: 'sǎː' },
              { thai: 'ไทย', ipa: 'tʰaj' },
            ],
          },
          { gloss: 'can', syllables: [{ thai: 'ได้', ipa: 'dâj' }] },
          {
            gloss: 'a little',
            syllables: [
              { thai: 'นิด', ipa: 'nít' },
              { thai: 'หน่อย', ipa: 'nɔ̀j' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'workout',
    title: 'Tone workouts',
    blurb:
      'Sentences built so the tone is the only thing that separates one word ' +
      'from the next. If the contour slips, the sentence stops meaning anything.',
    phrases: [
      {
        id: 'khunpu',
        meaning: "Doesn't grandpa know?",
        note: 'The five tones in canonical order: mid, low, falling, high, rising.',
        words: [
          { gloss: 'you / title', syllables: [{ thai: 'คุณ', ipa: 'kʰun' }] },
          { gloss: 'grandpa', syllables: [{ thai: 'ปู่', ipa: 'pùː' }] },
          { gloss: 'not', syllables: [{ thai: 'ไม่', ipa: 'mâj' }] },
          { gloss: 'know', syllables: [{ thai: 'รู้', ipa: 'rúː' }] },
          { gloss: 'or? (question)', syllables: [{ thai: 'หรือ', ipa: 'rɯ̌ː' }] },
        ],
      },
      {
        id: 'maimai',
        meaning: "Doesn't new wood burn?",
        note:
          'Five words, one vowel between them all — only the tone tells them ' +
          'apart. ไม่ and ไหม้ share a tone but not a spelling.',
        words: [
          { gloss: 'wood', syllables: [{ thai: 'ไม้', ipa: 'máj' }] },
          { gloss: 'new', syllables: [{ thai: 'ใหม่', ipa: 'màj' }] },
          { gloss: 'not', syllables: [{ thai: 'ไม่', ipa: 'mâj' }] },
          { gloss: 'burn', syllables: [{ thai: 'ไหม้', ipa: 'mâj' }] },
          { gloss: 'question particle', syllables: [{ thai: 'ไหม', ipa: 'mǎj' }] },
        ],
      },
      {
        id: 'khraikhai',
        meaning: 'Who sells chicken eggs?',
        note: 'ไข่ and ไก่ differ only in aspiration — hold a hand in front of your mouth.',
        words: [
          { gloss: 'who', syllables: [{ thai: 'ใคร', ipa: 'kʰraj' }] },
          { gloss: 'sell', syllables: [{ thai: 'ขาย', ipa: 'kʰǎːj' }] },
          { gloss: 'egg', syllables: [{ thai: 'ไข่', ipa: 'kʰàj' }] },
          { gloss: 'chicken', syllables: [{ thai: 'ไก่', ipa: 'kàj' }] },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced sentences',
    blurb:
      'Full clauses — conditionals, comparisons, reasons — where a slipped ' +
      'tone can hide inside a much longer run of syllables.',
    phrases: [
      {
        id: 'thafontok',
        meaning: "If it rains, I won't go.",
        note: 'ถ้า ... จะ frames the condition and result with no comma needed between them.',
        words: [
          { gloss: 'if', syllables: [{ thai: 'ถ้า', ipa: 'tʰâː' }] },
          { gloss: 'rain', syllables: [{ thai: 'ฝน', ipa: 'fǒn' }] },
          { gloss: 'falls', syllables: [{ thai: 'ตก', ipa: 'tòk' }] },
          { gloss: 'I (male)', syllables: [{ thai: 'ผม', ipa: 'pʰǒm' }] },
          { gloss: 'will', syllables: [{ thai: 'จะ', ipa: 'tɕà' }] },
          { gloss: 'not', syllables: [{ thai: 'ไม่', ipa: 'mâj' }] },
          { gloss: 'go', syllables: [{ thai: 'ไป', ipa: 'paj' }] },
        ],
      },
      {
        id: 'ahanthaikwa',
        meaning: 'I think Thai food is more delicious than Japanese food.',
        note: 'กว่า "than" attaches straight onto the adjective — no separate word for "more".',
        words: [
          { gloss: 'I (male)', syllables: [{ thai: 'ผม', ipa: 'pʰǒm' }] },
          {
            gloss: 'think that',
            syllables: [
              { thai: 'คิด', ipa: 'kʰít' },
              { thai: 'ว่า', ipa: 'wâː' },
            ],
          },
          {
            gloss: 'Thai food',
            syllables: [
              { thai: 'อา', ipa: 'ʔaː' },
              { thai: 'หาร', ipa: 'hǎːn' },
              { thai: 'ไทย', ipa: 'tʰaj' },
            ],
          },
          {
            gloss: 'more delicious',
            syllables: [
              { thai: 'อ', ipa: 'ʔà' },
              { thai: 'ร่อย', ipa: 'rɔ̀j' },
              { thai: 'กว่า', ipa: 'kwàː' },
            ],
          },
          {
            gloss: 'Japanese food',
            syllables: [
              { thai: 'อา', ipa: 'ʔaː' },
              { thai: 'หาร', ipa: 'hǎːn' },
              { thai: 'ญี่', ipa: 'jîː' },
              { thai: 'ปุ่น', ipa: 'pùn' },
            ],
          },
        ],
      },
      {
        id: 'ranthiraokin',
        meaning: 'The restaurant we ate at yesterday was really good.',
        note: 'ที่ opens the relative clause right after the noun it modifies — no agreement to track.',
        words: [
          {
            gloss: 'restaurant',
            syllables: [
              { thai: 'ร้าน', ipa: 'ráːn' },
              { thai: 'อา', ipa: 'ʔaː' },
              { thai: 'หาร', ipa: 'hǎːn' },
            ],
          },
          { gloss: 'that / which', syllables: [{ thai: 'ที่', ipa: 'tʰîː' }] },
          { gloss: 'we', syllables: [{ thai: 'เรา', ipa: 'raw' }] },
          { gloss: 'ate', syllables: [{ thai: 'กิน', ipa: 'kin' }] },
          {
            gloss: 'yesterday',
            syllables: [
              { thai: 'เมื่อ', ipa: 'mɯ̂a' },
              { thai: 'วาน', ipa: 'waːn' },
              { thai: 'นี้', ipa: 'níː' },
            ],
          },
          { gloss: 'was delicious', syllables: [{ thai: 'อ', ipa: 'ʔà' }, { thai: 'ร่อย', ipa: 'rɔ̀j' }] },
          { gloss: 'very', syllables: [{ thai: 'มาก', ipa: 'mâːk' }] },
        ],
      },
      {
        id: 'rianphasathaiphro',
        meaning: "I'm studying Thai because I want to work in Thailand.",
        note: 'เพราะ "because" opens the reason clause directly, the same way it does in English.',
        words: [
          { gloss: 'I (male)', syllables: [{ thai: 'ผม', ipa: 'pʰǒm' }] },
          {
            gloss: 'study Thai',
            syllables: [
              { thai: 'เรียน', ipa: 'rian' },
              { thai: 'ภา', ipa: 'pʰaː' },
              { thai: 'ษา', ipa: 'sǎː' },
              { thai: 'ไทย', ipa: 'tʰaj' },
            ],
          },
          { gloss: 'because', syllables: [{ thai: 'เพราะ', ipa: 'pʰrɔ́' }] },
          { gloss: 'want to', syllables: [{ thai: 'อยาก', ipa: 'jàːk' }] },
          {
            gloss: 'work',
            syllables: [
              { thai: 'ทำ', ipa: 'tʰam' },
              { thai: 'งาน', ipa: 'ŋaːn' },
            ],
          },
          {
            gloss: 'in Thailand',
            syllables: [
              { thai: 'ที่', ipa: 'tʰîː' },
              { thai: 'เมือง', ipa: 'mɯaŋ' },
              { thai: 'ไทย', ipa: 'tʰaj' },
            ],
          },
        ],
      },
      {
        id: 'phothamngansret',
        meaning: "As soon as I finish work, I'll go straight home.",
        note: 'พอ ... เสร็จ marks the first clause as already complete — closer to "once X is done" than a literal "as soon as".',
        words: [
          { gloss: 'as soon as', syllables: [{ thai: 'พอ', ipa: 'pʰɔː' }] },
          {
            gloss: 'finish work',
            syllables: [
              { thai: 'ทำ', ipa: 'tʰam' },
              { thai: 'งาน', ipa: 'ŋaːn' },
              { thai: 'เสร็จ', ipa: 'sèt' },
            ],
          },
          { gloss: 'I (male)', syllables: [{ thai: 'ผม', ipa: 'pʰǒm' }] },
          { gloss: 'will', syllables: [{ thai: 'จะ', ipa: 'tɕà' }] },
          {
            gloss: 'go home',
            syllables: [
              { thai: 'กลับ', ipa: 'klàp' },
              { thai: 'บ้าน', ipa: 'bâːn' },
            ],
          },
          {
            gloss: 'immediately',
            syllables: [
              { thai: 'ทัน', ipa: 'tʰan' },
              { thai: 'ที', ipa: 'tʰiː' },
            ],
          },
        ],
      },
    ],
  },
];

export const ALL_PHRASES: Phrase[] = PHRASE_GROUPS.flatMap(g => g.phrases);

export const phraseById = (id: string): Phrase | undefined =>
  ALL_PHRASES.find(p => p.id === id);
