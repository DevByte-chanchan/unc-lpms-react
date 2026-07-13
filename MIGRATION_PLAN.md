# Migration Plan — Rebase onto the Composition Branch, Keep My Features

**Goal:** Adopt the `feature/learning-plan-composition` branch (the full‑stack app at localhost:5174 — React client + Express/Sequelize/MySQL backend) as the new base, and re‑implement the features I built on `feature/learning-plan-submissions-management` so nothing I've already done is lost.

**Status:** Plan only. No code changes yet.

---

## 1. The two codebases at a glance

| | My branch (submissions‑management) | Composition branch (new base) |
|---|---|---|
| Data source | Static `syllabiData.js` + browser `localStorage` | Real API (`/api/*`) backed by MySQL via Sequelize |
| Comments | localStorage (`approval_comments_v1`), seeded in JS | DB tables **Comments** + **CommentTargets** (already migrated & seeded) |
| Workflow | `workflowHelpers.js` in localStorage | DB **CourseOfferingAssignments** + **AssignmentWorkflowLog** |
| PDF export | Client‑side (`buildSyllabusHtml` → print / `PDFViewerModal`) | Not present — must be ported |
| Approver‑side comment recorder UI | `ApprovalCommentBox.jsx` (built by me) | **Not present in the composition client** — must be ported |

**Key insight:** The composition backend was clearly designed with my features in mind. Its comment schema maps almost 1:1 onto what I built, so most of the port is *wiring my UI to real endpoints* rather than reinventing logic.

---

## 2. Schema mapping (my model → composition DB)

| My concept (localStorage) | Composition DB field |
|---|---|
| `coverageType` = Topic / References / TLA | `Comments.comment_for` ENUM('topics','references','tlas') |
| `courseOutcome` / `ilo` | `Comments.ilo_id` (FK to IntendedLearningOutcomes) |
| `comment` / `text` | `Comments.message` |
| `role` (who commented) | `Comments.commenter_role` |
| `status` resolved / `resolvedAt` | `Comments.resolved_status` / `resolved_date` |
| **Target multi‑select** (`coverageDetail` array) | **`CommentTargets`** rows: one `comment_id` → many `target_id` (Topic/Reference/TLA PK) |
| Which learning plan | `Comments.co_assign_id` (FK to the assignment) |

This confirms the **Target multi‑select is a first‑class concept in composition** (`CommentTargets`), so it ports cleanly.

---

## 3. Features to carry over (inventory)

### A. Comment recorder + Target multi‑select  *(highest effort, backend partly ready)*
My files: `ApprovalCommentBox.jsx`, `DropdownMultiSelect.jsx` (portal fix), `approvalHelpers.js`, `seedDummyComments.js`, comment display in `ApprovalSyllabusSections.jsx` & `SyllabusRevisionsSections.jsx`.
- Composition backend already has: `getCommentsByTarget`, `getUnresolvedCommentCounts`, `updateResolutionStatuses`.
- **Missing on composition:** a **POST endpoint to create a comment + its targets**, and the approver‑side recorder UI.
- Port target: bring `ApprovalCommentBox` + `DropdownMultiSelect` into `composition/client`, and replace localStorage reads/writes with calls to `/api/comments`.

### B. Approver workflow connection *(backend ready)*
My files: `workflowHelpers.js`, `ApprovalCoursesTable.jsx`, approval panels, the Accepted/Approved details popup.
- Composition already exposes assignments + `workflowLogs` (`GET /api/assignments`).
- Port target: read approver status from `workflowLogs` (I already saw the shape); add the "accept/return" **write** endpoints if not present.
- Keep my rule: **"Approved" only for Dean, "Accepted" for the other three approvers.**

### C. PDF export for approved learning plans *(client‑only, must port)*
My files: `PdfExportButton.jsx`, `utils/syllabusPdfHtml.js` (`buildSyllabusHtml`), `PDFViewerModal.jsx`, export handlers in `CoursesTable`/`InstructorDashboard`.
- Composition has no PDF path.
- Port target: move these into `composition/client`, feed them from the composition API (assignment + ILOs + coverage) instead of `syllabiData`.

### D. Course Coverage table polish *(client‑only, low effort)*
My changes: consecutive‑run CO rowspan fix, scrollbar‑outside, header divider lines (separate borders), column widths (PERIOD wider, RESOURCES thinner).
- Port target: apply the same edits to composition's `SyllabusSections.jsx` / `SyllabusPreview.jsx` + their `.module.sass`.

### E. Comment display layout *(client‑only, low effort)*
My change: **Target** on top, **CO / ILO / Coverage** on one line; removed the duplicate coverage chip.
- Port target: composition's `SyllabusRevisionsSections.jsx` (instructor view of returned comments).

### F. CO‑PO alignment = 4 outcomes *(data/logic)*
My change: `syllabiDataEnricher.js` pads every course to 4 COs.
- In composition this is DB‑driven (`CourseOutcomes`), so the fix becomes "**ensure each course is seeded with 4 course outcomes**" in the seeders, not a client pad.

### G. Assigned Courses look & seed *(already reskinned)*
Already matches composition's `CoursesTable` UI. On composition it's driven by the real API, so no static seed is needed there.

---

## 4. Recommended sequence

1. **Freeze & snapshot my branch** — commit all current uncommitted work on `feature/learning-plan-submissions-management` and tag it (e.g. `pre-migration-snapshot`) so nothing is lost when I "delete mine." *Do this before anything else.*
2. **Branch off composition** — create a new working branch from `feature/learning-plan-composition` (don't develop directly on it).
3. **Port low‑risk client‑only items first** (D, E, G polish) to validate the workflow and get quick visual parity.
4. **Port PDF export (C)** — client feature, feed from composition API.
5. **Wire the workflow/approver popup (B)** to `workflowLogs`; add accept/return write endpoints if missing.
6. **Port the comment recorder + Target (A)** — the big one:
   a. Add backend `POST /api/comments` (create comment + CommentTargets).
   b. Bring `ApprovalCommentBox` + `DropdownMultiSelect` into the composition client.
   c. Replace localStorage with API calls; map `coverageType→comment_for`, `coverageDetail→CommentTargets`, `ilo→ilo_id`.
   d. Keep per‑role comment visibility and the "New" badge behavior.
7. **Seed parity** — make composition seeders produce the demo comments/targets I had (there's already `temp/…-hci-comments.js` to model from).
8. **Verify end‑to‑end** with the backend + MySQL running: create a comment with multiple targets, resolve it, export an approved plan's PDF, confirm approver statuses render.

---

## 5. Decisions I need from you (when we start executing)

1. **Comments persistence:** wire the recorder to the real DB API (recommended, since the schema exists), or keep a localStorage fallback for offline demo?
2. **Approver write actions:** should accept/return also write to the DB (`AssignmentWorkflowLog`), or stay client‑side for now?
3. **PDF source:** generate from live API data, or keep the current HTML‑print approach fed by whatever data is loaded?
4. **Terminology:** composition's popup labels the library role "Library Director" — keep that, or use my "Director of Libraries"?

---

## 6. Safety notes

- **Nothing is deleted until step 1's snapshot exists.** Commit + tag my branch first; the migration happens on a copy of composition.
- The composition app needs Docker MySQL + the `:5001` server running; the client reads `VITE_API_BASE`. Keep the `.env` and fixed ports (my branch 5175, composition 5174) so both can run side‑by‑side during the port.
- Port one feature per commit so each step is reviewable and reversible.
