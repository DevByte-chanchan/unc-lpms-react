# Course Assignment — System Requirements

## The VPAA needs to manage academic terms before any other module can be used.
- The system shall allow the VPAA to view the Current Term and Past Terms on a dashboard.
- The system shall allow the VPAA to create a new term by entering the year, semester, start of semester, end of semester, midterm deadline, and finals deadline.
- The system shall normalize every term label to a canonical ordinal form (e.g., "1st Semester SY 2027–2028") and re-apply it on each fetch.
- The system shall provide a context-aware shortcut that reads **Update Sem** during 1st semester (opening the next semester in the same school year) and **Update Term** during 2nd semester (opening a new school year).
- The system shall allow the VPAA to edit the dates of the current term.
- The system shall allow the VPAA to edit the dates and semester of the most recent past term.
- The system shall auto-close the prior current term when a new term is successfully created.
- The system shall auto-close an Active term when its end date has passed.

## The VPAA needs to maintain the department list per academic period.
- The system shall allow the VPAA to view the department list for the selected period.
- The system shall allow the VPAA to upload a list of departments via Excel/CSV — required headers: Name, Code, and Dean.
- The system shall allow the VPAA to add a single department manually.
- After an upload, the system shall present a Reconciliation Modal listing departments that exist in the period but were absent from the uploaded file.
- The system shall allow the VPAA to toggle each missing department to Unlisted, or click Keep Everything to leave them Active.
- The system shall allow the VPAA to view, edit, and archive individual department records.

### General bulk-upload behavior (applies to every upload in the system)
- **Before committing any bulk upload** — departments, faculty, programs, course offerings, industry consultants, and course assignments — the system shall present a **Preview & Confirm** step that shows exactly what the file contains, with each row marked valid, warning, or error, and shall write nothing until the user selects **Confirm & Import**.
- The system shall make each committed import reversible through a time-boxed **Undo** available immediately after the import.

## The VPAA needs to receive and monitor Learning Plan submissions across all departments per academic period.
- The system shall display a Submitted Learning Plan chart on the VPAA dashboard showing the number of Learning Plan submissions per department.
- The system shall scope all Learning Plan submission counts and listings to the currently selected academic period.
- The system shall allow the VPAA to open the Learning Plan page to view the list of submitted learning plans.
- The system shall allow the VPAA to view submitted learning plans filtered by department.
- The system shall present the Learning Plan listing in the same row-based format as the Assigned Courses page.
- The system shall allow the VPAA to open and view a selected Learning Plan inline in an in-app PDF viewer (view-only — the VPAA has no Learning Plan export).

## The VPAA needs to receive and monitor Table of Specifications (TOS) submissions across all departments per academic period.
- The system shall display a TOS chart on the VPAA dashboard showing the number of TOS submissions per department.
- The system shall scope all TOS submission counts and listings to the currently selected academic period.
- The system shall allow the VPAA to open the TOS page to view the list of submitted TOS.
- The system shall allow the VPAA to view submitted TOS filtered by department.
- The system shall present the TOS listing in the same row-based format as the Assigned Courses page.
- The system shall allow the VPAA to open a selected TOS inline in an in-app PDF viewer that presents its two documents — **TOS Report** and **TOS Assessment** — as tabs (view-only — the VPAA has no TOS export).

## The Dean needs to manage the faculty list for their department per academic period.
- The system shall allow the Dean to view the faculty list for the selected period.
- The system shall allow the Dean to upload the faculty list via Excel/CSV — required headers: Name and Role; optional: Department, Status, About, Sex, Birthdate, Email, and Contact Number.
- The system shall allow the Dean to add a single faculty member manually.
- The system shall allow the Dean to view detailed information about each faculty member via the Faculty Detail Modal.
- The system shall allow the Dean to filter the faculty list by role and search by name.
- The system shall allow the Dean to view, edit, and archive individual faculty records (Emeritus/Inactive route to Archive).

## The Dean needs to manage the program list for their department per academic period.
- The system shall allow the Dean to view the program list for the selected period.
- The system shall allow the Dean to upload the program list via Excel/CSV — required headers: Code, Name, and Program Head.
- The system shall resolve the program head against the period's faculty list using honorific-stripped matching (e.g., "Dr. Alan Turing" matches "Alan Turing"), considering only Active faculty eligible as heads, and mark unmatched heads with a red Unmatched tag.
- After an upload, the system shall present an Unmatched Review modal letting the Dean keep or remove each unmatched row.
- The system shall allow the Dean to add or edit a program using a searchable Program Head picker that lists **only Active faculty whose role is "Program Head"** (role shown as secondary text).
- The system shall allow the Dean to view, edit, and archive individual program records (Unlisted routes to Archive).

