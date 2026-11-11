/**
 * Kept Program of Study PDFs — storing, versioning, undoing and listing them.
 *
 * FILES
 * Stored as server/storage/curriculum/<sha256>.pdf: never under the uploaded
 * name, and the path is only ever built from a sha256 that matched
 * /^[a-f0-9]{64}$/, so no row (or tampered value) can point outside the folder.
 * server/uploads/ is a temp folder emptied after every upload; this one is not.
 *
 * VERSIONS
 * A program's `active` rows are its latest revision. Storing a batch:
 *   - the same file (sha256) for the same program reuses its row;
 *   - every other active row of the program is `superseded`, EXCEPT a file of
 *     the same revision covering other year levels (the 3rd–4th Year half of the
 *     revision whose 1st–2nd Year half was just uploaded) — it stays active.
 * Programs are per term, so "the same program" means the same program CODE in
 * any term: next term's BSIT still sees this term's PDFs.
 *
 * UNDO
 * undoBatchDocuments(batchId) marks the batch's rows `removed`, puts the rows it
 * superseded back to `active`, and deletes a stored file once no row that isn't
 * `removed` uses it.
 */
/* global process */ // Node globals: the root ESLint config lints server/ with browser globals.
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Op } from 'sequelize';
import db from '../models/index.js';

const { CurriculumDocument, Program, UserAccount } = db;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_STORAGE_DIR = path.resolve(__dirname, '..', 'storage', 'curriculum');
/** Where the PDFs live. CURRICULUM_STORAGE_DIR lets the tests use a scratch folder. */
export const storageDir = () => process.env.CURRICULUM_STORAGE_DIR || DEFAULT_STORAGE_DIR;

export const SHA_RE = /^[a-f0-9]{64}$/;

/** Absolute path of a stored file, or null for anything that isn't a plain sha256. */
export function storedPath(sha256, dir = storageDir()) {
  const sha = String(sha256 || '');
  if (!SHA_RE.test(sha)) return null;
  const base = path.resolve(dir);
  const full = path.resolve(base, sha + '.pdf');
  // Belt and braces: the regex already rules out separators and dots.
  if (path.dirname(full) !== base) return null;
  return full;
}

/** A display name with no path, control or quote characters, at most 150 long. */
export function sanitizeName(name) {
  const base = String(name || 'program-of-study.pdf').split(/[\\/]/).pop();
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|*?:]/g, '_').replace(/\s+/g, ' ').trim();
  const out = cleaned || 'program-of-study.pdf';
  if (out.length <= 150) return out;
  const ext = path.extname(out).slice(0, 10);
  return out.slice(0, 150 - ext.length) + ext;
}

/** Every program id with the same code as `programId`, across terms. */
export async function programIdsLike(programId) {
  const id = Number(programId);
  if (!id) return [];
  const p = await Program.findByPk(id, { attributes: ['id', 'code'], raw: true });
  if (!p || !p.code) return [id];
  const same = await Program.findAll({ where: { code: p.code }, attributes: ['id'], raw: true });
  return [...new Set([id, ...same.map((r) => r.id)])];
}

const yearsKey = (years) => (Array.isArray(years) ? years.slice().sort().join(',') : String(years || ''));

async function copyIn(srcPath, sha256) {
  const dest = storedPath(sha256);
  if (!dest) throw new Error('Invalid file hash.');
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (fssync.existsSync(dest)) return false;
  // Write next to it, then rename: a half-copied file is never visible under its final name.
  const tmp = dest + '.' + process.pid + '.tmp';
  await fs.copyFile(srcPath, tmp);
  await fs.rename(tmp, dest);
  return true;
}

/**
 * Keep the PDFs of a committed import.
 *
 * @param files  [{ path, originalname, size, parsed }] — parsed is
 *               parseProgramOfStudyPdf()'s result (sha256, pages, header, part_label, years_covered)
 * @returns { rows: [CurriculumDocument], copied, reused, superseded }
 */
export async function storeDocuments({ files, programId, periodId, batchId, actorId }) {
  const programIds = await programIdsLike(programId);
  const rows = [];
  let copied = 0;
  let reused = 0;
  for (const f of files) {
    const p = f.parsed;
    if (await copyIn(f.path, p.sha256)) copied += 1;
    const existing = await CurriculumDocument.findOne({
      where: { sha256: p.sha256, program_id: { [Op.in]: programIds } },
      order: [['id', 'DESC']],
    });
    if (existing) {
      reused += 1;
      if (existing.status !== 'active') {
        // Brought back by this import: it's this batch's to take away again.
        await existing.update({ status: 'active', import_batch_id: batchId || existing.import_batch_id, superseded_by_batch_id: null });
      }
      rows.push(existing);
      continue;
    }
    rows.push(await CurriculumDocument.create({
      program_id: programId,
      period_id: periodId || null,
      import_batch_id: batchId || null,
      sha256: p.sha256,
      original_name: sanitizeName(f.originalname),
      size_bytes: Number(f.size) || 0,
      pages: p.pages || null,
      part_label: p.part_label || null,
      years_covered: yearsKey(p.years_covered) || null,
      course_codes: (p.courses || []).map((c) => String(c.code).toUpperCase()).join(',') || null,
      program_name: p.header && p.header.program_name ? String(p.header.program_name).slice(0, 150) : null,
      cmo: p.header && p.header.cmo ? String(p.header.cmo).slice(0, 64) : null,
      effectivity: p.header && p.header.effectivity ? String(p.header.effectivity).slice(0, 100) : null,
      revision: p.header && p.header.revision ? String(p.header.revision).slice(0, 16) : null,
      uploaded_by_account_id: actorId || null,
      status: 'active',
    }));
  }

  // Older active rows give way, except the other half of this same revision.
  const keepIds = new Set(rows.map((r) => r.id));
  const revisions = new Set(rows.map((r) => r.revision || ''));
  const coveredNow = new Set(rows.flatMap((r) => String(r.years_covered || '').split(',').filter(Boolean)));
  const others = await CurriculumDocument.findAll({
    where: { program_id: { [Op.in]: programIds }, status: 'active', id: { [Op.notIn]: [...keepIds] } },
  });
  let superseded = 0;
  for (const o of others) {
    const sameRevision = revisions.has(o.revision || '');
    const years = String(o.years_covered || '').split(',').filter(Boolean);
    const overlaps = years.length === 0 || years.some((y) => coveredNow.has(y));
    if (sameRevision && !overlaps) continue;
    await o.update({ status: 'superseded', superseded_by_batch_id: batchId || null });
    superseded += 1;
  }
  return { rows, copied, reused, superseded };
}

