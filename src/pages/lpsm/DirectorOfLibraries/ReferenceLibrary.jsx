import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookOpen, FileText, Globe, Upload, AlertTriangle, AlertCircle } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import styles from './ReferenceLibrary.module.scss';

import { getReferences, setReferences, addReference, updateReference, deleteReference, archiveReference, unarchiveReference, getReferenceComments, addReferenceComment } from '../../../utils/referenceLibrary.js';
import { getRoleName } from '../../../utils/roleIdentities.js';
import { syllabiData } from '../../../data/syllabiData.js';
import * as XLSX from 'xlsx';

const ReferenceLibrary = () => {
  const navigate = useNavigate();
  const [references, setReferencesState] = useState(() => getReferences(true));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
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
  const hasIssues = (ref) => ref.hasIssue === true;

  /* ── Seed from instructor data on first load ─────────────────────── */
  useEffect(() => {
    const existing = getReferences(true);
    if (existing.length === 0) {
      const seeded = [];
      let numericId = 0;
      const seenIds = new Set();
      syllabiData.forEach(s => {
        if (s.references && Array.isArray(s.references)) {
          s.references.forEach(ref => {
            if (!seenIds.has(ref.id)) {
              seenIds.add(ref.id);
              numericId++;
              seeded.push({
                id: ref.id,
                numericId,
                title: ref.title,
                authors: ref.authors,
                type: ref.type,
                year: ref.year || '',
                isbn: ref.isbn || '',
                link: ref.link || '',
                publisher: ref.publisher || '',
                filename: ref.filename || '',
                uploadDate: new Date().toISOString().split('T')[0],
                hasIssue: false,
                archived: false,
              });
            }
          });
        }
      });
      setReferences(seeded);
      setReferencesState(seeded);

      // Add sample deprecated & issue references
      const sampleRefs = getReferences(true);
      const extraRefs = [
        {
          id: 'TB-DEP-001',
          numericId: 9991,
          title: 'Introduction to Algorithms (3rd Edition)',
          authors: 'Cormen, T., Leiserson, C., Rivest, R., Stein, C.',
          type: 'Textbook',
          year: 2009,
          isbn: '978-0-262-03384-8',
          link: '',
          publisher: 'MIT Press',
          filename: '',
          uploadDate: '2015-06-01',
          hasIssue: false,
          archived: false,
        },
        {
          id: 'OR-ISS-001',
          numericId: 9992,
          title: 'Legacy Software Architecture Patterns',
          authors: 'Garcia, M.',
          type: 'Online Resources',
          year: 2014,
          isbn: '',
          link: 'https://example.com/legacy-arch',
          publisher: '',
          filename: '',
          uploadDate: '2016-03-15',
          hasIssue: true,
          archived: false,
        },
        {
          id: 'OE-DEP-002',
          numericId: 9993,
          title: 'Foundations of Computer Science (Outdated Edition)',
          authors: 'Aho, A., Ullman, J.',
          type: 'Open Educational Resources',
          year: 2010,
          isbn: '',
          link: 'https://example.com/old-cs-foundations',
          publisher: 'Stanford Open Library',
          filename: '',
          uploadDate: '2012-11-20',
          hasIssue: false,
          archived: false,
        },
      ];
      extraRefs.forEach(r => addReference(r));
      setReferencesState(getReferences(true));
    }
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
  const [viewComments, setViewComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef(null);

  /* ── Load comments when viewRef changes ────────────────────────────── */
  useEffect(() => {
    if (viewRef) {
      setViewComments(getReferenceComments(viewRef.id));
      setCommentText('');
    }
  }, [viewRef]);

  /* ── Stats ─────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = activeRefs.length;
    const textbooks = activeRefs.filter((r) => r.type === 'Textbook').length;
    const oer = activeRefs.filter((r) => r.type === 'Open Educational Resources').length;
    const online = activeRefs.filter((r) => r.type === 'Online Resources').length;
    const deprecated = activeRefs.filter(isDeprecated).length;
    const issues = activeRefs.filter(hasIssues).length;
    return { total, textbooks, oer, online, deprecated, issues };
  }, [activeRefs]);

  /* ── Filter ────────────────────────────────────────────────────────── */
  const sourceRefs = tab === 'archived' ? archivedRefs : activeRefs;
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let result = sourceRefs;
    if (filterType) {
      result = result.filter((r) => r.type === filterType);
    }
    if (term) {
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          r.authors.toLowerCase().includes(term) ||
          (r.publisher || '').toLowerCase().includes(term)
      );
    }
    return result;
  }, [sourceRefs, searchTerm, filterType]);

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

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'Textbook': return styles.typeBadgeBook;
      case 'Open Educational Resources': return styles.typeBadgeJournal;
      case 'Online Resources': return styles.typeBadgeArticle;
      default: return styles.typeBadgeBook;
    }
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
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconRed}`}><AlertCircle size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.issues}</div>
            <div className={styles.statLabel}>With Issues</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper} style={{ maxWidth: 'none', flex: 1 }}>
          <Search size={16} className={styles.searchIconSvg} />
          <input type="text" placeholder="Search references by title, author, or keyword..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} />
        </div>
        <div className={'filter-container'} style={{ flexShrink: 0 }}>
          <p>Filter by <strong>Reference Type</strong>:</p>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Textbook">Textbook</option>
            <option value="Open Educational Resources">Open Educational Resources</option>
            <option value="Online Resources">Online Resources</option>
          </select>
        </div>
        <button className={styles.addBtn} type="button" onClick={() => navigate('/role/director-of-libraries/add-reference')} style={{ flexShrink: 0 }}>
          <Plus size={16} /><span>Add Reference</span>
        </button>
        <button className={styles.bulkBtn} type="button" onClick={() => fileInputRef.current?.click()} style={{ flexShrink: 0 }}>
          <Upload size={16} /><span>Bulk Upload</span>
        </button>
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
              <th width={80}>ID</th>
              <th width={340}>TITLE</th>
              <th width={200}>AUTHOR(S)</th>
              <th width={200}>TYPE</th>
              <th width={80}>YEAR</th>
              <th width={150}>STATUS</th>
              <th className="fill"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((ref) => (
                <tr key={ref.id}>
                  <td width={80}>{ref.id}</td>
                  <td width={340}>
                    <div className={styles.titleCell}>
                      <span className={styles.refTitle}>{ref.title}</span>
                      {ref.filename && <span className={styles.refFilename}>{ref.filename}</span>}
                    </div>
                  </td>
                  <td width={200}>{ref.authors}</td>
                  <td width={200}><span className={`${styles.typeBadge} ${getTypeBadgeClass(ref.type)}`}>{ref.type}</span></td>
                  <td width={80}>{ref.year || '—'}</td>
                  <td width={150}>
                    {isDeprecated(ref) && <span className={styles.deprecatedBadge}>Deprecated</span>}
                    {hasIssues(ref) && <span className={styles.issueBadge}>Has Issue</span>}
                    {!isDeprecated(ref) && !hasIssues(ref) && <span className={styles.goodBadge}>Active</span>}
                  </td>
                  <td className="fill">
                    <div className={styles.actionGroup}>
                      <button className={styles.actionView} type="button" onClick={() => setViewRef(ref)}>View</button>
                      {tab === 'archived' ? (
                        <>
                          <span className={styles.actionDot}>·</span>
                          <button className={styles.actionEdit} type="button" onClick={() => navigate(`/role/director-of-libraries/edit-reference/${ref.id}`)}>Edit</button>
                          <span className={styles.actionDot}>·</span>
                          <button className={styles.actionEdit} type="button" onClick={() => confirmUnarchive(ref.id)} style={{ color: '#047857' }}>Unarchive</button>
                        </>
                      ) : (
                        <>
                          <span className={styles.actionDot}>·</span>
                          <button className={styles.actionEdit} type="button" onClick={() => navigate(`/role/director-of-libraries/edit-reference/${ref.id}`)}>Edit</button>
                          <span className={styles.actionDot}>·</span>
                          <button className={styles.actionDelete} type="button" onClick={() => setArchiveRef(ref)}>Archive</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className={styles.noData}>No {tab === 'archived' ? 'archived' : ''} references found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── VIEW MODAL ──────────────────────────────────────────────────── */}
      {viewRef && (
        <div className={styles.modalOverlay} onClick={() => setViewRef(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>REFERENCE DETAILS</h2>
              <button className={styles.modalClose} onClick={() => setViewRef(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {isDeprecated(viewRef) && (
                <div className={styles.warningBanner}>
                  <span role="img" aria-label="warning">⚠️</span> This reference is over 5 years old and may be outdated.
                </div>
              )}
              {hasIssues(viewRef) && (
                <div className={styles.errorBanner}>
                  <span role="img" aria-label="error">🚫</span> This reference has a reported issue and instructors cannot use it.
                </div>
              )}
              <div className={styles.modalRow}><span className={styles.modalLabel}>REFERENCE ID</span><span className={styles.modalValue}>{viewRef.id}</span></div>
              <div className={styles.modalRow}><span className={styles.modalLabel}>TITLE</span><span className={styles.modalValue}>{viewRef.title}</span></div>
              <div className={styles.modalRow}><span className={styles.modalLabel}>AUTHOR(S)</span><span className={styles.modalValue}>{viewRef.authors}</span></div>
              <div className={styles.modalRow2col}>
                <div><span className={styles.modalLabel}>TYPE</span><span className={styles.modalValue}>{viewRef.type || '—'}</span></div>
                <div><span className={styles.modalLabel}>YEAR</span><span className={styles.modalValue}>{viewRef.year || '—'}</span></div>
              </div>
              {viewRef.isbn && <div className={styles.modalRow}><span className={styles.modalLabel}>ISBN</span><span className={styles.modalValue}>{viewRef.isbn}</span></div>}
              {viewRef.link && <div className={styles.modalRow}><span className={styles.modalLabel}>LINK</span><a href={viewRef.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, color: '#00f', textDecoration: 'underline' }}>{viewRef.link}</a></div>}
              {viewRef.publisher && <div className={styles.modalRow}><span className={styles.modalLabel}>PUBLISHER</span><span className={styles.modalValue}>{viewRef.publisher}</span></div>}
              <div className={styles.modalRow}><span className={styles.modalLabel}>UPLOAD DATE</span><span className={styles.modalValue}>{viewRef.uploadDate ? new Date(viewRef.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span></div>
              <div className={styles.issueToggleRow}>
                <label className={styles.issueToggleLabel}>
                  <input type="checkbox" checked={viewRef.hasIssue || false} onChange={() => {
                    const updated = updateReference(viewRef.id, { hasIssue: !viewRef.hasIssue });
                    if (updated) {
                      const newRefs = getReferences(true);
                      syncReferences(newRefs);
                      setViewRef(prev => ({ ...prev, hasIssue: !prev.hasIssue }));
                    }
                  }} />
                  <span>Mark as having an issue (instructors cannot use this reference)</span>
                </label>
              </div>
                <div className={styles.commentSection}>
                <h4 style={{ margin: '16px 0 8px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>Comments</h4>
                {viewComments.length === 0 ? (
                  <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#9ca3af' }}>No comments yet.</p>
                ) : (
                  <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {viewComments.map(c => (
                      <div key={c.id} style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 13, color: '#111827', marginBottom: 4 }}>{c.text}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.author} &middot; {new Date(c.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: 'none' }} />
                  <button onClick={() => {
                    if (!commentText.trim()) return;
                    addReferenceComment(viewRef.id, commentText.trim(), getRoleName('director-of-libraries'));
                    setViewComments(getReferenceComments(viewRef.id));
                    setCommentText('');
                  }} style={{ padding: '8px 16px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Post</button>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnEdit} onClick={() => { setViewRef(null); navigate(`/role/director-of-libraries/edit-reference/${viewRef.id}`); }}>Edit Reference</button>
              <button className={styles.modalBtnClose} onClick={() => setViewRef(null)}>Close</button>
            </div>
          </div>
        </div>
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

  return (
    <SkeletonA
      header={<HeaderA role="Director of Libraries" name="SANTOS, MARIA" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={content}
    />
  );
};

export default ReferenceLibrary;
