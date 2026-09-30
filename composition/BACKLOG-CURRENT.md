# BACKLOG-CURRENT — Edrian's module (quick reference)

> Short version. The authoritative task list is `BACKLOG.md` (reconciled on
> 2026-08-11; this file updated 2026-08-13). This file is a
> one-glance "what is genuinely left" summary for someone handing the module
> to a coding agent.
>
> Scope: Edrian's module — Reference Library · Review & Approval · Status ·
> Notifications · Comments · VPAA read-only view.
> Do NOT modify Christian's (learning-plan/ILO/TLA/alignment) or Arra's
> (TOS/assessment/points) code — integrate via their interfaces.

## Genuinely left (2 open items, both cross-cutting UI)

1. **Multi-step → stepper** (BACKLOG L299) — *built, then reverted on request.*
   `utils/reviewSteps.js` (pure model, 7 tests, mutation-checked) and
   `components/Stepper.jsx` (generic renderer) are still on disk and still pass, but
   `ApprovalSyllabusSections.jsx` no longer imports them — the section dropdown is back.
   Rewiring is an import plus a wrapper. **Decide first:** the panel asked for a stepper,
   the team wants the dropdown to demo. If it goes back, decide whether the
   read-before-approve gate (`buildReviewFlow().decision.canApprove`) returns with it.
2. **One focused task per screen / fewer clicks** (L320) — *partially done.* The double
   confirmation on approve is gone (countdown only, still cancellable), the navi wraps
   below 600px, and empty states are mobile-first. The one-task-per-screen restructure went
   with the stepper. A mobile-first pass over the Reference Library and Add Reference
   screens is still open.

## ONE THING TO RUN BEFORE THE DEMO

The accounts live in a real `Users` table. `ensureAuthSchema` creates the table at boot
so the server no longer crashes without it — but an empty table has **no accounts**, and
the seeder is what puts the six demo users in it. From `composition/server`:

```
node migrate.js
node run-seeder.js 20260812000000-demo-users.js
```

Until that is done the backend answers `/api/auth/login` with a 503 and
`setup: 'no-accounts'`. That is survivable — the sign-in screen detects it, says so,
prints those two commands, and falls back to the built-in demo accounts — but no *real*
account exists and password reset cannot work, because both need rows in the table.

## Added on 2026-08-13

- **One spinner, everywhere** — `components/Spinner.jsx` + `Spinner.module.sass`.
  Every "Loading …" line in the module is now the same rotating ring with the same
  label underneath, centred in the space the content will occupy
  (`min-height: calc(100vh - 240px)`, deliberately the same value `EmptyState`'s row
  uses, so a list that loads empty does not make the block jump). `inline` is the
  small variant for a card or a cell. It honours `prefers-reduced-motion` with a
  pulsing fallback rather than nothing.
  A table is now gated on `!loading`, not merely preceded by the spinner — the
  approver's screen used to show "Loading course offerings…" *and* "No learning plans
  waiting for you" at the same time, which tells the reader two contradictory things.

- **Every URL in one file** — `utils/routes.js` (`PATTERNS`, `routes` builders,
  `LEGACY_REDIRECTS`) + `routes.test.js` (8/8). The route table and the 37 places that
  built links had drifted: `/assignedtos` was the only path not in kebab-case;
  `:courseName` and `:code` named the same thing (a course CODE) in different routes;
  and `/role/program-head/upload-documents` and
  `/role/director-of-libraries/upload-documents` were the same segment on two unrelated
  screens. **Nothing broke**: every renamed path is still served as a redirect to its
  replacement, so old bookmarks and a teammate's branch still work. The test is the
  point of the file — it checks the two halves against each other, which is drift no
  amount of reading either list alone can catch.

