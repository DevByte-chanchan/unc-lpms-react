'use strict';

// Which review round a comment belongs to (feature/learning-plan-composition numbers returns the same way):
// round N is the review of the instructor's Nth submission, so a comment written after submission 2 and before
// submission 3 is "round 2". `returned` says whether that round ended in a return; the latest round may still be
// under review. The instructor's comment panel groups by round, newest first, so the latest return's asks come first.

const time = (value) => new Date(value).getTime();

// logs: the plan's effective workflow log; rows: comments with createdAt. -> rows with review_round, review_returned.
const withReviewRounds = (logs = [], rows = []) => {
    const ordered = [...logs].sort((a, b) => time(a.createdAt) - time(b.createdAt));
    const submissions = ordered.filter(l => l.action_type === 'SUBMITTED').map(l => time(l.createdAt));
    const returns = ordered.filter(l => l.action_type === 'RETURNED').map(l => time(l.createdAt));
    // Round r runs from submission r to submission r+1 (or now); it was returned if a return falls inside it.
    const returnedRound = (round) => {
        const start = submissions[round - 1] ?? -Infinity;
        const end = submissions[round] ?? Infinity;
        return returns.some(t => t >= start && t < end);
    };
    return rows.map(row => {
        const at = time(row.createdAt);
        const round = Math.max(1, submissions.filter(t => t <= at).length);
        return { ...row, review_round: round, review_returned: returnedRound(round) };
    });
};

module.exports = { withReviewRounds };
