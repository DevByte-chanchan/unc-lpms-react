import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './LearningPlanCompose.module.scss';
import StatusTracker from '../Shared/StatusTracker';
import VersionHistoryPanel from './VersionHistoryPanel';
import TemplateSelector from './TemplateSelector';
import PDFExportPanel from './PDFExportPanel';
import * as service from '../../../services/learningPlanService';

const LearningPlanCompose = () => {
  const navigate = useNavigate();
  const { role, planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semester, setSemester] = useState('1st');
  const [versions, setVersions] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(!!planId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = parseInt(localStorage.getItem('userId') || '1');

  useEffect(() => {
    if (planId) {
      const fetchData = async () => {
        try {
          const [planRes, versionsRes] = await Promise.all([
            service.getLearningPlan(role, userId, planId),
            service.getLPVersions(role, userId, planId)
          ]);
          setPlan(planRes.data);
          setCourseName(planRes.data.course_name);
          setCourseCode(planRes.data.course_code || '');
          setAcademicYear(planRes.data.academic_year || '2025-2026');
          setSemester(planRes.data.semester || '1st');
          setVersions(versionsRes.data);
        } catch (err) {
          setError(err.response?.data?.error || err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [planId, role, userId]);

  const checkTemplate = async () => {
    if (!courseCode || planId) return;
    try {
      const res = await service.getLPTemplate(role, userId, courseCode);
      setTemplate(res.data);
    } catch (err) {
      setTemplate(null);
    }
  };

  const useTemplate = () => {
    if (!template) return;
    setCourseName(template.course_name);
    setTemplate(null);
    // In a real app, we'd pre-fill all syllabus sections here
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = { 
        course_name: courseName, 
        course_code: courseCode,
        academic_year: academicYear,
        semester: semester
      };
      
      if (planId) {
        // Update existing logic (requires backend update to support PUT/PATCH)
        await service.createLearningPlan(role, userId, data); 
      } else {
        // Create new
        const res = await service.createLearningPlan(role, userId, data);
        setPlan(res.data);
      }
      navigate(`/role/${role}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (!planId) {
        setError('Save the plan first');
        return;
      }
      await service.submitLearningPlan(role, userId, planId);
      navigate(`/role/${role}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  const requiredDocs = [
    { type: 'peo_alignment', label: 'Program Outcome & PEO Alignment' },
    { type: 'coaep', label: 'COAEP' },
    { type: 'co_po_alignment', label: 'Course Outcomes & PO Alignment' },
    { type: 'references', label: 'References' }
  ];

  const uploadedTypes = (plan?.documents || []).map(d => d.document_type);
  const allDocsUploaded = requiredDocs.every(d => uploadedTypes.includes(d.type));

  return (
    <div className={styles.container}>
      <h1>Learning Plan Composition</h1>

      {plan && <StatusTracker status={plan.status} />}

      <div className={styles.form}>
        <div className={styles.section}>
          <h2>Course Information</h2>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                disabled={plan && plan.status !== 'draft'}
                placeholder="e.g. CS101"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Course Name</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                disabled={plan && plan.status !== 'draft'}
                placeholder="e.g. Introduction to Computing"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                disabled={plan && plan.status !== 'draft'}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Semester</label>
              <select 
                value={semester} 
                onChange={(e) => setSemester(e.target.value)}
                disabled={plan && plan.status !== 'draft'}
              >
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
                <option value="summer">Summer</option>
              </select>
            </div>
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>

        {!planId && (
          <TemplateSelector
            courseCode={courseCode}
            academicYear={academicYear}
            role={role}
            userId={userId}
            onTemplateSelected={(newPlan) => {
              setPlan(newPlan);
              navigate(`/role/${role}/plans/${newPlan.id}`);
            }}
          />
        )}

        {versions.length > 0 && (
          <VersionHistoryPanel
            planId={planId}
            versions={versions}
            role={role}
            userId={userId}
            onVersionRestored={() => {
              // Refresh versions after rollback
              setLoading(true);
            }}
          />
        )}

        {plan && plan.status !== 'draft' && (
          <PDFExportPanel
            planId={planId}
            courseCode={courseCode}
            courseName={courseName}
            status={plan.status}
            role={role}
            userId={userId}
          />
        )}

        <div className={styles.section}>
          <h2>Required Documents</h2>
          <div className={styles.docList}>
            {requiredDocs.map(doc => (
              <div key={doc.type} className={styles.docItem}>
                <span>{doc.label}</span>
                <span className={uploadedTypes.includes(doc.type) ? styles.uploaded : styles.pending}>
                  {uploadedTypes.includes(doc.type) ? '✓ Uploaded' : '✗ Missing'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={() => navigate(`/role/${role}`)} className={styles.btnSecondary}>
            Cancel
          </button>
          <button onClick={handleSave} className={styles.btnPrimary} disabled={submitting}>
            Save Plan
          </button>
          {plan?.status === 'draft' && (
            <button
              onClick={handleSubmit}
              className={styles.btnSuccess}
              disabled={submitting || !allDocsUploaded}
              title={!allDocsUploaded ? 'All documents must be uploaded' : ''}
            >
              Submit for Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningPlanCompose;
