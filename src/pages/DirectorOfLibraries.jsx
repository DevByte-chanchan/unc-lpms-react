import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";
import RoleUploadPanel from "../components/RoleUploadPanel/RoleUploadPanel.jsx";
import { DocumentService } from "../services/documentService.js";
import uploadStyles from "../styles/UploadPages.module.sass";
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Share2, Trash2 } from 'react-feather';
import { syllabiData } from '../data/syllabiData';
import { getWorkflow } from '../utils/workflowHelpers';

const formatBytes = (bytes) => {
  if (!bytes) return '—'
  const value = bytes < 1024 ? bytes : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return value
}

const DirectorOfLibraries = () => {
  const uploadSlots2 = [
    { id: 'lib_references', label: 'References', acceptedTypes: '.pdf,.docx,.xlsx' }
  ]

  const [uploads, setUploads] = useState({})
  const [showSuggestionPanel, setShowSuggestionPanel] = useState(false)
  const [selectedReferences, setSelectedReferences] = useState({})
  const [suggestedCourse, setSuggestedCourse] = useState('')
  const storedKey = 'director-of-libraries'

  const courses = syllabiData.map(s => ({ code: s.code, name: s.name }))

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user.role) {
        localStorage.setItem('user', JSON.stringify({ ...user, role: 'director-of-libraries', name: 'SANTOS, MARIA' }))
      }
    } catch (e) {
      localStorage.setItem('user', JSON.stringify({ role: 'director-of-libraries', name: 'SANTOS, MARIA' }))
    }

    const all = DocumentService.getAllDocuments()
    setUploads(all[storedKey] || {})
  }, [])

  const uploadedFiles = Object.values(uploads)

  const handleRemove = (key) => {
    const slots = Object.keys(uploads)
    const slotId = slots[Object.values(uploads).findIndex(v => v === uploads[key])]
    DocumentService.deleteDocument(storedKey, slotId)
    const all = DocumentService.getAllDocuments()
    setUploads(all[storedKey] || {})
  }

  const toggleReferenceSelection = (index) => {
    setSelectedReferences(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const handleSuggestReferences = () => {
    const selected = Object.keys(selectedReferences)
      .filter(key => selectedReferences[key])
      .map(index => uploadedFiles[index])

    if (selected.length === 0) {
      alert('Please select at least one reference to suggest.')
      return
    }

    if (!suggestedCourse) {
      alert('Please select a course.')
      return
    }

    const wf = getWorkflow(suggestedCourse)
    if (wf?.parallelReview?.library_director?.status === 'done') {
      alert('You have already approved the syllabus for this course. Suggesting references is no longer available.')
      return
    }

    const suggestions = JSON.parse(localStorage.getItem('library_suggestions') || '{}')
    if (!suggestions[suggestedCourse]) {
      suggestions[suggestedCourse] = []
    }

    suggestions[suggestedCourse].push(...selected.map(ref => ({
      ...ref,
      suggestedBy: 'SANTOS, MARIA',
      suggestedAt: new Date().toISOString()
    })))

    localStorage.setItem('library_suggestions', JSON.stringify(suggestions))
    alert(`Successfully suggested ${selected.length} reference(s) to ${suggestedCourse}`)
    
    setSelectedReferences({})
    setSuggestedCourse('')
    setShowSuggestionPanel(false)
  }

  return (
    <Skeleton
      header={<Header role="Director Of Libraries" name="SANTOS, MARIA" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={
        <div style={{ padding: 20, display: 'grid', gap: 16 }}>
          <ApprovalCoursesTable role="director-of-libraries" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div>
              <h2>Director of Libraries - Reference Library</h2>
              <p>Manage reference materials and suggest them to course syllabi.</p>
            </div>
            {uploadedFiles.length > 0 && (
              <button 
                onClick={() => setShowSuggestionPanel(!showSuggestionPanel)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'black',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Share2 size={16} />
                {showSuggestionPanel ? 'Close' : 'Suggest References'}
              </button>
            )}
          </div>

          {showSuggestionPanel && (
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0284c7',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Suggest References to Course</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Course:</label>
                <select 
                  value={suggestedCourse}
                  onChange={(e) => setSuggestedCourse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">-- Choose a course --</option>
                  {courses.map(course => (
                    <option key={course.code} value={course.code}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select References:</label>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '8px',
                      borderBottom: index < uploadedFiles.length - 1 ? '1px solid #eee' : 'none'
                    }}>
                      <input 
                        type="checkbox"
                        checked={selectedReferences[index] || false}
                        onChange={() => toggleReferenceSelection(index)}
                        style={{ marginRight: '10px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 4px 0', fontWeight: '500' }}>{file.name}</p>
                        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                          {file.type} • {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleSuggestReferences}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Send Suggestion
                </button>
                <button 
                  onClick={() => setShowSuggestionPanel(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#e5e7eb',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <RoleUploadPanel role={'director-of-libraries'} courseCode={undefined} uploadSlots={uploadSlots2} onUploadsChange={setUploads} />

          <div>
            <p className={uploadStyles.sectionLabel}>Reference Library</p>
            {uploadedFiles.length === 0 ? (
              <p className={uploadStyles.emptyState}>No references in library yet. Upload some to get started.</p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {uploadedFiles.map((file, index) => (
                  <div key={index} style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', wordBreak: 'break-word' }}>{file.name}</h4>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                      <p style={{ margin: '4px 0' }}><strong>Type:</strong> {file.type || 'FILE'}</p>
                      <p style={{ margin: '4px 0' }}><strong>Size:</strong> {formatBytes(file.size)}</p>
                      <p style={{ margin: '4px 0' }}><strong>Uploaded:</strong> {new Date(file.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}>
                        View
                      </button>
                      <button type="button" onClick={() => handleRemove(Object.keys(uploads)[index])} style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={uploadStyles.bottomActions}>
            <button type="button" className={uploadStyles.btnOutline}>Save as Draft</button>
            <button type="button" className={uploadStyles.btnPrimary} disabled={uploadedFiles.length === 0}>Submit for Review</button>
          </div>
        </div>
      }
    />
  );
};

export default DirectorOfLibraries;
