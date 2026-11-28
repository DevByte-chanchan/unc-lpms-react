// Table of Specifications arithmetic, shared by the generated documents (tosPdfHtml.js)
// and the on-screen TOS tables, so they can never disagree. Pure: no React, no DOM.
// Unit tests: tosMath.test.js (npm test).
//
// The rules follow the Registrar's TOS form ([TOS] ACT222L FINAL(CASIMERO).docx):
//   - a question carries its total `points` and its `span`, the number of numbered
//     items it covers (TOS module: item numbers advance by span). So a question worth
//     10 points spanning 2 items is 2 items of 5 points;
//   - an ILO's cell for a cognitive level shows only its points, as a plain number ("15");
//   - the % column is fixed: ILO1 = 20, ILO2 = 30, ILO3 = 50 (FIXED_ILO_PERCENT),
//     every CO row = 100 and the Total row = 100;
//   - hours are fixed: every CO = 20 hours (CO_HOURS), split 20/30/50 → ILO1 4, ILO2 6, ILO3 10;
//   - points come from the TOS: an ILO's points (stored, else the sum of its questions),
//     a CO's points (stored totalPoints, else the sum of its ILOs), the Total = all COs;
//   - the Total row shows the hours, 100, the points and the points per level
//     (the same table as the TOS module's on-screen preview).
//   - zero, empty or missing values print as an empty cell, never "—" or "0".

export const COGNITIVE_LEVELS = ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];

// The fixed % of each ILO within its CO, by position. A CO is always 100, and so is the Total.
// A CO whose ILO count differs from this list keeps the stored percentages.
export const FIXED_ILO_PERCENT = [20, 30, 50];
export const CO_PERCENT = 100;
export const CO_HOURS = 20;

/** The fixed % for the ILO at `index` of a CO with `count` ILOs (the stored value otherwise). */
export function iloPercent(index, count, stored) {
  if (count === FIXED_ILO_PERCENT.length) return FIXED_ILO_PERCENT[index];
  const n = Number(stored);
  return Number.isFinite(n) ? n : 0;
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
// Sums of decimals (e.g. 2.5 + 2.5) without float noise.
const round2 = (n) => Math.round(n * 100) / 100;
const fmt = (n) => String(round2(n));

/** '' for 0, null, undefined, '' (or blank text) and NaN; otherwise the value unchanged. */
export function blankIfZero(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') {
    if (v.trim() === '') return '';
    const n = Number(v);
    return Number.isFinite(n) && n === 0 ? '' : v;
  }
  if (typeof v === 'number') return Number.isFinite(v) && v !== 0 ? v : '';
  return v;
}

const itemsOf = (q) => Math.max(1, Math.round(num(q.span) || 1));

/**
 * groupLevelCell(items) → { terms: [{ count, points }], total, text }
 *   terms  one per value per item, highest first; count = number of items
 *   total  the points of all the items
 *   count  the number of items
 *   text   the points ("15"), or '' when there is nothing
 */
export function groupLevelCell(items = []) {
  const byValue = new Map();
  let total = 0;
  for (const q of items) {
    const pts = num(q.points);
    if (pts <= 0) continue;
    const n = itemsOf(q);
    const each = round2(pts / n);
    byValue.set(each, (byValue.get(each) || 0) + n);
    total += pts;
  }
  const terms = [...byValue.entries()].sort((a, b) => b[0] - a[0]).map(([points, count]) => ({ count, points }));
  total = round2(total);
  const count = terms.reduce((n, t) => n + t.count, 0);
  const text = total ? fmt(total) : '';
  return { terms, total, count, text };
}

/** A CO's share of all hours, as a percentage (15 of 40 → 37.5). 0 when there are no hours. */
export const coShare = (coHours, allHours) => (num(allHours) > 0 ? round2((num(coHours) / num(allHours)) * 100) : 0);

/** "37.5%", or '' for none. */
export const pct = (v) => (num(v) > 0 ? fmt(num(v)) + '%' : '');

/**
 * outcomes: [{ co, description, ilos: [{ id, description, hours, percentage, items, points? }] }]
 * questions: [{ co, ilo, cognitiveLevel, points, span, instruction }]
 *
 * → { cos, totals }. Each ILO gets `cells` (one groupLevelCell per level), `questions`,
 *   `itemCount` (items counted from the questions) and `itemPoints`; each CO gets
 *   `totalHours`, `share` and `itemPoints`.
 */
