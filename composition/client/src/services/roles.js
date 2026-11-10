/**
 * Canonical role definitions for the LPMS frontend (mirrored from Course Assignment module).
 */
export const ROLES = Object.freeze({
    INSTRUCTOR: 'Instructor',
    PROGRAM_HEAD: 'Program Head',
    DIRECTOR_OF_LIBRARIES: 'Director of Libraries',
    INDUSTRY_CONSULTANT: 'Industry Consultant',
    DEAN: 'Dean',
    VPAA: 'VPAA',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const ROLE_DISPLAY = Object.freeze({
    [ROLES.INSTRUCTOR]: {
        title: 'Instructor',
        departmentFallback: 'School of Computer and Information Sciences',
    },
    [ROLES.PROGRAM_HEAD]: {
        title: 'Program Head',
        departmentFallback: 'School of Computer and Information Sciences',
    },
    [ROLES.DIRECTOR_OF_LIBRARIES]: {
        title: 'Director of Libraries',
        departmentFallback: 'University Library',
    },
    [ROLES.INDUSTRY_CONSULTANT]: {
        title: 'Industry Consultant',
        departmentFallback: 'Industry Advisory Board',
    },
    [ROLES.DEAN]: {
        title: 'Dean',
        departmentFallback: 'School of Computer and Information Sciences',
    },
    [ROLES.VPAA]: {
        title: 'Vice President for Academic Affairs',
        departmentFallback: 'Office of the VPAA',
    },
});

export function normalizeRole(value) {
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
    if (lower === 'consultant' || lower === 'industry_consultant') return ROLES.INDUSTRY_CONSULTANT;
    if (lower === 'program head' || lower === 'programhead' || lower === 'chair' || lower === 'program_head') {
        return ROLES.PROGRAM_HEAD;
    }
    if (lower === 'vice president for academic affairs') return ROLES.VPAA;
    if (lower === 'faculty' || lower === 'teacher') return ROLES.INSTRUCTOR;
    return null;
}

export function hasRole(user, allowed) {
    if (!user?.activeRole) return false;
    const list = Array.isArray(allowed) ? allowed : [allowed];
    return list.some((r) => normalizeRole(r) === user.activeRole);
}

export function defaultLandingPath(_role) {
    return '/';
}
