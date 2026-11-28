# Phase 0 — Stack Discovery & Safe Workspace Extraction

**Generated:** 2026-11-28  
**Parent Repository:** `C:\Users\bitec\WebstormProjects\unc-lpms-react`  
**Active Branch (Untouched):** `feature/learning-plan-composition` (`279c58f`)  
**Integrated Workspace Root:** `integrated-lpms/`

---

## 1. Safe Source Extraction Summary

All three source branches were fetched from `origin` (read-only) and attached as isolated, detached `git worktree` snapshots under `integrated-lpms/_ref_sources/`. No existing files, commits, or branches were modified.

| Module | Source Branch | Resolved Commit | Local Inspection Path |
| :--- | :--- | :--- | :--- |
| **1. Course Assignment** | `origin/feature/course-assignment` | `5e940c7` | `integrated-lpms/_ref_sources/course-assignment` |
| **2. Learning Plan Composition (PRIORITY)** | `origin/feature/learning-plan-composition` | `279c58f` | `integrated-lpms/_ref_sources/composition` |
| **3. Learning Plan Submissions Management** | `origin/feature/learning-plan-submissions-management-v2` | `86680b9` | `integrated-lpms/_ref_sources/submissions` |

---

## 2. Host Runtime Environment Detected

| Tool / Service | Detected Status | Notes |
| :--- | :--- | :--- |
| **OS / Shell** | Windows / PowerShell | PowerShell blocks `npm.ps1` via ExecutionPolicy; use `npm.cmd` for CLI commands. |
| **Node.js** | `v26.13.1` | Installed globally. |
| **npm** | `11.20.0` (`npm.cmd`) | Use `npm.cmd` in scripts/terminal. |
| **Docker** | Installed & Running | Container `db_learning_plan_comp` (`mysql:8.0`) is currently UP on ports `3306` and `3307`. |

---

## 3. Side-by-Side Tech Stack Matrix

