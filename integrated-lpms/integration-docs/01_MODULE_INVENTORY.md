# Phase 1 — Deep Module-by-Module Forensic Inventory

**Generated:** 2026-11-28  
**Sources Inspected:**
1. **Module 1 — Course Assignment:** `integrated-lpms/_ref_sources/course-assignment` (`origin/feature/course-assignment` @ `5e940c7`)
2. **Module 2 — Learning Plan Composition (PRIORITY):** `integrated-lpms/_ref_sources/composition/composition` (`origin/feature/learning-plan-composition` @ `279c58f`)
3. **Module 3 — Learning Plan Submissions Management v2:** `integrated-lpms/_ref_sources/submissions/composition` (`origin/feature/learning-plan-submissions-management-v2` @ `86680b9`)
4. **Functional Requirements Reference:** `func req 3 mod.pdf` (§1.1–1.12, §2.1–2.12, §3.1–3.8)

---

## Executive Cross-Module Reconciliation Summary

| Dimension | Module 1: Course Assignment | Module 2: Composition (PRIORITY) | Module 3: Submissions Management v2 |
| :--- | :--- | :--- | :--- |
| **Role String Convention** | Title Case: `'Instructor'`, `'Program Head'`, `'Dean'`, `'VPAA'`, `'Director of Libraries'`, `'Industry Consultant'` | Auth: Title Case (same as M1); Workflow/Comments: UPPER_SNAKE (`'INSTRUCTOR'`, `'PROGRAM_HEAD'`, `'LIBRARY_DIRECTOR'`, `'INDUSTRY_CONSULTANT'`, `'DEAN'`, `'VPAA'`) | Auth/Users: kebab-case (`'instructor'`, `'program-head'`, `'director-of-libraries'`, `'industry-consultant'`, `'dean'`, `'vpaa'`, `'superuser'`); Workflow/Comments: UPPER_SNAKE (same as M2) |
| **User Account Table** | `user_accounts` (`user_account_id`, `display_name`, JSON `roles`, `failed_attempts`, `locked_until`, no FK to `faculty`) | `user_accounts` (`id`, `full_name`, TEXT JSON `roles`, `active_role`, `faculty_id`, `industry_consultant_id`) | `Users` (`user_id`, `name`, ENUM `role` + TEXT JSON `roles`, lockout, privacy consent, encrypted `signature_*` cols) |
| **Active Role Switcher** | Client `sessionStorage['lpms.activeRole']` | Server-persisted `user_accounts.active_role` + JWT claim (`POST /api/auth/switch-role`) | Request header `X-LPMS-Role` validated against `Users.roles` |
| **Session Cookie / Auth** | `lpms_session` httpOnly JWT (8h), global `requireAuth` on `/api/*` | `lpms_session` httpOnly JWT (12h) OR `Bearer`, `attachUser` global, **`requireAuth` missing on business routes** | `lpms_session` httpOnly JWT (8h, includes `pv` password version), global `requireAuth` + `restrictSuperuser` + `auditMiddleware` |
| **Table Count** | 22 MySQL tables (snake_case, `sync({ alter: true })` + reconcilers) | 24 MySQL tables (PascalCase core + snake_case auth/periods, migrations) | 41 SQLite tables (35 Sequelize models + 6 raw/migration tables; shares M2 PascalCase core + 17 new LPSM tables) |
| **Revision Numbering Rule** | `program_course_offerings.revision_number` default `1` | Starts equal to prior approved `revision_number` (`1`); increments `+1` **only** on Dean approval when `has_modifications === true` & `!is_revision_incremented` | Working copy uses `revision_number = 0`; increments to `>= 1` on Dean approval (`approved_at` set) |
| **Status Tracking** | Assignment row `status` mirrors Faculty status (`Active`/`On Leave`/`Inactive`/`Unassigned`/`Archived`) | LP status (`Draft`/`Pending`/`Returned`/`Approved`) computed dynamically from `AssignmentWorkflowLogs` + `date_submitted` | LP stage (`draft`/`parallel_review`/`returned`/`with_program_head`/`dean_review`/`approved`) computed from `AssignmentWorkflowLogs` (`ASSIGNED`/`SUBMITTED`/`RETURNED`/`ACCEPTED`/`FORWARDED`/`COUNTERED`) |

---

# MODULE 1: COURSE ASSIGNMENT (`feature/course-assignment`)

## 1.1 User Roles & Authentication

### Exact Role Strings (`server/utils/roles.js` & `src/services/roles.js`)
| Role Enum String | Home Route | URL Segment |
| :--- | :--- | :--- |
| `'Instructor'` | `'/'` | *(none)* |
| `'Program Head'` | `'/role/program-head/course-offerings?page=Course%20Offerings'` | `'program-head'` |
| `'Dean'` | `'/role/dean?page=Faculty'` | `'dean'` |
| `'VPAA'` | `'/role/ovpaa'` | `'ovpaa'` (legacy `'hr-staff'` redirects to `'ovpaa'`) |
| `'Director of Libraries'` | `'/role/director-of-libraries/approval-course-table'` | `'director-of-libraries'` |
| `'Industry Consultant'` | `'/role/industry-consultant/approval-course-table'` | `'industry-consultant'` |

### Auth Mechanics & Seeded Demo Accounts (`server/utils/seedUsers.js`)
- **Cookie:** `lpms_session` (httpOnly HS256 JWT, 8h TTL, payload `{ sub, roles }`). Re-loads `UserAccount` on every request.
- **Lockout:** 5 failed attempts → 15 min lockout (`423`). Email domain enforced (`ALLOWED_EMAIL_DOMAIN=unc.edu.ph`), with optional `ALLOW_EXTERNAL_CONSULTANT_EMAILS=true` for sole-role Industry Consultants.
- **Invitations & Resets:** `account_invitations` (SHA-256 `token_hash`, 7-day TTL, statuses `waiting|held|scheduled|sending|sent|failed|cancelled|accepted`, 40s delay after bulk upload for undo safety) & `password_resets` (1h TTL).
- **Period-Dynamic Person Linking:** `user_accounts` has no FK to `faculty`/`industry_consultants`; `GET /api/auth/me?period_id=` resolves `facultyId` by email/nameKey and `consultantId` by nameKey.
- **Demo Accounts (non-prod):**
  - `monica.norton@unc.edu.ph` / `Instructor@2026` — `['Instructor']`
  - `kristine.sanlorenzo@unc.edu.ph` / `ProgramHead@2026` — `['Program Head', 'Instructor']`
  - `maria.santos@unc.edu.ph` / `Library@2026` — `['Director of Libraries']`
  - `roberto.cruz@unc.edu.ph` / `Consultant@2026` — `['Industry Consultant']`
  - `sophia.sterling@unc.edu.ph` / `Dean@2026` — `['Dean']`
  - `carlos.garcia@unc.edu.ph` / `Vpaa@2026` — `['VPAA']`

## 1.2 Pages, Routes, Sidebar & Inner Sections

