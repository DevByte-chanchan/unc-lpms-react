'use strict';

// Every assessment of a course offering, with the level of the ILO it assesses.
// Weekly planner: assessment -> TLA -> week -> course outcome -> offering; the ILO is
// the one picked on the assessment (TLAAssessments.ilo_id), so an assessment with no
// ILO picked yet has a null level. An orientation TLA counts as orientation.
const loadOfferingAssessments = async (offeringId) => {
    const { sequelize, Sequelize } = require('../models');
    return sequelize.query(
        `SELECT ta.ilo_id, ilo.ied_level,
                CASE WHEN tla.is_orientation = 1 OR ilo.is_orientation = 1 THEN 1 ELSE 0 END AS is_orientation,
                ta.method_id, ta.tla_id, tla.week_id, ta.weight
         FROM CourseOutcomes co
             INNER JOIN Weeks w ON w.co_id = co.co_id
             INNER JOIN TeachingAndLearningActivities tla ON tla.week_id = w.week_id
             INNER JOIN TLAAssessments ta ON ta.tla_id = tla.tla_id
             LEFT JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = ta.ilo_id
         WHERE co.pc_offering_id = ?;`,
        { replacements: [offeringId], type: Sequelize.QueryTypes.SELECT }
    );
};

module.exports = { loadOfferingAssessments };
