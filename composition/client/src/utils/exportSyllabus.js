import { fetchJson } from './api.js'
import { offeringKey } from './offeringKey.js'
import { buildSyllabusHtml } from './syllabusPdfHtml.js'
import { buildReviewRecordHtml } from './reviewRecordHtml.js'
import { fetchFormInfo } from './formSettings.js'
import { workflowFromLogs } from './workflowFromLogs.js'
import { exportEligibility } from './reviewGate.js'

export const NOT_EXPORTABLE_MESSAGE =
  'The syllabus can be exported once the Director of Libraries and the Program Head have both accepted it.'

/**
 * Builds the complete syllabus export file — the SAME logic as the Export
 * button inside the Learning Plan page (fetches all sections from the server
 * by offering + revision). Returns a PDFViewerModal-compatible file object.
 *
 * The approval block is filled from the plan's workflow log (fetched here when the caller
 * has none), the footer from the ISO form settings. Allowed once the Director of Libraries and
 * the Program Head have accepted; until the Dean accepts, every page is marked
 * "Pending Dean approval". This is the clean syllabus: it carries no comments.
 */
export async function buildSyllabusExportFile({ pcId, revNum, code, workflow = null, logoUrl }) {
  if (!workflow) {
    const data = await fetchJson(`/api/assignments/offering/${pcId}`)
    workflow = workflowFromLogs(data?.logs || [], code)
  }
  const eligibility = exportEligibility(workflow)
  if (!eligibility.allowed) throw new Error(NOT_EXPORTABLE_MESSAGE)
  const formInfo = await fetchFormInfo()

  // The approvers' e-signature images (decrypted by the server, only for approvals they performed).
  // An export never fails because of a signature: no key or no upload just means no image.
  const signatureImages = (await fetchJson(`/api/assignments/offering/${pcId}/signatures`).catch(() => null))?.signatures || {}
  workflow = { ...workflow, signatureImages }

  const [courseRes, coaRes, covRes, critRes, refRes] = await Promise.all([
    fetchJson(`/api/course-details/${offeringKey(pcId, revNum)}`).catch(() => null),
    fetchJson(`/api/course-outcome-alignment/${offeringKey(pcId, revNum)}`).catch(() => null),
    fetchJson(`/api/course-coverage/${offeringKey(pcId, revNum)}`).catch(() => null),
    fetchJson(`/api/course-criteria/${offeringKey(pcId, revNum)}`).catch(() => null),
    fetchJson(`/api/courses/${offeringKey(pcId, revNum)}/references`).catch(() => null),
  ])

  const refs = (() => {
    if (!refRes) return []
    if (Array.isArray(refRes)) return refRes
    if (refRes.data) {
      if (Array.isArray(refRes.data)) return refRes.data
      const m = [
        ...(refRes.data.Textbook || []),
        ...(refRes.data['Open Educational Resources'] || []),
        ...(refRes.data['Online Resources'] || []),
        ...(refRes.data['Online Subscriptions'] || []),
      ]
      if (m.length) return m
      return refRes.data.references || []
    }
    return refRes.references || []
  })()

  const syllabus = {
    ...(courseRes || {}),
    courseOutcomes: coaRes?.courseOutcomes || [],
    ilos: covRes?.ilos || [],
    topics: covRes?.topics || [],
    assessments: covRes?.assessments || [],
    gradingSystem: critRes?.gradingSystem || [],
    references: refs,
    code,
    course_no: courseRes?.code || '',
    course_title: courseRes?.name || '',
  }

  const html = buildSyllabusHtml(syllabus, code, workflow, logoUrl, { formInfo, pendingApproval: eligibility.pendingDean })
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  return {
    file_url: url,
    file_name: `Syllabus_${code}${eligibility.pendingDean ? '_PENDING_DEAN_APPROVAL' : ''}.html`,
    instructor_name: syllabus?.instructor || '—',
    course_id: code,
    course_name: syllabus?.name || '',
    submission_date: syllabus?.update || '',
    period_label: (syllabus?.year || '') + ' — ' + (syllabus?.sem || ''),
  }
}

/**
 * The accreditation review record for one revision: every comment, every workflow action,
 * and the final approvers. A separate document from the clean syllabus export.
 */
export async function buildReviewRecordFile({ pcId, code }) {
  const record = await fetchJson(`/api/assignments/offering/${pcId}/review-record`)
  const html = buildReviewRecordHtml(record)
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const revision = record?.course?.revisionNumber
  return {
    file_url: url,
    file_name: `ReviewRecord_${code || record?.course?.code || pcId}${revision == null ? '' : `_rev${revision}`}.html`,
    instructor_name: '—',
    course_id: code || record?.course?.code || '',
    course_name: record?.course?.title || '',
    submission_date: '',
    period_label: record?.course?.term || '',
  }
}
