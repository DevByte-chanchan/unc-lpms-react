/**
 * Where the tables are in a picture of a school calendar. Pure: works on a
 * greyscale pixel buffer, no OCR (tests/schoolCalendarReader.test.js).
 *
 * UNC's calendar is a set of ruled tables: a title row, a date-range row, then
 * two columns (date | event) split by a vertical rule. Finding those lets the
 * OCR read one table, and one column, at a time — read as a whole page, the
 * blocks side by side run into each other line by line.
 *
 * The rules of a small, compressed picture are faint and broken (the sample's
 * Summer table has no visible bottom edge), so tables are found from what every
 * block does have: a STACK of horizontal rules of the same width at its top
 * (above the title, between title and range, under the range).
 *
 *   findTables({ data, width, height }) → [{ x0, y0, x1, y1, headerBottom, split }]
 *     y0..headerBottom  the title and range rows
 *     headerBottom..y1  the rows
 *     split             x of the date | event rule (null when none was found)
 */

/** Runs of dark pixels along one line, allowing `gap` light pixels inside a run. */
function runs(get, length, minLen, gap) {
  const out = [];
  let start = -1;
  let lastDark = -1;
  for (let i = 0; i <= length; i++) {
    const dark = i < length && get(i);
    if (dark) {
      if (start < 0) start = i;
      lastDark = i;
    } else if (start >= 0 && (i - lastDark > gap || i === length)) {
      if (lastDark - start + 1 >= minLen) out.push([start, lastDark]);
      start = -1;
    }
  }
  return out;
}

/** Long horizontal rules, a 2–3 px thick rule counted once: [{ y, a, b }]. */
export function horizontalRules(img, { threshold = 200 } = {}) {
  const { data, width: w, height: h } = img;
  const minLen = Math.max(40, Math.round(w * 0.12));
  const segs = [];
  for (let y = 0; y < h; y++) {
    for (const [a, b] of runs((x) => data[y * w + x] < threshold, w, minLen, 2)) segs.push({ y, a, b });
  }
  const out = [];
  for (const s of segs) {
    const hit = out.find((o) => s.y - o.yMax <= 1 && Math.abs(s.a - o.a) <= 8 && Math.abs(s.b - o.b) <= 16);
    if (hit) { hit.yMax = s.y; hit.a = Math.min(hit.a, s.a); hit.b = Math.max(hit.b, s.b); } else out.push({ y: s.y, yMax: s.y, a: s.a, b: s.b });
  }
  // A rule is thin: light just above and below it. A filled band, or a line of
  // bold text whose letters ran together, is dark there too.
  const darkShare = (y, a, b) => {
    if (y < 0 || y >= h) return 0;
    let n = 0;
    for (let x = a; x <= b; x++) if (data[y * w + x] < threshold) n += 1;
    return n / (b - a + 1);
  };
  return out
    .filter((o) => o.yMax - o.y <= 4)
    .filter((o) => Math.min(darkShare(o.y - 2, o.a, o.b), darkShare(o.yMax + 2, o.a, o.b)) < 0.3)
    .map((o) => ({ y: Math.round((o.y + o.yMax) / 2), a: o.a, b: o.b }));
}

/**
 * x of the date | event rule: the longest vertical rule between y0 and y1 in the
 * left part of the table (the date column is the narrow one), or null.
 */
export function verticalSplit(img, { x0, x1, y0, y1 }, { threshold = 200 } = {}) {
  const { data, width: w } = img;
  const height = y1 - y0;
  if (height < 20) return null;
  let best = null;
  const from = x0 + Math.max(6, Math.round((x1 - x0) * 0.1));
  const to = x0 + Math.round((x1 - x0) * 0.6);
  for (let x = from; x < to; x++) {
    let longest = 0;
    for (const [a, b] of runs((i) => data[(y0 + i) * w + x] < threshold, height, 1, 2)) longest = Math.max(longest, b - a + 1);
    if (longest >= height * 0.6 && (!best || longest > best.len + 2)) best = { x, len: longest };
  }
  return best ? best.x : null;
}

/**
 * The tables of the page, left to right then top to bottom.
 * @param img { data: Uint8Array greyscale, width, height }
 */
