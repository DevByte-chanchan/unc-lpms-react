import React from 'react'
import styles from './WorkflowStepper.module.scss'
import { getWorkflow } from '../../utils/workflowHelpers'

const REVIEWER_NAMES = {
  submitted: 'Danny Casimero',
  library_director: 'Maria Santos',
  industry_consultant: 'Roberto Cruz',
  program_head: 'Junar Danila',
  dean: 'Agnes Reyes'
}

const Step = ({ label, status, time, reviewer, isSub = false }) => {
  if (status === 'inactive') return null
  return (
    <div className={`${styles.step} ${isSub ? styles.subStep : ''}`} data-status={status}>
      <div className={styles.iconWrap}>
        {status === 'done' ? <div className={styles.dotDone}>✔</div>
          : status === 'in-progress' ? <div className={styles.dotActive}><div className={styles.pulse} /></div>
          : status === 'pending' ? <div className={styles.dotPending} />
          : null}
      </div>
      <div className={styles.meta}>
        <div className={styles.label}>{label}</div>
        {reviewer && <div className={styles.reviewer}>{reviewer}</div>}
        {time ? <div className={styles.time}>{new Date(time).toLocaleString()}</div> : null}
        {status === 'in-progress' && <div className={styles.statusTag}>In Progress</div>}
      </div>
    </div>
  )
}

const WorkflowStepper = ({ courseCode = '', workflow = null }) => {
  const wf = workflow || (courseCode ? getWorkflow(courseCode) : null) || {}
  const stage = wf.currentStage || 'submitted'

  const getStatusFor = (stepKey) => {
    if (stage === 'approved') return 'done'
    if (stepKey === 'submitted') {
      if (stage === 'submitted') return 'in-progress'
      return 'done'
    }
    if (stepKey === 'parallel_review') {
      if (stage === 'parallel_review' || stage === 'returned') return 'in-progress'
      if (stage === 'submitted') return 'pending'
      return 'done'
    }
    if (stepKey === 'library_director') {
      const s = wf.parallelReview?.library_director?.status
      if (s === 'done') return 'done'
      if (s === 'returned') return 'in-progress'
      if (stage === 'parallel_review') return 'in-progress'
      if (stage === 'returned') return s === 'pending' ? 'pending' : 'inactive'
      if (stage === 'submitted') return 'pending'
      return 'inactive'
    }
    if (stepKey === 'industry_consultant') {
      const s = wf.parallelReview?.industry_consultant?.status
      if (s === 'done') return 'done'
      if (s === 'returned') return 'in-progress'
      if (stage === 'parallel_review') return 'in-progress'
      if (stage === 'returned') return s === 'pending' ? 'pending' : 'inactive'
      if (stage === 'submitted') return 'pending'
      return 'inactive'
    }
    if (stepKey === 'program_head') {
      if (stage === 'program_head') return 'in-progress'
      if (stage === 'dean' || stage === 'approved') return 'done'
      if (stage === 'returned') return wf.programHead?.status === 'returned' ? 'in-progress' : 'pending'
      return 'pending'
    }
    if (stepKey === 'dean') {
      if (stage === 'dean') return 'in-progress'
      if (stage === 'approved') return 'done'
      if (stage === 'returned') return wf.dean?.status === 'returned' ? 'in-progress' : 'pending'
      return 'pending'
    }
    return 'inactive'
  }

  const submittedAt = wf.submittedAt || null
  const libDone = wf.parallelReview?.library_director?.completedAt || null
  const icDone = wf.parallelReview?.industry_consultant?.completedAt || null
  const phDone = wf.programHead?.completedAt || null
  const deanDone = wf.dean?.completedAt || null

  return (
    <div className={styles.stepper}>
      {/* Step 1: Submitted */}
      <Step label="Draft" status={getStatusFor('submitted')} time={submittedAt} reviewer={REVIEWER_NAMES.submitted} />
      <div className={`${styles.connector} ${getStatusFor('submitted') === 'done' ? styles.connectorDone : ''}`} />

      {/* Step 2: Parallel Review */}
      <div className={styles.parallelGroup}>
        <div className={styles.parallelLabel}>Parallel Review</div>
        <div className={styles.parallelSteps}>
          <Step label="Director of Libraries" status={getStatusFor('library_director')} time={libDone} reviewer={REVIEWER_NAMES.library_director} isSub />
          <Step label="Industry Consultant" status={getStatusFor('industry_consultant')} time={icDone} reviewer={REVIEWER_NAMES.industry_consultant} isSub />
        </div>
      </div>
      <div className={`${styles.connector} ${getStatusFor('parallel_review') === 'done' ? styles.connectorDone : ''}`} />

      {/* Step 3: Program Head */}
      <Step label="Program Head" status={getStatusFor('program_head')} time={phDone} reviewer={REVIEWER_NAMES.program_head} />
      <div className={`${styles.connector} ${getStatusFor('program_head') === 'done' ? styles.connectorDone : ''}`} />

      {/* Step 4: Dean */}
      <Step label="Dean" status={getStatusFor('dean')} time={deanDone} reviewer={REVIEWER_NAMES.dean} />

      {/* Approved badge */}
      {stage === 'approved' && (
        <>
          <div className={`${styles.connector} ${styles.connectorDone}`} />
          <div className={styles.approvedBadge}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            APPROVED
          </div>
        </>
      )}
    </div>
  )
}

export default WorkflowStepper
