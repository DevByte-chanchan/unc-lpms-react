import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as sass from 'sass'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')
const indentOf = line => line.match(/^\s*/)[0].length
const sassBlock = (css, selector, after = null) => {
  const lines = css.split(/\r?\n/)
  const parentIndex = after ? lines.findIndex(line => line.trim() === after) : -1
  assert.ok(!after || parentIndex >= 0, `Missing Sass parent block: ${after}`)

  const parentIndent = parentIndex >= 0 ? indentOf(lines[parentIndex]) : -1
  const scopeEnd = parentIndex >= 0
    ? lines.findIndex((line, index) => index > parentIndex && line.trim() && indentOf(line) <= parentIndent)
    : lines.length
  const end = scopeEnd >= 0 ? scopeEnd : lines.length
  const selectorIndex = lines.findIndex((line, index) => (
    index > parentIndex && index < end && line.trim() === selector
  ))
  assert.ok(selectorIndex >= 0, `Missing Sass selector ${selector}${after ? ` under ${after}` : ''}`)

  const selectorIndent = indentOf(lines[selectorIndex])
  const blockEnd = lines.findIndex((line, index) => (
    index > selectorIndex && line.trim() && indentOf(line) <= selectorIndent
  ))
  return lines.slice(selectorIndex, blockEnd >= 0 ? blockEnd : lines.length).join('\n')
}

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

test('syllabus preview modal keeps its exact 720px viewport gutters in border-box sizing', () => {
  const css = read('styles/SyllabusPreview.module.sass')
  const modal = sassBlock(css, '.modalContent', '@media (max-width: 720px)')
  assert.match(modal, /width:\s*calc\(100vw - 24px\)/)
  assert.match(modal, /height:\s*calc\(100dvh - 24px\)/)
  assert.match(modal, /padding:\s*16px 12px/)
  assert.match(modal, /box-sizing:\s*border-box/)
})