- **Sortable columns and truncation on the approver tables** — `utils/tableSort.js`
  (11/11) + `components/SortableTh.jsx`, adapted from `feature/course-assignment`
  rather than copied: `STATUS_SORT_ORDER` is rewritten for this module's statuses, and
  the source's decorate-sort-undecorate is dropped (`Array#sort` has been stable by
  spec since ES2019). Long course names clip with an ellipsis instead of doubling the
  row height — `white-space: nowrap` is what fixes the height, `min-width: 0` is what
  lets the cell shrink, and the ellipsis needs its own `<span>` because `text-overflow`
  does nothing on a flex container, which every `td` here is. Scoped to a class, not
  `index.css`: most of the module's 25 tables hold ILO and TLA text that is *meant* to
  wrap.

- **Alignment: two rails, and everything on one of them.** Measured on the approver
  screen at 1690×1005 before the fix: page heading at x=130, first column heading at
  x=148, status tabs ending at x=1660, row actions ending at x=1635 — four edges, no
  two the same. Now **130 / 1660** is the table's frame (header band, row cards, the
  top bar's contents) and **148 / 1642** is everything you read (heading, filters, tabs,
  column headings, cell values, row actions). One `$cell-inset` in
  `CoursesTable.module.sass` moves all six together; mutation-checked by setting it to
  30px and re-measuring.
  Found on the way: **`ReferenceLibrary.module.scss` was styling every table in the
  app.** A bare `table { th {…} td {…} }` at the top level of a *CSS module* — modules
  scope class names and leave element selectors global — so one page's padding, borders,
  font-size and `white-space: nowrap` reached all 25 tables, and the value the rails
  depend on lived in a file about the reference library. The cell padding is now
  declared where it is used.

- **Fixed: the Program Head saw the instructor's screen with their own name on it.**
  Signed in as DANILA, JUNAR and opening `http://localhost:5173/` served the
  *instructor's* table — four tabs, Draft/Pending/Returned/Approved — with "Program
  Head" in the corner. The header was telling the truth; the page was the wrong one.
  `routeGuardRedirect` only understood `/role/<x>`, and the instructor's screens have no
  such prefix: their home is `/`, and composing a plan happens at `/courses/…`,
  `/tos/…`, `/ilos/form/…`. Ownership is now stated in both directions — `isInstructorPath`
  lists them — so a non-instructor asking for any of them lands on their own home
  instead. 13 paths asserted in `session.test.js`, plus the cases that must NOT be
  caught (`/login`, `/forgot-password`, `/course-offerings`), and mutation-checked.

- **Row actions match the instructor's table.** The approver rows had a kebab menu whose
  entire contents were one item, "Approval details" — two clicks and a popup to reach one
  popup. It is now what the instructor's table has always had: View, Export where the
  role has it, and the details behind a single `(?)`. `RowActionsMenu.jsx` stays on disk
  for a row that ever earns three or more secondary actions. **The rule, so this does not
  get argued twice:** a kebab is for actions that are not the point of the screen. In a
  row, details is one of those — hence the `(?)`. Inside the plan, Add Comment and
  Approve *are* the point, so they stay as buttons.

- **Empty states on the instructor's own table.** It was the last screen still rendering
  a bare column header with nothing under it, which cannot be told apart from a failure.
  All four tabs now say which list is empty and why (`Draft` / `Pending` / `Returned` /
  `Approved`). Removed at the same time: a stray `<td></td>` that gave that table five
  cells against four headers.

- **`utils/checkJsxImports.js`** — `node src/utils/checkJsxImports.js`, ✓ 93 files.
  `<Spinner />` shipped without its import: the build succeeded and the page threw
  `ReferenceError`, replacing the whole screen with "Something went wrong". **Correcting
  what this file used to claim below: turning on eslint's `no-undef` would NOT have
  caught it.** Verified — core eslint does not resolve JSX element names.
  `const A = () => <Undefined1 />` passes `no-undef` cleanly; only
  `react/jsx-no-undef` from `eslint-plugin-react` catches it, and that plugin is not a
  dependency here. So: forty lines of string handling with no dependency at all. If the
  plugin is ever added, delete the script and turn the rule on instead.

