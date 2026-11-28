'use strict';

const db = require('../../models');
const {
  resolveCourseReferencesTocs,
  saveManualReferenceToc,
  formatReferenceWithToc,
} = require('../../services/referenceTocService');

/**
 * POST /api/references/resolve-tocs
 * Resolves and caches Table of Contents (TOC) metadata for all active references of a course
 * (or specific referenceIds) via the multi-stage anti-hallucination waterfall.
 */
exports.resolveCourseTocs = async (req, res, next) => {
  try {
    const {
      weekId,
      iloId,
      courseId,
      pcOfferingId,
      courseNo,
      courseCode,
      referenceIds,
      forceRefresh = false,
    } = req.body || {};

    const result = await resolveCourseReferencesTocs({
      weekId: weekId || iloId || null,
      courseId: courseId || null,
      pcOfferingId: pcOfferingId || null,
      courseNo: courseNo || courseCode || null,
      referenceIds: Array.isArray(referenceIds) ? referenceIds : null,
      forceRefresh: Boolean(forceRefresh),
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/references/:id/toc
 * Saves a manually pasted Table of Contents into `reference_toc_cache` (`toc_status = 'manual'`).
 */
exports.saveManualToc = async (req, res, next) => {
  try {
    const referenceId = Number(req.params.id);
    if (!referenceId) {
      return res.status(400).json({ error: 'Valid reference ID is required.' });
    }

    const { rawText, toc_entries, tocText } = req.body || {};
    const updated = await saveManualReferenceToc(referenceId, {
      rawText: rawText ?? tocText ?? '',
      toc_entries,
    });

    return res.json({
      message: 'Manual Table of Contents saved successfully.',
      reference: updated,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * GET /api/references/:id/toc
 * Retrieves the cached TOC status and entries for a single reference.
 */
exports.getReferenceToc = async (req, res, next) => {
  try {
    const referenceId = Number(req.params.id);
    if (!referenceId) {
      return res.status(400).json({ error: 'Valid reference ID is required.' });
    }

    const ref = await db.Reference.findByPk(referenceId, {
      include: [{ model: db.ReferenceTocCache, as: 'tocCache', required: false }],
    });
    if (!ref) {
      return res.status(404).json({ error: 'Reference not found.' });
    }

    return res.json(formatReferenceWithToc(ref, ref.tocCache));
  } catch (err) {
    return next(err);
  }
};
