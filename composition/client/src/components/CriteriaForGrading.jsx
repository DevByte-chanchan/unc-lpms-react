import React, { useState, useEffect } from 'react';

// --- 1. MAIN COMPONENT DEFINITION ---
const CriteriaForGrading = ({ offeringID, revisionNum, status, styles, stylesB, fetchJson }) => {
    const [criteriaData, setCriteriaData] = useState({ gradingSystem: [] });
    const [criteriaLoading, setCriteriaLoading] = useState(false);
    const [criteriaError, setCriteriaError] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});

    // --- 2. FETCH GRADING CRITERIA DATA LAYER ---
    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchCriteria() {
            setCriteriaLoading(true);
            setCriteriaError(null);
            try {
                const data = await fetchJson(`/api/course-criteria/${offeringID}/${revisionNum}`);

                if (!mounted) return;

                setCriteriaData({
                    gradingSystem: Array.isArray(data.gradingSystem) ? data.gradingSystem : []
                });
            } catch (err) {
                console.error('fetchCriteria error', err);
                if (!mounted) return;
                setCriteriaError(err.message);
                setCriteriaData({ gradingSystem: [] });
            } finally {
                if (mounted) setCriteriaLoading(false);
            }
        }

        fetchCriteria();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    // --- 3. DYNAMIC COMMENT BADGE COUNTER ---
    useEffect(() => {
        // Only run if status is 'returned' and we have grading entries
        if (status !== 'returned' || !criteriaData.gradingSystem || criteriaData.gradingSystem.length === 0) return;
        let mounted = true;

        async function gatherCriteriaCommentCounts() {
            const localCountsMap = {};

            // Extract a flat array of all internal ILOs found inside the grading blocks
            const flatCriteriaILOs = [];
            criteriaData.gradingSystem.forEach(group => {
                if (Array.isArray(group.ilos)) {
                    group.ilos.forEach(ilo => flatCriteriaILOs.push(ilo));
                }
            });

            if (flatCriteriaILOs.length === 0) return;

            try {
                const fetchPromises = [];

                flatCriteriaILOs.forEach(ilo => {
                    // For grading criteria, comments are typically group-categorized under 'criteria'
                    const targetType = 'criteria';

                    const promise = fetchJson(`/api/comments/filter/${ilo.id}/${targetType}`)
                        .then(comments => {
                            if (!mounted) return;

                            // Count only unresolved items
                            const unresolvedCount = comments.filter(c => {
                                return c.resolved_status === false || c.resolved_status === 0 || String(c.resolved_status).toLowerCase() === 'false';
                            }).length;

                            if (unresolvedCount > 0) {
                                localCountsMap[`${ilo.id}_${targetType}`] = unresolvedCount;
                            }
                        })
                        .catch(err => console.error(`Failed fetching criteria comments for ILO ${ilo.id}:`, err));

                    fetchPromises.push(promise);
                });

                await Promise.all(fetchPromises);

                if (mounted) {
                    setCommentCounts(localCountsMap);
                }
            } catch (error) {
                console.error("Error batching criteria comments:", error);
            }
        }

        gatherCriteriaCommentCounts();
        return () => { mounted = false; };
    }, [criteriaData.gradingSystem, status, fetchJson]);

    // --- 4. HELPERS ---
    const getBadgeCount = (iloId, type) => {
        return commentCounts[`${iloId}_${type}`] || 0;
    };

    const calculateTotal = (period) => {
        let total = 0;
        criteriaData.gradingSystem.forEach(group => {
            if (group.ilos) {
                group.ilos.forEach(ilo => {
                    total += Number(ilo.weight?.[period] || 0);
                });
            }
        });
        return total;
    };

    const gradingSystem = criteriaData.gradingSystem || [];

    // --- 5. RENDER TABLE PREVIEW ---
    return (
        <div className={stylesB.criteriaContainer}>
            <div className={stylesB.tableScrollWrapper}>
                <table className={stylesB.criteriaTable}>
                    <thead>
                    <tr>
                        <th rowSpan="2" className={stylesB.headerCell} style={{ width: '100px' }}>COURSE OUTCOME</th>
                        <th rowSpan="2" className={stylesB.headerCell} style={{ width: '80px' }}>ILO #</th>
                        <th rowSpan="2" className={stylesB.headerCell}>ASSESSMENTS</th>
                        <th colSpan="4" className={stylesB.headerCell}>WEIGHT %</th>
                        <th rowSpan="2" className={stylesB.headerCell}>MIN PASSING %</th>
                    </tr>
                    <tr className={stylesB.subHeaderRow}>
                        <th className={stylesB.subHeader}>Prelim</th>
                        <th className={stylesB.subHeader}>Midterm</th>
                        <th className={stylesB.subHeader}>Semi</th>
                        <th className={stylesB.subHeader}>Final</th>
                    </tr>
                    </thead>
                    <tbody>
                    {criteriaLoading ? (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td>
                        </tr>
                    ) : criteriaError ? (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>{criteriaError}</td>
                        </tr>
                    ) : gradingSystem.length > 0 ? (
                        gradingSystem.map((group) => (
                            <React.Fragment key={group.co}>
                                {group.ilos.map((ilo, index) => {
                                    // Retrieve criteria comment count for badge display
                                    const criteriaBadges = getBadgeCount(ilo.id, 'criteria');

                                    return (
                                        <tr key={`${group.co}-${ilo.id}`}>

                                            {/* COURSE OUTCOME CELL (Spans all ILOs) */}
                                            {index === 0 && (
                                                <td rowSpan={group.ilos.length} className={styles.coCell}>
                                                    <strong>{group.co}</strong>
                                                </td>
                                            )}

                                            {/* ILO Cell */}
                                            <td className={styles.dataCellCenter}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: '500' }}>{ilo.id}</span>
                                                    {/* Append notification badge next to item identifier when returned */}
                                                    {status === 'returned' && criteriaBadges > 0 && (
                                                        <span className={styles['comment-badge']}>{criteriaBadges}</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Assessments */}
                                            <td className={styles.dataCellCenter}>
                                                {Array.isArray(ilo.assessments)
                                                    ? ilo.assessments.join(', ')
                                                    : ilo.assessments}
                                            </td>

                                            {/* Weights */}
                                            <td className={stylesB.dataCellCenter}>{ilo.weight?.prelim || ''}</td>
                                            <td className={stylesB.dataCellCenter}>{ilo.weight?.midterm || ''}</td>
                                            <td className={stylesB.dataCellCenter}>{ilo.weight?.semi || ''}</td>
                                            <td className={stylesB.dataCellCenter}>{ilo.weight?.final || ''}</td>

                                            {/* Min Passing */}
                                            <td className={stylesB.dataCellCenter}>{ilo.minPassing}</td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                                No grading criteria available.
                            </td>
                        </tr>
                    )}

                    {/* Total Row */}
                    <tr className={stylesB.totalRow}>
                        <td colSpan="3" className={stylesB.totalLabel}>TOTAL</td>
                        <td className={stylesB.dataCellCenter}>{calculateTotal('prelim')}%</td>
                        <td className={stylesB.dataCellCenter}>{calculateTotal('midterm')}%</td>
                        <td className={stylesB.dataCellCenter}>{calculateTotal('semi')}%</td>
                        <td className={stylesB.dataCellCenter}>{calculateTotal('final')}%</td>
                        <td></td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CriteriaForGrading;