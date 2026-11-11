import test from 'node:test'
import assert from 'node:assert/strict'
import { removeBackground, padBox } from './signatureCleanup.js'

// A width x height picture of white paper with dark ink at the given [x, y] pixels.
const picture = (width, height, ink = [], inkGrey = 30) => {
  const rgba = new Uint8ClampedArray(width * height * 4).fill(255)
  for (const [x, y] of ink) {
    const i = (y * width + x) * 4
    rgba[i] = rgba[i + 1] = rgba[i + 2] = inkGrey
  }
  return rgba
}
const alphaAt = (rgba, width, x, y) => rgba[(y * width + x) * 4 + 3]

test('paper turns transparent, ink stays opaque, and the box is the ink', () => {
  const rgba = picture(6, 4, [[2, 1], [3, 1], [3, 2]])
  const box = removeBackground(rgba, 6, 4)
  assert.deepEqual(box, { left: 2, top: 1, right: 3, bottom: 2 })
  assert.equal(alphaAt(rgba, 6, 0, 0), 0, 'paper')
  assert.equal(alphaAt(rgba, 6, 3, 2), 255, 'ink')
})

test('a faint stroke is kept at a high strength and dropped at a low one', () => {
  const faint = () => picture(3, 3, [[1, 1]], 200)
  const strict = faint()
  assert.equal(removeBackground(strict, 3, 3, 0), null)
  const lenient = faint()
  assert.deepEqual(removeBackground(lenient, 3, 3, 100), { left: 1, top: 1, right: 1, bottom: 1 })
})

test('blank paper leaves nothing; the padded box stays inside the picture', () => {
  assert.equal(removeBackground(picture(4, 4), 4, 4), null)
  assert.deepEqual(padBox({ left: 1, top: 1, right: 2, bottom: 2 }, 4, 4, 8), { left: 0, top: 0, right: 3, bottom: 3 })
})
