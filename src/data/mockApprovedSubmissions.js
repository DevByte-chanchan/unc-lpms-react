/**
 * Mock approved-submissions repository.
 *
 * Mirrors the canonical schemas defined in the LPMS data dictionary:
 *
 *   §11.1 Approved-Learning-Plan-Repository
 *     @co_assign_id, pc_offering_id, stakeholder_id,
 *     date_assigned, date_submitted, (date_updated),
 *     (ph_date_returned), (ic_date_returned),
 *     (ld_date_returned), (d_date_returned),
 *     (ph_date_accepted), (ic_date_accepted),
 *     (ld_date_accepted), (d_date_accepted), period_type
 *
 *   §12.1 Approved-TOS-Repository
 *     @co_assign_id, pc_offering_id, stakeholder_id,
 *     tos_date_submitted, (tos_date_updated),
 *     (tos_ph_date_returned), (tos_d_date_returned),
 *     (tos_ph_date_accepted), (tos_d_date_accepted), period_type
 *
 * Every row carries those canonical fields verbatim so the mock data is
 * truthful to what the API will return once the submission pipeline
 * lands. In addition each row holds a small denormalised display layer
 * — the kind of fields you'd get from joining the repo to the
 * faculty / course-offering / program / department tables in a real
 * query — so the table component can stay simple:
 *
 *   id                      // React key — co_assign_id prefixed by kind
 *   department_code         // → joins with Departments master list
 *   program                 // → joins with Programs (via pc_offering)
 *   instructor_name         // → joins with Faculty (via stakeholder_id)
 *   course_id, course_name  // → joins with Course Offering (via pc_offering_id)
 *   file_name, file_url     // → stored alongside the repository record
 *   submission_date         // alias  = date_submitted        (LP)
 *                           //        = tos_date_submitted    (TOS)
 *   approved_date           // alias  = d_date_accepted       (LP — Dean finalises)
 *                           //        = tos_d_date_accepted   (TOS — Dean finalises)
 *   period_label            // human form of period_type — overridden at
 *                           //   render time by OVPAARepository so the
 *                           //   demo always reflects the active term
 *
 * One row per dataset uses a real sample PDF (Mozilla's PDF.js demo)
 * so the OVPAA can verify the in-app iframe viewer end-to-end.
 */

const TODAY = new Date();
const daysAgo = (n) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// Runtime-overridden placeholders.
const P_LABEL = '—';
const P_TYPE  = '1st-2526';   // ≤10 chars per §11.1.15 / §12.1.10
const SAMPLE_PDF = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';

// ─────────────────────────────── Programs ───────────────────────────────
// Dummy program master list per department. The OVPAA dropdown above
// the drill-down table pulls from this so users can filter by program.
export const PROGRAMS_BY_DEPT = {
  COE:   ['BS Civil Engineering', 'BS Electrical Engineering', 'BS Mechanical Engineering'],
  CEA:   ['BS Architecture', 'BS Interior Design'],
  CJE:   ['BS Criminology', 'BS Forensic Science'],
  SBA:   ['BS Accountancy', 'BS Business Administration', 'BS Marketing', 'BS Finance', 'BS Economics', 'BS Human Resource Management'],
  SAS:   ['BA English', 'BS Psychology', 'BA History', 'BS Sociology'],
  SNAHS: ['BS Nursing', 'BS Medical Technology'],
  SSNS:  ['BS Biology', 'BS Chemistry'],
};

const PROGRAM_BY_PREFIX = {
  CE: 'BS Civil Engineering',  EE: 'BS Electrical Engineering', ME: 'BS Mechanical Engineering',
  ARCH: 'BS Architecture',     CRIM: 'BS Criminology',
  ACC: 'BS Accountancy',       MGT: 'BS Business Administration', FIN: 'BS Finance',
  MKT: 'BS Marketing',         ECON: 'BS Economics',              HRM: 'BS Human Resource Management',
  ENG: 'BA English',           PSY: 'BS Psychology',              HIST: 'BA History', SOC: 'BS Sociology',
  NUR: 'BS Nursing',           BIO: 'BS Biology',                 CHEM: 'BS Chemistry',
};
const programFor = (courseId) => {
  const m = String(courseId || '').match(/^([A-Z]+)/);
  return (m && PROGRAM_BY_PREFIX[m[1]]) || 'General Education';
};

