'use strict';

const { sequelize } = require('../models');
const { effectiveLogs } = require('../utils/effectiveLogs');
const { signaturesForLogs } = require('../utils/approverSignatures');
const { User, Sequelize } = require('../models');

// Account-role keys, as the syllabus export's approval block uses them.
const CLIENT_KEY = { INSTRUCTOR: 'instructor', LIBRARY_DIRECTOR: 'director-of-libraries', PROGRAM_HEAD: 'program-head', DEAN: 'dean' };

/**
 * GET /api/assignments/offering/:pcId/signatures
 * The approvers' e-signature images for the clean syllabus export. Decrypted here, returned as
 * data: URIs, and only for approvals the signer performed. Missing keys or signatures simply
 * yield fewer entries: an export never fails because of a signature.
 */
async function getOfferingSignatures(req, res, next) {
    try {
        const logs = await effectiveLogs(sequelize, req.courseAccess?.co_assign_id);
        const byRole = await signaturesForLogs(logs);
        const signatures = {};
        for (const [role, dataUri] of Object.entries(byRole)) signatures[CLIENT_KEY[role]] = dataUri;
        // The Industry Consultant's sign-off ("Reviewed by"): the first one on this plan, with their e-signature if any.
        const [signoff] = await sequelize.query(
            'SELECT consultant_user_id, consultant_name, signed_at FROM ConsultantSignoffs WHERE offering_id = ? ORDER BY signed_at ASC LIMIT 1',
            { replacements: [Number(req.courseAccess?.pc_offering_id ?? req.params?.pcId)], type: Sequelize.QueryTypes.SELECT });
        let consultant = null;
        if (signoff) {
            consultant = { name: signoff.consultant_name, signedAt: new Date(signoff.signed_at).toISOString() };
            const user = await User.scope('withSecret').findByPk(signoff.consultant_user_id);
            const dataUri = user ? await require('../utils/signatureStore').readSignatureDataUri(user).catch(() => null) : null;
            if (dataUri) signatures['industry-consultant'] = dataUri;
        }
        res.set('Cache-Control', 'no-store');
        return res.json({ signatures, consultant });
    } catch (err) {
        return next(err);
    }
}

module.exports = { getOfferingSignatures };
