/**
 * Mock approved Learning Plans (syllabi) for the OVPAA repository demo.
 *
 * Stands in for the Learning Plan API this app doesn't have yet (the v2 backend's
 * /api/course-details, /api/course-outcome-alignment, /api/course-coverage,
 * /api/course-criteria, /api/courses/:key/references, /api/assignments/offering/:pcId).
 * Each plan is generated from its row's course code and title, in the exact shape
 * utils/syllabusPdfHtml.js (buildSyllabusHtml) reads:
 *
 *   syllabus  { code, name, description, credits, contact, prerequisites, class, cmo,
 *               year, sem, revision, instructor, sdg,
 *               courseOutcomes: [{ id, description, poMappings }],
 *               ilos:   [{ id: 'CO1-ILO1', deliveryWeek, allocatedTime, intendedLearningOutcome, topics, references }],
 *               topics: [{ title, subtopics: [{ value }], tlas: [{ tlaName, classPhase, performedBy, laboratory, tlaDescription }] }],
 *               assessments: [{ id, tlaName, assessmentMethod, description }],
 *               gradingSystem: [{ co, ilos: [{ id, assessments, weight: { prelim, midterm, semi, final }, minPassing }] }],
 *               references: [{ type, title, authors, year, isbn, link }] }
 *   workflow  approved: Program Head, Director of Libraries and Dean accepted.
 *   alignment the program's PEOs and POs for pages 2–3.
 *
 * The text is written for the demo; nothing here is an official course document.
 */
import { yearLevelFor, PROGRAM_HEADS } from './mockTosContent.js';

const DEPARTMENTS = {
  COE: 'COLLEGE OF ENGINEERING',
  CEA: 'COLLEGE OF ENGINEERING AND ARCHITECTURE',
  CJE: 'COLLEGE OF CRIMINAL JUSTICE EDUCATION',
  SBA: 'SCHOOL OF BUSINESS AND ACCOUNTANCY',
  SAS: 'SCHOOL OF ARTS AND SCIENCES',
  SNAHS: 'SCHOOL OF NURSING AND ALLIED HEALTH SCIENCES',
  SSNS: 'SCHOOL OF SCIENCES AND NATURAL SCIENCES',
  SCIS: 'SCHOOL OF COMPUTER AND INFORMATION SCIENCES',
};

const DEANS = {
  COE: 'Dr. Elena Villanueva', CEA: 'Dr. Elena Villanueva', CJE: 'Dr. Marissa Dizon', SBA: 'Dr. Antonio Reyes',
  SAS: 'Dr. Jose Bernardo', SNAHS: 'Dr. Patricia Yap', SSNS: 'Dr. Jose Bernardo', SCIS: 'Dr. Ramon Bautista',
};
const LIBRARY_DIRECTOR = 'Maria Santos';

const SUBJECT_WORDS = (name) => String(name).replace(/\s*[&]\s*/g, ' and ');

// Weekly coverage: 12 ILO weeks around the four examination weeks (4, 8, 12, 16 → 17/18 finals).
const WEEKS = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
const COS = ['CO1', 'CO1', 'CO1', 'CO1', 'CO2', 'CO2', 'CO2', 'CO2', 'CO3', 'CO3', 'CO3', 'CO3'];

const topicTitles = (c) => [
  `Introduction to ${c}`,
  `Historical Development and Scope of ${c}`,
  `Basic Terms and Concepts in ${c}`,
  `Core Principles of ${c}`,
  `Methods and Tools Used in ${c}`,
  `Problem Solving in ${c}`,
  `${c} in Professional Practice`,
  `Standards, Ethics and Regulations in ${c}`,
  `Case Studies in ${c}`,
  `Current Trends and Issues in ${c}`,
  `Designing a Project in ${c}`,
  `Presenting and Evaluating Outputs in ${c}`,
];

const iloText = (c, i) => [
  `Describe the nature, scope and importance of ${c}.`,
  `Trace the development of ${c} and relate it to present-day practice.`,
  `Define and correctly use the basic terms and concepts of ${c}.`,
  `Explain the core principles of ${c} using examples.`,
  `Use the appropriate methods and tools of ${c} on guided exercises.`,
  `Solve structured problems by applying the principles of ${c}.`,
  `Relate the concepts of ${c} to tasks in professional practice.`,
  `Apply the standards and ethical considerations that govern ${c}.`,
  `Analyze a real case using the concepts and methods of ${c}.`,
  `Evaluate current trends and issues in ${c} and their effect on the community.`,
  `Design a small project that applies the concepts of ${c}.`,
  `Present and defend a project output in ${c} using the given rubric.`,
][i];

