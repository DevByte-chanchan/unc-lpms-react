'use strict';

const db = require('../models');

async function resolveOfferingFromRequest(req) {
  const pcId = req.params.pcId || req.params.offeringId || req.body?.pcId || req.body?.pc_offering_id || req.query?.pcId || req.query?.pcOfferingId;
  if (pcId) {
    return db.ProgramCourseOffering.findByPk(pcId, {
      include: [
        { model: db.Course, as: 'course' },
        { model: db.Program, as: 'program' },
        { model: db.Department, as: 'department' },
      ],
    });
  }
  return null;
}

async function requireOfferingAccess(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const offering = await resolveOfferingFromRequest(req);
    if (!offering) return next(); // Let downstream controller return 404 if needed
    req.offering = offering;

    const role = user.role;
    if (role === 'vpaa' || role === 'director-of-libraries' || role === 'dean' || role === 'program-head') {
      return next();
    }

    if (role === 'industry-consultant') {
      if (!offering.approved_at) {
        return res.status(403).json({ error: 'Industry Consultants can only view Dean-approved learning plans.' });
      }
      return next();
    }

    if (role === 'instructor') {
      // Instructor can view their assigned offerings OR historical offerings of a course they are assigned to
      const assigned = await db.CourseOfferingAssignment.findOne({
        where: {
          pc_offering_id: offering.pc_offering_id,
          stakeholder_id: user.id,
        },
      });
      if (assigned) return next();
      // Allow viewing prior approved baseline of same course
      const assignedSameCourse = await db.CourseOfferingAssignment.findOne({
        where: { stakeholder_id: user.id },
        include: [{
          model: db.ProgramCourseOffering,
          as: 'offering',
          where: { course_id: offering.course_id },
          required: true,
        }],
      });
      if (assignedSameCourse) return next();
      return res.status(403).json({ error: 'You are not assigned to this course offering.' });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  resolveOfferingFromRequest,
  requireOfferingAccess,
};
