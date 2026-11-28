/**
 * Academic-period label helpers and formal date formatting.
 */

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/** Formal date format: "August 18, 2026" */
export const fmtDate = (d) => {
    if (!d) return '—';
    const s = String(d).slice(0, 10);
    const [y, m, day] = s.split('-').map(Number);
    if (!y || !m || !day || m < 1 || m > 12) return String(d);
    return MONTHS[m - 1] + ' ' + day + ', ' + y;
};

export const formatSemester = (s) => {
    const v = String(s || '').trim();
    if (v.toLowerCase() === 'summer' || v === '3') return 'Summer';
    if (v === '1' || v.toLowerCase() === '1st sem' || v.toLowerCase() === '1st semester') return '1st Semester';
    if (v === '2' || v.toLowerCase() === '2nd sem' || v.toLowerCase() === '2nd semester') return '2nd Semester';
    return v;
};

export const formatPeriodLabel = (p) => {
    if (!p) return '';
    const sy = (p.school_year || '').trim();
    const sem = formatSemester(p.semester);
    return (sem + (sy ? ' ' + sy : '')).trim();
};

const YEAR_RX = /(\d{4}\s*-\s*\d{4})/;
const SEM_AFTER_YEAR_RX = /^(.*?)\s+(1st Semester|2nd Semester|Summer|Semester\s*[12])$/i;

export const prettifyLabel = (label) => {
    if (!label) return label;
    let s = String(label).trim();

    s = s.replace(/\bSemester\s*1\b/gi, '1st Semester')
        .replace(/\bSemester\s*2\b/gi, '2nd Semester');

    const m = s.match(SEM_AFTER_YEAR_RX);
    if (m) {
        const left = m[1].trim();
        const sem  = m[2];
        if (YEAR_RX.test(left)) {
            return (sem + ' ' + left).trim();
        }
    }
    return s;
};
