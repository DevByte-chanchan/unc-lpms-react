# Worktree Root and Runtime Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leave one unambiguous LPMS application in this worktree—the retained LPSM and Christian comment-integration runtime under `composition`—and prove its persistent comment flow still works.

**Architecture:** Delete the obsolete root application at its top-level ownership boundary instead of trying to maintain two partially overlapping React/backend trees. Extend the active client's boundary test so tracked root runtime paths cannot silently return, rewrite the root README around the real startup commands, then verify the retained client/server and exercise the live two-role comment flow.

**Tech Stack:** React 19, Vite 7, Node.js, Express, Sequelize, SQLite, PowerShell, Node assertion scripts, Codex in-app Browser.

## Global Constraints

- Work only inside `C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2`.
- Do not modify the parent checkout, another worktree, Git metadata, or anything outside that absolute directory.
- The only runnable application retained is `composition/client` plus `composition/server`.
- Preserve all unrelated pre-existing dirty changes inside `composition` unless a task names the exact file or hunk.
- Keep Edrian's LPSM approval, reference, revision, role/session, status, notification, and comment behavior.
- Keep Christian's instructor course/syllabus, CO/ILO, topic, TLA, reference, revision, course-coverage, and comment display/resolution surfaces.
- Keep Christian-authored `TLAAssessment` backend records consumed by retained course coverage.
- Do not drop, reset, replace, or rewrite the current database or its migration metadata.
- Do not try to fix the known Umzug/`ensureAuthSchema` reset-column migration-ledger mismatch in this cleanup.
- Use `apply_patch` for text/source edits and deletions. The ignored root `node_modules` directory and binary `src/assets/unclogo.png` require exact validated filesystem deletion because `apply_patch` cannot delete a directory or binary bytes.
- Stage and commit only the exact files belonging to each task.
- The acceptance path is server-backed: Program Head save -> `Comments`/`CommentTargets` -> instructor display -> resolution update -> reload persistence.

---

### Task 1: Remove the obsolete root application and document the real runtime

**Files:**
- Modify: `composition/client/src/utils/moduleBoundary.test.js`
- Modify: `README.md`
- Delete directory contents: `client/`
- Delete directory contents: `config/`
- Delete: `eslint.config.js`
- Delete: `index.html`
- Delete directory contents: `infra/`
- Delete directory contents: `migrations/`
- Delete directory contents: `models/`
- Delete local ignored directory: `node_modules/`
- Delete: `package-lock.json`
- Delete: `package.json`
- Delete directory contents: `public/`
- Delete directory contents: `seeders/`
- Delete directory contents: `server/`
- Delete directory contents: `src/`
- Delete: `vite.config.js`

**Interfaces:**
- Consumes: the active runtime rooted at `composition/client/src/main.jsx` and `composition/server/server.js`.
- Produces: a single-app worktree and permanent `rootDuplicatePaths` absence checks in the retained client test suite.

- [ ] **Step 1: Record and validate the exact worktree and deletion targets**

Run from the worktree root:

```powershell
$expectedRoot = 'C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2'
$actualRoot = (Resolve-Path -LiteralPath '.').Path
if (-not [StringComparer]::OrdinalIgnoreCase.Equals($actualRoot, $expectedRoot)) {
  throw "Wrong worktree: $actualRoot"
}

$deleteNames = @(
  'client', 'config', 'eslint.config.js', 'index.html', 'infra',
  'migrations', 'models', 'node_modules', 'package-lock.json',
  'package.json', 'public', 'seeders', 'server', 'src', 'vite.config.js'
)

foreach ($name in $deleteNames) {
  $candidate = [IO.Path]::GetFullPath((Join-Path $actualRoot $name))
  $expected = [IO.Path]::GetFullPath((Join-Path $expectedRoot $name))
  if (-not [StringComparer]::OrdinalIgnoreCase.Equals($candidate, $expected)) {
    throw "Unsafe deletion target: $candidate"
  }
  if (-not $candidate.StartsWith($expectedRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Target escapes the worktree: $candidate"
  }
  [pscustomobject]@{ Name = $name; AbsolutePath = $candidate; Exists = Test-Path -LiteralPath $candidate }
}
```

