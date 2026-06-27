# Codebase Map — UNC LPMS React

## Overview
Full-stack **Learning Plan Submissions Management** system with React 19 frontend and multiple Express backends. Supports role-based workflows for syllabus, TOS, ILO, TLA, course outcomes, and learning plan submissions.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, React Router 7, Axios |
| Styling | SCSS modules (`.module.sass`/`.module.scss`) |
| UI | react-feather, custom form components |
| PDF/Docs | pdf-lib, jsPDF, docx |
| Main API | Express.js + Sequelize + MySQL (`server/`) |
| LPSM API | Express.js + Sequelize + MySQL (`backend/lpsm/`) |
| Other services | `backend/course-assignment/`, `backend/learning-plan-composition/`, `backend/tos/` (status unknown) |
| Containerization | Docker |

## Directory Structure

```
unc-lpms-react/
├── src/                          # Frontend (React)
│   ├── components/               # ~45 reusable components
│   │   ├── SideNavigation.jsx    # Main nav (41 edges - top god node)
│   │   ├── HeaderA.jsx/Header.jsx
│   │   ├── SkeletonA.jsx         # Layout shell (34 edges)
│   │   ├── Form components      (Dropdown, TextField, TextArea, MultiSelect, TypeableDropdown)
│   │   ├── Table components     (CoursesTable, FacultyTable, ProgramsTable, etc.)
│   │   ├── PDFViewerModal.jsx    # PDF display via iframe/blob
│   │   ├── ApprovalSyllabusSections.jsx / SyllabusSections.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── LPSM-specific:
│   │       ├── LpmsHeader.jsx / LpmsNav.jsx
│   │       ├── RoleUploadPanel/ UploadPanel/ WorkflowStepper/
│   │       └── ReferencePicker.jsx / TopicSelector.jsx
│   ├── pages/                    # ~30 page components
│   │   ├── Syllabus.jsx, TOS.jsx, TosPreview.jsx, TosSummary.jsx
│   │   ├── ILOForm.jsx, TLAForm.jsx, TopicForm.jsx
│   │   ├── AssessmentForm.jsx, CriteriaForGradingForm.jsx
│   │   ├── ReferenceForm.jsx, ApprovalReferenceForm.jsx
│   │   ├── ApprovalSyllabus.jsx, ApprovalCourses.jsx
│   │   ├── Dean.jsx, DeanFaculty.jsx, DeanPrograms.jsx
│   │   ├── ProgramHead.jsx, ProgramHeadConsultant.jsx, ProgramHeadCourseOfferings.jsx
│   │   ├── DirectorOfLibraries.jsx, IndustryConsultant.jsx, OICOVPAA.jsx
│   │   ├── InstructorDocuments.jsx, AssignedCourses.jsx, AssignedTOS.jsx
│   │   ├── QuestionCognitiveMapping.jsx, SharedDocuments.jsx
│   │   └── lpsm/                # LPSM module pages
│   │       ├── InstructorDashboard.jsx
│   │       ├── Instructor/      (LearningPlanList, LearningPlanCompose, PDFExportPanel, etc.)
│   │       ├── ProgramHead/     (ApprovalPanel, COAEPUpload, CoPoAlignment, etc.)
│   │       ├── DirectorOfLibraries/ (DocumentUpload, ReviewPanel, ReferenceLibrary, etc.)
│   │       ├── IndustryConsultant/ (ReviewPanel)
│   │       ├── Dean/            (ApprovalPanel)
│   │       ├── OICOvpaa/        (OICOVPAADashboard)
│   │       └── Shared/          (StatusTracker)
│   ├── services/                 # API clients (Axios)
│   │   ├── learningPlanService.js
│   │   └── documentService.js
│   ├── styles/                   # SCSS modules (~55 files)
│   ├── utils/                    # Utilities
│   │   ├── api.js / apiErrorHandler.js / roleGuard.js / roleIdentities.js
│   │   ├── auditLogger.js
│   │   ├── validation.js / sanitize.js
│   │   ├── dataStore.js / safeStorage.js
│   │   ├── pdfExport.js / fillCoaepPdf.js / generateCoaepPdf.js
│   │   ├── workflowHelpers.js / referenceLibrary.js
│   │   └── syllabusCommentUtils.js / seedAllData.js
│   └── layouts/                  # Layouts
│       ├── SkeletonA.jsx (primary)
│       └── Skeleton.jsx
├── server/                       # Main API server
│   ├── server.js                 # Express entry, mounts all routes
│   ├── config/                   # DB config
│   ├── models/                   # ~22 Sequelize models
│   ├── controllers/              # ~13 controllers
│   ├── routes/                   # ~13 route files
│   ├── migrations/               # ~20 migration files
│   └── seeders/                  # Seed data
├── backend/
│   ├── lpsm/                     # LPSM backend (Express + Sequelize + MySQL)
│   │   ├── src/
│   │   │   ├── app.js, config/config.js
│   │   │   ├── controllers/     (learningPlanController, programDocumentController)
│   │   │   ├── models/          (LearningPlan, LearningPlanDocument, ApprovalStage, etc.)
│   │   │   ├── routes/          (learningPlans, programDocuments)
│   │   │   ├── middleware/      (roleCheck, errorHandler, validation)
│   │   │   ├── migrations/      (7 migration files)
│   │   │   └── seeders/         (2 seeders)
│   │   └── Dockerfile, Dockerfile.prod
│   ├── course-assignment/       (minimal - single app.js)
│   ├── learning-plan-composition/ (minimal - single app.js)
│   └── tos/                     (minimal - single app.js)
├── public/                      # Static assets (template PDFs, logos)
├── docker-compose.yml / docker-compose.lpsm.yml
├── vite.config.js
└── .env.example
```

