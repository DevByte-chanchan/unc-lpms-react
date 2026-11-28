/**
 * Mock TOS content for the OVPAA approved-TOS repository (mockApprovedSubmissions.js).
 *
 * Stands in for the TOS module's API until it is part of this app:
 *   GET /api/courses/:code/outcomes            → outcomes (COs, ILOs, hours, %, items)
 *   GET /api/courses/:code/:period/items       → questions (co, ilo, instruction, points, span, cognitiveLevel)
 *   GET /api/courses/:code/:period/status      → status + dates
 *   GET /api/courses/:code/:period/attachments → attachments
 *
 * As in the TOS module, a question has its total `points` and a `span` (the number of
 * items it covers). Each TOS has 2 COs with ILO1–ILO3 each, questions across several
 * cognitive levels, and the fixed hours / % (CO 20 h → 4 / 6 / 10 h, 20 / 30 / 50 %).
 */
import { ACT222L_TOS } from './tosFixtures.js';

// Every TOS follows the same structure as the Registrar's form and the TOS module:
// each CO has exactly ILO1, ILO2 and ILO3 (numbered per CO), so the fixed rules in
// utils/tosMath.js apply to all of them — CO 20 hours → ILOs 4 / 6 / 10, % 20 / 30 / 50.

// [co, ilo, level, points, span, instruction]
// ── Hand-written: CE 211 Statics of Rigid Bodies ─────────────────────────
const STATICS = {
  outcomes: [
    { co: 'CO1', description: 'Analyze force systems acting on particles and rigid bodies.', ilos: [
      { id: 'ILO1', description: 'Resolve forces into rectangular components and determine their resultant.' },
      { id: 'ILO2', description: 'Compute the moment of a force about a point and about a specified axis.' },
      { id: 'ILO3', description: 'Reduce a system of forces to an equivalent force–couple system.' },
    ] },
    { co: 'CO2', description: 'Apply the conditions of equilibrium to particles, beams and frames.', ilos: [
      { id: 'ILO1', description: 'Identify the reactions exerted by common supports on a rigid body.' },
      { id: 'ILO2', description: 'Draw complete free-body diagrams of particles and rigid bodies.' },
      { id: 'ILO3', description: 'Solve for the support reactions of beams and frames using the equations of equilibrium.' },
    ] },
  ],
  questions: [
    ['CO1', 'ILO1', 'Remembering', 5, 5, 'Test I. Multiple Choice. Choose the letter of the correct definition of each term (force, resultant, component, scalar, vector).'],
    ['CO1', 'ILO1', 'Applying', 10, 1, 'Test II. Problem 1. Three forces act on the eyebolt shown. Resolve each force into its x and y components and determine the magnitude and direction of the resultant.\nShow your free-body sketch and all computations.'],
    ['CO1', 'ILO2', 'Understanding', 4, 4, 'Test I. True or False. Explain in one sentence why each statement about the moment of a force is true or false.'],
    ['CO1', 'ILO2', 'Applying', 8, 1, 'Test II. Problem 2. Determine the moment of the 250 N force about point O and about the line OA.'],
    ['CO1', 'ILO3', 'Analyzing', 10, 1, 'Test II. Problem 3. Replace the force system acting on the bracket with an equivalent force–couple system at B, and state which of two proposed simplifications is correct.'],
    ['CO2', 'ILO1', 'Understanding', 3, 3, 'Test III. Identify the reactions that each support type (pin, roller, fixed) exerts on a body.'],
    ['CO2', 'ILO2', 'Applying', 4, 1, 'Test III. Draw the complete free-body diagram of the frame ABC, labelling every known and unknown force.'],
    ['CO2', 'ILO3', 'Applying', 10, 1, 'Test IV. Problem 4. Determine the reactions at the pin A and the roller B of the overhanging beam.'],
    ['CO2', 'ILO3', 'Evaluating', 6, 1, 'Test IV. Problem 5. Two classmates computed different reactions for the same frame. Check both solutions, identify the error, and justify the correct answer.'],
  ],
};

