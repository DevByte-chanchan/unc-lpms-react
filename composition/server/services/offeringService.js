'use strict';

// Terms and revisions of a course offering.
//
//   - The Program Head assigns a course to a lead instructor for a term. If the course
//     already has an approved syllabus, the assignment carries it over automatically:
//     a copy with the SAME revision number and identical content, marked carried over.
//   - The assigned lead instructor starts a revision from an approved syllabus: a working
//     copy with no revision number yet.
//   - The revision number is assigned only when the Dean accepts: last approved + 1.
//   - Per course and program: one working copy at a time, and at most one new approved
//     revision per term (a carry-over is not a new revision).
//
// A carried-over or revised offering gets its own full copy of the content (outcomes, ILOs,
// topics, TLAs, assessments, references), so it can never be edited through the approved
// original; the original and the carry-over stay locked, and a change goes through a revision.

const { sequelize } = require('../models');
const { effectiveLogs } = require('../utils/effectiveLogs');
const { planEditState } = require('../utils/workflowRules');

const SEMESTERS = ['1st', '2nd', 'Summer'];

class ServiceError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

const select = (sql, replacements, transaction) =>
    sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT, transaction });

const insert = async (table, row, transaction) => {
    const columns = Object.keys(row);
    const [id] = await sequelize.query(
        `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')});`,
        { replacements: columns.map(c => row[c]), type: sequelize.QueryTypes.INSERT, transaction });
    return id;
};

const validTerm = (schoolYear, semester) => {
    const match = /^(\d{4})-(\d{4})$/.exec(String(schoolYear || ''));
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
        throw new ServiceError(400, 'School year must look like 2026-2027.');
    }
    if (!SEMESTERS.includes(semester)) throw new ServiceError(400, 'Semester must be 1st, 2nd or Summer.');
};

// ---- content copy -------------------------------------------------------------------

// Copies a row set into `table`, dropping its primary key and applying overrides. Returns old id -> new id.
const copyRows = async (table, pk, rows, overrides, now, transaction) => {
    const ids = new Map();
    for (const row of rows) {
        const copy = { ...row, ...overrides(row), createdAt: now, updatedAt: now };
        delete copy[pk];
        ids.set(row[pk], await insert(table, copy, transaction));
    }
    return ids;
};

const cloneOfferingContent = async (sourceId, targetId, now, transaction) => {
    const outcomes = await select('SELECT * FROM CourseOutcomes WHERE pc_offering_id = ? ORDER BY co_id', [sourceId], transaction);
    const coIds = await copyRows('CourseOutcomes', 'co_id', outcomes, () => ({ pc_offering_id: targetId }), now, transaction);
    if (outcomes.length === 0) return;
    const coList = outcomes.map(co => co.co_id);
    const marks = (list) => list.map(() => '?').join(', ');

    const alignments = await select(`SELECT * FROM ProgramOutcomeAlignments WHERE co_id IN (${marks(coList)})`, coList, transaction);
    await copyRows('ProgramOutcomeAlignments', 'po_alignment_id', alignments, r => ({ co_id: coIds.get(r.co_id) }), now, transaction);

    const ilos = await select(`SELECT * FROM IntendedLearningOutcomes WHERE co_id IN (${marks(coList)}) ORDER BY ilo_id`, coList, transaction);
    const iloIds = await copyRows('IntendedLearningOutcomes', 'ilo_id', ilos, r => ({ co_id: coIds.get(r.co_id) }), now, transaction);
    if (ilos.length === 0) return;
    const iloList = ilos.map(ilo => ilo.ilo_id);

    // Topics are copied too, so editing a revision's topic never changes the approved original.
    const iloTopics = await select(`SELECT * FROM ILOTopics WHERE ilo_id IN (${marks(iloList)}) ORDER BY ilo_topic_id`, iloList, transaction);
    const topicList = [...new Set(iloTopics.map(it => it.topic_id))];
    let topicIds = new Map();
    if (topicList.length) {
        const topics = await select(`SELECT * FROM Topics WHERE topic_id IN (${marks(topicList)}) ORDER BY topic_id`, topicList, transaction);
        topicIds = await copyRows('Topics', 'topic_id', topics, () => ({}), now, transaction);
        const subtopics = await select(`SELECT * FROM Subtopics WHERE topic_id IN (${marks(topicList)}) ORDER BY subtopic_id`, topicList, transaction);
        await copyRows('Subtopics', 'subtopic_id', subtopics, r => ({ topic_id: topicIds.get(r.topic_id) }), now, transaction);
    }
    const iloTopicIds = await copyRows('ILOTopics', 'ilo_topic_id', iloTopics,
        r => ({ ilo_id: iloIds.get(r.ilo_id), topic_id: topicIds.get(r.topic_id) }), now, transaction);

    const iloTopicList = iloTopics.map(it => it.ilo_topic_id);
    if (iloTopicList.length) {
        const topicTlas = await select(`SELECT * FROM TopicTLAs WHERE ilo_topic_id IN (${marks(iloTopicList)}) ORDER BY topic_tla_id`, iloTopicList, transaction);
        const tlaList = [...new Set(topicTlas.map(tt => tt.tla_id))];
        if (tlaList.length) {
            const tlas = await select(`SELECT * FROM TeachingAndLearningActivities WHERE tla_id IN (${marks(tlaList)}) ORDER BY tla_id`, tlaList, transaction);
            const tlaIds = await copyRows('TeachingAndLearningActivities', 'tla_id', tlas, () => ({}), now, transaction);
            const assessments = await select(`SELECT * FROM TLAAssessments WHERE tla_id IN (${marks(tlaList)}) ORDER BY method_id`, tlaList, transaction);
            await copyRows('TLAAssessments', 'method_id', assessments, r => ({ tla_id: tlaIds.get(r.tla_id) }), now, transaction);
            await copyRows('TopicTLAs', 'topic_tla_id', topicTlas,
                r => ({ ilo_topic_id: iloTopicIds.get(r.ilo_topic_id), tla_id: tlaIds.get(r.tla_id) }), now, transaction);
        }
    }

    // References live in the shared library; only the link to each ILO is copied.
    const references = await select(`SELECT * FROM ILOReferences WHERE ilo_id IN (${marks(iloList)}) ORDER BY ilo_reference_id`, iloList, transaction);
    await copyRows('ILOReferences', 'ilo_reference_id', references, r => ({ ilo_id: iloIds.get(r.ilo_id) }), now, transaction);
};

