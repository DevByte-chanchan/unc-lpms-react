/**
 * Archive controller — per-module, period-scoped view of archived records.
 *
 * Scoped by `?module=<moduleType>&period_id=<id>`. Returns only rows in
 * that module whose status is in the archive set AND whose period_id
 * matches the active dashboard term. Records from other periods stay
 * hidden until the user switches periods in the main dashboard.
 *
 * Exception: `academic_terms` is the period itself (not period-scoped),
 * so the `period_id` filter is ignored for that module.
 *
 * To restore a record, the user changes its status back from the archive
 * row's Edit Status dropdown; there is no dedicated un-archive endpoint.
 */
import { Op } from 'sequelize';
import db from '../models/index.js';

const { Department, Faculty, Program, IndustryConsultant, CourseOfferingAssignment, AcademicPeriod } = db;

const periodInclude = {
  model: db.AcademicPeriod,
  as: 'period',
  attributes: ['id', 'label', 'school_year', 'semester'],
};

// moduleType slug → { Model, archive-trigger statuses, default ordering,
// whether the model itself is the AcademicPeriod (no period FK to include) }.
// Keep the slugs and statuses in sync with src/services/statusPolicy.js.
const MODULES = {
  departments:        { model: Department,         statuses: ['Unlisted', 'Archived'],   order: [['name', 'ASC']] },
  faculty:            { model: Faculty,            statuses: ['Emeritus', 'Inactive'],   order: [['name', 'ASC']] },
  programs:           { model: Program,            statuses: ['Unlisted'],               order: [['code', 'ASC']] },
  consultants:        { model: IndustryConsultant, statuses: ['Unavailable', 'Offboarded'], order: [['name', 'ASC']] },
  course_offering_assignments: { model: CourseOfferingAssignment,   statuses: ['Archived'],               order: [['course_code', 'ASC']] },
  academic_terms:     { model: AcademicPeriod,     statuses: ['Closed'],                 order: [['school_year', 'DESC']], selfPeriod: true },
};

export async function getArchive(req, res, next) {
  try {
    const moduleType = String(req.query.module || '').trim();
    const cfg = MODULES[moduleType];
    if (!cfg) {
      return res.status(400).json({ error: 'unknown module', allowed: Object.keys(MODULES) });
    }
    const where = { status: { [Op.in]: cfg.statuses } };
    // Period scoping — every model except AcademicPeriod is scoped to a
    // period. The archive now strictly respects the dashboard's current
    // term: omit period_id and the archive returns nothing rather than
    // accidentally leaking cross-period history.
    if (!cfg.selfPeriod) {
      const periodId = Number(req.query.period_id);
      if (!periodId) {
        return res.json({ rows: [] });
      }
      where.period_id = periodId;
    }
    const rows = await cfg.model.findAll({
      where,
      include: cfg.selfPeriod ? [] : [periodInclude],
      order: cfg.order,
    });
    res.json({ rows });
  } catch (err) { next(err); }
}
