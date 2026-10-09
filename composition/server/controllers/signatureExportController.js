'use strict';

const { sequelize } = require('../models');
const { effectiveLogs } = require('../utils/effectiveLogs');
const { signaturesForLogs } = require('../utils/approverSignatures');

// Account-role keys, as the syllabus export's approval block uses them.
const CLIENT_KEY = { LIBRARY_DIRECTOR: 'director-of-libraries', PROGRAM_HEAD: 'program-head', DEAN: 'dean' };

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
        res.set('Cache-Control', 'no-store');
        return res.json({ signatures });
    } catch (err) {
        return next(err);
    }
}

module.exports = { getOfferingSignatures };
