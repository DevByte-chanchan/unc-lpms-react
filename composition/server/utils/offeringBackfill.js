'use strict';

// Brings existing offerings in line with the revision model:
//   - school_year / semester are read from the course's term text ("1st Semester SY 2026-2027")
//   - approved_at is the Dean's acceptance time from the workflow log
//   - an offering the Dean never approved has no revision number yet (0 = working copy)
//   - a later approved revision records the earlier approved one it was based on
// Idempotent: only fills what is still empty. Run by the migration and again at the end of the
// demo-users seeder (the seeders insert offerings before any log exists to read).
//
// OLD DATA WITH SEVERAL OFFERINGS PER COURSE AND PROGRAM. Before this model a course could hold
// several revisions that all share the course's one term text. Two rules of the model would then
// collide (see the indexes in the migration), so the backfill settles them without losing a row:
//   - several approved revisions of one course and program that read the same term: the latest
//     approved one keeps the term, each superseded one is left with no term (an unknown term is
//     true; a copied one would break "one new approved revision per term"). Never overwritten later.
//   - several unapproved offerings of one course and program: the newest becomes the working copy
//     (revision number 0); older ones keep the revision number they already had.
// What cannot be settled safely (two unapproved offerings that both have no revision number) is
// reported by findIndexConflicts() with the course and offering ids, so the migration can stop
// with a message saying what to do instead of failing on a SQL constraint.

const parseTerm = (text) => {
    const year = /SY\s*(\d{4}\s*-\s*\d{4})/i.exec(String(text || ''));
    const sem = /(1st|2nd|summer)/i.exec(String(text || ''));
    const normalizedSemester = sem ? (/summer/i.test(sem[1]) ? 'Summer' : sem[1].toLowerCase()) : null;
    return { schoolYear: year ? year[1].replace(/\s+/g, '') : null, semester: normalizedSemester };
};

const backfillOfferings = async (queryInterface) => {
    const { sequelize } = queryInterface;
    const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
    const run = (sql, replacements = []) => sequelize.query(sql, { replacements });

    const unset = await select(`SELECT pco.pc_offering_id, c.term
                                FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id
                                WHERE pco.school_year IS NULL OR pco.semester IS NULL`);
    for (const row of unset) {
        const { schoolYear, semester } = parseTerm(row.term);
        if (schoolYear || semester) {
            // Never give an approved revision a term that another approved revision of the same
            // course and program already holds (that is the superseded-revision case above).
            await run(`UPDATE ProgramCourseOfferings SET school_year = COALESCE(school_year, ?), semester = COALESCE(semester, ?)
                       WHERE pc_offering_id = ?
                         AND NOT (approved_at IS NOT NULL AND carried_from_offering_id IS NULL AND EXISTS (
                             SELECT 1 FROM ProgramCourseOfferings other
                             WHERE other.pc_offering_id <> ProgramCourseOfferings.pc_offering_id
                               AND other.course_id = ProgramCourseOfferings.course_id
                               AND other.program_id = ProgramCourseOfferings.program_id
                               AND other.approved_at IS NOT NULL AND other.carried_from_offering_id IS NULL
                               AND other.school_year = COALESCE(ProgramCourseOfferings.school_year, ?)
                               AND other.semester = COALESCE(ProgramCourseOfferings.semester, ?)))`,
                [schoolYear, semester, row.pc_offering_id, schoolYear, semester]);
        }
    }

    await run(`UPDATE ProgramCourseOfferings
               SET approved_at = (SELECT MAX(l.createdAt) FROM AssignmentWorkflowLogs l
                                  INNER JOIN CourseOfferingAssignments a ON a.co_assign_id = l.co_assign_id
                                  WHERE a.pc_offering_id = ProgramCourseOfferings.pc_offering_id
                                    AND l.actor_role = 'DEAN' AND l.action_type IN ('ACCEPTED', 'APPROVED'))
               WHERE approved_at IS NULL AND carried_from_offering_id IS NULL`);

    // Superseded approved revisions that now share a term with a later one: clear their term.
    const sameTerm = await select(`SELECT course_id, program_id, school_year, semester FROM ProgramCourseOfferings
                                   WHERE approved_at IS NOT NULL AND carried_from_offering_id IS NULL
                                     AND school_year IS NOT NULL AND semester IS NOT NULL
                                   GROUP BY course_id, program_id, school_year, semester HAVING COUNT(*) > 1`);
    for (const group of sameTerm) {
        const rows = await select(`SELECT pc_offering_id FROM ProgramCourseOfferings
                                   WHERE course_id = ? AND program_id = ? AND school_year = ? AND semester = ?
                                     AND approved_at IS NOT NULL AND carried_from_offering_id IS NULL
                                   ORDER BY approved_at DESC, revision_number DESC, pc_offering_id DESC`,
            [group.course_id, group.program_id, group.school_year, group.semester]);
        for (const superseded of rows.slice(1)) {
            await run('UPDATE ProgramCourseOfferings SET school_year = NULL, semester = NULL WHERE pc_offering_id = ?', [superseded.pc_offering_id]);
        }
        console.warn(`Offerings ${rows.slice(1).map(r => r.pc_offering_id).sort((a, b) => a - b).join(', ')} are superseded approved revisions of the same course and program as ${rows[0].pc_offering_id}; their term was cleared so each term has one new approved revision.`);
    }

    // The newest unapproved offering per course and program is the working copy (no revision number yet).
    await run(`UPDATE ProgramCourseOfferings SET revision_number = 0
               WHERE approved_at IS NULL AND carried_from_offering_id IS NULL AND revision_number <> 0
                 AND NOT EXISTS (SELECT 1 FROM ProgramCourseOfferings newer
                                 WHERE newer.course_id = ProgramCourseOfferings.course_id
                                   AND newer.program_id = ProgramCourseOfferings.program_id
                                   AND newer.approved_at IS NULL AND newer.carried_from_offering_id IS NULL
                                   AND newer.pc_offering_id > ProgramCourseOfferings.pc_offering_id)`);

    await run(`UPDATE ProgramCourseOfferings
               SET base_offering_id = (SELECT earlier.pc_offering_id FROM ProgramCourseOfferings earlier
                                       WHERE earlier.course_id = ProgramCourseOfferings.course_id
                                         AND earlier.program_id = ProgramCourseOfferings.program_id
                                         AND earlier.approved_at IS NOT NULL
                                         AND earlier.revision_number < ProgramCourseOfferings.revision_number
                                       ORDER BY earlier.revision_number DESC LIMIT 1)
               WHERE base_offering_id IS NULL AND carried_from_offering_id IS NULL AND approved_at IS NOT NULL AND revision_number > 1`);
};

