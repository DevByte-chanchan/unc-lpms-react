# LPMS — learning plan composition

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
