'use strict';

// Shared helpers for the demo learning-plan seeders, so every seeded plan is valid by
// construction instead of by hand-kept index arithmetic:
//   assignIedLevels   sets each ILO's I/E/D level before it is inserted
//   seedAssessments   gives every ILO one assessment (naming that ILO) on a TLA in its
//                     course outcome's weeks, matched to its level, with weights and periods computed
//   assertPlanValid   throws unless the plan would pass the server submit check
// Nothing here picks a TLA by position in an inserted-rows array.

const { IED_LEVELS, IED_WEIGHTS, findIedProblems } = require('./iedRule');
const { formatWeight, findWeightProblems } = require('./assessmentWeights');
const { TERM_PERIODS } = require('../config/termPeriods');
const { loadOfferingAssessments } = require('./offeringAssessments');

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

// The non-orientation TLAs in the weeks of one ILO's course outcome, with a topic of that week.
const loadIloTlas = (queryInterface, iloId) => select(queryInterface,
    `SELECT tla.tla_id, tla.class_phase,
            (SELECT tp.title FROM Subtopics st INNER JOIN Topics tp ON tp.topic_id = st.topic_id
             WHERE st.week_id = tla.week_id ORDER BY st.subtopic_id ASC LIMIT 1) AS topic_title
     FROM IntendedLearningOutcomes ilo
         INNER JOIN Weeks w ON w.co_id = ilo.co_id
         INNER JOIN TeachingAndLearningActivities tla ON tla.week_id = w.week_id AND tla.is_orientation = 0
     WHERE ilo.ilo_id = ?
     ORDER BY w.week_id ASC, tla.tla_id ASC;`,
    [iloId]);

const seedAssessments = async (queryInterface, { offeringId, now = new Date(), names = DEFAULT_ASSESSMENT_NAMES }) => {
    const ilos = await loadOfferingIlos(queryInterface, offeringId);
    const coOrder = [...new Set(ilos.map(ilo => ilo.co_id))];
    const graded = ilos.filter(ilo => !ilo.is_orientation);

    // Grading is per period, one course outcome per period in order (Prelim, Midterm, Semi-final, Final;
    // any further outcome falls in Final). Within a period each level's weight is split evenly over that
    // level's ILOs; the last takes the rounding remainder so each period totals exactly 20 / 30 / 50.
    const periodOf = (ilo) => (TERM_PERIODS[coOrder.indexOf(ilo.co_id)] || TERM_PERIODS[TERM_PERIODS.length - 1]).code;
    const groups = new Map();
    for (const ilo of graded) {
        if (!IED_WEIGHTS[ilo.ied_level]) throw new Error(`ILO ${ilo.ilo_id} has no IED level; set it before seeding assessments.`);
        const key = `${periodOf(ilo)}:${ilo.ied_level}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(ilo);
    }
    const weightOf = new Map();
    for (const group of groups.values()) {
        const level = group[0].ied_level;
        const base = Math.floor((IED_WEIGHTS[level] / group.length) * 100) / 100;
        group.forEach((ilo, index) => {
            weightOf.set(ilo.ilo_id, index === group.length - 1 ? IED_WEIGHTS[level] - base * (group.length - 1) : base);
        });
    }

    // Start over for this plan so re-running a seeder cannot stack assessments.
    await queryInterface.sequelize.query(
        `DELETE FROM TLAAssessments WHERE tla_id IN (
             SELECT tla.tla_id FROM TeachingAndLearningActivities tla
                 INNER JOIN Weeks w ON w.week_id = tla.week_id
                 INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
             WHERE co.pc_offering_id = ?);`,
        { replacements: [offeringId] }
    );

    const rows = [];
    const used = new Set();
    for (const ilo of graded) {
        const tlas = (await loadIloTlas(queryInterface, ilo.ilo_id)).filter(tla => !used.has(tla.tla_id));
        if (tlas.length === 0) throw new Error(`ILO ${ilo.ilo_id} has no TLA in its course outcome's weeks to attach an assessment to.`);
        const target = tlas.find(tla => /^in/i.test(tla.class_phase)) || tlas[0];
        used.add(target.tla_id);

        const choices = names[ilo.ied_level];
        const coIndex = coOrder.indexOf(ilo.co_id);
        rows.push({
            tla_id: target.tla_id,
            ilo_id: ilo.ilo_id,
            name: choices[coIndex % choices.length],
            description: DETAIL_BY_LEVEL[ilo.ied_level](target.topic_title || 'the week\'s topics'),
            period: periodOf(ilo),
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
// and a D; within each period assessment weights total 20 / 30 / 50) and every graded ILO is named by
// exactly one assessment.
const assertPlanValid = async (queryInterface, offeringId) => {
    const ilos = await loadOfferingIlos(queryInterface, offeringId);
    const coIds = [...new Set(ilos.map(ilo => ilo.co_id))];
    const assessments = (await loadOfferingAssessments(offeringId)).filter(row => row.ilo_id != null);

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
