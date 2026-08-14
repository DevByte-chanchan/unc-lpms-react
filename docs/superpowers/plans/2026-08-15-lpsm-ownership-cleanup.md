# LPSM Ownership Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Arra's TOS/assessment/points UI and unreachable stray source while preserving Edrian's LPSM module, the Christian composition surface needed for comments, authentication, and a working server-backed approver-to-instructor comment round trip.

**Architecture:** Treat `composition/client/src/main.jsx` and `composition/server/server.js` as the runtime roots. First enforce the ownership boundary with a static Node test, then remove routed Arra code, then prune source proven unreachable while keeping operational roots such as migrations, seeders, tests, CSS imports, and shared Christian models. Finish with automated checks and a real comment round trip against the running Express/SQLite application.

**Tech Stack:** React 19, Vite 7, React Router 7, Node.js, Express 5, Sequelize 6, SQLite/better-sqlite3, Sass, plain Node test scripts.

## Global Constraints

- Work only in `composition/client` and `composition/server`; do not clean the duplicate prototype at the repository root.
- Preserve all pre-existing dirty worktree changes unless a listed task explicitly edits or deletes that file.
- Keep Edrian's LPSM approval, reference, comment, revision, role, session, and reachable status/notification behavior.
- Keep Christian's instructor course/syllabus, CO/ILO, topic, TLA, reference, revision, and shared read-only review data needed by the comment flow.
- Keep Christian-authored `TLAAssessment` models, migrations, controller logic, and course-coverage data when retained code imports them.
- Do not drop, rewrite, or reset the current database.
- Do not delete applied shared migrations or retained seeders based only on JavaScript import reachability.
- Use `apply_patch` for source edits and deletions; stage and commit only the exact files belonging to each task.
- The required acceptance path is server-backed: approver save -> `Comments`/`CommentTargets` -> instructor display -> resolution update -> reload persistence.

---

### Task 1: Remove Arra's routed client surface

**Files:**
- Create: `composition/client/src/utils/moduleBoundary.test.js`
- Modify: `composition/client/src/App.jsx`
- Modify: `composition/client/src/utils/routes.js`
- Modify: `composition/client/src/utils/routes.test.js`
- Modify: `composition/client/src/utils/session.js`
- Modify: `composition/client/src/utils/session.test.js`
- Modify: `composition/client/src/components/SideNavigation.jsx`
- Modify: `composition/client/src/components/SyllabusRevisionsSections.jsx`
- Modify: `composition/client/src/utils/submissionGate.js`
- Delete: `composition/client/src/pages/TOS.jsx`
- Delete: `composition/client/src/pages/AssignedTOS.jsx`
- Delete: `composition/client/src/pages/TosPreview.jsx`
- Delete: `composition/client/src/pages/TosSummary.jsx`
- Delete: `composition/client/src/pages/QuestionCognitiveMapping.jsx`
- Delete: `composition/client/src/pages/AssessmentForm.jsx`
- Delete: `composition/client/src/pages/CriteriaForGradingForm.jsx`
- Delete: `composition/client/src/components/TosSections.jsx`
- Delete: `composition/client/src/components/TOSCoursesTable.jsx`
- Delete: `composition/client/src/styles/TosSections.module.sass`
- Delete: `composition/client/src/styles/TosPreview.module.sass`
- Delete: `composition/client/src/styles/QuestionCognitiveMapping.module.sass`
- Delete: `composition/client/src/styles/CriteriaForGradingForm.module.sass`

**Interfaces:**
- Consumes: React Router declarations in `App.jsx`; `PATTERNS`, `routes`, and `LEGACY_REDIRECTS` in `utils/routes.js`; `isInstructorPath(pathname)` in `utils/session.js`.
- Produces: a route table with no `/assigned-tos`, `/tos/:code`, or `/assessments/form/:code/:assessmentId`; a retained `routes` API for LPSM and Christian composition; `moduleBoundary.test.js` as the permanent ownership regression test.

