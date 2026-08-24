import React, { useState, useEffect } from 'react';
import { BookOpen } from 'react-feather';
import { unresolvedCountsByReference, iloIdsFromCourse } from '../utils/referenceComments.js';
import EmptyState from './EmptyState.jsx';
import TableScrollRegion from './TableScrollRegion.jsx';

const REFERENCE_VIEWS = [
    { value: 'Textbook', label: 'TEXTBOOKS', prefix: 'TB', identifier: 'ISBN', empty: 'No textbooks attached to this plan' },
    { value: 'Open Educational Resources', label: 'OPEN EDUCATIONAL RESOURCES', prefix: 'OE', identifier: 'LINK', empty: 'No open educational resources attached to this plan' },
    { value: 'Online Resources', label: 'ONLINE RESOURCES', prefix: 'OR', identifier: 'LINK', empty: 'No online resources attached to this plan' },
];

const ReferenceSummary = ({ offeringID, revisionNum, status, selectedSection, styles, stylesB, fetchJson }) => {
    const [viewType, setViewType] = useState('Textbook');
    const [referenceData, setReferenceData] = useState(null);
    const [isReferencesLoading, setIsReferencesLoading] = useState(false);
    // The catch below logged to the console and stopped there, so the screen
    // said "No references attached to this plan" whether the plan had none or
    // the server had never answered. Those need different words, and the
    // second one needs to name the reason.
    const [referencesError, setReferencesError] = useState('');
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
                setReferencesError('');
            } catch (err) {
                console.error("Error fetching reference summary data:", err);
                if (mounted) setReferencesError(err?.message || 'the request failed');
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

    const activeView = REFERENCE_VIEWS.find(view => view.value === viewType) || REFERENCE_VIEWS[0];
    const activeReferences = getDataByType(activeView.value);
    const isTextbook = activeView.value === 'Textbook';

    if (isReferencesLoading && !referenceData) {
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
                    aria-label="Reference category"
                    value={viewType}
                    onChange={(event) => setViewType(event.target.value)}
                    className={stylesB.refSelect}
                >
                    {REFERENCE_VIEWS.map(view => (
                        <option key={view.value} value={view.value}>{view.label}</option>
                    ))}
                </select>
            </div>

            {referencesError && (
                <div className={stylesB.refErrorBanner} role="alert">
                    <strong>Could not load the references.</strong>
                    <span>The server did not answer — {referencesError}. Check that the backend is running on port 5000, then reload.</span>
                </div>
            )}

            <TableScrollRegion label={`${activeView.label} table`} minWidth={760} className={stylesB.refScrollWrapper}>
                <table className={stylesB.refTable}>
                    <thead>
                        <tr><th>ID</th><th>TITLE</th><th>AUTHOR/S</th><th>{activeView.identifier}</th><th>YEAR</th></tr>
                    </thead>
                    <tbody>
                        {activeReferences.length === 0 ? (
                            <EmptyState
                                colSpan={5}
                                icon={<BookOpen size={22} strokeWidth={1.6} />}
                                title={activeView.empty}
                                hint={`References in ${activeView.label.toLowerCase()} will appear here after they are attached to a course outcome.`}
                            />
                        ) : activeReferences.map((ref, index) => {
                            const unresolvedCount = referenceCommentCounts[ref.id] || 0;
                            return (
                                <tr key={ref.id || `${activeView.prefix}${index + 1}`}>
                                    <td>{activeView.prefix}{index + 1}</td>
                                    <td>
                                        <div className={stylesB.refTitleCell}>
                                            <span>{ref.title}</span>
                                            {status === 'returned' && unresolvedCount > 0 && (
                                                <span className={styles['comment-badge']}>{unresolvedCount}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{ref.authors}</td>
                                    <td>{isTextbook
                                        ? (ref.isbn || '-')
                                        : (ref.link ? <a href={ref.link} target="_blank" rel="noreferrer">Open Resource</a> : '-')}</td>
                                    <td>{ref.year || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableScrollRegion>
        </div>
    );
};

export default ReferenceSummary;