const CMO = {
  'BS Civil Engineering': 'CMO No. 92, s. 2017', 'BS Electrical Engineering': 'CMO No. 88, s. 2017', 'BS Mechanical Engineering': 'CMO No. 97, s. 2017',
  'BS Architecture': 'CMO No. 24, s. 2017', 'BS Interior Design': 'CMO No. 26, s. 2017',
  'BS Criminology': 'CMO No. 05, s. 2018', 'BS Forensic Science': 'CMO No. 05, s. 2018',
  'BS Accountancy': 'CMO No. 27, s. 2017', 'BS Business Administration': 'CMO No. 17, s. 2017', 'BS Marketing': 'CMO No. 17, s. 2017',
  'BS Finance': 'CMO No. 17, s. 2017', 'BS Economics': 'CMO No. 17, s. 2017', 'BS Human Resource Management': 'CMO No. 17, s. 2017',
  'BA English': 'CMO No. 24, s. 2017', 'BS Psychology': 'CMO No. 34, s. 2017', 'BA History': 'CMO No. 23, s. 2017', 'BS Sociology': 'CMO No. 31, s. 2017',
  'BS Nursing': 'CMO No. 15, s. 2017', 'BS Medical Technology': 'CMO No. 13, s. 2017',
  'BS Biology': 'CMO No. 49, s. 2017', 'BS Chemistry': 'CMO No. 47, s. 2017',
};

