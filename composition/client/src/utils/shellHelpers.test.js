import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesSearch } from './pageSearch.js'
import { readCollapsed, writeCollapsed } from './navPreference.js'
import { initialsOf } from './userInitials.js'

test('search: every word must appear, case does not matter, nothing typed matches all', () => {
  assert.equal(matchesSearch('', ['BIT311L']), true)
  assert.equal(matchesSearch('bit311', ['BIT311L', 'Platform Technologies']), true)
  assert.equal(matchesSearch('platform norton', ['BIT311L', 'Platform Technologies', 'NORTON, MONICA']), true)
  assert.equal(matchesSearch('platform smith', ['BIT311L', 'Platform Technologies', 'NORTON, MONICA']), false)
  assert.equal(matchesSearch('x', [null, undefined]), false)
})

test('the sidebar preference is remembered, and storage that throws is ignored', () => {
  const memory = new Map()
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
  assert.equal(readCollapsed(storage), false)
  writeCollapsed(storage, true)
  assert.equal(readCollapsed(storage), true)
  writeCollapsed(storage, false)
  assert.equal(readCollapsed(storage), false)
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  assert.equal(readCollapsed(broken), false)
  writeCollapsed(broken, true)
  assert.equal(readCollapsed(undefined), false)
})

test('initials: LAST, FIRST gives first-last; plain names use first and last word', () => {
  assert.equal(initialsOf('DANILA, JUNAR'), 'JD')
  assert.equal(initialsOf('Maria Santos'), 'MS')
  assert.equal(initialsOf('Cher'), 'C')
  assert.equal(initialsOf(''), '?')
  assert.equal(initialsOf(null), '?')
})
