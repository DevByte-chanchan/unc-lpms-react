'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const packageJson = require('../package.json');
const runtimeConfig = require('../config/config.json');

test('disabled browser rendering is not shipped with Puppeteer', () => {
  assert.equal(packageJson.optionalDependencies?.puppeteer, undefined);
});

test('the sqlite compatibility dependency is on the patched major release', () => {
  const major = Number(String(packageJson.dependencies?.sqlite3 || '').match(/\d+/)?.[0]);
  assert.ok(major >= 6, `expected sqlite3 6 or newer, got ${packageJson.dependencies?.sqlite3}`);
});

test('Sequelize resolves a patched uuid while retaining the APIs it uses', () => {
  const uuid = require('uuid');
  const [major, minor, patch] = require('uuid/package.json').version.split('.').map(Number);
  const isPatched = major > 11 || (major === 11 && (minor > 1 || (minor === 1 && patch >= 1)));
  assert.ok(isPatched, `expected uuid 11.1.1 or newer, got ${major}.${minor}.${patch}`);
  assert.equal(typeof uuid.v1, 'function');
  assert.equal(typeof uuid.v4, 'function');
});

test('the production runtime has an explicit database configuration', () => {
  assert.equal(runtimeConfig.production?.dialect, 'sqlite');
  assert.equal(typeof runtimeConfig.production?.storage, 'string');
});
