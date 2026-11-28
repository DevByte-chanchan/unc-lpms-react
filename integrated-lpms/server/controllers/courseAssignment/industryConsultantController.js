'use strict';

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const db = require('../../models');
const { normalizeEmail, normalizeRoleList } = require('../../utils/roles');

exports.listConsultants = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.status) where.status = req.query.status;
    if (req.query?.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const rows = await db.IndustryConsultant.findAll({
      where,
      include: [
        {
          model: db.ConsultantCourse,
          as: 'consultantCourses',
          include: [{ model: db.Course, as: 'course', attributes: ['course_id', 'course_no', 'course_title'], required: false }],
          required: false,
        },
      ],
      order: [['industry_consultant_id', 'ASC']],
    });
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

exports.createConsultant = async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Consultant name is required.' });
    const email = req.body?.email ? normalizeEmail(req.body.email) : null;
    const activePeriod = await db.AcademicPeriod.findOne({ where: { is_active: true } });

    const created = await db.sequelize.transaction(async (t) => {
      let userId = req.body?.user_id ? Number(req.body.user_id) : null;
      if (!userId && email) {
        let user = await db.User.findOne({ where: { email }, transaction: t });
        if (!user) {
          const hash = await bcrypt.hash('Consultant@2026', 10);
          user = await db.User.create({
            name,
            email,
            password_hash: hash,
            role: 'Industry Consultant',
            roles: ['Industry Consultant'],
            active_role: 'Industry Consultant',
            status: 'Active',
            is_active: true,
          }, { transaction: t });
        } else {
          const roles = normalizeRoleList([...(user.roles || [user.role]), 'Industry Consultant']);
          await user.update({ roles }, { transaction: t });
        }
        userId = user.user_id;
      }

      const consultant = await db.IndustryConsultant.create({
        name,
        email,
        user_id: userId,
        assigned_course_code: req.body?.assigned_course_code || null,
        assigned_course_id: req.body?.assigned_course_id || null,
        status: req.body?.status || 'Active',
        academic_period_id: req.body?.academic_period_id || activePeriod?.academic_period_id || null,
      }, { transaction: t });

      if (userId) {
        await db.User.update({ industry_consultant_id: consultant.industry_consultant_id }, { where: { user_id: userId }, transaction: t });
      }

      // Bridge into ConsultantCourse + M3 CourseConsultant if a course was supplied
      if (req.body?.assigned_course_id) {
        const c = await db.Course.findByPk(Number(req.body.assigned_course_id), { transaction: t });
        if (c) {
          await db.ConsultantCourse.create({
            industry_consultant_id: consultant.industry_consultant_id,
            course_id: c.course_id,
            course_code: c.course_no,
          }, { transaction: t });

          if (userId) {
            await db.CourseConsultant.create({
              course_id: c.course_id,
              consultant_user_id: userId,
              assigned_by_user_id: req.user?.user_id || null,
              is_active: true,
            }, { transaction: t });
          }
        }
      }

      return consultant;
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.assignCourse = async (req, res, next) => {
  try {
    const consultantId = Number(req.params.id);
    const courseId = Number(req.body?.course_id);
    const consultant = await db.IndustryConsultant.findByPk(consultantId);
    const course = await db.Course.findByPk(courseId);
    if (!consultant || !course) return res.status(404).json({ error: 'Consultant or Course not found.' });

    await db.ConsultantCourse.findOrCreate({
      where: { industry_consultant_id: consultant.industry_consultant_id, course_id: course.course_id },
      defaults: { course_code: course.course_no },
    });

    if (consultant.user_id) {
      await db.CourseConsultant.findOrCreate({
        where: { course_id: course.course_id, consultant_user_id: consultant.user_id, is_active: true },
        defaults: { assigned_by_user_id: req.user?.user_id || null, is_active: true },
      });
    }

    await consultant.update({ assigned_course_id: course.course_id, assigned_course_code: course.course_no });
    return res.json({ ok: true, consultant, course });
  } catch (err) {
    return next(err);
  }
};

exports.updateConsultant = async (req, res, next) => {
  try {
    const row = await db.IndustryConsultant.findByPk(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Industry consultant not found.' });
    const updates = {};
    for (const f of ['name', 'email', 'status', 'assigned_course_code', 'assigned_course_id']) {
      if (req.body?.[f] !== undefined) updates[f] = req.body[f];
    }
    if (updates.email) updates.email = normalizeEmail(updates.email);
    await row.update(updates);
    return res.json(row);
  } catch (err) {
    return next(err);
  }
};

exports.deleteConsultant = async (req, res, next) => {
  try {
    const row = await db.IndustryConsultant.findByPk(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Industry consultant not found.' });
    await row.destroy();
    return res.json({ ok: true, id: row.industry_consultant_id });
  } catch (err) {
    return next(err);
  }
};

exports.getMyAssignedCourses = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const links = await db.CourseConsultant.findAll({
      where: { consultant_user_id: userId, is_active: true },
      include: [{ model: db.Course, as: 'course' }],
    });
    const courseIds = links.map((l) => l.course_id);
    const offerings = courseIds.length > 0
      ? await db.ProgramCourseOffering.findAll({
          where: { course_id: { [Op.in]: courseIds } },
          include: [
            { model: db.Course, as: 'course' },
            { model: db.Program, as: 'program' },
            { model: db.Department, as: 'department' },
          ],
          order: [['pc_offering_id', 'DESC']],
        })
      : [];
    return res.json({ courses: links.map((l) => l.course).filter(Boolean), offerings });
  } catch (err) {
    return next(err);
  }
};
