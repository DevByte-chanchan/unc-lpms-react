'use strict';

// Validation for the Reference Library rules. Pure, so it can be tested without a database.
const MAX_YEARS = 30;

// Returns { ok, value } or { ok: false, errors: [] }. Only the fields present are checked.
const validateCatalogSettings = (input = {}) => {
    const errors = [];
    const value = {};
    if (input.recencyYears !== undefined) {
        const years = Number(input.recencyYears);
        if (!Number.isInteger(years) || years < 1 || years > MAX_YEARS) errors.push(`Recency must be a whole number of years from 1 to ${MAX_YEARS}.`);
        else value.recency_years = years;
    }
    for (const [field, column, label] of [['enforceRecency', 'enforce_recency', 'Enforce recency'], ['requireLibraryAvailability', 'require_availability', 'Require library availability']]) {
        if (input[field] === undefined) continue;
        if (typeof input[field] !== 'boolean') errors.push(`${label} must be true or false.`);
        else value[column] = input[field];
    }
    if (errors.length === 0 && Object.keys(value).length === 0) errors.push('Nothing to update.');
    return errors.length ? { ok: false, errors } : { ok: true, value };
};

const toApi = (row) => ({
    recencyYears: row.recency_years,
    enforceRecency: Boolean(row.enforce_recency),
    requireLibraryAvailability: Boolean(row.require_availability),
    updatedBy: row.updated_by_name || null
});

module.exports = { validateCatalogSettings, toApi, MAX_YEARS };
