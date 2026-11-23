# 03 — Session Changelog, Technical Context & QA Summary

> **Session Date:** 2026-11-23  
> **Git Branch:** `feature/learning-plan-composition`  
> **Defense Checklist Items Completed:** `COMP-004`, `COMP-006`, `COMP-010`, `COMP-011` (marked `[x]` in [`composition/defense-updates/TODO_DEFENSE_UPDATES.md`](../defense-updates/TODO_DEFENSE_UPDATES.md))

---

## 1. Chronological Narrative of What Happened in This Session

### Phase 1 — Version Integrity, Instance Isolation & Database Architecture
- Analyzed the current database schema and controllers (`revisionController.js`, `topicController.js`, `tlaController.js`, `referenceController.js`, `iloReferenceController.js`, `courseCriteriaController.js`, `courseDetailsController.js`, `courseOutcomeAlignmentController.js`, `submissionController.js`) against real-world multi-term course re-assignment requirements.
- Identified four structural gaps:
  1. No `base_pc_offering_id`, `has_modifications`, or `is_revision_incremented` columns on `ProgramCourseOfferings` to isolate new term drafts from approved versions and defer `revision_number` increment until final Dean approval.
  2. In-place mutations on `Topics` and `References` could silently alter historical approved learning plans when an instructor imported and modified a shared topic or reference.
  3. Uncontrolled cloning would create duplicate topic/reference titles across historical revisions in import pickers.
  4. `CriteriaForGrading` relied on `TLAAssessments`, which would break on blank-slate drafts where weekly TLAs start empty.
- Created migration [`20260530000000-add-version-handling-and-cow-support.js`](../server/migrations/20260530000000-add-version-handling-and-cow-support.js) adding 12 columns across 5 tables (`ProgramCourseOfferings`, `IntendedLearningOutcomes`, `Topics`, `Subtopics`, `References`), and updated all 5 Sequelize models.
- Created centralized versioning utility [`composition/server/utils/versionHelper.js`](../server/utils/versionHelper.js) providing:
  - `computeAssignmentStatus(assignment)`
  - `formatTermFromDate(dateAssigned)`
  - `findOfferingByPcIdAndRev(pcId, revNum, options)`
  - `markOfferingModified(pcOfferingId, transaction)`
  - `evaluateAndIncrementRevisionOnApproval(pcOfferingId, transaction)`
  - `resolveWeekLineageContext(weekId)`
- Implemented Copy-on-Write (CoW) and canonical title deduplication in:
  - [`topicController.js`](../server/controllers/topicController.js) (`assignTopicsToILO`, `getAvailableTopics`, `getPreviousTopics`)
  - [`referenceController.js`](../server/controllers/referenceController.js) (`getAllReferences`, `updateReference`)
- Wired `markOfferingModified()` across all 6 composition editing controllers (`courseDetailsController.js`, `courseOutcomeAlignmentController.js`, `topicController.js`, `tlaController.js`, `iloReferenceController.js`, `courseCriteriaController.js`).
- Updated [`courseCriteriaController.js`](../server/controllers/courseCriteriaController.js) to read/write COAEP grading weights (`prelim_weight`, `midterm_weight`, `semi_weight`, `final_weight`, `target`) directly on `IntendedLearningOutcomes` (with fallback to `base_pc_offering_id`) so Criteria for Grading stays populated even when weekly TLAs start blank.
- Updated [`revisionController.js`](../server/controllers/revisionController.js), [`Revisions.jsx`](../client/src/components/Revisions.jsx), and [`SyllabusSections.jsx`](../client/src/components/SyllabusSections.jsx) to key revisions uniquely by `pc_offering_id` (allowing an Approved Rev 1 and a Draft Rev 1 to coexist cleanly in the timeline) and evaluate deferred revision increment on Dean approval.

