# BACKLOG — Edrian's module

Source: pre-oral panel, verdict **accepted with minor revision**. Timestamps
in `[mm:ss]` point at the transcript line that triggered the item.

**These items were written by a human, not found by a survey.** Do not delete,
reword or reorder them. Tick them as they are done and add new findings below
the line at the bottom.

Scope: Reference Library · Review & Approval Workflow · Status Tracking ·
Notifications · Comments.

---

## Reference Library

- [x] **The "All" reference filter mixes types and confuses the user.**
      Reference type filter in the reference picker.
      *Fix:* remove "All"; Textbook shows only textbooks, OER only OER, OR only OR. [15:02]–[16:04]
      **RISK: SAFE** — one filter control.
      *Done:* `client/src/components/ReferencePicker.jsx` — dropped "All" from `types`, the
      picker now opens on Textbook, and the type filter is unconditional so every tab shows
      only its own type. Contained to that one file: the sole consumer
      (`ReferenceForm.jsx:286`) passes no filter-related prop, so the component API is
      unchanged.
      *Checked:* the three tab labels map onto the server's stored vocabulary through
      `normalizeTypeKey` — `TEXTBOOK`→textbook, `OER`→open educational resources,
      `ONLINE`→online resources — the same oer/open → online → else mapping the server
      itself uses in `server/controllers/referenceSummaryController.js:72`–`:79`. Both
      servers are listening (5000 and 5173, confirmed with `ss -ltnp`).
      *Also checked (the previously unrun steps):* `npm run build` in `client/` passes, and
      the backend is live (`/api/assignments` and `/api/references` both HTTP 200). All 160
      rows on `GET /api/references` carry exactly `TEXTBOOK` (50) / `OER` (58) / `ONLINE`
      (52) — no blank or off-vocabulary type — so removing "All" strands no reference. That
      also settles the open question in the last survey finding below the line.

- [ ] **Reference results are not sorted.**
      *Fix:* sort A–Z by title by default. [11:12]
      **RISK: SAFE** — display order only.

- [ ] **No recency window on references; outdated titles appear.**
      *Fix:* exclude or flag titles outside the last 5 years. Read the window
      from configuration (default 2021–2025); do not hard-code the years. [10:55]
      **RISK: SAFE** — a filter plus one setting.

- [ ] **References are not scoped to the course, so a programming course can list "Understanding the Self".**
      *Fix:* filter results by the current course before display. [13:25] [16:13]
      **RISK: MEDIUM** — touches the query the picker depends on.

- [ ] **Faculty must type references by hand; nothing is suggested.**
      *Fix:* given a subject and topic, return matched references automatically. [10:28] [13:07]
      **RISK: MEDIUM** — new retrieval path.

- [ ] **A chapter can be listed as if it were a book — "UX Design Principles is not a book, it's only a chapter".**
      *Fix:* resolve a chapter-level match to its parent book; never show a
      chapter as a standalone title. [13:43] [14:18]
      **RISK: MEDIUM** — changes what a match means.

- [ ] **There is no per-course reference catalog, and no way to search outside it.**
      *Fix:* each course has an assigned catalog; when a needed reference is
      absent, allow an external search and add. [11:21] [11:39]–[11:48]
      **RISK: MEDIUM** — new data shape.

- [ ] **The library director cannot upload suggested books, and the set never updates per semester.**
      *Fix:* director uploads suggested books per subject; the list versions
      each term after faculty finalise. [10:19] [16:22] [16:57]
      **RISK: MEDIUM** — new role-scoped write path.

- [ ] **Any reference can be attached, whether or not the library holds it.**
      *Fix:* only library-available or approved-external references may be
      attached. [49:06]
      **RISK: MEDIUM** — adds a constraint to an existing action.

- [ ] **O'Reilly is not a reference source, though the library has a subscription.**
      *Fix:* make O'Reilly content searchable and citable. Ship search-by-subject
      first; the live API connection can follow. [12:05] [12:32] [12:41]
      **RISK: RISKY** — external service and credentials; needs a human.

## Review & Approval Workflow

