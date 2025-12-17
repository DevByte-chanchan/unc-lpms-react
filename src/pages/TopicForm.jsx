import React, { useState } from "react";
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import TextField from "../components/TextField.jsx";
import DropdownA from "../components/DropdownA.jsx";
import { X, AlertCircle, CheckCircle } from "react-feather";
import Duplicator from "../components/Duplicator.jsx";
import TextArea from "../components/TextArea.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { getSyllabusByCode } from "../data/syllabiData.js";

const TopicForm = () => {
    const navigate = useNavigate();
    const { code, topicId } = useParams();

    const goBackHandler = () => {
        navigate(-1);
    };

    // --- CONSTANTS FOR OPTIONS ---
    const FLIPPED_OPTIONS = ['Pre-class', 'In-class', 'Post-class'];
    const STANDARD_OPTIONS = ['Asynchronous', 'Synchronous'];

    // 1. Get Data
    const syllabus = getSyllabusByCode(code);
    const topicData = syllabus?.topics.find(t => t.id === topicId) || {};

    // 2. Initialize State

    // Helper: Check if loaded data implies a Flipped state
    const isInitiallyFlipped = () => {
        if (topicData.tlas && topicData.tlas.length > 0) {
            // If any TLA has a value belonging to the Flipped list, we initialize as TRUE.
            return topicData.tlas.some(t => FLIPPED_OPTIONS.includes(t.classPhase));
        }
        return false;
    };

    const [flipped, setFlipped] = useState(isInitiallyFlipped);

    const [title, setTitle] = useState(topicData.title || '');

    const [subtopics, setSubtopics] = useState(
        topicData.subtopics || [{ id: '1', value: '' }]
    );

    const [tlas, setTlas] = useState(
        topicData.tlas || [{ id: '1', classPhase: '', performedBy: '', tlaName: '', tlaDescription: '', laboratory: false }]
    );

    // Error & Modal States
    const [errors, setErrors] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);


    // --- HANDLERS ---

    const handleTitleChange = (val) => {
        setTitle(val);
        if (errors.title) setErrors(prev => ({ ...prev, title: null }));
    };

    const handleSubtopicAdd = () => {
        const newSubtopic = { id: Date.now() + Math.random(), value: '' };
        setSubtopics([...subtopics, newSubtopic]);
    };

    const handleSubtopicDelete = (idToDelete) => {
        if (subtopics.length === 1) return;
        setSubtopics(subtopics.filter((item) => item.id !== idToDelete));
        const newErrors = { ...errors };
        delete newErrors[`subtopic_${idToDelete}`];
        setErrors(newErrors);
    };

    const handleSubtopicChange = (id, val) => {
        setSubtopics(prev => prev.map(item => item.id === id ? { ...item, value: val } : item));
        if (errors[`subtopic_${id}`]) {
            setErrors(prev => ({ ...prev, [`subtopic_${id}`]: null }));
        }
    };

    // --- UPDATED FLIPPED HANDLER ---
    const handleFlippedChange = (e) => {
        const isChecked = e.target.checked;
        setFlipped(isChecked);

        // Requirement: Clear all classPhase values when mode changes
        // This forces the user to select again from the new valid options
        setTlas(prevTlas => prevTlas.map(tla => ({
            ...tla,
            classPhase: ''
        })));
    };

    const handleTlaAdd = () => {
        const newTla = {
            id: Date.now() + Math.random(),
            classPhase: '',
            performedBy: '',
            tlaName: '',
            tlaDescription: '',
            laboratory: false
        };
        setTlas([...tlas, newTla]);
    };

    const handleTlaDelete = (idToDelete) => {
        if (tlas.length === 1) return;
        setTlas(tlas.filter((item) => item.id !== idToDelete));
        const newErrors = { ...errors };
        Object.keys(newErrors).forEach(key => {
            if (key.startsWith(`tla_${idToDelete}`)) delete newErrors[key];
        });
        setErrors(newErrors);
    };

    const handleTlaChange = (id, field, value) => {
        setTlas(prevTlas => prevTlas.map(tla =>
            tla.id === id ? { ...tla, [field]: value } : tla
        ));

        const errorKey = `tla_${id}_${field}`;
        if (errors[errorKey]) {
            setErrors(prev => ({ ...prev, [errorKey]: null }));
        }
    };

    // --- VALIDATION & SAVE ---
    const validateForm = () => {
        let newErrors = {};
        if (!title.trim()) newErrors.title = "Core Topic Title is required.";

        subtopics.forEach((sub) => {
            if (!sub.value.trim()) newErrors[`subtopic_${sub.id}`] = "Subtopic cannot be empty.";
        });

        tlas.forEach((tla) => {
            if (!tla.classPhase) newErrors[`tla_${tla.id}_classPhase`] = "Required";
            if (!tla.performedBy) newErrors[`tla_${tla.id}_performedBy`] = "Required";
            if (!tla.tlaName.trim()) newErrors[`tla_${tla.id}_tlaName`] = "TLA Name is required.";
            if (!tla.tlaDescription.trim()) newErrors[`tla_${tla.id}_tlaDescription`] = "Description is required.";
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveClick = () => {
        if (validateForm()) setShowConfirmModal(true);
        else setShowErrorModal(true);
    };

    const handleConfirmSave = () => {
        console.log("Saving Topic:", { title, subtopics, tlas, flipped });
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
                        <h2>Core Topic</h2>
                        <TextField
                            value={title}
                            onChange={handleTitleChange}
                            error={errors.title}
                            placeholder="Enter main topic title..."
                        />

                        <h2>Subtopic Lists</h2>
                        {subtopics.map((item) => (
                            <div className={styles['list']} key={item.id}>
                                <TextField
                                    value={item.value}
                                    onChange={(val) => handleSubtopicChange(item.id, val)}
                                    error={errors[`subtopic_${item.id}`]}
                                    placeholder="Enter subtopic..."
                                />
                                <div onClick={() => handleSubtopicDelete(item.id)} className={'x'}>
                                    <X size={20} color={'white'} />
                                </div>
                            </div>
                        ))}
                        <Duplicator onAdd={handleSubtopicAdd} name={'Subtopic'} />

                        <h2>Teaching & Learning Activities</h2>

                        <div className={'checkbox'}>
                            <input
                                checked={flipped}
                                onChange={handleFlippedChange}
                                type="checkbox"
                                id="flippedCheck"
                            />
                            <label htmlFor="flippedCheck" style={{marginLeft: '8px'}}>Flipped Approach</label>
                        </div>

                        {tlas.map((item) => (
                            <div className={styles.list} key={item.id}>
                                <div className={styles.tlas}>
                                    <div className={styles.list}>
                                        <DropdownA
                                            // Conditional Options:
                                            // If Flipped = TRUE -> Pre/In/Post
                                            // If Flipped = FALSE -> Async/Sync
                                            options={flipped ? FLIPPED_OPTIONS : STANDARD_OPTIONS}
                                            label={'Class Phase'}
                                            value={item.classPhase}
                                            onChange={(val) => handleTlaChange(item.id, 'classPhase', val)}
                                            error={errors[`tla_${item.id}_classPhase`]}
                                        />
                                        <DropdownA
                                            options={['Student', 'Instructor']}
                                            label={'Performed By'}
                                            value={item.performedBy}
                                            onChange={(val) => handleTlaChange(item.id, 'performedBy', val)}
                                            error={errors[`tla_${item.id}_performedBy`]}
                                        />
                                    </div>

                                    <TextField
                                        label={'TLA Name'}
                                        value={item.tlaName}
                                        onChange={(val) => handleTlaChange(item.id, 'tlaName', val)}
                                        error={errors[`tla_${item.id}_tlaName`]}
                                        placeholder="e.g., Lecture, Group Activity..."
                                    />

                                    <TextArea
                                        label={'Text Description'}
                                        value={item.tlaDescription}
                                        onChange={(val) => handleTlaChange(item.id, 'tlaDescription', val)}
                                        error={errors[`tla_${item.id}_tlaDescription`]}
                                        rows={4}
                                    />

                                    <div className={'checkbox'}>
                                        <input
                                            type="checkbox"
                                            checked={item.laboratory === true}
                                            onChange={(e) => handleTlaChange(item.id, 'laboratory', e.target.checked)}
                                        /> Laboratory
                                    </div>
                                </div>

                                <div onClick={() => handleTlaDelete(item.id)} className={'x'}>
                                    <X size={20} color={'white'} />
                                </div>
                            </div>
                        ))}

                        <Duplicator onAdd={handleTlaAdd} name={'TLA'} />
                    </div>

                    {/* MODALS */}
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

                    {showErrorModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader} style={{ borderBottomColor: '#FF5252' }}>
                                    <h3 style={{ color: '#FF5252' }}>Validation Error</h3>
                                    <X size={24} className={styles.closeIcon} onClick={() => setShowErrorModal(false)} />
                                </div>
                                <div className={styles.modalBody}>
                                    <AlertCircle size={40} color="#FF5252" style={{ marginBottom: '1rem' }} />
                                    <p>Please fix the highlighted issues before saving.</p>
                                    <ul className={styles.errorList} style={{maxHeight: '150px', overflowY: 'auto'}}>
                                        {Object.entries(errors).map(([key, err], idx) => (
                                            <li key={idx}>
                                                {key.includes('subtopic') ? `Subtopic: ${err}` : key.includes('tla') ? `Activity: ${err}` : `Topic: ${err}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={styles.modalActions}>
                                    <button className={styles.confirmBtn} style={{ backgroundColor: '#FF5252' }} onClick={() => setShowErrorModal(false)}>Okay</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            }
        />
    )
}

export default TopicForm;