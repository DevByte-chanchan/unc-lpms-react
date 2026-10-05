'use strict';

// Shared helpers for the demo learning-plan seeders, so every seeded plan is valid by
// construction instead of by hand-kept index arithmetic:
//   assignIedLevels   sets each ILO's I/E/D level before it is inserted
//   seedAssessments   gives every ILO one assessment on a TLA found by joining from
//                     that ILO, matched to its level, with weights and periods computed
//   assertPlanValid   throws unless the plan would pass the server submit check
// Nothing here picks a TLA by position in an inserted-rows array.

const { IED_LEVELS, IED_WEIGHTS, findIedProblems } = require('./iedRule');
const { periodForWeek, startWeekOfIlo, formatWeight, findWeightProblems } = require('./assessmentWeights');

// Assessment names by level: Introductory = quiz / identification, Enabling = guided
// exercise / simulation, Demonstrative = project / actual programming. A seeder may pass
// its own names (same shape) for a course where these read oddly.
const DEFAULT_ASSESSMENT_NAMES = {
    I: ['Objective-Type Quiz', 'Identification Quiz'],
    E: ['Guided Exercise', 'Simulation Activity'],
    D: ['Project Presentation', 'Actual Programming Project'],
};

const DETAIL_BY_LEVEL = {
    I: topic => `Objective-type and identification items checking recall of ${topic}.`,
    E: topic => `A guided, step-by-step exercise applying ${topic} with the instructor's support.`,
    D: topic => `An independent project demonstrating ${topic} in a working output that is presented and defended.`,
};

// ilos: the ILO rows about to be inserted, each with co_id and optional is_orientation.
// Within a course outcome the non-orientation ILOs, in the order written, are the
// Introductory, Enabling and Demonstrative ones. Throws if a CO does not have exactly three.
const assignIedLevels = (ilos) => {
    const seen = new Map();
    const levelled = ilos.map(ilo => {
        if (ilo.is_orientation) return { ...ilo, ied_level: null };
        const position = seen.get(ilo.co_id) || 0;
        seen.set(ilo.co_id, position + 1);
        return { ...ilo, ied_level: IED_LEVELS[position] ?? undefined };
    });
    for (const [coId, count] of seen) {
        if (count !== IED_LEVELS.length) {
            throw new Error(`Course outcome ${coId} has ${count} non-orientation ILOs; each needs exactly one Introductory, Enabling and Demonstrative ILO.`);
        }
    }
    return levelled;
};

const select = (queryInterface, sql, replacements = []) =>
    queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });

const loadOfferingIlos = (queryInterface, offeringId) => select(queryInterface,
    `SELECT ilo.ilo_id, ilo.co_id, ilo.ied_level, ilo.is_orientation, ilo.weeks
     FROM CourseOutcomes co
         INNER JOIN IntendedLearningOutcomes ilo ON ilo.co_id = co.co_id
     WHERE co.pc_offering_id = ?
     ORDER BY ilo.ilo_id ASC;`,
    [offeringId]);

// The TLAs reached from one ILO through its own topics.
const loadIloTlas = (queryInterface, iloId) => select(queryInterface,
    `SELECT DISTINCT tla.tla_id, tla.class_phase, tp.title AS topic_title
     FROM ILOTopics it
         INNER JOIN Topics tp ON tp.topic_id = it.topic_id
         INNER JOIN TopicTLAs tt ON tt.ilo_topic_id = it.ilo_topic_id
         INNER JOIN TeachingAndLearningActivities tla ON tla.tla_id = tt.tla_id
     WHERE it.ilo_id = ?
     ORDER BY tla.tla_id ASC;`,
    [iloId]);

