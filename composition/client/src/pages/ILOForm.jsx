import React, { useEffect, useState } from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import TextArea from "../components/TextArea.jsx";
import TextField from "../components/TextField.jsx";
import Dropdown from "../components/Dropdown.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { fetchJson, apiErrorMessage } from "../utils/api.js";
import { getSession } from "../utils/session.js";
import { IED_LEVELS, DEFAULT_TARGET, levelLabel, levelCode, parsePercent } from "../utils/iedLevels.js";
import { X, AlertCircle, CheckCircle } from "react-feather";

const MIN_DESCRIPTION = 10;
const MAX_DESCRIPTION = 500;

// Topics, TLAs, references and the weekly schedule each have their own
// server-backed screen (linked from the ILO table); this form owns the ILO text.
const ILOForm = () => {
    const navigate = useNavigate();
    const { iloId } = useParams();
    const [searchParams] = useSearchParams();
    const session = getSession();

    // ILOs.jsx puts the offering on the link, same as the reference form.
    const offeringID = searchParams.get('pcId') || '';
    const revisionNum = searchParams.get('rev') || '';

    const [courseOutcome, setCourseOutcome] = useState('');
    const [intendedLearningOutcome, setIntendedLearningOutcome] = useState('');
    const [isOrientation, setIsOrientation] = useState(false);
    const [iedLevel, setIedLevel] = useState('');
    const [targetStudents, setTargetStudents] = useState(String(DEFAULT_TARGET.studentsPercent));
    const [targetScore, setTargetScore] = useState(String(DEFAULT_TARGET.scorePercent));
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    const goBackHandler = () => navigate(-1);

    useEffect(() => {
        if (!offeringID || !revisionNum) {
            setLoadError('Open this form from the syllabus ILO table so the course offering is known.');
            setLoading(false);
            return undefined;
        }
        let mounted = true;
        fetchJson(`/api/ilos/${encodeURIComponent(offeringID)}/${encodeURIComponent(revisionNum)}`)
            .then(data => {
                if (!mounted) return;
                for (const co of data.courseOutcomes || []) {
                    const ilo = (co.ilos || []).find(item => String(item.id) === String(iloId));
                    if (ilo) {
                        setCourseOutcome(co.description || '');
                        setIntendedLearningOutcome(ilo.description || '');
                        setIsOrientation(!!ilo.is_orientation);
                        setIedLevel(ilo.ied_level || '');
                        setTargetStudents(String(ilo.target_students_percent ?? DEFAULT_TARGET.studentsPercent));
                        setTargetScore(String(ilo.target_score_percent ?? DEFAULT_TARGET.scorePercent));
                        return;
                    }
                }
                setLoadError('This ILO was not found in the course offering.');
            })
            .catch(err => { if (mounted) setLoadError(err.message || 'Could not load the ILO.'); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [offeringID, revisionNum, iloId]);

    const handleTextChange = (val) => {
        setIntendedLearningOutcome(val);
        if (errors.intendedLearningOutcome) setErrors(prev => ({ ...prev, intendedLearningOutcome: null }));
    };

    const clearError = (field) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!isOrientation && !iedLevel) newErrors.iedLevel = "Choose Introductory, Enabling or Demonstrative.";
        if (parsePercent(targetStudents) === null) newErrors.targetStudents = "Enter a whole number from 1 to 100.";
        if (parsePercent(targetScore) === null) newErrors.targetScore = "Enter a whole number from 1 to 100.";
        const text = intendedLearningOutcome.trim();
        if (!text) {
            newErrors.intendedLearningOutcome = "Intended Learning Outcome is required.";
        } else if (text.length < MIN_DESCRIPTION) {
            newErrors.intendedLearningOutcome = "Description is too short.";
        } else if (text.length > MAX_DESCRIPTION) {
            newErrors.intendedLearningOutcome = `Description must be at most ${MAX_DESCRIPTION} characters.`;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveClick = () => {
        if (loadError || saving) return;
        if (validateForm()) {
            setShowConfirmModal(true);
        } else {
            setShowErrorModal(true);
        }
    };

    const handleConfirmSave = async () => {
        setSaving(true);
        try {
            await fetchJson(`/api/ilos/${encodeURIComponent(iloId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: intendedLearningOutcome,
                    ...(isOrientation ? {} : { ied_level: iedLevel }),
                    target_students_percent: parsePercent(targetStudents),
                    target_score_percent: parsePercent(targetScore)
                })
            });
            setShowConfirmModal(false);
            navigate(-1);
        } catch (err) {
            setShowConfirmModal(false);
            setErrors({ intendedLearningOutcome: apiErrorMessage(err, 'Could not save the ILO.') });
            setShowErrorModal(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Skeleton
            header={<Header role={session?.roleLabel || 'Instructor'} name={session?.name || ''} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation goBack={goBackHandler} onSave={handleSaveClick} />

                    <div className={styles['form-container']}>
                        <h2>ILO & Course Outcome Alignment</h2>

                        {loading && <p>Loading ILO...</p>}
                        {loadError && <p role="alert">{loadError}</p>}

                        {!loading && !loadError && (
                            <>
                                <TextArea
                                    disabled={true}
                                    label={'Course Outcome'}
                                    value={courseOutcome}
                                    readOnly={true}
                                />

                                <TextArea
                                    label={'Intended Learning Outcome'}
                                    value={intendedLearningOutcome}
                                    onChange={handleTextChange}
                                    error={errors.intendedLearningOutcome}
                                    rows={4}
                                />

                                {isOrientation ? (
                                    <p>This is an orientation ILO, so it has no IED level.</p>
                                ) : (
                                    <Dropdown
                                        label={'IED Level'}
                                        options={IED_LEVELS.map(level => levelLabel(level.code))}
                                        value={levelLabel(iedLevel)}
                                        onChange={(label) => { setIedLevel(levelCode(label) || ''); clearError('iedLevel'); }}
                                        error={errors.iedLevel}
                                    />
                                )}

                                <h2>COAEP Performance Target</h2>
                                <TextField
                                    label={'Percent of enrolled students'}
                                    value={targetStudents}
                                    onChange={(val) => { setTargetStudents(val); clearError('targetStudents'); }}
                                    error={errors.targetStudents}
                                />
                                <TextField
                                    label={'Minimum rating (percent of the total score)'}
                                    value={targetScore}
                                    onChange={(val) => { setTargetScore(val); clearError('targetScore'); }}
                                    error={errors.targetScore}
                                />
                            </>
                        )}
                    </div>

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
                                    <button className={styles.cancelBtn} onClick={() => setShowConfirmModal(false)} disabled={saving}>No, Cancel</button>
                                    <button className={styles.confirmBtn} onClick={handleConfirmSave} disabled={saving}>{saving ? 'Saving...' : 'Yes, Save'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showErrorModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader} style={{ borderBottomColor: '#FF5252' }}>
                                    <h3 style={{ color: '#FF5252' }}>Validation Error</h3>
                                    <button
                                        type="button"
                                        className={`${styles.closeIcon} app-icon-close`}
                                        onClick={() => setShowErrorModal(false)}
                                        aria-label="Close validation error"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className={styles.modalBody}>
                                    <AlertCircle size={40} color="#FF5252" style={{ marginBottom: '1rem' }} />
                                    <p>Please fix the highlighted issues before saving.</p>

                                    <ul className={styles.errorList}>
                                        {Object.entries(errors).filter(([, err]) => err).map(([key, err]) => (
                                            <li key={key}>
                                                {{ intendedLearningOutcome: 'ILO Description', iedLevel: 'IED Level', targetStudents: 'Students target', targetScore: 'Score target' }[key] || key}: {err}
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
