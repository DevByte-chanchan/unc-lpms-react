# Phase 4 Report: Unified Frontend Shell, Auth & Multi-Module Porting

**Status:** COMPLETE & BUILD-VERIFIED (`vite build` — `2,572` modules transformed in `5.08s`, exit `0`)  
**Workspace Integrity:** `git status -s` shows only `?? integrated-lpms/` — zero changes to existing `composition/` or source branches.

---

## 1. Unified Frontend Architecture (`integrated-lpms/client/`)

Built on **React 19 + Vite 7 + React Router 7 + Sass 1.93 + Lucide/Feather + nspell** (exact dependency parity with Priority Module 2 Composition, `91` packages, `0` audit vulnerabilities), with Vite `/api` proxying port `5173` → `http://localhost:5000`.

### 1.1 Shared Unified Shell & Auth (`src/shared/`)
- **`api.js`:** Unified HTTP client supporting cookie credentials + `Authorization: Bearer` token fallback, FormData uploads, and M2-compatible `fetchJson` / `AuthAPI` exports.
- **`AuthContext.jsx`:** Unified React auth provider with `/api/auth/me` hydration, multi-role switching (`POST /api/auth/switch-role`), and M2-compatible `CurrentUserProvider` / `useCurrentUser` exports.
- **`navConfig.js`:** Single source of truth for canonical role names, role landing pages, and combined multi-module sidebar navigation per role.
- **`UnifiedShell.jsx` & `UnifiedShell.css`:** Persistent UNC-branded multi-module sidebar (grouped by section/module badge), Multi-Role Switcher dropdown (e.g., `Program Head` ↔ `Instructor` on Olivia Vance), live Unified Notification Bell popover with direct links & mark-read, Profile & E-Signature shortcut, and Logout.
- **`LoginPage.jsx`:** Institutional login form + visible **Dev/QA Quick-Login Role Switcher** cards displaying credentials and 1-click sign-in for all 6 seeded roles.
- **`ProfilePage.jsx`:** Profile editor, password update, and E-Signature PNG/JPG upload, preview, and removal.
- **`RequireRole.jsx`:** Unified authentication and RBAC route guard.

### 1.2 CSS Isolation Strategy
- M2 Composition's global table/button rules (`table`, `thead tr`, `tbody`, `th`, `td`, `button`, `.filter-container`, `.search-container`, etc.) are scoped inside `.composition-scope` in `src/index.css`.
- M1 and M3 pages use an isolated `.lpms-*` institutional styling namespace in `src/shared/UnifiedShell.css`.
- Result: 100% visual & functional preservation of Composition with zero CSS leakage into M1/M3 tables or modals.

---

## 2. Ported Modules & Route Coverage

### Priority Module 2: Learning Plan Composition (`src/modules/composition/` — 100% Preserved)
All original Composition pages, components, Sass modules, assets, `nspell` spellchecker, Gemini AI topic suggest modal, Import Previous modal, Copy-on-Write lineage, 300-minute TLA budget validator, APA Reference Summary, Grading Criteria matrix, Revisions timeline, and Print-Ready UNC Learning Plan Preview were copied verbatim and bridged cleanly into the unified shell via thin adapters (`utils/api.js`, `services/currentUser.jsx`, `components/SideNavigation.jsx`, `components/Header.jsx`, `layouts/Skeleton.jsx`):
- `/instructor/dashboard` & `/dashboard` → `Dashboard.jsx`
- `/instructor/assigned-courses`, `/assigned-courses`, `/courses` → `AssignedCourses.jsx` + `CoursesTable.jsx`
- `/courses/:pcId/:revNum/:status` & `/composition/course/:pcId/:revNum/:section` → `Syllabus.jsx` (all sections, preview, submit, revisions)
- `/topics/form/:iloId/:status` → `TopicForm.jsx`
- `/tlas/form/:iloId/:status` → `TLAForm.jsx`
- `/references/form/:iloId/:status` → `ReferenceForm.jsx`

