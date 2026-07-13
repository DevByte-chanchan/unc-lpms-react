import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Inbox } from "react-feather";

const ILOs = ({ offeringID, revisionNum, status, styles, fetchJson }) => {
    const [iloData, setIloData] = useState({ course: null, courseOutcomes: [], ilos: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});

    // 1. Fetch main ILO Data layer
    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchILOs() {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchJson(`/api/ilos/${offeringID}/${revisionNum}`);

                if (!mounted) return;
                const flatILOs = [];
                for (const co of data.courseOutcomes) {
                    co.ilos.sort((a, b) => a.id - b.id);
                    co.ilos.forEach(ilo => flatILOs.push({ ...ilo, co_id: co.co_id }));
                }
                setIloData({ course: data.course, courseOutcomes: data.courseOutcomes, ilos: flatILOs });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchILOs();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    // 2. Dynamic Badge Counter: Triggers only when flat list of ILOs is ready
    useEffect(() => {
        if (status !== 'returned' || !iloData.ilos || iloData.ilos.length === 0) return;
        let mounted = true;

        async function gatherAllCommentCounts() {
            const targetTypes = ['references', 'topics', 'tlas'];
            const localCountsMap = {};

            try {
                // Construct a batch of parallelized fetch promises for every active ILO and sub-type
                const fetchPromises = [];

                iloData.ilos.forEach(ilo => {
                    targetTypes.forEach(type => {
                        const promise = fetchJson(`/api/comments/filter/${ilo.id}/${type}`)
                            .then(comments => {
                                if (!mounted) return;
                                // Filter for unresolved items down on the client-side
                                const unresolvedCount = comments.filter(c => !c.resolved_status).length;
                                if (unresolvedCount > 0) {
                                    localCountsMap[`${ilo.id}_${type}`] = unresolvedCount;
                                }
                            })
                            .catch(err => console.error(`Failed to fetch comments for ILO ${ilo.id} type ${type}:`, err));

                        fetchPromises.push(promise);
                    });
                });

                // Wait for all checks to finish executing concurrently
                await Promise.all(fetchPromises);

                if (mounted) {
                    setCommentCounts(localCountsMap);
                }
            } catch (error) {
                console.error("Error batching comment layout parameters:", error);
            }
        }

        gatherAllCommentCounts();
        return () => { mounted = false; };
    }, [iloData.ilos, status, fetchJson]);

    const getBadgeCount = (iloId, type) => {
        return commentCounts[`${iloId}_${type}`] || 0;
    };

    if (loading) {
        return <div className={styles.loadingContainer}>Loading ILOs...</div>;
    }

    if (error) {
        return <div className={styles.errorContainer}>Error: {error}</div>;
    }

    return (
        <section>
            <div className={styles['ilo-container']}>
                <table>
                    <thead>
                    <tr>
                        <th width={150}>CO-ILO #</th>
                        <th width={600}>Description</th>
                        <th className={styles.fill} width={250}></th>
                    </tr>
                    </thead>
                    <tbody>
                    {iloData.ilos && iloData.ilos.length > 0 ? (() => {
                        let coDisplaySequence = 0;
                        let lastCoId = null;
                        let iloDisplaySequence = 0;

                        return iloData.ilos.map((ilo) => {
                            if (ilo.co_id !== lastCoId) {
                                lastCoId = ilo.co_id;
                                coDisplaySequence++;
                                iloDisplaySequence = 1;
                            } else {
                                iloDisplaySequence++;
                            }

                            const entryLabel = `CO${coDisplaySequence}-ILO${iloDisplaySequence}`;

                            const refBadges = getBadgeCount(ilo.id, 'references');
                            const topicBadges = getBadgeCount(ilo.id, 'topics');
                            const tlaBadges = getBadgeCount(ilo.id, 'tlas');

                            return (
                                <tr key={ilo.id}>
                                    <td width={150} style={{ fontWeight: 500 }}>{entryLabel}</td>
                                    <td width={600}>{ilo.description}</td>
                                    <td className={styles.fill} width={250} style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 5 }}>

                                        {/* Assign References */}
                                        <Link className="actionLink" to={`/references/form/${ilo.id}/${status}`}>
                                                <span className={styles['link-text-wrapper']}>
                                                    Assign References
                                                    <ChevronRight size={18} />
                                                    <div className={styles.fixedWidth}>
                                                        {status === 'returned' && refBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{refBadges}</span>
                                                        )}
                                                    </div>
                                                </span>
                                        </Link>

                                        {/* Assign Topics */}
                                        <Link className="actionLink" to={`/topics/form/${ilo.id}/${status}`}>
                                                <span className={styles['link-text-wrapper']}>
                                                    Assign Topics
                                                    <ChevronRight size={18} />
                                                    <div className={styles.fixedWidth}>
                                                        {status === 'returned' && topicBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{topicBadges}</span>
                                                        )}
                                                    </div>
                                                </span>
                                        </Link>

                                        {/* Assign TLAs */}
                                        <Link className="actionLink" to={`/tlas/form/${ilo.id}/${status}`}>
                                                <span className={styles['link-text-wrapper']}>
                                                    Assign TLAs
                                                    <ChevronRight size={18} />
                                                    <div className={styles.fixedWidth}>
                                                        {status === 'returned' && tlaBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{tlaBadges}</span>
                                                        )}
                                                    </div>
                                                </span>
                                        </Link>

                                    </td>
                                </tr>
                            );
                        });
                    })() : (
                        <tr className={styles.emptyRow}>
                            <td colSpan={3}>
                                <div className={styles.emptyStateContainer}>
                                    <Inbox size={40} strokeWidth={1} />
                                    <span>No ILOs found.</span>
                                </div>
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default ILOs;