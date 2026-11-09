// The weekly planner's course coverage ({ orientation, courseOutcomes: [{ ilos, weeks }], topics, assessments })
// as one row per week (plus the orientation), the shape the approver screens, the comment form and the PDF export
// read: { id, label, coNumber, courseOutcome, intendedLearningOutcome, deliveryWeek, allocatedTime, topics: [title],
// tlas: [name], references: ['TB1 - Title'] }.
//
// Row ids say where a comment goes: 'CO2-W3' is the third week of CO2, 'CO1-O' the course orientation (week 1).
// An older coverage (one row per ILO) passes through unchanged.

const titles = (items) => (items || []).map(item => item?.title).filter(Boolean)
const tlaNames = (items) => (items || []).map(item => item?.tlaName).filter(Boolean)

export const weekRowsOf = (coverage) => {
  if (!Array.isArray(coverage?.courseOutcomes)) return Array.isArray(coverage?.ilos) ? coverage.ilos : []
  const rows = []
  const first = coverage.courseOutcomes[0]
  if (coverage.orientation) {
    const o = coverage.orientation
    rows.push({
      id: 'CO1-O',
      label: 'CO1 · Course orientation',
      coNumber: first?.coNumber ?? 1,
      isOrientation: true,
      courseOutcome: first?.coDescription || '',
      intendedLearningOutcome: o.intendedLearningOutcome || '',
      deliveryWeek: o.deliveryWeek || 'Week 1',
      allocatedTime: o.allocatedTime || '',
      topics: titles(o.topics),
      tlas: tlaNames(o.tlas),
      references: o.references || []
    })
  }
  for (const co of coverage.courseOutcomes) {
    const iloText = (co.ilos || []).map(ilo => `${ilo.label || `ILO${ilo.iloNumber}`}: ${ilo.description || ''}`).join('\n')
    for (const week of co.weeks || []) {
      if (week.week_id == null || String(week.week_id).startsWith('empty-')) continue
      rows.push({
        id: `CO${co.coNumber}-W${week.weekNumberInCo}`,
        label: `CO${co.coNumber} · Week ${week.computedWeekNumber ?? week.weekNumberInCo}`,
        coNumber: co.coNumber,
        isOrientation: false,
        weekId: week.week_id,
        courseOutcome: co.coDescription || '',
        intendedLearningOutcome: iloText,
        deliveryWeek: week.deliveryWeek || `Week ${week.computedWeekNumber ?? ''}`,
        allocatedTime: week.allocatedTime || '',
        topics: titles(week.topics),
        tlas: tlaNames(week.tlas),
        references: week.references || []
      })
    }
  }
  return rows
}

// The coverage with `ilos` filled from its weeks, for readers that still expect one row per entry.
export const withWeekRows = (coverage) => (Array.isArray(coverage?.courseOutcomes)
  ? { ...coverage, ilos: weekRowsOf(coverage) }
  : coverage)

// 'CO2-W3' -> { coIndex: 2, weekIndex: 3 }; 'CO1-O' -> week 1 of CO1; an old 'CO2-ILO1' -> { coIndex, iloIndex }.
export const parseCommentPlace = (id) => {
  const text = String(id || '')
  const week = /^CO(\d+)-W(\d+)$/.exec(text)
  if (week) return { coIndex: Number(week[1]), weekIndex: Number(week[2]) }
  const orientation = /^CO(\d+)-O$/.exec(text)
  if (orientation) return { coIndex: Number(orientation[1]), weekIndex: 1 }
  const ilo = /^CO(\d+)-ILO(\d+)$/.exec(text)
  if (ilo) return { coIndex: Number(ilo[1]), iloIndex: Number(ilo[2]) }
  return null
}
