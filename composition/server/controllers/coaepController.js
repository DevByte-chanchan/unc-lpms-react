'use strict';

const { sequelize, Sequelize, AssignmentWorkflowLog } = require('../models');
const { planEditState } = require('../utils/editLock');
const { assembleCoaep } = require('../utils/coaepAssembly');

const select = (sql, replacements) =>
    sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });

// ILO -> topic -> TLA -> assessment, the chain the syllabus forms build.
const FROM_TOPICS = `FROM ILOTopics it
        INNER JOIN Topics tp ON tp.topic_id = it.topic_id`;
const FROM_TLAS = `FROM ILOTopics it
        INNER JOIN TopicTLAs tt ON tt.ilo_topic_id = it.ilo_topic_id
        INNER JOIN TeachingAndLearningActivities tla ON tla.tla_id = tt.tla_id`;
const FROM_ASSESSMENTS = `${FROM_TLAS}
        INNER JOIN TLAAssessments ta ON ta.tla_id = tla.tla_id`;

/**
 * GET /api/coaep/:code
 * Builds the COAEP content for a course straight from the database: one row per
 * ILO (grouped under its CO) with its IED level, topics, TLAs and assessments, plus
 * the approval status of the learning plan it was built from. Only an approved plan
 * yields a final COAEP; the client marks every other state as a draft.
 */
async function getCoaepByCourse(req, res) {
    try {
        const { code } = req.params;
        const authorizedOfferingId = req.courseAccess?.pc_offering_id;
        if (!code) return res.status(400).json({ message: 'Course code is required.' });
        if (!authorizedOfferingId) return res.status(403).json({ message: 'Course access was not authorized.' });

        const baseRows = await select(
            `SELECT co.co_id, co.co_description,
                    ilo.ilo_id, ilo.description AS ilo_description, ilo.ied_level, ilo.is_orientation,
                    ilo.target_students_percent, ilo.target_score_percent,
                    crs.course_title
             FROM CourseOutcomes co
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
                 INNER JOIN Courses crs ON crs.course_id = pco.course_id
                 INNER JOIN IntendedLearningOutcomes ilo ON ilo.co_id = co.co_id
             WHERE crs.course_no = ? AND pco.pc_offering_id = ?
             ORDER BY co.co_id ASC, ilo.ilo_id ASC;`,
            [code, authorizedOfferingId]
        );

        if (baseRows.length === 0) {
            return res.status(404).json({ message: 'No composed learning plan found for this course.' });
        }

        const iloIds = baseRows.map(row => row.ilo_id);
        const marks = iloIds.map(() => '?').join(', ');
        const [topicRows, tlaRows, assessmentRows] = await Promise.all([
            select(`SELECT DISTINCT it.ilo_id, tp.title, it.ilo_topic_id ${FROM_TOPICS}
                    WHERE it.ilo_id IN (${marks}) ORDER BY it.ilo_topic_id ASC;`, iloIds),
            select(`SELECT DISTINCT it.ilo_id, tla.tla_id, tla.tla_name, tla.class_phase ${FROM_TLAS}
                    WHERE it.ilo_id IN (${marks}) ORDER BY tla.tla_id ASC;`, iloIds),
            select(`SELECT DISTINCT it.ilo_id, ta.method_id, ta.name, ta.period, ta.weight ${FROM_ASSESSMENTS}
                    WHERE it.ilo_id IN (${marks}) ORDER BY ta.method_id ASC;`, iloIds),
        ]);

        // Status comes from the workflow log, the single source of truth for a plan.
        const assignmentId = req.courseAccess?.co_assign_id;
        const logs = assignmentId
            ? await AssignmentWorkflowLog.findAll({
                where: { co_assign_id: assignmentId },
                attributes: ['actor_role', 'action_type', 'createdAt'],
                order: [['createdAt', 'ASC'], ['log_id', 'ASC']],
                raw: true
            })
            : [];
        const { state } = planEditState(logs);
        const approval = state === 'Approved'
            ? [...logs].reverse().find(entry => entry.actor_role === 'DEAN' && ['ACCEPTED', 'APPROVED'].includes(entry.action_type))
            : null;

        return res.json({
            course: { code, title: baseRows[0].course_title || '' },
            status: {
                state,
                approved: state === 'Approved',
                revisionNumber: req.courseAccess?.revision_number ?? null,
                approvedAt: approval ? new Date(approval.createdAt).toISOString() : null,
            },
            cos: assembleCoaep({ baseRows, topicRows, tlaRows, assessmentRows }),
        });
    } catch (error) {
        console.error('Error building COAEP for course:', error);
        return res.status(500).json({ message: 'Internal server error building COAEP.' });
    }
}

module.exports = { getCoaepByCourse };
