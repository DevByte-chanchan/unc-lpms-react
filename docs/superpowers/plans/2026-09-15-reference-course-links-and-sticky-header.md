# Reference Course Links and Sticky Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let librarians open every course listed on a reference and keep the result-table column header visible while scrolling.

**Architecture:** Course codes link to the existing Director of Libraries Course Reference Catalog using a URL query parameter. The catalog resolves that parameter against its loaded courses through a pure helper. Sticky positioning remains scoped to the table scroll region.

**Tech Stack:** React 19, React Router, Sass modules, Node test runner.

**Spec:** User request dated September 15, 2026, extending `docs/superpowers/specs/2026-09-08-reference-discovery-workbench-design.md`.

## Global Constraints

- Render a separate link for every course code under `Used in`.
- Navigate within the Director of Libraries module and preserve browser Back behavior.
- Keep the header sticky only within the reference table scroll region.
- Keep “No courses recorded” for empty course lists.

---

### Task 1: Course-target URL and selection

**Files:**
- Modify: `composition/client/src/utils/routes.js`
- Modify: `composition/client/src/utils/routes.test.js`
- Modify: `composition/client/src/utils/referenceCatalog.js`
- Modify: `composition/client/src/utils/referenceCatalog.test.js`

- [x] Write failing tests for an encoded `course` query and requested-course selection.
- [x] Run the focused tests and confirm they fail for missing behavior.
- [x] Implement `routes.courseCatalog(query)` and `selectRequestedCourse(courses, requestedCode)`.
- [x] Re-run the focused tests and confirm they pass.

### Task 2: Linked preview metadata

**Files:**
- Modify: `composition/client/src/pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx`
- Modify: `composition/client/src/pages/lpsm/DirectorOfLibraries/CourseCatalog.jsx`
- Modify: `composition/client/src/styles/ReferenceLibrary.module.scss`

- [x] Render every `usedInCourses` value as an accessible React Router link.
- [x] Read `?course=` in Course Catalog and preselect the matching loaded course.
- [x] Add compact wrapping link styles and a clear focus-visible state.

### Task 3: Sticky table header

**Files:**
- Modify: `composition/client/src/styles/ReferenceLibrary.module.scss`
- Modify: `composition/client/src/utils/responsiveContent.test.js`

- [x] Add a failing compiled-stylesheet assertion for the sticky header row.
- [x] Confirm the focused test fails.
- [x] Pin the header row to the top of `.tableWrapper` with opaque header cells and a suitable stacking order.
- [x] Confirm the focused test passes.

### Task 4: Verification

- [x] Run all client utility tests, lint, and production build.
- [x] Verify course navigation, selected subject, and sticky header behavior in the live page.