- **Fixed: the backend crashed on boot with `no such table: Users`.** The `Users`
  migration was one nothing else required, and `models/index.js`'s sqlite3 shim reports
  a failed query twice (callback *and* rethrow), so Node 24 exited on the unhandled
  rejection. `server/utils/ensureAuthSchema.js` (8/8) creates the table at boot if it is
  missing, adds the reset columns to a half-migrated one, is idempotent, never throws,
  and **creates no accounts** — an empty table is not a security decision to make
  silently. `server.js` also logs unhandled rejections instead of dying on them.
  The follow-on: an existing-but-empty table made `/api/auth/login` return a truthful
  401, which the client correctly did *not* treat as "server unavailable", so the demo
  accounts stopped working. The backend now answers 503 `setup: 'no-accounts'` in that
  state, and the client independently checks the account count before deciding a refusal
  was real.

## Added on 2026-08-12

- **Auto-correct / spelling / grammar on every text box** — `utils/autoCorrect.js`
  (13/13, mutation-checked) plus `components/AutoCorrectButton.jsx` for single-line
  fields; the textareas use `SpellCheckArea` instead (see below). Pure core:
  `applyCorrections` (right-to-left by offset, overlapping matches dropped),
  `PROTECTED_PATTERNS` (course codes, `CO2-ILO2`, acronyms and percentages are never
  "corrected"), `AUTO_APPLY_CATEGORIES`, and a rate limiter for LanguageTool's free
  tier (19 req/min, 8000 chars). Never throws: when the service is unreachable it
  falls back to the offline dictionary already in `reviewGate.js` — one dictionary for
  the whole module, so the entry gate and the correct button cannot disagree.
  **LanguageTool's terms require the attribution link to stay visible and NOT
  `rel="nofollow"`.** Wired into the comment boxes, reference forms, revisions and the
  course catalog.
- **A spell checker that is actually ours** — the comment boxes underline their own
  mistakes and let you click the word to fix it. `utils/spellSuggest.js` (31/31,
  mutation-checked) + `components/SpellCheckArea.jsx`, a drop-in replacement for
  `<textarea>`. Two things worth knowing before changing any of it:
  - **The conservative rule.** A word is flagged only when it is *not* in the
    dictionary AND a close relative can be named (Damerau–Levenshtein ≤ 2). "Not in
    the dictionary" alone would underline correct writing constantly, because the
    list is ~10,000 words. Before flagging, a word also gets three more chances:
    a standard suffix, a standard prefix, or a compound of two real words. And a
    capital that is not sentence-initial is read as a name and left alone — in a
    reference library, "Pearson" is one edit from "person".
  - **The underline is drawn by a backdrop div behind a transparent textarea.**
    Font, size, line-height, padding, border and white-space must be identical on
    both or it slides off the word — which is why padding is a prop applied to both
    layers and never a className on one. The browser check measures a mark against
    an independent text measurement rather than trusting the CSS.
  Fixed at the same time: **the checker used to hang.** `fetch` has no timeout, so a
  slow or blocked LanguageTool left the button on "Checking…" forever.
  `autoCorrect.TIMEOUT_MS` is 6s, and it aborts the request rather than abandoning it
  (an abandoned request still counts against the 20/minute limit).
- **Real accounts** — `server/models/user.js` (six LPMS roles, `defaultScope` excludes
  the hashes), `server/utils/password.js` (scrypt, 6/6), `authController` (one generic
  credential error, honeypot, in-memory lockout, role checked *after* the hash so the
  form is not an oracle), migration + demo-user seeder. The client is server-first with
  the local store as fallback: `session.js` (29/29).
