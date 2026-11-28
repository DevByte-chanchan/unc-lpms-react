# Phase 3 Verification Report: Unified Backend, Superset Migrations & HCI Foundational Seeder

**Status:** VERIFIED & PASSING (32/32 automated E2E backend smoke tests passed on MySQL 8)  
**Database:** `unc_lpms_integrated` (MySQL `8.0.46` via Docker container `db_learning_plan_comp`, isolated from `lpms_composition`)  
**Workspace Integrity:** `git status -s` shows only `?? integrated-lpms/` — zero changes to existing `composition/` or any source branch.

---

## 1. Unified Backend Architecture Built (`integrated-lpms/server/`)

- **Entrypoint & Express 5 Router:**
  - `server.js` — Express 5 server (port `5000`), credentialed CORS (`:5173`), cookie-parser, 15 MB JSON/urlencoded payload limits, `attachUser`, `restrictSuperuser`, `auditMiddleware`, public `/api/health`, unified `/api/*` router, and centralized `errorHandler`.
  - `routes/index.js` — Mounts 100% of Auth/Profile/Notifications, Module 1 (Course Assignment), Module 2 (Composition — exact original URL paths preserved), and Module 3 (Submissions Management) endpoints using Express 5–safe explicit route definitions (no optional `:param?` syntax) and `editLock` protection on all Composition mutations.
- **Unified Superset Schema (`models/` & `migrations/`):**
  - 52 Sequelize models across `coreOrg.js`, `syllabusCore.js`, `courseAssignmentExtras.js`, and `submissionsExtras.js`, unified in `models/index.js` with non-conflicting M2 compatibility association aliases (`Course`, `Program`, `Department`, `ProgramCourseOffering`, `CourseOutcomes`, `workflowLogs`, `PrereqCourse`, `Reference`).
  - `001_create_unified_superset_schema.js` (migrated in ~2.2s) — creates all 52 unified tables with explicit `InnoDB`, `utf8mb4_unicode_ci`, and MySQL 8–compatible foreign keys/indexes.
  - `002_audit_logs_immutability_triggers.js` (migrated in ~0.03s) — installs `BEFORE UPDATE` and `BEFORE DELETE` MySQL triggers enforcing append-only `audit_logs`.
- **Cross-Module Sync Services (`services/`):**
  - `offeringSyncService.js` — Seam #1 bridge: M1 `POST /api/course-assignments` automatically creates/scaffolds a `ProgramCourseOffering` + 4 default COs/16 Weeks + `ASSIGNED` workflow log + instructor notification so the course immediately appears on the Instructor's Composition dashboard.
  - `coaepSyncService.js` — Seams #3/#4a/#5 bridge: M3 COAEP and CO–PO uploads live-sync `CourseOutcomes`, `ProgramOutcomeAlignments`, `IntendedLearningOutcomes` (weights, tools, targets, hours/weeks), and `Weeks` into Composition tables.
  - `offeringService.js` — MySQL 8–safe `cloneOfferingContent` supporting `start-revision` and `carry-over`.
  - `notifyService.js` — Unified cross-role notification dispatcher across `notifications` and workflow logs.
- **25 Controllers across 4 Namespaces (`controllers/`):**
  - `auth/` (4): `authController`, `userAccountController`, `profileController`, `notificationController`
  - `courseAssignment/` (8): `academicPeriodController`, `departmentController`, `facultyController`, `programController`, `courseController`, `courseOfferingAssignmentController`, `industryConsultantController`, `supportingController`
  - `composition/` (13 — 100% M2 preservation): `dashboardController` (M1-wired), `submissionController` (unresolved comment gate + LD/PH alerts), `courseDetailsController`, `courseOutcomeAlignmentController`, `iloController`, `iloScheduleController`, `courseCriteriaController`, `courseCoverageController`, `topicController`, `tlaController`, `iloReferenceController`, `referenceSummaryController`, `revisionController`
  - `submissions/` (5): `assignmentWorkflowController`, `commentController`, `referenceLibraryController`, `programDocumentsController`, `deadlinesAndConsultantsController`

---

## 2. Database Migration & Idempotent Master Seeder Verification

Verified via fresh reset + duplicate seed run:
```powershell
npm.cmd run db:reset
npm.cmd run db:seed
```
- **First seed:** Populated all 52 domain tables (53 total tables including `SequelizeMeta`).
- **Second seed:** `[db:seed] Database already seeded (idempotent check passed). Skipping duplicate inserts.`

### Seeded Row Counts (Clean Reset State)

