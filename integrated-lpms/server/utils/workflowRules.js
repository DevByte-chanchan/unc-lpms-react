'use strict';

/**
 * Unified Approval & Review State Machine (M2 Composition + M3 Submissions Management)
 *
 * Stages:
 *   - 'draft'             : Assigned, not yet submitted (or working copy before first submit)
 *   - 'parallel_review'   : Submitted by Instructor -> Library Director & Program Head review simultaneously
 *   - 'returned'          : Returned by LD or PH, OR forwarded by PH after Dean return (Instructor edits & resolves comments)
 *   - 'with_program_head' : Returned by Dean -> Program Head triages (FORWARDED to Instructor OR COUNTERED back to Dean)
 *   - 'dean_review'       : Both Library Director AND Program Head ACCEPTED -> awaiting Dean final decision
 *   - 'approved'          : Dean ACCEPTED (or offering.approved_at set) -> locked, Consultant Suggest & Sign enabled
 */

function sortLogsChronologically(logs = []) {
  return [...logs].sort((a, b) => {
    const ta = new Date(a.createdAt || a.created_at || 0).getTime();
    const tb = new Date(b.createdAt || b.created_at || 0).getTime();
    if (ta !== tb) return ta - tb;
    return Number(a.log_id || 0) - Number(b.log_id || 0);
  });
}

function normalizeAction(action) {
  const up = String(action || '').trim().toUpperCase();
  if (up === 'APPROVED' || up === 'APPROVE' || up === 'ACCEPT') return 'ACCEPTED';
  if (up === 'RETURN' || up === 'REJECT' || up === 'REJECTED') return 'RETURNED';
  if (up === 'FORWARD') return 'FORWARDED';
  if (up === 'COUNTER') return 'COUNTERED';
  if (up === 'SUBMIT') return 'SUBMITTED';
  return up;
}

function computeWorkflowState(rawLogs = [], offering = null) {
  const logs = sortLogsChronologically(rawLogs).filter(
    (l) => String(l.actor_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT' && normalizeAction(l.action_type) !== 'SUGGEST'
  );

  // Determine the latest submission boundary
  let lastSubmitIdx = -1;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (normalizeAction(logs[i].action_type) === 'SUBMITTED') {
      lastSubmitIdx = i;
      break;
    }
  }

  // Check if Dean has approved at any point after the latest submit (or offering.approved_at is set)
  const postSubmitLogs = lastSubmitIdx >= 0 ? logs.slice(lastSubmitIdx + 1) : [];

  let libraryStatus = 'Pending';
  let programHeadStatus = 'Pending';
  let deanStatus = 'Pending';
  let stage = 'draft';
  let returnedBy = null;
  let counterNote = null;
  let approvedAt = offering?.approved_at || null;
  let lastSubmittedAt = lastSubmitIdx >= 0 ? (logs[lastSubmitIdx].createdAt || logs[lastSubmitIdx].created_at || null) : null;

  if (lastSubmitIdx === -1) {
    if (offering?.approved_at) {
      return {
        stage: 'approved',
        overallStatus: 'Approved',
        compositionStatus: 'Approved',
        libraryStatus: 'Approved',
        programHeadStatus: 'Approved',
        deanStatus: 'Approved',
        canExport: true,
        exportWatermarked: false,
        returnedBy: null,
        counterNote: null,
        approvedAt,
        lastSubmittedAt: null,
      };
    }
    return {
      stage: 'draft',
      overallStatus: 'Draft',
      compositionStatus: 'Draft',
      libraryStatus: 'Pending',
      programHeadStatus: 'Pending',
      deanStatus: 'Pending',
      canExport: false,
      exportWatermarked: false,
      returnedBy: null,
      counterNote: null,
      approvedAt: null,
      lastSubmittedAt: null,
    };
  }

  // Replay logs strictly after the latest SUBMITTED event
  stage = 'parallel_review';
  for (const log of postSubmitLogs) {
    const role = String(log.actor_role || '').toUpperCase();
    const action = normalizeAction(log.action_type);

    if (role === 'LIBRARY_DIRECTOR') {
      if (action === 'ACCEPTED') {
        libraryStatus = 'Approved';
      } else if (action === 'RETURNED') {
        libraryStatus = 'Returned';
        stage = 'returned';
        returnedBy = 'LIBRARY_DIRECTOR';
      }
    } else if (role === 'PROGRAM_HEAD') {
      if (action === 'ACCEPTED') {
        programHeadStatus = 'Approved';
      } else if (action === 'RETURNED') {
        programHeadStatus = 'Returned';
        stage = 'returned';
        returnedBy = 'PROGRAM_HEAD';
      } else if (action === 'FORWARDED') {
        programHeadStatus = 'Returned';
        stage = 'returned';
        returnedBy = 'PROGRAM_HEAD';
      } else if (action === 'COUNTERED') {
        counterNote = log.note || null;
        deanStatus = 'Pending';
        stage = 'dean_review';
      }
    } else if (role === 'DEAN') {
      if (action === 'ACCEPTED') {
        deanStatus = 'Approved';
        libraryStatus = 'Approved';
        programHeadStatus = 'Approved';
        stage = 'approved';
        approvedAt = approvedAt || log.createdAt || log.created_at || new Date();
      } else if (action === 'RETURNED') {
        deanStatus = 'Returned';
        stage = 'with_program_head';
        returnedBy = 'DEAN';
      }
    }

    // Advance from parallel_review to dean_review once BOTH LD and PH have ACCEPTED
    if (stage === 'parallel_review' && libraryStatus === 'Approved' && programHeadStatus === 'Approved') {
      stage = 'dean_review';
    }
  }

  // If offering.approved_at is explicitly stamped, force approved
  if (offering?.approved_at && stage !== 'approved') {
    stage = 'approved';
    libraryStatus = 'Approved';
    programHeadStatus = 'Approved';
    deanStatus = 'Approved';
  }

  // Composition UI maps stages to the 4 clean Instructor tabs: Draft | Pending | Returned | Approved
  let compositionStatus = 'Pending';
  if (stage === 'draft') compositionStatus = 'Draft';
  else if (stage === 'returned') compositionStatus = 'Returned';
  else if (stage === 'approved') compositionStatus = 'Approved';
  else compositionStatus = 'Pending'; // parallel_review, dean_review, with_program_head (hides unforwarded Dean return)

  const bothParallelApproved = libraryStatus === 'Approved' && programHeadStatus === 'Approved';

  return {
    stage,
    overallStatus: compositionStatus,
    compositionStatus,
    libraryStatus,
    programHeadStatus,
    deanStatus,
    canExport: stage === 'approved' || stage === 'dean_review' || bothParallelApproved,
    exportWatermarked: stage !== 'approved' && (stage === 'dean_review' || bothParallelApproved),
    returnedBy,
    counterNote,
    approvedAt,
    lastSubmittedAt,
  };
}