- [ ] **Step 1: Write the failing ownership-boundary test**

Create `composition/client/src/utils/moduleBoundary.test.js` with this content:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(here, '..')
let checks = 0

const check = (condition, message) => {
  checks += 1
  if (!condition) throw new Error(message)
  console.log(`✓ ${message}`)
}

const read = (relative) => fs.readFileSync(path.join(srcRoot, relative), 'utf8')

const arraFiles = [
  'pages/TOS.jsx',
  'pages/AssignedTOS.jsx',
  'pages/TosPreview.jsx',
  'pages/TosSummary.jsx',
  'pages/QuestionCognitiveMapping.jsx',
  'pages/AssessmentForm.jsx',
  'pages/CriteriaForGradingForm.jsx',
  'components/TosSections.jsx',
  'components/TOSCoursesTable.jsx',
  'styles/TosSections.module.sass',
  'styles/TosPreview.module.sass',
  'styles/QuestionCognitiveMapping.module.sass',
  'styles/CriteriaForGradingForm.module.sass'
]

for (const relative of arraFiles) {
  check(!fs.existsSync(path.join(srcRoot, relative)), `Arra file removed: ${relative}`)
}

const routeSources = [
  'App.jsx',
  'utils/routes.js',
  'utils/session.js',
  'components/SideNavigation.jsx',
  'components/SyllabusRevisionsSections.jsx'
].map(read).join('\n')

for (const token of ['/assigned-tos', '/assignedtos', '/tos/:code', '/assessments/form', 'assignedTos', 'CriteriaForGradingForm.jsx']) {
  check(!routeSources.includes(token), `Removed route token: ${token}`)
}

const approvalSource = read('components/ApprovalSyllabusSections.jsx')
const topicSource = read('pages/TopicForm.jsx')
const appSource = read('App.jsx')
check(approvalSource.includes("/api/comments/by-course"), 'Approver still uses the server-backed course comment API')
check(topicSource.includes("/api/comments/update-resolution"), 'Christian topic form still resolves comments through the API')
check(appSource.includes('path="*"'), 'Unknown removed routes safely return through the retained home flow')

console.log(`\n${checks} module-boundary checks passed.`)
```

- [ ] **Step 2: Run the new test and verify the red state**

Run from `composition/client`:

```powershell
node src/utils/moduleBoundary.test.js
```

Expected: FAIL on `Arra file removed: pages/TOS.jsx` because the forbidden UI still exists.

- [ ] **Step 3: Remove Arra imports and routes from `App.jsx`**

Apply this structural change:

```jsx
// Delete these imports:
import AssessmentForm from './pages/AssessmentForm.jsx'
import TOS from './pages/TOS.jsx'
import AssignedTOS from './pages/AssignedTOS.jsx'

// Delete these routes and their TOS-only heading comment:
<Route path="/assigned-tos" element={...} />
<Route path="/tos/:code" element={...} />
<Route path="/assessments/form/:code/:assessmentId" element={...} />
```

Leave all instructor composition routes for courses, revisions, references, topics, TLAs, and ILOs unchanged. Leave every LPSM role route unchanged.

Add this final route after the retained explicit and legacy routes so old bookmarks for removed modules do not render a blank page:

```jsx
<Route path="*" element={<Navigate to="/" replace />} />
```

- [ ] **Step 4: Remove Arra patterns, builders, redirects, and route assertions**

In `utils/routes.js`, delete:

```js
assignedTos: '/assigned-tos',
tos: '/tos/:code',
assessmentForm: '/assessments/form/:code/:assessmentId',

assignedTos: () => '/assigned-tos',
tos: (code) => `/tos/${enc(code)}`,
assessmentForm: (code, assessmentId) => `/assessments/form/${enc(code)}/${enc(assessmentId)}`,

