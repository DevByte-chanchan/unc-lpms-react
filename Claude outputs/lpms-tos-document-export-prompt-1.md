# Prompt: OVPAA Learning Plan + TOS viewers: real documents in the official UNC form layout (ported from the Learning Plan export)

Paste everything below the line into your coding agent.

---

## Goal

On the OVPAA's **Table of Specifications** page (`src/pages/OVPAATOS.jsx` → `OVPAARepository.jsx` → `PDFViewerModal`), opening a TOS must show **real, generated documents**. They must look exactly like the Learning Plan / Syllabus export: same page size, same official header with the **original UNC seal**, same footer, same viewer (zoom, page x/y, print, **Download PDF**, fullscreen).

A TOS has **two documents**, shown as the viewer's two tabs:
1. **TOS Report:** the table of specifications (COs & ILOs × hours, %, points, cognitive levels).
2. **TOS Assessment:** the assessment items per CO / ILO (instruction, cognitive level, points), plus the attached questionnaire/rubric files.

Today both tabs open fixed sample PDFs (`/tos-report-sample.pdf`, `/tos-assessment-sample.pdf` from `src/data/mockApprovedSubmissions.js`), and the viewer is the old one.

**The OVPAA Learning Plan page must be updated the same way** (`src/pages/OVPAALearningPlan.jsx` → the same `OVPAARepository` + `PDFViewerModal`).
- **Today:**
  - it opens `/learning-plan-sample.pdf`, or for some rows the Mozilla sample PDF (`SAMPLE_PDF`), in the browser's own PDF toolbar;
  - there's a "File details" side panel.
- **After this change:** it opens the **generated syllabus** (14 pages for a typical course) in the **new viewer**, exactly like the reference screenshot (kicker "LEARNING PLAN · APPROVED", title, detail line, zoom, page x/y, print, Download PDF, fullscreen), with the **original seal**.

## Where the reference implementation lives

Branch **`feature/learning-plan-submissions-management-v2`** (latest commit `cb7ca87`, "approver review tools, e-signatures, COAEP export, comment fixes"), under `composition/client/src/`:

| File | What it gives you |
|---|---|
| `components/PDFViewerModal.jsx` + `styles/PDFViewerModal.module.sass` | The viewer in the reference screenshot: `PAGE_W 1247 × PAGE_H 816`, zoom, page counter from `.page` elements, print, fit/fullscreen, **Download PDF** via `jspdf` + `html2canvas` (one `.page` = one 330×216 mm PDF page), and joining `front_pdf` with `pdf-lib` |
| `utils/syllabusPdfHtml.js` | `pageHeader(logo)`, `pageFooter(pageNum,total)`, the document `<head>` CSS (`@page { size: 330mm 216mm }`, `.page` 330×216 mm with padding `42px 85px 32px 85px`, Arial 10 pt, black 1 px borders), and the **re-pagination script** (`REPAG_SCRIPT`) that measures rows and refills pages up to the footer and renumbers "Page No. x of y" |
| `utils/exportSyllabus.js` | The pattern: fetch data → build HTML → `Blob` → object URL → return a **PDFViewerModal file object** `{ file_url, file_name, title, course_id, course_name, period_label, … }` |
| `utils/formInfo.js` + `utils/formSettings.js` | `DEFAULT_FORM_INFO` (doc control no., revision no., effectivity per form) + loading them from the server |
| `utils/sanitize.js` | `escapeHtml`, `sanitizeUrl`; every value put into the HTML goes through these |
| `utils/useDialogFocus.js` | Focus trap used by the viewer |

**Get them without switching branches:**
```
git fetch origin feature/learning-plan-submissions-management-v2
git show origin/feature/learning-plan-submissions-management-v2:composition/client/src/components/PDFViewerModal.jsx > /tmp/PDFViewerModal.v2.jsx
```
Do the same for each file above. Then **port** them into this app's `src/`. Keep this app's import paths, its `react-feather` icons and its styling conventions.

- **Don't copy syllabus-only code:** no syllabus pages, signatures, comments or front pages.
- **Dependencies:** add `jspdf`, `html2canvas` and `pdf-lib` to the root `package.json` at the **same major versions** as the branch (`jspdf ^4`, `html2canvas ^1.4.1`, `pdf-lib ^1.17.1`) if they're missing.

## The documents must match the official forms

**Two official forms, same page and footer, different headers:**

