'use strict';

// The one place the grading periods are defined. To move a boundary, change the
// week here. The server (suggested period on the TLA form, assessment checks) and
// the demo seeders all read it; the client never needs the weeks, because it is
// handed the suggested period by GET /api/tlas/ilo/:id.
//
// TLAAssessments.period stores the code. Each period runs from the week after the
// previous one's lastWeek through its own lastWeek, in an 18-week term. The current
// boundaries match the seeded learning plans (one course outcome per period).
const TERM_PERIODS = [
    { code: 'p', label: 'Prelim', lastWeek: 5 },
    { code: 'm', label: 'Midterm', lastWeek: 9 },
    { code: 's', label: 'Semi-final', lastWeek: 13 },
    { code: 'f', label: 'Final', lastWeek: 18 },
];

module.exports = { TERM_PERIODS };
