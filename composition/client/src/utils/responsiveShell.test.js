import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

test('both shells shrink content and expose vertical scrolling', () => {
  for (const file of ['styles/Skeleton.module.sass', 'styles/SkeletonA.module.sass']) {
    const css = read(file)
    assert.match(css, /min-width:\s*0/)
    assert.match(css, /min-height:\s*0/)
    assert.match(css, /overflow-y:\s*auto/)
    assert.match(css, /@media \(max-width:\s*1024px\)/)
    assert.match(css, /72px/)
  }
})

test('compact navigation labels remain accessible without rail expansion', () => {
  const nav = read('components/SideNavigation.jsx')
  const css = read('styles/SideNavigation.module.sass')
  assert.match(nav, /aria-label=/)
  assert.match(nav, /title=/)
  assert.match(css, /@media \(max-width:\s*1024px\)/)
  assert.match(css, /\.listText[\s\S]*display:\s*none/)
})

test('headers wrap at mobile width and the left bar carries Notifications, Profile and Log Out', () => {
  const nav = read('components/SideNavigation.jsx')
  assert.match(nav, /<NotificationBell/)
  assert.match(nav, /navigate\('\/profile'\)/)
  assert.match(nav, /Log Out/)
  for (const file of ['styles/Header.module.sass', 'styles/HeaderA.module.sass']) {
    assert.match(read(file), /flex-wrap:\s*wrap/)
    assert.match(read(file), /overflow-wrap:\s*anywhere/)
    assert.match(read(file), /box-sizing:\s*border-box/)
  }
})
