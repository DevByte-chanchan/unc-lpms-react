import { fetchJson } from './api.js'
import { buildSyllabusHtml } from './syllabusPdfHtml.js'

/**
 * Builds the complete syllabus export file — the SAME logic as the Export
 * button inside the Learning Plan page (fetches all sections from the server
 * by offering + revision). Returns a PDFViewerModal-compatible file object.
 */
export async function buildSyllabusExportFile({ pcId, revNum, code, workflow = null, logoUrl }) {
  const [courseRes, coaRes, covRes, critRes, refRes] = await Promise.all([
    fetchJson(`/api/course-details/${pcId}/${revNum}`).catch(() => null),
    fetchJson(`/api/course-outcome-alignment/${pcId}/${revNum}`).catch(() => null),
    fetchJson(`/api/course-coverage/${pcId}/${revNum}`).catch(() => null),
    fetchJson(`/api/course-criteria/${pcId}/${revNum}`).catch(() => null),
    fetchJson(`/api/courses/${pcId}/${revNum}/references`).catch(() => null),
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

  const html = buildSyllabusHtml(syllabus, code, workflow, logoUrl)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  return {
    file_url: url,
    file_name: `Syllabus_${code}.html`,
    instructor_name: syllabus?.instructor || '—',
    course_id: code,
    course_name: syllabus?.name || '',
    submission_date: syllabus?.update || '',
    period_label: (syllabus?.year || '') + ' — ' + (syllabus?.sem || ''),
  }
}
