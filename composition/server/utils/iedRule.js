'use strict';

// Every course outcome must be covered at all three IED levels: at least one
// Introductory, one Enabling and one Demonstrative ILO. Orientation ILOs sit
// outside the scheme and are ignored. The client gate (utils/submissionGate.js)
// applies the same rule so the instructor hears about it before submitting.
const IED_LEVELS = ['I', 'E', 'D'];
const IED_NAMES = { I: 'Introductory', E: 'Enabling', D: 'Demonstrative' };
// Share of a course's total assessment weight owed to each level.
const IED_WEIGHTS = { I: 20, E: 30, D: 50 };

// coIds: course outcome ids in display order. ilos: { co_id, ied_level, is_orientation }.
// Returns human-readable problems; empty means the rule holds.
const findIedProblems = (coIds = [], ilos = []) => {
    const problems = [];
    coIds.forEach((coId, index) => {
        const own = ilos.filter(ilo => ilo.co_id === coId && !ilo.is_orientation);
        const unlevelled = own.filter(ilo => !IED_LEVELS.includes(ilo.ied_level)).length;
        if (unlevelled) {
            problems.push(`CO${index + 1} has ${unlevelled} ILO${unlevelled > 1 ? 's' : ''} with no IED level.`);
        }
        const missing = IED_LEVELS.filter(level => !own.some(ilo => ilo.ied_level === level));
        if (missing.length) {
            problems.push(`CO${index + 1} needs at least one ${missing.map(level => IED_NAMES[level]).join(' and one ')} ILO.`);
        }
    });
    return problems;
};

module.exports = { IED_LEVELS, IED_NAMES, IED_WEIGHTS, findIedProblems };
