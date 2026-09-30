import React, { useState, useEffect } from 'react';
import { X, Maximize, Minimize2 } from 'react-feather';
import TextField from './TextField.jsx';
import AutoCorrectButton from './AutoCorrectButton.jsx';
import DropdownA from './DropdownA.jsx';
import DropdownMultiSelect from './DropdownMultiSelect.jsx';
import { addReference, updateReference } from '../utils/referenceLibrary.js';
import styles from '../styles/AddReferenceModal.module.sass';

const ReferenceTypes = ['Textbook', 'Online Resources', 'Open Educational Resources'];

const ALL_DEPARTMENTS = [
  'School of Computing and Information Sciences',
  'College of Business and Accountancy',
  'College of Education and Arts & Sciences',
  'College of Nursing and Allied Health Sciences',
  'College of Engineering and Architecture',
  'General Education Department',
];

const AddReferenceModal = ({ show, onClose, refToEdit = null, onSaved, onError }) => {
  const isEditMode = !!refToEdit;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [formData, setFormData] = useState({
    type: refToEdit?.type || '',
    title: refToEdit?.title || '',
    authors: refToEdit?.authors || '',
    isbn: refToEdit?.isbn || '',
    year: refToEdit?.year ? refToEdit.year.toString() : '',
    link: refToEdit?.link || '',
    departments: refToEdit?.departments || [],
    usedInCourses: refToEdit?.usedInCourses || [],
  });

  const [errors, setErrors] = useState({});

  // Re-populate the form whenever the modal opens or the target reference
  // changes — the useState initializer only runs once, so without this the
  // Edit dialog opened blank (like the Add form).
  useEffect(() => {
    if (!show) return;
    setFormData({
      type: refToEdit?.type || '',
      title: refToEdit?.title || '',
      authors: refToEdit?.authors || '',
      isbn: refToEdit?.isbn || '',
      year: refToEdit?.year ? refToEdit.year.toString() : '',
      link: refToEdit?.link || '',
      departments: refToEdit?.departments ? [...refToEdit.departments] : [],
      usedInCourses: refToEdit?.usedInCourses ? [...refToEdit.usedInCourses] : [],
    });
    setErrors({});
  }, [show, refToEdit]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (isFullscreen) setIsFullscreen(false);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, isFullscreen, onClose]);

  if (!show) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.type) newErrors.type = 'Please select a reference type.';
    if (!formData.title.trim()) newErrors.title = 'Reference Title is required.';
    if (!formData.authors.trim()) newErrors.authors = 'Author(s) is required.';

    if (formData.type === 'Textbook') {
      if (!formData.isbn.trim()) newErrors.isbn = 'ISBN is required for Textbooks.';
      else if (!/^[0-9-X\s]+$/i.test(formData.isbn)) newErrors.isbn = 'ISBN contains invalid characters.';
    }

    if (['Textbook', 'Open Educational Resources'].includes(formData.type)) {
      if (!formData.year.trim()) newErrors.year = 'Publication Year is required.';
      else if (!/^\d{4}$/.test(formData.year)) newErrors.year = 'Year must be a 4-digit number (e.g., 2023).';
    }

    if (['Online Resources', 'Open Educational Resources'].includes(formData.type)) {
      if (!formData.link.trim()) newErrors.link = 'Link URL is required.';
      else {
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (!urlPattern.test(formData.link)) newErrors.link = 'Please enter a valid URL (e.g., https://example.com).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    const valid = validateForm();
    if (!valid) {
      onError?.({ message: 'Please fix the errors in the form before saving.', type: 'error' });
      return;
    }

    const refData = {
      title: formData.title,
      authors: formData.authors,
      type: formData.type,
      year: formData.year ? parseInt(formData.year) : '',
      isbn: formData.isbn || '',
      link: formData.link || '',
      publisher: refToEdit?.publisher || '',
      filename: refToEdit?.filename || '',
      uploadDate: refToEdit?.uploadDate || new Date().toISOString().split('T')[0],
      hasIssue: refToEdit?.hasIssue || false,
      archived: refToEdit?.archived || false,
      departments: formData.departments,
      usedInCourses: formData.usedInCourses,
    };

    if (isEditMode) updateReference(refToEdit.id, refData);
    else addReference(refData);

    onSaved?.({ message: isEditMode ? 'Reference updated successfully!' : 'Reference added successfully!', type: 'success' });
    onClose();
  };

  const toggleFullscreen = () => setIsFullscreen(f => !f);

  const headerBtn = {
    width: 32, height: 32, borderRadius: 7, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 0,
  };

  return (
    <>
      {!isFullscreen && (
        <div onClick={onClose} className={styles.backdrop} />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-dialog-title"
        className={`${styles.modal} ${isFullscreen ? styles.fullscreen : ''}`}
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="reference-dialog-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
            {isEditMode ? 'Edit Reference' : 'Reference Details'}
          </h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={{ ...headerBtn, background: '#fff', border: '1px solid #d1d5db' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
              {isFullscreen ? <Minimize2 size={16} color="#6b7280" /> : <Maximize size={16} color="#6b7280" />}
            </button>
            <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <DropdownA options={ReferenceTypes} label="Reference Type" value={formData.type}
            initialValue={formData.type} onChange={val => handleChange('type', val)} error={errors.type} style={{ padding: 0 }} />
          <div style={{ height: 16 }} />
          <TextField label="Reference Title" value={formData.title} onChange={val => handleChange('title', val)} error={errors.title} style={{ padding: 0 }} />
          <AutoCorrectButton value={formData.title} onChange={next => handleChange('title', next)} label="Check title" compact />
          <div style={{ height: 16 }} />
          <TextField label="Author(s)" value={formData.authors} onChange={val => handleChange('authors', val)} error={errors.authors} style={{ padding: 0 }} />
          <AutoCorrectButton value={formData.authors} onChange={next => handleChange('authors', next)} label="Check author names" compact />
          <div style={{ height: 16 }} />
          {formData.type === 'Textbook' && (<><TextField label="ISBN" value={formData.isbn} onChange={val => handleChange('isbn', val)} error={errors.isbn} style={{ padding: 0 }} /><div style={{ height: 16 }} /></>)}
          {(formData.type === 'Textbook' || formData.type === 'Open Educational Resources') && (<><TextField label="Publication Year" value={formData.year} onChange={val => handleChange('year', val)} error={errors.year} placeholder="YYYY" style={{ padding: 0 }} /><div style={{ height: 16 }} /></>)}
          {(formData.type === 'Online Resources' || formData.type === 'Open Educational Resources') && (<><TextField label="Link" value={formData.link} onChange={val => handleChange('link', val)} error={errors.link} placeholder="https://..." style={{ padding: 0 }} /><div style={{ height: 16 }} /></>)}
          <DropdownMultiSelect label="Department" options={ALL_DEPARTMENTS} value={formData.departments}
            onChange={val => handleChange('departments', val)} style={{ padding: 0 }} />
        </div>

        <div className={styles.actions}>
          <button onClick={onClose} style={{ padding: '10px 24px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '10px 24px', border: 'none', borderRadius: 10, background: '#1f2937', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>{isEditMode ? 'Update' : 'Save'}</button>
        </div>
      </div>
    </>
  );
};

export default AddReferenceModal;
