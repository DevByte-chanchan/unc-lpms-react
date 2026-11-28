import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronRight } from 'react-feather';
import styles from '../styles/Dashboard.module.sass';
import Select from './Select.jsx';

const MiniAssignedTOS = () => {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(
            <option key={i} value={String(i)}>
                {`${i} - ${i + 1}`}
            </option>
        );
    }

    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedSem, setSelectedSem] = useState(semOptions[0]);
    const [selectedStatus, setSelectedStatus] = useState('DRAFT');

    const isDefaultCurrentTerm = String(selectedYear) === String(currentYear) && selectedSem === semOptions[0];
    const isPastYear = String(selectedYear) !== String(currentYear);

    useEffect(() => {
        if (isPastYear) {
            setSelectedStatus('APPROVED');
        } else if (selectedStatus === 'APPROVED' && isDefaultCurrentTerm) {
            setSelectedStatus('DRAFT');
        }
    }, [selectedYear]);

    const allStatusTabs = [
        { key: 'DRAFT', label: 'Draft', count: isDefaultCurrentTerm ? 1 : 0 },
        { key: 'PENDING', label: 'Pending', count: 0 },
        { key: 'RETURNED', label: 'Returned', count: 0 },
        { key: 'APPROVED', label: 'Approved', count: 0 },
    ];
    const statusTabs = isPastYear ? allStatusTabs.filter((t) => t.key === 'APPROVED') : allStatusTabs;
    const totalCount = isDefaultCurrentTerm ? 1 : 0;
    const currentTab = statusTabs.find((t) => t.key === selectedStatus);

    return (
        <div className={styles.blockCard}>
            {/* Header Strip */}
            <div className={styles.blockHeader}>
                <div className={styles.blockTitleGroup}>
                    <h3>Assigned TOS</h3>
                    <span className={styles.totalBadge}>Total: {totalCount}</span>
                </div>

                <div className={styles.headerActions}>
                    {/* Year & Semester dropdowns — left of status filter */}
                    <div className={styles.miniTermFilters}>
                        <Select
                            variant="pill"
                            size="sm"
                            value={String(selectedYear)}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            aria-label="School year"
                        >
                            {yearOptions}
                        </Select>

                        <Select
                            variant="pill"
                            size="sm"
                            value={selectedSem}
                            onChange={(e) => setSelectedSem(e.target.value)}
                            aria-label="Semester"
                        >
                            {semOptions.map(sem => (
                                <option key={sem} value={sem}>
                                    {sem === '1st Sem' ? '1st Semester' : sem === '2nd Sem' ? '2nd Semester' : sem}
                                </option>
                            ))}
                        </Select>
                    </div>

                    {/* Status filter tabs / segmented control */}
                    <div className={styles.segmentedControl}>
                        {statusTabs.map((tab) => {
                            const active = selectedStatus === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`${styles.controlItem} ${active ? styles.active : ''}`}
                                    onClick={() => setSelectedStatus(tab.key)}
                                >
                                    <span>{tab.label}</span>
                                    <span className={styles.itemBadge}>{tab.count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ExternalLink icon button directing to assigned course offerings page */}
                    <button
                        type="button"
                        className={styles.goToIconBtn}
                        onClick={() => navigate('/assigned-courses')}
                        title="Go to Assigned TOS"
                        aria-label="Go to Assigned TOS"
                    >
                        <ExternalLink size={20} color="#334155" />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className={styles.blockBody}>
                {isDefaultCurrentTerm && selectedStatus === 'DRAFT' ? (
                    <div className={styles.miniGridContainer}>
                        <div className={styles.miniCard}>
                            <div className={styles.miniCardMain}>
                                <div className={styles.miniCardHeader}>
                                    <span className={styles.miniCardCode}>BIT213L</span>
                                    <span className={styles.miniCardDate}>2026-06-01</span>
                                </div>
                                <div className={styles.miniCardTitle} title="Object-Oriented Programming">
                                    Object-Oriented Programming
                                </div>
                                <div className={styles.miniCardFooter}>
                                    <button
                                        type="button"
                                        className={styles.miniActionBtn}
                                        onClick={() => navigate('/assigned-courses')}
                                    >
                                        Compose <ChevronRight size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        No {currentTab?.label || selectedStatus} table of specifications found for {selectedYear} - {Number(selectedYear) + 1} ({selectedSem}).
                    </div>
                )}
            </div>
        </div>
    );
};

export default MiniAssignedTOS;
