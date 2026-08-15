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
