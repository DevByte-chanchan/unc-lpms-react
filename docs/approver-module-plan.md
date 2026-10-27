# Approver module: finalized plan

Written 2026-10-27. This joins everything we found: the transcript review, the code review, the tests, the
notes taken from three GitHub repos (Plexus, Syllus, Library-Management-System), and the new goal of
automating the Program Head's chasing. Nothing in this plan is built yet unless it says "done".

## 1. Scope and rules

- **The module:** the approvers (Program Head, Director of Libraries, Industry Consultant, Dean, VPAA), the
  Reference Library, comments, and exporting. The instructor side is read-only for us: we look at it, we do
  not change it. Anything an instructor must do is written as a request to its owner.
- **Decided not to build:** upload pages, a document repository, forwarding Dean comments, an endorse
  button, consultant approval, and the Dean's vision, mission and indicators (waiting on the group).
- **Ground rules:** no new dependency without asking; tests run with `node composition/server/run-tests.js`
  from the project root; nothing is pushed until the owner says so; never commit `.env`, data or `.sqlite`.
- **Principle for every automation: the system chases, people decide.** A reminder can be sent
  automatically. An approval, a return or a rejection is always a person's click.

## 2. Where we are now (done and committed)

- The approval chain works end to end: the Director and Program Head review in parallel, then the Dean.
  A 41-check walk over the real API passed.
- Each approver sees only their own part of a plan (the Director: references; the Consultant: content and
  coverage) and only their own comments. The server enforces both. The review record follows the same rule
  while a plan is under review; once approved, approvers get the whole record of their part.
- The VPAA reads approved plans only, including carry-overs, and the VPAA list is filtered the same way.
- A role named like an Object member (`__proto__`) gets no permissions, and the role matrix is frozen.
- Export, the review record, notifications, poke (4-hour limit), a daily notification clean-up job, and
  optional e-mail (SMTP) already exist. The new automations reuse these.
- 271 server tests and all client tests pass.

## 3. The plan, in phases

Effort: S = under half a day, M = one to two days, L = three days or more.

### Phase 1: fix what is broken or missing (no decisions needed)

| # | Task | Why | Effort |
|---|---|---|---|
| 1.1 | Add an **Industry Consultants** item to the Program Head's sidebar. | The page exists but only a typed URL reaches it. | S |
| 1.2 | **Decide what to do with the two hidden Dean pages** (`DeanFaculty`, `DeanPrograms`), after the user-management decision. Do not delete them yet. | Corrected on checking: they are routed (`/role/dean?page=Faculty` and `?page=Programs`) but have no sidebar link, show hard-coded sample data and a fake upload button, and four tests depend on them. If the Dean owns user management they are the starting point; if not, remove them together with their tests. | S |
| 1.3 | **Plan list scope: checked, nothing to fix.** Added a two-program database test proving it. | I had reported that the Program Head's list showed every program. That was wrong: the demo data has one program with one head, so every plan looked "theirs". The code already limits the list for Program Heads, Deans, instructors, consultants and the VPAA. | done |
| 1.4 | **No duplicate references:** the same title and authors, or the same ISBN written any way, is refused on create, edit and import (409, naming the existing one; an archived one says to restore it). Done in the application, not as a database index, because the live data may already hold duplicates. | Single create accepted an exact duplicate in testing. (Idea: Plexus.) | done |
| 1.5 | Reference fields: **copies, status** (available, lost, withdrawn), **category**, **date received**. The picker uses the status. Done: the form, the library list (red Lost and No copies badges), the details panel, and the picker, which never attaches a lost, withdrawn or zero-copy title. A request to the instructor module: enforce the same rule when a reference is attached (today only the picker checks). | Closes the "available in library" gap. (Ideas: Plexus, Library-Management-System.) | done |
| 1.6 | Fix the demo data: the Director's four seeded comments (MATH311L) now sit on references, which the Director can see. Fresh databases only; an existing database keeps its old rows. | Keeps the demo consistent with the rules. | done |

### Phase 2: automate the Program Head's chasing (the main goal)

Today the Program Head has a poke button but no list of who is missing, and reminds people by hand.

| # | Task | What it does | Effort |
|---|---|---|---|
| 2.1 | **Term deadlines.** New table: school year, semester, optional program, syllabus due date. The Program Head and Dean set it. | One place for the due date that every reminder reads. (Idea: Syllus deadlines.) | done |
| 2.2 | **Missing submissions page** for the Program Head (the Dean sees it read-only). | Lists every assigned course not yet submitted: course, instructor, assigned date, days left or overdue, last reminder, last edit. Filters, CSV export, and "remind selected". (Idea: Syllus missing-syllabi report.) | done |
| 2.3 | **Automatic reminders**, a daily job in the same style as the existing clean-up job, with no new dependency. | Sends an in-app notification to the instructor at 7, 3 and 1 days before the due date, on the due date, then every 3 days overdue. Sends e-mail too when SMTP is set up. A log table stops duplicates after a restart. It stops the moment the plan is submitted, and a manual poke counts as a reminder. | done |
| 2.4 | **Program Head digest.** | A weekly in-app summary: "N plans not submitted, M overdue", plus a flag when many are overdue. | done |
| 2.5 | **Course assignment screen with a "roll over from last term" button.** | The server already supports assigning a course, lead instructor and term. The screen is missing. Roll-over creates next term's offerings for the whole program from last term's assignments, carrying over approved content; the Program Head unticks any that change. This replaces a bulk upload. | L |
| 2.6 | **Consultant roll-over.** | Consultants carry over too. At term end the Program Head sees a list to confirm or deactivate. | S |

