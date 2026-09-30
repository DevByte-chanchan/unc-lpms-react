import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('the unused vulnerable spreadsheet parser is not shipped', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8')
  )
  assert.equal(packageJson.dependencies?.xlsx, undefined)
})

test('the reference library does not import the removed xlsx package', async () => {
  const source = await readFile(
    new URL('../pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx', import.meta.url),
    'utf8'
  )
  assert.doesNotMatch(source, /from\s+['"]xlsx['"]|XLSX\./)
})
