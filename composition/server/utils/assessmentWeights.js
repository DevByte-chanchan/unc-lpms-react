'use strict';

const { IED_NAMES, IED_WEIGHTS } = require('./iedRule');
const { TERM_PERIODS } = require('../config/termPeriods');

// TLAAssessments.period holds one of these single-letter codes. The week boundaries
// live in config/termPeriods.js; they only drive the pre-selected period, which the
// faculty can change.
const PERIOD_LABELS = Object.fromEntries(TERM_PERIODS.map(period => [period.code, period.label]));

const periodForWeek = (week) => {
    if (!Number.isFinite(week) || week < 1) return null;
    const hit = TERM_PERIODS.find(period => week <= period.lastWeek);
    return (hit || TERM_PERIODS[TERM_PERIODS.length - 1]).code;
};

// ilos: every ILO of the offering in ilo_id order, as { ilo_id, weeks }. ILOs are
// scheduled back to back (same rule as the syllabus delivery-week column), so an
// ILO starts where the previous one ended. Returns null when this ILO has no
// whole weeks assigned yet.
const startWeekOfIlo = (ilos, iloId) => {
    let next = 1;
    for (const ilo of ilos) {
        const duration = Math.trunc(Number(ilo.weeks)) || 0;
        if (Number(ilo.ilo_id) === Number(iloId)) return duration >= 1 ? next : null;
        next += duration;
    }
    return null;
};

// "12.5" or "12.5%" -> 12.5; blank, non-numeric, <= 0 or > 100 -> null.
const parseWeight = (value) => {
    const text = String(value ?? '').replace('%', '').trim();
    if (!/^[0-9]+(\.[0-9]+)?$/.test(text)) return null;
    const number = Number(text);
    return number > 0 && number <= 100 ? number : null;
};

// Faculty type weights to two decimals, so splitting a level into thirds
// (6.67 + 6.67 + 6.67) lands a hundredth off. Allow that rounding, nothing more.
const WEIGHT_TOLERANCE = 0.05;

const formatWeight = (number) => String(Math.round(number * 100) / 100);

// Faculty split each level's weight among its assessments however they like;
// across the whole course the Introductory ones must total 20%, Enabling 30% and
// Demonstrative 50%. assessments: { ied_level, is_orientation, weight } (orientation
// ILOs sit outside the scheme). Returns human-readable problems; empty = valid.
const findWeightProblems = (assessments = []) => {
    const totals = { I: 0, E: 0, D: 0 };
    for (const assessment of assessments) {
        if (assessment.is_orientation || !(assessment.ied_level in totals)) continue;
        totals[assessment.ied_level] += parseWeight(assessment.weight) ?? 0;
    }
    return Object.keys(IED_WEIGHTS)
        .filter(level => Math.abs(totals[level] - IED_WEIGHTS[level]) > WEIGHT_TOLERANCE)
        .map(level => `${IED_NAMES[level]} assessment weights total ${formatWeight(totals[level])}%, but must total ${IED_WEIGHTS[level]}%.`);
};

module.exports = { PERIOD_LABELS, periodForWeek, startWeekOfIlo, parseWeight, formatWeight, findWeightProblems };
