'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getReferenceLibrary } = require('../controllers/referenceController');

test('reference library returns authoritative program and department metadata', async () => {
    const response = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };

    await getReferenceLibrary({}, response);

    assert.equal(response.statusCode, 200);
    const bitReference = response.body.find(row => String(row.used_in_courses || '').split(',').includes('BIT213L'));
    assert.ok(bitReference, 'the sample database must include a BIT213L reference');
    assert.match(String(bitReference.programs || ''), /Bachelor of Science in Information Technology/);
    assert.match(String(bitReference.departments || ''), /School of Computer and Information Sciences/);
});
