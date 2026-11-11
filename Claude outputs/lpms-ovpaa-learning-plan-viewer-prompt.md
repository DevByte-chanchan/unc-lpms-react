# Prompt: OVPAA Learning Plan page: show the real generated syllabus in the new viewer

Paste everything below the line into your coding agent. This covers the **OVPAA Learning Plan page only**. Don't touch the TOS page.

---

## Problem

The OVPAA's **Learning Plan** page (`src/pages/OVPAALearningPlan.jsx` → `src/pages/OVPAARepository.jsx` → `src/components/PDFViewerModal.jsx`) doesn't show a real learning plan:
- **Sample files instead of the real plan:** every row opens a fixed sample: `/learning-plan-sample.pdf` (`LEARNING_PLAN_PDF`), or for some rows an **outside** demo PDF (`SAMPLE_PDF`, a mozilla.github.io link), from `src/data/mockApprovedSubmissions.js`.
- **The browser's PDF toolbar:** the PDF opens in the browser's own toolbar, with a **"File details"** side panel taking space.

## Goal

Opening an approved learning plan shows the **generated syllabus** (about 14 pages for a typical course). It must be identical to the export in the Learning Plan module, in that module's viewer:
- **Header:** kicker **"LEARNING PLAN · APPROVED"**, the file name as the title, and a detail line under it.
- **Controls:** zoom out / % / zoom in, fit, page **x / y** with previous/next, **print**, **Download PDF**, fullscreen, close.
- **The document:** pages in the official UNC form layout with the **original seal**.

## Reference implementation: branch `feature/learning-plan-submissions-management-v2`

Use the latest commit (`cb7ca87` or newer), under `composition/client/src/`:

| File | Use |
|---|---|
| `components/PDFViewerModal.jsx` + `styles/PDFViewerModal.module.sass` | The new viewer: `PAGE_W 1247 × PAGE_H 816`; page counter from `.page` elements; print; **Download PDF** via `jspdf` + `html2canvas` (one `.page` = one 330×216 mm PDF page); `front_pdf` joined with `pdf-lib` |
| `utils/syllabusPdfHtml.js` | `buildSyllabusHtml(syllabus, code, workflow, logo, { formInfo, programAlignment, pendingApproval, frontPdfPages })`: all syllabus pages, header, footer, page CSS (`@page 330mm 216mm`) and the re-pagination script |
| `utils/exportSyllabus.js` | `buildSyllabusExportFile({ pcId, revNum, code, workflow, logoUrl })`: fetches the plan, builds the HTML, returns a viewer file object |
| `utils/formInfo.js`, `utils/formSettings.js` | `DEFAULT_FORM_INFO.syllabus` = `UNC-FM-VPAA-01`, revision 0, effectivity 06/01/2024, and loading it from the server |
| `utils/sanitize.js` | `escapeHtml`, `sanitizeUrl` |
| `utils/useDialogFocus.js` | The viewer's focus trap |
| Small helpers `syllabusPdfHtml.js` / `exportSyllabus.js` import (`offeringKey`, `workflowFromLogs`, `reviewGate`, `weeklyCoverage`, `frontPages`, `programAlignment`, `reviewRecordHtml`, …) | Port only what's needed to build and run |

**Get them without switching branches:**
```
git fetch origin feature/learning-plan-submissions-management-v2
git show origin/feature/learning-plan-submissions-management-v2:composition/client/src/utils/syllabusPdfHtml.js > /tmp/syllabusPdfHtml.v2.js
```
Do the same for each file. Then port them into this app's `src/`, using this app's import paths and its `react-feather` icons.
- **Don't change the syllabus layout:** pages, tables, re-pagination and the approval block stay exactly as in v2.
- **Dependencies:** add `jspdf ^4`, `html2canvas ^1.4.1` and `pdf-lib ^1.17.1` to the root `package.json` if they're missing.

## The official form layout (from the Registrar's `Syllabus_TEMPLATE.docx`)

It's already what `syllabusPdfHtml.js` produces. Keep it:
- **Page:** landscape **13 × 8.5 in (330 × 216 mm, long bond)**.
- **Header on every page** (bordered three-cell table):
  - **left:** seal;
  - **middle:** **UNIVERSITY OF NUEVA CACERES / COURSE SYLLABUS / Form / OFFICE OF THE VICE PRESIDENT OF ACADEMIC AFFAIRS**;
  - **right:** **Doc. Control No.: UNC-FM-VPAA-01**.
- **Footer on every page:** `Effectivity: 06/01/2024` · `Revision No.: 0` · `Page No.: x of y`.
- **Typography:** Arial; black 1 px borders; grey `#bfbfbf` section rows.

## The logo must be the original seal

- **Asset:** `src/assets/unc-seal-official.png` (312×303 px, transparent) is already in the project. It's the exact image embedded in `Syllabus_TEMPLATE.docx`.
  - **Use it instead of `unclogo.png`** (a smaller 149×155 re-crop) in the document header.
  - **Never** stretch, crop, recolor or filter it: `width:68px; height:auto`.
