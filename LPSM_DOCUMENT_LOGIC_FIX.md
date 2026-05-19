# LPSM Logic Fix - Document Scope Change

## Overview
Changed the document validation logic from **per-course** to **per-program, per-academic-period**.

---

## What Changed

### ❌ OLD LOGIC (WRONG)
- Program Head uploaded 3 documents **for each course**
- Validation checked if course had all 3 documents
- Duplicated documents across multiple courses

### ✅ NEW LOGIC (CORRECT)
- Program Head uploads 3 documents **ONCE per program per semester**
- Validation checks if Program + Academic Period has all 3 documents
- Single shared documents for all courses in the program

---

## Database Changes

### New Table: `program_documents`
```sql
CREATE TABLE program_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  program_id INT NOT NULL,
  academic_period_id INT NOT NULL,
  po_peo_file VARCHAR(255),              -- Program Outcome and PEO Alignment
  co_po_file VARCHAR(255),               -- Course Outcomes & PO Alignment
  coaep_file VARCHAR(255),               -- COAEP
  po_peo_filename VARCHAR(255),
  co_po_filename VARCHAR(255),
  coaep_filename VARCHAR(255),
  uploaded_by INT NOT NULL,              -- Program Head user ID
  uploaded_by_name VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE KEY idx_program_period_unique (program_id, academic_period_id)
);
```

---

## Backend Changes

### 1. New Model: `ProgramDocument.js`
- Represents program-level documents
- Unique constraint on `(program_id, academic_period_id)`
- Tracks all 3 document files and metadata

### 2. Updated Controller: `learningPlanController.js`
**Before:**
```javascript
// Check if COURSE has all documents
const docTypes = plan.documents.map(d => d.document_type);
```

**After:**
```javascript
// Check if PROGRAM has all documents
const programDoc = await ProgramDocument.findOne({
  where: {
    program_id: plan.program_id,
    academic_period_id: plan.academic_period_id
  }
});

if (!programDoc.po_peo_file || !programDoc.co_po_file || !programDoc.coaep_file) {
  return error("Missing required program documents");
}
```

### 3. New Controller: `programDocumentController.js`
Manages program-level document operations:
- `getProgramDocuments()` - Fetch documents for a program + period
- `uploadProgramDocument()` - Upload single document
- `batchUploadProgramDocuments()` - Upload all 3 at once
- `deleteProgramDocument()` - Remove a specific document
- `checkProgramDocumentsStatus()` - Check if all 3 uploaded

### 4. New Routes: `programDocuments.js`
```
GET    /api/program-documents
POST   /api/program-documents/upload
POST   /api/program-documents/batch-upload
DELETE /api/program-documents/:program_id/:academic_period_id/:document_type
GET    /api/program-documents/status/check
```

---

## Frontend Changes

### Service: `learningPlanService.js`
New exports for program document management:
- `getProgramDocuments(role, userId, programId, academicPeriodId)`
- `uploadProgramDocument(role, userId, formData)`
- `batchUploadProgramDocuments(role, userId, formData)`
- `deleteProgramDocument(role, userId, programId, academicPeriodId, documentType)`
- `checkProgramDocumentsStatus(role, userId, programId, academicPeriodId)`

### UI Components (TODO - Next Phase)
Need to refactor Program Head upload interface:
1. **ProgramHeadUploadDashboard.jsx** - Show programs with document status
2. **ProgramDocumentUpload.jsx** - NEW component for uploading 3 documents once per semester
3. **LearningPlanSubmit.jsx** - Check program documents before allowing submission

---

## Migration Steps

### For Existing Data
```javascript
// 1. Extract program_id and academic_period_id from existing plans
// 2. Get unique (program_id, academic_period_id) combinations
// 3. For each combination:
//    - Create ONE record in program_documents
//    - Move the 3 documents from ANY course to this record
//    - Delete per-course program documents
```

---

## Testing Checklist

- [ ] Program Head can upload 3 documents once per program/semester
- [ ] Multiple courses in same program see the SAME documents
- [ ] Submission validation checks program_documents table, not learning_plan_documents
- [ ] Document status shows as complete when all 3 uploaded
- [ ] Cannot delete program documents after any course submitted
- [ ] Director of Libraries still uploads per-course references
- [ ] Course submissions blocked if program documents missing

---

## API Examples

### 1. Check if program has required documents
```bash
GET /api/program-documents/status/check?program_id=1&academic_period_id=2024-S1
```

Response:
```json
{
  "exists": true,
  "po_peo_uploaded": true,
  "co_po_uploaded": true,
  "coaep_uploaded": true,
  "all_uploaded": true,
  "uploaded_by": "Dr. Patricia Moore",
  "uploaded_at": "2024-05-14T10:30:00Z"
}
```

### 2. Submit course for review (NEW VALIDATION)
```bash
POST /api/learning-plans/1/submit
```

Backend now checks:
```javascript
// 1. Program documents exist for this program + period
const programDoc = await ProgramDocument.findOne({
  where: {
    program_id: plan.program_id,
    academic_period_id: plan.academic_period_id
  }
});

// 2. All 3 program documents uploaded
if (!programDoc.po_peo_file || ...) error

// 3. Course has references (still per-course)
const refs = plan.documents.filter(d => d.document_type === 'references');
if (refs.length === 0) error
```

---

## Benefits

✅ Eliminates document duplication  
✅ Single source of truth for program documents  
✅ Simpler management - upload once per semester  
✅ Clearer separation: Program docs (shared) vs Course docs (specific)  
✅ Easier auditing and compliance tracking  

---

## Notes

- Program documents can be deleted/replaced while plans in draft
- Once ANY course in program submitted, program documents locked
- Multiple academic periods can have different documents
- Useful for compliance: PEO/PO/COAEP documents often at program level, not course level
