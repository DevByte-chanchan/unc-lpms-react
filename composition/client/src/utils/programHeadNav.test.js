import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const nav = readFileSync(new URL('../components/SideNavigation.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')

test('the Program Head sidebar links to the Industry Consultants page', () => {
  const programHead = nav.slice(nav.indexOf("mode === 'program-head' && ("), nav.indexOf("mode === 'director-of-libraries' && ("))
  assert.match(programHead, /navigate\('\/role\/program-head\/industry-consultant'\)/)
  assert.match(programHead, /label="Industry Consultants"/)
})

test('that link goes to a page that is routed, and the sidebar marks it as selected', () => {
  assert.match(app, /path=\{'\/role\/program-head\/industry-consultant'\}/)
  assert.match(nav, /startsWith\('\/role\/program-head\/industry-consultant'\)/)
})