## Key God Nodes (most connected)
| Node | Edges | Role |
|------|-------|------|
| `SideNavigation()` | 41 | Main navigation component |
| `SkeletonA()` | 34 | Layout shell |
| `HeaderA()` | 30 | Header component |
| `getHeaders()` | 26 | API auth headers |
| `getWorkflow()` | 23 | Workflow state machine |
| `getSyllabusByCode()` | 21 | Syllabus retrieval |
| `fetchJson()` | 17 | Generic API fetch |
| `server.js` | ~15 | API entry/route mounting |

## API Routes (server/)
| Route | Controller | Purpose |
|-------|-----------|---------|
| `/api/ilos` | iloController | Intended Learning Outcomes |
| `/api/topics` | topicController | Topics & subtopics |
| `/api/references` | referenceController | References library |
| `/api/references/summary` | referenceSummaryController | Reference summaries |
| `/api/tlas` | tlaController | Teaching & Learning Activities |
| `/api/assignments` | assignmentController | Course offering assignments |
| `/api/comments` | commentController | Syllabus comments |
| `/api/course-details` | courseDetailsController | Course details |
| `/api/course-outcome-alignment` | courseOutcomeAlignmentController | CO alignment |
| `/api/course-criteria` | courseCriteriaController | Course criteria |
| `/api/course-coverage` | courseCoverageController | Course coverage |
| `/api/ilo-references` | iloReferenceController | ILO-reference mapping |

## LPSM API Routes (backend/lpsm/)
| Route | Purpose |
|-------|---------|
| `/api/learning-plans` | CRUD + submit/approve/return |
| `/api/learning-plans/:id/versions` | Version management |
| `/api/learning-plans/:id/documents` | Document uploads |
| `/api/learning-plans/:id/export` | PDF export |
| `/api/learning-plans/templates` | Template management |
| `/api/program-documents` | Program document uploads |

## Data Models (server/)
Department → Program → Course → ProgramCourseOffering → CourseOutcome → IntendedLearningOutcome → Topic → Subtopic → TeachingAndLearningActivity → Reference (with ILO/TLA/topic associations)

## LPSM Data Models (backend/lpsm/)
LearningPlan → LearningPlanDocument / LearningPlanVersion, ApprovalStage → ApprovalComment, User, ProgramDocument, LearningPlanTemplate, TemplateUsage, PDFExport, ApprovalTrail

## Roles
1. **Instructor** - Create/manage learning plans, compose, submit, view versions
2. **Program Head** - Upload program documents, approve learning plans, COAEP
3. **Director of Libraries** - Upload references, review learning plans
4. **Industry Consultant** - Review learning plans
5. **Dean** - Final approval, manage faculty/programs
6. **OIC/OVPAA** - Additional oversight

## Known Issues / Gaps
- ESLint configured but linting state unknown
- Docker compose files exist for LPSM and main app
- Three stub services (course-assignment, learning-plan-composition, tos) with only app.js entrypoints