- **Embed it as a data URL** (`data:image/png;base64,…`). The v2 code passes `new URL(unclogo, window.location.origin).href`; replace that here, so the seal appears in the preview iframe, in print **and** in the downloaded PDF. (`html2canvas` can leave an empty box for images it can't read.)
  - Add `src/utils/sealDataUrl.js`, which fetches the imported asset once and caches the data URL. `await` it before building the HTML.

## 1. `src/utils/exportLearningPlan.js` (new)

`buildLearningPlanExportFile(row)` → a viewer file object:
```js
{
  kicker: 'LEARNING PLAN · APPROVED',
  title: row.file_name,                      // LP-ACC101-NAVARRO.pdf
  file_name: row.file_name,                  // the downloaded PDF's name
  file_url: <blob URL of the syllabus HTML>,
  course_id: row.course_code, course_name: row.course_name,
  instructor_name: row.faculty_name, period_label: row.period_label,
  submission_date: row.date_submitted, approved_date: row.date_approved,
}
```

**Where the data comes from**, in this order:
1. **The real Learning Plan API,** if this app has the v2 backend's endpoints (`/api/course-details/:key`, `/api/course-outcome-alignment/:key`, `/api/course-coverage/:key`, `/api/course-criteria/:key`, `/api/courses/:key/references`, `/api/assignments/offering/:pcId`, `…/signatures`). Call the ported `buildSyllabusExportFile` with the seal data URL.
2. **Otherwise (demo):** each mock Learning Plan row gets a **realistic `syllabus` object**, in exactly the shape `buildSyllabusHtml` reads:
   - **Course details:** `code`, `name`, `description`, `credits`, `contact`, `prerequisites`, `class`, `cmo`, `year`, `sem`, `revision`, `instructor`, `sdg`;
   - **Outcomes and coverage:** `courseOutcomes` (2–3 COs with PO mappings), `ilos` (weekly rows covering 18 weeks), `topics`, `assessments`, `gradingSystem`;
   - **`references`.**

   It also gets an **approved `workflow`**: Program Head, Director of Libraries and Dean accepted, with dates matching the row's submitted and approved dates.
   - **One helper generates them** (`src/data/mockSyllabi.js`) from each row's course code, title and faculty, so **every row shows its own course**. No single copied text.
   - **Call:** `buildSyllabusHtml(syllabus, code, workflow, sealDataUrl, { formInfo })`.
   - **No watermark:** the **"PENDING DEAN APPROVAL" watermark must never appear** on this page. These plans are approved.

**Page 1 (University VMGO):** if this app has the OVPAA university statements (the active version from `/api/university-statements`), fill Vision, Mission, Educational Policy, Core Values and Graduate Attributes from it. Otherwise keep the v2 text. Escape every value with `escapeHtml`.

**Clean-up:**
- **Remove the samples:** remove `LEARNING_PLAN_PDF`, `SAMPLE_PDF` and every `file_url` pointing at a sample from the Learning Plan rows. Delete `public/learning-plan-sample.pdf` if nothing else uses it.
- **No outside requests:** no row may load anything from another website.
- **Revoke blob URLs** when the viewer closes.

## 2. Viewer: port the v2 `PDFViewerModal`

Replace `src/components/PDFViewerModal.jsx` with the ported v2 viewer:
- **Header:**
  - kicker (`file.kicker`);
  - title (`file.title`);
  - the detail line: "**ACC 101 — Fundamentals of Accounting** · NAVARRO, LUIS · 1st Semester 2026-2027";
  - a second small line: "Submitted Nov 2, 2026 · Approved Nov 7, 2026".
- **Remove the "File details" side panel.** The document gets the full width.
- **Only the app's own controls,** never the browser's PDF toolbar.
- **Download PDF** saves `file.file_name` (e.g. `LP-ACC101-NAVARRO.pdf`), with the same number of pages as the viewer shows.
- **Keyboard:** Esc closes (or leaves fullscreen first); the focus trap works.
- **Other users of the viewer:** check every other caller still renders correctly. **Don't change the TOS page in this task.** If it relies on the old viewer's `documents` tabs, keep that working with a simple tab switch.

In `OVPAARepository.jsx`, when `kind === 'Learning Plan'`:
- the row's **View** button calls `buildLearningPlanExportFile(row)` and shows a small spinner on that button while it builds;
- it opens the viewer when ready;
- on failure it shows an error toast ("Couldn't open this learning plan: …"), never a blank viewer.

## 3. Checks before you finish (no errors)

1. **Build and console:** `npm run build` passes. The console shows **no errors or warnings** while you open a plan, zoom, change pages, print, download, go fullscreen and close it.
2. **Opening `LP-ACC101-NAVARRO.pdf`** shows the generated syllabus in the new viewer:
   - **page 1** is the **UNIVERSITY** table (Vision, Mission, Educational Policy, Core Values, Graduate Attributes);
   - **later pages** have the course details, outcomes, weekly coverage, references, and the **approval block filled in** on the last page.
3. **The seal:**
   - it's in the header of **every** page, in print preview, and in the downloaded PDF;
   - it's sharp, round and unstretched;
   - it's identical to the seal in `Syllabus_TEMPLATE.docx`.
4. **Pages:**
   - every page is 330×216 mm landscape;
   - the header and footer are on every page;
   - "Page No. x of y" is correct;
   - no table runs into the footer, and no row is cut in half.
5. **Every row** in the table opens **its own course**: a different code and title, and a different faculty name in the approval block. **No sample PDF, no mozilla.github.io request** (check the Network tab).
6. **No "PENDING DEAN APPROVAL"** anywhere on this page.
7. **Safety:** a course description containing `<script>alert(1)</script>` shows as text, with no alert.
8. **The downloaded PDF** is named after the row, its page count matches the viewer, and its text is sharp (`html2canvas` scale ≥ 2).
9. **Phone width:** the viewer fits the width, and nothing overflows sideways.

Finish with: the files ported and created, any new dependencies, and a short description of page 1 and the last page of `LP-ACC101-NAVARRO.pdf`.
