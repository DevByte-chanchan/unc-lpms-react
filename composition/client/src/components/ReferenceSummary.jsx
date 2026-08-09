import React, { useState, useEffect } from 'react';
import { unresolvedCountsByReference, iloIdsFromCourse } from '../utils/referenceComments.js';

const ReferenceSummary = ({ offeringID, revisionNum, status, selectedSection, styles, stylesB, fetchJson }) => {
    const [viewType, setViewType] = useState('All');
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
    //
    // The comment endpoint filters on ilo_id, so it is queried per ILO — passing
    // it a reference_id returned the comments of the ILO with the same number
    // and badged the wrong rows. Which reference a comment is about is its
    // target_id, and one comment yields one row per target, so the count is over
    // distinct comment_ids.
    useEffect(() => {
        if (status !== 'returned' || selectedSection !== 'References Summary' || !referenceData) return;
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function gatherReferenceCommentCounts() {
            try {
                const course = await fetchJson(`/api/ilos/${offeringID}/${revisionNum}`);
                const iloIds = iloIdsFromCourse(course);
                if (iloIds.length === 0) return;

                const rows = await Promise.all(iloIds.map(iloId =>
                    fetchJson(`/api/comments/filter/${iloId}/references`)
                        .catch(err => {
                            console.error(`Failed to gather reference feedback metrics for ILO ${iloId}:`, err);
                            return [];
                        })
                ));

                if (!mounted) return;
                setReferenceCommentCounts(unresolvedCountsByReference(rows.flat()));
            } catch (error) {
                console.error("Error tracking runtime item feedback counts:", error);
            }
        }

        gatherReferenceCommentCounts();
        return () => { mounted = false; };
    }, [referenceData, status, selectedSection, fetchJson, offeringID, revisionNum]);

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
                    <option value="All">ALL REFERENCES</option>
                    <option value="Textbook">TEXTBOOKS</option>
                    <option value="Open Educational Resources">OPEN EDUCATIONAL RESOURCES</option>
                    <option value="Online Resources">ONLINE RESOURCES</option>
                </select>
            </div>

            <div className={stylesB.refScrollWrapper}>
                {/* --- ALL REFERENCES --- */}
                {viewType === 'All' && (
                    <>
                        <table className={stylesB.refTable}>
                            <thead>
                            <tr>
                                <th>ID</th><th>TITLE</th><th>AUTHOR/S</th><th>ISBN / LINK</th><th>YEAR</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(() => {
                                const all = [
                                    ...getDataByType('Textbook').map((r, i) => ({ ...r, _prefix: 'TB', _idx: i + 1 })),
                                    ...getDataByType('Open Educational Resources').map((r, i) => ({ ...r, _prefix: 'OE', _idx: i + 1 })),
                                    ...getDataByType('Online Resources').map((r, i) => ({ ...r, _prefix: 'OR', _idx: i + 1 })),
                                ]
                                if (all.length === 0) return <tr><td colSpan={5} className={stylesB.refEmpty}>No references found.</td></tr>
                                return all.map((ref) => (
                                    <tr key={ref.id || `${ref._prefix}${ref._idx}`}>
                                        <td>{ref._prefix}{ref._idx}</td>
                                        <td>{ref.title}</td>
                                        <td>{ref.authors}</td>
                                        <td>{ref._prefix === 'TB'
                                            ? (ref.isbn || '-') /* ISBN is plain text — never a link */
                                            : (ref.link
                                                ? <a href={ref.link} target="_blank" rel="noreferrer">Open Resource</a>
                                                : (ref.isbn || '-'))}</td>
                                        <td>{ref.year || '-'}</td>
                                    </tr>
                                ))
                            })()}
                            </tbody>
                        </table>
                    </>
                )}

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
                                    <td><a href={ref.link} target="_blank" rel="noreferrer">Open Resource</a></td>
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