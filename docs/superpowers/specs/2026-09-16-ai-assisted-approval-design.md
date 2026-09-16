# Explainable AI-Assisted Learning Plan Approval — Design Brief

## Objective

Add role-specific, explainable AI decision support to the existing learning-plan approval module. The AI helps reviewers inspect submitted plans more consistently and efficiently, but it never approves, accepts, or returns a plan and never changes submitted content.

## Scope

The feature begins only after a learning plan has been submitted. It reads the submitted revision and existing approval data; it does not modify or depend on the instructor submission interface.

Included:

- Role-specific analysis for the Program Head, Industry Consultant, and Director of Libraries.
- A consolidated briefing for the Dean after all three parallel reviewers accept the current round and the existing workflow reaches the Dean stage.
- Evidence-backed findings, draft comments, confidence, and reviewer feedback.
- Research measurements for accuracy, agreement, usefulness, and review time.

Excluded:

- Automatic approval, acceptance, return, scoring, or workflow mutation.
- Automatic editing of learning plans.
- Instructor-facing AI or submission validation UI.
- Model training or fine-tuning in the first version.

## Role-specific review rubrics

### Program Head

- Curriculum consistency and academic completeness.
- Course-outcome and program-outcome alignment.
- Topic sequence, contact hours, activities, and assessment coverage.
- Missing or contradictory academic content.

### Industry Consultant

- Relevance to current professional practice.
- Practical skills, employability, and authentic assessment.
- Currency of technologies, methods, and competencies.
- Gaps between stated outcomes and real-world application.

### Director of Libraries

- Relevance, currency, completeness, and duplication of references.
- ISBN, author, publisher, publication year, and resource-link quality.
- Balance of textbooks, open educational resources, and online resources.
- References that are five years old or older and may require review.

### Dean

- Consolidated summary of the three completed reviews.
- Unresolved, repeated, or conflicting findings.
- Institutional-policy and cross-section consistency.
- Changes between revisions and the disposition of earlier comments.
- A neutral decision briefing without an approval recommendation.

## Approved architecture

Use one shared extraction pipeline followed by isolated role-specific analyses.

1. The server loads the authorized submitted revision.
2. Deterministic checks evaluate objective rules such as required data, hours, dates, duplicate references, and reference age.
3. A snapshot builder converts course details, outcomes, topics, activities, assessments, mappings, references, revisions, and comments into a stable structured document.
4. The AI review service combines that snapshot with the authenticated reviewer's rubric and approved institutional guidance.
5. The model must return validated structured findings rather than free-form prose.
6. The reviewer confirms, rejects, or edits each finding and may copy a finding into the existing comment workflow.
7. Parallel reviewers see only their own specialized reports, preventing cross-reviewer influence.
8. After the existing workflow reaches the Dean stage—meaning all three parallel reviewers accepted the current review round—the Dean can generate a consolidated report from the frozen snapshot, role reports, decisions, and comments.

If the AI service is unavailable, the ordinary approval workflow remains fully usable.

## Finding contract

Each finding contains:

- Role and review category.
- Severity: information, warning, or critical.
- Concise issue statement and explanation.
- Exact evidence locating the relevant submitted content.
- Referenced rubric or policy when available.
- Suggested reviewer comment.
- Confidence value.
- Reviewer disposition: pending, confirmed, rejected, or edited.
- Reviewer note and timestamps.

The server rejects malformed, unsupported, unauthorized, or out-of-scope output before storage.

## Components

### Server

- **Snapshot builder:** reads existing course and revision data and produces a deterministic review input.
- **Rule evaluator:** produces objective findings without AI.
- **Role-rubric registry:** owns the allowed criteria and guidance for each role.
- **AI provider adapter:** performs model calls behind one replaceable server-side interface.
- **Output validator:** enforces the finding schema, evidence locations, limits, and allowed categories.
- **Dean consolidator:** summarizes the accepted current-round parallel reports after the workflow reaches the Dean stage, without exposing them early.
- **Research metrics service:** aggregates reviewer responses and elapsed review time.

Model credentials remain on the server and are never exposed to React.

### Client

- **AI Review panel:** status, summary, findings, filters, evidence links, and retry controls.
- **Finding card:** confirm, reject, edit, and create-comment actions.
- **Evidence navigation:** opens or highlights the referenced syllabus section.
- **Dean briefing:** consolidated issues, agreements, conflicts, and unresolved items.
- **Research dashboard:** aggregate evaluation results available only to authorized research or administrative users.

## Persistence

Add three independently auditable records:

- **AIReviewRuns:** course offering, revision, role, snapshot hash, rubric version, provider/model metadata, status, duration, and timestamps.
- **AIReviewFindings:** review run, category, severity, issue, evidence, policy reference, suggested comment, confidence, and validation status.
- **AIReviewerFeedback:** finding, reviewer, disposition, edited text, optional note, and response time.

A unique constraint prevents duplicate active runs for the same course revision, role, snapshot, and rubric version. A changed revision or rubric creates a new run and preserves previous results.

## Authorization and isolation

- Existing course-level authorization remains mandatory for all AI endpoints.
- Only the authenticated role can generate or read its parallel report.
- Parallel reports remain isolated until the workflow reaches the Dean stage.
- The Dean may read only reports belonging to the selected authorized course and revision.
- AI-generated text is treated as untrusted data and escaped before rendering.
- Prompts, snapshots, findings, feedback, and version metadata are audit logged without storing secrets.

## Failure behavior

- Timeouts, provider errors, invalid output, or rate limits show a non-blocking retry state.
- Partially valid output is not silently accepted; the run is marked failed unless the complete response passes validation.
- A stale report is clearly labelled when its snapshot hash no longer matches the selected revision.
- AI findings cannot trigger workflow actions through either the client or server API.

## Research design

Primary question:

> Does role-specific, explainable AI decision support reduce learning-plan review time and improve review consistency without reducing expert control?

Measurements:

- Precision, recall, and F1 against findings labelled by qualified reviewers.
- Reviewer agreement with AI findings and agreement between human reviewers.
- Mean review time with and without AI assistance.
- Finding confirmation, rejection, and edit rates.
- Unsupported-evidence and invalid-output rates.
- Reviewer usability and perceived-usefulness scores.

The evaluation compares ordinary manual review with AI-assisted review using the same rubric and comparable learning plans. Reports retain the rubric, snapshot, and model versions required to reproduce each result.

## Delivery sequence

1. Establish the review schema, role rubrics, authorization rules, and deterministic snapshot tests.
2. Add persisted review runs, findings, feedback, and server-side provider abstraction.
3. Deliver the Program Head report and evidence-based review panel as the vertical slice.
4. Add Industry Consultant and Director of Libraries rubrics using the same pipeline.
5. Add reviewer feedback, comment drafting, and research metrics.
6. Add Dean consolidation after parallel-review completion.
7. Run security, failure, usability, and expert-labelled evaluation tests.

## Acceptance criteria

- Every stored AI finding identifies a role, category, evidence location, and reviewer disposition.
- Reviewers cannot access another parallel reviewer's report before the Dean stage.
- The Dean briefing is unavailable until the existing workflow reaches the Dean stage after all three parallel reviewers accept the current round.
- AI downtime never prevents manual review or workflow actions.
- No AI endpoint can approve, accept, return, or modify a learning plan.
- Research exports contain enough versioned metadata to reproduce aggregate evaluation results without exposing credentials.