- [ ] **An approver can return an item without saying why.**
      *Fix:* require a comment before disapprove / return-to-sender; the
      returned item goes back to the instructor as actionable. [1:23:33] [1:23:40]
      **RISK: SAFE** — one validation on one action.

- [ ] **Program-head comments do not reliably reach the instructor.**
      *Fix:* comments attach to the specific item (e.g. CO1) and render on the
      instructor's side. [46:22]
      **RISK: MEDIUM** — shared comment component.

- [ ] **There is no consolidated view of who has and has not approved.**
      *Fix:* one view showing each item's stage and each approver's state. [53:22]
      **RISK: MEDIUM** — reads across the workflow.

- [ ] **Approval records no signature.**
      *Fix:* approving records the approver's digital signature and timestamp
      on the artifact. [53:41]
      **RISK: MEDIUM** — writes to the approval record.

- [ ] **The approver chain is incomplete.**
      Program Head → Director of Libraries → Industry Consultant → Dean (final,
      with date approved) → VPAA (read-only view of approved items).
      *Fix:* one review/approve/status component, scoped per role and stage.
      **RISK: MEDIUM** — shared across five roles.

- [x] **Submitting does not reliably route into the correct approver's queue.**
      *Fix:* submission sets pending and places the item in the right queue. [44:50] [45:09]
      **RISK: MEDIUM** — the spine of the workflow.
      *Done:* `client/src/components/SyllabusSections.jsx` — the instructor route is
      `/courses/:pcId/:revNum/:status`, so `params.code` was always undefined and the whole
      submit path ran with `courseCode === ''`. `setWorkflow('', wf)` returns early, so the
      submitted plan was never written and the approver page fell back to a default
      workflow. The component now resolves the code from
      `/api/course-details/:pcId/:revNum` into `resolvedCode` and uses it for the workflow
      write and the export (the server side already routed correctly).
      *Checked:* `/api/course-details/1/1` returns `code: "BIT313L"`, which is the same
      `course_no` `ApprovalCoursesTable.getCode()` puts in the approver URL, so instructor
      and approver now read the same key. `/api/assignments` (HTTP 200) shows the server
      status machine intact — co_assign 3 has `SUBMITTED:INSTRUCTOR` and computes to
      Pending/Returned as expected. New self-check `client/src/utils/workflowRouting.test.js`
      (`node src/utils/workflowRouting.test.js`, 2 passing) fails if the write goes back
      under a blank code. `npm run build` in `client/` passes.
      *Re-verified against the running server:* `/api/course-details/1/1` still returns
      `code: "BIT313L"` (HTTP 200) and `/api/assignments` still returns HTTP 200, so the key
      the instructor writes under and the key the approver page reads remain the same.
      *Not done here:* every role still reads the same `/api/assignments` list — scoping the
      queue per role/stage is the separate P1 "approver chain is incomplete" item.

## Status Tracking & Notifications

- [ ] **Learning-plan status is not exposed as a single source of truth.**
      *Fix:* each learning plan reports its current stage; the tracker is
      authoritative. [08:33]
      **RISK: MEDIUM** — read model other modules will depend on.

- [ ] **Nobody is told who has not submitted; the program head chases folders by hand.**
      *Fix:* list non-submitters and notify them; send the program head a
      summary. [08:16] [08:51]
      **RISK: MEDIUM** — new outbound notifications.

- [ ] **Deadlines are not derived from the academic calendar.**
      *Fix:* upload the calendar, derive start of classes and grade-submission
      dates, apply the rule that a syllabus is due about one week before
      classes start, and auto-notify late faculty and the program head. [08:51]
      **RISK: MEDIUM** — date arithmetic driving real notifications.

## Comments & Review Automation

- [ ] **Program-head comments are free text only.**
      *Fix:* offer structured types — suggest TLAs, suggest topics, suggest AI
      tools — and render them to the instructor as distinct, actionable
      suggestions. [48:30]
      **RISK: SAFE** — additive to the comment UI.

- [ ] **Spelling and grammar errors reach the program head.**
      *Fix:* run a spell/grammar check on comment text at save and surface
      flags before submission. [46:58] [49:25] [49:43]
      **RISK: MEDIUM** — external API in a save path.

