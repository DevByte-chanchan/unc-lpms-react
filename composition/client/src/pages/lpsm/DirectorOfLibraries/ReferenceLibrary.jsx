import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, BookOpen, FileText, Globe, Upload, AlertTriangle, AlertCircle, X, Maximize, Minimize2 } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import AddReferenceModal from '../../../components/AddReferenceModal.jsx';
import styles from '../../../styles/ReferenceLibrary.module.scss';

import { getReferences, setReferences, addReference, archiveReference, unarchiveReference } from '../../../utils/referenceLibrary.js';
import { fetchJson } from '../../../utils/api.js';
import * as XLSX from 'xlsx';

const PROGRAM_MAP = {
  'BSCS': 'BS Computer Science',
  'BSIT': 'BS Information Technology',
  'BSBA': 'BS Business Administration',
  'BSE': 'BS Education',
  'BSN': 'BS Nursing',
  'BSA': 'BS Accountancy',
  'BSPsych': 'BS Psychology',
  'BSMA': 'BS Management Accounting',
  'BSHM': 'BS Hospitality Management',
  'BSTM': 'BS Tourism Management',
  'BSRT': 'BS Radiologic Technology',
  'BSMT': 'BS Medical Technology',
  'BSPH': 'BS Public Health',
  'BSPT': 'BS Physical Therapy',
  'BSNursing': 'BS Nursing',
  'BSARCH': 'BS Architecture',
  'BSCpE': 'BS Computer Engineering',
  'BSEE': 'BS Electrical Engineering',
  'BSCIE': 'BS Civil Engineering',
  'BSME': 'BS Mechanical Engineering',
  'BSChE': 'BS Chemical Engineering',
  'BSIE': 'BS Industrial Engineering',
  'BSECE': 'BS Electronics Engineering',
  'GE': 'General Education',
};

const DEPARTMENT_MAP = {
  'BSCS': 'School of Computing and Information Sciences',
  'BSIT': 'School of Computing and Information Sciences',
  'BSCpE': 'School of Computing and Information Sciences',
  'BSBA': 'College of Business and Accountancy',
  'BSA': 'College of Business and Accountancy',
  'BSMA': 'College of Business and Accountancy',
  'BSHM': 'College of Business and Accountancy',
  'BSTM': 'College of Business and Accountancy',
  'BSE': 'College of Education and Arts & Sciences',
  'BSPsych': 'College of Education and Arts & Sciences',
  'BSN': 'College of Nursing and Allied Health Sciences',
  'BSRT': 'College of Nursing and Allied Health Sciences',
  'BSMT': 'College of Nursing and Allied Health Sciences',
  'BSPH': 'College of Nursing and Allied Health Sciences',
  'BSPT': 'College of Nursing and Allied Health Sciences',
  'BSARCH': 'College of Engineering and Architecture',
  'BSEE': 'College of Engineering and Architecture',
  'BSCIE': 'College of Engineering and Architecture',
  'BSME': 'College of Engineering and Architecture',
  'BSChE': 'College of Engineering and Architecture',
  'BSIE': 'College of Engineering and Architecture',
  'BSECE': 'College of Engineering and Architecture',
  'GE': 'General Education Department',
};

const extractProgramPrefix = (code) => {
  if (!code) return 'GE';
  const match = code.match(/^([A-Za-z]+)/);
  if (!match) return 'GE';
  const prefix = match[1].toUpperCase();
  if (prefix.startsWith('BSCS')) return 'BSCS';
  if (prefix.startsWith('BSIT')) return 'BSIT';
  if (prefix.startsWith('BSCPE') || prefix.startsWith('BSCP')) return 'BSCpE';
  if (prefix.startsWith('BSBA')) return 'BSBA';
  if (prefix.startsWith('BSA')) return 'BSA';
  if (prefix.startsWith('BSMA')) return 'BSMA';
  if (prefix.startsWith('BSHM')) return 'BSHM';
  if (prefix.startsWith('BSTM')) return 'BSTM';
  if (prefix.startsWith('BSE')) return 'BSE';
  if (prefix.startsWith('BSPSYCH')) return 'BSPsych';
  if (prefix.startsWith('BSN')) return 'BSN';
  if (prefix.startsWith('BSRT')) return 'BSRT';
  if (prefix.startsWith('BSMT')) return 'BSMT';
  if (prefix.startsWith('BSPH')) return 'BSPH';
  if (prefix.startsWith('BSPT')) return 'BSPT';
  if (prefix.startsWith('BSARCH')) return 'BSARCH';
  if (prefix.startsWith('BSEE')) return 'BSEE';
  if (prefix.startsWith('BSCIE') || prefix.startsWith('BSCE')) return 'BSCIE';
  if (prefix.startsWith('BSME')) return 'BSME';
  if (prefix.startsWith('BSCH')) return 'BSChE';
  if (prefix.startsWith('BSIE')) return 'BSIE';
  if (prefix.startsWith('BSECE') || prefix.startsWith('BSELEC')) return 'BSECE';
  return 'GE';
};

