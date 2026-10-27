'use strict';

// Validates the syllabus due date a Program Head or Dean sets for one program and term.
// Pure: no database. Returns { ok, errors: { field: message }, values }.

const SEMESTERS = ['1st', '2nd', 'Summer'];

const isRealDate = (value) => {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validateDeadline = (raw) => {
    const input = raw && typeof raw === 'object' ? raw : {};
    const errors = {};
    const schoolYear = String(input.school_year ?? '').trim();
    const semester = String(input.semester ?? '').trim();
    const due = String(input.syllabus_due ?? '').trim();
    const programId = Number(input.program_id);

    const years = /^([0-9]{4})-([0-9]{4})$/.exec(schoolYear);
    if (!years || Number(years[2]) !== Number(years[1]) + 1) errors.school_year = 'School year must look like 2026-2027.';
    if (!SEMESTERS.includes(semester)) errors.semester = 'Semester must be 1st, 2nd or Summer.';
    if (!Number.isSafeInteger(programId) || programId <= 0) errors.program_id = 'Choose a program.';
    if (!isRealDate(due)) errors.syllabus_due = 'The due date must be a real date written YYYY-MM-DD.';
    else if (years && (due < `${years[1]}-01-01` || due > `${Number(years[2]) + 1}-12-31`)) errors.syllabus_due = 'The due date must fall in or near the school year.';

    if (Object.keys(errors).length) return { ok: false, errors, values: null };
    return { ok: true, errors: {}, values: { school_year: schoolYear, semester, program_id: programId, syllabus_due: due } };
};

module.exports = { SEMESTERS, isRealDate, validateDeadline };
