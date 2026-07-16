import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Trash2 } from 'react-feather';
import SkeletonA from '../../layouts/SkeletonA.jsx';
import HeaderA from '../../components/HeaderA.jsx';
import SideNavigation from '../../components/SideNavigation.jsx';

const directorSyllabi = [
  { id: '201', courseCode: 'CS 201', courseName: 'Data Structures' }
];

const documentDefinitions = [
  {
    key: 'references',
    title: 'References',
    description: 'Upload the list of references and academic sources required for this course.'
  },
  {
    key: 'resources',
    title: 'Library Resources',
    description: 'Upload information about available library resources, databases, and learning materials for this course.'
  }
];

const DirectorUpload = () => {
  const { syllabusId } = useParams();
  const syllabus = directorSyllabi.find((item) => item.id === syllabusId);
  const [uploadedDocs, setUploadedDocs] = useState({ references: false, resources: true });

  const uploadedCount = useMemo(
    () => Object.values(uploadedDocs).filter(Boolean).length,
    [uploadedDocs]
  );

  const progress = Math.round((uploadedCount / 2) * 100);

  const handleToggle = (key) => {
    setUploadedDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!syllabus) {
    const errorContent = (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#6b7280' }}>Learning Plan not found.</p>
      </div>
    );

    return (
      <SkeletonA
        header={<HeaderA role="Director of Libraries" name="SANTOS, MARIA" />}
        nav={<SideNavigation mode="director-of-libraries" />}
        content={errorContent}
      />
    );
  }

  const content = (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '18px', color: '#6b7280', fontSize: '0.95rem' }}>
        Dashboard / Document Management / {syllabus.courseCode} - {syllabus.courseName} / Upload Resources
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '0.95rem' }}>Document Uploads</p>
        <h1 style={{ margin: 0, fontSize: '2.4rem' }}>Document Uploads</h1>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '24px', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Course Name</p>
          <strong>{syllabus.courseCode} - {syllabus.courseName}</strong>
        </div>
        <div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Librarian</p>
          <strong>Head Librarian</strong>
        </div>
        <div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Status</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.8rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, background: '#e5e7eb', color: '#374151' }}>Active</span>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p>{uploadedCount}/2 resources uploaded</p>
          <strong>{progress}% complete</strong>
        </div>
        <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1e3a5f', borderRadius: '9999px', width: `${progress}%` }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        {documentDefinitions.map((doc) => {
          const filled = Boolean(uploadedDocs[doc.key]);
          return (
            <div key={doc.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '240px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '1rem' }}>{doc.title}</h2>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.8rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, background: filled ? '#d1fae5' : '#fef3c7', color: filled ? '#065f46' : '#92400e' }}>
                  {filled ? 'Uploaded' : 'Pending'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{doc.description}</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: 'auto' }}>
                <button onClick={() => handleToggle(doc.key)} style={{ border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: 14, background: 'black', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {filled ? 'Replace' : 'Upload'} <Upload size={16} />
                </button>
                {filled && (
                  <button onClick={() => handleToggle(doc.key)} style={{ border: '1px solid #d1d5db', borderRadius: '14px', padding: '12px 18px', background: '#fff', color: '#1f2937', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Remove <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role="Director of Libraries" name="SANTOS, MARIA" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={content}
    />
  );
};

export default DirectorUpload;