const getProgramName = (prefix) => PROGRAM_MAP[prefix] || PROGRAM_MAP['GE'];
const getDepartmentName = (prefix) => DEPARTMENT_MAP[prefix] || DEPARTMENT_MAP['GE'];

const DEPARTMENT_COLORS = {
  'School of Computing and Information Sciences': '#3b82f6',
  'College of Business and Accountancy': '#f97316',
  'College of Education and Arts & Sciences': '#ec4899',
  'College of Nursing and Allied Health Sciences': '#14b8a6',
  'College of Engineering and Architecture': '#a855f7',
  'General Education Department': '#6b7280',
};

const DEPARTMENT_SHORT = {
  'School of Computing and Information Sciences': 'SCIS',
  'College of Business and Accountancy': 'CBA',
  'College of Education and Arts & Sciences': 'CEAS',
  'College of Nursing and Allied Health Sciences': 'CNAHS',
  'College of Engineering and Architecture': 'CEA',
  'General Education Department': 'GenEd',
};

const getDeptColor = (dept) => DEPARTMENT_COLORS[dept] || '#9ca3af';
const getDeptShort = (dept) => DEPARTMENT_SHORT[dept] || dept;

const ReferenceLibrary = () => {
  const [references, setReferencesState] = useState(() => getReferences(true));
  const [addRefOpen, setAddRefOpen] = useState(false);
  const [editRef, setEditRef] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tab, setTab] = useState('active');
  const activeRefs = useMemo(() => references.filter(r => !r.archived), [references]);
  const archivedRefs = useMemo(() => references.filter(r => r.archived), [references]);
  const CURRENT_YEAR = new Date().getFullYear();
  const isDeprecated = (ref) => {
    if (!ref.year) return false;
    const y = typeof ref.year === 'string' ? parseInt(ref.year) : ref.year;
    return !isNaN(y) && CURRENT_YEAR - y >= 5;
  };

  /* ── Load references from the server (seeded DB data) and merge with local ── */
  useEffect(() => {
    let mounted = true;
    const TYPE_MAP = { TEXTBOOK: 'Textbook', ONLINE: 'Online Resources', OER: 'Open Educational Resources' };
    // old hardcoded demo entries — swept from localStorage on sync
    const LEGACY_DUMMY_IDS = new Set(['TB-DEP-001', 'OR-ISS-001', 'OE-DEP-002', 'TB-BUS-001', 'TB-EDU-001', 'OE-NUR-001', 'OR-ENG-001', 'TB-CS-002', 'OE-BUS-002', 'TB-ENG-002', 'TB-VOLD-001', 'NUR-OBS-001']);

    async function syncLibrary() {
      try {
        const rows = await fetchJson('/api/references/library');
        if (!mounted || !Array.isArray(rows) || rows.length === 0) return;

        const existing = getReferences(true);
        const byId = new Map(existing.map(r => [String(r.id), r]));

        const synced = rows.map(r => {
          const id = `srv-${r.reference_id}`;
          const prev = byId.get(id);
          const usedInCourses = r.used_in_courses ? String(r.used_in_courses).split(',').filter(Boolean) : [];
          const prefixes = [...new Set(usedInCourses.map(c => extractProgramPrefix(c)))];
          const programs = [...new Set(prefixes.map(p => getProgramName(p)))].filter(Boolean);
          const departments = [...new Set(prefixes.map(p => getDepartmentName(p)))].filter(Boolean);
          const year = r.publication_year ? parseInt(String(r.publication_year).slice(0, 4), 10) : '';
          return {
            id,
            numericId: r.reference_id,
            title: r.title,
            authors: r.author || '',
            type: TYPE_MAP[r.type] || r.type,
            year: Number.isNaN(year) ? '' : year,
            isbn: r.isbn || '',
            link: r.link || '',
            publisher: prev?.publisher || '',
            filename: prev?.filename || '',
            uploadDate: (r.createdAt || '').slice(0, 10),
            // locally-managed flags survive re-syncs
            hasIssue: prev?.hasIssue || false,
            archived: prev?.archived || false,
            departments: departments.length ? departments : (prev?.departments || []),
            programs: programs.length ? programs : (prev?.programs || []),
            usedInCourses,
          };
        });

        // keep locally-added references, drop server copies + legacy hardcoded demos
        const locals = existing.filter(r => !String(r.id).startsWith('srv-') && !LEGACY_DUMMY_IDS.has(String(r.id)));
        const merged = [...synced, ...locals];
        setReferences(merged);
        if (mounted) setReferencesState(merged);
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Reference library sync skipped:', e?.message);
      }
    }

    syncLibrary();
    return () => { mounted = false; };
  }, []);

  /* ── Sync when references change ─────────────────────────────────── */
  const syncReferences = (newRefs) => {
    setReferences(newRefs);
    setReferencesState(getReferences(true));
  };

  /* ── Bulk Upload ─────────────────────────────────────────────────── */
  const handleBulkUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        let added = 0;
        let skipped = 0;
        const existingIds = new Set(getReferences(true).map(r => r.id));

        rows.forEach((row) => {
          const title = (row['Title'] || row['title'] || '').toString().trim();
          const authors = (row['Author(s)'] || row['Authors'] || row['author'] || row['authors'] || '').toString().trim();
          const type = (row['Reference Type'] || row['Type'] || row['type'] || '').toString().trim();
          const year = row['Year'] || row['year'] || '';
          const isbn = (row['ISBN'] || row['isbn'] || '').toString().trim();
          const link = (row['Link'] || row['link'] || row['URL'] || row['url'] || '').toString().trim();
          const department = (row['Department'] || row['department'] || '').toString().trim();
          const program = (row['Program'] || row['program'] || '').toString().trim();
          const courseCode = (row['Course Code'] || row['courseCode'] || row['Course'] || row['course'] || '').toString().trim();

          if (!title || !type) {
            skipped++;
            return;
          }

          const refId = `${type === 'Textbook' ? 'TB' : type === 'Open Educational Resources' ? 'OE' : 'OR'}${Date.now()}-${added}`;
          if (existingIds.has(refId)) {
            skipped++;
            return;
          }

          addReference({
            id: refId,
            title,
            authors,
            type,
            year: year ? parseInt(year) : '',
            isbn,
            link,
            publisher: '',
            filename: '',
            uploadDate: new Date().toISOString().split('T')[0],
            hasIssue: false,
            archived: false,
            departments: department ? [department] : [],
            programs: program ? [program] : [],
            usedInCourses: courseCode ? [courseCode] : [],
          });

          existingIds.add(refId);
          added++;
        });

        const updated = getReferences(true);
        syncReferences(updated);
        setBulkResult({ added, skipped, total: rows.length });
        setShowBulkModal(true);
      } catch (err) {
        console.error('Bulk upload failed:', err);
        alert('Failed to parse the Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  /* ── Modal states ───────────────────────────────────────────────────── */
  const [viewRef, setViewRef] = useState(null);
  const [archiveRef, setArchiveRef] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ── Stats ─────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = activeRefs.length;
    const textbooks = activeRefs.filter((r) => r.type === 'Textbook').length;
    const oer = activeRefs.filter((r) => r.type === 'Open Educational Resources').length;
    const online = activeRefs.filter((r) => r.type === 'Online Resources').length;
    const deprecated = activeRefs.filter(isDeprecated).length;
    return { total, textbooks, oer, online, deprecated };
  }, [activeRefs]);

  /* ── Filter ────────────────────────────────────────────────────────── */
  const sourceRefs = tab === 'archived' ? archivedRefs : activeRefs;

  const allDepartments = useMemo(() => {
    const deps = new Set();
    activeRefs.forEach(r => (r.departments || []).forEach(d => deps.add(d)));
    return Array.from(deps).sort();
  }, [activeRefs]);

  const filtered = useMemo(() => {
    let result = sourceRefs;
    if (filterType) {
      result = result.filter((r) => r.type === filterType);
    }
    if (filterDepartment) {
      result = result.filter((r) => (r.departments || []).includes(filterDepartment));
    }
    return result;
  }, [sourceRefs, filterType, filterDepartment]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const confirmArchive = () => {
    if (archiveRef) {
      archiveReference(archiveRef.id);
      setReferencesState(getReferences(true));
      setArchiveRef(null);
    }
  };

  const confirmUnarchive = (id) => {
    unarchiveReference(id);
    setReferencesState(getReferences(true));
  };

  const handleClose = () => {
    setViewRef(null);
  };

  const showPageToast = (message, type = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  /* ── Content ───────────────────────────────────────────────────────── */
  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>REFERENCE LIBRARY</h1>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}><BookOpen size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total References</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}><BookOpen size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.textbooks}</div>
            <div className={styles.statLabel}>Textbooks</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconTeal}`}><FileText size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.oer}</div>
            <div className={styles.statLabel}>Open Educational Resources</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconPurple}`}><Globe size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.online}</div>
            <div className={styles.statLabel}>Online Resources</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconYellow}`}><AlertTriangle size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.deprecated}</div>
            <div className={styles.statLabel}>Deprecated (5+ yrs)</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controlsBar}>
        <div className={'filter-container'}>
          <p>Filter by <strong>Department</strong>:</p>
          <select value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); }}>
            <option value="">All Departments</option>
            {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className={'filter-container'}>
          <p>Filter by <strong>Type</strong>:</p>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Textbook">Textbook</option>
            <option value="Open Educational Resources">Open Educational Resources</option>
            <option value="Online Resources">Online Resources</option>
          </select>
        </div>
        <div className={styles.actionsGroup} data-collapsible-buttons>
          <button className={styles.addBtn} type="button" onClick={() => { setEditRef(null); setAddRefOpen(true); }}>
            <Plus size={16} /><span className="btn-label">Add Reference</span>
          </button>
          <button className={styles.bulkBtn} type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /><span className="btn-label">Bulk Upload</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleBulkUpload}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <button onClick={() => setTab('active')} style={{ padding: '10px 0', fontSize: 14, fontWeight: 600, fontFamily: "'Poppins', sans-serif", background: 'none', border: 'none', color: tab === 'active' ? '#1e3a5f' : '#6b7280', cursor: 'pointer' }}>
          Active References ({activeRefs.length})
        </button>
        <button onClick={() => setTab('archived')} style={{ padding: '10px 0', fontSize: 14, fontWeight: 600, fontFamily: "'Poppins', sans-serif", background: 'none', border: 'none', color: tab === 'archived' ? '#dc2626' : '#6b7280', cursor: 'pointer' }}>
          Archived ({archivedRefs.length})
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th width={140}>ID</th>
              <th width={420}>TITLE</th>
              <th width={260}>AUTHOR(S)</th>
              <th width={210}>TYPE</th>
              <th width={90}>YEAR</th>
              <th className="fill"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((ref) => (
                <tr key={ref.id} className={isDeprecated(ref) ? styles.rowDeprecated : ''}>
                  <td width={140} className={styles.cellNowrap}>{ref.id}</td>
                  <td width={420}>
                    <div className={styles.titleCell}>
                      <span className={styles.refTitle}>{ref.title}</span>
                      {ref.filename && <span className={styles.refFilename}>{ref.filename}</span>}
                    </div>
                  </td>
                  <td width={260}>{ref.authors}</td>
                  <td width={210} className={styles.cellNowrap}>{ref.type}</td>
                  <td width={90} className={styles.cellNowrap}>{ref.year || '—'}</td>
                  <td className="fill">
                    <div className={styles.actionGroup}>
                      <button className={styles.actionView} type="button" onClick={() => setViewRef(ref)}>View</button>
                      <span className={styles.actionDot}>·</span>
                      <button className={styles.actionEdit} type="button" onClick={() => { setEditRef(ref); setAddRefOpen(true); }}>Edit</button>
                      {tab === 'archived' ? (
                        <>
                          <span className={styles.actionDot}>·</span>
                          <button className={styles.actionEdit} type="button" onClick={() => confirmUnarchive(ref.id)} style={{ color: '#047857' }}>Unarchive</button>
                        </>
                      ) : (
                        <>
                          <span className={styles.actionDot}>·</span>
                          <button className={styles.actionDelete} type="button" onClick={() => setArchiveRef(ref)}>Archive</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className={styles.noData}>No {tab === 'archived' ? 'archived' : ''} references found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── VIEW MODAL ──────────────────────────────────────────────────── */}
      {viewRef && (
        <>
          {!isFullscreen && <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2999 }} />}
          <div role="dialog" aria-modal="true" aria-label="Reference details" style={isFullscreen ? { position: 'fixed', inset: 0, zIndex: 3000, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', maxWidth: '100%', maxHeight: '100%', borderRadius: 0 } : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3000 }} className={styles.viewModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>REFERENCE DETAILS</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setIsFullscreen(v => !v)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label="Toggle fullscreen" style={{ background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#334155', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, padding: 0, lineHeight: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >{isFullscreen ? <Minimize2 size={14} /> : <Maximize size={14} />}</button>
                <button onClick={handleClose} aria-label="Close" style={{ background: '#E81123', border: '1px solid #E81123', cursor: 'pointer', color: '#fff', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, padding: 0, lineHeight: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; e.currentTarget.style.borderColor = '#B91C1C'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#E81123'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#E81123'; }}
                ><X size={14} /></button>
              </div>
            </div>
            <div className={styles.modalBody} style={isFullscreen ? { flex: 1, overflow: 'auto' } : {}}>
              {/* ── Title block: name, authors, status chips ── */}
              <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {(() => {
                    const t = viewRef.type || ''
                    const c = t === 'Textbook'
                      ? { background: '#e0f2fe', color: '#0369a1' }
                      : t === 'Online Resources'
                        ? { background: '#ede9fe', color: '#6d28d9' }
                        : { background: '#fef3c7', color: '#92400e' }
                    return <span style={{ ...c, padding: '3px 10px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600 }}>{t || 'Reference'}</span>
                  })()}
                  {viewRef.year && (
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600 }}>{viewRef.year}</span>
                  )}
                  {isDeprecated(viewRef) && (
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={12} /> 5+ years old
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.35 }}>{viewRef.title}</h3>
                {viewRef.authors && <div style={{ marginTop: 4, fontSize: '0.85rem', color: '#64748b' }}>{viewRef.authors}</div>}
              </div>

              {isDeprecated(viewRef) && (
                <div className={styles.warningBanner}>
                  <AlertTriangle size={16} /> This reference is over 5 years old and may be outdated.
                </div>
              )}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Basic Information</h3>
                <div className={styles.modalRow}><span className={styles.modalLabel}>REFERENCE ID</span><span className={styles.modalValue}>{viewRef.id}</span></div>
                {viewRef.isbn && <div className={styles.modalRow}><span className={styles.modalLabel}>ISBN</span><span className={styles.modalValue}>{viewRef.isbn}</span></div>}
                {viewRef.link && <div className={styles.modalRow}><span className={styles.modalLabel}>LINK</span><a href={viewRef.link} target="_blank" rel="noopener noreferrer" className={styles.modalLink}>{viewRef.link}</a></div>}
                {viewRef.publisher && <div className={styles.modalRow}><span className={styles.modalLabel}>PUBLISHER</span><span className={styles.modalValue}>{viewRef.publisher}</span></div>}
                {viewRef.filename && <div className={styles.modalRow}><span className={styles.modalLabel}>FILE</span><span className={styles.modalValue}>{viewRef.filename}</span></div>}
              </div>

              {(viewRef.usedInCourses || []).length > 0 && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Used in Courses</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '4px 0' }}>
                    {viewRef.usedInCourses.map((code, i) => (
                      <span key={i} style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600 }}>{code}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Department</h3>
                {(viewRef.departments || []).length > 0 ? (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>DEPARTMENT</span>
                    <span className={styles.modalValue} style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 6 }}>
                      {(viewRef.departments || []).map((d, i) => (
                        <span key={i} className={styles.deptBadge} style={{ backgroundColor: getDeptColor(d) + '1a', color: getDeptColor(d), borderLeft: `3px solid ${getDeptColor(d)}`, whiteSpace: 'nowrap' }}>
                          <span className={styles.deptBadgeShort}>{getDeptShort(d)}</span>
                          <span className={styles.deptBadgeFull}>{d}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                ) : (
                  <div className={styles.modalRow}><span className={styles.modalLabel}>DEPARTMENT</span><span className={styles.modalValue} style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not assigned</span></div>
                )}
              </div>

              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Metadata</h3>
                <div className={styles.modalRow}><span className={styles.modalLabel}>UPLOAD DATE</span><span className={styles.modalValue}>{viewRef.uploadDate ? new Date(viewRef.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span></div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnEdit} onClick={() => { setViewRef(null); setEditRef(viewRef); setAddRefOpen(true); }}>Edit Reference</button>
              <button className={styles.modalBtnClose} onClick={() => setViewRef(null)}>Close</button>
            </div>
          </div>
        </>
      )}

      {/* ── ARCHIVE CONFIRMATION MODAL ──────────────────────────────────── */}
      {archiveRef && (
        <div className={styles.modalOverlay} onClick={() => setArchiveRef(null)}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H3" /><path d="M8 2v2" /><path d="M16 2v2" /><rect x="5" y="6" width="14" height="16" rx="2" /><line x1="10" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className={styles.deleteTitle}>Archive Reference</h3>
            <p className={styles.deleteText}>Are you sure you want to archive <strong>"{archiveRef.title}"</strong>? Archived references will only be visible to the Director of Libraries.</p>
            <div className={styles.deleteActions}>
              <button className={styles.deleteBtnCancel} onClick={() => setArchiveRef(null)}>Cancel</button>
              <button className={styles.deleteBtnConfirm} onClick={confirmArchive} style={{ background: '#b45309' }}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD RESULT MODAL ────────────────────────────────────── */}
      {showBulkModal && bulkResult && (
        <div className={styles.modalOverlay} onClick={() => { setShowBulkModal(false); setBulkResult(null); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Bulk Upload Result</h2>
              <button className={styles.modalClose} onClick={() => { setShowBulkModal(false); setBulkResult(null); }}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="16 8 10 16 7 13" />
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#047857' }}>{bulkResult.added}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Added</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#b45309' }}>{bulkResult.skipped}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Skipped</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#000' }}>{bulkResult.total}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Total Rows</div>
                </div>
              </div>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: 0 }}>
                Expected columns: <strong>Title</strong>, <strong>Author(s)</strong>, <strong>Reference Type</strong>, <strong>Year</strong>, <strong>ISBN</strong>, <strong>Link</strong>
              </p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnClose} onClick={() => { setShowBulkModal(false); setBulkResult(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const handleModalSaved = (result) => {
    setReferencesState(getReferences(true));
    if (result?.message) showPageToast(result.message, result.type);
  };

  const handleModalError = (result) => {
    if (result?.message) showPageToast(result.message, result.type || 'error');
  };

  return (
    <>
      <SkeletonA
        header={<HeaderA role="Director of Libraries" name="SANTOS, MARIA" />}
        nav={<SideNavigation mode="director-of-libraries" />}
        content={content}
      />
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          background: toast.type === 'error' ? '#b91c1c' : '#047857',
          color: '#fff', padding: '14px 22px', borderRadius: 8,
          fontSize: 14, fontWeight: 500,
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
          fontFamily: "'Poppins', sans-serif",
        }}>
          {toast.message}
        </div>
      )}
      <AddReferenceModal
        show={addRefOpen}
        onClose={() => setAddRefOpen(false)}
        refToEdit={editRef}
        onSaved={handleModalSaved}
        onError={handleModalError}
      />
    </>
  );
};

export default ReferenceLibrary;
