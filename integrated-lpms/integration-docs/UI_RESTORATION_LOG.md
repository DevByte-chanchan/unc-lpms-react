# UNC-LPMS (`integrated-lpms`) — Full Original UI, Pages, Sections & Skeleton Restoration Log

---

## UI PHASE 1: FORENSIC CSS, SKELETON & PAGE-SECTION PARITY AUDIT

**Audit Date:** 2026-11-28  
**Mode:** Read-only forensic audit against detached git worktrees mounted under `integrated-lpms/_ref_ui_audit/`:
- `course-assignment/` → `origin/feature/course-assignment` (`5e940c7`)
- `composition/` → `feature/learning-plan-composition` (`279c58f`)
- `submissions/` → `origin/feature/learning-plan-submissions-management-v2` (`86680b9`)

*(Zero application files were modified during Phase 1.)*

---

## 1. Global CSS, Dependencies, Fonts & Styling Root-Cause Audit

### 1.1 Dependency & Build Config Comparison

| Package / Config | `integrated-lpms/client` (Current) | `course-assignment` (M1) | `composition` (M2) | `submissions` (M3) | Action Required (Phase 2) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `react` / `react-dom` | `^19.1.1` | `^19.1.1` | `^19.1.1` | `^19.1.1` | Aligned |
| `react-router-dom` | `^7.9.6` | `^7.9.6` | `^7.9.6` | `^7.9.6` | Aligned |
| `sass` / `vite` | `^1.93.2` / `^7.1.7` | `^1.93.2` / `^7.1.7` | `^1.93.2` / `^7.1.7` | `^1.93.2` / `^7.1.7` | Aligned |
| `lucide-react` | `^1.72.0` | — | `^1.72.0` | `1.66.0` | Keep `^1.72.0` (superset; verify M3 icon names) |
| `react-feather` | `^2.0.10` | `^2.0.10` | `^2.0.10` | — | Aligned |
| `nspell` + `dictionary-en` | `^2.1.5` + `^4.0.0` | — | `^2.1.5` + `^4.0.0` | `^2.1.5` + `^4.0.0` | Aligned |
| **`html2canvas`** | **MISSING** | `^1.4.1` | — | `^1.4.1` | **ADD** (used by M1/M3 PDF export fallback) |
| **`jspdf`** | **MISSING** | `^4.2.1` | — | `^4.2.1` | **ADD** (used by M1/M3 PDF export) |
| **`pdf-lib`** | **MISSING** | `^1.17.1` | — | `^1.17.1` | **ADD** (used by M3 Front-Pages PDF merge & page count) |
| **`pdfjs-dist`** | **MISSING** | `^4.10.38` | — | `^4.10.38` | **ADD** (used by M1 POS Viewer & M3 `PdfViewer.jsx`) |
| **`xlsx`** | **MISSING** | `^0.18.5` | — | — | **ADD** (used by M1 Course Assignment Excel export/preview) |
| **`harper.js`** | **MISSING** | — | — | `^3.2.0` | **ADD** (used by M3 `reviewGate.js` comment grammar check) |
| Tailwind / PostCSS | None | None | None | None | **None of the 3 branches use Tailwind** — 100% Sass/SCSS modules + CSS tokens |
| Google Fonts (`Poppins`, `Manrope`) | `@import` in `src/index.css` | `@import` in `src/index.css` | `@import` in `src/index.css` | `@import` in `src/index.css` | Move `<link>` preload to `index.html` + retain CSS `@import` fallback |
| `src/styles/tokens.css` | **MISSING** | — | — | 146-line OKLCH token sheet | **ADD** (scoped cleanly for M3 components & shared shell) |
| `src/App.css` | **MISSING** | `.appPage` | `.appPage` | `.appPage`, `.routeLoading`, `.resizeVeil` | **RESTORE** |

---

### 1.2 Exact Root Causes of Broken Styling & Black Buttons

#### Root Cause #1 — Specificity Escalation in `integrated-lpms/client/src/index.css:40–122` (THE BLACK BUTTON BUG)
In both original Composition and original Course Assignment, Vite's default boilerplate rules (`button { background-color: #1a1a1a; padding: 0.6em 1.2em; border-radius: 8px; }`, `a { color: #646cff; }`, `h2`, `table`, `th`, `td`, `tbody`) sat at bare element specificity **`(0, 0, 1)`**. Every single-class CSS Module selector (e.g. `.flipBtnFront`, `.save`, `.importPrevBtn`, `.mainAddBtn`, `.aiSuggestBtn`, `.closeButton`, `.submit`) had specificity **`(0, 1, 0)`**, so CSS Modules always won.

When `integrated-lpms/client/src/index.css` prefixed those boilerplate rules with `.composition-scope`:
- `.composition-scope button` jumped from `(0, 0, 1)` → **`(0, 1, 1)`**
- `.composition-scope button:hover` jumped from `(0, 1, 1)` → **`(0, 2, 1)`**
- `.composition-scope a` jumped from `(0, 0, 1)` → **`(0, 1, 1)`**
- `.composition-scope table / th / tbody / td` jumped from `(0, 0, 1)` → **`(0, 1, 1)`**
- `.composition-scope thead tr / tbody tr` jumped from `(0, 0, 2)` → **`(0, 1, 2)`**

Because **`(0, 1, 1) > (0, 1, 0)`**, **almost every single-class `<button>` and `<a>` across all 21 Composition `.module.sass` files was overridden with solid black `#1a1a1a` backgrounds, `#646cff` hover borders/links, and bloated `0.6em 1.2em` padding**.

**Specific Composition UI elements directly broken by this bug:**
- **Dashboard (`Dashboard.module.sass`):** `.flipBtnFront`, `.flipBtnBack`, inactive `.controlItem` tabs, `.miniActionBtn`
- **Assigned Courses (`CoursesTable.module.sass`):** inactive `.toggleBtn`, `.info`, `.listExportBtn`, `.gridExportBtn`, `.toggleDetailsBtn`
- **Syllabus (`SyllabusSections.module.sass`, `SyllabusPreview.module.sass`, `Revisions.module.sass`):** `.return` link, `.closeButton`, `.submit`, `.btnConfirmDark`
- **Forms (`FormNavigation`, `TopicSelector`, `ReferencePicker`, `ColumnValidationBar`, `Form`, `ImportPreviousModal`, `AddRecordModal`):** `.save`, `.importPrevBtn` (green→black), `.mainAddBtn` (blue→black), `.aiSuggestBtn` (gradient→black), `.searchPrevToggleBtn`, `.continueTopicBtn`, `.tab`, `.segmentWarningBtn`, `.roleFilterTrigger`, `.btnCancel`, `.btnPrimary`

**Fix (Phase 2):**
1. Delete the Vite default dark button/link boilerplate (`background-color: #1a1a1a`, `#646cff`) entirely from global CSS.
2. Wrap all scope-specific element defaults in **zero-specificity `:where(.lpms-composition-scope)` / `:where(.lpms-core-scope)`** so element defaults have specificity **`(0, 0, 1)`** and can NEVER override CSS Module classes (`(0, 1, 0)`) while staying 100% isolated between shells.

#### Root Cause #2 — Replaced Composition Skeleton & Lost `* { padding: 0 }` Reset
- `integrated-lpms/client/src/modules/composition/layouts/Skeleton.jsx`, `components/Header.jsx`, and `components/SideNavigation.jsx` were replaced with stubs rendering the generic dark `UnifiedShell` (`#141923` dark navy sidebar + red gradient header + per-module badges).
- Bypassing `Skeleton.module.sass` also dropped its `* { padding: 0 }` reset and `#F3F4F6` frame gutters (`10px` / `6px`), causing misaligned lists/inputs and unwanted `overflow: auto` scrolling.
- Meanwhile, Composition's original `Skeleton.module.sass`, `SideNavigation.module.sass`, `Header.module.sass`, `NotificationBell.jsx`, `NotificationBell.module.sass`, `ConfirmModal.jsx`, and `unclogo.png` are still present and byte-identical in `integrated-lpms/client/src/modules/composition/` — just unimported.

#### Root Cause #3 — Unscoped Global Leaks Inside Module Sass Files & Portal Escapes
- `CoursesTable.module.sass:175` (Composition) contains unscoped `::-webkit-scrollbar { display: none }` which hides scrollbars app-wide once loaded.
- `SyllabusSections.module.sass:115` and `SyllabusPreview.module.sass:120` contain unscoped `section { width: 100%; height: 100%; display: flex; overflow: auto }`.
- Portaled modals (`createPortal(..., document.body)` in `ReferenceForm`, `ColumnValidationBar`, `SpellCheckInput`, `DialogBackdrop`, `Select`, `NotificationBell`) render outside `.composition-scope`, so shared base tokens/fonts must live cleanly on `:root` while modal classes carry explicit styling.

#### Root Cause #4 — Generic Dark Wrapper (`UnifiedShell.css`) & Redesigned Login (`LoginPage.jsx`)
- `UnifiedShell.css` imposed a dark navy `#141923` sidebar with red gradient branding and artificial `.lpms-nav-mod-tag` module badges (`Course Assignment`, `Submissions`, `Composition`) that do not exist in any of the 3 authentic UNC-LPMS modules.
- `LoginPage.jsx` replaced Course Assignment's clean `400px` centered white card (`Login.module.sass` on `#F3F4F6` canvas) with a red-black gradient split page.

