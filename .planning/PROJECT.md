# UNC LPMS — Approval Workflow Bug Fixes & Polish

## Goal
Fix bugs and polish the approval workflow for approver roles (Program Head, Director of Libraries, Industry Consultant, Dean, OIC/OVPAA) in the Learning Plan Submissions Management (LPSM) system.

## Scope
- **Approver roles only** — exclude Instructor pages
- **Bug fixes** — 14 identified issues across StatusTracker, ApprovalPanel, ReviewPanel, OICOVPAADashboard
- **Polish** — replace `alert()`, fix stale labels, improve status visualization
- **Timeline** — this sprint (2 weeks)

## Out of Scope
- New features (COAEP filling, new report types)
- Instructor workflow (LearningPlanList, LearningPlanCompose, versioning)
- Main app approval pages (Syllabus, TOS, ILO)
- Infrastructure/deployment

## Key Bug List

| ID | Severity | File | Issue |
|----|----------|------|-------|
| B1 | CRITICAL | OICOVPAADashboard.jsx | Uses localStorage for approvals, not API — state lost on cache clear, can't sync across users |
| B2 | HIGH | StatusTracker.jsx | Missing detailed stage tracking — only shows draft/under_review/approved/returned, not individual reviewer roles |
| B3 | HIGH | Dean/ApprovalPanel.jsx, ProgramHead/ApprovalPanel.jsx | Dean-proper text "Relay Comments to Program Head" shown for Program Head too (both are copies) |
| B4 | HIGH | DirectorOfLibraries/ReviewPanel.jsx, IndustryConsultant/ReviewPanel.jsx | No approve/return action — reviewers can only submit comments, not make decisions |
| B5 | HIGH | OICOVPAADashboard.jsx | 3-second `setInterval` triggers infinite re-render loop |
| B6 | HIGH | OICOVPAADashboard.jsx:520-521 | Syllabi tab status filter both branches set `filtered = approvedSyllabi` — filter does nothing |
| B7 | MEDIUM | IndustryConsultant/ReviewPanel.jsx:16 | Wrong fallback userId — copies Director's `'20' : '30'` fallback |
| B8 | MEDIUM | Dean/ApprovalPanel.jsx:17, ProgramHead/ApprovalPanel.jsx:17 | Hardcoded fallback user IDs (10, 40) |
| B9 | MEDIUM | Dean/ApprovalPanel.jsx, ProgramHead/ApprovalPanel.jsx | `alert()` for feedback (3 occurrences) |
| B10 | MEDIUM | DirectorOfLibraries/ReviewPanel.jsx, IndustryConsultant/ReviewPanel.jsx | `alert()` for feedback (2 occurrences) |
| B11 | MEDIUM | learningPlanService.js:3 | Hardcoded API URL `http://localhost:4002/api` |
| B12 | MEDIUM | OICOVPAADashboard.jsx:20-25 | Hardcoded instructor name normalization ("CASIMERO, DANNY") |
| B13 | LOW | learningPlanService.js:162 | `getApprovedLearningPlans` is just `getLearningPlans` with filter — unnecessary wrapper |
| B14 | LOW | OICOVPAADashboard.jsx | 775 lines — large file, extract sub-components |
