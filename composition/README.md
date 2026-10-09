# LPMS — learning plan composition

`server/` is a Node/Express API backed by a single SQLite file, and `client/`
is the Vite + React frontend.

## Running with Docker

Both services run on host ports chosen so this stack can be up at the same time
as the Portfolio and Watch Party stacks:

| | host | container |
| --- | --- | --- |
| API | http://localhost:5001 | 5000 |
| Frontend | http://localhost:5174 | 5173 |

```sh
# Production build of the frontend, served by `vite preview`.
docker compose up --build

# Vite dev server with hot reload, on the same ports.
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

docker compose down          # stop
docker compose down -v       # stop and delete the database volume
```

Sign in with any of the demo accounts, for example
`monica.norton@unc.edu.ph` / `demo1234`.

**A fresh clone has no data on purpose.** The database file is not in git (it is ignored), so a
clone starts with an empty database. With Docker, the first start of an empty database loads the demo
data automatically (`LPMS_AUTO_SEED_DEMO=1`, on by default in `docker-compose.yml`); later starts see
the data and skip it, and it never runs when `NODE_ENV=production`. Without Docker, run
`node migrate.js` and then `node seed-demo.js` in `server/` once. Set `LPMS_AUTO_SEED_DEMO=0` to turn the
automatic load off.

Ports and URLs can be overridden from the environment; `.env.example` lists
every variable and its default.

Two things are worth knowing before changing the setup:

- **The database lives in a Docker volume, not in `server/data`.** WAL mode
  needs a shared-memory sidecar next to the database file, and a sidecar written
  by the host's own Node process cannot be reused inside a Linux container — the
  server would die at startup with `SQLITE_IOERR_SHMOPEN`. The server's
  entrypoint copies the worktree's database into the volume the first time the
  volume is empty, so there are now two copies: the worktree file (used by a
  plain `node server.js`) and the volume. To push host changes into the
  container, stop the stack and copy the files in:

  ```sh
  docker compose stop
  docker compose cp server/data/. server:/app/data/
  docker compose start        # the entrypoint fixes ownership on the way up
  ```
- **`NODE_ENV` defaults to `development`.** The API refuses the published demo
  password whenever `NODE_ENV=production`, and every account in this worktree is
  a demo account, so production mode would leave no way to sign in.

## Running without Docker

```sh
cd server && node server.js     # http://localhost:5000
cd client && npm run dev        # http://localhost:5173
```

`scripts/start-dev-servers.bat` starts both in the background and writes to
`logs/`.

## Tests

```sh
cd server && node --test "utils/*.test.js"
cd client && node --test "src/utils/*.test.js"
```

## First-time setup for a new groupmate

Run these in order, from `composition/`:

1. `docker compose up --build -d` builds both images and starts them. The server creates an
   empty SQLite database in the `lpms_data` volume and applies the migrations itself on every start.
2. `docker compose exec server node create-superuser.js "SURNAME, FIRSTNAME" you@unc.edu.ph`
   creates the first superuser. A random password is printed once; you must change it at first sign-in.
3. Optional, for demo programs, courses, plans and references:
   `docker compose exec server node seed-demo.js`. It prints six demo accounts that share the
   password `demo1234` (instructor, program head, director of libraries, industry consultant,
   dean, VPAA). They are for local use only.

Without Docker, the same three steps run in `server/`: `node migrate.js`, then
`node create-superuser.js ...`, then `node seed-demo.js`.

> **Do not run seeders on a database that has data.** The files in `server/seeders/` (and
> `run-seeder.js`) are for an EMPTY database only. Several delete the comments and workflow logs of
> the demo plans, others insert duplicate rows, and the first one fails on duplicate ids, so running
> them one by one over real work destroys it. `seed-demo.js` checks first and refuses, changing
> nothing, when the database already has departments, programs, courses, offerings, ILOs, references,
> comments or workflow logs. It also refuses when `NODE_ENV=production`. To start over with demo
> data, use a new empty database (`docker compose down -v` deletes the data volume, so back up
> anything you need first). `seed.js` is retired and only points to `seed-demo.js`.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
