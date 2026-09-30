# Reference Discovery Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved search-first catalog workbench on the Director of Libraries reference-library route.

**Architecture:** Keep reference persistence and server synchronization unchanged. Add a pure discovery utility for search, facets, pagination, and saved-view validation; then compose those behaviors in the existing page and replace its large stat-card layout with responsive catalog-workbench regions.

**Tech Stack:** React 19, CSS Modules with Sass, React Feather, Node built-in test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-09-08-reference-discovery-workbench-design.md`

## Global Constraints

- Work only inside `composition/client` for this stage.
- Preserve Add Reference, Edit, Archive, Restore, Bulk Upload, server sync, and URL sanitization behavior.
- Do not add a dependency.
- Do not implement duplicate, old-reference, unused-reference, or bulk-correction features in this stage.
- Keep a minimum-width table with horizontal scrolling on compact screens.
- Do not commit or push because the worktree contains unrelated uncommitted user work.

---

### Task 1: Reference discovery model

**Files:**
- Create: `composition/client/src/utils/referenceDiscovery.test.js`
- Create: `composition/client/src/utils/referenceDiscovery.js`

**Interfaces:**
- Consumes: reference records with `id`, `title`, `authors`, `isbn`, `publisher`, `type`, `year`, `departments`, `uploadDate`, and `archived`.
- Produces: `filterReferenceRecords(records, criteria)`, `buildReferenceFacets(records)`, `paginateReferenceRecords(records, page, pageSize)`, `sanitizeSavedViews(value)`, `loadReferenceSavedViews(storage)`, and `storeReferenceSavedViews(storage, views)`.

- [ ] **Step 1: Write failing behavior tests**

```js
test('all-field search matches normalized title, author, ID, ISBN, and publisher', () => {
  assert.deepEqual(filterReferenceRecords(records, { query: 'péarson', searchField: 'all' }).map(r => r.id), ['R-1'])
})

test('combined facets require department, type, year range, and tab to match', () => {
  assert.deepEqual(filterReferenceRecords(records, {
    tab: 'active', department: 'SCIS', type: 'Textbook', yearRange: '2020-2026'
  }).map(r => r.id), ['R-1'])
})

test('facet counts describe the current active or archived source', () => {
  assert.deepEqual(buildReferenceFacets(records.filter(r => !r.archived)).types, [
    { value: 'Textbook', count: 1 },
    { value: 'Online Resources', count: 1 },
  ])
})

test('pagination clamps invalid pages and returns literal boundaries', () => {
  assert.deepEqual(paginateReferenceRecords([1, 2, 3, 4, 5], 9, 2), {
    items: [5], page: 3, pageCount: 3, total: 5, start: 5, end: 5,
  })
})

