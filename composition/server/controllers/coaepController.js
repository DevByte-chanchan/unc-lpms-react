'use strict';

const { sequelize, Sequelize } = require('../models');

/**
 * GET /api/coaep/:code
 * Builds the COAEP content for a course straight from the database:
 * COs → ILOs → assessment tools (via ILOTopics → TopicTLAs → TLAAssessments).
 * Shape matches the CourseAssessmentEvaluationPlan component / buildCoaepHtml.
 */
async function getCoaepByCourse(req, res) {
    try {
        const { code } = req.params;
        const authorizedOfferingId = req.courseAccess?.pc_offering_id;
        if (!code) return res.status(400).json({ message: 'Course code is required.' });
        if (!authorizedOfferingId) return res.status(403).json({ message: 'Course access was not authorized.' });

        const rows = await sequelize.query(
            `SELECT
                 co.co_id,
                 co.co_description,
                 ilo.ilo_id,
                 ilo.description AS ilo_description,
                 ilo.target_students_percent,
                 ilo.target_score_percent,
                 GROUP_CONCAT(DISTINCT ta.name) AS assessment_tools,
                 crs.course_title
             FROM CourseOutcomes co
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
                 INNER JOIN Courses crs ON crs.course_id = pco.course_id
                 INNER JOIN IntendedLearningOutcomes ilo ON ilo.co_id = co.co_id
                 LEFT JOIN ILOTopics it ON it.ilo_id = ilo.ilo_id
                 LEFT JOIN TopicTLAs tt ON tt.ilo_topic_id = it.ilo_topic_id
                 LEFT JOIN TLAAssessments ta ON ta.tla_id = tt.tla_id
             WHERE crs.course_no = ?
               AND pco.pc_offering_id = ?
             GROUP BY ilo.ilo_id
             ORDER BY co.co_id ASC, ilo.ilo_id ASC;`,
            { replacements: [code, authorizedOfferingId], type: Sequelize.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No composed learning plan found for this course.' });
        }

        const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
        const cosMap = new Map();
        for (const r of rows) {
            if (!cosMap.has(r.co_id)) {
                cosMap.set(r.co_id, {
                    number: `${cosMap.size + 1}.0`,
                    statement: clean(r.co_description).replace(/^CO\s*\d+\s*:\s*/i, ''),
                    ilos: [],
                });
            }
            cosMap.get(r.co_id).ilos.push({
                outcome: clean(r.ilo_description),
                performanceTarget: `At least ${r.target_students_percent}% of enrolled students with a rating of at least ${r.target_score_percent}% of the total score`,
                assessmentTool: r.assessment_tools ? r.assessment_tools.split(',').map(clean).join(' / ') : '',
            });
        }

        return res.json({
            course: { code, title: rows[0].course_title || '' },
            // Official COAEP form holds a maximum of 4 Course Outcomes
            cos: [...cosMap.values()].slice(0, 4),
        });
    } catch (error) {
        console.error('Error building COAEP for course:', error);
        return res.status(500).json({ message: 'Internal server error building COAEP.' });
    }
}

module.exports = { getCoaepByCourse };
