import Select from '../../../components/Select.jsx'
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  BookOpen,
  ChevronLeft,
  Edit2,
  ChevronRight,
  Filter,
  Grid,
  List,
  Plus,
  RotateCcw,
  Search,
  Sliders,
  Upload,
  X,
} from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import AddReferenceModal from '../../../components/AddReferenceModal.jsx';
import CatalogRulesDialog from '../../../components/CatalogRulesDialog.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import TableScrollRegion from '../../../components/TableScrollRegion.jsx';
import SortableTh from '../../../components/SortableTh.jsx';
import styles from '../../../styles/ReferenceLibrary.module.scss';
import cards from '../../../styles/CoursesTable.module.sass';

import ImportPreviewModal from '../../../components/ImportPreviewModal.jsx';
import { loadLibrary, loadReferenceTypes, setArchived, serverId } from '../../../utils/referenceStore.js';
import { Bone } from '../../../components/LoadingSkeleton.jsx';
import { typeLabel, unavailableReason, getCatalogSettings, refreshCatalogSettings } from '../../../utils/referenceCatalog.js';
import { healthSummary } from '../../../utils/referenceHealth.js';
import { csvRecordToRow } from '../../../utils/referenceImportRows.js';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
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
  paginateReferenceRecords,
  referencePageSizeForWidth,
} from '../../../utils/referenceDiscovery.js';

const CURRENT_YEAR = new Date().getFullYear();

const REFERENCE_LIBRARY_COLUMNS = referenceLibraryColumns().filter(column => column.key !== 'actions');

const YEAR_LABELS = {
  recent: 'Last 3 years',
  '2020s': '2020–2023',
  older: 'Before 2020',
  unknown: 'Unknown year',
};

