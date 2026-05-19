# LPSM Document Logic Refactor - Implementation Summary

## ✅ COMPLETED

Your LPSM system has been refactored to correctly separate **program-level documents** from **course-level documents**.

---

## What Was Fixed

### Problem
The system incorrectly required 3 program documents **per course**:
```
Course 1 → needs PO-PEO, CO-PO, COAEP
Course 2 → needs PO-PEO, CO-PO, COAEP  ❌ Duplicate!
Course 3 → needs PO-PEO, CO-PO, COAEP  ❌ Duplicate!
```

### Solution
Now uploads 3 documents **ONCE per program per academic period**:
```
Program: Computer Science, Period: Spring 2024
  ├── PO-PEO Alignment (uploaded once)
  ├── CO-PO Alignment (uploaded once)
  └── COAEP (uploaded once)

All courses in CS program → use same documents ✅
```

---

## Files Created/Modified

### Backend (/backend/lpsm/src/)

**New Files:**
1. `models/ProgramDocument.js` - Database model for program-level docs
2. `controllers/programDocumentController.js` - Business logic (5 methods)
3. `routes/programDocuments.js` - API endpoints (5 routes)

**Modified Files:**
1. `controllers/learningPlanController.js` - Updated submission validation
2. `app.js` - Registered new routes

### Frontend (/src/)

**Modified Files:**
1. `services/learningPlanService.js` - Added 5 new API client methods

### Documentation

**New Files:**
1. `LPSM_DOCUMENT_LOGIC_FIX.md` - Complete implementation guide

---

## Backend Implementation

### 1. New Database Table: `program_documents`

```sql
program_documents (
  id INT PRIMARY KEY,
  program_id INT,                  -- Links to Program
  academic_period_id INT,          -- Links to Academic Period
  
  po_peo_file VARCHAR(255),        -- File path
  co_po_file VARCHAR(255),
  coaep_file VARCHAR(255),
  
  po_peo_filename VARCHAR(255),    -- Original filenames
  co_po_filename VARCHAR(255),
  coaep_filename VARCHAR(255),
  
  uploaded_by INT,                 -- Program Head user ID
  uploaded_by_name VARCHAR(255),
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE (program_id, academic_period_id)  -- One set per program/period
)
```

### 2. Submission Validation Logic (NEW)

Before instructor submits a course:
```javascript
// 1. Check if program has documents uploaded
const programDoc = await ProgramDocument.findOne({
  where: {
    program_id: plan.program_id,
    academic_period_id: plan.academic_period_id
  }
});

// 2. Validate all 3 are present
if (!programDoc.po_peo_file || !programDoc.co_po_file || !programDoc.coaep_file) {
  return error("Program documents incomplete");
}

// 3. Check for course-specific references (still per-course)
const refs = plan.documents.filter(d => d.document_type === 'references');
if (refs.length === 0) {
  return error("Missing references for this course");
}
```

### 3. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/program-documents` | GET | Fetch documents for program + period |
| `/api/program-documents/status/check` | GET | Check if all 3 uploaded |
| `/api/program-documents/upload` | POST | Upload single document |
| `/api/program-documents/batch-upload` | POST | Upload all 3 at once |
| `/api/program-documents/:id/:period/:type` | DELETE | Remove document |

### 4. Controller Methods

```javascript
getProgramDocuments()           // Get by program + period
checkProgramDocumentsStatus()   // Status check
uploadProgramDocument()         // Upload one
upsertProgramDocuments()        // Upload/update all 3
deleteProgramDocument()         // Remove one
```

---

## Frontend Implementation

### Service Methods (learningPlanService.js)

```javascript
// Get program documents
getProgramDocuments(role, userId, programId, academicPeriodId)

// Check status
checkProgramDocumentsStatus(role, userId, programId, academicPeriodId)

// Upload operations
uploadProgramDocument(role, userId, formData)
batchUploadProgramDocuments(role, userId, formData)
deleteProgramDocument(role, userId, programId, academicPeriodId, docType)
```