| Role | Route(s) & Query | Component | Live vs Mock | Core Inner Sections & Features |
| :--- | :--- | :--- | :--- | :--- |
| **Public / Auth** | `/login`, `/set-password`, `/forgot-password`, `/reset-password`, `/change-password` | `Login`, `PasswordLinkPage`, `ForgotPassword`, `ChangePassword` | Live | Email/password login, multi-role `<ContinueAs>` picker, invite acceptance, reset link, forced password change |
| **VPAA** | `/role/ovpaa?page=Dashboard` (or `Academic Term`) | `OVPAA` → `AcademicTerms` | Hybrid | Current Term card (edit dates, update/advance term, 5-milestone vertical timeline), School Calendar image/PDF AI/OCR reader (`SchoolCalendarFill`), Past Terms panel; 2 mock dept submission bar charts |
| **VPAA** | `/role/ovpaa?page=Department List` | `OVPAA` → `HRStaff` | Live | Period selector, bulk Excel upload + preview + 30s Undo, Add/Edit/Archive/Reconcile Unlist, Dean account creation & Invite/Resend |
| **VPAA** | `/role/ovpaa?page=Learning Plan`, `?page=TOS` | `OVPAA` → `OVPAARepository` | Hybrid | Live Department grid + Logo upload; mock approved LP/TOS rows (`mockApprovedSubmissions.js`) with on-the-fly PDF viewer |
| **VPAA** | `/role/ovpaa?page=University VMGO` | `OVPAA` → `OVPAAUniversityStatements` | Live | Versioned PDF extract → side-by-side diff review (Vision, Mission, Educational Policy, Core Values, Graduate Attributes) → Save / History / Restore |
| **Dean** | `/role/dean?page=Faculty` | `Dean` → `DeanFaculty` | Live | Period selector, bulk upload + preview + 30s Undo + Reconcile Inactivate, Add/Edit/View Detail/Archive, single Invite & "Invite all not yet invited" |
| **Dean** | `/role/dean?page=Programs` | `Dean` → `DeanPrograms` | Live | Period selector, bulk upload + unmatched faculty review + 30s Undo, Add/Edit/Archive, assign Program Head (auto-syncs `Program Head` role), View Program of Study PDF |
| **Dean** | `/role/dean?page=Vision & Mission` | `Dean` → `DeanDepartmentStatements` | Live | Versioned per `department_code` (note: hardcoded `'SCIS'` in `Dean.jsx`) PDF extract → diff review → History / Restore |
| **Dean** | `/role/dean?page=User Accounts` | `Dean` → `UserAccounts` | Live | Dean-scoped faculty accounts + Held invitations list, Send/Resend invitation, Send password reset |
| **Program Head** | `/role/program-head/course-offerings` | `ProgramHeadCourses` | Live | Multi-program switcher, 3-level drilldown (Year Cards → Course Grid → Full-Page Course Detail w/ units, prereqs, offerings), Excel OR multi-PDF Program of Study upload + preview + year-level override + archive reconciliation + Program of Study PDF viewer |
| **Program Head** | `/role/program-head/course-assignment` | `ProgramHeadCourseAssignment` | Live | Progress strip (assigned/notified counts), Upload (`TEACHING ASSIGNMENT`/`SUBJECT OFFERINGS`/flat) + preview + 30s Undo, Add/Edit Lead Faculty + Contributors, **Compare with official** registrar diff modal, Re-validate, Notifications delivery/resend tab, History timeline tab, Export `.xlsx` & UNC PDF |
| **Program Head** | `/role/program-head/industry-consultant` | `ProgramHeadIndustryConsultant` | Live | Upload/Add/Edit/View/Archive Industry Consultants, multi-course `CourseTagPicker` (with conflict lock), Invite/Resend |
| **Industry Consultant** | `/role/industry-consultant/approval-course-table` | `ApprovalCourses` → `ConsultantCoursesTable` | Live (read-only list) | Fetches `GET /api/industry-consultants/me/courses`; displays assigned courses with hardcoded `'Not yet submitted'` status |
| **Instructor / Lib Dir** | `/`, `/assignedtos`, `/courses/:code`, `/tos/:code`, `/role/director-of-libraries/*` | Mock syllabus/TOS/approval pages | **Mock (replace with M2/M3)** | Hardcoded `syllabiData.js` stubs (except `<ProgramOfStudyLink>` chip inside `/courses/:code`) |

- **Header (`HeaderA.jsx`):** Active role switcher dropdown, Change password, and `NotificationBell` polling `/api/notifications/unread-count` every 60s (deep-links via `notificationTarget.js`).

## 1.3 Backend API Endpoints (`/api/*`)