// Stakeholder ID generator — §11.1.3 / §12.1.3 cap at 20 chars. Format:
// "F-<DEPT>-<SURNAME8>" so it stays legible and bounded.
const stakeholderIdFor = (dept, instructor) => {
  const surname = String(instructor).split(',')[0].replace(/\s+/g, '').slice(0, 8).toUpperCase();
  return ('F-' + dept + '-' + surname).slice(0, 20);
};

// ─────────────────────────── Row builders ────────────────────────────
/**
 * Build one Approved-Learning-Plan row that satisfies §11.1.
 *
 *   coAssignId   — long-int PK (§11.1.1)
 *   pcOfferingId — long-int FK (§11.1.2)
 *   dept         — department code (denormalised; joined via pc_offering)
 *   instructor   — display name (denormalised; joined via stakeholder)
 *   courseId,
 *   courseName   — denormalised course-offering fields
 *   subDays      — how many days ago the LP was submitted
 *   fileName     — display name for the approved file
 *   opts.gap     — days between submission and Dean's final acceptance
 *                  (= "Approved Date"); approval workflow steps stack
 *                  in between (PH → IC → LD → Dean)
 *   opts.program — override the auto-derived program
 *   opts.file_url, opts.period_type, opts.returns — overrides
 */
const lpRow = (
  coAssignId, pcOfferingId, dept, instructor,
  courseId, courseName, subDays, fileName, opts = {}
) => {
  const gap   = opts.gap || 4;
  const dateSubmitted = daysAgo(subDays);
  const dateUpdated   = daysAgo(Math.max(0, subDays - 1));
  // Approval workflow staggers a day apart so the audit trail is realistic.
  const phAccepted = daysAgo(Math.max(0, subDays - Math.max(1, gap - 3)));
  const icAccepted = daysAgo(Math.max(0, subDays - Math.max(2, gap - 2)));
  const ldAccepted = daysAgo(Math.max(0, subDays - Math.max(3, gap - 1)));
  const dAccepted  = daysAgo(Math.max(0, subDays - gap));
  const returns    = opts.returns || {};
  return {
    // ─── §11.1 canonical schema ──────────────────────────────────────
    co_assign_id:     coAssignId,                                 // 11.1.1
    pc_offering_id:   pcOfferingId,                               // 11.1.2
    stakeholder_id:   stakeholderIdFor(dept, instructor),         // 11.1.3
    date_assigned:    daysAgo(subDays + 21),                      // 11.1.4
    date_submitted:   dateSubmitted,                              // 11.1.5
    date_updated:     dateUpdated,                                // 11.1.6
    ph_date_returned: returns.ph || null,                         // 11.1.7
    ic_date_returned: returns.ic || null,                         // 11.1.8
    ld_date_returned: returns.ld || null,                         // 11.1.9
    d_date_returned:  returns.d  || null,                         // 11.1.10
    ph_date_accepted: phAccepted,                                 // 11.1.11
    ic_date_accepted: icAccepted,                                 // 11.1.12
    ld_date_accepted: ldAccepted,                                 // 11.1.13
    d_date_accepted:  dAccepted,                                  // 11.1.14
    period_type:      opts.period_type || P_TYPE,                 // 11.1.15

    // ─── denormalised / display fields ───────────────────────────────
    id:               'lp-' + coAssignId,
    department_code:  dept,
    program:          opts.program || programFor(courseId),
    instructor_name:  instructor,
    course_id:        courseId,
    course_name:      courseName,
    file_name:        fileName,
    file_url:         opts.file_url,

    // ─── aliases consumed by ApprovedFileTable ──────────────────────
    submission_date:  dateSubmitted,
    approved_date:    dAccepted,
    period_label:     P_LABEL,
  };
};

/**
 * Build one Approved-TOS row that satisfies §12.1. Same shape as the
 * LP builder but the approval workflow is shorter (PH → Dean) and the
 * date columns carry the `tos_` prefix.
 */
