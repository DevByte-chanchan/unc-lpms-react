'use strict';

// The e-signature images of the approvers of one plan, for the syllabus approval block and the
// review record. A signature is included ONLY for an approval that user actually performed:
// the role must currently stand accepted in the workflow log, and the signature belongs to the
// person recorded on that ACCEPTED entry (actor_user_id; older entries fall back to an exact
// name + role match, skipped if ambiguous). Images are decrypted here and returned as data: URIs
// to be embedded in the export; there is no URL that serves them.

const { deriveReviewState, REQUIRED_REVIEWERS } = require('./workflowRules');

const ACCOUNT_ROLE = { LIBRARY_DIRECTOR: 'director-of-libraries', PROGRAM_HEAD: 'program-head', DEAN: 'dean' };

// -> { LIBRARY_DIRECTOR: 'data:image/png;base64,...', ... } for approvers who have one.
const approverSignatures = async ({ logs, findUser, toDataUri }) => {
    const accepted = deriveReviewState(logs).accepted;
    const result = {};
    for (const role of [...REQUIRED_REVIEWERS, 'DEAN']) {
        if (!accepted.has(role)) continue;
        const entry = [...logs].reverse().find(e => e.actor_role === role && ['ACCEPTED', 'APPROVED'].includes(e.action_type));
        if (!entry) continue;
        const user = await findUser({ id: entry.actor_user_id, name: entry.actor_name, accountRole: ACCOUNT_ROLE[role] });
        const dataUri = user ? await toDataUri(user) : null;
        if (dataUri) result[role] = dataUri;
    }
    return result;
};

// The real lookups against the database.
const defaultFindUser = async ({ id, name, accountRole }) => {
    const { User } = require('../models');
    const scope = User.scope('withSecret');
    if (id) return scope.findByPk(id);
    if (!name) return null;
    const matches = await scope.findAll({ where: { name, role: accountRole } });
    return matches.length === 1 ? matches[0] : null;
};

const signaturesForLogs = (logs) => approverSignatures({
    logs,
    findUser: defaultFindUser,
    toDataUri: (user) => require('./signatureStore').readSignatureDataUri(user)
});

module.exports = { approverSignatures, signaturesForLogs, ACCOUNT_ROLE };