export function findTables(img, { threshold = 200 } = {}) {
  const { width: w, height: h } = img;
  const rules = horizontalRules(img, { threshold }).sort((p, q) => p.y - q.y);
  // Rules of the same width belong to the same column of tables.
  const ta = Math.max(8, Math.round(w * 0.015));
  const tb = Math.max(16, Math.round(w * 0.035));
  const columns = [];
  for (const r of rules) {
    const c = columns.find((k) => Math.abs(k.a - r.a) <= ta && Math.abs(k.b - r.b) <= tb);
    if (c) { c.rules.push(r); c.a = Math.min(c.a, r.a); c.b = Math.max(c.b, r.b); } else columns.push({ a: r.a, b: r.b, rules: [r] });
  }
  const maxGap = Math.max(26, Math.round(h * 0.08));
  const tables = [];
  for (const col of columns) {
    // Header stacks: two or more rules close together.
    const stacks = [];
    let cur = [col.rules[0]];
    for (let i = 1; i < col.rules.length; i++) {
      const r = col.rules[i];
      if (r.y - cur[cur.length - 1].y <= maxGap) cur.push(r);
      else { stacks.push(cur); cur = [r]; }
    }
    stacks.push(cur);
    const colTables = [];
    stacks.forEach((st, i) => {
      if (st.length < 2) return;
      const next = stacks[i + 1];
      const top = st[0].y;
      const headerBottom = st[st.length - 1].y;
      // Rows run to the next rule of this column: the bottom edge, or the next table's top.
      const y1 = next ? next[0].y : h - 1;
      if (y1 - headerBottom < 12) return;
      colTables.push({ x0: col.a, y0: top, x1: col.b, y1, headerBottom });
    });
    for (const t of colTables) t.split = verticalSplit(img, { x0: t.x0, x1: t.x1, y0: t.headerBottom + 2, y1: t.y1 - 2 }, { threshold });
    // A table whose rule is too faint borrows its neighbour's (same column, same layout).
    const known = colTables.find((t) => t.split != null);
    for (const t of colTables) if (t.split == null && known) t.split = known.split;
    tables.push(...colTables);
  }
  // A "table" that starts inside another table's rows is text in it, not a table.
  const real = tables.filter((t) => !tables.some((o) => o !== t && o.x0 < t.x0 - 2 && t.x0 < o.x1 && t.y0 > o.headerBottom && t.y0 < o.y1));
  return real.sort((p, q) => p.x0 - q.x0 || p.y0 - q.y0);
}

/**
 * Text lines from OCR'd columns → table rows. Lines are matched by their
 * vertical centre: a date and an event on the same row overlap in height.
 * @param dateLines  [{ text, y0, y1, conf }]
 * @param eventLines [{ text, y0, y1, conf }]
 */
export function pairRows(dateLines, eventLines) {
  const rows = [];
  const centre = (l) => (l.y0 + l.y1) / 2;
  const heights = [...dateLines, ...eventLines].map((l) => l.y1 - l.y0).sort((a, b) => a - b);
  const lineH = heights.length ? heights[Math.floor(heights.length / 2)] : 10;
  for (const e of eventLines) rows.push({ y: centre(e), event: e, date: null });
  for (const d of dateLines) {
    let best = null;
    for (const r of rows) {
      const dist = Math.abs(r.y - centre(d));
      if (dist <= lineH * 0.6 && !r.date && (!best || dist < Math.abs(best.y - centre(d)))) best = r;
    }
    if (best) best.date = d;
    else rows.push({ y: centre(d), event: null, date: d });
  }
  return rows.sort((a, b) => a.y - b.y);
}

/**
 * The exact columns [xa, xb] of a vertical rule near `x` (within `search` px),
 * dark for at least 60% of y0..y1, or null. `side` picks among several rules in
 * the window: 'first' (leftmost) or 'last' (rightmost). Used to crop just inside
 * the rules: text drawn right against a rule is otherwise read as part of it.
 */
export function ruleSpan(img, { x, from = x - 4, to = x + 4, y0, y1, side = 'first' }, { threshold = 200 } = {}) {
  const { data, width: w } = img;
  const height = y1 - y0;
  if (height < 10) return null;
  const isRule = (cx) => {
    if (cx < 0 || cx >= w) return false;
    let longest = 0;
    for (const [a, b] of runs((i) => data[(y0 + i) * w + cx] < threshold, height, 1, 2)) longest = Math.max(longest, b - a + 1);
    return longest >= height * 0.6;
  };
  const xs = [];
  for (let cx = Math.max(0, Math.round(from)); cx <= Math.min(w - 1, Math.round(to)); cx++) if (isRule(cx)) xs.push(cx);
  if (!xs.length) return null;
  // Group neighbouring columns into rules.
  const spans = [];
  for (const cx of xs) {
    const last = spans[spans.length - 1];
    if (last && cx - last[1] <= 1) last[1] = cx; else spans.push([cx, cx]);
  }
  return side === 'last' ? spans[spans.length - 1] : spans[0];
}

/**
 * Step from a rule's edge past its anti-aliased halo: while the next column is
 * a uniform pale strip (most pixels mid-grey, as a blurred line leaves) rather
 * than text, move one more column (`dir` +1 rightwards, -1 leftwards).
 */
export function pastHalo(img, x, dir, y0, y1, { max = 2 } = {}) {
  const { data, width: w } = img;
  let cx = x;
  for (let k = 0; k < max; k++) {
    if (cx < 0 || cx >= w) break;
    let pale = 0;
    for (let y = y0; y < y1; y++) { const v = data[y * w + cx]; if (v >= 150 && v <= 235) pale += 1; }
    if (pale < (y1 - y0) * 0.7) break;
    cx += dir;
  }
  return cx;
}
