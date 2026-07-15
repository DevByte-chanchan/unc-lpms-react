import React, { useState, useEffect } from 'react';

const ReferenceSummary = ({ offeringID, revisionNum, status, selectedSection, styles, stylesB, fetchJson }) => {
    const [viewType, setViewType] = useState('Textbook');
    const [referenceData, setReferenceData] = useState(null);
    const [isReferencesLoading, setIsReferencesLoading] = useState(false);
    const [referenceCommentCounts, setReferenceCommentCounts] = useState({});

    // 1. Fetch live syllabus materials configuration datasets
    useEffect(() => {
        if (!offeringID || !revisionNum || selectedSection !== 'References Summary') return;
        let mounted = true;

        async function fetchReferenceSummaryData() {
            try {
                setIsReferencesLoading(true);
                const data = await fetchJson(`/api/courses/${offeringID}/${revisionNum}/references`);

                if (!mounted) return;
                setReferenceData(data);
            } catch (err) {
                console.error("Error fetching reference summary data:", err);
            } finally {
                if (mounted) setIsReferencesLoading(false);
            }
        }

        fetchReferenceSummaryData();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, selectedSection, fetchJson]);

    // 2. Fetch workflow review feedback comment numbers for each material entry
    useEffect(() => {
        if (status !== 'returned' || selectedSection !== 'References Summary' || !referenceData) return;
        let mounted = true;

        async function gatherReferenceCommentCounts() {
            const localCountsMap = {};
            const allTypes = ['Textbook', 'Open Educational Resources', 'Online Resources'];

            // Extract a flat map collection containing every reference entity entry
            const flatReferencesList = [];
            allTypes.forEach(type => {
                flatReferencesList.push(...getDataByType(type));
            });

            if (flatReferencesList.length === 0) return;

            try {
                const fetchPromises = [];

                flatReferencesList.forEach(ref => {
                    const targetRefId = ref.id;
                    if (!targetRefId) return;

                    const promise = fetchJson(`/api/comments/filter/${targetRefId}/references`)
                        .then(comments => {
                            if (!mounted) return;

                            const unresolvedCount = comments.filter(c => {
                                return c.resolved_status === false || c.resolved_status === 0 || String(c.resolved_status).toLowerCase() === 'false';
                            }).length;

                            if (unresolvedCount > 0) {
                                localCountsMap[targetRefId] = unresolvedCount;
                            }
                        })
                        .catch(err => console.error(`Failed to gather reference feedback metrics for item ${targetRefId}:`, err));

                    fetchPromises.push(promise);
                });

                await Promise.all(fetchPromises);
                if (mounted) setReferenceCommentCounts(localCountsMap);
            } catch (error) {
                console.error("Error tracking runtime item feedback counts:", error);
            }
        }

        gatherReferenceCommentCounts();
        return () => { mounted = false; };
    }, [referenceData, status, selectedSection, fetchJson]);

    // Data parsing structure assistant matching structural schemas
    const getDataByType = (type) => {
        const payload = referenceData || {};
        if (Array.isArray(payload[type])) return payload[type];
        if (payload.data && Array.isArray(payload.data[type])) return payload.data[type];

        const fallbackArray = payload.references || payload.data?.references;
        if (Array.isArray(fallbackArray)) {
            return fallbackArray.filter(ref => ref.type?.toLowerCase() === type.toLowerCase());
        }
        return [];
    };

    if (isReferencesLoading) {
        return (
            <div className={stylesB.refContainer}>
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>
                    Loading References Summary Matrix...
                </div>
            </div>
        );
    }

    return (
        <div className={stylesB.refContainer}>
            <div className={stylesB.refHeaderBar}>
                <select
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    className={stylesB.refSelect}
                >
                    <option value="Textbook">TEXTBOOKS</option>
                    <option value="Open Educational Resources">OPEN EDUCATIONAL RESOURCES</option>
                    <option value="Online Resources">ONLINE RESOURCES</option>
                </select>
            </div>

            <div className={stylesB.refScrollWrapper}>
                {/* --- TABLE 1: TEXTBOOKS --- */}
                {viewType === 'Textbook' && (
                    <table className={stylesB.refTable}>
                        <thead>
                        <tr>
                            <th>ID</th><th>TITLE</th><th>AUTHOR/S</th><th>ISBN</th><th>YEAR</th>
                        </tr>
                        </thead>
                        <tbody>
                        {getDataByType('Textbook').map((ref, i) => {
                            const unresolvedCount = referenceCommentCounts[ref.id] || 0;
                            return (
                                <tr key={ref.id || i}>
                                    <td>TB{i + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {ref.title}
                                            {status === 'returned' && unresolvedCount > 0 && (
                                                <span className={styles['comment-badge']}>{unresolvedCount}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{ref.authors}</td>
                                    <td>{ref.isbn || '-'}</td>
                                    <td>{ref.year || '-'}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}

                {/* --- TABLE 2: OPEN EDUCATIONAL RESOURCES --- */}
                {viewType === 'Open Educational Resources' && (
                    <table className={stylesB.refTable}>
                        <thead>
                        <tr>
                            <th>ID</th><th>TITLE</th><th>AUTHOR/S</th><th>LINK</th><th>YEAR</th>
                        </tr>
                        </thead>
                        <tbody>
                        {getDataByType('Open Educational Resources').map((ref, i) => {
                            const unresolvedCount = referenceCommentCounts[ref.id] || 0;
                            return (
                                <tr key={ref.id || i}>
                                    <td>OE{i + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {ref.title}
                                            {status === 'returned' && unresolvedCount > 0 && (
                                                <span className={styles['comment-badge']}>{unresolvedCount}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{ref.authors}</td>
                                    <td><a href={ref.link} target="_blank" rel="noreferrer">Open Resource</a></td>
                                    <td>{ref.year || '-'}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}

                {/* --- TABLE 3: ONLINE RESOURCES --- */}
                {viewType === 'Online Resources' && (
                    <table className={stylesB.refTable}>
                        <thead>
                        <tr>
                            <th>ID</th><th>TITLE</th><th>AUTHOR/S</th><th>LINK</th><th>YEAR</th>
                        </tr>
                        </thead>
                        <tbody>
                        {getDataByType('Online Resources').map((ref, i) => {
                            const unresolvedCount = referenceCommentCounts[ref.id] || 0;
                            return (
                                <tr key={ref.id || i}>
                                    <td>OR{i + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {ref.title}
                                            {status === 'returned' && unresolvedCount > 0 && (
                                                <span className={styles['comment-badge']}>{unresolvedCount}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{ref.authors}</td>
                                    <td><a href={ref.link} target="_blank" rel="noreferrer">Visit</a></td>
                                    <td>{ref.year || '-'}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ReferenceSummary;