{ from: '/assignedtos', to: () => routes.assignedTos() },
```

Also remove the introductory `routes.js` prose that describes `/assignedtos` as a supported legacy rename.

In `utils/routes.test.js`, change the legacy-rename assertion so it requires only the two retained upload-document redirects:

```js
test('the retained renamed paths are the ones still supported', () => {
  const from = LEGACY_REDIRECTS.map(r => r.from)
  assert(!from.includes('/assignedtos'), 'the removed TOS route must not remain as a redirect')
  assert(from.includes('/role/program-head/upload-documents'), 'the COAEP uploader redirect must still work')
  assert(from.includes('/role/director-of-libraries/upload-documents'), 'the library redirect must still work')
})
```

- [ ] **Step 5: Remove Arra ownership from session guards and their tests**

In `utils/session.js`, remove these entries from `INSTRUCTOR_PATHS`:

```js
'/assigned-tos',
'/assignedtos',
'/tos',
'/assessments'
```

Update the nearby explanatory comment to list retained composition paths only: `/courses`, `/revisions`, `/references`, `/topics`, `/tlas`, and `/ilos`.

In `utils/session.test.js`:

- Remove `/assigned-tos`, `/assignedtos`, `/tos/BSCS511`, and `/assessments/form/BSCS511/1` from the instructor-owned-path array.
- Remove the trailing-slash assertion for `/assigned-tos/`.
- Add this retained replacement assertion:

```js
if (routeGuardRedirect(programHead, '/topics/form/1/draft/') !== '/role/program-head') {
  throw new Error('A trailing slash must not smuggle a retained instructor page past the guard')
}
```

- [ ] **Step 6: Remove TOS navigation and standalone assessment editors**

In `components/SideNavigation.jsx`:

- Delete the `routes.assignedTos()` and `/tos` selection branch.
- Delete the `page === 'TOS'` branch from `handlePageChange`.
- Keep all Learning Plan, COAEP, alignment, reference-library, course-catalog, VPAA, and logout branches.

In `components/SyllabusRevisionsSections.jsx`:

- Delete the lazy `CriteriaForm` import.
- Delete the unused `editAssessment` function.
- Delete the `Assessments` and `Criteria for Grading` `<option>` entries.
- Delete the `selectedSection === 'Assessments'` render block, including its link to `/assessments/form/...`.
- Delete the `selectedSection === 'Criteria for Grading'` render block.
- Retain course details, CO/PO alignment, references, topics/TLAs, ILOs, syllabus preview, and comments.

In `utils/submissionGate.js`, change the ownership comment from "learning-plan / TOS modules" to "Christian learning-plan composition module" without changing the validation logic.

- [ ] **Step 7: Delete the exclusive Arra files**

Use `apply_patch` `Delete File` operations for every file marked **Delete** in this task. Do not delete `server/models/tlaAssessment.js`, `server/migrations/20260514001000-create-tla-assessment.js`, `server/controllers/tlaController.js`, `components/CourseCoverage.jsx`, or `components/CriteriaForGrading.jsx`; git history identifies those as retained Christian/LPSM integration code.

- [ ] **Step 8: Run focused tests and verify green**

Run from `composition/client`:

```powershell
node src/utils/moduleBoundary.test.js
node src/utils/routes.test.js
node src/utils/session.test.js
node src/utils/submissionGate.test.js
node src/utils/checkJsxImports.js
npm run build
```

Expected: every Node script passes; JSX checker reports all retained JSX components defined; Vite build exits 0 with no missing-module error.

- [ ] **Step 9: Commit only Task 1 files**

```powershell
git add -- composition/client/src/utils/moduleBoundary.test.js
git add -A -- composition/client/src/pages/TOS.jsx composition/client/src/pages/AssignedTOS.jsx composition/client/src/pages/TosPreview.jsx composition/client/src/pages/TosSummary.jsx composition/client/src/pages/QuestionCognitiveMapping.jsx composition/client/src/pages/AssessmentForm.jsx composition/client/src/pages/CriteriaForGradingForm.jsx composition/client/src/components/TosSections.jsx composition/client/src/components/TOSCoursesTable.jsx composition/client/src/styles/TosSections.module.sass composition/client/src/styles/TosPreview.module.sass composition/client/src/styles/QuestionCognitiveMapping.module.sass composition/client/src/styles/CriteriaForGradingForm.module.sass
git add -p -- composition/client/src/App.jsx composition/client/src/utils/routes.js composition/client/src/utils/routes.test.js composition/client/src/utils/session.js composition/client/src/utils/session.test.js composition/client/src/utils/submissionGate.js composition/client/src/components/SideNavigation.jsx composition/client/src/components/SyllabusRevisionsSections.jsx
git diff --cached --name-status
git diff --cached
git commit -m "refactor: remove Arra module from LPSM branch"
```

For `git add -p`, stage only hunks that implement Steps 3-6; reject unrelated pre-existing hunks. Use `s` to split a mixed hunk and `e` to remove unrelated lines from a still-mixed patch. Expected cached diff: the new boundary test, complete deletion of the exclusive Arra files, and only the listed route/navigation cleanup hunks. Existing unrelated modifications remain unstaged.

---

### Task 2: Delete unreachable stray client source

**Files:**
- Modify: `composition/client/src/utils/moduleBoundary.test.js`
- Modify: `composition/client/src/utils/session.js`
- Modify: `composition/client/src/utils/tableSort.js`
- Modify: `composition/client/src/utils/demoAssignments.test.js`
- Delete: `composition/client/src/Composition_Notes.txt`
- Delete: `composition/client/src/assets/coaep-logo.png`
- Delete: `composition/client/src/assets/react.svg`
- Delete: `composition/client/src/components/ApprovalFormNavigation.jsx`
- Delete: `composition/client/src/components/RoleUploadPanel/RoleUploadPanel.jsx`
- Delete: `composition/client/src/components/RowActionsMenu.jsx`
- Delete: `composition/client/src/components/Stepper.jsx`
- Delete: `composition/client/src/components/Toast.jsx`
- Delete: `composition/client/src/components/UploadPanel/UploadPanel.jsx`
- Delete: `composition/client/src/pages/ProgramHeadConsultant.jsx`
- Delete: `composition/client/src/pages/lpsm/Instructor/TemplateSelector.jsx`
- Delete: `composition/client/src/pages/lpsm/Instructor/VersionHistoryPanel.jsx`
- Delete: `composition/client/src/pages/lpsm/ProgramHead/StatusDashboard.jsx`
- Delete: `composition/client/src/pages/lpsm/Shared/StatusTracker.jsx`
- Delete: `composition/client/src/pages/lpsm/VPAA/dashboardHelpers.jsx`
- Delete: `composition/client/src/services/documentService.js`
- Delete: `composition/client/src/services/learningPlanService.js`
- Delete: `composition/client/src/services/syllabusService.js`
- Delete: `composition/client/src/styles/RoleUploadPanel.module.sass`
- Delete: `composition/client/src/styles/StatusTracker.module.scss`
- Delete: `composition/client/src/styles/Stepper.module.sass`
- Delete: `composition/client/src/styles/TemplateSelector.module.scss`
- Delete: `composition/client/src/styles/UploadPages.module.sass`
- Delete: `composition/client/src/styles/UploadPanel.module.scss`
- Delete: `composition/client/src/styles/VersionHistoryPanel.module.scss`
- Delete: `composition/client/src/utils/generateCoaepPdf.js`
- Delete: `composition/client/src/utils/gradingCriteria.js`
- Delete: `composition/client/src/utils/gradingCriteria.test.js`
- Delete: `composition/client/src/utils/pdfExport.js`
- Delete: `composition/client/src/utils/planStatus.js`
- Delete: `composition/client/src/utils/planStatus.test.js`
- Delete: `composition/client/src/utils/reviewSteps.js`
- Delete: `composition/client/src/utils/reviewSteps.test.js`
- Delete: `composition/client/src/utils/roleGuard.js`

**Interfaces:**
- Consumes: the runtime reachability audit rooted at `src/main.jsx`; explicit CSS dependency `src/index.css -> styles/tokens.css`.
- Produces: no unreachable parked pages or abandoned alternative implementations; a boundary test that prevents these exact files from returning unnoticed.

- [ ] **Step 1: Extend the boundary test with the exact stray-file manifest**

Add this array after `arraFiles` in `moduleBoundary.test.js`:

```js
const strayFiles = [
  'Composition_Notes.txt',
  'assets/coaep-logo.png',
  'assets/react.svg',
  'components/ApprovalFormNavigation.jsx',
  'components/RoleUploadPanel/RoleUploadPanel.jsx',
  'components/RowActionsMenu.jsx',
  'components/Stepper.jsx',
  'components/Toast.jsx',
  'components/UploadPanel/UploadPanel.jsx',
  'pages/ProgramHeadConsultant.jsx',
  'pages/lpsm/Instructor/TemplateSelector.jsx',
  'pages/lpsm/Instructor/VersionHistoryPanel.jsx',
  'pages/lpsm/ProgramHead/StatusDashboard.jsx',
  'pages/lpsm/Shared/StatusTracker.jsx',
  'pages/lpsm/VPAA/dashboardHelpers.jsx',
  'services/documentService.js',
  'services/learningPlanService.js',
  'services/syllabusService.js',
  'styles/RoleUploadPanel.module.sass',
  'styles/StatusTracker.module.scss',
  'styles/Stepper.module.sass',
  'styles/TemplateSelector.module.scss',
  'styles/UploadPages.module.sass',
  'styles/UploadPanel.module.scss',
  'styles/VersionHistoryPanel.module.scss',
  'utils/generateCoaepPdf.js',
  'utils/gradingCriteria.js',
  'utils/gradingCriteria.test.js',
  'utils/pdfExport.js',
  'utils/planStatus.js',
  'utils/planStatus.test.js',
  'utils/reviewSteps.js',
  'utils/reviewSteps.test.js',
  'utils/roleGuard.js'
]

