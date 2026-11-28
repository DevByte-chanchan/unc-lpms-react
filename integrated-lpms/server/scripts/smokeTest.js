'use strict';

require('dotenv').config();
const http = require('http');
const assert = require('assert');
const app = require('../server');
const db = require('../models');

let baseUrl = '';
const results = [];

function record(name, detail = '') {
  results.push({ name, status: 'PASS', detail });
  console.log(`  [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
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
  assert.strictEqual(r.status, 200, `Login failed for ${email}: ${r.status} ${JSON.stringify(r.body)}`);
  assert.ok(r.body.token, `Missing JWT for ${email}`);
  return r.body;
}

async function run() {
  await db.sequelize.authenticate();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`\n[SmokeTest] Running against ephemeral unified server at ${baseUrl}\n`);

  try {
    /* 1. HEALTH CHECK */
    console.log('--- 1. Health & Boot ---');
    const health = await api('GET', '/api/health');
    assert.strictEqual(health.status, 200, `Health failed: ${JSON.stringify(health.body)}`);
    assert.strictEqual(health.body.status, 'ok');
    assert.strictEqual(health.body.dialect, 'mysql');
    assert.ok(health.body.counts.users >= 6, 'Expected >= 6 seeded users');
    assert.ok(health.body.counts.offerings >= 2, 'Expected >= 2 seeded offerings');
    assert.ok(health.body.counts.references >= 28, 'Expected >= 28 seeded references');
    record('GET /api/health', `DB=${health.body.database}, users=${health.body.counts.users}, offerings=${health.body.counts.offerings}, refs=${health.body.counts.references}`);

    /* 2. AUTH FOR ALL 6 ROLES + ROLE SWITCH */
    console.log('\n--- 2. Unified Auth (All 6 Roles & Multi-Role Switch) ---');
    const demo = await api('GET', '/api/auth/demo-accounts');
    assert.strictEqual(demo.status, 200);
    assert.ok((demo.body.accounts || demo.body).length >= 6);
    record('GET /api/auth/demo-accounts', `${(demo.body.accounts || demo.body).length} accounts`);

    const tokens = {};
    const creds = [
      ['instructor', 'monica.norton@unc.edu.ph', 'Instructor@2026', 'Instructor'],
      ['ph', 'olivia.vance@unc.edu.ph', 'ProgramHead@2026', 'Program Head'],
      ['library', 'maria.santos@unc.edu.ph', 'Library@2026', 'Director of Libraries'],
      ['consultant', 'roberto.cruz@unc.edu.ph', 'Consultant@2026', 'Industry Consultant'],
      ['dean', 'sophia.sterling@unc.edu.ph', 'Dean@2026', 'Dean'],
      ['vpaa', 'carlos.garcia@unc.edu.ph', 'Vpaa@2026', 'VPAA'],
    ];
    for (const [key, email, pw, expectedRole] of creds) {
      const login = await loginAs(email, pw);
      tokens[key] = login.token;
      const me = await api('GET', '/api/auth/me', { token: login.token });
      assert.strictEqual(me.status, 200);
      assert.strictEqual(me.body.user.activeRole, expectedRole, `Expected ${expectedRole} for ${email}`);
      record(`Auth login + /me (${expectedRole})`, email);
    }

    // Switch role test on Olivia Vance (Program Head <-> Instructor)
    const sw1 = await api('POST', '/api/auth/switch-role', { token: tokens.ph, body: { role: 'Instructor' } });
    assert.strictEqual(sw1.status, 200, `switch-role failed: ${JSON.stringify(sw1.body)}`);
    assert.strictEqual(sw1.body.user.activeRole, 'Instructor');
    const sw2 = await api('POST', '/api/auth/switch-role', { token: sw1.body.token, body: { role: 'Program Head' } });
    assert.strictEqual(sw2.status, 200);
    assert.strictEqual(sw2.body.user.activeRole, 'Program Head');
    tokens.ph = sw2.body.token;
    record('POST /api/auth/switch-role', 'Program Head -> Instructor -> Program Head');

    /* 3. MODULE 1: COURSE ASSIGNMENT + SEAM #1 */
    console.log('\n--- 3. Module 1 (Course Assignment) & Seam #1 Live Sync ---');
    const periods = await api('GET', '/api/academic-periods', { token: tokens.vpaa });
    assert.strictEqual(periods.status, 200);
    const activePeriod = (periods.body.periods || periods.body).find((p) => p.is_active) || (periods.body.periods || periods.body)[0];
    assert.ok(activePeriod, 'Active academic period not found');
    record('VPAA GET /api/academic-periods', `active=${activePeriod.label || activePeriod.school_year}`);

    const depts = await api('GET', '/api/departments', { token: tokens.vpaa });
    assert.strictEqual(depts.status, 200);
    const vmgo = await api('GET', '/api/university-statements', { token: tokens.vpaa });
    assert.strictEqual(vmgo.status, 200);
    record('VPAA Departments & VMGO', `depts=${(depts.body.departments || depts.body).length}`);

    const facRes = await api('GET', '/api/faculty', { token: tokens.dean });
    assert.strictEqual(facRes.status, 200);
    const facList = facRes.body.faculty || facRes.body;
    const monicaFac = facList.find((f) => String(f.email || '').includes('monica.norton'));
    assert.ok(monicaFac, 'Seeded faculty Monica Norton not found');

    const progRes = await api('GET', '/api/programs', { token: tokens.dean });
    assert.strictEqual(progRes.status, 200);
    const deptStmt = await api('GET', '/api/department-statements', { token: tokens.dean });
    assert.strictEqual(deptStmt.status, 200);
    record('Dean Faculty, Programs & Dept Statements', `faculty=${facList.length}, programs=${(progRes.body.programs || progRes.body).length}`);

    const coursesRes = await api('GET', '/api/courses', { token: tokens.ph });
    assert.strictEqual(coursesRes.status, 200);
    const courses = coursesRes.body.courses || coursesRes.body;
    const bit302 = courses.find((c) => c.course_no === 'BIT302');
    assert.ok(bit302, 'Seeded course BIT302 not found');

    // Seam #1: Program Head assigns BIT302 to Monica Norton -> auto-creates ProgramCourseOffering!
    const createAssign = await api('POST', '/api/course-assignments', {
      token: tokens.ph,
      body: {
        course_id: bit302.course_id,
        faculty_id: monicaFac.faculty_id,
        academic_period_id: activePeriod.academic_period_id,
        section: 'BSIT-3A',
      },
    });
    assert.ok(createAssign.status === 201 || createAssign.status === 200, `Create assignment failed: ${createAssign.status} ${JSON.stringify(createAssign.body)}`);
    const newPcId = createAssign.body.offering?.pc_offering_id || createAssign.body.assignment?.pc_offering_id;
    assert.ok(newPcId, `offeringSyncService did not return pc_offering_id: ${JSON.stringify(createAssign.body)}`);
    record('SEAM #1: PH POST /api/course-assignments (BIT302)', `auto-created pc_offering_id=${newPcId}`);

    // Verify BIT302 immediately shows up on Instructor's Composition Dashboard
    const instDash = await api('GET', '/api/dashboard/summary', { token: tokens.instructor });
    assert.strictEqual(instDash.status, 200, `Dashboard summary failed: ${JSON.stringify(instDash.body)}`);
    const dashCourses = instDash.body.assignments || instDash.body.courses || instDash.body.offerings || [];
    const foundBit302 = JSON.stringify(instDash.body).includes('BIT302');
    assert.ok(foundBit302, `Newly assigned BIT302 did not appear on Instructor dashboard: ${JSON.stringify(instDash.body).slice(0, 400)}`);
    record('SEAM #1: Instructor Dashboard sees BIT302 + BIT313L', `items=${dashCourses.length}`);

    /* 4. MODULE 2: COMPOSITION (HCI BIT313L pc_offering_id=2, revNum=1) */
    console.log('\n--- 4. Module 2 (Composition — HCI BIT313L) & Seams #2–#5 ---');
    const details = await api('GET', '/api/course-details/2/1', { token: tokens.instructor });
    assert.strictEqual(details.status, 200, `course-details failed: ${JSON.stringify(details.body)}`);
    assert.strictEqual(details.body.code, 'BIT313L');
    record('SEAM #2: GET /api/course-details/2/1', `course=${details.body.code}, prereqs="${details.body.prerequisites}"`);

    const alignment = await api('GET', '/api/course-outcome-alignment/2/1', { token: tokens.instructor });
    assert.strictEqual(alignment.status, 200, `CO-PO alignment failed: ${JSON.stringify(alignment.body)}`);
    record('SEAM #3: GET /api/course-outcome-alignment/2/1', `outcomes=${(alignment.body.courseOutcomes || alignment.body.outcomes || []).length}`);

    const ilosRes = await api('GET', '/api/ilos/2/1', { token: tokens.instructor });
    assert.strictEqual(ilosRes.status, 200, `ILOs failed: ${JSON.stringify(ilosRes.body)}`);
    const iloData = Array.isArray(ilosRes.body) ? ilosRes.body : ilosRes.body.courseOutcomes || ilosRes.body.data || [];
    assert.ok(iloData.length >= 4, `Expected >= 4 COs in HCI ILOs, got ${iloData.length}`);
    // Find a valid week_id from CO1
    let sampleWeekId = null;
    for (const co of iloData) {
      const weeks = co.Weeks || co.weeks || [];
      if (weeks.length > 0) {
        sampleWeekId = weeks[0].week_id;
        break;
      }
    }
    assert.ok(sampleWeekId, 'Could not locate seeded Week ID from /api/ilos/2/1');
    record('SEAM #4a: GET /api/ilos/2/1', `COs=${iloData.length}, sampleWeekId=${sampleWeekId}`);

    const criteria = await api('GET', '/api/course-criteria/2/1', { token: tokens.instructor });
    assert.strictEqual(criteria.status, 200, `Criteria failed: ${JSON.stringify(criteria.body)}`);
    record('SEAM #5: GET /api/course-criteria/2/1', `loaded grading criteria`);

    const coverage = await api('GET', '/api/course-coverage/2/1', { token: tokens.instructor });
    assert.strictEqual(coverage.status, 200, `Coverage failed: ${JSON.stringify(coverage.body)}`);
    record('GET /api/course-coverage/2/1', `print preview matrix ready`);

    const refSummary = await api('GET', '/api/courses/2/1/references', { token: tokens.instructor });
    assert.strictEqual(refSummary.status, 200, `Reference summary failed: ${JSON.stringify(refSummary.body)}`);
    record('SEAM #4c: GET /api/courses/2/1/references', `APA reference summary loaded`);

    // Weekly CRUD read endpoints (Topics, TLAs, References, Revisions)
    const weekCtx = await api('GET', `/api/topics/week-context/${sampleWeekId}`, { token: tokens.instructor });
    assert.strictEqual(weekCtx.status, 200, `week-context failed: ${JSON.stringify(weekCtx.body)}`);
    const availTopics = await api('GET', `/api/topics/available?weekId=${sampleWeekId}`, { token: tokens.instructor });
    assert.strictEqual(availTopics.status, 200, `available topics failed: ${JSON.stringify(availTopics.body)}`);
    const assignedTopics = await api('GET', `/api/topics/assigned/${sampleWeekId}`, { token: tokens.instructor });
    assert.strictEqual(assignedTopics.status, 200, `assigned topics failed: ${JSON.stringify(assignedTopics.body)}`);
    const tlas = await api('GET', `/api/tlas/ilo/${sampleWeekId}`, { token: tokens.instructor });
    assert.strictEqual(tlas.status, 200, `tlas failed: ${JSON.stringify(tlas.body)}`);
    const iloRefs = await api('GET', `/api/ilo-references/${sampleWeekId}`, { token: tokens.instructor });
    assert.strictEqual(iloRefs.status, 200, `ilo-references failed: ${JSON.stringify(iloRefs.body)}`);
    const revs = await api('GET', '/api/revisions/2', { token: tokens.instructor });
    assert.strictEqual(revs.status, 200, `revisions failed: ${JSON.stringify(revs.body)}`);
    record('SEAM #4b: Topics, TLAs, ILO-Refs & Revisions (weekId=' + sampleWeekId + ')', `topics=${(assignedTopics.body.topics || assignedTopics.body || []).length}`);

    /* 5. MODULE 3: REFERENCE LIBRARY + COAEP LIVE SYNC */
    console.log('\n--- 5. Module 3 (Reference Library & COAEP Sync into M2) ---');
    const refList = await api('GET', '/api/references', { token: tokens.library });
    assert.strictEqual(refList.status, 200);
    const refArr = Array.isArray(refList.body) ? refList.body : refList.body.references || refList.body.rows || [];
    assert.ok(refArr.length >= 28, `Expected >=28 references, got ${refArr.length}`);
    const libHealth = await api('GET', '/api/references/health', { token: tokens.library });
    assert.strictEqual(libHealth.status, 200);
    record('Library Director GET /api/references & /health', `count=${refArr.length}`);

    // Upload COAEP for newly created BIT302 offering -> verify sync into Composition ILOs & Criteria
    const coaepSync = await api('POST', `/api/course-documents/${newPcId}/coaep`, {
      token: tokens.ph,
      body: {
        title: 'BIT302 COAEP SY 2026-2027',
        parsed_data: {
          courseOutcomes: [
            {
              co_number: 1,
              co_code: 'CO1',
              statement: 'Explain core CIA triad principles and threat landscapes.',
              period: 'Prelim',
              weight: 50,
              ilos: [
                {
                  ilo_code: 'ILO1.1',
                  statement: 'Identify confidentiality, integrity, and availability controls.',
                  assessment_tool: 'Written Quiz',
                  performance_target: '80% of students score >= 75%',
                  hours: 20,
                  weeks: 4,
                },
              ],
            },
            {
              co_number: 2,
              co_code: 'CO2',
              statement: 'Apply cryptographic controls and access governance.',
              period: 'Final',
              weight: 50,
              ilos: [
                {
                  ilo_code: 'ILO2.1',
                  statement: 'Configure symmetric and asymmetric encryption policies.',
                  assessment_tool: 'Lab Practical',
                  performance_target: '85% of students score >= 75%',
                  hours: 20,
                  weeks: 4,
                },
              ],
            },
          ],
        },
      },
    });
    assert.ok(coaepSync.status === 200 || coaepSync.status === 201, `COAEP sync failed: ${coaepSync.status} ${JSON.stringify(coaepSync.body)}`);
    const bit302Ilos = await api('GET', `/api/ilos/${newPcId}/1`, { token: tokens.instructor });
    assert.strictEqual(bit302Ilos.status, 200);
    const bit302Json = JSON.stringify(bit302Ilos.body);
    assert.ok(bit302Json.includes('CIA triad'), `Synced COAEP CO1 statement missing in BIT302 ILOs: ${bit302Json.slice(0, 300)}`);
    assert.ok(bit302Json.includes('confidentiality, integrity'), `Synced COAEP ILO1.1 statement missing in BIT302 ILOs`);
    record('SEAM #4a/#5: M3 COAEP Upload -> Live Sync to M2 BIT302', `CIA triad CO & ILO synced`);

    /* 6. FULL 8-STEP APPROVAL WORKFLOW, GATES, EDIT LOCK & DEFERRED REVISION INCREMENT */
    console.log('\n--- 6. Full 8-Step Approval Workflow (HCI BIT313L pc_offering_id=2) ---');

    // Step 1: Instructor edits description (sets has_modifications=true) and submits
    const editDraft = await api('PUT', '/api/course-details/2/1', {
      token: tokens.instructor,
      body: {
        description: `${details.body.description || 'HCI Learning Plan'} [Updated for SY 2026-2027 QA verification]`,
      },
    });
    assert.strictEqual(editDraft.status, 200, `Draft edit failed: ${editDraft.status} ${JSON.stringify(editDraft.body)}`);

    const sub1 = await api('POST', '/api/submit-learning-plan/2/1', { token: tokens.instructor, body: {} });
    assert.strictEqual(sub1.status, 200, `Submit failed: ${sub1.status} ${JSON.stringify(sub1.body)}`);
    assert.strictEqual(sub1.body.stage, 'parallel_review');
    record('Step 1: Instructor Edit + Submit -> parallel_review', `has_modifications triggered`);

    // Verify EditLock blocks edits while in parallel_review
    const editBlocked = await api('PUT', '/api/course-details/2/1', {
      token: tokens.instructor,
      body: { description: 'Should be blocked' },
    });
    assert.strictEqual(editBlocked.status, 403, `Expected 403 editLock during parallel_review, got ${editBlocked.status}`);
    record('Step 1b: EditLock blocks Instructor edit during parallel_review', 'HTTP 403');

    // Step 2: Library Director sees waiting-on-me, adds comment, returns plan
    const libWaiting = await api('GET', '/api/assignments/waiting-on-me', { token: tokens.library });
    assert.strictEqual(libWaiting.status, 200);
    assert.ok((libWaiting.body.items || []).some((i) => Number(i.pc_offering_id) === 2), 'LD waiting-on-me missing offering 2');

    const addComment = await api('POST', '/api/comments', {
      token: tokens.library,
      body: {
        pc_offering_id: 2,
        week_id: sampleWeekId,
        comment_for: 'reference',
        comment_text: 'Please verify APA 7th edition year formatting for Nielsen textbook.',
      },
    });
    assert.ok(addComment.status === 201 || addComment.status === 200, `Create comment failed: ${addComment.status} ${JSON.stringify(addComment.body)}`);
    const commentId = addComment.body.comment?.comment_id || addComment.body.comment_id;
    assert.ok(commentId, `Missing comment_id: ${JSON.stringify(addComment.body)}`);

    const ldReturn = await api('POST', '/api/assignments/action', {
      token: tokens.library,
      body: { pc_offering_id: 2, action: 'RETURN', note: 'Reference citation needs minor APA fix.' },
    });
    assert.strictEqual(ldReturn.status, 200, `LD return failed: ${ldReturn.status} ${JSON.stringify(ldReturn.body)}`);
    assert.strictEqual(ldReturn.body.workflow?.stage, 'returned');
    record('Step 2: Library Director Comment + Return -> returned', `commentId=${commentId}`);

    // Step 3: Mandatory Unresolved Comment Gate (MUST return HTTP 400!)
    const blockedResub = await api('POST', '/api/submit-learning-plan/2/1', { token: tokens.instructor, body: {} });
    assert.strictEqual(blockedResub.status, 400, `Expected 400 unresolved comment gate, got ${blockedResub.status}`);
    record('Step 3: Unresolved Comment Gate blocks Resubmit', `HTTP 400 (${blockedResub.body.error})`);

    // Step 4: Instructor resolves comment & resubmits
    const resolve = await api('PUT', '/api/comments/update-resolution', {
      token: tokens.instructor,
      body: { updates: [{ comment_id: commentId, resolved_status: true }] },
    });
    assert.strictEqual(resolve.status, 200, `Resolve failed: ${resolve.status} ${JSON.stringify(resolve.body)}`);

    const resub = await api('POST', '/api/submit-learning-plan/2/1', { token: tokens.instructor, body: {} });
    assert.strictEqual(resub.status, 200, `Resubmit failed: ${resub.status} ${JSON.stringify(resub.body)}`);
    assert.strictEqual(resub.body.stage, 'parallel_review');
    record('Step 4: Instructor Resolves Comment + Resubmits -> parallel_review', `resolved commentId=${commentId}`);

    // Step 5: Library Director approves; Premature Dean approval MUST be rejected (HTTP 400)
    const ldApprove = await api('POST', '/api/assignments/action', {
      token: tokens.library,
      body: { pc_offering_id: 2, action: 'APPROVE', note: 'References verified.' },
    });
    assert.strictEqual(ldApprove.status, 200, `LD approve failed: ${ldApprove.status} ${JSON.stringify(ldApprove.body)}`);
    assert.strictEqual(ldApprove.body.workflow?.stage, 'parallel_review', 'Stage must stay parallel_review until PH approves');

    const earlyDean = await api('POST', '/api/assignments/action', {
      token: tokens.dean,
      body: { pc_offering_id: 2, action: 'APPROVE', note: 'Premature approval attempt' },
    });
    assert.strictEqual(earlyDean.status, 400, `Expected 400 premature Dean gate, got ${earlyDean.status}`);
    record('Step 5: LD Approves + Premature Dean Gate Rejected', `HTTP 400 (${earlyDean.body.error})`);

    // Step 6: Program Head approves -> dean_review
    const phApprove = await api('POST', '/api/assignments/action', {
      token: tokens.ph,
      body: { pc_offering_id: 2, action: 'APPROVE', note: 'COAEP and CO-PO alignment verified.' },
    });
    assert.strictEqual(phApprove.status, 200, `PH approve failed: ${phApprove.status} ${JSON.stringify(phApprove.body)}`);
    assert.strictEqual(phApprove.body.workflow?.stage, 'dean_review');
    record('Step 6: Program Head Approves -> dean_review', 'Both LD & PH accepted');

    // Step 7: Dean final approval -> approved + deferred revision 1 -> 2 + ReviewRecordSnapshot + EditLock
    const deanApprove = await api('POST', '/api/assignments/action', {
      token: tokens.dean,
      body: { pc_offering_id: 2, action: 'APPROVE', note: 'Approved for SY 2026-2027 delivery.' },
    });
    assert.strictEqual(deanApprove.status, 200, `Dean approve failed: ${deanApprove.status} ${JSON.stringify(deanApprove.body)}`);
    assert.strictEqual(deanApprove.body.workflow?.stage, 'approved');
    const newRev = deanApprove.body.revision_number;
    assert.strictEqual(newRev, 2, `Expected deferred revision increment 1 -> 2, got ${newRev}`);

    const revRecord = await api('GET', '/api/assignments/2/review-record', { token: tokens.dean });
    assert.strictEqual(revRecord.status, 200);
    assert.ok(revRecord.body.snapshot || revRecord.body.snapshots?.length > 0 || revRecord.body.record, 'Expected ReviewRecordSnapshot after Dean approval');

    const editApprovedBlocked = await api('PUT', '/api/course-details/2/2', {
      token: tokens.instructor,
      body: { description: 'Must be immutable' },
    });
    assert.strictEqual(editApprovedBlocked.status, 403, `Expected 403 editLock on Approved offering, got ${editApprovedBlocked.status}`);
    record('Step 7: Dean Final Approval -> approved, Rev 1->2, Snapshot, EditLock', `rev=${newRev}, editLock=403`);

    // Step 8: VPAA Approved Monitoring + Export Bundle + Industry Consultant Sign-Off
    const vpaaApproved = await api('GET', '/api/assignments?stage=approved', { token: tokens.vpaa });
    assert.strictEqual(vpaaApproved.status, 200);
    assert.ok((vpaaApproved.body.rows || []).some((r) => Number(r.pc_offering_id) === 2), 'VPAA missing Approved offering 2');

    const exportBundle = await api('GET', '/api/assignments/2/export-bundle', { token: tokens.vpaa });
    assert.strictEqual(exportBundle.status, 200, `Export bundle failed: ${JSON.stringify(exportBundle.body)}`);

    const icSignoff = await api('POST', '/api/course-consultants/signoff/2', {
      token: tokens.consultant,
      body: { remarks: 'Industry-aligned HCI curriculum verified.' },
    });
    assert.ok(icSignoff.status === 200 || icSignoff.status === 201, `Consultant signoff failed: ${icSignoff.status} ${JSON.stringify(icSignoff.body)}`);
    record('Step 8: VPAA Approved List, Export Bundle & Industry Consultant Sign-Off', 'All 6 roles verified E2E');

    console.log(`\n=============================================================`);
    console.log(`ALL ${results.length} UNIFIED BACKEND SMOKE TESTS PASSED (100%)!`);
    console.log(`=============================================================\n`);
  } finally {
    server.close();
    await db.sequelize.close();
  }
}

run().catch((err) => {
  console.error('\n[SmokeTest FAILED]', err);
  process.exit(1);
});
