# SECOND-PASS FORENSIC VERIFICATION REPORT (`TODO_DEFENSE_UPDATES.md`)

> **Audited Deliverable:** [`defense-updates/TODO_DEFENSE_UPDATES.md`](./TODO_DEFENSE_UPDATES.md)
> **Codebase Audited (Read-Only):** `composition/client/` & `composition/server/`
> **Transcript Re-Audited (Full):** `composition/transcripts/11-13-2026 12.49(2).md` (`00:00:00` – `01:51:59`, lines `1–1656`)
> **Verification Method:** Direct line-by-line source inspection of routes, controllers, models, components, and styles + full conversational nuance check across English/Tagalog/Bikol exchanges.

---

## 1. Audit Verdict

**Overall Assessment: Solid Structural Backbone (~75% Accurate in Pass 1), but Contained Meaningful Path/Endpoint Hallucinations, Code-State Inaccuracies, 2 Missed Items, and 3 Agreement-Status Misclassifications.**

Pass 1 accurately mapped the high-level instructor flow and captured 20 core defense themes with strong timestamp grounding. However, skeptical second-pass verification against the actual source code and transcript uncovered:
- **6 hallucinated/inaccurate backend API endpoints** in Section 1 (`server/routes/*.js`).
- **3 nonexistent `.css` stylesheet paths** (`TopicForm.module.css`, `TLAForm.module.css`, `Revisions.module.css` — the codebase uses `.sass` modules).
- **5 major current-state inaccuracies** (including citing `AssignedCourses.jsx` instead of `CoursesTable.jsx`, falsely claiming the spell-check modal shows suggestion pills, falsely claiming `iloController.js` derives `assessment_tool` from action verbs, misstating `CoursesTable.jsx` Export button line numbers, and misstating `SyllabusSections.jsx` state/button identifiers).
- **5 real, verified codebase bugs** missed in Pass 1 (hardcoded `4 × 3` CO/ILO loop in `courseCriteriaController.js`, false `"Approved"` label for unreviewed Industry Consultant in `CoursesTable.jsx` & `MiniAssignedCourses.jsx`, `rev <= 1` Revision History blocker + prop mismatch in `SyllabusSections.jsx`, `weekNumber` vs. `weekId` blank label in Future Suggestions, and hardcoded semester date windows in `assignmentController.js` & `dashboardController.js`).
- **2 genuinely missed in-scope items** (`COMP-021`, `COMP-022`), **3 Agreement Status reclassifications**, and **5 Priority recalibrations**.

All findings have been directly corrected in [`TODO_DEFENSE_UPDATES.md`](./TODO_DEFENSE_UPDATES.md) (total verified items: **22**, `COMP-001` – `COMP-022`, with all original IDs `COMP-001` – `COMP-020` preserved intact).

---

## 2. Newly Added Items (Missed in Pass 1)

| New ID | Category | Title | Priority | Agreement Status | Transcript Anchor & Codebase Evidence |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`COMP-021`** | Cat 7: Submission & Approval Touchpoints | **Enforce Submission Deadline Closing Behavior & Late-Submission Justification Gate** | `P1 - High` | `Conditional / Needs Clarification` | `[00:02:27]`–`[00:02:57]` (**Speaker 1 / Speaker 2**): *"And also, 'pag nag-close ang submission, close na? Or you will be penalized? O, ano, syempre naman, nagbibigay 'yan ng explanation to the Dean, to the HR office... Pero look, madali na lang idagdag 'yan, 'no?"* — Pass 1 captured deadline *display* (`COMP-002`) but missed instructor-side enforcement in `SyllabusSections.jsx` & `submissionController.js` once a deadline passes. |
| **`COMP-022`** | Cat 1: Entry & Assigned Courses | **Replace Hardcoded Semester Date Windows with Dynamic `AcademicPeriod` Linking & Archive-Mode Read-Only Integrity** | `P1 - High` | `Confirmed / Agreed` | `[00:09:44]`–`[00:10:02]`, `[00:11:34]`–`[00:12:52]` (**Speaker 3 / Speaker 1**): *"Remember, nag-upload tayo ng new school calendar, new school year. It should all be empty... Pwede bang balikan sa archive?"* — Both `assignmentController.js:16-36` and `dashboardController.js:139-147` hardcode `June 01–Nov 25` / `Dec 09–Apr 27` instead of reading `AcademicPeriod.start_date`/`end_date`, and `CoursesTable.jsx:36-47` uses a synthetic `2000–present` loop with no `Summer` support instead of `/api/academic-periods`. |