const tosRow = (
  coAssignId, pcOfferingId, dept, instructor,
  courseId, courseName, subDays, fileName, opts = {}
) => {
  const gap   = opts.gap || 4;
  const dateSubmitted = daysAgo(subDays);
  const dateUpdated   = daysAgo(Math.max(0, subDays - 1));
  const phAccepted    = daysAgo(Math.max(0, subDays - Math.max(2, gap - 2)));
  const dAccepted     = daysAgo(Math.max(0, subDays - gap));
  const returns       = opts.returns || {};
  return {
    // ─── §12.1 canonical schema ──────────────────────────────────────
    co_assign_id:         coAssignId,                             // 12.1.1
    pc_offering_id:       pcOfferingId,                           // 12.1.2
    stakeholder_id:       stakeholderIdFor(dept, instructor),     // 12.1.3
    tos_date_submitted:   dateSubmitted,                          // 12.1.4
    tos_date_updated:     dateUpdated,                            // 12.1.5
    tos_ph_date_returned: returns.ph || null,                     // 12.1.6
    tos_d_date_returned:  returns.d  || null,                     // 12.1.7
    tos_ph_date_accepted: phAccepted,                             // 12.1.8
    tos_d_date_accepted:  dAccepted,                              // 12.1.9
    period_type:          opts.period_type || P_TYPE,             // 12.1.10

    // ─── denormalised / display fields ───────────────────────────────
    id:                'tos-' + coAssignId,
    department_code:   dept,
    program:           opts.program || programFor(courseId),
    instructor_name:   instructor,
    course_id:         courseId,
    course_name:       courseName,
    file_name:         fileName,
    file_url:          opts.file_url,

    // ─── aliases consumed by ApprovedFileTable ──────────────────────
    submission_date:   dateSubmitted,
    approved_date:     dAccepted,
    period_label:      P_LABEL,
  };
};