| | Syllabus (Learning Plan) | **TOS** |
|---|---|---|
| **Template** | `Syllabus_TEMPLATE.docx` | **`TOS_ACT222L_FINALCASIMERO.docx`** (a real filled TOS, `ACT222L`) |
| **Doc. Control No.** | `UNC-FM-VPAA-01` | **`UNC-FM-VPAA-05`** |
| **Header lines (centered)** | **UNIVERSITY OF NUEVA CACERES** / **COURSE SYLLABUS** / Form / **OFFICE OF THE VICE PRESIDENT OF ACADEMIC AFFAIRS** (bold, upper case) | UNIVERSITY OF NUEVA CACERES / TABLE OF SPECIFICATION / Form / Office of the Vice President for Academic Affairs (**regular weight, exactly this casing, "SPECIFICATION" singular, "for"**) |
| **Right header cell** | "**Doc. Control No.:**" over the number | "Doc. Control No.:" (regular) over **UNC-FM-VPAA-05** (bold) |

**Shared by both:**
- **Page:** **landscape, 13 × 8.5 in (330 × 216 mm, long bond)**, 1-inch margins. Both templates use `w:w=18722 w:h=12242`. The HTML builder already uses 330×216 mm.
- **Header table:** 3 bordered cells: the seal (left, ≈80 px), the four centered lines (middle), and the doc-control cell (right, ≈120 px).
- **Footer** (every page, one line, spread across the width): `Effectivity: 06/01/2024` · `Revision No.: 0` · `Page No.: x of y`.
- **Font:** Arial throughout, black 1 px borders.

**`DEFAULT_FORM_INFO`:** add `tos: { docControlNo: 'UNC-FM-VPAA-05', revisionNo: '0', effectivity: '06/01/2024' }`, overridable from the form settings like the syllabus.

**`pageHeader(logo, form)`:** make it take a **form descriptor** (`{ lines: [...], titleWeight, docControlNo }`), so the syllabus header stays byte-for-byte as it is, and the TOS header follows the table above.

## The logo must be the original seal

- **Asset:** `src/assets/unc-seal-official.png` (312×303 px, transparent background) is **already in the project**. It's the exact image embedded in the Registrar's template (`word/media/image2.png`). Use it for the document header.
  - **Do not** use `unclogo.png`: it's a smaller re-crop (149×155).
  - **Do not** redraw, recolor, stretch or crop the seal. Keep its aspect ratio (`width:68px; height:auto`), and never use CSS filters on it.
