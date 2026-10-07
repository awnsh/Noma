/** "1 time" / "2 times": returns the word with `s` (or `pluralWord`) unless n is 1. */
export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return n === 1 ? word : pluralWord
}