*(Note: Two smaller missed nuances were folded directly into their parent items rather than creating unnecessary fragmentation: Speaker 4's `[00:51:33]`–`[00:52:05]` question on whether `"45 mins"` is minimum/maximum/average was added to **`COMP-008`**, and Speaker 1's `[01:10:14]` question on reference count limits was added to **`COMP-013`**.)*

---

## 3. Agreement Status & Priority Reclassifications

### 3.1 Agreement Status Reclassifications

| Item ID | Old Status (Pass 1) | Verified Status (Pass 2) | Reason & Transcript Timestamp |
| :--- | :--- | :--- | :--- |
| **`COMP-012`** | `Optional Suggestion` | **`Conditional / Needs Clarification`** | At `[01:02:41]`–`[01:07:40]`, Speaker 4 spent 5 minutes explicitly instructing reference-driven AI topic generation via PDF TOC/excerpt upload (*"Okay, ang gibo mo na lang doon sa AI Suggest: ask the faculty to upload the PDF... table of contents or pages"*), and Speaker 1 endorsed it (*"Parang gano'n, reference-driven... Sige, very good"*). Downgrading to `Optional Suggestion` misread panel intent. Because Speaker 2 later flagged DB bloat (`[01:10:33]`, *"magabato sa database"*) and Speaker 1 mentioned an internal AI server (`[01:06:06]`), `Conditional / Needs Clarification` on ephemeral TOC parsing vs. stored excerpts is accurate. |
| **`COMP-015`** | `Conditional / Needs Clarification` | **`Confirmed / Agreed`** | At `[01:37:33]`–`[01:38:14]` and `[01:43:28]`–`[01:44:52]`, BOTH Speaker 1 (*"sa assessment, dapat naka-base talaga sa COAEP"*) and Speaker 4 (*"That's the purpose of the COAEP! ... 'Yan 'yung constructive alignment!"*) stated COAEP assessment alignment as a firm accreditation rule, not a conditional idea. Furthermore, `IntendedLearningOutcome.assessment_tool` already exists in the DB schema and is queried—then silently ignored—by `courseCriteriaController.js:56`. |
| **`COMP-019`** | `Confirmed / Agreed` | **`Conditional / Needs Clarification`** | At `[01:20:42]`–`[01:21:13]`, the printable Course Review Record was demonstrated inside **Speaker 2's Approval module** and praised (*"Okay. Pwede 'yan"*). Nobody explicitly instructed duplicating it inside Composition's `Revisions.jsx`. While fixing Composition's `rev <= 1` blocker & prop mismatch in `SyllabusSections.jsx` is a concrete bug fix, duplicating vs. sharing Approval's Course Review Record component inside Composition requires team confirmation. |

### 3.2 Priority Calibrations