const seedAssessments = async (queryInterface, { offeringId, now = new Date(), names = DEFAULT_ASSESSMENT_NAMES }) => {
    const ilos = await loadOfferingIlos(queryInterface, offeringId);
    const coOrder = [...new Set(ilos.map(ilo => ilo.co_id))];
    const graded = ilos.filter(ilo => !ilo.is_orientation);

    const perLevel = { I: [], E: [], D: [] };
    for (const ilo of graded) {
        if (!perLevel[ilo.ied_level]) throw new Error(`ILO ${ilo.ilo_id} has no IED level; set it before seeding assessments.`);
        perLevel[ilo.ied_level].push(ilo);
    }

    // Course-wide level weight split evenly over that level's ILOs; the last takes the
    // rounding remainder so each level totals exactly 20 / 30 / 50.
    const weightOf = new Map();
    for (const [level, group] of Object.entries(perLevel)) {
        const base = Math.floor((IED_WEIGHTS[level] / group.length) * 100) / 100;
        group.forEach((ilo, index) => {
            weightOf.set(ilo.ilo_id, index === group.length - 1 ? IED_WEIGHTS[level] - base * (group.length - 1) : base);
        });
    }

    // Start over for this plan so re-running a seeder cannot stack assessments.
    await queryInterface.sequelize.query(
        `DELETE FROM TLAAssessments WHERE tla_id IN (
             SELECT tt.tla_id FROM TopicTLAs tt
                 INNER JOIN ILOTopics it ON it.ilo_topic_id = tt.ilo_topic_id
             WHERE it.ilo_id IN (${ilos.map(ilo => Number(ilo.ilo_id)).join(', ') || 'NULL'}));`
    );

    const rows = [];
    for (const ilo of graded) {
        const tlas = await loadIloTlas(queryInterface, ilo.ilo_id);
        if (tlas.length === 0) throw new Error(`ILO ${ilo.ilo_id} has no TLA of its own to attach an assessment to.`);
        const target = tlas.find(tla => /^in/i.test(tla.class_phase)) || tlas[0];

        const choices = names[ilo.ied_level];
        const coIndex = coOrder.indexOf(ilo.co_id);
        rows.push({
            tla_id: target.tla_id,
            name: choices[coIndex % choices.length],
            description: DETAIL_BY_LEVEL[ilo.ied_level](target.topic_title),
            period: periodForWeek(startWeekOfIlo(ilos, ilo.ilo_id)) || 'f',
            weight: formatWeight(weightOf.get(ilo.ilo_id)),
            min_passing: 60,
            createdAt: now,
            updatedAt: now,
        });
    }
    await queryInterface.bulkInsert('TLAAssessments', rows, {});
    return rows.length;
};

// Throws unless the plan passes what the server checks on submit (every CO has an I, an E
// and a D; course-wide assessment weights total 20 / 30 / 50) and every graded ILO has a
// TLA of its own carrying exactly one assessment.
const assertPlanValid = async (queryInterface, offeringId) => {
    const ilos = await loadOfferingIlos(queryInterface, offeringId);
    const coIds = [...new Set(ilos.map(ilo => ilo.co_id))];
    const assessments = await select(queryInterface,
        `SELECT DISTINCT ilo.ilo_id, ilo.ied_level, ilo.is_orientation, ta.method_id, ta.weight
         FROM CourseOutcomes co
             INNER JOIN IntendedLearningOutcomes ilo ON ilo.co_id = co.co_id
             INNER JOIN ILOTopics it ON it.ilo_id = ilo.ilo_id
             INNER JOIN TopicTLAs tt ON tt.ilo_topic_id = it.ilo_topic_id
             INNER JOIN TLAAssessments ta ON ta.tla_id = tt.tla_id
         WHERE co.pc_offering_id = ?;`,
        [offeringId]);

    const problems = [...findIedProblems(coIds, ilos), ...findWeightProblems(assessments)];
    for (const ilo of ilos.filter(item => !item.is_orientation)) {
        const own = assessments.filter(row => row.ilo_id === ilo.ilo_id).length;
        if (own !== 1) problems.push(`ILO ${ilo.ilo_id} has ${own} assessments; expected exactly one.`);
    }
    if (problems.length > 0) {
        throw new Error(`Seeded plan for offering ${offeringId} is not valid: ${problems.join(' ')}`);
    }
};

module.exports = { DEFAULT_ASSESSMENT_NAMES, assignIedLevels, seedAssessments, assertPlanValid };
