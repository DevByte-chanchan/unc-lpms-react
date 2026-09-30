# Superseded draft

This draft used nonexistent `composition` paths, authorization modules, and
server test files. It is retained only to avoid silently deleting prior work.
Use the revised plan in the parent LPMS checkout:

`C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\docs\superpowers\plans\2026-09-27-lpms-change-impact-guard.md`

# Implementation Plan: LPMS Change Impact Guard

> **For agentic workers:** implement this plan task-by-task. Follow the LPMS
> ownership boundary: work only in `composition/client`, `composition/server`,
> and the documented hackathon/spec paths. Do not modify the Between project.

## 1. Establish the contract with failing tests

**Files:**

- Create `composition/server/utils/changeImpactGuard.test.js`.
- Create `composition/client/src/utils/changeImpactGuardUi.test.js`.

**Work:**

- Test the supported reference-review request.
- Test required signal matching and the exact `manual_review_required` result
  for an unrelated request such as “Change the color of the login button.”
- Test that every returned affected path exists under the LPMS worktree.
- Test that anchors resolve to a line and excerpt.
- Test that the report contains routes, roles, workflow states, tests, plan, and
  do-not-touch boundaries.
- Test that analysis is pure and does not write localStorage, source files, or
  database state.

**Verification:**

```text
cd composition/server
node --test utils/changeImpactGuard.test.js

cd ../client
node --test src/utils/changeImpactGuardUi.test.js
```

## 2. Add the versioned LPMS impact catalog

**Files:**

- Create `composition/server/utils/changeImpactCatalog.js`.
- Create `composition/server/utils/changeImpactCatalog.test.js`.

**Work:**

- Define the one supported intent and its required signal patterns.
- Define catalog nodes for the approval route, comment components, client rules,
  comment API/controller/models, authorization, workflow policy, and tests.
- Store source anchors as stable symbol or text markers rather than hard-coded
  line numbers.
- Mark each node as `likely`, `review-only`, or `boundary`.
- Add explicit do-not-touch entries for instructor curriculum editors, unrelated
  reference-library screens, migrations, external API adapters, and the Between
  project.
- Verify every catalog path and anchor against the current worktree.

**Verification:**

```text
cd composition/server
node --test utils/changeImpactCatalog.test.js
```

## 3. Implement the pure deterministic analyzer and report formatters

**Files:**

- Create `composition/server/utils/changeImpactGuard.js`.
- Create `composition/server/utils/changeImpactReport.js`.
- Extend `composition/server/utils/changeImpactGuard.test.js`.

**Work:**

- Normalize request text and match only the supported intent.
- Resolve catalog anchors to real file paths, line numbers, and short excerpts.
- Produce the report contract from the specification.
- Return `manual_review_required` when the intent is unsupported or an anchor is
  stale.
- Keep the analyzer free of Express, Sequelize, browser globals, and writes.
- Add Markdown and JSON serialization with stable field ordering.
- Include catalog version and optional repository revision metadata.

**Verification:** rerun the focused server tests and compare Markdown/JSON
  exports for equivalent content.

## 4. Add the development-only analysis endpoint

**Files:**

- Create `composition/server/routes/changeImpact.js`.
- Modify `composition/server/server.js` only to conditionally mount the route.
- Create `composition/server/utils/changeImpactRoute.test.js`.

**Work:**

- Add `POST /api/dev/change-impact/analyze`.
- Require the existing authenticated API boundary.
- Require an explicit development feature flag such as
  `LPMS_CHANGE_IMPACT_GUARD=1`; return a clear disabled response otherwise.
- Accept `{ requestText }`, reject empty input, and return supported or manual
  review reports without throwing for unsupported text.
- Do not accept patches, shell commands, file writes, or database mutations.

**Verification:**

- Unauthenticated request is rejected.
- Disabled flag is rejected.
- Supported and unsupported requests return the correct report status.
- No route-security regression occurs.

## 5. Add the developer-facing client route and report workspace

**Files:**

- Create `composition/client/src/pages/ChangeImpactGuard.jsx`.
- Create `composition/client/src/styles/ChangeImpactGuard.module.sass`.
- Modify `composition/client/src/App.jsx` with the development route.
- Modify `composition/client/src/utils/routes.js` and its route test.
- Extend `composition/client/src/utils/changeImpactGuardUi.test.js`.

**Work:**

- Add a single request editor with the supported demo request as a starter.
- Call the guarded analysis endpoint through the existing `fetchJson` helper.
- Render evidence grouped by route, client, server, authorization, workflow,
  and tests.
- Render a prominent **Manual review required** state for unsupported requests.
- Render stale-anchor and API-error states without hiding the last valid report.
- Keep the design dense and evidence-first; do not add dashboard cards,
  statistics, gradients, or chatbot affordances.

**Verification:** run the UI source tests, route tests, lint, and a Vite build.

## 6. Add local approval and export behavior

**Files:**

- Modify `composition/client/src/pages/ChangeImpactGuard.jsx`.
- Extend `composition/client/src/utils/changeImpactGuardUi.test.js`.

**Work:**

- Add **Approve plan** and **Needs revision** controls.
- Persist only `{ reportKey, status, approvedAt }` in a dedicated localStorage
  key.
- Make it visually explicit that approval is local and does not apply changes.
- Download Markdown and JSON generated from the current report.
- Ensure exports contain the same evidence, plan, boundaries, and status.

**Verification:** test export content and confirm no `fetch` request or file
  mutation occurs when approving the plan.

## 7. Capture truthful IBM Bob evidence

**Files:**

- Create `docs/hackathon/ibm-bob-change-impact-guard-evidence.md` only after
  real Bob activity is available.

**Work:**

- Record the actual planning prompt, implementation prompts, review/debugging
  prompts, and verification prompts used with IBM Bob.
- Attach real screenshots or exported transcripts.
- Record exact commands and outputs for focused tests, full tests, lint, and
  build.
- Link the exported Markdown/JSON impact report.
- Mark any unavailable artifact as pending rather than inventing it.

**Verification:** manually check every claim in the evidence file against a
  saved artifact or command output.

## 8. Full verification and handoff

**Work:**

- Run all client tests:

```text
cd composition/client
node --test src/utils/*.test.js
npm run lint
npm run build
```

- Run all server tests:

```text
cd composition/server
node --test utils/*.test.js
```

- Run `git diff --check` from the repository root.
- Confirm the normal LPMS approval and comment routes still work.
- Confirm the guard is unavailable when its development flag is off.
- Confirm no Between files were modified.
- Review the final report and evidence artifact before claiming completion.

## Review checklist before implementation begins

- [ ] The single supported request is still the reference-review comment rule.
- [ ] Unsupported requests do not produce guessed impact lists.
- [ ] The analyzer is deterministic and evidence-linked.
- [ ] The tool cannot edit code, data, workflows, or migrations.
- [ ] Local approval is clearly not product approval.
- [ ] Existing LPMS routes, roles, workflow states, and tests remain the source
      of truth.
- [ ] IBM Bob evidence is collected from actual use only.
