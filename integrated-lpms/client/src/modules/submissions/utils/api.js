import { actingRole, expireSession, getSession, setSession } from './session.js';
import { API_BASE as SHARED_API_BASE, getStoredToken } from '../../../shared/api.js';

export const API_BASE = SHARED_API_BASE || '';

const inFlight = new Map();

function buildHeaders(extra = {}, isFormData = false) {
  const role = actingRole();
  const token = getStoredToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(role ? { 'X-LPMS-Role': role } : {}),
    ...(extra || {}),
  };
  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }
  return headers;
}

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    return body;
  }
  return {};
}

function normalizeProgramOutcomesResponse(raw) {
  if (!raw || typeof raw !== 'object') return { program: null, peos: [], outcomes: [], frontPage: null };
  const prog = raw.program
    ? {
        id: raw.program.program_id ?? raw.program.id,
        name: raw.program.name || '',
        code: raw.program.code || '',
        department: raw.program.department?.name || raw.program.department || '',
      }
    : null;
  const peos = (raw.peos || []).map((p, idx) => ({
    id: p.peo_id ?? p.id ?? idx + 1,
    peo_id: p.peo_id ?? p.id,
    statement: p.statement || '',
    missionAligned: p.mission_aligned ?? p.missionAligned ?? true,
  }));
  const rawOutcomes = raw.programOutcomes || raw.outcomes || [];
  const outcomes = rawOutcomes.map((o, idx) => ({
    id: o.po_id ?? o.id ?? idx + 1,
    po_id: o.po_id ?? o.id,
    text: o.description ?? o.text ?? '',
    description: o.description ?? o.text ?? '',
    peos: Array.isArray(o.peo_numbers) ? o.peo_numbers : (Array.isArray(o.peos) ? o.peos : []),
    gas: Array.isArray(o.ga_numbers) ? o.ga_numbers : (Array.isArray(o.gas) ? o.gas : []),
  }));
  return {
    program: prog,
    peos,
    outcomes,
    programOutcomes: rawOutcomes,
    frontPage: raw.frontPage || null,
  };
}