| Entity / Model | Rows | Notes |
| --- | ---: | --- |
| Total MySQL Tables | **53** | 52 unified superset tables + `SequelizeMeta` |
| `User` | **6** | All 6 unified roles (bcrypt-hashed credentials) |
| `AcademicPeriod` | **2** | SY 2025-2026 (Closed) + SY 2026-2027 1st Sem (Active) |
| `Department` / `Faculty` / `Program` | **5 / 5 / 6** | Full UNC SCIS org hierarchy |
| `Course` / `Prerequisite` | **8 / 1** | BSIT curriculum including `BIT313L` (HCI) + `BIT302` + `Web Development II` prereq |
| `ProgramCourseOffering` | **2** | `pc_offering_id=1` (Approved SY 2025-2026 baseline) + `pc_offering_id=2` (Active Draft SY 2026-2027) |
| `CourseOfferingAssignment` | **2** | Assigned to Instructor Monica Norton (`user_id=1`) |
| `CourseOutcome` / `ProgramOutcome` / `ProgramOutcomeAlignment` | **8 / 10 / 24** | 4 COs per HCI offering mapped to 10 BSIT POs |
| `IntendedLearningOutcome` / `Week` | **26 / 32** | 13 ILOs + 16 Weeks per offering (18-week / 80-hour distribution) |
| `Topic` / `Subtopic` | **64 / 192** | Full cloned HCI weekly topics & subtopics (CoW lineage preserved) |
| `TeachingAndLearningActivity` / `TLAAssessment` | **192 / 96** | Complete HCI TLAs & assessments on both offerings |
| `Reference` / `CourseReference` / `WeeklyReference` | **30 / 30 / 64** | 28 HCI foundational refs + 2 Online Subscriptions in unified M3 library |
| `CourseDocument` / `AssignmentWorkflowLog` | **2 / 6** | Seeded COAEP + CO-PO documents and workflow baseline logs |
| `IndustryConsultant` / `CourseConsultant` | **1 / 1** | Roberto Cruz bridged across M1 + M3 for `BIT313L` |
| `TermDeadline` / `FormSetting` | **1 / 5** | Active term deadline + UNC LP form settings |

### Seeded Dev/QA Test Accounts

| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Instructor | Monica Norton | `monica.norton@unc.edu.ph` | `Instructor@2026` |
| Program Head *(+ Instructor role switch)* | Olivia Vance | `olivia.vance@unc.edu.ph` | `ProgramHead@2026` |
| Director of Libraries | Maria Santos | `maria.santos@unc.edu.ph` | `Library@2026` |
| Industry Consultant | Roberto Cruz | `roberto.cruz@unc.edu.ph` | `Consultant@2026` |
| Dean | Sophia Sterling | `sophia.sterling@unc.edu.ph` | `Dean@2026` |
| VPAA | Carlos Garcia | `carlos.garcia@unc.edu.ph` | `Vpaa@2026` |

---

## 3. Automated E2E Backend Smoke Test Results (`scripts/smokeTest.js`)

**Result:** **32 / 32 PASSED (100%)** against ephemeral Express 5 + real MySQL 8 (`unc_lpms_integrated`).

| Group | Tests Verified | Outcome |
| --- | --- | --- |
| **1. Health & Boot** | `GET /api/health` (MySQL dialect, row counts) | PASS (1/1) |
| **2. Unified Auth & Role Switching** | `/api/auth/demo-accounts`, login + `/api/auth/me` for all 6 roles, `POST /api/auth/switch-role` (`Program Head` → `Instructor` → `Program Head`) | PASS (8/8) |
| **3. M1 Course Assignment & Seam #1** | VPAA periods/departments/VMGO, Dean faculty/programs/dept statements, PH `POST /api/course-assignments` (`BIT302`) auto-creating `pc_offering_id=3`, live visibility on Instructor Composition Dashboard (`BIT302` + `BIT313L`) | PASS (5/5) |
| **4. M2 Composition (HCI `BIT313L`) & Seams #2–#5** | `GET /api/course-details/2/1` (`BIT313L`, prereq `Web Development II`), `GET /api/course-outcome-alignment/2/1` (4 COs), `GET /api/ilos/2/1` (4 COs, week 17), `GET /api/course-criteria/2/1`, `GET /api/course-coverage/2/1`, `GET /api/courses/2/1/references`, Topics (`week-context`, `available`, `assigned`), TLAs, ILO-References, Revisions | PASS (7/7) |
| **5. M3 Reference Library & Live COAEP Sync** | Library Director `GET /api/references` (30 refs) & `/health`; PH `POST /api/course-documents/:bit302PcId/coaep` syncing CIA triad CO & ILO live into Instructor's `GET /api/ilos/:bit302PcId/1` | PASS (2/2) |
| **6. Full 8-Step Approval Workflow & Guards** | (1) Instructor edit + submit → `parallel_review` & `editLock` returns HTTP `403`; (2) LD comment + return → `returned`; (3) Unresolved comment gate rejects resubmit with HTTP `400`; (4) Instructor resolves comment + resubmits → `parallel_review`; (5) LD approves + premature Dean approval rejected with HTTP `400`; (6) PH approves → `dean_review`; (7) Dean approves → `approved`, deferred revision increments `1 → 2`, `ReviewRecordSnapshot` persisted, `editLock` returns HTTP `403`; (8) VPAA approved filter + export bundle + Industry Consultant sign-off | PASS (9/9) |

After verification, `npm.cmd run db:reset` + `npm.cmd run db:seed` was executed to restore the database to its clean initial seeded state ready for Phase 4.
