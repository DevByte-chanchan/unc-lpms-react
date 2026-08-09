// Runnable self-check for the reference catalog rules — `node src/utils/referenceCatalog.test.js`
// from client/. Shapes below are the ones the running server actually returns
// (`/api/references`, `/api/references/library`), timestamp year included.

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const {
  parseYear, recencyWindow, isWithinRecency, chapterInfo, collapseChaptersToBooks,
  availabilityOf, isAttachable, isInCourseCatalog, relevanceScore, typeLabel,
  externalSearchLinks, citationFor, termKey, nextTermKey, setCourseCatalog,
  getCourseCatalog, rolloverCatalog, buildCatalogView, DEFAULT_CATALOG_SETTINGS,
  countUnclassified, UNCLASSIFIED_TYPE
} = await import('./referenceCatalog.js');

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

// Live server shapes: an HCI textbook, an out-of-window one, an unrelated
// general-education title, and a chapter of a book that is also in the list.
const LIBRARY = [
  { reference_id: 1, title: 'HCI Models, Theories, and Frameworks', type: 'TEXTBOOK', author: 'John Carroll', isbn: '978-1', publication_year: '2023-01-01 00:00:00.000 +00:00', used_in_courses: 'BIT313L' },
  { reference_id: 2, title: 'Atomic Design', type: 'TEXTBOOK', author: 'Brad Frost', publication_year: '2016-01-01 00:00:00.000 +00:00', used_in_courses: 'BIT313L' },
  { reference_id: 3, title: 'Understanding the Self', type: 'TEXTBOOK', author: 'Alata', publication_year: '2024-01-01 00:00:00.000 +00:00', used_in_courses: 'GE101' },
  { reference_id: 4, title: 'Chapter 4: UX Design Principles', type: 'TEXTBOOK', author: 'Rex Hartson', publication_year: '2022-01-01 00:00:00.000 +00:00', used_in_courses: 'BIT313L' },
  { reference_id: 5, title: 'The UX Book', type: 'TEXTBOOK', author: 'Rex Hartson', isbn: '978-2', publication_year: '2022-01-01 00:00:00.000 +00:00', used_in_courses: 'BIT313L' },
  { reference_id: 6, title: 'Usability Testing Essentials', type: 'TEXTBOOK', author: 'Carol Barnum', isbn: '978-3', publication_year: '2021-01-01 00:00:00.000 +00:00', used_in_courses: null },
  { reference_id: 7, title: 'MDN Web Docs', type: 'ONLINE', author: 'Mozilla', publication_year: '2025-01-01 00:00:00.000 +00:00', used_in_courses: 'BIT313L' }
];

const NOW = new Date('2025-06-01T00:00:00Z');
const VIEW = {
  courseCode: 'BIT313L',
  courseTitle: 'Human and Computer Interaction',
  topics: ['Introduction to User Interface (UI) Design', 'Usability Testing'],
  now: NOW
};

test('a timestamp publication_year still reads as a year', () => {
  eq(parseYear('2024-01-01 00:00:00.000 +00:00'), 2024, 'timestamp');
  eq(parseYear('2024'), 2024, 'bare year');
  eq(parseYear(2024), 2024, 'number');
  eq(parseYear(null), null, 'missing');
  eq(parseYear('n.d.'), null, 'non-numeric');
});

test('the recency window is 5 years by default and is a setting, not a constant', () => {
  const w = recencyWindow(DEFAULT_CATALOG_SETTINGS, NOW);
  eq(w.from, 2021, 'window start');
  eq(w.to, 2025, 'window end');
  const wide = recencyWindow({ ...DEFAULT_CATALOG_SETTINGS, recencyYears: 10 }, NOW);
  eq(wide.from, 2016, 'configured start');
  const pinned = recencyWindow({ ...DEFAULT_CATALOG_SETTINGS, windowEnd: 2030 }, NOW);
  eq(pinned.to, 2030, 'pinned end');
  if (isWithinRecency({ publication_year: '2016-01-01 00:00:00.000 +00:00' }, w)) throw new Error('2016 is outside 2021–2025');
  if (!isWithinRecency({ year: 2021 }, w)) throw new Error('2021 is inside the window');
});

