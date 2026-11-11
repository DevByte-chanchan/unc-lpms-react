# Prompt: Program of Study: keep the PDFs readable, calculate the numbers, fix duplicated courses

Paste everything below the line into your coding agent. Run it **after** the Program of Study upload prompt (`lpms-program-of-study-upload-prompt.md`), because it builds on that upload.

---

## Problem

The Course Offerings upload reads the registrar's **Program of Study** PDFs, then deletes them. `uploadCourses` removes the temp files in `finally`, and `server/uploads/` is only a temp folder. Afterwards nobody can open the original to check a unit count, a prerequisite or the CMO, and the Program Head can't compare the preview against the PDF before importing.

## Goal

1. **Before importing:** in the upload preview, the Program Head can open each picked PDF next to the extracted rows.
2. **After importing:** the PDFs are **kept** and can be opened in the in-app viewer at any time from Course Offerings.
3. **Revisions:** each upload of a new revision is kept as a version; the latest is the current one.

## What exists (verified)

- **`src/components/PDFViewerModal.jsx`:** the in-app viewer, used by `OVPAARepository.jsx`.
  - It shows `file.file_url` in an `<iframe>`.
  - It shows tabs when `file.documents = [{ label, url }]`.
- **`middleware/upload.js`:** `uploadPdf` + `assertPdfMagic` (checks the `%PDF-` header).
- **`utils/freshStart.js`:** `db:fresh` empties `server/uploads/` and wipes the model tables.
- **VMGO uploads:** they store only the PDF's name and SHA-256, never the file. That's fine for VMGO, but this feature needs the file itself.

## Constraints

- **Database:** one **new** table; no changes to existing tables.
- **Storage location:** files go in **`server/storage/curriculum/`**, **not** `server/uploads/`, which is temporary.
  - Add `server/storage/` to `.gitignore`, keeping a `.gitkeep`.
  - Make sure the Docker setup keeps the folder: it's inside the already bind-mounted `server/` folder, so check that `docker-compose.yml` doesn't overlay it.
- **File names and access:**
  - **Never use the uploaded file name in a path:** store as `<sha256>.pdf`.
  - **Serve only through an authenticated endpoint,** never as a static folder.

## 1. New table: `curriculum_documents` (model `curriculumDocument.js`)

| Column | Meaning |
|---|---|
| `id` | |
| `program_id` | the program it belongs to (BSIT) |
| `period_id` (field `academic_period_id`) | the term it was uploaded in |
| `import_batch_id` | the Course Offerings import that saved it (for Undo) |
| `sha256` | 64 hex characters; it is also the stored file name |
| `original_name` | shown to users, sanitised and trimmed to 150 characters |
| `size_bytes`, `pages` | |
| `part_label` | e.g. "1st–2nd Year", from the year headings the parser found in this file |
| `program_name`, `cmo`, `effectivity`, `revision` | from the PDF header, as parsed |
| `uploaded_by_account_id` | |
| `status` | `active` · `superseded` · `removed` |
| `createdAt` | |

Index on (`program_id`, `status`). No foreign keys.

## 2. Saving the files: commit only

In `uploadCourses`, **PDF path**, after the commit succeeds (never on preview), for each uploaded PDF:
- **Hash and store the file:** compute its SHA-256 and copy it to `server/storage/curriculum/<sha256>.pdf`. If the file already exists, don't copy it again.
- **Create a `curriculum_documents` row:** `status: 'active'`, with `import_batch_id` = the batch id.
- **Older revisions:** mark the program's **other active** rows `superseded`.
  - **Same revision re-uploaded:** a row for an identical `sha256` + program is reused, not duplicated.
  - **Same revision, but a file for another year range:** it stays active next to its sibling. "Active" means the latest revision; all its parts stay active.
- **Then delete the temp files**, as now.

**Undo of that import:**
- Set this batch's rows to `removed`, and set the rows it superseded back to `active`.
- Delete a stored file only when **no** row still points at its `sha256`.

**`db:fresh`:** `freshStart` also empties `server/storage/curriculum/`, keeping `.gitkeep`. Add this to the purge summary.

