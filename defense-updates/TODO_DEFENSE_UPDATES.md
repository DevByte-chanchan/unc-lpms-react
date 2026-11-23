# LEARNING PLAN COMPOSITION MODULE — AUDIT & DEFENSE-REVIEW UPDATE CHECKLIST

> **Audit Scope:** Learning Plan Composition Module (`composition/client/` & `composition/server/`)
> **Defense Transcript Source:** `composition/transcripts/11-13-2026 12.49(2).md` (`00:00:00` – `01:51:59`, 1,656 lines)
> **Audit Status:** Second-Pass Independently Verified against Source Code & Full Transcript *(see [`VERIFICATION_REPORT.md`](./VERIFICATION_REPORT.md) for audit log)*
> **Operating Mode:** Strictly Read-Only Code Audit & Forensic Transcript Mapping (Zero application code modified)

---

## Section 1: Verified Instructor Composition Flow (Quick Reference Map)

Below is the verified, code-level end-to-end journey an **Instructor** follows inside the **Learning Plan Composition** module, including exact verified React component paths (`composition/client/src/...`), Express routes (`composition/server/routes/...`), controllers (`composition/server/controllers/...`), and Sequelize models (`composition/server/models/...`).

1. **Authentication, Session & Global Header Notifications**
   - **Frontend Pages & Components:**
     - `client/src/pages/Login.jsx` (`/login`), `client/src/pages/ChangePassword.jsx` (`/change-password`), `client/src/pages/ForgotPassword.jsx` (`/forgot-password`)
     - `client/src/services/currentUser.jsx` (`CurrentUserProvider`), `client/src/services/roles.js`
     - `client/src/components/Header.jsx` (overrides hardcoded fallback `'NORTON, MONICA'` with `useCurrentUser()` when logged in) → `client/src/components/NotificationBell.jsx` (polls workflow notifications every 30s and deep-links to `/courses/:pcId/:revNum/:status`)
     - `client/src/components/SideNavigation.jsx` (navigation links for `Dashboard` and `Learning Plans`)
   - **Backend Endpoints, Controllers & Models:**
     - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/switch-role`, `POST /api/auth/change-password`, `POST /api/auth/forgot-password` → `server/routes/auth.js` → `server/controllers/authController.js`
     - `GET /api/notifications`, `PATCH` / `POST /api/notifications/:logId/view`, `PATCH` / `POST /api/notifications/view-all` → `server/routes/notifications.js` → `server/controllers/notificationController.js`
     - **Models:** `UserAccount` (`server/models/userAccount.js`), `Faculty` (`server/models/faculty.js`), `IndustryConsultant` (`server/models/industryConsultant.js`), `AssignmentWorkflowLog` (`server/models/assignmentWorkflowLog.js`)

2. **Instructor Dashboard (`/` or `/dashboard`)**
   - **Frontend Pages & Components:**
     - `client/src/pages/Dashboard.jsx`
     - `client/src/components/CurrentTermCard.jsx` (flippable 3D desk calendar displaying active `AcademicPeriod` school year, semester, upcoming milestone on front; term progress percentage and 5 milestones `classes_start`, `prelim_exam`, `midterm_exam`, `semifinal_exam`, `final_exam` on back; uses `client/src/services/periodLabel.js` and `client/src/services/termCalendar.js`)
     - `client/src/components/MiniAssignedCourses.jsx` ("Assigned Learning Plans" widget with status tabs `Draft`, `Pending`, `Returned`, `Approved` and expandable per-approver workflow rows via `buildApproverStatus`)
     - `client/src/components/MiniAssignedTOS.jsx` ("Assigned TOS" static widget)
   - **Backend Endpoints, Controllers & Models:**
     - `GET /api/dashboard/summary` (and `GET /api/dashboard`) → `server/routes/dashboard.js` → `server/controllers/dashboardController.js`
     - `GET /api/academic-periods`, `GET /api/academic-periods/current` → `server/routes/academicPeriods.js` → `server/controllers/dashboardController.js`
     - **Models:** `AcademicPeriod` (`server/models/academicPeriod.js`), `CourseOfferingAssignment` (`server/models/courseOfferingAssignment.js`), `ProgramCourseOffering` (`server/models/programCourseOffering.js`), `AssignmentWorkflowLog` (`server/models/assignmentWorkflowLog.js`)

3. **Assigned Course Offerings & Entry (`/assigned-courses` or `/courses`)**
   - **Frontend Pages & Components:**
     - `client/src/pages/AssignedCourses.jsx` (19-line page shell) → `client/src/components/CoursesTable.jsx`
     - Filters by synthetic School Year (`2000`–present), Semester (`1st Sem`, `2nd Sem`), Status segmented tabs (`DRAFT`, `PENDING`, `RETURNED`, `APPROVED`; past years filter to `APPROVED` only), search bar, and `grid` / `list` view toggle.
     - Displays multi-tier approval status (`Director of Libraries` + `Program Head` in parallel Tier 1 → `Dean` in sequential Tier 2 → `Industry Consultant` post-approval row via `buildApproverStatus` at lines `157–220`).
     - Action CTA buttons navigate to `/courses/:pcId/:revNum/:status` (`Compose` for Draft, `Update` for Returned, `View` for Pending/Approved, plus a currently unimplemented `Export` button on Approved cards/rows at lines `378–388` and `592–601`).
   - **Backend Endpoints, Controllers & Models:**
     - `GET /api/assignments`, `GET /api/assignments/:id` → `server/routes/assignments.js` → `server/controllers/assignmentController.js`
     - **Models:** `CourseOfferingAssignment`, `ProgramCourseOffering`, `Course` (`server/models/course.js`), `Program` (`server/models/program.js`), `Department` (`server/models/department.js`), `AssignmentWorkflowLog`

4. **Learning Plan Authoring Shell (`/courses/:pcId/:revNum/:status`)**
   - **Frontend Pages & Components:**
     - `client/src/pages/Syllabus.jsx` → `client/src/components/SyllabusSections.jsx`
     - Top bar contains: Back button (`/`), Section `<select>` switcher, `Preview` modal trigger (`client/src/components/SyllabusPreview.jsx`), `Submit` button (5-second undoable countdown modal using `submitPhase` / `timeLeft` and `"Cancel Submission"`), and `MoreVertical` (`⋮`) menu (`Future Suggestion` modal + `Revisions` history modal via `client/src/components/Revisions.jsx` & `client/src/components/SyllabusRevisionsSections.jsx`).
   - **Section Progression inside `SyllabusSections.jsx`:**
     - **Step 4A — Course Details (`CourseDetails`):**
       - Component: `client/src/components/CourseDetails.jsx`
       - Endpoints: `GET /api/course-details/:pcId/:revNum`, `PUT /api/course-details/:pcId/:revNum` → `server/routes/courseDetails.js` → `server/controllers/courseDetailsController.js`
       - Models: `ProgramCourseOffering`, `Course`, `Prerequisite` (`server/models/prerequisite.js`)
       - Functionality: Displays institutional course metadata table; instructor can click `Edit Description` to update `ProgramCourseOffering.course_description` while all other table rows remain static text in the UI (note: backend `PUT` handler currently also accepts optional master `Course` fields without role checks).
     - **Step 4B — Course and Program Outcome Alignment (`OutcomeAlignment`):**
       - Component: `client/src/components/OutcomeAlignment.jsx`
       - Endpoints: `GET /api/course-outcome-alignment/:pcId/:revNum`, `PUT /api/course-outcome-alignment/:pcId/:revNum` → `server/routes/courseOutcomeAlignment.js` → `server/controllers/courseOutcomeAlignmentController.js`
       - Models: `CourseOutcome` (`server/models/courseOutcome.js`), `ProgramOutcome` (`server/models/programOutcome.js`), `ProgramOutcomeAlignment` (`server/models/programOutcomeAlignment.js`)
       - Functionality: Displays dynamic CO-to-PO alignment matrix (`I` Introductory, `E` Enabling, `D` Demonstrative, falling back to `PO1`–`PO9` if empty) and allows editing via `Edit Alignments` with a confirmation modal.
     - **Step 4C — Course Coverage Roadmap (`ILOs` in `draft`/`returned`) / Matrix (`CourseCoverage` & `ReferenceSummary` in `pending`/`approved`):**
       - Components:
         - Authoring Roadmap (`draft` / `returned`): `client/src/components/ILOs.jsx`
         - Read-Only Institutional 7-Column Matrix (`pending` / `approved` & Preview): `client/src/components/CourseCoverage.jsx`
         - Read-Only Categorized References Table (`pending` / `approved` & Preview): `client/src/components/ReferenceSummary.jsx`
       - Endpoints:
         - `GET /api/ilos/:pcId/:revNum` → `server/routes/ilos.js` → `server/controllers/iloController.js` (also `PUT /api/ilos/:ilo_id/schedule` → `server/controllers/iloScheduleController.js`)
         - `GET /api/course-coverage/:pcId/:revNum` → `server/routes/courseCoverage.js` → `server/controllers/courseCoverageController.js`
         - `GET /api/courses/:pcId/:revNum/references` → `server/routes/courseReferenceRoutes.js` → `server/controllers/referenceSummaryController.js`
       - Models: `CourseOutcome`, `IntendedLearningOutcome` (`server/models/intendedLearningOutcome.js`), `Week` (`server/models/week.js`)
       - Functionality: `ILOs.jsx` renders the 18-week instructional roadmap (`Course Orientation` Week 1 • 2 Hrs + `CO1` Weeks 1–4 + `Prelim` + `CO2` Weeks 5–8 + `Midterm | Week 9` + `CO3` Weeks 10–13 + `Semifinal` + `CO4` Weeks 14–17 + `Final | Week 18`), unresolved comment badges per CO, and `Map Weekly Content` buttons that launch the Weekly Content Planner (`/topics/form/:iloId/:status`).

5. **Weekly Content Planner (`/topics/form/:iloId/:status`)**
   - **Frontend Orchestrator & Navigation:**
     - `client/src/pages/TopicForm.jsx` + `client/src/components/FormNavigation.jsx` (also standalone routes `/tlas/form/:iloId/:status` and `/references/form/:iloId/:status`)
     - Top bar with expandable `CO #` switcher (`Course Orientation`/`CO0`, `CO 1`..`CO 4`), CO & ILO reference panel, Week selector tabs (`WEEK 1`..`WEEK 17`), 3 Content Selector tabs (`Topics`, `Teaching & Learning Activities`, `References`), and consolidated `Save` button.
   - **Tab 5A — Weekly Topics & Subtopics (`Topics` Tab):**
     - Components: `TopicSubForm` inside `client/src/pages/TopicForm.jsx`, `client/src/components/TopicSelector.jsx`, `client/src/components/AiTopicSuggestModal.jsx`, `client/src/components/SpellCheckInput.jsx`
     - Endpoints: `GET /api/topics/week-context/:weekId`, `GET /api/topics/available`, `GET /api/topics/assigned/:iloId`, `POST /api/topics/assign`, `POST /api/topics/ai-suggest` → `server/routes/topics.js` → `server/controllers/topicController.js`
     - Models: `Topic` (`server/models/topic.js`), `Subtopic` (`server/models/subtopic.js`), `Week`
     - Functionality: Select/create topics, continue a topic from the previous week within the same CO (`Continue Previous Topic`), manage ordered subtopics, or click `AI Suggest` (`AiTopicSuggestModal.jsx`) to generate time-weighted recommended & alternative topics/subtopics calibrated to weekly contact hours.
   - **Tab 5B — Teaching & Learning Activities (`Teaching & Learning Activities` Tab):**
     - Component: `client/src/pages/TLAForm.jsx`
     - Endpoints: `GET /api/tlas/week/:weekId`, `POST /api/tlas/week/:weekId` (plus `/api/tlas/ilo/:iloId` aliases) → `server/routes/tlaRoutes.js` → `server/controllers/tlaController.js`
     - Models: `TeachingAndLearningActivity` (`server/models/teachingAndLearningActivity.js`), `TLAAssessment` (`server/models/tlaAssessment.js`)
     - Functionality: Manage weekly TLA cards (`TLA Name`, `Performed By` Student/Instructor, `Class Phase` Pre-class/In-class/Post-class/Synchronous/Asynchronous, `Laboratory Activity` toggle, `TLA Description`, and linked `Assessment Type` & `Detail`).
   - **Tab 5C — Weekly References (`References` Tab):**
     - Components: `client/src/pages/ReferenceForm.jsx`, `client/src/components/ReferencePicker.jsx`
     - Endpoints:
       - `GET /api/references`, `POST /api/references`, `PUT /api/references/:id` → `server/routes/references.js` → `server/controllers/referenceController.js`
       - `GET /api/ilo-references/:iloId`, `POST /api/ilo-references/assign`, `DELETE /api/ilo-references/:iloReferenceId` → `server/routes/iloReferences.js` → `server/controllers/iloReferenceController.js`
     - Models: `Reference` (`server/models/reference.js`), `WeeklyReference` (`server/models/weeklyReference.js`)
     - Functionality: Pick course-linked references across `Textbook`, `OER`, and `Online` tabs, flag textbooks older than 5 years (`currentYear - year > 5`) as `Deprecated` (non-blocking), and add/edit references via modal.
   - **Consolidated Save, Validation & Spell-Check Pipeline:**
     - Utilities: `client/src/utils/spellChecker.js` (`nspell` + `dictionary-en`)
     - Functionality: Validates required Topics/Subtopics, TLAs, and References across modified weeks (`Validation Notice` modal), runs spelling verification (`Spelling Check Warning` modal in `TopicForm.jsx` and standalone `ReferenceForm.jsx`), and commits all tabs plus comment resolution statuses.

6. **Criteria for Grading (`CriteriaForGrading`)**
   - **Frontend Component:** `client/src/components/CriteriaForGrading.jsx`
   - **Backend Endpoints, Controller & Models:**
     - `GET /api/course-criteria/:pcId/:revNum`, `PUT /api/course-criteria/:pcId/:revNum` → `server/routes/courseCriteria.js` → `server/controllers/courseCriteriaController.js`
     - **Models:** `CourseOutcome`, `IntendedLearningOutcome`, `Week`, `TeachingAndLearningActivity`, `TLAAssessment`
     - **Functionality:** Displays CO $\times$ ILO grading table (`Assessment Strategy`, `Prelim`/`Midterm`/`Semi`/`Final` weights summing to `100%`, and `Minimum Passing`), with inline editing via `Edit Criteria`. *(Currently hardcoded to 4 COs $\times$ 3 ILOs in `courseCriteriaController.js:50, 67`.)*

