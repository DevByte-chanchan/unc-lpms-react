import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const nav = readFileSync(new URL('../components/SideNavigation.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')
const programHeadItems = nav.slice(nav.indexOf("mode === 'program-head' && ("), nav.indexOf("mode === 'director-of-libraries' && ("))

test('the Program Head sidebar links to the Industry Consultants page', () => {
  assert.match(programHeadItems, /navigate\('\/role\/program-head\/industry-consultant'\)/)
  assert.match(programHeadItems, /label="Industry Consultants"/)
})

test('that link goes to a page that is routed, and the sidebar marks it as selected', () => {
  assert.match(app, /path=\{'\/role\/program-head\/industry-consultant'\}/)
  assert.match(nav, /startsWith\('\/role\/program-head\/industry-consultant'\)/)
})

test('the Program Head sidebar links to the Not Yet Submitted page, which is routed and marks itself selected', () => {
  assert.match(programHeadItems, /navigate\('\/role\/program-head\/missing-submissions'\)/)
  assert.match(programHeadItems, /label="Not Yet Submitted"/)
  assert.match(app, /path=\{'\/role\/program-head\/missing-submissions'\}/)
  assert.match(nav, /startsWith\('\/role\/program-head\/missing-submissions'\)/)
})