test('a chapter resolves to its parent book and is never listed on its own', () => {
  eq(chapterInfo({ title: 'Chapter 4: UX Design Principles' }).parentTitle, 'UX Design Principles', 'pattern parent');
  eq(chapterInfo({ title: 'The UX Book' }).isChapter, false, 'a book is not a chapter');
  eq(chapterInfo({ title: 'UX Design Principles', parent_title: 'The UX Book' }).parentTitle, 'The UX Book', 'explicit parent');
  eq(chapterInfo({ title: 'UX Design Principles' }, { chapterOverrides: { 'ux design principles': 'The UX Book' } }).parentTitle, 'The UX Book', 'director override');

  // The override is what the panel's own example needs: "UX Design Principles
  // is not a book, its only a chapter" [13:43].
  const settings = { ...DEFAULT_CATALOG_SETTINGS, chapterOverrides: { 'ux design principles': 'The UX Book' } };
  const rows = collapseChaptersToBooks(
    [{ reference_id: 9, title: 'UX Design Principles', type: 'TEXTBOOK' }, { reference_id: 5, title: 'The UX Book', type: 'TEXTBOOK' }],
    settings
  );
  eq(rows.length, 1, 'chapter folded into the book');
  eq(rows[0].title, 'The UX Book', 'the book is what is listed');
  if (!rows[0].chapters.includes('UX Design Principles')) throw new Error('the chapter should survive as a hint on the book row');

  // A chapter whose book is not in the list is promoted, not dropped.
  const promoted = collapseChaptersToBooks([{ reference_id: 4, title: 'Chapter 2: Interaction Design', type: 'TEXTBOOK' }]);
  eq(promoted[0].title, 'Interaction Design', 'promoted to the parent title');
  eq(promoted[0].promotedFromChapter, true, 'flagged as promoted');
});

test('only library-available or approved-external references may be attached', () => {
  eq(availabilityOf(LIBRARY[0]), 'library', 'a library row');
  eq(availabilityOf({ title: 'Typed in by faculty', _temp_id: 't1' }), 'unverified', 'a hand-typed row');
  eq(availabilityOf({ title: 'External', external_approved: true }), 'approved-external', 'approved external');
  if (isAttachable({ title: 'Typed in by faculty' })) throw new Error('an unverified reference must not be attachable [49:06]');
  if (!isAttachable({ title: 'Typed in by faculty' }, { requireLibraryAvailability: false })) throw new Error('the constraint is a setting');
});

test('course scope keeps a programming course away from general-education titles', () => {
  if (isInCourseCatalog(LIBRARY[2], 'BIT313L')) throw new Error('"Understanding the Self" is a GE101 title [16:13]');
  if (!isInCourseCatalog(LIBRARY[0], 'BIT313L')) throw new Error('an HCI title belongs to BIT313L');
  if (!isInCourseCatalog(LIBRARY[5], 'BIT313L', [6])) throw new Error('a director-assigned reference joins the catalog');
  if (!isInCourseCatalog(LIBRARY[2], '')) throw new Error('with no course, nothing is scoped out');
});

test('the subject and the topic drive the suggestion, not the typing', () => {
  const hci = relevanceScore({ title: 'HCI Models, Theories, and Frameworks', author: 'Carroll' }, VIEW);
  const ge = relevanceScore({ title: 'Understanding the Self', author: 'Alata' }, VIEW);
  if (!(hci > ge)) throw new Error(`the HCI title should outscore the GE title (${hci} vs ${ge})`);
  const usability = relevanceScore({ title: 'Usability Testing Essentials' }, VIEW);
  if (!(usability > 0)) throw new Error('a topic word must score');
});

test('the view is course-scoped, type-split, in-window, book-level and A–Z', () => {
  const { rows, suggested, hiddenByCourse, window } = buildCatalogView(LIBRARY, {
    ...VIEW,
    type: 'Textbook',
    settings: { ...DEFAULT_CATALOG_SETTINGS, chapterOverrides: {} }
  });

  const titles = rows.map(r => r.title);
  if (titles.includes('Understanding the Self')) throw new Error('a GE title reached a programming course [16:13]');
  if (titles.includes('MDN Web Docs')) throw new Error('an ONLINE row reached the Textbook tab [15:29]');
  if (titles.includes('Atomic Design')) throw new Error('a 2016 title is outside the 5-year window [10:55]');
  if (titles.includes('Chapter 4: UX Design Principles')) throw new Error('a chapter was listed as a standalone title [13:43]');
  if (!titles.includes('The UX Book')) throw new Error('the chapter should resolve to its parent book [14:18]');
  if (titles.includes('Usability Testing Essentials')) throw new Error('an unassigned title is outside the course catalog');

  const sorted = [...titles].sort((a, b) => a.localeCompare(b));
  eq(titles.join('|'), sorted.join('|'), 'A–Z order [11:12]');
  eq(window.from, 2021, 'window start');
  if (hiddenByCourse < 1) throw new Error('the scope filter should report what it hid');
  if (!suggested.length) throw new Error('the subject should surface at least one suggestion [10:28]');
  if (suggested.some(r => !r.attachable)) throw new Error('never suggest something that cannot be attached');
});

