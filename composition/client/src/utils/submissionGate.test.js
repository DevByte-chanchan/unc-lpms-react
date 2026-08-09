import { validateSubmission, parseHours, expectedTermHours, DEFAULT_GATE_CONFIG } from './submissionGate.js';

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

// Shape copied from the running server: GET /api/course-coverage/1/1 and
// GET /api/course-details/1/1 (BIT313L, 13 ILOs, 82 allocated hours).
const courseDetails = { code: 'BIT313L', contact: '2 Hrs Lec, 3 Hrs Lab' };

const ilo = (id, hours, topics = ['t'], references = ['r']) => ({
  id,
  allocatedTime: `(${hours} hrs)`,
  topics,
  references
});

const alignedCoverage = () => ({
  ilos: [
    ilo('CO1-ILO1', 2), ilo('CO1-ILO2', 5), ilo('CO1-ILO3', 5), ilo('CO1-ILO4', 10),
    ilo('CO2-ILO1', 5), ilo('CO2-ILO2', 5), ilo('CO2-ILO3', 10),
    ilo('CO3-ILO1', 5), ilo('CO3-ILO2', 5), ilo('CO3-ILO3', 10),
    ilo('CO4-ILO1', 5), ilo('CO4-ILO2', 5), ilo('CO4-ILO3', 10)
  ]
});

test('parses hours out of both field formats', () => {
  if (parseHours('(5 hrs)') !== 5) throw new Error('allocatedTime should read 5');
  if (parseHours('2 Hrs Lec, 3 Hrs Lab') !== 5) throw new Error('contact should total 5');
  if (parseHours('') !== 0) throw new Error('blank should be 0');
});

test('expected term hours are weekly contact hours across the term', () => {
  if (expectedTermHours('2 Hrs Lec, 3 Hrs Lab') !== 5 * DEFAULT_GATE_CONFIG.weeksPerTerm) {
    throw new Error('Expected 5 hrs/week × 18 weeks');
  }
  if (expectedTermHours('') !== null) throw new Error('Unreadable contact should be null');
});

test('an aligned plan passes the gate', () => {
  const result = validateSubmission({ courseDetails, coverage: alignedCoverage() });
  if (!result.ok) throw new Error(`Expected pass, blocked by: ${result.blockers.join(' | ')}`);
  if (result.totalAllocatedHours !== 82) throw new Error('Expected 82 allocated hours');
});

test('an ILO with no allocated time blocks submission', () => {
  const coverage = alignedCoverage();
  coverage.ilos[1].allocatedTime = '';
  const result = validateSubmission({ courseDetails, coverage });
  if (result.ok) throw new Error('Expected the gate to block');
  if (!result.blockers.some(b => b.includes('CO1-ILO2'))) throw new Error('Expected the offending ILO to be named');
});

test('an ILO with no topic or no reference blocks submission', () => {
  const noTopic = alignedCoverage();
  noTopic.ilos[0].topics = [];
  if (validateSubmission({ courseDetails, coverage: noTopic }).ok) throw new Error('Missing topic should block');

  const noRef = alignedCoverage();
  noRef.ilos[0].references = [];
  if (validateSubmission({ courseDetails, coverage: noRef }).ok) throw new Error('Missing reference should block');
});

test('over- and under-allocated hours block submission', () => {
  const over = alignedCoverage();
  over.ilos[0].allocatedTime = '(40 hrs)'; // 120 total vs 90 available
  const overResult = validateSubmission({ courseDetails, coverage: over });
  if (overResult.ok) throw new Error('Over-allocation should block');
  if (!overResult.blockers.some(b => b.includes('exceed'))) throw new Error('Expected an over-allocation message');

  const under = { ilos: alignedCoverage().ilos.slice(0, 4) }; // 22 of 90 hrs
  const underResult = validateSubmission({ courseDetails, coverage: under });
  if (underResult.ok) throw new Error('Under-allocation should block');
});

test('an empty plan blocks submission', () => {
  if (validateSubmission({ courseDetails, coverage: { ilos: [] } }).ok) throw new Error('Empty plan should block');
});

test('unreadable contact hours warn instead of blocking', () => {
  const result = validateSubmission({ courseDetails: { code: 'X', contact: '' }, coverage: alignedCoverage() });
  if (!result.ok) throw new Error('Missing contact hours should not block');
  if (result.warnings.length !== 1) throw new Error('Expected one warning');
});

test('the term length is configurable, not hard-coded', () => {
  // 82 hrs covers a 16-week term (80 hrs) but over-allocates it.
  const result = validateSubmission({ courseDetails, coverage: alignedCoverage(), config: { weeksPerTerm: 16 } });
  if (result.ok) throw new Error('16-week term should flag the same plan');
  if (result.expectedHours !== 80) throw new Error('Expected the configured term length to be used');
});
