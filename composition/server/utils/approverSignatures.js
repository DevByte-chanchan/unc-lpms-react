'use strict';

// The e-signature images on one plan's signature block (syllabus export) and review record. A signature is
// included ONLY for a step that person actually performed:
//   INSTRUCTOR ("Prepared by")         the one who made the latest submission
//   LIBRARY_DIRECTOR, PROGRAM_HEAD     the reviewer whose acceptance currently stands
//   DEAN ("Noted by")                  the Dean whose approval stands
// The person is the one recorded on that log entry (actor_user_id; older entries fall back to an exact name
// match among the accounts holding the role, skipped if ambiguous). Images are decrypted here and returned as
// data: URIs to be embedded in the export; there is no URL that serves them.

const { deriveReviewState, REQUIRED_REVIEWERS } = require('./workflowRules');

const ACCOUNT_ROLE = { INSTRUCTOR: 'instructor', LIBRARY_DIRECTOR: 'director-of-libraries', PROGRAM_HEAD: 'program-head', DEAN: 'dean' };

const latest = (logs, role, actions) => [...logs].reverse().find(e => e.actor_role === role && actions.includes(e.action_type));

// -> { INSTRUCTOR: 'data:image/png;base64,...', LIBRARY_DIRECTOR: ..., ... } for those who have one.
const approverSignatures = async ({ logs, findUser, toDataUri }) => {
    const state = deriveReviewState(logs);
    const entries = {};
    if (state.submitted) entries.INSTRUCTOR = latest(logs, 'INSTRUCTOR', ['SUBMITTED']);
    for (const role of [...REQUIRED_REVIEWERS, 'DEAN']) {
        if (state.accepted.has(role)) entries[role] = latest(logs, role, ['ACCEPTED', 'APPROVED']);
    }
    const result = {};
    for (const [role, entry] of Object.entries(entries)) {
        if (!entry) continue;
        const user = await findUser({ id: entry.actor_user_id, name: entry.actor_name, accountRole: ACCOUNT_ROLE[role] });
        const dataUri = user ? await toDataUri(user) : null;
        if (dataUri) result[role] = dataUri;
    }
    return result;
};

// The real lookups against the database. An account can hold several roles (Users.roles).
const defaultFindUser = async ({ id, name, accountRole }) => {
    const { User } = require('../models');
    const scope = User.scope('withSecret');
    if (id) return scope.findByPk(id);
    if (!name) return null;
    const matches = (await scope.findAll({ where: { name } }))
        .filter(user => (user.roles || [user.role]).includes(accountRole));
    return matches.length === 1 ? matches[0] : null;
};

const signaturesForLogs = (logs) => approverSignatures({
    logs,
    findUser: defaultFindUser,
    toDataUri: (user) => require('./signatureStore').readSignatureDataUri(user)
});

module.exports = { approverSignatures, signaturesForLogs, ACCOUNT_ROLE };