function normalizeWaitingOnMe(raw) {
  if (Array.isArray(raw?.plans)) return raw;
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const now = Date.now();
  const plans = items.map((item) => {
    const pco = item.ProgramCourseOffering || item.offering || {};
    const course = pco.Course || pco.course || {};
    const program = pco.Program || pco.program || {};
    const submittedAt = item.submittedAt || item.updatedAt || item.createdAt || null;
    const waitedDays = submittedAt
      ? Math.max(0, Math.floor((now - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    return {
      offeringId: item.pc_offering_id ?? pco.pc_offering_id ?? item.offeringId ?? item.id,
      courseCode: item.course_code || course.course_no || '',
      courseTitle: item.course_name || course.course_title || '',
      programName: program.name || item.program_name || '',
      schoolYear: pco.school_year || item.school_year || '',
      semester: pco.semester || item.semester || '',
      instructor: item.faculty_name || item.instructor_name || '',
      submittedAt,
      waitedDays,
    };
  });
  return { count: plans.length, items, plans };
}

async function rawFetchJson(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const isFormData = opts.body instanceof FormData;
  const headers = buildHeaders(opts.headers, isFormData);
  let res;
  try {
    res = await fetch(url, { ...opts, headers, credentials: 'include' });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw friendlyError(0, '', cause);
  }
  if (!res.ok) {
    if (res.status === 401) expireSession();
    const text = await res.text().catch(() => '');
    if (res.status === 403 && text.includes('PASSWORD_CHANGE_REQUIRED') && getSession()) {
      setSession({ ...getSession(), mustChangePassword: true });
    }
    throw friendlyError(res.status, text);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

async function adaptedRequest(endpoint, opts = {}) {
  const method = String(opts.method || 'GET').toUpperCase();
  const [rawPath, rawQuery = ''] = String(endpoint || '').split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const qs = rawQuery ? `?${rawQuery}` : '';
  const searchParams = new URLSearchParams(rawQuery);

  // 1. Waiting-on-me dashboard queue
  if (method === 'GET' && path === '/api/assignments/waiting-on-me') {
    const res = await rawFetchJson(`/api/assignments/waiting-on-me${qs}`, opts);
    return normalizeWaitingOnMe(res);
  }

  // 2. Offering-scoped assignment endpoints: /api/assignments/offering/:pcId[/sub]
  const offMatch = /^\/api\/assignments\/offering\/([^/]+)(?:\/(.+))?$/.exec(path);
  if (offMatch) {
    const pcId = offMatch[1];
    const sub = offMatch[2] || '';
    if (!sub && method === 'GET') {
      const data = await rawFetchJson(`/api/assignments/${pcId}/workflow${qs}`, opts);
      return {
        ...data,
        logs: Array.isArray(data?.logs) ? data.logs : [],
        plan: {
          code: data?.offering?.course?.course_no || data?.assignment?.course_code || '',
          revision: data?.offering?.revision_number ?? null,
        },
      };
    }
    if (sub === 'plan-checks') {
      const res = await rawFetchJson(`/api/assignments/${pcId}/checks${qs}`, opts);
      const rawChecks = Array.isArray(res?.checks) ? res.checks : [];
      const checks = rawChecks.map((c) => {
        let detail = c.detail;
        if (!detail && c.details && typeof c.details === 'object') {
          detail = `Prelim ${c.details.prelim}%, Midterm ${c.details.midterm}%, Semi-Final ${c.details.semi}%, Final ${c.details.final}%`;
        }
        return {
          ...c,
          ok: Boolean(c.ok ?? c.pass),
          detail: detail || (c.pass ? 'Passes check' : 'Needs review'),
        };
      });
      return { ...res, checks };
    }
    if (sub === 'review-record') return rawFetchJson(`/api/assignments/${pcId}/review-record${qs}`, opts);
    if (sub === 'signatures') return rawFetchJson(`/api/assignments/${pcId}/signatures${qs}`, opts);
    if (sub === 'history') {
      const res = await rawFetchJson(`/api/revisions/${pcId}${qs}`, opts);
      const revs = Array.isArray(res?.revisions) ? res.revisions : [];
      const versions = revs.map((r) => ({
        id: r.pcId,
        revision: r.revNum,
        schoolYear: r.schoolYear || r.termLabel || '',
        semester: r.semester || '',
        current: Number(r.pcId) === Number(pcId),
        approvedAt: r.approvedAt || null,
        carriedFrom: Boolean(r.basePcId),
        events: (r.timeline || []).map((ev) => ({
          action: ev.actionLabel || ev.type,
          who: ev.actorName || ev.actor || '',
          role: ev.actorRole || '',
          at: ev.date,
          note: ev.note || null,
        })),
      }));
      return { ...res, versions };
    }
    if (sub === 'start-revision' || sub === 'carry-over') {
      return rawFetchJson(`/api/assignments/${pcId}/${sub}${qs}`, opts);
    }
  }

  // 2b. Workflow action normalization (POST /api/assignments/action)
  if (path === '/api/assignments/action' && method === 'POST') {
    const body = parseJsonBody(opts.body);
    const adapted = {
      ...body,
      pc_offering_id: body.pc_offering_id || body.pcId || body.offering_id,
      code: body.code || body.course_code || body.courseCode,
    };
    return rawFetchJson('/api/assignments/action', {
      ...opts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: JSON.stringify(adapted),
    });
  }

  // 3. M2 offering routes called without /:revNum (via offeringKey when revNum is null/0)
  const m2Single = /^\/api\/(course-details|course-outcome-alignment|course-coverage|course-criteria|ilos|submit-learning-plan)\/(\d+)$/.exec(path);
  if (m2Single) {
    return rawFetchJson(`/api/${m2Single[1]}/${m2Single[2]}/1${qs}`, opts);
  }
  const courseRefsSingle = /^\/api\/courses\/(\d+)\/references$/.exec(path);
  if (courseRefsSingle) {
    return rawFetchJson(`/api/courses/${courseRefsSingle[1]}/1/references${qs}`, opts);
  }

  // 4. Comments adaptation
  const byCourseGet = /^\/api\/comments\/by-course\/([^/]+)$/.exec(path);
  if (byCourseGet && method === 'GET') {
    const pcId = searchParams.get('pcId') || searchParams.get('pc_offering_id');
    const target = pcId
      ? `/api/comments/offering/${encodeURIComponent(pcId)}`
      : `/api/comments/course/${byCourseGet[1]}`;
    const res = await rawFetchJson(target, opts);
    return Array.isArray(res) ? res : (res?.comments || []);
  }
  if (path === '/api/comments/by-course' && method === 'POST') {
    const body = parseJsonBody(opts.body);
    const adapted = {
      ...body,
      pc_offering_id: body.pc_offering_id || body.pcId || body.offering_id,
      course_code: body.course_code || body.code || body.courseCode,
      message: body.message || body.comment_text || body.text || body.comment || '',
    };
    return rawFetchJson('/api/comments', {
      ...opts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: JSON.stringify(adapted),
    });
  }
  const commentsByCourseRev = /^\/api\/comments\/course\/(\d+)(?:\/(\d+))?$/.exec(path);
  if (commentsByCourseRev && method === 'GET') {
    const res = await rawFetchJson(`/api/comments/offering/${commentsByCourseRev[1]}`, opts);
    return Array.isArray(res) ? res : (res?.comments || []);
  }
  const earlierConsultant = /^\/api\/comments\/earlier-consultant\/(\d+)$/.exec(path);
  if (earlierConsultant && method === 'GET') {
    const res = await rawFetchJson(`/api/comments/suggestions/${earlierConsultant[1]}`, opts);
    return { versions: res?.earlierVersions || res?.versions || [] };
  }

  // 5. Reference Library adaptation
  if (path === '/api/references/library' && method === 'GET') {
    const res = await rawFetchJson('/api/references?includeArchived=true&format=array', opts);
    return Array.isArray(res) ? res : (res?.references || []);
  }
  const refArchive = /^\/api\/references\/(\d+)\/(archive|unarchive)$/.exec(path);
  if (refArchive && (method === 'PUT' || method === 'PATCH' || method === 'POST')) {
    return rawFetchJson(`/api/references/${refArchive[1]}/archive`, {
      ...opts,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: JSON.stringify({ archived: refArchive[2] === 'archive' }),
    });
  }
  const refSingleGet = /^\/api\/references\/(\d+)$/.exec(path);
  if (refSingleGet && method === 'GET') {
    const list = await rawFetchJson('/api/references?includeArchived=true&format=array', opts);
    const arr = Array.isArray(list) ? list : (list?.references || []);
    const found = arr.find((r) => Number(r.reference_id ?? r.id) === Number(refSingleGet[1]));
    if (!found) throw friendlyError(404, JSON.stringify({ error: 'Reference not found.' }));
    return found;
  }

  // 6. Course-References tree & by-reference adaptation
  if (path === '/api/course-references/tree' && method === 'GET') {
    const [crRes, coursesRes] = await Promise.all([
      rawFetchJson('/api/course-references', opts).catch(() => ({ courseReferences: [] })),
      rawFetchJson('/api/courses', opts).catch(() => []),
    ]);
    const links = Array.isArray(crRes) ? crRes : (crRes?.courseReferences || crRes?.rows || []);
    const courses = Array.isArray(coursesRes) ? coursesRes : (coursesRes?.courses || coursesRes?.data || []);
    const byCourse = new Map();
    courses.forEach((c) => {
      const cid = Number(c.course_id ?? c.id);
      byCourse.set(cid, {
        course_id: cid,
        course_no: c.course_no || c.code || '',
        course_title: c.course_title || c.title || '',
        references: [],
      });
    });
    links.forEach((lk) => {
      const cid = Number(lk.course_id);
      if (!byCourse.has(cid)) {
        byCourse.set(cid, {
          course_id: cid,
          course_no: lk.course?.course_no || '',
          course_title: lk.course?.course_title || '',
          references: [],
        });
      }
      if (lk.reference) byCourse.get(cid).references.push(lk.reference);
    });
    return { courses: [...byCourse.values()] };
  }
  const crByRef = /^\/api\/course-references\/by-reference\/(\d+)$/.exec(path);
  if (crByRef && method === 'GET') {
    const crRes = await rawFetchJson(`/api/course-references?reference_id=${crByRef[1]}`, opts);
    const links = Array.isArray(crRes) ? crRes : (crRes?.courseReferences || crRes?.rows || []);
    return { courses: links.map((l) => l.course || { course_id: l.course_id }) };
  }
  const crPostCourse = /^\/api\/course-references\/(\d+)$/.exec(path);
  if (crPostCourse && method === 'POST') {
    const body = parseJsonBody(opts.body);
    return rawFetchJson('/api/course-references', {
      ...opts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: JSON.stringify({ ...body, course_id: Number(crPostCourse[1]) }),
    });
  }

  // 7. Title Requests decision route: PUT /api/title-requests/:id/:decision
  const trDecision = /^\/api\/title-requests\/(\d+)\/(approved|declined|fulfilled|rejected)$/.exec(path);
  if (trDecision && method === 'PUT') {
    const body = parseJsonBody(opts.body);
    return rawFetchJson(`/api/title-requests/${trDecision[1]}`, {
      ...opts,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: JSON.stringify({ ...body, status: trDecision[2] }),
    });
  }

  // 8. Program Outcomes & Front Pages
  if (path === '/api/program-outcomes/programs' && method === 'GET') {
    const res = await rawFetchJson('/api/programs', opts);
    const arr = Array.isArray(res) ? res : (res?.programs || res?.data || []);
    return {
      programs: arr.map((p) => ({
        id: p.program_id ?? p.id,
        name: p.name || '',
        code: p.code || '',
        department: p.department?.name || p.department_name || '',
        outcomes: Number(p.outcomes_count ?? p.outcomes ?? 0),
      })),
    };
  }
  const poOffering = /^\/api\/program-outcomes\/offering\/(\d+)$/.exec(path);
  if (poOffering && method === 'GET') {
    const wf = await rawFetchJson(`/api/assignments/${poOffering[1]}/workflow`, opts);
    const pid = wf?.offering?.program_id || 1;
    const raw = await rawFetchJson(`/api/program-outcomes?program_id=${pid}`, opts);
    return normalizeProgramOutcomesResponse(raw);
  }
  const poFront = /^\/api\/program-outcomes\/(\d+)\/front-pages$/.exec(path);
  if (poFront) {
    const pid = poFront[1];
    if (method === 'DELETE') {
      return rawFetchJson(`/api/programs/${pid}/front-page`, { ...opts, method: 'DELETE' });
    }
    if (method === 'POST' || method === 'PUT') {
      const fd = new FormData();
      const rawFileName = decodeURIComponent(opts.headers?.['X-File-Name'] || opts.headers?.['x-file-name'] || `program_${pid}_front_pages.pdf`);
      const fileObj = opts.body instanceof File
        ? opts.body
        : new File([opts.body], rawFileName, { type: 'application/pdf' });
      fd.append('file', fileObj);
      return rawFetchJson(`/api/programs/${pid}/front-page`, { ...opts, method: 'POST', body: fd });
    }
  }
  const poById = /^\/api\/program-outcomes\/(\d+)$/.exec(path);
  if (poById) {
    const pid = Number(poById[1]);
    if (method === 'GET') {
      const raw = await rawFetchJson(`/api/program-outcomes?program_id=${pid}`, opts);
      return normalizeProgramOutcomesResponse(raw);
    }
    if (method === 'PUT' || method === 'POST') {
      const body = parseJsonBody(opts.body);
      const payload = {
        program_id: pid,
        peos: (body.peos || []).map((p) => ({
          peo_id: p.peo_id || p.id,
          statement: p.statement || '',
          mission_aligned: p.missionAligned ?? p.mission_aligned ?? true,
        })),
        programOutcomes: (body.outcomes || body.programOutcomes || []).map((o) => ({
          po_id: typeof o.po_id === 'number' ? o.po_id : (typeof o.id === 'number' ? o.id : undefined),
          description: o.text ?? o.description ?? '',
          peo_numbers: o.peos ?? o.peo_numbers ?? [],
          ga_numbers: o.gas ?? o.ga_numbers ?? [],
        })),
      };
      const raw = await rawFetchJson('/api/program-outcomes', {
        ...opts,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        body: JSON.stringify(payload),
      });
      return normalizeProgramOutcomesResponse(raw);
    }
  }

  // 9. Course Documents & COAEP
  const coaepByCode = /^\/api\/coaep\/([^/]+)$/.exec(path);
  if (coaepByCode && method === 'GET') {
    const pcId = searchParams.get('pcId') || searchParams.get('pc_offering_id') || coaepByCode[1];
    return rawFetchJson(`/api/course-documents/${encodeURIComponent(pcId)}/coaep`, opts);
  }
  const cdGet = /^\/api\/course-documents\/(\d+)$/.exec(path);
  if (cdGet && method === 'GET') {
    const res = await rawFetchJson(`/api/course-documents?pc_offering_id=${cdGet[1]}`, opts);
    const docs = res?.documents || [];
    const out = {};
    docs.forEach((d) => {
      out[d.kind] = {
        fileName: d.file_name,
        contentType: d.content_type,
        updatedAt: d.updatedAt,
        parsed: d.parsed || null,
      };
    });
    return out;
  }
  const cdKind = /^\/api\/course-documents\/(\d+)\/(co-po|coaep)$/.exec(path);
  if (cdKind && (method === 'PUT' || method === 'POST')) {
    const fd = new FormData();
    const rawFileName = decodeURIComponent(opts.headers?.['X-File-Name'] || opts.headers?.['x-file-name'] || `${cdKind[2]}_${cdKind[1]}`);
    const fileObj = opts.body instanceof File ? opts.body : new File([opts.body], rawFileName);
    fd.append('file', fileObj);
    fd.append('pc_offering_id', cdKind[1]);
    fd.append('kind', cdKind[2]);
    return rawFetchJson('/api/course-documents', { ...opts, method: 'POST', body: fd });
  }

  // 10. Missing Submissions, Reminders & Deadlines
  const toShortSemester = (sem) => {
    const v = String(sem || '').trim().toLowerCase();
    if (v.startsWith('1') || v.includes('first')) return '1st';
    if (v.startsWith('2') || v.includes('second')) return '2nd';
    if (v.includes('sum') || v.includes('mid') || v === '3') return 'Summer';
    return String(sem || '1st').trim();
  };

  if (path === '/api/term-deadlines' && method === 'GET') {
    const [dlRes, progRes] = await Promise.all([
      rawFetchJson(`/api/term-deadlines${qs}`, opts),
      rawFetchJson('/api/programs', opts).catch(() => []),
    ]);
    const rawDeadlines = Array.isArray(dlRes?.deadlines) ? dlRes.deadlines : (Array.isArray(dlRes) ? dlRes : []);
    const deadlines = rawDeadlines.map((d) => ({
      ...d,
      program_id: Number(d.program_id),
      school_year: String(d.school_year || '').trim(),
      semester: toShortSemester(d.semester),
    }));
    const rawProgs = Array.isArray(progRes) ? progRes : (progRes?.programs || progRes?.data || []);
    const programs = rawProgs.map((p) => ({
      program_id: Number(p.program_id ?? p.id),
      id: Number(p.program_id ?? p.id),
      name: p.name || '',
      code: p.code || '',
    }));
    return { deadlines, programs };
  }
  if (path === '/api/missing-submissions' && method === 'GET') {
    const res = await rawFetchJson(`/api/missing-submissions${qs}`, opts);
    const today = res?.today || new Date().toISOString().slice(0, 10);
    const rawMissing = Array.isArray(res?.missing) ? res.missing : [];
    const missing = rawMissing.map((m) => {
      const due = m.syllabus_due || m.syllabusDue || m.due_date || m.dueDate || null;
      const daysLeft = due
        ? Math.round((Date.parse(`${String(due).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(today).slice(0, 10)}T00:00:00Z`)) / 86400000)
        : null;
      const assignedAt = m.assignedAt ?? m.date_assigned ?? null;
      const assignedDay = assignedAt ? String(assignedAt).slice(0, 10) : null;
      const assignedDaysBeforeDue = due && assignedDay
        ? Math.round((Date.parse(`${String(due).slice(0, 10)}T00:00:00Z`) - Date.parse(`${assignedDay}T00:00:00Z`)) / 86400000)
        : null;
      const lastReminderAt = m.lastReminderAt ?? m.last_reminder_at ?? null;
      const lastReminderDay = lastReminderAt ? String(lastReminderAt).slice(0, 10) : null;
      const computedStatus = daysLeft == null
        ? 'no-deadline'
        : (daysLeft < 0 ? 'overdue' : (daysLeft <= 7 ? 'due-soon' : 'on-track'));
      return {
        ...m,
        offeringId: m.offeringId ?? m.pc_offering_id,
        programId: Number(m.programId ?? m.program_id ?? 0),
        courseCode: m.courseCode ?? m.course_no ?? '',
        courseTitle: m.courseTitle ?? m.course_title ?? '',
        programName: m.programName ?? m.program_name ?? '',
        instructorName: m.instructorName ?? m.instructor_name ?? 'Instructor',
        instructorActive: m.instructorActive ?? m.instructor_active ?? true,
        schoolYear: String(m.schoolYear ?? m.school_year ?? '2026-2027').trim(),
        semester: toShortSemester(m.semester),
        syllabusDue: due,
        dueDate: due,
        assignedAt,
        assignedDay,
        assignedDaysBeforeDue,
        lastReminderAt,
        lastReminderDay,
        lastReminderBy: m.lastReminderBy ?? 'Program Head',
        daysLeft,
        status: m.status || computedStatus,
        remindersPaused: Boolean(m.remindersPaused ?? m.reminders_paused),
      };
    });
    return { ...res, today, missing, rows: missing };
  }
  const remindMatch = /^\/api\/missing-submissions\/(\d+)\/(poke|remind|pause)$/.exec(path);
  if (remindMatch && (method === 'POST' || method === 'PUT')) {
    const target = remindMatch[2] === 'pause'
      ? `/api/reminders/${remindMatch[1]}/toggle-pause`
      : `/api/reminders/${remindMatch[1]}/send-now`;
    return rawFetchJson(target, { ...opts, method: 'POST' });
  }

  // 11. Course Consultants & Signoffs
  if (path === '/api/course-consultants/candidates' && method === 'GET') {
    const res = await rawFetchJson('/api/industry-consultants', opts);
    const arr = Array.isArray(res) ? res : (res?.consultants || res?.data || []);
    return {
      candidates: arr.map((c) => ({
        id: c.user_id ?? c.consultant_id ?? c.id,
        user_id: c.user_id ?? c.consultant_id ?? c.id,
        name: c.name || c.full_name || c.email || '',
        email: c.email || '',
        organization: c.organization || c.company || '',
      })),
    };
  }
  const signoffsMatch = /^\/api\/course-consultants\/signoffs\/(\d+)$/.exec(path);
  if (signoffsMatch) {
    const meId = Number(getSession()?.user_id ?? getSession()?.id ?? 0);
    if (method === 'GET') {
      const wf = await rawFetchJson(`/api/assignments/${signoffsMatch[1]}/workflow`, opts);
      const list = Array.isArray(wf?.consultantSignoffs) ? wf.consultantSignoffs : [];
      return list.map((s) => ({
        id: s.id,
        user_id: s.consultant_user_id,
        name: s.consultant_name || 'Industry Consultant',
        signedAt: s.signed_at || s.signedAt,
        mine: meId > 0 && Number(s.consultant_user_id) === meId,
      }));
    }
    if (method === 'POST') {
      const res = await rawFetchJson(`/api/course-consultants/signoff/${signoffsMatch[1]}`, { ...opts, method: 'POST' });
      const s = res?.signoff || res || {};
      return {
        id: s.id,
        user_id: s.consultant_user_id || meId,
        name: s.consultant_name || getSession()?.name || 'Industry Consultant',
        signedAt: s.signed_at || s.signedAt || new Date().toISOString(),
        mine: true,
      };
    }
  }

  // 12. Plan Changes (server-only diff — graceful empty fallback; flagged at Phase 6 gate)
  if (/^\/api\/plan-changes\/\d+$/.test(path) && method === 'GET') {
    try {
      return await rawFetchJson(`${path}${qs}`, opts);
    } catch (err) {
      if (err?.status === 404) return { changes: [], sections: [] };
      throw err;
    }
  }

  // Default: forward directly to unified backend with Bearer token + X-LPMS-Role
  return rawFetchJson(`${path}${qs}`, opts);
}

export function fetchJson(endpoint, opts = {}) {
  const method = String(opts.method || 'GET').toUpperCase();
  if (method !== 'GET' || opts.body || opts.signal) return adaptedRequest(endpoint, opts);
  let pending = inFlight.get(endpoint);
  if (!pending) {
    pending = adaptedRequest(endpoint, opts).finally(() => inFlight.delete(endpoint));
    inFlight.set(endpoint, pending);
  }
  return pending.then((data) => (data !== null && typeof data === 'object' ? structuredClone(data) : data));
}

const BY_STATUS = {
  0: 'The server could not be reached. Check your connection and try again.',
  401: 'Your session ended. Sign in again to continue.',
  403: 'You do not have access to this.',
  404: 'This could not be found. It may have been moved or deleted.',
  408: 'The server took too long to answer. Try again.',
  413: 'That file is too large.',
  429: 'Too many tries in a row. Wait a moment, then try again.',
};
const SERVER_TROUBLE = 'Something went wrong on our side. Try again in a moment.';
const TECHNICAL = /sqlite|sequelize|constraint|syntaxerror|typeerror|referenceerror|undefined|stack|\bat \w+ \(|<\/?[a-z]|econn|enoent|errno|exception|http \d{3}|[{}]/i;

export function friendlyText(status, text = '') {
  if (status >= 400 && status < 500) {
    let said = '';
    try {
      const body = JSON.parse(text);
      said = typeof body === 'string' ? body : (body?.message || body?.error || '');
    } catch { /* not JSON */ }
    if (typeof said === 'string' && said && said.length <= 300 && !TECHNICAL.test(said)) return said;
  }
  return BY_STATUS[status] || (status >= 400 && status < 500 ? 'That request could not be completed. Check what you entered and try again.' : SERVER_TROUBLE);
}

function friendlyError(status, text, cause) {
  const err = new Error(friendlyText(status, text));
  err.status = status;
  err.detail = text || cause?.message || '';
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) console.warn(`[api] ${status || 'network'}:`, err.detail);
  return err;
}

export function apiErrorMessage(err, fallback = SERVER_TROUBLE) {
  if (err && 'detail' in err) return err.message;
  const raw = String(err?.message || '');
  const http = raw.match(/^HTTP (\d{3})(?::\s*([\s\S]*))?$/);
  if (http) return friendlyText(Number(http[1]), http[2] || '');
  if (err?.name === 'TypeError' && /fetch|network/i.test(raw)) return BY_STATUS[0];
  return raw && raw.length <= 300 && !TECHNICAL.test(raw) ? raw : fallback;
}
