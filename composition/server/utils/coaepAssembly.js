'use strict';

const { IED_NAMES, IED_WEIGHTS } = require('./iedRule');
const { PERIOD_LABELS, formatWeight } = require('./assessmentWeights');

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

// Official COAEP form holds a maximum of 4 Course Outcomes.
const MAX_COURSE_OUTCOMES = 4;

const group = (rows, key) => {
    const byKey = new Map();
    for (const row of rows) {
        if (!byKey.has(row[key])) byKey.set(row[key], []);
        byKey.get(row[key]).push(row);
    }
    return byKey;
};

const uniqueBy = (items, keyOf) => {
    const seen = new Set();
    return items.filter(item => {
        const key = keyOf(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

// One row per ILO, with its topics, TLAs and assessments listed inside it.
//   baseRows       one per ILO: co_id, co_description, ilo_id, ilo_description, ied_level,
//                  is_orientation, target_students_percent, target_score_percent
//   topicRows      ilo_id, title
//   tlaRows        ilo_id, tla_id, tla_name, class_phase
//   assessmentRows ilo_id, method_id, name, period, weight
// Everything arrives as separate rows and is grouped here, so no value is ever packed
// into a delimited string and split apart again (an assessment name may contain a comma).
const assembleCoaep = ({ baseRows, topicRows = [], tlaRows = [], assessmentRows = [] }) => {
    const topicsByIlo = group(topicRows, 'ilo_id');
    const tlasByIlo = group(tlaRows, 'ilo_id');
    const assessmentsByIlo = group(assessmentRows, 'ilo_id');

    const cosById = new Map();
    for (const row of baseRows) {
        if (!cosById.has(row.co_id)) {
            cosById.set(row.co_id, {
                number: `${cosById.size + 1}.0`,
                statement: clean(row.co_description).replace(/^CO\s*\d+\s*:\s*/i, ''),
                ilos: [],
            });
        }

        const level = row.is_orientation ? null : (IED_NAMES[row.ied_level] ? row.ied_level : null);
        const assessments = uniqueBy(assessmentsByIlo.get(row.ilo_id) || [], a => a.method_id).map(a => ({
            name: clean(a.name),
            period: a.period,
            periodLabel: PERIOD_LABELS[a.period] || '',
            weight: formatWeight(parseFloat(a.weight) || 0),
        }));

        cosById.get(row.co_id).ilos.push({
            outcome: clean(row.ilo_description),
            isOrientation: !!row.is_orientation,
            level,
            levelName: level ? IED_NAMES[level] : '',
            // The level's share of the whole course, not of this ILO.
            levelWeight: level ? IED_WEIGHTS[level] : null,
            topics: uniqueBy(topicsByIlo.get(row.ilo_id) || [], t => t.title).map(t => clean(t.title)),
            tlas: uniqueBy(tlasByIlo.get(row.ilo_id) || [], t => t.tla_id).map(t => ({ name: clean(t.tla_name), phase: clean(t.class_phase) })),
            assessments,
            assessmentTools: assessments.map(a => a.name),
            performanceTarget: `At least ${row.target_students_percent}% of enrolled students with a rating of at least ${row.target_score_percent}% of the total score`,
        });
    }
    return [...cosById.values()].slice(0, MAX_COURSE_OUTCOMES);
};

module.exports = { assembleCoaep };