for (const relative of strayFiles) {
  check(!fs.existsSync(path.join(srcRoot, relative)), `Unreachable stray file removed: ${relative}`)
}
```

- [ ] **Step 2: Run the boundary test and verify the second red state**

Run from `composition/client`:

```powershell
node src/utils/moduleBoundary.test.js
```

Expected: FAIL on `Unreachable stray file removed: Composition_Notes.txt`.

- [ ] **Step 3: Verify the deletion targets are still unreachable**

Before deleting, run these exact checks from `composition/client`:

```powershell
rg -n "ApprovalFormNavigation|RoleUploadPanel|RowActionsMenu|Stepper|StatusDashboard|StatusTracker|TemplateSelector|VersionHistoryPanel|dashboardHelpers|generateCoaepPdf|gradingCriteria|pdfExport|planStatus|reviewSteps|roleGuard" src -g '!**/*.test.js'
rg -n "tokens.css" src/index.css
```

Expected: the first command reports only references contained inside the deletion set or explanatory comments; no retained runtime file imports a deletion target. The second command reports `@import './styles/tokens.css';`, proving `styles/tokens.css` must remain despite a JavaScript-only graph marking it unreachable.

- [ ] **Step 4: Delete the exact stray-file manifest**

Use `apply_patch` `Delete File` operations for every file marked **Delete** in this task. Do not delete:

```text
composition/client/src/styles/tokens.css
composition/client/src/utils/demoAssignments.js
composition/client/src/utils/demoAssignments.test.js
composition/client/src/components/CourseCoverage.jsx
composition/client/src/components/CourseDetails.jsx
composition/client/src/components/CriteriaForGrading.jsx
composition/client/src/components/OutcomeAlignment.jsx
composition/client/src/components/ReferenceSummary.jsx
```

Those are retained through CSS imports, live imports without filename extensions, or current LPSM/Christian behavior.

- [ ] **Step 5: Remove stale source comments that name deleted implementations**

Make these comment-only changes:

- In `utils/session.js`, remove the reference to deleted `utils/roleGuard.js`; state that `session.js` is the canonical owner of `user` and `userId` session keys.
- In `utils/tableSort.js`, replace the reference to deleted `utils/planStatus.js` with "workflow status keys".
- In `utils/demoAssignments.test.js`, replace the `StatusDashboard.jsx` filename reference with "the retained assignment status accessors".

- [ ] **Step 6: Run structural and build verification**

Run from `composition/client`:

```powershell
node src/utils/moduleBoundary.test.js
node src/utils/checkJsxImports.js
npm run build
```

Expected: boundary and JSX checks pass; Vite build exits 0. The existing Sass deprecation and large-chunk warnings may remain, but no missing import or undefined JSX component is allowed.

- [ ] **Step 7: Re-run the source reachability audit**

Use the same relative-import graph rooted at `src/main.jsx` that produced the approved deletion manifest. Confirm that every remaining non-runtime result belongs to one of these explicit operational categories:

```text
*.test.js
src/utils/checkJsxImports.js
src/styles/tokens.css (reached through CSS @import)
```

Expected: no remaining page, component, service, or utility implementation is outside the retained runtime graph.

- [ ] **Step 8: Commit only Task 2 files**

```powershell
git add -A -- composition/client/src/Composition_Notes.txt composition/client/src/assets/coaep-logo.png composition/client/src/assets/react.svg composition/client/src/components/ApprovalFormNavigation.jsx composition/client/src/components/RoleUploadPanel/RoleUploadPanel.jsx composition/client/src/components/RowActionsMenu.jsx composition/client/src/components/Stepper.jsx composition/client/src/components/Toast.jsx composition/client/src/components/UploadPanel/UploadPanel.jsx composition/client/src/pages/ProgramHeadConsultant.jsx composition/client/src/pages/lpsm/Instructor/TemplateSelector.jsx composition/client/src/pages/lpsm/Instructor/VersionHistoryPanel.jsx composition/client/src/pages/lpsm/ProgramHead/StatusDashboard.jsx composition/client/src/pages/lpsm/Shared/StatusTracker.jsx composition/client/src/pages/lpsm/VPAA/dashboardHelpers.jsx composition/client/src/services/documentService.js composition/client/src/services/learningPlanService.js composition/client/src/services/syllabusService.js composition/client/src/styles/RoleUploadPanel.module.sass composition/client/src/styles/StatusTracker.module.scss composition/client/src/styles/Stepper.module.sass composition/client/src/styles/TemplateSelector.module.scss composition/client/src/styles/UploadPages.module.sass composition/client/src/styles/UploadPanel.module.scss composition/client/src/styles/VersionHistoryPanel.module.scss composition/client/src/utils/generateCoaepPdf.js composition/client/src/utils/gradingCriteria.js composition/client/src/utils/gradingCriteria.test.js composition/client/src/utils/pdfExport.js composition/client/src/utils/planStatus.js composition/client/src/utils/planStatus.test.js composition/client/src/utils/reviewSteps.js composition/client/src/utils/reviewSteps.test.js composition/client/src/utils/roleGuard.js
git add -- composition/client/src/utils/moduleBoundary.test.js
git add -p -- composition/client/src/utils/session.js composition/client/src/utils/tableSort.js composition/client/src/utils/demoAssignments.test.js
git diff --cached --name-status
git diff --cached
git commit -m "refactor: prune unreachable LPSM client source"
```

For the three retained dirty utilities, stage only the comment-only hunks from Step 5. Expected cached diff: only the Task 2 manifest, the boundary-test extension, and those three comment corrections.

---

### Task 3: Reconcile project documentation with the smaller branch

**Files:**
- Modify: `composition/PROJECT_MAP.md`

**Interfaces:**
- Consumes: the final retained route and file sets from Tasks 1-2.
- Produces: handoff documentation that no longer tells future developers to restore or run deleted parked features.

- [ ] **Step 1: Preserve the user's dirty backlog documents**

Run:

```powershell
git status --short -- composition/BACKLOG-CURRENT.md composition/BACKLOG.md
```

Expected: both files are already modified from before this cleanup. Do not edit, stage, or commit them; the approved design and implementation plan record why their parked-file notes are superseded.

- [ ] **Step 2: Update the clean project map**

In `PROJECT_MAP.md`:

- Remove TOS and standalone assessment routes from the client route summary.
- State that the active branch contains LPSM plus the Christian composition subset needed for comment integration.
- Add this ownership statement:

```markdown
## Branch ownership boundary