function validateWorkflowTransition({ stage, actorWorkflowRole, actionType, note }) {
  const role = String(actorWorkflowRole || '').toUpperCase();
  const action = normalizeAction(actionType);

  if (role === 'INDUSTRY_CONSULTANT') {
    return { ok: false, error: 'Industry Consultants provide suggestions and sign-offs only; they cannot approve or return.' };
  }

  if (stage === 'approved') {
    return { ok: false, error: 'This learning plan is already approved and locked.' };
  }

  if (role === 'INSTRUCTOR') {
    if (action === 'SUBMITTED' && (stage === 'draft' || stage === 'returned')) {
      return { ok: true, normalizedAction: 'SUBMITTED' };
    }
    return { ok: false, error: `Instructor cannot perform '${action}' during '${stage}' stage.` };
  }

  if (role === 'LIBRARY_DIRECTOR') {
    if (stage !== 'parallel_review') {
      return { ok: false, error: `Director of Libraries cannot act during '${stage}' stage.` };
    }
    if (!['ACCEPTED', 'RETURNED'].includes(action)) {
      return { ok: false, error: `Invalid Library Director action: ${action}` };
    }
    return { ok: true, normalizedAction: action };
  }

  if (role === 'PROGRAM_HEAD') {
    if (stage === 'parallel_review') {
      if (!['ACCEPTED', 'RETURNED'].includes(action)) {
        return { ok: false, error: `Invalid Program Head action during review: ${action}` };
      }
      return { ok: true, normalizedAction: action };
    }
    if (stage === 'with_program_head') {
      if (action === 'FORWARDED' || action === 'RETURNED') {
        return { ok: true, normalizedAction: 'FORWARDED' };
      }
      if (action === 'COUNTERED') {
        if (!note || String(note).trim().length < 5) {
          return { ok: false, error: 'Sending a returned plan back to the Dean requires a reason (at least 5 characters).' };
        }
        return { ok: true, normalizedAction: 'COUNTERED' };
      }
      return { ok: false, error: 'During Dean return triage, Program Head must either Forward to Instructor or Send Back to Dean.' };
    }
    return { ok: false, error: `Program Head cannot act during '${stage}' stage.` };
  }

  if (role === 'DEAN') {
    if (stage !== 'dean_review') {
      return { ok: false, error: `Dean can only review after both Director of Libraries and Program Head approve (current stage: '${stage}').` };
    }
    if (!['ACCEPTED', 'RETURNED'].includes(action)) {
      return { ok: false, error: `Invalid Dean action: ${action}` };
    }
    return { ok: true, normalizedAction: action };
  }

  return { ok: false, error: `Role '${role}' is not permitted to perform workflow actions.` };
}

module.exports = {
  sortLogsChronologically,
  normalizeAction,
  computeWorkflowState,
  validateWorkflowTransition,
};
