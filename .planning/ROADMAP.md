# Roadmap — Approver Workflow Bug Fixes

## Phase 1: StatusTracker & Workflow Fix (3-4 days)

**Goal:** Fix the StatusTracker to accurately reflect the multi-stage approval workflow.

**Tasks:**
- [ ] Rewrite StatusTracker to show 5 stages: Draft → Parallel Review (IC & DoL) → Program Head → Dean → Approved
- [ ] Add proper `currentStage` rendering (not just `status`)
- [ ] Handle returned state visually (which stage returned it)
- [ ] Extract `StatusTracker` into a proper sub-component structure
- [ ] Fix stage order numbering (remove gap at order 3)

**Files affected:**
- `src/pages/lpsm/Shared/StatusTracker.jsx`
- `src/styles/StatusTracker.module.scss`

## Phase 2: ApprovalPanel & ReviewPanel Overhaul (3-4 days)

**Goal:** Fix the Program Head / Dean approval panels and add approve/return to review panels.

**Tasks:**
- [ ] Differentiate Dean vs Program Head ApprovalPanel (fix "Relay Comments" label)
- [ ] Fix hardcoded userId fallbacks
- [ ] Replace `alert()` with toast notifications (shared `Toast` component)
- [ ] Add approve/return actions to ReviewPanel (Director of Libraries, Industry Consultant)
- [ ] Add decision dropdown to ReviewPanel
- [ ] After approval, show confirmation + next steps instead of silently removing from list

**Files affected:**
- `src/pages/lpsm/Dean/ApprovalPanel.jsx`
- `src/pages/lpsm/ProgramHead/ApprovalPanel.jsx`
- `src/pages/lpsm/DirectorOfLibraries/ReviewPanel.jsx`
- `src/pages/lpsm/IndustryConsultant/ReviewPanel.jsx`
- `src/styles/ApprovalPanel.module.scss`
- `src/styles/ReviewPanel.module.scss`

## Phase 3: OIC/OVPAA Dashboard Fixes (3-4 days)

**Goal:** Fix localStorage workflow, filter bug, refresh loop, and extract large file.

**Tasks:**
- [ ] Migrate OIC workflow from localStorage to API (`approveOrReturn` endpoint)
- [ ] Remove 3-second `setInterval` — replace with manual refresh + event-based updates
- [ ] Fix syllabi status filter (both branches return same data)
- [ ] Remove hardcoded instructor name normalization ("CASIMERO, DANNY")
- [ ] Extract dean dashboard sub-components (stats cards, tables, action buttons)
- [ ] Keep file under 500 lines

**Files affected:**
- `src/pages/lpsm/OICOvpaa/OICOVPAADashboard.jsx`
- `src/styles/OICOVPAADashboard.module.scss`
- `src/services/learningPlanService.js`
- `backend/lpsm/src/controllers/learningPlanController.js`

## Phase 4: Service Layer & Backend Polish (2-3 days)

**Goal:** Clean up service layer and backend.

**Tasks:**
- [ ] Make API URL configurable via env var (`VITE_LPSM_API_URL`)
- [ ] Remove `getApprovedLearningPlans` wrapper (use `getLearningPlans` with filter)
- [ ] Review and fix submitReview/approveOrReturn backend logic for reviewer roles
- [ ] Add validation for proper authorization (reviewer must match stage)
- [ ] Add toasts/notifications at the API level

**Files affected:**
- `src/services/learningPlanService.js`
- `backend/lpsm/src/controllers/learningPlanController.js`

## Testing & Verification (1 day)

**Tasks:**
- [ ] Test full workflow: Draft → Submit → Industry Consultant Review → DoL Review → Program Head Approve → Dean Approve → OIC Approve
- [ ] Test return flow at each stage
- [ ] Test edge cases: empty plans, missing docs, rejected submissions
- [ ] Verify toast notifications work across all panels
- [ ] Verify StatusTracker shows correct stage at each point
