import { buildGeneratedCoaepRecord } from './generatedCoaepRecord.js';

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

test('builds a read-only COAEP record from the course syllabus payload', () => {
  const record = buildGeneratedCoaepRecord({
    courseCode: 'BIT201',
    courseName: 'Data Structures and Algorithms',
    programCode: 'BIT',
    generatedAt: 'September 13, 2026',
    payload: {
      course: { code: 'BIT201', title: 'Data Structures and Algorithms' },
      cos: [{
        number: '1.0',
        statement: 'Implement fundamental data structures.',
        ilos: [{ outcome: 'Construct a linked list.', assessmentTool: 'Practical examination' }],
      }],
    },
  });

  if (record.header.course !== 'BIT201 - Data Structures and Algorithms') throw new Error('course header was not derived from the syllabus');
  if (record.cos[0].ilos[0].assessmentTool !== 'Practical examination') throw new Error('assessment tool was not preserved');
  if (record.performanceTarget !== 'At least 90% of enrolled students with a rating of at least 60% of the total score') throw new Error('default performance target was not assigned');
  if (record.sourceLabel !== 'Generated from course syllabus - September 13, 2026') throw new Error('generated source was not labeled');
});

test('returns no COAEP record when the syllabus has no course outcomes', () => {
  const record = buildGeneratedCoaepRecord({
    courseCode: 'BIT201',
    courseName: 'Data Structures and Algorithms',
    programCode: 'BIT',
    generatedAt: 'September 13, 2026',
    payload: { course: { code: 'BIT201', title: 'Data Structures and Algorithms' }, cos: [] },
  });

  if (record !== null) throw new Error('a course without outcomes must not produce a COAEP');
});

console.log('\nGenerated COAEP record checks passed.');
