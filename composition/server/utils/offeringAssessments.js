'use strict';

// Every assessment of a course offering, once per (ILO, assessment), with the
// level of the ILO it belongs to. Reached ILO -> topic -> TLA -> assessment, the
// same path the COAEP uses. DISTINCT keeps a TLA tied to several topics of one
// ILO from being counted twice.
const loadOfferingAssessments = async (offeringId) => {
    const { sequelize, Sequelize } = require('../models');
    return sequelize.query(
        `SELECT DISTINCT ilo.ilo_id, ilo.ied_level, ilo.is_orientation, ta.method_id, ta.weight
         FROM CourseOutcomes co
             INNER JOIN IntendedLearningOutcomes ilo ON ilo.co_id = co.co_id
             INNER JOIN ILOTopics it ON it.ilo_id = ilo.ilo_id
             INNER JOIN TopicTLAs tt ON tt.ilo_topic_id = it.ilo_topic_id
             INNER JOIN TLAAssessments ta ON ta.tla_id = tt.tla_id
         WHERE co.pc_offering_id = ?;`,
        { replacements: [offeringId], type: Sequelize.QueryTypes.SELECT }
    );
};

module.exports = { loadOfferingAssessments };