| Item ID | Old Priority | Verified Priority | Calibration Rationale |
| :--- | :---: | :---: | :--- |
| **`COMP-012`** | `P2 - Medium` | **`P1 - High`** | Academic grounding of AI topics was Speaker 4's most substantial critique of the AI Topic Suggest feature (`[01:02:41]`–`[01:07:40]`). |
| **`COMP-013`** | `P2 - Medium` | **`P1 - High`** | Library utilization & primary-textbook provenance directly govern UNC accreditation audits (`[01:08:18]`–`[01:09:57]`). |
| **`COMP-014`** | `P1 - High` | **`P2 - Medium`** | Verified that non-blocking `>5 years` flagging is **already implemented** in `ReferencePicker.jsx` and `ReferenceSummary.jsx`; remaining work is wording/tooltip polish, `> 5` vs `>= 5` alignment, and `SyllabusPreview.jsx` parity. |
| **`COMP-015`** | `P2 - Medium` | **`P1 - High`** | Constructive alignment with COAEP `assessment_tool` is an explicit panel requirement (`[01:44:22]`) and currently broken by `courseCriteriaController.js:56` ignoring the column. |
| **`COMP-016`** | `P1 - High` | **`P0 - Critical`** | Official UNC PDF export (gated to `Approved` plans) is the instructor's final output artifact verified at defense close (`[01:51:44]`–`[01:51:56]`), and Composition's `Export` buttons are currently dead stubs (`e.preventDefault()`). |
| **`COMP-019`** | `P1 - High` | **`P2 - Medium`** | Course Review Record already exists in Approval; Composition scope is a `rev <= 1` UI blocker fix + optional cross-module component reuse. |

---

## 4. Scope Corrections (Module Boundary Audit)

1. **`COMP-018` (`"sinong teacher 'yan?"` at `[01:14:59]`):**
   - **Pass 1 Issue:** Blended the Program Head's Pending Submissions UI table column into Composition's `COMP-018`.
   - **Correction:** Split cleanly across module boundaries. Added **Section 4.3 Item #1** (Approval module owns rendering the Instructor Name column in the Program Head's queue), while keeping **`COMP-018`** focused on Composition's backend auth enforcement (`submissionRoutes.js`), removing the hardcoded `'1'` fallback in `submissionController.js:42-44`, `SyllabusPreview.jsx` `"Prepared by"` identity, and returned-comment resolution sync.
2. **`COMP-013` & Library Catalog Ingestion (`[01:07:59]`–`[01:08:48]`):**
   - **Correction:** Explicitly added **Director of Libraries Catalog Upload** to **Section 4.3 Item #3** (Approval/Library module owns ingesting/maintaining the official UNC Library catalog), while Composition's `COMP-013` owns consuming it, separating Primary vs. Supplementary references, and requiring acquisition justification for custom books.
3. **`COMP-021` & Deadline Policy Configuration (`[00:02:27]`–`[00:02:57]`):**
   - **Correction:** Added deadline close/late-policy configuration to **Section 4.2 Item #4** (Program Head module), paired with Composition's instructor-side enforcement in **`COMP-021`**.

---

## 5. Codebase & Blast-Radius Corrections

### 5.1 Hallucinated / Wrong Endpoints Fixed in Section 1

| Section 1 Location | Pass 1 (Incorrect / Nonexistent) | Verified Actual Route (`composition/server/routes/`) |
| :--- | :--- | :--- |
| Step 1 (Notifications) | `PUT /api/notifications/:logId/view`, `PUT /api/notifications/mark-all-viewed` | `PATCH` / `POST /api/notifications/:logId/view`, `PATCH` / `POST /api/notifications/view-all` (`routes/notifications.js`) |
| Step 4C (Reference Summary) | `GET /api/reference-summary/:pcId/:revNum` | `GET /api/courses/:pcId/:revNum/references` (`server.js:67` + `routes/courseReferenceRoutes.js:7`) |
| Step 5A (Topics Context) | `GET /api/topics/context/:weekId` | `GET /api/topics/week-context/:weekId` (`routes/topics.js:5`) |
| Step 5B (TLAs) | Listed only `/api/tlas/ilo/:iloId` | Added canonical `GET`/`POST /api/tlas/week/:weekId` alongside `/ilo/:iloId` alias (`routes/tlaRoutes.js:8-9`) |
| Step 5C (References) | Included nonexistent `DELETE /api/references/:id` | Removed nonexistent route (`routes/references.js` has only `GET`, `POST`, `PUT /:id`); added `DELETE /api/ilo-references/:iloReferenceId` (`routes/iloReferences.js:12`) |
| Step 7 (Comments) | `GET /api/comments/counts/:pcId/:revNum`, nonexistent `PUT /api/comments/resolve` | `GET /api/comments/unresolved-counts/:pcId/:revNum`, `PUT /api/comments/update-resolution` (`routes/comments.js`) |

