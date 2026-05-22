import React, { useEffect, useState } from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import SideNavigation from "../components/SideNavigation.jsx";
import TopicSelector from "../components/TopicSelector.jsx";
import { X, CheckCircle, AlertCircle } from 'react-feather';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Inline Modal component to match ReferenceForm styles
function InlineModal({ isOpen, title, onClose, children }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{title}</h3>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', padding: 6 }}>
                        <X size={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
            </div>
        </div>
    );
}

const TopicForm = () => {
    const navigate = useNavigate();
    const { courseCode, iloId } = useParams(); // e.g., /topics/form/:courseCode/:iloId

    const [availableTopics, setAvailableTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const goBackHandler = () => navigate(-1);

    async function fetchJson(url, opts) {
        const res = await fetch(url, opts);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${text}`);
        }
        return res.json();
    }

    // Fetch Initial Data
    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function loadData() {
            try {
                // Fetch unassigned topics (options) and currently assigned topics (values)
                const [availableRes, assignedRes] = await Promise.all([
                    fetchJson(`${API_BASE}/api/topics/available?iloId=${encodeURIComponent(iloId)}`),
                    fetchJson(`${API_BASE}/api/topics/assigned/${encodeURIComponent(iloId)}`)
                ]);

                if (!mounted) return;
                setAvailableTopics(Array.isArray(availableRes) ? availableRes : []);
                setSelectedTopics(Array.isArray(assignedRes) ? assignedRes : []);

            } catch (err) {
                console.error("Failed to load topics:", err);
                if (mounted) setValidationError("Failed to load topics from the server.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadData();
        return () => { mounted = false; };
    }, [iloId]);

    // Handle Save Execution
    const handleSave = async () => {
        setValidationError(null);

        // Validation: At least one topic must be selected
        if (!selectedTopics || selectedTopics.length === 0) {
            setValidationError("Please select or create at least one topic before saving.");
            return;
        }

        setSaving(true);
        try {
            // Send payload to backend master sync function
            await fetchJson(`${API_BASE}/api/topics/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ilo_id: Number(iloId),
                    topics: selectedTopics
                })
            });

            setShowConfirm(true);

            // Optional: Refresh data after save to ensure IDs are synced
            const assignedRes = await fetchJson(`${API_BASE}/api/topics/assigned/${encodeURIComponent(iloId)}`);
            setSelectedTopics(Array.isArray(assignedRes) ? assignedRes : []);

        } catch (err) {
            console.error("Save error:", err);
            setValidationError(err.message || "Failed to save topic assignments.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Skeleton
            header={<Header role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    {/* Hook up FormNavigation with our custom handleSave */}
                    <FormNavigation goBack={goBackHandler} onSave={handleSave} />

                    <div className={styles['form-container']}>
                        <h2>Topics Assignment</h2>

                        <TopicSelector
                            label="Map Learning Topics"
                            options={availableTopics}
                            value={selectedTopics}
                            onChange={setSelectedTopics}
                            disabled={loading || saving}
                            error={validationError}
                        />

                        {/* Success Confirmation Modal */}
                        <InlineModal
                            isOpen={showConfirm}
                            title="Saved Successfully"
                            onClose={() => setShowConfirm(false)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <CheckCircle size={20} color="#2e7d32" />
                                <div>Topic assignments have been updated.</div>
                            </div>
                        </InlineModal>
                    </div>
                </div>
            }
        />
    )
}

export default TopicForm;