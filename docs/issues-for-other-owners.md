# Issues for the other modules

Found while working on the approver module (approvers, Reference Library, comments, exporting). These are in
code the approver module does not own, so they are reported here instead of fixed. Most important first.
Paths are from `composition/`.

## 1. The instructor's submit endpoint ignores the approval rules (high)

**Where:** `server/controllers/submissionController.js`, `submitLearningPlan` (route `POST /api/submit-learning-plan/:pcId`).

**What is wrong:** it only checks that the latest log entry is not already `SUBMITTED` (by `createdAt`). It never
asks the shared approval rules (`server/utils/workflowRules.js`, `validateWorkflowTransition`), which every other
workflow action uses.

**Why it matters now:** a Dean return now goes to the Program Head first (the plan stays locked "with the Program
Head" until they forward it to the instructor or send it back to the Dean). Through this endpoint the instructor
can still submit during that time, skipping the Program Head step. It also lets an instructor submit an approved
plan or a plan under review if the latest row happens to be something else.

**Fix:** before writing the `SUBMITTED` row, load `effectiveLogs` and refuse when
`validateWorkflowTransition(logs, 'INSTRUCTOR', 'SUBMITTED')` is not allowed (409 with its message), the same way
`server/controllers/assignmentController.js` `recordWorkflowAction` does. Decide it before opening any transaction.

## 2. Start revision can undo another user's save (medium)

**Where:** `server/services/offeringService.js`, `startRevision` (around line 197).

**What is wrong:** its refusals (`ServiceError` 403/409) are thrown inside `sequelize.transaction(...)`. The server
uses one shared SQLite connection, so the rollback also undoes any other request's write made in that moment.

**Fix:** the same pattern used for `assignCourseForTerm` in the same file: catch `ServiceError` inside the
transaction, return it, and throw it after the (empty) transaction commits. Every refusal there happens before the
first insert, so nothing partial is committed. A test like "a refused course assignment commits its empty
transaction" in `server/utils/notifications.test.js` shows how to check it.

## 3. Instructor revisions page reads comments from the browser (medium)

**Where:** `client/src/components/SyllabusRevisionsSections.jsx` (lines ~35 and ~55), key `approval_comments_v1`.

**What is wrong:** it reads and writes reviewer comments in `localStorage`. The approver screens no longer keep
comments there (they leaked between accounts on a shared computer and showed comments the server had refused); the
approver plan page now clears that key. So this page shows nothing from it.

**Fix:** load comments from the server, e.g. `GET /api/comments/by-course/:code?pcId=` (the server decides
visibility and now sends `commenter_name`), as `client/src/utils/serverComments.js` does for the approver panel.

## 4. Online deployment blockers (high, before any real users)

- **Sign-in breaks across Vercel and Render.** The session cookie is `SameSite=Lax`
  (`server/utils/serverSecurity.js`, line ~33). With the client on a Vercel domain and the API on a Render domain,
  the browser does not send a Lax cookie on those cross-site requests, so every request after login is
  unauthenticated. Options: serve both under one site (a custom domain with `api.` and `app.` subdomains, or proxy
  `/api` through the client host), or use `SameSite=None; Secure` with tight CORS.
- **The database is wiped on restart on Render.** SQLite lives on the container's disk; Render's normal disk is
  temporary. Use a Render persistent disk mounted where the database file is, or move to a hosted database.
- **There are no backups.** Nothing copies the database anywhere. At minimum, a scheduled copy of the SQLite file
  (with its `-wal` file, or after a checkpoint) to storage outside the server.

## Already fixed on the approver side (for reference)

- Approve/Return refusals no longer roll back other writes (`assignmentController.js`).
- Refused course assignments no longer roll back other writes (`offeringService.js`, `assignCourseForTerm`).
- Workflow log order uses the real instant (`julianday`), so rows written with a local offset sort correctly
  (`server/utils/effectiveLogs.js`).
