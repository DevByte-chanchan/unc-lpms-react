# Prompt: VPAA uploads the school calendar (picture or PDF) and the term dates fill in automatically

Paste everything below the line into your coding agent.

---

## Goal

On the VPAA **Dashboard** (`src/pages/AcademicTerms.jsx`), the **Update Sem / Update Term** form and the **Edit** form get a **"Fill from school calendar"** button. The VPAA uploads the official academic calendar, a **PNG/JPG picture** or a **PDF**. The system:
1. **reads** it;
2. **pre-fills** these fields for the semester being created or edited: Start of Semester, End of Semester, Start of classes, Prelim exam, Midterm exam, Semi-final exam, Final exam;
3. **shows what it read next to the picture** so the VPAA can check and correct it;
4. **saves nothing** until the VPAA presses the form's normal **Save Sem / Save** button.

**Keep the file:** the uploaded calendar stays with the school year. The VPAA can reopen it later, and creating the next semester of the same school year can reuse it without uploading again.

The Program Head said in the interview: *"Tingnan sa school calendar… Picturan na lang"* ("check the school calendar… just take a picture of it").

## The real calendar (sample file, already in the project)

`sample-uploads/school_calendar_2026-2027.png` (also `server/tests/fixtures/school_calendar_2026-2027.png`). It's UNC's **ACADEMIC YEAR 2026-2027** calendar:
- **size:** a **640 × 360 px** picture (low resolution);
- **layout:** three blocks side by side, plus a "NO. OF SCHOOL DAYS" box on the left.

**Each block:**
- **title:** e.g. "FIRST SEMESTER SY 2026-2027";
- **a date-range line:** e.g. "July 20 to Nov 25, 2026";
- **two columns:** the **date** (no year) and the **event**.

**What has to be read from it:**

| Field | 1st Semester SY 2026-2027 | 2nd Semester SY 2026-2027 | Summer 2027 |
|---|---|---|---|
| Start of Semester | **2026-07-20** (block range, start) | **2026-12-09** | **2027-05-04** |
| End of Semester | **2026-11-25** (block range, end) | **2027-04-24** | **2027-06-14** |
| Start of classes ("First day of Classes") | **2026-07-20** | **2026-12-09** | **2027-05-04** |
| Prelim exam ("Prelim Examination") | **2026-08-20** (from "Aug 20, 22, 24-25") | **2027-01-15** (from "Jan 15-19") | none in the file (leave empty) |
| Midterm exam | **2026-09-25** ("Sept 25-29") | **2027-02-12** ("Feb 12-16") | **2027-05-22** ("May 22-25") |
| Semi-final exam | **2026-10-23** ("Oct 23-27") | **2027-03-12** ("Mar 12-16") | none (leave empty) |
| Final exam | **2026-11-21** ("Nov 21-25") | **2027-04-21** ("Final Examination (Undergrad)", Apr 21-24); see the rule for two finals | **2027-06-10** ("Jun 10-11,14") |

**The other rows** (enrollment, Orientation Week, Peñafrancia Fiesta, Wellness Break, College Days, grade deadlines, breaks) are **not** form fields. Keep them in the extracted result as **`events`** (date + text) so they show in the review panel. Don't save them anywhere else.

## Reading rules (put them in `server/utils/schoolCalendarParse.js`, pure and unit-tested)

**1. Find the block for the semester being created.**
- **Match the title:** `FIRST SEMESTER` → 1st, `SECOND SEMESTER` → 2nd, `SUMMER` → Summer. Use the school year from the title ("SY 2026-2027") or the main heading ("ACADEMIC YEAR 2026-2027").
- **Wrong year:** if the file's school year doesn't match the form's, warn: "This calendar is for 2025-2026; you're creating 2026-2027."

**2. Work out the year of each date.**
- **Dates have no year.** Use the block's range line ("Dec 9, 2026 to Apr 24, 2027"). A month at or after the range's start month gets the start year; a month before it gets the end year. So **Jan–Jun in the 2nd semester are 2027**.
- **Enrollment dates are before the range** (e.g. "Apr 15" for 1st semester). Work them out from the school year's first year. They only appear in `events`, so it's not critical.

**3. Parse the date text.**
- **Month names:** `Jul`, `Sept`, `Sep`, `April`, `May`…
- **Single days and ranges:** `Jul 20`, `Oct 23-27`, `Nov 26-Dec 7`, `Apr 26-May 3`.
- **Lists:** `Aug 20, 22, 24-25`, `Sept 11, 16-19, 21`, `Jun 10-11,14`.
- **Ranges like "May to Jun":** keep as text only.
- **Exam fields always take the first day.** The TOS deadline is 1 week **before the exam starts**.

**4. Match the events, ignoring case and extra spaces.** Use alternatives, because other years word them differently:

| Field | Event text that counts |
|---|---|
| Start of classes | first day of classes · opening of classes · start of classes · classes begin |
| Prelim exam | prelim examination(s) · preliminary exam(ination)s · prelims |
| Midterm exam | midterm examination(s) · midterm exam(s) · midterms |
| Semi-final exam | semi-final examination(s) · semifinal(s) · semi final exam |
| Final exam | final examination(s) · final exam(s) · finals |
| End of semester | the block's range end; **if there's no range line,** use "last day of classes" |
| Start of semester | the block's range start; **if there's no range line,** use start of classes |

**Two finals** (2nd semester: "Final Exam (Graduating)" Apr 12-15, and "Final Examination (Undergrad)" Apr 21-24):
- **Default:** use the **Undergrad** one (most students), and show both in the review.
- **Switching:** the VPAA can pick the other with one click.

**5. A field that isn't found stays empty,** marked "Not found in the calendar". Never guess. Summer has no prelim or semi-final; leave them empty, with no warning.

**6. Order check:** reuse `calendarOrderError` from `utils/schoolCalendar.js`. If the result is out of order, show the same message the form shows.

## Getting text out of the file (`server/services/schoolCalendarReader.js`)

The sample is a small, compressed **picture**. Plain OCR on 640×360 text is unreliable. So:

1. **PDF with real text:**
   - **Read it directly** with `pdfjs-dist` (already used for the Program of Study and VMGO), positioned text items grouped into lines. The text goes to the same parser.
   - **No text** (a scanned PDF): treat each page as an image (step 2).
2. **Picture (PNG/JPG/WEBP), or a scanned PDF page**, in this order:
   - **a. AI reader, if configured.** If `CALENDAR_AI_PROVIDER` and its key are set in `server/.env` (e.g. `GEMINI_API_KEY`, free tier):
     - **What's sent:** the image goes to the vision model, with a fixed instruction and a **strict JSON schema**: `{ schoolYear, blocks: [{ title, semester, rangeText, rows: [{ dateText, event }] }] }`. The model **only transcribes** the rows; it never decides fields or years.
     - **Parsing:** the transcribed rows go through the **same parser** (`schoolCalendarParse.js`), so the rules above stay in one place and are tested.
     - **Timeout and size:** 30 s timeout, at most 1 call per upload, and the image is resized to at most 2000 px on the longest side before sending.
   - **b. Otherwise, OCR on the server** with `tesseract.js` (free, offline, English):
     - **Prepare the image first** with `sharp`: upscale to **3× when the image is narrower than 1500 px**, convert to greyscale, raise the contrast, sharpen.
     - **Read it block by block:** use the three column regions so the blocks don't merge.
     - **Then the same parser.**
   - **c.** If neither finds a semester block, say: "Couldn't read the calendar. Upload a clearer picture or the PDF, or type the dates." The form stays usable.
3. **Confidence:** each filled field carries `source: 'ai' | 'ocr' | 'pdf'` and the text it came from (e.g. `"Sept 25-29 · Midterm Examination"`). The review panel shows that text next to the date.

**Add dependencies** to `server/package.json`: `tesseract.js` (^5) and `sharp` (^0.33). The English trained data is bundled or downloaded once at build time; it must work offline afterwards. **No AI key is required.** Without one, the OCR path is used.

## Storing the file

- **New table `school_calendars`** (model `schoolCalendar.js`; no foreign keys):

| Column | Meaning |
|---|---|
| `id` | |
| `school_year` | e.g. "2026-2027" |
| `sha256` | |
| `original_name` | |
| `mime` | |
| `size_bytes` | |
| `extracted` | JSON: the parser output for all blocks found |
| `uploaded_by_account_id` | |
| `createdAt` | |

- **Files:** saved as `server/storage/calendars/<sha256>.<ext>`.
  - **Same file uploaded again:** reuse the existing row.
  - **`db:fresh`:** empties the folder (keep `.gitkeep`).
  - **Git:** add the folder to `.gitignore`.
- **Saved at upload time**, before the term is saved, so the review can reopen it. A calendar that's never used is harmless.

## API (VPAA only, `requireRole('VPAA')`)

- **`POST /api/school-calendars`** (multipart `file`, `semester`, `school_year`):
  - **Accepted files:** PNG, JPG, WEBP or PDF, max 10 MB. Check the magic bytes, like `assertPdfMagic`, for images too.
  - **Returns:** `{ id, school_year, fields: { start_date, end_date, classes_start, prelim_exam, midterm_exam, semifinal_exam, final_exam }, sources: { <field>: { text, source } }, alternatives: { final_exam: [...] }, events: [...], warnings: [...], blocksFound: ['1st','2nd','Summer'] }`.
- **`GET /api/school-calendars?school_year=2026-2027`:** the latest calendar for that year, with `extracted` and `fields` for any `semester` passed as a query.
- **`GET /api/school-calendars/:id/file`:** streams the file inline (`X-Content-Type-Options: nosniff`, private cache). VPAA only: the calendar is shown in the dashboard.
- **Rate limit:** 10 uploads per hour per account (`utils/rateLimit.js`).

## UI (`AcademicTerms.jsx`: the Update Sem / Update Term form and the Edit form)

