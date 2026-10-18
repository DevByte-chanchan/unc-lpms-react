import React, { useState, useRef, useEffect } from "react";
import styles from "../styles/TosSummary.module.sass";

/* ---------- Presentational components (props only, no data logic) ---------- */

const LevelTile = ({ level, points }) => {
    const hasPoints = Number(points) > 0;
    return (
        <div
            className={`${styles.tile} ${hasPoints ? styles.tileActive : styles.tileZero}`}
            title={`${level}: ${hasPoints ? points : 0} point${points === 1 ? '' : 's'}`}
        >
            <span className={styles.tileLevel}>{level}</span>
            <span className={styles.tileValue}>{hasPoints ? points : '–'}</span>
        </div>
    );
};

const IloCard = ({ ilo, levelPoints, totalPoints, mismatch, diff }) => (
    <div className={styles.iloCard}>
        <div className={styles.iloHead}>
            <div className={styles.iloTitle}>
                <span className={styles.iloCode}>{ilo.id}</span>
                <span className={styles.iloDesc}>{ilo.description}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {mismatch && (
                    <span
                        className={styles.warnIcon}
                        title={`Target (${ilo.items}) ≠ row total (${totalPoints}): ${diff > 0 ? `+${diff}` : diff} pts`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#B45309', fontSize: 12, fontWeight: 500 }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{diff > 0 ? `+${diff}` : diff} pts</span>
                    </span>
                )}
                <span className={styles.iloBadge}>{totalPoints} pts</span>
            </div>
        </div>
        <div className={styles.tiles}>
            {levelPoints.map(({ level, points }) => (
                <LevelTile key={level} level={level} points={points} />
            ))}
        </div>
    </div>
);

const CoHeader = ({ co, totalPoints, iloSum, mismatch, diff }) => (
    <div className={styles.coHeader}>
        <div>
            <h3 className={styles.coCode}>{co.co}</h3>
            <p className={styles.coDesc}>{co.description}</p>
        </div>
        <div className={styles.coBadgeWrap}>
            {mismatch && (
                <span
                    className={styles.warnIcon}
                    tabIndex={0}
                    role="img"
                    aria-label={`Warning: target is ${totalPoints} points but rows sum to ${iloSum} points (${diff > 0 ? `+${diff}` : diff} pts)`}
                    title={`Target (${totalPoints}) ≠ row total (${iloSum}): ${diff > 0 ? `+${diff}` : diff} pts`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#B45309', fontSize: 12, fontWeight: 500 }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>{diff > 0 ? `+${diff}` : diff} pts</span>
                </span>
            )}
            <span className={styles.coBadge}>Total Points <b>{totalPoints}</b></span>
        </div>
    </div>
);

const CoTabs = ({ cos, selectedCo, onSelect, tabRefs }) => {
    const handleKeyDown = (e) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(e.key)) return;
        e.preventDefault();
        const idx = cos.findIndex(c => c.co === selectedCo);
        let nextIdx;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % cos.length;
        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + cos.length) % cos.length;
        else if (e.key === 'Home') nextIdx = 0;
        else nextIdx = cos.length - 1;
        const next = cos[nextIdx];
        if (!next) return;
        onSelect(next.co);
        const el = tabRefs.current[next.co];
        if (el) el.focus();
    };

    return (
        <div className={styles.tabs} role="tablist" aria-label="Course outcomes" onKeyDown={handleKeyDown}>
            <div className={styles.tabGroup} role="presentation">
                {cos.map(co => {
                    const isSelected = co.co === selectedCo;
                    return (
                        <button
                            key={co.co}
                            type="button"
                            role="tab"
                            id={`co-tab-${co.co}`}
                            aria-selected={isSelected}
                            aria-controls="co-panel"
                            tabIndex={isSelected ? 0 : -1}
                            ref={el => { tabRefs.current[co.co] = el; }}
                            onClick={() => onSelect(co.co)}
                            className={`${styles.tab} ${isSelected ? styles.tabActive : ''}`}
                        >
                            {co.co}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

/* ---------- Main component (existing logic untouched) ---------- */

const TOSSummary = ({ outcomeData, questions }) => {
    const cognitiveLevels = [
        'Remembering',
        'Understanding',
        'Applying',
        'Analyzing',
        'Evaluating',
        'Creating'
    ];



    const getAggregatedData = () => {
        const data = {};
        outcomeData.forEach(co => {
            data[co.co] = {};
            co.ilos.forEach(ilo => {
                data[co.co][ilo.id] = {};
                cognitiveLevels.forEach(level => {
                    data[co.co][ilo.id][level] = [];
                });
            });
        });
        questions.forEach(q => {
            if (q.co && q.ilo && q.cognitiveLevel && data[q.co] && data[q.co][q.ilo]) {
                const span = q.span || 1;
                const pts = (q.points && String(q.points).trim()) ? Number(q.points) : 0;
                data[q.co][q.ilo][q.cognitiveLevel].push({ span, points: pts });
            }
        });
        return data;
    };

    const aggregatedData = getAggregatedData();

    const [selectedCo, setSelectedCo] = useState(outcomeData?.[0]?.co || null);
    const tabRefs = useRef({});

    // keep selection valid if outcomeData changes (e.g. different course loaded)
    useEffect(() => {
        if (!outcomeData || outcomeData.length === 0) {
            setSelectedCo(null);
            return;
        }
        if (!outcomeData.some(co => co.co === selectedCo)) {
            setSelectedCo(outcomeData[0].co);
        }
    }, [outcomeData, selectedCo]);

    const tabsData = (outcomeData || []).map(co => ({
        co: co.co
    }));

    const activeCo = (outcomeData || []).find(co => co.co === selectedCo) || null;

    let panel = null;
    if (activeCo) {
        const ilosData = (activeCo.ilos || []).map(ilo => {
            const levelPoints = cognitiveLevels.map(level => ({
                level,
                points: aggregatedData[activeCo.co]?.[ilo.id]?.[level]?.reduce((s, item) => s + (Number(item.points) || 0), 0) ?? 0
            }));
            const iloTotal = levelPoints.reduce((s, lp) => s + lp.points, 0);
            const iloTarget = Number(ilo.items) || 0;
            const iloMismatch = iloTotal !== iloTarget;
            const iloDiff = iloTotal - iloTarget;
            return { ilo, levelPoints, iloTotal, iloMismatch, iloDiff };
        });
        const iloSum = ilosData.reduce((s, d) => s + d.iloTotal, 0);
        const coTarget = Number(activeCo.totalPoints) || 0;
        const coMismatch = iloSum !== coTarget;
        const coDiff = iloSum - coTarget;

        panel = (
            <div
                className={styles.panel}
                role="tabpanel"
                id="co-panel"
                aria-labelledby={`co-tab-${activeCo.co}`}
                tabIndex={0}
            >
                <CoHeader co={activeCo} totalPoints={coTarget} iloSum={iloSum} mismatch={coMismatch} diff={coDiff} />
                <div className={styles.iloList}>
                    {ilosData.map(({ ilo, levelPoints, iloTotal, iloMismatch, iloDiff }) => (
                        <IloCard key={ilo.id} ilo={ilo} levelPoints={levelPoints} totalPoints={iloTotal} mismatch={iloMismatch} diff={iloDiff} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.summary}>
            {tabsData.length > 0 && (
                <CoTabs cos={tabsData} selectedCo={selectedCo} onSelect={setSelectedCo} tabRefs={tabRefs} />
            )}
            {panel}
        </div>
    );
};

export default TOSSummary;
