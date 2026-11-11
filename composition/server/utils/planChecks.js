'use strict';

// The checks the Program Head used to do by hand when reviewing a learning plan (title defense: "automate error
// validation, standard time checking and schedule verification"). Read-only: it reports, a person still decides.
//
//   hours     every week has the course's weekly contact hours ("2 Hrs Lec, 3 Hrs Lab" = 5), so the plan totals
//             16 x that
//   weeks     16 teaching weeks, each with topics
//   coverage  every course outcome has a week, an ILO and an assessment
//   periods   every grading period (Prelim, Midterm, Semi-final, Final) has an assessment
//
//
// A UNC semester is 18 weeks with the exams, 16 teaching weeks without them; a plan covers the 16 teaching weeks.

const { sequelize, Sequelize } = require('../models');

const select = (sql, r = []) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });

const TEACHING_WEEKS = 16;

const PERIODS = [['p', 'Prelim'], ['m', 'Midterm'], ['s', 'Semi-final'], ['f', 'Final']];

// "2 Hrs Lec, 3 Hrs Lab" -> 5; "3" -> 3; nothing readable -> null.
const weeklyHours = (contactHrs) => {
    const numbers = String(contactHrs ?? '').match(/\d+(\.\d+)?/g);
    return numbers ? numbers.reduce((sum, n) => sum + Number(n), 0) : null;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The checks from the plan's rows (pure, so it is tested without a database).
//   plan: { contactHrs, cos: [{ id, label, weeks: [{ number, hours, topics }], ilos, assessments }], periods: ['p', …] }
const runChecks = (plan) => {
    const weeks = plan.cos.flatMap(co => co.weeks);
    const perWeek = weeklyHours(plan.contactHrs);
    const checks = [];

    const offHours = perWeek == null ? [] : weeks.filter(w => Number(w.hours) !== perWeek);
    const total = weeks.reduce((sum, w) => sum + (Number(w.hours) || 0), 0);
    const expected = perWeek == null ? null : perWeek * TEACHING_WEEKS;
    checks.push({
        key: 'hours',
        label: 'Hours',
        ok: perWeek != null && offHours.length === 0 && total === expected,
        detail: perWeek == null
            ? `The course's contact hours ("${plan.contactHrs || 'none'}") could not be read.`
            : [
                offHours.length
                    ? `${plural(offHours.length, 'week')} differ from the course's ${perWeek} hours: ${offHours.map(w => `week ${w.number} (${w.hours == null ? 'no hours' : `${Number(w.hours)} h`})`).join(', ')}.`
                    : `Every week has ${perWeek} hours.`,
                `${total} of ${expected} hours in all (${perWeek} h × ${TEACHING_WEEKS} teaching weeks).`,
            ].join(' '),
    });

    const empty = weeks.filter(w => !w.topics);
    checks.push({
        key: 'weeks',
        label: 'Weeks and topics',
        ok: weeks.length === TEACHING_WEEKS && empty.length === 0,
        detail: !weeks.length ? 'The plan has no weeks yet.'
            : [
                weeks.length === TEACHING_WEEKS ? `${TEACHING_WEEKS} teaching weeks.` : `${plural(weeks.length, 'week')}; a semester has ${TEACHING_WEEKS} teaching weeks (18 with the exams).`,
                empty.length ? `${plural(empty.length, 'week')} without topics: ${empty.map(w => `week ${w.number}`).join(', ')}.` : 'Each has topics.',
            ].join(' '),
    });

    const gaps = plan.cos.map(co => {
        const missing = [!co.weeks.length && 'week', !co.ilos && 'ILO', !co.assessments && 'assessment'].filter(Boolean);
        return missing.length ? `${co.label}: no ${missing.join(', no ')}` : null;
    }).filter(Boolean);
    checks.push({
        key: 'coverage',
        label: 'Course outcomes covered',
        ok: plan.cos.length > 0 && gaps.length === 0,
        detail: !plan.cos.length ? 'The plan has no course outcomes yet.'
            : gaps.length ? `${gaps.join('; ')}.` : `All ${plural(plan.cos.length, 'course outcome')} have weeks, ILOs and assessments.`,
    });

    const missingPeriods = PERIODS.filter(([key]) => !plan.periods.includes(key)).map(([, name]) => name);
    checks.push({
        key: 'periods',
        label: 'Exam periods',
        ok: missingPeriods.length === 0,
        detail: missingPeriods.length ? `No assessment in ${missingPeriods.join(', ')}.` : 'Prelim, Midterm, Semi-final and Final each have assessments.',
    });
    return checks;
};

// The plan of one offering, read for the checks.
const loadPlan = async (pcId) => {
    const [offering] = await select(
        `SELECT c.contact_hrs FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id
         WHERE pco.pc_offering_id = ?`, [pcId]);
    if (!offering) return null;
    const cos = await select('SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ? ORDER BY co_id', [pcId]);
    const ids = cos.map(c => c.co_id);
    const none = [0];
    const list = ids.length ? ids : none;
    const [weeks, ilos, assessments, periods] = await Promise.all([
        select(`SELECT w.week_id, w.co_id, w.hours,
                    (SELECT COUNT(*) FROM Subtopics s WHERE s.week_id = w.week_id) AS topics
                FROM Weeks w WHERE w.co_id IN (?) ORDER BY w.co_id, w.week_id`, [list]),
        select('SELECT co_id, COUNT(*) AS n FROM IntendedLearningOutcomes WHERE co_id IN (?) GROUP BY co_id', [list]),
        select(`SELECT i.co_id, COUNT(a.method_id) AS n FROM IntendedLearningOutcomes i
                    INNER JOIN TLAAssessments a ON a.ilo_id = i.ilo_id WHERE i.co_id IN (?) GROUP BY i.co_id`, [list]),
        select(`SELECT DISTINCT a.period FROM IntendedLearningOutcomes i
                    INNER JOIN TLAAssessments a ON a.ilo_id = i.ilo_id WHERE i.co_id IN (?)`, [list]),
    ]);
    const count = (rows, id) => Number(rows.find(r => r.co_id === id)?.n || 0);
    // Weeks are numbered in plan order (by outcome, then as written), the way the plan shows them.
    let number = 0;
    return {
        contactHrs: offering.contact_hrs,
        cos: ids.map((id, i) => ({
            id,
            label: `CO${i + 1}`,
            weeks: weeks.filter(w => w.co_id === id).map(w => ({ number: ++number, hours: w.hours, topics: Number(w.topics) })),
            ilos: count(ilos, id),
            assessments: count(assessments, id),
        })),
        periods: periods.map(p => String(p.period || '').toLowerCase()),
    };
};

// GET /api/assignments/offering/:pcId/plan-checks
const getPlanChecks = async (req, res, next) => {
    try {
        const pcId = Number(req.params.pcId);
        const plan = Number.isInteger(pcId) ? await loadPlan(pcId) : null;
        if (!plan) return res.status(404).json({ error: 'Course offering not found.' });
        return res.json({ checks: runChecks(plan) });
    } catch (err) { return next(err); }
};

module.exports = { runChecks, weeklyHours, loadPlan, getPlanChecks };
