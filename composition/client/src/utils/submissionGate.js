// Pre-submission alignment gate.
//
// The panel's headline automation: a learning plan may not be submitted while
// its hours and ILO allocation do not line up [47:53] [48:48], so the program
// head confirms instead of hand-checking.
//
// The alignment data itself is owned by the Christian learning-plan composition module; this
// file only reads what their endpoints already return
// (`/api/course-details/:pcId/:revNum` and `/api/course-coverage/:pcId/:revNum`)
// and decides whether the submit button may fire. No computation is forked
// from those modules.

// The spelling/grammar entry gate reuses the same dictionary the approval
// flow uses, so both agree on what a misspelling is.
import { hasBlockingTextIssues } from './reviewGate.js'
import { weightProblems } from './assessmentWeights.js'

export const DEFAULT_GATE_CONFIG = {
  // Contact hours in `course-details.contact` are per week; a term is this long.
  weeksPerTerm: 18,
  // Of those, the exam weeks carry no planned teaching in the weekly planner.
  examWeeks: 2,
  // Allocated hours may fall this far short of the term total before the plan
  // is considered under-allocated (over-allocation is never allowed).
  minHoursCoverageRatio: 0.9
}

// "(5 hrs)" -> 5, "2 Hrs Lec, 3 Hrs Lab" -> 5 (all numbers summed)
export const parseHours = (text) => {
  const matches = String(text ?? '').match(/\d+(\.\d+)?/g)
  if (!matches) return 0
  return matches.reduce((sum, n) => sum + parseFloat(n), 0)
}

// Weekly contact hours × weeks. Returns null when the field cannot be read, so
// the caller can warn instead of blocking on missing data.
export const expectedTermHours = (contact, config = DEFAULT_GATE_CONFIG) => {
  const weekly = parseHours(contact)
  if (!weekly) return null
  return weekly * (config.weeksPerTerm || DEFAULT_GATE_CONFIG.weeksPerTerm)
}

// Every course outcome needs at least one Introductory, Enabling and Demonstrative
// ILO (orientation ILOs are outside the scheme). Mirrors server/utils/iedRule.js,
// which enforces the same rule when the plan is actually submitted.
const IED_LEVELS = ['I', 'E', 'D']
const IED_NAMES = { I: 'Introductory', E: 'Enabling', D: 'Demonstrative' }

export const iedProblems = (ilos = []) => {
  const problems = []
  const coNumbers = [...new Set(ilos.map(i => i.coNumber).filter(n => n != null))].sort((a, b) => a - b)
  coNumbers.forEach(coNumber => {
    const own = ilos.filter(i => i.coNumber === coNumber && !i.isOrientation)
    const unlevelled = own.filter(i => !IED_LEVELS.includes(i.iedLevel)).length
    if (unlevelled) {
      problems.push(`CO${coNumber} has ${unlevelled} ILO${unlevelled > 1 ? 's' : ''} with no IED level.`)
    }
    const missing = IED_LEVELS.filter(level => !own.some(i => i.iedLevel === level))
    if (missing.length) {
      problems.push(`CO${coNumber} needs at least one ${missing.map(level => IED_NAMES[level]).join(' and one ')} ILO.`)
    }
  })
  return problems
}

// The weekly planner's coverage ({ orientation, courseOutcomes: [{ ilos, weeks }] }): ILOs for the IED check,
// and the weeks (plus orientation) as the rows that need time, topics and references.
const weeklyRows = (coverage) => {
  const outcomes = coverage.courseOutcomes || []
  const ilos = outcomes.flatMap(co => (co.ilos || []).map(i => ({
    ...i, id: `CO${co.coNumber}-ILO${i.iloNumber}`, coNumber: co.coNumber
  })))
  const weeks = outcomes.flatMap(co => (co.weeks || []).map(w => ({
    ...w, id: `Week ${w.computedWeekNumber ?? w.weekNumberInCo} (CO${co.coNumber})`
  })))
  const orientation = coverage.orientation ? [{ ...coverage.orientation, id: 'Course Orientation' }] : []
  return { ilos, rows: [...orientation, ...weeks] }
}