### Phase 2 — Defense Checklist Items (`COMP-004`, `COMP-006`, `COMP-011`)
- **`COMP-004` (Blank-Slate New Term Drafts):**
  - Ensured new term drafts keep Course Details, CO–PO Alignments, COs, ILOs, Weeks, and Criteria for Grading populated from the COAEP, while weekly Topics/Subtopics, TLAs/Assessments, and Weekly References start completely blank.
  - Updated [`iloController.js`](../server/controllers/iloController.js) and [`SyllabusSections.jsx`](../client/src/components/SyllabusSections.jsx) accordingly.
- **`COMP-006` (Opt-In Import Previous Topics & Subtopics):**
  - Added backend endpoint `GET /api/topics/previous/:weekId` ([`topics.js`](../server/routes/topics.js) → [`topicController.js`](../server/controllers/topicController.js)) returning matching-week topics and deduplicated all-course previous topics with week/term/revision metadata.
  - Built the **Import Topics from Previous Revision** modal in [`TopicSelector.jsx`](../client/src/components/TopicSelector.jsx) allowing instructors to selectively check topics and individual subtopics to import without mutating historical plans.
- **`COMP-011` (Opt-In Load Previous TLAs, Assessments & Select Previous References):**
  - Added backend endpoints:
    - `GET /api/tlas/previous/:weekId` ([`tlaRoutes.js`](../server/routes/tlaRoutes.js) → [`tlaController.js`](../server/controllers/tlaController.js)) with automatic positional `ilo_id` remapping from the prior offering's ILOs onto the current offering's ILOs.
    - `GET /api/ilo-references/previous/:weekId` ([`iloReferences.js`](../server/routes/iloReferences.js) → [`iloReferenceController.js`](../server/controllers/iloReferenceController.js)).
  - Added opt-in previous-revision controls in [`TLAForm.jsx`](../client/src/pages/TLAForm.jsx), [`ReferenceForm.jsx`](../client/src/pages/ReferenceForm.jsx), and [`ReferencePicker.jsx`](../client/src/components/ReferencePicker.jsx).

### Phase 3 — Foundation Seeder Alignment
- Updated [`composition/server/seeders/20260512030000-seed-composition-foundation.js`](../server/seeders/20260512030000-seed-composition-foundation.js) so that `BIT313L` demonstrates the full multi-instance versioning model while preserving exact per-offering record counts:
  - **Instance 1 (`pc_offering_id = 1`, Approved Historical Rev 1):** `32` Topics (with `course_id`), `96` Subtopics, `96` TLAs, `48` TLAAssessments, `28` References, `32` WeeklyReferences, plus COAEP grading weights on ILOs.
  - **Instance 2 (`pc_offering_id = 2`, Active Blank-Slate Draft Rev 1):** `base_pc_offering_id = 1`, `has_modifications = false`, `is_revision_incremented = false`, cloned COAEP Course Details, CO–PO Alignments, COs, ILOs (with weights/target), and Weeks (17–32), with `0` preloaded Subtopics/TLAs/WeeklyReferences.