const ReferenceLibrary = () => {
  const [references, setReferencesState] = useState([]);
  const [loadState, setLoadState] = useState({ loading: true, error: '' });
  const [importSource, setImportSource] = useState(null);
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
  // References filed per course (server: /api/course-references). Sir wants them per course, not per department.
  const [courseTree, setCourseTree] = useState([]);
  const [openDept, setOpenDept] = useState('');
  const [openProgram, setOpenProgram] = useState('');
  const [filterCourse, setFilterCourse] = useState(null); // { id, code }
  const [courseRefIds, setCourseRefIds] = useState(null); // Set of reference ids filed under filterCourse
  const [previewCourses, setPreviewCourses] = useState(null);
  const [courseToAdd, setCourseToAdd] = useState('');
  const [filing, setFiling] = useState(false);
  // 'list': the reference table; 'courses': the courses of the chosen department / program as cards.
  const [layoutMode, setLayoutMode] = useState('list');
  const [rules, setRules] = useState(getCatalogSettings);
  const [rulesOpen, setRulesOpen] = useState(false);
  useEffect(() => { let on = true; refreshCatalogSettings(fetchJson).then(latest => { if (on) setRules(latest); }); return () => { on = false; }; }, []);
  const activeRefs = useMemo(() => references.filter(r => !r.archived), [references]);
  const health = useMemo(() => healthSummary(activeRefs, { years: rules.recencyYears, currentYear: CURRENT_YEAR }), [activeRefs, rules.recencyYears]);

  const archivedRefs = useMemo(() => references.filter(r => r.archived), [references]);

  /* ── The library is the server's: load the type definitions and the references ── */
  const reload = React.useCallback(async () => {
    try {
      await loadReferenceTypes();
      setReferencesState(await loadLibrary());
      setLoadState({ loading: false, error: '' });
    } catch (err) {
      setLoadState({ loading: false, error: apiErrorMessage(err, 'The reference library could not be loaded.') });
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const loadCourseTree = React.useCallback(() => fetchJson('/api/course-references/tree')
    .then(data => setCourseTree(data.departments || []))
    .catch(() => setCourseTree([])), []);
  useEffect(() => { loadCourseTree(); }, [loadCourseTree]);
  const allCourses = useMemo(() => {
    const byId = new Map();
    courseTree.forEach(d => d.programs.forEach(p => p.courses.forEach(c => { if (!byId.has(c.id)) byId.set(c.id, c); })));
    return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [courseTree]);
  // Course view: every course, grouped by program; the search box narrows them.
  const gridPrograms = useMemo(() => {
    const words = query.trim().toLowerCase();
    return courseTree.flatMap(d => d.programs).map(program => ({
      ...program,
      courses: words ? program.courses.filter(c => `${c.code} ${c.title}`.toLowerCase().includes(words)) : program.courses,
    })).filter(program => program.courses.length > 0);
  }, [courseTree, query]);
  const loadCourseRefs = React.useCallback(async (course) => {
    if (!course) { setCourseRefIds(null); return; }
    try {
      const data = await fetchJson(`/api/course-references/${course.id}`);
      setCourseRefIds(new Set((data.references || []).map(r => r.reference_id)));
    } catch {
      setCourseRefIds(new Set());
    }
  }, []);
  useEffect(() => { loadCourseRefs(filterCourse); }, [filterCourse, loadCourseRefs]);

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

  /* ── CSV bulk upload: parse here, check and import on the server ───── */
  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_CSV_BYTES) throw new Error('CSV file is larger than 2 MB.');
      const rows = parseReferenceCsv(await file.text()).map(csvRecordToRow);
      if (rows.length === 0) throw new Error('The CSV file has no rows.');
      setImportSource({ title: `Import ${file.name}`, rows, kind: 'csv' });
    } catch (err) {
      showPageToast(err?.message || 'Failed to read the CSV file. Please check the format.', 'error');
    }
  };

  const handleImported = (result) => {
    reload();
    showPageToast(`Imported ${result.created} of ${result.total} row(s).`);
  };

  /* ── Modal states ───────────────────────────────────────────────────── */
  const [viewRef, setViewRef] = useState(null);
  const [archiveRef, setArchiveRef] = useState(null);
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
    () => getReferenceViewValue(currentViewCriteria),
    [currentViewCriteria],
  );
  const recordIds = (record) => (record.sourceIds?.length ? record.sourceIds : [serverId(record.id)]).map(Number);
  const filtered = useMemo(() => {
    const rows = filterReferenceRecords(references, criteria);
    if (!filterCourse || !courseRefIds) return rows;
    return rows.filter(record => recordIds(record).some(id => courseRefIds.has(id)));
  }, [references, criteria, filterCourse, courseRefIds]);
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
  const appliedFilterCount = [filterDepartment, filterType, filterYear, filterCourse].filter(Boolean).length;
  const hasDiscoveryCriteria = Boolean(query || filterDepartment || filterType || filterYear || filterCourse || recentOnly || tab !== 'active');

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
  }, [query, searchField, filterDepartment, filterType, filterYear, filterCourse, tab, recentOnly, sort.sortKey, sort.sortDir, pageSize]);

  const handleSort = (key) => setSort(current => nextSort(current, key));

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const confirmArchive = async () => {
    if (!archiveRef) return;
    try {
      await setArchived(archiveRef, true);
      await reload();
      if (viewRef?.id === archiveRef.id) setViewRef(null);
      setArchiveRef(null);
    } catch (err) {
      setArchiveRef(null);
      showPageToast(apiErrorMessage(err, 'The reference was not archived.'), 'error');
    }
  };

  const confirmUnarchive = async (record) => {
    try {
      await setArchived(record, false);
      await reload();
      if (viewRef?.id === record.id) setViewRef(null);
      // Restoring the last archived one would leave an empty tab: go back to Active.
      if (archivedRefs.length <= 1) setTab('active');
    } catch (err) {
      showPageToast(apiErrorMessage(err, 'The reference was not restored.'), 'error');
    }
  };

  const handleClose = () => {
    setViewRef(null);
  };

  const resetDiscovery = () => {
    setQuery('');
    setSearchField('all');
    setFilterDepartment('');
    setFilterCourse(null);
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

  const changeView = (event) => {
    const value = event.target.value;
    if (value === 'active' || value === 'recent' || value === 'archived') selectBuiltInView(value);
  };

  const showPageToast = (message, type = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  const activeFilterChips = [
    filterDepartment && { key: 'department', label: filterDepartment, remove: () => setFilterDepartment('') },
    filterCourse && { key: 'course', label: `Course: ${filterCourse.code}`, remove: () => setFilterCourse(null) },
    filterType && { key: 'type', label: typeLabel(filterType), remove: () => setFilterType('') },
    filterYear && { key: 'year', label: YEAR_LABELS[filterYear] || filterYear, remove: () => setFilterYear('') },
  ].filter(Boolean);

  const previewId = previewReference ? serverId(previewReference.id) : null;
  const loadPreviewCourses = React.useCallback(async (id) => {
    if (!id) { setPreviewCourses(null); return; }
    try {
      setPreviewCourses((await fetchJson(`/api/course-references/by-reference/${id}`)).courses || []);
    } catch {
      setPreviewCourses([]);
    }
  }, []);
  useEffect(() => { loadPreviewCourses(previewId); }, [previewId, loadPreviewCourses]);
  useEffect(() => { setCourseToAdd(filterCourse ? String(filterCourse.id) : ''); }, [previewId, filterCourse]);

  const fileUnderCourse = async (courseId, remove = false) => {
    if (!previewId || !courseId) return;
    setFiling(true);
    try {
      await fetchJson(remove ? `/api/course-references/${courseId}/${previewId}` : `/api/course-references/${courseId}`, remove
        ? { method: 'DELETE' }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference_id: previewId }) });
      await Promise.all([loadPreviewCourses(previewId), loadCourseTree(), loadCourseRefs(filterCourse)]);
      if (!remove) setCourseToAdd('');
    } catch (err) {
      showPageToast(apiErrorMessage(err, 'The course was not updated.'), 'error');
    } finally {
      setFiling(false);
    }
  };

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
              <h1 className={`${styles.pageTitle} app-page-title`}>Reference Library</h1>
            </div>
            <div className={styles.headerActions} data-collapsible-buttons>
              <button className="btn btn-primary" type="button" onClick={() => { setEditRef(null); setAddRefOpen(true); }}>
                <Plus size={16} /><span className="btn-label">Add</span>
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} /> Bulk Upload
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setRulesOpen(true)}
                title={`Recent = last ${rules.recencyYears} years. Change the rules for everyone`}>
                <Sliders size={15} /> Rules
              </button>
            </div>
            <CatalogRulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)}
              onSaved={(saved) => { setRules(saved); showPageToast(`Reference rules saved for everyone: recent = last ${saved.recencyYears} years.`); }} />
          </div>

          {loadState.error && <div role="alert" style={{ color: 'var(--danger)', margin: '8px 0' }}>{loadState.error}</div>}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleBulkUpload}
          />

      <form className={styles.searchForm} role="search" onSubmit={(event) => event.preventDefault()}>
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
          <Search size={16} aria-hidden="true" className={styles.searchIcon} />
        </div>
      </form>

          <div className={styles.savedViews} aria-label="Reference views" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className={cards.layoutToggles}>
          <button type="button" className={`${cards.toggleBtn} ${layoutMode === 'list' ? cards.active : ''}`} onClick={() => setLayoutMode('list')} title="References" aria-pressed={layoutMode === 'list'}><List size={18} /></button>
          <button type="button" className={`${cards.toggleBtn} ${layoutMode === 'courses' ? cards.active : ''}`} onClick={() => setLayoutMode('courses')} title="Courses" aria-pressed={layoutMode === 'courses'}><Grid size={18} /></button>
        </div>
        {/* Active / recent / archived narrows the reference list; the course cards do not use it. */}
        {layoutMode !== 'courses' && (
        <Select id="reference-library-view" aria-label="View" value={activeViewValue} onChange={changeView}>
          {activeViewValue === 'custom' && <option value="custom" disabled>Custom view</option>}
          <option value="active">All active · {activeRefs.length}</option>
          <option value="recent">Recent additions · {recentCount}</option>
          <option value="archived">Archived · {archivedRefs.length}</option>
        </Select>
        )}
          </div>
          {layoutMode !== 'courses' && activeFilterChips.length > 0 && (
            <div className={styles.activeFilters} aria-label="Active filters">
              <span className={styles.activeFiltersLabel}>Active filters</span>
              {activeFilterChips.map(filter => (
                <button key={filter.key} type="button" className={styles.activeFilterChip} onClick={filter.remove} aria-label={`Remove ${filter.label} filter`}>
                  <span>{filter.label}</span><X size={12} />
                </button>
              ))}
              <button className={styles.resetButton} type="button" onClick={resetDiscovery}>Reset all</button>
            </div>
          )}
        </div>

      {filtersOpen && <button type="button" className={styles.filterBackdrop} onClick={() => setFiltersOpen(false)} aria-label="Close filters" />}
      {viewRef && <button type="button" className={styles.previewBackdrop} onClick={handleClose} aria-label="Close reference preview" />}

        <div className={`${styles.discoveryLayout} ${layoutMode === 'courses' ? styles.coursesMode : ''}`}>
        <aside className={`${styles.facetRail} ${filtersOpen ? styles.filterDrawer : ''}`} aria-label="Reference filters">
          <div className={styles.facetHeader}>
            {filtersOpen && <button className={`${styles.drawerClose} app-icon-close`} type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={15} /></button>}
          </div>

          <div className={styles.facetGroup}>
            <h3 className={styles.facetGroupTitle}>Department · Program · Course</h3>
            {courseTree.map(dept => (
              <React.Fragment key={dept.id}>
                <button className={`${styles.facetOption} ${openDept === String(dept.id) ? styles.facetOptionActive : ''}`} type="button" aria-expanded={openDept === String(dept.id)}
                  onClick={() => setOpenDept(current => (current === String(dept.id) ? '' : String(dept.id)))}>
                  <span>{dept.name}</span><span className={styles.facetCount}>{dept.programs.length}</span>
                </button>
                {openDept === String(dept.id) && dept.programs.map(program => (
                  <React.Fragment key={program.id}>
                    <button className={styles.facetOption} style={{ paddingLeft: 18 }} type="button" aria-expanded={openProgram === String(program.id)}
                      onClick={() => setOpenProgram(current => (current === String(program.id) ? '' : String(program.id)))}>
                      <span>{program.name}</span><span className={styles.facetCount}>{program.courses.length}</span>
                    </button>
                    {openProgram === String(program.id) && program.courses.map(course => {
                      const on = filterCourse?.id === course.id;
                      return (
                        <button key={course.id} className={`${styles.facetOption} ${on ? styles.facetOptionActive : ''}`} style={{ paddingLeft: 32 }} type="button" aria-pressed={on}
                          title={course.title} onClick={() => setFilterCourse(on ? null : { id: course.id, code: course.code })}>
                          <span>{course.code}</span><span className={styles.facetCount}>{course.references}</span>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </div>

          <div className={styles.facetGroup}>
            <h3 className={styles.facetGroupTitle}>Reference type</h3>
            {facets.types.map(item => <button key={item.value} className={`${styles.facetOption} ${filterType === item.value ? styles.facetOptionActive : ''}`} type="button" aria-pressed={filterType === item.value} onClick={() => setFilterType(current => current === item.value ? '' : item.value)}><span>{typeLabel(item.value)}</span><span className={styles.facetCount}>{item.count}</span></button>)}
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
          {layoutMode === 'courses' ? (
            gridPrograms.length === 0 ? <p style={{ color: 'var(--ink-muted)' }}>{query.trim() ? 'No course matches the search.' : 'No course has a learning plan yet.'}</p> : (
              <div className={styles.courseSections}>
                <p className={styles.courseIntro}>
                  A course's references are the titles its learning plans use, plus any you file under it. Open a course
                  to see and manage them.
                </p>
                {gridPrograms.map(program => (
                  <section key={program.id} aria-label={program.name}>
                    <h3 className={styles.courseProgram}>{program.name} <span>{program.courses.length} course{program.courses.length === 1 ? '' : 's'}</span></h3>
                    <div className={styles.courseGrid}>
                      {program.courses.map(c => (
                        <button key={c.id} type="button" className={styles.courseCard} onClick={() => { setFilterCourse({ id: c.id, code: c.code }); setLayoutMode('list'); }}
                          aria-label={`${c.code} ${c.title}: ${c.references} references`}>
                          <span className={styles.courseCardTop}>
                            <span className={cards.cardCode}>{c.code}</span>
                            <ChevronRight size={16} aria-hidden="true" />
                          </span>
                          <span className={styles.courseCardTitle} title={c.title}>{c.title}</span>
                          <span className={styles.courseCardCount}><strong>{c.references}</strong> reference{c.references === 1 ? '' : 's'}</span>
                          <span className={styles.courseCardSplit}>{c.used} used in plans · {c.filed} filed by you</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : (<>
          {health.total > 0 && (
            <div role="status" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '0 0 8px', color: health.needAttention ? 'var(--warn)' : 'var(--good)' }}>
              <strong>{health.needAttention === 0 ? 'Every active reference is in good order.' : `${health.needAttention} of ${health.total} active references need attention`}</strong>
              {health.needAttention > 0 && (
                <span>{[health.unavailable && `${health.unavailable} not available`, health.outdated && `${health.outdated} outdated`, health.noYear && `${health.noYear} no year`, health.noIsbn && `${health.noIsbn} no ISBN`, health.noLink && `${health.noLink} no link`].filter(Boolean).join(' · ')}</span>
              )}
            </div>
          )}

          <TableScrollRegion label="Reference Library" minWidth={520} className={`${styles.tableWrapper} app-table`}>
            <table>
              <thead><tr>{REFERENCE_LIBRARY_COLUMNS.map(column => <SortableTh key={column.key} col={column} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={handleSort} fill />)}</tr></thead>
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
                    <td><div className={styles.titleCell}><div className={styles.titleLine}><span className={styles.refTitle} title={ref.title}>{ref.title}</span>{unavailableReason(ref) && <span className={styles.issueBadge} title="Cannot be attached to a new plan">{unavailableReason(ref) === 'no copies left' ? 'No copies' : unavailableReason(ref).charAt(0).toUpperCase() + unavailableReason(ref).slice(1)}</span>}</div>{ref.filename && <span className={styles.refFilename}>{ref.filename}</span>}</div></td>
                    <td><span className={styles.cellEllipsis} title={ref.authors || undefined}>{ref.authors || '—'}</span></td>
                    <td className={styles.cellNowrap}><span className={styles.typeBadge} title={typeLabel(ref.type)}>{typeLabel(ref.type)}</span></td>
                    <td className={`${styles.cellNowrap} ${styles.yearCell}`}><span className={styles.yearValue}>{ref.year || '—'}</span>{isReferenceDeprecated(ref, CURRENT_YEAR, rules.recencyYears) && <span className={styles.deprecatedMarker} role="img" title={`May need review — published ${rules.recencyYears} or more years ago`} aria-label={`May need review — published ${rules.recencyYears} or more years ago`} />}</td>
                  </tr>
                )) : loadState.loading ? (
                  Array.from({ length: 8 }, (_, row) => (
                    <tr key={`sk-${row}`} aria-hidden="true">
                      {[70, 90, 60, 50, 40].map((w, col) => <td key={col}><Bone w={`${w}%`} h={14} /></td>)}
                    </tr>
                  ))
                ) : (
                  <EmptyState colSpan={5} icon={<BookOpen size={22} strokeWidth={1.6} />} title={hasDiscoveryCriteria ? 'No references match this search' : tab === 'archived' ? 'Nothing has been archived' : loadState.loading ? 'Loading the library…' : 'No references in the library yet'} hint={hasDiscoveryCriteria ? 'Try a different search term, remove a filter, or reset the view.' : tab === 'archived' ? 'References you archive are kept here and can be restored later.' : 'Add a reference or use Bulk Upload to start the catalog.'} />
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
          </>)}
        </section>

        <aside className={`${styles.previewPane} ${viewRef ? styles.previewSheet : ''}`} aria-label="Reference preview">
          {previewReference ? (
            <>
              <div className={styles.previewHeader}><div><h2 className={styles.previewTitle}>{previewReference.title}</h2><div className={styles.previewId}><span>{previewReference.id} · {previewReference.archived ? 'Archived' : 'Active'}</span></div></div><button className={`${styles.previewClose} app-icon-close`} type="button" onClick={handleClose} aria-label="Close reference preview"><X size={15} /></button></div>
              {isReferenceDeprecated(previewReference, CURRENT_YEAR, rules.recencyYears) && <div className={styles.warningBanner}>{`This reference is ${rules.recencyYears} years old or older and may need review.`}</div>}
              <dl className={styles.previewMetadata}>
                <dt>Author(s)</dt><dd>{previewReference.authors || 'Not provided'}</dd><dt>Type</dt><dd>{typeLabel(previewReference.type)}</dd><dt>ISBN</dt><dd>{previewReference.isbn || 'Not provided'}</dd><dt>Year</dt><dd>{previewReference.year || 'Not provided'}</dd><dt>Publisher</dt><dd>{previewReference.publisher || 'Not provided'}</dd><dt>Status</dt><dd>{(previewReference.status || 'available').charAt(0).toUpperCase() + (previewReference.status || 'available').slice(1)}</dd><dt>Copies</dt><dd>{previewReference.copies != null ? previewReference.copies : 'Not recorded'}</dd><dt>Category</dt><dd>{previewReference.category || 'Not provided'}</dd><dt>Date received</dt><dd>{previewReference.received || 'Not recorded'}</dd><dt>Filed under</dt><dd>
                  <div className={styles.courseLinks}>
                    {previewCourses === null ? 'Loading…' : previewCourses.length === 0 ? 'No course yet' : previewCourses.map(c => (
                      <span key={c.course_id} className={styles.courseChecking} title={c.course_title}>
                        {c.course_no}{' '}
                        <button type="button" className="app-icon-close" style={{ width: 18, height: 18, minHeight: 18, padding: 0 }} disabled={filing}
                          onClick={() => fileUnderCourse(c.course_id, true)} aria-label={`Remove from ${c.course_no}`}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                  {!previewReference.archived && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <Select block value={courseToAdd} onChange={(e) => setCourseToAdd(e.target.value)} placeholder="File under a course…" aria-label="Course to file this reference under">
                          {allCourses.filter(c => !(previewCourses || []).some(f => f.course_id === c.id)).map(c => <option key={c.id} value={String(c.id)}>{`${c.code} — ${c.title}`}</option>)}
                        </Select>
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={!courseToAdd || filing} onClick={() => fileUnderCourse(Number(courseToAdd))}>Add</button>
                    </div>
                  )}
                </dd><dt>Used in plans</dt><dd className={styles.courseLinks}>{(previewReference.usedInCourses || []).length ? previewReference.usedInCourses.map(renderUsedInCourse) : 'No plan uses it yet'}</dd>
                {sanitizeUrl(previewReference.link) && <><dt>Link</dt><dd><a href={sanitizeUrl(previewReference.link)} target="_blank" rel="noopener noreferrer" className={styles.modalLink}>Open resource</a></dd></>}
              </dl>
              <div className={styles.previewActions}>
                <button className="btn btn-primary" type="button" onClick={() => { setEditRef(previewReference); setAddRefOpen(true); }}><Edit2 size={13} /> Edit</button>
                {previewReference.archived ? (
                  <button className="btn btn-secondary" type="button" onClick={() => confirmUnarchive(previewReference)}><RotateCcw size={13} /> Restore</button>
                ) : (
                  <button className={`btn btn-secondary ${styles.rowActionDanger}`} type="button" onClick={() => setArchiveRef(previewReference)}><Archive size={13} /> Archive</button>
                )}
              </div>
            </>
          ) : <div className={styles.previewEmpty}><BookOpen size={30} /><p>Select a reference to preview it.</p></div>}
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
            <p className={styles.deleteText}>Are you sure you want to archive <strong>"{archiveRef.title}"</strong>? Only the Director of Libraries sees archived references.</p>
            <div className={styles.deleteActions}>
              <button className="btn btn-secondary" onClick={() => setArchiveRef(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmArchive}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {importSource && (
        <ImportPreviewModal source={importSource} onClose={() => setImportSource(null)} onImported={handleImported} />
      )}
    </div>
  );

  const handleModalSaved = (result) => {
    reload();
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
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--good)',
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
