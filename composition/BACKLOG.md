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

- [ ] **The "All" reference filter mixes types and confuses the user.**
      Reference type filter in the reference picker.
      *Fix:* remove "All"; Textbook shows only textbooks, OER only OER, OR only OR. [15:02]–[16:04]
      **RISK: SAFE** — one filter control.

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

- [ ] **Submitting does not reliably route into the correct approver's queue.**
      *Fix:* submission sets pending and places the item in the right queue. [44:50] [45:09]
      **RISK: MEDIUM** — the spine of the workflow.

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

- [ ] **Login does not hold identity across the approval flow — the panel saw the account switch mid-demo.**
      *Fix:* a user stays that user across the whole flow; signup creates a
      valid account with the correct role; roles map to their approver view. [45:27] [45:45]
      **RISK: RISKY** — authentication and sessions; a human must review this.

- [ ] **Syllabi can be submitted while hours and ILO allocation do not align.**
      *Fix:* block submission until alignment checks pass, so the program head
      confirms rather than hand-checks. The alignment computation lives in the
      learning-plan and TOS modules — integrate with their interfaces, do not
      reimplement. [47:53] [48:30] [48:48] [49:06]
      **RISK: RISKY** — crosses module boundaries; confirm ownership first.

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