Expected: every printed absolute path begins with the exact worktree root. Do not proceed if any comparison fails.

- [ ] **Step 2: Add the failing root-boundary regression test**

In `composition/client/src/utils/moduleBoundary.test.js`, add this immediately after `srcRoot`:

```js
const worktreeRoot = path.resolve(srcRoot, '..', '..', '..')
```

Add this manifest after `strayFiles`:

```js
const rootDuplicatePaths = [
  'client',
  'config',
  'eslint.config.js',
  'index.html',
  'infra',
  'migrations',
  'models',
  'package-lock.json',
  'package.json',
  'public',
  'seeders',
  'server',
  'src',
  'vite.config.js'
]

for (const relative of rootDuplicatePaths) {
  check(!fs.existsSync(path.join(worktreeRoot, relative)), `Obsolete root path removed: ${relative}`)
}
```

The ignored root `node_modules` is deliberately excluded from the source-control invariant; it is removed locally in Step 4.

- [ ] **Step 3: Run the boundary test and verify RED**

Run from `composition/client`:

```powershell
node src/utils/moduleBoundary.test.js
```

Expected: exit 1 with `Obsolete root path removed: client` because the duplicate still exists.

- [ ] **Step 4: Delete the exact obsolete root application**

Use `apply_patch` `Delete File` operations for every tracked text file returned by:

```powershell
git ls-files -- client config eslint.config.js index.html infra migrations models package-lock.json package.json public seeders server src vite.config.js
```

Do not use a glob or recursive shell deletion for tracked source. `apply_patch` cannot decode the binary `src/assets/unclogo.png`; validate its exact absolute path with the Step 1 checks, then remove only that file using:

```powershell
Remove-Item -LiteralPath "$expectedRoot\src\assets\unclogo.png" -Force
```

Delete the ignored root dependency cache only after resolving its exact path:

```powershell
$dependencyTarget = (Resolve-Path -LiteralPath "$expectedRoot\node_modules").Path
$expectedDependencyTarget = [IO.Path]::GetFullPath((Join-Path $expectedRoot 'node_modules'))
if (-not [StringComparer]::OrdinalIgnoreCase.Equals($dependencyTarget, $expectedDependencyTarget)) {
  throw "Unsafe dependency target: $dependencyTarget"
}
if (-not $dependencyTarget.StartsWith($expectedRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Dependency target escapes worktree: $dependencyTarget"
}
Remove-Item -LiteralPath $dependencyTarget -Recurse -Force
```

Do not delete `.git`, `.gitignore`, `.superpowers`, `composition`, `docs`, `LICENSE`, or `README.md`.

- [ ] **Step 5: Replace the root README with the active-runtime handoff**

Use `apply_patch` to make `README.md` exactly:

````markdown
# UNC Learning Plan Management System

This worktree contains one runnable LPMS application under `composition/`.

## Active modules

- Edrian's Learning Plan Submissions Management module
- Christian's learning-plan composition surface required for server-backed comment display and resolution

Arra's standalone TOS/assessment/points UI and the obsolete duplicate root application were removed from this branch.

## Start the backend

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\server"
node server.js
```

The backend listens on `http://localhost:5000`.

## Start the frontend

Open a second terminal:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\client"
npm run dev
```

Vite normally opens the frontend at `http://localhost:5173`.

See `composition/PROJECT_MAP.md` for the retained route and ownership map.
````

- [ ] **Step 6: Verify GREEN and the root structure**

Run from `composition/client`:

```powershell
node src/utils/moduleBoundary.test.js
node src/utils/checkJsxImports.js
npm run build
```

Expected: the boundary test reports 70 checks, JSX imports pass, and Vite exits 0.