Status of 2.1 to 2.4: built and checked in the real UI. The page is **Not Yet Submitted** in the Program Head's sidebar. A program with no due date gets no automatic reminders. The Dean can use the same API (deadline:manage) but has no page for it yet, because the Dean's sidebar has no items. Still to build in this phase: 2.5 and 2.6.

### Phase 3: less work for the approvers

| # | Task | What it does | Effort |
|---|---|---|---|
| 3.1 | **Review by exception** for the Director. | On submission the system checks the references: availability, age, missing ISBN, duplicates. The Director sees flagged items first. A clean plan shows "no issues found", and a person still clicks accept. | M |
| 3.2 | **Waiting-on-you reminders** for approvers. | A daily in-app digest when a plan has waited more than 3 days, and a notice to the Dean when it has waited more than 7. | M |
| 3.3 | **Returned and not resubmitted.** | Reminds the instructor at 3 and 7 days and tells the Program Head. | S |
| 3.4 | **When the Dean approves:** notify the instructor and the VPAA, mark the clean PDF and the review record ready, and file the plan in the term archive. | No manual follow-up. | S |
| 3.5 | **Nightly reference health job.** | Flags titles older than the recency limit, unavailable, or duplicated. Feeds the dashboard and the report below. | M |

### Phase 4: the Director and the VPAA

| # | Task | Notes | Effort |
|---|---|---|---|
| 4.1 | **Director dashboard:** plans waiting, references by type, outdated, unavailable, no ISBN, duplicates. | (Idea: Plexus dashboard.) | M |
| 4.2 | **Reference health report** with export. | (Idea: Plexus inventory report.) | S |
| 4.3 | **Real catalog settings:** one server-side settings row for the recency years and the availability rule, edited by the Director. | Today these live only in each browser. | M |
| 4.4 | **Title request queue** (Director side): approve and add, or reject with a reason. | After the Director interview. The instructor's "request" button belongs to the instructor module. | M |
| 4.5 | **VPAA term archive:** approved plans by semester and program. | Only if the OVPAA interview says it is needed. (Idea: Syllus archive.) | M |

### Phase 5: decisions we still need (nothing to build until answered)

- Who manages users: the Dean, the Program Head, or the superuser. The transcripts disagree.
- Does the Consultant comment only, or also approve? The Dean says comment only; Sir June says approve.
- When the Dean returns a plan, does it go straight to the instructor or through the Program Head?
- Whether the Dean may read the other approvers' comments before deciding.

## 4. Defaults used until the interviews answer

These come from the panel feedback and the transcripts, so we can build without waiting:

- Syllabus due **one week before the start of the term**; the Program Head can change it per term.
- Reminders at **7, 3, 1 and 0 days**, then every **3 days** overdue.
- An approver is reminded after **3 days**, and the Dean after **7**.
- The Program Head and Dean set deadlines. In-app notifications always; e-mail only when SMTP is set.

## 5. Questions still worth asking (only what the transcripts have not answered)

- **Dean Agnes:** who manages users; return path; whether the Dean sees others' comments.
- **Sir June:** deadlines for assigning courses and for composing a syllabus; the course offerings file.
- **Director of Libraries:** copies and status per title; age limit; who updates suggested books each term;
  whether instructors should request a missing title; review time.
- **Program Head:** how non-submitters are chased today; how often outcomes change.
- **Industry Consultant:** comment or approve; review time.
- **OVPAA:** what the role does with approved plans (nothing in the transcripts covers it).

## 6. How each automation avoids the usual traps

- **No duplicates:** every reminder is written to a log with a unique key (plan, kind, day) before it is sent.
- **No spam:** one message per plan per rule, and one digest per person per day.
- **It stops:** a reminder stops as soon as the plan is submitted, returned, or approved.
- **Test the dates:** the rules take the current date as an argument, so tests do not wait for real days.
- **A person can override:** the Program Head can pause reminders for one plan, and the Dean can see all of it.

## 7. Suggested order

1. Phase 1 (1.1 to 1.4 first). Small, and several close gaps we already measured.
2. 2.1 to 2.3, the missing list and the automatic reminders. This is the headline of the plan.
3. 2.5, the assignment screen with roll-over, and 1.5, the reference fields.
4. Phase 3, then Phase 4, then whatever the interviews unlock.

## 8. Where the ideas came from

| Source | What we took |
|---|---|
| Transcripts and panel feedback | The roles, the approval chain, the deadline rule, the review-record and comment-privacy rules. |
| Our own code and test review | Phase 1, the VPAA and permission fixes, the dead Dean pages, duplicate references, the unreachable consultant page. |
| Plexus (library lending system) | Copies and availability, unique ISBN, a dashboard of counts, an inventory health report, a request-and-approve queue. |
| Syllus (college syllabus system) | Deadlines, the missing-syllabi report with an Excel export, the semester archive, a last-modified stamp. |
| Library-Management-System (PHP student project) | Category, copyright year, date received, a status per title. |

The three repos are for ideas only. Plexus and Syllus have no usable license for copying code, and none of the
three is written in our stack. Their mistakes to avoid: a committed `.env`, a hard-coded admin password that
is reset on every migration, and no tests.

## 9. Not in this plan

Borrowing, returns, fines, student accounts, uploads, a document repository, and anything on the instructor side.
