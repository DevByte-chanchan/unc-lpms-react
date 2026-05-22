import React, { useState, useEffect } from "react";
import SkeletonA from "../layouts/Skeleton.jsx";
import HeaderA from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import TextField from "../components/TextField.jsx";
import Dropdown from "../components/Dropdown.jsx";
import DropdownMultiSelect from "../components/DropdownMultiSelect.jsx";
import TypeableDropdown from "../components/TypeableDropdown";
import TextArea from "../components/TextArea.jsx";
import Duplicator from "../components/Duplicator.jsx";
import { X, CheckCircle } from "react-feather";
import SideNavigation from "../components/SideNavigation.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/* Inline modal component */
function InlineModal({ isOpen, title, onClose, children, actions }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3 id="modal-title">{title}</h3>
                    <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', padding: 6 }}>
                        <X size={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                {actions && <div className={styles.modalActions}>{actions}</div>}
            </div>
        </div>
    );
}

const TLAForm = () => {
    const navigate = useNavigate();
    const { iloId } = useParams();

    const FLIPPED_OPTIONS = ['Pre-class', 'In-class', 'Post-class'];
    const STANDARD_OPTIONS = ['Asynchronous', 'Synchronous'];

    const [isLoading, setIsLoading] = useState(true);
    const [flipped, setFlipped] = useState(false);
    const [availableTopics, setAvailableTopics] = useState([]);
    const [topicIdMap, setTopicIdMap] = useState({});
    const [assessmentSuggestions, setAssessmentSuggestions] = useState([]);
    const [errors, setErrors] = useState({});
    const [tlas, setTlas] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);

    // --- Data Normalization Helpers ---
    const normalizeClassPhase = (val) => {
        if (!val) return '';
        const v = val.toString().toLowerCase();
        if (v.includes('pre')) return 'Pre-class';
        if (v.includes('in')) return 'In-class';
        if (v.includes('post')) return 'Post-class';
        if (v.includes('async')) return 'Asynchronous';
        if (v.includes('sync')) return 'Synchronous';
        return val;
    };

    const mapDbToUi = (tla) => ({
        ...tla,
        performedBy: tla.performedBy === 'T' ? 'Instructor' : tla.performedBy === 'S' ? 'Student' : tla.performedBy,
        classPhase: normalizeClassPhase(tla.classPhase)
    });

    const mapUiToDb = (tla) => ({
        ...tla,
        performedBy: tla.performedBy === 'Instructor' ? 'T' : tla.performedBy === 'Student' ? 'S' : tla.performedBy
    });

    async function fetchJson(url, opts) {
        const res = await fetch(url, opts);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const message = text ? `HTTP ${res.status}: ${text}` : `HTTP ${res.status}`;
            const err = new Error(message);
            err.status = res.status;
            throw err;
        }
        return res.json();
    }

    // 1. Fetch Existing Data
    useEffect(() => {
        const fetchTlaData = async () => {
            try {
                const data = await fetchJson(`${API_BASE}/api/tlas/ilo/${iloId}`);
                const { availableTopics, topicIdMap, tlas: existingTlas, assessmentTypeSuggestions } = data;

                setAvailableTopics(availableTopics || []);
                setTopicIdMap(topicIdMap || {});
                setAssessmentSuggestions(assessmentTypeSuggestions || ['Case Study', 'Presentation', 'Exam', 'Report']);

                if (existingTlas && existingTlas.length > 0) {
                    const mappedTlas = existingTlas.map(mapDbToUi);
                    setTlas(mappedTlas);

                    const isFlipped = mappedTlas.some(t => FLIPPED_OPTIONS.includes(t.classPhase));
                    setFlipped(isFlipped);
                } else {
                    setTlas([{
                        id: Date.now(), selectedTopics: [], classPhase: '', performedBy: '',
                        tlaName: '', tlaDescription: '', laboratory: false,
                        assessmentType: '', assessmentDetail: ''
                    }]);
                }
            } catch (error) {
                console.error("Error fetching TLA data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        if (iloId) fetchTlaData();
    }, [iloId]);

    const getAvailableOptionsForTla = (currentTlaId) => {
        const selectedInOtherTlas = tlas
            .filter(t => t.id !== currentTlaId)
            .flatMap(t => t.selectedTopics);
        return availableTopics.filter(topic => !selectedInOtherTlas.includes(topic));
    };

    const goBackHandler = () => navigate(-1);

    const handleFlippedChange = (e) => {
        const isChecked = e.target.checked;
        setFlipped(isChecked);
        setTlas(prevTlas => prevTlas.map(tla => ({ ...tla, classPhase: '' })));
    };

    const handleTlaAdd = () => {
        setTlas([...tlas, {
            id: Date.now() + Math.random(), selectedTopics: [], classPhase: '', performedBy: '',
            tlaName: '', tlaDescription: '', laboratory: false, assessmentType: '', assessmentDetail: ''
        }]);
    };

    const handleTlaDelete = (idToDelete) => {
        if (tlas.length === 1) return;
        setTlas(tlas.filter((item) => item.id !== idToDelete));
    };

    const handleTlaChange = (id, field, value) => {
        setTlas(prevTlas => prevTlas.map(tla => tla.id === id ? { ...tla, [field]: value } : tla));
        const errorKey = `tla_${id}_${field}`;
        if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: null }));
    };

    const validateForm = () => {
        let newErrors = {};
        tlas.forEach((tla) => {
            if (!tla.selectedTopics || tla.selectedTopics.length === 0) newErrors[`tla_${tla.id}_selectedTopics`] = "Required";
            if (!tla.classPhase) newErrors[`tla_${tla.id}_classPhase`] = "Required";
            if (!tla.performedBy) newErrors[`tla_${tla.id}_performedBy`] = "Required";
            if (!tla.tlaName.trim()) newErrors[`tla_${tla.id}_tlaName`] = "TLA Name required";
            if (!tla.tlaDescription.trim()) newErrors[`tla_${tla.id}_tlaDescription`] = "Description required";
            if (!tla.assessmentType.trim()) newErrors[`tla_${tla.id}_assessmentType`] = "Required";
            // Now validating Assessment Detail
            if (!tla.assessmentDetail.trim()) newErrors[`tla_${tla.id}_assessmentDetail`] = "Detail required";
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveClick = async () => {
        if (!validateForm()) return;

        const payloadTlas = tlas.map(mapUiToDb);

        try {
            await fetchJson(`${API_BASE}/api/tlas/ilo/${iloId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tlas: payloadTlas,
                    topicIdMap
                })
            });
            setShowConfirm(true);
        } catch (error) {
            console.error("Error saving TLAs:", error);
            alert("Failed to save. Check console for details.");
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <SkeletonA
            header={<HeaderA role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation goBack={goBackHandler} onSave={handleSaveClick} />
                    <div className={styles['form-container']}>
                        <h2>Teaching & Learning Activities</h2>
                        <div className={'checkbox'} style={{ marginBottom: '20px' }}>
                            <input
                                checked={flipped}
                                onChange={handleFlippedChange}
                                type="checkbox"
                                id="flippedCheck"
                            />
                            <label htmlFor="flippedCheck" style={{ marginLeft: '8px' }}>Flipped Approach</label>
                        </div>

                        {tlas.map((item) => (
                            <div className={styles.list} key={item.id}>
                                <div className={styles.tlas}>
                                    <div className={styles.list}>
                                        <DropdownMultiSelect
                                            options={getAvailableOptionsForTla(item.id)}
                                            label={'Topic Title(s)'}
                                            value={item.selectedTopics}
                                            onChange={(val) => handleTlaChange(item.id, 'selectedTopics', val)}
                                            error={errors[`tla_${item.id}_selectedTopics`]}
                                        />
                                        <TextField
                                            label={'TLA Name'}
                                            value={item.tlaName}
                                            onChange={(val) => handleTlaChange(item.id, 'tlaName', val)}
                                            error={errors[`tla_${item.id}_tlaName`]}
                                            placeholder="e.g., Interactive Code Demo..."
                                        />
                                    </div>

                                    <div className={styles.list}>
                                        <Dropdown
                                            options={flipped ? FLIPPED_OPTIONS : STANDARD_OPTIONS}
                                            label={'Class Phase'}
                                            value={item.classPhase}
                                            onChange={(val) => handleTlaChange(item.id, 'classPhase', val)}
                                            error={errors[`tla_${item.id}_classPhase`]}
                                        />
                                        <Dropdown
                                            options={['Student', 'Instructor']}
                                            label={'Performed By'}
                                            value={item.performedBy}
                                            onChange={(val) => handleTlaChange(item.id, 'performedBy', val)}
                                            error={errors[`tla_${item.id}_performedBy`]}
                                        />
                                    </div>

                                    <TextArea
                                        label={'TLA Description'}
                                        value={item.tlaDescription}
                                        onChange={(val) => handleTlaChange(item.id, 'tlaDescription', val)}
                                        error={errors[`tla_${item.id}_tlaDescription`]}
                                        rows={4}
                                        placeholder="Describe the activity procedures and expected outputs..."
                                    />

                                    <div className={styles.list}>
                                        <TypeableDropdown
                                            options={assessmentSuggestions}
                                            label={'Assessment Type'}
                                            value={item.assessmentType}
                                            onChange={(val) => handleTlaChange(item.id, 'assessmentType', val)}
                                            error={errors[`tla_${item.id}_assessmentType`]}
                                        />
                                        <TextField
                                            label={'Assessment Detail'}
                                            value={item.assessmentDetail}
                                            onChange={(val) => handleTlaChange(item.id, 'assessmentDetail', val)}
                                            error={errors[`tla_${item.id}_assessmentDetail`]}
                                            placeholder="e.g., Usability Metrics and KPIs"
                                        />
                                    </div>
                                </div>

                                <div onClick={() => handleTlaDelete(item.id)} className={styles.deleteButton} style={{cursor: 'pointer'}}>
                                    <X size={20} color={'#FF5252'} />
                                </div>
                            </div>
                        ))}
                        <Duplicator onAdd={handleTlaAdd} name={'TLA'} />

                        {/* Confirmation modal */}
                        <InlineModal
                            isOpen={showConfirm}
                            title="Saved"
                            onClose={() => setShowConfirm(false)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <CheckCircle size={20} color="#2e7d32" />
                                <div>TLAs saved successfully.</div>
                            </div>
                        </InlineModal>
                    </div>
                </div>
            }
        />
    )
}

export default TLAForm;