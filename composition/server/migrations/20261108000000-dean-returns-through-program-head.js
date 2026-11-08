'use strict';

// A Dean return now goes to the Program Head, who forwards it to the instructor or counters it back to the
// Dean (utils/workflowRules.js). Two things for that:
//   * AssignmentWorkflowLogs.note: the Program Head's reason when they send a plan back to the Dean.
//   * Plans the Dean returned under the old rule, still waiting on their instructor, stay with that
//     instructor: a FORWARDED row is written right after that return, as if the Program Head had passed it on.
//     Without it the new rule would take those plans away from instructors who are already editing them.
//
// Native ALTER TABLE on purpose: Sequelize's removeColumn rebuilds the table on SQLite, which cascade-deletes
// dependent rows.

const OLD_RULE_NOTE = 'Returned before the Program Head step existed: passed straight to the instructor.';

module.exports = {
    async up(queryInterface) {
        const sequelize = queryInterface.sequelize;
        const [columns] = await sequelize.query('PRAGMA table_info(AssignmentWorkflowLogs)');
        if (!columns.some(column => column.name === 'note')) {
            await sequelize.query('ALTER TABLE AssignmentWorkflowLogs ADD COLUMN note TEXT');
        }

        // Every assignment whose latest decisive event is a Dean return with nothing after it from the instructor.
        const [rows] = await sequelize.query(`
            SELECT l.co_assign_id, l.log_id, l.createdAt
            FROM AssignmentWorkflowLogs l
            WHERE l.actor_role = 'DEAN' AND l.action_type = 'RETURNED'
              AND NOT EXISTS (
                  SELECT 1 FROM AssignmentWorkflowLogs later
                  WHERE later.co_assign_id = l.co_assign_id
                    AND julianday(later.createdAt) >= julianday(l.createdAt) AND later.log_id <> l.log_id
                    AND (later.action_type IN ('SUBMITTED', 'FORWARDED', 'COUNTERED') OR (later.actor_role = 'DEAN'))
              )`);
        for (const row of rows) {
            const at = new Date(new Date(String(row.createdAt).replace(' ', 'T').replace(/ ([+-]\d{2}:\d{2})$/, '$1')).getTime() + 1);
            await sequelize.query(
                `INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, actor_name, action_type, note, createdAt, updatedAt)
                 VALUES (?, 'PROGRAM_HEAD', NULL, 'FORWARDED', ?, ?, ?)`,
                { replacements: [row.co_assign_id, OLD_RULE_NOTE, at.toISOString(), at.toISOString()] });
        }
    },

    async down(queryInterface) {
        const sequelize = queryInterface.sequelize;
        await sequelize.query('DELETE FROM AssignmentWorkflowLogs WHERE action_type = ? AND note = ?', { replacements: ['FORWARDED', OLD_RULE_NOTE] });
        await sequelize.query('ALTER TABLE AssignmentWorkflowLogs DROP COLUMN note');
    }
};
