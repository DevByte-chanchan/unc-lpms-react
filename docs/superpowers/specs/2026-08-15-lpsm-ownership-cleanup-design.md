# LPSM Ownership Cleanup Design

**Date:** 2026-08-15  
**Branch:** `feature/learning-plan-submissions-management-v2`  
**Application:** `composition/client` + `composition/server`

## Objective

Reduce this branch to Edrian's Learning Plan Submissions Management (LPSM)
module, the minimum Christian learning-plan composition surface needed to
verify comments, authentication, and their shared infrastructure. Remove
Arra's TOS/assessment/points module and source files that the retained
application cannot reach.

The retained acceptance flow is:

1. An approver opens a Christian learning plan.
2. The approver enters a targeted comment from the LPSM review screen.
3. The server stores the comment and its targets.
4. The instructor opens the same learning plan in Christian's composition UI.
5. The instructor sees the comment on the correct target and can resolve it.

## Runtime boundary

The supported application is only the application started with these commands:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\server"
node server.js

cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\client"
npm run dev
```

The duplicate prototype at the repository root is not part of this cleanup.

## Ownership rule

Ownership is determined by feature responsibility, git history, and current
dependencies together. A filename containing `assessment` is not sufficient
evidence that it belongs to Arra.

Git history confirms that the standalone TOS UI is Arra's module. It also
confirms that `server/models/tlaAssessment.js`, its migration, the TLA
controller integration, and course-coverage assessment data were authored as
part of Christian's learning-plan composition. Those Christian-owned backend
structures remain when they are still used by the retained composition or
review UI.

## Retained product surface

### LPSM

- Role home pages and approval course tables for Program Head, Director of
  Libraries, Industry Consultant, Dean, and VPAA.
- Approval-plan review, approval-chain status, return/approve actions,
  references, comments, revisions, and reachable status/notification UI.
- Reference Library, course catalog, add/view/edit reference flows, and their
  services and utilities.
- LPSM utilities that are imported by the retained UI, including routing,
  review gates, workflow routing, session handling, reference logic, sorting,
  spelling support, and their retained tests.

### Christian integration

- Instructor assigned-courses and syllabus entry points.
- Course details, CO/PO alignment, ILOs, topics, TLAs, references, revision
  history, and the shared read-only sections used by the approver.
- The minimum forms and server endpoints necessary for the instructor to open
  the same plan and see or resolve targeted comments.
- Christian-authored data structures still consumed by those screens,
  including TLA assessment records when referenced by course coverage.

### Shared infrastructure

- Login, real/demo session handling, role guards, error boundaries, layouts,
  shared styling, API helpers, database configuration, migrations and seeders
  required to recreate the retained schema and demo data.
- `Comments`, `CommentTargets`, their associations, migrations, routes, and
  controllers.

## Removed product surface

### Arra's standalone module

Remove the feature and all exclusive imports, links, route definitions,
styles, helpers, and tests for:

- Assigned TOS.
- TOS editor.
- TOS preview and summary.
- Question/rubric cognitive mapping.
- TOS assessment-item and points computation UI.
- The standalone assessment editor and criteria-for-grading editor. The
  retained comment acceptance flow does not require either editor.

The initial concrete client candidates include:

- `pages/TOS.jsx`
- `pages/AssignedTOS.jsx`
- `pages/TosPreview.jsx`
- `pages/TosSummary.jsx`
- `pages/QuestionCognitiveMapping.jsx`
- `pages/AssessmentForm.jsx`
- `pages/CriteriaForGradingForm.jsx`
- `components/TosSections.jsx`
- `components/TOSCoursesTable.jsx`
- TOS/cognitive-mapping-specific style modules

Each candidate must be checked against the retained import graph before
deletion. Shared files are edited only to remove Arra-specific branches; they
are not deleted if retained code still imports them.

### Unreachable stray source

After removing Arra's routes, build a source reachability graph from:

- Client root: `composition/client/src/main.jsx`.
- Server root: `composition/server/server.js`.
- Operational roots: migration runner, seeder runner, retained tests and JSX
  checker.

Delete pages, components, helpers, and styles that are unreachable from those
roots and have no documented manual entry point. This includes abandoned
alternative pages and parked UI that has no route or importer. Do not classify
migrations, seeders, assets referenced by filename, or command-line scripts as
dead solely because JavaScript imports do not reach them.

## Route and navigation cleanup

- Remove `/assigned-tos`, `/tos/:code`, and Arra-only assessment routes.
- Remove links and lazy imports for the standalone assessment and grading
  editors. Retain Christian's read-only course-coverage and grading display
  components where the LPSM review UI still imports them.
- Remove their imports from `App.jsx`.
- Remove their builders and patterns from `utils/routes.js`.
- Remove obsolete legacy redirects only when their destination is also
  removed.
- Remove matching instructor-path guard entries and update route tests.
- Remove sidebar/menu links to deleted routes.
- Do not leave placeholder pages or redirects to unrelated features.

Unknown URLs should fall through to the application's existing not-found or
safe-home behavior rather than rendering a deleted feature.

## Comment data flow

The cleanup must preserve this server-backed path:

```text
ApprovalCommentBox / ApprovalSyllabusSections
  -> POST /api/comments/by-course
  -> Comments + CommentTargets
  -> GET comment endpoint for the same course/ILO/target
  -> Christian instructor composition form
  -> PUT /api/comments/update-resolution
```

The retained client must not rely exclusively on `localStorage` for this
acceptance flow. Existing demo fallback state may remain where already used,
but the manual acceptance check uses the running server.

## Database policy

- Do not drop or rewrite the developer's current database as part of source
  cleanup.
- Do not delete an applied shared migration merely because a removed page once
  consumed the table.
- Remove a migration only if it is proven exclusive to Arra, unapplied by the
  supported setup, and unnecessary for every retained model, controller,
  seeder, and query.
- Preserve foreign-key and model associations needed by comments and retained
  Christian records.

## Error handling

- Removed routes must not leave unresolved imports or navigation links.
- If a retained learning plan contains historical Arra-only data, retained
  screens ignore unsupported fields rather than crashing.
- Comment API errors remain visible to the reviewer/instructor and must not be
  reported as a successful save or resolution.
- Empty comment lists render the existing empty state rather than a broken
  table or blank screen.

## Verification

Run all of the following after cleanup:

1. Retained client utility tests.
2. `node src/utils/checkJsxImports.js`.
3. `npm run build` in `composition/client`.
4. Server utility tests and syntax checks.
5. Start `node server.js` and confirm port 5000 answers.
6. Start `npm run dev` and confirm the retained route table renders without
   missing imports.
7. Confirm deleted TOS/assessment routes and navigation entries no longer
   exist.
8. Execute the full approver-to-instructor comment acceptance flow, including
   resolution and reload persistence.

## Non-goals

- Reimplementing Arra's features.
- Redesigning Christian's composition module.
- Changing comment behavior beyond what is necessary to keep the existing
  server-backed integration working.
- Cleaning the duplicate application outside `composition/`.
- Reformatting or refactoring retained code unrelated to deletion.

## Completion criteria

The cleanup is complete when the supported client and server start normally,
Arra's standalone feature surface and unreachable stray source are gone, no
retained import or link points to a deleted file, and the server-backed
approver-to-instructor comment flow passes end to end.
