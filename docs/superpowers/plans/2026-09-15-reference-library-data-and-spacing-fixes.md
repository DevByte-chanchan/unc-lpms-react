# Reference Library Data and Spacing Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct Reference Library department metadata and duplicate display rows while making facet choices and pagination controls consistently spaced and sized.

**Architecture:** Extend the library API with program and department names already linked through each course offering. Normalize and consolidate exact bibliographic duplicates in a pure client helper, preserving every database row identifier and unioning course, program, and department metadata rather than deleting records. Keep the visual corrections scoped to the Reference Library stylesheet.

**Tech Stack:** React 19, JavaScript ES modules, Express, Sequelize/SQLite, Sass modules, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-08-reference-discovery-workbench-design.md`, extended by the user's September 15 request for duplicate consolidation and authoritative departments.

## Global Constraints

- Display ten filtered records per page.
- Never delete or mutate duplicate database rows as part of this UI fix.
- Consolidate only records whose normalized title and author both match; ISBN alone is insufficient because the sample data contains conflicting ISBN reuse.
- Preserve all linked course, program, and department values when duplicates are consolidated.
- Keep all changes scoped to the Reference Library and its API payload.

---

### Task 1: Reference-row normalization and consolidation

**Files:**
- Modify: `composition/client/src/utils/referenceDiscovery.js`
- Modify: `composition/client/src/utils/referenceDiscovery.test.js`

**Interfaces:**
- Consumes: raw `/api/references/library` rows with comma-delimited `used_in_courses`, `programs`, and `departments`.
- Produces: `normalizeReferenceLibraryRows(rows, existingRecords)` returning display records with unioned metadata and `sourceIds`.

- [x] **Step 1: Write failing behavior tests**

Add literal fixtures proving that exact normalized title/author duplicates become one display record, that different titles sharing an ISBN remain separate, that every linked course/program/department is retained, and that authoritative departments replace a General Education fallback.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test src/utils/referenceDiscovery.test.js`

Expected: FAIL because `normalizeReferenceLibraryRows` is not exported.

- [x] **Step 3: Implement the minimal pure helper**

Normalize server fields, split comma-delimited metadata, group by normalized title plus author, retain the lowest numeric reference ID as the canonical row, union `sourceIds`, `usedInCourses`, `programs`, and `departments`, and retain local flags from any matching server ID.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --test src/utils/referenceDiscovery.test.js`

Expected: PASS.

### Task 2: Authoritative API metadata and page synchronization

**Files:**
- Modify: `composition/server/controllers/referenceController.js`
- Modify: `composition/server/utils/referenceLibraryRows.test.js`
- Modify: `composition/client/src/pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx`

**Interfaces:**
- Consumes: the database relations `ProgramCourseOfferings.program_id` and `ProgramCourseOfferings.dept_id`.
- Produces: API fields `programs` and `departments`; the page consumes them through `normalizeReferenceLibraryRows`.

- [x] **Step 1: Write a failing controller behavior test**

Invoke `getReferenceLibrary` against the sample database with a minimal response recorder and assert that `BIT213L` references carry `Bachelor of Science in Information Technology` and `School of Computer and Information Sciences`.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test utils/referenceLibraryRows.test.js`

Expected: FAIL because the API currently returns course codes only.

- [x] **Step 3: Extend the query and use the pure normalizer in the page**

Join `Programs` and `Departments`, aggregate distinct names, replace prefix guessing in the page synchronization path with `normalizeReferenceLibraryRows`, and leave locally added records unchanged.

- [x] **Step 4: Run both focused suites and verify GREEN**

Run: `node --test utils/referenceLibraryRows.test.js` and `node --test src/utils/referenceDiscovery.test.js`.

Expected: PASS.

### Task 3: Consistent facets and square pagination controls

**Files:**
- Modify: `composition/client/src/styles/ReferenceLibrary.module.scss`
- Modify: `composition/client/src/utils/responsiveContent.test.js`

**Interfaces:**
- Consumes: existing `.facetGroup`, `.facetOption`, `.paginationBtn`, and React Feather SVG markup.
- Produces: four-pixel gaps between every facet option and fixed 36-by-36 pagination buttons with visible 16-by-16 chevrons.

- [x] **Step 1: Add failing compiled-stylesheet assertions**

Assert the shared facet group is a four-pixel-gap column and the pagination button resets global padding, fixes min/max dimensions, prevents flex shrinking, and fixes nested SVG dimensions.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test src/utils/responsiveContent.test.js`

Expected: FAIL because only `.recordStatusGroup` has a gap and global button padding still overrides the pagination controls.

- [x] **Step 3: Implement the scoped Sass rules**

Move the column gap to `.facetGroup`; remove the layout-only status exception; set pagination width, min-width, max-width, height, min-height, max-height, padding, box sizing, and flex basis; protect the nested SVG size.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --test src/utils/responsiveContent.test.js`

Expected: PASS.

### Task 4: Full and visual verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed tasks 1–3.
- Produces: evidence that the fixes work without regressions.

- [x] **Step 1: Run all utility tests**

Run: `node --test src/utils/*.test.js` from `composition/client` and `node --test utils/referenceLibraryRows.test.js` from `composition/server`.

- [x] **Step 2: Run lint and production build**

Run: `npm run lint` and `npm run build` from `composition/client`.

- [x] **Step 3: Verify the live page**

At `/role/director-of-libraries/reference-library`, confirm multiple department facets reflect server data, exact duplicates appear once while their Used in courses value contains every linked course, every facet option has equal vertical spacing, and both pagination controls are square with visible chevrons.
