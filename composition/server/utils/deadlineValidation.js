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

    // The reminder schedule, both optional (empty: the defaults). remind_before: 0-60 days before (0 = on the day),
    // at most 6 different days, given as a list or "7,3,1,0"; overdue_every: 0 (none) to 30 days.
    let remindBefore = null;
    if (input.remind_before != null && input.remind_before !== '') {
        const list = (Array.isArray(input.remind_before) ? input.remind_before : String(input.remind_before).split(','))
            .map(v => String(v).trim()).filter(v => v !== '');
        const days = [...new Set(list.map(Number))];
        if (list.length === 0 || days.some(d => !Number.isInteger(d) || d < 0 || d > 60)) errors.remind_before = 'Reminder days must be whole numbers from 0 to 60.';
        else if (days.length > 6) errors.remind_before = 'Choose at most 6 reminder days.';
        else remindBefore = days.sort((a, b) => b - a).join(',');
    }
    let overdueEvery = null;
    if (input.overdue_every != null && input.overdue_every !== '') {
        const every = Number(input.overdue_every);
        if (!Number.isInteger(every) || every < 0 || every > 30) errors.overdue_every = 'Repeat every 0 (never) to 30 days.';
        else overdueEvery = every;
    }

    // When to start (optional): a real date on or before the due date.
    let startDate = null;
    if (input.start_date != null && input.start_date !== '') {
        const start = String(input.start_date).trim();
        if (!isRealDate(start)) errors.start_date = 'The start date must be a real date written YYYY-MM-DD.';
        else if (isRealDate(due) && start > due) errors.start_date = 'The start date must be on or before the due date.';
        else startDate = start;
    }

    if (Object.keys(errors).length) return { ok: false, errors, values: null };
    return { ok: true, errors: {}, values: { school_year: schoolYear, semester, program_id: programId, syllabus_due: due, remind_before: remindBefore, overdue_every: overdueEvery, start_date: startDate } };
};

module.exports = { SEMESTERS, isRealDate, validateDeadline };