- **Auth & Health:** `GET /api/health`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me?period_id=`, `POST /api/auth/change-password`, `GET|POST /api/auth/invitation|accept-invitation`, `GET|POST /api/auth/reset-password`, `POST /api/auth/forgot-password`, `POST /api/auth/request-invitation`.
- **User Accounts (`Dean`, `VPAA`):** `GET /api/user-accounts`, `GET /api/user-accounts/held-invitations`, `POST /api/user-accounts`, `POST /api/user-accounts/from-faculty`, `PATCH /api/user-accounts/:id`, `POST /api/user-accounts/:id/reset-password`, `POST /api/user-accounts/:id/send-invitation`, `POST /api/user-accounts/:id/send-password-reset`.
- **Academic Periods:** `GET /api/academic-periods` (auto-closes expired & auto-opens next), `POST|PATCH|DELETE /api/academic-periods(/:id)` (`VPAA`), `PATCH /api/academic-periods/:id/(close|reopen)` (`VPAA`).
- **Departments:** `GET /api/departments(?period_id=)` (clones prior period if empty), `GET /:id`, `POST|PATCH|DELETE` (`VPAA`), `PATCH /unlist` (`VPAA`), `POST /upload(?preview=1)` (`VPAA`), `POST /:id/invite-dean` (`VPAA`).
- **Faculty:** `GET /api/faculty(?period_id=)` (clones prior period), `GET /:id` (`withAbout`), `POST|PATCH|DELETE` (`Dean`), `PATCH /inactivate` (`Dean`), `POST /upload(?preview=1)` (`Dean`), `POST /invite-all` (`Dean`), `POST /:id/invite` (`Dean`).
- **Programs:** `GET /api/programs(?period_id=&head_id=&head_name=)` (clones prior period), `GET /:id`, `POST|PATCH|DELETE` (`Dean`), `POST /upload(?preview=1)` (`Dean`).
- **Courses:** `GET /api/courses(?period_id=&archived=)`, `GET /prereq-options`, `GET /:id`, `POST|PATCH|DELETE` (`Program Head`), `POST /upload(?preview=1)` (`Program Head` — Excel or up to 4 Program of Study PDFs).
- **Industry Consultants:** `GET /api/industry-consultants(?period_id=)`, `GET /me/courses` (`Industry Consultant`), `GET /:id`, `POST|PATCH|DELETE` (`Program Head`), `PATCH /:id/assign`, `POST /upload(?preview=1)`, `POST /:id/invite`.
- **Course Offering Assignments:** `GET /api/course-offering-assignments(?period_id=)`, `GET /load`, `GET /offered`, `GET /export(?format=xlsx|json)`, `POST /revalidate`, `POST /compare-official(?preview=1)`, `POST /:id/notify`, `GET /:id/history`, `GET /:id`, `POST|PATCH|DELETE` (`Program Head`, `Dean`), `POST /upload(?preview=1)`.
- **Supporting:** `GET /api/archive(?module=&period_id=)`, `GET /api/imports/latest`, `POST /api/imports/:id/undo` (30s window), `GET|POST /api/university-statements/(current|history|:id|extract|:id/restore)`, `GET|POST /api/department-statements(/all|/history|/:id|/extract|/:id/restore)`, `GET|POST /api/notifications(/unread-count|/read-all|/:id/read)`, `GET /api/curriculum-documents(/:id/file)`, `GET|POST /api/school-calendars(/:id/file)`.

## 1.4 Database Schema (22 Tables — MySQL, `underscored: true`)

1. **`academic_periods`**: `academic_period_id` (PK), `label` (UNIQUE), `school_year`, `semester`, `is_active`, `sort_order`, `status` ENUM(`Active`,`Closed`), `closed_at`, `start_date`, `end_date`, `classes_start`, `prelim_exam`, `midterm_exam`, `semifinal_exam`, `final_exam`.
2. **`departments`**: `department_id` (PK), `name`, `code`, `dean`, `dean_email`, `status` (`Active|Unlisted|Archived`), `academic_period_id` (FK). UNIQUE `(code, academic_period_id)`.
3. **`programs`**: `program_id` (PK), `code`, `name`, `program_head`, `program_head_id` (FK→`faculty`), `status` (`Active|Unlisted`), `department_id` (FK→`departments`), `academic_period_id` (FK). UNIQUE `(code, academic_period_id)`.
4. **`faculty`**: `faculty_id` (PK), `name`, `role`, `department`, `department_id` (FK→`departments`), `status` (`Active|On Leave|Emeritus|Inactive`), `about` (TEXT), `sex`, `birthdate`, `email`, `contact_number`, `academic_period_id` (FK).
5. **`courses`**: `course_id` (PK), `course_no`, `course_title`, `credit`, `contact_hrs`, `classification`, `cmo`, `year_lvl`, `prerequisites_text` (TEXT), `term`, `semester` (INT), `archived` (BOOL), `academic_period_id` (FK).
6. **`prerequisites`**: `prerequisite_id` (PK), `course_id` (FK→`courses`), `course_prerequisite_id` (FK→`courses`).
7. **`program_course_offerings`**: `program_course_offering_id` (PK), `course_id` (FK), `program_id` (FK), `revision_number` (INT def 1), `course_description` (TEXT). UNIQUE `(course_id, program_id)`.
8. **`course_offering_assignments`**: `course_offering_assignment_id` (PK), `course_code`, `course_name`, `year_level`, `course_id` (FK), `program_course_offering_id` (FK UNIQUE), `program_id` (FK), `faculty_name` (Lead), `faculty_id` (FK→`faculty` Lead), `contributors` (JSON `[{faculty_id, faculty_name}]`), `status` (`Active|On Leave|Emeritus|Inactive|Unassigned|Archived`), `date_assigned`, `official_confirmed_at`, `sections` (JSON), `academic_period_id` (FK).
9. **`industry_consultants`**: `industry_consultant_id` (PK), `name`, `assigned_course_code`, `assigned_course_id` (FK), `status` (`Active|Unavailable|Offboarded|NULL`), `status_overridden` (BOOL), `academic_period_id` (FK).
10. **`consultant_courses`**: `consultant_course_id` (PK), `industry_consultant_id` (FK CASCADE), `course_id` (FK SET NULL), `course_code`.
11. **`import_batches`**: `import_batch_id` (PK), `entity`, `action` (`upload|add`), `subject`, `academic_period_id`, `filename`, `snapshot` (LONGTEXT), `summary`, `status` (`pending|complete|undone`), `undone_at`, `created_by_account_id`.
12. **`university_statements`**: `university_statement_id` (PK), `vision`, `mission`, `educational_policy`, `core_values` (JSON), `graduate_attributes` (JSON), `status` (`Active|Superseded`), `source_filename`, `source_sha256`, `uploaded_by`.
13. **`department_statements`**: `department_statement_id` (PK), `department_code`, `department_name`, `vision`, `mission`, `status` (`Active|Superseded`), `source_filename`, `source_sha256`, `uploaded_by`.
14. **`user_accounts`**: `user_account_id` (PK), `email` (UNIQUE), `password_hash`, `display_name`, `roles` (JSON), `status` (`Active|Disabled`), `must_change_password`, `last_login_at`, `failed_attempts`, `locked_until`.
15. **`account_invitations`**: `account_invitation_id` (PK), `user_account_id`, `email`, `display_name`, `email_source`, `source_entity`, `import_batch_id`, `academic_period_id`, `created_account`, `sent_by_account_id`, `status`, `hold_reason`, `send_after`, `attempts`, `last_error`, `sent_at`, `accepted_at`, `token_hash`, `expires_at`.
16. **`account_notices`**: `account_notice_id` (PK), `user_account_id`, `academic_period_id`, `told_roles` (JSON), `told_lead` (JSON), `told_contributor` (JSON), `told_consultant` (JSON), `dirty`, `send_after`, `first_dirty_at`, `sent_by_account_id`, `attempts`, `last_error`, `last_sent_at`, `last_result`. UNIQUE `(user_account_id, academic_period_id)`.
17. **`password_resets`**: `password_reset_id` (PK), `user_account_id`, `token_hash`, `expires_at`, `used_at`, `requested_ip`.
18. **`notifications`**: `notification_id` (PK), `user_account_id`, `academic_period_id`, `kind`, `title`, `body`, `link`, `sent_by_account_id`, `target_type`, `target_id`, `target_program_id`, `read_at`, `emailed_at`.
19. **`course_assignment_history`**: `course_assignment_history_id` (PK), `academic_period_id`, `program_id`, `course_code`, `course_name`, `action`, `lead_before` (JSON), `lead_after` (JSON), `contributors_before` (JSON), `contributors_after` (JSON), `source` (`manual|upload|official_match|undo`), `changed_by_account_id`, `note`.
20. **`curriculum_documents`**: `curriculum_document_id` (PK), `program_id`, `academic_period_id`, `import_batch_id`, `superseded_by_batch_id`, `sha256`, `original_name`, `size_bytes`, `pages`, `part_label`, `years_covered`, `course_codes`, `program_name`, `cmo`, `effectivity`, `revision`, `uploaded_by_account_id`, `status` (`active|superseded|removed`).
21. **`deadline_reminders`**: `deadline_reminder_id` (PK), `user_account_id`, `academic_period_id`, `kind` (`midterm_7d|midterm_1d|final_7d|final_1d`), `due_date`, `status`, `courses` (JSON), `result`. UNIQUE `(user_account_id, academic_period_id, kind, due_date)`.
22. **`school_calendars`**: `school_calendar_id` (PK), `school_year`, `sha256` (UNIQUE), `original_name`, `mime`, `size_bytes`, `extracted` (JSON), `uploaded_by_account_id`.

---

# MODULE 2: LEARNING PLAN COMPOSITION — PRIORITY MODULE (`feature/learning-plan-composition`)

## 2.1 User Roles & Authentication

- **Auth Role Enum (`server/utils/roles.js`):** Title Case (`'Instructor'`, `'Program Head'`, `'Director of Libraries'`, `'Industry Consultant'`, `'Dean'`, `'VPAA'`).
- **Workflow/Comment Role Strings:** UPPER_SNAKE (`'INSTRUCTOR'`, `'PROGRAM_HEAD'`, `'LIBRARY_DIRECTOR'`, `'INDUSTRY_CONSULTANT'`, `'DEAN'`, `'VPAA'`).
- **Auth Flow:** `lpms_session` httpOnly JWT cookie (12h) OR `Authorization: Bearer`. `attachUser` runs globally, loading `UserAccount` + `Faculty` + `Department` + `IndustryConsultant`. **Gap in source branch:** only `/api/auth/switch-role` and `/api/auth/change-password` enforce `requireAuth`; business routes fall back to `stakeholder_id = '1'` when unauthenticated.
- **Seeded Accounts (`Login.jsx` & controllers):**
  - `1`: Monica Norton (`monica.norton@unc.edu.ph` / `Instructor@2026`) — `['Instructor']`
  - `2`: Olivia Vance (`olivia.vance@unc.edu.ph` / `ProgramHead@2026`) — `['Program Head', 'Instructor']`
  - `3`: Maria Santos (`maria.santos@unc.edu.ph` / `Library@2026`) — `['Director of Libraries']`
  - `4`: Roberto Cruz (`roberto.cruz@unc.edu.ph` / `Consultant@2026`) — `['Industry Consultant']`
  - `5`: Sophia Sterling (`sophia.sterling@unc.edu.ph` / `Dean@2026`) — `['Dean']`
  - `6`: Carlos Garcia (`carlos.garcia@unc.edu.ph` / `Vpaa@2026`) — `['VPAA']`

## 2.2 Pages, Routes & Inner Composition Sections (100% PRESERVE)

| Route | Component | Features & Exact API Bindings |
| :--- | :--- | :--- |
| `/`, `/dashboard` | `Dashboard.jsx` | `GET /api/dashboard?stakeholder=`; 3D flip `CurrentTermCard` (5 calendar milestones + `Asia/Manila` progress), `MiniAssignedCourses` (Draft/Pending/Returned/Approved tabs + approver accordion), `MiniAssignedTOS` (placeholder) |
| `/assigned-courses` | `AssignedCourses.jsx` (`CoursesTable.jsx`) | `GET /api/assignments?year=&semester=&stakeholder=`; SY/Sem filters (past years lock to Approved), Draft/Pending/Returned/Approved tabs + search + Grid/List toggle; `Compose`/`Update`/`View` links; *(Export button currently stubbed)* |
| `/courses/:pcId/:revNum/:status` | `Syllabus.jsx` → `SyllabusSections.jsx` | Section selector, `Preview` modal (`SyllabusPreview`), `Submit` (5s undo countdown → `POST /api/submit-learning-plan/:pcId/:revNum`), `⋮` menu (`Future Suggestion` modal → `GET /api/comments/suggestions/:pcId`, `Revisions` split-pane timeline modal → `GET /api/revisions/:pcId`) |
| ↳ Section 1: Course Details | `CourseDetails.jsx` | `GET` / `PUT /api/course-details/:pcId/:revNum` (metadata read-only; Course Description editable in draft/returned) |
| ↳ Section 2: CO–PO Alignment | `OutcomeAlignment.jsx` | `GET` / `PUT /api/course-outcome-alignment/:pcId/:revNum` (I/E/D interactive matrix) |
| ↳ Section 3: Course Coverage Roadmap *(Draft/Returned)* | `ILOs.jsx` | `GET /api/ilos/:pcId/:revNum` (+ batch `GET /api/comments/filter/:weekId/*` when returned); Course Orientation card + 4 CO cards with parallel ILOs, week/hour auto-distribution, Prelim/Midterm/Semifinal/Final dividers, `Map Weekly Content` button |
| ↳ Section 3B: Course Coverage Matrix *(Pending/Approved/Preview)* | `CourseCoverage.jsx` | `GET /api/course-coverage/:pcId/:revNum`; full print-ready tabular view of Orientation + CO1–CO4 weekly Topics, Subtopics, TLAs, Assessments, References |
| ↳ Section 4: References Summary *(Pending/Approved/Preview)* | `ReferenceSummary.jsx` | `GET /api/courses/:pcId/:revNum/references`; segmented by `Textbook` (`TB#`), `Open Educational Resources` (`OE#`), `Online Resources` (`OR#`) with `≥5yr` Deprecated badge |
| ↳ Section 5: Criteria for Grading | `CriteriaForGrading.jsx` | `GET` / `PUT /api/course-criteria/:pcId/:revNum`; CO1=Prelim, CO2=Midterm, CO3=Semi-Final, CO4=Final matrix; live 100% total validation; saves weights/targets on `IntendedLearningOutcomes` + syncs `TLAAssessments` |
| `/topics/form/:iloId/:status` *(param is `week_id`; `?orientation=true`)* | `TopicForm.jsx` (**3-Column Pin-Toggle Weekly Planner**) | `FormNavigation` (CO/ILO drawer, Week 1–17 pills skipping Wk 9 & 18, 3 pin-toggles, `Import Previous` modal, validation-gated `Save`):<br>• **Col 1 — Topics (`TopicSelector` + `AiTopicSuggestModal`):** `Add Topic`, `Continue Prev` (same-CO only), Gemini `POST /api/topics/ai-suggest`, subtopic `estimated_minutes` **must sum exactly to `weeklyHours * 60`** (e.g. 300m / 120m orientation) + 0 spelling errors (`nspell` + `dictionary-en`).<br>• **Col 2 — TLAs (`TLAForm`):** Lab courses require `Pre-class`, `In-class`, `Post-class` (+ `isLab` flag); non-lab require `Asynchronous`, `Synchronous`. Must cover **all** phases + `≥1` assessment + 0 spelling errors.<br>• **Col 3 — References (`ReferenceForm` + `ReferencePicker`):** Textbook/OER/Online tabs, custom Add (`POST /api/references`), CoW Edit (`PUT /api/references/:id`), requires `≥1` Textbook.<br>• **Consolidated `ImportPreviousModal`:** Parallel `/topics/previous/:w`, `/tlas/previous/:w`, `/ilo-references/previous/:w` from prior approved offering.<br>• **Returned Comments Sidebar:** Filter by step & approver role, grouped by Return #, checkbox resolution saved on Global Save (`PUT /api/comments/update-resolution`). |

## 2.3 Backend API Endpoints (`/api/*`)
- `/api/auth`: `POST /login`, `POST /logout`, `POST /forgot-password`, `GET /me`, `POST /switch-role`, `POST /change-password`
- `/api/dashboard`, `/api/academic-periods( /current )`, `/api/assignments(/:id)`
- `/api/course-details/:pcId/:revNum` (`GET`, `PUT`)
- `/api/course-outcome-alignment/:pcId/:revNum` (`GET`, `PUT`)
- `/api/ilos/:pcId/:revNum` (`GET`), `PUT /api/ilos/:ilo_id/schedule`
- `/api/course-criteria/:pcId/:revNum` (`GET`, `PUT`)
- `/api/course-coverage/:pcId/:revNum` (`GET`), `GET /api/courses/:pcId/:revNum/references`
- `/api/topics`: `GET /week-context/:weekId`, `GET /available`, `GET /previous/:weekId`, `GET /assigned/:iloId`, `POST /assign`, `POST /ai-suggest`
- `/api/tlas`: `GET /available`, `GET /previous/:weekId`, `GET /ilo/:iloId` (alias `/week/:weekId`), `POST /ilo/:iloId` (alias `/week/:weekId`)
- `/api/references`: `GET /`, `POST /`, `PUT /:id` (CoW)
- `/api/ilo-references`: `GET /previous/:iloId`, `GET /:iloId`, `POST /assign`, `DELETE /:iloReferenceId`
- `/api/comments`: `GET /unresolved-counts/:pcId/:revNum`, `GET /filter/:iloId/:commentFor`, `GET /suggestions/:pcId`, `PUT /update-resolution`
- `/api/revisions/:pcId` (`GET`), `POST /api/submit-learning-plan/:pcId/:revNum`
- `/api/notifications`: `GET /`, `PATCH|POST /view-all`, `PATCH|POST /:logId/view`

## 2.4 Database Schema (24 Tables — MySQL)
- **Auth & Org (8):** `academic_periods`, `user_accounts`, `faculty`, `industry_consultants`, `Departments`, `Programs`, `Courses`, `Prerequisites`
- **Offerings & Workflow (3):**
  - `ProgramCourseOfferings` (`pc_offering_id`, `revision_number`, `base_pc_offering_id`, `has_modifications`, `is_revision_incremented`, `course_id`, `program_id`, `dept_id`, `course_description`)
  - `CourseOfferingAssignments` (`co_assign_id`, `pc_offering_id`, `stakeholder_id`, `date_assigned`, `date_submitted`, `date_updated`)
  - `AssignmentWorkflowLogs` (`log_id`, `co_assign_id`, `stakeholder_id`, `actor_role`, `action_type` ENUM(`ASSIGNED`,`SUBMITTED`,`RETURNED`,`ACCEPTED`,`Suggest`), `is_viewed`)
- **Outcomes & COAEP (4):** `CourseOutcomes`, `ProgramOutcomes`, `ProgramOutcomeAlignments` (`I|E|D`), `IntendedLearningOutcomes` (includes **5 COAEP grading columns**: `prelim_weight`, `midterm_weight`, `semi_weight`, `final_weight`, `target`, plus `assessment_tool`, `is_orientation`, `hours`, `weeks`)
- **Weekly Authoring & CoW (7):** `Weeks`, `Topics` (`course_id`, `parent_topic_id`), `Subtopics` (`week_id`, `topic_id`, `sequence_order`, `is_orientation`, `parent_subtopic_id`, `estimated_minutes`), `TeachingAndLearningActivities` (`week_id`, `tla_name`, `description`, `performed_by` `T|S`, `class_phase`, `is_lab`, `is_orientation`), `TLAAssessments` (`method_id`, `tla_id`, `ilo_id`, `name`, `description`, `period` `p|m|s|f`, `weight`, `min_passing`), `References` (`course_id`, `course_no`, `title`, `type`, `author`, `isbn`, `link`, `publication_year`, `parent_reference_id`), `WeeklyReferences` (`weekly_reference_id`, `week_id`, `reference_id`, `is_orientation`)
- **Review Comments (2):** `Comments` (`comment_id`, `co_assign_id`, `stakeholder_id`, `commenter_role`, `message`, `resolved_status`, `resolved_date`, `week_id`, `comment_for`), `CommentTargets` (`comment_target_id`, `comment_id`, `target_id`)

## 2.5 Foundational HCI Seeder Inventory (CRITICAL)
- **Authoritative Seeder:** `composition/server/seeders/20260512030000-seed-composition-foundation.js`
  - **Ignore auxiliary demo seeders:** `20260514` (Integrative Prog), `20260515` (HCI Returned mutation), `20260525` (HCI Draft reset), `20260528` (OOP Approved).
- **Exact Seeded Data in `20260512030000`:**
  - `Departments` (5: SBA, CEA, SCIS [id=3], CON, CJE), `Programs` (6: BSIT [id=1], BSCS, ACT, BLIS, BSA, BSCE), `Courses` (8, primary **`course_id=1`: `BIT313L — Human and Computer Interaction`**, `2 LEC, 1 LAB`, `2 Hrs Lec, 3 Hrs Lab`, prereq `BIT302`).
  - **Two `ProgramCourseOfferings` for `BIT313L`:**
    1. **`pc_offering_id = 1`** (`Rev 1`, SY 2025-2026, **Approved** via 5 workflow logs: PH Assigned → Instructor Submitted → LD Accepted → PH Accepted → Dean Accepted): 4 COs, 10 BSIT POs, 12 CO-PO Alignments, 13 ILOs (1 Orientation 2h + 12 graded ILOs w/ 20%/30%/50% = 100% weights & `target='60'`), 16 Weeks (`5.00` hrs each), **32 canonical Topics, 96 Subtopics** (exact 120m Orientation + 180m Wk1 Reg + 300m/wk Wks 2–16), **96 TLAs, 48 TLAAssessments, 28 References** (5 Textbooks, 7 Online, 16 OER), and **32 WeeklyReferences**.
    2. **`pc_offering_id = 2`** (`Rev 1`, `base_pc_offering_id = 1`, `has_modifications = false`, `is_revision_incremented = false`, SY 2026-2027, **Draft**): Cloned 4 COs, 12 CO-PO Alignments, 13 ILOs (with COAEP grading weights), 16 Weeks (`week_id 17..32`), and **intentionally blank weekly Topics/Subtopics/TLAs/WeeklyReferences** so Instructors can author fresh OR click **Import Previous** from `pc_offering_id = 1`.

---

# MODULE 3: LEARNING PLAN SUBMISSIONS MANAGEMENT v2 (`feature/learning-plan-submissions-management-v2`)

## 3.1 User Roles, Permissions & Auth

- **Account Role Keys (`ROLE_KEYS`, kebab-case):** `'instructor'`, `'program-head'`, `'director-of-libraries'`, `'industry-consultant'`, `'dean'`, `'vpaa'`, `'superuser'` (standalone only).
- **Workflow / Comment Roles:** UPPER_SNAKE (`'INSTRUCTOR'`, `'PROGRAM_HEAD'`, `'LIBRARY_DIRECTOR'`, `'DEAN'`, `'INDUSTRY_CONSULTANT'` [comments only], `'VPAA'`).
- **Role Section Access (`sectionAccess.js`):**
  - `director-of-libraries`: **ONLY `'references'`** (`403` on details/alignment/coverage/criteria/revisions/coaep/export).
  - `industry-consultant`: **ONLY `'details'`, `'alignment'`, `'coverage'`** on Dean-approved plans for courses they are assigned to in `CourseConsultants`.
  - `instructor`, `program-head`, `dean`, `vpaa`: All 5 sections.
- **Auth & Security Pipeline:** `lpms_session` httpOnly JWT cookie (8h, includes `pv = password_changed_at`), `X-LPMS-Role` request header for multi-role switching, global `requireAuth`, `restrictSuperuser`, `auditMiddleware` (append-only `AuditLogs`), 5-fail/15-min lockout, `AccountInvitations` (7d) & `PasswordResets` (1h), `must_change_password` 72h lock, AES-256-GCM encrypted PNG e-signatures (`LPMS_SIGNATURE_KEY`).
- **Demo Accounts (`seed-demo.js`, password `demo1234`):** `monica.norton` (`instructor`), `junar.danila` (`program-head`, `instructor`), `maria.santos` (`director-of-libraries`), `roberto.cruz` (`industry-consultant`), `agnes.reyes` (`dean`), `carlos.garcia` (`vpaa`).

## 3.2 Pages, Routes, Sidebar & Inner Sections per Role (Unique LPSM Surface)

| Role | Routes & Sidebar Items | Key Components & Features |
| :--- | :--- | :--- |
| **Program Head** | Sidebar: **Learning Plan** (`/role/program-head`), **Course Assignment** (`/role/program-head/course-assignment`), **Program Documents** (`/role/program-head/program-documents?tab=front-pages\|po-peo\|co-po\|coaep`) | • **Learning Plan Review:** Tabs `Pending` (w/ "Waiting on me"), `Returned`, `Approved`, `Not submitted` (`NotSubmittedPanel` + `MissingSubmissionsTable` w/ due dates, custom reminder schedule, per-plan reminder pause, manual 1/day Poke). Review screen (`ApprovalSyllabusSections`) w/ `ApprovalChainStatus`, `PlanChecks` auto-audit, `PlanChangesDialog` return-to-resubmit diff, `CommentsSidebar`, `Return with comments` / `Approve` (5s undo), Dean-return triage (`Forward to instructor` vs `Send back to the Dean` `COUNTERED`), `ConsultantDialog` (assign consultant to approved course), `Review record` & watermarked/final PDF export.<br>• **Program Documents (`OutcomesAlignment`):** 4 tabs — Front Pages PDF upload/verify, PO–PEO matrix (Excel template/import + AI/OCR `ScanReviewModal`), CO–PO matrix (Excel/PDF upload + AI/OCR scan), COAEP (Excel/PDF upload + AI/OCR scan + Excel/PDF export) + `FormSettings` doc control header.<br>• **Course Assignment:** LPSM's lighter course-assign & official-offerings import screen *(superseded/unified with Module 1's full Course Assignment)*. |
| **Director of Libraries** | Sidebar: **Learning Plan** (`/role/director-of-libraries`), **Dashboard** (`/role/director-of-libraries/dashboard`), **Reference Library** (`/role/director-of-libraries/reference-library`, `/add-reference`, `/view-reference/:id`) | • **Learning Plan Review:** Tabs `Pending`/`Returned`/`Approved`; Review screen shows **ONLY `References Summary`**; specialized 2-tab `ApprovalCommentBox` (`Comment on references` w/ outdated flags + `Suggest from library` picker).<br>• **Dashboard (`DirectorDashboard`):** KPIs, recency/availability/unclassified/unused health alerts, open title requests count.<br>• **Reference Library:** Table & Courses-grid views, Dept/Program/Course/Type/Year/Archive facets, `CourseReferences` filing, Add/Edit/CSV Bulk Upload, **`TitleRequestsPanel`** (Fulfill → pre-fills Add Reference, or Decline w/ reason), **`CatalogSettings`** rules dialog (`recency_years`, `enforce_recency`, `require_availability`). |
| **Dean** | Sidebar: **Learning Plan** (`/role/dean`) | Tabs `Pending`, `Returned`, `Approved`, `Not submitted` (read-only dept view). Review screen: all 5 sections, sees PH `COUNTERED` notes, `Return` (routes to `with_program_head`, NOT directly to instructor) or **Final `Approve`** (`ACCEPTED` → assigns rev, snapshots `ReviewRecordSnapshots`, auto-closes comments), PDF & Review Record export. |
| **VPAA** | Sidebar: **Approved Plans** (`/role/vpaa?page=Approved Plans`), **User Accounts** (`/role/vpaa?page=User Accounts`) | Institution-wide Approved LP browser + Program filter + single PDF export + **Export all as ZIP** (`JSZip`); User Accounts management panel. |
| **Industry Consultant** | Sidebar: **Learning Plan** (`/role/industry-consultant`) | Sees ONLY Dean-approved plans for courses assigned in `CourseConsultants`. Review screen shows ONLY `Course Details`, `CO-PO Alignment`, `Course Coverage`. Primary action: **`Suggest & Sign`** (`ConsultantReview` — add/edit/delete suggestions + `Sign as reviewed` recording `ConsultantSignoffs` + e-signature on PDF). |
| **Superuser** | Sidebar: **User Management** (`/role/superuser`) | `SuperuserUsers` + `AuditLogs` viewer (strictly isolated by `restrictSuperuser`). |
| **All Roles (Settings)** | Top Header → `SettingsModal` (`Account`, `Security`, `SignatureTab`), `NotificationBell` | E-signature canvas background-removal & encrypted PNG upload (all except VPAA/Superuser); 20-event `NotificationBell` w/ comment deep-linking (`?comment=<id>`). |

## 3.3 Approval & Review State Machine (`utils/workflowRules.js`, `utils/effectiveLogs.js`)
- **Action Enum:** `'ASSIGNED' | 'SUBMITTED' | 'RETURNED' | 'ACCEPTED' | 'FORWARDED' | 'COUNTERED'`.
- **Stage Transitions:**
  1. `draft` (`ASSIGNED`) → Instructor submits (`SUBMITTED`) → `parallel_review`.
  2. `parallel_review` → **Library Director** AND **Program Head** review simultaneously:
     - Either `RETURNED` (w/ comment) → `returned` (captures `PlanReturnSnapshots` for diffing; instructor resolves comments & resubmits → `parallel_review`).
     - Both `ACCEPTED` → `dean_review` (also unlocks early watermarked PDF export).
  3. `dean_review`:
     - Dean `ACCEPTED` → `approved` (sets `approved_at`, increments `revision_number`, writes `ReviewRecordSnapshots`, closes comments, notifies all).
     - Dean `RETURNED` → **`with_program_head`** (Dean comments hidden from instructor until forwarded).
  4. `with_program_head`:
     - Program Head `FORWARDED` → `returned` (reveals Dean + PH comments to instructor, snapshots `PlanReturnSnapshots`; instructor resubmission returns to review).
     - Program Head `COUNTERED` (mandatory ≥5-char note) → returns directly to `dean_review` with `counterNote`.
  5. `approved`: Locked for edits; Program Head can assign Industry Consultant (`CourseConsultants`); Consultant can add suggestions (`comment_for = 'suggestion'`) & sign off (`ConsultantSignoffs`); Instructor can trigger `POST /api/offerings/:pcId/start-revision` for next term/version.

## 3.4 Backend API Endpoints (35 Route Files)
- **Auth / Users / Audit / Profile:** `/api/auth/*`, `/api/profile(/signature)`, `/api/user-accounts/*`, `/api/audit-logs`, `/api/notifications/*`
- **Workflow & Review:** `GET /api/assignments(/waiting-on-me|/offering/:pcId/workflow|/offering/:pcId/plan-checks|/offering/:pcId/review-record|/offering/:pcId/signatures)`, `POST /api/assignments/action`, `POST /api/submit-learning-plan/:pcId(/:revNum)`, `GET /api/plan-changes/:pcId`, `POST /api/offerings/:pcId/(start-revision|carry-over)`
- **Program & Course Documents / COAEP:** `/api/program-outcomes/*` (PO/PEO CRUD, template, Excel import, AI/OCR scan, `/:programId/front-pages` PDF + check), `/api/course-documents/*` (`co-po` & `coaep` templates, Excel/PDF upload, AI/OCR scan, save scanned, COAEP Excel export), `GET /api/coaep/:pcId(/:revNum)`, `/api/form-settings(/:formKey)`
- **Reference Library & Title Requests:** `/api/references(/types|/library|/health|/alerts|/:id|/bulk|/:id/archive)`, `/api/course-references`, `/api/catalog-settings`, `/api/title-requests(/:id/fulfill|/:id/decline)`
- **Deadlines, Reminders & Consultants:** `/api/term-deadlines`, `/api/missing-submissions(/:pcId/pause|/:pcId/remind)`, `/api/course-consultants(/candidates|/:id/deactivate|/signoffs/:pcId)`, `/api/course-assignments/*`
- **Comments & Export:** `/api/comments(/by-course/:code|/course/:pcId|/filter/:weekId/:type|/by-course|/update-resolution|/suggestions/:pcId|/suggestions/item/:id|/earlier-consultant/:pcId)`, `POST /api/export/pdf`
- **Composition Core (retained w/ `requireSection` + `requireOfferingAccess` + `editLock`):** `/api/dashboard`, `/api/academic-periods`, `/api/course-details`, `/api/course-outcome-alignment`, `/api/ilos`, `/api/topics`, `/api/tlas`, `/api/ilo-references`, `/api/course-coverage`, `/api/course-criteria`, `/api/courses/:pcId/references`, `/api/revisions`.

## 3.5 Database Schema (41 Tables — 35 Models + 6 Migration Tables)
- **Shared/Extended Composition Core (20):** `Users`, `academic_periods`, `Departments`, `Programs`, `Courses`, `Prerequisites`, `ProgramCourseOfferings` (+`school_year`, `semester`, `base_offering_id`, `carried_from_offering_id`, `approved_at`), `CourseOfferingAssignments`, `AssignmentWorkflowLogs` (+`actor_name`, `actor_user_id`, `note`, ENUM +`FORWARDED`,`COUNTERED`), `CourseOutcomes`, `ProgramOutcomes` (+`peo_numbers`, `ga_numbers`), `ProgramOutcomeAlignments`, `IntendedLearningOutcomes` (+`ied_level`, `target_students_percent`, `target_score_percent`), `Weeks`, `Topics`, `Subtopics`, `TeachingAndLearningActivities`, `TLAAssessments`, `References` (+`publisher`, `copies`, `status`, `category`, `date_received`, `archived`, `created_by`), `WeeklyReferences`, `Comments` (+`commenter_user_id`, `commenter_name`, extended `comment_for`), `CommentTargets`.
- **New Submissions Management Tables (21):**
  - *Models (15):* `ProgramEducationalObjectives`, `CourseConsultants`, `FormSettings`, `CatalogSettings`, `Notifications`, `TermDeadlines`, `ReminderPauses`, `ReminderLog`, `AuditLogs`, `ReviewRecordSnapshots`, `PlanReturnSnapshots`, `AccountInvitations`, `PasswordResets` *(plus `Users` above)*.
  - *Non-Model / Raw-SQL Tables (6):* `ProgramFrontPages` (`program_id`, `file_name`, `pdf` BLOB, `uploaded_by`, `updatedAt`), `CourseDocuments` (`course_document_id`, `pc_offering_id`, `kind` `'co-po'|'coaep'`, `file_name`, `content_type`, `data` BLOB, `uploaded_by`, `updatedAt`), `CourseReferences` (`course_id`, `reference_id`, `added_by`, `createdAt`), `TitleRequests` (`request_id`, `title`, `authors`, `note`, `pc_offering_id`, `requested_by`, `status` `'pending'|'added'|'declined'`, `reason`, `reference_id`, `decided_by`, `decided_at`), `ConsultantSignoffs` (`offering_id`, `consultant_user_id`, `consultant_name`, `signed_at`), `OfficialOfferings` (`program_id`, `school_year`, `semester`, `course_no`, `section`, `title`, `faculty` TEXT JSON, `imported_by`, `createdAt`).

## 3.6 SQLite-to-MySQL Compatibility Audit (16 Hazards to Remediate in Phase 2/3)
1. `better-sqlite3` shim / `sqlite3-compat` / `db.__raw` / `PRAGMA` calls (`models/index.js`, `migrate.js`, `transactionQueue.js`, `sqlPlaceholders.js`).
2. `db.__raw.backup()` in `utils/dbBackup.js` (SQLite-only).
3. `sqlite_master` & `PRAGMA table_info(...)` in `utils/ensureAuthSchema.js` → replace with `queryInterface.describeTable` / `INFORMATION_SCHEMA`.
4. `ORDER BY julianday(createdAt)` in `utils/effectiveLogs.js:40` & `utils/versionHistory.js:29,33` → replace with `ORDER BY createdAt`.
5. `||` string concatenation in `controllers/commentController.js:597,673` & `utils/reviewRecordInputs.js:37` → replace with `CONCAT(...)`.
6. `sequelize.transaction({ type: 'IMMEDIATE' })` in `services/offeringService.js:149,217` → omit for MySQL.
7. `school_year IS ? AND semester IS ?` in `services/offeringService.js:250,290` → replace with MySQL `<=> ?`.
8. `CAST(... AS INTEGER)` in `utils/missingSubmissions.js:39` → replace with `CAST(... AS UNSIGNED)`.
9. `CAST(... AS TEXT)` in `utils/planChanges.js:66` & `utils/authorBackfill.js:41` → replace with `CAST(... AS CHAR)`.
10. Unaliased derived table in `controllers/courseReferencesController.js:23-30` → add alias `) u GROUP BY ...`.
11. MySQL 8 `ONLY_FULL_GROUP_BY` violations in `controllers/referenceController.js:230`, `utils/referenceAlerts.js:24`, `controllers/courseConsultantController.js:57` → aggregate or add columns to `GROUP BY`.
12. **64KB Truncation Hazard:** `CourseDocuments.data` and `ProgramFrontPages.pdf` use `BLOB` (must be `LONGBLOB` for 10–12MB PDFs/XLSX); `ReviewRecordSnapshots.payload` and `PlanReturnSnapshots.payload` use `TEXT` (must be `LONGTEXT`).
13. `AuditLogs` append-only SQLite `RAISE(ABORT, ...)` triggers → convert to MySQL `SIGNAL SQLSTATE '45000'`.
14. Reserved word `References` → ensure backticks `` `References` `` in every raw SQL statement.
15. Table name casing consistency across raw SQL vs Sequelize models.
16. Raw `QueryTypes.INSERT`/`UPDATE` return shapes and MySQL duplicate error (`ER_DUP_ENTRY` / errno `1062` vs SQLite `/UNIQUE constraint/` in `utils/reminderJob.js:39`).

---

# 4. EXACT DIFFERENCES BETWEEN `func req 3 mod.pdf` AND ACTUAL SOURCE CODE

| PDF Requirement | What `func req 3 mod.pdf` Says | Actual Source Code Ground Truth |
| :--- | :--- | :--- |
| **§1.4 (VPAA Submission Monitoring)** | Show LP & TOS counts per department and let VPAA view/print/download official UNC forms. | In M1, VPAA's bar charts (`AcademicTerms.jsx`) and LP/TOS tables (`OVPAARepository.jsx`) are **mock data** (`mockApprovedSubmissions.js`); real approved LP listing + PDF/ZIP export lives in **M3 (`VPAA.jsx`)**! |
| **§1.8 (Dean Vision & Mission)** | Maintain their department's Vision & Mission. | In M1 (`Dean.jsx`), `DEAN_DEPARTMENT_CODE` is **hardcoded to `'SCIS'`** rather than derived from the signed-in Dean's department. We should dynamically resolve it from the unified user/department link. |
| **§1.10 / §3.5.1 (Industry Consultant Assignment)** | §1.10 (M1): PH manages & assigns consultants to courses per term (any time). §3.5.1 (M3): PH assigns consultant to a course **once it has an approved Learning Plan**. | M1 assigns via `industry_consultants` + `consultant_courses` (no approval gate); M3 enforces `CourseConsultants` assignment only after Dean approval and drives consultant `Suggest & Sign`. Unified design must bridge both cleanly! |
| **§2.1.2 (Auto-init Draft on Open)** | Initialize a new draft LP whenever an instructor opens an uncomposed offering. | M2 pre-creates the blank-slate `ProgramCourseOffering` + `CourseOfferingAssignment` (`ASSIGNED`) at course-assignment time (not lazily on click); opening it enters `Draft` editing immediately. |
| **§2.3.3–2.3.4 (Dynamic CO Week/Hour Recalc)** | Dynamically recalculate week spans & hours whenever weekly allocations or COAP weights change. | In M2, `Weeks` are pre-seeded at 4 weeks × 5 hrs/week per CO (16 instructional weeks + Week 9 Midterm + Week 18 Final = 18 weeks), and `TopicForm` enforces exact subtopic minute totals (`weeklyHours * 60 = 300m`, Orientation `120m`) — a major real-code validation rule **not mentioned in the PDF**. |
| **§2.5.2–2.5.3 (TLA Attributes & Submission Gate)** | Every ILO must have ≥1 TLA mapped before submit; TLA has Delivery Mode, Performed By, Class Phase, Lab flag. | M2 maps TLAs to **Weeks** (not directly to ILOs), adapts phases dynamically (`Pre-class/In-class/Post-class` for lab courses vs `Asynchronous/Synchronous` for non-lab), requires **all phases covered + ≥1 assessment + 0 spelling errors** before Save. `Delivery Mode` is not a separate field; `performed_by` (`T`/`S`), `class_phase`, `is_lab` are used. |
| **§2.6.1 & §3.2.1 (4 Reference Types vs 3)** | §3.2.1 lists **4** repository types: Textbook, OER, Online Resources, **Online Subscriptions**. §2.6.3 allows instructors to create custom references. | M2 supports **3** types (`Textbook`, `Open Educational Resources`, `Online Resources`) and lets instructors create/CoW-edit custom references. M3 uses **3** DB types (`Textbook`, `OER`, `Online Resource`), models Online Subscriptions as external search catalog links, **locks reference creation to Director of Libraries**, and adds `TitleRequests` for instructors. *(Unified app should support all 4 types in the repository & reconcile reference permissions cleanly!)* |
| **§2.7.2–2.7.4 (Criteria for Grading)** | Isolated CO1→Prelim..CO4→Final totaling 100%, stored/derived from COAEP. | M2 stores `prelim_weight`, `midterm_weight`, `semi_weight`, `final_weight`, `target` directly on `IntendedLearningOutcomes` AND syncs `TLAAssessments`. M3 instead uses `ied_level` (`I|E|D`), `target_students_percent`, `target_score_percent` on `IntendedLearningOutcomes` and `TLAAssessments.period/weight`. **Unified superset schema will keep ALL columns from both.** |
| **§2.8.1 (When Revision Number Increments)** | Generate immutable revision snapshot whenever a **returned** LP is updated and resubmitted. | **Outdated in PDF!** M2's actual defense-verified contract (`01-database-schema-and-version-integrity.md`) increments `revision_number` by `+1` **ONLY when modified AND finally approved by the Dean** (never during Draft/Returned/Resubmitted). M3 also only increments revision on Dean approval (`0` → `>=1`). |
| **§2.10.3 (Resubmit Blocked Until All Comments Resolved)** | Block resubmission until all mandatory review remarks are marked resolved. | M2 tracks `resolved_status` per comment via `PUT /api/comments/update-resolution`, while M2's `POST /api/submit-learning-plan` does not yet hard-block on unresolved comments server-side; M3 adds `PlanChangesDialog` diffing and `validateSubmission`. We will verify/enforce clean resolution gating in Phase 3/5. |
| **§3.1.5 (Refuse Wrong Uploaded Document)** | System checks each uploaded Program Document is the expected one and refuses others. | Implemented in M3 via PDF/Excel validation (`/front-pages/check`, sheet header validation, and `documentScan.js` schema validation + `ScanReviewModal`). |
| **§3.2.2 (ISBN Lookup)** | Upload Textbook singly, bulk upload, or **by ISBN lookup**. | M3 implements single Add, CSV Bulk Upload, and ISBN validation/external links (no automated external ISBN metadata auto-fill API call in server code). |
| **§3.3.2 & §3.5.2 (Section Visibility Scope)** | Library Director and Industry Consultant view LP details in read-only mode. | M3 enforces **strict section-level RBAC** (`sectionAccess.js`): Library Director sees **ONLY `References Summary`**; Industry Consultant sees **ONLY `Course Details`, `CO-PO Alignment`, `Course Coverage`** (and only on Dean-approved plans). |
| **§3.6.4 (Dean Return Resubmission Route)** | Return by LD/PH routes back to both; return by Dean routes back to Dean. | In M3, Dean Return goes to **`with_program_head`** first — Program Head can either **`COUNTERED`** (send straight back to Dean without instructor edits) OR **`FORWARDED`** (send to Instructor → on resubmit, re-enters review). |
| **Extra Features in Code NOT in PDF** | — | M1: 30-second Undo Upload batches (`import_batches`), Registrar Official Subject Offerings diff/compare, automatic exam-date email/bell reminders (`deadline_reminders`), School Calendar OCR/AI reader.<br>M2: 3-column pin-toggle weekly planner, live `nspell` spellchecker, exact minute-budget enforcement, Copy-on-Write (`parent_topic_id`/`parent_reference_id`) catalog versioning, consolidated 3-column `Import Previous` modal.<br>M3: AES-256-GCM encrypted E-Signatures on PDF exports, `TitleRequests` workflow, `CatalogSettings` enforcement rules, `PlanChecks` auto-audit, `ReviewRecordSnapshots` accreditation PDF, append-only `AuditLogs`, `Superuser` role, VPAA bulk ZIP export. |
