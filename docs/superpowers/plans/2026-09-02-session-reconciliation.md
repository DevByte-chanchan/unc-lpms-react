# Server Session Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent a browser identity left in local storage from opening reviewer screens after its server session has expired or disappeared.

**Architecture:** Add an authenticated endpoint that returns the server's current user, then reconcile the browser identity against that endpoint when the React application starts. A seeded, reachable server with a missing session clears the stale browser identity; an unavailable or unconfigured server preserves the existing local demo fallback.

**Tech Stack:** Express 5, React 19, React Router, Node test runner, browser local storage, HttpOnly session cookies

**Spec:** User request in the active Codex task: find remaining defects in the learning-plan submissions module, report them, and fix confirmed issues.

## Global Constraints

- Work only inside `composition/client` and `composition/server` in the active `composition-branch-v2` worktree.
- Preserve the offline demo-account fallback when the backend is unavailable or has no accounts.
- Treat a seeded server's 401/403 response as authoritative and never retain a stale privileged UI identity.
- Send the HttpOnly cookie on every session reconciliation request.
- Do not commit because the target files already contain broad uncommitted user work that must remain separable.

---

### Task 1: Authenticated current-session endpoint

**Files:**
- Modify: `composition/server/routes/auth.js`
- Modify: `composition/server/controllers/authController.js`
- Test: `composition/server/utils/routeSecurity.test.js`

**Interfaces:**
- Consumes: `requireAuth`, which populates `req.user` from the valid HttpOnly session.
- Produces: `GET /api/auth/session`, returning `{ user: { id, name, email, role } }` or the existing 401 authentication error.

- [ ] **Step 1: Write the failing integration test**

Add a request without a cookie that expects 401 and a request with an issued active-session cookie that expects the literal public user object.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test utils/routeSecurity.test.js`

Expected: the authenticated request receives 404 because `/api/auth/session` does not exist yet.

- [ ] **Step 3: Implement the minimal endpoint**

Add a controller that returns `req.user` and register it behind `requireAuth`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test utils/routeSecurity.test.js`

Expected: all route-security tests pass.

### Task 2: Reconcile persisted browser identity at startup

**Files:**
- Modify: `composition/client/src/utils/session.js`
- Modify: `composition/client/src/utils/session.test.js`
- Modify: `composition/client/src/App.jsx`

**Interfaces:**
- Consumes: `GET /api/auth/session`, `GET /api/auth/health`, `getSession()`, and the existing session-change event.
- Produces: `reconcileSession()`, returning `server`, `expired`, `local`, or `none` status and updating local identity only when required.

- [ ] **Step 1: Write failing reconciliation tests**

Cover these literal outcomes: a valid server response refreshes the saved user; a seeded server's 401 clears it; an unreachable server leaves a local demo identity intact.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/utils/session.test.js`

Expected: failure because `reconcileSession` is not implemented.

- [ ] **Step 3: Implement the minimal reconciliation function**

Issue a credentialed GET to `/session`; accept a returned public user; on 401/403 consult the health account count and clear only when it is greater than zero; preserve existing local state for unavailable or unconfigured auth.

- [ ] **Step 4: Gate route rendering until reconciliation finishes**

Have `SessionGate` render its existing loading status while the asynchronous check runs, then route using the reconciled identity.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test src/utils/session.test.js`

Expected: all session tests pass.

### Task 3: Current review-round status details

**Files:**
- Create: `composition/client/src/utils/assignmentStatus.js`
- Create: `composition/client/src/utils/assignmentStatus.test.js`
- Modify: `composition/client/src/components/ApprovalCoursesTable.jsx`
- Modify: `composition/client/src/components/CoursesTable.jsx`

**Interfaces:**
- Consumes: assignment rows containing `logs`, `date_submitted`, and chronological workflow events.
- Produces: `computeOverallStatus(row)`, `latestSubmissionAt(row)`, and `buildApproverStatus(row)` shared by both tables.

- [ ] **Step 1: Write failing current-round tests**

Use a literal history with submit, accept, return, resubmit. Assert the popup date is the second submission and every reviewer from the previous round is pending.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/utils/assignmentStatus.test.js`

Expected: failure because the shared current-round status model does not exist.

- [ ] **Step 3: Implement the pure status model**

Sort a copy of logs chronologically, locate the latest instructor submission, derive reviewer statuses only from events after it, and preserve existing overall Draft/Pending/Returned/Approved behavior.

- [ ] **Step 4: Replace both duplicated table implementations**

Import the shared functions and remove the local copies. Both details popups must use `latestSubmissionAt(row)`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test src/utils/assignmentStatus.test.js`

Expected: all assignment-status tests pass.

### Task 4: End-to-end verification

**Files:**
- Verify only; no new files.

**Interfaces:**
- Consumes: the running backend on port 5000 and frontend on port 5173.
- Produces: evidence that a stale reviewer identity reaches the sign-in page instead of rendering demo rows over 401 failures.

- [ ] **Step 1: Restart the backend to invalidate its in-memory sessions**

Keep the browser's saved reviewer identity, restart `node server.js`, and reload the application.

- [ ] **Step 2: Verify the original symptom is gone**

Expected: the browser is shown the login page and protected assignment requests are not issued as the stale user.

- [ ] **Step 3: Run all automated verification**

Run client tests, client lint, client production build, server tests, server syntax validation, and the JSX import checker. All must exit successfully with zero failures.