## 3. API: `routes/curriculumDocuments.js`, behind `requireAuth`

- **`GET /api/curriculum-documents?program_id=`:** returns `{ active: [...], previous: [...] }`, newest first. Each item has the metadata above plus `uploaded_by_name` and `url: /api/curriculum-documents/:id/file`.
  - **Who:** any signed-in role. Faculty need the curriculum to write syllabi.
- **`GET /api/curriculum-documents/:id/file`:**
  - **Look up the file:** the row's `status` must not be `removed`. Resolve the path **only** from `sha256` (check it matches `/^[a-f0-9]{64}$/`).
  - **Stream it** with these headers:
    - `Content-Type: application/pdf`
    - `Content-Disposition: inline; filename="<sanitised original_name>"`
    - `X-Content-Type-Options: nosniff`
    - `Cache-Control: private, max-age=300`
  - **Missing file:** return 404 with "This PDF is no longer on the server."
- **`?download=1`:** switches to `attachment` so the browser downloads the file.

## 4. Client

### a. In the upload preview (before import)
- **Picked files:** list each picked PDF above the preview table: "📄 Rev-2-_BSIT-_-PROGRAM-OF-STUDY-1.pdf · 1st–2nd Year", with a **View** button.
- **View** opens `PDFViewerModal` on a local object URL (`URL.createObjectURL(file)`), so nothing is uploaded or stored yet.
  - Revoke the URL when the modal closes or the upload dialog resets.
  - With two files, open them as **tabs** (`documents`), so the Program Head can flip between years while checking the rows.

### b. On the Course Offerings page (after import)
- **Header chip** next to the page title, from `GET /api/curriculum-documents?program_id=`:
  > **Program of Study** · Rev 04 · CMO No. 25 S. 2015 · Effective 1st Sem SY 2022–2023 · **View**
- **View** opens `PDFViewerModal` with one tab per active part ("1st–2nd Year", "3rd–4th Year"), each loading its `url`.
  - The iframe uses the same origin and the session cookie, so no token goes in the URL.
- **In the modal header:** **Download** (uses `?download=1`), plus a **Previous versions** dropdown that lists superseded revisions with their dates. Picking one opens it the same way.
- **No document yet:** the chip reads "No Program of Study uploaded yet" and points to the upload button.

### c. From a course
- **In the course detail / edit drawer,** add a line: "Source: Program of Study Rev 04 · **1st–2nd Year** · View".
  - It opens the right part, using the course's year level → `part_label`.
  - Append `#page=1` to the iframe URL, since each part is one page today.
- **Courses added by hand or by Excel** show no Source line.

### d. Who else sees it
- **The Dean** (on the Dean's Programs page, per program) and **Instructors** (where they view their assigned course's details) get the same **View Program of Study** link.
- **VPAA:** nothing new is needed.

## 5. Readable on every screen

- **The viewer:**
  - **On phones,** the iframe fills the modal.
  - **If the browser can't show PDFs inline** (some mobile browsers), show a fallback inside the modal: "Can't preview here — **Open in new tab** · **Download**".
- **Text check on upload:** keep the parser's existing "scanned image" check. A PDF with no readable text is refused at upload, so every stored PDF also has real text that can be searched with Ctrl+F in the viewer.

## 6. Fix duplicated courses in Course Offerings

### The bug (screenshot: BSIT → 2nd Year, 1st Semester 2026–2027, "8 courses")
The 2nd-year list shows **old-code courses next to the real ones** for the same subject:

