'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const { REFERENCE_TYPES, normalizeReferenceType } = require('../../config/referenceTypes');
const { notifyUsersByRole, createNotification } = require('../../services/notifyService');

/**
 * Unified Reference Repository & Library Management Controller
 * Serves:
 *  - M3 Director of Libraries Reference Repository (Textbooks, OER, Online Resources, Online Subscriptions)
 *  - M2 Composition Reference Picker (reads directly from this unified repository!) + Copy-on-Write updates
 *  - CourseReferences filing, CatalogSettings recency policy, and TitleRequests workflow
 */

exports.getReferenceTypes = (_req, res) => {
  return res.json({ types: REFERENCE_TYPES });
};

exports.listReferences = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.includeArchived !== 'true') where.archived = false;
    if (req.query?.type) where.type = normalizeReferenceType(req.query.type);
    if (req.query?.status) where.status = req.query.status;
    if (req.query?.course_id) where.course_id = Number(req.query.course_id);
    if (req.query?.course_no) where.course_no = String(req.query.course_no).trim();

    // Support M2 Composition weekId/iloId scoping so Composition's Reference dropdown shows references for that course!
    if (req.query?.weekId || req.query?.iloId) {
      const week = await db.Week.findByPk(Number(req.query.weekId || req.query.iloId), {
        include: [{ model: db.CourseOutcome, as: 'courseOutcome', include: [{ model: db.ProgramCourseOffering, as: 'offering' }] }],
      });
      const courseId = week?.courseOutcome?.offering?.course_id;
      if (courseId) {
        const filed = await db.CourseReference.findAll({ where: { course_id: courseId } });
        const filedRefIds = filed.map((f) => f.reference_id);
        where[Op.or] = [
          { course_id: courseId },
          ...(filedRefIds.length > 0 ? [{ reference_id: { [Op.in]: filedRefIds } }] : []),
        ];
      }
    }

    if (req.query?.search) {
      const q = `%${req.query.search}%`;
      const searchOr = [
        { title: { [Op.like]: q } },
        { author: { [Op.like]: q } },
        { isbn: { [Op.like]: q } },
        { course_no: { [Op.like]: q } },
      ];
      if (where[Op.or]) {
        where[Op.and] = [{ [Op.or]: where[Op.or] }, { [Op.or]: searchOr }];
        delete where[Op.or];
      } else {
        where[Op.or] = searchOr;
      }
    }

    const settings = await db.CatalogSetting.findByPk(1);
    const recencyYears = settings?.recency_years || 5;
    const currentYear = new Date().getFullYear();

    const rows = await db.Reference.findAll({
      where,
      order: [['reference_id', 'ASC']],
    });

    const enriched = rows.map((r) => {
      const json = r.toJSON();
      const pubYear = r.publication_year ? new Date(r.publication_year).getFullYear() : null;
      json.year = pubYear;
      json.is_deprecated = Boolean(r.type === 'Textbook' && pubYear && (currentYear - pubYear) > recencyYears);
      return json;
    });

    // Return array directly if M2 Composition expects an array (when weekId/iloId or raw=true), else include wrapper & array compatibility
    if (req.query?.weekId || req.query?.iloId || req.query?.format === 'array') {
      return res.json(enriched);
    }

    return res.json({
      references: enriched,
      total: enriched.length,
      recencyYears,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getLibraryHealth = async (_req, res, next) => {
  try {
    const settings = await db.CatalogSetting.findByPk(1);
    const recencyYears = settings?.recency_years || 5;
    const currentYear = new Date().getFullYear();
    const refs = await db.Reference.findAll({ where: { archived: false } });

    const byType = {};
    let outdatedTextbooks = 0;
    let unavailable = 0;

    for (const r of refs) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      if (r.status !== 'available') unavailable += 1;
      if (r.type === 'Textbook' && r.publication_year) {
        const yr = new Date(r.publication_year).getFullYear();
        if (currentYear - yr > recencyYears) outdatedTextbooks += 1;
      }
    }

    const pendingRequests = await db.TitleRequest.count({ where: { status: 'pending' } });

    return res.json({
      totalActive: refs.length,
      byType,
      outdatedTextbooks,
      unavailable,
      pendingRequests,
      recencyYears,
    });
  } catch (err) {
    return next(err);
  }
};

exports.createReference = async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Reference title is required.' });

    const type = normalizeReferenceType(req.body?.type || req.body?.reference_type || 'Textbook');
    let pubDate = null;
    const rawYear = req.body?.publication_year || req.body?.year;
    if (rawYear) {
      const str = String(rawYear).trim();
      pubDate = /^\d{4}$/.test(str) ? new Date(`${str}-01-01`) : new Date(str);
      if (Number.isNaN(pubDate.getTime())) pubDate = null;
    }

    let courseId = req.body?.course_id ? Number(req.body.course_id) : null;
    let courseNo = req.body?.course_no ? String(req.body.course_no).trim() : null;
    if (!courseId && courseNo) {
      const c = await db.Course.findOne({ where: { course_no: courseNo } });
      if (c) courseId = c.course_id;
    } else if (courseId && !courseNo) {
      const c = await db.Course.findByPk(courseId);
      if (c) courseNo = c.course_no;
    }

    const created = await db.sequelize.transaction(async (t) => {
      const ref = await db.Reference.create({
        course_id: courseId,
        course_no: courseNo,
        title,
        type,
        author: req.body?.author || req.body?.authors || null,
        isbn: req.body?.isbn || null,
        link: req.body?.link || req.body?.url || null,
        publisher: req.body?.publisher || null,
        publication_year: pubDate,
        copies: req.body?.copies != null ? Number(req.body.copies) : null,
        status: req.body?.status || 'available',
        category: req.body?.category || null,
        date_received: req.body?.date_received || null,
        archived: false,
        created_by: req.user?.user_id || null,
      }, { transaction: t });

      if (courseId) {
        await db.CourseReference.findOrCreate({
          where: { course_id: courseId, reference_id: ref.reference_id },
          defaults: { added_by: req.user?.user_id || null },
          transaction: t,
        });
      }
      return ref;
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.updateReference = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ref = await db.Reference.findByPk(id);
    if (!ref) return res.status(404).json({ error: 'Reference not found.' });

    const updates = {};
    if (req.body?.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body?.type !== undefined) updates.type = normalizeReferenceType(req.body.type);
    if (req.body?.author !== undefined || req.body?.authors !== undefined) updates.author = req.body.author ?? req.body.authors;
    if (req.body?.isbn !== undefined) updates.isbn = req.body.isbn;
    if (req.body?.link !== undefined || req.body?.url !== undefined) updates.link = req.body.link ?? req.body.url;
    if (req.body?.publisher !== undefined) updates.publisher = req.body.publisher;
    if (req.body?.copies !== undefined) updates.copies = req.body.copies != null ? Number(req.body.copies) : null;
    if (req.body?.status !== undefined) updates.status = req.body.status;
    if (req.body?.category !== undefined) updates.category = req.body.category;
    if (req.body?.archived !== undefined) updates.archived = Boolean(req.body.archived);
    if (req.body?.course_id !== undefined) updates.course_id = req.body.course_id ? Number(req.body.course_id) : null;
    if (req.body?.course_no !== undefined) updates.course_no = req.body.course_no;

    const rawYear = req.body?.publication_year ?? req.body?.year;
    if (rawYear !== undefined) {
      if (!rawYear) updates.publication_year = null;
      else {
        const str = String(rawYear).trim();
        const d = /^\d{4}$/.test(str) ? new Date(`${str}-01-01`) : new Date(str);
        updates.publication_year = Number.isNaN(d.getTime()) ? null : d;
      }
    }

    await ref.update(updates);
    return res.json(ref);
  } catch (err) {
    return next(err);
  }
};

exports.archiveReference = async (req, res, next) => {
  try {
    const ref = await db.Reference.findByPk(Number(req.params.id));
    if (!ref) return res.status(404).json({ error: 'Reference not found.' });
    const nextArchived = typeof req.body?.archived === 'boolean' ? req.body.archived : !ref.archived;
    await ref.update({ archived: nextArchived });
    return res.json(ref);
  } catch (err) {
    return next(err);
  }
};

exports.deleteReference = async (req, res, next) => {
  try {
    const ref = await db.Reference.findByPk(Number(req.params.id));
    if (!ref) return res.status(404).json({ error: 'Reference not found.' });
    await ref.update({ archived: true });
    return res.json({ ok: true, id: ref.reference_id, archived: true });
  } catch (err) {
    return next(err);
  }
};

// CourseReferences filing
exports.listCourseReferences = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.course_id) where.course_id = Number(req.query.course_id);
    const rows = await db.CourseReference.findAll({
      where,
      include: [
        { model: db.Course, as: 'course', attributes: ['course_id', 'course_no', 'course_title'] },
        { model: db.Reference, as: 'reference' },
      ],
      order: [['id', 'ASC']],
    });
    return res.json({ courseReferences: rows });
  } catch (err) {
    return next(err);
  }
};

