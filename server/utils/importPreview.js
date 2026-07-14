/**
 * Dry-run support for the bulk-upload endpoints.
 *
 * Every upload controller already runs in two halves: parse the sheet into
 * `records` + `errors`, THEN snapshot and write. A preview is simply an early
 * return between those halves — nothing has touched the database yet, so a
 * dry run is exactly the first half with the second half skipped.
 *
 * The rule that keeps it honest: `previewResponse()` must be returned BEFORE
 * `beginImportBatch()`. Past that line the upload has started writing, and a
 * preview that leaves a batch behind would offer an Undo for an import that
 * never happened.
 *
 * SHAPE — one payload for every entity, so the client has one component:
 *
 *   {
 *     preview: true,
 *     filename: 'faculty-2026.xlsx',      // echoed back; the wrong-file cue
 *     detectedColumns: ['Name', 'Role'],  // the sheet's header row
 *     total: 42,                          // rows parsed (valid + invalid)
 *     validCount: 40,                     // rows that WILL import
 *     errorCount: 2,                      // rows that will be skipped
 *     rows: [{
 *       rowNum: 2,                        // 1-based sheet row (header is 1)
 *       level: 'ok' | 'warning' | 'error',
 *       cells: { Name: 'Ana Cruz', Role: 'Dean', … },   // display columns
 *       errors: [{ field: 'Role', message: 'Missing ROLE.' }],
 *     }, …],
 *   }
 *
 * `level` is what the table tints: 'error' rows are skipped by the commit,
 * 'warning' rows import but with a caveat (a department name that didn't
 * resolve, say), 'ok' rows import cleanly. Only 'error' rows count towards
 * `errorCount` — a warning is not a reason to tell someone their file is broken.
 *
 * Courses layers its own keys (recognizedCount, unassigned[], …) on top of this
 * via `extra`, so its year-level reconciliation step keeps working unchanged.
 */

/** True when the caller asked for a dry run (?preview=1 or preview=1 in the body). */
export const isPreviewRequest = (req) =>
  ['1', 'true', 'yes'].includes(
    String((req.query && req.query.preview) || (req.body && req.body.preview) || '').toLowerCase()
  );

/**
 * Collects one entry per sheet row as the controller's existing row loop walks
 * it, so preview rows and the records that get written come from the SAME pass.
 * Two passes would eventually disagree, and the preview would start lying.
 */
export class PreviewRows {
  constructor() {
    this.rows = [];
  }

  /** A row that will import cleanly. */
  ok(rowNum, cells) {
    this.rows.push({ rowNum, level: 'ok', cells, errors: [] });
  }

  /** A row that will import, but with something worth seeing first. */
  warning(rowNum, cells, errors) {
    this.rows.push({ rowNum, level: 'warning', cells, errors: [].concat(errors) });
  }

  /** A row the commit will skip. */
  error(rowNum, cells, errors) {
    this.rows.push({ rowNum, level: 'error', cells, errors: [].concat(errors) });
  }

  get errorCount() {
    return this.rows.filter((r) => r.level === 'error').length;
  }
}

/**
 * Build the dry-run payload. `extra` merges entity-specific keys in (courses).
 *
 * Note there is no "no valid rows" 400 here, unlike the commit path: a file
 * with nothing importable in it is precisely the wrong-file case this feature
 * exists to catch, and the user is better served seeing 40 red rows and the
 * columns we detected than a one-line error. The commit path keeps its 400.
 */
export function previewResponse(res, { filename, headers, preview, extra }) {
  const errorCount = preview.errorCount;
  return res.json({
    preview:         true,
    filename:        filename || null,
    detectedColumns: headers || [],
    total:           preview.rows.length,
    validCount:      preview.rows.length - errorCount,
    errorCount,
    rows:            preview.rows,
    ...(extra || {}),
  });
}