- **Embed it as a data URL** (`data:image/png;base64,…`) inside the generated HTML. Don't link it by URL. This guarantees it shows:
  - in the blob-URL preview iframe;
  - when printing;
  - in the **Download PDF** (`html2canvas` can't read some cross-origin or blob-relative images, which leaves an empty box).

  Write a small helper, `src/utils/sealDataUrl.js`, that fetches the imported asset once, caches the data URL, and is awaited before building the HTML.
- **Applies to all three documents:** the Learning Plan (syllabus) export and both TOS documents. The ported `buildSyllabusHtml` must get the official seal's data URL, not `new URL(unclogo, …)` as in the v2 branch.

## 1. `src/utils/tosPdfHtml.js` (new)

Reuse the ported `pageHeader` / `pageFooter` / head CSS / `REPAG_SCRIPT`. Make the header take the form descriptor from the forms table above. That way the syllabus keeps its header unchanged and both share one function.

### `buildTosReportHtml(tos, logoDataUrl, { formInfo })`: copy the official TOS form exactly

Match **`TOS_ACT222L_FINALCASIMERO.docx`** element by element. The shot of the empty form shows the same layout.

**1. The details lines under the header** (no table, no borders; two groups, left and right):
- **Left:**
  - `Course:` then the value, e.g. **ACT222L - WEB DEVELOPMENT II** (code, " - ", title in upper case);
  - `Semester:` then **2ND SEMESTER**.
- **Right:**
  - the exam period as the form prints it: `____ Midterm ___/___ Final`, with the chosen period marked. Put a bold **✓** on the matching blank; the other stays blank.
  - `School Year` then **2024 - 2025**.
- **Missing value:** an underline (`______________`), like the empty form. Never "—".

**2. The TOS table:**

| Column | Header text (exact) |
|---|---|
| 1 | COs & ILOs |
| 2 | No of Hours or Class sessions |
| 3 | % |
| 4 | No. of Items/Tasks |
| 5–10 | **Cognitive Levels** (spans 6) → Remembering · Understanding · Applying · Analyzing · Evaluating · Creating |

- **Header:** two rows. Columns 1–4 merge vertically. Plain bold black text on white, no dark fill. **"Cognitive Levels" is bold.**
- **CO rows:** **light blue fill `#DEEAF6` across the whole row.**
  - Label: "CO2". Hours: the CO's total. **%: the CO's share of all hours, with a "%" sign** (15 of 40 → `37.5%`).
  - The other cells are empty.
- **ILO rows:**
  - **Label:** `ILO1:  ` followed by the **ILO's full description**, wrapping inside the cell.
  - **Hours:** the ILO's hours.
  - **% and No. of Items/Tasks:** as stored.
  - **Each cognitive-level cell:** the items for that level written as **`{count} X {points}PTS = {total}`**. Example: `3 X 5PTS = 15`.
  - **Mixed points in one cell:** if one cell has items worth different points, write one term per value, highest first, then the total: `2 X 5PTS + 1 X 3PTS = 13`.
- **Total row:** "Total" (right-aligned in column 1).
  - Total hours; `100%`; the total number of items.
  - For each cognitive level, **the total points** for that level (e.g. 30, 20, 50).
- **Blanks, not dashes or zeros:** **any value that is 0, empty or missing is an empty cell. Never print "—" or "0".** In the sample, Remembering, Analyzing and Evaluating are just empty. This applies to every cell, including the CO, ILO and Total rows.
- **Repeat the two header rows on each page** if the table breaks. Rows are never split; let the repaginate script move whole rows.

**3. The signature block** (below the table, two columns, no borders), exactly like the form:
- **Left:** `Prepared by:`, then the **faculty's name in bold upper case** (e.g. **DANNY BOY M. CASIMERO**), then `Date:` and the submitted date (e.g. **MAY 11, 2025**).
- **Right:** `Approved by:`, then the **Program Head's name** (e.g. **JUNE ARREB DANILA**), with the label "Program Head/Dean" when no name is known. Then `Date:` and the approval date.
- **Missing name or date:** the line stays blank. Never "—".

**4. No extra content:** no course-details table, no colours other than `#DEEAF6`, and no extra columns. The document must look like the Registrar's form, not like the app.

**5. Shared arithmetic: `src/utils/tosMath.js`** (pure functions, used by the export **and** by the TOS module's on-screen table):
- `groupLevelCell(items)` returns `{ terms: [{count, points}], total }` and builds the `3 X 5PTS = 15` string.
- `coShare(coHours, allHours)` returns the CO's percentage.
- `totals(...)` returns the Total row.
- `blankIfZero(v)` returns `''` for `0`, `null`, `undefined`, `''` and `NaN`.

**Also fix the on-screen TOS table** (the TOS module's `TosPreview.jsx` and its TOS summary/review tables): show **blank instead of "—" and "0"** there too, using `blankIfZero`. Make no other changes to that page.

### `buildTosAssessmentHtml(tos, logoDataUrl, { formInfo })`
- **Header and details lines:** the same official header and the same Course / Semester / Midterm–Final / School Year lines as the Report. Blanks are blank, never "—" or "0".
- **Then, for each CO → ILO** (in order), a grey section row "CO1 — <description>", then "ILO1 — <description>".
  - Under each, a table: **No. · Instruction / Question · Cognitive Level · Points · Span**.
  - The section ends with an **ILO subtotal**.
- **The end:** **Total points**, which must equal the Report's total.
- **Attached files** (questionnaire / rubric uploaded per ILO): list them as "Attachment: <file name> (<size>)" lines under the ILO.
  - **PDF attachments:** append the PDF's own pages **after** the generated pages when downloading, using `pdf-lib`. This is the same technique the syllabus uses for `front_pdf`; here it's `appendix_pdfs`.
  - **Non-PDF files** (`.docx` and similar): list them only.
- **Keep untrusted text as text:** escape all instruction text with `escapeHtml`. Show line breaks as `<br>`. Never insert user text as HTML.

## 2. `src/utils/exportTos.js` (new)

`buildTosExportFiles({ courseCode, period, logoDataUrl })` → **a PDFViewerModal file object** with two `documents`:
```js
{
  title: `Table of Specifications — ${code}`,
  course_id, course_name, period_label,
  file_name: `TOS_${code}_${period}.pdf`,
  documents: [
    { label: 'TOS Report',     file_url: <blob url of report html>,     file_name: `TOS-Report_${code}_${period}.pdf` },
    { label: 'TOS Assessment', file_url: <blob url of assessment html>, file_name: `TOS-Assessment_${code}_${period}.pdf`, appendix_pdfs: [...] },
  ],
}
```

**Data source**, in this order:
1. **The TOS API, if it's in this app** (from `feature/tos-management`):
   - `GET /api/courses/:code/outcomes` (COs, ILOs, hours, %, points);
   - `GET /api/courses/:code/:period/items` (assessment items: `iloId`, `instruction`, `points`, `span`, `cognitiveLevel`);
   - `GET /api/courses/:code/:period/status` (approved / submitted dates);
   - `GET /api/courses/:code/:period/attachments` (files).
2. **Otherwise,** build the same shape from `mockApprovedSubmissions.js`. Extend each TOS row with a small but **realistic** `tos` object: 2 COs, 2–3 ILOs each, items across several cognitive levels, totals that add up. That way the demo shows a filled document, not the sample PDF.

Remove the `/tos-report-sample.pdf` / `/tos-assessment-sample.pdf` references once the generated documents work. Keep the files in `public/` only if something else uses them.

- **Undo blob URLs:** revoke the documents' object URLs when the viewer closes.
- **Only approved TOSes:** export only TOSes whose status is **approved**, since this is the OVPAA approved repository. Otherwise throw "This TOS hasn't been approved yet."

## 2b. Learning Plan: `src/utils/exportLearningPlan.js` (new)

Port **`utils/syllabusPdfHtml.js` (`buildSyllabusHtml`) and `utils/exportSyllabus.js`** from the v2 branch as they are, except for:
- the shared header from §1 (title parameter);
- the seal helper.

**Don't rewrite the syllabus layout:** pages, tables, re-pagination and the approval block stay identical to the v2 export. The OVPAA copy is the same document the faculty, Program Head and Dean see.

`buildLearningPlanExportFile(row, logoDataUrl)` → a PDFViewerModal file object with **one** document:
```js
{
  kicker: 'LEARNING PLAN · APPROVED',
  title: row.file_name,                    // e.g. LP-ACC101-NAVARRO.pdf
  course_id, course_name, period_label, instructor_name,
  file_url: <blob url of the syllabus html>,
  file_name: row.file_name,                // the downloaded PDF's name
}
```

**Data source**, in this order:
1. **The Learning Plan API, if this app has it** (the v2 backend's endpoints that `exportSyllabus.js` calls: `/api/course-details/:key`, `/api/course-outcome-alignment/:key`, `/api/course-coverage/:key`, `/api/course-criteria/:key`, `/api/courses/:key/references`, `/api/assignments/offering/:pcId`, `…/signatures`). Call **`buildSyllabusExportFile`** directly, so the OVPAA gets the real approved plan.
2. **Otherwise (demo):** give each mock Learning Plan row in `mockApprovedSubmissions.js` a small but **realistic `syllabus` object** in the exact shape `buildSyllabusHtml` reads:
   - **Course details:** `code`, `name`, `description`, `credits`, `contact`, `prerequisites`, `class`, `cmo`, `year`, `sem`, `revision`, `instructor`, `sdg`;
   - **Outcomes and coverage:** `courseOutcomes` (2–3 COs with PO mappings), `ilos` (weekly rows), `topics`, `assessments`, `gradingSystem`;
   - **`references`.**

   Also give it an **approved** `workflow`: Program Head, Director of Libraries and Dean accepted, with dates matching the row's submitted/approved dates. Then call `buildSyllabusHtml(syllabus, code, workflow, logoDataUrl, { formInfo })`.
   - **Generate, don't copy:** a helper builds the mock syllabi from each row's course code and title, so each row shows its own course. Don't copy one fixed text into every row.
   - **Approved, so no watermark:** the "PENDING DEAN APPROVAL" watermark must never appear on the OVPAA page.

**Page 1 (University VMGO):** if this app has the OVPAA university statements (`/api/university-statements` active version), fill page 1's Vision, Mission, Educational Policy, Core Values and Graduate Attributes from it. Otherwise keep the v2 text. In both cases, escape every value.

**Remove the samples:** remove `LEARNING_PLAN_PDF`, `SAMPLE_PDF` (the Mozilla link) and `/learning-plan-sample.pdf` from the dataset once the generated plan works. **No row may load an outside URL.**

`OVPAARepository.jsx` picks the builder by `kind`:
- **"Learning Plan"** → `buildLearningPlanExportFile`;
- **TOS** → `buildTosExportFiles`.

The same spinner and error toast apply to both.

## 3. Viewer: `PDFViewerModal.jsx`

**Replace** this app's `src/components/PDFViewerModal.jsx` with the ported v2 viewer, and extend it for **tabs**:
- **Tabs:** when `file.documents` has more than one entry, show a tab switch ("TOS Report" | "TOS Assessment") in the header, left of the zoom controls, in the same pill style the TOS module uses.
  - **Switching tabs** loads that document into the iframe and resets the page to 1.
  - **Zoom** is kept when switching tabs.
- **Page counter, print and Download PDF act on the active tab.** **Download PDF** produces that document's PDF, named by its `file_name`, plus `appendix_pdfs` when present.
- **Download all (optional):** a small menu next to Download, **Download both (2 PDFs)**.
- **Header line:** the title and the line under it work as in the reference screenshot:
  - kicker: "TABLE OF SPECIFICATION · APPROVED";
  - title: "TOS BIT312L — Midterm";
  - detail line: "BIT312L — Integrative Programming and Technologies · THIRD YEAR — 1st Semester SY 2026-2027".
- **Single document** (the Learning Plan): no tabs. The header shows the `kicker` ("LEARNING PLAN · APPROVED"), the title (file name) and the detail line: "ACC 101 — Fundamentals of Accounting · NAVARRO, LUIS · 1st Semester 2026-2027".
- **The old "File details" side panel is removed.** Faculty, course, academic period and file name go in the header detail line. Submitted and approved dates go in a small "Submitted Nov 2 · Approved Nov 7" line under it. The page then gets the full width, like the reference screenshot.
- **No browser PDF toolbar:** only the app's own controls are visible.

`OVPAARepository.jsx` calls `buildTosExportFiles` when `kind` is the TOS. It shows a small spinner in the row's View button while building, and shows a clear error toast on failure. Never leave a blank viewer.

## 4. No errors: required checks before you finish

1. **Builds:** `npm run build` passes, and the browser console shows **no errors or React warnings** when you open, switch tabs, zoom, print, download and close the viewer.
2. **The seal:**
   - it shows in the preview, in the browser's print preview, **and** in the downloaded PDF;
   - it's sharp (the 312 px source scaled down), round and not stretched;
   - it's identical to the seal in `Syllabus_TEMPLATE.docx`.
3. **Pages:**
   - every page is 330×216 mm landscape, with the header on every page and the footer on every page;
   - "Page No. x of y" is correct for each document separately;
   - no table runs into the footer, and no row is cut in half.
4. **Downloaded PDF:**
   - **page counts** match the viewer's counter;
   - **text stays sharp:** use `html2canvas` scale ≥ 2, as the v2 viewer does;
   - **file name** is `TOS-Report_BIT312L_Midterm.pdf` / `TOS-Assessment_BIT312L_Midterm.pdf`.
5. **Totals:** the Report total points = the Assessment total points = the sum of item points. Each CO's % adds up to ≤ 100. Add unit tests for `tosMath.js` with a CO/ILO fixture.
6. **Safety:** an item instruction containing `<script>alert(1)</script>` shows as text in both preview and PDF, with no alert.
7. **TOS form fidelity:** the Report for `ACT222L` (2nd Semester, 2024–2025, Final), built from the same data as `TOS_ACT222L_FINALCASIMERO.docx`, matches it:
   - **header:** "TABLE OF SPECIFICATION", "Office of the Vice President for Academic Affairs", **UNC-FM-VPAA-05**;
   - **CO rows** are light blue with `37.5%` / `62.5%`;
   - **cells** read `3 X 5PTS = 15`, `1 X 5PTS = 5`, `2 X 5PTS = 10`;
   - **Total row** reads `40 · 100% · 20 · _ · 30 · 20 · _ · _ · 50`;
   - **signatures:** Prepared by DANNY BOY M. CASIMERO, MAY 11, 2025 / Approved by JUNE ARREB DANILA;
   - **no "—" and no "0"** anywhere, in the document or in the on-screen TOS table.
8. **Learning Plan on the OVPAA page:**
   - opening `LP-ACC101-NAVARRO.pdf` shows the generated syllabus in the new viewer, with page 1 = the UNIVERSITY VMGO table and the official header with the original seal;
   - the footer reads "Effectivity: 06/01/2024 · Revision No.: 0 · Page No.: 1 of N";
   - the last page has the approval block filled (approved);
   - there's no "PENDING DEAN APPROVAL" mark, and no request to an outside site;
   - **Download PDF** saves `LP-ACC101-NAVARRO.pdf`, with the same page count as the viewer.
   - **Every row** opens its own course (different code and title on page 4), with no sample PDF.
9. **Phone width:** the viewer is usable (zoom fits width), and nothing overflows sideways.

Finish with: the files ported and created, the new dependencies, and screenshots described for: Learning Plan page 1, TOS Report page 1, TOS Assessment page 1, and the first page of each downloaded PDF.
