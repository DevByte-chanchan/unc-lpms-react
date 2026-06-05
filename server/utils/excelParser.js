/**
 * Excel parsing utilities.
 *
 * The frontend uploads a .xlsx/.xls/.csv file as multipart/form-data;
 * multer drops it on disk under server/uploads/. parseSheet() reads
 * the first worksheet and normalizes the header row so callers can
 * pull values out by a canonical key regardless of casing or spacing
 * variations in the source workbook.
 *
 * canonicalize() lower-cases and strips non-alphanumerics so that
 * "PROGRAM HEAD", "Program Head" and "program_head" all map to the
 * same key "programhead".
 */
import xlsx from 'xlsx';
import fs from 'node:fs';

export function canonicalize(header) {
  return String(header ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Read the first worksheet from a file and return:
 *   { rows: [ { canonHeader: cellValue, ... }, ... ], headers: [...] }
 *
 * Empty rows are dropped. Whitespace around cell values is trimmed.
 */
export function parseSheet(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Workbook contains no sheets.');
  }
  const sheet = workbook.Sheets[sheetName];

  // header: 1 gives us an array-of-arrays; we then build our own
  // canonical-keyed objects from it.
  const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
  if (matrix.length === 0) return { rows: [], headers: [] };

  const [rawHeaders, ...dataRows] = matrix;
  const headers = rawHeaders.map((h) => String(h ?? '').trim());
  const canonHeaders = headers.map(canonicalize);

  const rows = dataRows
    .filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ''))
    .map((r) => {
      const obj = {};
      canonHeaders.forEach((key, i) => {
        const raw = r[i];
        const val = typeof raw === 'string' ? raw.trim() : raw;
        // Headers can be duplicated (e.g. two "ROLE" columns). Keep the
        // FIRST non-empty value so an empty duplicate column can't
        // overwrite real data and make the row look incomplete.
        const cur = obj[key];
        const curEmpty = cur === undefined || cur === null || cur === '';
        if (curEmpty) obj[key] = val;
      });
      return obj;
    });

  return { rows, headers };
}

/**
 * Remove the temp upload file. Swallow errors — failing to clean up
 * a temp file shouldn't fail the user's request.
 */
export function safeUnlink(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
}

/**
 * Pick the first non-empty value from a list of canonical header
 * candidates. Use this when the Excel header could reasonably be
 * one of several names (e.g. "description" vs "coursetitle").
 */
export function pick(row, ...candidates) {
  for (const c of candidates) {
    const v = row[c];
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }
  return null;
}
