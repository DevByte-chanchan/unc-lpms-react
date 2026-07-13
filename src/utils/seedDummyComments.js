const SEED_COMMENTS_KEY = 'lpsm_comments_seeded_v4'

const c = (id, code, role, reviewer, subId, subLabel, ageMs, comment, extra) => ({
  id: `${id}-${Date.now()}`,
  courseCode: code,
  section: extra?.section || 'Course Coverage',
  submissionId: subId,
  submissionLabel: subLabel,
  submittedAt: new Date(Date.now() - ageMs).toISOString(),
  createdAt: new Date(Date.now() - ageMs).toISOString(),
  reviewer,
  role,
  recipientRole: 'instructor',
  components: {},
  comment,
  courseOutcome: extra?.co || null,
  ilo: extra?.ilo || null,
  coverageType: extra?.coverageType || null,
  coverageDetail: extra?.coverageDetail || null,
  status: extra?.status || 'pending',
  resolved: extra?.resolved || false,
  ...(extra?.resolvedAt ? { resolvedAt: extra.resolvedAt } : {}),
  suggestedRefs: extra?.refs || [],
})

// Canonical reviewer identities — keep in sync with reviewerSeeds in approvalHelpers.js
const DOL = ['Director of Libraries', 'GARCIA, CARLOS']
const IC = ['Industry Consultant', 'CRUZ, ROBERTO']
const PH = ['Program Head', 'DANILA, JUNAR']

