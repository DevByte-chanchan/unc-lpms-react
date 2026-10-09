'use strict';

// The Privacy Notice shown at /privacy and accepted at registration.
//
// It describes only what this system really does today. Change PRIVACY_NOTICE_VERSION whenever the
// text changes in a way people should accept again; the version a person accepted is stored with
// their account. This is a working draft written from the code, not legal advice: the university's
// Data Protection Officer should review it before it is relied on (Republic Act 10173).
//
// The DPO contact comes from the environment (LPMS_DPO_NAME, LPMS_DPO_EMAIL), never from code.

const PRIVACY_NOTICE_VERSION = '2026-10-09';

const SECTIONS = Object.freeze([
    {
        title: 'What the system keeps about you',
        items: [
            'Your name, institutional e-mail address and role.',
            'Your password, stored only as a salted one-way hash. Nobody, including administrators, can read it.',
            'If you upload one, your e-signature image, stored encrypted. It is shown back only to you, and printed only on exports of learning plans you approved.',
            'Records of what you do: signing in and out, password changes, account changes made by an administrator, the learning plans you submit, review, approve or return, and the comments you write, each with your name, role and the time.',
            'Notifications addressed to you.'
        ]
    },
    {
        title: 'Why',
        items: [
            'To let you sign in and take part in the learning plan process for your role.',
            'To keep a trustworthy record of who reviewed and approved each learning plan, which the university may need for accreditation and quality audits.',
            'To keep the system secure, by recording sign-ins and account changes.'
        ]
    },
    {
        title: 'Who can see it',
        items: [
            'Other LPMS users see your name and role next to the plans, approvals and comments you take part in.',
            'System administrators can see the account list and the activity record, and can deactivate an account. They cannot see passwords.',
            'The system does not sell or share your data with anyone outside the university. If e-mail is set up, the university\'s mail service sends you account and password-reset messages.'
        ]
    },
    {
        title: 'How long it is kept',
        items: [
            'A sign-in session lasts at most 8 hours.',
            'Notifications you have read are deleted automatically after 90 days.',
            'Accounts are deactivated, not erased, because approvals and comments must keep their author. Approval, comment and activity records are kept; there is no automatic deletion of them yet.'
        ]
    },
    {
        title: 'Your rights',
        items: [
            'Under the Data Privacy Act of 2012 (RA 10173) you may ask to see the data held about you, to have it corrected, and to object to or ask for the blocking or removal of data that is no longer needed.',
            'The system has no self-service export or erasure yet. Send your request to the Data Protection Officer below, and it will be handled by hand.'
        ]
    }
]);

const privacyNotice = (env = process.env) => {
    const email = String(env.LPMS_DPO_EMAIL || '').trim();
    return {
        version: PRIVACY_NOTICE_VERSION,
        dpo: {
            name: String(env.LPMS_DPO_NAME || '').trim(),
            email,
            configured: email !== ''
        },
        sections: SECTIONS
    };
};

module.exports = { PRIVACY_NOTICE_VERSION, privacyNotice };
