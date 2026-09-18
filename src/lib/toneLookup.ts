import type { SyllableAnalysis } from './analyzeSyllable';

export type ToneName = 'Mid' | 'Low' | 'Falling' | 'High' | 'Rising';

export interface CellMatch {
  /** Identifies which <td> to highlight in TonesTab's Standard Thai table
   *  (see the cellKey literals used there) — null when the analysis maps
   *  to a mark the trimmed table doesn't show a column for. */
  key: string | null;
  tone: ToneName;
  note?: string;
}

/** Standard Thai: class + mark (or live/dead + vowel length) → which cell
 *  of the unified tone table applies. Mirrors the table's own cell merges
 *  (e.g. Mid/High share one cell for Dead short+long, since they always
 *  agree there) rather than re-deriving them independently. */
export function standardCellMatch(a: SyllableAnalysis): CellMatch {
  const { klass, mark, isLive, vowelLength } = a;

  if (mark === 'tri') return { key: null, tone: 'High', note: '๊ isn’t a column in this table (see the card legend below)' };
  if (mark === 'chattawa') return { key: null, tone: 'Rising', note: '๋ isn’t a column in this table (see the card legend below)' };

  if (mark === 'ek') {
    return klass === 'low' ? { key: 'low-deadlong', tone: 'Falling' } : { key: 'mid+high-dead', tone: 'Low' };
  }
  if (mark === 'tho') {
    return klass === 'low' ? { key: 'low-maitho', tone: 'High' } : { key: 'mid+high-maitho', tone: 'Falling' };
  }

  if (isLive) {
    if (klass === 'mid') return { key: 'mid-live', tone: 'Mid' };
    if (klass === 'high') return { key: 'high-live', tone: 'Rising' };
    return { key: 'low-live', tone: 'Mid' };
  }
  if (klass === 'low') {
    return vowelLength === 'short' ? { key: 'low-deadshort', tone: 'High' } : { key: 'low-deadlong', tone: 'Falling' };
  }
  return { key: 'mid+high-dead', tone: 'Low' };
}

export interface NorthernCellMatch {
  /** cellKey identifies the <td>; code is the specific Gedney box code to
   *  highlight within it — only the Mid row's Normal cell holds more than
   *  one, so code disambiguates which of the two stacked cards matched. */
  cellKey: string | null;
  code: string | null;
  note?: string;
}

const KO_TO_PO = new Set(['ก', 'ต', 'ป']);
const DO_BO_O = new Set(['ด', 'บ', 'อ']);

/** Northern Thai: same idea, but the environment columns are Normal / Short
 *  dead / Long dead (+Mai Ek) / Mai Tho, and Mid class further splits by the
 *  specific letter for the Normal column only. */
export function northernCellMatch(a: SyllableAnalysis): NorthernCellMatch {
  const { klass, mark, isLive, vowelLength, initial } = a;

  if (mark === 'tri' || mark === 'chattawa') {
    return { cellKey: null, code: null, note: '๊/๋ aren’t part of the Northern system — no cell to show' };
  }

  const col: 'normal' | 'deadshort' | 'deadlong' | 'maitho' =
    mark === 'tho' ? 'maitho' :
    mark === 'ek' ? 'deadlong' :
    isLive ? 'normal' :
    vowelLength === 'short' ? 'deadshort' : 'deadlong';

  if (klass === 'low') return { cellKey: `low-${col}`, code: null };
  if (klass === 'high') return { cellKey: col === 'normal' ? 'high-normal' : `high+mid-${col}`, code: null };

  // mid
  if (col !== 'normal') return { cellKey: `high+mid-${col}`, code: null };
  if (KO_TO_PO.has(initial)) return { cellKey: 'mid-normal', code: 'A1–2' };
  if (DO_BO_O.has(initial)) return { cellKey: 'mid-normal', code: 'A3–4' };
  return { cellKey: null, code: null, note: `${initial} isn’t attested either way — see the note above the table` };
}
