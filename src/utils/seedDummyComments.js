const SEED_COMMENTS_KEY = 'lpsm_comments_seeded_v3'

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

const hciComments = (code) => {
  const base = `seed-hci`
  return [
    // ── DIRECTOR OF LIBRARIES — SANTOS, MARIA (3 comments) ──
    c(`${base}-dol1`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-s1`, 'Review 1', 86400000,
      'The references for CO1-ILO1 need updating. Please include the latest edition of the HCI textbook.',
      { co: 'CO1', ilo: 'CO1-ILO1', coverageType: 'References', coverageDetail: 'The Design of Everyday Things' }),
    c(`${base}-dol2`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-s1`, 'Review 1', 86400000,
      'The accessibility topic under CO3 needs more depth on WCAG guidelines.',
      { co: 'CO3', ilo: 'CO3-ILO3', coverageType: 'Topic', coverageDetail: 'Accessibility & Ethics in AI' }),
    c(`${base}-dol3`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-s1`, 'Review 1', 86400000,
      'The card sorting TLA is good but needs a debrief component for students.',
      { co: 'CO1', ilo: 'CO1-ILO3', coverageType: 'TLA', coverageDetail: 'Card Sorting Exercise' }),

    // ── INDUSTRY CONSULTANT — CRUZ, ROBERTO (3 comments) ──
    c(`${base}-ic1`, code, 'Industry Consultant', 'CRUZ, ROBERTO', `${base}-s2`, 'Review 2', 43200000,
      'Industry standard now uses WCAG 2.2. Please update the references.',
      { co: 'CO3', ilo: 'CO3-ILO3', coverageType: 'References', coverageDetail: 'Web Content Accessibility Guidelines', refs: [{ title: 'WCAG 2.2 Understanding Docs', authors: 'W3C', type: 'Online Resource', year: 2024, isbn: '', link: '' }] }),
    c(`${base}-ic2`, code, 'Industry Consultant', 'CRUZ, ROBERTO', `${base}-s2`, 'Review 2', 43200000,
      'High-fidelity prototyping should include design system fundamentals per industry practice.',
      { co: 'CO3', ilo: 'CO3-ILO1', coverageType: 'Topic', coverageDetail: 'High-Fidelity Prototyping' }),
    c(`${base}-ic3`, code, 'Industry Consultant', 'CRUZ, ROBERTO', `${base}-s2`, 'Review 2', 43200000,
      'The UI Component Audit TLA should cover accessibility audit tools used in industry.',
      { co: 'CO2', ilo: 'CO2-ILO2', coverageType: 'TLA', coverageDetail: 'UI Component Audit' }),

    // ── PROGRAM HEAD — DANILA, JUNAR (3 comments) ──
    c(`${base}-ph1`, code, 'Program Head', 'DANILA, JUNAR', `${base}-s3`, 'Review 3', 21600000,
      'The usability testing reference should include a supplementary textbook.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'References', coverageDetail: 'Usability.gov: User Experience Basics', refs: [{ title: 'Usability Testing Essentials', authors: 'Steve Krug', type: 'Textbook', year: 2023, isbn: '', link: '' }] }),
    c(`${base}-ph2`, code, 'Program Head', 'DANILA, JUNAR', `${base}-s3`, 'Review 3', 21600000,
      'The usability testing plan is good but needs more detail on success metrics.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'Topic', coverageDetail: 'Usability Testing' }),
    c(`${base}-ph3`, code, 'Program Head', 'DANILA, JUNAR', `${base}-s3`, 'Review 3', 21600000,
      'Please add a usability testing TLA where students conduct real user tests.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'TLA', coverageDetail: 'Usability Test Session' }),

    // ── RESOLVED (2) ──
    c(`${base}-res1`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-s1`, 'Review 1', 86400000,
      '[RESOLVED] Gestalt principles topic was updated with better examples.',
      { co: 'CO3', ilo: 'CO3-ILO2', coverageType: 'Topic', coverageDetail: 'Gestalt Principles', status: 'resolved', resolved: true, resolvedAt: new Date(Date.now() - 3600000).toISOString() }),
    c(`${base}-res2`, code, 'Program Head', 'DANILA, JUNAR', `${base}-s3`, 'Review 3', 21600000,
      '[RESOLVED] CO4 outcome description was revised to match program outcomes.',
      { co: 'CO4', ilo: null, coverageType: null, coverageDetail: null, status: 'resolved', resolved: true, resolvedAt: new Date(Date.now() - 7200000).toISOString() }),

    // ── CPA section (2) ──
    c(`${base}-cpa1`, code, 'Program Head', 'DANILA, JUNAR', `${base}-cpa`, 'CPA Review', 64800000,
      'CO1 should reference HCI principles more explicitly in the outcome statement.',
      { section: 'Course and Program Outcome Alignment', co: 'CO1' }),
    c(`${base}-cpa2`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-cpa`, 'CPA Review', 64800000,
      'CO4 alignment with BSIT program outcomes on innovation needs strengthening.',
      { section: 'Course and Program Outcome Alignment', co: 'CO4' }),
  ]
}

const seComments = (code) => {
  const base = `seed-se`
  return [
    // ── DIRECTOR OF LIBRARIES — SANTOS, MARIA (3 comments) ──
    c(`${base}-dol1`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-s1`, 'Review 1', 86400000,
      'Include the latest IEEE software engineering standards in the references.',
      { co: 'CO1', ilo: 'CO1-ILO1', coverageType: 'References', coverageDetail: 'SWEBOK Guide v4' }),
    c(`${base}-dol2`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-s1`, 'Review 1', 86400000,
      'Requirements elicitation topic needs real-world case study examples.',
      { co: 'CO2', ilo: 'CO2-ILO1', coverageType: 'Topic', coverageDetail: 'Requirements Elicitation' }),
    c(`${base}-dol3`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-s1`, 'Review 1', 86400000,
      'The requirements workshop TLA should include stakeholder interview practice.',
      { co: 'CO2', ilo: 'CO2-ILO2', coverageType: 'TLA', coverageDetail: 'Requirements Workshop' }),

    // ── INDUSTRY CONSULTANT — CRUZ, ROBERTO (3 comments) ──
    c(`${base}-ic1`, code, 'Industry Consultant', 'CRUZ, ROBERTO', `${base}-s2`, 'Review 2', 43200000,
      'Add CI/CD references to align with current industry testing practices.',
      { co: 'CO3', ilo: 'CO3-ILO2', coverageType: 'References', coverageDetail: 'CI/CD Best Practices', refs: [{ title: 'Continuous Delivery', authors: 'Jez Humble', type: 'Textbook', year: 2021, isbn: '', link: '' }] }),
    c(`${base}-ic2`, code, 'Industry Consultant', 'CRUZ, ROBERTO', `${base}-s2`, 'Review 2', 43200000,
      'Unit testing topic should include test-driven development exercise.',
      { co: 'CO3', ilo: 'CO3-ILO1', coverageType: 'Topic', coverageDetail: 'Unit Testing Fundamentals' }),
    c(`${base}-ic3`, code, 'Industry Consultant', 'CRUZ, ROBERTO', `${base}-s2`, 'Review 2', 43200000,
      'Code review TLA should include formal inspection process like in industry.',
      { co: 'CO3', ilo: 'CO3-ILO2', coverageType: 'TLA', coverageDetail: 'Code Review & Inspection' }),

    // ── PROGRAM HEAD — DANILA, JUNAR (3 comments) ──
    c(`${base}-ph1`, code, 'Program Head', 'DANILA, JUNAR', `${base}-s3`, 'Review 3', 21600000,
      'Consider adding more modern architectural pattern references.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'References', coverageDetail: 'Clean Architecture' }),
    c(`${base}-ph2`, code, 'Program Head', 'DANILA, JUNAR', `${base}-s3`, 'Review 3', 21600000,
      'Software maintenance should cover legacy system migration patterns.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'Topic', coverageDetail: 'Software Maintenance & Evolution' }),
    c(`${base}-ph3`, code, 'Program Head', 'DANILA, JUNAR', `${base}-s3`, 'Review 3', 21600000,
      'QA plan TLA should align with ISO 25010 standards.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'TLA', coverageDetail: 'Software Quality Assurance Plan' }),

    // ── RESOLVED (2) ──
    c(`${base}-res1`, code, 'Director of Libraries', 'SANTOS, MARIA', `${base}-s1`, 'Review 1', 86400000,
      '[RESOLVED] IEEE reference was added to CO1 references list.',
      { co: 'CO1', ilo: 'CO1-ILO1', coverageType: 'References', coverageDetail: 'IEEE Software Engineering Standards', status: 'resolved', resolved: true, resolvedAt: new Date(Date.now() - 7200000).toISOString() }),
    c(`${base}-res2`, code, 'Program Head', 'DANILA, JUNAR', `${base}-s3`, 'Review 3', 21600000,
      '[RESOLVED] CO3-program outcome mapping was updated for clarity.',
      { co: 'CO3', ilo: null, coverageType: null, coverageDetail: null, status: 'resolved', resolved: true, resolvedAt: new Date(Date.now() - 3600000).toISOString() }),

    // ── CPA section (2) ──
    c(`${base}-cpa1`, code, 'Program Head', 'DANILA, JUNAR', `${base}-cpa`, 'CPA Review', 64800000,
      'CO3-program outcome mapping needs clearer alignment.',
      { section: 'Course and Program Outcome Alignment', co: 'CO3' }),
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
    if (seeded) return

    // Remove any existing comments for this course so we get a clean slate
    const existing = JSON.parse(localStorage.getItem('approval_comments_v1') || '[]')
    const other = Array.isArray(existing) ? existing.filter(c => c.courseCode !== code) : []

    const gen = courseCommentMap[code] || hciComments
    const fresh = gen(code)
    const all = [...fresh, ...other]

    localStorage.setItem('approval_comments_v1', JSON.stringify(all))
    localStorage.setItem(SEED_COMMENTS_KEY, '1')
    if (import.meta.env.DEV) console.log('Seeded fresh comments for', code, '—', fresh.length, 'comments')
  } catch (e) {
    console.error('Failed to seed comments', e)
  }
}
