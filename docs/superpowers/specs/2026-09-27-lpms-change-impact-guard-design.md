# Superseded draft

This draft assumed a `composition/client` and `composition/server` checkout and
is no longer authoritative. The verified LPMS target uses `src` and `server`.
See the revised specification in the parent LPMS checkout:

`C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\docs\superpowers\specs\2026-09-27-lpms-change-impact-guard-design.md`

# LPMS Change Impact Guard — Design Specification

**Status:** Proposed for implementation
**Date:** 2026-09-27
**Scope:** `composition/client` and `composition/server` only

## Objective

Add a developer-facing planning tool to the existing LPMS codebase. A developer
enters a requested code change and receives a reviewable, evidence-linked impact
map across the real client, server, authorization, workflow, and test surfaces.

The first supported request is deliberately narrow:

> Add a required `reference-review` comment type for the Director of Libraries.
> It must target a specific reference and require an actionable comment before
> returning a learning plan.

The tool is deterministic and local-first. It is not presented as an AI runtime
feature and does not require an external model or API key. IBM Bob is used as a
development assistant for planning, implementation, review, debugging, and
verification; that usage is documented with real evidence rather than implied by
the product name.

## Non-goals

- No curriculum-facing AI assistant or chatbot.
- No automatic code, migration, data, or workflow changes.
- No automatic approval, return, or comment submission.
- No external AI provider in the MVP.
- No generic repository-wide semantic understanding claim.
- No modification of the separate Between project.
- No new LPMS database tables or schema changes for the MVP.

## Existing LPMS integration evidence

The current architecture already exposes the dependency chain the guard needs:

| Surface | Evidence in the codebase | Why it matters |
| --- | --- | --- |
| Route | `client/src/App.jsx`, `client/src/utils/routes.js`, `client/src/pages/ApprovalSyllabus.jsx` | Resolves `/role/:approver/courses/:code` into the approval workspace. |
| Comment UI | `client/src/components/ApprovalSyllabusSections.jsx`, `client/src/components/ApprovalCommentBox.jsx` | Owns reviewer actions, role-specific Director of Libraries behavior, targets, and submission payloads. |
| Client rules | `client/src/utils/reviewGate.js`, `client/src/utils/workflowHelpers.js` | Encodes comment types, return validation, stages, and review-round transitions. |
| API boundary | `server/routes/comments.js`, `server/routes/courseReferenceRoutes.js` | Defines comment/reference endpoints and allowed reviewer roles. |
| Persistence | `server/controllers/commentController.js`, `server/models/comment.js`, `server/models/commentTarget.js` | Resolves course/ILO/reference targets and stores comments. |
| Authorization | `server/middleware/auth.js`, `server/middleware/courseAuthorization.js` | Protects sessions, roles, and course-level access. |
| Workflow | `server/controllers/assignmentController.js` | Enforces submitted, parallel-review, returned, and Dean transition rules. |
| Verification | `reviewGate.test.js`, `referenceComments.test.js`, `workflowPolicy.test.js`, `routeSecurity.test.js`, `apiSecurity.test.js`, `moduleBoundary.test.js` | Existing checks that can catch regressions from the demo change. |

`SyllabusRevisionsSections.jsx` and `Revisions.jsx` remain useful context, but
they are not the primary impact entry point. The developer tool should analyze
the live approval path above rather than the older local/demo editor path.

## User flow

1. A developer opens the development-only Change Impact Guard route.
2. The request field is prefilled with the supported reference-review scenario.
3. The developer selects **Analyze change**.
4. The guard normalizes the request and matches it against the one supported
   intent. It resolves catalog anchors to real file paths and source locations.
5. The report shows:
   - affected files and why each is involved;
   - affected route and component flow;
   - roles and permission checks at risk;
   - workflow states and transitions at risk;
   - tests/checks to update or run;
   - a safe implementation sequence;
   - explicit do-not-touch boundaries;
   - assumptions and evidence limitations.
6. The developer can mark the plan **Approved locally**, **Needs revision**, or
   leave it pending. Approval only changes local UI state and localStorage; it
   never applies a patch or writes LPMS data.
7. The developer downloads the report as Markdown or JSON.
8. Any unsupported request returns a successful, readable report with the exact
   status **Manual review required** and explains which supported signals were
   not found. It must not guess a file list.

## Deterministic analysis contract

The server-side pure analyzer accepts:

```js
analyzeChangeRequest(requestText, {
  catalog,
  repositoryRoot,
  catalogVersion
})
```

The supported intent requires all of these signals:

- `reference-review` or equivalent reference-review wording;
- Director of Libraries/library-director wording;
- comment/approval/review wording;
- target-reference or actionable-before-return wording.

Everything else is returned as `manual_review_required`.

The report contract is:

