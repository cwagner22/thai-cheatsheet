/**
 * Sentences the learner adds themselves, kept in this browser. Typed as
 * Thai with a space between syllables and a slash between words; the tone
 * of each syllable is read from its spelling with the same rules the Tones
 * tab teaches, and can be overridden by hand when the reading is wrong.
 */

import type { Phrase, PhraseGroup, PhraseSyllable } from '../data/phrases';
import { analyzeSyllable } from './analyzeSyllable';
import { standardCellMatch, type ToneName } from './toneLookup';

const STORAGE_KEY = 'speaking.custom';

export const CUSTOM_GROUP: Omit<PhraseGroup, 'phrases'> = {
  id: 'yours',
  title: 'Yours',
  blurb: 'Sentences you added. Saved in this browser only.',
};

export const isCustom = (phrase: Phrase): boolean => phrase.id.startsWith('custom-');

export function loadCustom(): Phrase[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Phrase[]).filter(p => p && typeof p.id === 'string' && Array.isArray(p.words)) : [];
  } catch {
    return [];
  }
}

export function saveCustom(phrases: Phrase[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases));
  } catch {
    // Storage unavailable: the sentence lives for this session only.
  }
}

/** The tone a syllable's spelling gives it; Mid when the spelling cannot be
 *  read (a foreign word, a typo). */
export function toneFromSpelling(thai: string): ToneName {
  const analysis = analyzeSyllable(thai);
  return analysis ? standardCellMatch(analysis).tone : 'Mid';
}

export interface CustomDraft {
  /** Syllables separated by spaces, words by ` / `. */
  thai: string;
  meaning: string;
  /** Optional: one IPA syllable per Thai syllable, in the same order,
   *  separated by spaces (words may also be separated by `/`). */
  ipa: string;
  /** Explicit tones by syllable index, where the learner corrected one. */
  tones: Record<number, ToneName>;
}

/** Splits the draft's Thai into words of syllables. */
export function draftSyllables(thai: string): string[][] {
  return thai
    .split('/')
    .map(word => word.trim().split(/\s+/).filter(Boolean))
    .filter(word => word.length > 0);
}

export function buildCustom(draft: CustomDraft, id = `custom-${Date.now()}`): Phrase | null {
  const words = draftSyllables(draft.thai);
  if (words.length === 0) return null;
  const ipa = draft.ipa.replace(/\//g, ' ').trim().split(/\s+/).filter(Boolean);
  let index = 0;
  return {
    id,
    meaning: draft.meaning.trim() || '—',
    words: words.map(syllables => ({
      gloss: '',
      syllables: syllables.map((thai): PhraseSyllable => {
        const i = index++;
        return { thai, ipa: ipa[i] ?? '', tone: draft.tones[i] ?? toneFromSpelling(thai) };
      }),
    })),
  };
}

/** The draft that rebuilds an existing sentence, for editing. */
export function draftOf(phrase: Phrase): CustomDraft {
  const tones: Record<number, ToneName> = {};
  let index = 0;
  for (const w of phrase.words) for (const s of w.syllables) {
    if (s.tone && s.tone !== toneFromSpelling(s.thai)) tones[index] = s.tone;
    index++;
  }
  return {
    thai: phrase.words.map(w => w.syllables.map(s => s.thai).join(' ')).join(' / '),
    meaning: phrase.meaning === '—' ? '' : phrase.meaning,
    ipa: phrase.words.map(w => w.syllables.map(s => s.ipa).join(' ')).join(' / ').trim(),
    tones,
  };
}