// ---- queries -------------------------------------------------------------------------

const latestApproved = async (courseId, programId, transaction) => {
    const [row] = await select(
        `SELECT * FROM ProgramCourseOfferings WHERE course_id = ? AND program_id = ? AND revision_number > 0
         ORDER BY revision_number DESC, pc_offering_id DESC LIMIT 1`, [courseId, programId], transaction);
    return row || null;
};

const workingCopyOf = async (courseId, programId, transaction) => {
    const [row] = await select(
        `SELECT pc_offering_id FROM ProgramCourseOfferings
         WHERE course_id = ? AND program_id = ? AND approved_at IS NULL AND carried_from_offering_id IS NULL AND revision_number = 0`,
        [courseId, programId], transaction);
    return row || null;
};

const termLabel = (offering) => `${offering.school_year} ${offering.semester} semester`;

// ---- Program Head: assign a course for a term -----------------------------------------

const assignCourseForTerm = async ({ courseId, programId, schoolYear, semester, instructorUserId, user }) => {
    validTerm(schoolYear, semester);
    const now = new Date();
    return sequelize.transaction({ type: 'IMMEDIATE' }, async (transaction) => {
        const [program] = await select('SELECT * FROM Programs WHERE program_id = ?', [programId], transaction);
        const [course] = await select('SELECT * FROM Courses WHERE course_id = ?', [courseId], transaction);
        if (!program || !course) throw new ServiceError(404, 'Course or program not found.');
        if (String(program.stakeholder_id) !== String(user.id)) {
            throw new ServiceError(403, 'Only the head of this program can assign its courses.');
        }
        const [instructor] = await select('SELECT user_id, name, role, is_active FROM Users WHERE user_id = ?', [instructorUserId], transaction);
        if (!instructor || instructor.role !== 'instructor' || instructor.is_active === 0) {
            throw new ServiceError(400, 'The lead instructor must be an active instructor account.');
        }

        const [sameTerm] = await select(
            `SELECT pc_offering_id FROM ProgramCourseOfferings
             WHERE course_id = ? AND program_id = ? AND school_year = ? AND semester = ?`,
            [courseId, programId, schoolYear, semester], transaction);
        if (sameTerm) throw new ServiceError(409, `This course is already assigned for ${schoolYear} ${semester} semester (offering ${sameTerm.pc_offering_id}).`);

        const source = await latestApproved(courseId, programId, transaction);
        if (!source) {
            const working = await workingCopyOf(courseId, programId, transaction);
            if (working) throw new ServiceError(409, `This course already has a working copy (offering ${working.pc_offering_id}); only one at a time.`);
        }

        const offeringId = await insert('ProgramCourseOfferings', {
            revision_number: source ? source.revision_number : 0,
            course_id: courseId,
            program_id: programId,
            dept_id: source ? source.dept_id : program.dept_id,
            course_description: source ? source.course_description : course.course_title,
            school_year: schoolYear,
            semester,
            carried_from_offering_id: source ? source.pc_offering_id : null,
            createdAt: now, updatedAt: now,
        }, transaction);
        const assignmentId = await insert('CourseOfferingAssignments', {
            pc_offering_id: offeringId, stakeholder_id: String(instructorUserId), date_assigned: now, createdAt: now, updatedAt: now,
        }, transaction);
        await insert('AssignmentWorkflowLogs', {
            co_assign_id: assignmentId, actor_role: 'PROGRAM_HEAD', actor_name: user.name || null, action_type: 'ASSIGNED', createdAt: now, updatedAt: now,
        }, transaction);
        if (source) await cloneOfferingContent(source.pc_offering_id, offeringId, now, transaction);

        return { offeringId, assignmentId, carriedOver: !!source, revision: source ? source.revision_number : null };
    });
};

