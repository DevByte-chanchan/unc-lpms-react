'use strict';

const EMAILS = {
    instructor: 'monica.norton@unc.edu.ph',
    programHead: 'junar.danila@unc.edu.ph',
    dean: 'agnes.reyes@unc.edu.ph'
};

const loadIds = async queryInterface => {
    const [rows] = await queryInterface.sequelize.query('SELECT user_id, email FROM Users');
    const byEmail = new Map((rows || []).map(row => [String(row.email).toLowerCase(), row.user_id]));
    return {
        instructor: byEmail.get(EMAILS.instructor) ?? null,
        programHead: byEmail.get(EMAILS.programHead) ?? null,
        dean: byEmail.get(EMAILS.dean) ?? null
    };
};

const assignDemoOwnership = async queryInterface => {
    const ids = await loadIds(queryInterface);
    const updates = [
        ['CourseOfferingAssignments', ids.instructor],
        ['Programs', ids.programHead],
        ['Departments', ids.dean]
    ];
    for (const [table, userId] of updates) {
        if (userId == null) continue;
        await queryInterface.sequelize.query(
            `UPDATE ${table} SET stakeholder_id = ? WHERE stakeholder_id IS NULL`,
            { replacements: [userId] }
        );
    }
    return ids;
};

const clearDemoOwnership = async queryInterface => {
    const ids = await loadIds(queryInterface);
    const updates = [
        ['CourseOfferingAssignments', ids.instructor],
        ['Programs', ids.programHead],
        ['Departments', ids.dean]
    ];
    for (const [table, userId] of updates) {
        if (userId == null) continue;
        await queryInterface.sequelize.query(
            `UPDATE ${table} SET stakeholder_id = NULL WHERE CAST(stakeholder_id AS TEXT) = ?`,
            { replacements: [String(userId)] }
        );
    }
};

module.exports = { EMAILS, assignDemoOwnership, clearDemoOwnership };