- **Forgot password** — request → code → new password, all on the sign-in card.
  `server/utils/resetToken.js` (9/9, mutation-checked): 256-bit token, only its SHA-256
  is stored, 30-minute expiry, single use, constant-time compare, and hex guards so a
  corrupted row cannot verify against any token. **No mailer is configured**, so the
  link is printed to the server console (`LPMS_EXPOSE_RESET_TOKEN=1` puts it in the
  response for local demos only — leave it off otherwise). Reset is server-only by
  design: the browser store cannot prove you own an email address, so offline it fails
  visibly instead of pretending.
- **Fixed: the demo accounts refused to sign in.** `login()` read *every* non-ok
  response as a credential decision, so a backend that was up but had no `/api/auth`
  (404) or no `Users` table (500) reported `Incorrect email or password.` — and the
  local fallback that should have caught it never ran. Only 400/401/403/409/423 are
  decisions now; anything else means the API did not answer and the local store stands
  in. A refusal still never falls through to the local store. Regression-tested both
  ways in `session.test.js` and in the browser.

## Still open here

- **Session lives in `localStorage`, not in a signed token.** Sign-in is now real, but
  nothing stops someone editing `localStorage.user` to change their role. A JWT (or a
  server session cookie) plus route guards on the API is the next piece of work; the
  route guards in `roleGuard.js` and `routeGuardRedirect` are UI-level only — they stop
  a wrong *link*, not a determined user. Do not describe the current state as
  authenticated authorisation.
- **The approver screen overflows below ~400px wide.** At 390px the content measures
  498px, so the page scrolls sideways. Pre-existing and not caused by the rail work — it
  measures 480px even with the cell inset set to zero. The cause is the `white-space:
  nowrap` page heading plus the year/semester filter on one row; the fix is letting that
  header wrap on narrow screens.
- **The spell checker's known limits**, so nobody rediscovers them as bugs:
  - Two words run together ("onthe", "andthe") are correctly refused as words but
    usually have no suggestion within two edits, so nothing is underlined. Catching
    those needs the sentence — that is what "Check grammar" is for.
  - A real word used wrongly ("form" for "from", "their" for "there") is invisible to
    a dictionary checker. Same answer: the service, when it is reachable.
  - A capitalised typo in the middle of a sentence is skipped, on purpose — that is
    the price of not underlining every author and publisher. Flip
    `isMidSentenceCapital` in `spellSuggest.js` if the trade ever looks wrong.
  - The native browser checker is switched off in `SpellCheckArea` (two sets of red
    squiggles look broken). Pass `nativeSpellCheck` to have both.
- `no-undef` is off in `eslint.config.js`. It is why a deleted `useRef` left a
  `lastSectionKey.current` that silently swallowed approver comments — turning it on is
  a one-line change and would have caught *that* one, a plain identifier.
  **It would not catch an undefined JSX component**, which is the same bug's other
  form and shipped separately (`<Spinner />` with no import). That needs
  `react/jsx-no-undef` from `eslint-plugin-react`, which this project does not depend
  on; `utils/checkJsxImports.js` stands in until it does.

## Closed on 2026-08-11

Three items were already implemented in the code and only needed verifying and ticking:

- **Spelling/grammar at ENTRY** — `submissionGate.js` imports `hasBlockingTextIssues` from
  `reviewGate.js` (one dictionary); `SyllabusSections.jsx:202` feeds it the course name,
  coverage topics and ILO descriptions before the confirm modal.
- **COAEP program-key mismatch** — `COAEPUpload.jsx:33` uses `extractProgramPrefix()`;
  `Program.name` is a display label only. No migration needed on a fresh store.
- **References Summary badges wrong reference** — `referenceComments.js` keys on `target_id`
  and counts distinct `comment_id`s; `ReferenceSummary.jsx` fetches per ILO.

And one was built:

- **Empty screens looked broken** — new `components/EmptyState.jsx`: a centred icon, what is
  missing, and why that is normal. Inside a table it has to fight `index.css`, which makes
  `table`/`tbody`/`tr`/`td` all `display: flex` — so `colSpan` does nothing and the block
  lands left-aligned, and `tbody tr`'s card box-shadow reads as a stray line under the
  message. `EmptyState.module.sass` overrides both on its own row and cell. Wired into every blank scenario in the module (approver
  tabs, status dashboard + its cards + the no-calendar banner, references summary, reference
  library incl. the archived tab, course catalog, reference picker, comments sidebar,
  read-only comment box, revision history, and Course Details — which used to draw a grid of
  empty rows). New `utils/demoAssignments.js` fills the approver tabs with demo rows when the
  API returns nothing, in the server's own shape and built from the existing
  `DEMO_COURSES_BY_STATUS`. **Real data always wins** — the fallback never mixes with or
  displaces live rows.

## Current UI state of the approval screen

Section navigation is the **dropdown** (Details / Alignment / Coverage / References /
Grading). Add Comment and Approve are in the **top bar**, original position, original
gating. Approving is one click into a 5-second cancellable countdown — no confirm modal.
The consolidated approval chain sits under the navi with the caller's stage chip live.

The approver **table**: sortable DATE ASSIGNED / CODE / COURSE NAME (newest first by
default — the plan that just arrived is the one they have not seen), long names clipped
with a tooltip carrying the full text, and each row ending in View › · Export ⭳ (for the
roles that export) · (?) for the approval details. Empty tabs and the loading state are
the shared `EmptyState` and `Spinner`.

## Large parts ALREADY done + passing tests (do NOT re-fix)
- Reference Library: sorting, recency, course-scope, auto-suggest, chapter→book,
  per-course catalog, director per-semester upload, availability, O'Reilly fallback —
  `referenceCatalog.js` (11/11).
- Review & Approval: return-needs-comment, consolidated status, signature, full
  approver chain (incl. VPAA read-only), structured PH comments, approval persists
  on reload — `reviewGate.js` (7/7) + `workflowRouting`/`session` tests.
- Status/Notifications LOGIC: source-of-truth status, who-hasn't-submitted, calendar
  deadlines + reminders — `planStatus.js` (4/4). **No UI renders it right now** — the
  Learning Plan Status page was removed on request (2026-08-11): its route and import are
  gone from `App.jsx`, so nothing in the app reaches it. `pages/lpsm/ProgramHead/
  StatusDashboard.jsx` is still on disk and still builds, so restoring it is one import and
  one `<Route>`.
- Login identity fix + submission gate — `session.js` (29/29), `submissionGate.js` (9/9).
- Approver-table demo rows — `demoAssignments.js` (7/7).
- Parked but green: the review stepper — `reviewSteps.js` (7/7), unimported.

## To run the module's self checks
From `client/`: `node src/utils/<name>.test.js` for each util test (plain node scripts, no
framework). As of 2026-08-13 that is **165 checks across 16 files, all passing**.
Also `node src/utils/checkJsxImports.js` (not a test — a checker; ✓ 93 files) and
`npm run build` for the client.

From `server/`: `node utils/password.test.js` (6), `node utils/resetToken.test.js` (9)
and `node utils/ensureAuthSchema.test.js` (8). These need no database — that is why the
security-carrying logic lives in `utils/` as pure functions instead of inside the
controllers. (`ensureAuthSchema` makes its own throwaway file and deletes it;
`server/tmp-ensure-test.sqlite` is not gitignored, so do not commit one if a run is
interrupted.)

For browser behaviour: `npm run build && npx vite preview`, then with a program-head session
in `localStorage` open `/role/program-head/approval-course-table?status=pending` (rows, not a
blank table) and `/role/program-head/courses/BSCS511?status=pending` (dropdown navigation,
Add Comment / Approve top-right, a labelled empty state where a section has no data).

For the sign-in screen: open `/login` with the backend **off** (it should say offline
mode and the demo chips should still sign you in), with the backend **on but not
migrated** (it should say the accounts table is not set up, print the two commands, and
the demo chips should *still* sign you in), and with it migrated and seeded (it should
say accounts come from the server). "Forgot password?" → email → the code from the
server console → a new password signs you straight in.
