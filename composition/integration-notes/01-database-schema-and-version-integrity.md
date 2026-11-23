# 01 — Database Schema Extensions & Version Integrity Architecture

> **Migration File:** `composition/server/migrations/20260530000000-add-version-handling-and-cow-support.js`  
> **Core Version Utility:** `composition/server/utils/versionHelper.js`  
> **Foundation Seeder Reference:** `composition/server/seeders/20260512030000-seed-composition-foundation.js`

---

## 1. Why These Database Changes Were Necessary

Previously, the database lacked explicit lineage and modification-tracking metadata across learning plan instances:

- **Problem A (Historical Corruption Risk):** `Topics` and `References` are shared catalog tables referenced by `Subtopics` and `WeeklyReferences`. If an instructor in Term 2 imported a Topic or Reference from an approved Term 1 learning plan and edited its title/details, an in-place `UPDATE` would silently mutate Term 1's approved syllabus.
- **Problem B (Duplication Bloat vs. Clean Import):** Conversely, blindly duplicating every `Topic` and `Reference` row for every new term would cause catalog tables and previous-term import modals to accumulate repeated identical titles for every historical term/revision.
- **Problem C (Premature Revision Numbering):** `revision_number` lived on `ProgramCourseOfferings` with no flag to track whether the instructor actually changed anything or whether the Dean had already granted final approval—making it impossible to enforce *"increment `revision_number` by +1 ONLY when modified AND finally approved by the Dean"*.
- **Problem D (Blank-Slate Grading Criteria Dependency):** `CriteriaForGrading` previously derived its grading weights (`Prelim`/`Midterm`/`Semi`/`Final` %) and `Minimum Passing` primarily from `TLAAssessments`. Once new term drafts start blank for weekly TLAs (`COMP-004`), `CriteriaForGrading` would have appeared empty unless COAEP-level weights were stored directly on `IntendedLearningOutcomes`.

---

## 2. Complete Catalog of New Database Columns (12 Columns Across 5 Tables)

> **CRITICAL FOR MERGING:** When consolidating migrations across all modules into a single shared database, **all 12 columns below MUST be preserved** with matching types, nullability, defaults, and foreign keys.

### 2.1 `ProgramCourseOfferings` (3 New Columns)

| Column | Type | Nullable / Default | Foreign Key | Purpose & Integration Priority |
| :--- | :--- | :--- | :--- | :--- |
| `base_pc_offering_id` | `INTEGER` | `NULL` | Self-FK → `ProgramCourseOfferings(pc_offering_id)` (`ON UPDATE CASCADE`, `ON DELETE SET NULL`) | Links a new term's offering instance back to the prior approved offering it evolved from. Used by **Course Assignment** on instantiation, by **Composition** for prior-revision matching-week lookups (`Import Previous` modal), and by **Submissions Management** to verify whether a prior approved version exists before incrementing `revision_number`. |
| `has_modifications` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | — | Dirty flag set to `true` via `markOfferingModified(pcOfferingId)` whenever an instructor modifies Course Details, CO–PO Alignments, Topics/Subtopics, TLAs/Assessments, Weekly References, or Criteria for Grading. Does **NOT** increment `revision_number` on its own. |
| `is_revision_incremented` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | — | Idempotency guard ensuring `revision_number` can be incremented at most once when the Dean grants final approval (prevents double-incrementing on repeated API calls, retries, or page reloads). |

### 2.2 `IntendedLearningOutcomes` (5 New Columns)

| Column | Type | Nullable / Default | Foreign Key | Purpose & Integration Priority |
| :--- | :--- | :--- | :--- | :--- |
| `prelim_weight` | `DECIMAL(5, 2)` | `NULL` | — | Stores COAEP-level Prelim grading weight (%) directly on the ILO so **Criteria for Grading** remains populated even while weekly TLAs/assessments start blank. |
| `midterm_weight` | `DECIMAL(5, 2)` | `NULL` | — | Stores COAEP-level Midterm grading weight (%). |
| `semi_weight` | `DECIMAL(5, 2)` | `NULL` | — | Stores COAEP-level Semifinal grading weight (%). |
| `final_weight` | `DECIMAL(5, 2)` | `NULL` | — | Stores COAEP-level Final grading weight (%). |
| `target` | `STRING(255)` | `NULL` | — | Stores COAEP-level minimum passing target (e.g., `"60%"`) directly on the ILO. |