- [x] **Login does not hold identity across the approval flow — the panel saw the account switch mid-demo.**
      *Fix:* a user stays that user across the whole flow; signup creates a
      valid account with the correct role; roles map to their approver view. [45:27] [45:45]
      **RISK: RISKY** — authentication and sessions; a human must review this.
      *Done:* there was no login at all — the identity was whatever each page hard-coded, so
      the header read "NORTON, MONICA" on `AssignedCourses`/`Syllabus`, "CASIMERO, DANNY" on
      `SyllabusRevisions`/`TOS`, "DANILA, JUNAR" on the program-head pages, and
      `ProgramHead.jsx` / `DirectorOfLibraries.jsx` also stamped their own user into
      `localStorage`. New `client/src/utils/session.js` (accounts + session under the same
      `user`/`userId` keys `utils/roleGuard.js` already reads) and
      `client/src/pages/Login.jsx` (sign in / sign up with a role, plus one-click demo
      accounts). `client/src/App.jsx` wraps the route table in a `SessionGate` so nothing
      renders until someone signs in, and `Header.jsx` / `HeaderA.jsx` now render the
      session's name and role over the props they are passed. The two identity-stamping
      `useEffect`s were removed.
      *Also done (found while verifying the DoD across the approval flow):*
      `client/src/components/ApprovalSyllabusSections.jsx` still resolved the actor from a
      hard-coded role→name table ahead of the session, at both ends: the reviewer write
      used `reviewerNames[roleKey] || storedUser?.name`, so an approve / return / comment by
      a newly signed-up program head was stored as "DANILA, JUNAR", and the render path
      re-labelled the same row from `roleToName` on reload. Both now go through one helper,
      `nameForRoleWithSession` in `client/src/utils/session.js:175`, called from
      `ApprovalSyllabusSections.jsx:199` (render) and `:745` (write): the signed-in user's
      name wins for their own role, and a role they do not hold keeps the demo name so no
      action is cross-attributed.
      *Checked:* `client/src/utils/session.test.js` (`node src/utils/session.test.js`,
      7 passing) covers wrong password → no session, login → correct name+role, identity
      unchanged across repeated reads until logout, signup with a role → can sign back in,
      rejected duplicate/invalid signups, and each role's landing route. The 7th is the
      regression guard for the fix above — signed-in name beats the demo name in both
      `program-head` and server `PROGRAM_HEAD` casing, another role keeps its own name, and
      no session still falls back. Mutation-checked: inverting the precedence in
      `session.js` makes it fail, restoring it makes it pass. `npm run build` and
      `npx eslint` on the touched files are clean (the eslint errors remaining in
      `ApprovalSyllabusSections.jsx` are pre-existing `no-unused-vars` on untouched lines).
      *Also done (the switch mechanism itself):* two paths still let one click change who you
      are, and neither went through the session. `client/src/components/SideNavigation.jsx:212`–
      `:217` — the "Log Out" button opened a **Select role** popup that navigated straight into
      Program Head / Director of Libraries / Industry Consultant / Dean / VPAA without signing
      in as them; that is the switch the panel watched happen. It now asks "Sign out?" and ends
      the session (`logout()` → sign-in screen). And every approver page takes its acting role
      from the URL (`/role/:approver`, `ApprovalSyllabus.jsx:36`), so typing or following a link
      to another role's page was enough to act as that role: new `routeGuardRedirect` in
      `client/src/utils/session.js:180` sends a signed-in user who opens a role page that is not
      theirs back to their own view, applied once in `SessionGate` (`client/src/App.jsx:47`)
      rather than route by route. Unknown `/role/...` keys and non-role paths are left alone.
      *Checked:* two more cases in `client/src/utils/session.test.js` (`node src/utils/session.test.js`,
      now 8 passing) — an instructor is bounced off `/role/dean` and off
      `/role/program-head/course-offerings` but keeps `/role/instructor/...` and `/courses/...`;
      a program head keeps `/role/program-head/approval-course-table` and is bounced off
      `/role/vpaa`; an unknown role segment and a missing session are not redirected.
      Mutation-checked: making the guard always return null fails that test, restoring it passes.
      `npm run build` passes; `npx eslint` on the touched files reports no errors (two
      pre-existing `react-hooks/exhaustive-deps` warnings in `SideNavigation.jsx` on untouched
      lines).
      *Note for the human:* this is a client-side session — there is no user table on the
      server (`server/models/` has none) and the live DB is off-limits, so credentials live
      in `localStorage` and passwords are only digested, not hashed for real. It fixes the
      switching the panel saw; it is not production authentication.

