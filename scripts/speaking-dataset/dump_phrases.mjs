// Prints the app's practice sentences (src/data/phrases.ts) as JSON on stdout.
// Run with: node --experimental-strip-types scripts/speaking-dataset/dump_phrases.mjs
const mod = await import('../../src/data/phrases.ts');
const out = mod.ALL_PHRASES.map(p => ({
  id: p.id,
  meaning: p.meaning,
  words: p.words.map(w => ({ gloss: w.gloss, syllables: w.syllables.map(s => ({ thai: s.thai, ipa: s.ipa })) })),
}));
process.stdout.write(JSON.stringify(out));