This branch runs Edrian's LPSM module plus the Christian composition surface required for server-backed comment display and resolution. Arra's standalone TOS/assessment/points UI and client source unreachable from `src/main.jsx` were removed on 2026-08-15. Christian's TLA-assessment backend records remain because retained course coverage consumes them.
```

- Keep the server route list, database location warning, ports, and startup entry points unchanged.

- [ ] **Step 3: Check documentation for stale file and route references**

Run from the repository root:

```powershell
rg -n "AssignedTOS|TosSections|TOSCoursesTable|QuestionCognitiveMapping|AssessmentForm|CriteriaForGradingForm|/assigned-tos|/assignedtos|/tos/:code" composition/PROJECT_MAP.md
```

Expected: no output. General uses of the words "assessment" or "TOS" may remain only in the ownership-boundary explanation; deleted filenames and routes must not remain as current instructions.

- [ ] **Step 4: Commit only documentation reconciliation**

```powershell
git add -- composition/PROJECT_MAP.md
git diff --cached -- composition/PROJECT_MAP.md
git commit -m "docs: document the retained LPSM boundary"
```

Expected staged scope: exactly `composition/PROJECT_MAP.md`; the two pre-existing dirty backlog files remain unstaged and unchanged by this task.

---

### Task 4: Run the complete automated verification suite

**Files:**
- Test: `composition/client/src/utils/*.test.js` (retained files only)
- Test: `composition/client/src/utils/checkJsxImports.js`
- Test: `composition/server/utils/*.test.js`
- Verify: all retained `composition/server/**/*.js`

**Interfaces:**
- Consumes: the final client and server source trees from Tasks 1-3.
- Produces: evidence that deletion did not break imports, routes, pure business rules, server utilities, or the production bundle.

- [ ] **Step 1: Run every retained client utility test**

From `composition/client`:

```powershell
$failed = @()
Get-ChildItem 'src\utils' -Filter '*.test.js' | Sort-Object Name | ForEach-Object {
  & node $_.FullName
  if ($LASTEXITCODE -ne 0) { $failed += $_.Name }
}
if ($failed.Count) { throw "Client tests failed: $($failed -join ', ')" }
```

Expected: every retained test file exits 0, including `moduleBoundary.test.js`.

- [ ] **Step 2: Run JSX and production-build checks**

From `composition/client`:

```powershell
node src/utils/checkJsxImports.js
npm run build
```

Expected: JSX checker passes; Vite transforms all retained modules and exits 0.

- [ ] **Step 3: Run server utility and syntax checks**

From `composition/server`:

```powershell
$failed = @()
Get-ChildItem 'utils' -Filter '*.test.js' | Sort-Object Name | ForEach-Object {
  & node $_.FullName
  if ($LASTEXITCODE -ne 0) { $failed += $_.Name }
}
if ($failed.Count) { throw "Server tests failed: $($failed -join ', ')" }