7. **Preview, Submission, Returned Feedback Resolution & Revision History**
   - **Frontend Components:**
     - `client/src/components/SyllabusPreview.jsx` (full read-only preview modal)
     - `client/src/components/SyllabusSections.jsx` (Submit modal with 5-second undo timer; Future Suggestions modal)
     - `client/src/pages/TopicForm.jsx` (Collapsible right-hand `Review Feedback` sidebar in `returned` status, filterable by approver role and grouped by `Return 1`, `Return 2`, with resolution checkboxes)
     - `client/src/components/Revisions.jsx` & `client/src/components/SyllabusRevisionsSections.jsx` (Split-pane revision history & workflow audit log viewer)
   - **Backend Endpoints, Controllers & Models:**
     - `POST /api/submit-learning-plan/:pcId/:revNum` → `server/routes/submissionRoutes.js` → `server/controllers/submissionController.js`
     - `GET /api/comments/unresolved-counts/:pcId/:revNum`, `GET /api/comments/filter/:iloId/:commentFor`, `PUT /api/comments/update-resolution`, `GET /api/comments/suggestions/:pcId` → `server/routes/comments.js` → `server/controllers/commentController.js`
     - `GET /api/revisions/:pcId` → `server/routes/revisionRoutes.js` → `server/controllers/revisionController.js`
     - **Models:** `Comment` (`server/models/comment.js`), `CommentTarget` (`server/models/commentTarget.js`), `AssignmentWorkflowLog`, `CourseOfferingAssignment`

---

## Section 2: Decision Summary Dashboard

All **22** verified in-scope Learning Plan Composition update items (`COMP-001` through `COMP-022`) extracted from the defense transcript and verified against the codebase are summarized below by **Priority Level**, **Agreement Status**, and **Change Type**. *(Out-of-scope items owned by other modules are cataloged separately in Section 4.)*

### 2.1 Breakdown by Priority Level

| Priority Level | Count | Item IDs |
| :--- | :---: | :--- |
| **`P0 - Critical`** | **6** | `COMP-001`, `COMP-003`, `COMP-004`, `COMP-006`, `COMP-016`, `COMP-018` |
| **`P1 - High`** | **11** | `COMP-002`, `COMP-007`, `COMP-008`, `COMP-010`, `COMP-011`, `COMP-012`, `COMP-013`, `COMP-015`, `COMP-020`, `COMP-021`, `COMP-022` |
| **`P2 - Medium`** | **4** | `COMP-005`, `COMP-009`, `COMP-014`, `COMP-019` |
| **`P3 - Low`** | **1** | `COMP-017` |
| **Total In-Scope Items** | **22** | `COMP-001` – `COMP-022` |

### 2.2 Breakdown by Agreement Status

| Agreement Status | Count | Item IDs |
| :--- | :---: | :--- |
| **`Confirmed / Agreed`** | **17** | `COMP-001`, `COMP-002`, `COMP-003`, `COMP-004`, `COMP-006`, `COMP-007`, `COMP-008`, `COMP-009`, `COMP-010`, `COMP-011`, `COMP-013`, `COMP-014`, `COMP-015`, `COMP-016`, `COMP-018`, `COMP-020`, `COMP-022` |
| **`Conditional / Needs Clarification`** | **4** | `COMP-005`, `COMP-012`, `COMP-019`, `COMP-021` |
| **`Optional Suggestion`** | **1** | `COMP-017` |
| **Total In-Scope Items** | **22** | `COMP-001` – `COMP-022` |

### 2.3 Breakdown by Change Type

| Change Type | Count | Item IDs |
| :--- | :---: | :--- |
| **`New Feature / Addition`** | **5** | `COMP-006`, `COMP-011`, `COMP-012`, `COMP-013`, `COMP-016` |
| **`Modification`** | **3** | `COMP-004`, `COMP-010`, `COMP-014` |
| **`UI/UX Refinement`** | **4** | `COMP-002`, `COMP-007`, `COMP-009`, `COMP-017` |
| **`Validation / Business Rule`** | **4** | `COMP-005`, `COMP-008`, `COMP-015`, `COMP-021` |
| **`Schema / API`** | **3** | `COMP-001`, `COMP-003`, `COMP-018` |
| **`Bug Fix`** | **3** | `COMP-019`, `COMP-020`, `COMP-022` |
| **Total In-Scope Items** | **22** | `COMP-001` – `COMP-022` |

---

## Section 3: Hierarchical Update Checklist (Ordered Along the Instructor Journey)

---

## Category 1: Course Assignment Receipt, Deadlines & Composition Entry (`Dashboard.jsx`, `AssignedCourses.jsx`, `CoursesTable.jsx`)

### Recommended Agent Role & Session Kickoff Prompt
- **Fitted Role(s):** `Sequelize Data-Contract & Migration Architect` + `React Dashboard & Notification UX Engineer`
- **Core Focus:** Unifying cross-module offering/assignment data contracts, replacing hardcoded semester date ranges with live `AcademicPeriod` boundaries, and surfacing submission deadlines, countdowns, and overdue reminders across Dashboard and Assigned Courses views.

> **Copy & Paste into a Fresh Agent Session for This Category:**
> ```text
> Act as a Sequelize Data-Contract & Migration Architect and React Dashboard & Notification UX Engineer working on the Learning Plan Composition module (`unc-lpms-react`).
>
> Your task in this session is to implement ONLY the approved updates under **Category 1: Course Assignment Receipt, Deadlines & Composition Entry (`Dashboard.jsx`, `AssignedCourses.jsx`, `CoursesTable.jsx`)** (`COMP-001`, `COMP-002`, `COMP-022`) in `defense-updates/TODO_DEFENSE_UPDATES.md`.
>
> Follow these strict execution rules:
> 1. Read `Category 1: Course Assignment Receipt, Deadlines & Composition Entry (`Dashboard.jsx`, `AssignedCourses.jsx`, `CoursesTable.jsx`)` in `defense-updates/TODO_DEFENSE_UPDATES.md` and inspect all listed files in `client/` and `server/` before editing any code.
> 2. Replace the hardcoded semester date windows (`June 01–Nov 25` / `Dec 09–Apr 27`) in `assignmentController.js` and `dashboardController.js` with `AcademicPeriod`-driven queries and drive `CoursesTable.jsx`'s term selector from `GET /api/academic-periods` (preserving empty new terms and read-only `Approved`-only past archives); align `ProgramCourseOffering` / `CourseOfferingAssignment` / `AcademicPeriod` migrations and surface Program Head submission start/due dates, countdowns, and overdue reminders consistently across `CurrentTermCard.jsx`, `MiniAssignedCourses.jsx`, `CoursesTable.jsx`, and `NotificationBell.jsx` using existing `.module.sass` conventions.
> 3. Only implement unchecked (`- [ ]`) items marked `Confirmed / Agreed`. If any item in this category is marked `Conditional / Needs Clarification` or `Optional Suggestion`, pause and ask for my explicit confirmation before coding it.
> 4. Keep all changes strictly scoped to this category and match existing project conventions—do not break adjacent composition steps or out-of-scope LPMS modules.
> 5. After implementing and verifying each item (including any required migrations, validations, or UI checks), briefly report the changes made and mark the completed checkboxes as `- [x]` in `defense-updates/TODO_DEFENSE_UPDATES.md`.
> ```

- [ ] **[COMP-001] Unify Cross-Module Database Seeders & Assigned Course Offering Data Contracts for Live End-to-End Composition**
  - **Identifiers:** `Priority: P0 - Critical` | `Type: Schema / API` | `Agreement: Confirmed / Agreed` | `Effort: High` | `Integration Impact: Course Assignment & Submissions/Approval Modules`
  - **Target Page / Section:** `client/src/pages/AssignedCourses.jsx` → `client/src/components/CoursesTable.jsx` & `client/src/pages/Dashboard.jsx` → `client/src/components/MiniAssignedCourses.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/pages/AssignedCourses.jsx`, `client/src/components/CoursesTable.jsx`, `client/src/components/MiniAssignedCourses.jsx`, `client/src/components/CurrentTermCard.jsx`, `client/src/components/NotificationBell.jsx`
    - *Backend / DB:* `server/controllers/assignmentController.js`, `server/controllers/dashboardController.js`, `server/controllers/notificationController.js`, `server/models/programCourseOffering.js`, `server/models/courseOfferingAssignment.js`, `server/models/academicPeriod.js`, `server/seeders/20260512030000-seed-composition-foundation.js`
  - **Description of Change:** Currently, the Learning Plan Composition module operates on its own isolated database container and pre-populated seeders (`20260512030000-seed-composition-foundation.js`, `20260515000000-seed-returned-lp-hci.js`, `20260528000000-seed-approved-lp-oop.js`, etc.). When the Program Head uploaded the COAEP and assigned a course (e.g., OOP / HCI) during the defense, the newly assigned offering and its parsed COAEP outcomes did not appear directly in the Instructor's Composition view without switching databases/containers. Connect and unify the shared database/API data contract so that when a Program Head uploads an approved COAEP and assigns an instructor to a `ProgramCourseOffering` (`CourseOfferingAssignment`), the assignment and its parsed `CourseOutcome` / `IntendedLearningOutcome` records are immediately queryable by `GET /api/assignments` and `GET /api/dashboard/summary`.
  - **Rationale & Agreement Justification:** During the live trace from Program Head to Instructor, Speaker 1 and Speaker 4 noticed the modules were running on separate databases (*"Takot pa po kasi kaming mag-merge"* / *"Ibang container! Ibang data!"*). Both panelists confirmed that full database and workflow integration across Course Assignment $\rightarrow$ Composition $\rightarrow$ Approval is mandatory.
  - **Transcript Citation(s):**
    - `[00:30:00 - 00:45:00]` at `[00:39:23]` – `[00:40:17]` (**Speaker 5 / Speaker 2 / Speaker 1 / Speaker 4**): *"Speaker 5: Ay, pero sir, ano po... hindi pa kami, sir, integrated po... Speaker 2: Sa akin lang po, pero sa kanya iba po. Takot pa po kasi kaming mag-merge. Speaker 1: Tine-trace natin from start to finish 'to."*
    - `[01:15:00 - 01:30:00]` at `[01:18:48]` – `[01:19:40]` (**Speaker 5 / Speaker 2 / Speaker 4 / Speaker 1**): *"Speaker 5: Iba kaya 'yung page niya 'yun, sir, eh... 'Di pa kami ano, merged. Speaker 4: Ibang container! Ibang data! Speaker 1: That's why kailangan i-integrate ito."*
    - `[01:15:00 - 01:30:00]` at `[01:27:23]` (**Speaker 4**): *"Let's integrate na lang... Polishing na lang 'to."*

- [ ] **[COMP-002] Display Learning Plan Submission Deadline, Countdown & Overdue Reminder Alerts on Instructor Dashboard and Course Cards**
  - **Identifiers:** `Priority: P1 - High` | `Type: UI/UX Refinement` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: Course Assignment / Submissions Management Module`
  - **Target Page / Section:** `client/src/pages/Dashboard.jsx` (`CurrentTermCard.jsx`, `MiniAssignedCourses.jsx`), `client/src/pages/AssignedCourses.jsx` (`CoursesTable.jsx`), and `client/src/components/NotificationBell.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/CurrentTermCard.jsx`, `client/src/components/MiniAssignedCourses.jsx`, `client/src/components/CoursesTable.jsx`, `client/src/components/NotificationBell.jsx`
    - *Backend / DB:* `server/controllers/assignmentController.js`, `server/controllers/dashboardController.js`, `server/controllers/notificationController.js`, `server/models/courseOfferingAssignment.js`, `server/models/academicPeriod.js`, `[NEW MIGRATION]` (add `submission_start_at` / `submission_deadline` columns to `CourseOfferingAssignments` or `academic_periods`)
  - **Description of Change:** Currently, `CoursesTable.jsx`, `MiniAssignedCourses.jsx`, and `NotificationBell.jsx` display assignment creation/submission timestamps and workflow logs (`DRAFT`, `PENDING`, `RETURNED`, `APPROVED`), and `CurrentTermCard.jsx` only displays institutional calendar milestones (`classes_start`, exam dates)—none display the **Learning Plan submission start/due date** configured by the Program Head or automated deadline reminder notifications. Update the assignment cards, dashboard mini-cards, calendar milestone list, and notification feed (`notificationController.js`) to display the Learning Plan submission start/due date, remaining days/countdown, and automated in-app reminder alerts when a draft/returned plan is approaching or past its due date.
  - **Rationale & Agreement Justification:** Speaker 1 emphasized at the start and end of the defense that the system's primary value is enforcing timely submission (e.g., 2 weeks before start of classes) and notifying faculty of the creation start date and final submission deadline. Speaker 2 confirmed automated reminders surface on the instructor's side, and Speaker 1/Speaker 4 agreed in-app reminders (and optional free email without paid SMS gateways) are appropriate.
  - **Transcript Citation(s):**
    - `[00:00:00 - 00:15:00]` at `[00:01:55]` – `[00:02:27]` (**Speaker 2 / Speaker 1**): *"Speaker 2: 'Yung deadline po ng learning plan po, for example, is dapat po ma-submit po siya two weeks before the start of— ... The Program Head can ano, set the deadline, then 'yung notification automatically will send to the faculty."*
    - `[00:15:00 - 00:30:00]` at `[00:26:52]` – `[00:27:05]` (**Speaker 1 / Speaker 2**): *"Speaker 1: Kasi look, the notification now should notify the faculty para malaman po kung kailan po mag-start ng learning plan creation and the final submission, right?"*
    - `[01:45:00 - 01:51:59]` at `[01:48:10]` – `[01:49:41]` (**Speaker 2 / Speaker 1 / Speaker 4**): *"Speaker 1: ...Paano mag-remind? How does reminder will happen? Speaker 2: Automated, sir, ta's sa side ng instructor, lalabas na dito."*

- [ ] **[COMP-022] Replace Hardcoded Semester Date Windows with Dynamic `AcademicPeriod` Linking & Archive-Mode Read-Only Integrity**
  - **Identifiers:** `Priority: P1 - High` | `Type: Bug Fix` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: User/Term Setup (VPAA Calendar) & Course Assignment Modules`
  - **Target Page / Section:** `client/src/components/CoursesTable.jsx` (Term/Year filter bar) & `client/src/pages/Dashboard.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/CoursesTable.jsx`, `client/src/pages/Dashboard.jsx`
    - *Backend / DB:* `server/controllers/assignmentController.js`, `server/controllers/dashboardController.js`, `server/models/academicPeriod.js`, `server/models/programCourseOffering.js`, `server/models/courseOfferingAssignment.js`, `[NEW MIGRATION]` (add nullable FK `academic_period_id` on `ProgramCourseOfferings` or `CourseOfferingAssignments`)
  - **Description of Change:** Currently, both `server/controllers/assignmentController.js` (lines `16–36`) and `server/controllers/dashboardController.js` (lines `139–147`) filter instructor assignments using **hardcoded calendar date windows** (`June 01 – Nov 25` for `1st Sem` and `Dec 09 – Apr 27` for `2nd Sem`), completely ignoring `AcademicPeriod.start_date` / `end_date` uploaded by the VPAA. In addition, `CoursesTable.jsx` (lines `36–47`) builds a synthetic `2000–present` dropdown with only `['1st Sem', '2nd Sem']` instead of fetching `GET /api/academic-periods` (omitting `Summer` terms and real `Closed`/archived period boundaries). Although `CoursesTable.jsx` (lines `63–71`) already restricts past years to `APPROVED` plans only, any calendar shift from VPAA's uploaded calendar will hide active assignments. Link assignments/offerings to `AcademicPeriod` (using `academic_period_id` or `AcademicPeriod.start_date`–`end_date`), drive the `CoursesTable.jsx` period dropdown directly from `GET /api/academic-periods`, ensure newly opened terms start completely empty until assigned, and preserve read-only archive viewing for closed/past terms.
  - **Rationale & Agreement Justification:** Speaker 1 emphasized that when a new school calendar/year is uploaded by the VPAA, active dashboards must start empty for the new term while past terms move cleanly into an accessible archive (`"Remember, nag-upload tayo ng new school calendar, new school year. It should all be empty... Pwede bang balikan sa archive?"`). Hardcoded semester date boundaries break this behavior whenever real VPAA calendar dates differ from June 1 / Dec 9.
  - **Transcript Citation(s):**
    - `[00:00:00 - 00:15:00]` at `[00:09:44]` – `[00:10:02]` (**Speaker 3 / Speaker 1**): *"Speaker 3: ...it will automatically close po and then mapupunta po here sa past academic year. Speaker 1: Okay."*
    - `[00:00:00 - 00:15:00]` at `[00:11:34]` – `[00:12:52]` (**Speaker 1 / Speaker 3**): *"Speaker 1: Remember, nag-upload tayo ng new school calendar, new school year. It should all be empty. So meaning wala pa 'yung functionality na nag-e-empty lahat, 'no? ... Pwede bang balikan sa archive? Like the past submissions, if I go back to another term..."*

