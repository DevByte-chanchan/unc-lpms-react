# LPSM Module - Complete Setup Guide

## Project Overview

This is a complete Learning Plan Submissions Management (LPSM) module implementation for the UNC LPMS system with:
- **Frontend**: Vite + React 19, SASS modules, role-based pages
- **Backend**: Express.js + Sequelize ORM
- **Database**: MySQL (Docker container)
- **Architecture**: RESTful API with role-based access control

---

## Directory Structure

```
unc-lpms-react/
├── backend/lpsm/                           # Backend Express service
│   ├── src/
│   │   ├── config/                         # Database config
│   │   ├── models/                         # Sequelize models
│   │   ├── migrations/                     # Database migrations
│   │   ├── seeders/                        # Sample data
│   │   ├── controllers/                    # Business logic
│   │   ├── routes/                         # API endpoints
│   │   ├── middleware/                     # Auth middleware
│   │   └── app.js                          # Entry point
│   ├── uploads/                            # File uploads storage
│   ├── package.json
│   ├── .sequelizerc
│   ├── Dockerfile
│   └── .env.example
│
├── src/
│   ├── services/
│   │   └── learningPlanService.js          # API client (Axios)
│   ├── pages/lpsm/
│   │   ├── Instructor/
│   │   │   ├── LearningPlanList.jsx        # List view
│   │   │   └── LearningPlanCompose.jsx     # Compose/Edit view
│   │   ├── ProgramHead/
│   │   │   ├── DocumentUpload.jsx          # Upload documents
│   │   │   └── ApprovalPanel.jsx           # Approval decision
│   │   ├── DirectorOfLibraries/
│   │   │   ├── DocumentUpload.jsx          # Upload references
│   │   │   └── ReviewPanel.jsx             # Review submission
│   │   ├── IndustryConsultant/
│   │   │   └── ReviewPanel.jsx             # Review submission
│   │   ├── Dean/
│   │   │   └── ApprovalPanel.jsx           # Final approval
│   │   └── Shared/
│   │       └── StatusTracker.jsx           # Workflow visualization
│   └── App.jsx                             # Updated with LPSM routes
│
└── docker-compose.lpsm.yml                 # Docker orchestration
```

---

## Quick Start

### 1. Backend Setup

```bash
cd backend/lpsm

# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Update .env with your values (optional, defaults should work)
```

### 2. Docker Setup & Database

```bash
# From project root
docker-compose -f docker-compose.lpsm.yml up --build

# This will:
# - Start MySQL container (port 3308)
# - Run migrations automatically
# - Seed sample data
# - Start Express server (port 4002)
```

**Verify backend is running:**
```bash
curl http://localhost:4002/health
# Should return: {"status":"OK","service":"LPSM Backend"}
```

### 3. Frontend Setup

```bash
# Install dependencies
npm install axios  # If not already installed

# Start Vite dev server
npm run dev
```

The frontend will run on `http://localhost:5173`.

---

## API Endpoints

All endpoints require headers:
```
X-User-Role: instructor | program_head | director_of_libraries | industry_consultant | dean
X-User-Id: <integer>
```

### Learning Plans
- `POST /api/learning-plans` - Create new learning plan
- `GET /api/learning-plans` - List learning plans
- `GET /api/learning-plans/:id` - Get single learning plan

### Documents
- `POST /api/learning-plans/:id/documents` - Upload document (multipart/form-data)
- `DELETE /api/learning-plans/:id/documents/:docId` - Delete document

### Workflow
- `POST /api/learning-plans/:id/submit` - Instructor submits for review
- `POST /api/learning-plans/:id/review` - Submit review notes (director/consultant)
- `POST /api/learning-plans/:id/approve` - Approve or return (program head/dean)

---

## Database Schema

### learning_plans
```sql
id, instructor_id, course_name, status, created_at, updated_at
Status: draft | under_review | approved | returned
```

### learning_plan_documents
```sql
id, learning_plan_id, uploader_id, uploader_role, document_type, 
file_path, original_filename, created_at, updated_at

Roles: program_head, director_of_libraries
Types: peo_alignment, coaep, co_po_alignment, references
```

### approval_stages
```sql
id, learning_plan_id, stage, reviewer_role, reviewer_id, status, 
comments, reviewed_at, created_at, updated_at

Stages: industry_consultant, director_of_libraries, program_head, dean
Status: pending | approved | returned
```

### approval_comments
```sql
id, learning_plan_id, approval_stage_id, from_role, to_role, 
comment, from_id, created_at, updated_at

from_role: industry_consultant, director_of_libraries, program_head, dean
to_role: instructor, program_head
(Dean comments ALWAYS go to program_head, never instructor)
```

