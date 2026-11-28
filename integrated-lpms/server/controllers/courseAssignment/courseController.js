'use strict';

const { Op } = require('sequelize');
const db = require('../../models');

exports.listCourses = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.archived !== 'true') where.archived = false;
    if (req.query?.year_lvl) where.year_lvl = req.query.year_lvl;
    if (req.query?.semester) where.semester = Number(req.query.semester);
    if (req.query?.search) {
      where[Op.or] = [
        { course_no: { [Op.like]: `%${req.query.search}%` } },
        { course_title: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const courses = await db.Course.findAll({
      where,
      include: [
        {
          model: db.Prerequisite,
          as: 'prerequisites',
          include: [{ model: db.Course, as: 'prerequisiteCourse', attributes: ['course_id', 'course_no', 'course_title'] }],
          required: false,
        },
      ],
      order: [['course_id', 'ASC']],
    });
    return res.json(courses);
  } catch (err) {
    return next(err);
  }
};

exports.getPrereqOptions = async (_req, res, next) => {
  try {
    const courses = await db.Course.findAll({
      where: { archived: false },
      attributes: ['course_id', 'course_no', 'course_title', 'year_lvl'],
      order: [['course_no', 'ASC']],
    });
    return res.json(courses);
  } catch (err) {
    return next(err);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const course_no = String(req.body?.course_no || req.body?.code || '').trim().toUpperCase();
    const course_title = String(req.body?.course_title || req.body?.title || '').trim();
    if (!course_no || !course_title) {
      return res.status(400).json({ error: 'course_no and course_title are required.' });
    }

    const activePeriod = await db.AcademicPeriod.findOne({ where: { is_active: true } });

    const created = await db.sequelize.transaction(async (t) => {
      const course = await db.Course.create({
        course_no,
        course_title,
        credit: req.body?.credit || '3 LEC, 0 LAB',
        contact_hrs: req.body?.contact_hrs || '3 Hrs Lec, 0 Hrs Lab',
        classification: req.body?.classification || 'Professional Courses',
        cmo: req.body?.cmo || null,
        year_lvl: req.body?.year_lvl || 'THIRD YEAR',
        prerequisites_text: req.body?.prerequisites_text || req.body?.prerequisites || null,
        term: req.body?.term || activePeriod?.label || '1st Semester SY 2026-2027',
        semester: Number(req.body?.semester || 1),
        archived: false,
        academic_period_id: req.body?.academic_period_id || activePeriod?.academic_period_id || null,
      }, { transaction: t });

      if (Array.isArray(req.body?.prerequisite_course_ids) && req.body.prerequisite_course_ids.length > 0) {
        await db.Prerequisite.bulkCreate(
          req.body.prerequisite_course_ids.map((pid) => ({
            course_id: course.course_id,
            prerequisite_course_id: Number(pid),
          })),
          { transaction: t, ignoreDuplicates: true }
        );
      }
      return course;
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const course = await db.Course.findByPk(Number(req.params.id));
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const fields = ['course_no', 'course_title', 'credit', 'contact_hrs', 'classification', 'cmo', 'year_lvl', 'prerequisites_text', 'term', 'semester', 'archived'];
    const updates = {};
    for (const f of fields) {
      if (req.body?.[f] !== undefined) updates[f] = req.body[f];
    }
    await course.update(updates);

    if (Array.isArray(req.body?.prerequisite_course_ids)) {
      await db.Prerequisite.destroy({ where: { course_id: course.course_id } });
      if (req.body.prerequisite_course_ids.length > 0) {
        await db.Prerequisite.bulkCreate(
          req.body.prerequisite_course_ids.map((pid) => ({
            course_id: course.course_id,
            prerequisite_course_id: Number(pid),
          })),
          { ignoreDuplicates: true }
        );
      }
    }

    return res.json(course);
  } catch (err) {
    return next(err);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await db.Course.findByPk(Number(req.params.id));
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    await course.update({ archived: true });
    return res.json({ ok: true, id: course.course_id, archived: true });
  } catch (err) {
    return next(err);
  }
};