export function aggregateTos(outcomes = [], questions = []) {
  const byIlo = new Map();
  for (const q of questions) {
    if (!q || !q.co || !q.ilo || !q.cognitiveLevel) continue;
    const level = COGNITIVE_LEVELS.indexOf(q.cognitiveLevel);
    if (level < 0) continue;
    const key = q.co + '\u0000' + q.ilo;
    if (!byIlo.has(key)) byIlo.set(key, { perLevel: COGNITIVE_LEVELS.map(() => []), questions: [] });
    const entry = byIlo.get(key);
    entry.perLevel[level].push(q);
    entry.questions.push(q);
  }

  const allHours = outcomes.reduce((s, co) => s + ((co.ilos || []).length ? CO_HOURS : 0), 0);

  const cos = outcomes.map((co) => {
    const iloList = co.ilos || [];
    const ilos = iloList.map((ilo, index) => {
      const entry = byIlo.get(co.co + '\u0000' + ilo.id) || { perLevel: COGNITIVE_LEVELS.map(() => []), questions: [] };
      const cells = entry.perLevel.map((list) => groupLevelCell(list));
      const itemCount = entry.questions.reduce((s, q) => s + (num(q.points) > 0 ? itemsOf(q) : 0), 0);
      const itemPoints = round2(cells.reduce((s, c) => s + c.total, 0));
      const percentage = iloPercent(index, iloList.length, ilo.percentage);
      return {
        ...ilo,
        storedHours: num(ilo.hours),
        hours: round2((CO_HOURS * percentage) / 100),
        percentage,
        points: ilo.points !== undefined && ilo.points !== null && ilo.points !== '' ? num(ilo.points) : itemPoints,
        // "No. of Items/Tasks" as stored; counted from the questions when not stored.
        items: ilo.items === undefined || ilo.items === null || ilo.items === '' ? itemCount : num(ilo.items),
        cells,
        questions: entry.questions,
        itemCount,
        itemPoints,
      };
    });
    const totalHours = ilos.length ? CO_HOURS : 0;
    return {
      ...co,
      ilos,
      totalHours,
      share: coShare(totalHours, allHours),
      percentage: CO_PERCENT,
      points: co.totalPoints !== undefined && co.totalPoints !== null && co.totalPoints !== ''
        ? num(co.totalPoints)
        : round2(ilos.reduce((s, ilo) => s + ilo.points, 0)),
      items: ilos.reduce((s, ilo) => s + ilo.items, 0),
      levelPoints: COGNITIVE_LEVELS.map((_, i) => round2(ilos.reduce((s, ilo) => s + ilo.cells[i].total, 0))),
      levelItems: COGNITIVE_LEVELS.map((_, i) => ilos.reduce((s, ilo) => s + ilo.cells[i].count, 0)),
      itemPoints: round2(ilos.reduce((s, ilo) => s + ilo.itemPoints, 0)),
    };
  });

  return { cos, totals: totals(cos) };
}

/** The Total row: hours, % (100), the fixed points, items, items per level, and the question points. */
export function totals(cos = []) {
  const hours = round2(cos.reduce((s, co) => s + co.totalHours, 0));
  return {
    hours,
    percentage: cos.length ? CO_PERCENT : 0,
    items: cos.reduce((s, co) => s + co.items, 0),
    formPoints: round2(cos.reduce((s, co) => s + (co.points || 0), 0)),
    levels: COGNITIVE_LEVELS.map((_, i) => round2(cos.reduce((s, co) => s + co.levelPoints[i], 0))),
    levelItems: COGNITIVE_LEVELS.map((_, i) => cos.reduce((s, co) => s + (co.levelItems ? co.levelItems[i] : 0), 0)),
    levelPoints: COGNITIVE_LEVELS.map((_, i) => round2(cos.reduce((s, co) => s + co.levelPoints[i], 0))),
    points: round2(cos.reduce((s, co) => s + co.itemPoints, 0)),
  };
}

/** Problems that would make the Report inconsistent (empty when consistent). */
export function checkTos(aggregate) {
  const problems = [];
  const { cos, totals: t } = aggregate;
  const levelSum = round2(t.levels.reduce((s, n) => s + n, 0));
  if (levelSum !== t.points) problems.push(`The cognitive levels add up to ${levelSum} points, but the questions to ${t.points}.`);
  for (const co of cos) {
    for (const ilo of co.ilos) {
      if (ilo.itemCount && ilo.items !== ilo.itemCount) problems.push(`${co.co} ${ilo.id}: ${ilo.items} items stored, ${ilo.itemCount} in the questions.`);
    }
  }
  return problems;
}
