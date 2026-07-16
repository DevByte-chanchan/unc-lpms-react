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
  recipientRole: extra?.recipientRole || 'instructor',
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

const ROLE_TO_KEY = {
  'Director of Libraries': 'director-of-libraries',
  'Industry Consultant': 'industry-consultant',
  'Program Head': 'program-head',
  'Dean': 'dean',
}

// Instructor response to an approver comment: creates a paired resolved comment
// addressed to the approver, so it appears in their sidebar.
const ir = (id, code, approverRole, subId, subLabel, baseAgeMs, comment, extra) =>
  c(id, code, 'Instructor', 'CASIMERO, DANNY', subId, subLabel, baseAgeMs / 2, comment, {
    ...extra,
    recipientRole: ROLE_TO_KEY[approverRole] || 'instructor',
    status: 'resolved',
    resolved: true,
    resolvedAt: new Date(Date.now() - baseAgeMs / 2 + 600000).toISOString(),
  })

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

const mgComments = (code) => {
  const base = 'seed-mg'
  const _1d = 86400000
  const now = Date.now()
  return [
    // ── DIRECTOR OF LIBRARIES — GARCIA, CARLOS (3 comments, 2 days ago) ──
    c(`${base}-dol1`, code, ...DOL, `${base}-s1`, 'Review 1', 2 * _1d,
      'TB1 is the 2022 edition — the 2024 revised edition is now available. Please update the textbook reference.',
      { co: 'CO1', ilo: 'CO1-ILO1', coverageType: 'References', coverageDetail: 'Mobile Game Development: A Comprehensive Guide',
        refs: [{ title: 'Mobile Game Development: A Comprehensive Guide (Revised Edition)', authors: 'Academic Press', type: 'Textbook', year: 2024, isbn: '978-0000000001', link: '' }],
        status: 'resolved', resolved: true, resolvedAt: new Date(now - _1d + 3600000).toISOString() }),
    c(`${base}-dol2`, code, ...DOL, `${base}-s1`, 'Review 1', 2 * _1d,
      'OR1 (Online Resources) has no link specified — please add the active URL for student access.',
      { co: 'CO2', ilo: 'CO2-ILO1', coverageType: 'References', coverageDetail: 'Mobile Game Development Online Resources',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - _1d + 3600000).toISOString() }),
    c(`${base}-dol3`, code, ...DOL, `${base}-s1`, 'Review 1', 2 * _1d,
      'The Testing & Evaluation topic has no reference attached. The textbook chapter on game testing would suffice.',
      { co: 'CO2', ilo: 'CO2-ILO2', coverageType: 'Topic', coverageDetail: 'Mobile Game Development Testing & Evaluation',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - _1d + 3600000).toISOString() }),
    // Instructor responses to DOL (1 day ago)
    ir(`${base}-instr-dol1`, code, DOL[0], `${base}-s1`, 'Response 1', 2 * _1d,
      'Updated TB1 to the 2024 revised edition. The new ISBN has been added to the reference list.',
      { co: 'CO1', ilo: 'CO1-ILO1', coverageType: 'References' }),
    ir(`${base}-instr-dol2`, code, DOL[0], `${base}-s1`, 'Response 1', 2 * _1d,
      'Added the active URL for OR1. Students can now access the online resources directly.',
      { co: 'CO2', ilo: 'CO2-ILO1', coverageType: 'References' }),
    ir(`${base}-instr-dol3`, code, DOL[0], `${base}-s1`, 'Response 1', 2 * _1d,
      'Attached the game testing chapter from the textbook as a reference for the Testing & Evaluation topic.',
      { co: 'CO2', ilo: 'CO2-ILO2', coverageType: 'Topic' }),

    // ── INDUSTRY CONSULTANT — CRUZ, ROBERTO (3 comments, 1.5 days ago) ──
    c(`${base}-ic1`, code, ...IC, `${base}-s2`, 'Review 2', 1.5 * _1d,
      'Industry now uses Unity Addressables for asset management. Consider updating the Integration Project TLA to cover this.',
      { co: 'CO3', ilo: 'CO3-ILO1', coverageType: 'TLA', coverageDetail: 'Mobile Game Development Integration Project',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 0.75 * _1d + 3600000).toISOString() }),
    c(`${base}-ic2`, code, ...IC, `${base}-s2`, 'Review 2', 1.5 * _1d,
      'Mobile performance profiling (frame rate, memory, battery) should be included in the Testing & Evaluation topic.',
      { co: 'CO2', ilo: 'CO2-ILO2', coverageType: 'Topic', coverageDetail: 'Mobile Game Development Testing & Evaluation',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 0.75 * _1d + 3600000).toISOString() }),
    c(`${base}-ic3`, code, ...IC, `${base}-s2`, 'Review 2', 1.5 * _1d,
      'The Design & Implementation topic should include a monetization strategy subtopic — ads vs IAP vs premium.',
      { co: 'CO4', ilo: 'CO4-ILO2', coverageType: 'Topic', coverageDetail: 'Mobile Game Development Design & Implementation',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 0.75 * _1d + 3600000).toISOString() }),
    // Instructor responses to IC (0.75 day ago)
    ir(`${base}-instr-ic1`, code, IC[0], `${base}-s2`, 'Response 2', 1.5 * _1d,
      'Added Unity Addressables coverage to the Integration Project TLA. Students will now manage asset bundles via Addressables.',
      { co: 'CO3', ilo: 'CO3-ILO1', coverageType: 'TLA' }),
    ir(`${base}-instr-ic2`, code, IC[0], `${base}-s2`, 'Response 2', 1.5 * _1d,
      'Added frame rate, memory, and battery profiling subtopics to the Testing & Evaluation topic.',
      { co: 'CO2', ilo: 'CO2-ILO2', coverageType: 'Topic' }),
    ir(`${base}-instr-ic3`, code, IC[0], `${base}-s2`, 'Response 2', 1.5 * _1d,
      'Added a monetization strategy subtopic covering ads, IAP, and premium models to the Design & Implementation topic.',
      { co: 'CO4', ilo: 'CO4-ILO2', coverageType: 'Topic' }),

    // ── PROGRAM HEAD — DANILA, JUNAR (3 comments, 1 day ago) ──
    c(`${base}-ph1`, code, ...PH, `${base}-s3`, 'Review 3', _1d,
      'CO3 and CO4 descriptions are identical ("Apply mobile game development concepts to solve related problems"). Please differentiate them — CO3 should focus on optimization, CO4 on cross-platform deployment.',
      { co: 'CO3', ilo: 'CO3-ILO1', coverageType: 'Topic', coverageDetail: 'Mobile Game Development Applications & Integration',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 0.5 * _1d + 3600000).toISOString() }),
    c(`${base}-ph2`, code, ...PH, `${base}-s3`, 'Review 3', _1d,
      'CO1-ILO2 maps to "Core Methods" topic but the intended learning outcome mentions "implement solutions" — verify the delivery week and TLA support this properly.',
      { co: 'CO1', ilo: 'CO1-ILO2', coverageType: 'TLA', coverageDetail: 'Mobile Game Development Fundamentals Workshop',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 0.5 * _1d + 3600000).toISOString() }),
    c(`${base}-ph3`, code, ...PH, `${base}-s3`, 'Review 3', _1d,
      'The grading system shows CO4 with both "Project" and "Quiz" but only "Project" is mapped in the grading criteria. Please align the assessment methods.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'Topic', coverageDetail: 'Mobile Game Development Core Methods',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 0.5 * _1d + 3600000).toISOString() }),
    // Instructor responses to PH (0.5 day ago)
    ir(`${base}-instr-ph1`, code, PH[0], `${base}-s3`, 'Response 3', _1d,
      'Differentiated CO3 to focus on game optimization techniques and CO4 on cross-platform deployment strategies.',
      { co: 'CO3', ilo: 'CO3-ILO1', coverageType: 'Topic' }),
    ir(`${base}-instr-ph2`, code, PH[0], `${base}-s3`, 'Response 3', _1d,
      'Adjusted CO1-ILO2 delivery week to align with the "Core Methods" topic and added a hands-on implementation TLA.',
      { co: 'CO1', ilo: 'CO1-ILO2', coverageType: 'TLA' }),
    ir(`${base}-instr-ph3`, code, PH[0], `${base}-s3`, 'Response 3', _1d,
      'Aligned the grading criteria — both Project and Quiz are now properly mapped under CO4 assessment methods.',
      { co: 'CO4', ilo: 'CO4-ILO1', coverageType: 'Topic' }),

    // ── DEAN — REYES, AGNES (addressed to program_head, 0.5 day ago)
    // Dean comments go to program_head; instructor responses to dean
    c(`${base}-dean1`, code, 'Dean', 'REYES, AGNES', `${base}-s4`, 'Review 4', 0.5 * _1d,
      'Please review the CO-PO alignment matrix — CO1 maps to PO10 and PO11 but the contact hours seem under-allocated for both.',
      { co: 'CO1', recipientRole: 'program_head',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 0.25 * _1d + 3600000).toISOString() }),
    c(`${base}-dean2`, code, 'Dean', 'REYES, AGNES', `${base}-s4`, 'Review 4', 0.5 * _1d,
      'The workload distribution is heavily weighted in Weeks 1-4. Consider redistributing some TLAs to later weeks for balanced pacing.',
      { recipientRole: 'program_head',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 0.25 * _1d + 3600000).toISOString() }),
    // Program Head response to Dean (addressed to dean)
    ir(`${base}-instr-dean1`, code, 'Dean', `${base}-s4`, 'Response 4', 0.5 * _1d,
      'Verified the CO-PO alignment. CO1 contact hours have been adjusted — PO10 and PO11 now have adequate coverage.',
      { co: 'CO1' }),
    ir(`${base}-instr-dean2`, code, 'Dean', `${base}-s4`, 'Response 4', 0.5 * _1d,
      'Redistributed TLAs across Weeks 1-8: moved two In-class TLAs to Weeks 5 and 7 for better pacing.',
      {}),
  ]
}

