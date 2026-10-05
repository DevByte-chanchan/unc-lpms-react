import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import AddReferenceModal from '../../../components/AddReferenceModal.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import TableScrollRegion from '../../../components/TableScrollRegion.jsx';
import SortableTh from '../../../components/SortableTh.jsx';
import styles from '../../../styles/ReferenceLibrary.module.scss';

import { getReferences, setReferences, addReference, archiveReference, unarchiveReference } from '../../../utils/referenceLibrary.js';
import { fetchJson } from '../../../utils/api.js';
import { sanitizeUrl } from '../../../utils/sanitize.js';
import { parseReferenceCsv, MAX_CSV_BYTES } from '../../../utils/csvImport.js';
import { nextSort, referenceLibraryColumns, sortRows } from '../../../utils/tableSort.js';
import { buildReferenceCourseTarget } from '../../../utils/referenceCourseNavigation.js';
import {
  buildReferenceFacets,
  filterReferenceRecords,
  getReferencePreview,
  getReferenceViewValue,
  isReferenceDeprecated,
  loadReferenceSavedViews,
  normalizeReferenceLibraryRows,
  paginateReferenceRecords,
  referencePageSizeForWidth,
  storeReferenceSavedViews,
} from '../../../utils/referenceDiscovery.js';

const CURRENT_YEAR = new Date().getFullYear();

const REFERENCE_LIBRARY_COLUMNS = referenceLibraryColumns().filter(column => column.key !== 'actions');

const SEARCH_FIELDS = [
  ['all', 'All fields'],
  ['title', 'Title'],
  ['authors', 'Author'],
  ['id', 'Reference ID'],
  ['isbn', 'ISBN'],
  ['publisher', 'Publisher'],
];

const YEAR_LABELS = {
  recent: 'Last 3 years',
  '2020s': '2020–2023',
  older: 'Before 2020',
  unknown: 'Unknown year',
};