### 5.2 Hallucinated File Paths, Wrong Line Numbers & Missed Blast-Radius Files

| Item ID | Pass 1 Error / Omission | Verified Correction |
| :--- | :--- | :--- |
| **`COMP-001`** | Missed `CurrentTermCard.jsx`, `NotificationBell.jsx`, `notificationController.js`, `academicPeriod.js` | Added all 4 files to blast radius. |
| **`COMP-002`** | Missed `CurrentTermCard.jsx` | Added `CurrentTermCard.jsx` (which currently displays term milestones but no LP submission deadline). |
| **`COMP-003`** | Missed hardcoded `4 × 3` CO/ILO loop in `courseCriteriaController.js`, hardcoded `5 Hr` exam rows in `ILOs.jsx:274-282`, orientation badge bug (`ILOs.jsx:224` passing `ilo_id` instead of `week_id`), and `topicController.js` | Added `topicController.js` and documented all 3 verified bugs. |
| **`COMP-005`** | Missed backend write-guard gaps in `courseDetailsController.js:95-109` (allows overwriting master `Course` fields) & `routes/ilos.js` (`PUT /:ilo_id/schedule`) | Added `CourseDetails.jsx`, `courseDetailsController.js`, `routes/courseDetails.js`, `routes/courseOutcomeAlignment.js`, `routes/ilos.js`, `middleware/auth.js`. |
| **`COMP-007`** | Missed `ILOs.jsx`, `CourseCoverage.jsx`, and `topicController.js` (`getWeekContext`) | Added all 3 files so CO term labels stay consistent across views. |
| **`COMP-008`** | Cited wrong CSS class names (`budgetBanner`/`budgetBannerOver`), missed existing inline modal warning, missed `minutes` stripping on import (`AiTopicSuggestModal.jsx:501-507`), missed `Subtopic` migration for persistence | Fixed class names (`styles.timeBudgetBanner`/`styles.budgetOver`), added `TopicSelector.jsx`, `server/models/subtopic.js`, and optional `[NEW MIGRATION]`. |
| **`COMP-009`** | Falsely stated modal renders *"static suggestion pills"* (it actually renders **no suggestions at all**); missed duplicate standalone modal in `ReferenceForm.jsx:600-641` and `TLAForm.jsx` / `SpellCheckInput.jsx` | Corrected current-state description completely; added `ReferenceForm.jsx`, `TLAForm.jsx`, `SpellCheckInput.jsx`. |
| **`COMP-010`** | **Hallucinated nonexistent `.css` files:** `client/src/styles/TopicForm.module.css`, `client/src/styles/TLAForm.module.css` | Replaced with actual `.sass` files: `Form.module.sass`, `TopicSelector.module.sass`, `FormNavigation.module.sass`. |
| **`COMP-011`** | Omitted stylesheet for new modal | Added `[NEW FILE] client/src/styles/AiTlaSuggestModal.module.sass`. |
| **`COMP-012`** | Missed `server/routes/topics.js` and missing backend packages | Added `server/routes/topics.js` and flagged `server/package.json` (neither `multer` nor `pdf-parse` is currently installed). |
| **`COMP-013`** | Missed `SyllabusPreview.jsx` and `referenceSummaryController.js` | Added both files to ensure Primary vs. Supplementary tiering renders in full preview & summary. |
| **`COMP-014`** | Cited wrong CSS class (`styles.deprecatedBadge`), missed that feature is already built in `ReferencePicker.jsx` & `ReferenceSummary.jsx`, missed `SyllabusPreview.jsx` gap & `> 5` vs `>= 5` discrepancy | Corrected class to `styles.deprecatedTag`, added `SyllabusPreview.jsx` & `ReferencePicker.module.sass`, flagged `2021` threshold check. |
| **`COMP-015`** | Falsely claimed `iloController.js` derives `assessment_tool` from action verbs; missed that `IntendedLearningOutcome.assessment_tool` column **already exists** and is queried-then-ignored by `courseCriteriaController.js:56` | Removed false claim; added `server/models/intendedLearningOutcome.js`, `server/models/tlaAssessment.js`, and `server/controllers/tlaController.js` (`ilo_id: null` issue). |
| **`COMP-016`** | Cited wrong line numbers in `CoursesTable.jsx` (`286–290` & `386–390`), missed `server/package.json` dependency note | Corrected to actual lines **`378–388`** (Grid) and **`592–601`** (List) and flagged no PDF library installed in `composition/server/package.json`. |
| **`COMP-017`** | Cited nonexistent identifiers (`isSubmitting`, `countdown`, `"Undo Submission"`) and missed real grammar typo on line `353` | Corrected to actual `submitPhase`, `timeLeft`, `"Cancel Submission"` and flagged `"You will no longer be edit it unless it is returned."` |
| **`COMP-018`** | Missed `server/routes/submissionRoutes.js`, `server/middleware/auth.js`, and `SyllabusPreview.jsx` | Added all 3 files. |
| **`COMP-019`** | **Hallucinated nonexistent `.css` file:** `client/src/styles/Revisions.module.css`; missed `SyllabusSections.jsx:31-44` (`rev <= 1` blocker) and line `258` prop mismatch | Replaced with `client/src/styles/Revisions.module.sass` and documented both verified bugs in `SyllabusSections.jsx`. |
| **`COMP-020`** | Wrongly located `buildApproverStatus` in `AssignedCourses.jsx:73-86` (a 19-line wrapper!); misstated current behavior (`Pending` falls into `else Approved`, NOT prepending `Suggested`); missed `SyllabusSections.jsx:321` (`item.weekNumber` vs `weekId`) bug | Corrected paths to `CoursesTable.jsx:157-220, 413-420` & `MiniAssignedCourses.jsx:13-73, 174-181` and documented the `weekNumber` bug in `commentController.js:514`. |

