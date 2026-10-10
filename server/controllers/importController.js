/**
 * Import batches — the record of every upload and manual add: what was
 * changed, from which file, when, and with what result. Invitations point at
 * the batch that gave the access (account_invitations.import_batch_id).
 *
 * Uploads are final. There is no undo, so there is no endpoint here and no
 * before-image: the `snapshot` column is left empty (it stays in the table for
 * the older rows that have one). Preview & Confirm in the UI is the safeguard.
 *
 *   beginImportBatch(entity, periodId, filename)   before a bulk upload writes
 *   beginManualBatch(entity, periodId, subject)    before a row is added by hand
 *   completeImportBatch(batch, summary)            once the write succeeded
 */
import db from '../models/index.js';

const { ImportBatch } = db;

/**
 * Open a batch BEFORE the write. Returns it (to be completed once the write
 * succeeds) or null if recording failed — a bookkeeping problem must never take
 * the user's actual change down with it.
 */
async function beginBatch(entity, periodId, fields) {
  try {
    return await ImportBatch.create({
      entity,
      period_id: periodId,
      snapshot:  '',
      status:    'pending',
      ...fields,
    });
  } catch (err) {
    console.error('[import] could not record a batch for ' + entity + ' — the change proceeds unrecorded:', err.message);
    return null;
  }
}

/** Before a bulk upload. */
export const beginImportBatch = (entity, periodId, filename) =>
  beginBatch(entity, periodId, { action: 'upload', filename: filename || null });

/** Before a row is added by hand. `subject` is the name of the row added. */
export const beginManualBatch = (entity, periodId, subject) =>
  beginBatch(entity, periodId, { action: 'add', subject: subject ? String(subject).slice(0, 255) : null });

/**
 * Mark the batch complete with the upload's own summary. Until this runs the
 * batch stays 'pending', so a write that threw halfway is visible as such.
 */
export async function completeImportBatch(batch, summary) {
  if (!batch) return;
  try {
    await batch.update({ status: 'complete', summary: JSON.stringify(summary || {}) });
  } catch (err) {
    console.error('[import] could not finalize batch ' + batch.id + ':', err.message);
  }
}