const ReferenceLibrary = () => {
  const [references, setReferencesState] = useState(() => getReferences(true));
  const [courseAssignments, setCourseAssignments] = useState(null);
  const [addRefOpen, setAddRefOpen] = useState(false);
  const [editRef, setEditRef] = useState(null);
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [filterType, setFilterType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [tab, setTab] = useState('active');
  const [recentOnly, setRecentOnly] = useState(false);
  const [sort, setSort] = useState({ sortKey: 'id', sortDir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => referencePageSizeForWidth(
    typeof window === 'undefined' ? 0 : window.innerWidth
  ));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [savedViewName, setSavedViewName] = useState('');
  const [savedViews, setSavedViews] = useState(() => (
    typeof window === 'undefined' ? [] : loadReferenceSavedViews(window.localStorage)
  ));
  const activeRefs = useMemo(() => references.filter(r => !r.archived), [references]);
  const archivedRefs = useMemo(() => references.filter(r => r.archived), [references]);

  /* ── Load references from the server (seeded DB data) and merge with local ── */
  useEffect(() => {
    let mounted = true;
    // old hardcoded demo entries — swept from localStorage on sync
    const LEGACY_DUMMY_IDS = new Set(['TB-DEP-001', 'OR-ISS-001', 'OE-DEP-002', 'TB-BUS-001', 'TB-EDU-001', 'OE-NUR-001', 'OR-ENG-001', 'TB-CS-002', 'OE-BUS-002', 'TB-ENG-002', 'TB-VOLD-001', 'NUR-OBS-001']);

    async function syncLibrary() {
      try {
        const rows = await fetchJson('/api/references/library');
        if (!mounted || !Array.isArray(rows) || rows.length === 0) return;

        const existing = getReferences(true);
        const synced = normalizeReferenceLibraryRows(rows, existing);

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

  useEffect(() => {
    let mounted = true;
    fetchJson('/api/assignments?limit=1000')
      .then(response => {
        if (!mounted) return;
        const rows = Array.isArray(response) ? response : (response?.data || response?.rows || []);
        setCourseAssignments(rows);
      })
      .catch(error => {
        if (import.meta.env.DEV) console.warn('Course link availability check skipped:', error?.message);
        if (mounted) setCourseAssignments([]);
      });
    return () => { mounted = false; };
  }, []);

  /* ── Sync when references change ─────────────────────────────────── */
  const syncReferences = (newRefs) => {
    setReferences(newRefs);
    setReferencesState(getReferences(true));
  };

  /* ── Bulk Upload ─────────────────────────────────────────────────── */
  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > MAX_CSV_BYTES) throw new Error('CSV file is larger than 2 MB.');
      const rows = parseReferenceCsv(await file.text());

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
      alert(err?.message || 'Failed to parse the CSV file. Please check the format.');
    }
    e.target.value = '';
  };

  /* ── Modal states ───────────────────────────────────────────────────── */
  const [viewRef, setViewRef] = useState(null);
  const [archiveRef, setArchiveRef] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ── Discovery model ───────────────────────────────────────────────── */
  const facetSource = useMemo(() => filterReferenceRecords(references, {
    query,
    searchField,
    tab,
    recentOnly,
    currentYear: CURRENT_YEAR,
  }), [references, query, searchField, tab, recentOnly]);
  const facets = useMemo(() => buildReferenceFacets(facetSource, CURRENT_YEAR), [facetSource]);
  const recentCount = useMemo(() => filterReferenceRecords(references, {
    tab: 'active',
    recentOnly: true,
    currentYear: CURRENT_YEAR,
  }).length, [references]);
  const criteria = useMemo(() => ({
    query,
    searchField,
    department: filterDepartment,
    type: filterType,
    yearRange: filterYear,
    tab,
    recentOnly,
    currentYear: CURRENT_YEAR,
  }), [query, searchField, filterDepartment, filterType, filterYear, tab, recentOnly]);
  const currentViewCriteria = useMemo(() => ({
    ...criteria,
    sortKey: sort.sortKey,
    sortDir: sort.sortDir,
  }), [criteria, sort]);
  const activeViewValue = useMemo(
    () => getReferenceViewValue(currentViewCriteria, savedViews),
    [currentViewCriteria, savedViews],
  );
  const selectedSavedView = activeViewValue.startsWith('saved:')
    ? savedViews.find(savedView => `saved:${savedView.id}` === activeViewValue)
    : null;
  const filtered = useMemo(() => {
    return filterReferenceRecords(references, criteria);
  }, [references, criteria]);
  const sortedReferences = useMemo(
    () => sortRows(filtered, REFERENCE_LIBRARY_COLUMNS, sort.sortKey, sort.sortDir),
    [filtered, sort]
  );
  const pageResult = useMemo(
    () => paginateReferenceRecords(sortedReferences, page, pageSize),
    [sortedReferences, page, pageSize]
  );
  const previewReference = useMemo(
    () => getReferencePreview(viewRef, sortedReferences),
    [viewRef, sortedReferences]
  );
  const appliedFilterCount = [filterDepartment, filterType, filterYear].filter(Boolean).length;
  const hasDiscoveryCriteria = Boolean(query || filterDepartment || filterType || filterYear || recentOnly || tab !== 'active');

  useEffect(() => {
    const closePanels = (event) => {
      if (event.key !== 'Escape') return;
      setFiltersOpen(false);
      setViewRef(null);
    };
    window.addEventListener('keydown', closePanels);
    return () => window.removeEventListener('keydown', closePanels);
  }, []);

  useEffect(() => {
    const updatePageSize = () => setPageSize(referencePageSizeForWidth(window.innerWidth));
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, searchField, filterDepartment, filterType, filterYear, tab, recentOnly, sort.sortKey, sort.sortDir, pageSize]);

  const handleSort = (key) => setSort(current => nextSort(current, key));

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const confirmArchive = () => {
    if (archiveRef) {
      archiveReference(archiveRef.id);
      setReferencesState(getReferences(true));
      if (viewRef?.id === archiveRef.id) setViewRef(null);
      setArchiveRef(null);
    }
  };

  const confirmUnarchive = (id) => {
    unarchiveReference(id);
    setReferencesState(getReferences(true));
    if (viewRef?.id === id) setViewRef(null);
  };

  const handleClose = () => {
    setViewRef(null);
  };

  const resetDiscovery = () => {
    setQuery('');
    setSearchField('all');
    setFilterDepartment('');
    setFilterType('');
    setFilterYear('');
    setTab('active');
    setRecentOnly(false);
    setSort({ sortKey: 'id', sortDir: 'asc' });
    setFiltersOpen(false);
  };

  const selectBuiltInView = (view) => {
    setQuery('');
    setSearchField('all');
    setFilterDepartment('');
    setFilterType('');
    setFilterYear('');
    setRecentOnly(view === 'recent');
    setTab(view === 'archived' ? 'archived' : 'active');
    setSort({ sortKey: 'id', sortDir: 'asc' });
    setViewRef(null);
  };

  const applySavedView = (savedView) => {
    const saved = savedView.criteria || {};
    setQuery(saved.query || '');
    setSearchField(saved.searchField || 'all');
    setFilterDepartment(saved.department || '');
    setFilterType(saved.type || '');
    setFilterYear(saved.yearRange || '');
    setTab(saved.tab || 'active');
    setRecentOnly(Boolean(saved.recentOnly));
    setSort({ sortKey: saved.sortKey || 'id', sortDir: saved.sortDir === 'desc' ? 'desc' : 'asc' });
    setViewRef(null);
  };

  const changeView = (event) => {
    const value = event.target.value;
    if (value === 'active' || value === 'recent' || value === 'archived') {
      selectBuiltInView(value);
      return;
    }
    if (value.startsWith('saved:')) {
      const savedView = savedViews.find(item => `saved:${item.id}` === value);
      if (savedView) applySavedView(savedView);
    }
  };

  const saveCurrentView = (event) => {
    event.preventDefault();
    const name = savedViewName.trim();
    if (!name) return;
    const nextViews = storeReferenceSavedViews(window.localStorage, [
      {
        id: `view-${Date.now()}`,
        name,
        criteria: currentViewCriteria,
      },
      ...savedViews,
    ]);
    setSavedViews(nextViews);
    setSavedViewName('');
    setSaveViewOpen(false);
    showPageToast(`Saved view “${name}”.`);
  };

  const deleteSavedView = (event, id) => {
    event.stopPropagation();
    const nextViews = storeReferenceSavedViews(
      window.localStorage,
      savedViews.filter(savedView => savedView.id !== id),
    );
    setSavedViews(nextViews);
  };

  const showPageToast = (message, type = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  const activeFilterChips = [
    filterDepartment && { key: 'department', label: filterDepartment, remove: () => setFilterDepartment('') },
    filterType && { key: 'type', label: filterType, remove: () => setFilterType('') },
    filterYear && { key: 'year', label: YEAR_LABELS[filterYear] || filterYear, remove: () => setFilterYear('') },
  ].filter(Boolean);

  const renderUsedInCourse = (courseCode) => {
    if (courseAssignments === null) {
      return <span key={courseCode} className={styles.courseChecking}>{courseCode}</span>;
    }

    const target = buildReferenceCourseTarget(courseCode, courseAssignments);
    if (target.kind === 'reviewable') {
      return (
        <Link
          key={courseCode}
          to={target.href}
          className={styles.courseLink}
          aria-label={`Open Assigned Course Offerings for ${courseCode}`}
        >
          {courseCode}
        </Link>
      );
    }

    return (
      <span
        key={courseCode}
        className={styles.courseUnavailable}
        title={target.message}
        aria-label={`${courseCode}: ${target.message}`}
      >
        <span>{courseCode}</span>
        <small>{target.message}</small>
      </span>
    );
  };

  /* ── Content ───────────────────────────────────────────────────────── */
  const content = (
    <div className={styles.container}>
      <div className={styles.discoveryWorkbench}>
        <div className={styles.discoveryTop}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>REFERENCE LIBRARY</h1>
            </div>
            <div className={styles.headerActions} data-collapsible-buttons>
              <button className={styles.addBtn} type="button" onClick={() => { setEditRef(null); setAddRefOpen(true); }}>
                <Plus size={16} /><span className="btn-label">Add Reference</span>
              </button>
              <button className={styles.bulkBtn} type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} /> Bulk Upload
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleBulkUpload}
          />

      <form className={styles.searchForm} role="search" onSubmit={(event) => event.preventDefault()}>
        <label className={styles.visuallyHidden} htmlFor="reference-search-field">Search field</label>
        <select id="reference-search-field" className={styles.searchField} value={searchField} onChange={(event) => setSearchField(event.target.value)}>
          {SEARCH_FIELDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className={styles.searchInputWrap}>
          <label className={styles.visuallyHidden} htmlFor="reference-search">Search references</label>
          <input
            id="reference-search"
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, author, ISBN, publisher, ID, or keyword"
          />
          {query && (
            <button className={styles.clearSearch} type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
          <button className={styles.searchIconButton} type="submit" aria-label="Search references" title="Search references">
            <Search size={16} aria-hidden="true" />
          </button>
        </div>
      </form>

          <div className={styles.savedViews} aria-label="Reference views">
        <label className={styles.savedViewsLabel} htmlFor="reference-library-view">View</label>
        <select id="reference-library-view" className={styles.viewSelect} value={activeViewValue} onChange={changeView}>
          {activeViewValue === 'custom' && <option value="custom" disabled>Custom view</option>}
          <option value="active">All active · {activeRefs.length}</option>
          <option value="recent">Recent additions · {recentCount}</option>
          <option value="archived">Archived · {archivedRefs.length}</option>
          {savedViews.length > 0 && (
            <optgroup label="Saved views">
              {savedViews.map(savedView => <option key={savedView.id} value={`saved:${savedView.id}`}>{savedView.name}</option>)}
            </optgroup>
          )}
        </select>
        {selectedSavedView && (
          <button className={styles.savedViewDelete} type="button" aria-label={`Delete saved view ${selectedSavedView.name}`} title="Delete this saved view" onClick={(event) => deleteSavedView(event, selectedSavedView.id)}>
            <Trash2 size={14} />
          </button>
        )}
        {saveViewOpen && activeViewValue === 'custom' ? (
          <form className={styles.saveViewForm} onSubmit={saveCurrentView}>
            <label className={styles.visuallyHidden} htmlFor="saved-view-name">Saved view name</label>
            <input id="saved-view-name" className={styles.saveViewInput} autoFocus maxLength={50} value={savedViewName} onChange={(event) => setSavedViewName(event.target.value)} placeholder="View name" />
            <button className={styles.saveViewSubmit} type="submit" disabled={!savedViewName.trim()}>Save</button>
            <button className={styles.saveViewCancel} type="button" onClick={() => { setSaveViewOpen(false); setSavedViewName(''); }}>Cancel</button>
          </form>
        ) : activeViewValue === 'custom' ? (
          <button className={styles.saveViewButton} type="button" onClick={() => setSaveViewOpen(true)} title="Save the current search, filters, and sorting">
            <Bookmark size={13} /> Save view
          </button>
        ) : null}
          </div>
          {activeFilterChips.length > 0 && (
            <div className={styles.activeFilters} aria-label="Active filters">
              <span className={styles.activeFiltersLabel}>Active filters</span>
              {activeFilterChips.map(filter => (
                <button key={filter.key} type="button" className={styles.activeFilterChip} onClick={filter.remove} aria-label={`Remove ${filter.label} filter`}>
                  <span>{filter.label}</span><X size={12} />
                </button>
              ))}
            </div>
          )}
        </div>

      {filtersOpen && <button type="button" className={styles.filterBackdrop} onClick={() => setFiltersOpen(false)} aria-label="Close filters" />}
      {viewRef && <button type="button" className={styles.previewBackdrop} onClick={handleClose} aria-label="Close reference preview" />}

        <div className={styles.discoveryLayout}>
        <aside className={`${styles.facetRail} ${filtersOpen ? styles.filterDrawer : ''}`} aria-label="Reference filters">
          <div className={styles.facetHeader}>
            <h2 className={styles.facetTitle}>Refine results</h2>
            <div className={styles.facetHeaderActions}>
              {hasDiscoveryCriteria && <button className={styles.resetButton} type="button" onClick={resetDiscovery}>Reset all</button>}
              {filtersOpen && <button className={`${styles.drawerClose} app-icon-close`} type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={15} /></button>}
            </div>
          </div>

          <div className={styles.facetGroup}>
            <h3 className={styles.facetGroupTitle}>Department</h3>
            {facets.departments.map(item => <button key={item.value} className={`${styles.facetOption} ${filterDepartment === item.value ? styles.facetOptionActive : ''}`} type="button" aria-pressed={filterDepartment === item.value} onClick={() => setFilterDepartment(current => current === item.value ? '' : item.value)}><span>{item.value}</span><span className={styles.facetCount}>{item.count}</span></button>)}
          </div>

          <div className={styles.facetGroup}>
            <h3 className={styles.facetGroupTitle}>Reference type</h3>
            {facets.types.map(item => <button key={item.value} className={`${styles.facetOption} ${filterType === item.value ? styles.facetOptionActive : ''}`} type="button" aria-pressed={filterType === item.value} onClick={() => setFilterType(current => current === item.value ? '' : item.value)}><span>{item.value}</span><span className={styles.facetCount}>{item.count}</span></button>)}
          </div>

          <div className={styles.facetGroup}>
            <h3 className={styles.facetGroupTitle}>Publication year</h3>
            {facets.years.map(item => <button key={item.value} className={`${styles.facetOption} ${filterYear === item.value ? styles.facetOptionActive : ''}`} type="button" aria-pressed={filterYear === item.value} onClick={() => setFilterYear(current => current === item.value ? '' : item.value)}><span>{YEAR_LABELS[item.value]}</span><span className={styles.facetCount}>{item.count}</span></button>)}
          </div>

          <div className={styles.facetGroup}>
            <h3 className={styles.facetGroupTitle}>Record status</h3>
            <button className={`${styles.facetOption} ${tab === 'active' ? styles.facetOptionActive : ''}`} type="button" aria-pressed={tab === 'active'} onClick={() => { setTab('active'); setRecentOnly(false); }}><span>Active</span><span className={styles.facetCount}>{activeRefs.length}</span></button>
            <button className={`${styles.facetOption} ${tab === 'archived' ? styles.facetOptionActive : ''}`} type="button" aria-pressed={tab === 'archived'} onClick={() => { setTab('archived'); setRecentOnly(false); }}><span>Archived</span><span className={styles.facetCount}>{archivedRefs.length}</span></button>
          </div>
        </aside>

        <section className={styles.resultsPane} aria-label="Reference results">
          <div className={styles.mobileToolbar}>
            <button className={styles.mobileFilterButton} type="button" onClick={() => setFiltersOpen(true)}><Filter size={14} /> Filters {appliedFilterCount > 0 && `(${appliedFilterCount})`}</button>
            {hasDiscoveryCriteria && <button className={styles.resetButton} type="button" onClick={resetDiscovery}><RotateCcw size={12} /> Reset</button>}
          </div>
          <div className={styles.resultsHeader}>
            <div>
              <h2 className={styles.resultsTitle}>{sortedReferences.length} {sortedReferences.length === 1 ? 'reference' : 'references'}</h2>
              <span className={styles.resultsMeta}>{hasDiscoveryCriteria ? 'Matching the current search and filters' : 'All records in this view'}</span>
              {sortedReferences.some(ref => isReferenceDeprecated(ref, CURRENT_YEAR)) && (
                <span className={styles.reviewLegend}><span className={styles.reviewLegendDot} aria-hidden="true" />May need review</span>
              )}
            </div>
            <select className={styles.sortSelect} value={`${sort.sortKey}:${sort.sortDir}`} onChange={(event) => { const [sortKey, sortDir] = event.target.value.split(':'); setSort({ sortKey, sortDir }); }} aria-label="Sort references">
              <option value="id:asc">ID: A to Z</option><option value="title:asc">Title: A to Z</option><option value="title:desc">Title: Z to A</option><option value="year:desc">Newest year</option><option value="year:asc">Oldest year</option>
            </select>
          </div>

          <TableScrollRegion label="Reference library" minWidth={720} className={styles.tableWrapper}>
            <table>
              <thead><tr>{REFERENCE_LIBRARY_COLUMNS.map(column => <SortableTh key={column.key} col={column} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={handleSort} />)}</tr></thead>
              <tbody>
                {pageResult.items.length > 0 ? pageResult.items.map(ref => (
                  <tr
                    key={ref.id}
                    className={`${styles.resultRow} ${previewReference?.id === ref.id ? styles.resultRowSelected : ''}`}
                    tabIndex={0}
                    aria-selected={previewReference?.id === ref.id}
                    onClick={() => setViewRef(ref)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setViewRef(ref); } }}
                  >
                    <td className={styles.cellNowrap}>{ref.id}</td>
                    <td><div className={styles.titleCell}><div className={styles.titleLine}><span className={styles.refTitle}>{ref.title}</span></div>{ref.filename && <span className={styles.refFilename}>{ref.filename}</span>}</div></td>
                    <td><span className={styles.cellEllipsis}>{ref.authors || '—'}</span></td>
                    <td className={styles.cellNowrap}><span className={styles.typeBadge}>{ref.type}</span></td>
                    <td className={`${styles.cellNowrap} ${styles.yearCell}`}><span className={styles.yearValue}>{ref.year || '—'}</span>{isReferenceDeprecated(ref, CURRENT_YEAR) && <span className={styles.deprecatedMarker} role="img" title="May need review — published five or more years ago" aria-label="May need review — published five or more years ago" />}</td>
                  </tr>
                )) : (
                  <EmptyState colSpan={5} icon={<BookOpen size={22} strokeWidth={1.6} />} title={hasDiscoveryCriteria ? 'No references match this search' : tab === 'archived' ? 'Nothing has been archived' : 'No references in the library yet'} hint={hasDiscoveryCriteria ? 'Try a different search term, remove a filter, or reset the view.' : tab === 'archived' ? 'References you archive are kept here and can be restored later.' : 'Add a reference or use Bulk Upload to start the catalog.'} />
                )}
              </tbody>
            </table>
          </TableScrollRegion>

          <div className={styles.pagination}>
            <span>Showing {pageResult.start}–{pageResult.end} of {pageResult.total}</span>
            <div className={styles.paginationControls}>
              <button
                className={styles.paginationBtn}
                type="button"
                aria-label="Previous page"
                disabled={pageResult.page <= 1}
                onClick={() => setPage(pageResult.page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>Page {pageResult.page} of {pageResult.pageCount}</span>
              <button
                className={styles.paginationBtn}
                type="button"
                aria-label="Next page"
                disabled={pageResult.page >= pageResult.pageCount}
                onClick={() => setPage(pageResult.page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <aside className={`${styles.previewPane} ${viewRef ? styles.previewSheet : ''}`} aria-label="Reference preview">
          {previewReference ? (
            <>
              <div className={styles.previewHeader}><div><h2 className={styles.previewTitle}>{previewReference.title}</h2><div className={styles.previewId}><span>{previewReference.id} · {previewReference.archived ? 'Archived' : 'Active'}</span></div></div><button className={`${styles.previewClose} app-icon-close`} type="button" onClick={handleClose} aria-label="Close reference preview"><X size={15} /></button></div>
              {isReferenceDeprecated(previewReference, CURRENT_YEAR) && <div className={styles.warningBanner}>This reference is five years old or older and may need review.</div>}
              <dl className={styles.previewMetadata}>
                <dt>Author(s)</dt><dd>{previewReference.authors || 'Not provided'}</dd><dt>Type</dt><dd>{previewReference.type || 'Not provided'}</dd><dt>ISBN</dt><dd>{previewReference.isbn || 'Not provided'}</dd><dt>Year</dt><dd>{previewReference.year || 'Not provided'}</dd><dt>Publisher</dt><dd>{previewReference.publisher || 'Not provided'}</dd><dt>Department</dt><dd>{(previewReference.departments || []).join(', ') || 'Not assigned'}</dd><dt>Used in</dt><dd className={styles.courseLinks}>{(previewReference.usedInCourses || []).length ? previewReference.usedInCourses.map(renderUsedInCourse) : 'No courses recorded'}</dd>
                {sanitizeUrl(previewReference.link) && <><dt>Link</dt><dd><a href={sanitizeUrl(previewReference.link)} target="_blank" rel="noopener noreferrer" className={styles.modalLink}>Open resource</a></dd></>}
              </dl>
              <div className={styles.previewActions}>
                <button className={styles.previewPrimary} type="button" onClick={() => { setEditRef(previewReference); setAddRefOpen(true); }}>Edit record</button>
                {previewReference.archived ? (
                  <button className={styles.previewSecondary} type="button" onClick={() => confirmUnarchive(previewReference.id)}><RotateCcw size={13} /> Restore</button>
                ) : (
                  <button className={`${styles.previewSecondary} ${styles.rowActionDanger}`} type="button" onClick={() => setArchiveRef(previewReference)}><Archive size={13} /> Archive record</button>
                )}
              </div>
            </>
          ) : <div className={styles.previewEmpty}><BookOpen size={30} /><p>Select a reference to preview its details without leaving the result list.</p></div>}
        </aside>
        </div>
      </div>

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
              <button type="button" className={`${styles.modalClose} app-icon-close`} onClick={() => { setShowBulkModal(false); setBulkResult(null); }} aria-label="Close bulk upload">✕</button>
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
        header={<HeaderA role="Director of Libraries" />}
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
