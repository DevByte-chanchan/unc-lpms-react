'use strict';

/**
 * Canonical role definitions for the LPMS system (shared with Course Assignment module).
 */
const ROLES = Object.freeze({
    INSTRUCTOR: 'Instructor',
    PROGRAM_HEAD: 'Program Head',
    DIRECTOR_OF_LIBRARIES: 'Director of Libraries',
    INDUSTRY_CONSULTANT: 'Industry Consultant',
    DEAN: 'Dean',
    VPAA: 'VPAA',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

const ROLE_PRIORITY = Object.freeze([
    ROLES.VPAA,
    ROLES.DEAN,
    ROLES.PROGRAM_HEAD,
    ROLES.DIRECTOR_OF_LIBRARIES,
    ROLES.INDUSTRY_CONSULTANT,
    ROLES.INSTRUCTOR,
]);

function normalizeRole(value) {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    for (const canonical of ALL_ROLES) {
        if (canonical.toLowerCase() === lower) return canonical;
    }
    if (lower === 'librarian' || lower === 'library director' || lower === 'library_director') {
        return ROLES.DIRECTOR_OF_LIBRARIES;
    }
    if (lower === 'consultant' || lower === 'industry_consultant') {
        return ROLES.INDUSTRY_CONSULTANT;
    }
    if (lower === 'program head' || lower === 'programhead' || lower === 'chair' || lower === 'program_head') {
        return ROLES.PROGRAM_HEAD;
    }
    if (lower === 'vice president for academic affairs') return ROLES.VPAA;
    if (lower === 'faculty' || lower === 'teacher') return ROLES.INSTRUCTOR;
    return null;
}

function normalizeRoleList(input) {
    const raw = Array.isArray(input) ? input : input ? [input] : [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
        const canonical = normalizeRole(item);
        if (canonical && !seen.has(canonical)) {
            seen.add(canonical);
            out.push(canonical);
        }
    }
    return out;
}

function pickDefaultActiveRole(roles, preferred) {
    const normalized = normalizeRoleList(roles);
    if (normalized.length === 0) return ROLES.INSTRUCTOR;
    const pref = normalizeRole(preferred);
    if (pref && normalized.includes(pref)) return pref;
    for (const candidate of ROLE_PRIORITY) {
        if (normalized.includes(candidate)) return candidate;
    }
    return normalized[0];
}

function deriveRolesFromPosition(position) {
    const canonical = normalizeRole(position);
    if (!canonical) return [ROLES.INSTRUCTOR];
    if (canonical === ROLES.PROGRAM_HEAD) {
        return [ROLES.PROGRAM_HEAD, ROLES.INSTRUCTOR];
    }
    return [canonical];
}

module.exports = {
    ROLES,
    ALL_ROLES,
    ROLE_PRIORITY,
    normalizeRole,
    normalizeRoleList,
    pickDefaultActiveRole,
    deriveRolesFromPosition,
};
