import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './DocumentUpload.module.scss';
import * as service from '../../../services/learningPlanService';

const DocumentUpload = () => {
  const { role, planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(planId);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = parseInt(localStorage.getItem('userId') || '20');

  const roleDocTypes = {
    program_head: ['peo_alignment', 'coaep', 'co_po_alignment'],
    director_of_libraries: ['references']
  };

  const docLabels = {
    peo_alignment: 'Program Outcome & PEO Alignment',
    coaep: 'COAEP',
    co_po_alignment: 'Course Outcomes & PO Alignment',
    references: 'References'
  };

  const acceptedTypes = {
    peo_alignment: '.pdf,.docx',
    coaep: '.pdf,.docx',
    co_po_alignment: '.pdf,.docx',
    references: '.pdf,.docx,.xlsx'
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await service.getLearningPlans(role, userId);
        setPlans(res.data.filter(p => p.status === 'draft'));
        if (selectedPlanId) {
          const found = res.data.find(p => p.id === parseInt(selectedPlanId));
          if (found) {
            setPlan(found);
            setDocuments(found.documents || []);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [role, userId, selectedPlanId]);

  const handlePlanSelect = (e) => {
    const id = parseInt(e.target.value);
    setSelectedPlanId(id);
    const found = plans.find(p => p.id === id);
    if (found) {
      setPlan(found);
      setDocuments(found.documents || []);
    }
  };

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file || !selectedPlanId) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploader_role', role);
      formData.append('document_type', docType);
      formData.append('filename', file.name);

      await service.uploadDocument(role, userId, selectedPlanId, formData);

      const res = await service.getLearningPlan(role, userId, selectedPlanId);
      setPlan(res.data);
      setDocuments(res.data.documents || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;

    try {
      setUploading(true);
      await service.deleteDocument(role, userId, selectedPlanId, docId);

      const res = await service.getLearningPlan(role, userId, selectedPlanId);
      setPlan(res.data);
      setDocuments(res.data.documents || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  const allowedTypes = roleDocTypes[role] || [];
  const uploadedDocs = documents.filter(d => allowedTypes.includes(d.document_type));

  return (
    <div className={styles.container}>
      <h1>Document Upload</h1>
      <p className={styles.subtitle}>Upload required documents for learning plans in draft status</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <label>Select Learning Plan:</label>
        <select value={selectedPlanId || ''} onChange={handlePlanSelect}>
          <option value="">-- Choose a plan --</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.course_name}
            </option>
          ))}
        </select>
      </div>

      {selectedPlanId && (
        <div className={styles.section}>
          <h2>Upload Documents</h2>
          <div className={styles.uploadGrid}>
            {allowedTypes.map(docType => {
              const doc = uploadedDocs.find(d => d.document_type === docType);
              return (
                <div key={docType} className={styles.uploadCard}>
                  <div className={styles.uploadCardHeader}>
                    <h3>{docLabels[docType]}</h3>
                  </div>
                  <div className={styles.uploadCardBody}>
                    {doc ? (
                      <div className={styles.uploadedFile}>
                        <div className={styles.fileName}>{doc.original_filename}</div>
                        <div className={styles.fileInfo}>
                          <small>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</small>
                        </div>
                        <div className={styles.fileActions}>
                          <label className={styles.btnReplace}>
                            Replace
                            <input
                              type="file"
                              accept={acceptedTypes[docType]}
                              onChange={(e) => handleFileUpload(e, docType)}
                              disabled={uploading}
                            />
                          </label>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className={styles.btnDelete}
                            disabled={uploading}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className={styles.uploadInput}>
                        <input
                          type="file"
                          accept={acceptedTypes[docType]}
                          onChange={(e) => handleFileUpload(e, docType)}
                          disabled={uploading}
                        />
                        <span>Choose File</span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
