import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

test('sign-out lives in the left bar only and opens the shared confirmation instead of logging out directly', () => {
  for (const relative of ['components/Header.jsx', 'components/HeaderA.jsx']) {
    assert.doesNotMatch(read(relative), /logout|Sign out|NotificationBell|\/profile/, `${relative} shows only the name and role`)
  }
  assert.doesNotMatch(read('components/SideNavigation.jsx'), /onClick=\{logout\}/, 'the left bar must not log out immediately')

  const sideNavigation = read('components/SideNavigation.jsx')
  assert.match(sideNavigation, /SignOutDialog/)
  assert.doesNotMatch(sideNavigation, /className=\{styles\.rolePopup\}/)
  assert.doesNotMatch(
    sideNavigation,
    /w\s*<\s*100\s*&&\s*showPopup/,
    'the collapsed sidebar must not immediately close the confirmation dialog'
  )
})

test('the shared confirmation is an accessible modal with explicit confirm and cancel actions', () => {
  const source = read('components/SignOutDialog.jsx')
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby=/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, />Cancel</)
  assert.match(source, />Sign out</)
})
