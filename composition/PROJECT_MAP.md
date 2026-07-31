# PROJECT_MAP

One-page orientation for the `composition/` worktree (branch `feature/learning-plan-submissions-management-v2`).

## 1. Top-level folders

- **client/** — Vite + React front end (port 5173). `src/` holds
  components, pages (incl. a role-based `pages/lpsm/` tree for
  DirectorOfLibraries, Instructor, ProgramHead, VPAA), layouts, per-component
  `.sass`/`.scss` styles, and a `utils/`+`services/` layer that talks to
  the API and/or client-side demo data.
- **server/** — Node/Express backend (port 5000). `routes/` map URL paths
  to `controllers/`, which use Sequelize `models/` (`migrations/`,
  `seeders/` set up schema/data). `config/` has `config.json` +
  `database.sqlite`; the live DB actually lives in the untracked,
  off-limits `server/data/`. `server/temp/` has stray scripts duplicating
  a `seeders/` name.
- **docker-compose.yml / docker-compose.lpsm.yml** — container
  orchestration for the two services.
- Root `package.json` / `package-lock.json` — workspace root over
  `client/` and `server/`, which each have their own `package.json`.

## 2. Client ↔ server communication

- `client/src/utils/api.js` sets
  `API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'`
  and exposes `fetchJson(endpoint, opts)`, a `fetch` wrapper that prefixes
  `endpoint` with `API_BASE` unless already absolute. `client/src/services/*`
  (documentService, learningPlanService, syllabusService) build on this;
  pages/components go through those services rather than calling `fetch`
  directly.
- `server/server.js` enables `cors({ origin: true })` (reflects any
  origin, to tolerate Vite auto-picking 5173/5174/5180...) and mounts one
  router per feature under `/api/*`:
  `/api/assignments`, `/api/ilos`, `/api/course-details`,
  `/api/course-outcome-alignment`, `/api/course-criteria`,
  `/api/references`, `/api/ilo-references`, `/api/topics`, `/api/tlas`,
  `/api/comments`, `/api/course-coverage`, `/api/submit-learning-plan`,
  `/api/coaep`, plus `courseReferenceRoutes` and `exportPdf` mounted bare
  under `/api`. Each router delegates to a same-named controller in
  `server/controllers/`.
- No Vite dev-server proxy is used — the client calls
  `http://localhost:5000` (or `VITE_API_BASE`) directly; CORS covers the
  cross-origin dev setup.

## 3. Entry points

- **client/src/main.jsx** — mounts `<App />` into `#root` inside
  `<StrictMode>`; the SPA bootstrap file.
- **client/src/App.jsx** — defines the entire client route table
  (`react-router-dom`), wrapping every page in an `ErrorBoundary`, grouped
  by role (instructor/default, course editing, TOS, forms, role-based
  approver routes). Also runs `seedDemoWorkflowsCanonical()` on load to
  seed client-side demo data, independent of the server.
- **server/server.js** — Express entry point: CORS + JSON body parsing,
  mounts all `/api/*` routers, adds a global error handler, listens on
  `process.env.PORT || 5000`.
