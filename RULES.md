# Rules for AI edits (LPMS TOS module)
1. Edit only the files named in the task, with normal editor edits. No Python or regex scripts. Create no scratch files in the project. Delete nothing; move leftovers to ..\lpms-scratch.
2. Never change: redistIloItems and the equal-split code, lock logic, submit gate, API field names, database column names, Header.jsx, SideNavigation.jsx, vite.config.js, package files, backend/, seed files.
3. Never write to lpms_db or run seeds on it. Use lpms_audit_test for any test. Do not upload, add, edit or delete data in the running app.
4. Style: reuse existing classes and variables; no new colors or radii; no check icons; sentence case for new text.
5. Search the repo for usages before removing or replacing code; switch usages first, then remove the old code; leave no dead code or unused imports.
6. No new dependencies. Commands under 5 minutes; servers in the background; no empty try/catch.
7. Report briefly: changed files (git status --short), build pass or fail, eslint on touched files. Say NOT VERIFIED for anything not run.