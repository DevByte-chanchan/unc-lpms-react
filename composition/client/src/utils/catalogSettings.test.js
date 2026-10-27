import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_CATALOG_SETTINGS, refreshCatalogSettings, settingsFromApi } from './referenceCatalog.js'

test('the server\'s rules become the catalog settings, with the defaults for anything missing', () => {
  assert.deepEqual(settingsFromApi({ recencyYears: 8, enforceRecency: false, requireLibraryAvailability: true }), { recencyYears: 8, enforceRecency: false, requireLibraryAvailability: true })
  assert.deepEqual(settingsFromApi({}), { recencyYears: DEFAULT_CATALOG_SETTINGS.recencyYears, enforceRecency: true, requireLibraryAvailability: true })
})

test('refreshing takes the server\'s rules; if the server cannot be reached the settings in use stay', async () => {
  const fresh = await refreshCatalogSettings(async (url) => {
    assert.equal(url, '/api/catalog-settings')
    return { recencyYears: 9, enforceRecency: false, requireLibraryAvailability: false }
  })
  assert.equal(fresh.recencyYears, 9)
  assert.equal(fresh.enforceRecency, false)
  const offline = await refreshCatalogSettings(async () => { throw new Error('down') })
  assert.equal(offline.recencyYears, DEFAULT_CATALOG_SETTINGS.recencyYears)
})
