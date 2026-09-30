# Program Head Alignment Design

## Goal

Align the Program Head CO–PO, PO–PEO, and COAEP pages with the LPMS interview requirements without replacing the existing syllabus-builder workflow.

## Decisions

- The approved syllabus revision is the source of truth for COs, ILOs, assessment tools, and COAEP output.
- COAEP is derived and read-only in this LPMS. It is not a manual upload or replaceable document.
- CO–PO is a course-and-program review view. Program Heads request revisions through the learning-plan review flow rather than silently editing faculty CO alignment here.
- PO–PEO is program master data. Program Heads may edit the matrix, but must explicitly select the program first.
- TOS and actual CO-assessment results remain outside this change; COAEP presents the downstream generated plan and its performance target.

## User-visible changes

- COAEP exposes `View Generated COAEP` and `Export`, removes upload/replace/delete actions, and labels its approved-syllabus source.
- CO–PO removes in-place matrix editing and labels the matrix as a review surface.
- PO–PEO adds a program selector and retains its explicit edit/save/cancel workflow per selected program.

## Non-goals

- No course-assignment administration, TOS calculation, approval-chain rewrite, database migration, or new CO-assessment-results module.