test('saved views discard malformed records and retain at most ten', () => {
  assert.equal(sanitizeSavedViews(mixedViews).length, 10)
})
```

- [ ] **Step 2: Run the utility test and verify RED**

Run: `node src/utils/referenceDiscovery.test.js`

Expected: FAIL because `referenceDiscovery.js` does not exist.

- [ ] **Step 3: Implement the pure discovery helpers**

Implement normalized token matching, exact facet matching, year buckets (`recent`, `2020s`, `older`, `unknown`), stable sorted facet counts, clamped pagination, and defensive saved-view persistence under `lpsm_reference_saved_views_v1`.

- [ ] **Step 4: Run the utility test and verify GREEN**

Run: `node src/utils/referenceDiscovery.test.js`

Expected: all discovery-model tests pass with zero failures.

### Task 2: Responsive workbench contract

**Files:**
- Modify: `composition/client/src/utils/responsiveContent.test.js`
- Modify: `composition/client/src/styles/ReferenceLibrary.module.scss`

**Interfaces:**
- Consumes: CSS classes rendered by Task 3.
- Produces: desktop `.discoveryLayout`, `.facetRail`, `.resultsPane`, `.previewPane`; compact `.filterDrawer` and `.previewSheet`; scrollable `.tableWrapper`.

- [ ] **Step 1: Replace the obsolete control-layout assertions with failing workbench assertions**

```js
test('reference discovery workbench becomes drawers and sheets on compact screens', () => {
  const css = read('styles/ReferenceLibrary.module.scss')
  assert.match(css, /\.discoveryLayout\s*\{[\s\S]*grid-template-columns:/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.filterDrawer/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.previewSheet/)
  assert.match(css, /\.tableWrapper\s*\{[\s\S]*overflow-x:\s*auto/)
})
```

- [ ] **Step 2: Run the responsive test and verify RED**

Run: `node src/utils/responsiveContent.test.js`

Expected: FAIL because the workbench classes do not exist.

- [ ] **Step 3: Add desktop and compact workbench styles**

Replace the stat-card/control-grid rules with the approved hierarchy. Give the result table a `min-width` of `760px`, keep row height compact, and prevent the preview from reducing the result pane below its usable width.

- [ ] **Step 4: Run the responsive test and verify GREEN**

Run: `node src/utils/responsiveContent.test.js`

Expected: all responsive tests pass.

### Task 3: Reference Discovery Workbench page

**Files:**
- Modify: `composition/client/src/pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx`

**Interfaces:**
- Consumes: Task 1 discovery helpers and Task 2 CSS classes.
- Produces: searchable and filterable page UI, saved-view interaction, paginated results, and record preview.

- [ ] **Step 1: Add a failing source-contract test for the workbench structure**

Add assertions to `responsiveContent.test.js` that require accessible search, filter drawer, saved-view controls, paginated rendering, and preview panel class hooks in `ReferenceLibrary.jsx`.

- [ ] **Step 2: Run the responsive test and verify RED**

Run: `node src/utils/responsiveContent.test.js`

Expected: FAIL because the existing page still renders stat cards and two select filters.

- [ ] **Step 3: Compose discovery state and derived results**

Import Task 1 helpers. Add search, field, year, page, drawer, and saved-view state. Derive source records, facets, filtered records, sorted records, and the current page with `useMemo`. Reset page to 1 when the discovery criteria changes.

- [ ] **Step 4: Replace the page header and controls**

Render the title/subtitle, Add Reference and existing Bulk Upload buttons, field-specific search form, built-in chips, saved-view chips, inline saved-view naming form, result count, sort selector, and reset action.

- [ ] **Step 5: Replace stat cards with facets and paginated results**

Render department, type, year, and status facets as buttons with `aria-pressed`. Render only `pageResult.items`. Keep sortable headers and keyboard-selectable rows.

- [ ] **Step 6: Convert the view modal into the preview pane/sheet**

Reuse the current sanitized metadata content. Keep Edit, Archive, and Restore actions. Close on Escape and return focus to the selected row where possible.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```powershell
node src/utils/referenceDiscovery.test.js
node src/utils/responsiveContent.test.js
node src/utils/tableSort.test.js
```

Expected: all focused tests pass.

### Task 4: Full verification and visual QA

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: evidence that the page builds and remains usable at desktop and compact widths.

- [ ] **Step 1: Run all client utility tests**

Run: `Get-ChildItem src/utils/*.test.js | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }`

Expected: every test exits 0.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit 0 with no lint errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit 0 and Vite emits `dist` assets.

- [ ] **Step 4: Verify in the browser**

Open `/role/director-of-libraries/reference-library`, verify search, each facet, saved view create/apply/delete, sorting, pagination, preview, edit, archive/restore, and reset. Repeat at approximately 390px width and confirm the drawer, preview sheet, and horizontal scrollbar are usable without overlapping text.

- [ ] **Step 5: Review the scoped diff**

Run: `git diff -- composition/client/src/pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx composition/client/src/styles/ReferenceLibrary.module.scss composition/client/src/utils/referenceDiscovery.js composition/client/src/utils/referenceDiscovery.test.js composition/client/src/utils/responsiveContent.test.js`

Expected: only the approved improvement-1 work appears in the scoped diff.

