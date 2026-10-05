'use strict';

// Validation for the ISO form identity the Dean can update. Kept pure so it can be tested
// without a database.
const FORM_KEYS = ['syllabus', 'coaep'];

const isRealDate = (text) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if (!match) return false;
    const [, month, day, year] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

// Returns { ok, value } or { ok: false, errors: [] }. Only the fields present are checked.
const validateFormSettingsInput = (input = {}) => {
    const errors = [];
    const value = {};
    if (input.revisionNo !== undefined) {
        const revision = String(input.revisionNo).trim();
        if (!/^[0-9A-Za-z.-]{1,10}$/.test(revision)) errors.push('Revision No. must be 1-10 letters, digits, dots or dashes.');
        else value.revision_no = revision;
    }
    if (input.effectivity !== undefined) {
        const effectivity = String(input.effectivity).trim();
        if (!isRealDate(effectivity)) errors.push('Effectivity must be a real date written MM/DD/YYYY.');
        else value.effectivity = effectivity;
    }
    if (input.docControlNo !== undefined) {
        const docControl = String(input.docControlNo).trim().toUpperCase();
        if (!/^[A-Z0-9-]{3,30}$/.test(docControl)) errors.push('Doc. Control No. must be 3-30 letters, digits or dashes.');
        else value.doc_control_no = docControl;
    }
    if (errors.length === 0 && Object.keys(value).length === 0) errors.push('Nothing to update.');
    return errors.length ? { ok: false, errors } : { ok: true, value };
};

const toApi = (row) => ({ docControlNo: row.doc_control_no, revisionNo: row.revision_no, effectivity: row.effectivity });

module.exports = { FORM_KEYS, validateFormSettingsInput, toApi };
