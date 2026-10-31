'use strict';

// The health of library references, on the server: which are unusable, older than the Director's recency
// rule, or missing what a reviewer looks for. The same rules as the Reference Library screen
// (client/src/utils/referenceHealth.js); the automatic jobs use this copy. Pure except yearsRule().

const DEFAULT_YEARS = 5;

// The Director's recency rule (years), from the catalog settings row; the default when there is none.
const yearsRule = async (models = require('../models')) => {
    const row = await models.CatalogSetting.findByPk(1, { raw: true });
    return Number(row?.recency_years) || DEFAULT_YEARS;
};

// Why a stored reference cannot be used ('' when it can).
const unavailableReason = (ref) => {
    const status = String(ref?.status || '').toLowerCase();
    if (status === 'lost') return 'lost';
    if (status === 'withdrawn') return 'withdrawn';
    if (ref?.copies === 0) return 'no copies left';
    return '';
};

const isTextbook = (ref) => String(ref?.type || '').toLowerCase().startsWith('textbook');
const blank = (value) => value == null || ['', '-', '#'].includes(String(value).trim());

// Flags for one stored reference row ({ status, copies, publication_year, isbn, link, type }).
const flagsOf = (ref, { years = DEFAULT_YEARS, currentYear = new Date().getFullYear() } = {}) => {
    const year = ref?.publication_year ? new Date(ref.publication_year).getFullYear() : NaN;
    return {
        unavailable: Boolean(unavailableReason(ref)),
        noYear: !Number.isFinite(year),
        outdated: Number.isFinite(year) && currentYear - year >= years,
        noIsbn: isTextbook(ref) && blank(ref?.isbn),
        noLink: !isTextbook(ref) && blank(ref?.link)
    };
};

const needsAttention = (flags) => Object.values(flags).some(Boolean);

// Counts over many stored rows.
const healthCounts = (refs = [], options = {}) => {
    const all = refs.map(ref => flagsOf(ref, options));
    const count = (key) => all.filter(flags => flags[key]).length;
    return {
        total: all.length, needAttention: all.filter(needsAttention).length,
        unavailable: count('unavailable'), outdated: count('outdated'), noYear: count('noYear'), noIsbn: count('noIsbn'), noLink: count('noLink')
    };
};

// "12 of 147 active references need attention: 2 not available · 9 outdated · 1 no ISBN"
const healthText = (counts) => {
    const parts = [
        counts.unavailable && `${counts.unavailable} not available`, counts.outdated && `${counts.outdated} outdated`,
        counts.noYear && `${counts.noYear} no year`, counts.noIsbn && `${counts.noIsbn} no ISBN`, counts.noLink && `${counts.noLink} no link`
    ].filter(Boolean);
    return `${counts.needAttention} of ${counts.total} active references need attention${parts.length ? `: ${parts.join(' · ')}` : ''}`;
};

module.exports = { yearsRule, unavailableReason, flagsOf, needsAttention, healthCounts, healthText, DEFAULT_YEARS };