---

## Workflow Logic

### Submission Flow

1. **Instructor** creates learning plan (draft)
2. **Program Head & Director of Libraries** upload required documents (draft)
3. **Instructor** submits for review → status = 'under_review'
4. **System** creates 4 approval stages:
   - industry_consultant (pending)
   - director_of_libraries (pending)
   - program_head (pending)
   - dean (pending)
5. **Industry Consultant & Director of Libraries** review in parallel
6. Once BOTH complete → **Program Head** stage unlocks
7. **Program Head** approves or returns → next stage unlocks
8. **Dean** approves or returns
   - Dean comments ALWAYS relay to Program Head only
   - Dean comments NEVER visible to Instructor
9. Final approval → status = 'approved'

---

## Role-Based Access Control

### Instructor
- Create and edit learning plans (draft status)
- View attached documents (read-only)
- Submit for review
- View own learning plans
- **Cannot see:** Dean comments or internal reviews

### Program Head
- Upload: PEO Alignment, COAEP, Course Outcomes & PO
- Delete uploads (draft status only)
- Approve or return with comments to Instructor
- **Can see:** All documents, Industry Consultant reviews

### Director of Libraries
- Upload: References
- Delete uploads (draft status only)
- Submit review notes
- **Can see:** All documents

### Industry Consultant
- Review learning plan and documents
- Submit review notes
- **Can see:** All documents

### Dean
- Approve or return with comments
- **Comment restriction:** Comments ONLY go to Program Head
- **UI restriction:** Cannot select Instructor as recipient
- **API enforcement:** to_role forced to 'program_head'

---

## Testing Workflow

### Seed Data
Pre-populated users:
```
ID | Name | Role | Email
1  | Dr. Sarah Wilson | instructor | sarah.wilson@unc.edu
2  | Mr. James Chen | instructor | james.chen@unc.edu
10 | Dr. Patricia Moore | program_head | patricia.moore@unc.edu
20 | Ms. Linda Rodriguez | director_of_libraries | linda.rodriguez@unc.edu
30 | Mr. Robert Thompson | industry_consultant | robert.thompson@example.com
40 | Dr. Michael Johnson | dean | michael.johnson@unc.edu
```

Pre-populated learning plans:
```
ID | Course | Instructor | Status
1  | CS301 - Algorithms | 1 | draft
2  | CS401 - Database Systems | 1 | draft
3  | MATH201 - Calculus II | 2 | draft
```

### Test Scenario

1. **As Program Head** (ID: 10)
   - Navigate to `/lpsm/program-head/upload`
   - Select "CS301 - Algorithms"
   - Upload 3 documents: PEO, COAEP, Course Outcomes

2. **As Director of Libraries** (ID: 20)
   - Navigate to `/lpsm/director-of-libraries/upload`
   - Select "CS301 - Algorithms"
   - Upload References document

3. **As Instructor** (ID: 1)
   - Navigate to `/lpsm/instructor`
   - View learning plan CS301
   - Click "Submit for Review"

4. **As Industry Consultant** (ID: 30)
   - Navigate to `/lpsm/industry-consultant/review`
   - Select CS301
   - Submit review notes

5. **As Director of Libraries** (ID: 20)
   - Navigate to `/lpsm/director-of-libraries/review`
   - Select CS301
   - Submit review notes

6. **As Program Head** (ID: 10)
   - Navigate to `/lpsm/program-head/approval`
   - Select CS301
   - Approve or return with comments

7. **As Dean** (ID: 40)
   - Navigate to `/lpsm/dean/approval`
   - Select CS301
   - Approve → Final status = 'approved'
   - Comments only relay to Program Head

---

## Manual Testing with cURL

### Create Learning Plan
```bash
curl -X POST http://localhost:4002/api/learning-plans \
  -H "X-User-Role: instructor" \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"course_name":"CS501 Advanced Topics"}'
```

### Upload Document
```bash
curl -X POST http://localhost:4002/api/learning-plans/1/documents \
  -H "X-User-Role: program_head" \
  -H "X-User-Id: 10" \
  -F "file=@/path/to/file.pdf" \
  -F "uploader_role=program_head" \
  -F "document_type=peo_alignment" \
  -F "filename=alignment.pdf"
```