Run from the worktree root:

```powershell
Get-ChildItem -Force | Select-Object Name
git status --short -- . ':!composition' ':!docs/superpowers'
```

Expected root names: `.git`, `.gitignore`, `.superpowers`, `composition`, `docs`, `LICENSE`, and `README.md`. Git status outside `composition`/plan docs shows only the approved root deletions and README change before commit.

- [ ] **Step 7: Commit only Task 1**

```powershell
git add -A -- client config eslint.config.js index.html infra migrations models package-lock.json package.json public seeders server src vite.config.js README.md
git add -- composition/client/src/utils/moduleBoundary.test.js
git diff --cached --check
git diff --cached --name-status
git commit -m "refactor: remove duplicate root application"
```

Expected: one commit containing the root duplicate deletions, README replacement, and boundary-test extension. No unrelated dirty `composition` file is staged.

---

### Task 2: Run complete structural and automated verification

**Files:**
- Test: `composition/client/src/utils/*.test.js`
- Test: `composition/client/src/utils/checkJsxImports.js`
- Test: `composition/server/utils/*.test.js`
- Verify: `composition/server/**/*.js`

**Interfaces:**
- Consumes: the single-app worktree produced by Task 1.
- Produces: evidence that root deletion did not break the retained client/server runtime.

- [ ] **Step 1: Assert the root duplicate is absent**

Run from the worktree root:

```powershell
$forbidden = @(
  'client', 'config', 'eslint.config.js', 'index.html', 'infra',
  'migrations', 'models', 'node_modules', 'package-lock.json',
  'package.json', 'public', 'seeders', 'server', 'src', 'vite.config.js'
)
$remaining = $forbidden | Where-Object { Test-Path -LiteralPath (Join-Path (Resolve-Path '.').Path $_) }
if ($remaining) { throw "Obsolete root paths remain: $($remaining -join ', ')" }
```

Expected: exit 0 with no remaining names.

- [ ] **Step 2: Run every retained client utility test**

From `composition/client`:

```powershell
$failed = @()
Get-ChildItem 'src\utils' -Filter '*.test.js' | Sort-Object Name | ForEach-Object {
  & node $_.FullName
  if ($LASTEXITCODE -ne 0) { $failed += $_.Name }
}
if ($failed.Count) { throw "Client tests failed: $($failed -join ', ')" }
```

Expected: all retained tests exit 0; `moduleBoundary.test.js` reports 70 checks.

- [ ] **Step 3: Run client import and build checks**

From `composition/client`:

```powershell
node src/utils/checkJsxImports.js
npm run build
```

Expected: JSX checker and production build exit 0. Existing Node module-type, Sass deprecation, and large-chunk warnings may remain but missing imports are failures.

- [ ] **Step 4: Run server tests and syntax checks**

From `composition/server`:

```powershell
$failed = @()
Get-ChildItem 'utils' -Filter '*.test.js' | Sort-Object Name | ForEach-Object {
  & node $_.FullName
  if ($LASTEXITCODE -ne 0) { $failed += $_.Name }
}
if ($failed.Count) { throw "Server tests failed: $($failed -join ', ')" }

Get-ChildItem -Recurse -File -Filter '*.js' |
  Where-Object { $_.FullName -notmatch 'node_modules' } |
  ForEach-Object {
    & node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($_.FullName)" }
  }
```

Expected: all three server utility tests and every retained server JavaScript syntax check exit 0.

- [ ] **Step 5: Verify Git scope**

From the worktree root:

```powershell
git diff --check
git diff --cached --name-only
git status --short
git log --oneline -6
```

Expected: no whitespace errors and no staged files. The duplicate-root cleanup commit appears above the earlier LPSM cleanup commits; unrelated pre-existing dirty composition changes remain.

---

### Task 3: Complete the live server-backed comment round trip