test('the library scope is the outside search fallback, and it is opt-in', () => {
  const catalog = buildCatalogView(LIBRARY, { ...VIEW, type: 'Textbook', scope: 'catalog' });
  const library = buildCatalogView(LIBRARY, { ...VIEW, type: 'Textbook', scope: 'library' });
  if (!(library.rows.length > catalog.rows.length)) throw new Error('widening the scope must reveal more [11:39]');
  if (!library.rows.some(r => r.title === 'Usability Testing Essentials')) throw new Error('an unassigned title appears once the scope widens');

  const links = externalSearchLinks('human computer interaction');
  const oreilly = links.find(l => l.key === 'oreilly');
  if (!oreilly) throw new Error("O'Reilly must be a search source [12:05]");
  if (!oreilly.url.includes('learning.oreilly.com')) throw new Error('search-by-subject URL');
  if (!oreilly.subscription) throw new Error('flagged as the subscription source');
  eq(externalSearchLinks('').length, 0, 'no query, no links');
  eq(citationFor(LIBRARY[0]), 'John Carroll (2023). HCI Models, Theories, and Frameworks.', 'citation');
});

test('type labels are one vocabulary, whatever casing the row arrived in', () => {
  eq(typeLabel('TEXTBOOK'), 'Textbook', 'db casing');
  eq(typeLabel('Textbook'), 'Textbook', 'form casing');
  eq(typeLabel('OER'), 'Open Educational Resources', 'oer');
  eq(typeLabel('ONLINE'), 'Online Resources', 'online');
  eq(typeLabel('Online Resources'), 'Online Resources', 'form online');
});

test('a blank or off-vocabulary type stays reachable now that "All" is gone', () => {
  const odd = [
    { reference_id: 20, title: 'Departmental Handout', type: '', used_in_courses: 'BIT313L', publication_year: '2024' },
    { reference_id: 21, title: 'Standards Body Circular', type: 'STANDARD', used_in_courses: 'BIT313L', publication_year: '2024' },
    ...LIBRARY
  ];
  eq(countUnclassified(odd), 2, 'the two off-vocabulary rows are counted');
  eq(countUnclassified(LIBRARY), 0, 'every live row carries a known type');

  const other = buildCatalogView(odd, { ...VIEW, type: UNCLASSIFIED_TYPE });
  const titles = other.rows.map(r => r.title);
  if (!titles.includes('Departmental Handout')) throw new Error('a blank type must still be findable');
  if (!titles.includes('Standards Body Circular')) throw new Error('an unknown type must still be findable');
  if (titles.includes('HCI Models, Theories, and Frameworks')) throw new Error('a classified row does not belong in the fallback tab');

  const textbooks = buildCatalogView(odd, { ...VIEW, type: 'Textbook' }).rows.map(r => r.title);
  if (textbooks.includes('Departmental Handout')) throw new Error('the fallback rows must not leak into a typed tab');
});

test('the course catalog is versioned per term and rolls into the next one', () => {
  eq(termKey(new Date('2026-09-01')), 'AY2026-2027-1', 'first semester');
  eq(termKey(new Date('2027-02-01')), 'AY2026-2027-2', 'second semester');
  eq(nextTermKey('AY2026-2027-1'), 'AY2026-2027-2', 'next within the year');
  eq(nextTermKey('AY2026-2027-2'), 'AY2027-2028-1', 'next academic year');

  setCourseCatalog('BIT313L', [1, 5, 5], { term: 'AY2026-2027-1', updatedBy: 'SANTOS, MARIA' });
  const saved = getCourseCatalog('BIT313L', 'AY2026-2027-1');
  eq(saved.referenceIds.length, 2, 'ids are de-duplicated');
  eq(saved.updatedBy, 'SANTOS, MARIA', 'who uploaded it');

  const { toTerm, carried } = rolloverCatalog('AY2026-2027-1');
  eq(toTerm, 'AY2026-2027-2', 'rolled into the next term');
  eq(carried, 1, 'one course carried');
  eq(getCourseCatalog('BIT313L', 'AY2026-2027-2').rolledOverFrom, 'AY2026-2027-1', 'the new term records where it came from');
});

console.log('\nAll reference catalog checks passed.');