Get-ChildItem -Recurse -File -Filter '*.js' |
  Where-Object { $_.FullName -notmatch 'node_modules' } |
  ForEach-Object {
    & node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($_.FullName)" }
  }
```

Expected: password, reset-token, and auth-schema tests pass; every retained server JavaScript file passes `node --check`.

- [ ] **Step 4: Verify the diff and working-tree scope**

From the repository root:

```powershell
git diff --check
git status --short
git log --oneline -4
```

Expected: no whitespace errors. The three cleanup commits appear after the design/plan commits. Unrelated pre-existing dirty changes may remain, but no unplanned file is staged.

---

### Task 5: Verify startup and the server-backed comment round trip

**Files:**
- Runtime: `composition/server/server.js`
- Runtime: `composition/client/src/main.jsx`
- Exercise: `composition/client/src/components/ApprovalSyllabusSections.jsx`
- Exercise: `composition/client/src/pages/TopicForm.jsx`
- Exercise: `composition/server/controllers/commentController.js`

**Interfaces:**
- Consumes: `POST /api/comments/by-course`, `GET /api/comments/by-course/:code`, `GET /api/comments/filter/:iloId/:commentFor`, and `PUT /api/comments/update-resolution`.
- Produces: verified persistent comment text and resolution state for course `BIT313L`, offering `1`, revision `1`.

- [ ] **Step 1: Start the backend exactly as the user runs it**

In terminal 1:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\server"
node server.js
```