| Old leftover | Real course (from the Program of Study) |
|---|---|
| BIT201 Database Systems | BIT211L Database Management (Info Mgt) 1 |
| BIT202 Object-Oriented Programming | BIT213L Object-Oriented Programming |
| BIT205 Data Structures and Algorithms | BIT123L (1st year, **2nd** semester; it doesn't belong in this term at all) |

**Where they come from:**
- The old sample upload, the old seed data (`seedCurriculumIfEmpty`, now disabled in `index.js`) and manual adds used the old `BIT2xx` codes.
- `utils/curriculumClone.js` (`cloneCurriculumFromPriorPeriod`) copies each term's catalog into the next. Leftovers keep coming back every term.
- The upload only **upserts by `course_no`**, so a new code never replaces an old one.

**Other duplicate checks:**
- The same `course_no` appearing **twice** in one term.
- The same course linked twice to the same program (`program_course_offerings`).

### a. The PDF import reconciles the term (stops it happening again)
After parsing, the preview compares the PDF's selected-semester courses with the courses **already in this term for this program**. It lists every existing course that is **not in the Program of Study** in a new preview section, **"Not in the Program of Study"**. Each row has **Archive** or **Keep**.
- **Ticked "Archive" by default** when it matches an imported course:
  - its title matches an imported course's title (case- and punctuation-insensitive, ignoring a trailing "1/2/I/II" difference);
  - **or** the code exists in the PDF under a **different semester**.
  - It shows "Duplicate of BIT213L" or "Belongs to 1st Year · 2nd Semester".
- **Left on "Keep"** for anything else (e.g. a real course added by hand). It shows "Not in the curriculum — check it".

**On commit:**
- the ticked rows are **archived**, using the existing `archived` flag, so **View Archived** can restore them;
- the change is recorded in the same import batch, so **Undo** brings them back.

### b. Carry links over before archiving (nothing points at an archived duplicate)
For each archived **duplicate** with a matching kept course (same title or same code):
- **Course assignments** (`course_offering_assignments.course_id` / `course_code`), **consultant links** (`consultant_courses`) and **prerequisite rows** move to the kept course. Where a target link already exists, merge it instead of creating a second one.
- **Record each move** in the assignment history (§A1 of the tracking prompt, if built) with source `upload` and the note "Merged from BIT202".
- **If there's no matching kept course**, don't move anything: just archive. Its assignments then show **Unassigned** as they already do, so the Program Head sees them.

### c. Stop the clone and the upload from creating duplicates
- **`cloneCurriculumFromPriorPeriod`:**
  - skip `archived` courses;
  - skip a course whose `course_no` already exists in the target term.
- **`uploadCourses` (every path: PDF, Excel and Subject Offerings) and `createCourse`:**
  - inside one term, `course_no` is unique (compare upper-cased and trimmed). An existing row is **updated**, never duplicated.
  - **Manual add:** if the title matches another active course in the term, show a warning: "BIT213L — Object-Oriented Programming already exists. Add anyway?"
- **`program_course_offerings`:** keep the existing `findOrCreate` on (`course_id`, `program_id`). Add a check that a course is never linked twice.
- **Index:** add the composite index (`academic_period_id`, `course_no`) **only if** a cleanup pass (below) has removed all exact duplicates first. Otherwise just enforce it in code.

### d. One-time cleanup of what's already in the database
Add `npm run courses:dedupe` (`server/scripts/dedupeCourses.js`):
- **Dry run by default.** It prints, per term and program:
  - the exact `course_no` duplicates;
  - title duplicates (old code vs Program-of-Study code);
  - courses sitting in the wrong semester according to the stored curriculum.

  For each one it shows the proposed action (keep X, archive Y, move N assignments).
- **`--apply`:** runs the actions in a transaction, with the same link-moving as in b. It prints a summary.
- **Refuses** when `NODE_ENV=production`, unless `--force` is given.
- **Never deletes:** it only archives, so **View Archived** can restore anything.

## 7. Read the PDF and calculate the values it implies

The PDF gives LEC, LAB, TOTAL and Hrs/Week. Everything else is **calculated by the system**, never typed in. If the Program of Study upload already does part of this, keep it, and make sure every item below exists and is tested.

### a. One helper: `server/utils/courseNumbers.js`
Use it in the parser, the preview, the course cards, Course Assignment and later the syllabus module. No other place does this arithmetic.

`courseNumbers({ lec, lab, totalUnits, hrsPerWeek, nonCredit })` returns:

| Value | Formula | BIT213L (2 / 2 / 4 / 8) | BIT111L (2 / 1 / 3 / 5) |
|---|---|---|---|
| `credit_units` | `lec + lab` (0 when non-credit) | 4 | 3 |
| `lec_hrs_week` | `lec` (1 lecture unit = 1 hr/week) | 2 | 2 |
| `lab_hrs_week` | `hrsPerWeek − lec` | 6 | 3 |
| `hrs_per_lab_unit` | `lab_hrs_week / lab` (expected 3) | 3 | 3 |
| `contact_hrs_semester` | `hrsPerWeek × 18` | 144 | 90 |
| `lec_hrs_semester` / `lab_hrs_semester` | each weekly value × 18 | 36 / 108 | 36 / 54 |
| `instructional_hrs` | `hrsPerWeek × (18 − 2)` (the midterm and final exam weeks taken out) | 128 | 80 |

- **Constants:** `WEEKS_PER_SEMESTER = 18` and `EXAM_WEEKS = 2` live in `utils/courseCodeRules.js`. These come from the Program Head interview: "it should be always 18 weeks", with the midterm and final weeks set aside, e.g. 5 hrs × 16 = 80 hours.
- **`instructional_hrs` is the hour budget for the course's outcomes:** the syllabus/COAP module splits it across COs. Return it here so that module doesn't recalculate.
- **Non-credit courses** (SOCARTS `(2)`): `credit_units = 0`, but the **hours still count**, so the 2 hrs/week still go into the hour totals.
- **No-lab courses:** `lab_hrs_week = 0`, and `hrs_per_lab_unit` is null.

### b. Checks the system calculates and shows (preview warnings, never a hard stop)
- **Row total:** `lec + lab` must equal the PDF's TOTAL column for that row. If not: "BIT213L: 2 + 2 ≠ 5 in the PDF."
- **Lab-hour ratio:** `hrs_per_lab_unit` must be **3**. If not: "BIT-SPE3: 1 lab unit but 1 lab hour/week. Check the PDF." In the real file BIT-SPE3 shows 3 hrs/week for 2 LEC + 1 LAB, so this check catches it.
- **Lecture-only hours:** a course with no lab should have Hrs/Week = LEC. If not, warn: "NSTP1k: 3 units but 4 hrs/week". In the real file this flags NSTP1k, NSTP2k and SVA. These are info only, because the PDF is the authority: keep the PDF's hours, never "correct" them.
- **Semester totals:** the sums of LEC, LAB, TOTAL and Hrs/Week must equal that semester's `Total` row. Non-credit units count as 0, the same way the PDF counts them.
- **Year and program totals:** the totals per year level, plus the **program total vs `TOTAL NUMBER OF UNITS 153`** when both files are uploaded. If only one file is uploaded, say "Program total checked only when all years are uploaded."
- **Prerequisite codes:** every code in a prerequisite must exist in the PDF. A missing one gets a warning: "BIT222L lists PC, which isn't a BSIT course (General Education). OK." Known GE codes are only info.
- **Prerequisite order:** a prerequisite must come from an **earlier** semester. One from the same semester or later gets a warning.

### c. Where the calculated values show
- **Upload preview table:** Units `2 LEC + 1 LAB = 3` · Hours `5/wk · 90/sem` · Instructional `80 h`, with a small warning icon on a row that failed a check. The tooltip gives the reason.
- **Preview summary bar** for the selected semester: "17 courses · 52 units · 81 hrs/week". Under it, a per-year breakdown: "1st Year 3 courses · 9 units", and so on.
- **Course cards** (the grid in the screenshot): keep the `2 LEC, 1 LAB` chip, and add a second chip, **`3 units · 5 hrs/wk`**.
- **Course detail drawer:** a small "Numbers" block with every value from the table in a, each with a one-line explanation ("Contact hours per semester = 5 hrs/week × 18 weeks").
- **Year-level overview** (the page before "2nd Year"): show each level's total units and hrs/week next to its course count.

### d. Storage (no schema change)
- **Write** `credit` (`"2 LEC, 1 LAB"`) and `contact_hrs` (`"2 Hrs Lec, 3 Hrs Lab"`) in the fixed format, as now.
- **Read back:** `courseNumbers.fromCourse(course)` parses those two strings back into numbers, using the same format, so every page and the API can return a `numbers` object with each course. **Never store derived values.** Changing the 18-week constant then updates everything.
- **Old or free-text values that don't parse** (e.g. "3 units"): `numbers` is null, and the card shows only the raw chip.

## Tests (`server/tests/curriculumDocuments.test.js`)

1. **Saving:** commit an upload with both fixture PDFs.
   - 2 rows are `active`, with parts "1st–2nd Year" and "3rd–4th Year", Revision "04" and CMO "CMO No. 25 S. 2015".
   - 2 files are in `storage/curriculum/`.
   - **Preview alone stores nothing.**
2. **Re-uploading the same files:** no new rows and no new files.
3. **New revision:** upload a PDF with a different hash and the same program. The old rows become `superseded`, and `previous` lists them.
4. **Undo of the import:** the new rows become `removed`, and the superseded ones are `active` again. A file that nothing points at is deleted.
5. **`GET …/file`:**
   - returns `application/pdf` inline, and `?download=1` returns `attachment`;
   - without signing in: 401;
   - a `removed` row: 404.
6. **Path safety:** a tampered id or `sha256` can never read outside `storage/curriculum/`.
7. **`db:fresh`:** empties `storage/curriculum/`, keeping `.gitkeep`.
8. **Duplicates:** seed the term with BIT201 "Database Systems", BIT202 "Object-Oriented Programming" and BIT205 "Data Structures and Algorithms" (2nd year), plus an assignment on BIT202, then import the PDFs for 1st Semester.
   - **The preview** lists BIT201, BIT202 and BIT205 under "Not in the Program of Study", all ticked "Archive":
     - BIT201 and BIT202 as duplicates of BIT211L and BIT213L;
     - BIT205 as a 2nd-semester course.
   - **After commit:** they are archived, and the BIT202 assignment now points to BIT213L.
   - **Undo** restores everything.
9. **Clone:** creating the next term doesn't copy archived courses, and never creates a second row with the same `course_no`.
10. **Re-uploading an Excel row** with an existing code updates that course; it doesn't add a second one.
11. **`courses:dedupe`:** the dry run changes nothing; `--apply` archives the duplicates and moves their links. A second run finds nothing.
12. **Calculations, `courseNumbers`:**
    - BIT213L → 4 units, 6 lab hrs/wk, 144 hrs/sem, 128 instructional;
    - BIT111L → 3 / 3 / 90 / 80;
    - SOCARTS1 → 0 credit units, 2 hrs/wk, 36 hrs/sem;
    - GEE-LITE → 0 lab hours, `hrs_per_lab_unit` null;
    - `fromCourse()` gives back the same numbers from the stored strings.
13. **Calculated checks on the fixture PDFs:**
    - every semester total matches, and the program total is 153;
    - the lab-ratio warning appears for exactly the rows whose lab hours ≠ 3 × lab units (BIT-SPE3);
    - the lecture-only hours note appears for exactly NSTP1k, NSTP2k and SVA;
    - no prerequisite-order warnings for the real file.
14. **Preview summary for 1st Semester:** it shows the course count, the total units and the hrs/week of the ticked courses, with the per-year breakdown adding up to the total.
15. `npm test` and `npm run build` pass.

## Manual check

1. As the BSIT Program Head, open Course Offerings → Upload, and pick both PDFs. Click **View** in the preview: both years open as tabs, and nothing is saved yet.
2. **Confirm & Import.** The header chip shows "Program of Study · Rev 04 · CMO No. 25 S. 2015 · View". Clicking **View** shows both parts in the viewer. Ctrl+F "BIT213L" finds the row.
3. Open BIT213L's details. "Source: … 1st–2nd Year · View" opens the right part.
4. Run `docker restart ca-api`. The PDFs still open.
5. Press Undo right after an import. The chip goes back to the previous state.
6. Sign in as an Instructor with an assigned course. The **View Program of Study** link works.
7. **Cleanup:** run `docker exec ca-api npm run courses:dedupe`, read the dry run, then run it again with `-- --apply`. BSIT → 2nd Year for 1st Semester 2026–2027 now shows **BIT211L–BIT215L and PE3k (if ticked) only**: no BIT201, BIT202 or BIT205. **View Archived** lists them.

Finish with: the files changed, where the PDFs are stored, and the API response for the BSIT documents list.
