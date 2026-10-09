'use strict';

// Validates one reference against config/referenceTypes.js. Pure: no database.
//
//   input  : { type, title, authors, isbn, year, link, publisher }  (config field keys; the old
//            names `author` and `publication_year` are accepted too)
//   result : { ok, errors: { field: message }, values } where `values` are References columns.

const { FIELDS, REFERENCE_TYPES, isReferenceType, THIS_YEAR } = require('../config/referenceTypes');

const clean = (value) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

const checkers = {
    text: (value, def) => (value.length > def.max ? `${def.label} must be at most ${def.max} characters.` : null),
    isbn: (value) => {
        if (!/^[0-9Xx][0-9Xx -]*$/.test(value)) return 'ISBN may contain only digits, hyphens, spaces and X.';
        const digits = value.replace(/[ -]/g, '');
        return digits.length === 10 || digits.length === 13 ? null : 'ISBN must have 10 or 13 digits.';
    },
    year: (value) => {
        if (!/^\d{4}$/.test(value)) return 'Publication Year must be a 4-digit year (e.g., 2023).';
        const year = Number(value);
        return year >= 1900 && year <= THIS_YEAR() + 1 ? null : `Publication Year must be between 1900 and ${THIS_YEAR() + 1}.`;
    },
    url: (value, def) => {
        if (value.length > def.max) return `${def.label} must be at most ${def.max} characters.`;
        try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') ? null : 'Enter a valid http(s) link (e.g., https://example.com).';
        } catch {
            return 'Enter a valid http(s) link (e.g., https://example.com).';
        }
    }
};

const pick = (input, key) => {
    if (input[key] !== undefined) return input[key];
    if (key === 'authors') return input.author;
    if (key === 'year') return input.publication_year;
    return undefined;
};

const validateReference = (raw) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    const errors = {};
    const type = clean(input.type);
    if (!isReferenceType(type)) {
        return { ok: false, errors: { type: 'Unknown reference type.' }, values: null };
    }

    const config = REFERENCE_TYPES[type];
    const values = { type };
    for (const [key, def] of Object.entries(FIELDS)) {
        const allowed = config.required.includes(key) || config.optional.includes(key);
        let value = allowed ? clean(pick(input, key)) : '';
        if (key === 'year' && /^\d{4}-/.test(value)) value = value.slice(0, 4); // a stored timestamp
        const label = (config.labels && config.labels[key]) || def.label;
        if (allowed && !value) {
            if (config.required.includes(key)) errors[key] = `${label} is required.`;
        } else if (value) {
            const problem = checkers[def.kind](value, { ...def, label });
            if (problem) errors[key] = problem;
        }
        values[def.column] = value
            ? (key === 'year' ? new Date(Date.UTC(Number(value), 0, 1)) : value)
            : null;
    }
    return Object.keys(errors).length === 0 ? { ok: true, errors: {}, values } : { ok: false, errors, values: null };
};

// Identity for duplicate detection: same title and same authors, ignoring case and spacing.
const duplicateKey = (title, authors) => `${clean(title).toLowerCase()}|${clean(authors).toLowerCase()}`;

// Config field keys whose values differ between a stored row and validated new values.
const changedFields = (stored, values) => {
    const changed = [];
    if (stored.type !== values.type) changed.push('type');
    for (const [key, def] of Object.entries(FIELDS)) {
        const before = def.kind === 'year'
            ? (stored[def.column] ? String(new Date(stored[def.column]).getUTCFullYear()) : '')
            : clean(stored[def.column]);
        const after = def.kind === 'year'
            ? (values[def.column] ? String(values[def.column].getUTCFullYear()) : '')
            : clean(values[def.column]);
        if (before !== after) changed.push(key);
    }
    return changed;
};

module.exports = { validateReference, duplicateKey, changedFields, clean };
