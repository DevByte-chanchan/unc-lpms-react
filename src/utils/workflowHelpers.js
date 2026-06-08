const WORKFLOW_KEY = 'lpsm_workflow_v1'

const _readAll = () => {
  try {
    const raw = localStorage.getItem(WORKFLOW_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    return {}
  }
}

const _writeAll = (obj) => {
  try {
    localStorage.setItem(WORKFLOW_KEY, JSON.stringify(obj))
  } catch (e) {
    console.error('Failed to persist workflow state', e)
  }
}

const defaultWorkflow = (courseCode = '') => ({
  courseCode,
  currentStage: 'submitted', // submitted -> parallel_review -> dean -> approved
  parallelReview: {
    library_director: { status: 'pending', completedAt: null },
    industry_consultant: { status: 'pending', completedAt: null },
    program_head: { status: 'pending', completedAt: null }
  },
  programHead: { status: 'pending', completedAt: null },
  dean: { status: 'pending', completedAt: null }
})

export const getWorkflow = (courseCode = '') => {
  const all = _readAll()
  if (!courseCode) return defaultWorkflow('')
  return all[courseCode] || defaultWorkflow(courseCode)
}

export const setWorkflow = (courseCode = '', wf = null) => {
  if (!courseCode || !wf) return
  const all = _readAll()
  all[courseCode] = wf
  _writeAll(all)
}

export const advanceWorkflow = (courseCode = '') => {
  if (!courseCode) return null
  const all = _readAll()
  const wf = all[courseCode] || defaultWorkflow(courseCode)

  if (wf.currentStage === 'returned') return wf;

  // If currently submitted, move to parallel_review when instructor has submitted (external action)
  // But main advancement checks for completion of parallel reviewers
  const allParallelDone = (wf.parallelReview && wf.parallelReview.library_director?.status === 'done' && wf.parallelReview.industry_consultant?.status === 'done' && wf.parallelReview.program_head?.status === 'done')
  if (allParallelDone && wf.currentStage !== 'dean') {
    wf.currentStage = 'dean'
  }

  if (wf.dean?.status === 'done' && wf.currentStage !== 'approved') {
    wf.currentStage = 'approved'
  }

  // If any parallel reviewer has started (one marked done) and stage still 'submitted', set to 'parallel_review'
  const anyParallelStarted = (wf.parallelReview && (wf.parallelReview.library_director?.status === 'done' || wf.parallelReview.industry_consultant?.status === 'done'))
  if (anyParallelStarted && wf.currentStage === 'submitted') {
    wf.currentStage = 'parallel_review'
  }

  all[courseCode] = wf
  _writeAll(all)
  return wf
}

export default {
  WORKFLOW_KEY,
  getWorkflow,
  setWorkflow,
  advanceWorkflow,
  seedDemoWorkflows
}

/**
 * Pre-populate diverse workflow states so tables show meaningful data.
 * Seeds missing entries when version changes. Always ensures approved/returned
 * demo entries exist so OIC-OVPAA and approval tables have data.
 */
export function seedDemoWorkflows() {
  const SEED_FLAG = 'lpsm_workflow_seeded_v4'
  const hasSeeded = localStorage.getItem(SEED_FLAG)

  const now = new Date()
  const d = (days) => new Date(now.getTime() - days * 86400000).toISOString()

  // All workflows — new ones are always added if missing
  const allEntries = [
    // Dean review stage (all parallel done)
    { code: 'BSCS322L', data: {
      courseCode: 'BSCS322L', currentStage: 'dean',
      submittedAt: d(20),
      parallelReview: { library_director: { status: 'done', completedAt: d(16) }, industry_consultant: { status: 'done', completedAt: d(15) }, program_head: { status: 'done', completedAt: d(14) } },
      programHead: { status: 'done', completedAt: d(14) },
      dean: { status: 'pending', completedAt: null }
    }},
    // Parallel review - all three done, moving to dean
    { code: 'BSCS313L', data: {
      courseCode: 'BSCS313L', currentStage: 'parallel_review',
      submittedAt: d(18),
      parallelReview: { library_director: { status: 'done', completedAt: d(14) }, industry_consultant: { status: 'done', completedAt: d(13) }, program_head: { status: 'done', completedAt: d(12) } },
      programHead: { status: 'done', completedAt: d(12) },
      dean: { status: 'pending', completedAt: null }
    }},
    // Parallel review - all three done, moving to dean
    { code: 'BSCS331L', data: {
      courseCode: 'BSCS331L', currentStage: 'parallel_review',
      submittedAt: d(16),
      parallelReview: { library_director: { status: 'done', completedAt: d(12) }, industry_consultant: { status: 'done', completedAt: d(11) }, program_head: { status: 'done', completedAt: d(10) } },
      programHead: { status: 'done', completedAt: d(10) },
      dean: { status: 'pending', completedAt: null }
    }},
    // Parallel review - two done, one pending
    { code: 'BSCS351L', data: {
      courseCode: 'BSCS351L', currentStage: 'parallel_review',
      submittedAt: d(12),
      parallelReview: { library_director: { status: 'done', completedAt: d(8) }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'done', completedAt: d(9) } },
      programHead: { status: 'done', completedAt: d(9) },
      dean: { status: 'pending', completedAt: null }
    }},
    // Parallel review - one reviewer done
    { code: 'BSCS214L', data: {
      courseCode: 'BSCS214L', currentStage: 'parallel_review',
      submittedAt: d(10),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'done', completedAt: d(6) }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    // Parallel review - all pending
    { code: 'IT 312', data: {
      courseCode: 'IT 312', currentStage: 'parallel_review',
      submittedAt: d(7),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    // Submitted (draft) - newly submitted
    { code: 'BSCS411L', data: {
      courseCode: 'BSCS411L', currentStage: 'submitted',
      submittedAt: d(3),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    // Submitted (draft)
    { code: 'BSCS314L', data: {
      courseCode: 'BSCS314L', currentStage: 'submitted',
      submittedAt: d(2),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    // Approved syllabus (always added if missing)
    { code: 'BSCS121', data: {
      courseCode: 'BSCS121', currentStage: 'approved',
      submittedAt: d(30),
      parallelReview: { library_director: { status: 'done', completedAt: d(26) }, industry_consultant: { status: 'done', completedAt: d(25) }, program_head: { status: 'done', completedAt: d(24) } },
      programHead: { status: 'done', completedAt: d(24) },
      dean: { status: 'done', completedAt: d(15) },
      oicOvpaa: { status: 'done', completedAt: d(12) }
    }},
    { code: 'IT 211', data: {
      courseCode: 'IT 211', currentStage: 'approved',
      submittedAt: d(28),
      parallelReview: { library_director: { status: 'done', completedAt: d(24) }, industry_consultant: { status: 'done', completedAt: d(23) }, program_head: { status: 'done', completedAt: d(22) } },
      programHead: { status: 'done', completedAt: d(22) },
      dean: { status: 'done', completedAt: d(13) },
      oicOvpaa: { status: 'done', completedAt: d(10) }
    }},
    // Returned syllabus
    { code: 'IT 321', data: {
      courseCode: 'IT 321', currentStage: 'returned',
      submittedAt: d(14),
      parallelReview: { library_director: { status: 'done', completedAt: d(10) }, industry_consultant: { status: 'done', completedAt: d(9) }, program_head: { status: 'returned', completedAt: d(7) } },
      programHead: { status: 'returned', completedAt: d(7) },
      dean: { status: 'pending', completedAt: null },
      oicOvpaa: { status: 'pending', completedAt: null }
    }},
    { code: 'IT 311', data: {
      courseCode: 'IT 311', currentStage: 'approved',
      submittedAt: d(25),
      parallelReview: { library_director: { status: 'done', completedAt: d(21) }, industry_consultant: { status: 'done', completedAt: d(20) }, program_head: { status: 'done', completedAt: d(19) } },
      programHead: { status: 'done', completedAt: d(19) },
      dean: { status: 'done', completedAt: d(10) },
      oicOvpaa: { status: 'done', completedAt: d(8) }
    }},
    // New courses — seeded into various stages for richness
    { code: 'BSCS221L', data: {
      courseCode: 'BSCS221L', currentStage: 'parallel_review',
      submittedAt: d(9),
      parallelReview: { library_director: { status: 'done', completedAt: d(5) }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'done', completedAt: d(6) } },
      programHead: { status: 'done', completedAt: d(6) },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS223L', data: {
      courseCode: 'BSCS223L', currentStage: 'parallel_review',
      submittedAt: d(6),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS224L', data: {
      courseCode: 'BSCS224L', currentStage: 'submitted',
      submittedAt: d(1),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS412L', data: {
      courseCode: 'BSCS412L', currentStage: 'submitted',
      submittedAt: d(1),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    // --- More approved syllabi ---
    { code: 'BSCS101', data: {
      courseCode: 'BSCS101', currentStage: 'approved',
      submittedAt: d(40),
      parallelReview: { library_director: { status: 'done', completedAt: d(36) }, industry_consultant: { status: 'done', completedAt: d(35) }, program_head: { status: 'done', completedAt: d(34) } },
      programHead: { status: 'done', completedAt: d(34) },
      dean: { status: 'done', completedAt: d(25) },
      oicOvpaa: { status: 'done', completedAt: d(20) }
    }},
    { code: 'BSCS102', data: {
      courseCode: 'BSCS102', currentStage: 'approved',
      submittedAt: d(35),
      parallelReview: { library_director: { status: 'done', completedAt: d(31) }, industry_consultant: { status: 'done', completedAt: d(30) }, program_head: { status: 'done', completedAt: d(29) } },
      programHead: { status: 'done', completedAt: d(29) },
      dean: { status: 'done', completedAt: d(20) },
      oicOvpaa: { status: 'done', completedAt: d(15) }
    }},
    { code: 'BSCS103', data: {
      courseCode: 'BSCS103', currentStage: 'approved',
      submittedAt: d(32),
      parallelReview: { library_director: { status: 'done', completedAt: d(28) }, industry_consultant: { status: 'done', completedAt: d(27) }, program_head: { status: 'done', completedAt: d(26) } },
      programHead: { status: 'done', completedAt: d(26) },
      dean: { status: 'done', completedAt: d(18) },
      oicOvpaa: { status: 'done', completedAt: d(12) }
    }},
    // --- More returned syllabi ---
    { code: 'BSCS201', data: {
      courseCode: 'BSCS201', currentStage: 'returned',
      submittedAt: d(22),
      parallelReview: { library_director: { status: 'done', completedAt: d(18) }, industry_consultant: { status: 'done', completedAt: d(17) }, program_head: { status: 'returned', completedAt: d(15) } },
      programHead: { status: 'returned', completedAt: d(15) },
      dean: { status: 'pending', completedAt: null },
      oicOvpaa: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS202', data: {
      courseCode: 'BSCS202', currentStage: 'returned',
      submittedAt: d(18),
      parallelReview: { library_director: { status: 'returned', completedAt: d(14) }, industry_consultant: { status: 'done', completedAt: d(13) }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null },
      oicOvpaa: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS203', data: {
      courseCode: 'BSCS203', currentStage: 'returned',
      submittedAt: d(16),
      parallelReview: { library_director: { status: 'done', completedAt: d(12) }, industry_consultant: { status: 'returned', completedAt: d(11) }, program_head: { status: 'done', completedAt: d(10) } },
      programHead: { status: 'done', completedAt: d(10) },
      dean: { status: 'pending', completedAt: null },
      oicOvpaa: { status: 'pending', completedAt: null }
    }},
    // --- More submitted (draft/pending) ---
    { code: 'BSCS301', data: {
      courseCode: 'BSCS301', currentStage: 'submitted',
      submittedAt: d(5),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS302', data: {
      courseCode: 'BSCS302', currentStage: 'submitted',
      submittedAt: d(4),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS303', data: {
      courseCode: 'BSCS303', currentStage: 'submitted',
      submittedAt: d(3),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    // --- More draft (no submittedAt) ---
    { code: 'BSCS401', data: {
      courseCode: 'BSCS401', currentStage: 'submitted',
      submittedAt: null,
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS402', data: {
      courseCode: 'BSCS402', currentStage: 'submitted',
      submittedAt: null,
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS403', data: {
      courseCode: 'BSCS403', currentStage: 'submitted',
      submittedAt: null,
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    // --- More pending (parallel_review, mixed) ---
    { code: 'BSCS404', data: {
      courseCode: 'BSCS404', currentStage: 'parallel_review',
      submittedAt: d(11),
      parallelReview: { library_director: { status: 'done', completedAt: d(7) }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'done', completedAt: d(8) } },
      programHead: { status: 'done', completedAt: d(8) },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS405', data: {
      courseCode: 'BSCS405', currentStage: 'parallel_review',
      submittedAt: d(9),
      parallelReview: { library_director: { status: 'done', completedAt: d(5) }, industry_consultant: { status: 'done', completedAt: d(4) }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS406', data: {
      courseCode: 'BSCS406', currentStage: 'submitted',
      submittedAt: d(7),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    // --- More returned ---
    { code: 'BSCS407', data: {
      courseCode: 'BSCS407', currentStage: 'returned',
      submittedAt: d(20),
      parallelReview: { library_director: { status: 'done', completedAt: d(16) }, industry_consultant: { status: 'done', completedAt: d(15) }, program_head: { status: 'returned', completedAt: d(13) } },
      programHead: { status: 'returned', completedAt: d(13) },
      dean: { status: 'pending', completedAt: null },
      oicOvpaa: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS408', data: {
      courseCode: 'BSCS408', currentStage: 'returned',
      submittedAt: d(17),
      parallelReview: { library_director: { status: 'returned', completedAt: d(13) }, industry_consultant: { status: 'done', completedAt: d(12) }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null },
      oicOvpaa: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS409', data: {
      courseCode: 'BSCS409', currentStage: 'returned',
      submittedAt: d(15),
      parallelReview: { library_director: { status: 'done', completedAt: d(11) }, industry_consultant: { status: 'returned', completedAt: d(10) }, program_head: { status: 'done', completedAt: d(9) } },
      programHead: { status: 'done', completedAt: d(9) },
      dean: { status: 'pending', completedAt: null },
      oicOvpaa: { status: 'pending', completedAt: null }
    }},
    // --- Missed syllabus codes ---
    { code: 'BSCS421L', data: {
      courseCode: 'BSCS421L', currentStage: 'parallel_review',
      submittedAt: d(14),
      parallelReview: { library_director: { status: 'done', completedAt: d(10) }, industry_consultant: { status: 'done', completedAt: d(9) }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'IT 322', data: {
      courseCode: 'IT 322', currentStage: 'submitted',
      submittedAt: d(8),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'IT 323', data: {
      courseCode: 'IT 323', currentStage: 'submitted',
      submittedAt: d(6),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
  ]

  const all = _readAll()
  // Merge mode: add missing entries only, never overwrite existing user data
  allEntries.forEach(({ code, data }) => {
    if (!all[code]) {
      all[code] = data
    }
  })
  _writeAll(all)
  if (!hasSeeded) {
    localStorage.setItem(SEED_FLAG, '1')
  }
}
