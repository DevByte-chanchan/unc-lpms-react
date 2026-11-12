/**
 * ACT222L — the Registrar's filled TOS form ([TOS] ACT222L FINAL(CASIMERO).docx),
 * as TOS data. Used by the unit tests (the generated Report must match the form)
 * and by the OVPAA demo (SCIS row in mockApprovedSubmissions.js).
 *
 * From the form: CO2 (15 h, 37.5%) and CO3 (25 h, 62.5%); the ILO hours, the
 * stored % and No. of Items/Tasks; the cells "3 X 5PTS = 15", "1 X 5PTS = 5",
 * "2 X 5PTS = 10"; Total 40 · 100% · 20 · 30 / 20 / 50. The question wording is
 * not on the TOS form; the instructions below are written for the demo.
 */
export const ACT222L_TOS = {
  courseCode: 'ACT222L',
  courseName: 'Web Development II',
  semester: '2nd Semester',
  schoolYear: '2024-2025',
  examPeriod: 'Final',
  status: 'approved',
  submittedAt: '2025-05-11',
  approvedAt: '',
  signatories: {
    preparedBy: { name: 'Danny Boy M. Casimero', date: '2025-05-11' },
    approvedBy: { name: 'June Arreb Danila', date: '' },
  },
  outcomes: [
    { co: 'CO2', description: 'Build single-page web applications with a modern frontend framework.', ilos: [
      { id: 'ILO1', description: 'Determine the different popular web development frameworks', hours: 5, percentage: 3, items: 3 },
      { id: 'ILO2', description: 'Implement single-page applications (SPA)', hours: 5, percentage: 3, items: 3 },
      { id: 'ILO3', description: 'Develop an application that implements state management within their applications using the features provided by the frontend frameworks.', hours: 5, percentage: 3, items: 3 },
    ] },
    { co: 'CO3', description: 'Develop a complete web application with the Vue.js framework.', ilos: [
      { id: 'ILO1', description: 'Understand the fundamental vue.js framework syntax, constructs, and programming concepts', hours: 5, percentage: 5, items: 5 },
      { id: 'ILO2', description: 'Apply the Model-view-controller pattern in creating the user interface of the web application.', hours: 10, percentage: 2.5, items: 3 },
      { id: 'ILO3', description: 'Implement vue conditional,routing and directives in the web application.', hours: 10, percentage: 2.5, items: 3 },
    ] },
  ],
  questions: [
    // CO2 · ILO1 — Understanding 3 X 5PTS = 15
    { co: 'CO2', ilo: 'ILO1', cognitiveLevel: 'Understanding', points: 5, span: 1, instruction: 'Explain the difference between a library and a framework, giving one example of each.' },
    { co: 'CO2', ilo: 'ILO1', cognitiveLevel: 'Understanding', points: 5, span: 1, instruction: 'Compare React, Angular and Vue.js in terms of their rendering approach.' },
    { co: 'CO2', ilo: 'ILO1', cognitiveLevel: 'Understanding', points: 5, span: 1, instruction: 'Describe when a team would choose a full framework over plain JavaScript.' },
    // CO2 · ILO2 — Applying 1 X 5PTS = 5 · Creating 2 X 5PTS = 10
    { co: 'CO2', ilo: 'ILO2', cognitiveLevel: 'Applying', points: 5, span: 1, instruction: 'Convert the given multi-page site into a single-page application with client-side navigation.' },
    { co: 'CO2', ilo: 'ILO2', cognitiveLevel: 'Creating', points: 10, span: 2, instruction: 'Build a single-page "Course Catalog" app with a list view and a detail view.\nSubmit the project link and a short read-me.' },
    // CO2 · ILO3 — Applying 1 X 5PTS = 5 · Creating 2 X 5PTS = 10
    { co: 'CO2', ilo: 'ILO3', cognitiveLevel: 'Applying', points: 5, span: 1, instruction: 'Add a shared store to the starter app so the cart count updates on every page.' },
    { co: 'CO2', ilo: 'ILO3', cognitiveLevel: 'Creating', points: 10, span: 2, instruction: 'Design and implement state management for a to-do app with filters and persistence.' },
    // CO3 · ILO1 — Understanding 3 X 5PTS = 15 · Creating 2 X 5PTS = 10
    { co: 'CO3', ilo: 'ILO1', cognitiveLevel: 'Understanding', points: 15, span: 3, instruction: 'Identify the output of each Vue.js template snippet and explain the directive used.' },
    { co: 'CO3', ilo: 'ILO1', cognitiveLevel: 'Creating', points: 10, span: 2, instruction: 'Create a Vue.js component library page showing three reusable components with props.' },
    // CO3 · ILO2 — Applying 1 X 5PTS = 5 · Creating 2 X 5PTS = 10
    { co: 'CO3', ilo: 'ILO2', cognitiveLevel: 'Applying', points: 5, span: 1, instruction: 'Separate the given page into model, view and controller files without changing its behaviour.' },
    { co: 'CO3', ilo: 'ILO2', cognitiveLevel: 'Creating', points: 10, span: 2, instruction: 'Develop the user interface of an enrollment form following the MVC pattern.' },
    // CO3 · ILO3 — Applying 1 X 5PTS = 5 · Creating 2 X 5PTS = 10
    { co: 'CO3', ilo: 'ILO3', cognitiveLevel: 'Applying', points: 5, span: 1, instruction: 'Add routes and a conditional login banner to the starter Vue.js application.' },
    { co: 'CO3', ilo: 'ILO3', cognitiveLevel: 'Creating', points: 10, span: 2, instruction: 'Build a routed Vue.js web application with at least three views, guards and custom directives.' },
  ],
  attachments: [],
};
