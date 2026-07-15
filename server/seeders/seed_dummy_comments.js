// Standalone script: seed dummy approver comments for the Returned demo courses.
// Run:  node seeders/seed_dummy_comments.js
// Inserts real Comments (+ CommentTargets) targeting each ILO's references / topics / tlas,
// so the instructor's Returned view shows comments under their targets with red badges.
// Idempotent: clears existing comments for those ILOs first.

const mysql = require('mysql2/promise');

// Returned tab + Approved tab (Approved courses show the Revision Tracker, so they need history too)
const COURSES = ['BSCS515', 'BIT304', 'BSCS508', 'IT 402', 'IT 411', 'BIT203', 'BSCS504', 'IT 305'];
const ROLES = ['Industry Consultant', 'Director of Libraries', 'Program Head', 'Dean'];

const MSG = {
  references: [
    'Please add a more recent edition; the current one predates the latest CMO.',
    'Reference is appropriate, but include the ISBN and publication year for completeness.',
    'Consider adding an open educational resource to complement this textbook.',
    'Verify that this reference is available in the library catalog.',
  ],
  topics: [
    'This topic needs clearer subtopics aligned with the intended learning outcome.',
    'Recommend sequencing this topic earlier to build foundational understanding.',
    'The scope of this topic is too broad — split it into two focused sessions.',
    'Add real-world case studies under this topic to improve engagement.',
  ],
  tlas: [
    'Specify whether this activity is performed in-class or as homework.',
    'This activity should include a rubric so assessment is transparent.',
    'Balance the lecture with a hands-on laboratory component here.',
    'Clarify the expected student output for this teaching activity.',
  ],
};

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3308, user: 'root', password: 'rootpassword', database: 'lpms_composition',
  });
  const q = async (sql, p) => { const [r] = await conn.query(sql, p); return r; };

  let total = 0;
  for (const code of COURSES) {
    const [course] = await q('SELECT course_id FROM Courses WHERE course_no = ? LIMIT 1', [code]);
    if (!course) { console.log(`- skip ${code} (course not found)`); continue; }
    const [pco] = await q('SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ? ORDER BY pc_offering_id LIMIT 1', [course.course_id]);
    if (!pco) { console.log(`- skip ${code} (no offering)`); continue; }
    const [assign] = await q('SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ? ORDER BY co_assign_id LIMIT 1', [pco.pc_offering_id]);
    const coAssignId = assign ? assign.co_assign_id : null;

    const cos = await q('SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ? ORDER BY co_id', [pco.pc_offering_id]);
    const coIds = cos.map((x) => x.co_id);
    if (!coIds.length) { console.log(`- skip ${code} (no course outcomes)`); continue; }

    const ilos = await q('SELECT ilo_id, co_id FROM IntendedLearningOutcomes WHERE co_id IN (?) ORDER BY co_id, ilo_id', [coIds]);
    const iloIds = ilos.map((i) => i.ilo_id);

    // Idempotent cleanup for these ILOs
    if (iloIds.length) {
      const existing = await q('SELECT comment_id FROM Comments WHERE ilo_id IN (?)', [iloIds]);
      const ids = existing.map((e) => e.comment_id);
      if (ids.length) {
        await q('DELETE FROM CommentTargets WHERE comment_id IN (?)', [ids]);
        await q('DELETE FROM Comments WHERE comment_id IN (?)', [ids]);
      }
    }

    let roleIdx = 0;
    let perCourse = 0;
    for (const ilo of ilos) {
      const refs = await q('SELECT reference_id FROM ILOReferences WHERE ilo_id = ? LIMIT 1', [ilo.ilo_id]);
      const tops = await q('SELECT topic_id FROM ILOTopics WHERE ilo_id = ? LIMIT 1', [ilo.ilo_id]);
      const tlas = await q(
        'SELECT tt.tla_id FROM ILOTopics it JOIN TopicTLAs tt ON tt.ilo_topic_id = it.ilo_topic_id WHERE it.ilo_id = ? LIMIT 1',
        [ilo.ilo_id]
      );

      const targets = [];
      if (refs[0]) targets.push(['references', refs[0].reference_id]);
      if (tops[0]) targets.push(['topics', tops[0].topic_id]);
      if (tlas[0]) targets.push(['tlas', tlas[0].tla_id]);

      for (const [type, tid] of targets) {
        const role = ROLES[roleIdx % ROLES.length]; roleIdx++;
        const msg = MSG[type][(ilo.ilo_id + tid) % MSG[type].length];
        const res = await q(
          `INSERT INTO Comments (commenter_role, message, resolved_status, ilo_id, comment_for, target_id, co_assign_id, createdAt, updatedAt)
           VALUES (?, ?, false, ?, ?, ?, ?, NOW(), NOW())`,
          [role, msg, ilo.ilo_id, type, tid, coAssignId]
        );
        await q('INSERT INTO CommentTargets (comment_id, target_id, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())', [res.insertId, tid]);
        total++; perCourse++;
      }
    }
    console.log(`✓ ${code}: ${perCourse} comments across ${ilos.length} ILOs`);
  }

  console.log(`\nDone. Inserted ${total} dummy approver comments.`);
  await conn.end();
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
