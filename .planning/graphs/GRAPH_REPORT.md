# Graph Report - unc-lpms-react  (2026-06-27)

## Corpus Check
- 240 files · ~153,651 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1043 nodes · 1639 edges · 128 communities (110 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3bf63475`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]

## God Nodes (most connected - your core abstractions)
1. `SideNavigation()` - 41 edges
2. `SkeletonA()` - 34 edges
3. `HeaderA()` - 30 edges
4. `getHeaders()` - 26 edges
5. `getWorkflow()` - 23 edges
6. `getSyllabusByCode()` - 21 edges
7. `fetchJson()` - 17 edges
8. `LPSM Module - Complete Setup Guide` - 15 edges
9. `LPSM Module - Complete Implementation Summary` - 14 edges
10. `HeaderA()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `ApprovalCourses()` --calls--> `normalizeName()`  [INFERRED]
  src/pages/ApprovalCourses.jsx → src/pages/ApprovalSyllabus.jsx
- `ApprovalILOForm()` --calls--> `normalizeName()`  [INFERRED]
  src/pages/ApprovalILOForm.jsx → src/pages/ApprovalSyllabus.jsx
- `ApprovalReferenceForm()` --calls--> `normalizeName()`  [INFERRED]
  src/pages/ApprovalReferenceForm.jsx → src/pages/ApprovalSyllabus.jsx
- `ApprovalTopicForm()` --calls--> `normalizeName()`  [INFERRED]
  src/pages/ApprovalTopicForm.jsx → src/pages/ApprovalSyllabus.jsx
- `seedAllData()` --calls--> `seedDemoWorkflows()`  [INFERRED]
  src/utils/seedAllData.js → src/utils/workflowHelpers.js

## Import Cycles
- None detected.

## Communities (128 total, 18 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (24): fetchCPA(), CoursesTable(), Dropdown(), DropdownMultiSelect(), FormNavigation(), HeaderA(), MultiSelect(), ReferencePicker() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (33): app, cors, express, { ProgramDocument, Program, AcademicPeriod }, AppError, errorHandler(), notFoundHandler(), validateBatchExport() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (32): LearningPlanCompose(), PDFExportPanel(), TemplateSelector(), VersionHistoryPanel(), VersionSnapshot(), approveOrReturn(), batchUploadProgramDocuments(), checkProgramDocumentsStatus() (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (31): PdfExportButton(), OICOVPAADashboard(), acceptSuggestion(), addReference(), addSuggestion(), getSuggestions(), getSyllabi(), getSyllabus() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (47): 1. Backend Setup, 2. Docker Setup & Database, 3. Frontend Setup, API Endpoints, approval_comments, approval_stages, Approve, Backend (.env) (+39 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (29): ApprovalCommentBox(), DropdownA(), ALLOWED_ROLES, ProtectedRoute(), AddReference(), ALL_DEPARTMENTS, ReferenceTypes, DEPARTMENT_COLORS (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (34): API Endpoints, approval_comments, approval_stages, Architecture, ✅ Auto-Workflow Advancement, Backend (backend/lpsm/), ✅ Comment System with Dean Relay, Common Issues & Solutions (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (33): dependencies, axios, docx, jspdf, jspdf-autotable, pdf-lib, react, react-dom (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (27): dependencies, cors, express, react, react-dom, react-feather, react-router-dom, devDependencies (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (12): ErrorBoundary, handleApiError(), safeApiCall(), getTimestamp(), getUserInfo(), logActivity(), logApprovalAction(), logDocumentAction() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (13): approveOrReturn(), archiver, createFromTemplate(), createLPSnapshot(), exportBatchPDF(), exportPDF(), fs, generateLPHTML() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (25): 1. New Database Table: `program_documents`, 2. Submission Validation Logic (NEW), 3. API Endpoints, 4. Controller Methods, Backend (/backend/lpsm/src/), Backend Implementation, ✅ COMPLETED, Data Migration (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (17): fmtDate(), PDFViewerModal(), coaepData, COAEPUpload(), CURRENT_YEAR, docList, yearOptions, A4_PAPER (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (23): 1. Check if program has required documents, 1. New Model: `ProgramDocument.js`, 2. Submit course for review (NEW VALIDATION), 2. Updated Controller: `learningPlanController.js`, 3. New Controller: `programDocumentController.js`, 4. New Routes: `programDocuments.js`, API Examples, Backend Changes (+15 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (23): dependencies, archiver, cors, dotenv, express, multer, mysql2, puppeteer (+15 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (11): HeaderA(), directorSyllabi, directorSyllabi, documentDefinitions, documents, DocumentsViewer(), documentDefinitions, DocumentUpload() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (6): normalizeRoleKey(), prettyRoleLabel, SharedDocuments(), normalizeRoleKey(), RoleUploadPanel(), DocumentService

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (7): ConsultantsTable(), mockConsultants, SkeletonA(), ProgramHeadConsultant(), ProgramHeadCourseOfferings(), ProgramHeadIndustryConsultant(), TOS()

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (15): app, assignmentRoutes, commentRoutes, cors, courseCoverageRoutes, courseCriteriaRoutes, courseDetailsRoutes, courseOutcomeAlignmentRoutes (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.34
Nodes (6): ApprovalFormNavigation(), SideNavigation(), SyllabusRevisionsSections(), TextArea(), TextField(), SyllabusRevisions()

### Community 20 - "Community 20"
Cohesion: 0.21
Nodes (8): DocumentUpload(), ProgramHeadDashboard(), programHeadSyllabi, ProgramHeadUpload(), ApprovalCourses(), Dean(), DirectorOfLibraries(), ProgramHead()

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (5): ApprovalCoursesTable(), TOSCoursesTable(), syllabiData, TOS(), OICOVPAA()

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (3): isNonEmpty(), validateForm(), validateRequired()

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (5): Duplicator(), tosSections(), QuestionCognitiveMapping(), TOSPreview(), TOSSummary()

### Community 24 - "Community 24"
Cohesion: 0.27
Nodes (8): assignReferencesToILO(), deleteILOReference(), getReferencesByILO(), { ILOReference, Reference, IntendedLearningOutcome, sequelize }, { Op }, express, { getReferencesByILO, assignReferencesToILO, deleteILOReference }, router

### Community 25 - "Community 25"
Cohesion: 0.27
Nodes (8): assignTopicsToILO(), getAssignedTopics(), getAvailableTopics(), { Op }, { Topic, Subtopic, ILOTopic, sequelize }, express, { getAvailableTopics, getAssignedTopics, assignTopicsToILO }, router

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (4): { sequelize, Sequelize }, commentController, express, router

### Community 27 - "Community 27"
Cohesion: 0.31
Nodes (7): {
    Course,
    ProgramCourseOffering,
    CourseOutcome,
    IntendedLearningOutcome,
    ILOTopic,
    Topic,
    TopicTLA,
    TLAAssessment
}, getCourseCriteriaByCourseCode(), normalizePeriod(), parseWeight(), express, { getCourseCriteriaByCourseCode }, router

### Community 28 - "Community 28"
Cohesion: 0.32
Nodes (7): BB, bodyCell(), COL, CourseAssessmentEvaluationPlan(), defaultData, headerCell(), PAPER

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (4): { CourseOfferingAssignment, ProgramCourseOffering, Course, Program, Department }, assignmentController, express, router

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (5): {
    Course,
    ProgramCourseOffering,
    CourseOutcome,
    IntendedLearningOutcome,
    ILOTopic,
    Topic,
    Subtopic,
    TopicTLA,
    TeachingAndLearningActivity,
    TLAAssessment,
    Reference,
    ILOReference
}, { Op }, courseCoverageController, express, router

### Community 31 - "Community 31"
Cohesion: 0.32
Nodes (6): createReference(), getAllReferences(), { Reference }, express, { getAllReferences, createReference }, router

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (5): {
    Course,
    ProgramCourseOffering,
    CourseOutcome,
    IntendedLearningOutcome,
    ILOTopic,
    Topic,
    Subtopic,
    TopicTLA,
    TeachingAndLearningActivity,
    TLAAssessment,
    Reference,
    ILOReference
}, { Op }, express, referenceSummaryController, router

### Community 33 - "Community 33"
Cohesion: 0.32
Nodes (6): db, getTlasForIlo(), syncTlasToIlo(), express, { getTlasForIlo, syncTlasToIlo }, router

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (7): ApprovalILOForm(), ApprovalReferenceForm(), ApprovalSyllabus(), approverDisplayNames, normalizeName(), roleNames, ApprovalTopicForm()

### Community 35 - "Community 35"
Cohesion: 0.32
Nodes (4): ENTITY_MAP, escapeHtml(), sanitizeObject(), sanitizeString()

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (5): { Course, ProgramCourseOffering, Prerequisite }, getCourseDetailsByCourseCode(), express, { getCourseDetailsByCourseCode }, router

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (5): { Course, ProgramCourseOffering, CourseOutcome, ProgramOutcomeAlignment, ProgramOutcome }, getCourseProgramOutcomeAlignment(), express, { getCourseProgramOutcomeAlignment }, router

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (5): { Course, ProgramCourseOffering, CourseOutcome, IntendedLearningOutcome }, getILOsByCourseCode(), express, { getILOsByCourseCode }, router

### Community 39 - "Community 39"
Cohesion: 0.38
Nodes (4): ALLOWED_ROLES, getUserRole(), hasRole(), requireRole()

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): basename, db, fs, path, Sequelize

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (3): FacultyTable(), mockFaculty, DeanFaculty()

### Community 42 - "Community 42"
Cohesion: 0.47
Nodes (3): FilledCOAEPDF(), COL, generateCoaepPdf()

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (3): mockPrograms, ProgramsTable(), DeanPrograms()

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (5): basename, db, fs, path, Sequelize

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (3): app, cors, express

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (3): app, cors, express

### Community 48 - "Community 48"
Cohesion: 0.50
Nodes (3): app, cors, express

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **352 isolated node(s):** `express`, `cors`, `app`, `express`, `cors` (+347 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SideNavigation()` connect `Community 19` to `Community 0`, `Community 34`, `Community 5`, `Community 12`, `Community 15`, `Community 16`, `Community 17`, `Community 20`, `Community 21`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `SkeletonA()` connect `Community 17` to `Community 0`, `Community 34`, `Community 5`, `Community 12`, `Community 15`, `Community 16`, `Community 19`, `Community 20`, `Community 21`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `ErrorBoundary` connect `Community 9` to `Community 20`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `express`, `cors`, `app` to the rest of the system?**
  _352 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07653061224489796 - nodes in this community are weakly interconnected._