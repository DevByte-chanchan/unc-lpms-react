import React, { useState, useEffect } from 'react';

const CourseDetails = ({ offeringID, revisionNum, stylesB, fetchJson, isReadOnly = false }) => {
    const [courseDetailsData, setCourseDetailsData] = useState({
        code: '', name: '', description: '', credits: '', contact: '',
        prerequisites: '', class: '', cmo: '', revision: 0, year: '', sem: ''
    });
    const [editData, setEditData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [courseDetailsLoading, setCourseDetailsLoading] = useState(false);
    const [courseDetailsError, setCourseDetailsError] = useState(null);

    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchCourseDetails() {
            setCourseDetailsLoading(true);
            setCourseDetailsError(null);
            try {
                const data = await fetchJson(`/api/course-details/${offeringID}/${revisionNum}`);
                if (!mounted) return;
                setCourseDetailsData({
                    code: data.code ?? '',
                    name: data.name ?? '',
                    description: data.description ?? '',
                    credits: data.credits ?? '',
                    contact: data.contact ?? '',
                    prerequisites: data.prerequisites ?? '',
                    class: data.class ?? '',
                    cmo: data.cmo ?? '',
                    revision: data.revision ?? 0,
                    year: data.year ?? '',
                    sem: data.sem ?? ''
                });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setCourseDetailsError(err.message);
            } finally {
                if (mounted) setCourseDetailsLoading(false);
            }
        }

        fetchCourseDetails();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    const handleEditToggle = () => {
        if (isEditing) {
            setShowConfirm(true);
        } else {
            setEditData({ ...courseDetailsData });
            setIsEditing(true);
        }
    };

    const handleChange = (e, field) => {
        setEditData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSaveConfirm = async () => {
        setIsSaving(true);
        try {
            await fetch(`/api/course-details/${offeringID}/${revisionNum}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData)
            });
            setCourseDetailsData(editData);
            setIsEditing(false);
            setShowConfirm(false);
        } catch (e) {
            console.error('Failed to save', e);
            alert('Failed to save modifications.');
        } finally {
            setIsSaving(false);
        }
    };

    if (courseDetailsLoading) return <div className={stylesB.loadingContainer}>Loading course details...</div>;
    if (courseDetailsError) return <div className={stylesB.errorContainer}>Error: {courseDetailsError}</div>;

    const renderCell = (field, isBold = false) => {
        if (field === 'revision') return courseDetailsData[field]; 
        
        if (isEditing) {
            return (
                <input 
                    type="text" 
                    className="matrix-edit-input"
                    value={editData[field] ?? ''} 
                    onChange={e => handleChange(e, field)} 
                />
            );
        }
        return isBold ? <strong>{courseDetailsData[field] || ''}</strong> : (courseDetailsData[field] || '');
    };

    const renderTextArea = (field) => {
        if (isEditing) {
            return (
                <div className="matrix-edit-desc-wrapper">
                    <textarea 
                        className="matrix-edit-textarea"
                        value={editData[field] ?? ''} 
                        onChange={e => handleChange(e, field)} 
                        placeholder="Enter course description..."
                    />
                </div>
            );
        }
        return courseDetailsData[field] || '';
    };

    return (
        <div style={{ width: '100%' }}>
            {!isReadOnly && (
                <div className="matrix-btns-container">
                    {isEditing && (
                        <button 
                            type="button"
                            className="matrix-cancel-btn" 
                            onClick={() => { setIsEditing(false); setShowConfirm(false); }}
                        >
                            Cancel
                        </button>
                    )}
                    <button 
                        type="button"
                        className={"matrix-edit-btn " + (isEditing ? "save-mode" : "")} 
                        onClick={handleEditToggle}
                    >
                        {isEditing ? (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                Save Details
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className={stylesB.courseDetailsContainer} style={{ overflowX: "auto", paddingBottom: "15px", width: "100%" }}>
                <table className={stylesB.documentTable} style={{ width: '100%', tableLayout: 'fixed' }}>
                    <tbody>
                    <tr>
                        <th className={stylesB.labelCell} style={{ width: '25%' }}>Course No.</th>
                        <td className={stylesB.valueCell} style={{ width: '30%' }}>{renderCell('code')}</td>
                        <th className={stylesB.descHeader} style={{ width: '45%' }}>Course Description</th>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Course Title</th>
                        <td className={stylesB.valueCell}>{renderCell('name', true)}</td>
                        <td rowSpan="9" className={`${stylesB.descCell} matrix-desc-cell`}>
                            {renderTextArea('description')}
                        </td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Credit</th>
                        <td className={stylesB.valueCell}>{renderCell('credits')}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Contact Hours/Week</th>
                        <td className={stylesB.valueCell}>{renderCell('contact')}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Pre-requisites</th>
                        <td className={stylesB.valueCell}>{renderCell('prerequisites')}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Classification/Field</th>
                        <td className={stylesB.valueCell}>{renderCell('class')}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>CMO</th>
                        <td className={stylesB.valueCell}>{renderCell('cmo')}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Syllabus Revision No.</th>
                        <td className={stylesB.valueCell}>{renderCell('revision')}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Year Level</th>
                        <td className={stylesB.valueCell}>{renderCell('year')}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Term</th>
                        <td className={stylesB.valueCell}>{renderCell('sem')}</td>
                    </tr>
                    </tbody>
                </table>
            </div>

            {showConfirm && (
                <div className="matrix-modal-overlay">
                    <div className="matrix-modal-content">
                        <div className="matrix-modal-title">Confirm Changes</div>
                        <div className="matrix-modal-text">
                            <strong>Caution:</strong> The data in this Course Details section originates from a central curriculum source and is generally expected to be correct. Modifying these details will update the underlying course configuration. 
                            <br/><br/>
                            Are you certain you want to commit these changes?
                        </div>
                        <div className="matrix-modal-actions">
                            <button className="matrix-btn-cancel" onClick={() => setShowConfirm(false)} disabled={isSaving}>Cancel</button>
                            <button className="matrix-btn-confirm" onClick={handleSaveConfirm} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Yes, Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseDetails;