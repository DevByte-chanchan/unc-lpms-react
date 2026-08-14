# Worktree Root and Runtime Cleanup Design

## Goal

Make `composition-branch-v2` unambiguous: the only runnable LPMS application in this worktree is the one the user starts from `composition/client` and `composition/server`. Preserve Edrian's Learning Plan Submissions Management module and Christian's minimum composition/comment integration while removing Arra's unused standalone UI and the obsolete duplicate application at the worktree root.

## Safety boundary

All changes are confined to:

`C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2`

Do not modify the parent checkout, another worktree, Git metadata, or anything outside that absolute directory. Preserve unrelated dirty work inside the active `composition` application unless an approved cleanup task names the exact file or hunk.

## Retained worktree contents

- `.git` and `.gitignore`
- `composition/`, including the active client and server
- `docs/`, including the cleanup design and implementation records
- `LICENSE`
- `README.md`, rewritten to document the active composition startup commands and ownership boundary
- `.superpowers/` only while the implementation/review workflow needs its ignored reports

## Removed root duplicate

The following root-level paths form the obsolete application/scaffolding and will be deleted:

- `client/`
- `config/`
- `eslint.config.js`
- `index.html`
- `infra/`
- `migrations/`
- `models/`
- `node_modules/`
- `package-lock.json`
- `package.json`
- `public/`
- `seeders/`
- `server/`
- `src/`
- `vite.config.js`

These paths are not used by the user's backend or frontend commands. In particular, the `src/pages/TosSummary.jsx` shown in the screenshot belongs to this obsolete root application, not `composition/client`.

## Active runtime boundary

The retained runtime commands remain:

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\server"
node server.js
```

```bat
cd /d "C:\Users\darnie\Downloads\BAGONG BUHAY\unc-lpms-react\.worktrees\composition-branch-v2\composition\client"
npm run dev
```

Within `composition`, retain:

- Edrian's LPSM approval, reference, revision, role/session, status, notification, and comment behavior
- Christian's instructor course/syllabus, CO/ILO, topic, TLA, reference, revision, course-coverage, and comment display/resolution surfaces
- Christian-authored `TLAAssessment` backend records consumed by retained course coverage
- All existing database content and applied shared migrations/seeders

Remove only the Arra and unreachable-client manifests already approved and implemented by the earlier cleanup tasks.

## Documentation and regression protection

Rewrite the root README so it no longer instructs developers to run the deleted root Vite app. It must point to the two active composition startup commands.

Extend the retained client boundary test to assert that the tracked root duplicate paths do not exist. The ignored root `node_modules/` directory is deleted as local cleanup but is not a source-control invariant.

## Verification

After deletion:

1. Confirm every approved root duplicate path resolves inside this exact worktree before removing it.
2. Confirm the root contains no second `src`, Vite entry point, package manifest, backend scaffold, migration/model/seeder tree, or root dependency installation.
3. Run every retained client utility test, the JSX import checker, and the production build from `composition/client`.
4. Run every server utility test and syntax-check every retained server JavaScript file from `composition/server`.
5. Start both active services using the user's exact commands.
6. Complete the server-backed program-head comment creation and instructor display/resolution/reload round trip.
7. Verify Git has no staged or modified path outside this worktree and that unrelated pre-existing dirty composition changes remain preserved.

## Known setup defect

The current database exposes a migration-ledger mismatch: startup's `ensureAuthSchema` created password-reset columns, but Umzug does not record the corresponding reset migration, so `node migrate.js` later reports a duplicate `reset_token_hash` column. The idempotent demo-user seeder succeeded and six accounts are available. This cleanup records the defect but does not alter migration metadata or broaden scope into a migration fix.