const hciComments = (code) => {
  const base = `seed-hci`
  return [
    // ── DIRECTOR OF LIBRARIES — GARCIA, CARLOS (Review 1) ──
    c(`${base}-dol1`, code, ...DOL, `${base}-s1`, 'Review 1', 86400000,
      'The Norman textbook cited for CO1-ILO1 is the 2002 printing. Please cite the revised and expanded 2013 edition instead.',
      { co: 'CO1', ilo: 'CO1-ILO1', coverageType: 'References', coverageDetail: 'The Design of Everyday Things',
        refs: [{ title: 'The Design of Everyday Things (Revised & Expanded)', authors: 'Don Norman', type: 'Textbook', year: 2013, isbn: '978-0465050659', link: '' }] }),
    c(`${base}-dol2`, code, ...DOL, `${base}-s1`, 'Review 1', 86400000,
      'The library holds only two copies of the prototyping reference. Consider adding an open-access alternative for student availability.',
      { co: 'CO3', ilo: 'CO3-ILO1', coverageType: 'References', coverageDetail: 'Prototyping for Designers' }),
    c(`${base}-dol3`, code, ...DOL, `${base}-s1`, 'Review 1', 86400000,
      'The heuristic evaluation topic cites no reference at all. Please attach at least one supporting source.',
      { co: 'CO4', ilo: 'CO4-ILO2', coverageType: 'Topic', coverageDetail: 'Heuristic Evaluation' }),

    // ── INDUSTRY CONSULTANT — CRUZ, ROBERTO (Review 2) ──
    c(`${base}-ic1`, code, ...IC, `${base}-s2`, 'Review 2', 43200000,
      'Figma has largely replaced Adobe XD in local industry. Update the prototyping TLA tooling to reflect current practice.',
      { co: 'CO1', ilo: 'CO1-ILO2', coverageType: 'TLA', coverageDetail: 'Wireframe-to-Prototype Exercise' }),
    c(`${base}-ic2`, code, ...IC, `${base}-s2`, 'Review 2', 43200000,
      'Accessibility compliance is now a client requirement in most contracts — the topic should reference WCAG 2.2 explicitly.',
      { co: 'CO3', ilo: 'CO3-ILO3', coverageType: 'Topic', coverageDetail: 'Web Accessibility Standards',
        refs: [{ title: 'WCAG 2.2 Quick Reference', authors: 'W3C', type: 'Online Resource', year: 2024, isbn: '', link: 'https://www.w3.org/WAI/WCAG22/quickref/' }] }),
    c(`${base}-ic3`, code, ...IC, `${base}-s2`, 'Review 2', 43200000,
      'Consider a design-handoff activity where students annotate specs for developers — this mirrors real UI/UX team workflows.',
      { co: 'CO2', ilo: 'CO2-ILO2', coverageType: 'TLA', coverageDetail: 'Design System Handoff' }),

    // ── PROGRAM HEAD — DANILA, JUNAR (Review 3) ──
    c(`${base}-ph1`, code, ...PH, `${base}-s3`, 'Review 3', 21600000,
      'CO4 evidence threshold (80% of usability issues) should also state how issues are counted and weighted.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'Topic', coverageDetail: 'Usability Testing & Metrics' }),
    c(`${base}-ph2`, code, ...PH, `${base}-s3`, 'Review 3', 21600000,
      'The usability testing session needs a rubric before it can be used as a graded assessment.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'TLA', coverageDetail: 'Moderated Usability Test' }),
    c(`${base}-ph3`, code, ...PH, `${base}-s3`, 'Review 3', 21600000,
      'Add one UX research methods reference to support CO2 — the current list is entirely UI-focused.',
      { co: 'CO2', ilo: 'CO2-ILO1', coverageType: 'References', coverageDetail: 'UX Research Coverage',
        refs: [{ title: 'Just Enough Research', authors: 'Erika Hall', type: 'Textbook', year: 2019, isbn: '978-1937557102', link: '' }] }),

    // ── RESOLVED (2) ──
    c(`${base}-res1`, code, ...DOL, `${base}-s1`, 'Review 1', 86400000,
      'Gestalt principles topic now includes annotated visual examples — thank you for the quick turnaround.',
      { co: 'CO3', ilo: 'CO3-ILO2', coverageType: 'Topic', coverageDetail: 'Gestalt Principles', status: 'resolved', resolved: true, resolvedAt: new Date(Date.now() - 3600000).toISOString() }),
    c(`${base}-res2`, code, ...PH, `${base}-s3`, 'Review 3', 21600000,
      'CO4 outcome statement was revised and now aligns with the program outcome on critical evaluation.',
      { co: 'CO4', ilo: null, coverageType: null, coverageDetail: null, status: 'resolved', resolved: true, resolvedAt: new Date(Date.now() - 7200000).toISOString() }),

    // ── CPA section (2) ──
    c(`${base}-cpa1`, code, ...PH, `${base}-cpa`, 'CPA Review', 64800000,
      'CO1 maps to PO1 as Demonstrative, but the course is introductory in the curriculum map — verify the I/E/D level.',
      { section: 'Course and Program Outcome Alignment', co: 'CO1' }),
    c(`${base}-cpa2`, code, ...DOL, `${base}-cpa`, 'CPA Review', 64800000,
      'CO3 references accessibility standards; consider also mapping it to the ethics-related program outcome.',
      { section: 'Course and Program Outcome Alignment', co: 'CO3' }),
  ]
}

const seComments = (code) => {
  const base = `seed-se`
  return [
    // ── DIRECTOR OF LIBRARIES — GARCIA, CARLOS (Review 1) ──
    c(`${base}-dol1`, code, ...DOL, `${base}-s1`, 'Review 1', 86400000,
      'Sommerville 9th edition is cited but the library now stocks the 10th. Please update the edition and year.',
      { co: 'CO1', ilo: 'CO1-ILO1', coverageType: 'References', coverageDetail: 'Software Engineering (Sommerville)',
        refs: [{ title: 'Software Engineering, 10th Edition', authors: 'Ian Sommerville', type: 'Textbook', year: 2021, isbn: '978-0133943030', link: '' }] }),
    c(`${base}-dol2`, code, ...DOL, `${base}-s1`, 'Review 1', 86400000,
      'The agile methodologies topic would benefit from the freely available Scrum Guide as a primary source.',
      { co: 'CO2', ilo: 'CO2-ILO1', coverageType: 'Topic', coverageDetail: 'Agile Methodologies',
        refs: [{ title: 'The Scrum Guide', authors: 'Schwaber & Sutherland', type: 'Online Resource', year: 2020, isbn: '', link: 'https://scrumguides.org/' }] }),
    c(`${base}-dol3`, code, ...DOL, `${base}-s1`, 'Review 1', 86400000,
      'No reference is attached to the software testing TLA — cite the course textbook chapter at minimum.',
      { co: 'CO3', ilo: 'CO3-ILO1', coverageType: 'TLA', coverageDetail: 'Test Case Design Workshop' }),

    // ── INDUSTRY CONSULTANT — CRUZ, ROBERTO (Review 2) ──
    c(`${base}-ic1`, code, ...IC, `${base}-s2`, 'Review 2', 43200000,
      'Version control is table stakes in industry — the collaboration TLA should require feature-branch workflow with pull requests.',
      { co: 'CO2', ilo: 'CO2-ILO2', coverageType: 'TLA', coverageDetail: 'Team Repository Collaboration' }),
    c(`${base}-ic2`, code, ...IC, `${base}-s2`, 'Review 2', 43200000,
      'Add CI/CD coverage to the deployment topic — most hiring partners screen for pipeline familiarity.',
      { co: 'CO3', ilo: 'CO3-ILO2', coverageType: 'Topic', coverageDetail: 'Build & Deployment',
        refs: [{ title: 'Continuous Delivery', authors: 'Humble & Farley', type: 'Textbook', year: 2010, isbn: '978-0321601919', link: '' }] }),
    c(`${base}-ic3`, code, ...IC, `${base}-s2`, 'Review 2', 43200000,
      'The estimation topic still teaches function points only — include story-point estimation as practiced in agile teams.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'Topic', coverageDetail: 'Project Estimation' }),

    // ── PROGRAM HEAD — DANILA, JUNAR (Review 3) ──
    c(`${base}-ph1`, code, ...PH, `${base}-s3`, 'Review 3', 21600000,
      'The capstone-style group project spans CO2–CO4 but is only mapped to CO4. Update the TLA-to-outcome mapping.',
      { co: 'CO4', ilo: 'CO4-ILO2', coverageType: 'TLA', coverageDetail: 'Software Project Sprint' }),
    c(`${base}-ph2`, code, ...PH, `${base}-s3`, 'Review 3', 21600000,
      'Requirements engineering topic needs an elicitation-techniques subtopic to fully support CO1-ILO2.',
      { co: 'CO1', ilo: 'CO1-ILO2', coverageType: 'Topic', coverageDetail: 'Requirements Engineering' }),
    c(`${base}-ph3`, code, ...PH, `${base}-s3`, 'Review 3', 21600000,
      'Please add a recent (2020+) software architecture reference for CO4 — Clean Architecture alone is dated for this outcome.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'References', coverageDetail: 'Architecture References',
        refs: [{ title: 'Fundamentals of Software Architecture', authors: 'Richards & Ford', type: 'Textbook', year: 2020, isbn: '978-1492043454', link: '' }] }),

    // ── RESOLVED (2) ──
    c(`${base}-res1`, code, ...DOL, `${base}-s1`, 'Review 1', 86400000,
      'The IEEE SWEBOK v4 reference was added to the CO1 reference list.',
      { co: 'CO1', ilo: 'CO1-ILO1', coverageType: 'References', coverageDetail: 'SWEBOK Guide v4', status: 'resolved', resolved: true, resolvedAt: new Date(Date.now() - 7200000).toISOString() }),
    c(`${base}-res2`, code, ...PH, `${base}-s3`, 'Review 3', 21600000,
      'CO3-to-program-outcome mapping was corrected from Introductory to Enabling.',
      { co: 'CO3', ilo: null, coverageType: null, coverageDetail: null, status: 'resolved', resolved: true, resolvedAt: new Date(Date.now() - 3600000).toISOString() }),

    // ── CPA section (1) ──
    c(`${base}-cpa1`, code, ...PH, `${base}-cpa`, 'CPA Review', 64800000,
      'CO2 is not mapped to any program outcome on teamwork despite the group-based TLAs — please review the alignment row.',
      { section: 'Course and Program Outcome Alignment', co: 'CO2' }),
  ]
}

const courseCommentMap = {
  BIT313L: hciComments,
  BIT313: hciComments,
  BSCS322L: seComments,
  BSCS322: seComments,
}

export function seedDummyComments(code) {
  if (!code) return
  try {
    const seeded = localStorage.getItem(SEED_COMMENTS_KEY)
    if (seeded) {
      // Already on v4 — only top up if this course has no comments yet
      const existing = JSON.parse(localStorage.getItem('approval_comments_v1') || '[]')
      const list = Array.isArray(existing) ? existing : []
      if (list.some(cm => cm.courseCode === code)) return
      const gen = courseCommentMap[code] || hciComments
      const fresh = gen(code)
      localStorage.setItem('approval_comments_v1', JSON.stringify([...fresh, ...list]))
      if (import.meta.env.DEV) console.log('Seeded fresh comments for', code, '—', fresh.length, 'comments')
      return
    }

    // First run on v4: wipe ALL old comments (stale seeds, test submissions) for a clean slate
    const gen = courseCommentMap[code] || hciComments
    const fresh = gen(code)

    localStorage.setItem('approval_comments_v1', JSON.stringify(fresh))
    localStorage.setItem(SEED_COMMENTS_KEY, '1')
    localStorage.removeItem('lpsm_comments_seeded_v3')
    if (import.meta.env.DEV) console.log('Reset & seeded fresh comments for', code, '—', fresh.length, 'comments')
  } catch (e) {
    console.error('Failed to seed comments', e)
  }
}