Expected terminal output includes `Server listening on 5000`. In a separate PowerShell prompt:

```powershell
Invoke-RestMethod 'http://localhost:5000/api/auth/health'
```

Expected: JSON with `ok: true` and an `accounts` count. If the count is zero, run the two already-documented setup commands before UI verification:

```powershell
node migrate.js
node run-seeder.js 20260812000000-demo-users.js
```

- [ ] **Step 2: Start the frontend exactly as the user runs it**

In terminal 2:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\client"
npm run dev
```

Expected: Vite prints a local URL, normally `http://localhost:5173/`, and the login page renders without the error boundary.

- [ ] **Step 3: Create one unique approver comment through the UI**

Use these exact demo credentials:

```text
Program Head: junar.danila@unc.edu.ph
Password: demo1234
Role: program-head
```

Open:

```text
http://localhost:5173/role/program-head/courses/BIT313L?pcId=1&revNum=1&status=pending
```

In the Topics/Course Coverage review context, select a topic under CO1/ILO1 and add one targeted comment with this exact text:

```text
LPSM ownership cleanup round-trip 2026-08-15
```

Expected: the UI reports a successful save. Confirm the server record:

```powershell
$comments = Invoke-RestMethod 'http://localhost:5000/api/comments/by-course/BIT313L?pcId=1'
$comments | Where-Object { $_.message -eq 'LPSM ownership cleanup round-trip 2026-08-15' }
```