// ---- lead instructor: start a revision --------------------------------------------------

const startRevision = async ({ offeringId, user }) => {
    const now = new Date();
    return sequelize.transaction({ type: 'IMMEDIATE' }, async (transaction) => {
        const [source] = await select('SELECT * FROM ProgramCourseOfferings WHERE pc_offering_id = ?', [offeringId], transaction);
        if (!source) throw new ServiceError(404, 'Offering not found.');
        const [assignment] = await select('SELECT * FROM CourseOfferingAssignments WHERE pc_offering_id = ?', [offeringId], transaction);
        if (!assignment || String(assignment.stakeholder_id) !== String(user.id)) {
            throw new ServiceError(403, 'Only the lead instructor assigned to this course can start a revision.');
        }
        const logs = await effectiveLogs(sequelize, assignment.co_assign_id, transaction);
        if (planEditState(logs).state !== 'Approved') {
            throw new ServiceError(409, 'Only an approved syllabus can be revised.');
        }

        const latest = await latestApproved(source.course_id, source.program_id, transaction);
        if (latest && latest.revision_number > source.revision_number) {
            throw new ServiceError(409, `Revise from the latest approved revision (Rev ${latest.revision_number}), not Rev ${source.revision_number}.`);
        }
        const working = await workingCopyOf(source.course_id, source.program_id, transaction);
        if (working) throw new ServiceError(409, `This course already has a working copy (offering ${working.pc_offering_id}); only one at a time.`);

        const [approvedThisTerm] = await select(
            `SELECT pc_offering_id FROM ProgramCourseOfferings
             WHERE course_id = ? AND program_id = ? AND school_year IS ? AND semester IS ?
               AND approved_at IS NOT NULL AND carried_from_offering_id IS NULL`,
            [source.course_id, source.program_id, source.school_year, source.semester], transaction);
        if (approvedThisTerm) {
            throw new ServiceError(409, `A new revision was already approved for ${termLabel(source)}; the next one can start in a later term.`);
        }

        const newOfferingId = await insert('ProgramCourseOfferings', {
            revision_number: 0,
            course_id: source.course_id,
            program_id: source.program_id,
            dept_id: source.dept_id,
            course_description: source.course_description,
            school_year: source.school_year,
            semester: source.semester,
            base_offering_id: source.pc_offering_id,
            createdAt: now, updatedAt: now,
        }, transaction);
        const assignmentId = await insert('CourseOfferingAssignments', {
            pc_offering_id: newOfferingId, stakeholder_id: assignment.stakeholder_id, date_assigned: now, createdAt: now, updatedAt: now,
        }, transaction);
        await insert('AssignmentWorkflowLogs', {
            co_assign_id: assignmentId, actor_role: 'INSTRUCTOR', actor_name: user.name || null, action_type: 'ASSIGNED', createdAt: now, updatedAt: now,
        }, transaction);
        await cloneOfferingContent(source.pc_offering_id, newOfferingId, now, transaction);

        return { offeringId: newOfferingId, assignmentId, baseOfferingId: source.pc_offering_id, baseRevision: source.revision_number };
    });
};

// ---- Dean accepts: the revision number is assigned now ------------------------------------

// Runs inside the transaction that records the Dean's acceptance.
const assignRevisionOnApproval = async (offeringId, now, transaction) => {
    const [offering] = await select('SELECT * FROM ProgramCourseOfferings WHERE pc_offering_id = ?', [offeringId], transaction);
    if (!offering || offering.approved_at) return null;

    const [approvedThisTerm] = await select(
        `SELECT pc_offering_id FROM ProgramCourseOfferings
         WHERE course_id = ? AND program_id = ? AND school_year IS ? AND semester IS ?
           AND approved_at IS NOT NULL AND carried_from_offering_id IS NULL AND pc_offering_id <> ?`,
        [offering.course_id, offering.program_id, offering.school_year, offering.semester, offeringId], transaction);
    if (approvedThisTerm) {
        throw new ServiceError(409, `A new revision was already approved for ${termLabel(offering)}; at most one per term.`);
    }
    const [{ maxRevision }] = await select(
        'SELECT COALESCE(MAX(revision_number), 0) AS maxRevision FROM ProgramCourseOfferings WHERE course_id = ? AND program_id = ?',
        [offering.course_id, offering.program_id], transaction);
    const revision = maxRevision + 1;
    await sequelize.query('UPDATE ProgramCourseOfferings SET revision_number = ?, approved_at = ?, updatedAt = ? WHERE pc_offering_id = ?',
        { replacements: [revision, now, now, offeringId], transaction });
    return revision;
};

module.exports = { ServiceError, SEMESTERS, assignCourseForTerm, startRevision, assignRevisionOnApproval, cloneOfferingContent, latestApproved };
