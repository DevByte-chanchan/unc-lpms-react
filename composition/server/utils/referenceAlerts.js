'use strict';

// When a library title stops being usable (marked lost or withdrawn, or its copies fall to none), the Program
// Head of every program whose current plans use it is told, so a replacement can be asked for. It never
// fails the edit that caused it. Counts and course codes only.

const { Sequelize } = require('sequelize');
const { notify } = require('./notify');
const { unavailableReason } = require('./referenceHealth');

const MAX_CODES = 3;

// The newest offering of each course and program that links this reference, with the program's head.
const plansUsing = async (sequelize, referenceId) => sequelize.query(
    `SELECT pco.pc_offering_id AS offeringId, c.course_no AS courseCode, p.stakeholder_id AS headId
     FROM ILOReferences ir
         INNER JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = ir.ilo_id
         INNER JOIN CourseOutcomes co ON co.co_id = ilo.co_id
         INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
         INNER JOIN Courses c ON c.course_id = pco.course_id
         INNER JOIN Programs p ON p.program_id = pco.program_id
     WHERE ir.reference_id = ?
       AND pco.pc_offering_id = (SELECT MAX(x.pc_offering_id) FROM ProgramCourseOfferings x WHERE x.course_id = pco.course_id AND x.program_id = pco.program_id)
     GROUP BY pco.pc_offering_id;`,
    { replacements: [referenceId], type: Sequelize.QueryTypes.SELECT });

const messageFor = (codes, reason) => {
    const shown = codes.slice(0, MAX_CODES).join(' ');
    const more = codes.length > MAX_CODES ? ` +${codes.length - MAX_CODES} more` : '';
    return `${shown}${more} — a reference is no longer available (${reason}) by Director of Libraries`;
};

// before / after: the stored reference rows around an edit. Notifies only when it became unavailable.
const onReferenceEdited = async ({ sequelize, before, after, notifyFn = notify }) => {
    try {
        const reason = unavailableReason(after);
        if (!reason || unavailableReason(before)) return 0;
        const plans = await plansUsing(sequelize, after.reference_id);
        const byHead = new Map();
        for (const plan of plans) {
            if (!plan.headId) continue;
            const head = Number(plan.headId);
            if (!byHead.has(head)) byHead.set(head, []);
            byHead.get(head).push(plan);
        }
        let written = 0;
        for (const [head, list] of byHead) {
            written += await notifyFn([head], 'reference_unavailable', list.length === 1 ? list[0].offeringId : null,
                messageFor(list.map(plan => plan.courseCode), reason), 'LIBRARY_DIRECTOR');
        }
        return written;
    } catch (error) {
        console.error(`Reference alert not sent, the edit continues: ${error.message}`);
        return 0;
    }
};

module.exports = { onReferenceEdited, messageFor };
