import React, { useState } from 'react';
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import TextField from "../components/TextField.jsx";
import DropdownA from "../components/DropdownA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { getSyllabusByCode } from "../data/syllabiData.js";
import { X, AlertCircle, CheckCircle } from 'react-feather';

const ReferenceForm = () => {
    const navigate = useNavigate();
    const { code, refId } = useParams();

    // 1. Get Data
    const syllabus = getSyllabusByCode(code);
    const referenceData = syllabus?.references.find(r => r.id === refId) || {};

    const ReferenceTypes = ['Textbook', 'Online Resources', 'Open Educational Resources'];

    // 2. Form State
    const [formData, setFormData] = useState({
        // FIX: Ensure type defaults to empty string if undefined
        type: referenceData.type || '',
        title: referenceData.title || '',
        authors: referenceData.authors || '',
        isbn: referenceData.isbn || '',
        year: referenceData.year ? referenceData.year.toString() : '',
        link: referenceData.link || ''
    });

    // 3. Error State
    const [errors, setErrors] = useState({});

    // 4. Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    // --- HANDLERS ---

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error immediately when user selects a value
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const goBackHandler = () => navigate(-1);

    // --- VALIDATION LOGIC ---

    const validateForm = () => {
        let newErrors = {};

        // FIX: Added Validation for Dropdown (Reference Type)
        // Without this, the 'error' prop is never sent to the Dropdown
        if (!formData.type) {
            newErrors.type = "Please select a reference type.";
        }

        // Rule 1: Title & Authors are always required
        if (!formData.title.trim()) newErrors.title = "Reference Title is required.";
        if (!formData.authors.trim()) newErrors.authors = "Author(s) is required.";

        // Rule 2: ISBN required for Textbooks
        if (formData.type === 'Textbook') {
            if (!formData.isbn.trim()) {
                newErrors.isbn = "ISBN is required for Textbooks.";
            }
            else if (!/^[0-9-X\s]+$/i.test(formData.isbn)) {
                newErrors.isbn = "ISBN contains invalid characters.";
            }
        }

        // Rule 3: Year required for Textbooks & OER
        if (['Textbook', 'Open Educational Resources'].includes(formData.type)) {
            if (!formData.year.trim()) {
                newErrors.year = "Publication Year is required.";
            } else if (!/^\d{4}$/.test(formData.year)) {
                newErrors.year = "Year must be a 4-digit number (e.g., 2023).";
            }
        }

        // Rule 4: Link required for Online & OER
        if (['Online Resources', 'Open Educational Resources'].includes(formData.type)) {
            if (!formData.link.trim()) {
                newErrors.link = "Link URL is required.";
            } else {
                const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
                if (!urlPattern.test(formData.link)) {
                    newErrors.link = "Please enter a valid URL (e.g., https://example.com).";
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveClick = () => {
        if (validateForm()) {
            setShowConfirmModal(true);
        } else {
            setShowErrorModal(true);
        }
    };

    const handleConfirmSave = () => {
        console.log("Saving data:", formData);
        setShowConfirmModal(false);
        navigate(-1);
    };

    return(
        <SkeletonA
            header={<HeaderA role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation/> }
            content={
                <div className={styles.container}>

                    {/* UPDATED: Pass the save handler to the navigation bar */}
                    <FormNavigation
                        goBack={goBackHandler}
                        onSave={handleSaveClick}
                    />

                    <div className={styles['form-container']}>
                        <h2>Reference Details</h2>

                        <DropdownA
                            options={ReferenceTypes}
                            label={'Reference Type'}
                            // Use 'value' to control the component since formData is state
                            value={formData.type}
                            initialValue={formData.type}
                            onChange={(val) => handleChange('type', val)}
                            // This ensures the red border appears when validation fails
                            error={errors.type}
                        />

                        {/* --- ALWAYS VISIBLE FIELDS --- */}
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

                        {/* --- CONDITIONAL FIELDS --- */}
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
                    </div>

                    {/* --- POPUPS / MODALS --- */}

                    {/* CONFIRMATION */}
                    {showConfirmModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader}>
                                    <h3>Confirm Save</h3>
                                </div>
                                <div className={styles.modalBody}>
                                    <CheckCircle size={40} color="#4CAF50" style={{marginBottom: '1rem'}}/>
                                    <p>Are you sure you want to save these changes?</p>
                                </div>
                                <div className={styles.modalActions}>
                                    <button className={styles.cancelBtn} onClick={() => setShowConfirmModal(false)}>No, Cancel</button>
                                    <button className={styles.confirmBtn} onClick={handleConfirmSave}>Yes, Save</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ERROR */}
                    {showErrorModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader} style={{borderBottomColor: '#FF5252'}}>
                                    <h3 style={{color: '#FF5252'}}>Validation Error</h3>
                                    <X
                                        size={24}
                                        className={styles.closeIcon}
                                        onClick={() => setShowErrorModal(false)}
                                    />
                                </div>
                                <div className={styles.modalBody}>
                                    <AlertCircle size={40} color="#FF5252" style={{marginBottom: '1rem'}}/>
                                    <p>Please fix the following issues before saving:</p>
                                    <ul className={styles.errorList}>
                                        {Object.values(errors).map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={styles.modalActions}>
                                    <button className={styles.confirmBtn} style={{backgroundColor: '#FF5252'}} onClick={() => setShowErrorModal(false)}>
                                        Okay, I'll fix it
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            }
        />
    )
}

export default ReferenceForm;