exports.fileCourseReference = async (req, res, next) => {
  try {
    const course_id = Number(req.body?.course_id);
    const reference_id = Number(req.body?.reference_id);
    if (!course_id || !reference_id) return res.status(400).json({ error: 'course_id and reference_id are required.' });
    const [row] = await db.CourseReference.findOrCreate({
      where: { course_id, reference_id },
      defaults: { added_by: req.user?.user_id || null },
    });
    return res.status(201).json(row);
  } catch (err) {
    return next(err);
  }
};

// CatalogSettings
exports.getCatalogSettings = async (_req, res, next) => {
  try {
    const [row] = await db.CatalogSetting.findOrCreate({
      where: { id: 1 },
      defaults: { recency_years: 5, enforce_recency: true, require_availability: true },
    });
    return res.json(row);
  } catch (err) {
    return next(err);
  }
};

exports.updateCatalogSettings = async (req, res, next) => {
  try {
    const [row] = await db.CatalogSetting.findOrCreate({
      where: { id: 1 },
      defaults: { recency_years: 5, enforce_recency: true, require_availability: true },
    });
    await row.update({
      recency_years: req.body?.recency_years != null ? Number(req.body.recency_years) : row.recency_years,
      enforce_recency: typeof req.body?.enforce_recency === 'boolean' ? req.body.enforce_recency : row.enforce_recency,
      require_availability: typeof req.body?.require_availability === 'boolean' ? req.body.require_availability : row.require_availability,
      updated_by_name: req.user?.name || 'Director of Libraries',
    });
    return res.json(row);
  } catch (err) {
    return next(err);
  }
};

// TitleRequests
exports.listTitleRequests = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.status) where.status = req.query.status;
    if (req.user?.activeRole === 'Instructor') where.requested_by = req.user.user_id;
    const rows = await db.TitleRequest.findAll({
      where,
      include: [
        { model: db.User, as: 'requester', attributes: ['user_id', 'name', 'email'] },
        { model: db.Reference, as: 'fulfilledReference', required: false },
      ],
      order: [['request_id', 'DESC']],
    });
    return res.json({ requests: rows });
  } catch (err) {
    return next(err);
  }
};

exports.createTitleRequest = async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Requested title is required.' });
    const created = await db.TitleRequest.create({
      title,
      authors: req.body?.authors || null,
      note: req.body?.note || null,
      pc_offering_id: req.body?.pc_offering_id ? Number(req.body.pc_offering_id) : null,
      requested_by: req.user.user_id,
      status: 'pending',
    });
    await notifyUsersByRole('Director of Libraries', {
      type: 'title_request',
      title: `New Reference Title Request`,
      message: `${req.user.name} requested "${title}" for the Reference Repository.`,
      link: '/submissions/references',
      actorRole: req.user.workflowRole,
      sentByAccountId: req.user.user_id,
    });
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.decideTitleRequest = async (req, res, next) => {
  try {
    const row = await db.TitleRequest.findByPk(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Title request not found.' });
    const status = String(req.body?.status || 'added').toLowerCase();
    if (!['added', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Status must be added or declined.' });
    }
    await row.update({
      status,
      reason: req.body?.reason || null,
      reference_id: req.body?.reference_id ? Number(req.body.reference_id) : null,
      decided_by: req.user.user_id,
      decided_at: new Date(),
    });
    await createNotification({
      recipientUserId: row.requested_by,
      type: 'title_request',
      title: `Title Request ${status === 'added' ? 'Approved' : 'Declined'}`,
      message: `Director of Libraries ${req.user.name} ${status} your title request: "${row.title}".`,
      link: '/submissions/references',
      actorRole: 'LIBRARY_DIRECTOR',
      sentByAccountId: req.user.user_id,
    });
    return res.json(row);
  } catch (err) {
    return next(err);
  }
};
