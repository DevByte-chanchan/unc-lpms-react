# Responsive LPSM UI and Reference Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every retained LPSM route readable and operable from a 360px-wide phone through desktop widths, while removing `ALL REFERENCES` and defaulting the shared References Summary to `TEXTBOOKS`.

**Architecture:** Repair the two shared application shells first, then put every dense table behind one accessible horizontal-scroll boundary. Keep page behavior in existing React components and place responsive behavior in their CSS/Sass modules; only extract small layout primitives where the same contract is repeated. Replace the approval workspace's inline dimensions with named classes so CSS can switch it from a desktop split view to a compact vertical reading order.

**Tech Stack:** React 19, React Router 7, Vite 7, CSS Modules, Sass/SCSS, Node's built-in test runner, in-app browser visual verification.

## Global Constraints

- Edit only the active `composition` application and its design/test documentation.
- Support `Wide: above 1024px`, `Compact: 721px–1024px`, and `Mobile: 360px–720px`.
- Keep semantic tables; dense learning-plan matrices scroll horizontally inside labelled regions instead of becoming cards.
- Keep body-level horizontal overflow closed while ensuring the shell content region remains vertically reachable.
- Preserve all authentication, comments, approval, API, database, and stored-reference behavior.
- Do not implement the separate server-backed sample-course data specification in this change set.
- Do not add a frontend dependency or a new responsive JavaScript state system; viewport layout is CSS-driven.
- Preserve unrelated working-tree changes. Before every commit, inspect `git diff` and use `git add -p` for already-modified tracked files.
- Use the exact acceptance viewports `1440×900`, `1024×768`, `740×1000`, `390×844`, and `360×640`.

---

## File Structure and Responsibilities

### New files

- `composition/client/src/components/TableScrollRegion.jsx` — accessible, reusable owner for horizontal table scrolling.
- `composition/client/src/styles/TableScrollRegion.module.sass` — scroll containment and minimum table-canvas width.
- `composition/client/src/styles/AddReferenceModal.module.sass` — viewport-bounded add/edit Reference dialog layout.
- `composition/client/src/styles/PDFViewerModal.module.sass` — responsive PDF preview chrome and content columns.
- `composition/client/src/styles/CommentRecorder.module.sass` — responsive standalone comment-recorder page.
- `composition/client/src/styles/ProgramHeadWorkspace.module.sass` — shared responsive toolbar/dialog layout for COAEP, CO–PO, and PO–PEO screens.
- `composition/client/src/styles/ApprovalSyllabus.module.sass` — sizing boundary between `Skeleton` and the approval workspace.
- `composition/client/src/utils/referenceSummaryUi.test.js` — Reference dropdown source contract.
- `composition/client/src/utils/responsiveShell.test.js` — shell, navigation, and header source contract.
- `composition/client/src/utils/tableScrollRegion.test.js` — table-region component and consumer coverage contract.
- `composition/client/src/utils/responsiveContent.test.js` — forms, dialogs, approval workspace, and role-page responsive contract.

### Existing shared files

- `composition/client/src/layouts/Skeleton.jsx` and `SkeletonA.jsx` — stable full-viewport shell structure.
- `composition/client/src/styles/Skeleton.module.sass` and `SkeletonA.module.sass` — shell shrinking, scrolling, and compact navigation widths.
- `composition/client/src/components/SideNavigation.jsx` and `styles/SideNavigation.module.sass` — fixed compact rail and accessible icon labels.
- `composition/client/src/components/Header.jsx`, `HeaderA.jsx`, `styles/Header.module.sass`, and `HeaderA.module.sass` — wrapping signed-in identity and sign-out action.
- `composition/client/src/index.css` — root sizing and shared filter/control wrapping safeguards.
- `composition/client/src/styles/CoursesTable.module.sass` — course-list header, filters, popover, and table rail behavior.
- `composition/client/src/styles/Form.module.sass`, `Fields.module.sass`, and `FormNavigation.module.sass` — shared form, checklist, field-grid, and modal rules.
- `composition/client/src/styles/SyllabusSections.module.sass`, `SyllabusPreview.module.sass`, and `Revisions.module.sass` — instructor sections and preview/revision dialogs.
- `composition/client/src/styles/ApprovalSyllabusSections.module.sass` — approval navigation, content, and comments stacking.

### Existing table consumers

- Course lists: `CoursesTable.jsx`, `ApprovalCoursesTable.jsx`, `ConsultantsTable.jsx`, `FacultyTable.jsx`, `ProgramsTable.jsx`, and `ProgramHeadCourseOfferings.jsx`.
- Learning-plan tables: `CourseDetails.jsx`, `ILOs.jsx`, `OutcomeAlignment.jsx`, `CourseCoverage.jsx`, `CriteriaForGrading.jsx`, `ReferenceSummary.jsx`, `SyllabusRevisionsSections.jsx`, and the course-details table inside `ApprovalSyllabusSections.jsx`.
- Role tables: `ReferenceLibrary.jsx`, `COAEPUpload.jsx`, `CoPoAlignment.jsx`, and `PoPeoAlignment.jsx`.

### Existing route-family styles

- `CourseCatalog.module.sass`, `ReferenceLibrary.module.scss`, `ViewReference.module.scss`, `VPAA.module.scss`, and `AlignmentTables.module.sass` — Director, Program Head, and VPAA route exceptions.
- `Login.module.sass` and `ReferencePicker.module.sass` — already contain narrow-screen rules; verify them rather than replacing their design.

---

### Task 1: Remove the combined Reference view and default to Textbooks

**Files:**
- Create: `composition/client/src/utils/referenceSummaryUi.test.js`
- Modify: `composition/client/src/components/ReferenceSummary.jsx:7-264`
- Modify: `composition/client/src/styles/SyllabusPreview.module.sass:431-530`

**Interfaces:**
- Consumes: the existing `ReferenceSummary({ offeringID, revisionNum, status, selectedSection, styles, stylesB, fetchJson })` props and the existing references API payload.
- Produces: `REFERENCE_VIEWS`, a three-entry local configuration whose values are exactly `Textbook`, `Open Educational Resources`, and `Online Resources`; the initial selected value is `Textbook`.

- [ ] **Step 1: Write the failing Reference UI contract test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.resolve(here, '..', 'components', 'ReferenceSummary.jsx'), 'utf8')

