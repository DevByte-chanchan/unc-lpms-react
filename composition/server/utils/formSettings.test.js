'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toApi } = require('./formSettings');

test('the API shape is camelCase', () => {
    assert.deepEqual(toApi({ doc_control_no: 'A-1', revision_no: '3', effectivity: '01/02/2027' }), { docControlNo: 'A-1', revisionNo: '3', effectivity: '01/02/2027' });
});