- [x] **Syllabi can be submitted while hours and ILO allocation do not align.**
      *Fix:* block submission until alignment checks pass, so the program head
      confirms rather than hand-checks. The alignment computation lives in the
      learning-plan and TOS modules — integrate with their interfaces, do not
      reimplement. [47:53] [48:30] [48:48] [49:06]
      **RISK: RISKY** — crosses module boundaries; confirm ownership first.
      *Done:* new `client/src/utils/submissionGate.js` reads what the other modules'
      endpoints already return — `/api/course-details/:pcId/:revNum` (`contact`) and
      `/api/course-coverage/:pcId/:revNum` (`ilos[].allocatedTime`, `.topics`,
      `.references`) — and blocks on: no ILOs, an ILO with no allocated time, an ILO with no
      topic, an ILO with no reference, and allocated hours that over- or under-run the term's
      contact hours. Nothing is recomputed from the learning-plan/TOS side. Term length
      (18 weeks) and the coverage tolerance are in `DEFAULT_GATE_CONFIG`, not inline
      numbers. `client/src/components/SyllabusSections.jsx` runs the gate before the confirm
      modal: a failing plan gets a `BLOCKED` modal listing what to fix and never reaches
      `POST /api/submit-learning-plan`.
      *Checked:* `client/src/utils/submissionGate.test.js`
      (`node src/utils/submissionGate.test.js`, 9 passing) uses the real server shapes. Run
      against the live server, offering 1/1 (BIT313L, 82 allocated hrs vs 90 contact hrs)
      passes and offering 2/1 (BIT302, no ILOs) is blocked with "The learning plan has no
      intended learning outcomes yet." `npm run build` passes.
      *Re-verified against the running server:* `/api/course-details/1/1` and
      `/api/course-coverage/{1,2}/1` all return HTTP 200, and driving `validateSubmission`
      over those live responses reproduces exactly the two outcomes above — 1/1 `ok=true`,
      2/1 `ok=false` with that single blocker. 9 checks still pass.

## Cross-cutting UI

- [ ] **Multi-step actions require clicking back and forth instead of moving forward.**
      *Fix:* a stepper with persistent Next/Back; a later step stays disabled
      until the current one is valid. [17:23] [51:51] [52:09]
      **RISK: MEDIUM** — restructures existing screens.

- [ ] **Screens show everything at once and take too many clicks.**
      *Fix:* mobile-first, one focused task per screen; remove redundant
      confirmations and collapse repeated selections. [17:15] [50:56] [51:14]
      **RISK: MEDIUM** — layout change across several screens.

---

## Do not modify — other people's modules

- COAEP outcomes generation and parsing (Junar, Sir Danny) — consume its output only.
- Learning-plan composition: topics, TLAs, ILO editor (Christian).
- TOS, assessment items, points computation (Arra).

Where this module depends on those, integrate through their interfaces.
Never fork their logic.

---

*New findings from the survey go below this line.*

- [ ] **Every approval action is wiped on the next page load.**
      `client/src/App.jsx:33`–`:35` calls `seedDemoWorkflowsCanonical()` at module load, and
      `client/src/utils/demoCourses.js:96`–`:121` calls `setWorkflow(code, wf)` unconditionally
      for all 16 demo course codes. `setWorkflow` overwrites, so an approve / return / submit
      written by `ApprovalSyllabusSections.jsx` (`:577`, `:636`, `:872`) is reset to the seeded
      stage the moment the user reloads or reopens the app.
      *Fix:* seed only codes with no existing entry, the way `workflowHelpers.seedDemoWorkflows`
      already does ("add missing entries only, never overwrite existing user data").
      **RISK: MEDIUM** — shared seeder; demo state will stop resetting itself on reload.