---

## 2. Full Page & Section Parity Matrix

### 2.1 Track A — Learning Plan Composition (`modules/composition/` — PRIORITY MODULE)

**Integrity Verdict:** All **9 pages**, **27 non-shell components**, **21 `.module.sass` files**, **5 helper services**, and `assets/unclogo.png` are **100% present and byte-identical** to `_ref_ui_audit/composition/`. **ZERO pages or sections were lost.**

| File in `modules/composition/` | Status vs. Original | Cause of Visual / Functional Regression | Phase 3 & 4 Fix |
| :--- | :--- | :--- | :--- |
| `layouts/Skeleton.jsx` | **OVERWRITTEN** (stub → `UnifiedShell`) | Replaced `#F3F4F6` light frame + `90px` hover rail with dark `#141923` `UnifiedShell`; dropped `Skeleton.module.sass` import | Restore original `Skeleton.jsx` + `.lpms-composition-scope` wrapper |
| `components/SideNavigation.jsx` | **OVERWRITTEN** (stub → `UnifiedSidebar`) | Replaced compact white icon rail (`unclogo.png` + `LPMS`, `Dashboard` / `Learning Plans`, red `Log Out` + `ConfirmModal`) | Restore original `SideNavigation.jsx` wired to `/instructor/dashboard`, `/instructor/assigned-courses`, and unified `logout()` |
| `components/Header.jsx` | **OVERWRITTEN** (stub → `UnifiedHeader`) | Replaced clean white `70px` header (user `LASTNAME, FIRSTNAME`, crimson role, rich `NotificationBell.jsx` popover) | Restore original `Header.jsx` + `NotificationBell.jsx` (plus unobtrusive role-switch dropdown if user has >1 role, e.g., Olivia Vance) |
| `services/currentUser.jsx` | Shimmed → `AuthContext.jsx` | Working — keep | Keep & ensure `name`, `role`, `roles`, `user`, `logout`, `switchRole` match |
| `utils/api.js` | Shimmed → `shared/api.js` | Working — keep | Keep |
| `utils/spellChecker.js` | Path-adjusted `../../../../node_modules/dictionary-en` | Working — keep | Keep |
| All 9 pages & 27 non-shell components (`Dashboard`, `AssignedCourses`, `Syllabus`, `TopicForm`, `TLAForm`, `ReferenceForm`, `CoursesTable`, `SyllabusSections`, `CourseDetails`, `OutcomeAlignment`, `ILOs`, `CriteriaForGrading`, `CourseCoverage`, `ReferenceSummary`, `SyllabusPreview`, `Revisions`, `AiTopicSuggestModal`, `ImportPreviousModal`, `ReferencePicker`, etc.) | **100% BYTE-IDENTICAL** | Styled incorrectly ONLY because of `.composition-scope` specificity escalation in `index.css` & missing `Skeleton.module.sass` reset | Zero page logic changes needed; fixed automatically in Phases 2–4 |

---

### 2.2 Track B1 — Course Assignment Module (`modules/course-assignment/`)

**Verdict:** All **10 current pages** in `integrated-lpms/client/src/modules/course-assignment/` are bare, simplified CRUD rewrites. **100% of original folders (`assets/dept-logos/`, `assets/unc-seal-official.png`, `components/`, `components/vmgo/`, `data/`, `services/`, `styles/`, `utils/`) are MISSING** and must be transplanted verbatim from `_ref_ui_audit/course-assignment/src/`.