test('approval comment modal includes its compact and fullscreen padding inside viewport bounds', () => {
  const css = read('styles/ApprovalCommentBox.module.sass')
  const modal = sassBlock(css, '.modal')
  const compactModal = sassBlock(css, '.modal', '@media (max-width: 1024px)')
  assert.match(modal, /padding:\s*12px/)
  assert.match(modal, /box-sizing:\s*border-box/)
  assert.match(compactModal, /width:\s*calc\(100vw - 24px\)/)
  assert.match(compactModal, /max-height:\s*calc\(100dvh - 24px\)/)
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

test('approval workspace stacks comments at the compact breakpoint', () => {
  const component = read('components/ApprovalSyllabusSections.jsx')
  const css = read('styles/ApprovalSyllabusSections.module.sass')
  const compactViewport = sassBlock(css, '.comments-viewport', '@media (max-width: 1024px)')
  const compactPanel = sassBlock(css, '.comments-panel', '@media (max-width: 1024px)')
  assert.doesNotMatch(component, /width:\s*sidebarCollapsed\s*\?\s*0\s*:\s*380/)
  assert.match(component, /styles\['review-workspace'\]/)
  assert.match(component, /aria-expanded=\{!sidebarCollapsed\}/)
  assert.match(component, /aria-controls="approval-comments-panel"/)
  assert.match(component, /className=\{styles\['comments-viewport'\]\}[\s\S]*inert=\{sidebarCollapsed\}[\s\S]*aria-hidden=\{sidebarCollapsed\}/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.review-workspace[\s\S]*flex-direction:\s*column/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.comments-toggle[\s\S]*width:\s*100%/)
  assert.match(compactViewport, /height:\s*420px/)
  assert.match(compactViewport, /overflow-y:\s*auto/)
  assert.match(compactPanel, /height:\s*100%/)
})

test('approver sort announcements stay positioned inside their table buttons', () => {
  const css = read('styles/CoursesTable.module.sass')
  const tableRegion = sassBlock(css, '.table-container')
  assert.match(tableRegion, /th > button[\s\S]*position:\s*relative/)
})

test('course-list empty states center in the remaining table body below the headers', () => {
  const emptyComponent = read('components/EmptyState.jsx')
  const emptyCss = read('styles/EmptyState.module.sass')
  const regionCss = read('styles/TableScrollRegion.module.sass')

  assert.doesNotMatch(emptyComponent, /workspaceRow/)
  for (const file of ['components/CoursesTable.jsx', 'components/ApprovalCoursesTable.jsx']) {
    assert.match(read(file), /<EmptyState\s+colSpan=/, `${file} must render its empty state inside tbody`)
    assert.doesNotMatch(read(file), /<EmptyState\s+workspace\s+colSpan=/, `${file} must not centre against the viewport`)
  }
  assert.doesNotMatch(emptyCss, /\.workspaceRow/)
  assert.match(regionCss, />\s*:global\(table\)\s*>\s*:global\(tbody\)[\s\S]*flex:\s*1\s+1\s+auto/)
  assert.match(emptyCss, /\.row[\s\S]*flex:\s*1\s+1\s+auto/)
})

test('compact comments disclosure follows the learning plan instead of being covered by it', () => {
  const component = read('components/ApprovalSyllabusSections.jsx')
  const css = read('styles/ApprovalSyllabusSections.module.sass')
  const compactWorkspace = sassBlock(css, '.review-workspace', '@media (max-width: 1024px)')
  assert.match(component, /onClick=\{\(\) => setSidebarCollapsed\(value => !value\)\}/)
  assert.match(component, /onKeyDown=\{\(event\) => \{[\s\S]*event\.key === 'Enter'[\s\S]*event\.key === ' '[\s\S]*event\.preventDefault\(\)[\s\S]*setSidebarCollapsed\(value => !value\)/)
  assert.match(compactWorkspace, /flex:\s*0 0 auto/)
})

test('expanded compact comments flow after the complete plan pane', () => {
  const css = read('styles/ApprovalSyllabusSections.module.sass')
  const compactPlan = sassBlock(css, '.plan-pane', '@media (max-width: 1024px)')
  const compactSections = sassBlock(css, '.dynamic-sections', '@media (max-width: 1024px)')
  assert.match(compactPlan, /flex:\s*0 0 auto/)
  assert.match(compactSections, /flex:\s*0 0 auto/)
})

test('reference discovery workbench becomes drawers and sheets on compact screens', () => {
  const css = read('styles/ReferenceLibrary.module.scss')
  const page = read('pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx')
  const desktopContainer = sassBlock(css, '.container {')
  const desktopWorkbench = sassBlock(css, '.discoveryWorkbench {')
  const desktopLayout = sassBlock(css, '.discoveryLayout {')
  const compactWorkbench = sassBlock(css, '.discoveryWorkbench {', '@media (max-width: 1024px) {')
  const compactTop = sassBlock(css, '.discoveryTop {', '@media (max-width: 1024px) {')
  const pageHeader = sassBlock(css, '.pageHeader {')
  const addButton = sassBlock(css, '.addBtn {')
  const bulkButton = sassBlock(css, '.bulkBtn {')
  const searchForm = sassBlock(css, '.searchForm {')
  const searchIconButton = sassBlock(css, '.searchIconButton {')
  const searchInput = sassBlock(css, '.searchInput {')
  const previewButtons = sassBlock(css, '.previewSecondary {')
  const tableWrapper = sassBlock(css, '.tableWrapper {')
  const paginationButton = sassBlock(css, '.paginationBtn {')
  const facetRail = sassBlock(css, '.facetRail {')
  const previewPane = sassBlock(css, '.previewPane {')
  const selectedRow = sassBlock(css, '.resultRowSelected {')
  const facetOption = sassBlock(css, '.facetOption {')
  const previewMetadata = sassBlock(css, '.previewMetadata {')
  const referenceTable = sassBlock(css, '.tableWrapper table {')
  const compactSearchForm = sassBlock(css, '.searchForm {', '@media (max-width: 720px) {')
  assert.match(page, /styles\.discoveryWorkbench/)
  assert.match(page, /styles\.discoveryTop/)
  assert.match(page, />REFERENCE LIBRARY<\/h1>/)
  assert.match(page, /referenceLibraryColumns\(\)\.filter\(column => column\.key !== 'actions'\)/)
  assert.doesNotMatch(page, /<td className="fill">/)
  assert.match(desktopContainer, /background:\s*#fff/)
  assert.match(desktopWorkbench, /flex:\s*1 1 auto/)
  assert.match(desktopWorkbench, /border:\s*(?:0|none)/)
  assert.match(desktopWorkbench, /border-radius:\s*0/)
  assert.match(desktopWorkbench, /background:\s*#fff/)
  assert.match(desktopWorkbench, /box-shadow:\s*none/)
  assert.match(compactWorkbench, /border-radius:\s*0/)
  assert.match(compactTop, /border-radius:\s*0/)
  assert.match(pageHeader, /align-items:\s*center/)
  for (const button of [addButton, bulkButton]) {
    assert.match(button, /height:\s*40px/)
    assert.match(button, /border-radius:\s*6px/)
    assert.match(button, /font-weight:\s*500/)
    assert.doesNotMatch(button, /transform:\s*scale/)
  }
  assert.match(bulkButton, /border:\s*1px solid #A4A9AF/i)
  assert.match(searchForm, /grid-template-columns:\s*150px minmax\(260px,\s*1fr\)/)
  assert.match(searchForm, /justify-content:\s*start/)
  assert.match(searchForm, /gap:\s*10px/)
  assert.match(searchIconButton, /position:\s*absolute/)
  assert.match(searchIconButton, /right:\s*8px/)
  assert.match(searchIconButton, /width:\s*28px/)
  assert.match(searchIconButton, /height:\s*28px/)
  assert.match(previewButtons, /border-radius:\s*6px/)
  assert.match(previewButtons, /align-items:\s*center/)
  assert.match(searchInput, /border:\s*1px solid #d1d5db/i)
  assert.match(searchInput, /border-radius:\s*6px/)
  assert.match(compactSearchForm, /grid-template-columns:\s*1fr/)
  assert.match(tableWrapper, /border:\s*(?:0|none)/)
  assert.match(tableWrapper, /border-radius:\s*0/)
  assert.match(paginationButton, /border-radius:\s*6px/)
  assert.match(facetRail, /background:\s*#fff/)
  assert.match(previewPane, /background:\s*#fff/)
  assert.match(selectedRow, /box-shadow:\s*inset 3px 0 #19282C/i)
  assert.match(css, /\.discoveryTop\s*\{[\s\S]*background:\s*#fff[\s\S]*border-bottom:/)
  assert.match(desktopLayout, /grid-template-columns:\s*210px minmax\(420px,\s*1fr\) 285px/)
  assert.match(desktopLayout, /flex:\s*1 1 auto/)
  assert.match(desktopLayout, /height:\s*auto/)
  assert.match(desktopLayout, /min-height:\s*0/)
  assert.match(css, /\.facetOption\s*>\s*span:first-child\s*\{[\s\S]*white-space:\s*nowrap/)
  assert.match(facetOption, /font:\s*400 12px/)
  assert.match(css, /\.previewPane \.warningBanner\s*\{[\s\S]*padding:\s*8px 10px[\s\S]*font-size:\s*12px/)
  assert.match(css, /\.previewMetadata\s*\{[\s\S]*gap:\s*10px 12px/)
  assert.match(previewMetadata, /font-size:\s*12px/)
  assert.match(css, /\.previewActions\s*\{[\s\S]*margin-top:\s*16px/)
  assert.match(referenceTable, /table-layout:\s*fixed/)
  assert.match(referenceTable, /th\s*\{[\s\S]*font-size:\s*14px/)
  assert.match(referenceTable, /td\s*\{[\s\S]*font-size:\s*15px/)
  const departmentFacet = page.indexOf('>Department</h3>')
  const typeFacet = page.indexOf('>Reference type</h3>')
  const yearFacet = page.indexOf('>Publication year</h3>')
  const statusFacet = page.indexOf('>Record status</h3>')
  assert.ok(departmentFacet >= 0 && departmentFacet < typeFacet && typeFacet < yearFacet && yearFacet < statusFacet)
  assert.match(css, /\.discoveryLayout\s*\{[\s\S]*grid-template-columns:/)
  assert.match(css, /\.tableWrapper\s*\{[\s\S]*overflow-x:\s*auto/)
  assert.match(page, /styles\.previewBackdrop/)
  assert.match(css, /@media \(max-width:\s*1400px\)[\s\S]*\.filterDrawer/)
  assert.match(css, /@media \(max-width:\s*1400px\)[\s\S]*\.previewSheet/)
  assert.match(css, /@media \(max-width:\s*1400px\)[\s\S]*\.previewBackdrop/)
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.searchForm/)
})

test('reference discovery uses the available desktop space without crowding compact screens', () => {
  const css = read('styles/ReferenceLibrary.module.scss')
  const container = sassBlock(css, '.container {')
  const top = sassBlock(css, '.discoveryTop {')
  const pageHeader = sassBlock(css, '.pageHeader {')
  const headerActions = sassBlock(css, '.headerActions {')
  const searchForm = sassBlock(css, '.searchForm {')
  const savedViews = sassBlock(css, '.savedViews {')
  const layout = sassBlock(css, '.discoveryLayout {')
  const facetRail = sassBlock(css, '.facetRail {')
  const facetGroup = sassBlock(css, '.facetGroup {')
  const facetGroupTitle = sassBlock(css, '.facetGroupTitle {')
  const facetOption = sassBlock(css, '.facetOption {')
  const resultsPane = sassBlock(css, '.resultsPane {')
  const previewPane = sassBlock(css, '.previewPane {')
  const warningBanner = sassBlock(css, '.previewPane .warningBanner {')
  const tableWrapper = sassBlock(css, '.tableWrapper {')
  const referenceTable = sassBlock(css, '.tableWrapper table {')
  const mobileResults = sassBlock(css, '.resultsPane {', '@media (max-width: 720px) {')

  assert.match(container, /padding:\s*16px 24px/)
  assert.match(top, /display:\s*grid/)
  assert.match(top, /grid-template-columns:\s*minmax\(520px, 1fr\) auto/)
  assert.match(top, /padding:\s*10px 20px/)
  assert.match(pageHeader, /gap:\s*24px/)
  assert.match(pageHeader, /grid-column:\s*1 \/ -1/)
  assert.match(headerActions, /gap:\s*12px/)
  assert.match(searchForm, /margin-top:\s*12px/)
  assert.match(savedViews, /margin-top:\s*12px/)
  assert.match(savedViews, /justify-content:\s*flex-end/)
  assert.match(savedViews, /gap:\s*8px/)
  assert.match(layout, /gap:\s*16px/)
  for (const panel of [facetRail, resultsPane, previewPane]) {
    assert.match(panel, /padding:\s*14px 16px/)
  }
  assert.match(facetRail, /border-right:\s*0/)
  assert.match(previewPane, /border-left:\s*0/)
  assert.match(facetGroup, /padding:\s*14px 0/)
  assert.match(facetGroupTitle, /margin:\s*0 0 8px/)
  assert.match(facetOption, /padding:\s*6px 8px/)
  assert.match(tableWrapper, /margin-top:\s*10px/)
  assert.match(warningBanner, /margin-bottom:\s*16px/)
  assert.match(referenceTable, /th\s*\{[\s\S]*padding:\s*14px 18px/)
  assert.match(referenceTable, /td\s*\{[\s\S]*padding:\s*7px 16px/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.discoveryTop\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/)
  assert.match(mobileResults, /padding:\s*14px/)
})

test('reference status choices and primary actions stay visually distinct', () => {
  const page = read('pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx')
  const css = sass.compile(path.join(src, 'styles/ReferenceLibrary.module.scss')).css

  assert.doesNotMatch(page, /styles\.recordStatusGroup/)
  assert.doesNotMatch(page, /styles\.previewIcon/)
  assert.doesNotMatch(page, /styles\.searchButton/)
  assert.match(page, /className=\{styles\.searchIconButton\}[\s\S]*type="submit"[\s\S]*aria-label="Search references"/)
  assert.match(page, /className=\{styles\.clearSearch\}[\s\S]*aria-label="Clear search"/)
  assert.match(css, /\.facetGroup\s*\{[^}]*gap:\s*4px/)
  assert.match(css, /\.searchIconButton\s*\{[^}]*position:\s*absolute;[^}]*right:\s*8px;[^}]*width:\s*28px;[^}]*height:\s*28px;/)
  assert.match(css, /\.clearSearch\s*\{[^}]*right:\s*40px;/)
  assert.match(css, /\.previewClose\s*\{[^}]*width:\s*32px[^}]*height:\s*32px[^}]*border:\s*1px solid #E81123[^}]*border-radius:\s*4px[^}]*background:\s*#fff[^}]*color:\s*#E81123/)
  assert.match(css, /\.previewClose:hover\s*\{[^}]*background:\s*#FFF1F2[^}]*border-color:\s*#B91C1C[^}]*color:\s*#B91C1C/)
  assert.match(css, /\.previewPane \.warningBanner\s*\{[^}]*margin-top:\s*14px/)
})

test('reference facets share option spacing and pagination controls remain square', () => {
  const css = sass.compile(path.join(src, 'styles/ReferenceLibrary.module.scss')).css

  assert.match(css, /\.facetGroup\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*4px;/)
  assert.match(css, /\.paginationBtn\s*\{[^}]*width:\s*36px;[^}]*min-width:\s*36px;[^}]*max-width:\s*36px;[^}]*height:\s*36px;[^}]*min-height:\s*36px;[^}]*max-height:\s*36px;[^}]*padding:\s*0;[^}]*box-sizing:\s*border-box;[^}]*flex:\s*0 0 36px;/)
  assert.match(css, /\.paginationBtn svg\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;[^}]*flex:\s*0 0 16px;[^}]*display:\s*block;/)
})

test('reference table scrolls only its data rows while the header stays outside vertical scrolling', () => {
  const css = sass.compile(path.join(src, 'styles/ReferenceLibrary.module.scss')).css

  assert.match(css, /\.tableWrapper\s*\{[^}]*overflow-y:\s*hidden;/i)
  assert.match(css, /\.tableWrapper table tbody\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/i)
  assert.match(css, /\.tableWrapper table thead\s*\{[^}]*flex:\s*0 0 auto;[^}]*overflow-y:\s*scroll;[^}]*scrollbar-gutter:\s*stable;[^}]*scrollbar-width:\s*thin;/i)
  assert.match(css, /\.tableWrapper table thead\s*\{[^}]*background:\s*#EDEFF2;/i)
  assert.match(css, /\.tableWrapper table thead::-webkit-scrollbar\s*\{[^}]*width:\s*5px;/i)
  assert.match(css, /\.tableWrapper table thead th\s*\{[^}]*background:\s*#EDEFF2;/i)
})

test('reference controls, year column, age badge, and scrollbar stay visually aligned', () => {
  const page = read('pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx')
  const globalCss = read('App.css')
  const css = sass.compile(path.join(src, 'styles/ReferenceLibrary.module.scss')).css
  const syllabusCss = sass.compile(path.join(src, 'styles/SyllabusSections.module.sass')).css

  assert.match(globalCss, /select:not\(\[multiple\]\)[\s\S]*appearance:\s*none\s*!important[\s\S]*background-position:\s*right 12px center\s*!important[\s\S]*padding-right:\s*36px\s*!important/)
  assert.match(page, /isReferenceDeprecated\(ref, CURRENT_YEAR\)[\s\S]*styles\.deprecatedMarker/)
  assert.doesNotMatch(page, /styles\.titleLine[\s\S]*styles\.deprecatedBadge/)
  assert.match(css, /\.tableWrapper table th:nth-child\(5\),\s*\.tableWrapper table td:nth-child\(5\)[\s\S]*text-align:\s*center/)
  assert.match(css, /\.tableWrapper table td:nth-child\(5\)\s*\{[^}]*justify-content:\s*center;/)
  assert.match(css, /\.tableWrapper table th:nth-child\(5\) button\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\);[^}]*width:\s*100%;/)
  assert.match(css, /\.tableWrapper table th:nth-child\(5\) button\s*>\s*span:nth-child\(2\)[\s\S]*grid-column:\s*3[\s\S]*justify-self:\s*end/)
  assert.match(css, /\.tableWrapper table tbody::-webkit-scrollbar\s*\{[^}]*width:\s*5px;/)
  assert.match(css, /\.titleCell\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;/)
  assert.match(css, /\.titleLine\s*\{[^}]*width:\s*100%;/)
  assert.match(css, /\.titleLine \.refTitle\s*\{[^}]*flex:\s*1 1 auto;/)
  assert.match(css, /\.tableWrapper::-webkit-scrollbar[\s\S]*width:\s*5px[\s\S]*height:\s*5px/)
  assert.match(syllabusCss, /\.selectWrapper::after\s*\{[\s\S]*display:\s*none/)
})

test('approval footer uses compact section labels before the 740px grid collides', () => {
  const css = read('styles/ApprovalSyllabusSections.module.sass')
  assert.match(css, /@media \(min-width:\s*601px\) and \(max-width:\s*800px\)[\s\S]*\.nav-full[\s\S]*display:\s*none[\s\S]*\.nav-short[\s\S]*display:\s*inline/)
})

test('role-specific workspaces declare compact and mobile contracts', () => {
  const styleFiles = [
    'styles/ProgramHeadWorkspace.module.sass',
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
    'pages/lpsm/ProgramHead/COAEPView.jsx',
    'pages/lpsm/ProgramHead/CoPoAlignment.jsx',
    'pages/lpsm/ProgramHead/PoPeoAlignment.jsx',
  ]) {
    assert.match(read(file), /ProgramHeadWorkspace\.module\.sass/)
  }

  const libraryCss = read('styles/ReferenceLibrary.module.scss')
  assert.doesNotMatch(libraryCss, /^table\s*\{/m)
  assert.match(libraryCss, /\.tableWrapper\s+table\s*\{/)

  const approvalCourses = read('components/ApprovalCoursesTable.jsx')
  const vpaaPage = read('pages/VPAA.jsx')
  assert.match(approvalCourses, /styleHooks\s*=\s*\{\}/)
  assert.match(approvalCourses, /<div className=\{`\$\{styles\['courses-table'\]\} \$\{styleHooks\.root/)
  assert.match(approvalCourses, /<div className=\{`\$\{styles\.header\} \$\{styleHooks\.header/)
  assert.match(approvalCourses, /<div className=\{`\$\{styles\.filterA\} \$\{styleHooks\.filters/)
  assert.match(vpaaPage, /<ApprovalCoursesTable[\s\S]*styleHooks=\{\{/)
  assert.match(vpaaPage, /root:\s*vpaaStyles\.courseList/)
  assert.match(vpaaPage, /header:\s*vpaaStyles\.courseHeader/)
  assert.match(vpaaPage, /filters:\s*vpaaStyles\.courseFilters/)
  const vpaaCss = read('styles/VPAA.module.scss')
  assert.doesNotMatch(vpaaCss, /\.(?:statsGrid|statCard|searchWrapper|controlsBar)\s*\{/)

  const libraryPage = read('pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx')
  assert.match(libraryPage, /role="search"/)
  assert.match(libraryPage, /styles\.discoveryLayout/)
  assert.match(libraryPage, /styles\.facetRail/)
  assert.match(libraryPage, /styles\.resultsPane/)
  assert.match(libraryPage, /styles\.previewPane/)
  assert.match(libraryPage, /styles\.savedViews/)
  assert.match(libraryPage, /pageResult\.items\.map/)
  assert.match(libraryCss, /\.facetRail\s*\{/)
  assert.doesNotMatch(libraryCss, /\.searchWrapper\s*\{/)
})

test('CO-PO alignment keeps outcome rows uniform without stretching the table vertically', () => {
  const page = read('pages/lpsm/ProgramHead/CoPoAlignment.jsx')
  const tableCss = sass.compile(path.join(src, 'styles/AlignmentTables.module.sass')).css
  const workspaceCss = sass.compile(path.join(src, 'styles/ProgramHeadWorkspace.module.sass')).css

  assert.match(page, /className=\{`\$\{tbl\.alignTable\} \$\{tbl\.compactRows\}`\}/)
  assert.match(page, /className=\{`\$\{pageStyles\.tableRegion\} \$\{pageStyles\.compactTableRegion\}`\}/)
  assert.match(tableCss, /\.compactRows\s*\{[\s\S]*?min-height:\s*0\s*!important;[\s\S]*?height:\s*auto\s*!important;[\s\S]*?flex:\s*none;/)
  assert.match(tableCss, /\.compactRows tbody tr\s*\{[\s\S]*?height:\s*84px;/)
  assert.match(workspaceCss, /\.compactTableRegion\s*\{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?height:\s*auto;[\s\S]*?overflow-y:\s*hidden;/)
})

test('icon-only surface close controls share the outlined red treatment', () => {
  const globalCss = read('index.css')
  assert.match(globalCss, /button\.app-icon-close\.app-icon-close\s*\{[\s\S]*?width:\s*32px;[\s\S]*?min-width:\s*32px;[\s\S]*?max-width:\s*32px;[\s\S]*?height:\s*32px;[\s\S]*?min-height:\s*32px;[\s\S]*?max-height:\s*32px;[\s\S]*?aspect-ratio:\s*1;[\s\S]*?border:\s*1px solid #E81123 !important;[\s\S]*?border-radius:\s*7px;[\s\S]*?background:\s*#fff;[\s\S]*?color:\s*#E81123;/)
  assert.match(globalCss, /button\.app-icon-close\.app-icon-close:hover\s*\{[\s\S]*?background:\s*#FFF1F2;[\s\S]*?border-color:\s*#B91C1C !important;[\s\S]*?color:\s*#B91C1C;/)
  assert.match(globalCss, /button\.app-icon-close\.app-icon-close:focus-visible\s*\{[\s\S]*?outline:\s*3px solid rgba\(232, 17, 35, 0\.24\) !important;/)

  for (const file of [
    'components/AddReferenceModal.jsx',
    'components/ApprovalCommentBox.jsx',
    'components/ApprovalCoursesTable.jsx',
    'components/CoursesTable.jsx',
    'components/ILOs.jsx',
    'components/PDFViewerModal.jsx',
    'components/Revisions.jsx',
    'components/SpellCheckArea.jsx',
    'components/SyllabusPreview.jsx',
    'pages/DeanFaculty.jsx',
    'pages/ILOForm.jsx',
    'pages/ReferenceForm.jsx',
    'pages/TLAForm.jsx',
    'pages/TopicForm.jsx',
    'pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx',
  ]) {
    assert.match(read(file), /app-icon-close/, `${file} must use the shared close treatment`)
  }
})

test('reference library paginates filtered results using its responsive page size', () => {
  const page = read('pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx')
  assert.match(page, /paginateReferenceRecords\(sortedReferences, page, pageSize\)/)
  assert.match(page, /pageResult\.items\.map\(ref\s*=>/)
  assert.match(page, /aria-label="Previous page"/)
  assert.match(page, /aria-label="Next page"/)
  assert.match(page, /Showing \{pageResult\.start\}–\{pageResult\.end\} of \{pageResult\.total\}/)
  assert.match(page, /Page \{pageResult\.page\} of \{pageResult\.pageCount\}/)
})

test('reference library header uses the recovered subtitle space', () => {
  const page = read('pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx')
  const css = read('styles/ReferenceLibrary.module.scss')

  assert.doesNotMatch(page, /Discover, inspect, and maintain reference records\./)
  assert.match(css, /\.discoveryTop\s*\{[\s\S]*?padding:\s*10px 20px;/)
  assert.match(css, /\.searchForm\s*\{[\s\S]*?margin-top:\s*12px;/)
  assert.match(css, /\.savedViews\s*\{[\s\S]*?margin-top:\s*12px;/)
  assert.match(css, /\.pageTitle\s*\{[^}]*font-size:\s*24px;[^}]*font-weight:\s*600;/)
})

test('reference preview only shows close controls when they dismiss a compact overlay', () => {
  const page = read('pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx')
  const css = read('styles/ReferenceLibrary.module.scss')

  assert.match(page, /\{filtersOpen\s*&&\s*<button[^>]*styles\.drawerClose/)
  assert.match(css, /button\.previewClose\.previewClose\s*\{[^}]*display:\s*none;/)
  assert.match(css, /@media \(max-width:\s*1400px\)[\s\S]*?\.previewSheet button\.previewClose\.previewClose\s*\{[^}]*display:\s*inline-flex;/)
  assert.match(css, /@media \(max-width:\s*1400px\)[\s\S]*?\.previewSheet\s*\{[\s\S]*?bottom:\s*auto;[\s\S]*?max-height:\s*calc\(100dvh - 88px\);[\s\S]*?overflow-y:\s*auto;/)
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.previewSheet\s*\{[\s\S]*?top:\s*auto;[\s\S]*?right:\s*auto;[\s\S]*?bottom:\s*16px;[\s\S]*?left:\s*50%;[\s\S]*?width:\s*min\(420px, calc\(100vw - 32px\)\);[\s\S]*?height:\s*auto;[\s\S]*?max-height:\s*calc\(100dvh - 32px\);[\s\S]*?overflow-y:\s*auto;[\s\S]*?border-radius:\s*16px;[\s\S]*?transform:\s*translateX\(-50%\);/)
})

test('reference record titles and names use restrained font weights', () => {
  const css = read('styles/ReferenceLibrary.module.scss')
  assert.match(css, /\.refTitle\s*\{[^}]*font-weight:\s*400;/)
  assert.match(css, /\.previewTitle\s*\{[^}]*font-weight:\s*500;/)
  assert.match(css, /\.previewMetadata\s*\{[\s\S]*?dd\s*\{[^}]*font-weight:\s*400;/)
})