// ── Generated for every other course, worded from its title ───────────────
const genericTos = (courseName, variant) => {
  const c = courseName;
  const questions = [
    ['CO1', 'ILO1', 'Remembering', 10, 10, 'Test I. Multiple Choice. Choose the letter of the best answer for each term or concept.'],
    ['CO1', 'ILO2', 'Understanding', 5, 5, 'Test II. True or False. Write TRUE if the statement is correct; otherwise write FALSE and correct the underlined word.'],
    ['CO1', 'ILO2', 'Understanding', 10, 2, 'Test III. Short Answer. Explain in three to five sentences how the two principles discussed in class are related.'],
    ['CO1', 'ILO3', 'Applying', 5, 1, 'Test III. Give one example from everyday practice for each principle and explain why it fits.'],
    ['CO2', 'ILO1', 'Applying', 10, 2, 'Test IV. Problem Solving. Solve each problem completely. Show all solutions and box your final answers.'],
    ['CO2', 'ILO2', 'Analyzing', 10, 1, 'Test V. Case Analysis. Read the case and identify its main issues, their causes and their effects.'],
    variant
      ? ['CO2', 'ILO3', 'Evaluating', 5, 1, 'Test V. Recommend the better of the two proposed solutions to the case and justify your choice.']
      : ['CO2', 'ILO3', 'Creating', 10, 1, 'Test VI. Prepare a one-page proposal applying the course concepts to a real situation. (Scored with the attached rubric.)'],
  ];
  return {
    outcomes: [
      { co: 'CO1', description: `Explain the fundamental concepts and principles of ${c}.`, ilos: [
        { id: 'ILO1', description: `Define the key terms and concepts of ${c}.` },
        { id: 'ILO2', description: `Explain the basic principles of ${c} and how they relate to one another.` },
        { id: 'ILO3', description: `Illustrate the principles of ${c} with appropriate examples.` },
      ] },
      { co: 'CO2', description: `Apply the concepts of ${c} to analyze and evaluate real-world cases.`, ilos: [
        { id: 'ILO1', description: `Apply the methods of ${c} to solve realistic problems.` },
        { id: 'ILO2', description: `Analyze a given case using the concepts of ${c}.` },
        variant
          ? { id: 'ILO3', description: `Evaluate alternative approaches to a case using the concepts of ${c}.` }
          : { id: 'ILO3', description: `Create a short proposal that applies ${c} to a situation in the community or workplace.` },
      ] },
    ],
    questions,
  };
};

// The fixed TOS values (same as utils/tosMath.js): each CO is 20 hours; its ILO1–ILO3
// get 20 / 30 / 50 % of it (4 / 6 / 10 hours). No. of Items/Tasks = the items in its questions.
const ILO_PERCENT = [20, 30, 50];
const CO_HOURS = 20;
const finish = ({ outcomes, questions }) => {
  const toQuestion = ([co, ilo, cognitiveLevel, points, span, instruction]) => ({ co, ilo, cognitiveLevel, points, span, instruction });
  const all = questions.map(toQuestion);
  outcomes.forEach((co) => co.ilos.forEach((ilo, idx) => {
    ilo.percentage = ILO_PERCENT[idx];
    ilo.hours = (CO_HOURS * ILO_PERCENT[idx]) / 100;
    ilo.items = all.filter((q) => q.co === co.co && q.ilo === ilo.id).reduce((s, q) => s + q.span, 0);
  }));
  return { outcomes, questions: all };
};

const YEAR_WORDS = ['FIRST YEAR', 'SECOND YEAR', 'THIRD YEAR', 'FOURTH YEAR', 'FIFTH YEAR'];
export const yearLevelFor = (courseId) => {
  const m = String(courseId || '').match(/(\d)\d*/);
  const y = m ? Number(m[1]) : 0;
  return YEAR_WORDS[y - 1] || '';
};

// Mock Program Heads per department (who approves a TOS).
export const PROGRAM_HEADS = {
  COE: 'Engr. Ramon De Leon',
  CEA: 'Ar. Carmela Ocampo',
  CJE: 'Dr. Victor Salazar',
  SBA: 'Dr. Lourdes Tan',
  SAS: 'Dr. Cecilia Morales',
  SNAHS: 'Dr. Teresa Luna',
  SSNS: 'Dr. Henry Chua',
  SCIS: 'June Arreb Danila',
};

/** The `tos` object for one approved-TOS row. */
export const buildMockTos = ({ courseId, courseName, dept, instructor, submitted, phAccepted, coAssignId }) => {
  if (String(courseId).replace(/\s+/g, '') === ACT222L_TOS.courseCode) {
    // The Registrar's own sample, as on the form.
    return JSON.parse(JSON.stringify({ ...ACT222L_TOS, yearLevel: yearLevelFor(courseId) }));
  }
  const base = courseId === 'CE 211' ? STATICS : genericTos(courseName, coAssignId % 2 === 0);
  const content = finish(JSON.parse(JSON.stringify(base)));
  return {
    status: 'approved',
    examPeriod: 'Midterm',
    yearLevel: yearLevelFor(courseId),
    ...content,
    signatories: {
      preparedBy: { name: instructor, date: submitted },
      approvedBy: { name: PROGRAM_HEADS[dept] || '', date: phAccepted },
    },
  };
};