### Submit for Review
```bash
curl -X POST http://localhost:4002/api/learning-plans/1/submit \
  -H "X-User-Role: instructor" \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Submit Review
```bash
curl -X POST http://localhost:4002/api/learning-plans/1/review \
  -H "X-User-Role: director_of_libraries" \
  -H "X-User-Id: 20" \
  -H "Content-Type: application/json" \
  -d '{"reviewer_id":20,"reviewer_role":"director_of_libraries","comments":"Looks good!"}'
```

### Approve
```bash
curl -X POST http://localhost:4002/api/learning-plans/1/approve \
  -H "X-User-Role: dean" \
  -H "X-User-Id: 40" \
  -H "Content-Type: application/json" \
  -d '{"reviewer_id":40,"reviewer_role":"dean","action":"approve","comments":"Approved by Dean"}'
```

---

## Troubleshooting

### Backend won't start
```bash
# Check MySQL is running
docker ps | grep db_lpsm

# Check logs
docker logs backend_lpsm

# Manually run migrations
docker exec backend_lpsm npm run db:migrate

# Manually seed data
docker exec backend_lpsm npm run db:seed
```

### Frontend API calls failing
- Verify `X-User-Role` and `X-User-Id` headers are being sent
- Check `learningPlanService.js` - ensure API_BASE_URL matches backend
- Verify CORS is enabled (should be in app.js)

### Document upload issues
- Ensure `/backend/lpsm/uploads/` directory exists and is writable
- Check file size limits in multer config
- Verify accepted file types match request

### Role-checking issues
- Ensure `localStorage.userId` is set (check DevTools > Application > LocalStorage)
- Verify role normalization in UploadPanel matches current role

---

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=4002
DB_HOST=db_lpsm
DB_PORT=3306
DB_USER=lpsm_user
DB_PASSWORD=lpsm_password
DB_NAME=lpsm_db
```

### Frontend (localStorage keys)
```
userId: 1                    # Current user ID
approver_role: instructor    # Current role
user: {"role":"instructor","name":"..."}
```

---

## Next Steps / Production Deployment

1. **Authentication**: Add JWT token validation instead of headers
2. **File Storage**: Use S3 or cloud storage instead of local filesystem
3. **Email Notifications**: Send email when stages complete
4. **Audit Logging**: Log all approvals and comments
5. **Advanced Search**: Full-text search across learning plans
6. **Bulk Operations**: Batch upload multiple documents
7. **Export**: Generate PDF reports of approvals

---

## Support & Debugging

### Enable verbose logging
Edit `src/app.js` and change:
```javascript
logging: false  → logging: console.log
```

### Check database
```bash
# Connect to MySQL
docker exec -it db_lpsm mysql -u lpsm_user -plpsm_password lpsm_db

# View tables
SHOW TABLES;
SELECT * FROM learning_plans;
SELECT * FROM learning_plan_documents;
SELECT * FROM approval_stages;
```

### Reset database
```bash
# Delete volume and restart
docker-compose -f docker-compose.lpsm.yml down -v
docker-compose -f docker-compose.lpsm.yml up --build
```

---

## Files Modified/Created

**New Backend Files:**
- backend/lpsm/package.json
- backend/lpsm/.sequelizerc
- backend/lpsm/src/config/config.js
- backend/lpsm/src/models/*.js (5 models)
- backend/lpsm/src/migrations/*.js (5 migrations)
- backend/lpsm/src/seeders/*.js (2 seeders)
- backend/lpsm/src/controllers/learningPlanController.js
- backend/lpsm/src/routes/learningPlans.js
- backend/lpsm/src/middleware/roleCheck.js
- backend/lpsm/src/app.js
- backend/lpsm/Dockerfile
- backend/lpsm/.env.example
- docker-compose.lpsm.yml

**New Frontend Files:**
- src/services/learningPlanService.js
- src/pages/lpsm/Instructor/LearningPlanList.jsx(.module.scss)
- src/pages/lpsm/Instructor/LearningPlanCompose.jsx(.module.scss)
- src/pages/lpsm/ProgramHead/DocumentUpload.jsx(.module.scss)
- src/pages/lpsm/ProgramHead/ApprovalPanel.jsx(.module.scss)
- src/pages/lpsm/DirectorOfLibraries/DocumentUpload.jsx(.module.scss)
- src/pages/lpsm/DirectorOfLibraries/ReviewPanel.jsx(.module.scss)
- src/pages/lpsm/IndustryConsultant/ReviewPanel.jsx(.module.scss)
- src/pages/lpsm/Dean/ApprovalPanel.jsx(.module.scss)
- src/pages/lpsm/Shared/StatusTracker.jsx(.module.scss)

**Modified Files:**
- src/App.jsx (added LPSM imports and routes)

---

**Implementation Complete!** 🎉