/** Delete stored files that no live (not `removed`) row uses. Returns the hashes deleted. */
export async function pruneUnusedFiles(shas) {
  const deleted = [];
  for (const sha of [...new Set(shas)]) {
    const inUse = await CurriculumDocument.count({ where: { sha256: sha, status: { [Op.ne]: 'removed' } } });
    if (inUse > 0) continue;
    const p = storedPath(sha);
    if (!p) continue;
    try { await fs.unlink(p); deleted.push(sha); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
  return deleted;
}

/** Reverse storeDocuments() for one import batch. */
export async function undoBatchDocuments(batchId) {
  if (!batchId) return { removed: 0, restored: 0, deletedFiles: [] };
  const mine = await CurriculumDocument.findAll({ where: { import_batch_id: batchId, status: { [Op.ne]: 'removed' } } });
  for (const r of mine) await r.update({ status: 'removed' });
  const back = await CurriculumDocument.findAll({ where: { superseded_by_batch_id: batchId, status: 'superseded' } });
  for (const r of back) await r.update({ status: 'active', superseded_by_batch_id: null });
  const deletedFiles = await pruneUnusedFiles(mine.map((r) => r.sha256));
  return { removed: mine.length, restored: back.length, deletedFiles };
}

/** The API shape of one row. */
export function presentDocument(r, names = new Map()) {
  const plain = typeof r.get === 'function' ? r.get({ plain: true }) : r;
  return {
    id: plain.id,
    program_id: plain.program_id,
    period_id: plain.period_id,
    import_batch_id: plain.import_batch_id,
    sha256: plain.sha256,
    original_name: plain.original_name,
    size_bytes: plain.size_bytes,
    pages: plain.pages,
    part_label: plain.part_label,
    years_covered: plain.years_covered ? String(plain.years_covered).split(',').map(Number) : [],
    program_name: plain.program_name,
    cmo: plain.cmo,
    effectivity: plain.effectivity,
    revision: plain.revision,
    status: plain.status,
    uploaded_by_account_id: plain.uploaded_by_account_id,
    uploaded_by_name: plain.uploaded_by_account_id ? (names.get(plain.uploaded_by_account_id) || null) : null,
    created_at: plain.createdAt || plain.created_at,
    url: '/api/curriculum-documents/' + plain.id + '/file',
  };
}

const byYearThenId = (a, b) => {
  const ya = Number(String(a.years_covered || '9').split(',')[0]);
  const yb = Number(String(b.years_covered || '9').split(',')[0]);
  return ya - yb || a.id - b.id;
};

/** { active: [...], previous: [...] } for a program, newest first (active parts in year order). */
export async function listForProgram(programId) {
  const ids = await programIdsLike(programId);
  if (!ids.length) return { active: [], previous: [] };
  const rows = await CurriculumDocument.findAll({
    where: { program_id: { [Op.in]: ids }, status: { [Op.in]: ['active', 'superseded'] } },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });
  const accountIds = [...new Set(rows.map((r) => r.uploaded_by_account_id).filter(Boolean))];
  const names = new Map(accountIds.length
    ? (await UserAccount.findAll({ where: { id: accountIds }, attributes: ['id', 'display_name'], raw: true })).map((a) => [a.id, a.display_name])
    : []);
  const active = rows.filter((r) => r.status === 'active').sort(byYearThenId).map((r) => presentDocument(r, names));
  const previous = rows.filter((r) => r.status === 'superseded').map((r) => presentDocument(r, names));
  return { active, previous };
}

/**
 * The active Program of Study file a course came from, for its "Source:" line:
 * a file of one of the course's programs that lists its code. null for a course
 * added by hand or by spreadsheet that no kept PDF lists.
 */
export async function sourceForCourse(course, programIds) {
  if (!course || !course.course_no) return null;
  const ids = [...new Set((await Promise.all((programIds || []).map(programIdsLike))).flat())];
  if (!ids.length) return null;
  const code = String(course.course_no).trim().toUpperCase();
  const rows = await CurriculumDocument.findAll({
    where: { program_id: { [Op.in]: ids }, status: 'active' },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });
  const hit = rows.find((r) => String(r.course_codes || '').split(',').includes(code));
  if (!hit) return null;
  return { ...presentDocument(hit), page: 1 };
}

/** Empty the storage folder, keeping .gitkeep. Returns the names removed. */
export async function emptyStorage(dir = storageDir()) {
  let entries;
  try { entries = await fs.readdir(dir); } catch (err) { if (err.code === 'ENOENT') return []; throw err; }
  const removed = [];
  for (const name of entries) {
    if (name === '.gitkeep') continue;
    await fs.rm(path.join(dir, name), { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}