// ── BIT311L — Platform Technology (returned, 6 IC server comments) ──
const ptComments = (code) => {
  const base = 'seed-pt'
  const _1d = 86400000
  const now = Date.now()
  return [
    c(`${base}-ic1`, code, ...IC, `${base}-s1`, 'Review Corrections', 3 * _1d,
      'In modern enterprise environments, managing Hyper-V and ESXi from the CLI is just as critical as the GUI. Ensure this virtualization topic explicitly lists PowerShell and ESXCLI commands.',
      { co: 'CO2', coverageType: 'Topic', coverageDetail: 'Platform Technologies',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 1.5 * _1d + 3600000).toISOString() }),
    c(`${base}-ic2`, code, ...IC, `${base}-s1`, 'Review Corrections', 3 * _1d,
      'This VLAN lab is too theoretical. Students need to actively configure 802.1Q trunking on virtual switches. Please adjust the TLA description to require a working trunk port demonstration.',
      { co: 'CO2', coverageType: 'TLA', coverageDetail: 'Platform Technologies Virtual Networking',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 1.5 * _1d + 3600000).toISOString() }),
    c(`${base}-ic3`, code, ...IC, `${base}-s1`, 'Review Corrections', 3 * _1d,
      'You cannot teach Kubernetes effectively without covering Role-Based Access Control (RBAC). Add RBAC and Security Contexts to this topic before moving on to deployments.',
      { co: 'CO3', coverageType: 'Topic', coverageDetail: 'Platform Technologies Container Orchestration',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 1.5 * _1d + 3600000).toISOString() }),
    c(`${base}-ic4`, code, ...IC, `${base}-s1`, 'Review Corrections', 3 * _1d,
      'Instead of running Minikube locally for this assessment, consider using a free tier of a managed service like EKS or GKE. Industry practice rarely involves local clusters for production modeling.',
      { co: 'CO3', coverageType: 'TLA', coverageDetail: 'Platform Technologies Kubernetes Deployment',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 1.5 * _1d + 3600000).toISOString() }),
    c(`${base}-ic5`, code, ...IC, `${base}-s1`, 'Review Corrections', 3 * _1d,
      'Terraform State Management is listed, but there is no mention of state locking or backend remote storage (like S3/DynamoDB). This is critical to prevent state corruption in teams.',
      { co: 'CO4', coverageType: 'Topic', coverageDetail: 'Platform Technologies Infrastructure as Code',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 1.5 * _1d + 3600000).toISOString() }),
    c(`${base}-ic6`, code, ...IC, `${base}-s1`, 'Review Corrections', 3 * _1d,
      'The Ansible playbook execution lab should require writing idempotent tasks. Update the parameters to grade students based on whether their playbooks safely handle multiple consecutive runs.',
      { co: 'CO4', coverageType: 'TLA', coverageDetail: 'Platform Technologies Automation',
        status: 'resolved', resolved: true, resolvedAt: new Date(now - 1.5 * _1d + 3600000).toISOString() }),
    // Instructor responses to IC (1.5 days ago)
    ir(`${base}-instr-ic1`, code, IC[0], `${base}-s1`, 'Response 1', 3 * _1d,
      'Added PowerShell and ESXCLI commands to the virtualization topic — both Hyper-V and ESXi CLI workflows are now listed.',
      { co: 'CO2', coverageType: 'Topic' }),
    ir(`${base}-instr-ic2`, code, IC[0], `${base}-s1`, 'Response 1', 3 * _1d,
      'Updated the TLA to require students to actively configure 802.1Q trunking on virtual switches with a working trunk port demonstration.',
      { co: 'CO2', coverageType: 'TLA' }),
    ir(`${base}-instr-ic3`, code, IC[0], `${base}-s1`, 'Response 1', 3 * _1d,
      'Added RBAC and Security Contexts subtopics to the Kubernetes container orchestration topic.',
      { co: 'CO3', coverageType: 'Topic' }),
    ir(`${base}-instr-ic4`, code, IC[0], `${base}-s1`, 'Response 1', 3 * _1d,
      'Updated the assessment to use EKS/GKE managed service references instead of local Minikube.',
      { co: 'CO3', coverageType: 'TLA' }),
    ir(`${base}-instr-ic5`, code, IC[0], `${base}-s1`, 'Response 1', 3 * _1d,
      'Added S3/DynamoDB remote state locking to the Terraform state management coverage.',
      { co: 'CO4', coverageType: 'Topic' }),
    ir(`${base}-instr-ic6`, code, IC[0], `${base}-s1`, 'Response 1', 3 * _1d,
      'Updated the Ansible lab to require idempotent playbooks — grading now checks safe multiple-run execution.',
      { co: 'CO4', coverageType: 'TLA' }),
  ]
}

const courseCommentMap = {
  BIT313L: hciComments,
  BIT313: hciComments,
  BSCS322L: seComments,
  BSCS322: seComments,
  BSCS511: mgComments,
  BIT311L: ptComments,
  BIT311: ptComments,
}

export function seedDummyComments(code) {
  if (!code) return
  try {
    // Always regenerate seed for this course — replaces stale/old-format comments
    const raw = localStorage.getItem('approval_comments_v1') || '[]'
    const all = JSON.parse(raw)
    const list = Array.isArray(all) ? all : []

    // Keep comments for OTHER courses but remove ALL seed-prefixed comments for THIS course
    const others = list.filter(c => c.courseCode !== code || !c.id?.startsWith('seed-'))

    const gen = courseCommentMap[code]
    if (!gen) {
      // No seed data for this course — still persist the sweep so stale seeds
      // (e.g. removed statComments) disappear from localStorage.
      if (others.length !== list.length) {
        localStorage.setItem('approval_comments_v1', JSON.stringify(others))
      }
      return
    }
    const fresh = gen(code)

    localStorage.setItem('approval_comments_v1', JSON.stringify([...others, ...fresh]))
  } catch (e) {
    console.error('Failed to seed comments', e)
  }
}