| Original Page & Route (`course-assignment`) | Current Simplified File (`integrated-lpms`) | Lost Original Sections, Tabs, Modals, Widgets & Sub-Components | Working Unified API Endpoints to Preserve via Adapters |
| :--- | :--- | :--- | :--- |
| **`pages/Login.jsx`** (+ `SetPassword.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `ChangePassword.jsx`, `PasswordLinkPage.jsx`, `PasswordFields.jsx`, `Login.module.sass`) `/login`, `/forgot-password`, `/reset-password`, `/set-password`, `/change-password` | `shared/LoginPage.jsx` | Centered `400px` white card on `#F3F4F6` backdrop, `Brand` (`72px` UNC logo + University title), UNC email auto-domain completion (`@unc.edu.ph`), password visibility toggle, `ContinueAs` multi-role picker screen, Forgot/Reset/Set/Change password flows with live `PasswordChecklist` | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/switch-role`, `POST /api/auth/change-password`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET/POST /api/auth/invitations/:token`, `GET /api/auth/demo-accounts` |
| **`pages/AcademicTerms.jsx`** (inside `OVPAA.jsx` `?page=Dashboard`) `/vpaa/academic-terms` | `AcademicTermsPage.jsx` (bare table + add form) | **4-Panel Dashboard Grid:** (1) Current Term hero card (`64px` year display, live term progress bar, `calendarChecks`, `Edit` / `Update Term` morphing formCard with `SchoolCalendarFill` PDF calendar auto-fill & `SchoolCalendarLink`), (2) Past Academic Terms scrollable list with `DimOverlay` focus mechanic & inline view/edit/reopen, (3) Submitted Learning Plan per-department bar chart, (4) Submitted TOS per-department bar chart | `GET /api/academic-periods`, `POST /api/academic-periods`, `PUT /api/academic-periods/:id`, `POST /api/academic-periods/:id/close`, `POST /api/academic-periods/:id/reopen`, `DELETE /api/academic-periods/:id`, `GET /api/school-calendars` |
| **`pages/HRStaff.jsx`** (inside `OVPAA.jsx` `?page=Department List`) `/vpaa/departments` | `DepartmentsPage.jsx` (bare table) | `PeriodSelector`, `DepartmentsTable` (sortable columns, `AccessChip` Dean invitation status, `RowActionsMenu`), `UploadPreviewFlow` (Excel dry-run preview & confirm), `UndoUploadButton` (30s countdown undo), `ReconciliationModal` (missing dept unlisting), `AddRecordModal`, `EditEntityModal`, `ViewArchivedButton` + `PageArchive`, `ConfirmModal`, status banners | `GET /api/departments`, `POST /api/departments`, `PUT /api/departments/:id`, `POST /api/departments/:id/unlist`, `POST /api/departments/:id/invite-dean`, `DELETE /api/departments/:id`, `GET /api/archive`, `GET /api/imports` |
| **`pages/OVPAAUniversityStatements.jsx`** (`?page=University VMGO`) `/vpaa/university-vmgo` | `UniversityVmgoPage.jsx` (plain form) | Authentic UNC `StatementsDocument` layout (`UNIVERSITY` bar, Vision, Mission, Educational Policy, numbered Core Values, Graduate Attributes), `HistoryPanel` (versioned snapshots with View & Restore), `PickerDialog` (PDF upload), `ReviewDialog` (side-by-side extracted vs. current diff with `Changed` badges & `ListEditor`), `VersionDialog`, `RestoreConfirm`, `VmgoStatements.module.sass` | `GET /api/university-statements`, `POST/PUT /api/university-statements` |
| **`pages/OVPAALearningPlan.jsx` + `OVPAARepository.jsx`** (`?page=Learning Plan`) `/vpaa/approved-plans` | `SubmissionsQueuePage.jsx` (`approved-only`) | `DepartmentRepositoryGrid` (department cards with official `assets/dept-logos/*.png` crests & approved counts + `LogoUploadModal`), in-page cross-fade drill-down to `ApprovedFileTable` + `DocumentViewerModal` (or combined cleanly with M3's `ApprovalCoursesTable` Approved Plans + Export — see Section 3!) | `GET /api/assignments?stage=approved`, `GET /api/departments`, `GET /api/assignments/:pcId/export-bundle` |
| **`pages/DeanFaculty.jsx`** (inside `Dean.jsx` `?page=Faculty`) `/dean/faculty` | `DeanFacultyPage.jsx` (bare table) | `PeriodSelector`, `FacultyTable` (sortable, `AccessChip`, `RowActionsMenu`), `FacultyDetailModal` (full profile + teaching load), `TeachingLoadDialog`, Role filter dropdown, **`Invite all`** bulk button + per-row Invite/Resend, `UploadPreviewFlow`, `UndoUploadButton`, `ReconciliationModal`, `AddRecordModal`, `EditEntityModal`, `ViewArchivedButton` + `PageArchive`, `ConfirmModal` | `GET /api/faculty`, `POST /api/faculty`, `PUT /api/faculty/:id`, `POST /api/faculty/:id/invite`, `POST /api/faculty/:id/inactivate`, `DELETE /api/faculty/:id`, `GET /api/archive` |
| **`pages/DeanPrograms.jsx`** (inside `Dean.jsx` `?page=Programs`) `/dean/programs` | `DeanProgramsPage.jsx` (bare table) | `PeriodSelector`, `ProgramsTable` (sortable, Program Head searchable dropdown filtered to active Program Heads, `RowActionsMenu`), **`ProgramOfStudyViewer`** (view kept POS PDF per program), `UploadPreviewFlow`, `UndoUploadButton`, Post-upload unmatched-head review modal, `AddRecordModal`, `EditEntityModal`, `ViewArchivedButton` + `PageArchive`, `ConfirmModal` | `GET /api/programs`, `POST /api/programs`, `PUT /api/programs/:id`, `DELETE /api/programs/:id`, `GET /api/faculty`, `GET /api/curriculum-documents`, `GET /api/archive` |
| **`pages/DeanDepartmentStatements.jsx`** (`?page=Vision & Mission`) `/dean/vision-mission` | `DepartmentVisionMissionPage.jsx` (plain form) | Authentic `DepartmentDocument` card (`SCIS` header bar), `HistoryPanel` (previous versions + View/Restore), `PickerDialog` (PDF upload), `ReviewDialog` (side-by-side diff + `DEPARTMENT_MISMATCH` warning), `VersionDialog`, `RestoreConfirm`, `VmgoStatements.module.sass` | `GET /api/department-statements`, `POST/PUT /api/department-statements`, `GET /api/departments` |
| **`pages/ProgramHeadCourses.jsx`** (`/role/program-head/course-offerings`) `/program-head/course-offerings` | `CourseOfferingsPage.jsx` (flat table + form) | **Two-Level Curriculum Explorer:** (1) Program identity header (`BSIT: Course Offerings`, multi-program switcher, **`ProgramOfStudyChip`** + **`ProgramOfStudyViewer`**), (2) **Level-1 `YearCard` Grid** (1st–4th Year tiles with 2×2 stat grid: Courses, Units, Hrs/Week, Lec/Lab Units + `View Curriculum` CTA), (3) **Level-2 `CourseCard` Grid** (color-coded classification pills, credit/hrs-per-week worked-out pills, search & sort popover), (4) **Full-Page Course Detail View** (clickable prerequisite chips, worked-out `numberRows` table, Offerings list, Edit Lec/Lab modal, Archive/Restore drawer), (5) **Upload Course Offerings / Program of Study PDFs** (`UploadPreviewFlow`, `ProgramOfStudyFiles`, `ProgramOfStudyReconcile`, unresolved year-level popup, `UndoUploadButton`) | `GET /api/courses`, `GET /api/courses/prereq-options`, `POST /api/courses`, `PUT /api/courses/:id`, `DELETE /api/courses/:id`, `GET /api/programs`, `GET /api/curriculum-documents` |
| **`pages/ProgramHeadCourseAssignment.jsx`** (`/role/program-head/course-assignment`) `/program-head/course-assignment` | `CourseAssignmentsPage.jsx` (simple form + table) | Program identity header + switcher, **`PeriodSelector`**, **`ViewArchivedButton`**, **Interactive Progress Filter Pill Strip** (`X of Y courses assigned · N notified · M not notified`), **`YearFilter`** segmented pills with counts, Sortable 9-column table (`Course No.`, `Course Offering`, `Year Level`, `Lead Faculty` + sections + `DeliveryLine`, `Contributors` chips + `DeliveryIcon`, `Date Assigned`, `Last Updated`, `Official` status badge, `Status` pill), **`AddRecordModal`** with **`CoursePicker`** (year-grouped) & **`ContributorsPicker`**, **`EditEntityModal`** with **`HistoryTimeline`** & **`DeliveryPanel`**, **`OfficialCompareModal`** (compare pre-assignments vs. Registrar Subject Offerings Excel), **`UploadPreviewFlow`**, **`UndoUploadButton`**, `⋯` More Menu (`Re-validate`, **`Download Excel` (.xlsx)**, **`Download PDF`** UNC form) | `GET /api/course-assignments`, `GET /api/course-assignments/faculty-load`, `GET /api/course-assignments/history`, `POST /api/course-assignments`, `PUT /api/course-assignments/:id`, `DELETE /api/course-assignments/:id`, `GET /api/courses`, `GET /api/faculty`, `GET /api/academic-periods` |
| **`pages/ProgramHeadIndustryConsultant.jsx`** (`/role/program-head/industry-consultant`) `/program-head/industry-consultants` | `IndustryConsultantsPage.jsx` (bare table) | Program identity header + switcher, `PeriodSelector`, `ConsultantsTable` (with `AccessChip` invitation column, multi-course pills, `RowActionsMenu`), **`CourseTagPicker`** (year-filtered portal multi-select showing courses already taken by other consultants), `AddRecordModal` (searchable faculty picker + email validation), `ViewRecordModal`, `EditEntityModal`, `UploadPreviewFlow`, `UndoUploadButton`, `ViewArchivedButton`, `ConfirmModal` | `GET /api/industry-consultants`, `GET /api/industry-consultants/my-courses`, `POST /api/industry-consultants`, `PUT /api/industry-consultants/:id`, `POST /api/industry-consultants/:id/assign-course`, `DELETE /api/industry-consultants/:id`, `GET /api/courses`, `GET /api/faculty` |
| **`pages/UserAccounts.jsx`** (`Dean ?page=User Accounts`) | `UserAccountsPage.jsx` (VPAA only) | Dean-scoped faculty accounts & invitation status table, role filter pills (`All`, per-role, `Several roles`), `RoleChips`, `Held invitations` section, `Send/Resend invitation` & `Send password reset` dialogs | `GET /api/user-accounts`, `POST /api/user-accounts`, `PUT /api/user-accounts/:id`, `PATCH /api/user-accounts/:id/status`, `GET /api/audit-logs` |

**Missing M1 Folders to Transplant Verbatim (Phase 5):**
- `assets/` (`unc-seal-official.png`, `dept-logos/{CEA,CJE,COE,SBA,SCIS,SNAHS,SSNS}.png`)
- `components/` (all 46 M1-specific components + `components/vmgo/{useVmgoVersions.js, VmgoShared.jsx, vmgoUtils.js}`)
- `services/` (`period.jsx`, `periodLabel.js`, `useHeadProgram.js`, `statusPolicy.js`, `tableSort.js`, `courseTerm.js`, `assignmentTracking.js`, `programOfStudy.js`, `schoolCalendar.js`, `termCalendar.js`, `appToast.js`, `undoToast.js`, `dialogBackdrop.js`, `deptLogos.js`, `roles.js`, plus an **adapted `api.js`** wired to `integrated-lpms/server`)
- `styles/` (all M1 `.module.sass` sheets: `CoursesTable`, `AddRecordModal`, `DialogMotion`, `DocumentViewerModal`, `DropdownA`, `DropdownMenu`, `FacultyDetailModal`, `MultiSelectA`, `PeriodSelector`, `ReconciliationModal`, `SortableHeader`, `UploadPreviewFlow`, `VmgoStatements`, etc.)
- `utils/` (`assignmentProgress.js`, `exportAssignments.js`, `assignmentsPdfHtml.js`, `docPageHtml.js`, `nameCase.js`, `pdfExport.js`, `pdfjs.js`, `sanitize.js`, `sealDataUrl.js`, `teachingLoad.js`, `useDialogFocus.js`)

---

### 2.3 Track B2 — Learning Plan Submissions Management Module (`modules/submissions/`)

**Verdict:** All **5 current pages** in `integrated-lpms/client/src/modules/submissions/` are bare, simplified rewrites. **100% of original folders (`assets/mascot/`, `components/`, `styles/` incl. `tokens.css` & `ReferenceLibrary.module.scss`, `utils/`, `pages/lpsm/ProgramHead/`, `pages/lpsm/DirectorOfLibraries/`) are MISSING** and must be transplanted verbatim from `_ref_ui_audit/submissions/composition/client/src/`.

| Original Page & Route (`submissions`) | Current Simplified File (`integrated-lpms`) | Lost Original Sections, Tabs, Modals, Widgets & Sub-Components | Working Unified API Endpoints to Preserve via Adapters |
| :--- | :--- | :--- | :--- |
| **`pages/ProgramHead.jsx`**, **`DirectorOfLibraries.jsx`**, **`Dean.jsx`**, **`IndustryConsultant.jsx`**, **`VPAA.jsx`**, **`ApprovalCourses.jsx`** + **`components/ApprovalCoursesTable.jsx`** (`/program-head/learning-plans`, `/library/learning-plans`, `/dean/learning-plans`, `/vpaa/approved-plans`, `/consultant/learning-plans`) | `SubmissionsQueuePage.jsx` (single flat table) | **Rich Approver Queue (`ApprovalCoursesTable.jsx`, 597 L):** Pill status tabs (`Pending`, `Returned`, `Approved`, `Not submitted`) with live counts, School Year + Semester + Program `Select` filters, Search + List / Card-Grid (`ApprovalCard` with `Reveal` timeline drawer) toggle, **`Export all as ZIP`** batch exporter with progress & cancel, **`ApprovalDetailsPopup`** anchored click popover, **`PDFViewerModal`** with server PDF + `pdf-lib` front-page joining + `jspdf`/`html2canvas` fallback; **`NotSubmittedPanel.jsx` + `MissingSubmissionsTable.jsx`**: clickable per-program **Due Date status chips** (`green/amber/red`) opening **Due Date & Reminder Schedule Modal** (`DatePicker`, reminder-before day chips `14/7/5/3/2/1/0`, overdue cadence `Select`, live date preview), checkbox selection + `Remind selected`, per-row `Auto Reminders` toggle switch & `Remind now` | `GET /api/assignments`, `GET /api/assignments/waiting-on-me`, `GET /api/term-deadlines`, `POST/PUT /api/term-deadlines`, `GET /api/missing-submissions`, `POST /api/reminders/:pcId/toggle-pause`, `POST /api/reminders/:pcId/send-now`, `POST /api/assignments/:pcId/start-revision`, `POST /api/assignments/:pcId/carry-over`, `GET /api/assignments/:pcId/export-bundle` |
| **`pages/ApprovalSyllabus.jsx`** + **`components/ApprovalSyllabusSections.jsx`** (1,464 L) `/submissions/review/:pcId` | `LearningPlanReviewPage.jsx` (500 L simplified view) | **Full Approver Review Workbench:** Top `.navi` bar with role-gated Section `Select` (`sectionAccess.js`: LD sees References only; IC sees Details/Alignment/Coverage; PH/Dean/VPAA see all 5), **5-second Undo countdown Approve/Accept button**, `Return with comments` → **`ApprovalCommentBox.jsx`** (900px multi-comment builder with CO/Week/Coverage/Target multi-select, Comment Type, live spell/grammar check via `harper.js`/`nspell`, duplicate check; **Director of Libraries 2-tab mode**: `Comment on references` + `Suggest from library` searchable catalog cards!), PH **`with_program_head` triage bar** (`Forward to instructor` + **`SendBackDialog.jsx`**), **`ApprovalChainStatus.jsx`** horizontal chip band, **"What changed since the return"** → **`PlanChangesDialog.jsx`** diff modal, collapsible `.info-line` strips (**`PlanChecks.jsx`**, **`VersionHistory.jsx`**, **`EarlierConsultantNotes.jsx`**), **`CommentsSidebar.jsx`** (`28px` rail + `380px` sliding panel with review-round grouping, amber suggested-reference callouts & jump-to-section highlight), `⋮` overflow menu (**`Revisions.jsx`** 95vw split comparison modal, **`ConsultantDialog.jsx`**, **`ConsultantReview.jsx`** `Suggest & Sign`, **`FutureSuggestions.jsx`**, **`Review Record`** PDF export, **`PDFViewerModal.jsx`**) | `GET /api/assignments/:pcId/workflow`, `POST /api/assignments/action`, `GET /api/assignments/:pcId/checks`, `GET /api/assignments/:pcId/review-record`, `GET /api/assignments/:pcId/signatures`, `GET /api/course-details/:pcId/:rev`, `GET /api/course-outcome-alignment/:pcId/:rev`, `GET /api/course-coverage/:pcId/:rev`, `GET /api/course-criteria/:pcId/:rev`, `GET /api/courses/:pcId/:rev/references`, `GET /api/comments/offering/:pcId`, `POST /api/comments`, `GET/POST /api/comments/suggestions/:pcId`, `GET /api/course-consultants`, `POST /api/course-consultants/signoff/:pcId`, `GET /api/revisions/:pcId` |
| **`pages/lpsm/ProgramHead/OutcomesAlignment.jsx`** + **`PoPeoAlignment.jsx`** + **`CoPoAlignment.jsx`** + **`COAEPView.jsx`** `/program-head/program-documents` | `ProgramDocumentsPage.jsx` (basic 2-card JSON paste form) | **4-Tab Program Documents Workspace:** (1) **`Front pages`**: `DocumentBar` (`Upload/Replace/Remove`) + embedded **`PdfViewer.jsx`** (`pdfjs-dist` canvas renderer with zoom/pages/fullscreen), (2) **`PO and PEO`**: inline-editable PEO×Mission and PO×PEO×GA matrices (`.alignTable.plain`), `TemplateButton`, Excel/PDF Upload, OCR/AI **`Scan`**, `Read from front pages`, Export PDF; (3) **`CO and PO`**: offering picker, `CourseDocumentBar`, **`ScanReviewModal.jsx`** (1180px split PDF/image preview + editable I/E/D grid), collapsible PO legend, Export PDF; (4) **`COAEP`**: offering picker, `CourseDocumentBar`, **`ScanReviewModal.jsx`**, amber `"Draft – not approved"` banner, COAEP header metadata bar, `HeadBodyTable` CO/ILO/IED/Assessment/Performance Target matrix, Export Excel & Export PDF | `GET/PUT /api/program-outcomes`, `GET/POST/DELETE /api/programs/:programId/front-page`, `GET/POST /api/course-documents`, `GET/POST /api/course-documents/:pcId/coaep`, `GET /api/form-settings`, `PUT /api/form-settings/:formKey`, `GET /api/programs`, `GET /api/assignments?scope=all`, `GET /api/course-outcome-alignment/:pcId/:rev` |
| **`pages/lpsm/DirectorOfLibraries/DirectorDashboard.jsx`** `/library/dashboard` | `LibraryDashboardPage.jsx` (4 plain stat boxes) | Authentic 2-card `DirectorDashboard` (`max-width: 1100px`): (1) **Waiting for Your Review** ordered longest-waiting-first with amber `.waitLong` (`>= 3 days`) badges & direct review links, (2) **Reference Library Health** 2-column `.libraryGrid` (active titles + per-type breakdown on left; itemized attention breakdown — unavailable, outdated `>= N yrs`, missing year, missing/invalid ISBN, missing link — on right) + `EmptyState` mascot | `GET /api/assignments/waiting-on-me`, `GET /api/references/health`, `GET /api/references`, `GET /api/references/types`, `GET /api/catalog-settings` |
| **`pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx`** (825 L) + **`AddReference.jsx`** + **`ViewReference.jsx`** `/library/references` | `ReferenceRepositoryPage.jsx` (flat table + basic modal) | **3-Column Discovery Workbench (`190px \| 1fr \| 260px`):** (1) **Top Bar**: `Title requests` badge → **`TitleRequestsPanel.jsx`** (pending/answered requests, `Add to library` prefill, `Decline` w/ reason), `Catalog rules` → **`CatalogRulesDialog.jsx`** (recency years, enforce recency/holdings toggles), `Import CSV` → **`ImportPreviewModal.jsx`** (dry-run Valid/Duplicate/Invalid preview), `Add reference` → **`AddReferenceModal.jsx`** (`ReferenceFields.jsx` + `useReferenceForm.js` dynamic type fields + **ISBN Lookup**), Saved Views `Select`, List/Courses-Grid toggle, Active Filter Chips bar, Health Banner; (2) **Left Facet Rail**: Dept→Program→Course tree facet, Reference Type, Publication Year, Status; (3) **Center Results Pane**: Sortable paginated table w/ amber recency-issue dot + Courses Grid mode; (4) **Right Preview Pane**: Full metadata `<dl>`, `"Add missing details"`, **Courses Filing chips** (attach/detach course), **`Used in plans`** deep links, Edit & Archive/Restore; plus standalone `AddReference` & `ViewReference` views | `GET /api/references/types`, `GET /api/references/health`, `GET /api/references`, `POST /api/references`, `PUT /api/references/:id`, `PATCH /api/references/:id/archive`, `DELETE /api/references/:id`, `GET/POST /api/course-references`, `GET/PUT /api/catalog-settings`, `GET/POST /api/title-requests`, `PUT /api/title-requests/:id`, `GET /api/assignments` |
| **`pages/UserAccounts.jsx`** (`UserAccountsPanel` — VPAA & Superuser) `/vpaa/user-accounts` | `UserAccountsPage.jsx` | Sortable `UserAccountsPanel` with Role/Status filters, `PageSearch`, Invitation status badges, Create/Edit `.managementDialog` (multi-role checkboxes, Dept + Headed Programs multi-select), Send/Resend invitation, Send reset link, Temporary password reveal, Enable/Disable | `GET /api/user-accounts`, `POST /api/user-accounts`, `PUT /api/user-accounts/:id`, `PATCH /api/user-accounts/:id/status`, `GET /api/audit-logs` |
| *(Note: M3's `ProgramHead/CourseAssignment.jsx` is superseded by M1's full `ProgramHeadCourseAssignment.jsx` which already includes `OfficialCompareModal` + `ContributorsPicker` + `HistoryTimeline` + `DeliveryPanel` + Excel/PDF exports!)* | — | M1's Course Assignment page is strictly richer; no need to duplicate M3's lighter version | Unified `/api/course-assignments*` |

**Missing M3 Folders to Transplant Verbatim (Phase 6):**
- `assets/mascot/` (`reading`, `thinking`, `worried`, `happy` `.webp`/`.png`)
- `components/` (all 28 LPSM components + 25 shared primitives like `Select`, `DatePicker`, `DropdownMultiSelect`, `TableScrollRegion`, `SortableTh`, `HeadBodyTable`, `PageSearch`, `EmptyState`, `Mascot`, `LoadingSkeleton`, `Reveal`, `AppDialog`, `Toaster`, `SettingsModal`, `SignatureTab`, `FullscreenToggle`)
- `pages/lpsm/ProgramHead/` & `pages/lpsm/DirectorOfLibraries/` & `pages/{ApprovalCourses,ApprovalSyllabus,UserAccounts}.jsx`
- `styles/` (`tokens.css` + all 25 LPSM `.module.sass`/`.module.scss` stylesheets)
- `utils/` (all LPSM workflow/export/document/reference utilities, with **`api.js` & `session.js` adapted** to `integrated-lpms/server`)

---

## 3. Login Page, Dual-Skeleton Architecture & Unified Badge-Free Sidebar Plan

### 3.1 Login Page (`src/shared/auth/`)
- **Exact Transplant Source:** `_ref_ui_audit/course-assignment/src/pages/Login.jsx` + `src/styles/Login.module.sass` + `src/assets/unclogo.png` (+ `ForgotPassword.jsx`, `ResetPassword.jsx`, `SetPassword.jsx`, `ChangePassword.jsx`, `PasswordLinkPage.jsx`, `PasswordFields.jsx`).
- **Layout:** Clean `#F3F4F6` background, centered `400px` white card, `72px` UNC logo, `"University of Nueva Caceres"` / `"Learning Plan Management System"`, UNC email input with `@unc.edu.ph` auto-completion, password show/hide toggle, solid `#18191A` `Sign in` button, `"Forgot password?"` link, and authentic `"Continue as…"` multi-role picker card when a user has multiple roles.
- **Unobtrusive QA Helper:** A subtle footer trigger below `"Forgot password?"` (`Demo accounts` — muted `12px` text link) that toggles a compact collapsible drawer/popover to quick-fill any of the 6 seeded test accounts without altering a single pixel of the default Login card.

### 3.2 Dual-Skeleton Architecture

#### Skeleton 1 — Instructor Role (`CompositionSkeleton` in `modules/composition/layouts/Skeleton.jsx`)
- **Exact Transplant Source:** `_ref_ui_audit/composition/composition/client/src/layouts/Skeleton.jsx`, `components/SideNavigation.jsx`, `components/Header.jsx`, `components/NotificationBell.jsx`, `components/ConfirmModal.jsx`, and their 4 `.module.sass` stylesheets.
- **Visual Design:** `#F3F4F6` frame canvas (`10px` / `6px` gutters), `90px` compact white left hover-expanding (`280px`) icon rail with `unclogo.png` + `LPMS` / `Learning Plan Management System`, `70px` white top bar with user `LASTNAME, FIRSTNAME` + UNC crimson `#DC2626` role + `NotificationBell` (and if the user has multiple roles like Prof. Olivia Vance, clicking the user block opens the clean role-switcher dropdown to return to Program Head).
- **CSS Scope:** Wrapped in `.lpms-composition-scope` (using zero-specificity `:where(.lpms-composition-scope)` for element resets).

#### Skeleton 2 — ONE Unified Authentic Shell for All Non-Instructor Roles (`CoreShell` in `src/shared/CoreShell.jsx`)
- **Recommended Base Source:** **Submissions Management's light `Skeleton` + `SideNavigation` + `Header` + `NotificationBell` + `SettingsModal` (`SignatureTab`) + `FullscreenToggle`** (which shares the exact UNC-LPMS visual language of Course Assignment's `SkeletonA`: `#F1F5F9` / `#F3F4F6` light canvas, white `268px` expanded / `90px` collapsible left sidebar with UNC logo + `Learning Plan Management System` + red `#F94545` `Log Out` button, `70px` white top header with `36px` dark `#1F2937` initials avatar + Account/Role-Switch/Settings/E-Signature dropdown + `FullscreenToggle` + rich 20-type `NotificationBell`, `10px`/`6px` gutters).
- **Why Submissions' Shell is ideal as the ONE shared non-instructor skeleton:**
  1. It already includes **E-Signature upload (`SettingsModal` → `SignatureTab`)** needed by Dean, Program Head, Library Director, and Industry Consultant for PDF exports, **Multi-Role Switcher** in the top-right account menu (same pattern as Course Assignment's `HeaderA`), **Fullscreen Focus Mode**, and the **collapsible `268px`/`90px` white rail** (comfortable for roles like Program Head and VPAA that have 5–6 combined sidebar items).
  2. It uses the exact same `#FFFFFF` sidebar + `#F1F5F9`/`#F3F4F6` frame + `#19282C`/`#18191A` ink + `#F94545` Log Out design system as Course Assignment — zero dark wrapper, zero visual clash.
- **CSS Scope:** Wrapped in `.lpms-core-scope` (with `tokens.css` variables scoped cleanly and zero-specificity `:where(.lpms-core-scope)` element defaults).
- **ZERO Artificial Module Headings or Badges:** No `COURSE ASSIGNMENT` / `SUBMISSIONS` / `COMPOSITION` group labels, pill tags, or module switcher buttons anywhere in the sidebar.

### 3.3 Combined, Badge-Free Sidebar Navigation Plan per Role

| Role | Shell | Unified Sidebar Items (Single Cohesive List — Zero Module Badges) |
| :--- | :--- | :--- |
| **Instructor** | Composition Skeleton (`90px` hover-expand white rail) | 1. `Dashboard` (`/instructor/dashboard`)<br>2. `Learning Plans` (`/instructor/assigned-courses`)<br>*(Bottom)* `Log Out` |
| **Program Head** | Shared Core Shell (light collapsible white rail) | 1. `Course Offerings` (`/program-head/course-offerings`)<br>2. `Course Assignment` (`/program-head/course-assignment`)<br>3. `Industry Consultants` (`/program-head/industry-consultants`)<br>4. `Program Documents` (`/program-head/program-documents` — 4 tabs: Front Pages, PO & PEO, CO & PO, COAEP)<br>5. `Learning Plans` (`/program-head/learning-plans` — Pending, Returned, Approved, Not Submitted & Due Dates)<br>*(Bottom)* `Log Out` |
| **Dean** | Shared Core Shell | 1. `Faculty` (`/dean/faculty`)<br>2. `Programs` (`/dean/programs`)<br>3. `Vision & Mission` (`/dean/vision-mission`)<br>4. `Learning Plans` (`/dean/learning-plans` — Final Review, Return, Approve & Export)<br>5. `User Accounts` (`/dean/user-accounts`)<br>*(Bottom)* `Log Out` |
| **VPAA** | Shared Core Shell | 1. `Academic Terms` (`/vpaa/academic-terms` — 4-panel Dashboard)<br>2. `Department List` (`/vpaa/departments`)<br>3. `University VMGO` (`/vpaa/university-vmgo`)<br>4. `Approved Plans` (`/vpaa/approved-plans` — Dept Repository / Approved LPs & Export)<br>5. `User Accounts` (`/vpaa/user-accounts`)<br>*(Bottom)* `Log Out` |
| **Director of Libraries** | Shared Core Shell | 1. `Dashboard` (`/library/dashboard`)<br>2. `Reference Library` (`/library/references`)<br>3. `Learning Plans` (`/library/learning-plans`)<br>*(Bottom)* `Log Out` |
| **Industry Consultant** | Shared Core Shell | 1. `Learning Plans` (`/consultant/learning-plans` — Approved Plans Review, Suggest & Sign-Off)<br>*(Bottom)* `Log Out` |

---

## 4. Backend Adapter Strategy & Potential Additive Route Flags (Preview for Phases 5–6)

Per Guardrail #3, `integrated-lpms/server/` stays **READ-ONLY by default** and **no restored UI section will be deleted or simplified**. Most differences (such as `PATCH` vs `PUT`, `period_id` vs `academic_period_id`, response envelope unwrapping `{ departments }` vs `[...]`, `/api/assignments/offering/:pcId/workflow` vs `/api/assignments/action`) will be handled cleanly in **frontend service adapters** (`modules/course-assignment/services/api.js` and `modules/submissions/utils/apiAdapter.js`).

**Potential Server-Only Features to Flag (Only if Needed in Phases 5–6):**
1. **M1 Bulk Spreadsheet Dry-Run Upload / Undo / Official Subject Offerings Compare / VMGO PDF Extraction / School Calendar PDF Extraction** (`POST /*/upload?preview=1`, `POST /api/imports/:id/undo`, `POST /api/course-offering-assignments/compare-official`, `POST /api/*-statements/extract`, `POST /api/school-calendars`) — currently `integrated-lpms/server` exposes CRUD + `GET /api/imports` & `GET /api/school-calendars`, not the file-parsing sub-routes.
2. **M3 Server-Side Headless-Chrome PDF/ZIP Render, OCR/AI Scan & Reference CSV Import / ISBN Lookup** (`POST /api/export/pdf`, `POST /api/export/zip`, `POST /api/course-documents/:pcId/*/scan`, `GET /api/references/isbn/:isbn`, `POST /api/references/import`, `GET /api/plan-changes/:pcId`) — note that M3's `PDFViewerModal` already has a built-in **client-side `html2canvas` + `jspdf` + `pdf-lib` fallback** that works without headless Chrome!

During Phases 5 and 6, every restored UI section will be transplanted intact and wired through adapters first; any specific endpoint that truly has no backend equivalent will be explicitly flagged at that phase's stop gate for your approval before adding any non-breaking backend route.


---

## UI PHASE 2: GLOBAL CSS, FONTS, TOKENS & DEPENDENCIES FOUNDATION

**Completed:** 2026-11-28  
**Build Verification:** `npm.cmd run build` — **PASS** (`✓ 2573 modules transformed`, built in `5.11s`, zero errors)

### Changes Made
1. **Dependencies (`integrated-lpms/client/package.json` + `npm.cmd install`):**
   - Added the 6 missing client packages required by verbatim Course Assignment & Submissions Management modules:
     - `harper.js@^3.2.0` (Submissions comment grammar checking)
     - `html2canvas@^1.4.1` & `jspdf@^4.2.1` (client-side PDF export & fallback)
     - `pdf-lib@^1.17.1` (Front-Pages PDF merge & page count)
     - `pdfjs-dist@^4.10.38` (POS Viewer & `PdfViewer.jsx` canvas rendering)
     - `xlsx@^0.18.5` (Course Assignment Excel export/preview)
   - Installed cleanly (`+43 packages`, exit code `0`).
2. **Fonts (`integrated-lpms/client/index.html`):**
   - Added Google Fonts `preconnect` and `<link rel="stylesheet">` preloads for `Poppins` and `Manrope`, and set title to `UNC — Learning Plan Management System`.
3. **Design Tokens & App Sheet (`src/styles/tokens.css`, `src/App.css`, `src/main.jsx`):**
   - Created `src/styles/tokens.css` (OKLCH surface/ink/status/radius/spacing custom properties on `:root`, zero element rules — safe across all modules & React Portals).
   - Created `src/App.css` restoring `.appPage`, `.resizeVeil` / `.resizeVeilActive`, and scoping Submissions' custom single-select chevron strictly to `:where(.lpms-submissions-scope) select:not([multiple])` and `select.app-select:not([multiple])` so Composition and Course Assignment native selects remain unaffected.
   - Imported `./App.css` in `src/main.jsx`.
4. **Zero-Specificity Global CSS Overhaul (`src/index.css`):**
   - **Deleted Vite boilerplate completely:** Removed `background-color: #1a1a1a` button fills and `#646cff` link/border overrides.
   - **Zero-specificity `:where(...)` module scopes:** Replaced specificity-escalated `.composition-scope button` `(0,1,1)` rules with `:where(.lpms-composition-scope, .composition-scope) :where(...)` `(0,0,0)` so CSS Module classes `(0,1,0)` always win across all 21 Composition `.module.sass` files.
   - Added isolated zero-specificity `:where(.lpms-ca-scope)` and `:where(.lpms-core-scope, .lpms-submissions-scope)` element layers plus portal-safe utility primitives (Course Assignment dashboard/picker animations; Submissions `.app-*`, `.btn-*`, `[data-table-region]`, `.reveal`, `.info-line`, `[data-flash]`, fullscreen exit bar; full Composition `.matrix-*` classes with all `:hover`/`:focus`/`:focus-visible` states restored; consistent 8px custom scrollbars).

---

## UI PHASE 3: LOGIN PAGE (COURSE ASSIGNMENT UI) & DUAL-SKELETON SHELLS

**Completed:** 2026-11-28  
**Build Verification:** `npm.cmd run build` — **PASS** (`✓ 2620 modules transformed`, built in `5.74s`, zero errors)

### Changes Made
1. **Shared Assets & Styles (`src/assets/`, `src/shared/shell/`):**
   - Transplanted `unclogo.png` and all 4 owl mascot poses (`happy`, `reading`, `thinking`, `worried` in both `.png` and `.webp`) to `src/assets/`.
   - Transplanted authentic light-shell Sass modules to `src/shared/shell/`: `CoreSkeleton.module.sass`, `CoreSideNavigation.module.sass`, `CoreHeader.module.sass`, `NotificationPanel.module.sass`, `SettingsModal.module.sass`, `DueDateDialog.module.sass`, `Toast.module.sass`.
2. **Exact Course Assignment Login & Password Flow (`src/shared/auth/`):**
   - Transplanted verbatim `Login.jsx` + `Login.module.sass` (grey `#FAFAFA` canvas, centered white card, `unclogo.png`, `Learning Plan Management System` + `University of Nueva Caceres`, crimson `#DC2626` primary CTA, show/hide password eye icon, forgot-password link) wired directly to unified `AuthAPI.login`.
   - Kept dev/QA test-account quick-fill strictly inside an unobtrusive collapsible `Demo accounts` footer drawer (closed by default) so the authentic Login card layout stays 100% untouched.
   - Transplanted full password lifecycle pages: `ForgotPassword.jsx`, `PasswordLinkPage.jsx` (`ResetPassword`, `SetPassword`), `ChangePassword.jsx`, `PasswordFields.jsx`, `authRules.js`.
   - Added `AuthAPI.resetPassword`, `AuthAPI.invitation`, `AuthAPI.acceptInvitation` in `src/shared/api.js` and `display_name` / `signIn` / `setActiveRole` in `src/shared/AuthContext.jsx`.
3. **Instructor Shell — Original Learning Plan Composition Skeleton (`src/modules/composition/`):**
   - Restored exact original `layouts/Skeleton.jsx` (wrapped with `.lpms-composition-scope`), `components/SideNavigation.jsx` (`90px` compact white left icon rail expanding on hover, UNC logo + `LPMS`, `Dashboard` & `Learning Plans`, red `Log Out` with `ConfirmModal`), and `components/Header.jsx` (`70px` white top bar, `LASTNAME, FIRSTNAME` + crimson role + `NotificationBell.jsx`, with an unobtrusive click-to-switch-role dropdown shown only if an Instructor also holds another role).
   - Scoped `styles/Skeleton.module.sass` `* { padding: 0 }` to `:where(.main-layout *) { padding: 0 }` so Composition preserves its exact zero-specificity padding reset without leaking into `CoreShell` or `Login`.
4. **ONE Unified Authentic Light Shell for All Non-Instructor Roles (`src/shared/shell/` + `src/shared/CoreShell.jsx`):**
   - Replaced the dark `#141923` wrapper (`src/shared/UnifiedShell.jsx` now delegates to `CoreShell`) with one authentic light collapsible shell (`268px` / `90px` white rail, `70px` white top bar, red `#F94545` Log Out + `SignOutDialog`) shared across **VPAA**, **Dean**, **Program Head**, **Director of Libraries**, and **Industry Consultant**.
   - Built unified shell utilities: `CoreSkeleton.jsx`, `CoreSideNavigation.jsx`, `CoreHeader.jsx` (initials avatar, multi-role popover switcher when `roles.length > 1`, Settings / E-Signature modal trigger, `FullscreenToggle`, `CoreNotificationBell`), `SettingsModal.jsx` + `SignatureTab.jsx` (wired to unified `POST/GET/DELETE /api/profile/signature`), `AppDialog.jsx` (combined component + imperative `confirmDialog`/`confirmDiscard`/`alertDialog` to prevent Windows case-insensitive filename collisions), `Toaster.jsx` + `toast.jsx`, `Mascot.jsx`.
5. **Badge-Free Unified Sidebar Navigation & Routing (`src/shared/navConfig.js`, `src/App.jsx`):**
   - Flattened `SIDEBAR_ITEMS` per role with **ZERO artificial per-module headings, pill badges, or module-origin switchers**.
   - Wired `/login`, `/forgot-password`, `/reset-password`, `/set-password`, `/change-password`, `/dean/user-accounts`, `/program-head/course-assignment` alias, and Composition's `.lpms-composition-scope` routes in `src/App.jsx`.

---

## UI PHASE 4: LEARNING PLAN COMPOSITION STYLING, SASS ISOLATION & BELL VERIFICATION (TRACK A)

**Completed:** 2026-11-28  
**Build Verification:** `npm.cmd run build` — **PASS** (`✓ 2620 modules transformed`, built in `5.03s`, zero errors, zero Sass warnings)

### Forensic Parity Verification
- Diffed all **12 pages** (`pages/`) and **33 non-shell components** (`components/`) in `src/modules/composition/` against `_ref_ui_audit/composition/composition/client/src/`: **100% byte-for-byte identical**, preserving every section, modal, form, spell-checker, AI topic suggester, reference picker, and cross-module data binding.
- Verified all standalone form routes (`/tlas/form/:iloId/:status`, `/references/form/:iloId/:status`) are wrapped in `.lpms-composition-scope` in `src/App.jsx`, while Skeleton-based routes (`/instructor/dashboard`, `/instructor/assigned-courses`, `/courses/:pcId/:revNum/:status`, `/topics/form/:iloId/:status`) inherit `.lpms-composition-scope` directly from `modules/composition/layouts/Skeleton.jsx`.

### Changes Made
1. **Eliminated All 6 Unscoped Global CSS Leaks Across Composition `.module.sass` Files:**
   - `CoursesTable.module.sass`: scoped bare `select option` → `.courses-table select option` and bare `::-webkit-scrollbar { display: none }` → `.table-container::-webkit-scrollbar, .gridContainer::-webkit-scrollbar` (preventing global scrollbar disappearance across Course Assignment and Submissions).
   - `ReferencePicker.module.sass`: scoped bare `a` → `.container a`.
   - `SyllabusSections.module.sass`: scoped bare `section` → `.container section`.
   - `SyllabusPreview.module.sass`: scoped bare `section` → `.container section, .modalContent section`.
   - `SyllabusRevisionsSections.module.sass`: scoped bare `section` → `.container section`.
   - Re-ran automated top-level selector scan across all 30 Composition `.sass` files: **0 unscoped global leaks remain** (only `:where(.main-layout *)` in `Skeleton.module.sass`).
2. **Cleared Dart Sass Deprecation Warning (`Form.module.sass`):**
   - Replaced deprecated `darken(#007bff, 10%)` with exact computed hex `#0062cc`.
3. **Adapted Composition `NotificationBell.jsx` to Unified `/api/notifications` Envelope:**
   - Preserved 100% of original `NotificationBell.module.sass` visual UI and markup while adding a clean normalizer that merges BOTH `res.workflowNotifications` (`AssignmentWorkflowLog` items) and `res.notifications` (unified M1/M3 `Notification` items), reads `res.unreadCount`, uses collision-free `key_id`, and dispatches `PATCH /api/notifications/:logId/view` or `PATCH /api/notifications/:id/read` per item source.

---

## UI PHASE 5: COURSE ASSIGNMENT VERBATIM TRANSPLANT & SERVICE ADAPTERS (TRACK B)

**Completed:** 2026-11-28  
**Build Verification:** `npm.cmd run build` — **PASS** (`✓ 3192 modules transformed`, zero errors, zero Sass warnings)

### Verbatim Source Tree Transplanted (`src/modules/course-assignment/`)
Replaced all 10 simplified/redesigned pages with the authentic, verbatim source tree from `_ref_ui_audit/course-assignment/src/`:
- **Folders restored intact:** `assets/` (`unc-seal-official.png`, `unclogo.png`, all 7 `dept-logos/*.png`), `components/` + `components/vmgo/` (all 60+ original widgets, tables, modals, `UploadPreviewFlow`, `OfficialCompareModal`, `ProgramOfStudy` viewer, `TeachingLoadDialog`, `SchoolCalendarFill`, `UndoUploadButton`, `PageArchive`, `DialogShell`, `DialogBackdrop`, etc.), `data/`, `pages/`, `services/`, `styles/` (31 `.module.sass` sheets), and `utils/` (`exportAssignments.js`, `pdfExport.js`, `pdfjs.js`, `teachingLoad.js`, etc.).
- **All 10 verbatim pages mounted inside unified Phase 3 `CoreShell` (`scope="course-assignment"`):**
  - VPAA: `AcademicTerms.jsx` (4-panel dashboard + term CRUD + School Calendar fill), `HRStaff.jsx` (Departments table + logo upload + dean invites + bulk unlist + archive), `OVPAAUniversityStatements.jsx` (VMGO cards + version history + restore + PDF extract modal), `UserAccounts.jsx` (accounts + role chips + sync from faculty + reset password).
  - Dean: `DeanFaculty.jsx` (Faculty table + detail modal + invite/invite-all + bulk inactivate + archive), `DeanPrograms.jsx` (Programs table + Program Head picker + archive), `DeanDepartmentStatements.jsx` (Department Vision & Mission cards + history + restore, dynamically scoped to Dean's department).
  - Program Head: `ProgramHeadCourses.jsx` (2-level year-grid + full-page course detail + prereq chips + Program of Study PDF viewer + archive), `ProgramHeadCourseAssignment.jsx` (Lead/Contributors pickers + Teaching Load dialog + History timeline + Progress filter + Official Compare modal + Excel/PDF export + archive), `ProgramHeadIndustryConsultant.jsx` (Consultant table + multi-course tag picker + archive).
- **Zero Duplicate Shells:** Replaced `modules/course-assignment/layouts/SkeletonA.jsx` with a thin pass-through to `shared/CoreShell.jsx`, and wrapped the 7 VPAA/Dean inner pages with `<CoreShell scope="course-assignment"><ScopedPeriodProvider>...</ScopedPeriodProvider></CoreShell>`. Mounted `<PeriodProvider>` and `<DialogBackdrop />` at root in `src/App.jsx` and dispatched `auth:signed-in` in `src/shared/AuthContext.jsx`.

### Sass Leak Isolation
- Scoped all 4 global CSS leaks in `modules/course-assignment/styles/`: `CoursesTable.module.sass` (`select option`, `::-webkit-scrollbar`), `SyllabusSections.module.sass` (`section`), `SyllabusPreview.module.sass` (`section`), `ApprovalSyllabusSections.module.sass` (`section`), and removed `* { padding: 0 }` from unused `SkeletonA.module.sass`.
- Automated top-level selector scan: **0 global leaks** (only `DialogMotion.module.sass:24` CSS custom property definitions on `html`).

### Unified Service Adapters Created
- `modules/course-assignment/services/currentUser.jsx`: bridges directly to `shared/AuthContext.jsx`.
- `modules/course-assignment/services/period.jsx`: reads unified `/api/academic-periods` with Bearer token & normalizes `academic_period_id → id`.
- `modules/course-assignment/services/api.js`: maps every Course Assignment API (`PeriodsAPI`, `DepartmentsAPI`, `FacultyAPI`, `ProgramsAPI`, `CoursesAPI`, `CourseOfferingAssignmentsAPI`, `ConsultantsAPI`, `UniversityStatementsAPI`, `DepartmentStatementsAPI`, `UserAccountsAPI`, `ArchiveAPI`, `ImportsAPI`, `CurriculumDocumentsAPI`, `SchoolCalendarsAPI`, `HealthAPI`) to `integrated-lpms/server/` (including `PUT` vs `PATCH`, `POST /close|reopen|unlist|inactivate`, `/api/course-assignments`, PK normalizers, and real client-side `.xlsx` export via `xlsx`).

### Guardrail #3 Flagged Server-Only File-Parser Endpoints (Backend Kept Read-Only)
All restored UI sections/buttons remain **100% intact** (none hidden or deleted). The following optional server-side file-parsing routes from the original Course Assignment server do not yet exist in `integrated-lpms/server/` and return a clean descriptive message if triggered:
1. Bulk Spreadsheet Dry-Run Preview & Commit (`POST /api/{departments,faculty,programs,courses,course-offering-assignments,industry-consultants}/upload?preview=1`) and Undo (`POST /api/imports/:id/undo`).
2. Official Subject Offerings Registrar Comparison (`POST /api/course-offering-assignments/compare-official`).
3. VMGO & School Calendar PDF Text Extraction (`POST /api/university-statements/extract`, `POST /api/department-statements/extract`, `POST /api/school-calendars`).

---

## UI PHASE 6 EXECUTION LOG — SUBMISSIONS MANAGEMENT TRACK B (VERBATIM TRANSPLANT & ADAPTERS)

- **Status:** COMPLETE (Build verified: `✓ 3399 modules transformed`, `12.64s`, **0 errors**, **0 Sass warnings**, **0 global CSS leaks**).
- **Guardrail Compliance:** `integrated-lpms/server/` untouched (READ-ONLY); standalone `composition/` untouched; zero sections dropped or simplified.

### Verbatim Source Tree Transplanted (`src/modules/submissions/`)
Replaced all 5 simplified/redesigned pages with the authentic, verbatim source tree from `_ref_ui_audit/submissions/composition/client/src/`:
- **Folders restored intact:** `assets/` (`unclogo.png`, mascot illustrations `happy/reading/thinking/worried`), `components/` (all 60+ original widgets: `ApprovalCoursesTable`, `ApprovalSyllabusSections`, `ApprovalChainStatus`, `ApprovalCommentBox`, `CommentsSidebar`, `CourseCoverage`, `ReferenceSummary`, `PlanChecks`, `VersionHistory`, `EarlierConsultantNotes`, `OutcomeAlignment`, `CriteriaForGrading`, `ConsultantDialog`, `ConsultantReview`, `FutureSuggestions`, `SendBackDialog`, `PlanChangesDialog`, `AddReferenceModal`, `TitleRequestsPanel`, `CatalogRulesDialog`, `ImportPreviewModal`, `CourseDocumentBar`, `ScanReviewModal`, `PDFViewerModal`, `PdfViewer`, `Revisions`, `DueDateDialog`, `FormSettingsDialog`, `ResizeVeil`, `OverflowTooltip`, `Toaster`, `AppDialog`, etc.), `data/`, `layouts/`, `pages/` (including `ProgramHead`, `Dean`, `VPAA`, `DirectorOfLibraries`, `IndustryConsultant`, `ApprovalCourses`, `ApprovalSyllabus`, and the entire `pages/lpsm/` tree: `DirectorDashboard`, `ReferenceLibrary`, `AddReference`, `ViewReference`, `OutcomesAlignment`, `PoPeoAlignment`, `CoPoAlignment`, `COAEPView`, `CourseAssignment`), `services/`, `styles/` (40+ `.module.sass`/`.module.scss` sheets, duplicate `tokens.css` removed), and `utils/` (test files excluded).
- **All 5 unified routes + all internal `/role/*` sub-routes mounted inside unified Phase 3 `CoreShell` (`scope="submissions"`):**
  - `SubmissionsQueuePage.jsx` → delegates by active role to verbatim `VPAA`, `Dean`, `ProgramHead`, `DirectorOfLibraries`, and `IndustryConsultant` (`ApprovalCoursesTable`).
  - `LearningPlanReviewPage.jsx` → mounts verbatim `ApprovalSyllabus` / `ApprovalSyllabusSections` on both `/submissions/review/:pcId` and `/role/:approver/courses/:code` (preserving tabs, CommentsSidebar, ApprovalChainStatus, PlanChecks, VersionHistory, SendBackDialog, Approve countdown, ConsultantReview, FutureSuggestions, PDF/Review Record export).
  - `LibraryDashboardPage.jsx` → mounts verbatim `DirectorDashboard` (Waiting for Your Review queue + Reference Library health & type counts).
  - `ReferenceRepositoryPage.jsx` → mounts verbatim `ReferenceLibrary` (References/Courses view switch, facets, search, pagination, Add/Edit Reference modal, Title Requests panel, Catalog Rules dialog, CSV Import preview, Archive/Unarchive) + routes for `AddReference` and `ViewReference`.
  - `ProgramDocumentsPage.jsx` → mounts verbatim `OutcomesAlignment` (4-tab Program Documents workspace: **Front pages**, **PO and PEO**, **CO and PO**, **COAEP** with PDF preview, upload, Excel template/export, and scan modal).
- **Zero Duplicate Shells:** Adapted `modules/submissions/layouts/SkeletonA.jsx` and `Skeleton.jsx` to thin pass-throughs to `shared/CoreShell.jsx` (`scope="submissions"`), bridged `layouts/NavContext.js` to `shared/shell/NavContext.js`, and mounted `<ResizeVeil />` and `<OverflowTooltip />` in `src/App.jsx`.

### Sass Leak Isolation
- Scoped all 4 global CSS leaks in `modules/submissions/styles/`: `CoursesTable.module.sass` (`select option`), `ReferencePicker.module.sass` (`a`), `SyllabusPreview.module.sass` (`section`), `SyllabusSections.module.sass` (`section`).
- Automated top-level selector scan: **0 global leaks**.

### Unified Auth & API Service Adapters Created
- `shared/AuthContext.jsx`: syncs active hydrated user & kebab-case roles into `localStorage('user'/'userId')` and dispatches `lpsm-session-change` on hydrate/login/switchRole/logout so all synchronous `getSession()` readers inside Submissions stay 100% synchronized.
- `modules/submissions/services/currentUser.jsx` & `modules/submissions/utils/session.js`: bridged to unified `AuthContext`, synced session snapshot, and unified role home routes while preserving every original export.
- `modules/submissions/utils/api.js`: injects `Authorization: Bearer <token>` + `X-LPMS-Role` on every request and cleanly adapts all Submissions endpoints to `integrated-lpms/server/`:
  - `/api/assignments/waiting-on-me` (`items` → `plans`), `/api/assignments/offering/:pcId[/plan-checks|/review-record|/signatures|/history|/start-revision|/carry-over]` → `/api/assignments/:pcId/{workflow,checks,review-record,signatures,start-revision,carry-over}` & `/api/revisions/:pcId`.
  - Offering-scoped M2 endpoints without `/:revNum` (from `offeringKey` on working copies) automatically append `/1` (matching `findOfferingByPcIdAndRev`).
  - `/api/comments/by-course/:code`, `POST /api/comments/by-course`, `/api/comments/course/:pcId/:revNum`, `/api/comments/earlier-consultant/:pcId` → `/api/comments/offering/:pcId`, `/api/comments/course/:code`, `POST /api/comments`, `/api/comments/suggestions/:pcId`.
  - `/api/references/library`, `/api/references/:id`, `PUT /api/references/:id/{archive,unarchive}`, `/api/course-references/{tree,by-reference/:id,:courseId}`, `PUT /api/title-requests/:id/:decision` → unified `/api/references`, `/api/course-references`, `/api/title-requests`.
  - `/api/program-outcomes/{programs,offering/:pcId,:programId,:programId/front-pages}`, `/api/course-documents/:pcId`, `/api/coaep/:code` → unified `/api/programs`, `/api/program-outcomes`, `/api/programs/:id/front-page`, `/api/course-documents`.
  - `/api/missing-submissions/:pcId/{poke,remind,pause}` → `/api/reminders/:pcId/{send-now,toggle-pause}`; `/api/course-consultants/{candidates,signoffs/:pcId}` → `/api/industry-consultants` & `/api/course-consultants/signoff/:pcId`.
- `modules/submissions/utils/frontPages.js` & `modules/submissions/utils/courseDocuments.js`: added Bearer auth + client-side `xlsx` workbook generator for CO-PO/COAEP/PO-PEO templates and COAEP Excel export.
- `modules/submissions/utils/reviewAssignments.js`: allowed optional `revNum` in `canReviewLoadedCourse` so `DirectorDashboard` deep links resolve cleanly against offerings with `revision_number >= 1`.

### Guardrail #3 Flagged Server-Only Endpoints (Backend Kept Read-Only)
All restored UI sections/buttons remain **100% intact** (none hidden or deleted). The following optional server-only routes from the original Submissions server do not yet exist in `integrated-lpms/server/`:
1. **Server-Side PDF Export (`POST /api/export/pdf`):** `serverPdf.js` already falls back automatically to client-side PDF generation (`html2canvas` + `jspdf` + `pdf-lib`) so exports still work seamlessly out of the box.
2. **OCR / AI Document Scanning (`POST /api/course-documents/:pcId/:kind/scan`, `POST /api/program-outcomes/:programId/scan`):** Scan buttons remain intact; requires additive backend OCR/scanner port if server-side image/PDF scanning is desired.
3. **ISBN External Lookup & Bulk CSV Reference Import (`GET /api/references/isbn/:isbn`, `POST /api/references/import`):** Buttons/modals remain intact; requires additive backend routes if live ISBN lookup or bulk CSV import commit is desired.
4. **Server-Side Revision Diff (`GET /api/plan-changes/:pcId`):** Gracefully falls back to empty diff (`{ changes: [], sections: [] }`) via adapter; requires additive backend diff route if server-computed plan change diffs are desired.

---

## UI PHASE 7 EXECUTION LOG — LIVE E2E VERIFICATION, MULTI-ROLE BROWSER AUDIT & WORKTREE CLEANUP

- **Status:** COMPLETE — ALL 7 UI RESTORATION PHASES SIGNED OFF.

### 1. Live Full-Stack E2E Backend & Cross-Module Seam QA (`scripts/qaE2ESuite.js`)
- Executed against live Vite SPA (`http://localhost:5173`) → Express 5 (`http://localhost:5000`) → MySQL 8 (`unc_lpms_integrated`).
- **Result:** **32 / 32 checks PASSED (100%)** across all 8 test suites (SPA + proxy health, all 6 role logins + multi-role switch, M1 governance, Seam #1 Course Assignment → Composition live sync, Seams #2/#3/#4a/#4b/#4c/#5 Composition CRUD & submit, Library Director reference sync + comment return, unresolved comment resubmission gate, parallel approval + Dean return → PH counter → Dean final approval + rev 1→2 increment, VPAA export bundle, and Industry Consultant suggestion + sign-off).

### 2. Live Headless Chrome Browser Audit (Login + All 6 Roles + All 24 Restored Routes)
- Ran automated Puppeteer Chromium verification across all 24 restored routes checking: runtime `pageerror` count, HTTP 5xx API failures, style scoping (`.lpms-auth-scope`, `.lpms-composition-scope`, `.lpms-core-scope`), zero Vite black-button leaks (`rgb(26, 26, 26)`), and zero artificial per-module sidebar headers/badges (`LEARNING PLAN COMPOSITION`, `COURSE ASSIGNMENT`, `SUBMISSIONS`).
- **Defects Caught & Fixed During Phase 7 Audit:**
  1. Attached `.lpms-auth-scope` to `shared/auth/Login.jsx` root container per Guardrail #5.
  2. Adapted `GET /api/term-deadlines` (attaching `programs` list from `/api/programs`), `GET /api/missing-submissions` (camelCase row normalization + `today` + `status`/`daysLeft`), and `PUT /api/missing-submissions/:pcId/pause` in `modules/submissions/utils/api.js`, resolving a runtime `deadlines.programs.filter` crash on Dean & Program Head `/learning-plans` (`NotSubmittedPanel.jsx`).
- **Final Re-Run Result:** **24 / 24 routes PASSED (0 failures, 0 console/page errors, 0 HTTP 5xx, 0 black buttons, 0 forbidden sidebar labels):**
  - Login (`/login`): PASS (`lpms-auth-scope`)
  - VPAA (`/vpaa/academic-terms`, `/vpaa/departments`, `/vpaa/university-vmgo`, `/vpaa/approved-plans`, `/vpaa/user-accounts`): 5/5 PASS (`lpms-core-scope`)
  - Dean (`/dean/faculty`, `/dean/programs`, `/dean/vision-mission`, `/dean/learning-plans`, `/dean/user-accounts`): 5/5 PASS (`lpms-core-scope`)
  - Program Head (`/program-head/course-offerings`, `/program-head/course-assignments`, `/program-head/industry-consultants`, `/program-head/program-documents`, `/program-head/learning-plans`, `/submissions/review/1`): 6/6 PASS (`lpms-core-scope`)
  - Director of Libraries (`/library/dashboard`, `/library/references`, `/library/learning-plans`): 3/3 PASS (`lpms-core-scope`)
  - Industry Consultant (`/consultant/learning-plans`): 1/1 PASS (`lpms-core-scope`)
  - Instructor / Composition (`/instructor/dashboard`, `/instructor/assigned-courses`, `/courses/1/1/Draft`): 3/3 PASS (`lpms-composition-scope`)

### 3. Production Build & Repository Hygiene Verification
- Final `npm.cmd run build`: **PASSED** (`✓ 3399 modules transformed`, `12.72s`, 0 errors, 0 Sass warnings).
- Removed all 3 temporary reference worktrees under `integrated-lpms/_ref_ui_audit/` (`git worktree remove --force ...`, `git worktree prune`, deleted `_ref_ui_audit/`).
- Verified `git worktree list` (only main repo) and `git status -s` (`?? integrated-lpms/` only — standalone `composition/`, `lpms_composition` DB, and all original branches untouched).
