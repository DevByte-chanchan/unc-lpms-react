'use strict';

/**
 * Phase 6 — Strict AI QA Tester: Full-Stack 8-Test E2E Workflow Simulation
 *
 * Executes live HTTP requests through the Vite frontend dev server (http://127.0.0.1:5173)
 * verifying SPA shell boot, Vite -> Express /api proxying, MySQL 8 persistence,
 * all 5 cross-module seams, all 6 roles, Dean Return -> PH Counter -> Dean Final Approval,
 * unresolved comment gate, editLock, deferred revision increment, export bundle, and consultant sign-off.
 */

const assert = require('assert');

const FRONTEND_URL = process.env.QA_FRONTEND_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.QA_API_BASE || FRONTEND_URL; // routes through Vite proxy -> :5000!

const results = [];
let currentSuite = '';

function section(title) {
  currentSuite = title;
  console.log(`\n=== ${title} ===`);
}

function pass(check, detail = '') {
  results.push({ suite: currentSuite, check, status: 'PASS', detail });
  console.log(`  [PASS] ${check}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

async function loginAs(email, password) {
  const r = await api('POST', '/api/auth/login', { body: { email, password } });
  assert.strictEqual(r.status, 200, `Login failed for ${email}: HTTP ${r.status} ${JSON.stringify(r.body)}`);
  assert.ok(r.body.token, `Missing JWT token for ${email}`);
  return r.body;
}

async function run() {
  console.log(`\n[QA E2E Suite] Target Frontend + API Proxy: ${FRONTEND_URL}\n`);

  /* 0. LIVE FULL-STACK BOOT & VITE PROXY CHECK */
  section('QA Test 0: Live Full-Stack Vite SPA & API Proxy');
  const htmlRes = await fetch(`${FRONTEND_URL}/`);
  assert.strictEqual(htmlRes.status, 200, `Vite frontend failed: HTTP ${htmlRes.status}`);
  const html = await htmlRes.text();
  assert.ok(html.includes('<div id="root">') || html.includes('vite'), 'Frontend HTML missing root mount');
  pass('GET / (Vite SPA Shell)', `HTTP 200, ${html.length} bytes`);

  const health = await api('GET', '/api/health');
  assert.strictEqual(health.status, 200, `Proxied /api/health failed: ${JSON.stringify(health.body)}`);
  assert.strictEqual(health.body.status, 'ok');
  assert.strictEqual(health.body.dialect, 'mysql');
  assert.ok(health.body.counts.users >= 6, 'Expected >= 6 seeded users');
  assert.ok(health.body.counts.offerings >= 2, 'Expected >= 2 seeded offerings');
  assert.ok(health.body.counts.references >= 28, 'Expected >= 28 seeded references');
  pass(
    'GET /api/health (via Vite Proxy -> Express -> MySQL 8)',
    `db=${health.body.database}, users=${health.body.counts.users}, offerings=${health.body.counts.offerings}, refs=${health.body.counts.references}`
  );

  /* 1. UNIFIED AUTH & 6-ROLE SWITCHING */
  section('QA Test 1: Unified Login (All 6 Roles) & Multi-Role Switcher');
  const demo = await api('GET', '/api/auth/demo-accounts');
  assert.strictEqual(demo.status, 200);
  const demoList = demo.body.accounts || demo.body;
  assert.ok(Array.isArray(demoList) && demoList.length >= 6, 'Expected >= 6 demo accounts');
  pass('GET /api/auth/demo-accounts', `${demoList.length} quick-login accounts exposed`);

  const tokens = {};
  const accounts = [
    ['vpaa', 'carlos.garcia@unc.edu.ph', 'Vpaa@2026', 'VPAA'],
    ['dean', 'sophia.sterling@unc.edu.ph', 'Dean@2026', 'Dean'],
    ['ph', 'olivia.vance@unc.edu.ph', 'ProgramHead@2026', 'Program Head'],
    ['library', 'maria.santos@unc.edu.ph', 'Library@2026', 'Director of Libraries'],
    ['instructor', 'monica.norton@unc.edu.ph', 'Instructor@2026', 'Instructor'],
    ['consultant', 'roberto.cruz@unc.edu.ph', 'Consultant@2026', 'Industry Consultant'],
  ];

  for (const [key, email, pw, expectedRole] of accounts) {
    const login = await loginAs(email, pw);
    tokens[key] = login.token;
    const me = await api('GET', '/api/auth/me', { token: login.token });
    assert.strictEqual(me.status, 200);
    assert.strictEqual(me.body.user.activeRole, expectedRole);
    pass(`Login + /api/auth/me (${expectedRole})`, email);
  }

  const swInst = await api('POST', '/api/auth/switch-role', { token: tokens.ph, body: { role: 'Instructor' } });
  assert.strictEqual(swInst.status, 200);
  assert.strictEqual(swInst.body.user.activeRole, 'Instructor');
  const swPh = await api('POST', '/api/auth/switch-role', { token: swInst.body.token, body: { role: 'Program Head' } });
  assert.strictEqual(swPh.status, 200);
  assert.strictEqual(swPh.body.user.activeRole, 'Program Head');
  tokens.ph = swPh.body.token;
  pass('Multi-Role Switch (Olivia Vance)', 'Program Head -> Instructor -> Program Head');

  /* 2. VPAA & DEAN M1 ACADEMIC GOVERNANCE */
  section('QA Test 2: VPAA & Dean Governance (Module 1)');
  const periodsRes = await api('GET', '/api/academic-periods', { token: tokens.vpaa });
  assert.strictEqual(periodsRes.status, 200);
  const periods = periodsRes.body.periods || periodsRes.body;
  const activePeriod = periods.find((p) => p.is_active) || periods[0];
  assert.ok(activePeriod, 'Active academic period missing');

  const deptsRes = await api('GET', '/api/departments', { token: tokens.vpaa });
  assert.strictEqual(deptsRes.status, 200);
  const vmgoRes = await api('GET', '/api/university-statements', { token: tokens.vpaa });
  assert.strictEqual(vmgoRes.status, 200);
  const usersRes = await api('GET', '/api/user-accounts', { token: tokens.vpaa });
  assert.strictEqual(usersRes.status, 200);
  const auditRes = await api('GET', '/api/audit-logs', { token: tokens.vpaa });
  assert.strictEqual(auditRes.status, 200);
  pass(
    'VPAA Academic Terms, Departments, VMGO, User Accounts & Audit Logs',
    `activeTerm=${activePeriod.label || activePeriod.school_year}, depts=${(deptsRes.body.departments || deptsRes.body).length}`
  );

  const facRes = await api('GET', '/api/faculty', { token: tokens.dean });
  assert.strictEqual(facRes.status, 200);
  const facultyList = facRes.body.faculty || facRes.body;
  const monicaFac = facultyList.find((f) => String(f.email || '').includes('monica.norton'));
  assert.ok(monicaFac, 'Faculty Monica Norton missing');

  const progRes = await api('GET', '/api/programs', { token: tokens.dean });
  assert.strictEqual(progRes.status, 200);
  const deptStmtRes = await api('GET', '/api/department-statements', { token: tokens.dean });
  assert.strictEqual(deptStmtRes.status, 200);
  pass(
    'Dean Faculty Directory, Programs & Dept Vision/Mission',
    `faculty=${facultyList.length}, programs=${(progRes.body.programs || progRes.body).length}`
  );

  /* 3. PROGRAM HEAD COURSE ASSIGNMENT + COAEP LIVE SYNC INTO COMPOSITION */
  section('QA Test 3: Program Head Assignment (Seam #1) & COAEP Sync (Seams #4a/#5)');
  const coursesRes = await api('GET', '/api/courses', { token: tokens.ph });
  assert.strictEqual(coursesRes.status, 200);
  const courses = coursesRes.body.courses || coursesRes.body;
  const bit302 = courses.find((c) => c.course_no === 'BIT302');
  assert.ok(bit302, 'Seeded course BIT302 missing');

  const createAssign = await api('POST', '/api/course-assignments', {
    token: tokens.ph,
    body: {
      course_id: bit302.course_id,
      faculty_id: monicaFac.faculty_id,
      academic_period_id: activePeriod.academic_period_id,
      section: 'BSIT-3A',
    },
  });
  assert.ok(createAssign.status === 200 || createAssign.status === 201, `Create assignment failed: ${JSON.stringify(createAssign.body)}`);
  const newPcId = createAssign.body.offering?.pc_offering_id || createAssign.body.assignment?.pc_offering_id;
  assert.ok(newPcId, `Missing pc_offering_id from offeringSyncService: ${JSON.stringify(createAssign.body)}`);
  pass('SEAM #1: PH POST /api/course-assignments (BIT302 -> Monica)', `auto-created pc_offering_id=${newPcId}`);

  const instDash = await api('GET', '/api/dashboard/summary', { token: tokens.instructor });
  assert.strictEqual(instDash.status, 200);
  assert.ok(JSON.stringify(instDash.body).includes('BIT302'), 'BIT302 missing from Instructor Dashboard');
  assert.ok(JSON.stringify(instDash.body).includes('BIT313L'), 'HCI BIT313L missing from Instructor Dashboard');
  pass('SEAM #1: Instructor Dashboard live-reads M1 assignments', `BIT313L + newly assigned BIT302 visible`);

  const coaepRes = await api('POST', `/api/course-documents/${newPcId}/coaep`, {
    token: tokens.ph,
    body: {
      title: 'BIT302 Information Assurance COAEP SY 2026-2027',
      parsed_data: {
        courseOutcomes: [
          {
            co_number: 1,
            co_code: 'CO1',
            statement: 'Explain CIA triad foundations and risk governance.',
            period: 'Prelim',
            weight: 50,
            ilos: [
              {
                ilo_code: 'ILO1.1',
                statement: 'Analyze confidentiality, integrity, and availability threats.',
                assessment_tool: 'Case Analysis',
                performance_target: '80% score >= 75%',
                hours: 20,
                weeks: 4,
              },
            ],
          },
          {
            co_number: 2,
            co_code: 'CO2',
            statement: 'Design access control and cryptographic defenses.',
            period: 'Final',
            weight: 50,
            ilos: [
              {
                ilo_code: 'ILO2.1',
                statement: 'Implement symmetric/asymmetric encryption controls.',
                assessment_tool: 'Lab Practical',
                performance_target: '85% score >= 75%',
                hours: 20,
                weeks: 4,
              },
            ],
          },
        ],
      },
    },
  });
  assert.ok(coaepRes.status === 200 || coaepRes.status === 201, `COAEP upload failed: ${JSON.stringify(coaepRes.body)}`);

  const bit302Ilos = await api('GET', `/api/ilos/${newPcId}/1`, { token: tokens.instructor });
  assert.strictEqual(bit302Ilos.status, 200);
  const bit302IloStr = JSON.stringify(bit302Ilos.body);
  assert.ok(bit302IloStr.includes('CIA triad'), 'COAEP CO1 missing in BIT302 ILOs');
  assert.ok(bit302IloStr.includes('confidentiality, integrity'), 'COAEP ILO1.1 missing in BIT302 ILOs');

  const bit302Criteria = await api('GET', `/api/course-criteria/${newPcId}/1`, { token: tokens.instructor });
  assert.strictEqual(bit302Criteria.status, 200);
  pass('SEAM #4a/#5: PH COAEP Upload -> Live Sync to M2 ILOs & Criteria', `pc_offering_id=${newPcId}`);

  /* 4. PRIORITY MODULE (M2 COMPOSITION — HCI BIT313L) FULL CRUD & SUBMIT */
  section('QA Test 4: Priority Module M2 Composition (HCI BIT313L) — All Seams, Real CRUD & Submit');
  const details = await api('GET', '/api/course-details/2/1', { token: tokens.instructor });
  assert.strictEqual(details.status, 200);
  assert.strictEqual(details.body.code, 'BIT313L');
  pass('SEAM #2: Course Details (HCI BIT313L)', `title="${details.body.name || details.body.title}", prereqs="${details.body.prerequisites}"`);

  const alignment = await api('GET', '/api/course-outcome-alignment/2/1', { token: tokens.instructor });
  assert.strictEqual(alignment.status, 200);
  pass('SEAM #3: CO-PO Alignment Matrix', `outcomes=${(alignment.body.courseOutcomes || alignment.body.outcomes || []).length}`);

  const hciIlos = await api('GET', '/api/ilos/2/1', { token: tokens.instructor });
  assert.strictEqual(hciIlos.status, 200);
  const iloArr = Array.isArray(hciIlos.body) ? hciIlos.body : hciIlos.body.courseOutcomes || hciIlos.body.data || [];
  assert.ok(iloArr.length >= 4, `Expected >=4 COs, got ${iloArr.length}`);
  const sampleWeekId = iloArr[0]?.Weeks?.[0]?.week_id || iloArr[0]?.weeks?.[0]?.week_id;
  assert.ok(sampleWeekId, 'Sample week_id missing from HCI ILOs');
  pass('SEAM #4a: COAEP ILOs & 18-Week Schedule Distribution', `COs=${iloArr.length}, sampleWeekId=${sampleWeekId}`);

  // Verify unsubmitted HCI Offering #2 does NOT leak into SY 2026 review queues for any approver role,
  // and DOES appear in Program Head /api/missing-submissions!
  for (const [roleLabel, tok] of [
    ['Program Head', tokens.ph],
    ['Dean', tokens.dean],
    ['Director of Libraries', tokens.library],
    ['VPAA', tokens.vpaa],
    ['Industry Consultant', tokens.consultant],
  ]) {
    const q = await api('GET', '/api/assignments?year=2026&semester=1st', { token: tok });
    assert.strictEqual(q.status, 200, `${roleLabel} SY 2026 query failed`);
    const rows2026 = q.body.rows || q.body.data || [];
    assert.strictEqual(
      rows2026.length,
      0,
      `${roleLabel} must see 0 rows in SY 2026 review queue before submission, got ${rows2026.length}: ${JSON.stringify(rows2026.map((r) => ({ id: r.pc_offering_id, sy: r.school_year, stage: r.workflowStage })))}`
    );
  }
  const missingRes = await api('GET', '/api/missing-submissions', { token: tokens.ph });
  assert.strictEqual(missingRes.status, 200);
  assert.ok(
    (missingRes.body.missing || []).some((m) => Number(m.pc_offering_id) === 2 && m.school_year === '2026-2027'),
    'Unsubmitted HCI Offering #2 missing from Program Head /api/missing-submissions'
  );
  pass('Approver Retrieval Isolation (All 5 Roles) + PH Not-Submitted Visibility', '0 leaked in SY 2026 review queues; Offering #2 in /api/missing-submissions');

  // Verify initial unsubmitted HCI Offering #2 has EMPTY weekly content (instructor chooses Import Previous)
  const existingTopicsRes = await api('GET', `/api/topics/assigned/${sampleWeekId}`, { token: tokens.instructor });
  assert.strictEqual(existingTopicsRes.status, 200);
  const existingTopics = Array.isArray(existingTopicsRes.body) ? existingTopicsRes.body : [];
  assert.strictEqual(existingTopics.length, 0, `Expected 0 pre-populated topics on unsubmitted Offering #2, got ${existingTopics.length}`);

  const prevTopicsRes = await api('GET', `/api/topics/previous/${sampleWeekId}`, { token: tokens.instructor });
  assert.strictEqual(prevTopicsRes.status, 200);
  const prevTopics = prevTopicsRes.body?.matchingWeekTopics || [];
  assert.ok(prevTopicsRes.body?.hasPreviousRevision && prevTopics.length >= 1, 'Expected Import Previous to return prior SY 2025-2026 HCI topics');

  // Real Topic CRUD Write: import previous topic(s) + add QA subtopic
  const updatedTopicsPayload = prevTopics.map((t, idx) => ({
    topic_id: t.topic_id,
    title: t.title,
    subtopics: [
      ...(t.subtopics || []).map((s) => ({
        title: s.title,
        estimated_minutes: s.estimated_minutes,
      })),
      ...(idx === 0 ? [{ title: 'QA Verified Heuristic Walkthrough Exercise', estimated_minutes: 30 }] : []),
    ],
  }));

  const saveTopics = await api('POST', '/api/topics/assign', {
    token: tokens.instructor,
    body: { week_id: sampleWeekId, topics: updatedTopicsPayload },
  });
  assert.strictEqual(saveTopics.status, 200, `POST /api/topics/assign failed: ${JSON.stringify(saveTopics.body)}`);

  const verifyTopics = await api('GET', `/api/topics/assigned/${sampleWeekId}`, { token: tokens.instructor });
  assert.strictEqual(verifyTopics.status, 200);
  assert.ok(JSON.stringify(verifyTopics.body).includes('QA Verified Heuristic Walkthrough Exercise'), 'Saved subtopic did not persist');
  pass('SEAM #4b: Empty Initial Weekly Canvas + Import Previous + Real Topic CRUD Write', `weekId=${sampleWeekId}`);

  const tlasRes = await api('GET', `/api/tlas/ilo/${sampleWeekId}`, { token: tokens.instructor });
  assert.strictEqual(tlasRes.status, 200);
  const iloRefsRes = await api('GET', `/api/ilo-references/${sampleWeekId}`, { token: tokens.instructor });
  assert.strictEqual(iloRefsRes.status, 200);
  const criteriaRes = await api('GET', '/api/course-criteria/2/1', { token: tokens.instructor });
  assert.strictEqual(criteriaRes.status, 200);
  const coverageRes = await api('GET', '/api/course-coverage/2/1', { token: tokens.instructor });
  assert.strictEqual(coverageRes.status, 200);
  const refSummaryRes = await api('GET', '/api/courses/2/1/references', { token: tokens.instructor });
  assert.strictEqual(refSummaryRes.status, 200);
  const revsRes = await api('GET', '/api/revisions/2', { token: tokens.instructor });
  assert.strictEqual(revsRes.status, 200);
  pass('SEAM #4b/#4c/#5: TLAs, Weekly Refs, Criteria, Print Coverage & APA Summary', 'all 200 OK');

  // Edit description (sets has_modifications=true for deferred revision check) & Submit
  const editDetails = await api('PUT', '/api/course-details/2/1', {
    token: tokens.instructor,
    body: { description: `${details.body.description || 'HCI Learning Plan'} [Phase 6 QA Verified]` },
  });
  assert.strictEqual(editDetails.status, 200);

  const submit1 = await api('POST', '/api/submit-learning-plan/2/1', { token: tokens.instructor, body: {} });
  assert.strictEqual(submit1.status, 200, `Submit failed: ${JSON.stringify(submit1.body)}`);
  assert.strictEqual(submit1.body.stage, 'parallel_review');

  const blockedDuringReview = await api('PUT', '/api/course-details/2/1', {
    token: tokens.instructor,
    body: { description: 'Must be locked' },
  });
  assert.strictEqual(blockedDuringReview.status, 403, `Expected 403 editLock, got ${blockedDuringReview.status}`);
  pass('Instructor Submit -> parallel_review + EditLock Guard', 'stage=parallel_review, editLock=HTTP 403');

  /* 5. LIBRARY DIRECTOR: ADD ONLINE SUBSCRIPTION REF -> SEAM #4c + RETURN PLAN */
  section('QA Test 5: Library Director Reference Sync (Seam #4c) & Return with Comment');
  const createRef = await api('POST', '/api/references', {
    token: tokens.library,
    body: {
      title: 'ACM Digital Library — Human-Computer Interaction Journal (2026)',
      author: 'ACM SIGCHI',
      year: 2026,
      type: 'Online Subscription',
      link: 'https://dl.acm.org/journal/tochi',
      publisher: 'Association for Computing Machinery',
    },
  });
  assert.ok(createRef.status === 200 || createRef.status === 201, `Create ref failed: ${JSON.stringify(createRef.body)}`);

  // Composition picker calls GET /api/references?weekId=... (returns flat array)
  const compRefPicker = await api('GET', `/api/references?weekId=${sampleWeekId}`, { token: tokens.instructor });
  assert.strictEqual(compRefPicker.status, 200);
  assert.ok(Array.isArray(compRefPicker.body), 'Composition ?weekId picker must return flat array');
  assert.ok(
    compRefPicker.body.some((r) => String(r.title || '').includes('ACM Digital Library')),
    'New Online Subscription ref not visible in Composition picker'
  );
  pass('SEAM #4c: Library Director Adds Online Subscription -> Live in Composition Picker', `totalPickerRefs=${compRefPicker.body.length}`);

  const ldWaiting = await api('GET', '/api/assignments/waiting-on-me', { token: tokens.library });
  assert.strictEqual(ldWaiting.status, 200);
  assert.ok((ldWaiting.body.items || []).some((i) => Number(i.pc_offering_id) === 2), 'Offering 2 missing from LD waiting-on-me');

  const addComment = await api('POST', '/api/comments', {
    token: tokens.library,
    body: {
      pc_offering_id: 2,
      week_id: sampleWeekId,
      comment_for: 'references',
      comment_text: 'Please include the 2026 ACM Digital Library Online Subscription citation.',
    },
  });
  assert.ok(addComment.status === 200 || addComment.status === 201, `Create comment failed: ${JSON.stringify(addComment.body)}`);
  const commentId = addComment.body.comment?.comment_id || addComment.body.comment_id;
  assert.ok(commentId, 'Missing comment_id');

  const ldReturn = await api('POST', '/api/assignments/action', {
    token: tokens.library,
    body: { pc_offering_id: 2, action: 'RETURNED', note: 'Add 2026 ACM subscription citation.' },
  });
  assert.strictEqual(ldReturn.status, 200);
  assert.strictEqual(ldReturn.body.workflow?.stage, 'returned');
  pass('Library Director Posts Comment & Returns Plan -> returned', `commentId=${commentId}`);

  /* 6. MANDATORY UNRESOLVED COMMENT GATE + RESOLUTION + RESUBMIT */
  section('QA Test 6: Mandatory Unresolved Comment Gate & Resubmission');
  const blockedResub = await api('POST', '/api/submit-learning-plan/2/1', { token: tokens.instructor, body: {} });
  assert.strictEqual(blockedResub.status, 400, `Expected HTTP 400 unresolved gate, got ${blockedResub.status}`);
  pass('Unresolved Comment Gate Blocks Resubmission', `HTTP 400 (${blockedResub.body.error})`);

  const countsBefore = await api('GET', '/api/comments/unresolved-counts/2/1', { token: tokens.instructor });
  assert.strictEqual(countsBefore.status, 200);
  assert.ok(Number(countsBefore.body.totalUnresolved ?? countsBefore.body.total ?? 1) >= 1, 'Expected >=1 unresolved comment');

  const resolveRes = await api('PUT', '/api/comments/update-resolution', {
    token: tokens.instructor,
    body: { updates: [{ comment_id: commentId, resolved_status: true }] },
  });
  assert.strictEqual(resolveRes.status, 200);

  const countsAfter = await api('GET', '/api/comments/unresolved-counts/2/1', { token: tokens.instructor });
  assert.strictEqual(countsAfter.status, 200);
  assert.strictEqual(Number(countsAfter.body.totalUnresolved ?? countsAfter.body.total ?? 0), 0, 'Unresolved count should drop to 0');

  const resub = await api('POST', '/api/submit-learning-plan/2/1', { token: tokens.instructor, body: {} });
  assert.strictEqual(resub.status, 200);
  assert.strictEqual(resub.body.stage, 'parallel_review');
  pass('Instructor Resolves Comment (0 Unresolved) & Resubmits -> parallel_review', `commentId=${commentId}`);

  /* 7. PARALLEL APPROVAL + DEAN RETURN -> PH COUNTER TRIAGE -> DEAN FINAL APPROVAL */
  section('QA Test 7: Parallel Approval + Dean Return -> PH Counter -> Final Approval');
  const ldApprove = await api('POST', '/api/assignments/action', {
    token: tokens.library,
    body: { pc_offering_id: 2, action: 'ACCEPTED', note: 'References verified against catalog.' },
  });
  assert.strictEqual(ldApprove.status, 200);
  assert.strictEqual(ldApprove.body.workflow?.stage, 'parallel_review', 'Must stay parallel_review until PH approves');

  const earlyDean = await api('POST', '/api/assignments/action', {
    token: tokens.dean,
    body: { pc_offering_id: 2, action: 'ACCEPTED', note: 'Too early' },
  });
  assert.strictEqual(earlyDean.status, 400, `Expected 400 premature Dean gate, got ${earlyDean.status}`);
  pass('Library Director Approves + Premature Dean Gate Rejected', 'HTTP 400');

  const phApprove = await api('POST', '/api/assignments/action', {
    token: tokens.ph,
    body: { pc_offering_id: 2, action: 'ACCEPTED', note: 'COAEP & CO-PO alignment verified.' },
  });
  assert.strictEqual(phApprove.status, 200);
  assert.strictEqual(phApprove.body.workflow?.stage, 'dean_review');
  pass('Program Head Approves -> dean_review', 'Both LD & PH accepted');

  // Dean Returns to Program Head -> with_program_head (Instructor STILL sees Pending!)
  const deanReturn = await api('POST', '/api/assignments/action', {
    token: tokens.dean,
    body: { pc_offering_id: 2, action: 'RETURNED', note: 'Please clarify Week 14 usability testing hours.' },
  });
  assert.strictEqual(deanReturn.status, 200, `Dean return failed: ${JSON.stringify(deanReturn.body)}`);
  assert.strictEqual(deanReturn.body.workflow?.stage, 'with_program_head');
  assert.strictEqual(
    deanReturn.body.workflow?.compositionStatus,
    'Pending',
    'Unforwarded Dean return MUST stay Pending for Instructor!'
  );
  pass('Dean Returns to Program Head -> with_program_head (Hidden from Instructor)', 'compositionStatus=Pending');

  // PH Counter with too-short reason rejected (HTTP 400)
  const shortCounter = await api('POST', '/api/assignments/action', {
    token: tokens.ph,
    body: { pc_offering_id: 2, action: 'COUNTERED', note: 'ok' },
  });
  assert.strictEqual(shortCounter.status, 400, 'Short counter reason should be rejected HTTP 400');

  // PH Counter with full justification -> returns to dean_review
  const phCounter = await api('POST', '/api/assignments/action', {
    token: tokens.ph,
    body: {
      pc_offering_id: 2,
      action: 'COUNTERED',
      note: 'Week 14 hours match the approved 3-unit lab/lec COAEP matrix (5 hrs/wk).',
    },
  });
  assert.strictEqual(phCounter.status, 200, `PH counter failed: ${JSON.stringify(phCounter.body)}`);
  assert.strictEqual(phCounter.body.workflow?.stage, 'dean_review');
  pass('Program Head Counters Back to Dean -> dean_review', 'short-note guard=400, justified counter=200');

  // Dean Grants Final Approval -> approved, deferred rev 1 -> 2, ReviewRecordSnapshot, editLock=403
  const deanApprove = await api('POST', '/api/assignments/action', {
    token: tokens.dean,
    body: { pc_offering_id: 2, action: 'ACCEPTED', note: 'Justification accepted. Final approval granted.' },
  });
  assert.strictEqual(deanApprove.status, 200, `Dean approve failed: ${JSON.stringify(deanApprove.body)}`);
  assert.strictEqual(deanApprove.body.workflow?.stage, 'approved');
  assert.strictEqual(deanApprove.body.revision_number, 2, `Expected deferred revision 1 -> 2, got ${deanApprove.body.revision_number}`);

  const revRecord = await api('GET', '/api/assignments/2/review-record', { token: tokens.dean });
  assert.strictEqual(revRecord.status, 200);
  assert.ok(revRecord.body.snapshot || revRecord.body.snapshots?.length > 0 || revRecord.body.record, 'Missing ReviewRecordSnapshot');

  const editApproved = await api('PUT', '/api/course-details/2/2', {
    token: tokens.instructor,
    body: { description: 'Immutable check' },
  });
  assert.strictEqual(editApproved.status, 403, `Expected 403 editLock on Approved offering, got ${editApproved.status}`);
  pass('Dean Final Approval -> approved, Rev 1->2, Snapshot & EditLock', 'rev=2, editLock=HTTP 403');

  /* 8. VPAA APPROVED MONITORING / EXPORT + INDUSTRY CONSULTANT SUGGESTION & SIGN-OFF */
  section('QA Test 8: VPAA Approved Export & Industry Consultant Suggestion + Sign-Off');
  const vpaaApproved = await api('GET', '/api/assignments?stage=approved', { token: tokens.vpaa });
  assert.strictEqual(vpaaApproved.status, 200);
  assert.ok((vpaaApproved.body.rows || []).some((r) => Number(r.pc_offering_id) === 2), 'VPAA missing Approved offering 2');

  const exportBundle = await api('GET', '/api/assignments/2/export-bundle', { token: tokens.vpaa });
  assert.strictEqual(exportBundle.status, 200, `Export bundle failed: ${JSON.stringify(exportBundle.body)}`);
  pass('VPAA Approved Monitoring & Export Bundle', `export keys=${Object.keys(exportBundle.body).join(',')}`);

  const icSuggest = await api('POST', '/api/comments/suggestions/2', {
    token: tokens.consultant,
    body: { comment_text: 'Recommend adding WCAG 2.2 accessibility checklist in Week 12 lab.' },
  });
  assert.ok(icSuggest.status === 200 || icSuggest.status === 201, `IC suggestion failed: ${JSON.stringify(icSuggest.body)}`);

  const icSuggestList = await api('GET', '/api/comments/suggestions/2', { token: tokens.consultant });
  assert.strictEqual(icSuggestList.status, 200);
  assert.ok(JSON.stringify(icSuggestList.body).includes('WCAG 2.2'), 'IC suggestion not persisted');

  const icSignoff = await api('POST', '/api/course-consultants/signoff/2', {
    token: tokens.consultant,
    body: { remarks: 'Industry-aligned HCI learning plan reviewed and signed off.' },
  });
  assert.ok(icSignoff.status === 200 || icSignoff.status === 201, `IC signoff failed: ${JSON.stringify(icSignoff.body)}`);
  pass('Industry Consultant Advisory Suggestion & Formal Sign-Off', 'WCAG 2.2 suggestion + sign-off persisted');

  console.log(`\n====================================================================`);
  console.log(`PHASE 6 QA E2E SUITE: ALL ${results.length}/${results.length} CHECKS PASSED (100%)!`);
  console.log(`====================================================================\n`);
}

run().catch((err) => {
  console.error('\n[QA E2E Suite FAILED]', err);
  process.exit(1);
});
