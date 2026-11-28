'use strict';

const db = require('../../models');

/**
 * M1 Supporting Endpoints:
 * - University Statements (VMGO, Core Values, Graduate Attributes)
 * - Department Statements (Vision/Mission â€” dynamically resolves signed-in Dean's department!)
 * - Archive, Import Batches, Curriculum Documents, School Calendars
 */

exports.getUniversityStatements = async (_req, res, next) => {
  try {
    const active = await db.UniversityStatement.findOne({
      where: { status: 'Active' },
      order: [['university_statement_id', 'DESC']],
    });
    const history = await db.UniversityStatement.findAll({
      order: [['university_statement_id', 'DESC']],
      limit: 20,
    });
    return res.json({ active: active || history[0] || null, history });
  } catch (err) {
    return next(err);
  }
};

exports.saveUniversityStatement = async (req, res, next) => {
  try {
    const { vision, mission, educational_policy, core_values, graduate_attributes } = req.body || {};
    if (!vision || !mission) {
      return res.status(400).json({ error: 'University vision and mission are required.' });
    }
    const created = await db.sequelize.transaction(async (t) => {
      await db.UniversityStatement.update({ status: 'Archived' }, { where: { status: 'Active' }, transaction: t });
      return db.UniversityStatement.create({
        vision: String(vision).trim(),
        mission: String(mission).trim(),
        educational_policy: educational_policy ? String(educational_policy).trim() : null,
        core_values: Array.isArray(core_values) ? core_values : [],
        graduate_attributes: Array.isArray(graduate_attributes) ? graduate_attributes : [],
        status: 'Active',
        uploaded_by: req.user?.name || 'VPAA',
      }, { transaction: t });
    });
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.getDepartmentStatements = async (req, res, next) => {
  try {
    const deptCode = String(req.query?.department_code || req.query?.code || req.user?.departmentCode || 'SCIS').trim().toUpperCase();
    const active = await db.DepartmentStatement.findOne({
      where: { department_code: deptCode, status: 'Active' },
      order: [['department_statement_id', 'DESC']],
    });
    const history = await db.DepartmentStatement.findAll({
      where: { department_code: deptCode },
      order: [['department_statement_id', 'DESC']],
      limit: 20,
    });
    const allDepartments = await db.Department.findAll({ order: [['dept_id', 'ASC']] });
    return res.json({ departmentCode: deptCode, active: active || history[0] || null, history, departments: allDepartments });
  } catch (err) {
    return next(err);
  }
};

exports.saveDepartmentStatement = async (req, res, next) => {
  try {
    const department_code = String(req.body?.department_code || req.user?.departmentCode || 'SCIS').trim().toUpperCase();
    let department_name = req.body?.department_name || req.user?.departmentName || '';
    if (!department_name) {
      const dept = await db.Department.findOne({ where: { code: department_code } });
      department_name = dept?.name || department_code;
    }
    const { vision, mission } = req.body || {};
    if (!vision || !mission) {
      return res.status(400).json({ error: 'Department vision and mission are required.' });
    }

    const created = await db.sequelize.transaction(async (t) => {
      await db.DepartmentStatement.update(
        { status: 'Archived' },
        { where: { department_code, status: 'Active' }, transaction: t }
      );
      return db.DepartmentStatement.create({
        department_code,
        department_name,
        vision: String(vision).trim(),
        mission: String(mission).trim(),
        status: 'Active',
        uploaded_by: req.user?.name || 'Dean',
      }, { transaction: t });
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.getArchive = async (req, res, next) => {
  try {
    const periodId = req.query?.academic_period_id ? Number(req.query.academic_period_id) : null;
    const where = periodId ? { academic_period_id: periodId } : {};
    const [periods, offerings, assignments] = await Promise.all([
      db.AcademicPeriod.findAll({ order: [['sort_order', 'DESC']] }),
      db.ProgramCourseOffering.findAll({
        where,
        include: [
          { model: db.Course, as: 'course' },
          { model: db.Program, as: 'program' },
        ],
        order: [['pc_offering_id', 'DESC']],
      }),
      db.CourseOfferingAssignment.findAll({ where, order: [['co_assign_id', 'DESC']] }),
    ]);
    return res.json({ periods, offerings, assignments });
  } catch (err) {
    return next(err);
  }
};

exports.listImports = async (_req, res, next) => {
  try {
    const rows = await db.ImportBatch.findAll({ order: [['import_batch_id', 'DESC']], limit: 50 });
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

exports.listCurriculumDocuments = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.program_id) where.program_id = Number(req.query.program_id);
    const rows = await db.CurriculumDocument.findAll({ where, order: [['curriculum_document_id', 'DESC']] });
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

exports.listSchoolCalendars = async (_req, res, next) => {
  try {
    const rows = await db.SchoolCalendar.findAll({ order: [['school_calendar_id', 'DESC']] });
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};