// What would still stop the two unique indexes from being created. Empty when the data is fine.
// Each entry: { rule, course, program, offeringIds }.
const findIndexConflicts = async (queryInterface) => {
    const { sequelize } = queryInterface;
    const select = (sql) => sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
    const named = (rows, rule) => rows.map(row => ({
        rule, course: row.course_no, program: row.program_name, offeringIds: String(row.ids).split(',').map(Number).sort((a, b) => a - b)
    }));

    const workingCopies = await select(`SELECT c.course_no, p.name AS program_name, GROUP_CONCAT(pco.pc_offering_id) AS ids
                                        FROM ProgramCourseOfferings pco
                                            INNER JOIN Courses c ON c.course_id = pco.course_id
                                            INNER JOIN Programs p ON p.program_id = pco.program_id
                                        WHERE pco.approved_at IS NULL AND pco.carried_from_offering_id IS NULL AND pco.revision_number = 0
                                        GROUP BY pco.course_id, pco.program_id HAVING COUNT(*) > 1`);
    const terms = await select(`SELECT c.course_no, p.name AS program_name, GROUP_CONCAT(pco.pc_offering_id) AS ids
                                FROM ProgramCourseOfferings pco
                                    INNER JOIN Courses c ON c.course_id = pco.course_id
                                    INNER JOIN Programs p ON p.program_id = pco.program_id
                                WHERE pco.approved_at IS NOT NULL AND pco.carried_from_offering_id IS NULL
                                  AND pco.school_year IS NOT NULL AND pco.semester IS NOT NULL
                                GROUP BY pco.course_id, pco.program_id, pco.school_year, pco.semester HAVING COUNT(*) > 1`);
    return [...named(workingCopies, 'working-copy'), ...named(terms, 'term')];
};

const describeConflicts = (conflicts) => {
    const lines = conflicts.map(c => (c.rule === 'working-copy'
        ? `  - ${c.course} (${c.program}): offerings ${c.offeringIds.join(', ')} are all unapproved and have no revision number. Only one working copy per course and program is allowed.`
        : `  - ${c.course} (${c.program}): offerings ${c.offeringIds.join(', ')} are approved for the same term. Only one new approved revision per term is allowed.`));
    return [
        'The offering migration cannot finish: older data has several offerings for the same course and program that the new term rules do not allow.',
        ...lines,
        'What to do: keep one offering for each course and program listed (delete the extra unapproved ones, or give each approved one its own term),',
        'then run the migration again. Nothing was lost and the migration is safe to run repeatedly.'
    ].join('\n');
};

module.exports = { parseTerm, backfillOfferings, findIndexConflicts, describeConflicts };
