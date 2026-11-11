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
//   plan: { contactHrs, programPos, cos: [{ id, label, weeks: [{ number, hours, topics }], ilos, assessments, pos: [PO numbers],
//           iloRows: [{ number, complete }] }], periods: ['p', …] }
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

    // Aligned to the program: every course outcome supports at least one of the program's POs.
    const unaligned = plan.cos.filter(co => !(co.pos || []).length).map(co => co.label);
    checks.push({
        key: 'po-links',
        label: 'Program outcomes',
        ok: plan.cos.length > 0 && plan.programPos > 0 && unaligned.length === 0,
        detail: !plan.programPos ? "The program has no program outcomes yet (Program Documents)."
            : !plan.cos.length ? 'The plan has no course outcomes yet.'
                : unaligned.length ? `${unaligned.join(', ')} ${unaligned.length === 1 ? 'is' : 'are'} not linked to a program outcome.`
                    : `Every course outcome is linked to a program outcome.`,
    });

    // Which of the program's POs this course addresses. One course is not expected to cover them all, so this
    // informs (info: true) and never counts as a failed check.
    const covered = [...new Set(plan.cos.flatMap(co => co.pos || []))].sort((a, b) => a - b);
    const notCovered = Array.from({ length: plan.programPos }, (_, i) => i + 1).filter(n => !covered.includes(n));
    checks.push({
        key: 'po-coverage',
        label: 'Program outcomes addressed',
        ok: true,
        info: true,
        detail: !plan.programPos ? 'The program has no program outcomes yet.'
            : `${covered.length} of ${plan.programPos}: ${covered.map(n => `PO${n}`).join(', ') || 'none'}.`
                + (notCovered.length ? ` Not addressed here: ${notCovered.map(n => `PO${n}`).join(', ')}.` : ''),
    });

    // The COAEP is built from the graded ILOs: each needs its I / E / D level, an assessment and both targets.
    const incomplete = plan.cos.flatMap(co => (co.iloRows || []).filter(ilo => !ilo.complete).map(ilo => `${co.label} ILO${ilo.number}`));
    checks.push({
        key: 'coaep',
        label: 'COAEP',
        ok: plan.cos.length > 0 && incomplete.length === 0,
        detail: !plan.cos.length ? 'The plan has no course outcomes yet.'
            : incomplete.length ? `Missing a level, assessment or target: ${incomplete.join(', ')}.`
                : 'Every graded ILO has its level, assessment and targets.',
    });
    return checks;
};

// The plan of one offering, read for the checks.
const loadPlan = async (pcId) => {
    const [offering] = await select(
        `SELECT c.contact_hrs, pco.program_id FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id
         WHERE pco.pc_offering_id = ?`, [pcId]);
    if (!offering) return null;
    const cos = await select('SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ? ORDER BY co_id', [pcId]);
    const ids = cos.map(c => c.co_id);
    const none = [0];
    const list = ids.length ? ids : none;
    const [weeks, ilos, assessments, periods, programPos, links, iloRows] = await Promise.all([
        select(`SELECT w.week_id, w.co_id, w.hours,
                    (SELECT COUNT(*) FROM Subtopics s WHERE s.week_id = w.week_id) AS topics
                FROM Weeks w WHERE w.co_id IN (?) ORDER BY w.co_id, w.week_id`, [list]),
        select('SELECT co_id, COUNT(*) AS n FROM IntendedLearningOutcomes WHERE co_id IN (?) GROUP BY co_id', [list]),
        select(`SELECT i.co_id, COUNT(a.method_id) AS n FROM IntendedLearningOutcomes i
                    INNER JOIN TLAAssessments a ON a.ilo_id = i.ilo_id WHERE i.co_id IN (?) GROUP BY i.co_id`, [list]),
        select(`SELECT DISTINCT a.period FROM IntendedLearningOutcomes i
                    INNER JOIN TLAAssessments a ON a.ilo_id = i.ilo_id WHERE i.co_id IN (?)`, [list]),
        // the program's POs in PO-number order (po_id order)
        select('SELECT po_id FROM ProgramOutcomes WHERE program_id = ? ORDER BY po_id', [offering.program_id]),
        select('SELECT co_id, po_id FROM ProgramOutcomeAlignments WHERE co_id IN (?)', [list]),
        select(`SELECT i.co_id, i.ilo_id, i.ied_level, i.target_students_percent, i.target_score_percent,
                    (SELECT COUNT(*) FROM TLAAssessments a WHERE a.ilo_id = i.ilo_id) AS assessments
                FROM IntendedLearningOutcomes i WHERE i.co_id IN (?) AND COALESCE(i.is_orientation, 0) = 0
                ORDER BY i.co_id, i.ilo_id`, [list]),
    ]);
    const poNumber = new Map(programPos.map((po, i) => [po.po_id, i + 1]));
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
            pos: [...new Set(links.filter(l => l.co_id === id && poNumber.has(l.po_id)).map(l => poNumber.get(l.po_id)))],
            iloRows: iloRows.filter(r => r.co_id === id).map((r, n) => ({
                number: n + 1,
                complete: Boolean(r.ied_level) && Number(r.assessments) > 0 && r.target_students_percent != null && r.target_score_percent != null,
            })),
        })),
        programPos: programPos.length,
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
