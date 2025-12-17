import React, { useState } from "react";
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import TextField from "../components/TextField.jsx"; // Not used in this form specifically but good to keep
import DropdownA from "../components/DropdownA.jsx";
import TextArea from "../components/TextArea.jsx";
import MultiSelectA from "../components/MultiSelectA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { getSyllabusByCode } from "../data/syllabiData";
import { X, AlertCircle, CheckCircle } from "react-feather"; // Import Icons

const ILOForm = () => {
    const navigate = useNavigate();
    const { code, iloId } = useParams();

    const goBackHandler = () => {
        navigate(-1);
    };

    // 1. Get Data
    const syllabus = getSyllabusByCode(code);
    const iloData = syllabus?.ilos.find(i => i.id === iloId) || {};

    const weeks = () => Array.from({ length: 18 }, (_, i) => `Week ${i + 1}`);

    const availableTopics = syllabus?.topics
        ? syllabus.topics.map(t => t.title)
        : [];

    const availableReferences = syllabus?.references
        ? syllabus.references.map(r => `${r.id} - ${r.title}`)
        : [];

    // 2. Initialize State
    // Note: courseOutcome is read-only usually, but we keep it in state for consistency
    const [courseOutcome] = useState(iloData.courseOutcome || '');
    const [intendedLearningOutcome, setIntendedLearningOutcome] = useState(iloData.intendedLearningOutcome || '');
    const [deliveryWeek, setDeliveryWeek] = useState(iloData.deliveryWeek || '');
    const [allocatedTime, setAllocatedTime] = useState(iloData.allocatedTime || '');
    const [selectedTopics, setSelectedTopics] = useState(iloData.topics || []);
    const [selectedReferences, setSelectedReferences] = useState(iloData.references || []);

    // Error State
    const [errors, setErrors] = useState({});

    // Modal States
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    // --- HANDLERS ---

    const handleTextChange = (setter, field, val) => {
        setter(val);
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const handleMultiSelectChange = (setter, field, newVal) => {
        setter(newVal);
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    // --- VALIDATION ---

    const validateForm = () => {
        let newErrors = {};

        // 1. Validate ILO Text
        if (!intendedLearningOutcome.trim()) {
            newErrors.intendedLearningOutcome = "Intended Learning Outcome is required.";
        } else if (intendedLearningOutcome.length < 10) {
            newErrors.intendedLearningOutcome = "Description is too short.";
        }

        // 2. Validate Dropdowns
        if (!deliveryWeek) newErrors.deliveryWeek = "Delivery Week is required.";
        if (!allocatedTime) newErrors.allocatedTime = "Allocated Time is required.";

        // 3. Validate MultiSelects (Must have at least 1 selected)
        if (selectedTopics.length === 0) {
            newErrors.topics = "Please select at least one topic.";
        }

        if (selectedReferences.length === 0) {
            newErrors.references = "Please select at least one reference.";
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
        console.log("Saving ILO Data:", {
            courseOutcome,
            intendedLearningOutcome,
            deliveryWeek,
            allocatedTime,
            topics: selectedTopics,
            references: selectedReferences
        });
        setShowConfirmModal(false);
        navigate(-1);
    };

    return (
        <SkeletonA
            header={<HeaderA role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation goBack={goBackHandler} onSave={handleSaveClick} />

                    <div className={styles['form-container']}>
                        <h2>ILO & Course Outcome Alignment</h2>

                        <TextArea
                            disabled={true}
                            label={'Course Outcome'}
                            value={courseOutcome}
                            // No error needed here as it's disabled
                        />

                        <TextArea
                            label={'Intended Learning Outcome'}
                            value={intendedLearningOutcome}
                            onChange={(val) => handleTextChange(setIntendedLearningOutcome, 'intendedLearningOutcome', val)}
                            error={errors.intendedLearningOutcome}
                            rows={4}
                        />

                        <div className={styles.list}>
                            <DropdownA
                                label={'Delivery Week'}
                                options={weeks()}
                                value={deliveryWeek}
                                onChange={(val) => handleTextChange(setDeliveryWeek, 'deliveryWeek', val)}
                                error={errors.deliveryWeek}
                            />
                            <DropdownA
                                label={'Allocated Time'}
                                options={['1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours', '3.5 hours', '4 hours']}
                                value={allocatedTime}
                                onChange={(val) => handleTextChange(setAllocatedTime, 'allocatedTime', val)}
                                error={errors.allocatedTime}
                            />
                        </div>

                        <h2>Topics</h2>
                        <MultiSelectA
                            label={'Name(s)'}
                            options={availableTopics}
                            value={selectedTopics}
                            onChange={(val) => handleMultiSelectChange(setSelectedTopics, 'topics', val)}
                            error={errors.topics}
                        />

                        <h2>References</h2>
                        <MultiSelectA
                            label={'Title(s)'}
                            options={availableReferences}
                            value={selectedReferences}
                            onChange={(val) => handleMultiSelectChange(setSelectedReferences, 'references', val)}
                            error={errors.references}
                        />

                    </div>

                    {/* --- POPUPS / MODALS --- */}

                    {/* 1. CONFIRMATION POPUP */}
                    {showConfirmModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader}>
                                    <h3>Confirm Save</h3>
                                </div>
                                <div className={styles.modalBody}>
                                    <CheckCircle size={40} color="#4CAF50" style={{ marginBottom: '1rem' }} />
                                    <p>Are you sure you want to save these changes?</p>
                                </div>
                                <div className={styles.modalActions}>
                                    <button className={styles.cancelBtn} onClick={() => setShowConfirmModal(false)}>No, Cancel</button>
                                    <button className={styles.confirmBtn} onClick={handleConfirmSave}>Yes, Save</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. ERROR POPUP */}
                    {showErrorModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader} style={{ borderBottomColor: '#FF5252' }}>
                                    <h3 style={{ color: '#FF5252' }}>Validation Error</h3>
                                    <X
                                        size={24}
                                        className={styles.closeIcon}
                                        onClick={() => setShowErrorModal(false)}
                                    />
                                </div>
                                <div className={styles.modalBody}>
                                    <AlertCircle size={40} color="#FF5252" style={{ marginBottom: '1rem' }} />
                                    <p>Please fix the highlighted issues before saving.</p>

                                    <ul className={styles.errorList}>
                                        {Object.entries(errors).map(([key, err], idx) => (
                                            <li key={idx}>
                                                {/* Formatting the key to look nicer */}
                                                {key === 'intendedLearningOutcome' ? 'ILO Description' :
                                                    key.charAt(0).toUpperCase() + key.slice(1)}: {err}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={styles.modalActions}>
                                    <button className={styles.confirmBtn} style={{ backgroundColor: '#FF5252' }} onClick={() => setShowErrorModal(false)}>
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

export default ILOForm;