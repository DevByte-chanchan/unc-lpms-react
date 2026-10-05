// Assessment periods and weights, shared by the TLA form and the submit gate.
// Mirrors server/utils/assessmentWeights.js, which enforces the same rules.
import { IED_LEVELS } from './iedLevels.js'

// Codes are what TLAAssessments.period stores.
export const PERIODS = [
  { code: 'p', label: 'Prelim' },
  { code: 'm', label: 'Midterm' },
  { code: 's', label: 'Semi-final' },
  { code: 'f', label: 'Final' }
]

export const periodLabel = (code) => PERIODS.find(period => period.code === code)?.label || ''
export const periodCode = (label) => PERIODS.find(period => period.label === label)?.code || ''

// "12.5" or "12.5%" -> 12.5; blank, non-numeric, <= 0 or > 100 -> null.
export const parseWeight = (value) => {
  const text = String(value ?? '').replace('%', '').trim()
  if (!/^[0-9]+(\.[0-9]+)?$/.test(text)) return null
  const number = Number(text)
  return number > 0 && number <= 100 ? number : null
}

// Same rounding allowance as server/utils/assessmentWeights.js.
const WEIGHT_TOLERANCE = 0.05

const formatWeight = (number) => String(Math.round(number * 100) / 100)

// Across the whole course the Introductory assessments must total 20%, Enabling
// 30% and Demonstrative 50%; faculty choose how to split each level's share.
// assessments: { iedLevel, isOrientation, weight } (orientation ILOs are outside the scheme).
export const weightProblems = (assessments = []) => {
  const totals = { I: 0, E: 0, D: 0 }
  for (const assessment of assessments) {
    if (assessment.isOrientation || !(assessment.iedLevel in totals)) continue
    totals[assessment.iedLevel] += parseWeight(assessment.weight) ?? 0
  }
  return IED_LEVELS
    .filter(level => Math.abs(totals[level.code] - level.weight) > WEIGHT_TOLERANCE)
    .map(level => `${level.name} assessment weights total ${formatWeight(totals[level.code])}%, but must total ${level.weight}%.`)
}
