# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

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

### How invitations go out

- Uploading faculty (Dean), departments (VPAA) or industry consultants (Program Head) creates an account for each person who needs one and queues a set-password invitation, sent on the worker's next check (within about 15 seconds). Uploads are final — there is no undo, so check the rows in the Review step before **Confirm & Import**.
- The email worker (`server/workers/emailWorker.js`) runs inside the API and checks every 15 seconds. A failed send is retried after 1, 5 and 30 minutes.
- **User Accounts** (VPAA) shows each account's invitation status, with **Send invitation / Resend** and **Send password reset**.
- **Forgot password?** on the sign-in page emails a 1-hour reset link.
- Links are single-use. Only a SHA-256 hash of each token is stored, and tokens are redacted from the request log.

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
