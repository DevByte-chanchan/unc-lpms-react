// Standalone script: seed AssignmentWorkflowLogs so the Revision Tracker timeline has data.
// Run:  node seeders/seed_workflow_logs.js
//
// For every assignment that has comments, it builds a realistic timeline:
//   ASSIGNED (Program Head) -> SUBMITTED (Instructor) -> RETURNED (each commenting role)
//   -> SUBMITTED (resubmit) -> ACCEPTED (each non-Dean approver) -> ACCEPTED (Dean = Approved).
// The revision controller matches comments to the RETURNED event by commenter_role.
// Idempotent: clears existing logs per assignment first.

const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1', port: 3308, user: 'root', password: 'rootpassword', database: 'lpms_composition',
    });
    const q = async (sql, p) => { const [r] = await conn.query(sql, p); return r; };

    // Ensure the table exists (so no separate migration step is needed).
    await q(`CREATE TABLE IF NOT EXISTS AssignmentWorkflowLogs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        co_assign_id INT NOT NULL,
        actor_role VARCHAR(30) NOT NULL,
        action_type ENUM('ASSIGNED','SUBMITTED','RETURNED','ACCEPTED') NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    const now = Date.now();
    const day = (n) => new Date(now - n * 86400000);

    // Assignments that have comments (co_assign_id + the distinct roles that commented)
    const rows = await q(
        `SELECT co_assign_id, commenter_role, MIN(createdAt) AS firstAt
         FROM Comments WHERE co_assign_id IS NOT NULL
         GROUP BY co_assign_id, commenter_role
         ORDER BY co_assign_id, firstAt`
    );

    const byAssign = {};
    for (const r of rows) {
        (byAssign[r.co_assign_id] = byAssign[r.co_assign_id] || []).push(r.commenter_role);
    }

    const ins = (co, role, action, d) => q(
        `INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [co, role, action, d, d]
    );

    let total = 0;
    for (const [coAssignId, roles] of Object.entries(byAssign)) {
        await q('DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id = ?', [coAssignId]);

        let d = 30;
        await ins(coAssignId, 'Program Head', 'ASSIGNED', day(d)); d -= 4; total++;
        await ins(coAssignId, 'Instructor', 'SUBMITTED', day(d)); d -= 3; total++;

        // one RETURNED event per commenting role (comments attach here by role)
        for (const role of roles) {
            await ins(coAssignId, role, 'RETURNED', day(d)); d -= 2; total++;
        }

        // resubmission + acceptances
        await ins(coAssignId, 'Instructor', 'SUBMITTED', day(d)); d -= 2; total++;
        for (const role of ['Industry Consultant', 'Director of Libraries', 'Program Head']) {
            await ins(coAssignId, role, 'ACCEPTED', day(d)); d -= 1; total++;
        }
        await ins(coAssignId, 'Dean', 'ACCEPTED', day(Math.max(d, 1))); total++;

        console.log(`✓ co_assign_id ${coAssignId}: ${roles.length} return event(s)`);
    }

    console.log(`\nDone. Inserted ${total} workflow log rows across ${Object.keys(byAssign).length} assignments.`);
    await conn.end();
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
