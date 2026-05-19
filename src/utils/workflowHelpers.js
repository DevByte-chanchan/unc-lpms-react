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
  currentStage: 'submitted', // submitted -> parallel_review -> program_head -> dean -> approved
  parallelReview: {
    library_director: { status: 'pending', completedAt: null },
    industry_consultant: { status: 'pending', completedAt: null }
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
  const bothParallelDone = (wf.parallelReview && wf.parallelReview.library_director?.status === 'done' && wf.parallelReview.industry_consultant?.status === 'done')
  if (bothParallelDone && wf.currentStage !== 'program_head') {
    wf.currentStage = 'program_head'
  }

  if (wf.programHead?.status === 'done' && wf.currentStage !== 'dean') {
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
 * Only seeds if not already seeded (checked via a flag).
 */
export function seedDemoWorkflows() {
  const SEED_FLAG = 'lpsm_workflow_seeded_v3'
  if (localStorage.getItem(SEED_FLAG)) return // already seeded

  // Clear any old seed data
  localStorage.removeItem('lpsm_workflow_seeded_v2')
  localStorage.removeItem('lpsm_workflow_seeded_v1')

  const now = new Date()
  const d = (days) => new Date(now.getTime() - days * 86400000).toISOString()

  // All workflows start fresh — no approved, no returned
  const seeds = {
    // Dean review stage (both parallel & program head done)
    'BSCS322L': {
      courseCode: 'BSCS322L', currentStage: 'dean',
      submittedAt: d(20),
      parallelReview: { library_director: { status: 'done', completedAt: d(16) }, industry_consultant: { status: 'done', completedAt: d(15) } },
      programHead: { status: 'done', completedAt: d(10) },
      dean: { status: 'pending', completedAt: null }
    },
    // Program Head review stage
    'BSCS313L': {
      courseCode: 'BSCS313L', currentStage: 'program_head',
      submittedAt: d(18),
      parallelReview: { library_director: { status: 'done', completedAt: d(14) }, industry_consultant: { status: 'done', completedAt: d(13) } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    // Program Head review
    'BSCS331L': {
      courseCode: 'BSCS331L', currentStage: 'program_head',
      submittedAt: d(16),
      parallelReview: { library_director: { status: 'done', completedAt: d(12) }, industry_consultant: { status: 'done', completedAt: d(11) } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    // Parallel review - one reviewer done, one pending
    'BSCS351L': {
      courseCode: 'BSCS351L', currentStage: 'parallel_review',
      submittedAt: d(12),
      parallelReview: { library_director: { status: 'done', completedAt: d(8) }, industry_consultant: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    // Parallel review - one reviewer done, one pending
    'BSCS214L': {
      courseCode: 'BSCS214L', currentStage: 'parallel_review',
      submittedAt: d(10),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'done', completedAt: d(6) } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    // Parallel review - both pending
    'IT 312': {
      courseCode: 'IT 312', currentStage: 'parallel_review',
      submittedAt: d(7),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    // Submitted (draft) - newly submitted
    'BSCS411L': {
      courseCode: 'BSCS411L', currentStage: 'submitted',
      submittedAt: d(3),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    // Submitted (draft)
    'BSCS314L': {
      courseCode: 'BSCS314L', currentStage: 'submitted',
      submittedAt: d(2),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    // New courses — seeded into various stages for richness
    'BSCS221L': {
      courseCode: 'BSCS221L', currentStage: 'parallel_review',
      submittedAt: d(9),
      parallelReview: { library_director: { status: 'done', completedAt: d(5) }, industry_consultant: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    'BSCS223L': {
      courseCode: 'BSCS223L', currentStage: 'parallel_review',
      submittedAt: d(6),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    'BSCS224L': {
      courseCode: 'BSCS224L', currentStage: 'submitted',
      submittedAt: d(1),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    'BSCS412L': {
      courseCode: 'BSCS412L', currentStage: 'submitted',
      submittedAt: d(1),
      parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null } },
      programHead: { status: 'pending', completedAt: null },
      dean: { status: 'pending', completedAt: null }
    },
    // IT 211, BSCS121, IT 321, IT 311, IT 322, IT 323, BSCS421L stay as defaults (submitted/draft)
  }

  const all = _readAll()
  Object.entries(seeds).forEach(([code, wf]) => {
    all[code] = wf  // overwrite in case old data exists
  })
  _writeAll(all)
  localStorage.setItem(SEED_FLAG, '1')
}