| Dimension | Module 1: Course Assignment | Module 2: Composition (Priority) | Module 3: Submissions Management v2 |
| :--- | :--- | :--- | :--- |
| **Directory Layout** | Frontend at repo root (`src/`), Backend at `server/` | Monorepo subfolder `composition/client/` & `composition/server/` | Monorepo subfolder `composition/client/` & `composition/server/` |
| **Frontend Framework** | React `19.1.1`, React Router `7.9.6`, Vite `7.1.7` | React `19.1.1`, React Router `7.9.6`, Vite `7.1.7` | React `19.1.1`, React Router `7.9.6`, Vite `7.1.7` |
| **Styling System** | Sass `1.93.2` (CSS Modules `*.module.sass`) — No Tailwind/MUI | Sass `1.93.2` (CSS Modules `*.module.sass`) — No Tailwind/MUI | Sass `1.93.2` (CSS Modules `*.module.sass`) — No Tailwind/MUI |
| **Icons** | `react-feather` `^2.0.10` | `lucide-react` `^1.72.0`, `react-feather` `^2.0.10` | `lucide-react` `1.66.0` |
| **Frontend Utilities** | `html2canvas`, `jspdf` `^4.2.1`, `pdf-lib`, `pdfjs-dist` `^4.10.38`, `xlsx` `^0.18.5` | `nspell` `^2.1.5`, `dictionary-en` `^4.0.0` *(plus unused `express`/`cors` entries in `client/package.json`)* | `harper.js` `^3.2.0`, `nspell`, `dictionary-en`, `html2canvas`, `jspdf`, `pdf-lib`, `pdfjs-dist` |
| **Backend Runtime / Module Format** | Node.js — **ESM** (`"type": "module"`), entry `server/index.js` | Node.js — **CommonJS**, entry `composition/server/server.js` | Node.js — **CommonJS**, entry `composition/server/server.js` |
| **HTTP Framework** | Express `^4.19.2`, `cors`, `morgan`, `cookie-parser`, `multer` | Express `^5.2.1`, `cors`, `cookie-parser` *(plus unused `react`/`vite` entries in `server/package.json`)* | Express `^5.2.1`, `cors`, `helmet` `^8.3.0` |
| **ORM & Migrations** | Sequelize `^6.37.3`, `sequelize-cli` `^6.6.2` (`prepareSchema` + migrations) | Sequelize `^6.37.8`, `sequelize-cli` `^6.6.5` (migrations + seeders) | Sequelize `^6.37.8`, `umzug` `^3.8.2` (programmatic migrations on boot) |
| **Database Engine / Driver** | **MySQL 8.0** (`mysql2` `^3.11.0`) — DB `course_assignment` (`127.0.0.1:3307`) | **MySQL 8.0** (`mysql2` `^3.22.6`) — DB `lpms_composition` (`127.0.0.1:3306`) | **SQLite** (`better-sqlite3` `^12.11.1` + `sqlite3-compat` shim) — file `data/lpms_composition.sqlite` *(also lists `mysql2` `^3.22.6`)* |
| **Backend Document / AI / Mail Tools** | `xlsx`, `pdfjs-dist`, `sharp` `^0.33.5`, `tesseract.js` `^5.1.1`, `nodemailer` `^10.1.0`, optional Gemini API | Google Gemini API (via `GEMINI_API_KEY`) | `exceljs` `^4.4.0`, `xlsx` `0.20.3`, `pdfjs-dist`, `puppeteer` `^24.43.1`, `sharp` `^0.35.5`, `tesseract.js`, `nodemailer` `^10.0.16`, optional Gemini API |
| **Auth & Session Strategy** | `jsonwebtoken` `^9.0.3` + `bcryptjs` `^2.4.3`; httpOnly cookie `lpms_session` (8h TTL); reloads account on each request | `jsonwebtoken` `^9.0.3` + `bcryptjs` `^3.0.3`; httpOnly cookie OR `Authorization: Bearer` header; `attachUser`/`requireAuth`/`requireRole`; `activeRole` switching | `jsonwebtoken` `^9.0.3` + `bcryptjs` `^2.4.3`; httpOnly cookie `lpms_session` (8h TTL) + `x-lpms-role` header for multi-role accounts; global `/api` `requireAuth` & audit middleware |
| **Testing Stack** | `node --test` (unit/API) + `@playwright/test` `1.49.1` (E2E) | Manual / custom `check_runtime.cjs` | `node run-tests.js` |

---

## 4. Ports & Environment Variables Inventory

### Default Ports

| Service | Course Assignment | Composition | Submissions v2 |
| :--- | :--- | :--- | :--- |
| **Frontend (Vite)** | `5173` | `5173` (proxies `/api` → `5000`) | `5173` local / `5199` Docker (proxies `/api` → `5000`) |
| **Backend (Express)** | `4000` (`PORT`) | `5000` (hardcoded) | `5000` local (`PORT`) / `5001` Docker |
| **Database** | MySQL `3307` (`docker-compose.yml`) | MySQL `3306` (`config/config.json`) | SQLite file (`data/lpms_composition.sqlite`) |
| **Auxiliary** | Adminer `8080`, Mailpit `1025`/`8025` | Adminer `8080` (`docker-compose.yml`) | None (single SQLite file + local signature storage) |

### Environment Variables by Module

- **Course Assignment (`server/.env.example`):**
  - Core: `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `APP_BASE_URL`
  - DB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `DB_DIALECT`
  - Auth: `JWT_SECRET`, `ALLOWED_EMAIL_DOMAIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ALLOW_EXTERNAL_CONSULTANT_EMAILS`
  - Mail: `MAIL_MODE` (`capture`/`live`/`off`), `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_DEV_ALLOWLIST`, `MAIL_CAPTURE_HOST`, `MAIL_CAPTURE_PORT`
  - Features: `CALENDAR_AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `MAX_TEACHING_UNITS`, `DEADLINE_REMINDERS`
