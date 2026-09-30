'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('known demo credentials cannot be seeded in production', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const seeder = require('../seeders/20260812000000-demo-users');
    await assert.rejects(
      () => seeder.up({}),
      /demo accounts are disabled in production/i
    );
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