### Usage Example
```javascript
// Check if program docs are ready
const status = await learningPlanService.checkProgramDocumentsStatus(
  'program_head',
  10,
  1,              // program_id
  '2024-S1'       // academic_period_id
);

if (status.all_uploaded) {
  // Can submit courses
}
```

---

## Data Migration

For existing data with per-course documents:

1. Identify unique (program_id, academic_period_id) combinations
2. Create ONE `program_documents` record for each
3. Copy the 3 program documents to this record
4. Delete duplicate per-course copies

```sql
-- Example:
INSERT INTO program_documents 
  (program_id, academic_period_id, po_peo_file, co_po_file, coaep_file, uploaded_by, uploaded_by_name)
SELECT DISTINCT
  lp.program_id,
  lp.academic_period_id,
  (SELECT file_path FROM learning_plan_documents WHERE learning_plan_id = lp.id AND document_type = 'po_peo_alignment' LIMIT 1),
  (SELECT file_path FROM learning_plan_documents WHERE learning_plan_id = lp.id AND document_type = 'co_po_alignment' LIMIT 1),
  (SELECT file_path FROM learning_plan_documents WHERE learning_plan_id = lp.id AND document_type = 'coaep' LIMIT 1),
  10,
  'Dr. Patricia Moore'
FROM learning_plans lp
WHERE lp.status = 'draft'
GROUP BY lp.program_id, lp.academic_period_id
ON DUPLICATE KEY UPDATE updated_at = NOW();
```

---

## Testing

### Test Scenario

1. **Program Head (User 10)** uploads 3 documents for CS program, Spring 2024
   ```
   PUT /api/program-documents/batch-upload
   program_id: 1
   academic_period_id: 2024-S1
   Files: [po_peo.pdf, co_po.pdf, coaep.pdf]
   ```

2. **Instructor (User 1)** tries to submit course CS301
   ```
   POST /api/learning-plans/1/submit
   ```
   ✅ System checks: CS program + Spring 2024 has all 3 docs → ALLOW

3. **Director** uploads references for CS301 (per-course)
   ```
   POST /api/learning-plans/1/documents
   ```
   ✅ Works as before

4. **Submission completes** with both program + course documents

---

## Key Improvements

✅ **No Duplication** - 3 documents uploaded once, used by all courses  
✅ **Cleaner Logic** - Clear separation of program vs course docs  
✅ **Better UX** - Program Head doesn't duplicate work  
✅ **Compliance** - PEO/PO/COAEP tracked at program level  
✅ **Performance** - Fewer files to store and manage  

---

## Next Steps

### Phase 2: Frontend UI Updates (TODO)

1. **Program Head Dashboard**
   - Show program-level documents separately
   - One section for "Semester Documents" (program-wide)
   - One section for "Course Submissions" (course-specific)

2. **New Component: ProgramDocumentUpload.jsx**
   - Batch upload interface for 3 documents
   - Status indicator: "All uploaded" vs "Pending"
   - Edit/replace functionality

3. **Update Submission UI**
   - Show program document status before course submission
   - Error message if missing: "Program documents required"

4. **Instructor Course Submission**
   - Pre-check program documents
   - Show helpful message: "Using [program name] program documents from [date]"

---

## Files Reference

| File | Type | Purpose |
|------|------|---------|
| `LPSM_DOCUMENT_LOGIC_FIX.md` | Docs | Implementation details |
| `models/ProgramDocument.js` | Backend | Database model |
| `controllers/programDocumentController.js` | Backend | Business logic |
| `routes/programDocuments.js` | Backend | API endpoints |
| `controllers/learningPlanController.js` | Backend | Updated validation |
| `services/learningPlanService.js` | Frontend | API client |

---

## Support

For questions about the implementation:
1. Check `LPSM_DOCUMENT_LOGIC_FIX.md` for detailed API docs
2. Review controller methods in `programDocumentController.js`
3. Check service calls in `learningPlanService.js`