export const validateSubmission = ({ courseDetails = null, coverage = null, textFields = null, config = DEFAULT_GATE_CONFIG } = {}) => {
  const cfg = { ...DEFAULT_GATE_CONFIG, ...(config || {}) }
  const blockers = []
  const warnings = []

  const weekly = Array.isArray(coverage?.courseOutcomes)
  const { ilos, rows } = weekly
    ? weeklyRows(coverage)
    : { ilos: Array.isArray(coverage?.ilos) ? coverage.ilos : [], rows: Array.isArray(coverage?.ilos) ? coverage.ilos : [] }

  if (ilos.length === 0) {
    blockers.push('The learning plan has no intended learning outcomes yet.')
    return { ok: false, blockers, warnings, totalAllocatedHours: 0, expectedHours: null }
  }

  const label = (ilo, index) => ilo?.id || `ILO ${index + 1}`

  const missingHours = rows.filter(i => parseHours(i.allocatedTime) <= 0).map(label)
  if (missingHours.length) {
    blockers.push(`No allocated time on: ${missingHours.join(', ')}.`)
  }

  const missingTopics = rows.filter(i => !(Array.isArray(i.topics) && i.topics.length)).map(label)
  if (missingTopics.length) {
    blockers.push(`No topic aligned to: ${missingTopics.join(', ')}.`)
  }

  const missingRefs = rows.filter(i => !(Array.isArray(i.references) && i.references.length)).map(label)
  if (missingRefs.length) {
    blockers.push(`No reference attached to: ${missingRefs.join(', ')}.`)
  }

  blockers.push(...iedProblems(ilos))
  // Faculty split each level's weight as they like; within each period I = 20%, E = 30%, D = 50%.
  blockers.push(...weightProblems(Array.isArray(coverage?.assessments) ? coverage.assessments : []))

  const totalAllocatedHours = rows.reduce((sum, i) => sum + parseHours(i.allocatedTime), 0)
  // The weekly planner leaves the exam weeks out, so its weeks cover the term minus those.
  const expectedHours = expectedTermHours(courseDetails?.contact,
    weekly ? { ...cfg, weeksPerTerm: cfg.weeksPerTerm - cfg.examWeeks } : cfg)

  if (expectedHours === null) {
    warnings.push('Contact hours are missing from the course details, so the hours total could not be checked.')
  } else if (totalAllocatedHours > expectedHours) {
    blockers.push(`Allocated hours (${totalAllocatedHours}) exceed the ${expectedHours} contact hours for the term.`)
  } else if (totalAllocatedHours < expectedHours * cfg.minHoursCoverageRatio) {
    blockers.push(`Allocated hours (${totalAllocatedHours}) do not cover the ${expectedHours} contact hours for the term.`)
  }

  // Spelling / grammar gate at ENTRY [46:58] [49:25]: a plan with misspellings
  // in its free-text fields must not reach the program head. The caller passes
  // the text fields to check (topics, course description, objectives, ...).
  // It reuses reviewGate.checkText so the entry gate and the approval flow
  // share one dictionary. Optional — without textFields the gate is skipped so
  // the alignment-only behaviour (and its tests) is unchanged.
  const spellingTexts = Array.isArray(textFields)
    ? textFields.map(t => String(t ?? '').trim()).filter(Boolean)
    : []
  if (spellingTexts.length) {
    const misspelled = spellingTexts.filter(t => hasBlockingTextIssues(t))
    if (misspelled.length) {
      blockers.push(
        'Spelling mistakes were found: "' +
        misspelled[0].split(/\s+/).slice(0, 6).join(' ') +
        (misspelled[0].split(/\s+/).length > 6 ? ' …' : '') +
        '". Fix the spelling before submitting.'
      )
    }
  }

  return { ok: blockers.length === 0, blockers, warnings, totalAllocatedHours, expectedHours }
}

export default { DEFAULT_GATE_CONFIG, parseHours, expectedTermHours, validateSubmission }
