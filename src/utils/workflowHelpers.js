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

  // 1. Submitted → parallel_review when any parallel reviewer acts
  const anyParallelStarted = (wf.parallelReview && (wf.parallelReview.library_director?.status === 'done' || wf.parallelReview.industry_consultant?.status === 'done'))
  if (anyParallelStarted && wf.currentStage === 'submitted') {
    wf.currentStage = 'parallel_review'
  }

  // 2. All parallel review done → dean
  const allParallelDone = (wf.parallelReview && wf.parallelReview.library_director?.status === 'done' && wf.parallelReview.industry_consultant?.status === 'done' && wf.parallelReview.program_head?.status === 'done')
  if (allParallelDone && wf.currentStage !== 'dean') {
    wf.currentStage = 'dean'
  }

  // 3. Dean done → approved
  if (wf.dean?.status === 'done' && wf.currentStage !== 'approved') {
    wf.currentStage = 'approved'
  }

  all[courseCode] = wf
  _writeAll(all)
  return wf
}

export const resetWorkflowStage = (courseCode, newStage) => {
  if (!courseCode) return null
  const all = _readAll()
  const wf = all[courseCode]
  if (!wf) return null
  wf.currentStage = newStage
  _writeAll(all)
  return wf
}

export default {
  WORKFLOW_KEY,
  getWorkflow,
  setWorkflow,
  advanceWorkflow,
  resetWorkflowStage,
  seedDemoWorkflows
}

/**
 * Pre-populate diverse workflow states so tables show meaningful data.
 * Seeds missing entries when version changes. Always ensures approved/returned
 * demo entries exist so VPAA and approval tables have data.
 */
export function seedDemoWorkflows() {
  const SEED_FLAG = 'lpsm_workflow_seeded_v5'
  const hasSeeded = localStorage.getItem(SEED_FLAG)

  const now = new Date()
  const d = (days) => new Date(now.getTime() - days * 86400000).toISOString()

  const allEntries = [
    { code: 'BIT201', data: {
      courseCode: 'BIT201', currentStage: 'submitted',
      submittedAt: d(2),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS511', data: {
      courseCode: 'BSCS511', currentStage: 'dean',
      submittedAt: d(14),
      parallelReview: { library_director: { status: 'done', completedAt: d(10) }, industry_consultant: { status: 'done', completedAt: d(9) }, program_head: { status: 'done', completedAt: d(8) } },
      programHead: { status: 'done', completedAt: d(8) },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'BSCS515', data: {
      courseCode: 'BSCS515', currentStage: 'parallel_review',
      submittedAt: d(7),
      parallelReview: { library_director: { status: 'done', completedAt: d(3) }, industry_consultant: { status: 'pending', completedAt: null }, program_head: { status: 'done', completedAt: d(4) } },
      programHead: { status: 'done', completedAt: d(4) },
      dean: { status: 'pending', completedAt: null }
    }},
    { code: 'IT 411', data: {
      courseCode: 'IT 411', currentStage: 'approved',
      submittedAt: d(22),
      parallelReview: { library_director: { status: 'done', completedAt: d(18) }, industry_consultant: { status: 'done', completedAt: d(17) }, program_head: { status: 'done', completedAt: d(16) } },
      programHead: { status: 'done', completedAt: d(16) },
      dean: { status: 'done', completedAt: d(6) },
      vpaa: { status: 'done', completedAt: d(2) }
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
