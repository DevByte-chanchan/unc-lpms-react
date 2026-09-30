import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

test('every header sign-out action opens the shared confirmation instead of logging out directly', () => {
  for (const relative of ['components/Header.jsx', 'components/HeaderA.jsx']) {
    const source = read(relative)
    assert.doesNotMatch(source, /onClick=\{logout\}/, `${relative} must not log out immediately`)
    assert.match(source, /SignOutDialog/, `${relative} must use the shared confirmation dialog`)
  }

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
