// Runnable self-check for the one-key-per-program rule —
// `node src/utils/programKeys.test.js` from client/. COAEPUpload used to key by
// the server's Program.name while the other alignment pages key by the short
// prefix, so one program had two entries and a COAEP saved online vanished on
// the offline fallback.

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const {
  extractProgramPrefix, canonicalProgramKey, migrateLegacyProgramKeys
} = await import('./programCurriculumData.js');

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

const eq = (actual, expected, what) => {
  if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`);
};

test('the COAEP page and the alignment pages derive the same key from a course', () => {
  // What COAEPUpload now does: extractProgramPrefix(courseCode).
  eq(extractProgramPrefix('BIT313L'), 'BIT', 'the course code carries the program');
  eq(extractProgramPrefix('BSCS511'), 'BSCS', 'and for computer science');
  // What it used to do: Program.name straight off /api/assignments.
  eq(canonicalProgramKey('BS Information Technology'), 'BIT', 'the long name folds onto the prefix');
  eq(canonicalProgramKey('BIT'), 'BIT', 'a prefix is already canonical');
});

test('records already saved under the long name are carried over, not orphaned', () => {
  const legacy = {
    programs: {
      'BS Information Technology': {
        courses: {
          BIT313L: { coaep: { header: { course: 'BIT313L — HCI' } } },
          BIT201: { coaep: { header: { course: 'BIT201' } } }
        }
      },
      BIT: {
        courses: { BIT201: { coPoAlignment: { courseOutcomes: [] } } }
      }
    }
  };

  const { moved } = migrateLegacyProgramKeys(legacy);
  eq(moved, 1, 'one legacy key was folded in');
  eq(Object.keys(legacy.programs).join(','), 'BIT', 'only the canonical key is left');
  eq(legacy.programs.BIT.courses.BIT313L.coaep.header.course, 'BIT313L — HCI', 'the COAEP survived');
  if (!legacy.programs.BIT.courses.BIT201.coPoAlignment) throw new Error('the existing CO-PO record must not be lost');
  if (!legacy.programs.BIT.courses.BIT201.coaep) throw new Error('the legacy COAEP must merge into the same course');
});

test('a record under an unknown key is placed by the courses filed under it', () => {
  const odd = { programs: { 'Some Faculty Label': { courses: { BSCS511: { coaep: { x: 1 } } } } } };
  migrateLegacyProgramKeys(odd);
  eq(Object.keys(odd.programs).join(','), 'BSCS', 'the course code decides');
});

test('a program-level PO-PEO record moves with its program', () => {
  const legacy = {
    programs: {
      'BS Computer Science': { courses: {}, poPeoAlignment: { programOutcomes: [{ text: 'PO1' }] } },
      BSCS: { courses: {} }
    }
  };
  migrateLegacyProgramKeys(legacy);
  eq(legacy.programs.BSCS.poPeoAlignment.programOutcomes[0].text, 'PO1', 'carried onto the prefix');
});

console.log('\nAll program key checks passed.');
