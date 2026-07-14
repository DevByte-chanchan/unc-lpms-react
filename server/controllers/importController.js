/**
 * Import batches — the "Undo" behind every upload button.
 *
 * Two endpoints:
 *   GET  /api/imports/latest?entity=&period_id=   what (if anything) is undoable
 *   POST /api/imports/:id/undo                    restore that batch
 *
 * The 30-second window is enforced HERE, not just in the UI. The undo toast
 * retires itself when the clock runs out, but a stale tab or a direct API call
 * gets a 410 all the same. UNDO_WINDOW_MS (utils/importUndo.js) is the only
 * definition of that deadline — `ms_remaining` below is what the toast counts
 * down from, so the two can never disagree.
 */
import db from '../models/index.js';
import { enforceActiveTerm } from '../utils/latestPeriod.js';
import {
  captureSnapshot, restoreSnapshot, isKnownEntity, isExpired, msRemaining,
  LABELS, UNDO_WINDOW_MS, primaryTable,
} from '../utils/importUndo.js';

const { ImportBatch } = db;

const parseJson = (value, fallback) => {
  try { return JSON.parse(value); } catch (_err) { return fallback; }
};

/** Shape a batch for the client — never ship the snapshot blob itself. */
const present = (batch) => ({
  id:                batch.id,
  entity:            batch.entity,
  action:            batch.action,
  subject:           batch.subject,
  period_id:         batch.period_id,
  filename:          batch.filename,
  label:             LABELS[batch.entity] || batch.entity,
  summary:           parseJson(batch.summary, null),
  created_at:        batch.createdAt,
  expires_at:        new Date(new Date(batch.createdAt).getTime() + UNDO_WINDOW_MS),
  ms_remaining:      msRemaining(batch),
  undoable:          !isExpired(batch),
});

/**
 * Photograph the tables a change is about to touch.
 *
 * Called BEFORE the write. Returns the batch (to be completed once the write
 * succeeds) or null if snapshotting failed — a snapshot problem must never take
 * the user's actual change down with it, it just means this one change won't be
 * undoable.
 */
async function beginBatch(entity, periodId, fields) {
  try {
    const snapshot = await captureSnapshot(entity, periodId);
    return await ImportBatch.create({
      entity,
      period_id: periodId,
      snapshot:  JSON.stringify(snapshot),
      status:    'pending',
      ...fields,
    });
  } catch (err) {
    console.error('[import] snapshot failed for ' + entity + ' — change proceeds WITHOUT undo:', err.message);
    return null;
  }
}

/** Before a bulk upload. */
export const beginImportBatch = (entity, periodId, filename) =>
  beginBatch(entity, periodId, { action: 'upload', filename: filename || null });

/** Before a row is added by hand. `subject` is what the prompt offers to remove. */
export const beginManualBatch = (entity, periodId, subject) =>
  beginBatch(entity, periodId, { action: 'add', subject: subject ? String(subject).slice(0, 255) : null });

/**
 * Mark the batch undoable. Until this runs the batch stays 'pending' and is
 * never offered — so a write that threw halfway leaves no misleading Undo.
 *
 * Batches are NOT superseded: each one is a full point-in-time image, so
 * undoing the newest re-exposes the one before it and Undo walks backwards a
 * step at a time (upload → manual add → Undo → Undo). Each step is still bound
 * by its own 30-second window, so in practice only the change you just made is
 * still inside it.
 */
export async function completeImportBatch(batch, summary) {
  if (!batch) return;
  try {
    await batch.update({ status: 'complete', summary: JSON.stringify(summary || {}) });
  } catch (err) {
    console.error('[import] could not finalize batch ' + batch.id + ':', err.message);
  }
}

/** GET /api/imports/latest?entity=faculty&period_id=5 */
export async function getLatestBatch(req, res, next) {
  try {
    const entity   = String(req.query.entity || '');
    const periodId = Number(req.query.period_id);

    if (!isKnownEntity(entity)) return res.status(400).json({ message: 'Unknown entity: ' + entity });
    if (!periodId)              return res.status(400).json({ message: 'period_id is required.' });

    const batch = await ImportBatch.findOne({
      where: { entity, period_id: periodId, status: 'complete' },
      // Tie-break on id. createdAt is a DATETIME (second precision), so two
      // changes made in the same second — an upload right after a manual add,
      // say — compare equal, and the tie broke arbitrarily: Undo could pick the
      // OLDER batch and roll back further than the user asked.
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    });

    // Expired batches report as "nothing to undo" rather than as a dead
    // button, and we never hand back the snapshot payload.
    if (!batch || isExpired(batch)) return res.json({ batch: null });
    return res.json({ batch: present(batch) });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/imports/:id/undo */
export async function undoBatch(req, res, next) {
  try {
    const batch = await ImportBatch.findByPk(req.params.id);
    if (!batch) return res.status(404).json({ message: 'That upload is no longer on record.' });

    if (batch.status === 'undone') {
      return res.status(409).json({ message: 'This upload has already been undone.' });
    }
    if (batch.status !== 'complete') {
      return res.status(409).json({ message: 'That upload is not undoable.' });
    }
    if (isExpired(batch)) {
      return res.status(410).json({
        message: 'The 30-second window for undoing this upload has passed.',
      });
    }
    // Same rule the uploads follow: no writes into a closed term.
    if (!(await enforceActiveTerm(res, batch.period_id))) return undefined;

    const snapshot = parseJson(batch.snapshot, null);
    if (!snapshot) return res.status(500).json({ message: 'The saved snapshot for this upload is unreadable.' });

    const { restored, removed } = await restoreSnapshot(batch.entity, batch.period_id, snapshot);
    await batch.update({ status: 'undone', undone_at: new Date() });

    // WHAT THE UNDO ACTUALLY DID, in rows of the table the user is looking at.
    //
    // Undo is a point-in-time restore, so "it worked" and "the list looks
    // different" are not the same claim. Import the same file twice and undo the
    // second one: 11 rows out, 11 rows back, screen unchanged — correct, and
    // indistinguishable from a no-op unless we say so. These counts are what the
    // UI reports, so a working undo can never again look like a broken one.
    const table = primaryTable(batch.entity);
    const summary = {
      removed:  table ? (removed[table] || 0) : 0,
      restored: table ? (restored[table] || 0) : 0,
    };

    // Each batch is a full image, so undoing this one re-exposes the one before
    // it — that is how a double import unwinds, one step per click. Hand the
    // client the next step if it exists and is still inside its own window, so it
    // can say "there is more to undo" instead of leaving the user to guess.
    const previous = await ImportBatch.findOne({
      where: { entity: batch.entity, period_id: batch.period_id, status: 'complete' },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    });

    return res.json({
      undone:   true,
      entity:   batch.entity,
      label:    LABELS[batch.entity] || batch.entity,
      filename: batch.filename,
      summary,
      restored,
      removed,
      previous: (previous && !isExpired(previous)) ? present(previous) : null,
    });
  } catch (err) {
    return next(err);
  }
}