---

## Category 2: Course Details & COAEP / Outcome Alignment (`CourseDetails.jsx`, `OutcomeAlignment.jsx`, `ILOs.jsx`)

### Recommended Agent Role & Session Kickoff Prompt
- **Fitted Role(s):** `UNC/CHED Academic Compliance & Curriculum Schema Engineer` + `RBAC Guardrail & React Matrix Engineer`
- **Core Focus:** Removing hardcoded CO/ILO/hour assumptions so COAEP outcomes render dynamically, enforcing blank-slate draft initialization, and locking approved institutional metadata with defensive backend role/status guards.

> **Copy & Paste into a Fresh Agent Session for This Category:**
> ```text
> Act as a UNC/CHED Academic Compliance & Curriculum Schema Engineer and RBAC Guardrail & React Matrix Engineer working on the Learning Plan Composition module (`unc-lpms-react`).
>
> Your task in this session is to implement ONLY the approved updates under **Category 2: Course Details & COAEP / Outcome Alignment (`CourseDetails.jsx`, `OutcomeAlignment.jsx`, `ILOs.jsx`)** (`COMP-003` to `COMP-005`) in `defense-updates/TODO_DEFENSE_UPDATES.md`.
>
> Follow these strict execution rules:
> 1. Read `Category 2: Course Details & COAEP / Outcome Alignment (`CourseDetails.jsx`, `OutcomeAlignment.jsx`, `ILOs.jsx`)` in `defense-updates/TODO_DEFENSE_UPDATES.md` and inspect all listed files in `client/` and `server/` before editing any code.
> 2. Eliminate all hardcoded CO/ILO/hour limits (`courseCriteriaController.js:50, 67`'s 4x3 loop, `ILOs.jsx:274-282`'s hardcoded `5 Hr` exam rows, and `ILOs.jsx:224`'s `courseOrientation.id` vs. `orientationWeekId` badge bug), keep Course Orientation / institutional outcomes cleanly separated from COAEP ILOs, and update draft seeders/initialization so new `Draft` offerings start with blank weekly Topics/TLAs/References while retaining COAEP Course Details, CO-PO alignments, and CO/ILO/Week shells.
> 3. Only implement unchecked (`- [ ]`) items marked `Confirmed / Agreed`. If any item in this category is marked `Conditional / Needs Clarification` or `Optional Suggestion` (`COMP-005` — read-only vs. editable `OutcomeAlignment.jsx` with Program Head review flag), pause and ask for my explicit confirmation before coding it.
> 4. Keep all changes strictly scoped to this category and match existing project conventions—do not break adjacent composition steps or out-of-scope LPMS modules.
> 5. After implementing and verifying each item (including any required migrations, validations, or UI checks), briefly report the changes made and mark the completed checkboxes as `- [x]` in `defense-updates/TODO_DEFENSE_UPDATES.md`.
> ```

- [ ] **[COMP-003] Enforce Dynamic COAEP-Driven Course Outcomes, ILOs, Assessment Tools & Non-Fixed Institutional Outcomes (Remove Hardcoded 4×3 & 5-Hr Assumptions)**
  - **Identifiers:** `Priority: P0 - Critical` | `Type: Schema / API` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: Course Assignment / Program Head COAEP Upload`
  - **Target Page / Section:** `client/src/components/OutcomeAlignment.jsx`, `client/src/components/ILOs.jsx`, `client/src/components/CourseCoverage.jsx`, `client/src/components/CriteriaForGrading.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/OutcomeAlignment.jsx`, `client/src/components/ILOs.jsx`, `client/src/components/CourseCoverage.jsx`, `client/src/components/CriteriaForGrading.jsx`
    - *Backend / DB:* `server/controllers/courseOutcomeAlignmentController.js`, `server/controllers/iloController.js`, `server/controllers/courseCoverageController.js`, `server/controllers/courseCriteriaController.js`, `server/controllers/topicController.js`, `server/models/courseOutcome.js`, `server/models/intendedLearningOutcome.js`, `server/seeders/20260512030000-seed-composition-foundation.js`
  - **Description of Change:** Verified codebase inspection revealed multiple hardcoded assumptions that break dynamic COAEP ingestion:
    1. **Institutional Outcome vs. Course Orientation Separation (`[00:40:23]`–`[00:41:41]`):** While `iloController.js` already separates `courseOrientation` (`is_orientation: true`) from regular `CourseOutcomes`, seeded orientation text and COAEP outcome items must never mix institutional outcomes (VMO / Course Orientation) into a course's ILO list, and `ILOs.jsx` line `224` currently passes `courseOrientation.id` (`ilo_id`) instead of `orientationWeekId` (`week_id`) to `getTotalBadgeCount()`, preventing unresolved review badges from displaying on the Course Orientation row.
    2. **Hardcoded `4` COs $\times$ `3` ILOs Limit:** `server/controllers/courseCriteriaController.js` lines `50` and `67` literally hardcode `for (let coIndex = 0; coIndex < 4; coIndex++)` and `for (let iloPos = 0; iloPos < 3; iloPos++)`, silently truncating any COAEP that defines 4 ILOs under a CO (e.g., Speaker 4's `"Apat, tulo, apat, apat"` structure) or a non-4 CO count.
    3. **Hardcoded `5 Hr` Exam Rows & Week-9 Break:** `client/src/components/ILOs.jsx` lines `274–282` hardcode `Week 9 • 5 Hr` and `Week 18 • 5 Hr` regardless of course contact hours (e.g., 3-hr lecture-only courses), and `topicController.js:201` / `courseCoverageController.js` assume Midterm always occurs immediately after CO2.
    4. **Dynamic Rendering & Lock:** Render COs, ILOs, and POs dynamically from the Program Head's uploaded official UNC COAEP without artificial 4×3 caps, while keeping approved COAEP outcomes read-only for instructors.
  - **Rationale & Agreement Justification:** Speaker 4 immediately caught an institutional outcome appearing inside the ILO area (`"that is not part of... that is institutional outcome"`) and emphasized that CO/ILO counts vary per course (`"Apat, tulo, apat, apat"`) and must strictly come from the Program Head's uploaded official UNC COAEP form (`"Kung ano 'yung nasa COAP na file... i-upload"`).
  - **Transcript Citation(s):**
    - `[00:30:00 - 00:45:00]` at `[00:35:34]` – `[00:37:37]` (**Speaker 4 / Speaker 1**): *"Speaker 4: ...i-a-upload ng Program Head si form. Tapos babasahin niya ito, isi-save niya sa database, tapos i-a-assign niya. ... Kung ano 'yung nasa COAP na file... 'yun ang gagamitin."*
    - `[00:30:00 - 00:45:00]` at `[00:40:23]` – `[00:41:41]` (**Speaker 4 / Speaker 5 / Speaker 1**): *"Speaker 4: 'Yung set the quality... that is not part of... that is institutional outcome. ... Apat, tulo... Apat, tulo, apat, apat..."*
    - `[00:30:00 - 00:45:00]` at `[00:43:07]` – `[00:43:19]` (**Speaker 1 / Speaker 5 / Speaker 4**): *"Speaker 1: But this is editable? Pwede kong i-change halimbawa? Speaker 5: Hindi po, kasi na-approve na po 'yan ng Program Head. Speaker 4: So malalagyan na lang ng topics?"*

- [x] **[COMP-004] Default New Semester Course Assignments to a Blank Slate with Explicit "Load Previous Syllabus" Option (Instead of Auto-Preloading Sample Content)**
  - **Identifiers:** `Priority: P0 - Critical` | `Type: Modification` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: Course Assignment Module & Database Seeders`
  - **Target Page / Section:** `client/src/components/ILOs.jsx` & `client/src/pages/TopicForm.jsx` (and backend seeders/assignment initialization)
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/ILOs.jsx`, `client/src/pages/TopicForm.jsx`, `client/src/pages/TLAForm.jsx`, `client/src/pages/ReferenceForm.jsx`
    - *Backend / DB:* `server/controllers/iloController.js`, `server/controllers/topicController.js`, `server/controllers/tlaController.js`, `server/seeders/20260514000000-seed-draft-lp-integrative-prog.js`, `server/seeders/20260525000000-reset-hci-to-draft.js`
  - **Description of Change:** Currently, all draft courses in the database seeders have their weekly Topics, Subtopics, TLAs, and References pre-populated with full sample data, so opening a `Draft` course immediately displays completed weekly content. Panelists strongly objected to auto-populating the entire learning plan by default because instructors will become complacent and submit without reviewing or authoring thoughtfully. Update composition initialization and demo seeders so that a newly assigned `Draft` course starts with a **blank slate** for weekly Topics, Subtopics, TLAs, and Weekly References (retaining only the COAEP-derived Course Details, CO-PO Alignments, and CO/ILO/Week shells), while providing an explicit opt-in action (see `[COMP-006]` and `[COMP-011]`) to load or copy from a previous semester's syllabus if one exists.
  - **Rationale & Agreement Justification:** After initially debating carry-over at `[00:43:57]`–`[00:48:50]`, Speaker 1 and Speaker 4 finalized the exact rule at `[00:59:54]`–`[01:01:46]`: the canvas must start **empty by default** (*"dapat empty muna"*), with opt-in buttons to load previous semester content or use AI Suggest so faculty remain actively engaged.
  - **Transcript Citation(s):**
    - `[00:00:00 - 00:15:00]` at `[00:11:49]` (**Speaker 1**): *"Remember, nag-upload tayo ng new school calendar, new school year. It should all be empty."*
    - `[00:30:00 - 00:45:00]` at `[00:43:57]` – `[00:44:58]` (**Speaker 1 / Speaker 4 / Speaker 5**): *"Speaker 1: Can you give us one subject na walang content? Speaker 5: Lahat po, sir, tig-lagyan ko ng sample."*
    - `[00:45:00 - 01:00:00]` at `[00:59:54]` – `[00:59:59]` & `[01:00:00 - 01:15:00]` at `[01:00:15]` – `[01:01:46]` (**Speaker 1 / Speaker 4**): *"Speaker 1: ...can we get a blank slate na lang muna? Huwag mo nang punuin agad—hayaan mo muna 'yung teacher mag-isip... Ang mangyayari, dapat empty muna, pero pwede niya i-load do'n... Speaker 4: Kasi kung may previous syllabus siya, 'di mo ilalatag agad."*

- [ ] **[COMP-005] Clarify & Enforce Role Permissions on "Edit Alignments" (`OutcomeAlignment.jsx`) and Backend Write-Guards on Locked Metadata**
  - **Identifiers:** `Priority: P2 - Medium` | `Type: Validation / Business Rule` | `Agreement: Conditional / Needs Clarification` | `Effort: Low` | `Integration Impact: Course Assignment / Submissions Management Module`
  - **Target Page / Section:** `client/src/components/OutcomeAlignment.jsx` → `Edit Alignments` button & matrix dropdowns (plus backend route guards)
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/OutcomeAlignment.jsx`, `client/src/components/CourseDetails.jsx`
    - *Backend / DB:* `server/controllers/courseOutcomeAlignmentController.js`, `server/routes/courseOutcomeAlignment.js`, `server/controllers/courseDetailsController.js`, `server/routes/courseDetails.js`, `server/routes/ilos.js`, `server/middleware/auth.js`
  - **Description of Change:** Currently, `OutcomeAlignment.jsx` renders dynamic `programOutcomes` from the database (falling back to `PO1`–`PO9` on line `161`) and exposes an `Edit Alignments` button allowing instructors to freely alter `I` / `E` / `D` cells via `PUT /api/course-outcome-alignment/:pcId/:revNum` without status/role checks (and `courseOutcomeAlignmentController.js:94` lacks a null guard on `programOutcomes[i]`). Similarly, backend endpoints `PUT /api/course-details/:pcId/:revNum` (which permits modifying master `Course` columns on lines `95–109` even though `CourseDetails.jsx` only sends `description`) and `PUT /api/ilos/:ilo_id/schedule` lack RBAC and workflow-status locks (allowing edits even when `Pending` or `Approved`). Clarify with stakeholders whether instructors should retain `Edit Alignments` with a Program Head review flag, or if CO-PO mappings become read-only once uploaded by the Program Head, and enforce backend role/status guards on all syllabus mutation endpoints.
  - **Rationale & Agreement Justification:** At `[01:12:29]`–`[01:13:45]`, Speaker 4 noted that Program Heads decide CO–PO course mapping (`"Program Head nagse-set ng CO sa PO"`), while also allowing instructor edits subject to Program Head verification (`"Ang instructor, oo, pero che-check-in ng Program Head"`) and confirming PO columns must remain dynamic per uploaded PO template. Because both options were discussed without locking one final toggle, this remains `Conditional / Needs Clarification`.
  - **Transcript Citation(s):**
    - `[01:00:00 - 01:15:00]` at `[01:12:29]` – `[01:13:49]` (**Speaker 4 / Speaker 1 / Speaker 2**): *"Speaker 4: Ay, wait lang. Balik ka do'n sa ano... 'Edit Alignment'. ... it will be decided by the Program Head, tapos may course mapping. Speaker 1: Pero 'di pwedeng i-edit ng instructor? Speaker 4: Ang instructor, oo, pero che-check-in ng Program Head. ... Actually, sir, dynamic 'yan. Nag-upload ka ng PO, 'di ba? Dynamic 'yan."*

