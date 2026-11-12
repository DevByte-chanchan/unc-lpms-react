# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## How to run, test and reset the demo

**Run (Docker).** `docker compose up -d` starts MySQL (`ca-mysql`, host port 3307), the API (`ca-api`, http://localhost:4000), the web app (`ca-web`, http://localhost:5173), Mailpit (http://localhost:8025) and Adminer (http://localhost:8080). Settings live in `server/.env` (copy `server/.env.example`). There is no Node on the host needed: run the commands below inside the containers, as shown.

**Test.**

| What | Command |
|---|---|
| Frontend unit tests | `docker exec -w /app ca-web npm test` |
| Server tests (needs MySQL; none are skipped when it is up) | `docker exec -w /app/server ca-api npm test` |
| Build | `docker exec -w /app ca-web npm run build` |
| Lint (warnings allowed, no errors) | `docker exec -w /app ca-web npx eslint .` |
| End-to-end (Playwright, against the running app) | `npm run e2e` — see below |

CI (`.github/workflows/ci.yml`) runs all of these except e2e on every push and pull request, against a `mysql:8` service, and fails if a server test is skipped. A fresh database is built with `npm run db:sync` (the API's own boot steps) followed by `npm run db:migrate -- --from 20261010000001-create-user-accounts.cjs`.

**Reset the demo.** `docker exec -it ca-api npm run demo:reset` (add `-- --yes` to skip the question) **erases the database** and loads the demo: the admin and demo accounts, the term *1st Semester* of the current school year with the sample calendar's dates, then departments → faculty → programs → courses (the BSIT Program of Study) → course assignments, through the real upload routes. Running it twice gives the same data. It prints the sign-in emails, never the passwords (those are in `server/utils/seedUsers.js`, and the admin's in `server/.env`). Nothing it loads is emailed. It refuses to run with `NODE_ENV=production`.

**End-to-end tests.** They upload, add and undo, so run them only against a demo database:

```sh
docker exec ca-api npm run -s demo:reset -- --yes
E2E_ALLOW_WRITES=1 E2E_PH_PASSWORD=… E2E_VPAA_PASSWORD=… npm run e2e
```

Options: `E2E_BASE_URL` (default http://localhost:5173), `E2E_API_URL` (default http://localhost:4000/api), `E2E_PH_EMAIL` / `E2E_VPAA_EMAIL` (default: the demo accounts), `E2E_BROWSER_CHANNEL=msedge` to use an installed browser instead of `npx playwright install chromium`, and `E2E_RESET_CMD="docker exec ca-api npm run -s demo:reset -- --yes"` to reset before and after the run. Each test undoes its own change; the "fresh term" test leaves the lists it cloned into its (deleted) term behind, which the reset clears.

**Checks.** `docker exec ca-api npm run access:check -- name.surname@unc.edu.ph [--fix]` explains why someone has (or lacks) a role. `docker exec ca-api npm run accounts:check -- dean.email@unc.edu.ph` shows which accounts a Dean sees on User Accounts, and why (their Faculty uploads and the rows those cover).

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Start over

To test the whole flow again from nothing (development only; it refuses to run with `NODE_ENV=production`):

1. `docker exec ca-api npm run db:fresh` wipes every term, upload, invitation and account, then recreates the admin and the six demo logins. Add `-- --keep-vmgo` to keep the University and Department VMGO statements. Files in `sample-uploads/` are never touched.
2. Sign in as the VPAA (`carlos.garcia@unc.edu.ph` / `Vpaa@2026`), create the academic term, then upload `sample_departments.xlsx`. **Edrian** is invited.
3. Edrian sets his password. As Dean, he uploads `sample_faculty.xlsx` and `sample_programs.xlsx`, which makes **Kristine** head of BSIT.
4. Kristine signs in with her demo login (`kristine.sanlorenzo@unc.edu.ph` / `ProgramHead@2026`). As Program Head, she uploads the courses, the course offerings / assignments and the industry consultants.

Where roles come from: the faculty list gives **Instructor** only (its Role column is information), the programs list gives **Program Head** to each program's head, and the departments list gives **Dean**. Accounts created before this rule may still hold a Program Head or Dean role that came from the faculty Role column. Run `db:fresh` and redo the uploads to clear them.

## Testing email

The server sends mail through `server/services/mailer.js`. `MAIL_MODE` in `server/.env` decides where it goes:

- `capture` (the default outside production): everything lands in **Mailpit**, a local test inbox, at http://localhost:8025. Nothing leaves your machine.
- `live`: the real SMTP server. Outside production, only addresses on `MAIL_DEV_ALLOWLIST` get mail; anyone else is skipped.
- `off`: log only.

Send a real invitation (subject prefixed `[TEST]`) to an account that already exists — its **Set your password** button opens that person's set-password page:

```
docker exec ca-api npm run mail:test -- --to kristine.sanlorenzo@unc.edu.ph
docker exec ca-api npm run mail:test -- --to kristine.sanlorenzo@unc.edu.ph --from-email edrian.lait@unc.edu.ph
```

The second form previews the email as signed by a specific person; otherwise it's signed by whoever's upload gave the access.

### How invitations and notifications go out

Each person gets **one combined email per burst of changes**, and nothing while the change can still be undone.

| Step | Who | What the person gets |
|---|---|---|
| Departments upload | VPAA | Dean: invitation |
| Faculty upload | Dean | Faculty: an account, **no email yet** (Access says "Not invited yet"; the Dean can press **Invite now**) |
| Programs upload | Dean | Program Head: invitation listing Program Head + Instructor, or an update email if they already have a password |
| Consultants upload / add | Program Head | Consultant: invitation or update email, listing their courses |
| Course assignment (upload, add, edit, delete) | Program Head | Lead and Contributors: one email listing all their courses. For someone with no password yet, that email **is** their invitation. |

- Every write that can change someone's roles or courses marks them in `account_notices` (`server/services/notices.js`). After the 30-second Undo window (plus 10 s), the email worker compares what the person was last told with what is true now and sends only the difference — so an undo, a re-upload of the same file or a page-load revalidation sends nothing. A busy afternoon of edits is combined into one email (at most 5 minutes after the first change).
- Everyone also gets an in-app notification (the **bell** in the header, polled every 60 s). People who haven't set a password yet find theirs waiting at first sign-in.
- Someone invited but not signed in gets at most **two reminders** (3 and 6 days after the invitation), each a fresh link showing their latest courses. Changes before they sign in don't send extra emails.
- The email worker (`server/workers/emailWorker.js`) runs inside the API and checks every 15 seconds: due invitations, due notices and invitation reminders, and once a day it clears read notifications older than 90 days. Everything pending lives in the database, so a restart loses nothing. A failed send is retried after 1, 5 and 30 minutes.
- **Faculty** (Dean) and **Industry Consultants** (Program Head) show an **Access** column with **Invite now** / **Resend**; the Dean also has **Invite all not yet invited**. **User Accounts** (VPAA) keeps **Send invitation / Resend** and **Send password reset**.
- An old invitation link is never a dead end: the page explains it was replaced and offers **Send me a new link** (the reply never says whether the address has an account).
- **Forgot password?** on the sign-in page emails a 1-hour reset link.
- Links are single-use. Only a SHA-256 hash of each token is stored, and tokens are redacted from the request log.
- `ALLOW_EXTERNAL_CONSULTANT_EMAILS=true` in `server/.env` lets an account whose only role is Industry Consultant use a non-UNC address (consultant form and upload, sign-in, forgot password, new link). Off by default. Outside production, `MAIL_DEV_ALLOWLIST` still decides who really gets mail.

### Sending real mail through Gmail

1. Use a Google account with **2-Step Verification** on.
2. Google Account → **Security** → **App passwords** → create one. Copy the 16-character password.
3. Put these in `server/.env` (git-ignored; never in `.env.example` or any committed file):

   ```
   MAIL_MODE=live
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=<the sending gmail>
   SMTP_PASS=<app password>
   MAIL_FROM="UNC LPMS <the sending gmail>"
   MAIL_DEV_ALLOWLIST=kristine.sanlorenzo@unc.edu.ph
   ```

4. Run `docker restart ca-api`, then the `mail:test` command above. The result says `sent → check the inbox (and Spam)`.
5. When you're done, set `MAIL_MODE=capture` again and run `docker restart ca-api`.
