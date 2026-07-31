# BACKLOG

Survey of `composition/` on `feature/learning-plan-submissions-management-v2`. No code was
changed (`git diff` is empty). Findings were checked against the running server on port 5000
and a clean `cd client && npm run build`.

- [ ] **The CO & PO Alignment page can never show a real course — its dropdown is built only from static demo data, and none of those course codes exist in the database.**
      `client/src/pages/lpsm/ProgramHead/CoPoAlignment.jsx:26-38` (course list), `:95` (dropdown).
      `programs[0]` is always `BIT` and `getProgramCourses('BIT')` yields
      `BIT201, BIT301, BIT202, BIT304, BIT203` from `data/syllabiData.js`, while live
      `/api/assignments` returns `BIT313L, BIT213L, BIT321L, BIT312L, BIT311L, MATH311L`.
      The two sets are disjoint, so the Program Head cannot open CO-PO alignment for any
      course they actually approve. There is also no program selector, so BSCS/IT courses
      are unreachable. Sibling page `COAEPUpload.jsx:36-73` already sources its list from
      `/api/assignments`.
      *Fix:* load the course list from `/api/assignments` the way `COAEPUpload.jsx` does, and
      read the outcomes from `/api/course-outcome-alignment/${pcId}/${revNum}` (live
      `/1/1` → 200 with `courseOutcomes` + `programOutcomes`), keeping `getCoPoData` as the
      offline fallback.
      **RISK: RISKY** — changes which courses the page lists; CO-PO edits already saved under the demo codes become unreachable.

- [x] **The School Year and Semester filters on every approver/VPAA course table do nothing — the request never passes them and never refetches.**
      `client/src/components/ApprovalCoursesTable.jsx:302`/`:309` (the two selects),
      `:91-93` (`useEffect(..., [])`), `:181` (`fetchJson('/api/assignments')`, no query).
      The server already implements the filter (`server/controllers/assignmentController.js:6`,
      `:13-33`) and the option values match its expected format: live
      `/api/assignments` → 7 rows, `?year=2026&semester=1st%20Sem` → 6,
      `?year=2015&semester=1st%20Sem` → 0. The instructor's table does it correctly
      (`client/src/components/CoursesTable.jsx:95`, deps `[selectedYear, selectedSem]`), so the
      same two controls behave differently depending on which role you are logged in as.
      *Fix:* mirror `CoursesTable.jsx` — build the URL with `?year=&semester=` and add
      `[selectedYear, selectedSem]` to the effect's dependency array.
      **RISK: MEDIUM** — shared table used by Program Head, Dean, Director of Libraries, Industry Consultant and VPAA; it changes which rows they see.
      *Done:* `ApprovalCoursesTable.jsx:183` now builds `/api/assignments?year=&semester=` and the
      effect at `:91-94` depends on `[selectedYear, selectedSem]`, matching `CoursesTable.jsx:81-83,95`.
      Not verified by build or live request: in this environment `npm`/`node`/`curl` are not
      permitted, so `cd client && npm run build` and the port-5000 curl could not be run.

- [ ] **"Download PDF" never reaches the server's PDF renderer, so every export silently falls back to the raster (screenshot) path.**
      `client/src/components/PDFViewerModal.jsx:167`.
      The call is `fetch('/api/export-pdf', ...)` — an origin-relative URL — while every other
      request in the app goes through `fetchJson`/`API_BASE` (`client/src/utils/api.js`) and
      `client/vite.config.js` defines no dev proxy, so the request resolves against the Vite
      origin instead of port 5000. The backend route works today: live
      `POST http://127.0.0.1:5000/api/export-pdf` → `200 application/pdf`. Because the failure
      is swallowed by the `catch` at `:177`, the user just gets the html2canvas bitmap PDF.
      *Fix:* route the call through `fetchJson`/`API_BASE` like the rest of the client, keeping
      the existing in-browser fallback for when puppeteer is unavailable (501).
      **RISK: MEDIUM** — one fetch in a modal shared by seven pages; changes the bytes every export produces.

- [x] **An approver's comment can be saved against the wrong ILO — the CO → ILO dropdown never filters, because the two sides use different key formats.**
      `client/src/components/ApprovalCommentBox.jsx:563` (option value) and `:146`, `:574`
      (lookups); map built in `client/src/components/ApprovalSyllabusSections.jsx:683-693`.
      CO options carry `co.id` — live `/api/course-outcome-alignment/1/1` returns the numbers
      `1..4` — but the map is keyed `"CO1".."CO4"` from `ilo.id.split('-')[0]`, so every lookup
      misses and falls back to `resolvedIlos` (all ILOs in the course). Picking CO1 then an ILO
      owned by CO4 persists wrong, since `commentController.js:160-172` resolves CO/ILO
      positionally and lands the comment on CO1's second ILO.
      *Fix:* give the CO options the positional index so the option value, the map key and
      `co_index` all come from one numbering.
      **RISK: MEDIUM** — shared comment modal for every approver role; changes which ILO a comment attaches to.