```json
{
  "schemaVersion": "1.0",
  "status": "supported",
  "intent": "reference-review-comment-rule",
  "request": { "raw": "...", "normalized": "..." },
  "evidence": [{ "signal": "...", "source": "catalog rule" }],
  "routes": [{ "path": "...", "file": "...", "why": "..." }],
  "affectedFiles": [{
    "path": "...",
    "layer": "client|server|test|documentation",
    "editLikelihood": "likely|review-only|boundary",
    "why": "...",
    "anchors": [{ "symbol": "...", "line": 0, "excerpt": "..." }]
  }],
  "roles": [{ "role": "...", "flow": "...", "risk": "..." }],
  "workflowStates": [{ "state": "...", "transition": "...", "risk": "..." }],
  "tests": [{ "path": "...", "command": "...", "why": "..." }],
  "implementationPlan": [{ "order": 1, "step": "...", "validation": "..." }],
  "doNotTouch": [{ "path": "...", "reason": "..." }],
  "assumptions": ["..."],
  "humanApproval": { "status": "pending", "approvedAt": null }
}
```

Catalog anchors are explicit and checked against the filesystem. The resolver
adds line numbers and short excerpts at analysis time so the report is tied to
the checked-out LPMS revision. The catalog is versioned and the report includes
its version. If a required anchor is missing, the report becomes
`manual_review_required` rather than returning stale evidence.

## MVP impact map for the supported scenario

The initial report should identify these likely surfaces:

- `ApprovalSyllabusSections.jsx`: approval action, role branch, existing comment
  payload, and Director of Libraries reference handling.
- `ApprovalCommentBox.jsx`: comment type, required reference target, and
  Director-specific submission validation.
- `reviewGate.js`: comment metadata/encoding and actionable return validation.
- `workflowHelpers.js`: client-side stage and returned-round behavior.
- `routes/comments.js`: reviewer role allow-list and comment endpoint contract.
- `commentController.js`: target resolution, reference attachment, and ILO
  fallback behavior.
- `comment.js` and `commentTarget.js`: persistence contract review; no schema
  edit is expected if the type remains an encoded message plus `references`
  target.
- `courseAuthorization.js` and `auth.js`: role and course access checks.
- `assignmentController.js`: server-side return/accept transition policy.
- Reference summary route/controller and existing reference-comment helpers:
  reviewed for target vocabulary and regression coverage, not automatically
  marked for modification.
- Existing workflow, route-security, API-security, reference-comment, and
  module-boundary tests.

## Developer UI

The UI is a compact developer workspace, not an end-user dashboard:

- one request editor;
- one supported-scenario hint;
- an evidence summary;
- a vertical impact chain grouped by client, server, authorization, workflow,
  and tests;
- implementation and verification checklists;
- an explicit do-not-touch section;
- local approval state;
- Markdown and JSON export buttons.

It reuses LPMS typography, controls, focus treatment, spacing, and responsive
patterns. It has loading, disabled, unsupported, stale-anchor, and error states.

## Runtime and safety boundary

- The route and API are enabled only when the development feature flag is set.
- The API is still behind the existing authenticated `/api` boundary.
- No endpoint accepts source patches, shell commands, migrations, or data writes.
- The client never receives arbitrary repository contents; it receives the
  curated evidence excerpts required for the report.
- Local approval is stored under a dedicated localStorage key and is clearly
  labelled as local-only.

## Export

Markdown is intended for the hackathon walkthrough and review handoff. JSON is
intended for reproducibility and automated checks. Both exports include the
request, catalog version, source revision if available, evidence anchors,
affected surfaces, plan, boundaries, and local approval status.

## IBM Bob evidence

The submission evidence file will be:

`docs/hackathon/ibm-bob-change-impact-guard-evidence.md`

It must contain only real artifacts:

- the actual Bob prompts used for planning and implementation;
- Bob outputs that influenced the design or code;
- screenshots or exported transcripts;
- files changed and why;
- review/debugging prompts and results;
- exact test, lint, and build commands with captured output;
- the exported Change Impact Guard report used in the demo.

No IBM, watsonx, banking, or runtime-AI integration will be claimed unless it
is actually present in the repository and verified.

## Acceptance criteria

- The supported reference-review request produces a non-empty report tied to
  real LPMS files and source anchors.
- The report identifies affected routes, components, server contracts, roles,
  workflow states, and existing tests.
- The report includes a safe implementation sequence and do-not-touch list.
- Approving the plan changes only local UI/localStorage state.
- Markdown and JSON downloads contain the same report information.
- Unsupported requests visibly say **Manual review required** and do not guess.
- No LPMS workflow, comment, database, or source file is mutated by the tool.
- Focused tests, existing test suites, lint, and production build pass.
- IBM Bob evidence is saved from real activity and is not fabricated.