// ─────────────────────────── Learning Plans ───────────────────────────
// co_assign_id 12001+, pc_offering_id 30001+ — sequential per dictionary.
export const mockLearningPlans = [
  // COE
  lpRow(12001, 30001, 'COE',  'DELA CRUZ, JUAN',   'CE 211',  'Statics of Rigid Bodies',     8,  'LP-CE211-DELACRUZ.pdf',  { file_url: SAMPLE_PDF, gap: 5 }),
  lpRow(12002, 30002, 'COE',  'REYES, MARIA',      'CE 314',  'Hydraulics',                  12, 'LP-CE314-REYES.pdf',     { gap: 5 }),
  lpRow(12003, 30003, 'COE',  'SANTOS, PAOLO',     'EE 201',  'Electrical Circuits 1',       17, 'LP-EE201-SANTOS.pdf',    { gap: 5 }),
  lpRow(12004, 30004, 'COE',  'CRUZ, ANDREA',      'ME 102',  'Engineering Drawing',         22, 'LP-ME102-CRUZ.pdf',      { gap: 4 }),
  lpRow(12005, 30005, 'COE',  'LIM, JOSHUA',       'CE 401',  'Geotechnical Engineering',    27, 'LP-CE401-LIM.pdf',       { gap: 5 }),

  // CEA
  lpRow(12010, 30010, 'CEA',  'TORRES, ANGELA',    'ARCH 301', 'Architectural Design 3',     10, 'LP-ARCH301-TORRES.pdf',  { file_url: SAMPLE_PDF, gap: 5 }),
  lpRow(12011, 30011, 'CEA',  'GARCIA, BENJAMIN',  'ARCH 205', 'Building Materials',         13, 'LP-ARCH205-GARCIA.pdf',  { gap: 5 }),
  lpRow(12012, 30012, 'CEA',  'YANSON, BEATRICE',  'ARCH 410', 'Building Systems Design',    22, 'LP-ARCH410-YANSON.pdf',  { gap: 5 }),

  // CJE
  lpRow(12020, 30020, 'CJE',  'RAMOS, FERNANDO',   'CRIM 101', 'Introduction to Criminology', 7,  'LP-CRIM101-RAMOS.pdf',   { gap: 5 }),
  lpRow(12021, 30021, 'CJE',  'MERCADO, IRENE',    'CRIM 202', 'Criminal Law 1',             16, 'LP-CRIM202-MERCADO.pdf', { gap: 5 }),
  lpRow(12022, 30022, 'CJE',  'GUZMAN, ARTHUR',    'CRIM 320', 'Forensic Science',           24, 'LP-CRIM320-GUZMAN.pdf',  { gap: 5, program: 'BS Forensic Science' }),

  // SBA
  lpRow(12030, 30030, 'SBA',  'NAVARRO, LUIS',     'ACC 101',  'Fundamentals of Accounting', 9,  'LP-ACC101-NAVARRO.pdf',  { file_url: SAMPLE_PDF, gap: 5 }),
  lpRow(12031, 30031, 'SBA',  'VILLEGAS, KATHLYN', 'MGT 220',  'Principles of Management',   14, 'LP-MGT220-VILLEGAS.pdf', { gap: 5 }),
  lpRow(12032, 30032, 'SBA',  'AQUINO, RODEL',     'FIN 305',  'Corporate Finance',          19, 'LP-FIN305-AQUINO.pdf',   { gap: 5 }),
  lpRow(12033, 30033, 'SBA',  'DOMINGO, CLAIRE',   'MKT 210',  'Principles of Marketing',    23, 'LP-MKT210-DOMINGO.pdf',  { gap: 5 }),
  lpRow(12034, 30034, 'SBA',  'ROBLES, MARCO',     'ECON 105', 'Microeconomics',             26, 'LP-ECON105-ROBLES.pdf',  { gap: 5 }),
  lpRow(12035, 30035, 'SBA',  'PASCUAL, KRISTINE', 'HRM 240',  'Human Resource Management',  30, 'LP-HRM240-PASCUAL.pdf',  { gap: 5 }),

  // SAS
  lpRow(12040, 30040, 'SAS',  'BAUTISTA, MIGUEL',  'ENG 101',  'Purposive Communication',    11, 'LP-ENG101-BAUTISTA.pdf', { gap: 5 }),
  lpRow(12041, 30041, 'SAS',  'FLORES, BEATRIZ',   'PSY 110',  'General Psychology',         18, 'LP-PSY110-FLORES.pdf',   { gap: 5 }),
  lpRow(12042, 30042, 'SAS',  'ROXAS, DANIEL',     'HIST 120', 'Readings in Philippine History', 25, 'LP-HIST120-ROXAS.pdf', { gap: 5 }),
  lpRow(12043, 30043, 'SAS',  'SISON, GRACE',      'SOC 101',  'Introduction to Sociology',  29, 'LP-SOC101-SISON.pdf',    { gap: 5 }),

  // SNAHS
  lpRow(12050, 30050, 'SNAHS','CASTILLO, NORMA',   'NUR 201',  'Health Assessment',          6,  'LP-NUR201-CASTILLO.pdf', { file_url: SAMPLE_PDF, gap: 5 }),
  lpRow(12051, 30051, 'SNAHS','AGUILAR, REYNALDO', 'NUR 305',  'Pharmacology',               15, 'LP-NUR305-AGUILAR.pdf',  { gap: 5 }),
  lpRow(12052, 30052, 'SNAHS','MENDOZA, OLIVIA',   'NUR 210',  'Anatomy & Physiology',       21, 'LP-NUR210-MENDOZA.pdf',  { gap: 5 }),

  // SSNS
  lpRow(12060, 30060, 'SSNS', 'PEREZ, NATHANIEL',  'BIO 101',  'General Biology',            20, 'LP-BIO101-PEREZ.pdf',    { gap: 5 }),
  lpRow(12061, 30061, 'SSNS', 'IBANEZ, RACHEL',    'CHEM 110', 'General Chemistry',          28, 'LP-CHEM110-IBANEZ.pdf',  { gap: 5 }),
];

