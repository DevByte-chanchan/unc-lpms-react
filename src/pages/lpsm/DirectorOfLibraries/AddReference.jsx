import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import TextField from '../../../components/TextField.jsx';
import DropdownA from '../../../components/DropdownA.jsx';
import styles from '../../../styles/Form.module.sass';
import navStyles from '../../../styles/FormNavigation.module.sass';
import { getRoleName } from '../../../utils/roleIdentities.js';
import { addReference, updateReference, getReferenceById, getReferences, setReferences, getReferenceComments, addReferenceComment } from '../../../utils/referenceLibrary.js';

const ReferenceTypes = ['Textbook', 'Online Resources', 'Open Educational Resources'];

const ALL_DEPARTMENTS = [
  'School of Computing and Information Sciences',
  'College of Business and Accountancy',
  'College of Education and Arts & Sciences',
  'College of Nursing and Allied Health Sciences',
  'College of Engineering and Architecture',
  'General Education Department',
];

const AddReference = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const existingRef = isEditMode ? getReferenceById(id) : null;

  const [formData, setFormData] = useState({
    type: existingRef?.type || '',
    title: existingRef?.title || '',
    authors: existingRef?.authors || '',
    isbn: existingRef?.isbn || '',
    year: existingRef?.year ? existingRef.year.toString() : '',
    link: existingRef?.link || '',
    departments: existingRef?.departments || [],

    usedInCourses: existingRef?.usedInCourses || [],
  });

  const [courseInput, setCourseInput] = useState('');
  const [errors, setErrors] = useState({});
  const [editComments, setEditComments] = useState([]);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    if (isEditMode && id) {
      setEditComments(getReferenceComments(id));
    }
  }, [id, isEditMode]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const toggleDepartment = (dept) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const addCourse = () => {
    const code = courseInput.trim().toUpperCase();
    if (code && !formData.usedInCourses.includes(code)) {
      setFormData(prev => ({ ...prev, usedInCourses: [...prev.usedInCourses, code] }));
      setCourseInput('');
    }
  };

  const removeCourse = (code) => {
    setFormData(prev => ({ ...prev, usedInCourses: prev.usedInCourses.filter(c => c !== code) }));
  };

  const goBackHandler = () => navigate(-1);

  const validateForm = () => {
    let newErrors = {};
    if (!formData.type) newErrors.type = 'Please select a reference type.';
    if (!formData.title.trim()) newErrors.title = 'Reference Title is required.';
    if (!formData.authors.trim()) newErrors.authors = 'Author(s) is required.';

    if (formData.type === 'Textbook') {
      if (!formData.isbn.trim()) {
        newErrors.isbn = 'ISBN is required for Textbooks.';
      } else if (!/^[0-9-X\s]+$/i.test(formData.isbn)) {
        newErrors.isbn = 'ISBN contains invalid characters.';
      }
    }

    if (['Textbook', 'Open Educational Resources'].includes(formData.type)) {
      if (!formData.year.trim()) {
        newErrors.year = 'Publication Year is required.';
      } else if (!/^\d{4}$/.test(formData.year)) {
        newErrors.year = 'Year must be a 4-digit number (e.g., 2023).';
      }
    }

    if (['Online Resources', 'Open Educational Resources'].includes(formData.type)) {
      if (!formData.link.trim()) {
        newErrors.link = 'Link URL is required.';
      } else {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(formData.link)) {
          newErrors.link = 'Please enter a valid URL (e.g., https://example.com).';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveClick = () => {
    if (validateForm()) {
      const refData = {
        id: isEditMode ? id : `${formData.type === 'Textbook' ? 'TB' : formData.type === 'Online Resources' ? 'OR' : 'OE'}${Date.now()}`,
        title: formData.title,
        authors: formData.authors,
        type: formData.type,
        year: formData.year ? parseInt(formData.year) : '',
        isbn: formData.isbn || '',
        link: formData.link || '',
        publisher: '',
        filename: '',
        uploadDate: new Date().toISOString().split('T')[0],
        hasIssue: existingRef?.hasIssue || false,
        archived: existingRef?.archived || false,
        departments: formData.departments,
        usedInCourses: formData.usedInCourses,
      };

      if (isEditMode) {
        updateReference(id, refData);
      } else {
        addReference(refData);
      }

      alert(isEditMode ? 'Reference updated successfully!' : 'Reference added successfully!');
      navigate('/role/director-of-libraries/reference-library');
    }
  };

  const content = (
    <div className={styles.container}>
      <div className={navStyles.navi}>
        <div onClick={goBackHandler} className={navStyles.return}>
          <ChevronLeft />
        </div>
        <div className={'fill'}></div>
        <div
          className={navStyles.save}
          onClick={handleSaveClick}
          style={{ cursor: 'pointer' }}
        >
          Save
        </div>
      </div>

      <div className={styles['form-container']}>
        <h2>Reference Details</h2>

        <DropdownA
          options={ReferenceTypes}
          label={'Reference Type'}
          value={formData.type}
          initialValue={formData.type}
          onChange={(val) => handleChange('type', val)}
          error={errors.type}
        />

        <TextField
          label={'Reference Title'}
          value={formData.title}
          onChange={(val) => handleChange('title', val)}
          error={errors.title}
        />

        <TextField
          label={'Author(s)'}
          value={formData.authors}
          onChange={(val) => handleChange('authors', val)}
          error={errors.authors}
        />

        {formData.type === 'Textbook' && (
          <TextField
            label={'ISBN'}
            value={formData.isbn}
            onChange={(val) => handleChange('isbn', val)}
            error={errors.isbn}
          />
        )}

        {(formData.type === 'Textbook' || formData.type === 'Open Educational Resources') && (
          <TextField
            label={'Publication Year'}
            value={formData.year}
            onChange={(val) => handleChange('year', val)}
            error={errors.year}
            placeholder="YYYY"
          />
        )}

        {(formData.type === 'Online Resources' || formData.type === 'Open Educational Resources') && (
          <TextField
            label={'Link'}
            value={formData.link}
            onChange={(val) => handleChange('link', val)}
            error={errors.link}
            placeholder="https://..."
          />
        )}

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Department</label>
          <div className={styles.checkboxGroup}>
            {ALL_DEPARTMENTS.map(dept => (
              <label key={dept} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.departments.includes(dept)}
                  onChange={() => toggleDepartment(dept)}
                />
                {dept}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Used in Course(s)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCourse(); } }}
              placeholder="e.g., BSCS313L"
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: 'none' }}
            />
            <button onClick={addCourse} style={{ padding: '8px 16px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Add</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {formData.usedInCourses.map(code => (
              <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#fef3c7', color: '#b45309', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
                {code}
                <button onClick={() => removeCourse(code)} style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>&times;</button>
              </span>
            ))}
          </div>
        </div>

        {isEditMode && (
          <div style={{ marginTop: 24, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>Comments</h4>
            {editComments.length === 0 ? (
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#9ca3af' }}>No comments yet.</p>
            ) : (
              <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editComments.map(c => (
                  <div key={c.id} style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 13, color: '#111827', marginBottom: 4 }}>{c.text}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.author} &middot; {new Date(c.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={editCommentText} onChange={e => setEditCommentText(e.target.value)} placeholder="Write a comment..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: 'none' }} />
              <button onClick={() => {
                if (!editCommentText.trim()) return;
                addReferenceComment(id, editCommentText.trim(), getRoleName('director-of-libraries'));
                setEditComments(getReferenceComments(id));
                setEditCommentText('');
              }} style={{ padding: '8px 16px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Post</button>
            </div>
          </div>
        )}
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

export default AddReference;