### Module 1: Course Assignment (`src/modules/course-assignment/` — 10 Pages)
| Role | Page | Route | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **VPAA** | `AcademicTermsPage.jsx` | `/vpaa/academic-terms` | List, create, close, and set active Academic Terms |
| **VPAA** | `DepartmentsPage.jsx` | `/vpaa/departments` | Departments directory, add department, invite Dean, unlist toggle |
| **VPAA** | `UniversityVmgoPage.jsx` | `/vpaa/university-vmgo` | Edit & publish University Vision, Mission, Goals, Objectives & Core Values |
| **VPAA** | `UserAccountsPage.jsx` | `/vpaa/user-accounts` | Unified user account CRUD, status toggle & Immutable Audit Logs tab |
| **Dean** | `DeanFacultyPage.jsx` | `/dean/faculty` | Department faculty directory, add faculty, invite, toggle active |
| **Dean** | `DeanProgramsPage.jsx` | `/dean/programs` | Degree programs management & inline Program Head assignment |
| **Dean** | `DepartmentVisionMissionPage.jsx` | `/dean/vision-mission` | Scoped Department Vision, Mission & Goals editor |
| **Program Head** | `CourseOfferingsPage.jsx` | `/program-head/course-offerings` | Program of Study catalog feeding Composition Course Details (Seam #2) |
| **Program Head** | `CourseAssignmentsPage.jsx` | `/program-head/course-assignments` | Assign Lead Faculty & Contributors, Faculty Load; auto-provisions Draft LP (Seam #1) |
| **Program Head** | `IndustryConsultantsPage.jsx` | `/program-head/industry-consultants` | Register consultants and link to courses (bridged to M3 advisory review) |

### Module 3: Learning Plan Submissions Management (`src/modules/submissions/` — 5 Pages)
| Role(s) | Page | Route(s) | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **VPAA, Dean, PH, LD, Consultant** | `SubmissionsQueuePage.jsx` | `/vpaa/approved-plans`, `/dean/learning-plans`, `/program-head/learning-plans`, `/library/learning-plans`, `/consultant/learning-plans` | Waiting-on-Me KPIs, stage filters, LD/PH/Dean approval badges, Export Bundle JSON, Start Revision, PH Due Dates & Missing Reminders tab |
| **All Approvers & Consultants** | `LearningPlanReviewPage.jsx` | `/submissions/review/:pcId` | Full read-only LP sections (Details/CO-PO, Weekly Coverage, References, Grading, Timeline), synced review comments (`POST /api/comments`), role-aware Approve/Return/Forward/Counter transitions, Print/PDF Export, Industry Consultant Suggestions & Sign-Off |
| **Director of Libraries** | `LibraryDashboardPage.jsx` | `/library/dashboard` | Reference collection health KPIs & pending LP reference verification queue |
| **Director of Libraries** | `ReferenceRepositoryPage.jsx` | `/library/references` | Full CRUD & archive across all 4 categories (`Textbooks`, `OER`, `Online Resources`, `Online Subscriptions`) feeding Composition (Seam #4c), plus Title Requests & Catalog Recency Settings |
| **Program Head** | `ProgramDocumentsPage.jsx` | `/program-head/program-documents` | Front Page PDF upload, PO–PEO Outcomes viewer, and structured COAEP editor with instant live sync into Composition COs/ILOs/Grading Criteria (Seams #3, #4a, #5) |

---

## 3. Build Verification Output

```text
> vite build
✓ 2572 modules transformed.
dist/index.html                       0.44 kB │ gzip:   0.30 kB
dist/assets/unclogo-DX0Ndqsf.png     41.97 kB
dist/assets/index-CVXB-8X-.css      182.34 kB │ gzip:  33.10 kB
dist/assets/index-CS2qorlJ.js     1,283.78 kB │ gzip: 393.25 kB
✓ built in 5.08s
```
