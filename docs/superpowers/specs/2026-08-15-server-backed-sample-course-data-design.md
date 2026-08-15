# Server-Backed LPSM Sample Course Data Design

**Date:** 2026-08-15  
**Scope:** `composition/client` and `composition/server` only  
**Status:** Approved direction; awaiting written-spec review

## Problem

The approver course table replaces an empty or failed `/api/assignments` response with client-generated demo rows. Those rows use fabricated `pc_offering_id` values in the `9000` range. Clicking one sends that invented identifier to server endpoints such as `/api/course-details/:pcId/:revNum`. The database has no matching `ProgramCourseOfferings` row, so BSCS515 and every other generated demo course fail with `404 Program Course Offering version not found`.

This is not a backend availability problem. The active backend is healthy, and all six assigned current-term offerings return complete data from the course-details, outcome-alignment, coverage, criteria, references, and ILO endpoints. The failure starts at the client-only fallback boundary.

The repository's client sample list says `server/seeders/populate_full_syllabi.js` supplies these courses. That seeder is absent from the active `composition` backend. Its historical version targeted an obsolete MySQL installation, so it cannot be restored or run against the active SQLite database.

## Goal

Provide repeatable sample course data with real database identities so every displayed row can open a complete learning plan and participate in comments and approval workflows. Empty terms must remain honestly empty, and API failures must display an error rather than manufacturing clickable records.

## Sample Dataset

Seed the following 13 non-conflicting sample courses from the existing complete client syllabus dataset:

| Intended state | Course codes |
| --- | --- |
| Draft | `BIT301`, `BSCS513`, `IT 312` |
| Pending | `BSCS511`, `BSCS502`, `IT 321` |
| Returned | `BSCS515`, `BIT304`, `BSCS508`, `IT 402` |
| Approved | `IT 411`, `BSCS504`, `IT 305` |

Do not seed the legacy sample definitions for `BIT201`, `BIT202`, or `BIT203`. Those codes already identify different courses in the active database:

- `BIT201` is Database Systems, not Data Structures and Algorithms.
- `BIT202` is Software Engineering, not Object-Oriented Programming.
- `BIT203` is Mobile Application Development, not Database Management Systems.

Existing records are authoritative. The sample-data task must not rename, overwrite, delete, or repurpose them.

## Architecture

### Server-owned identities

Add an idempotent sample seeder under `composition/server/seeders`. The seeder may dynamically read the existing `composition/client/src/data/syllabiData.js` only while the explicit development seed command runs. Live server startup and request handling must not import client source.

The seeder owns a small manifest containing the 13 approved codes and intended statuses. It looks up the full syllabus payload by course code, then creates real normalized rows using database-generated primary keys. No component may assume or hard-code the resulting IDs.

### Normalized sample records

For each sample course, the seed transaction creates or completes the records needed by the retained LPSM pages:

- course and program course offering revision;
- course offering assignment;
- assignment workflow logs matching Draft, Pending, Returned, or Approved;
- course outcomes and program-outcome alignments;
- intended learning outcomes and schedules;
- topics, subtopics, and ILO-topic links;
- teaching and learning activities and assessment links;
- grading criteria;
- references and ILO-reference links.

Comments are not seeded. Christian's commenting flow must operate on the newly created real outcome and ILO identifiers in the same way it operates on BIT313L.

### Idempotence and preservation

The seeder is safe to rerun:

- identify a course by its exact course code;
- identify an offering by course plus revision;
- create an assignment only when that offering has none;
- add only missing dependent records;
- create sample workflow logs only for a newly created sample assignment with no logs;
- never delete existing records to rebuild a course;
- never overwrite edited text, workflow logs, comments, resolutions, references, or passwords.

Use a transaction per course so a failed course leaves no partial new graph while other courses can still be diagnosed independently.

### Client behavior

`ApprovalCoursesTable` must render only rows returned by `/api/assignments`.

- A successful empty response renders the existing status-specific empty state.
- A failed request renders a distinct server-error state with a Retry action.
- No empty or failed response generates fake assignments or offering IDs.
- The untracked `demoAssignments.js` and its test are removed after their only consumer is removed.
- `demoCourses.js` remains only while the existing local workflow compatibility layer imports it; it must not provide table rows or offering IDs.

The server's assignment workflow logs remain authoritative for table status. Existing local workflow compatibility remains in scope for approval-button gating, with its sample states aligned to the seeded manifest; replacing that entire compatibility layer is a separate architectural project.

## Data Flow

1. A developer explicitly runs the targeted sample seeder.
2. The seeder loads the 13 approved syllabus definitions and writes missing normalized SQLite records.
3. `/api/assignments` returns rows containing real `pc_offering_id` and `revision_number` values.
4. Instructor and approver tables link using those server-issued identifiers.
5. Course detail, coverage, grading, alignment, reference, comment, and workflow requests resolve against the same offering graph.

No browser fallback participates in this flow.

## Error Handling

- Missing source definitions fail the affected course transaction and name the code in the seed report.
- Conflicting existing course titles fail closed; the seeder reports the conflict and does not modify that course.
- A partially existing sample course is completed only through missing records; existing content remains untouched.
- Assignment API errors are visible in the course table and are not presented as an empty term.
- A genuine empty term shows no sample rows unless the sample seeder assigned courses within that term.

## Testing and Acceptance

Implementation follows test-driven development.

Automated coverage must prove:

1. the sample manifest contains 13 unique, non-conflicting course codes;
2. rerunning the seed does not add duplicates or overwrite a modified value;
3. each intended status produces the necessary assignment workflow-log shape;
4. empty and failed assignment responses cannot produce a fabricated course link;
5. the removed `9000`-range offering-ID generator is absent from the client runtime;
6. existing utility tests, JSX import checks, client build, and server syntax checks still pass.

After seeding the active development database, verify every seeded assignment through the live endpoints. For each real offering/revision, course details must return HTTP 200, and outcome alignment, coverage, grading criteria, references, and ILO data must contain the sections required by the learning-plan UI. BSCS515 must open from the Program Head table without a 404. At least one seeded course must be opened as Instructor and Program Head to confirm both roles read the same server record.

## Out of Scope

- Running or repairing the known migration ledger mismatch.
- Replacing existing real courses or their titles.
- Seeding comments or changing current comment records.
- Removing the complete client syllabus dataset while retained screens still use it.
- Replacing the entire local workflow compatibility layer.
- Changing modules outside the active `composition` application.