// ──────────────────────────────── TOS ────────────────────────────────
// co_assign_id 22001+, pc_offering_id 40001+ — distinct from LP so the
// IDs don't visually collide when both repos are in front of a developer.
export const mockTOS = [
  // COE
  tosRow(22001, 40001, 'COE', 'DELA CRUZ, JUAN',   'CE 211',  'Statics of Rigid Bodies',     7,  'TOS-CE211-DELACRUZ.pdf', { file_url: SAMPLE_PDF, gap: 5 }),
  tosRow(22002, 40002, 'COE', 'SANTOS, PAOLO',     'EE 201',  'Electrical Circuits 1',       14, 'TOS-EE201-SANTOS.pdf',   { gap: 5 }),
  tosRow(22003, 40003, 'COE', 'CRUZ, ANDREA',      'ME 102',  'Engineering Drawing',         25, 'TOS-ME102-CRUZ.pdf',     { gap: 5 }),

  // CEA
  tosRow(22010, 40010, 'CEA', 'TORRES, ANGELA',    'ARCH 301', 'Architectural Design 3',     11, 'TOS-ARCH301-TORRES.pdf', { gap: 5 }),
  tosRow(22011, 40011, 'CEA', 'YANSON, BEATRICE',  'ARCH 410', 'Building Systems Design',    24, 'TOS-ARCH410-YANSON.pdf', { gap: 5 }),

  // CJE
  tosRow(22020, 40020, 'CJE', 'RAMOS, FERNANDO',   'CRIM 101', 'Introduction to Criminology', 9,  'TOS-CRIM101-RAMOS.pdf', { file_url: SAMPLE_PDF, gap: 5 }),
  tosRow(22021, 40021, 'CJE', 'MERCADO, IRENE',    'CRIM 202', 'Criminal Law 1',             17, 'TOS-CRIM202-MERCADO.pdf',{ gap: 5 }),
  tosRow(22022, 40022, 'CJE', 'GUZMAN, ARTHUR',    'CRIM 320', 'Forensic Science',           27, 'TOS-CRIM320-GUZMAN.pdf', { gap: 5, program: 'BS Forensic Science' }),

  // SBA
  tosRow(22030, 40030, 'SBA', 'NAVARRO, LUIS',     'ACC 101',  'Fundamentals of Accounting', 8,  'TOS-ACC101-NAVARRO.pdf', { gap: 5 }),
  tosRow(22031, 40031, 'SBA', 'VILLEGAS, KATHLYN', 'MGT 220',  'Principles of Management',   13, 'TOS-MGT220-VILLEGAS.pdf',{ gap: 5 }),
  tosRow(22032, 40032, 'SBA', 'AQUINO, RODEL',     'FIN 305',  'Corporate Finance',          21, 'TOS-FIN305-AQUINO.pdf',  { gap: 5 }),
  tosRow(22033, 40033, 'SBA', 'ROBLES, MARCO',     'ECON 105', 'Microeconomics',             29, 'TOS-ECON105-ROBLES.pdf', { gap: 5 }),

  // SAS
  tosRow(22040, 40040, 'SAS', 'BAUTISTA, MIGUEL',  'ENG 101',  'Purposive Communication',    12, 'TOS-ENG101-BAUTISTA.pdf',{ gap: 5 }),
  tosRow(22041, 40041, 'SAS', 'FLORES, BEATRIZ',   'PSY 110',  'General Psychology',         20, 'TOS-PSY110-FLORES.pdf',  { gap: 5 }),
  tosRow(22042, 40042, 'SAS', 'ROXAS, DANIEL',     'HIST 120', 'Readings in Philippine History', 26, 'TOS-HIST120-ROXAS.pdf', { gap: 5 }),

  // SNAHS
  tosRow(22050, 40050, 'SNAHS','CASTILLO, NORMA',  'NUR 201',  'Health Assessment',          10, 'TOS-NUR201-CASTILLO.pdf',{ file_url: SAMPLE_PDF, gap: 5 }),
  tosRow(22051, 40051, 'SNAHS','AGUILAR, REYNALDO','NUR 305',  'Pharmacology',               16, 'TOS-NUR305-AGUILAR.pdf', { gap: 5 }),
  tosRow(22052, 40052, 'SNAHS','MENDOZA, OLIVIA',  'NUR 210',  'Anatomy & Physiology',       23, 'TOS-NUR210-MENDOZA.pdf', { gap: 5 }),

  // SSNS
  tosRow(22060, 40060, 'SSNS','PEREZ, NATHANIEL',  'BIO 101',  'General Biology',            19, 'TOS-BIO101-PEREZ.pdf',   { gap: 5 }),
  tosRow(22061, 40061, 'SSNS','IBANEZ, RACHEL',    'CHEM 110', 'General Chemistry',          31, 'TOS-CHEM110-IBANEZ.pdf', { gap: 5 }),
];

// Helper: count submissions per department code. If periodLabel is
// supplied, only rows whose period_label matches it are counted; the
// OVPAARepository synthesises a current-period dataset before calling
// this so the count always reflects the active term.
export const countByDepartment = (rows, periodLabel) => {
  const out = {};
  rows.forEach((r) => {
    if (periodLabel && r.period_label !== periodLabel) return;
    out[r.department_code] = (out[r.department_code] || 0) + 1;
  });
  return out;
};

// Helper: filter rows to one department.
export const rowsForDepartment = (rows, code) => rows.filter((r) => r.department_code === code);