---

## Category 3: Weekly Content Planner — Topics, Subtopics & AI Topic Suggest (`TopicForm.jsx`, `TopicSelector.jsx`, `AiTopicSuggestModal.jsx`)

### Recommended Agent Role & Session Kickoff Prompt
- **Fitted Role(s):** `Complex React Form-State & Validation Architect` + `Human-in-the-Loop AI & Spell-Check UX Engineer`
- **Core Focus:** Building opt-in previous-semester topic carry-over, explicit CO term labeling, non-blocking weekly contact-hour budget warnings, and actionable inline `nspell` spell-check remediation across the weekly topic planner.

> **Copy & Paste into a Fresh Agent Session for This Category:**
> ```text
> Act as a Complex React Form-State & Validation Architect and Human-in-the-Loop AI & Spell-Check UX Engineer working on the Learning Plan Composition module (`unc-lpms-react`).
>
> Your task in this session is to implement ONLY the approved updates under **Category 3: Weekly Content Planner — Topics, Subtopics & AI Topic Suggest (`TopicForm.jsx`, `TopicSelector.jsx`, `AiTopicSuggestModal.jsx`)** (`COMP-006` to `COMP-009`) in `defense-updates/TODO_DEFENSE_UPDATES.md`.
>
> Follow these strict execution rules:
> 1. Read `Category 3: Weekly Content Planner — Topics, Subtopics & AI Topic Suggest (`TopicForm.jsx`, `TopicSelector.jsx`, `AiTopicSuggestModal.jsx`)` in `defense-updates/TODO_DEFENSE_UPDATES.md` and inspect all listed files in `client/` and `server/` before editing any code.
> 2. Preserve `TopicForm.jsx`'s in-memory `weekTopicsMap` and `AiTopicSuggestModal.jsx`'s per-week cache while keeping subtopic `minutes` intact on import (do not strip them), clarify time pills as estimated averages (`~45 mins est. avg`), and make over-budget warnings strictly non-blocking (`Warning lang, walang lock`); wire `getSuggestions()` from `client/src/utils/spellChecker.js` (`nspell` + `dictionary-en`) into BOTH `TopicForm.jsx` and standalone `ReferenceForm.jsx` spell-check modals with field-jump/inline edit, whitelist ignore, and previewed `"Accept All Fixes"`.
> 3. Only implement unchecked (`- [ ]`) items marked `Confirmed / Agreed`. If any item in this category is marked `Conditional / Needs Clarification` or `Optional Suggestion`, pause and ask for my explicit confirmation before coding it.
> 4. Keep all changes strictly scoped to this category and match existing project conventions—do not break adjacent composition steps or out-of-scope LPMS modules.
> 5. After implementing and verifying each item (including any required migrations, validations, or UI checks), briefly report the changes made and mark the completed checkboxes as `- [x]` in `defense-updates/TODO_DEFENSE_UPDATES.md`.
> ```

- [x] **[COMP-006] Add "Load Previous Semester Syllabus / Weekly Topics" Opt-In Carry-Over Feature**
  - **Identifiers:** `Priority: P0 - Critical` | `Type: New Feature / Addition` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: None (Self-Contained in Composition DB)`
  - **Target Page / Section:** `client/src/pages/TopicForm.jsx` (`TopicSubForm` / `TopicSelector.jsx`) & `client/src/components/ILOs.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/pages/TopicForm.jsx`, `client/src/components/TopicSelector.jsx`, `client/src/components/ILOs.jsx`
    - *Backend / DB:* `server/controllers/topicController.js`, `server/routes/topics.js`
  - **Description of Change:** Currently, `TopicSelector.jsx` lets an instructor pick individual unassigned topics from `GET /api/topics/available`, continue a topic from the prior week within the same CO (`Continue Previous Topic`), or use `AI Suggest`, while `Revisions.jsx` only shows read-only historical revisions—there is no opt-in action to **load/carry over previous semester topics (or an entire previous approved revision's weekly content)** into the current blank draft for editing. Add an explicit `"Load Previous Semester Topics"` / `"Carry Over Previous Syllabus"` action (both at the Weekly Topic planner level in `TopicSelector.jsx` and optionally at the syllabus level in `ILOs.jsx`) that fetches topics/subtopics from the latest prior approved offering/revision for the same `course_id`, lets the instructor preview/confirm, and imports them as editable cards.
  - **Rationale & Agreement Justification:** Both Speaker 1 and Speaker 4 strongly agreed that instructors handling an existing course should be able to explicitly choose between: (1) loading the previous semester's syllabus/topics as an editable starting point, (2) authoring custom topics from scratch, or (3) using AI Suggest—never forced automatically, always opt-in.
  - **Transcript Citation(s):**
    - `[00:30:00 - 00:45:00]` at `[00:44:38]` – `[00:44:58]` (**Speaker 4 / Speaker 1**): *"Speaker 4: ...isama niyo na lang na functionality kaya na pwede niyang i-edit si faculty, pwede niyang i-load 'yung previous syllabus. Speaker 1: Yes, carry over. Speaker 4: Pwede mo siya ma-carry over, or gusto mo mag-edit... or you can create your own."*
    - `[00:45:00 - 01:00:00]` at `[00:48:04]` – `[00:49:33]` (**Speaker 4**): *"Then in the previous semester, ito 'yung mga topic... 'Yan, gusto mo ba 'yan gamitin? So 'pag nag-confirm, 'oo', then i-load na niya. ... May previous ka—previous topic, ay, last semester topics niya, tapos may AI Suggest."*
    - `[01:00:00 - 01:15:00]` at `[01:00:49]` – `[01:01:21]` (**Speaker 4**): *"Same concept din naman sa topic... previous topic, or I can have my own, or I can use AI."*

- [ ] **[COMP-007] Display Examination Period / Term Name Alongside CO Label in Weekly Planner Navigation (e.g., `CO 1 — Prelim Term`, `CO 4 — Final Term`)**
  - **Identifiers:** `Priority: P1 - High` | `Type: UI/UX Refinement` | `Agreement: Confirmed / Agreed` | `Effort: Low` | `Integration Impact: None`
  - **Target Page / Section:** `client/src/components/FormNavigation.jsx`, `client/src/pages/TopicForm.jsx`, `client/src/components/ILOs.jsx`, `client/src/components/CourseCoverage.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/FormNavigation.jsx`, `client/src/pages/TopicForm.jsx`, `client/src/components/ILOs.jsx`, `client/src/components/CourseCoverage.jsx`
    - *Backend / DB:* `server/controllers/topicController.js` (`getWeekContext` returning `termLabel` / `periodLabel` per CO)
  - **Description of Change:** Currently, the CO switcher dropdown/header in `FormNavigation.jsx` and `TopicForm.jsx` displays only `CO 1`, `CO 2`, `CO 3`, `CO 4` (and `ILOs.jsx` / `CourseCoverage.jsx` omit the period name on the CO header itself). When viewing Weeks 14–17 during the defense, Speaker 1 was confused why Weeks 1–13 were not visible until Speaker 5 explained it was `CO 4`. Add the explicit grading period / term label alongside every Course Outcome header and switcher option (e.g., `CO 1 — Prelim Term`, `CO 2 — Midterm Term`, `CO 3 — Semi-Final Term`, `CO 4 — Final Term`, with dynamic mapping if a course has fewer/more COs).
  - **Rationale & Agreement Justification:** Directly instructed by Speaker 4 immediately after Speaker 1's confusion over why only Weeks 14–17 appeared.
  - **Transcript Citation(s):**
    - `[00:45:00 - 01:00:00]` at `[00:55:44]` – `[00:56:18]` (**Speaker 1 / Speaker 5 / Speaker 4**): *"Speaker 1: Bakit Week 14 lang ang nakikita ko hanggang 17? Where is Week 1 to 13? Speaker 5: CO4 po 'yan. Speaker 1: Ah, CO4 pala. Okay. Speaker 4: Ang ilagay mo, 'di ba, si CO4 tapos 'Final Term'. Ilagay mo pa 'yung term—CO4 Final Term."*

- [ ] **[COMP-008] Enforce Non-Blocking Over-Budget Hours Warning on Topic Import, Editing & Save + Clarify Estimated Average Time Label**
  - **Identifiers:** `Priority: P1 - High` | `Type: Validation / Business Rule` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: None`
  - **Target Page / Section:** `client/src/components/AiTopicSuggestModal.jsx`, `client/src/components/TopicSelector.jsx` & `client/src/pages/TopicForm.jsx` (`TopicSubForm`)
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/AiTopicSuggestModal.jsx`, `client/src/components/TopicSelector.jsx`, `client/src/pages/TopicForm.jsx`
    - *Backend / DB:* `server/controllers/topicController.js`, `server/models/subtopic.js`, `[NEW MIGRATION]` (optional `estimated_minutes` integer column on `Subtopics` if time tracking persists across reloads)
  - **Description of Change:** Verified current code shows that `AiTopicSuggestModal.jsx` (lines `638–644`) **already** renders an inline orange banner (`styles.timeBudgetBanner` + `styles.budgetOver`) inside the modal when checked suggestions exceed the weekly budget. However, three concrete gaps triggered the panel's critique:
    1. **Ambiguous Time Pill (`[00:51:33]`–`[00:52:05]`):** Subtopic time pills currently show raw `"45 mins"` without clarifying whether it is a minimum, maximum, or estimated average—update label/tooltip to `~45 mins (est. avg)`.
    2. **Silent Over-Budget Import (`AiTopicSuggestModal.jsx:467–513`):** Clicking `Import Selected Topics` does **not** pop a human-in-the-loop confirmation warning when `isOverBudget === true`, AND lines `501–507` **strip `minutes`** off every subtopic upon import.
    3. **Zero Post-Import Budget Tracking (`TopicSelector.jsx` & `TopicForm.jsx`):** Once topics are imported into `TopicForm.jsx` (or manually added), the weekly planner shows no cumulative estimated hours counter and fires no non-blocking warning notification on import or save when estimated time exceeds the week's allotted contact hours (e.g., `6.5 hrs estimated vs. 5 hrs allotted`).
    Preserve subtopic estimated minutes into `TopicForm.jsx` (and optionally persist via `Subtopic.estimated_minutes`), show a persistent weekly time-budget pill in `TopicSelector.jsx`, and trigger a clear **non-blocking confirmation warning** (`"Warning: Estimated topics take ~6.5 hrs, exceeding your 5-hr weekly allotment. Proceed anyway?"` — never hard-locking the instructor).
  - **Rationale & Agreement Justification:** Both Speaker 1 and Speaker 4 explicitly agreed on a **non-blocking warning** (*"Warning lang, walang lock... To retain pa rin the human in the loop... Dapat sa system may mag-notify diyan"*) so faculty remain aware of over-allocation while keeping final pedagogical discretion.
  - **Transcript Citation(s):**
    - `[00:45:00 - 01:00:00]` at `[00:51:33]` – `[00:52:05]` (**Speaker 4 / Speaker 5**): *"Speaker 4: Ano ba 'yan? Maximum or minimum? 45 minutes maximum or minimum? ... Speaker 5: Parang estimation lang po, sir, average lang."*
    - `[00:45:00 - 01:00:00]` at `[00:52:18]` – `[00:55:44]` (**Speaker 1 / Speaker 4 / Speaker 5 / Speaker 2**): *"Speaker 1: Week 14, hello! Chine-check ba ng system niyo kung sobra na 'yan?... Ang hinahanap ko lang, may notification na 'Wait lang! Ano 'to, 6 hours na 'yan, sobra na 'yan!' Speaker 4: Warning lang. Warning lang, walang lock. ... To retain pa rin the human in the loop. ... Dapat sa system may mag-notify diyan."*

- [ ] **[COMP-009] Upgrade Pre-Save Spell-Check Warning Modal with Inline Editing, Replacement Suggestions, Field Jump Links & Optional "Accept All Fixes"**
  - **Identifiers:** `Priority: P2 - Medium` | `Type: UI/UX Refinement` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: None`
  - **Target Page / Section:** `client/src/pages/TopicForm.jsx` (`Spelling Check Warning` modal, lines `1554–1596`) & `client/src/pages/ReferenceForm.jsx` (duplicate standalone `Spelling Check Warning` modal, lines `600–641`)
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/pages/TopicForm.jsx`, `client/src/pages/ReferenceForm.jsx`, `client/src/pages/TLAForm.jsx`, `client/src/components/SpellCheckInput.jsx`, `client/src/utils/spellChecker.js`
    - *Backend / DB:* None (100% client-side `nspell` + `dictionary-en`)
  - **Description of Change:** Verified source code shows that the `Spelling Check Warning` modals in **both** `TopicForm.jsx` (lines `1554–1596`) and standalone `ReferenceForm.jsx` (lines `600–641`) currently list **only** `item.field` and raw red word badges (`item.words`), with **no replacement suggestions**, no direct `"Jump to Field"` link, no inline edit capability, and no `"Accept All Fixes"` or `"Ignore / Add to Whitelist"` action inside the modal (suggestions via `getSuggestions(word, 6)` only exist in `SpellCheckInput.jsx`'s right-click menu after closing the modal). Upgrade the shared pre-save spell-check warning modal across `TopicForm.jsx` (covering Topics, TLAs, References) and standalone `ReferenceForm.jsx` so each flagged entry displays:
    1. Clickable suggested replacements from `getSuggestions(word)` and an `"Ignore / Add to Dictionary"` button (for valid technical/domain terms).
    2. Either direct **inline editing** inside the modal OR a **"Jump to Field"** button that closes the modal, switches to the exact Week/Tab (`Topics`, `TLAs`, `References`), and scrolls/focuses the flagged input.
    3. An **"Accept All Fixes"** action (previewing the top replacement per word before applying, while preserving `"Save Anyway"`).
  - **Rationale & Agreement Justification:** Speaker 1 immediately flagged the UX friction (*"Paano ko i-e-edit? Dapat may link do'n sa area kung saan mo pwedeng i-edit... hindi ko alam kung saan ko hahanapin!"*), Speaker 4 agreed on inline editing/jumping plus `"Accept All"` with human review for valid domain words, and Speaker 1 categorized it as a minor polish item (*"These are just minor requirements na lang naman"* → `P2 - Medium`).
  - **Transcript Citation(s):**
    - `[00:45:00 - 01:00:00]` at `[00:56:36]` – `[00:58:31]` (**Speaker 1 / Speaker 4 / Speaker 2 / Speaker 5**): *"Speaker 1: Teka, teka. Paano ko i-e-edit? ... Dapat may link do'n sa area kung saan mo pwedeng i-edit. ... Gusto ko i-edit ko na do'n mismo. Kung saang week 'yun. Speaker 4: ...'pag ni-save mo, then magla-labas 'yung mga error. Then diyan mismo siya ma-e-edit. ... Pero pwede mo rin lagyan diyan ng 'Accept All', oo, or e-edit niya isa-isa. Kasi may mga spelling kasi siya na ganito, na tama talaga. Speaker 1: These are just minor requirements na lang naman."*

---

## Category 4: Weekly Content Planner — Teaching & Learning Activities (`TLAForm.jsx`)

### Recommended Agent Role & Session Kickoff Prompt
- **Fitted Role(s):** `Responsive Sass Layout & Split-Pane UI Engineer` + `Instructional Activity (TLA) & Gemini Feature Architect`
- **Core Focus:** Refactoring weekly authoring into a side-by-side Topics ↔ TLAs two-column layout in `.module.sass` and adding opt-in previous-semester TLA carry-over and Gemini-assisted TLA suggestions on a blank-by-default canvas.

> **Copy & Paste into a Fresh Agent Session for This Category:**
> ```text
> Act as a Responsive Sass Layout & Split-Pane UI Engineer and Instructional Activity (TLA) & Gemini Feature Architect working on the Learning Plan Composition module (`unc-lpms-react`).
>
> Your task in this session is to implement ONLY the approved updates under **Category 4: Weekly Content Planner — Teaching & Learning Activities (`TLAForm.jsx`)** (`COMP-010` to `COMP-011`) in `defense-updates/TODO_DEFENSE_UPDATES.md`.
>
> Follow these strict execution rules:
> 1. Read `Category 4: Weekly Content Planner — Teaching & Learning Activities (`TLAForm.jsx`)` in `defense-updates/TODO_DEFENSE_UPDATES.md` and inspect all listed files in `client/` and `server/` before editing any code.
> 2. Refactor `TopicForm.jsx`, `TLAForm.jsx`, `FormNavigation.jsx`, and the existing `.module.sass` stylesheets (`Form.module.sass`, `TopicSelector.module.sass`, `FormNavigation.module.sass`) so Topics and TLAs display cleanly side-by-side per week without breaking consolidated save, dirty-state tracking, or the `Review Feedback` sidebar; build `Load Previous TLAs` and `AiTlaSuggestModal.jsx` (`POST /api/tlas/ai-suggest` in `tlaController.js` / `tlaRoutes.js`) as strictly opt-in triggers over a blank-by-default TLA canvas aligned to lecture/lab hours and COAEP `assessment_tool`.
> 3. Only implement unchecked (`- [ ]`) items marked `Confirmed / Agreed`. If any item in this category is marked `Conditional / Needs Clarification` or `Optional Suggestion`, pause and ask for my explicit confirmation before coding it.
> 4. Keep all changes strictly scoped to this category and match existing project conventions—do not break adjacent composition steps or out-of-scope LPMS modules.
> 5. After implementing and verifying each item (including any required migrations, validations, or UI checks), briefly report the changes made and mark the completed checkboxes as `- [x]` in `defense-updates/TODO_DEFENSE_UPDATES.md`.
> ```

- [x] **[COMP-010] Redesign Weekly Topics & TLA Authoring Layout for Side-by-Side / Two-Column Context Visibility**
  - **Identifiers:** `Priority: P1 - High` | `Type: Modification` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: None`
  - **Target Page / Section:** `client/src/pages/TopicForm.jsx` & `client/src/pages/TLAForm.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/pages/TopicForm.jsx`, `client/src/pages/TLAForm.jsx`, `client/src/components/FormNavigation.jsx`, `client/src/styles/Form.module.sass`, `client/src/styles/TopicSelector.module.sass`, `client/src/styles/FormNavigation.module.sass`
    - *Backend / DB:* None (layout/presentation refactor)
  - **Description of Change:** Currently, `TopicForm.jsx` (lines `1461–1486`) toggles `Topics`, `Teaching & Learning Activities`, and `References` as mutually exclusive full-width tabs (`display: none` via `FormNavigation.jsx`), so while authoring TLAs in `TLAForm.jsx`, the instructor cannot see the week's Topics & Subtopics without switching tabs back and forth. Refactor the Weekly Content Planner layout so that **Topics** (left column) and **TLAs** (right column) are visible **side-by-side in a responsive two-column split** for the selected week (mirroring the official UNC Course Coverage syllabus layout), with References either in a clean collapsible bottom/tabbed drawer or step 2 while maintaining clear week context (`Week #` header always visible).
  - **Rationale & Agreement Justification:** Both Speaker 1 and Speaker 4 explicitly requested a two-column Topics ↔ TLA layout so faculty can immediately align each activity to the week's topics without tab-hopping (*"Parang naka-two column lang—nandito si topics, nandito si TLA. Kumbaga si format ng syllabus talaga"*).
  - **Transcript Citation(s):**
    - `[00:45:00 - 01:00:00]` at `[00:59:32]` – `[00:59:53]` (**Speaker 4 / Speaker 5 / Speaker 1**): *"Speaker 1: ...can we do this: 'yang UI mo, for example, this is the week, ito 'yung mga topics, ito si TLA sa tabi niya... Speaker 4: Parang kumbaga, 'pag tiningnan mo, makikita ko agad 'yung topics at saka si TLA, hindi na ako baba-taas. Parang naka-two column lang—nandito si topics, nandito si TLA. Kumbaga si format ng syllabus talaga."*