test('Reference Summary defaults to Textbooks and has no combined view', () => {
  assert.match(source, /useState\(['"]Textbook['"]\)/)
  assert.doesNotMatch(source, /value=['"]All['"]/)
  assert.doesNotMatch(source, /viewType\s*===\s*['"]All['"]/)
  assert.doesNotMatch(source, /ALL REFERENCES/)
})

test('every retained reference category has an option and selected-category empty feedback', () => {
  for (const value of ['Textbook', 'Open Educational Resources', 'Online Resources']) {
    assert.match(source, new RegExp(`value:\\s*['"]${value}['"]`))
  }
  assert.match(source, /activeReferences\.length\s*===\s*0/)
  assert.match(source, /referencesError/)
  assert.match(source, /No .* attached to this plan/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `composition/client`:

```powershell
node --test src/utils/referenceSummaryUi.test.js
```

Expected: both tests fail because the component still initializes `All`, renders `ALL REFERENCES`, and lacks a selected-category empty branch.

- [ ] **Step 3: Replace the four duplicated render branches with one configured category table**

Add directly above the component:

```jsx
const REFERENCE_VIEWS = [
  { value: 'Textbook', label: 'TEXTBOOKS', prefix: 'TB', identifier: 'ISBN', empty: 'No textbooks attached to this plan' },
  { value: 'Open Educational Resources', label: 'OPEN EDUCATIONAL RESOURCES', prefix: 'OE', identifier: 'LINK', empty: 'No open educational resources attached to this plan' },
  { value: 'Online Resources', label: 'ONLINE RESOURCES', prefix: 'OR', identifier: 'LINK', empty: 'No online resources attached to this plan' },
]
```

Change the initial state and derive the current configuration after `getDataByType`:

```jsx
const [viewType, setViewType] = useState('Textbook')

const activeView = REFERENCE_VIEWS.find(view => view.value === viewType) || REFERENCE_VIEWS[0]
const activeReferences = getDataByType(activeView.value)
const isTextbook = activeView.value === 'Textbook'
```

Replace the option list and all four conditional tables with:

```jsx
<select
  aria-label="Reference category"
  value={viewType}
  onChange={(event) => setViewType(event.target.value)}
  className={stylesB.refSelect}
>
  {REFERENCE_VIEWS.map(view => (
    <option key={view.value} value={view.value}>{view.label}</option>
  ))}
</select>

<div className={stylesB.refScrollWrapper} role="region" aria-label={`${activeView.label} table`} tabIndex={0}>
  <table className={stylesB.refTable}>
    <thead>
      <tr><th>ID</th><th>TITLE</th><th>AUTHOR/S</th><th>{activeView.identifier}</th><th>YEAR</th></tr>
    </thead>
    <tbody>
      {activeReferences.length === 0 ? (
        <EmptyState
          colSpan={5}
          icon={<BookOpen size={22} strokeWidth={1.6} />}
          title={referencesError ? 'Could not load the references' : activeView.empty}
          hint={referencesError
            ? `The server did not answer — ${referencesError}. Check that the backend is running on port 5000, then reload.`
            : `References in ${activeView.label.toLowerCase()} will appear here after they are attached to a course outcome.`}
        />
      ) : activeReferences.map((ref, index) => {
        const unresolvedCount = referenceCommentCounts[ref.id] || 0
        return (
          <tr key={ref.id || `${activeView.prefix}${index + 1}`}>
            <td>{activeView.prefix}{index + 1}</td>
            <td>
              <div className={stylesB.refTitleCell}>
                <span>{ref.title}</span>
                {status === 'returned' && unresolvedCount > 0 && (
                  <span className={styles['comment-badge']}>{unresolvedCount}</span>
                )}
              </div>
            </td>
            <td>{ref.authors}</td>
            <td>{isTextbook
              ? (ref.isbn || '-')
              : (ref.link ? <a href={ref.link} target="_blank" rel="noreferrer">Open Resource</a> : '-')}</td>
            <td>{ref.year || '-'}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
</div>
```

Remove the now-unused `Spinner` import. Add `.refTitleCell` to `SyllabusPreview.module.sass` with `display: flex`, `align-items: center`, `gap: 8px`, `min-width: 0`, and `overflow-wrap: anywhere`. Keep `.refScrollWrapper { overflow: auto }` and the existing table minimum width.

- [ ] **Step 4: Run the focused test and the existing Reference tests**

```powershell
node --test src/utils/referenceSummaryUi.test.js src/utils/referenceCatalog.test.js src/utils/referenceComments.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Inspect and commit only the Reference change**

```powershell
git diff -- src/components/ReferenceSummary.jsx src/styles/SyllabusPreview.module.sass src/utils/referenceSummaryUi.test.js
git add src/utils/referenceSummaryUi.test.js
git add -p -- src/components/ReferenceSummary.jsx src/styles/SyllabusPreview.module.sass
git diff --cached --check
git diff --cached --name-only
git commit -m "fix: default reference summary to textbooks"
```

Expected staged paths: the three files listed for this task and no server or sample-data files.

---

### Task 2: Repair the shared shell, compact navigation, and header

**Files:**
- Create: `composition/client/src/utils/responsiveShell.test.js`
- Modify: `composition/client/src/layouts/Skeleton.jsx:3-20`
- Modify: `composition/client/src/layouts/SkeletonA.jsx:3-31`
- Modify: `composition/client/src/styles/Skeleton.module.sass:4-42`
- Modify: `composition/client/src/styles/SkeletonA.module.sass:4-42`
- Modify: `composition/client/src/components/SideNavigation.jsx:138-224`
- Modify: `composition/client/src/styles/SideNavigation.module.sass:1-129`
- Modify: `composition/client/src/components/Header.jsx:8-26`
- Modify: `composition/client/src/components/HeaderA.jsx:8-26`
- Modify: `composition/client/src/styles/Header.module.sass:3-35`
- Modify: `composition/client/src/styles/HeaderA.module.sass:3-31`
- Modify: `composition/client/src/index.css:21-45,129-187`

**Interfaces:**
- Consumes: existing `Skeleton({ nav, header, content })`, `SkeletonA({ nav, header, content })`, and header/navigation props.
- Produces: stable shell class contracts `.main-layout`, `.left`, `.right`, `.up`, `.down`; compact navigation is a fixed 72px rail at or below 1024px.

- [ ] **Step 1: Write the failing shell contract test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

test('both shells shrink content and expose vertical scrolling', () => {
  for (const file of ['styles/Skeleton.module.sass', 'styles/SkeletonA.module.sass']) {
    const css = read(file)
    assert.match(css, /min-width:\s*0/)
    assert.match(css, /min-height:\s*0/)
    assert.match(css, /overflow-y:\s*auto/)
    assert.match(css, /@media \(max-width:\s*1024px\)/)
    assert.match(css, /72px/)
  }
})

test('compact navigation labels remain accessible without rail expansion', () => {
  const nav = read('components/SideNavigation.jsx')
  const css = read('styles/SideNavigation.module.sass')
  assert.match(nav, /aria-label=/)
  assert.match(nav, /title=/)
  assert.match(css, /@media \(max-width:\s*1024px\)/)
  assert.match(css, /\.listText[\s\S]*display:\s*none/)
})

test('headers use a classed sign-out action and wrap at mobile width', () => {
  for (const file of ['components/Header.jsx', 'components/HeaderA.jsx']) {
    assert.match(read(file), /className=\{styles\.signOut\}/)
  }
  for (const file of ['styles/Header.module.sass', 'styles/HeaderA.module.sass']) {
    assert.match(read(file), /flex-wrap:\s*wrap/)
    assert.match(read(file), /overflow-wrap:\s*anywhere/)
  }
})
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node --test src/utils/responsiveShell.test.js
```

Expected: failures for the current `min-width: 300px`, hidden instructor content, 280px hover rail, inline sign-out style, and non-wrapping headers.

- [ ] **Step 3: Implement the shell and navigation boundary**

Apply this structure to both shell styles, retaining each module's current colors:

```sass
.main-layout
  width: 100%
  height: 100dvh
  min-height: 100dvh
  display: flex
  gap: 10px
  overflow: hidden

.left
  flex: 0 0 90px
  width: 90px
  min-width: 90px
  height: 100dvh
  background: white

.left:hover
  flex-basis: 280px
  min-width: 280px
  transition: flex-basis .4s ease, min-width .4s ease

.right
  flex: 1 1 auto
  min-width: 0
  min-height: 0
  height: 100%
  display: flex
  flex-direction: column
  gap: 6px
  overflow: hidden

.up
  flex: 0 0 auto
  min-height: 70px
  height: auto
  background: white

.down
  flex: 1 1 auto
  width: 100%
  min-width: 0
  min-height: 0
  overflow-x: hidden
  overflow-y: auto

@media (max-width: 1024px)
  .main-layout
    gap: 6px
  .left, .left:hover
    flex: 0 0 72px
    width: 72px
    min-width: 72px
    max-width: 72px
```

Remove the commented form scaffold from `SkeletonA.jsx`, and add `data-layout-shell`, `data-layout-nav`, and `data-layout-content` attributes to the shell, left rail, and `.down` node in both layouts.

At `max-width: 1024px`, make `SideNavigation.module.sass` use a 44px logo, 8px horizontal padding, centered navigation icons, no visible `.listText`, a smaller centered `.lpms`, and an inward-opening logout popup. Add `title` and `aria-label` to each navigation item and the logout control; add `role="link"`, `tabIndex={0}`, and Enter/Space keyboard handlers to clickable navigation rows.

- [ ] **Step 4: Move header layout out of inline styles and add wrapping rules**

Use this button in both header components:

```jsx
<button type="button" onClick={logout} title="Sign out" className={styles.signOut}>
  Sign out
</button>
```

Use these rules in both header modules:

```sass
.header
  width: 100%
  min-height: 70px
  height: auto
  display: flex
  align-items: center
  flex-wrap: wrap
  gap: 12px
  padding: 10px 30px

.department
  flex: 1 1 40px
  min-width: 0

.info
  flex: 0 1 auto
  min-width: 0
  height: auto
  align-items: flex-end

.name, .role
  max-width: 100%
  text-align: right
  overflow-wrap: anywhere

.signOut
  flex: 0 0 auto
  padding: 4px 10px
  font-size: 12px
  border: 1px solid #d5d9dd
  background: transparent
  color: inherit

@media (max-width: 720px)
  .header
    padding: 8px 12px
  .department
    display: none
  .info
    flex: 1 1 160px
    align-items: flex-start
  .name, .role
    text-align: left
    font-size: 14px
```

In `index.css`, keep `:root`, `body`, and `#root` horizontally contained, change `body` to `min-width: 320px`, and add `min-width: 0` to `.filter-container` and `.search-container`. Add a `max-width: 720px` rule that wraps `.filter-container`, removes the select's fixed left margin, and allows `.search-container` to take a full row.

- [ ] **Step 5: Run shell, route, and build checks**

```powershell
node --test src/utils/responsiveShell.test.js src/utils/routes.test.js src/utils/session.test.js
npm run build
```

Expected: all tests pass; Vite exits 0. Existing Sass deprecation or chunk-size warnings do not fail this step.

- [ ] **Step 6: Inspect and commit the shell change**

```powershell
git diff -- src/layouts src/components/SideNavigation.jsx src/components/Header.jsx src/components/HeaderA.jsx src/styles/Skeleton.module.sass src/styles/SkeletonA.module.sass src/styles/SideNavigation.module.sass src/styles/Header.module.sass src/styles/HeaderA.module.sass src/index.css src/utils/responsiveShell.test.js
git add src/utils/responsiveShell.test.js
git add -p -- src/layouts/Skeleton.jsx src/layouts/SkeletonA.jsx src/components/SideNavigation.jsx src/components/Header.jsx src/components/HeaderA.jsx src/styles/Skeleton.module.sass src/styles/SkeletonA.module.sass src/styles/SideNavigation.module.sass src/styles/Header.module.sass src/styles/HeaderA.module.sass src/index.css
git diff --cached --check
git commit -m "fix: make shared LPSM shell responsive"
```

---

### Task 3: Give every retained table an accessible horizontal-scroll owner

**Files:**
- Create: `composition/client/src/components/TableScrollRegion.jsx`
- Create: `composition/client/src/styles/TableScrollRegion.module.sass`
- Create: `composition/client/src/utils/tableScrollRegion.test.js`
- Modify: `composition/client/src/components/CoursesTable.jsx:371-480`
- Modify: `composition/client/src/components/ApprovalCoursesTable.jsx:331-498`
- Modify: `composition/client/src/components/ConsultantsTable.jsx:10-80`
- Modify: `composition/client/src/components/FacultyTable.jsx:13-100`
- Modify: `composition/client/src/components/ProgramsTable.jsx:12-80`
- Modify: `composition/client/src/components/CourseDetails.jsx:79-140`
- Modify: `composition/client/src/components/ILOs.jsx:225-364`
- Modify: `composition/client/src/components/OutcomeAlignment.jsx:82-110`
- Modify: `composition/client/src/components/CourseCoverage.jsx:146-210`
- Modify: `composition/client/src/components/CriteriaForGrading.jsx:119-180`
- Modify: `composition/client/src/components/ReferenceSummary.jsx:118-264`
- Modify: `composition/client/src/components/SyllabusRevisionsSections.jsx:294-493`
- Modify: `composition/client/src/components/ApprovalSyllabusSections.jsx:1150-1176`
- Modify: `composition/client/src/pages/ProgramHeadCourseOfferings.jsx:164-210`
- Modify: `composition/client/src/pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx:432-480`
- Modify: `composition/client/src/pages/lpsm/ProgramHead/COAEPUpload.jsx:217-255`
- Modify: `composition/client/src/pages/lpsm/ProgramHead/CoPoAlignment.jsx:131-170`
- Modify: `composition/client/src/pages/lpsm/ProgramHead/PoPeoAlignment.jsx:106-150`
- Modify: `composition/client/src/styles/CoursesTable.module.sass:2-200`
- Modify: `composition/client/src/styles/AlignmentTables.module.sass:5-57`

**Interfaces:**
- Produces: `TableScrollRegion({ label: string, minWidth?: number, className?: string, children: ReactNode })`.
- Consumes: existing table markup unchanged inside the wrapper; no table rows, columns, sorting, actions, or API calls change.

- [ ] **Step 1: Write the failing scroll-region contract test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

const tableConsumers = [
  'components/CoursesTable.jsx',
  'components/ApprovalCoursesTable.jsx',
  'components/ConsultantsTable.jsx',
  'components/FacultyTable.jsx',
  'components/ProgramsTable.jsx',
  'components/CourseDetails.jsx',
  'components/ILOs.jsx',
  'components/OutcomeAlignment.jsx',
  'components/CourseCoverage.jsx',
  'components/CriteriaForGrading.jsx',
  'components/ReferenceSummary.jsx',
  'components/SyllabusRevisionsSections.jsx',
  'components/ApprovalSyllabusSections.jsx',
  'pages/ProgramHeadCourseOfferings.jsx',
  'pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx',
  'pages/lpsm/ProgramHead/COAEPUpload.jsx',
  'pages/lpsm/ProgramHead/CoPoAlignment.jsx',
  'pages/lpsm/ProgramHead/PoPeoAlignment.jsx',
]

test('TableScrollRegion owns overflow and exposes an accessible label', () => {
  const component = read('components/TableScrollRegion.jsx')
  const styles = read('styles/TableScrollRegion.module.sass')
  assert.match(component, /role="region"/)
  assert.match(component, /aria-label=\{label\}/)
  assert.match(component, /tabIndex=\{0\}/)
  assert.match(styles, /overflow-x:\s*auto/)
  assert.match(styles, /min-width:\s*0/)
})

test('every retained application table uses TableScrollRegion', () => {
  for (const relative of tableConsumers) {
    assert.match(read(relative), /TableScrollRegion/, `${relative} must use TableScrollRegion`)
  }
})
```

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
node --test src/utils/tableScrollRegion.test.js
```

Expected: the new component is missing and the consumer coverage test fails.

- [ ] **Step 3: Create the table scroll primitive**

```jsx
import styles from '../styles/TableScrollRegion.module.sass'

const TableScrollRegion = ({ label, minWidth = 720, className = '', children }) => (
  <div
    className={`${styles.region} ${className}`.trim()}
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    <div className={styles.canvas} style={{ minWidth }}>
      {children}
    </div>
  </div>
)

export default TableScrollRegion
```

```sass
.region
  width: 100%
  max-width: 100%
  min-width: 0
  overflow-x: auto
  overflow-y: auto
  overscroll-behavior-inline: contain
  scrollbar-gutter: stable
  -webkit-overflow-scrolling: touch

  &:focus-visible
    outline: 2px solid #2563eb
    outline-offset: 2px

.canvas
  width: 100%
  min-height: 100%
```

- [ ] **Step 4: Replace existing table wrappers with the primitive**

Import the component in every consumer listed by the test. Preserve each current wrapper class on `className` and use these minimum widths:

| Table family | `label` | `minWidth` |
| --- | --- | ---: |
| Instructor/approver course lists | `Assigned course offerings` | 900 |
| Faculty, consultant, program, course-offering admin lists | page-specific visible heading | 760 |
| Course Details | `Course details` | 720 |
| ILO list | `Intended learning outcomes` | 840 |
| Course/Program Outcome Alignment | `Course and program outcome alignment` | 1000 |
| Course Coverage | `Course coverage` | 1100 |
| Criteria for Grading | `Criteria for grading` | 900 |
| Reference Summary | selected category label from Task 1 | 760 |
| Revision history tables | visible section name | 760 |
| Reference Library | `Reference library` | 980 |
| COAEP, CO–PO, PO–PEO matrices | visible page heading | 960 |

Example replacement:

```jsx
<TableScrollRegion
  label="Assigned course offerings"
  minWidth={900}
  className={styles['table-container']}
>
</TableScrollRegion>
```

Use the opening `TableScrollRegion` tag in place of the current wrapper's opening `<div>` and the closing `</TableScrollRegion>` in place of that wrapper's matching `</div>`. Leave the current loading, empty-state, `<table>`, `<thead>`, `<tbody>`, row, sorting, and action nodes between those two boundaries byte-for-byte unchanged.

For the four tables in `SyllabusRevisionsSections.jsx`, wrap each table separately so the section heading remains outside the scroll area. Do not wrap `utils/syllabusPdfHtml.js`; those tables are fixed export markup rather than live route content.

- [ ] **Step 5: Make course-list controls and details popovers compact-safe**

In `CoursesTable.module.sass`, add:

```sass
.courses-table
  min-width: 0
  overflow: hidden

.header
  height: auto
  min-height: 40px
  flex-wrap: wrap

.filterA, .filter-container
  min-width: 0
  flex-wrap: wrap

.detailsPopup
  position: fixed
  right: 20px
  top: 80px
  width: min(340px, calc(100vw - 24px))
  max-height: calc(100dvh - 100px)
  overflow: auto
  z-index: 1200

@media (max-width: 720px)
  .courses-table
    padding: 14px 12px
  .header
    gap: 10px
    margin-bottom: 10px
  .header h2
    width: 100%
    font-size: 20px
    white-space: normal
  .filterA, .filter-container
    width: 100%
  .segmented-control
    max-width: 100%
    overflow-x: auto
  .detailsPopup
    left: 12px
    right: 12px
    top: auto
    bottom: 12px
    width: auto
    max-height: calc(100dvh - 24px)
```

Replace the inline popup position/width blocks in both course-table components with `className={styles.detailsPopup}` while preserving the popup content and `pos` calculation. Add `min-width: 960px` to `.alignTable`; the new scroll owner will expose that width rather than squeezing the matrix.

- [ ] **Step 6: Run focused tests and the build**

```powershell
node --test src/utils/tableScrollRegion.test.js src/utils/tableSort.test.js src/utils/referenceSummaryUi.test.js
npm run build
```

Expected: all tests pass and Vite exits 0.

- [ ] **Step 7: Inspect and commit only the table-boundary work**

```powershell
git diff -- src/components/TableScrollRegion.jsx src/styles/TableScrollRegion.module.sass src/utils/tableScrollRegion.test.js src/components src/pages src/styles/CoursesTable.module.sass src/styles/AlignmentTables.module.sass
git add src/components/TableScrollRegion.jsx src/styles/TableScrollRegion.module.sass src/utils/tableScrollRegion.test.js
git add -p -- src/components/CoursesTable.jsx src/components/ApprovalCoursesTable.jsx src/components/ConsultantsTable.jsx src/components/FacultyTable.jsx src/components/ProgramsTable.jsx src/components/CourseDetails.jsx src/components/ILOs.jsx src/components/OutcomeAlignment.jsx src/components/CourseCoverage.jsx src/components/CriteriaForGrading.jsx src/components/ReferenceSummary.jsx src/components/SyllabusRevisionsSections.jsx src/components/ApprovalSyllabusSections.jsx src/pages/ProgramHeadCourseOfferings.jsx src/pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx src/pages/lpsm/ProgramHead/COAEPUpload.jsx src/pages/lpsm/ProgramHead/CoPoAlignment.jsx src/pages/lpsm/ProgramHead/PoPeoAlignment.jsx src/styles/CoursesTable.module.sass src/styles/AlignmentTables.module.sass
git diff --cached --check
git commit -m "fix: contain wide LPSM tables"
```

---

### Task 4: Make shared forms, comments, previews, and dialogs viewport-safe

**Files:**
- Create: `composition/client/src/styles/AddReferenceModal.module.sass`
- Create: `composition/client/src/styles/PDFViewerModal.module.sass`
- Create: `composition/client/src/styles/CommentRecorder.module.sass`
- Create: `composition/client/src/utils/responsiveContent.test.js`
- Modify: `composition/client/src/styles/Form.module.sass:1-635`
- Modify: `composition/client/src/styles/Fields.module.sass:1-62`
- Modify: `composition/client/src/styles/FormNavigation.module.sass:1-23`
- Modify: `composition/client/src/styles/DropdownMultiSelect.module.sass:1-170`
- Modify: `composition/client/src/styles/TypeableDropdown.module.sass:1-100`
- Modify: `composition/client/src/styles/SyllabusSections.module.sass:1-390`
- Modify: `composition/client/src/styles/Revisions.module.sass:1-380`
- Modify: `composition/client/src/styles/SyllabusPreview.module.sass:2-530`
- Modify: `composition/client/src/styles/ApprovalCommentBox.module.sass:1-245`
- Modify: `composition/client/src/components/ApprovalCommentBox.jsx:420-620`
- Modify: `composition/client/src/components/AddReferenceModal.jsx:131-204`
- Modify: `composition/client/src/components/PDFViewerModal.jsx:222-361`
- Modify: `composition/client/src/pages/CommentRecorder.jsx:31-242`

**Interfaces:**
- Consumes: existing form inputs, save handlers, fullscreen toggles, comment submission logic, PDF controls, and dialog accessibility attributes.
- Produces: CSS-only compact behavior; no form values, validation rules, or submission payloads change.

- [ ] **Step 1: Create the failing forms/dialog contract tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

test('shared forms stack side panels and field grids', () => {
  const css = read('styles/Form.module.sass')
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.mainCont[\s\S]*flex-direction:\s*column/)
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.fieldsGridTwo[\s\S]*grid-template-columns:\s*1fr/)
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.fieldsGridThree[\s\S]*grid-template-columns:\s*1fr/)
})

test('instructor syllabus navigation wraps before its content is squeezed', () => {
  const css = read('styles/SyllabusSections.module.sass')
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.navi[\s\S]*flex-wrap:\s*wrap/)
  assert.match(css, /\.dynamic-sections[\s\S]*min-width:\s*0[\s\S]*overflow-y:\s*auto/)
})

test('shared dialogs are bounded by the dynamic viewport', () => {
  for (const file of [
    'styles/Form.module.sass',
    'styles/Revisions.module.sass',
    'styles/SyllabusPreview.module.sass',
    'styles/ApprovalCommentBox.module.sass',
    'styles/AddReferenceModal.module.sass',
    'styles/PDFViewerModal.module.sass',
  ]) {
    const css = read(file)
    assert.match(css, /100dvh/)
    assert.match(css, /overflow/)
  }
})

test('standalone comment recorder owns a responsive page class', () => {
  const page = read('pages/CommentRecorder.jsx')
  assert.match(page, /CommentRecorder\.module\.sass/)
  assert.match(page, /className=\{styles\.page\}/)
})

test('custom dropdown menus cannot exceed their mobile field width', () => {
  for (const file of ['styles/DropdownMultiSelect.module.sass', 'styles/TypeableDropdown.module.sass']) {
    const css = read(file)
    assert.match(css, /@media \(max-width:\s*720px\)/)
    assert.match(css, /\.optionsMenu[\s\S]*max-width:\s*100%/)
    assert.match(css, /\.menuOptionItem[\s\S]*white-space:\s*normal/)
  }
})
```

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
node --test src/utils/responsiveContent.test.js
```

Expected: the form breakpoints and the three new modules are absent.

- [ ] **Step 3: Add form and shared dialog breakpoints**

Add `min-width: 0` and `min-height: 0` to `.container`, `.mainCont`, and `.leftCont` in `Form.module.sass`. Add these responsive rules:

```sass
.modalOverlay
  height: 100dvh
  padding: 16px

.modal
  width: min(400px, 100%)
  max-height: calc(100dvh - 32px)
  display: flex
  flex-direction: column

  .modalBody
    overflow-y: auto

@media (max-width: 1024px)
  .mainCont
    flex-direction: column
    height: auto
  .rightCont
    width: 100%
    height: auto
    max-height: min(420px, 45dvh)
  .checklistCard
    padding-bottom: 0

@media (max-width: 720px)
  .form-container
    height: auto
    padding: 14px 12px 48px
  .list, .workspaceHeader, .cardHeaderTop, .assessmentBoxHeader
    flex-direction: column
    align-items: stretch
  .fieldsGridTwo, .fieldsGridThree
    grid-template-columns: 1fr
  .cardBodyContent
    padding: 16px 12px
  .tlas, .rubrics, .labCheckboxWrapper, .assessmentSectionWrapper
    margin-left: 0
```

In `Fields.module.sass`, remove the 20px left inset at mobile width. In `FormNavigation.module.sass`, wrap `.navi` and let `.return` and `.save` remain at least 40px high. In both `DropdownMultiSelect.module.sass` and `TypeableDropdown.module.sass`, set the mobile `.optionsMenu` to `width: 100%`, `min-width: 0`, and `max-width: 100%`, then allow `.menuOptionItem` labels to wrap with `white-space: normal` and `overflow-wrap: anywhere`. In `Revisions.module.sass`, bound `.modalContent` to `calc(100dvh - 24px)` and stack `.splitContainer`, `.leftPreviewPane`, and `.rightLedgerPane` at or below 1024px. In `SyllabusPreview.module.sass`, bound `.modalContent`, wrap `.navi`, and reduce padding at or below 720px.

In `SyllabusSections.module.sass`, add `min-width: 0` and `min-height: 0` to `.container` and `.dynamic-sections`, make `.dynamic-sections` own `overflow-y: auto`, and at or below 1024px wrap `.navi` with `.section-select` on a full-width row. At or below 720px reduce `.dynamic-sections` padding to `14px 12px` and keep each section at `min-width: 0`.

- [ ] **Step 4: Move the three inline dialog layouts into CSS Modules**

For `AddReferenceModal`, use these named nodes:

```jsx
{!isFullscreen && (
  <div onClick={onClose} className={styles.backdrop} />
)}
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="reference-dialog-title"
  className={`${styles.modal} ${isFullscreen ? styles.fullscreen : ''}`}
  onClick={event => event.stopPropagation()}
>
</div>
```

Inside that dialog, replace only the three current inline-style opening tags at lines 159, 183, and 200 with `<div className={styles.header}>`, `<div className={styles.body}>`, and `<div className={styles.actions}>`. Keep their existing headings, fields, fullscreen/close buttons, Cancel button, Save/Update button, and matching closing tags unchanged.

Define `.modal` as `width: min(800px, calc(100vw - 24px))`, `height: min(640px, calc(100dvh - 24px))`, with a flex column and hidden outer overflow. Define `.body { flex: 1; min-height: 0; overflow: auto }`, wrap `.actions` on mobile, and make `.fullscreen { inset: 0; width: 100%; height: 100dvh; border-radius: 0 }`.

For `PDFViewerModal`, keep zoom/export logic unchanged, import `PDFViewerModal.module.sass`, change the non-fullscreen height to `min(920px, calc(100dvh - 24px))`, and attach `.header`, `.toolGroup`, `.body`, `.metadata`, and `.previewPane` classes. Remove the inline `gridTemplateColumns: '220px 1fr'` so this CSS can control it:

```sass
.header
  display: flex
  align-items: center
  justify-content: space-between
  flex-wrap: wrap
  gap: 10px

.toolGroup
  display: flex
  align-items: center
  gap: 6px
  max-width: 100%
  overflow-x: auto

.body
  flex: 1
  min-height: 0
  display: grid
  grid-template-columns: 220px minmax(0, 1fr)

.previewPane
  min-width: 0
  overflow: auto

@media (max-width: 720px)
  .body
    grid-template-columns: minmax(0, 1fr)
  .metadata
    display: none
```

- [ ] **Step 5: Make the approval comment dialog and standalone recorder reflow**

Replace the Director comment dialog's inline three-column containers with `.directorWorkspace`, `.directorPlan`, and `.directorLibrary` classes. At desktop use two columns; at or below 1024px use one column and let each list own a bounded scroll area. Keep the current `submitComments` call and reference/comment arrays untouched.

```sass
.directorWorkspace
  display: grid
  grid-template-columns: minmax(0, 1fr) minmax(300px, .8fr)
  gap: 16px
  min-height: 0

@media (max-width: 1024px)
  .directorWorkspace
    grid-template-columns: 1fr
  .modal
    width: calc(100vw - 24px)
    max-height: calc(100dvh - 24px)
```

For `CommentRecorder.jsx`, remove the `box`, `field`, `label`, and `select` constants, import `CommentRecorder.module.sass`, and map them to `.page`, `.field`, `.label`, and `.select`. The page rule is `width: min(720px, calc(100% - 24px))`, `max-height: 100%`, `margin: 24px auto`, `overflow-y: auto`; at 720px reduce margin/padding and make the submit button full width.

- [ ] **Step 6: Run focused tests and the build**

```powershell
node --test src/utils/responsiveContent.test.js src/utils/referenceComments.test.js src/utils/spellSuggest.test.js
npm run build
```

Expected: all tests pass and Vite exits 0.

- [ ] **Step 7: Inspect and commit the responsive form/dialog work**

```powershell
git diff -- src/styles/Form.module.sass src/styles/Fields.module.sass src/styles/FormNavigation.module.sass src/styles/DropdownMultiSelect.module.sass src/styles/TypeableDropdown.module.sass src/styles/SyllabusSections.module.sass src/styles/Revisions.module.sass src/styles/SyllabusPreview.module.sass src/styles/ApprovalCommentBox.module.sass src/styles/AddReferenceModal.module.sass src/styles/PDFViewerModal.module.sass src/styles/CommentRecorder.module.sass src/components/ApprovalCommentBox.jsx src/components/AddReferenceModal.jsx src/components/PDFViewerModal.jsx src/pages/CommentRecorder.jsx src/utils/responsiveContent.test.js
git add src/styles/AddReferenceModal.module.sass src/styles/PDFViewerModal.module.sass src/styles/CommentRecorder.module.sass src/utils/responsiveContent.test.js
git add -p -- src/styles/Form.module.sass src/styles/Fields.module.sass src/styles/FormNavigation.module.sass src/styles/DropdownMultiSelect.module.sass src/styles/TypeableDropdown.module.sass src/styles/SyllabusSections.module.sass src/styles/Revisions.module.sass src/styles/SyllabusPreview.module.sass src/styles/ApprovalCommentBox.module.sass src/components/ApprovalCommentBox.jsx src/components/AddReferenceModal.jsx src/components/PDFViewerModal.jsx src/pages/CommentRecorder.jsx
git diff --cached --check
git commit -m "fix: bound LPSM forms and dialogs to viewport"
```

---

### Task 5: Stack the approval comments workspace below the plan at compact widths

**Files:**
- Create: `composition/client/src/styles/ApprovalSyllabus.module.sass`
- Modify: `composition/client/src/pages/ApprovalSyllabus.jsx:61-66`
- Modify: `composition/client/src/components/ApprovalSyllabusSections.jsx:71-76,974-1523`
- Modify: `composition/client/src/styles/ApprovalSyllabusSections.module.sass:1-103,802-960`
- Modify: `composition/client/src/utils/responsiveContent.test.js`

**Interfaces:**
- Consumes: existing `sidebarCollapsed` boolean, `visibleComments`, comment resolution handlers, and approval actions.
- Produces: `.review-workspace`, `.plan-pane`, `.comments-shell`, `.comments-toggle`, `.comments-viewport`, and `.comments-panel`; the comment toggle exposes `aria-expanded` and `aria-controls="approval-comments-panel"`.

- [ ] **Step 1: Extend the responsive contract test and verify RED**

Add:

```js
test('approval workspace stacks comments at the compact breakpoint', () => {
  const component = read('components/ApprovalSyllabusSections.jsx')
  const css = read('styles/ApprovalSyllabusSections.module.sass')
  assert.doesNotMatch(component, /width:\s*sidebarCollapsed\s*\?\s*0\s*:\s*380/)
  assert.match(component, /styles\['review-workspace'\]/)
  assert.match(component, /aria-expanded=\{!sidebarCollapsed\}/)
  assert.match(component, /aria-controls="approval-comments-panel"/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.review-workspace[\s\S]*flex-direction:\s*column/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.comments-toggle[\s\S]*width:\s*100%/)
})
```

Run:

```powershell
node --test src/utils/responsiveContent.test.js
```

Expected: the new approval test fails on the inline 380px panel.

- [ ] **Step 2: Replace the approval page's inline wrapper**

```jsx
import pageStyles from '../styles/ApprovalSyllabus.module.sass'

content={(
  <div className={pageStyles.page}>
    <ApprovalSyllabusSections
      currentRole={roleKey}
      courseCode={decodedCourse}
      pcId={pcId}
      revNum={revNum}
    />
  </div>
)}
```

```sass
.page
  width: 100%
  height: 100%
  min-width: 0
  min-height: 0
  display: flex
```

- [ ] **Step 3: Replace the split workspace and comments inline styles with named classes**

Replace the inline opening tag at line 1126 with `<div className={styles['review-workspace']}>`. Replace its plan-column opening tag at line 1127 with `<div className={styles['plan-pane']}>`; its current closing tag at line 1321 remains the plan-column close.

Replace the comments shell, toggle, viewport, and aside opening tags at lines 1328-1362 with:

```jsx
<div className={styles['comments-shell']} data-collapsed={sidebarCollapsed}>
  <button
    type="button"
    className={styles['comments-toggle']}
    onClick={() => setSidebarCollapsed(value => !value)}
    aria-expanded={!sidebarCollapsed}
    aria-controls="approval-comments-panel"
  >
    <span aria-hidden="true">{sidebarCollapsed ? '<' : '>'}</span>
    <span className={styles['comments-toggle-label']}>
      {sidebarCollapsed ? `Show comments (${visibleComments.length})` : 'Hide comments'}
    </span>
  </button>
  <div className={styles['comments-viewport']}>
    <aside id="approval-comments-panel" className={styles['comments-panel']}>
```

Keep the current Comments heading, count, empty state, comment rows, badges, resolution checkbox, and metadata from lines 1363-1518 unchanged. Retain the existing `</aside>`, viewport `</div>`, shell `</div>`, conditional `)}`, and outer workspace `</div>` closes in their current nesting order.

- [ ] **Step 4: Implement wide and compact workspace rules**

```sass
.review-workspace
  display: flex
  flex: 1 1 auto
  min-width: 0
  min-height: 0
  overflow: hidden

.plan-pane
  flex: 1 1 auto
  min-width: 0
  min-height: 0
  display: flex
  flex-direction: column

.comments-shell
  flex: 0 0 auto
  min-width: 0
  min-height: 0
  display: flex

.comments-toggle
  width: 26px
  flex: 0 0 26px
  border-left: 1px solid #e2e8f0
  background: #fafafa

.comments-toggle-label
  display: none

.comments-viewport
  width: 380px
  overflow: hidden

.comments-shell[data-collapsed='true'] .comments-viewport
  width: 0

.comments-panel
  width: 380px
  height: 100%
  display: flex
  flex-direction: column
  overflow: hidden
  background: white
  border-left: 1px solid #e2e8f0

@media (max-width: 1024px)
  .container
    height: auto
    min-height: 100%
    overflow: visible
  .navi
    flex-wrap: wrap
    padding: 8px
  .section-select
    order: 3
    flex: 1 0 100%
    height: 40px
  .dynamic-sections
    padding: 16px
    overflow-y: visible
  .review-workspace
    flex-direction: column
    overflow: visible
  .comments-shell
    width: 100%
    flex-direction: column
  .comments-toggle
    width: 100%
    min-height: 44px
    flex-basis: auto
    justify-content: center
    gap: 8px
    border: 1px solid #e2e8f0
  .comments-toggle-label
    display: inline
  .comments-viewport
    width: 100%
    max-height: 420px
  .comments-shell[data-collapsed='true'] .comments-viewport
    display: none
  .comments-panel
    width: 100%
    max-height: 420px
    border-left: 0
```

Change the narrow initial state comparison to `window.innerWidth <= 1024`. Keep the desktop 380px panel behavior above 1024px.

- [ ] **Step 5: Run approval and build checks**

```powershell
node --test src/utils/responsiveContent.test.js src/utils/reviewGate.test.js src/utils/workflowRouting.test.js src/utils/referenceComments.test.js
npm run build
```

Expected: tests pass and Vite exits 0.

- [ ] **Step 6: Inspect and commit only the approval layout work**

```powershell
git diff -- src/styles/ApprovalSyllabus.module.sass src/pages/ApprovalSyllabus.jsx src/components/ApprovalSyllabusSections.jsx src/styles/ApprovalSyllabusSections.module.sass src/utils/responsiveContent.test.js
git add src/styles/ApprovalSyllabus.module.sass
git add -p -- src/pages/ApprovalSyllabus.jsx src/components/ApprovalSyllabusSections.jsx src/styles/ApprovalSyllabusSections.module.sass src/utils/responsiveContent.test.js
git diff --cached --check
git commit -m "fix: stack approval comments on compact screens"
```

---

### Task 6: Repair Program Head, Director, VPAA, and remaining route-specific layouts

**Files:**
- Create: `composition/client/src/styles/ProgramHeadWorkspace.module.sass`
- Modify: `composition/client/src/pages/lpsm/ProgramHead/COAEPUpload.jsx:176-313`
- Modify: `composition/client/src/pages/lpsm/ProgramHead/CoPoAlignment.jsx:89-170`
- Modify: `composition/client/src/pages/lpsm/ProgramHead/PoPeoAlignment.jsx:82-150`
- Modify: `composition/client/src/styles/CourseCatalog.module.sass:1-169`
- Modify: `composition/client/src/styles/ReferenceLibrary.module.scss:5-741`
- Modify: `composition/client/src/styles/ViewReference.module.scss:5-158`
- Modify: `composition/client/src/styles/VPAA.module.scss:1-125`
- Modify: `composition/client/src/styles/AlignmentTables.module.sass:5-57`
- Modify: `composition/client/src/utils/responsiveContent.test.js`

**Interfaces:**
- Consumes: existing Program Head edit/save/view/upload actions, Director library/catalog data, and VPAA course list.
- Produces: shared `.page`, `.toolbar`, `.courseSelect`, `.actions`, `.dialog`, `.fieldRow`, and `.dialogActions` classes for the three Program Head matrix pages.

- [ ] **Step 1: Extend the role-page contract test and verify RED**

Add:

```js
test('role-specific workspaces declare compact and mobile contracts', () => {
  const styleFiles = [
    'styles/ProgramHeadWorkspace.module.sass',
    'styles/CourseCatalog.module.sass',
    'styles/ReferenceLibrary.module.scss',
    'styles/ViewReference.module.scss',
    'styles/VPAA.module.scss',
    'styles/AlignmentTables.module.sass',
  ]
  for (const file of styleFiles) {
    const css = read(file)
    assert.match(css, /max-width:\s*1024px|max-width:\s*1024px\)/)
    assert.match(css, /max-width:\s*720px|max-width:\s*720px\)/)
  }

  for (const file of [
    'pages/lpsm/ProgramHead/COAEPUpload.jsx',
    'pages/lpsm/ProgramHead/CoPoAlignment.jsx',
    'pages/lpsm/ProgramHead/PoPeoAlignment.jsx',
  ]) {
    assert.match(read(file), /ProgramHeadWorkspace\.module\.sass/)
  }

  const libraryCss = read('styles/ReferenceLibrary.module.scss')
  assert.doesNotMatch(libraryCss, /^table\s*\{/m)
  assert.match(libraryCss, /\.tableWrapper\s+table\s*\{/)
})
```

Run:

```powershell
node --test src/utils/responsiveContent.test.js
```

Expected: failures because the Program Head module does not exist and the role styles do not all declare both ranges.

- [ ] **Step 2: Extract the Program Head page and toolbar layout**

In all three Program Head pages, import `ProgramHeadWorkspace.module.sass` as `pageStyles`, replace the root inline container with `className={pageStyles.page}`, replace the inline 40px header with `className={pageStyles.toolbar}`, put controls in `pageStyles.actions`, and attach `pageStyles.courseSelect` to course selects.

```sass
.page
  width: 100%
  height: 100%
  min-width: 0
  min-height: 0
  display: flex
  flex-direction: column
  gap: 10px
  padding: 20px 30px
  background: white
  overflow: hidden

.toolbar
  width: 100%
  min-width: 0
  min-height: 40px
  display: flex
  align-items: center
  gap: 15px
  flex-wrap: wrap

  h2
    margin: 0
    font-size: 22px
    overflow-wrap: anywhere

.courseSelect
  min-width: 0
  max-width: 360px
  padding: 6px 12px

.actions
  margin-left: auto
  display: flex
  flex-wrap: wrap
  gap: 8px

@media (max-width: 1024px)
  .page
    overflow-y: auto
  .toolbar h2
    flex: 1 0 100%
  .actions
    margin-left: 0

@media (max-width: 720px)
  .page
    height: auto
    min-height: 100%
    padding: 14px 12px
  .courseSelect, .actions
    width: 100%
    max-width: none
  .actions > button
    flex: 1 1 140px
```

Move the COAEP upload dialog's width and two-field row into `.dialog` and `.fieldRow`. Use `width: min(540px, calc(100vw - 24px))`, `max-height: calc(100dvh - 24px)`, and internal scrolling; at mobile width `.fieldRow { flex-direction: column }`.

- [ ] **Step 3: Add explicit compact rules to Director and VPAA styles**

Add the following behaviors:

- `CourseCatalog.module.sass`: `.page { width: 100%; min-width: 0; height: 100%; overflow-y: auto }`; at 1024px let `.controls` and `.toolbar` use full-width wrapped rows; at 720px each `.controls label` and `.search` takes a full row, `.count` loses `margin-left: auto`, and primary/secondary buttons can wrap.
- `ReferenceLibrary.module.scss`: `.container { min-width: 0; overflow-y: auto }`; scope the current bare `table` block as `.tableWrapper table` so this page cannot restyle unrelated tables; at 1024px `.actionsGroup` moves to a full wrapped row; at 720px use 14px page padding, full-width search, two-column stat cards, wrapped pagination, one-column modal rows, viewport-bounded modals, and wrapped modal/delete actions.
- `ViewReference.module.scss`: at 1024px cap readable content width while allowing the container to scroll vertically; at 720px use 14px page padding, `.detailRow2col { grid-template-columns: 1fr }`, allow `.fileCard` and `.actions` to wrap, and make action buttons fill available width.
- `VPAA.module.scss`: add `min-width: 0` and vertical access to `.container`; at 1024px wrap `.controlsBar`; at 720px reduce stats padding, use one stat card per row, and let search/filter controls fill the row.
- `AlignmentTables.module.sass`: keep `.alignTable { min-width: 960px }`; add wrapping legend rules at 1024px and 720px. The `TableScrollRegion` from Task 3 owns horizontal scrolling.

- [ ] **Step 4: Run focused and full frontend automated checks**

```powershell
node --test src/utils/responsiveContent.test.js src/utils/tableScrollRegion.test.js
node --test src/utils/*.test.js
node src/utils/checkJsxImports.js
npm run build
```

Expected: all Node tests and JSX import checks pass; Vite exits 0.

- [ ] **Step 5: Inspect and commit only the role-page responsive work**

```powershell
git diff -- src/styles/ProgramHeadWorkspace.module.sass src/pages/lpsm/ProgramHead/COAEPUpload.jsx src/pages/lpsm/ProgramHead/CoPoAlignment.jsx src/pages/lpsm/ProgramHead/PoPeoAlignment.jsx src/styles/CourseCatalog.module.sass src/styles/ReferenceLibrary.module.scss src/styles/ViewReference.module.scss src/styles/VPAA.module.scss src/styles/AlignmentTables.module.sass src/utils/responsiveContent.test.js
git add src/styles/ProgramHeadWorkspace.module.sass
git add -p -- src/pages/lpsm/ProgramHead/COAEPUpload.jsx src/pages/lpsm/ProgramHead/CoPoAlignment.jsx src/pages/lpsm/ProgramHead/PoPeoAlignment.jsx src/styles/CourseCatalog.module.sass src/styles/ReferenceLibrary.module.scss src/styles/ViewReference.module.scss src/styles/VPAA.module.scss src/styles/AlignmentTables.module.sass src/utils/responsiveContent.test.js
git diff --cached --check
git commit -m "fix: reflow role-specific LPSM pages"
```

---

### Task 7: Verify every retained route family at the required viewports

**Files:**
- Verify only; no production file changes are part of this task.

**Interfaces:**
- Consumes: the six implementation commits and the running backend on port 5000 plus Vite frontend on port 5173.
- Produces: fresh automated output and visual evidence that each route family satisfies the approved contract.

- [ ] **Step 1: Run the complete automated verification from clean processes**

Backend terminal:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\server"
node server.js
```

Frontend terminal:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\client"
npm run dev
```

Verification terminal from `composition/client`:

```powershell
node --test src/utils/*.test.js
node src/utils/checkJsxImports.js
npm run build
```

Expected: all tests and import checks pass; Vite build exits 0.

- [ ] **Step 2: Sign in and verify the Instructor route family**

Before signing in, verify the sign-in, Create Account, and Forgot Password panels at `390×844` and `360×640`. Then use `monica.norton@unc.edu.ph` / `demo1234` / Instructor. At each required viewport, verify `/`, one real course reached from its View action, each section selector entry, Revisions, ILO form, Topic form, TLA form, Reference form, preview dialog, PDF viewer, and `/record-comments`.

For every page, confirm:

- no element rectangles overlap;
- bottom content remains reachable;
- the body has no horizontal scrollbar;
- each table region has its own horizontal scrollbar when its canvas is wider;
- controls wrap without hiding text;
- dialogs fit inside the dynamic viewport.

- [ ] **Step 3: Verify approver course lists and approval workspace**

Use the five approver accounts below with password `demo1234`, opening a real course from each visible list:

| Role | Email |
| --- | --- |
| Program Head | `junar.danila@unc.edu.ph` |
| Director of Libraries | `maria.santos@unc.edu.ph` |
| Industry Consultant | `roberto.cruz@unc.edu.ph` |
| Dean | `agnes.reyes@unc.edu.ph` |
| VPAA | `carlos.garcia@unc.edu.ph` |

At `1440×900`, confirm the approval comments panel remains 380px beside the plan. At `1024×768`, `740×1000`, `390×844`, and `360×640`, confirm the comments disclosure is full width below the learning-plan content, toggles with keyboard and pointer, reports `aria-expanded`, and exposes the same saved comments. Open Add Comment and verify the dialog is scrollable and no comment submission behavior changed.

For the Dean account, also open `/role/dean?page=Programs` and `/role/dean?page=Faculty` at all five viewports to verify their filter rows and table scroll regions.

- [ ] **Step 4: Verify Program Head and Director route families**

Program Head:

- `/role/program-head/course-offerings`
- `/role/program-head/industry-consultant`
- `/role/program-head/coaep-upload`
- `/role/program-head/co-po-alignment`
- `/role/program-head/po-peo-alignment`

Director of Libraries:

- `/role/director-of-libraries/reference-library`
- `/role/director-of-libraries/course-catalog`
- `/role/director-of-libraries/add-reference`
- one View Reference route reached from the library
- one Edit Reference route reached from the library

At all five viewports, verify filters and actions wrap, matrix tables scroll inside their labelled region, Director stat cards and pagination remain readable, and add/view/edit dialogs remain inside the viewport.

- [ ] **Step 5: Verify the exact References behavior in every shared consumer**

Open References Summary from an Instructor learning plan, an approver learning plan, Preview, and Revisions. Confirm each opens with `TEXTBOOKS`, the dropdown contains exactly three entries, switching to either remaining category works, an empty selected category displays its own empty message, and stopping the backend produces the server-error message without reintroducing an `ALL REFERENCES` choice. Restart the backend after the failure-state check.

- [ ] **Step 6: Perform the final repository evidence check**

```powershell
git status --short
git diff --check
git log --oneline -7
```

Expected:

- no responsive implementation change remains unstaged;
- unrelated pre-existing working-tree changes are still present and were not swept into these commits;
- the latest commits correspond to the six implementation tasks;
- no server, migration, seeder, or sample-course file appears in those responsive commits.
