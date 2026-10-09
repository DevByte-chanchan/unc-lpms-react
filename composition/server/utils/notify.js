'use strict';

// Writes in-app notifications. `notify` NEVER throws into its caller: a notification is a side
// effect of the real action, and a failure here must not undo or fail it. It logs one console
// line instead.
//
// Message text may contain only the course code, the action and the actor's role. Build it with
// eventMessage(); never put comment text, names or other personal data in it.

const TYPES = Object.freeze([
    'plan_submitted', 'plan_returned', 'plan_ready_for_dean', 'plan_approved',
    'comment_added', 'comment_resolved', 'course_assigned', 'revision_started', 'poke'
]);

// Both vocabularies: workflow roles (log entries) and account roles.
const ROLE_LABEL = Object.freeze({
    INSTRUCTOR: 'Instructor', LIBRARY_DIRECTOR: 'Director of Libraries', PROGRAM_HEAD: 'Program Head',
    DEAN: 'Dean', INDUSTRY_CONSULTANT: 'Industry Consultant',
    instructor: 'Instructor', 'director-of-libraries': 'Director of Libraries', 'program-head': 'Program Head',
    dean: 'Dean', 'industry-consultant': 'Industry Consultant', vpaa: 'VPAA', superuser: 'Superuser'
});

const MAX_MESSAGE = 200;

// "BIT321L — submitted for review by Instructor"
const eventMessage = (courseCode, action, actorRole) => {
    const code = String(courseCode || '').replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, 30) || 'A course';
    const by = ROLE_LABEL[actorRole] ? ` by ${ROLE_LABEL[actorRole]}` : '';
    return `${code} — ${action}${by}`.slice(0, MAX_MESSAGE);
};

const lazyModel = () => require('../models').Notification;

const createNotifier = ({ getModel = lazyModel, log = (...args) => console.error(...args) } = {}) => {
    // Resolves to the number of notifications written (0 on any failure).
    const notify = async (recipientIds, type, offeringId, message, actorRole) => {
        try {
            if (!TYPES.includes(type)) throw new Error(`unknown notification type "${type}"`);
            const ids = [...new Set((recipientIds || []).map(Number).filter(id => Number.isSafeInteger(id) && id > 0))];
            if (ids.length === 0) return 0;
            await getModel().bulkCreate(ids.map(id => ({
                recipient_user_id: id,
                type,
                offering_id: offeringId ?? null,
                message: String(message).slice(0, MAX_MESSAGE),
                actor_role: actorRole ?? null,
                is_read: false
            })));
            return ids.length;
        } catch (error) {
            log(`Notification (${type}) not written, the action continues: ${error.message}`);
            return 0;
        }
    };
    return { notify };
};

const notifier = createNotifier();

module.exports = { TYPES, ROLE_LABEL, eventMessage, createNotifier, notify: notifier.notify };
