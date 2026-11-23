# Learning Plan Composition — Cross-Module Integration Notes

> **Purpose:** Preserve critical database schema extensions, version-integrity invariants, and cross-module handoff contracts implemented in the **Learning Plan Composition** module so they are prioritized and never lost when integrating with **Course Assignment (COAEP Management)**, **Submissions Management (Approval Workflow)**, and **Academic Period / User Setup**.
>
> **Last Updated:** 2026-11-23  
> **Scope Covered:** Version & Revision Handling, Copy-on-Write (CoW) Historical Integrity, Blank-Slate New-Term Initialization (`COMP-004`, `COMP-006`, `COMP-010`, `COMP-011`), Deferred Revision Increment, 3-Column Pin-Toggle Weekly Content Form (`Topics`, `TLAs`, `References`), Consolidated 3-Column `Import Previous` Modal (Previous Term Only), 3-Column Validation Notice Modal, and Weekly Topic Continuation.

---

## Document Index

| Document | Audience / Focus |
| :--- | :--- |
| **[`01-database-schema-and-version-integrity.md`](./01-database-schema-and-version-integrity.md)** | Database architects & backend developers unifying schemas across modules. Documents every new column, foreign key, Copy-on-Write rule, and canonical deduplication rule. |
| **[`02-module-integration-contracts.md`](./02-module-integration-contracts.md)** | Developers integrating **Course Assignment**, **COAEP Upload**, and **Submissions Management / Approval Workflow**. Defines exact responsibilities, handoff triggers, and what temporary bridges currently live in Composition. |
| **[`03-session-changelog-and-qa-summary.md`](./03-session-changelog-and-qa-summary.md)** | Full chronological record of all backend, frontend, migration, seeder, and UI changes applied in this session, plus QA verification results. |

---

## Non-Negotiable Integration Invariants (Read First Before Merging)

Before merging databases or wiring modules together, ensure these **6 core invariants** remain intact:

1. **Every New Term Assignment Creates an Isolated `ProgramCourseOffering` Instance**
   - Re-assigning a course to an instructor for a new term MUST create a **new `ProgramCourseOffering` row** (with its own `CourseOutcomes`, `IntendedLearningOutcomes`, `Weeks`, `ProgramOutcomeAlignments`, and `CourseOfferingAssignment`), linked to the prior approved offering via `base_pc_offering_id`.
   - **Never** point a new term's `CourseOfferingAssignment` at an already-approved `pc_offering_id`.

2. **Blank Slate for Weekly Instructional Content, Populated for COAEP Metadata**
   - When a new offering instance is created for the next term (whether COAEP changed or stayed the same):
     - **KEEP POPULATED (COAEP / Course Level):** Course Details (`ProgramCourseOfferings.course_description`, `Courses`), CO–PO Alignments (`ProgramOutcomeAlignments`), Course Outcomes (`CourseOutcomes`), Intended Learning Outcomes & Grading Weights (`IntendedLearningOutcomes` including `prelim_weight`, `midterm_weight`, `semi_weight`, `final_weight`, `target`), and `Weeks`.
      - **KEEP BLANK BY DEFAULT (Weekly Authoring Level):** `Subtopics`, `TeachingAndLearningActivities`, `TLAAssessments`, and `WeeklyReferences`. Instructors author weekly content inside the **3-Column Pin-Toggle Weekly Content Form** (`Topics` | `Teaching & Learning Activities` | `References`, all pinned by default with unified `440px` Topic/TLA card heights and automatic 2-per-row expansion when a single column is pinned, satisfying `COMP-010`). Instructors can opt in to carry over the previous term's matching-week items via the consolidated **`Import Previous`** button beside `Save` in `FormNavigation` (opening the 3-column `ImportPreviousModal`) or use Topic **AI Suggest** (no AI Suggest on TLAs).

3. **Deferred Revision Number Increment (Dean Final Approval Only)**
   - A new offering instance starts with the **same `revision_number`** as its `base_pc_offering_id` (e.g., `Rev 1` → new draft starts at `Rev 1`, NOT `Rev 2`).
   - Any instructor edit (Course Details, CO-PO Alignment, Topics/Subtopics, TLAs/Assessments, References, Criteria for Grading) sets `has_modifications = true` on the offering, **without** incrementing `revision_number`.
   - `revision_number` is incremented by `+1` **if and only if**:
     1. The final approver (**`DEAN`**) approves (`ACCEPTED` / `APPROVED`),
     2. `has_modifications === true`, and
     3. `is_revision_incremented === false` (idempotency guard).

4. **Copy-on-Write (CoW) Protects Historical Approved Learning Plans**
   - Shared catalog tables (`Topics` and `References`) are **never** mutated in place if another week/offering references them.
   - Editing a shared Topic title or shared Reference metadata automatically forks a new row linked via `parent_topic_id` or `parent_reference_id` and re-points only the current offering's child rows (`Subtopics` / `WeeklyReferences`).

5. **Canonical Deduplication & Strict Previous-Term Matching-Week Import**
   - Reusing an unmodified Topic or Reference across multiple terms points to the **same canonical `topic_id` / `reference_id`** rather than cloning rows per term.
   - The consolidated **`Import Previous`** button (located outside the pin bar beside `Save` in `FormNavigation.jsx`) opens `ImportPreviousModal.jsx`, which queries `GET /api/topics/previous/:weekId`, `GET /api/tlas/previous/:weekId`, and `GET /api/ilo-references/previous/:weekId` to display **strictly the latest previous term/revision's matching-week contents** across 3 selectable columns (`Topics`, `Teaching & Learning Activities`, `References`).

6. **Same-CO Weekly Topic Continuation Isolation**
   - **Continue Prev** (`Continue Previous Topic`) shares the parent `topic_id` across consecutive weeks **strictly within the same Course Outcome and current offering**, storing separate `Subtopics` rows per `week_id`. It never leaks across CO boundaries or prior offerings.