/** The syllabus, workflow and program alignment for one Learning Plan row. */
export function buildMockSyllabus({ courseId, courseName, dept, program, instructor, submitted, phAccepted, ldAccepted, dAccepted, coAssignId }) {
  const c = SUBJECT_WORDS(courseName);
  const code = courseId;
  const titles = topicTitles(c);
  const ge = program === 'General Education';

  const topics = titles.map((title, i) => ({
    title,
    subtopics: [
      { value: i % 2 === 0 ? `Key ideas and definitions` : `Worked examples and common errors` },
      { value: i % 3 === 0 ? `Applications in the Bicol region` : `Guided practice` },
    ],
    tlas: [
      { tlaName: `Pre-reading on ${title.toLowerCase()} (Week ${WEEKS[i]})`, classPhase: 'Pre-class', performedBy: 'Student', laboratory: false, tlaDescription: 'Read the assigned chapter and answer the guide questions in the LMS.' },
      { tlaName: `Interactive lecture: ${title} (Week ${WEEKS[i]})`, classPhase: 'In-class', performedBy: 'Instructor', laboratory: false, tlaDescription: 'Lecture with short checks for understanding and a worked example.' },
      { tlaName: `Group activity ${i + 1}`, classPhase: 'In-class', performedBy: 'Student', laboratory: i % 4 === 2, tlaDescription: 'Small groups apply the lesson to a short case and share their answers.' },
      { tlaName: `Quiz ${i + 1}`, classPhase: 'Post-class', performedBy: 'Student', laboratory: false, tlaDescription: 'Online quiz on the week’s topic.' },
    ],
  }));

  const assessments = topics.map((t, i) => ({
    id: 'A' + (i + 1),
    tlaName: `Quiz ${i + 1}`,
    assessmentMethod: i % 4 === 3 ? 'Performance task with rubric' : 'Written quiz',
    description: i % 4 === 3 ? 'Scored with the course rubric (content, accuracy, presentation).' : '10-item objective quiz',
  }));

  const perCo = { CO1: 0, CO2: 0, CO3: 0 };
  const ilos = WEEKS.map((week, i) => {
    const co = COS[i];
    perCo[co] += 1;
    return {
      id: `${co}-ILO${perCo[co]}`,
      deliveryWeek: 'Week ' + week,
      allocatedTime: '3 hours',
      intendedLearningOutcome: iloText(c, i),
      topics: [titles[i]],
      references: [`TB1, Chapter ${i + 1}`, i % 3 === 0 ? 'OE1' : `TB2, Chapter ${Math.ceil((i + 1) / 2)}`],
    };
  });

  const courseOutcomes = [
    { id: 'CO1', description: `Explain the fundamental concepts, history and principles of ${c}.`, poMappings: ['I', 'I', '', 'E', '', 'I'] },
    { id: 'CO2', description: `Apply the methods and standards of ${c} to solve problems and analyze cases.`, poMappings: ['E', '', 'E', 'E', 'I', ''] },
    { id: 'CO3', description: `Design, present and evaluate a project that applies ${c} responsibly.`, poMappings: ['', 'D', 'D', '', 'E', 'D'] },
  ];

  // Each grading period's weights add up to 100%.
  const W = ['30%', '30%', '40%'];
  const weightFor = (i) => {
    const period = Math.floor(i / 3); // 0 prelim … 3 final
    const w = { prelim: '', midterm: '', semi: '', final: '' };
    w[['prelim', 'midterm', 'semi', 'final'][period]] = W[i % 3];
    return w;
  };
  const gradingSystem = ['CO1', 'CO2', 'CO3'].map((co) => ({
    co,
    ilos: ilos.map((ilo, i) => ({ ilo, i })).filter(({ ilo }) => ilo.id.startsWith(co + '-')).map(({ ilo, i }) => ({
      id: ilo.id,
      assessments: [assessments[i].assessmentMethod === 'Written quiz' ? `Quiz ${i + 1}` : `Performance task ${i + 1}`, 'Major examination'],
      weight: weightFor(i),
      minPassing: '60%',
    })),
  }));

  const year = 2018 + (coAssignId % 6);
  const references = [
    { type: 'Textbook', title: `${courseName}: Concepts and Applications`, authors: 'Santos, R. & Mendoza, L.', year, isbn: `978-971-${String(coAssignId).slice(-3)}-1${String(coAssignId).slice(-2)}-0` },
    { type: 'Textbook', title: `Readings in ${courseName}`, authors: 'Reyes, A.', year: year - 2, isbn: `978-971-${String(coAssignId).slice(-3)}-2${String(coAssignId).slice(-2)}-7` },
    { type: 'Open Educational Resources', title: `${courseName} open course notes`, authors: 'OpenStax', year: year + 1, link: 'https://openstax.org/subjects' },
    { type: 'Online Resources', title: 'Commission on Higher Education — policies and guidelines', authors: 'CHED', year: 2023, link: 'https://ched.gov.ph/' },
  ];

  const syllabus = {
    code,
    name: courseName,
    description: `This course introduces students to ${c}. It covers the fundamental concepts and principles of the field, the methods and standards used in practice, and their application to problems and cases relevant to the Bicol region. Students demonstrate their learning through quizzes, case analyses and a final project.`,
    credits: '3 units',
    contact: '3 hours',
    prerequisites: yearLevelFor(courseId) === 'FIRST YEAR' ? 'None' : 'Completion of first-year courses',
    class: ge ? 'General Education' : 'Professional Course',
    cmo: CMO[program] || 'CMO No. 20, s. 2013',
    year: yearLevelFor(courseId),
    sem: '',
    revision: '1',
    instructor,
    sdg: 'SDG 4 – Quality Education',
    courseOutcomes,
    ilos,
    topics,
    assessments,
    gradingSystem,
    references,
  };

  const workflow = {
    submittedAt: submitted,
    submittedBy: instructor,
    parallelReview: {
      library_director: { status: 'done', completedAt: ldAccepted, reviewerName: LIBRARY_DIRECTOR },
      program_head: { status: 'done', completedAt: phAccepted, reviewerName: PROGRAM_HEADS[dept] || '' },
    },
    dean: { status: 'done', completedAt: dAccepted, reviewerName: DEANS[dept] || '' },
    signatures: [],
  };

  const alignment = {
    program: { name: program, department: DEPARTMENTS[dept] || '' },
    peos: [
      { statement: `Practice the ${program} profession competently, applying the technical and non-technical skills acquired.`, missionAligned: true },
      { statement: 'Advance in their careers through continuing education and the adoption of best practices.', missionAligned: true },
      { statement: 'Serve the community and the Bicol region with integrity, leadership and social responsibility.', missionAligned: true },
    ],
    outcomes: [
      { text: 'Apply knowledge of the discipline to solve problems in the field.', peos: [1, 2], gas: [2, 3, 4] },
      { text: 'Use current techniques, skills and tools necessary for professional practice.', peos: [1, 2], gas: [3, 4] },
      { text: 'Analyze problems and propose appropriate, well-reasoned solutions.', peos: [1, 2], gas: [1, 3, 4] },
      { text: 'Communicate effectively, orally and in writing, with colleagues and the public.', peos: [1, 3], gas: [1, 2, 3, 4] },
      { text: 'Work effectively as a member or leader of a team.', peos: [1, 3], gas: [1, 2, 3] },
      { text: 'Practice professional, ethical and legal responsibilities.', peos: [1, 2, 3], gas: [1, 2, 3] },
    ],
  };

  return { syllabus, workflow, alignment };
}
