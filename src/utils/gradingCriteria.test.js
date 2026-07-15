import { normalizeGradingSystem } from './gradingCriteria.js';

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

test('normalizes a partial grading system to three ILO rows', () => {
  const input = [{
    co: 'CO1',
    ilos: [{ id: 'ILO1', assessments: ['Quiz'], weight: { prelim: 20 }, minPassing: 60 }]
  }];

  const result = normalizeGradingSystem(input);

  if (result[0].ilos.length !== 3) throw new Error('Expected three ILO rows');
  if (result[0].ilos[1].id !== 'ILO2') throw new Error('Expected ILO2 row');
  if (result[0].ilos[2].id !== 'ILO3') throw new Error('Expected ILO3 row');
});

test('preserves ILO3 data when the source rows are sparse or out of order', () => {
  const input = [{
    co: 'CO1',
    ilos: [{ id: 'ILO3', assessments: ['Project'], weight: { prelim: 50 }, minPassing: 70 }]
  }];

  const result = normalizeGradingSystem(input);

  if (result[0].ilos[0].id !== 'ILO1') throw new Error('Expected ILO1 row');
  if (result[0].ilos[1].id !== 'ILO2') throw new Error('Expected ILO2 row');
  if (result[0].ilos[2].assessments[0] !== 'Project') throw new Error('Expected ILO3 data to be preserved');
});

test('fills the remaining weight so a three-ILO group totals 100', () => {
  const input = [{
    co: 'CO1',
    ilos: [
      { id: 'ILO1', weight: { prelim: 20 } },
      { id: 'ILO2', weight: { prelim: 30 } }
    ]
  }];

  const result = normalizeGradingSystem(input);

  if (result[0].ilos[2].weight.prelim !== 50) throw new Error('Expected the missing ILO3 weight to fill the remainder');
});

test('uses fallback grading rows when the source group is missing ILO3 data', () => {
  const input = [{
    co: 'CO1',
    ilos: [{ id: 'ILO1', assessments: ['Quiz'], weight: { prelim: 100 }, minPassing: 60 }]
  }];
  const fallback = [{
    co: 'CO1',
    ilos: [
      { id: 'ILO1', assessments: ['Quiz'], weight: { prelim: 100 }, minPassing: 60 },
      { id: 'ILO2', assessments: ['Midterm'], weight: { prelim: 0 }, minPassing: 60 },
      { id: 'ILO3', assessments: ['Project'], weight: { prelim: 0 }, minPassing: 70 }
    ]
  }];

  const result = normalizeGradingSystem(input, fallback);

  if (result[0].ilos[2].assessments[0] !== 'Project') throw new Error('Expected fallback ILO3 assessment data to be used');
  if (result[0].ilos[2].minPassing !== 70) throw new Error('Expected fallback ILO3 min passing value to be preserved');
});

test('exposes a shared display id that matches course coverage labels', () => {
  const input = [{
    co: 'CO2',
    ilos: [{ id: 'ILO3', assessments: ['Project'], weight: { prelim: 50 }, minPassing: 70 }]
  }];

  const result = normalizeGradingSystem(input);
  const ilo3Row = result[0].ilos.find((ilo) => ilo.id === 'ILO3');

  if (!ilo3Row || ilo3Row.displayId !== 'CO2-ILO3') throw new Error('Expected the shared display id to match the course coverage pattern');
});
