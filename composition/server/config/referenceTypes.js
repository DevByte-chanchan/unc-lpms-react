'use strict';

// THE SINGLE SOURCE OF TRUTH for reference types and their fields.
//
// The server validates every create / edit / import against this file; the client builds its
// form from it (GET /api/references/types), so the two can never disagree. When the Director of
// Libraries shares the official template:
//   * change which fields a type requires or allows: edit `required` / `optional` below;
//   * add a type: add an entry (the key is what is stored in References.type);
//   * add a new kind of field: add it to FIELDS with the References column it maps to
//     (and a migration that adds the column).
// Nothing else needs to change.

const THIS_YEAR = () => new Date().getFullYear();

// field key -> label, input kind, References column. Keys are what the API and the form use.
const FIELDS = Object.freeze({
    title: { label: 'Reference Title', kind: 'text', column: 'title', max: 200 },
    authors: { label: 'Author(s)', kind: 'text', column: 'author', max: 200 },
    isbn: { label: 'ISBN', kind: 'isbn', column: 'isbn', max: 100 },
    year: { label: 'Publication Year', kind: 'year', column: 'publication_year' },
    link: { label: 'Link', kind: 'url', column: 'link', max: 500 },
    publisher: { label: 'Publisher', kind: 'text', column: 'publisher', max: 200 }
});

// Per type: `group` is the heading its references appear under in a plan's reference summary and
// in the exported syllabus. Then the fields it must have, the ones it may have, and optional label overrides.
// Any other field sent for a type is ignored (stored empty).
const REFERENCE_TYPES = Object.freeze({
    Textbook: {
        label: 'Textbook',
        group: 'Textbook',
        required: ['title', 'authors', 'isbn', 'year'],
        optional: ['publisher', 'link']
    },
    OER: {
        label: 'Open Educational Resource (OER)',
        group: 'Open Educational Resources',
        required: ['title', 'authors', 'year', 'link'],
        optional: ['publisher']
    },
    'Online Resource': {
        label: 'Online Resource',
        group: 'Online Resources',
        required: ['title', 'authors', 'link'],
        optional: ['year', 'publisher']
    },
    'Online Subscription': {
        label: 'Online Subscription (e.g., O’Reilly)',
        group: 'Online Subscriptions',
        required: ['title', 'publisher', 'link'],
        optional: ['authors', 'year'],
        labels: { publisher: 'Provider / platform', link: 'Subscription link' }
    }
});

const TYPE_KEYS = Object.freeze(Object.keys(REFERENCE_TYPES));
const isReferenceType = (value) => typeof value === 'string' && Object.prototype.hasOwnProperty.call(REFERENCE_TYPES, value);

// Everything the client needs to draw the form, in display order (required first).
const describeTypes = () => TYPE_KEYS.map(key => {
    const type = REFERENCE_TYPES[key];
    const field = (fieldKey, required) => ({
        key: fieldKey,
        label: (type.labels && type.labels[fieldKey]) || FIELDS[fieldKey].label,
        kind: FIELDS[fieldKey].kind,
        required
    });
    return { key, label: type.label, group: type.group, fields: [...type.required.map(f => field(f, true)), ...type.optional.map(f => field(f, false))] };
});

// The values older data used for `type`, mapped to a key by EXACT (case-insensitive) match.
// Anything not listed here is left alone by the migration and reported as unclassified.
const LEGACY_TYPES = Object.freeze({
    textbook: 'Textbook',
    online: 'Online Resource',
    'online resource': 'Online Resource',
    'online resources': 'Online Resource',
    oer: 'OER',
    'open educational resource': 'OER',
    'open educational resources': 'OER',
    'online subscription': 'Online Subscription',
    subscription: 'Online Subscription'
});
const legacyTypeKey = (value) => LEGACY_TYPES[String(value ?? '').trim().toLowerCase()] || null;

module.exports = { FIELDS, REFERENCE_TYPES, TYPE_KEYS, isReferenceType, describeTypes, legacyTypeKey, LEGACY_TYPES, THIS_YEAR };