## The Program Head needs to manage the course offerings list per academic period.
- The system shall allow the Program Head to upload the course offerings list via Excel/CSV with flexible column matching — required content: Code and Course Name; optional: Credit (also matches "Units"), Contact Hours, Classification, CMO, Prerequisites, Year Level, and Program.
- The system shall validate the uploaded file before saving and reject it with an error message if no valid rows are found (e.g., missing Code or Course Name).
- During upload, the system shall infer each course's Year Level from its course code when the year level is not explicitly provided, and shall match the optional Program column against the period's program list (defaulting unmatched rows to the Program Head's current program).
- When some rows cannot be automatically resolved, the system shall present a review pop-up allowing the Program Head to set or correct the year level (and skip rows) before committing the upload.
- After the upload is committed, the system shall display a result summary showing the number of inserted and updated records and their distribution per year level and program.
- The system shall **not** carry over the previous term's course offerings; a new term starts with an empty offerings list, populated only from that term's own courses catalog and the Program Head's uploads.
- The system shall allow the Program Head to filter course offerings by term and year level and search live.
- The system shall allow the Program Head to view, edit, and archive individual course offering records.

## The Program Head needs to manage industry consultants and assign them to course offerings per academic period.
- The system shall allow the Program Head to view the industry consultants list for the selected period.
- The system shall allow the Program Head to upload the list of industry consultants via Excel/CSV — required header: Name; optional: Assigned Course.
- The system shall allow the Program Head to add a single industry consultant manually.
- During upload, the system shall resolve each assigned course code against the period's Course Offerings; unmatched codes shall be skipped and flagged with a warning.
- The system shall allow the Program Head to assign an industry consultant to one or more course offerings via a multi-select tag picker that groups courses by year level and excludes codes already held by other consultants (showing the current holder's name) while keeping the consultant's own codes selectable.
- The system shall update the assignable course list immediately when a Course Offerings file is uploaded.
- The system shall track consultant status (Active, Available) and manage status and course assignment from a single Manage modal.
- The system shall allow the Program Head to view, edit, and archive individual industry consultant records (Unavailable routes to Archive); legacy single-course records shall still render.

## The Program Head needs to manage the course assignment list per academic period.
- The system shall start each new term with a blank Course Assignment table.
- The system shall allow the Program Head to upload course assignments from the school's **teaching-assignment export** (Excel/CSV) or a flat course-assignments file (columns: Course ID/No., Course Name, Contributors, Year Level).
- From the teaching-assignment export — which lists every program's courses grouped by faculty — the system shall extract **only the courses belonging to the Program Head's own program** (matched by the program's course-code prefix, e.g., BSIT → BIT), merging a course's sections into one entry.
- On upload, the system shall bring each course's already-assigned faculty in as **Contributors** and shall leave the **Lead Faculty empty** — the uploaded file does not designate a Lead.
- The system shall let the Program Head **designate each course's Lead Faculty within the system**: in the Edit modal the Lead Faculty selector shall list **only that course's own Contributors** (plus the current Lead, if one is already set), so the Lead is always promoted from the people already teaching the course.
- The system shall allow the Program Head to manually add a course assignment by selecting a Course (year-grouped Course Offering picker that hides already-assigned codes), an optional single Lead Faculty (searchable dropdown bound to the period's Faculty), and an optional set of Contributors (co-teachers) via a multi-select.
- The system shall exclude the selected Lead Faculty from the Contributors options, and shall drop any contributor that duplicates the Lead — a faculty member cannot be both Lead and Contributor on the same course.
- The system shall sync the Course No. and Course Name selections — picking one auto-fills the other.
- The system shall display the Add Assignment button only after the table has at least one row.
- The system shall compute each assignment's status by mirroring the assigned Lead Faculty's status:
  - **Active** — course and Lead matched, Lead Active.
  - **On Leave** — matched, Lead On Leave (kept visible, flagged).
  - **Emeritus** — matched but Lead archived; the course stays available for reassignment.
  - **Unassigned** — no Lead designated yet, or the course/faculty was not found; kept visible in the main table for fixing.
  - **Archived** — manually removed via the Edit modal.
- The system shall re-validate every non-archived assignment on each page load, recomputing status and re-linking course/faculty against the current catalog and faculty list.
- The system shall provide an explicit Re-validate action that persists changes and returns a before/after summary.
- The system shall re-stamp the assignment date when an assignment's Lead Faculty is changed (the date reflects the Lead only, not contributors).
- After a committed upload, the system shall present an Upload Validation Review modal listing the inserted/replaced/skipped counts and per-row warnings (row, course, faculty, status, message) for every non-Active row.
- The system shall allow the Program Head to filter assignments by year level; search across course code/name and Lead Faculty name; view, edit, and archive individual course assignments; and manage each assignment's Contributors from the Add/Edit modals.