- [x] **Comment Recorder can neither load ILOs nor save a comment — it calls two endpoints the server does not define.**
      `client/src/pages/CommentRecorder.jsx:73` and `:128`; routes in `server/routes/ilos.js:9`
      and `server/routes/comments.js:22`. Verified live: `GET /api/ilos/BIT213L` → 404 (the route
      is `/:pcId/:revNum`; `/api/ilos/1/1` → 200) and `POST /api/comments` → 404 (only
      `POST /by-course` exists). The ILO dropdown stays empty, `canSubmit` requires `iloId`, and
      both failures are swallowed into toasts.
      *Fix:* call `/api/ilos/${pc_offering_id}/${revision_number}` and POST to
      `/api/comments/by-course` with its real contract (`code`, `commenter_role`, `message`,
      `comment_for`, `target_titles`).
      **RISK: MEDIUM** — one file, but the page starts writing real comment rows.

- [x] **The COAEP page renders the plan but hides the button that opens it.**
      `client/src/pages/lpsm/ProgramHead/COAEPUpload.jsx:182`.
      *View COAEP* / *Delete* are gated on `coaepRecord` (set only by a manual in-app upload)
      while the table at `:202` renders `effectiveRecord`, which also covers the server COAEP.
      Live `/api/coaep/BIT213L` → 200 with 4 COs, so in the normal case the full table is on
      screen with no way to view, print or export it.
      *Fix:* gate *View COAEP* on `effectiveRecord` (`handleView:115` already keys off it); leave
      *Delete* on `coaepRecord`, since only a saved record can be deleted.
      **RISK: SAFE** — one render branch in one file.

- [ ] **COAEP records are stored under a different program key than every other alignment page, so a saved COAEP goes missing when the offline fallback runs.**
      `client/src/pages/lpsm/ProgramHead/COAEPUpload.jsx:58` vs `:28`,
      `CoPoAlignment.jsx:26`, `PoPeoAlignment.jsx:30`.
      COAEP sets `programCode` to the server `Program.name` ("Bachelor of Science in Information
      Technology"); the other pages use the short prefix from `getAllPrograms()` (`BIT`, `BSCS`,
      `IT`). Both key the same `lpms_curriculum_alignment_v1` store
      (`utils/programCurriculumData.js:152-163`), so one program gets two entries.
      *Fix:* derive `programCode` from the selected course code via
      `extractProgramPrefix(courseCode)` and use the long name for display only.
      **RISK: RISKY** — changes the storage key; records already saved under the long name are orphaned unless migrated.

- [x] **The VPAA dashboard re-renders every 2 seconds to compute two values it never displays.**
      `client/src/pages/VPAA.jsx:12-26`.
      `tick` drives a `setInterval` whose only consumers are `approvedCourses` and `stats`,
      neither of which appears in the JSX (`:28-38` renders only
      `<ApprovalCoursesTable role="vpaa" />`). Net effect is a permanent 2-second re-render of the
      page and the whole approvals table, plus a `syllabiData` scan per tick, for no visible
      output. `Package`, `Layers`, `Calendar` are unused for the same reason.
      *Fix:* delete `tick`, the interval, `approvedCourses`, `stats` and the three dead imports.
      **RISK: SAFE** — single page, dead code only.

- [ ] **The document viewer's "Course" field literally reads `undefined — undefined` on the three alignment pages.**
      `client/src/components/PDFViewerModal.jsx:354` concatenates
      `file.course_id + ' — ' + file.course_name`, so when both are missing the result is the
      truthy string `"undefined — undefined"` and `MetaRow`'s `value || '—'` guard never fires.
      `CoPoAlignment.jsx:58` and `PoPeoAlignment.jsx:50` pass only `{ name, file_url }`, and
      `COAEPUpload.jsx:122` passes no course fields either — all three show it.
      *Fix:* build the value conditionally (join the parts that exist, else pass `undefined` so
      the em-dash fallback applies).
      **RISK: SAFE** — one display expression.

- [ ] **`getProgram` in the approver table is dead code, and it hard-codes a program guess the app no longer uses.**
      `client/src/components/ApprovalCoursesTable.jsx:10-13`. `git grep getProgram` inside that
      file returns only the declaration — nothing calls it. It also maps any code not starting
      with `IT ` to "Computer Science", which is wrong for the live `BIT*`/`MATH*` codes.
      *Fix:* delete the function.
      **RISK: SAFE** — dead code in one file.
