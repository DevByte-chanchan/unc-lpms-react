# UNC-LPMS — Unified 3-Module Application (`integrated-lpms`)

This workspace unifies all three UNC Learning Plan Management System modules into **one full-stack application**, **one unified MySQL 8 database (`unc_lpms_integrated`)**, and **one unified login + role-based multi-module sidebar shell**:

1. **Course Assignment Module (`M1`)** — Academic Terms, Departments, University VMGO, User Accounts & Audit Logs, Faculty Directory, Programs, Department Vision/Mission, Program of Study / Courses, Course Assignments (auto-syncing offerings to M2), and Industry Consultants.
2. **Learning Plan Composition Module (`M2` — Priority Module, 100% preserved)** — Instructor Dashboard, Course Details, CO–PO Alignment Matrix, COAEP ILOs & 18-Week Schedule Distribution, Weekly Topics/Subtopics CRUD (with Copy-on-Write, Previous Revision Import & AI Suggestions), TLAs & Assessments, Weekly References, Grading Criteria Matrix, Print-Ready Syllabus Preview, APA Reference Summary, Reviewer Comment Resolution Checklist & Event Timeline, and Revision Snapshots.
3. **Learning Plan Submissions Management Module (`M3`)** — Program Front Pages, PO–PEO, CO–PO & COAEP Upload/Sync, Reference Repository & Catalog Health (Textbooks, OER, Online Resources, Online Subscriptions), Simultaneous Review (Director of Libraries + Program Head), Dean Return Triage (`with_program_head` → Forward to Instructor or Counter back to Dean), Final Dean Approval (deferred revision increment + immutable `ReviewRecordSnapshot` + `editLock`), VPAA Monitoring & Export Bundle, and Industry Consultant Advisory Suggestions & Sign-Off.

---

## Architecture Overview

```text
integrated-lpms/
├── client/                  # React 19 + Vite 7 + React Router 7 + Sass (Port 5173)
│   └── src/
│       ├── shared/          # Unified Login (with 6-Role Quick Switcher), AuthContext, UnifiedShell, NavConfig, API Client
│       └── modules/
│           ├── composition/        # 100% preserved M2 Composition workspace (CSS-isolated in .composition-scope)
│           ├── course-assignment/  # M1 Governance & Course Assignment pages (10 pages)
│           └── submissions/        # M3 Submissions Queue, Review Workbench, Reference Repository, Program Docs (5 pages)
├── server/                  # Node.js + Express 5 + Sequelize 6 + MySQL 8 (Port 5000)
│   ├── models/              # 52 unified superset Sequelize models
│   ├── migrations/          # 2 ordered migrations (53 tables incl. SequelizeMeta + audit_logs triggers)
│   ├── seeders/             # Idempotent master seeder with full HCI BIT313L Learning Plan
│   ├── services/            # offeringSyncService, coaepSyncService, notificationService, auditLogService
│   ├── controllers/         # auth/, courseAssignment/, composition/, submissions/
│   └── scripts/             # resetDatabase.js, smokeTest.js, qaE2ESuite.js
└── integration-docs/        # Phase 0–6 Architecture, Schema, Backend, Frontend & QA Reports
```

---

## Prerequisites

- **Node.js** v20+ (`npm.cmd` on Windows PowerShell)
- **MySQL 8.0** running on `127.0.0.1:3306` (e.g. Docker container `db_learning_plan_comp`, credentials configured in `server/.env`)

---

## Quick Start (Windows PowerShell)

### 1. Initialize / Reset & Seed the Unified Database
```powershell
cd C:\Users\bitec\WebstormProjects\unc-lpms-react\integrated-lpms\server
npm.cmd run db:reset
```
*(To re-verify idempotent seeding without dropping data, run `npm.cmd run db:seed`.)*

### 2. Start the Unified Backend API (`http://localhost:5000`)
```powershell
cd C:\Users\bitec\WebstormProjects\unc-lpms-react\integrated-lpms\server
npm.cmd run dev
```
Verify health at: `http://localhost:5000/api/health`

### 3. Start the Unified Frontend Client (`http://localhost:5173`)
In a second terminal:
```powershell
cd C:\Users\bitec\WebstormProjects\unc-lpms-react\integrated-lpms\client
npm.cmd run dev
```
Open **`http://localhost:5173`** in your browser. Vite automatically proxies all `/api/*` requests to `http://localhost:5000`.

### 4. Run Automated Verification Suites
```powershell
cd C:\Users\bitec\WebstormProjects\unc-lpms-react\integrated-lpms\server
# Backend 32-test smoke suite (self-contained ephemeral server)
node scripts/smokeTest.js

# Full-stack 8-scenario / 32-check QA E2E suite (requires backend :5000 + Vite :5173 running)
node scripts/qaE2ESuite.js
```

---

## Seeded QA Test Accounts (Also Available via Login Page Quick-Login Switcher)

| Role | Name | Email | Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **VPAA** | Dr. Carlos Garcia | `carlos.garcia@unc.edu.ph` | `Vpaa@2026` | Terms, Departments, VMGO, User Accounts, Audit Logs, Approved Monitoring |
| **Dean** | Dr. Sophia Sterling | `sophia.sterling@unc.edu.ph` | `Dean@2026` | Faculty, Programs, Dept V/M, Final LP Approval/Return & Export |
| **Program Head** | Prof. Olivia Vance | `olivia.vance@unc.edu.ph` | `ProgramHead@2026` | Supports live **Role Switcher** (`Program Head` ↔ `Instructor`); Courses, Assignments, COAEP/CO-PO, Parallel Review & Dean Return Triage |
| **Director of Libraries** | Maria Santos, RL | `maria.santos@unc.edu.ph` | `Library@2026` | Reference Repository (30 seeded refs), Catalog Health, Parallel Reference Verification |
| **Instructor** | Prof. Monica Norton | `monica.norton@unc.edu.ph` | `Instructor@2026` | Assigned HCI `BIT313L` (`SY 2026-2027` Active Draft + `SY 2025-2026` Approved Baseline) |
| **Industry Consultant** | Engr. Roberto Cruz | `roberto.cruz@unc.edu.ph` | `Consultant@2026` | Read-only review, advisory suggestions & sign-off on Approved Learning Plans |
