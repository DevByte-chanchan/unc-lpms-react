/**
 * Curriculum carry-forward helper.
 *
 * cloneCurriculumFromPriorPeriod(currentPeriodId) — when the user opens a
 * term that has NO courses yet, copy the entire curriculum (Courses +
 * their Prerequisite links + their Course Offering revisions) from the
 * most recent chronological PREDECESSOR period that has data.
 *
 * Unlike the generic cloneFromPriorPeriod (single table), the curriculum
 * spans three related tables wired by course_id, so a naïve row copy would
 * leave prerequisites and offerings pointing at the OLD term's course ids.
 * This helper builds an old→new course-id map while cloning the courses,
 * then re-points the prerequisite and offering rows through that map.
 *
 * "Predecessor" mirrors periodClone's chronology: Sem 1 < Sem 2 < Summer
 * within a school year, older years first. Insertion order never votes.
 *
 * Returns:
 *   null               — nothing cloned (no prior period had courses)
 *   { count, source }  — courses cloned + source period id
 */
import db from '../models/index.js';

const { AcademicPeriod, Course, Prerequisite, ProgramCourseOffering } = db;

const semesterRank = (sem) => {
  const s = String(sem || '').trim().toLowerCase();
  if (s === 'summer' || s === '3') return 3;
  if (s === '2' || s === 'second' || s === '2nd' || s === 'sem 2') return 2;
  if (s === '1' || s === 'first'  || s === '1st' || s === 'sem 1') return 1;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const rankPeriod = (p) => {
  if (!p) return -Infinity;
  const m = String(p.school_year || '').trim().match(/(\d{4})/);
  const year = m ? Number(m[1]) : 0;
  return year * 1000 + semesterRank(p.semester);
};

export async function cloneCurriculumFromPriorPeriod(currentPeriodId) {
  if (!currentPeriodId) return null;

  const allPeriods = await AcademicPeriod.findAll({ raw: true });
  const current = allPeriods.find((p) => Number(p.id) === Number(currentPeriodId));
  if (!current) return null;

  const currentRank = rankPeriod(current);
  // Semester is a property of the TERM, so cloned courses adopt the target
  // term's semester (Summer / unrecognised → 1), not the source term's.
  const targetSemester = semesterRank(current.semester) === 2 ? 2 : 1;
  const candidates = allPeriods
    .filter((p) => Number(p.id) !== Number(currentPeriodId) && rankPeriod(p) < currentRank)
    .sort((a, b) => rankPeriod(b) - rankPeriod(a));

  for (const p of candidates) {
    const priorCourses = await Course.findAll({ where: { period_id: p.id }, raw: true });
    if (priorCourses.length === 0) continue;

    // 1. Clone the courses, recording old course_id → new course_id.
    const idMap = new Map();
    for (const c of priorCourses) {
      const created = await Course.create({
        course_no: c.course_no, course_title: c.course_title,
        credit: c.credit, contact_hrs: c.contact_hrs,
        classification: c.classification, cmo: c.cmo,
        year_lvl: c.year_lvl, term: c.term, semester: targetSemester,
        period_id: currentPeriodId,
      });
      idMap.set(c.course_id, created.course_id);
    }

    const oldIds = priorCourses.map((c) => c.course_id);

    // 2. Clone prerequisite links, re-pointing both ends through the map.
    //    Skip any link whose endpoints aren't both in the cloned set.
    const prereqs = await Prerequisite.findAll({ where: { course_id: oldIds }, raw: true });
    for (const pr of prereqs) {
      const newCourse = idMap.get(pr.course_id);
      const newPrereq = idMap.get(pr.course_prerequisite_id);
      if (!newCourse || !newPrereq) continue;
      await Prerequisite.findOrCreate({
        where: { course_id: newCourse, course_prerequisite_id: newPrereq },
        defaults: { course_id: newCourse, course_prerequisite_id: newPrereq },
      });
    }

    // 3. Clone course offering revisions, re-pointing course_id.
    const offerings = await ProgramCourseOffering.findAll({ where: { course_id: oldIds }, raw: true });
    for (const o of offerings) {
      const newCourse = idMap.get(o.course_id);
      if (!newCourse) continue;
      await ProgramCourseOffering.create({
        revision_number: o.revision_number,
        course_id: newCourse,
        program_id: o.program_id,
        dept_id: o.dept_id,
        course_description: o.course_description,
      });
    }

    return { count: priorCourses.length, source: p.id };
  }

  return null;
}
