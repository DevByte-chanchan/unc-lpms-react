// The OVPAA's view of an approved Learning Plan: the generated syllabus in the official
// UNC form layout (utils/syllabusPdfHtml.js, ported from the v2 branch), with the
// official seal embedded. Same pattern as exportSyllabus.js on that branch: data →
// HTML → Blob → object URL → a DocumentViewerModal file object.
//
// Data source: this app doesn't have the Learning Plan API that exportSyllabus.js
// calls (/api/course-details/:key, /api/course-outcome-alignment/:key,
// /api/course-coverage/:key, /api/course-criteria/:key, /api/courses/:key/references,
// /api/assignments/offering/:pcId and …/signatures), so the plan comes from the row's
// `syllabus`, `workflow` and `alignment` (data/mockSyllabus.js), which have the same
// shape. When that API lands, build `syllabus`/`workflow` from it in loadPlan().
//
// The caller owns the blob URL: revokeExportFiles(file) (exportTos.js) when the viewer closes.
import { buildSyllabusHtml } from './syllabusPdfHtml.js';
import { fetchFormInfo } from './formSettings.js';
import { getSealDataUrl } from './sealDataUrl.js';
import { UniversityStatementsAPI } from '../services/api.js';

export const LP_NOT_APPROVED = "This Learning Plan hasn't been approved yet.";

// The OVPAA's saved university statements for page 1, or null (page 1 then keeps the
// v2 text). Read through /history so a university with nothing saved yet doesn't
// produce a failed request.
let statementsPending = null;
export function fetchUniversityStatements() {
  if (!statementsPending) {
    statementsPending = UniversityStatementsAPI.history()
      .then((list) => {
        const active = Array.isArray(list) ? list.find((v) => v && v.status === 'active') : null;
        return active ? UniversityStatementsAPI.get(active.id) : null;
      })
      .catch(() => null)
      .finally(() => { setTimeout(() => { statementsPending = null; }, 60000); });
  }
  return statementsPending;
}

const approved = (wf) => !!(wf && wf.dean && wf.dean.status === 'done'
  && wf.parallelReview && wf.parallelReview.program_head && wf.parallelReview.program_head.status === 'done'
  && wf.parallelReview.library_director && wf.parallelReview.library_director.status === 'done');

async function loadPlan(row) {
  if (!row || !row.syllabus) throw new Error('No Learning Plan was found for ' + ((row && row.course_id) || 'this course') + '.');
  return { syllabus: row.syllabus, workflow: row.workflow, alignment: row.alignment };
}

/** One approved Learning Plan row → a viewer file object with one document. */
export async function buildLearningPlanExportFile(row, logoDataUrl) {
  const plan = await loadPlan(row);
  if (!approved(plan.workflow)) throw new Error(LP_NOT_APPROVED);

  const [logo, formInfo, universityStatements] = await Promise.all([
    logoDataUrl ? Promise.resolve(logoDataUrl) : getSealDataUrl(),
    fetchFormInfo(),
    fetchUniversityStatements(),
  ]);

  const periodLabel = row.period_label && row.period_label !== '—' ? row.period_label : '';
  // The term is the repository row's (the OVPAA's selected term).
  const sem = (periodLabel.match(/^(.*?(?:Semester|Summer))/i) || [])[1] || periodLabel;
  const syllabus = { ...plan.syllabus, sem: plan.syllabus.sem || sem };

  const html = buildSyllabusHtml(syllabus, row.course_id, plan.workflow, logo, {
    formInfo,
    programAlignment: plan.alignment,
    universityStatements,
    pendingApproval: false, // approved: never the "PENDING DEAN APPROVAL" mark
  });

  return {
    kicker: 'Learning Plan · Approved',
    title: row.file_name,
    course_id: row.course_id,
    course_name: row.course_name,
    instructor_name: row.instructor_name,
    period_label: periodLabel,
    submission_date: row.submission_date,
    approved_date: row.approved_date,
    file_url: URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })),
    file_name: row.file_name,
  };
}