> **Integration Note (COAEP Upload):** When the Program Head uploads a COAEP document in the Course Assignment module, the parser should populate `prelim_weight`, `midterm_weight`, `semi_weight`, `final_weight`, and `target` on `IntendedLearningOutcomes` alongside `description` and `assessment_tool`. If the Program Head reuses the previous COAEP without uploading a new one, clone these 5 columns from the `base_pc_offering_id`'s ILOs.

### 2.3 `Topics` (2 New Columns)

| Column | Type | Nullable / Default | Foreign Key | Purpose & Integration Priority |
| :--- | :--- | :--- | :--- | :--- |
| `course_id` | `INTEGER` | `NULL` | FK → `Courses(course_id)` (`ON UPDATE CASCADE`, `ON DELETE SET NULL`) | Scopes canonical topics directly to their parent course, enabling fast course-level deduplication and preventing cross-course title collisions. |
| `parent_topic_id` | `INTEGER` | `NULL` | Self-FK → `Topics(topic_id)` (`ON UPDATE CASCADE`, `ON DELETE SET NULL`) | Records Copy-on-Write (CoW) lineage whenever an instructor edits the title of a shared topic, preserving an audit trail from the forked topic back to the original historical topic. |

### 2.4 `Subtopics` (1 New Column)

| Column | Type | Nullable / Default | Foreign Key | Purpose & Integration Priority |
| :--- | :--- | :--- | :--- | :--- |
| `parent_subtopic_id` | `INTEGER` | `NULL` | Self-FK → `Subtopics(subtopic_id)` (`ON UPDATE CASCADE`, `ON DELETE SET NULL`) | Records lineage back to the historical `subtopic_id` when a subtopic is imported from a previous approved revision into a new term's week. |

### 2.5 `References` (1 New Column)

| Column | Type | Nullable / Default | Foreign Key | Purpose & Integration Priority |
| :--- | :--- | :--- | :--- | :--- |
| `parent_reference_id` | `INTEGER` | `NULL` | Self-FK → `References(reference_id)` (`ON UPDATE CASCADE`, `ON DELETE SET NULL`) | Records Copy-on-Write (CoW) lineage whenever an instructor edits a shared Reference that is still linked by another offering's `WeeklyReferences`. |

---

## 3. How Version Integrity Works End-to-End

### 3.1 Multi-Instance Offering Isolation

Each term's course assignment owns its own isolated relational subtree rooted at `ProgramCourseOfferings`:

```
Course (e.g., BIT313L - Human-Computer Interaction)
 ├── ProgramCourseOffering #1  (Rev 1 | Status: Approved | 1st Sem SY 2025-2026)
 │    ├── CourseOfferingAssignment #1  (WorkflowLogs -> DEAN ACCEPTED)
 │    ├── CourseOutcomes (CO1..CO4) -> ProgramOutcomeAlignments
 │    ├── IntendedLearningOutcomes (with COAEP weights & target)
 │    └── Weeks (1..16)
 │         ├── Subtopics (96 rows) -------> references canonical Topics (32 rows)
 │         ├── TLAs (96) + TLAAssessments (48)
 │         └── WeeklyReferences (32) -----> references canonical References (28 rows)
 │
 └── ProgramCourseOffering #2  (Rev 1 | Status: Draft | 2nd Sem SY 2025-2026)
      ├── base_pc_offering_id = 1
      ├── has_modifications = false   (flips to true upon any instructor edit)
      ├── is_revision_incremented = false  (flips to true ONLY when Dean approves + modified)
      ├── CourseOfferingAssignment #2  (WorkflowLogs -> ASSIGNED)
      ├── CourseOutcomes (CO5..CO8) -> ProgramOutcomeAlignments (cloned from COAEP)
      ├── IntendedLearningOutcomes (cloned with COAEP weights & target)
      └── Weeks (17..32)
           ├── Subtopics: EMPTY by default (Blank Slate)
           ├── TLAs / TLAAssessments: EMPTY by default (Blank Slate)
           └── WeeklyReferences: EMPTY by default (Blank Slate)
```

Because `Subtopics`, `TeachingAndLearningActivities`, `TLAAssessments`, and `WeeklyReferences` attach to **Offering #2's own `week_id`s (17–32)**, adding, editing, or deleting weekly content in Offering #2 can never alter Offering #1's weeks (1–16).

### 3.2 Copy-on-Write (CoW) & Canonical Deduplication Rules

To avoid both **historical corruption** AND **duplicate titles across revisions**, the Composition backend enforces hybrid sharing + Copy-on-Write:

| Action in New Term Offering (#2) | What Happens in the Database | Historical Offering (#1) Impact |
| :--- | :--- | :--- |
| **Import Topic & keep title identical** | Creates new `Subtopics` rows on Offering #2's `week_id` pointing to the **existing canonical `topic_id`** (stores `parent_subtopic_id` if imported). **Zero duplicate `Topics` rows created.** | Untouched (keeps its own `Subtopics` on weeks 1–16). |
| **Import Topic & edit Topic title** | `assignTopicsToILO` checks `Subtopic.count({ topic_id, week_id: { [Op.ne]: currentWeekId } })`. Because count > 0, it **never runs `UPDATE Topics`**. Instead, it either reuses an existing canonical Topic with the new title OR forks a brand-new `Topic` row with `parent_topic_id = oldTopicId`, and points Offering #2's subtopics to the new `topic_id`. | Untouched (keeps original Topic title). |
| **Import Topic & edit/delete Subtopic** | `Subtopics` are already per-`week_id`, so modifying/deleting Offering #2's subtopics only touches `week_id ∈ [17..32]`. | Untouched. |
| **Import Reference & keep details identical** | Creates a new `WeeklyReference` row on Offering #2's `week_id` pointing to the **existing `reference_id`**. **Zero duplicate `References` rows created.** | Untouched. |
| **Edit a shared Reference's title/author/ISBN/year** | `updateReference` checks `WeeklyReferences` across other offerings. If referenced by another `pc_offering_id`, it forks a new `Reference` row with `parent_reference_id = oldRefId` and re-points **only** Offering #2's `WeeklyReferences` to the forked `reference_id`. | Untouched (keeps original Reference metadata). |
| **Continue Previous Topic (Week `N-1` → Week `N` within same CO)** | `assignTopicsToILO` reuses Week `N-1`'s `topic_id` (matching by `topic_id` or canonical title if unsaved) and inserts separate `Subtopics` for Week `N`. `getAssignedTopics` computes `isContinuation` strictly from earlier weeks within the **same `co_id` and current offering**. | Untouched; zero duplicate `Topics` rows; never leaks across COs. |

### 3.3 Deduplicated, Course-Scoped Import & Catalog Queries

- **Active Consolidated `Import Previous` Modal Endpoints (`ImportPreviousModal.jsx` — Previous Term Matching-Week Only):**
  - **`GET /api/topics/previous/:weekId`**: Returns `matchingWeekTopics` (from the latest prior revision's matching week, orientation-isolated) with `sourceWeekNumber`, `sourceTermLabel`, and `sourceRevisionNumber`, plus `parent_subtopic_id` lineage support on import.
  - **`GET /api/tlas/previous/:weekId`**: Loads TLAs and Assessments strictly from the matching week of the latest prior revision and remaps `TLAAssessment.ilo_id` by CO/ILO positional index onto the current offering's own `ilo_id`s.
  - **`GET /api/ilo-references/previous/:weekId`**: Returns the matching week's `WeeklyReferences` from the latest prior revision alongside compact `sourceOffering` metadata.
- **Course Reference Catalog Endpoint (`ReferencePicker.jsx`):**
  - **`GET /api/references`**: Course-scoped and deduplicated by normalized `(title, author, type)`, keeping the most recent canonical row per course.
- **Preserved Backend Course-Catalog Endpoints (Not Currently Wired to UI Search Bars):**
  - **`GET /api/topics/available`** and **`GET /api/tlas/available`**: Strictly course-scoped and orientation-isolated endpoints (never falling back to unfiltered cross-course queries) that rank the latest prior revision's matching-week items first (`isPrevMatchingWeek: true`) followed by deduplicated all-course items. Per-picker search bars were removed in favor of the consolidated 3-column `Import Previous` modal, while these endpoints remain preserved on the server for comment target resolution and future catalog tooling.

---

## 4. Updated Sequelize Models Checklist

Ensure these 5 Sequelize models carry the new attributes and associations during any repository merge:

1. `composition/server/models/programCourseOffering.js` → `base_pc_offering_id`, `has_modifications`, `is_revision_incremented`, self-association `baseOffering`.
2. `composition/server/models/intendedLearningOutcome.js` → `prelim_weight`, `midterm_weight`, `semi_weight`, `final_weight`, `target`.
3. `composition/server/models/topic.js` → `course_id`, `parent_topic_id`, associations to `Course` and `parentTopic`.
4. `composition/server/models/subtopic.js` → `parent_subtopic_id`, association to `parentSubtopic`.
5. `composition/server/models/reference.js` → `parent_reference_id`, association to `parentReference`.
