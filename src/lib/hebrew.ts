const NIQQUD = /[֑-ׇ]/g;
const PUNCTUATION = /['"׳״־\-\s.,]/g;
const FINAL: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/** Form used for matching only: no niqqud, punctuation or spaces, final letters folded. */
export function normalizeName(text: string): string {
  return text
    .normalize('NFC')
    .replace(NIQQUD, '')
    .replace(PUNCTUATION, '')
    .replace(/[ךםןףץ]/g, (c) => FINAL[c]);
}
