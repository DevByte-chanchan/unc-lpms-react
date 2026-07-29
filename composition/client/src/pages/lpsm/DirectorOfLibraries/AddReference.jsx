import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import TextField from '../../../components/TextField.jsx';
import DropdownA from '../../../components/DropdownA.jsx';
import styles from '../../../styles/Form.module.sass';
import navStyles from '../../../styles/FormNavigation.module.sass';
import { addReference, updateReference, getReferenceById } from '../../../utils/referenceLibrary.js';

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
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }
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
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
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
        title: formData.title,
        authors: formData.authors,
        type: formData.type,
        year: formData.year ? parseInt(formData.year) : '',
        isbn: formData.isbn || '',
        link: formData.link || '',
        publisher: existingRef?.publisher || '',
        filename: existingRef?.filename || '',
        uploadDate: existingRef?.uploadDate || new Date().toISOString().split('T')[0],
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

      showToast(isEditMode ? 'Reference updated successfully!' : 'Reference added successfully!');
      setTimeout(() => navigate('/role/director-of-libraries/reference-library'), 1200);
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
          <div className={styles.checkboxGroup} style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 8 }}>
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




      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#047857', color: '#fff',
          padding: '14px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500,
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)', fontFamily: "'Poppins', sans-serif",
        }}>
          <CheckCircle size={20} />
          {toast.msg}
        </div>
      )}
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
