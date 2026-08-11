# BACKLOG-CURRENT — Edrian's module (quick reference)

> Short version. The authoritative task list is `BACKLOG.md` (reconciled on
> 2026-08-11 — done items marked `[x]` with verified notes). This file is a
> one-glance "what is genuinely left" summary for someone handing the module
> to a coding agent.
>
> Scope: Edrian's module — Reference Library · Review & Approval · Status ·
> Notifications · Comments · VPAA read-only view.
> Do NOT modify Christian's (learning-plan/ILO/TLA/alignment) or Arra's
> (TOS/assessment/points) code — integrate via their interfaces.

## Genuinely left (5 open items in BACKLOG.md)

1. **Spelling/grammar check at ENTRY** (BACKLOG L194, partial) — `reviewGate.checkText`
   runs in approval flow; add the submission-gate hook so errors are caught before
   the program head sees them. MEDIUM.
2. **Multi-step → stepper** (L290) — the mobile-first, one-task-at-a-time restructure.
   MEDIUM.
3. **Screens show everything / too many clicks** (L295) — the layout restructure
   (one focused screen, fewer clicks). MEDIUM.
4. **COAEP program-key mismatch** (L327) — RISKY; needs a data migration. Checked open.
5. **References Summary badges wrong reference** (L337) — the endpoint filters on
   ILO id vs reference id; counting inflates. SAFE but unverified-fixed. Checked open.

## Large parts ALREADY done + passing tests (do NOT re-fix)
- Reference Library: sorting, recency, course-scope, auto-suggest, chapter→book,
  per-course catalog, director per-semester upload, availability, O'Reilly fallback —
  all in `referenceCatalog.js` (11/11 tests).
- Review & Approval: return-needs-comment, consolidated status, signature, full
  approver chain (incl. VPAA read-only), structured PH comments, approval persists
  on reload — `reviewGate.js` (7/7) + `workflowRouting`/`session` tests.
- Status/Notifications LOGIC: source-of-truth status, who-hasn't-submitted, calendar
  deadlines + reminders — `planStatus.js` (4/4) — but **UI wiring still pending**.
- Login identity fix + submission gate — `session.js`, `submissionGate.js` (pass).
- Reference picker: timestamp-year, type-casing, selected-chips, blank-type reachability

## To run the module's self checks
From `client/`: `node src/utils/<name>.test.js` for each util test (they're plain
node scripts, no framework). `npm run build` for the client.
