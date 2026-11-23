'use strict';

// GET /api/assignments/waiting-on-me
// The submitted plans waiting on the signed-in approver, every term, longest wait first: the Director of Libraries
// (every program), the Program Head (the programs they head), the Dean (their department's). The same rule as the
// automatic "waiting for your review" reminders (utils/approverWaiting.js), so the two never disagree.

const { sequelize, Sequelize } = require('../models');
const { findWaitingOnApprovers } = require('../utils/approverWaiting');
const { schoolClock, timezoneOf } = require('../utils/reminderRules');

const ROLE_OF = { 'director-of-libraries': 'LIBRARY_DIRECTOR', 'program-head': 'PROGRAM_HEAD', dean: 'DEAN' };

const waitingOnMe = async (req, res, next) => {
    try {
        const role = ROLE_OF[req.user?.role];
        if (!role) return res.status(403).json({ error: 'Only an approver has plans waiting on them.' });
        const zone = timezoneOf();
        const waiting = (await findWaitingOnApprovers({ sequelize, today: schoolClock(new Date(), zone).day, timeZone: zone }))
            .filter(row => row.role === role
                && (role !== 'PROGRAM_HEAD' || row.programHeadId === Number(req.user.id))
                && (role !== 'DEAN' || row.deanId === Number(req.user.id)));
        if (waiting.length === 0) return res.json({ plans: [] });

        const ids = [...new Set(waiting.map(row => row.offeringId))];
        const details = await sequelize.query(
            `SELECT pco.pc_offering_id AS offeringId, pco.school_year AS schoolYear, pco.semester, pco.revision_number AS revisionNumber,
                    c.course_no AS courseCode, c.course_title AS courseTitle, p.name AS programName
             FROM ProgramCourseOfferings pco
                 INNER JOIN Courses c ON c.course_id = pco.course_id
                 LEFT JOIN Programs p ON p.program_id = pco.program_id
             WHERE pco.pc_offering_id IN (${ids.map(() => '?').join(', ')})`,
            { replacements: ids, type: Sequelize.QueryTypes.SELECT });
        const byId = new Map(details.map(row => [row.offeringId, row]));
        const plans = waiting
            .map(row => ({ ...byId.get(row.offeringId), offeringId: row.offeringId, waitedDays: row.waitedDays }))
            .filter(row => row.courseCode)
            .sort((a, b) => b.waitedDays - a.waitedDays || String(a.courseCode).localeCompare(String(b.courseCode)));
        return res.json({ plans });
    } catch (error) {
        return next(error);
    }
};

module.exports = { waitingOnMe };