Expected: one row with a numeric `comment_id`, the selected `target_id`/`target_title`, and unresolved status.

- [ ] **Step 4: See and resolve the comment from Christian's instructor form**

Sign out, then use:

```text
Instructor: monica.norton@unc.edu.ph
Password: demo1234
Role: instructor
```

Open the same plan, then its returned topic form:

```text
http://localhost:5173/courses/1/1/returned
http://localhost:5173/topics/form/1/returned
```

Expected: the exact comment text appears in Christian's topic form with the target context. Mark it resolved and save.

- [ ] **Step 5: Verify resolution persistence after reload**

Run:

```powershell
$topicComments = Invoke-RestMethod 'http://localhost:5000/api/comments/filter/1/topics'
$topicComments | Where-Object { $_.message -eq 'LPSM ownership cleanup round-trip 2026-08-15' }
```

Expected: the same `comment_id` has `resolved_status` equal to `1` or `true`. Reload the topic page; the resolved state remains visible and no deleted TOS/assessment navigation entry appears.

- [ ] **Step 6: Record final evidence without adding unrelated changes**

From the repository root:

```powershell
git status --short
git log --oneline -5
```

Expected: no staged files. Report the automated test/build results, backend/frontend startup URLs, and the verified comment ID in the final handoff. Do not commit the demo comment database because `server/data/` is untracked and excluded from source control.
