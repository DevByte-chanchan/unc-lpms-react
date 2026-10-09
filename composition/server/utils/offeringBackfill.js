'use strict';

// Brings existing offerings in line with the revision model:
//   - school_year / semester are read from the course's term text ("1st Semester SY 2026-2027")
//   - approved_at is the Dean's acceptance time from the workflow log
//   - an offering the Dean never approved has no revision number yet (0 = working copy)
//   - a later approved revision records the earlier approved one it was based on
// Idempotent: only fills what is still empty. Run by the migration and again at the end of the
// demo-users seeder (the seeders insert offerings before any log exists to read).

const parseTerm = (text) => {
    const year = /SY\s*(\d{4}\s*-\s*\d{4})/i.exec(String(text || ''));
    const sem = /(1st|2nd|summer)/i.exec(String(text || ''));
    const normalizedSemester = sem ? (/summer/i.test(sem[1]) ? 'Summer' : sem[1].toLowerCase()) : null;
    return { schoolYear: year ? year[1].replace(/\s+/g, '') : null, semester: normalizedSemester };
};

const backfillOfferings = async (queryInterface) => {
    const { sequelize } = queryInterface;
    const select = (sql) => sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
    const run = (sql, replacements = []) => sequelize.query(sql, { replacements });

    const unset = await select(`SELECT pco.pc_offering_id, c.term
                                FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id
                                WHERE pco.school_year IS NULL OR pco.semester IS NULL`);
    for (const row of unset) {
        const { schoolYear, semester } = parseTerm(row.term);
        if (schoolYear || semester) {
            await run('UPDATE ProgramCourseOfferings SET school_year = COALESCE(school_year, ?), semester = COALESCE(semester, ?) WHERE pc_offering_id = ?',
                [schoolYear, semester, row.pc_offering_id]);
        }
    }

    await run(`UPDATE ProgramCourseOfferings
               SET approved_at = (SELECT MAX(l.createdAt) FROM AssignmentWorkflowLogs l
                                  INNER JOIN CourseOfferingAssignments a ON a.co_assign_id = l.co_assign_id
                                  WHERE a.pc_offering_id = ProgramCourseOfferings.pc_offering_id
                                    AND l.actor_role = 'DEAN' AND l.action_type IN ('ACCEPTED', 'APPROVED'))
               WHERE approved_at IS NULL AND carried_from_offering_id IS NULL`);
    await run(`UPDATE ProgramCourseOfferings SET revision_number = 0
               WHERE approved_at IS NULL AND carried_from_offering_id IS NULL AND revision_number <> 0`);

    await run(`UPDATE ProgramCourseOfferings
               SET base_offering_id = (SELECT earlier.pc_offering_id FROM ProgramCourseOfferings earlier
                                       WHERE earlier.course_id = ProgramCourseOfferings.course_id
                                         AND earlier.program_id = ProgramCourseOfferings.program_id
                                         AND earlier.approved_at IS NOT NULL
                                         AND earlier.revision_number < ProgramCourseOfferings.revision_number
                                       ORDER BY earlier.revision_number DESC LIMIT 1)
               WHERE base_offering_id IS NULL AND carried_from_offering_id IS NULL AND approved_at IS NOT NULL AND revision_number > 1`);
};

module.exports = { parseTerm, backfillOfferings };