- [ ] **COAEP records are stored under a different program key than every other alignment page.**
      `client/src/pages/lpsm/ProgramHead/COAEPUpload.jsx:58` vs `:28`, `CoPoAlignment.jsx`,
      `PoPeoAlignment.jsx`. COAEP sets `programCode` to the server `Program.name`; the other
      pages use the short prefix from `getAllPrograms()`. Both key the same store, so one
      program gets two entries and a COAEP saved online vanishes on the offline fallback.
      *Fix:* derive `programCode` via `extractProgramPrefix(courseCode)`; use the long name
      for display only.
      **RISK: RISKY** — changes the storage key; records already saved under the long name are
      orphaned unless migrated.

- [ ] **The References Summary badges unresolved comments against the wrong references.**
      `client/src/components/ReferenceSummary.jsx:56` calls `/api/comments/filter/{ref.id}/references`,
      but that route filters on `c.ilo_id` (`server/controllers/commentController.js`,
      `getCommentsByTarget`) while `ref.id` is a `reference_id` from
      `/api/courses/:pcId/:revNum/references`. Verified on the running server: reference 27
      in course 1/1 is "UNC Student Handbook", and `/api/comments/filter/27/references`
      returns ILO 27's comment (targets 39 and 40), so that row shows a badge that belongs
      to a different ILO. The same response repeats one comment once per `CommentTargets`
      row (comment 30 comes back three times for ILO 1), so the count is inflated too.
      *Fix:* fetch the comments per ILO the section already knows, match a reference by the
      row's `target_id`, and count distinct `comment_id`s.
      **RISK: SAFE** — one component; the endpoint keeps its current shape.

- [ ] **The reference picker prints a raw timestamp where the year should be.**
      `client/src/components/ReferencePicker.jsx:193` renders `ref.publication_year` as-is, and
      `GET /api/references` returns `"2024-01-01 00:00:00.000 +00:00"` (verified against the
      running server), so every row reads "AWS • 2024-01-01 00:00:00.000 +00:00". The
      normalisation at `:45` is dead because `...r` at `:47` spreads the raw value back over it;
      the same dead-spread bug is in `client/src/pages/ReferenceForm.jsx:99`–`:100`.
      *Fix:* take the first 4 characters as the year and put the spread first so the normalised
      fields win — `/api/courses/:pcId/:revNum/references` already returns a clean `year`.
      **RISK: SAFE** — display normalisation in one component.

- [ ] **Reference type badges mix database casing with form casing in the same list.**
      `client/src/components/ReferencePicker.jsx:213` renders `ref.type` raw, so server rows show
      `TEXTBOOK` / `ONLINE` / `OER` while a reference added through the Add Reference modal
      (`ReferenceForm.jsx:305`) shows `Textbook` / `Online Resources`, side by side under tabs
      labelled "Textbook / OER / Online".
      *Fix:* map the type through one label table before rendering, as
      `ReferenceLibrary.jsx:140` (`TYPE_MAP`) already does.
      **RISK: SAFE** — label rendering only.

- [ ] **With "All" gone, the picker can no longer show every selected reference at once.**
      `client/src/components/ReferencePicker.jsx` bubbles selected rows to the top, but only
      within the active type tab, and `client/src/pages/ReferenceForm.jsx:286` renders no other
      list of `selectedRefs`. A faculty member who picked one textbook and two online resources
      can only ever see part of their own selection, and has no running count.
      *Fix:* show the current selection as chips (with a count) above or below the tabs, so the
      full set stays visible regardless of which type tab is active.
      **RISK: SAFE** — additive display in one component.

- [ ] **A reference whose type is blank or unrecognised is now unreachable in the picker.**
      `normalizeTypeKey` (`client/src/components/ReferencePicker.jsx:23`) returns `''` for a
      missing type and the raw lowercased string for anything that is not textbook / OER /
      online, and with the "All" tab removed no tab matches those keys, so such rows can no
      longer be found or attached. Worth a pass over `/api/references` to see whether any live
      row has an off-vocabulary type before deciding between normalising the data or adding a
      fallback tab.
      **RISK: MEDIUM** — may need a data fix as well as a UI one.
