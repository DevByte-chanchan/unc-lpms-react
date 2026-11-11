'use strict';

// Comment notifications written before they remembered their comment (20261118000000): work it out, so opening an
// older one also jumps to the comment and the item it names.
//   comment_added     the latest comment by that role on that plan, written at or before the notification
//   comment_resolved  the recipient's own comment on that plan resolved at or before the notification (the latest)
// A notification is written just after its comment (milliseconds), so "at or before" needs no slack, and none is
// allowed: comments written a few milliseconds apart must not swap.
module.exports = {
    async up(queryInterface) {
        const run = (sql) => queryInterface.sequelize.query(sql);
        await run(`
            UPDATE Notifications SET comment_id = (
                SELECT c.comment_id FROM Comments c
                    INNER JOIN CourseOfferingAssignments a ON a.co_assign_id = c.co_assign_id
                WHERE a.pc_offering_id = Notifications.offering_id
                  AND c.commenter_role = Notifications.actor_role
                  AND julianday(c.createdAt) <= julianday(Notifications.created_at)
                ORDER BY julianday(c.createdAt) DESC, c.comment_id DESC LIMIT 1)
            WHERE type = 'comment_added' AND comment_id IS NULL AND offering_id IS NOT NULL`);
        await run(`
            UPDATE Notifications SET comment_id = (
                SELECT c.comment_id FROM Comments c
                    INNER JOIN CourseOfferingAssignments a ON a.co_assign_id = c.co_assign_id
                WHERE a.pc_offering_id = Notifications.offering_id
                  AND c.commenter_user_id = Notifications.recipient_user_id
                  AND c.resolved_status = 1 AND c.resolved_date IS NOT NULL
                  AND julianday(c.resolved_date) <= julianday(Notifications.created_at)
                ORDER BY julianday(c.resolved_date) DESC, c.comment_id ASC LIMIT 1)
            WHERE type = 'comment_resolved' AND comment_id IS NULL AND offering_id IS NOT NULL`);
    },

    async down() {
        // The ids were worked out, not recorded: nothing to undo.
    }
};
