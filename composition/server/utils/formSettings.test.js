'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFormSettingsInput, toApi } = require('./formSettings');

test('a valid revision and effectivity are accepted and normalised', () => {
    assert.deepEqual(validateFormSettingsInput({ revisionNo: ' 2 ', effectivity: '08/15/2026' }),
        { ok: true, value: { revision_no: '2', effectivity: '08/15/2026' } });
    assert.deepEqual(validateFormSettingsInput({ docControlNo: 'unc-fm-vpaa-01' }), { ok: true, value: { doc_control_no: 'UNC-FM-VPAA-01' } });
});

test('impossible dates and bad revisions are rejected with a message', () => {
    for (const effectivity of ['02/30/2026', '13/01/2026', '2026-08-15', '8/15/2026', '']) {
        assert.equal(validateFormSettingsInput({ effectivity }).ok, false, effectivity);
    }
    assert.equal(validateFormSettingsInput({ revisionNo: '' }).ok, false);
    assert.equal(validateFormSettingsInput({ revisionNo: 'x'.repeat(11) }).ok, false);
    assert.match(validateFormSettingsInput({ effectivity: 'soon' }).errors[0], /MM\/DD\/YYYY/);
});

test('an empty update is rejected', () => {
    assert.equal(validateFormSettingsInput({}).ok, false);
});

test('the API shape is camelCase', () => {
    assert.deepEqual(toApi({ doc_control_no: 'A-1', revision_no: '3', effectivity: '01/02/2027' }), { docControlNo: 'A-1', revisionNo: '3', effectivity: '01/02/2027' });
});
