# 02 — Cross-Module Integration Contracts & Handoff Guide

> **Why this file exists:** Right now, **Course Assignment (COAEP Upload)**, **Learning Plan Composition**, and **Submissions Management (Approval Workflow)** are developed in separate modules/branches. Some version-handling hooks currently live in Composition as safe fallbacks, while their permanent lifecycle triggers belong in **Course Assignment** and **Submissions Management**. Use this guide when integrating modules so responsibilities transfer cleanly without regressing version integrity.

---

## 1. Integration Contract: Course Assignment & COAEP Management Module

### When Does a New Learning Plan Instance Get Created?
**Trigger:** When a **Program Head** assigns a course offering to an Instructor for a new academic term (either after uploading a newly updated COAEP document, OR reusing the previous term's COAEP without uploading a new one).

### What the Course Assignment Module MUST Do Upon Assignment

Execute the following inside a single database transaction when assigning a course for a new term:

1. **Locate the Latest Approved Offering (if any) for `(course_id, program_id)`**
   - Query `ProgramCourseOfferings` for the same `course_id` and `program_id` whose latest `CourseOfferingAssignment` has a `DEAN` approval (`ACCEPTED` or `APPROVED` in `AssignmentWorkflowLogs`).
   - Let this record be `prevApprovedOffering` (or `null` if this is the very first time the course is offered).

2. **Create a Brand-New `ProgramCourseOffering` Instance (NEVER Reuse `prevApprovedOffering.pc_offering_id`)**
   ```js
   const newOffering = await ProgramCourseOffering.create({
     course_id,
     program_id,
     dept_id,
     // Inherit the SAME revision_number as the previous approved version!
     // Do NOT pre-increment here — revision increments ONLY after Dean approval + modifications.
     revision_number: prevApprovedOffering ? prevApprovedOffering.revision_number : 0, // or 1 if 1-based baseline
     base_pc_offering_id: prevApprovedOffering ? prevApprovedOffering.pc_offering_id : null,
     has_modifications: false,
     is_revision_incremented: false,
     course_description: uploadedCoaep?.course_description
       ?? prevApprovedOffering?.course_description
       ?? ''
   }, { transaction: t });
   ```
   > **Important:** Notice `revision_number` starts equal to `prevApprovedOffering.revision_number`. While the new offering is in `Draft`, `Pending`, or `Returned` status, its revision number **must not increment**.

3. **Populate COAEP-Level Metadata on `newOffering` (Must NOT Be Blank)**
   - **Case A — Program Head uploaded a NEW COAEP document:**
     - Create `CourseOutcomes` linked to `newOffering.pc_offering_id`.
     - Create `IntendedLearningOutcomes` linked to those new `co_id`s, populating:
       - `description`
       - `assessment_tool`
       - `is_orientation` (`true` for Course Orientation ILO, `false` for graded COAEP ILOs)
       - `prelim_weight`, `midterm_weight`, `semi_weight`, `final_weight`, `target` *(new columns from migration `20260530000000`)*
     - Create `ProgramOutcomeAlignments` for the new `co_id`s.
     - Create `Weeks` linked to the new `co_id`s (with proper weekly `hours`).
   - **Case B — Program Head did NOT update the COAEP (reusing previous term's COAEP):**
     - Clone `CourseOutcomes`, `IntendedLearningOutcomes` (including the 5 grading weight/target columns), `ProgramOutcomeAlignments`, and `Weeks` from `prevApprovedOffering` onto `newOffering.pc_offering_id`.

4. **Leave Weekly Instructional Content BLANK by Default (`COMP-004`)**
   - **DO NOT** copy or auto-populate any of the following onto `newOffering`'s new `week_id`s:
     - `Subtopics`
     - `TeachingAndLearningActivities`
     - `TLAAssessments`
     - `WeeklyReferences`
   - Leaving these empty ensures the instructor opens a blank 3-column weekly canvas (`Topics` | `Teaching & Learning Activities` | `References`) and consciously chooses whether to author fresh content, use Topic **AI Suggest**, or click the consolidated **`Import Previous`** button beside `Save` in `FormNavigation` to selectively import previous-term contents for that week.

5. **Create `CourseOfferingAssignment` + Initial `AssignmentWorkflowLog`**
   - Create `CourseOfferingAssignment` pointing to `newOffering.pc_offering_id`, `stakeholder_id` (assigned instructor), `date_assigned = new Date()`, `date_submitted = null`.
   - Create `AssignmentWorkflowLog` with `action_type: 'ASSIGNED'`, `actor_role: 'PROGRAM_HEAD'`.

### Temporary Composition Bridge (Until Integrated)
- Right now, [`composition/server/seeders/20260512030000-seed-composition-foundation.js`](../server/seeders/20260512030000-seed-composition-foundation.js) simulates this exact handoff for `BIT313L`:
  - `pc_offering_id = 1` (`Rev 1`, Approved historical baseline with full 16 weeks of content)
  - `pc_offering_id = 2` (`Rev 1`, Draft new-term instance with `base_pc_offering_id = 1`, `has_modifications = false`, `is_revision_incremented = false`, cloned COAEP metadata, and blank weekly content).
- Once the Course Assignment module creates `ProgramCourseOfferings` dynamically using the 5 steps above, the Composition module will work automatically with zero schema changes.

---

## 2. Integration Contract: Submissions Management & Approval Workflow Module

### When Does `revision_number` Increment?
**Business Rule:**
> *"Revision number is incremented by `+1` **if and only if** the learning plan has been modified (even a tiny detail in Course Details, CO-PO Alignment, Topics/Subtopics, TLAs/Assessments, References, or Criteria for Grading) **AND** it has been approved by the final approver (**Dean**). Even if the instructor makes changes, if it is still Draft, Pending, or Returned (not Dean-approved), the revision number MUST NOT increment."*

### How `has_modifications` Is Maintained (Already Implemented in Composition)
Every authoring mutation endpoint in the Composition module already calls `markOfferingModified(pcOfferingId)` from [`composition/server/utils/versionHelper.js`](../server/utils/versionHelper.js):

| Learning Plan Section | Controller & Endpoint(s) Calling `markOfferingModified()` |
| :--- | :--- |
| **Course Details** | `courseDetailsController.js` → `PUT /api/course-details/:pcId/:revNum` |
| **CO–PO Alignment** | `courseOutcomeAlignmentController.js` → `PUT /api/course-outcome-alignment/:pcId/:revNum` |
| **Topics & Subtopics** | `topicController.js` → `POST /api/topics/assign` |
| **TLAs & Assessments** | `tlaController.js` → `POST /api/tlas/week/:weekId` (and `/ilo/:iloId` alias) |
| **Weekly References** | `iloReferenceController.js` → `POST /api/ilo-references/assign`, `DELETE /api/ilo-references/:iloReferenceId` |
| **Criteria for Grading** | `courseCriteriaController.js` → `PUT /api/course-criteria/:pcId/:revNum` |

> **Rule for Future Endpoints:** If any new editing endpoint is added later (e.g., ILO schedule editing or bulk import save), it **MUST** also call `markOfferingModified(pcOfferingId, transaction)`.

### What the Submissions Management Module MUST Do on Approval Actions

1. **On Instructor Submit (`SUBMITTED`), Program Head Endorse (`ACCEPTED`), Library Director Endorse (`ACCEPTED`), or Approver Return (`RETURNED`):**
   - **DO NOT** increment `ProgramCourseOfferings.revision_number`.
   - Only insert the corresponding `AssignmentWorkflowLog` entry.

2. **On Final Approver (`DEAN`) Approval (`ACCEPTED` / `APPROVED`):**
   - Inside the **same transaction** that inserts the Dean's `AssignmentWorkflowLog` approval entry, invoke:
     ```js
     const { evaluateAndIncrementRevisionOnApproval } = require('../utils/versionHelper');
     // After creating AssignmentWorkflowLog with actor_role: 'DEAN', action_type: 'APPROVED' (or 'ACCEPTED'):
     const revisionResult = await evaluateAndIncrementRevisionOnApproval(offering.pc_offering_id, transaction);
     ```
   - What `evaluateAndIncrementRevisionOnApproval(pcOfferingId, tx)` guarantees:
     1. Checks `offering.is_revision_incremented === false` (idempotent — will never double-increment).
     2. Verifies latest assignment workflow status is `Approved` (Dean approval exists in `AssignmentWorkflowLogs`).
     3. Verifies a prior approved offering exists (`approvedPriorOfferings.length > 0 || offering.base_pc_offering_id`). (If this is the course's very first approved learning plan ever, it keeps its initial revision number without incrementing.)
     4. Checks `offering.has_modifications === true`. (If an instructor carried over the previous syllabus verbatim with zero modifications, `revision_number` stays unchanged!)
     5. Computes `nextRevisionNumber = Math.max(maxPriorApprovedRev, offering.revision_number) + 1` and updates:
        ```sql
        UPDATE ProgramCourseOfferings
        SET revision_number = :nextRevisionNumber,
            is_revision_incremented = true
        WHERE pc_offering_id = :pcOfferingId;
        ```

3. **Important URL / Route Note After Revision Increment:**
   - Because `revision_number` increments only at final Dean approval, a link that previously pointed to `/courses/:pcId/1/pending` will now have `revision_number = 2` in the database once approved.
   - All Composition controllers already use `findOfferingByPcIdAndRev(pcId, revNum)` (in `versionHelper.js`) which matches `(pc_offering_id, revision_number)` first and safely falls back to `pc_offering_id` if the revision number just incremented.
   - **Action for Submissions Management / Notifications:** When generating deep-links or notification targets, always read the post-increment `offering.revision_number` (or use `findOfferingByPcIdAndRev` on read endpoints) so stale notification URLs never return `404`.

### Temporary Composition Bridge (Until Integrated)
- Currently, [`composition/server/controllers/revisionController.js`](../server/controllers/revisionController.js) (lines 286–295) contains a defensive self-healing hook: when fetching `GET /api/revisions/:pcId`, if it encounters a Dean-approved offering whose `base_pc_offering_id` is set and `is_revision_incremented === false`, it invokes `evaluateAndIncrementRevisionOnApproval(offering.pc_offering_id)`.
- **Keep this defensive fallback** during integration, AND wire `evaluateAndIncrementRevisionOnApproval()` directly into the Submissions Management module's Dean approval controller so the increment happens immediately at approval time rather than waiting for someone to open the Revisions modal.

---

## 3. Integration Contract: Shared Database & Seeders (`COMP-001` & `COMP-022` Readiness)

When merging the separate module databases into one unified database:

1. **Preserve Migration Order:** Ensure `20260530000000-add-version-handling-and-cow-support.js` runs **after** the base table creation migrations for `ProgramCourseOfferings`, `IntendedLearningOutcomes`, `Topics`, `Subtopics`, and `References`.
2. **Keep `pc_offering_id` as the Primary Instance Key:** Never treat `(course_id, revision_number)` as a unique primary key across unapproved drafts—because an approved Term 1 offering (`pc_offering_id = 1, rev = 1`) and a new Term 2 Draft (`pc_offering_id = 2, rev = 1`) **legitimately share the same `revision_number`** until the Dean approves Term 2!
   - Always identify and route offerings by `pc_offering_id` (as already updated in `Revisions.jsx` and `SyllabusSections.jsx`).
3. **Preserve `AcademicPeriod` Linking (Upcoming `COMP-022`):** When integrating with the VPAA Calendar / Academic Period module, add `academic_period_id` on `ProgramCourseOfferings` (or `CourseOfferingAssignments`) rather than relying on date-range heuristics, and keep `formatTermFromDate()` in `versionHelper.js` only as a fallback when `academic_period_id` is null.
4. **Do Not Bypass CoW When Editing Shared Catalogs:** If any other module (e.g., Library Director reference management or Program Head topic curation) updates rows in `Topics` or `References`, check whether the row is referenced by historical offerings and follow the same Copy-on-Write pattern (`parent_topic_id` / `parent_reference_id`) so archived approved learning plans remain immutable.

---

## 4. Pre-Integration Verification Checklist

Before closing integration for any module, verify these 6 test scenarios against the merged database:

- [ ] **Scenario 1 (New Assignment Isolation):** Program Head assigns a course that has an existing Approved Rev `N` → A new `pc_offering_id` is created with `base_pc_offering_id = oldPcId`, `revision_number = N`, `has_modifications = false`, `is_revision_incremented = false`, COAEP metadata populated, and weekly Topics/TLAs/References empty.
- [ ] **Scenario 2 (Copy-on-Write Topics & References):** Instructor imports a Topic & Reference from Rev `N`, edits the Topic title and Reference title, and saves → Historical Rev `N` retains its exact original Topic and Reference titles; new forked rows exist with `parent_topic_id` / `parent_reference_id` populated.
- [ ] **Scenario 3 (No Duplicate Imports & Consolidated 3-Column Import Previous Modal):** Instructor reuses an unmodified Topic, TLA, or Reference across Terms 1, 2, and 3 → Only **one** canonical `Topics` / `References` row exists; clicking the consolidated **`Import Previous`** button (beside `Save` in `FormNavigation`) opens the 3-column select-mode popup modal (`Topics`, `Teaching & Learning Activities`, `References`) displaying strictly the matching week's items from the latest previous revision (`GET /api/topics/previous/:weekId`, `GET /api/tlas/previous/:weekId`, `GET /api/ilo-references/previous/:weekId`).
- [ ] **Scenario 4 (Deferred Increment — Unapproved):** Instructor edits content and submits → `has_modifications = true`, but `revision_number` remains `N` during Draft, Pending, Program Head endorsement, Library Director endorsement, and Returned states.
- [ ] **Scenario 5 (Deferred Increment — Dean Approval):** Dean approves the modified offering → `revision_number` atomically increments to `N + 1` and `is_revision_incremented = true`; calling approval again does not increment to `N + 2`.
- [ ] **Scenario 6 (Same-CO Topic Continuation):** Instructor saves a topic in CO1 Week 1 and uses **Continue Previous Topic** in CO1 Week 2 with different subtopics → Both weeks share the exact same `topic_id`, display separate subtopics per week in Course Coverage, and CO2 Week 1 is never flagged as a continuation of CO1.
