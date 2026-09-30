# Program Head Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Program Head alignment pages use the syllabus as their source of truth and replace manual COAEP upload with a generated read-only view.

**Architecture:** The existing authenticated COAEP endpoint remains the source of generated CO/ILO/assessment rows. The client converts that payload to a display/export record; CO–PO becomes review-only, while PO–PEO retains program-scoped master-data editing.

**Tech Stack:** React 19, Vite, react-feather, Node built-in test runner, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-13-program-head-alignment-design.md`

## Global Constraints

- Preserve existing unrelated worktree changes.
- Do not add unstructured COAEP upload, replace, or delete behavior.
- Keep COAEP dependent on authenticated `/api/coaep/:courseCode` syllabus data.
- Do not modify the existing database schema or approval chain in this change.

---

### Task 1: Generated COAEP record helper

**Files:**
- Create: `composition/client/src/utils/generatedCoaepRecord.js`
- Test: `composition/client/src/utils/generatedCoaepRecord.test.js`

**Interfaces:**
- Consumes: endpoint payload `{ course: { code, title }, cos: Array }`, selected course metadata, and generated-at date.
- Produces: `buildGeneratedCoaepRecord({ courseCode, courseName, programCode, payload, generatedAt })` returning a COAEP export record or `null` for no COs.

- [ ] **Step 1: Write a failing test for a populated generated record.**
- [ ] **Step 2: Run `node --test src/utils/generatedCoaepRecord.test.js` and confirm failure because the helper is missing.**
- [ ] **Step 3: Implement the helper with a generated-from-approved-syllabus header and a default performance target.**
- [ ] **Step 4: Re-run `node --test src/utils/generatedCoaepRecord.test.js` and confirm pass.**

### Task 2: Replace manual COAEP workflow

**Files:**
- Modify: `composition/client/src/pages/lpsm/ProgramHead/COAEPUpload.jsx`
- Test: `composition/client/src/utils/generatedCoaepRecord.test.js`

**Interfaces:**
- Consumes: `buildGeneratedCoaepRecord` and the existing `/api/coaep/:courseCode` response.
- Produces: read-only generated COAEP table, preview, and export actions.

- [ ] **Step 1: Remove manual upload-form state, local COAEP persistence, and upload/replace/delete controls.**
- [ ] **Step 2: Render only the record generated from the endpoint payload and identify the approved-syllabus source.**
- [ ] **Step 3: Rename the preview action to `View Generated COAEP` and retain export through the existing modal.**
- [ ] **Step 4: Update the empty state to explain that a composed, approved syllabus is required.**
- [ ] **Step 5: Run `npm run lint` and `npm run build`.**

### Task 3: Make CO–PO a Program Head review surface

**Files:**
- Modify: `composition/client/src/pages/lpsm/ProgramHead/CoPoAlignment.jsx`

**Interfaces:**
- Consumes: current program/course alignment data.
- Produces: read-only alignment matrix and export preview.

- [ ] **Step 1: Remove in-place alignment mutation and local-save behavior from the Program Head page.**
- [ ] **Step 2: Replace `Edit Alignment` with clear review-source copy indicating that changes belong in syllabus revision.**
- [ ] **Step 3: Keep course selection and `View` export available.**
- [ ] **Step 4: Run `npm run lint` and `npm run build`.**

### Task 4: Scope PO–PEO data by program

**Files:**
- Modify: `composition/client/src/pages/lpsm/ProgramHead/PoPeoAlignment.jsx`

**Interfaces:**
- Consumes: `getAllPrograms`, `getProgramName`, `getPoPeoData`, and `savePoPeoData`.
- Produces: PO–PEO editor restricted to the selected program.

- [ ] **Step 1: Add a program selector to the toolbar.**
- [ ] **Step 2: Disable program switching while an edit is open to prevent unsaved changes crossing programs.**
- [ ] **Step 3: Keep the existing explicit edit/save/cancel behavior scoped to the selected program.**
- [ ] **Step 4: Run `npm run lint` and `npm run build`.**

### Task 5: Browser verification

**Files:**
- Modify: none

- [ ] **Step 1: Inspect COAEP in the running app and verify manual upload/replace/delete controls are absent.**
- [ ] **Step 2: Inspect CO–PO and verify it is read-only with the revision guidance visible.**
- [ ] **Step 3: Inspect PO–PEO and verify changing the program changes the matrix context.**