- [x] **[COMP-011] Add Opt-In "Load Previous Semester TLAs" and "AI Suggest TLAs" Actions on a Blank-By-Default TLA Canvas**
  - **Identifiers:** `Priority: P1 - High` | `Type: New Feature / Addition` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: None`
  - **Target Page / Section:** `client/src/pages/TLAForm.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/pages/TLAForm.jsx`, `client/src/pages/TopicForm.jsx`, `[NEW FILE]` `client/src/components/AiTlaSuggestModal.jsx`, `[NEW FILE]` `client/src/styles/AiTlaSuggestModal.module.sass`
    - *Backend / DB:* `server/controllers/tlaController.js`, `server/routes/tlaRoutes.js`
  - **Description of Change:** Currently, `TLAForm.jsx` displays pre-seeded TLA cards (described by Speaker 5 as AI-suggested seed data) and only provides a manual `Add TLA` button—there is no opt-in `AI Suggest` button or `Load Previous Semester TLAs` button in `TLAForm.jsx`, nor any AI/previous-term endpoints in `tlaRoutes.js` / `tlaController.js`. Following the blank-slate rule (`[COMP-004]`), start new draft weeks with an empty TLA canvas and add two explicit opt-in toolbar actions in `TLAForm.jsx`:
    1. **`Load Previous TLAs`:** Fetches TLAs & assessments from the prior approved revision for the matching course/week so the instructor can selectively import and edit them.
    2. **`AI Suggest TLAs` (`POST /api/tlas/ai-suggest`):** Generates contextual Pre-class / In-class / Post-class TLAs & Assessments aligned to the week's Topics, CO/ILOs, contact hours (lecture vs. lab), and COAEP `assessment_tool` (`[COMP-015]`), imported only when explicitly confirmed by the instructor.
  - **Rationale & Agreement Justification:** Speaker 1 objected to pre-filled AI TLAs (*"Pagdating dito sa TLA, can we get a blank slate na lang muna? Huwag mo nang punuin agad"*), and Speaker 4 finalized the exact three-choice parity with Topics (*"pag-abot man didi sa TLA, same topic—I can have my own, and I can use AI"* plus optional previous syllabus loading).
  - **Transcript Citation(s):**
    - `[00:45:00 - 01:00:00]` at `[00:58:51]` – `[00:59:59]` (**Speaker 1 / Speaker 5 / Speaker 4**): *"Speaker 1: Pagdating dito sa TLA, can we get a blank slate na lang muna? Huwag mo nang punuin agad—hayaan mo muna 'yung teacher mag-isip... Speaker 4: Hindi, sir, pwede man—ilo-load niya na lang 'pag gusto niya, 'pag may button na 'AI Suggest' sa gilid."*
    - `[01:00:00 - 01:15:00]` at `[01:01:21]` – `[01:01:46]` (**Speaker 4 / Speaker 1**): *"Speaker 4: Same concept din naman sa topic... previous topic, or I can have my own, or I can use AI. So pag-abot man didi sa TLA, same topic—I can have my own, and I can use AI."*

---

## Category 5: Weekly Content Planner — References & Library Compliance (`ReferenceForm.jsx`, `ReferencePicker.jsx`, `ReferenceSummary.jsx`)

### Recommended Agent Role & Session Kickoff Prompt
- **Fitted Role(s):** `Academic Library Compliance & Reference Schema Specialist` + `Document-Grounded AI (Excerpt/TOC) Integration Engineer`
- **Core Focus:** Enforcing UNC Library catalog provenance, Primary Textbook vs. Supplementary OER/Online tiering, non-blocking 5-year outdated reference highlights, and (once confirmed) lightweight PDF TOC/excerpt grounding for AI topic suggestions.

> **Copy & Paste into a Fresh Agent Session for This Category:**
> ```text
> Act as an Academic Library Compliance & Reference Schema Specialist and Document-Grounded AI (Excerpt/TOC) Integration Engineer working on the Learning Plan Composition module (`unc-lpms-react`).
>
> Your task in this session is to implement ONLY the approved updates under **Category 5: Weekly Content Planner — References & Library Compliance (`ReferenceForm.jsx`, `ReferencePicker.jsx`, `ReferenceSummary.jsx`)** (`COMP-012` to `COMP-014`) in `defense-updates/TODO_DEFENSE_UPDATES.md`.
>
> Follow these strict execution rules:
> 1. Read `Category 5: Weekly Content Planner — References & Library Compliance (`ReferenceForm.jsx`, `ReferencePicker.jsx`, `ReferenceSummary.jsx`)` in `defense-updates/TODO_DEFENSE_UPDATES.md` and inspect all listed files in `client/` and `server/` before editing any code.
> 2. Add the Sequelize migration/model fields (`source_origin`, `reference_tier`, `acquisition_justification`) on `References` to enforce Primary Library Textbooks vs. Supplementary OER/Online resources and mandatory acquisition justification for non-library books across `ReferencePicker.jsx`, `ReferenceSummary.jsx`, and `SyllabusPreview.jsx`; preserve the existing non-blocking 5-year `styles.deprecatedTag` behavior in `ReferencePicker.jsx` while clarifying label/tooltip copy, extending preview parity, and confirming the `>= 5` vs. `> 5` cutoff.
> 3. Only implement unchecked (`- [ ]`) items marked `Confirmed / Agreed`. If any item in this category is marked `Conditional / Needs Clarification` or `Optional Suggestion` (`COMP-012` — ephemeral PDF TOC/excerpt parsing vs. stored outlines and `multer`/PDF parser dependencies), pause and ask for my explicit confirmation before coding it.
> 4. Keep all changes strictly scoped to this category and match existing project conventions—do not break adjacent composition steps or out-of-scope LPMS modules.
> 5. After implementing and verifying each item (including any required migrations, validations, or UI checks), briefly report the changes made and mark the completed checkboxes as `- [x]` in `defense-updates/TODO_DEFENSE_UPDATES.md`.
> ```

- [ ] **[COMP-012] Support Reference-Driven AI Topic Suggestion (Ground AI Topic Generation on Selected Library Textbooks & Optional Uploaded PDF Excerpts / Table of Contents)**
  - **Identifiers:** `Priority: P1 - High` | `Type: New Feature / Addition` | `Agreement: Conditional / Needs Clarification` | `Effort: High` | `Integration Impact: None (Optional PDF/TOC Upload & Gemini Context Grounding)`
  - **Target Page / Section:** `client/src/components/AiTopicSuggestModal.jsx`, `client/src/pages/ReferenceForm.jsx`, `client/src/components/ReferencePicker.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/AiTopicSuggestModal.jsx`, `client/src/components/ReferencePicker.jsx`, `client/src/pages/ReferenceForm.jsx`, `client/src/pages/TopicForm.jsx`
    - *Backend / DB:* `server/controllers/topicController.js` (`suggestTopicsWithAI`), `server/controllers/referenceController.js`, `server/routes/topics.js`, `server/package.json` *(note: neither `multer` nor a PDF text extractor like `pdf-parse` is currently installed)*
  - **Description of Change:** Currently, `suggestTopicsWithAI` in `server/controllers/topicController.js` (lines `1310–1528`) generates weekly topics and subtopics strictly from `Course Description`, `CO Description`, `Selected ILOs`, `Week Number`, and `Previous Weeks' Topics`, with **zero grounding** in the course's assigned Textbooks/References or uploaded Table of Contents. During a 5-minute discussion (`[01:02:41]`–`[01:07:40]`), Speaker 4 repeatedly instructed the team to make AI topic suggestions **reference-driven** by letting the faculty upload a **lightweight PDF Table of Contents or chapter excerpts** (never storing full textbooks in MySQL, avoiding Speaker 2's `[01:10:33]` database bloat concern) and passing selected textbook metadata + extracted TOC text directly into the Gemini prompt with strict grounding instructions (NotebookLM-style).
    - *Clarification Needed:* Confirm whether the uploaded TOC/excerpt PDF is parsed **ephemerally** per AI session (zero DB storage, solving Speaker 2's `"magabato sa database"` concern) vs. saving a compact plain-text TOC outline per `Reference` record, and whether UNC plans to use Gemini API directly or a future internal LLM server (`[01:06:06]`).
  - **Rationale & Agreement Justification:** Reclassified from `Optional Suggestion` (`P2`) in Pass 1 to **`Conditional / Needs Clarification` (`P1 - High`)**: Speaker 4 explicitly raised this as a core academic-rigor concern (*"May concern pala ako diyan for the topics... Okay, ang gibo mo na lang doon sa AI Suggest: ask the faculty to upload the PDF [table of contents / pages]"*), Speaker 1 strongly endorsed *"Excerpts lang"* and *"Parang gano'n, reference-driven... Sige, very good"*, and the only open question is the lightweight non-bloating storage/processing architecture after Speaker 2's DB concern at `[01:10:33]`.
  - **Transcript Citation(s):**
    - `[01:00:00 - 01:15:00]` at `[01:02:41]` – `[01:07:40]` (**Speaker 4 / Speaker 1 / Speaker 5**): *"Speaker 4: Okay, ang gibo mo na lang doon sa AI Suggest: so ask the faculty to upload—to upload the PDF... 'yung isang table of contents or 'yung mga pages... Speaker 1: Excerpts lang. Speaker 4: Oo, hindi naman kailangan buong libro. ... Yes, ipa-upload mo na sa faculty 'yung mga reference... Tapos 'pag nag-gibo ka ng topics, dito siya kukuha ng topics. Speaker 1: Parang gano'n, reference-driven. Speaker 4: Yes! Speaker 1: Sige, very good."*
    - `[01:00:00 - 01:15:00]` at `[01:10:33]` – `[01:10:49]` (**Speaker 2 / Speaker 4**): *"Speaker 2: Kasi 'yung mga content, sir, ayaw na to kanda ano, baksain—like si mga contents ng references... magabato sa database. Speaker 4: Ha? Magabato sa database?"*

- [ ] **[COMP-013] Enforce Library Catalog Source Rules for Primary Textbooks vs. Supplementary OER/Online References & Require Justification for Non-Library Books**
  - **Identifiers:** `Priority: P1 - High` | `Type: New Feature / Addition` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: Submissions/Approval Module (Director of Libraries Catalog)`
  - **Target Page / Section:** `client/src/components/ReferencePicker.jsx`, `client/src/pages/ReferenceForm.jsx`, `client/src/components/ReferenceSummary.jsx` & `client/src/components/SyllabusPreview.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/ReferencePicker.jsx`, `client/src/pages/ReferenceForm.jsx`, `client/src/components/ReferenceSummary.jsx`, `client/src/components/SyllabusPreview.jsx`
    - *Backend / DB:* `server/controllers/referenceController.js`, `server/controllers/referenceSummaryController.js`, `server/models/reference.js`, `[NEW MIGRATION]` (add `source_origin` ENUM `'LIBRARY_CATALOG' | 'INSTRUCTOR_PROPOSED'`, `reference_tier` ENUM `'PRIMARY_TEXTBOOK' | 'SUPPLEMENTARY'`, and `acquisition_justification` TEXT on `References`)
  - **Description of Change:** Currently, `ReferencePicker.jsx` and `POST /api/references` (`referenceController.js`) allow instructors to freely create and attach any `Textbook`, `OER`, or `Online` entry with no catalog provenance, no distinction between **Primary Textbook** vs. **Supplementary** material, and no justification field when proposing a book not yet held by the UNC Library. Update the References schema, picker UI, and summary/preview tables so that:
    1. **Library Catalog Default:** Textbooks are picked from the verified UNC Library Catalog (`source_origin = 'LIBRARY_CATALOG'`).
    2. **Custom Book Justification:** Adding a textbook not found in the library catalog requires a mandatory **Justification / Acquisition Request** field (`acquisition_justification`, e.g., requesting library purchase or citing an approved departmental copy) surfaced clearly to the Director of Libraries during review.
    3. **Primary vs. Supplementary Separation:** Label **Textbooks** explicitly as *Primary / Main References* and **OER / Online Resources** as *Supplementary References* in `ReferencePicker.jsx`, `ReferenceSummary.jsx`, and `SyllabusPreview.jsx` (and warn if a course has zero primary Library textbooks, addressing accreditor library-utilization checks and Speaker 1's `[01:10:14]` question on reference constraints).
  - **Rationale & Agreement Justification:** Directly tied to PAASCU/CHED accreditation compliance: Speaker 1 emphasized library utilization auditing (*"lahat ng source dapat galing sa library. Bawal kami na mag-upload-upload diyan ng mga libro na mayo nag-e-exist sa library, unless may justification na bibilhin"*), and Speaker 4 defined OER/Online as supplementary while Textbooks remain the primary basis.
  - **Transcript Citation(s):**
    - `[01:00:00 - 01:15:00]` at `[01:07:59]` – `[01:10:25]` (**Speaker 1 / Speaker 4 / Speaker 2 / Speaker 5**): *"Speaker 1: Ito, ang mahalaga kasi dito, lahat ng source dapat galing sa library. Bawal kami na mag-upload-upload diyan ng mga libro na mayo nag-e-exist sa library, unless may justification na bibilhin o nag-e-exist sa library. ... Sa accreditors kaya, sa accreditation, makikita na hindi nag-yu-utilize ang library. ... Speaker 4: ...dapat si pinaka-content ng topic, based doon sa main references, sa textbook. Si OERs kasi, tapos si mga online resources, ano lang 'yan, kumbaga supplementary. ... Speaker 1: Pero may limitation naman kung ilan 'yung ilalagay?"*

- [ ] **[COMP-014] Verify & Polish Non-Blocking Outdated ($\ge 5$ Years Old) Reference Highlight Across Picker, Summary & Full Preview**
  - **Identifiers:** `Priority: P2 - Medium` | `Type: Modification` | `Agreement: Confirmed / Agreed` | `Effort: Low` | `Integration Impact: Submissions/Approval Module (Director of Libraries Review Parity)`
  - **Target Page / Section:** `client/src/components/ReferencePicker.jsx`, `client/src/components/ReferenceSummary.jsx` & `client/src/components/SyllabusPreview.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/ReferencePicker.jsx`, `client/src/components/ReferenceSummary.jsx`, `client/src/components/SyllabusPreview.jsx`, `client/src/styles/ReferencePicker.module.sass`
    - *Backend / DB:* `server/controllers/referenceController.js`, `server/controllers/referenceSummaryController.js`
  - **Description of Change:** **Current-State Verification:** Non-blocking 5-year reference flagging is **already partially implemented** in `ReferencePicker.jsx` (lines `31–44`, `269` using `styles.deprecatedTag`) and `ReferenceSummary.jsx` (lines `5–15`, `145–160` using inline styles), allowing selection and submission while showing a `"Deprecated"` tag. Complete the remaining defense-alignment polish:
    1. **Threshold Alignment (`> 5` vs. `>= 5`):** Current code computes `currentYear - year > 5` (so in 2026, a `2021` book is NOT flagged, even though Speaker 1 specifically asked `"Like 2021, 'di na pwede 2021 ngayon?"`). Align the threshold formula (`>= 5` vs `> 5`) identically with the Director of Libraries' rule in the Approval module.
    2. **Label & Tooltip Clarity:** Replace or clarify `"Deprecated"` with `"Outdated (>5 yrs)"` and a tooltip explaining *"Allowed for canonical/required sources; subject to Director of Libraries review."*
    3. **Full Preview Parity:** Ensure `SyllabusPreview.jsx` (and `ReferenceSummary.jsx` when rendered inside preview) consistently displays the non-blocking highlight indicator in draft/returned/review mode while keeping the printed/exported official PDF clean of warning pills.
  - **Rationale & Agreement Justification:** Both Speaker 1 and Speaker 4 confirmed outdated (>5 years) books must be **highlighted visually without blocking** because canonical/foundational textbooks in certain subjects have no newer equivalent. Downgraded from `P1` to `P2` because the core non-blocking warning already works in `ReferencePicker.jsx` and `ReferenceSummary.jsx`.
  - **Transcript Citation(s):**
    - `[01:15:00 - 01:30:00]` at `[01:23:25]` – `[01:24:22]` (**Speaker 6 / Speaker 1 / Speaker 4 / Speaker 2**): *"Speaker 1: Sa anong year? Like 2021, 'di na pwede 2021 ngayon? Speaker 4: Hindi, iche-check mo kaya—highlight mo na lang 'yan. Actually, before pa do'n sa creation, 'di ba na-check na? ... Speaker 1: Kasi may ibang subject na ang source talaga, 'yun lang 'yung libro. ... Kumbaga, i-highlight mo na lang—'ito outdated na'—pero i-allow mo pa rin. Speaker 4: Highlight na lang."*

---

## Category 6: Criteria for Grading, Course Coverage & UNC Form Preview / Export (`CriteriaForGrading.jsx`, `SyllabusPreview.jsx`, `CoursesTable.jsx`)

### Recommended Agent Role & Session Kickoff Prompt
- **Fitted Role(s):** `OBE Constructive-Alignment & Assessment Validation Engineer` + `Official UNC Document Print & PDF Export Specialist`
- **Core Focus:** Enforcing COAEP `assessment_tool` constructive alignment across grading criteria and TLA assessments and delivering official approval-gated UNC Learning Plan PDF exports with optional e-signature and manual signatory blocks.

> **Copy & Paste into a Fresh Agent Session for This Category:**
> ```text
> Act as an OBE Constructive-Alignment & Assessment Validation Engineer and Official UNC Document Print & PDF Export Specialist working on the Learning Plan Composition module (`unc-lpms-react`).
>
> Your task in this session is to implement ONLY the approved updates under **Category 6: Criteria for Grading, Course Coverage & UNC Form Preview / Export (`CriteriaForGrading.jsx`, `SyllabusPreview.jsx`, `CoursesTable.jsx`)** (`COMP-015` to `COMP-016`) in `defense-updates/TODO_DEFENSE_UPDATES.md`.
>
> Follow these strict execution rules:
> 1. Read `Category 6: Criteria for Grading, Course Coverage & UNC Form Preview / Export (`CriteriaForGrading.jsx`, `SyllabusPreview.jsx`, `CoursesTable.jsx`)` in `defense-updates/TODO_DEFENSE_UPDATES.md` and inspect all listed files in `client/` and `server/` before editing any code.
> 2. Wire `IntendedLearningOutcome.assessment_tool` from the COAEP directly through `server/controllers/courseCriteriaController.js` (replacing the hardcoded 4x3 loop and ignored column), `TLAForm.jsx`, `tlaController.js` (`TLAAssessment.ilo_id`), and `CriteriaForGrading.jsx` so grading and TOS handoffs stay constructively aligned; wire the currently stubbed `Export` buttons in `CoursesTable.jsx` (lines 378–388, 592–601) and `SyllabusPreview.jsx` strictly for `Approved` plans using the official UNC layout and signatory block (supporting uploaded e-signatures or clean physical signature lines—note no PDF library is yet installed in `composition/server/package.json`).
> 3. Only implement unchecked (`- [ ]`) items marked `Confirmed / Agreed`. If any item in this category is marked `Conditional / Needs Clarification` or `Optional Suggestion`, pause and ask for my explicit confirmation before coding it.
> 4. Keep all changes strictly scoped to this category and match existing project conventions—do not break adjacent composition steps or out-of-scope LPMS modules.
> 5. After implementing and verifying each item (including any required migrations, validations, or UI checks), briefly report the changes made and mark the completed checkboxes as `- [x]` in `defense-updates/TODO_DEFENSE_UPDATES.md`.
> ```

- [ ] **[COMP-015] Enforce COAEP Constructive Alignment (`IntendedLearningOutcome.assessment_tool`) in Grading Criteria & Weekly TLA Assessments**
  - **Identifiers:** `Priority: P1 - High` | `Type: Validation / Business Rule` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: Course Assignment (COAEP) & TOS Management Module`
  - **Target Page / Section:** `client/src/components/CriteriaForGrading.jsx` & `client/src/pages/TLAForm.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/CriteriaForGrading.jsx`, `client/src/pages/TLAForm.jsx`
    - *Backend / DB:* `server/controllers/courseCriteriaController.js`, `server/controllers/tlaController.js`, `server/models/intendedLearningOutcome.js`, `server/models/tlaAssessment.js`
  - **Description of Change:** Verified source code uncovered a critical constructive-alignment disconnect:
    1. `server/models/intendedLearningOutcome.js` (lines `24–27`) **already has** an `assessment_tool` column populated from the COAEP, and `server/controllers/courseCriteriaController.js` line `56` queries `['ilo_id', 'description', 'assessment_tool']`—**but then ignores `iloRecord.assessment_tool` completely**, instead reading `TLAAssessment.name` into `CriteriaForGrading.jsx`!
    2. `client/src/pages/TLAForm.jsx` lets instructors type arbitrary free-text `assessmentType` without displaying the target ILO's official COAEP `assessment_tool` (e.g., `"Objective Type"` vs. `"Essay / Rubric"` vs. `"Practical Exam"`), and does not expose an ILO selector so `tlaController.js:223` frequently saves `TLAAssessment.ilo_id = null`.
    3. Update `courseCriteriaController.js` to surface each ILO's official `IntendedLearningOutcome.assessment_tool` from COAEP (replacing the hardcoded `4 × 3` loop — see `[COMP-003]`), display the expected COAEP assessment tool in `TLAForm.jsx` & `CriteriaForGrading.jsx`, and show a constructive-alignment warning if an instructor's chosen assessment type contradicts the COAEP specification (guaranteeing clean downstream handoff to the TOS module).
  - **Rationale & Agreement Justification:** Reclassified from `Conditional` (`P2`) in Pass 1 to **`Confirmed / Agreed` (`P1 - High`)**: Both Speaker 1 (*"sa assessment, dapat naka-base talaga sa COAEP"*) and Speaker 4 (*"That's the purpose of the COAEP! ... 'Yan 'yung constructive alignment! Kasi minsan sa COAEP nakasabi objective type, tapos bigla sa exam essay! 'Yan ang dapat i-check"*) stated this as an explicit accreditation requirement across the Learning Plan and TOS.
  - **Transcript Citation(s):**
    - `[01:30:00 - 01:45:00]` at `[01:37:33]` – `[01:38:14]` (**Speaker 4**): *"'Di ba sa ILO, sa COAEP assessment plan, may nakalagay doon na 'Objective Type', 'Essay'... So 'pag nag-create ako didi ng midterm exam, objective type niyo, so ang ilalagay mo lang diyan objective type. ... 'Pag essay naman, ilalagay niya essay, then saka ka magpo-provide ng rubrics."*
    - `[01:30:00 - 01:45:00]` at `[01:43:28]` – `[01:44:52]` (**Speaker 1 / Speaker 4**): *"Speaker 1: ...pero sa assessment, dapat naka-base talaga sa COAEP. Speaker 4: That's the purpose of the COAEP! 'Pag nagpa-exam ako, dapat kung ano nasa COAEP ko, 'yun ang nasa exam. 'Pag sinabi mong objective type, dapat objective type. 'Yan 'yung constructive alignment!"*

- [ ] **[COMP-016] Implement Functional Official UNC Learning Plan PDF Export (Locked Strictly to Approved Plans, Supporting Optional E-Signature / Manual Sign-Off Block)**
  - **Identifiers:** `Priority: P0 - Critical` | `Type: New Feature / Addition` | `Agreement: Confirmed / Agreed` | `Effort: High` | `Integration Impact: Submissions/Approval Management Module (Shared PDF Template & Signatory Signatures)`
  - **Target Page / Section:** `client/src/components/CoursesTable.jsx` (`Export` buttons on Approved cards/rows) & `client/src/components/SyllabusSections.jsx` / `client/src/components/SyllabusPreview.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/CoursesTable.jsx`, `client/src/components/SyllabusSections.jsx`, `client/src/components/SyllabusPreview.jsx`
    - *Backend / DB:* `server/controllers/courseDetailsController.js`, `server/controllers/courseCoverageController.js`, `server/controllers/revisionController.js`, `[NEW ROUTE/CONTROLLER]` (or integrated shared Approval-module PDF generator), `server/package.json` *(no PDF library currently installed in `composition/server`)*
  - **Description of Change:** Verified source code in `client/src/components/CoursesTable.jsx` confirms that the `Export` buttons (Grid card at lines `378–388` and List row at lines `592–601`) are **already gated** to render exclusively when `overallStatus === 'Approved'`—matching the panel's lock rule. However, both buttons currently execute a dead stub `onClick={(e) => { e.preventDefault(); }}`, and `SyllabusPreview.jsx` / `SyllabusSections.jsx` have no `Export PDF` trigger and no official UNC Signatory block (`Prepared by` Instructor, `Verified by` Director of Libraries, `Reviewed/Endorsed by` Program Head, `Approved by` Dean, and optional `Industry Consultant`). Wire the `Export` actions (sharing/integrating Speaker 2's Approval-module UNC PDF template) to export the official formatted UNC Learning Plan PDF strictly for `Approved` plans, rendering uploaded e-signatures when available while leaving clean physical signature lines for manual signing when omitted.
  - **Rationale & Agreement Justification:** Elevated to **`P0 - Critical`**: At the defense finale (`[01:51:44]`–`[01:51:56]`), Speaker 1 explicitly verified PDF generation and approval-only gating (*"hindi ko pwedeng i-download as PDF 'pag wala pang approval?"* → *"Okay. Okay na ako."*), and Speaker 4 confirmed optional e-signature upload alongside manual signature lines (`[01:50:32]`–`[01:51:44]`). Having a non-functional `Export` button on Approved courses in Composition breaks the instructor's final deliverable.
  - **Transcript Citation(s):**
    - `[01:00:00 - 01:15:00]` at `[01:14:37]` – `[01:14:55]` (**Speaker 2 / Speaker 1 / Speaker 4**): *"Speaker 1: Pero sa paper, 'pag nag-print, ayos na 'yan? Speaker 2: Ay, sa template, sir, actual na. ... Speaker 1: Kasama na signatories? May e-signatures? Speaker 2: Yes, sir, e-signatures."*
    - `[01:45:00 - 01:51:59]` at `[01:50:32]` – `[01:51:56]` (**Speaker 4 / Speaker 1 / Speaker 2**): *"Speaker 4: Kumbaga ako, for example ako, gusto kong mag-upload ng digital signature, i-upload ko. Pero kung gusto kong pirmahan pa naman, eh di papirmahan ko pa naman. Speaker 1: Kaya. So i-support, e-signature or... Pero ngayon, makaka-print na ba ng PDF? ... hindi ko pwedeng i-download as PDF 'pag wala pang approval? Speaker 2: Ayon po. 'Pag nasa Approved na, gano'n. 'Pag 'yung sa Returned, Pending, wala naman 'yung export option. Speaker 1: Okay. Okay na ako."*

---

## Category 7: Submission, Return/Revision Cycle & Approval Workflow Touchpoints (`SyllabusSections.jsx`, `Revisions.jsx`, `CoursesTable.jsx`)

### Recommended Agent Role & Session Kickoff Prompt
- **Fitted Role(s):** `Approval Workflow State-Machine Architect` + `Auth-Hardened Integration & Audit-Trail Engineer`
- **Core Focus:** Hardening submitter authentication and returned-comment resolution sync, fixing Industry Consultant false-approval and Rev 1 revision-history bugs, and aligning deadline-closing and Course Review Record policies cleanly with the Approval module.

> **Copy & Paste into a Fresh Agent Session for This Category:**
> ```text
> Act as an Approval Workflow State-Machine Architect and Auth-Hardened Integration & Audit-Trail Engineer working on the Learning Plan Composition module (`unc-lpms-react`).
>
> Your task in this session is to implement ONLY the approved updates under **Category 7: Submission, Return/Revision Cycle & Approval Workflow Touchpoints (`SyllabusSections.jsx`, `Revisions.jsx`, `CoursesTable.jsx`)** (`COMP-017` to `COMP-021`) in `defense-updates/TODO_DEFENSE_UPDATES.md`.
>
> Follow these strict execution rules:
> 1. Read `Category 7: Submission, Return/Revision Cycle & Approval Workflow Touchpoints (`SyllabusSections.jsx`, `Revisions.jsx`, `CoursesTable.jsx`)` in `defense-updates/TODO_DEFENSE_UPDATES.md` and inspect all listed files in `client/` and `server/` before editing any code.
> 2. Enforce JWT `requireAuth` on `server/routes/submissionRoutes.js` and eliminate the hardcoded `'1'` stakeholder fallback in `submissionController.js`; preserve the exact UNC multi-tier state machine (Program Head + Director of Libraries in parallel -> Dean final approval -> post-approval optional/advisory Industry Consultant) while fixing the false `"Approved"` Industry Consultant rendering in both `CoursesTable.jsx` and `MiniAssignedCourses.jsx` and the blank `weekNumber` bug between `SyllabusSections.jsx` and `commentController.js`.
> 3. Only implement unchecked (`- [ ]`) items marked `Confirmed / Agreed`. If any item in this category is marked `Conditional / Needs Clarification` or `Optional Suggestion` (`COMP-017`, `COMP-019`, `COMP-021`), pause and ask for my explicit confirmation before coding it.
> 4. Keep all changes strictly scoped to this category and match existing project conventions—do not break adjacent composition steps or out-of-scope LPMS modules.
> 5. After implementing and verifying each item (including any required migrations, validations, or UI checks), briefly report the changes made and mark the completed checkboxes as `- [x]` in `defense-updates/TODO_DEFENSE_UPDATES.md`.
> ```

- [ ] **[COMP-017] Fix Submission Modal Copy Typo & Optionally Streamline the 5-Second "Cancel Submission" Window (`SyllabusSections.jsx`)**
  - **Identifiers:** `Priority: P3 - Low` | `Type: UI/UX Refinement` | `Agreement: Optional Suggestion` | `Effort: Low` | `Integration Impact: None`
  - **Target Page / Section:** `client/src/components/SyllabusSections.jsx` → `Submit` confirmation & 5-second countdown modal (`submitPhase` / `timeLeft`, lines `75–76`, `121–142`, `346–390`)
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/SyllabusSections.jsx`
    - *Backend / DB:* None
  - **Description of Change:** Verified code in `SyllabusSections.jsx` shows:
    1. **Verified Grammar Typo (Line `353`):** The confirm modal currently reads `"You will no longer be edit it unless it is returned."` → fix to `"You will no longer be able to edit it unless it is returned."`
    2. **Optional Countdown Streamlining:** Clicking `Yes, Submit` enters `submitPhase === 'countdown'` (`timeLeft = 5` down to `0`) with a `"Cancel Submission"` button (line `374`) before posting to `/api/submit-learning-plan/:offeringID/:revisionNum`. During the defense (`[01:14:57]`), Speaker 1 laughed and said `"Change of mind?"`—an amused reaction rather than a mandate to remove the safeguard. Optionally add a secondary `"Submit Now"` button alongside `"Cancel Submission"` (or reduce the delay to 3 seconds) so instructors do not feel stalled when ready to submit immediately.
  - **Rationale & Agreement Justification:** Remains **`Optional Suggestion` (`P3 - Low`)** for the timer tweak (panelist did not ask to remove it), paired with a quick verified typo fix on line `353`.
  - **Transcript Citation(s):**
    - `[01:00:00 - 01:15:00]` at `[01:14:56]` – `[01:14:57]` (**Speaker 4 / Speaker 1**): *"Speaker 4: Submit, submit mo na. Speaker 1: Change of mind? [laughter]"*

- [ ] **[COMP-018] Persist Authenticated Submitter Identity Cleanly on Submissions & Synchronize Returned Comment Resolution Across Modules**
  - **Identifiers:** `Priority: P0 - Critical` | `Type: Schema / API` | `Agreement: Confirmed / Agreed` | `Effort: Medium` | `Integration Impact: Submissions/Approval Management Module (Program Head Pending Queue & Review Sync)`
  - **Target Page / Section:** `client/src/components/SyllabusSections.jsx`, `client/src/components/SyllabusPreview.jsx`, `client/src/pages/TopicForm.jsx` (`Review Feedback` sidebar)
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/SyllabusSections.jsx`, `client/src/components/SyllabusPreview.jsx`, `client/src/pages/TopicForm.jsx`
    - *Backend / DB:* `server/routes/submissionRoutes.js`, `server/controllers/submissionController.js`, `server/controllers/commentController.js`, `server/controllers/assignmentController.js`, `server/middleware/auth.js`
  - **Description of Change:** *(Scope note: Adding the visible "Instructor Name" column to the Program Head's Pending Submissions table is owned by the Approval module—see Section 4.3. Below is Composition's required data-contract & auth half.)*
    1. **Remove Hardcoded `'1'` Fallback & Require Auth:** In `server/routes/submissionRoutes.js`, protect `POST /api/submit-learning-plan/:pcId/:revNum` with `requireAuth`; in `server/controllers/submissionController.js` (lines `42–44`), stop silently falling back to hardcoded `'1'` (`assignment.stakeholder_id || '1'`) so every `CourseOfferingAssignment` and `AssignmentWorkflowLog` (`SUBMITTED`) always persists the verified authenticated instructor's `stakeholder_id`, enabling the Approval module and `SyllabusPreview.jsx` ("Prepared by") to reliably resolve the instructor's real full name.
    2. **Backend Resubmission Resolution Guard & Cross-Module Sync:** Ensure `PUT /api/comments/update-resolution` (`commentController.js`) persists `resolved_status = 1` and resolution timestamp cleanly against the shared `Comments` / `CommentTargets` tables, and verify on `POST /api/submit-learning-plan/:pcId/:revNum` that returned plans have no unresolved comments remaining before allowing resubmission.
  - **Rationale & Agreement Justification:** At `[01:14:59]`, Speaker 1 asked *"This is from—sinong teacher 'yan?"* when inspecting a submitted plan on the Program Head side, and at `[01:18:24]`–`[01:20:32]` the return/resolve/resubmit flow had to be faked because Composition and Approval were not synced on the same database tables.
  - **Transcript Citation(s):**
    - `[01:00:00 - 01:15:00]` at `[01:14:59]` (**Speaker 1 / Speaker 2**): *"Speaker 1: This is from—sinong teacher 'yan? Speaker 2: Si Program Head, sir... Oh, 'yung pangalan ng nag-submit! Mayo pa... Nalingawan ko, sir."*
    - `[01:15:00 - 01:30:00]` at `[01:18:24]` – `[01:20:32]` (**Speaker 2 / Speaker 5 / Speaker 1**): *"Speaker 2: ...nag-log na siya sa Returned, 'yung HCI. ... Speaker 1: That's why kailangan i-integrate ito... Speaker 2: Ta's try na lang po i-mark as resolved. Submit. ... Ayan, pending na. Mark as resolved. November 13, sir, 'yung ano, which is now. Resolved na siya."*

- [ ] **[COMP-019] Fix Rev 1 Revision History Blocker & Prop Mismatch (`SyllabusSections.jsx`), and Align Optional Printable "Course Review Record" View in `Revisions.jsx`**
  - **Identifiers:** `Priority: P2 - Medium` | `Type: Bug Fix` | `Agreement: Conditional / Needs Clarification` | `Effort: Medium` | `Integration Impact: Submissions/Approval Management Module (Shared Course Review Record Component)`
  - **Target Page / Section:** `client/src/components/SyllabusSections.jsx` (`⋮` → `Revisions`) & `client/src/components/Revisions.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/SyllabusSections.jsx`, `client/src/components/Revisions.jsx`, `client/src/styles/Revisions.module.sass`
    - *Backend / DB:* `server/controllers/revisionController.js`
  - **Description of Change:** Verified source inspection revealed two concrete Composition bugs alongside an Approval-module parity question:
    1. **Verified Blocker Bug (`SyllabusSections.jsx:31–44`):** `handleRevisionsClick` hard-blocks opening `Revisions.jsx` whenever `Number(revisionNum || 1) <= 1` (`"This learning plan has no revisions yet. It is the first submission."`), making it **impossible** for an instructor on Revision 1 to inspect return/resubmission history or a Course Review Record even after multiple Return → Resubmit cycles!
    2. **Verified Prop Mismatch (`SyllabusSections.jsx:258` vs. `Revisions.jsx:13`):** `SyllabusSections.jsx` passes `courseId={revisionNum} offeringID={offeringID}` while `Revisions.jsx` destructures `{ pcId, revNum }` (currently working only via `useParams()` fallback).
    3. **Course Review Record Parity (Clarification Needed):** During the defense (`[01:20:42]`–`[01:21:13]`), Speaker 2 demonstrated the printable **Course Review Record** inside the **Approval** module, which Speaker 1 praised (*"Okay. Pwede 'yan"*). Confirm whether Composition's `Revisions.jsx` should embed/share Speaker 2's printable **Course Review Record** table (Dates, Reviewer Role, Section Revised, Comment, Resolved Status) so instructors can view/print their own review audit trail even on Revision 1.
  - **Rationale & Agreement Justification:** Reclassified from `Confirmed` (`P1`) in Pass 1 to **`Conditional / Needs Clarification` (`P2 - Medium`)** because Speaker 2 already implemented the Course Review Record in the Approval module and panelists did not explicitly mandate duplicating it inside Composition—however, fixing the `rev <= 1` blocker and prop mismatch in `SyllabusSections.jsx` is a clear bug fix needed for revision visibility.
  - **Transcript Citation(s):**
    - `[01:15:00 - 01:30:00]` at `[01:20:42]` – `[01:21:13]` (**Speaker 1 / Speaker 2**): *"Speaker 2: Parang 'yung recording lang ng... pwede siyang i-print if may magkaroon ng conflict or pwedeng i-report. Speaker 1: Course Review Record! 'Di ba 'yung mga dates, sir, oh, parang summary 'yan. Speaker 2: Oo. Nakuha ko lang kay Sir Ervin. 'Yan na 'yan, sir. Speaker 1: History ng mga revision. Speaker 2: Ayan po, si section, kung saan na-revise po, resolved. Speaker 1: Okay. Pwede 'yan."*

- [ ] **[COMP-020] Fix False "Approved" Industry Consultant Status Bug & Clarify Post-Approval Advisory Role (`CoursesTable.jsx`, `MiniAssignedCourses.jsx`, `SyllabusSections.jsx`)**
  - **Identifiers:** `Priority: P1 - High` | `Type: Bug Fix` | `Agreement: Confirmed / Agreed` | `Effort: Low` | `Integration Impact: Submissions/Approval Management Module`
  - **Target Page / Section:** `client/src/components/CoursesTable.jsx` (`buildApproverStatus` & `CourseCard`), `client/src/components/MiniAssignedCourses.jsx`, and `client/src/components/SyllabusSections.jsx` (`Future Suggestion` modal)
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/CoursesTable.jsx`, `client/src/components/MiniAssignedCourses.jsx`, `client/src/components/SyllabusSections.jsx`
    - *Backend / DB:* `server/controllers/assignmentController.js`, `server/controllers/dashboardController.js`, `server/controllers/commentController.js`
  - **Description of Change:** Verified codebase audit found two concrete bugs contradicting the defense workflow rules:
    1. **False `"Approved"` Display Bug (`CoursesTable.jsx:214–217, 413–420` & `MiniAssignedCourses.jsx:67–70, 174–181`):** When Dean approves a learning plan (`isApproved === true`), `buildApproverStatus` calls `getStatusFor('INDUSTRY_CONSULTANT', 'Industry Consultant')` which returns `status: 'Pending'` if no Industry Consultant log exists. Then the card renderer enters `if (isApproved)` and falls through `else { dateDisplay = <div>Approved</div>; }`, **falsely displaying `"Approved"` for Industry Consultant even when no Industry Consultant reviewed or signed the plan!** Update both components so Industry Consultant displays `"Optional / Pending Advisory"` (or `"Not Yet Reviewed"`) when no `INDUSTRY_CONSULTANT` log exists, `"Suggested: <date>"` when advisory comments exist, or `"Reviewed & Signed: <date>"` only when an actual Industry Consultant sign-off log exists.
    2. **Blank Week Number in Future Suggestions Modal (`SyllabusSections.jsx:321` vs. `commentController.js:514`):** `SyllabusSections.jsx:321` renders `Week {item.weekNumber}`, whereas `commentController.js:514` (`getIndustrySuggestions`) returns `weekId` without computing `weekNumber`—resulting in a blank `"Week "` label! Return the resolved `weekNumber` (or `"Course-Wide"`) from `commentController.js` so instructors can accurately review post-approval Industry Consultant suggestions for next term's revision.
  - **Rationale & Agreement Justification:** Explicitly confirmed by Speaker 1, Speaker 4, and Speaker 2 at `[00:26:17]`–`[00:26:33]` and `[01:24:28]`–`[01:25:46]`: Industry Consultant sits **after** Dean approval and is strictly **optional / advisory** (`"suggest and sign"`, never blocking or falsely claiming approval).
  - **Transcript Citation(s):**
    - `[00:15:00 - 00:30:00]` at `[00:26:17]` – `[00:26:33]` (**Speaker 1 / Speaker 2**): *"Speaker 1: Pero wala silang contribution sa content? Speaker 2: Suggestions only. Pero 'yung flow, hindi nila maa— ... wala silang effect do'n sa flow po."*
    - `[01:15:00 - 01:30:00]` at `[01:24:30]` – `[01:25:38]` (**Speaker 2 / Speaker 1 / Speaker 4**): *"Speaker 2: 'Yung industry nilagay namin pagkatapos na ng lahat, 'pag tapos na 'yung Dean. ... Speaker 1: Para sa akin, optional ang industry, kasi validation siya ng industry. ... Speaker 4: Ayan, tama 'yan... Advisory. Speaker 2: Wala siya nung pending, returned ano, kasi 'yun lang naman 'yung—suggest and sign."*

- [ ] **[COMP-021] Enforce Submission Deadline Closing Behavior & Late-Submission Justification Gate (`SyllabusSections.jsx`, `submissionController.js`)**
  - **Identifiers:** `Priority: P1 - High` | `Type: Validation / Business Rule` | `Agreement: Conditional / Needs Clarification` | `Effort: Medium` | `Integration Impact: Course Assignment / Submissions Management Module (Deadline Policy)`
  - **Target Page / Section:** `client/src/components/SyllabusSections.jsx` (`Submit` button & modal) & `client/src/components/CoursesTable.jsx` / `MiniAssignedCourses.jsx`
  - **Affected Files (Full-Stack Blast Radius):**
    - *Frontend:* `client/src/components/SyllabusSections.jsx`, `client/src/components/CoursesTable.jsx`, `client/src/components/MiniAssignedCourses.jsx`
    - *Backend / DB:* `server/controllers/submissionController.js`, `server/models/courseOfferingAssignment.js`, `[NEW MIGRATION]` (add `is_late` BOOLEAN and `late_explanation` TEXT on `CourseOfferingAssignments`, paired with `submission_deadline` from `[COMP-002]`)
  - **Description of Change:** Currently, `SyllabusSections.jsx` and `POST /api/submit-learning-plan/:pcId/:revNum` (`submissionController.js`) allow an instructor to submit a Draft/Returned learning plan at any time with zero deadline validation, no late-submission tagging, and no explanation capture. During the opening exchange (`[00:02:27]`–`[00:02:57]`), Speaker 1 directly asked what happens when the submission window closes—whether submissions hard-close or require an explanation routed to the Dean/HR—and noted *"madali na lang idagdag 'yan, 'no?"*. Implement deadline enforcement on both the Composition UI and `submissionController.js` once the institutional policy is confirmed:
    - **Option A (Hard Close with Admin Re-Open):** Disable `Submit` in `SyllabusSections.jsx` and reject `POST /api/submit-learning-plan/:pcId/:revNum` with HTTP `403` once `now > submission_deadline` unless Program Head/Dean grants an extension.
    - **Option B (Late Tag + Mandatory Explanation — Recommended):** Keep `Submit` available after `submission_deadline`, show a `"Past Deadline — Late Submission"` modal requiring a written `late_explanation` (forwarded to the Dean/Program Head), and persist `is_late = true` + `late_explanation` on `CourseOfferingAssignment`.
  - **Rationale & Agreement Justification:** Directly raised by Speaker 1 at `[00:02:27]`–`[00:02:57]` (*"pag nag-close ang submission, close na? Or you will be penalized? O, ano, syempre naman, nagbibigay 'yan ng explanation to the Dean, to the HR office... Pero look, madali na lang idagdag 'yan, 'no?"*). Marked **`Conditional / Needs Clarification`** because the exact UNC policy (hard lock vs. late-submission explanation modal) was left open for the team to decide.
  - **Transcript Citation(s):**
    - `[00:00:00 - 00:15:00]` at `[00:02:27]` – `[00:02:57]` (**Speaker 1 / Speaker 2**): *"Speaker 1: And also, 'pag nag-close ang submission, close na? Or you will be penalized? O, ano, syempre naman, nagbibigay 'yan ng explanation to the Dean, to the HR office, kasi bakit late ka, 'yung parang gano'n. Speaker 2: Currently, I don't have that function, sir, 'yung 'pag nag-close 'yung submission, because I'm not sure if... Speaker 1: Pero look, madali na lang idagdag 'yan, 'no?"*

---

## Section 4: Out-of-Scope & Cross-Module Handoff (Owned by Other Modules)

To keep module boundaries clean and ensure zero feedback from the ~2-hour defense is lost, below is the verified handoff checklist of items discussed in the transcript that belong to **other modules** outside Learning Plan Composition:

### 4.1 User, Term & Academic Setup Module (VPAA / Dean)
1. **School Calendar AI/OCR Upload & Term Archiving (`[00:03:54]` – `[00:12:52]`):**
   - VPAA uploads the school calendar image/PDF (parsed via Gemini API) to extract key semester dates (Start/End of Classes, Prelim, Midterm, Semifinal, Final Exams).
   - **New School Year Empty State & Archive Access (`[00:09:07]` – `[00:12:52]`):** When a new school calendar/academic year is initialized, current submission dashboards must start **empty** (no static/hardcoded submitted counts), while allowing the Dean (and VPAA for reports) to switch back to archived past academic terms. *(Pairs with Composition's `[COMP-022]`.)*
2. **Department & Program Setup Realism (`[00:10:04]` – `[00:14:45]`):**
   - Remove unrealistic/duplicate sample program entries in SCIS (e.g., Software Engineering is a course integrated into BSCS/BSIT, not a separate degree program).
3. **Direct Faculty Account Generation with Temporary Password Instead of Per-Semester Email Invites (`[00:14:56]` – `[00:20:36]`):**
   - **Confirmed Change:** When the Dean uploads the faculty roster spreadsheet, do **not** send an "Accept Invitation to Create Account" email every semester. Instead, auto-generate user accounts with a temporary password only for **new** faculty (existing faculty keep their accounts), and only include **Active** teaching faculty for the current semester (remove inactive/on-leave faculty from the active semester roster rather than showing unclear `"L"` / `"On leave"` badges).

### 4.2 Course Assignment & COAEP Upload Module (Program Head)
1. **Filter Out Minor / Service Department Subjects (`[00:21:09]` – `[00:23:45]`):**
   - Program Head curriculum and course offering uploads for SCIS (e.g., BSIT / BSCS) must only include major/department courses and exclude minor/general education subjects handled by service departments.
2. **Team Teaching & Lead Faculty Assignment (`[00:24:01]` – `[00:25:40]`):**
   - When multiple faculty teach the same course, the Program Head designates the **Lead Faculty** who is responsible for composing and submitting the Learning Plan.
3. **Parse the Official UNC COAEP Excel/PDF Template Directly (`[00:27:42]` – `[00:38:22]`):**
   - **Confirmed Change:** Do **not** invent a custom Excel template for PEO, PO, and COAEP uploads. Use a dynamic Excel/Gemini parser (referencing Sir Dan's / Ninong Ray's official UNC COAEP template parser) so the Program Head can upload the official UNC COAEP form directly. *(Pairs with Composition's `[COMP-003]`.)*
4. **Program Head Deadline Configuration, Late-Close Policy & Pending Faculty Tracker (`[00:01:55]` – `[00:02:57]`, `[00:26:52]` – `[00:27:05]`, `[01:48:10]` – `[01:49:44]`):**
   - Program Head sets the Learning Plan submission start/due dates (e.g., 2 weeks before classes start), configures close/late-submission handling (`[COMP-021]`), and views a summary list of faculty who have not yet submitted.

### 4.3 Submissions & Approval Management Module (Program Head, Director of Libraries, Dean, Industry Consultant)
1. **Display Submitting Instructor's Full Name on Program Head's Pending Submissions Queue (`[01:14:59]`):**
   - **Confirmed Bug Fix:** Speaker 1 asked *"This is from—sinong teacher 'yan?"* on Speaker 2's Program Head Pending Submissions table, and Speaker 2 acknowledged *"Oh, 'yung pangalan ng nag-submit! Mayo pa... Nalingawan ko, sir."* Add the submitting instructor's name column in Approval's review queue *(consuming the `stakeholder_id` persisted by Composition's `[COMP-018]`)*.
2. **Program Head Automated Alignment Checker, Targeted Commenting & Course Review Record (`[01:15:00]` – `[01:21:35]`):**
   - Program Head reviews submitted learning plans with yellow highlight warnings for alignment issues, attaches targeted comments to specific sections/items, returns the plan to the instructor, and verifies resolved comments via the printable **Course Review Record**. *(Pairs with Composition's `[COMP-018]` & `[COMP-019]`.)*
3. **Director of Libraries Catalog Upload & Reference Review (`[01:07:59]` – `[01:08:48]`, `[01:22:06]` – `[01:24:22]`):**
   - Support Library Director upload/maintenance of the official library book catalog (and optional OER catalog) consumed by Composition (`[COMP-013]`). During review, Director of Libraries inspects References in parallel with the Program Head; outdated books ($\ge 5$ years old) are automatically highlighted non-blockingly (`[COMP-014]`).
4. **Dean Final Approval, PDF Generation & Post-Approval Industry Consultant Advisory Sign-Off (`[01:24:26]` – `[01:27:05]`, `[01:50:20]` – `[01:51:56]`):**
   - Dean grants final institutional approval after both Program Head and Director of Libraries endorse the plan; afterward, the optional Industry Consultant can view, leave future suggestions, and attach an e-signature (`[COMP-020]`). Share the Approval-module UNC PDF template + optional e-signature rendering with Composition (`[COMP-016]`).

### 4.4 Table of Specifications (TOS) Management Module
1. **COAEP Constructive Alignment for TOS Assessment Types (`[01:36:11]` – `[01:38:25]`, `[01:43:28]` – `[01:45:15]`):**
   - **Major Panel Requirement:** TOS assessment types per ILO must strictly follow the assessment tool declared in the approved COAEP (e.g., if COAEP specifies Objective Type, require test questions; if Essay / Practical Project, require rubrics). *(Pairs with Composition's `[COMP-015]`.)*
2. **Built-In Test Questionnaire (TQ) Item Editor & AI Bloom's Taxonomy / ILO Level Analyzer (`[01:27:38]` – `[01:40:15]`):**
   - In addition to uploading existing exam PDFs, provide a Google-Quiz-style Test Questionnaire (TQ) item editor where each question has assigned points (warning when items exceed the ILO's point allocation) and an AI analyzer that checks whether each question's cognitive level matches the target ILO (e.g., flagging if a recall question was placed under an Applying/ILO2 slot) and helps generate non-recycled exam questions.
