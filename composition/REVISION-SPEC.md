# Revision Checklist — Edrian's module

Scope: Reference Library · Review & Approval Workflow · Status Tracking · Notifications · Comments
Source: Pre-oral panel feedback (timestamps in `[mm:ss]` point at the transcript line that triggered each item)
Verdict: Accepted with minor revision [1:25:33]

**How to use this file:** hand it to the coding agent as the task spec. Each item has a DoD (definition of done) so the agent can self-verify. Work top-to-bottom (P0 → P1 → P2); tick the matching entries in `BACKLOG.md` as you complete them and keep the survey findings below its `---` line as additional tasks. If a panel ask turns out unimplementable, do not silently drop it — surface it to the human for the recommendations section. The Non-goals section marks what NOT to touch.

---

## 0. Global / Cross-cutting

**P0** — Fix authentication (login / signup). The panel flagged account switching as broken ("wait sino si Norton, Monica... bakit nag-switch" / "Mali yan") [45:27] [46:03]; the root cause is that there was no login/signup ("Wala po kasi sila, sir, login-signup" [45:45]).
*DoD:* A user logs in and stays as that user across the whole approval flow; no unexpected account switching. Signup creates a valid account with the correct role. Roles map correctly to their approver view.

**P1** — Adopt mobile-first, one-screen-at-a-time UX. "di mo o-overwhelm ang user na nakikita lahat" [51:14].
*DoD:* Primary flows render cleanly on a narrow viewport; each step shows one focused task, not the entire form at once.

**P1** — Convert multi-step actions into a stepper wizard. "isang button lang... step by step, hindi na babalik-balik" [52:09]; "meron ka nalang nung parang Next" [17:23].
*DoD:* Steps are sequential with a persistent Next/Back; a later step is disabled until the current one is valid [51:51].

**P1** — Minimize clicks. "ang dami mo tig-click-click-click" [17:15] [50:56].
*DoD:* Audit each flow; remove redundant confirmations and collapse repeated selections.

---

## 1. Reference Library (largest feedback block)

**P1** — Filter results to the current course only. "ang lalabas... si mga for that course lang" [13:25]; "supposed to ang lalabas dito is for that course only" [13:25].
*DoD:* A programming course never surfaces unrelated refs (e.g. "Understanding the Self") [16:13].
*Note:* several ref items below (auto-suggest, recency, alphabetical, book-level, O'Reilly) target the learning-plan reference picker — which Christian states is his focus ("ang focus netong sakin is mag-retrieve ng references" [16:48]). Build the catalog/library data layer in this module and integrate the picker via its interface rather than forking it.

**DONE** — Remove the "All" filter; split into separate Textbook / OER / OR views. "tanggalin na tong All... if textbooks, textbooks lang" [15:02]–[16:04].
*Done:* `client/src/components/ReferencePicker.jsx` — "All" dropped from `types`, picker opens on Textbook, type filter unconditional. See BACKLOG.md first item for the full check (servers verified; `npm run build` + backend curl still pending — run both).
*DoD (residual):* Clicking Textbook shows only recommended textbooks; same isolation for OER and OR. No mixed/"All" list [15:29].

**P1** — Auto-suggest / recommend references from the subject + topic. "nag-auto-suggest ng libro based sa subject" [10:28]; "ma-recommend na sya ning libro" [13:07].
*DoD:* On a topic, the system returns matched references automatically (search-like), instead of the faculty typing them in.

**P1** — Enforce a recency window (default 2021–2025 / last 5 years, configurable). "remember 5 years limitation... within 2021 to 2025" [10:55].
*DoD:* Outdated titles are excluded/flagged; the window is a setting, not hard-coded.

**P1** — Sort references alphabetically. "naka-alphabetical arrange dapat" [11:12].
*DoD:* Result lists are A–Z by default.

**P1** — Match at book level, not chapter level. "UX Design Principles is not a book, its only a chapter" [13:43]; the search must find the book that contains the topic [14:18].
*DoD:* A topic that is really a chapter resolves to the parent book; the UI never lists a chapter as a standalone title.

**P2** — Add O'Reilly as a reference source (library has a subscription). "may subscription kita ki O'Reilly... pwede din gamitin na source" [12:05]; collections integration "not yet" [12:41].
*DoD:* O'Reilly content can be searched and cited. Ship search-by-subject first even if a live API connection lands later [12:32]. External service — flag for human review when credentials are needed.

**P1** — Build a course reference catalog with external-search fallback. "course reference catalog" [11:21]; "kung wala dun yung libro, san ako mag-search? — sa labas" [11:39]–[11:48].
*DoD:* Each course has an assigned catalog; when a needed ref isn't in it, the user can search outside and add it.

**P1** — Library-director upload + per-semester update loop. Director uploads the initial suggested books; the set updates every semester after faculty finalize [16:22] [16:57] [10:19].
*DoD:* Director can upload suggested books per subject; the list versions/updates each term.

**P1** — Availability check against the library. "itong books ba na to available sa library? kung hindi, di pwede mag-lagay references" [49:06].
*DoD:* Only library-available (or approved external) references can be attached.

---

## 2. Review & Approval Workflow

**P0** — Submission routes into the approvers table. "pag na-submit na ni instructor, papasok na po sya sa table ng approvers" [45:09].
*DoD:* Submitting moves the item to pending and it appears in the correct approver's queue [44:50].

**P1** — Support the full approver chain (reused component per role). Program Head → Director of Libraries → Industry Consultant → Dean (final) → VPAA (view approved).
*DoD:* Each role sees the review/approve/status component scoped to its stage; Dean is final approver with a date-approved; VPAA has read access to approved items.
*Note:* the full chain is not enumerated in the transcript — only program-head approval, the approvers table [45:09], and the digital signature [53:59] appear. Confirm the chain against the project docs before building.

**P1** — Program-head comments are visible to the instructor. "mag-comment sya sa CO1... makikita ni instructor yung comment" [46:22].
*DoD:* Comments attach to the specific item (e.g. CO1) and render on the instructor's side.

**P1** — Disapprove / return-to-sender requires a comment. "may disapproval... ibabalik sa sender" [1:23:33]; "kailangan po muna kasi ng sample comment" [1:23:40].
*DoD:* An approver cannot return an item without a comment; returned items go back to the instructor as actionable.
*Note:* the "sample comment" line [1:23:40] was spoken during Arra's TOS demo; the requirement generalizes to this module.

**P2** — Attach a digital signature on approval. "pwede ba naka-attach na digital signature?" [53:59].
*DoD:* Approving records the approver's signature + timestamp on the artifact.

**P1** — Consolidated status view. "consolidated status po sya" [53:41].
*DoD:* One view shows each item's stage and who has/hasn't approved.

---

## 3. Status Tracking & Notifications

**P1** — Learning-plan status tracking. Confirmed to live in this module [08:33] (Christian: "nasa tracking... learning plan status, that is in Edrian's module").
*DoD:* Each learning plan exposes its current status; the tracker is the single source of truth.

**P1** — Submission reminders to faculty who haven't submitted. PH pain point: chasing non-submitters "sasaro-saroon ko kada folder" [08:16].
*DoD:* System lists who hasn't submitted and can notify them; PH gets the summary too [08:51].

**P1** — Academic-calendar-driven deadlines + auto-notify. Upload academic calendar → derive start-of-classes, midterm/final grade submission → rule: syllabus due ~1 week before start → auto-notify late faculty and PH [08:51].
*DoD:* Deadlines are computed from the uploaded calendar; late faculty and the PH receive automatic notifications.

---

## 4. Comments & Review Automation ("capstone-worthy" asks)

**P1** — Auto spelling / grammar check on entries. "pag mali spelling ma-auto-detect" [46:58]; catch it at entry so it never reaches the PH [49:25]; "may mga API auto spelling grammar check" [49:43].
*DoD:* Text fields run a spell/grammar check on save; flagged items are surfaced before submission. External API — flag for human review.

**P1** — Structured PH comment types. Beyond free text: suggest TLAs, suggest topics, suggest AI tools [48:30].
*DoD:* Comment UI offers these categories; instructor sees them as distinct, actionable suggestions.

**P0** — (Dependency) Pre-submission validation gate — hours / ILO alignment. "di dapat sila makaka-submit ng syllabus hanggat di tama ang alignments" [47:53] [48:30] [49:06]. The panel's headline "automation."
*DoD:* Submission is blocked until alignment checks pass, so the PH confirms rather than hand-checks (2–3 weeks → minutes) [48:48].
*Guard:* the alignment computation lives in the learning-plan / TOS modules — this module owns the gate + status, so integrate via their interfaces rather than reimplementing. Confirm ownership before building.

---

## 5. Verification (do before calling it done)

- Walk each approver role end-to-end (submit → pending → comment → return → resubmit → approve → signature → status).
- Confirm reference results are course-scoped, split by type, alphabetical, within recency window, book-level.
- Confirm login/signup holds identity across the whole flow (no Norton/Monica switch).
- Confirm reminders fire from an uploaded academic calendar on a test date.
- Confirm spelling/grammar check triggers on entry.
- Re-check every flow on a mobile viewport with the stepper.

---

## Non-goals (do NOT modify — other people's modules)

- COAEP outcomes generation / parsing engine (Junar, Sir Danny) — consume its output only.
- Learning-plan composition: topics, TLAs, ILO editor (Christian).
- TOS / assessment-items / points computation (Arra); also out of scope: grading distribution of pre-course/orientation items, exam-paper sectioning.
- No LMS features (no question bank, no exam builder) anywhere.

Where this module depends on the above (reference filter needs COAEP course data; validation gate needs alignment math), integrate via their interfaces — don't fork their logic.