### Phase 4 — Restoring "Continue Previous Topic" & Chronological Save Hardening
- Investigated why **"Continue Previous Topic"** appeared missing on blank-slate drafts:
  - Discovered the button was already in position `#1` in [`TopicSelector.jsx`](../client/src/components/TopicSelector.jsx), but `canContinueTopic` required `(previousWeekTopics || []).length > 0`—which hid the entire button on blank-slate offerings where Week `N-1` hadn't been filled yet.
  - Updated `canContinueTopic` to `!isOrientation && Number(weekIndexInCo) >= 1` so it stays hidden on Course Orientation and the 1st week of each CO, and displays on Weeks 2–4 of each CO (showing previous week's topics or the empty-state helper).
- Hardened backend & frontend continuation mechanics:
  - Scoped `getAssignedTopics` in [`topicController.js`](../server/controllers/topicController.js) so `isContinuation` checks only earlier weeks within the **same Course Outcome (`co_id`) and current offering**.
  - Updated `executeGlobalSave` in [`TopicForm.jsx`](../client/src/pages/TopicForm.jsx) to skip unmodified weeks and save modified cached weeks in strict chronological ascending `week_id` order around the active week, guaranteeing Week `N-1` always persists before Week `N` when continuing an unsaved custom topic.

### Phase 5 — Strict Course Scoping & Matching-Week Ranking *(Search Bar UI Later Superseded in Phase 8)*
- **Strict Course Scoping & Matching-Week Prioritization in `GET /api/topics/available` (Retained on Backend):**
  - Updated `getAvailableTopics` in [`topicController.js`](../server/controllers/topicController.js) so it **never** falls back to an unfiltered `{}` query (returns `[]` for brand-new courses with no topics yet, preventing topics from other courses from leaking across courses), and separates Course Orientation topics from regular weekly topics.
  - Identified the **matching week of the latest previous revision** (`lineage.priorOfferings[0]`) and tagged those topics with `isPrevMatchingWeek: true`, `prevRevisionNumber`, and `prevTermLabel`, returning them **first** in their original week order with their matching-week subtopics, followed by all remaining deduplicated topics for that course alphabetically.
- **Intermediate Search Bar Dropdown *(Superseded in Phase 8)*:** Temporarily consolidated previous topic importing into a two-section search bar dropdown in `TopicSelector.jsx` (later replaced by the unified 3-column `ImportPreviousModal.jsx` in Phase 8).

### Phase 6 — Fixing Previous TLA/Reference Endpoints & Removing TLA AI Suggest *(Per-Picker Import Buttons Later Superseded in Phase 8)*
- **Removed AI Suggest from TLAs Completely (Retained):**
  - Deleted `AiTlaSuggestModal.jsx`, removed the `AI Suggest` button, state, handler, and props from [`TLAForm.jsx`](../client/src/pages/TLAForm.jsx) and [`TopicForm.jsx`](../client/src/pages/TopicForm.jsx), and removed `POST /api/tlas/ai-suggest` and `suggestTlasWithAI` from [`tlaRoutes.js`](../server/routes/tlaRoutes.js) and [`tlaController.js`](../server/controllers/tlaController.js).
- **Previous TLA & Reference Endpoint Fixes (Retained on Backend):**
  - Fixed `TLAForm` mapping (`res.tlas`, `sourceTlaId`, `Instructor`/`Student` normalization) and trimmed `sourceOffering` in `GET /api/ilo-references/previous/:iloId` to lightweight revision metadata (`pc_offering_id`, `revision_number`, `termLabel`, `status`).
  - Added per-tab selected count badges (`Textbook`, `OER`, `Online`) in [`ReferencePicker.jsx`](../client/src/components/ReferencePicker.jsx). *(The standalone `Select Previous` button and banner were later superseded by the consolidated 3-column `ImportPreviousModal.jsx` in Phase 8.)*

### Phase 7 — `COMP-010` Context Alignment, First-Card Empty Prompts & `GET /api/tlas/available` *(Sidebar & Search Bars Later Superseded in Phase 8)*
- **Course-Scoped TLA Endpoint `GET /api/tlas/available` (Retained on Backend):**
  - Added `GET /api/tlas/available` in [`tlaRoutes.js`](../server/routes/tlaRoutes.js) and [`tlaController.js`](../server/controllers/tlaController.js) mirroring `GET /api/topics/available`: strictly course-scoped and orientation-isolated, prioritizing the latest previous revision's matching-week TLAs with automatic `assessmentIloId` remapping via `buildPriorToCurrentIloMap`.
- **First-Card Empty Prompts & Unified Header Height (Retained):**
  - Standardized `56px` minimum header height and replaced blank ghost boxes / text banners in `TopicSelector` and `TLAForm` with centered empty-state prompt cards (`.emptyPromptCard`) rendered inside the **first** dashed grid card when `0` items exist.
- **Intermediate Read-Only Sidebar & Search Bar `Reuse Previous` *(Superseded in Phase 8)*:** Temporarily added `WeeklyTopicsSidebar.jsx` and inline `Reuse Previous` search bar toggles; both were removed in Phase 8 once all 3 columns (`Topics`, `TLAs`, `References`) became directly visible side-by-side with a single consolidated `Import Previous` modal.

### Phase 8 — 3-Column Pinned Weekly Content Planner, Responsive `FormNavigation` & `ReferencePicker`, Consolidated 3-Column `Import Previous` Modal, and 3-Column `Validation Notice` Modal
- **3-Column Multi-Pin Weekly Content Planner (`TopicForm.jsx`, `FormNavigation.jsx`, `Form.module.sass`, `FormNavigation.module.sass`):**
  - Replaced single-tab content switching in [`TopicForm.jsx`](../client/src/pages/TopicForm.jsx) and [`FormNavigation.jsx`](../client/src/components/FormNavigation.jsx) with a **3-column pin-toggle layout** (`pinnedSteps: [true, true, true]` by default for `Topics`, `TLAs`, and `References`), fulfilling `COMP-010` directly without needing a separate read-only topics sidebar.
  - Added a top-right pin corner badge (`.pinCornerBadge` with `<PushPinIcon />`) to each active/pinned content button in [`FormNavigation.jsx`](../client/src/components/FormNavigation.jsx). Clicking a pinned content button unpins/hides its column (while guarding against unpinning the last remaining visible column); clicking an unpinned content button pins/shows it again.
  - Rendered all three forms (`TopicSubForm`, `TLAForm`, `ReferenceForm`) side-by-side inside `.threeColPlannerGrid` (`.plannerColumn`), dynamically adapting between `1`, `2`, or `3` columns, and deleted the superseded `WeeklyTopicsSidebar.jsx` and `WeeklyTopicsSidebar.module.sass`.
  - Added step switcher tabs (`.feedbackStepTabs`) inside the `returned` status `Review Feedback` drawer so instructors can inspect `Topics`, `TLAs`, or `References` reviewer remarks when multiple columns are pinned simultaneously.
- **Responsive 2-Row `FormNavigation` (`FormNavigation.jsx`, `FormNavigation.module.sass`):**
  - Eliminated intersection/overlap between the left CO-week strip and right content controls when viewport width decreases (`@media (max-width: 1240px)`):
    - **Row 1:** CO switcher + Week buttons (`.calendarSection`).
    - **Row 2:** Pinned content buttons (`Topics`, `TLAs`, `References`) on the left, plus `Import Previous` and inline `Save` grouped on the right (`.mobileActionCluster`).
- **Removal of Per-Picker Search Bars & Full Narrow-Column Responsiveness of `ReferencePicker`:**
  - Removed all individual search bars and per-picker load/select-previous buttons from [`TopicSelector.jsx`](../client/src/components/TopicSelector.jsx), [`TLAForm.jsx`](../client/src/pages/TLAForm.jsx), and [`ReferencePicker.jsx`](../client/src/components/ReferencePicker.jsx).
  - Refactored `.header`, `.filterTabs`, `.row`, `.rowMain`, `.details`, and `.rowActions` in [`ReferencePicker.module.sass`](../client/src/styles/ReferencePicker.module.sass) with `min-width: 0`, `flex-wrap: wrap`, and `word-break: break-word` so reference titles, authors, metadata, and `View` / `Edit` / `Deprecated` actions remain 100% readable and clickable without clipping even in 3-column mode.
- **Consolidated 3-Column `Import Previous` Select-Mode Modal (`ImportPreviousModal.jsx`, `ImportPreviousModal.module.sass`):**
  - Created [`ImportPreviousModal.jsx`](../client/src/components/ImportPreviousModal.jsx) and [`ImportPreviousModal.module.sass`](../client/src/styles/ImportPreviousModal.module.sass): a minimalist **3-column select-mode popup modal** (`Topics`, `Teaching & Learning Activities`, `References`) fetching strictly the **previous term/revision's matching week contents** (`GET /api/topics/previous/:weekId`, `GET /api/tlas/previous/:weekId`, `GET /api/ilo-references/previous/:weekId`), supporting per-item checkboxes, per-column `Select All`, global `Select All Available`, duplicate detection (`Added` badge), and single-click batch import across all 3 columns (`importPreviousTopics`, `importPreviousTlas`, `importPreviousReferences`).
- **3-Column `Validation Notice` Modal on Save (`TopicForm.jsx`, `Form.module.sass`):**
  - Upgraded the `Validation Notice` modal triggered by `Save` in [`TopicForm.jsx`](../client/src/pages/TopicForm.jsx) into a **3-column layout** (`Topics`, `Teaching & Learning Activities`, `References`) separated by vertical dividers (`.wideModal`, `.validationThreeColGrid`, `.validationCol`), displaying either specific validation issues or a green `Ready` status per column.

### Phase 9 — 3-Column Weekly Planner UI Polish & Behavioral Fixes
- **Unified `440px` Topic & TLA Block Heights (`TopicSelector.module.sass`, `Form.module.sass`):**
  - Standardized `.topicCard`, `.placeholderCard`, `.emptyPromptCard`, `.tlaCardCopycat`, and `.tlaPlaceholderScale` to an exact `height: 440px` (`box-sizing: border-box`) so empty grids and populated cards align vertically between the `Topics` and `TLAs` columns.
- **Consistent Action Button Ordering (`TopicSelector.jsx`):**
  - Reordered `Topics` header controls to `Continue Prev` → `AI Suggest` → `Add Topic` (far right), aligning all primary blue `+ Add ...` buttons on the right edge across all 3 columns.
- **Matching `References` Header Title/Badge & Distinct Filter Tab Styling (`ReferencePicker.jsx`, `ReferencePicker.module.sass`):**
  - Added `.headerTitleGroup` (`Bookmark` icon, `References` title, and total selected count badge) on the left of the `References` header to match `Topics` and `Teaching & Learning Activities`.
  - Centered the segmented `.filterTabs` (`Textbook`, `OER`, `Online`) in the middle and styled `.activeTab` in dark slate (`#1E293B` fill, `#FFFFFF` text, `#0F172A` border) so it no longer collides visually with the `#3182CE` blue `Add Reference` button.
- **Dynamic 2-Column Grid When Single Content Column Is Pinned (`TopicForm.jsx`, `TopicSelector.jsx`, `TLAForm.jsx`, `TopicSelector.module.sass`):**
  - Passed `isSingleColumn={pinnedSteps.filter(Boolean).length === 1}` from `TopicForm.jsx` to `TopicSelector.jsx` and `TLAForm.jsx`, applying `.configAreaTwoCol` (`grid-template-columns: repeat(2, minmax(0, 1fr))` with automatic 1-column fallback below `820px`) when only 1 content column is pinned, and 1 item per row when 2 or 3 columns are pinned.
- **Smart Scroll-Only-When-Full & Unified Card Entry Animation (`TopicSelector.jsx`, `TLAForm.jsx`, `TopicSelector.module.sass`):**
  - Replaced blind scroll-to-bottom behavior with `scrollCardIntoViewIfNeeded(cardId)` (using `data-card-id`) in both `TopicSelector.jsx` and `TLAForm.jsx`, fixing the unwanted scroll jump when adding a new TLA while space remains visible; now scrolls smoothly only when the container is full and the newly added card extends outside the viewport.
  - Refined the shared `.newEntry` (`slideInHighlight`) animation so newly added Topic and TLA cards animate identically.
- **`Import Previous` Relocated Outside Pin Bar Beside `Save` (`FormNavigation.jsx`, `FormNavigation.module.sass`):**
  - Moved the **`Import Previous`** button out of `.plannerBar` into `.rightActionsGroup` directly beside **`Save`** on desktop (and into `.mobileActionCluster` beside the inline `Save` button at `<= 1240px`), styled with a distinct soft emerald palette (`#ECFDF5` background, `#065F46` text, `#6EE7B7` border) that clearly separates it from the blue-bordered content pin toggles.

### Phase 10 — `ReferencePicker` Card Parity, Height-Driven Empty Grid & Textbook Title Alignment
- **Card-Style Reference Blocks Matching Topics & TLAs (`ReferencePicker.module.sass`):**
  - Converted edge-to-edge reference list rows into distinct `8px`-radius card blocks (`.row` with `1px solid #E2E8F0` border, `#ffffff` fill, `min-height: 82px`, and `#EBF8FF` / `#93C5FD` selected highlight) inside a `#fdfdfd` padded container (`.list` with `padding: 12px`, `gap: 12px`) matching `.configArea` and `.topicCard` / `.tlaCardCopycat`.
- **Dynamic Height-Driven Empty Prompt & Ghost Grid Cards (`ReferencePicker.jsx`, `ReferencePicker.module.sass`):**
  - Attached a `ResizeObserver` (with window `resize` fallback) to `listRef` so `ghostPlaceholderCount` dynamically calculates how many dashed `82px` `.placeholderCard` skeleton blocks fit the visible height of the `ReferencePicker` container without creating unwanted overflow.
  - Replaced the plain text empty notice with a centered `.emptyPromptCard` (`176px` tall, matching 2 reference slots) when a category has `0` references, followed by dynamic ghost cards filling the remaining container height.
- **Aligned Textbook Titles With or Without `Deprecated` Tag (`ReferencePicker.jsx`, `ReferencePicker.module.sass`):**
  - Reserved a fixed `90px` right-hand tag slot (`.textbookTagSlot`) on all Textbook rows (`.textbookRow`, `flex-wrap: nowrap`) and capped Textbook titles with `.textbookTitle` (`max-width: min(100%, 46ch)`) so Textbook titles align vertically at the same right boundary whether or not a `Deprecated` badge is present.

---

## 2. QA Verification Summary

### Suite A — Versioning, Copy-on-Write, Blank Slate & Deferred Increment (6/6 Passed)
- Verified clean migration execution (`db:migrate`) and clean seeding (`db:seed:undo:all` + `db:seed:all`).
- Verified exact seeded counts on Instance 1 (`32` Topics, `96` Subtopics, `96` TLAs, `48` TLAAssessments, `28` References, `32` WeeklyReferences) and blank weekly slate on Instance 2 (`0` Subtopics/TLAs/WeeklyReferences while Course Details, CO–PO Alignments, ILOs, and Criteria for Grading remain populated).
- Verified Copy-on-Write isolation for edited Topics and edited References (historical Instance 1 unchanged; forked rows created with `parent_topic_id` / `parent_reference_id`).
- Verified canonical deduplication (reusing unmodified topics creates zero duplicate `Topics` rows).
- Verified deferred revision increment: `revision_number` remained `1` during Draft/Pending/Returned with `has_modifications = true`, incremented to `2` upon `DEAN` approval (`is_revision_incremented = true`), and did not double-increment on re-evaluation.

### Suite B — Continue Previous Topic & Backend Course Scoping / Ranking (Verified)
- Verified `GET /api/topics/available?iloId=17&isOrientation=false` (Offering 2 Week 1) returns **only** BIT313L regular topics (`31` total, zero cross-course or orientation leakage), with the matching Week 1 topic from the latest previous revision (`Rev 1 · 1st Sem SY 2025-2026`, `'Foundations of Interactive Computing and Academic Ethics'`, 3 subtopics) ranked first (`isPrevMatchingWeek: true`), followed by the `30` remaining deduplicated BIT313L topics alphabetically (`isPrevMatchingWeek: false`).
- Verified `GET /api/topics/available?iloId=18&isOrientation=false` (Offering 2 Week 2) ranks the `2` matching Week 2 topics (`'Cognitive Models in HCI'`, `'Human Information Processing and Perceptual Psychology'`) at the top (`isPrevMatchingWeek: true`), followed by the `29` remaining BIT313L topics.
- Verified `GET /api/topics/available?iloId=17&isOrientation=true` returns strictly the Course Orientation topic (`'Course Orientation and VMO Alignment'`, `isPrevMatchingWeek: true`) without leaking regular weekly topics.
- Verified `GET /api/topics/previous/:weekId` returns matching-week previous topics cleanly for `ImportPreviousModal.jsx`.
- Verified saving a custom topic in Offering 2 CO1 Week 1 (`isContinuation: false`) and continuing it in CO1 Week 2 with different subtopics (`isContinuation: true`) reuses the exact same `topic_id` with zero duplicate `Topics` rows and keeps Week 1's subtopics intact.
- Verified CO-boundary isolation (placing the same topic in CO2 Week 1 returns `isContinuation: false`).
- Verified `GET /api/course-coverage/2/1` renders Week 1 and Week 2 subtopics separately under the shared continued Topic.
- Verified historical Instance 1 remained 100% untouched (`96` subtopics preserved), and restored the database to a clean seeded state after testing.

### Suite C — Previous TLAs, TLA AI Suggest Removal, & Previous References Endpoints (Verified)
- Verified `tlaRoutes.js` no longer registers `POST /api/tlas/ai-suggest`, `AiTlaSuggestModal.jsx` is deleted, and zero stale references remain across `composition/client/src` and `composition/server`.
- Verified `GET /api/tlas/previous/17?isOrientation=false` returns `3` previous Week 1 TLAs (`sourceTlaId`, `selectedRevision: Rev 1 · 1st Sem SY 2025-2026`), `weekId=18` returns `6` previous Week 2 TLAs (including both `Instructor` and `Student`), and `isOrientation=true` returns `3` Orientation TLAs.
- Verified `GET /api/ilo-references/previous/17?isOrientation=false` returns `1` OER reference (ID `28`), `isOrientation=true` returns `1` Online reference (ID `27`), and `weekId=18` returns `2` references (`1` Textbook + `1` OER) with compact `sourceOffering` metadata.

### Suite D — Course-Scoped TLA Catalog Endpoint (Verified)
- Verified `GET /api/tlas/available?weekId=17&isOrientation=false` (Offering 2 Week 1) returns `93` course-scoped BIT313L TLAs: `3` matching Week 1 TLAs from `Rev 1` ranked first (`isPrevMatchingWeek: true`) followed by `90` remaining deduplicated course TLAs alphabetically (`isPrevMatchingWeek: false`).
- Verified `GET /api/tlas/available?weekId=18&isOrientation=false` (Offering 2 Week 2) returns `93` TLAs: `6` matching Week 2 TLAs from `Rev 1` ranked first (`isPrevMatchingWeek: true`, including `Objective-Type Quiz` with `assessmentIloId` remapped to Offering 2 ILO `15`) followed by `87` remaining course TLAs.
- Verified `GET /api/tlas/available?weekId=17&isOrientation=true` returns strictly `3` Course Orientation TLAs (`isPrevMatchingWeek: true`, `0` regular weekly leakage).

### Suite E — 3-Column Pinned Weekly Content Planner, Phase 9 UI Polish & Phase 10 `ReferencePicker` Parity Build Verification
- Verified `npm run build` (`vite build`) in `composition/client` succeeds cleanly (`✓ 2491 modules transformed`, `✓ built in 6.82s`) with zero compilation or bundling errors after integrating the 3-column pinned planner, unified `440px` Topic/TLA heights, single-pinned 2-column grid, `References` title/badge + dark-slate tabs, smart scroll-only-when-full, `Import Previous` beside `Save`, and Phase 10 `ReferencePicker` card styling, dynamic height-driven ghost placeholders, and aligned Textbook title widths.


