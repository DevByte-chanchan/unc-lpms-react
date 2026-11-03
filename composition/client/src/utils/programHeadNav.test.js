import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const nav = readFileSync(new URL('../components/SideNavigation.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')
const table = readFileSync(new URL('../components/ApprovalCoursesTable.jsx', import.meta.url), 'utf8')
const programHeadItems = nav.slice(nav.indexOf("mode === 'program-head' && ("), nav.indexOf("mode === 'director-of-libraries' && ("))

test('the plans not yet submitted are a tab of the Learning plan page, not a page of their own', () => {
  assert.doesNotMatch(programHeadItems, /Not Yet Submitted/)
  assert.match(table, /NOT_SUBMITTED/)
  assert.match(table, /<NotSubmittedPanel/)
})

test('the old address of that page still works: it opens the tab', () => {
  assert.match(app, /path=\{'\/role\/program-head\/missing-submissions'\}[^\n]*Navigate[^\n]*status=not-submitted/)
})