- **Composition (`composition/server/.env.example` & `config/config.json`):**
  - AI: `GEMINI_API_KEY`
  - DB: Currently stored in `server/config/config.json` (`root` / `rootdevpass` / `lpms_composition` / `127.0.0.1` / `mysql`)
- **Submissions Management v2 (`composition/.env.example` & `server/.env.example`):**
  - Core/Docker: `LPMS_SERVER_PORT`, `LPMS_CLIENT_PORT`, `LPMS_CLIENT_ORIGIN`, `LPMS_API_BASE`, `LPMS_NODE_ENV`, `LPMS_ALLOWED_ORIGINS`, `LPMS_TRUST_PROXY`, `LPMS_COOKIE_SECURE`
  - Auth/Demo: `LPMS_JWT_SECRET` / `JWT_SECRET`, `LPMS_SHOW_DEMO_ACCOUNTS`, `LPMS_AUTO_SEED_DEMO`, `LPMS_ALLOW_PUBLIC_REGISTRATION`, `LPMS_EXPOSE_RESET_TOKEN`
  - Signatures/PDF/OCR/AI: `LPMS_SIGNATURE_KEY`, `LPMS_SIGNATURE_KEY_VERSION`, `LPMS_SIGNATURE_DIR`, `LPMS_CHROME_PATH`, `LPMS_SCAN_AI`, `GEMINI_API_KEY`, `GEMINI_MODEL`
  - Mail/Privacy/Backups/Reminders: `LPMS_SMTP_HOST`, `LPMS_SMTP_PORT`, `LPMS_SMTP_USER`, `LPMS_SMTP_PASS`, `LPMS_SMTP_FROM`, `LPMS_APP_URL`, `LPMS_DPO_NAME`, `LPMS_DPO_EMAIL`, `LPMS_BACKUPS`, `LPMS_BACKUP_DIR`, `LPMS_SKIP_MIGRATIONS`, `LPMS_TIMEZONE`, `LPMS_REMINDERS`, `LPMS_TEST_DB_FILE`

---

## 5. Early Technical Integration Findings (To Resolve in Phase 2)

1. **Unified Frontend Stack Alignment (High Compatibility):** All 3 modules run **React 19.1.1 + Vite 7.1.7 + React Router 7.9.6 + Sass 1.93.2 (CSS Modules)**. No CSS framework clash (no Tailwind vs. MUI conflict).
2. **Backend Module Format Divergence:** Course Assignment uses **ESM** (`import`/`export`), whereas Composition and Submissions use **CommonJS** (`require`/`module.exports`). In Phase 2, we will standardize the unified backend format (converting Course Assignment files or adopting clean ESM/CJS boundaries).
3. **Express 4 vs. Express 5 Compatibility:** Course Assignment uses Express 4 (`app.options('*', ...)` wildcard syntax), while Composition & Submissions use Express 5. We must align wildcard/error-handling syntax when unifying Express.
4. **Database Dialect Reconciliation (MySQL 8.0 vs. SQLite):** Course Assignment and Composition target **MySQL 8.0** (and a `mysql:8.0` Docker container is already running locally on ports `3306`/`3307`), whereas Submissions v2 switched its dev storage to **SQLite (`better-sqlite3`)** while keeping Sequelize models. Phase 1 will audit all Submissions queries/migrations for any SQLite-specific raw SQL so Phase 2 can target ONE clean unified **MySQL 8.0** database (or confirm dialect preference).
5. **Auth & Multi-Role Convergence:** All 3 modules already share the `lpms_session` httpOnly JWT cookie + `bcryptjs` pattern; reconciling the user table (`accounts` vs. `user_accounts` vs. `users`) and active-role switching (`activeRole` vs. `x-lpms-role`) will be straightforward once Phase 1 maps every field.