**The button**
- **Placement:** above the "Start of Semester / End of Semester" row, a secondary button **"Fill from school calendar"** (an upload icon), with a hint line: "Upload the official calendar (picture or PDF). You can check every date before saving."
- **When this school year already has a calendar:** the button reads **"Fill from the 2026-2027 calendar"**, with a small **"Upload a different one"** link. Creating the 2nd semester then needs no new upload.

**After upload: a review panel** opens as a modal over the form, in the existing `DialogShell` style:
- **Left:** the uploaded picture or PDF page, zoomable (click to zoom 2×, drag to pan). The **block for this semester is highlighted** when the reader knows its position; otherwise the whole image shows.
- **Right:** the seven fields, each row showing:
  - label, the date read (e.g. "Sept 25, 2026"), and the source text in grey ("Sept 25-29 · Midterm Examination");
  - a **"Not found"** tag in amber for empty ones;
  - for Final exam with two candidates, a small toggle: **Undergrad · Apr 21** | **Graduating · Apr 12**.
- **Under them:** a collapsible **"Other dates in this semester"** list (the `events`), read-only.
- **Warnings** at the top (wrong school year, order problem, low-confidence OCR).
- **Buttons:**
  - **Use these dates** fills the form fields and closes the panel;
  - **Cancel** leaves the form untouched.
- **In the form afterwards:** each filled field shows a small "from calendar" tag until it's edited by hand. The VPAA still presses **Save Sem** to save.

**Busy state:** while reading, the button shows a spinner with "Reading the calendar…". The AI path can take up to 30 s; show "This can take a few seconds" after 5 s.

**Errors:** a clear message under the button, never a crash:
- wrong file type;
- too big;
- unreadable;
- no matching semester block: "This calendar has no Second Semester block."

**The term card** (the expanded Current Term card): add a small **"View school calendar"** link under the School calendar timeline when a calendar exists for that school year. It opens the file in the existing viewer.

## Tests

**`server/tests/schoolCalendarParse.test.js`** (pure parser; feed it the transcribed rows of the sample, written by hand in a fixture `schoolCalendar2026Rows.js`):
1. **All values:** every value in the table above, for 1st, 2nd and Summer.
2. **Years:** "Jan 15-19" in the 2nd semester → **2027**-01-15; "Dec 9" → **2026**-12-09.
3. **Lists and ranges:** "Aug 20, 22, 24-25" → Aug 20. "Jun 10-11,14" → Jun 10. "Nov 26-Dec 7" parses as a range.
4. **Two finals:** the default is Undergrad (2027-04-21), and `alternatives.final_exam` includes Graduating (2027-04-12).
5. **Summer:** prelim and semi-final are empty, with no warning.
6. **Wording variants:** "Opening of Classes", "Preliminary Examinations", "Semifinals" and "Finals" are all recognised.
7. **School year:** a 2025-2026 calendar → the school-year warning.

**`server/tests/schoolCalendarReader.test.js`:**
1. **Picture, OCR path:** with `CALENDAR_AI_PROVIDER` unset, read `fixtures/school_calendar_2026-2027.png`:
   - for 1st Semester it must find at least **start of classes, midterm and final** correctly;
   - all 7 fields are the goal;
   - log which ones it misses, so the image preparation can be tuned.

   **Low-resolution note:** if fewer than 3 are found, don't fail the build. Mark the test as known-weak, and make sure the API returns `warnings` + empty fields, not wrong dates.
2. **AI path:** a mocked AI response (the transcribed rows) → the same fields as the parser test. **Never call a real API in tests.**
3. **A generated text PDF** with the same rows → all 7 fields exact.

**Endpoint:**
- non-VPAA → 403;
- a `.exe` renamed to `.png` → 400;
- re-uploading the same file reuses the row.

## Manual check

1. **No AI key, OCR path:** as Carlos Garcia (VPAA), go to Dashboard → **Update Sem** (or **Update Term** for a new school year) → **Fill from school calendar** → upload `sample-uploads/school_calendar_2026-2027.png`. The review shows the picture with the 1st Semester block, and the dates read.
   - **Correct** any wrong one by hand and press **Use these dates**. The form is filled, with "from calendar" tags.
   - **Save Sem.** The term card shows the dates, and **View school calendar** opens the picture.
2. **Next semester:** create the next semester (2nd Sem 2026-2027). The button reads **"Fill from the 2026-2027 calendar"**, and one click fills Dec 9, 2026 … Apr 24, 2027, with Final exam = Apr 21 (Undergrad).
3. **With an AI key:** set `CALENDAR_AI_PROVIDER=gemini` + `GEMINI_API_KEY` in `server/.env`, restart `ca-api`, and repeat step 1. All 7 fields are found.
4. **Bad files:** a PDF of the Program of Study gives "Couldn't read the calendar…", and the form is untouched.
5. `npm test` and `npm run build` pass, and there are no console errors.

Finish with: the files changed, the new dependencies, the fields read from the sample picture **with and without** the AI reader, and any it missed.