**Files:**
- Runtime: `composition/server/server.js`
- Runtime: `composition/client/src/main.jsx`
- Exercise: `composition/client/src/components/ApprovalSyllabusSections.jsx`
- Exercise: `composition/client/src/pages/TopicForm.jsx`
- Exercise: `composition/server/controllers/commentController.js`

**Interfaces:**
- Consumes: six seeded demo accounts; `POST /api/comments/by-course`, `GET /api/comments/by-course/:code`, `GET /api/comments/filter/:iloId/:commentFor`, and `PUT /api/comments/update-resolution`.
- Produces: verified persistent comment text and resolution state for `BIT313L`, offering `1`, revision `1`.

- [ ] **Step 1: Verify or start only the active services**

Check ports 5000 and 5173. Reuse a listener only if its executable command and working path belong to this exact worktree's `composition/server` or `composition/client`. Otherwise do not stop it; report the port conflict.

If absent, start the backend from:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\server"
node server.js
```

Start the frontend from a second terminal:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\client"
npm run dev
```

Verify:

```powershell
Invoke-RestMethod 'http://localhost:5000/api/auth/health'
Invoke-WebRequest 'http://localhost:5173/' -UseBasicParsing
```

Expected: backend `{ok: true, accounts: 6}` and frontend HTTP 200. Do not run `node migrate.js`; the known migration ledger mismatch is outside this task.

- [ ] **Step 2: Prepare browser control**

Read and follow `browser:control-in-app-browser`. Select the browser for `http://localhost:5173/`, read its complete documentation, and use the retained local tab. Immediately before entering demo passwords and posting/resolving the comment, obtain any action-time confirmation required by the browser policy; group the exact local demo credentials and comment mutation in one request.

- [ ] **Step 3: Create the exact Program Head comment**

Log in to the local app with:

```text
Role: program-head
Email: junar.danila@unc.edu.ph
Password: demo1234
```

Open:

```text
http://localhost:5173/role/program-head/courses/BIT313L?pcId=1&revNum=1&status=pending
```

Under CO1/ILO1, select one topic and add exactly:

```text
LPSM ownership cleanup round-trip 2026-08-15
```

Expected: the UI reports a successful save.

- [ ] **Step 4: Verify the created server record**

```powershell
$comments = Invoke-RestMethod 'http://localhost:5000/api/comments/by-course/BIT313L?pcId=1'
$created = $comments | Where-Object { $_.message -eq 'LPSM ownership cleanup round-trip 2026-08-15' }
if (-not $created) { throw 'Expected round-trip comment was not persisted' }
$created
```

Expected: one record with numeric `comment_id`, target context, and unresolved status. The persisted text field is `message`.

- [ ] **Step 5: Display and resolve it as the instructor**

Sign out, then log in with:

```text
Role: instructor
Email: monica.norton@unc.edu.ph
Password: demo1234
```

Open:

```text
http://localhost:5173/courses/1/1/returned
http://localhost:5173/topics/form/1/returned
```

Expected: Christian's topic form visibly shows the exact comment and its target context. Mark it resolved and save.

- [ ] **Step 6: Verify persisted resolution and reload behavior**

```powershell
$topicComments = Invoke-RestMethod 'http://localhost:5000/api/comments/filter/1/topics'
$resolved = $topicComments | Where-Object { $_.message -eq 'LPSM ownership cleanup round-trip 2026-08-15' }
if (-not $resolved) { throw 'Expected topic comment was not returned' }
if ($resolved.resolved_status -notin @(1, $true)) { throw "Comment is not resolved: $($resolved.resolved_status)" }
$resolved
```

Reload the topic page. Expected: resolved state remains visible and no deleted TOS/assessment navigation item appears.

- [ ] **Step 7: Record final state without a source commit**

```powershell
git diff --check
git diff --cached --name-only
git status --short
git log --oneline -6
```

Expected: no staged files. Record the numeric comment ID, persisted resolution status, startup URLs, and the known migration-ledger defect. Do not commit the SQLite demo record or any ignored SDD/browser artifact.
