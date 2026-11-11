# Prompt: OVPAA TOS viewer: real documents in the official UNC form layout (ported from the Learning Plan export)

Paste everything below the line into your coding agent.

---

## Goal

On the OVPAA's **Table of Specifications** page (`src/pages/OVPAATOS.jsx` → `OVPAARepository.jsx` → `PDFViewerModal`), opening a TOS must show **real, generated documents**. They must look exactly like the Learning Plan / Syllabus export: same page size, same official header with the **original UNC seal**, same footer, same viewer (zoom, page x/y, print, **Download PDF**, fullscreen).

A TOS has **two documents**, shown as the viewer's two tabs:
1. **TOS Report:** the table of specifications (COs & ILOs × hours, %, points, cognitive levels).
2. **TOS Assessment:** the assessment items per CO / ILO (instruction, cognitive level, points), plus the attached questionnaire/rubric files.

Today both tabs open fixed sample PDFs (`/tos-report-sample.pdf`, `/tos-assessment-sample.pdf` from `src/data/mockApprovedSubmissions.js`), and the viewer is the old one.

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

## The document must match the official form

The reference is the Registrar's **`Syllabus_TEMPLATE.docx`** (the user has it):
- **Page:** **landscape, 13 × 8.5 in (330 × 216 mm, long bond)**, 1-inch margins. The HTML builder already uses 330×216 mm. Keep it.
- **Header** (on every page; a three-cell bordered table):

| Left cell (≈80 px) | Middle (centered) | Right cell (≈120 px) |
|---|---|---|
| **UNC seal**, 68×68 px | **UNIVERSITY OF NUEVA CACERES** (bold) / **TABLE OF SPECIFICATIONS** (bold) / Form / **OFFICE OF THE VICE PRESIDENT OF ACADEMIC AFFAIRS** (bold) | **Doc. Control No.:** / the TOS form's number |

- **Footer** (on every page, one line): `Effectivity: …` · `Revision No.: …` · `Page No.: x of y`.
- **Typography:** Arial; 10–10.5 pt body; black 1 px table borders; grey (`#bfbfbf`) section heading rows; dark (`#404040`) table heads with white text. These are the same values `syllabusPdfHtml.js` uses.

**The TOS form identity:**
- Add a `tos` entry to `DEFAULT_FORM_INFO`: `{ docControlNo: '', revisionNo: '0', effectivity: '06/01/2024' }`.
- **Do not invent a document control number.** Syllabus is `UNC-FM-VPAA-01` and COAEP is `UNC-FM-VPAA-02`, but the TOS number must come from the VPAA/Registrar.
- **When it's empty,** the header shows a blank value (not "—" and not a made-up code). Load it from the form settings the same way as the syllabus. Leave `// TODO: set the official TOS Doc. Control No.` where the default is.

## The logo must be the original seal

- **Asset:** `src/assets/unc-seal-official.png` (312×303 px, transparent background) is **already in the project**. It's the exact image embedded in the Registrar's template (`word/media/image2.png`). Use it for the document header.
  - **Do not** use `unclogo.png`: it's a smaller re-crop (149×155).
  - **Do not** redraw, recolor, stretch or crop the seal. Keep its aspect ratio (`width:68px; height:auto`), and never use CSS filters on it.
- **Embed it as a data URL** (`data:image/png;base64,…`) inside the generated HTML. Don't link it by URL. This guarantees it shows:
  - in the blob-URL preview iframe;
  - when printing;
  - in the **Download PDF** (`html2canvas` can't read some cross-origin or blob-relative images, which leaves an empty box).

  Write a small helper, `src/utils/sealDataUrl.js`, that fetches the imported asset once, caches the data URL, and is awaited before building the HTML.
- **Applies to both TOS documents.** (Optional, separate commit: switch the syllabus export to the same helper if it's ported here too.)

## 1. `src/utils/tosPdfHtml.js` (new)

Reuse the ported `pageHeader` / `pageFooter` / head CSS / `REPAG_SCRIPT`. Make the header title a parameter: `pageHeader(logo, 'TABLE OF SPECIFICATIONS', form)`. That way the syllabus keeps "COURSE SYLLABUS" and both share one function.

### `buildTosReportHtml(tos, logoDataUrl, { formInfo })`
**Page 1 starts with a course details table** (two columns, label cells bold):
- Course Code & Title;
- Program;
- Year Level;
- Semester and School Year;
- Exam Period (Midterm / Finals);
- Assessment Name;
- Faculty (Lead);
- Date Submitted;
- Date Approved (Dean).

**Then the TOS table**, with exactly the columns of the TOS module's `TosPreview.jsx`:

| COs & ILOs | No. of Hours | % | Points | Remembering | Understanding | Applying | Analyzing | Evaluating | Creating |
|---|---|---|---|---|---|---|---|---|---|

- **"Cognitive Levels" spans the 6 level columns** in a two-row header.
- **CO rows** are bold on a light grey background, with the CO's totals.
- **ILO rows** are indented under their CO. Each shows the sum of item points per cognitive level, with **"—" for 0**.
- **Last row:** **Total** (hours, % capped at 100, points, the points per level).
- **Use the same arithmetic as `TosPreview.jsx`** (`getAggregatedData`). Put it in a shared pure function, `src/utils/tosMath.js`, so the preview and the export can never disagree.
- **Repeat the table header** on every page when it breaks. Let the repaginate script move whole rows (never split a row).

**A signature block on the last page:** **Prepared by** (Lead Faculty), **Checked by** (Program Head), **Approved by** (Dean). Each has its name and the date of that step from the TOS status/history. If a step hasn't happened, leave the line blank.

### `buildTosAssessmentHtml(tos, logoDataUrl, { formInfo })`
- **Course details:** the same table as the Report.
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

## 3. Viewer: `PDFViewerModal.jsx`

**Replace** this app's `src/components/PDFViewerModal.jsx` with the ported v2 viewer, and extend it for **tabs**:
- **Tabs:** when `file.documents` has more than one entry, show a tab switch ("TOS Report" | "TOS Assessment") in the header, left of the zoom controls, in the same pill style the TOS module uses.
  - **Switching tabs** loads that document into the iframe and resets the page to 1.
  - **Zoom** is kept when switching tabs.
- **Page counter, print and Download PDF act on the active tab.** **Download PDF** produces that document's PDF, named by its `file_name`, plus `appendix_pdfs` when present.
- **Download all (optional):** a small menu next to Download, **Download both (2 PDFs)**.
- **Header line:** the title and the line under it work as in the reference screenshot:
  - kicker: "TABLE OF SPECIFICATIONS";
  - title: "TOS BIT312L — Midterm";
  - detail line: "BIT312L — Integrative Programming and Technologies · THIRD YEAR — 1st Semester SY 2026-2027".
- **Single document:** still works as before, so the Learning Plan page is unchanged.

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
7. **Missing TOS doc control number:** the header cell shows only "Doc. Control No.:", with no error and no fake number.
8. **The Learning Plan viewer still works exactly as before** (single document, no tabs).
9. **Phone width:** the viewer is usable (zoom fits width), and nothing overflows sideways.

Finish with: the files ported and created, the new dependencies, and screenshots described for: TOS Report page 1, TOS Assessment page 1, and the downloaded PDF's first page.
