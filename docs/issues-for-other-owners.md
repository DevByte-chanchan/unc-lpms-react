# Issues for the other modules

Found while working on the approver module (approvers, Reference Library, comments, exporting). These are in
code the approver module does not own, so they are reported here instead of fixed. Most important first.
Paths are from `composition/`.

## 1. feature/learning-plan-composition (6618f08) would break the approvers' lists if merged (high)

**Where:** `server/controllers/assignmentController.js`, `listAssignments`, on that branch.

**What is wrong:** with no `stakeholder` in the query it now filters by the signed-in user
(`req.user.id`), so `/api/assignments` returns only the courses where that user is the lead instructor. Every
approver list (Program Head, Director, Dean, consultant, VPAA) asks without `stakeholder`, so they would all be empty.

**Also on that branch, not to merge as is:** its own sign-in and accounts (`UserAccount`, `Faculty`,
`IndustryConsultant` tables, `create-user-accounts` / `create-faculty` migrations, a users seeder), which conflict
with the sign-in in use; edits made inside two old migrations (comments, workflow logs), which never run on an
existing database; and `package.json` files from an older base that drop `better-sqlite3`, `helmet`, `nodemailer`,
`xlsx`, `pdf-lib` and the test script.

**Fix:** keep the `stakeholder` filter only when the instructor's own list asks for it; bring the AI topic
suggestions and the form changes over without the auth, migration and package changes.

## 2. Online deployment blockers (high, before any real users)

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

- The instructor's submit endpoint now asks the shared approval rules (`submissionController.js`): no submitting
  an approved plan, one under review, or one the Dean returned that is still with the Program Head (409).
- Start revision refusals no longer roll back other writes (`offeringService.js`, `startRevision`).
- The instructor's `/revisions/:code` page (sample data, comments from the browser, linked from nowhere) is removed;
  the real history is the Revisions window, which reads `/api/revisions`.
- Approve/Return refusals no longer roll back other writes (`assignmentController.js`).
- Refused course assignments no longer roll back other writes (`offeringService.js`, `assignCourseForTerm`).
- Workflow log order uses the real instant (`julianday`), so rows written with a local offset sort correctly
  (`server/utils/effectiveLogs.js`).
