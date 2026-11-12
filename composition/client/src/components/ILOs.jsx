import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Inbox, Search, Clock, Flag } from "react-feather";

const ILOs = ({ offeringID, revisionNum, status, styles, fetchJson }) => {
    const [iloData, setIloData] = useState({ course: null, courseOutcomes: [], ilos: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});

    const [searchTerm, setSearchTerm] = useState('');

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
                const processedILOs = [];
                const processedCourseOutcomes = [];
                let coDisplayCounter = 1;

                // Process COs and ILOs directly during fetch to assign sequences predictably for searching
                for (const co of data.courseOutcomes) {
                    const sortedIlos = [...(co.ilos || [])].sort((a, b) => a.id - b.id);
                    let iloDisplaySequence = 1;
                    const cleanCoDescription = (co.description || '').replace(/^CO\s*\d+\s*:\s*/i, '').trim();

                    sortedIlos.forEach((ilo) => {
                        const isOrientation = Boolean(ilo.isOrientation);
                        const iloNumber = isOrientation ? 0 : iloDisplaySequence;
                        const label = isOrientation ? "Course Orientation" : `CO ${coDisplayCounter} - ILO ${iloNumber}`;

                        processedILOs.push({
                            ...ilo,
                            co_id: co.co_id,
                            coNumber: coDisplayCounter,
                            coDescription: cleanCoDescription,
                            iloNumber: iloNumber,
                            isOrientation: isOrientation,
                            entryLabel: label,
                            hours: isOrientation ? (ilo.hours || 2) : (ilo.hours || 0),
                            formattedWeekStr: isOrientation ? (ilo.formattedWeekStr || 'Week 1') : (ilo.formattedWeekStr || '')
                        });

                        if (!isOrientation) iloDisplaySequence++;
                    });

                    processedCourseOutcomes.push({
                        ...co,
                        coNumber: coDisplayCounter,
                        description: cleanCoDescription,
                        hours: co.hours ?? 0,
                        formattedWeekStr: co.formattedWeekStr || ''
                    });

                    coDisplayCounter++;
                }

                setIloData({ course: data.course, courseOutcomes: processedCourseOutcomes, ilos: processedILOs });
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

    // 2. Dynamic Badge Counter: Fetches unresolved comment counts per week
    useEffect(() => {
        if (status !== 'returned' || !iloData.courseOutcomes || iloData.courseOutcomes.length === 0) return;
        let mounted = true;

        async function gatherAllCommentCounts() {
            const targetTypes = ['references', 'topics', 'tlas'];
            const localCountsMap = {};

            try {
                const fetchPromises = [];
                const allWeeks = iloData.courseOutcomes.flatMap(co => co.weeks || []);

                allWeeks.forEach(w => {
                    targetTypes.forEach(type => {
                        const promise = fetchJson(`/api/comments/filter/${w.week_id}/${type}`)
                            .then(comments => {
                                if (!mounted || !Array.isArray(comments)) return;
                                const unresolvedCount = comments.filter(c => !c.resolved_status).length;
                                if (unresolvedCount > 0) {
                                    localCountsMap[`${w.week_id}_${type}`] = unresolvedCount;
                                }
                            })
                            .catch(err => console.error(`Failed to fetch comments for Week ${w.week_id} type ${type}:`, err));

                        fetchPromises.push(promise);
                    });
                });

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
    }, [iloData.courseOutcomes, status, fetchJson]);

    const getBadgeCount = (weekId, type) => {
        return commentCounts[`${weekId}_${type}`] || 0;
    };

    // Aggregates all topics, references, and tlas badges for a week
    const getTotalBadgeCount = (weekId) => {
        return getBadgeCount(weekId, 'references') + getBadgeCount(weekId, 'topics') + getBadgeCount(weekId, 'tlas');
    };

    if (loading) {
        return <div className={styles.loadingContainer}>Loading ILOs...</div>;
    }

    if (error) {
        return <div className={styles.errorContainer}>Error: {error}</div>;
    }

    // Client-side Frontend filtering mechanics
    const lowerSearch = searchTerm.toLowerCase();
    const filteredIlos = iloData.ilos.filter(ilo => {
        if (!searchTerm) return true;
        const matchLabel = ilo.entryLabel.toLowerCase().includes(lowerSearch);
        const matchDesc = (ilo.description || '').toLowerCase().includes(lowerSearch);
        const matchCoDesc = (ilo.coDescription || '').toLowerCase().includes(lowerSearch);
        return matchLabel || matchDesc || matchCoDesc;
    });

    // Helper for rendering exam milestones along the roadmap
    const renderExamMilestone = (key, title, meta) => (
        <div key={key} className={`${styles.roadmapStep} ${styles.roadmapStepMilestone}`}>
            <div className={styles.stepNodeExam}>
                <span className={styles.nodeExam} title={title}>
                    <Flag size={11} />
                </span>
            </div>
            <div className={styles.milestoneDividerRow}>
                <div className={styles.milestoneHairline} />
                <div className={styles.milestonePill}>
                    <Flag size={12} className={styles.milestoneFlagIcon} />
                    <span className={styles.milestoneTitle}>{title}</span>
                    {meta && (
                        <>
                            <span className={styles.milestoneSep}>|</span>
                            <span className={styles.milestoneMetaText}>{meta}</span>
                        </>
                    )}
                </div>
                <div className={styles.milestoneHairline} />
            </div>
        </div>
    );

    return (
        <section style={{ display: 'flex', flexDirection: 'column' }}>

            <div className={styles.iloHeader}>
                <div className={styles.iloSearchContainer}>
                    <Search color="#94A3B8" size={17} />
                    <input
                        type="text"
                        placeholder="Search ILO number, CO number, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles['ilo-container']}>
                {(() => {
                    if (filteredIlos.length === 0) {
                        return (
                            <div className={styles.emptyStateContainer} style={{ padding: '40px' }}>
                                <Inbox size={40} strokeWidth={1} />
                                <span>No matching results found.</span>
                            </div>
                        );
                    }

                    // 1. Process COs and extract Course Orientation via mapped sequence cache
                    const courseOrientation = filteredIlos.find(i => i.isOrientation);
                    const coListForGrid = [];

                    iloData.courseOutcomes.forEach((co) => {
                        // Extract standard ILOs mapping to this CO that are currently rendered by search mask
                        const currentIlos = filteredIlos.filter(i => i.co_id === co.co_id && !i.isOrientation);

                        // Only render the CO Container Rectangles if it survives the search check
                        if (currentIlos.length > 0) {
                            coListForGrid.push({
                                ...co,
                                coNumber: co.coNumber || currentIlos[0].coNumber,
                                gridIlos: currentIlos
                            });
                        }
                    });

                    return (
                        <div className={styles.roadmapContainer}>
                            {/* Course Orientation Kickoff Card */}
                            {courseOrientation && (() => {
                                const orientationWeekId = iloData.courseOutcomes[0]?.weeks?.[0]?.week_id || courseOrientation.id;
                                const totalBadges = getTotalBadgeCount(courseOrientation.id);
                                return (
                                    <div key="course-orientation" className={styles.roadmapStep}>
                                        <div className={styles.stepNode}>
                                            <span className={styles.nodeStart} title="Course Orientation Start">
                                                <span className={styles.nodeStartDot} />
                                            </span>
                                        </div>
                                        <div className={styles.orientationKickoffCard}>
                                            <div className={styles.kickoffMain}>
                                                <div className={styles.kickoffHeader}>
                                                    <div className={styles.kickoffTitleRow}>
                                                        <span className={styles.kickoffTitle}>Course Orientation</span>
                                                        <span className={styles.weekHourBadge}>
                                                            <Clock size={12} className={styles.badgeClockIcon} />
                                                            <span>{courseOrientation.formattedWeekStr} &bull; {courseOrientation.hours} Hrs</span>
                                                        </span>
                                                    </div>
                                                    {courseOrientation.description && (
                                                        <div className={styles.kickoffDesc}>
                                                            {courseOrientation.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.kickoffAction}>
                                                    <Link
                                                        className={styles.mapContentsBtnPrimary}
                                                        to={`/topics/form/${orientationWeekId}/${status}?orientation=true`}
                                                    >
                                                        <span>Map Weekly Content</span>
                                                        {status === 'returned' && totalBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{totalBadges}</span>
                                                        )}
                                                        <ChevronRight size={15} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Structured 3-Zone Course Outcome Cards & Milestones */}
                            {coListForGrid.map((co, coIndex, array) => {
                                const gridExams = [];
                                const nextCo = array[coIndex + 1];

                                if (co.coNumber === 1 && (!nextCo || nextCo.coNumber === 2) && !searchTerm) {
                                    gridExams.push(renderExamMilestone('grid-prelim', 'Prelim', null));
                                }
                                if (co.coNumber === 2 && (!nextCo || nextCo.coNumber === 3) && !searchTerm) {
                                    gridExams.push(renderExamMilestone('grid-midterm', 'Midterm', 'Week 9 • 5 Hr'));
                                }
                                if (co.coNumber === 3 && (!nextCo || nextCo.coNumber === 4) && !searchTerm) {
                                    gridExams.push(renderExamMilestone('grid-semifinal', 'Semifinal', null));
                                }
                                if (co.coNumber === 4 && (!nextCo || nextCo.coNumber > 4) && !searchTerm) {
                                    gridExams.push(renderExamMilestone('grid-finals', 'Final', 'Week 18 • 5 Hr'));
                                }

                                const coTotalBadges = (co.weeks || []).reduce(
                                    (sum, w) => sum + getTotalBadgeCount(w.week_id),
                                    0
                                );
                                const targetWeekId = co.weeks?.[0]?.week_id || co.gridIlos[0]?.id || co.co_id;

                                return (
                                    <React.Fragment key={'grid-frag-' + co.co_id}>
                                        <div key={co.co_id} className={styles.roadmapStep}>
                                            <div className={styles.stepNode}>
                                                <span className={styles.nodeCO}>
                                                    CO{co.coNumber}
                                                </span>
                                            </div>
                                            <div className={styles.coCard}>
                                                {/* Zone 1 — Header Strip */}
                                                <div className={styles.coZoneHeader}>
                                                    <div className={styles.coTitleGroup}>
                                                        <span className={styles.coTitle}>
                                                            Course Outcome {co.coNumber}
                                                        </span>
                                                    </div>
                                                    <div className={styles.weekHourBadge}>
                                                        <Clock size={12} className={styles.badgeClockIcon} />
                                                        <span>{co.formattedWeekStr} &bull; {co.hours} Hrs</span>
                                                    </div>
                                                </div>

                                                {/* Zone 2 — Outcome Reference Body */}
                                                <div className={styles.coZoneBody}>
                                                    {co.description && (
                                                        <div className={styles.coDescription}>
                                                            {co.description}
                                                        </div>
                                                    )}

                                                    <div className={styles.iloSectionHeader}>
                                                        <span className={styles.iloSectionLabel}>
                                                            TARGET INTENDED LEARNING OUTCOMES
                                                        </span>
                                                    </div>

                                                    <div className={styles.iloGridRow}>
                                                        {co.gridIlos.map((ilo) => (
                                                            <div key={ilo.id} className={styles.iloRefCard}>
                                                                <div className={styles.iloRefHeader}>
                                                                    <span className={styles.iloBadge}>
                                                                        ILO {ilo.iloNumber}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.iloRefDesc}>
                                                                    {ilo.description}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Zone 3 — Action Footer Bar */}
                                                <div className={styles.coZoneFooter}>
                                                    <span className={styles.coFooterPrompt}>
                                                        Configure weekly topics, TLAs, and references
                                                    </span>
                                                    <Link className={styles.mapContentsBtnPrimary} to={`/topics/form/${targetWeekId}/${status}`}>
                                                        <span>Map Weekly Content</span>
                                                        {status === 'returned' && coTotalBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{coTotalBadges}</span>
                                                        )}
                                                        <ChevronRight size={15} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                        {gridExams}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>
        </section>
    );
};

export default ILOs;