---

## 6. Items Requiring Your Final Decision

Before starting implementation, confirm your architectural/policy choice on these **5 open decision points**:

1. **`COMP-021` — Past-Deadline Submission Policy (`[00:02:27]`–`[00:02:57]`):**
   - Should passing the Program Head's submission deadline **(A) hard-lock** `Submit` until extended by the Program Head/Dean, or **(B) allow late submission** while forcing a mandatory `late_explanation` modal tagged `is_late = true` and sent to the Dean/Program Head?
2. **`COMP-012` — PDF TOC / Excerpt Grounding Architecture (`[01:03:56]`–`[01:10:49]`):**
   - Should faculty PDF uploads (Table of Contents / chapter excerpts) be **(A) parsed ephemerally** in memory and forwarded to Gemini with zero MySQL blob storage (recommended to address Speaker 2's DB concern), or **(B) stored as compact plain-text TOC outlines** on the `References` table for reuse across weeks?
3. **`COMP-005` — Instructor Access to "Edit Alignments" (`OutcomeAlignment.jsx`, `[01:12:29]`–`[01:13:45]`):**
   - Once the Program Head uploads the official COAEP/PO mapping, should `OutcomeAlignment.jsx` **(A) become read-only** for instructors, or **(B) remain editable** with a visible `"Modified by Instructor — Requires Program Head Verification"` flag?
4. **`COMP-019` — Course Review Record Ownership (`Revisions.jsx`, `[01:20:42]`–`[01:21:13]`):**
   - After fixing Composition's `rev <= 1` blocker, should `Revisions.jsx` **(A) directly reuse/mount** Speaker 2's Approval-module **Course Review Record** component after integration, or **(B) keep `Revisions.jsx` as a revision diff viewer** with a lightweight print summary?
5. **`COMP-014` — Outdated Reference Year Cutoff (`ReferencePicker.jsx` vs. Library Review, `[01:23:39]`):**
   - Confirm with the Approval module whether the 5-year cutoff is **`currentYear - pubYear >= 5`** (flagging `2021` books in `2026`, matching Speaker 1's `"Like 2021, 'di na pwede 2021 ngayon?"`) or **`> 5`** (current Composition code, flagging `2020` and older in `2026`).
