import test from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import { crc32, makeZip, uniqueName } from './zip.js'

test('crc32 matches the standard one', () => {
  const bytes = new TextEncoder().encode('The quick brown fox jumps over the lazy dog')
  assert.equal(crc32(bytes), 0x414fa339)
  if (zlib.crc32) assert.equal(crc32(bytes), zlib.crc32(bytes))
})

// Reads the ZIP back by its central directory, the way an unzip tool does.
const readZip = (zip) => {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const end = zip.length - 22
  assert.equal(v.getUint32(end, true), 0x06054b50)
  const count = v.getUint16(end + 10, true)
  let at = v.getUint32(end + 16, true)
  const files = []
  for (let i = 0; i < count; i++) {
    assert.equal(v.getUint32(at, true), 0x02014b50)
    const size = v.getUint32(at + 24, true)
    const nameLen = v.getUint16(at + 28, true)
    const local = v.getUint32(at + 42, true)
    const name = new TextDecoder().decode(zip.subarray(at + 46, at + 46 + nameLen))
    assert.equal(v.getUint32(local, true), 0x04034b50)
    const start = local + 30 + v.getUint16(local + 26, true)
    const bytes = zip.subarray(start, start + size)
    assert.equal(crc32(bytes), v.getUint32(at + 16, true))
    files.push({ name, text: new TextDecoder().decode(bytes) })
    at += 46 + nameLen
  }
  return files
}

test('makeZip holds every file, named and intact', () => {
  const enc = (s) => new TextEncoder().encode(s)
  const zip = makeZip([{ name: 'IT311L.pdf', bytes: enc('%PDF-one') }, { name: 'Ñame.pdf', bytes: enc('%PDF-two') }])
  assert.deepEqual(readZip(zip), [{ name: 'IT311L.pdf', text: '%PDF-one' }, { name: 'Ñame.pdf', text: '%PDF-two' }])
  assert.deepEqual(readZip(makeZip([])), [])
})

test('uniqueName makes safe, distinct file names', () => {
  const taken = new Set()
  assert.equal(uniqueName(taken, 'IT311L', '.pdf'), 'IT311L.pdf')
  assert.equal(uniqueName(taken, 'it311l', '.pdf'), 'it311l (2).pdf')
  assert.equal(uniqueName(taken, 'CS/101: A', '.pdf'), 'CS-101- A.pdf')
  assert.equal(uniqueName(taken, '', '.pdf'), 'plan.pdf')
})
