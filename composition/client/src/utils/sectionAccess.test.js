import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sectionsForRole, canSeeWholePlan } from './sectionAccess.js'

const SECTIONS = ['Course Details', 'Course and Program Outcome Alignment', 'Course Coverage', 'References Summary', 'Criteria for Grading']
const here = path.dirname(fileURLToPath(import.meta.url))

test('the Director of Libraries sees only the references', () => {
  assert.deepEqual(sectionsForRole('director-of-libraries', SECTIONS), ['References Summary'])
})

test('the Industry Consultant sees the content and coverage sections, in the screen order', () => {
  assert.deepEqual(sectionsForRole('industry-consultant', SECTIONS), ['Course Details', 'Course and Program Outcome Alignment', 'Course Coverage'])
})

test('every other role, and a role that is not in the list, sees every section', () => {
  for (const role of ['program-head', 'dean', 'instructor', 'vpaa', 'approver', '__proto__', 'constructor']) {
    assert.deepEqual(sectionsForRole(role, SECTIONS), SECTIONS, role)
  }
})

test('the result is a copy: changing it does not change the screen list', () => {
  const copy = sectionsForRole('dean', SECTIONS)
  copy.pop()
  assert.equal(SECTIONS.length, 5)
})

test('only the two partial roles are kept away from the whole-plan documents', () => {
  assert.equal(canSeeWholePlan('director-of-libraries'), false)
  assert.equal(canSeeWholePlan('industry-consultant'), false)
  for (const role of ['program-head', 'dean', 'instructor', 'vpaa']) assert.equal(canSeeWholePlan(role), true, role)
})

test('the approval screen builds its sections, fetches and export menu from these rules', () => {
  const source = fs.readFileSync(path.join(here, '..', 'components', 'ApprovalSyllabusSections.jsx'), 'utf8')
  assert.match(source, /visibleSections = React\.useMemo\(\(\) => sectionsForRole\(roleKey, defaultSections\)/)
  for (const section of SECTIONS) {
    assert.match(source, new RegExp(`!visibleSections\\.includes\\('${section}'\\)`), `${section} is fetched only when the role may see it`)
  }
  assert.match(source, /\{visibleSections\.map\(\(s\) => <option/, 'the dropdown lists the visible sections only')
  assert.match(source, /exportInfo\.allowed\) && wholePlanAccess/, 'the whole-syllabus export is hidden from the partial roles')
})
