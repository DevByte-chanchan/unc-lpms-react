import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getOverflowTooltipPlacement,
  getOverflowTooltipText,
  isOverflowTooltipTarget,
} from './overflowTooltip.js'

test('overflow tooltip activates only when ellipsis text is actually clipped', () => {
  const clipped = { scrollWidth: 180, clientWidth: 100, scrollHeight: 20, clientHeight: 20 }
  const fitting = { scrollWidth: 100, clientWidth: 100, scrollHeight: 20, clientHeight: 20 }

  assert.equal(isOverflowTooltipTarget(clipped, { textOverflow: 'ellipsis' }), true)
  assert.equal(isOverflowTooltipTarget(fitting, { textOverflow: 'ellipsis' }), false)
  assert.equal(isOverflowTooltipTarget(clipped, { textOverflow: 'clip' }), false)
})

test('overflow tooltip exposes the complete readable text', () => {
  const attributes = new Map([
    ['data-full-text', 'Complete department name'],
    ['title', 'Fallback title'],
    ['aria-label', 'Fallback label'],
  ])
  const element = {
    textContent: 'Visible shortened text',
    getAttribute: (name) => attributes.get(name) || null,
  }

  assert.equal(getOverflowTooltipText(element), 'Complete department name')
  attributes.delete('data-full-text')
  assert.equal(getOverflowTooltipText(element), 'Fallback title')
  attributes.delete('title')
  assert.equal(getOverflowTooltipText(element), 'Fallback label')
  attributes.delete('aria-label')
  assert.equal(getOverflowTooltipText(element), 'Visible shortened text')
})

test('overflow tooltip placement stays inside the viewport', () => {
  assert.deepEqual(
    getOverflowTooltipPlacement(
      { left: 760, top: 500, bottom: 530 },
      { width: 800, height: 600 },
    ),
    { left: 468, top: null, bottom: 108 },
  )

  assert.deepEqual(
    getOverflowTooltipPlacement(
      { left: 4, top: 30, bottom: 50 },
      { width: 280, height: 600 },
    ),
    { left: 12, top: 58, bottom: null },
  )
})
