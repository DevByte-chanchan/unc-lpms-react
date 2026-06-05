import React from "react";
import FacultyTable from "../components/FacultyTable.jsx";
import FacultyDetailModal from "../components/FacultyDetailModal.jsx";
import PeriodSelector from "../components/PeriodSelector.jsx";
import EditEntityModal from "../components/EditEntityModal.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import ReconciliationModal from "../components/ReconciliationModal.jsx";
import ViewArchivedButton from "../components/ViewArchivedButton.jsx";
import { Search, ArrowUp, ArrowDown, Upload, Plus, Clipboard, ChevronDown, Check, Users } from "react-feather";
import styles from '../styles/CoursesTable.module.sass';
import syllabusStyles from '../styles/SyllabusSections.module.sass';
import { FacultyAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import { STATUS_OPTIONS, partitionByArchive } from '../services/statusPolicy.js';

const ActionBtn = ({ onClick, icon, label, disabled, variant }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 18px', gap: 8, width: 240, height: 40, background: variant === 'white' ? '#FFFFFF' : (disabled ? '#9CA3AF' : '#EA1212'), borderRadius: 6, color: variant === 'white' ? '#374151' : '#fff', border: variant === 'white' ? '1px solid #D1D5DB' : 'none', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? (variant === 'white' ? 0.6 : 0.7) : 1 }}>
    <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    {label}
  </button>
);

const DeanFaculty = () => {
  const { currentPeriod, isCurrentTermActive } = usePeriod();
  const periodId = currentPeriod && currentPeriod.id;

  const [showModal, setShowModal]             = React.useState(false);
  const [showAddModal, setShowAddModal]       = React.useState(false);
  const [editingFaculty, setEditingFaculty]   = React.useState(null);
  // True when Edit was opened from the View modal (so we show a "back to
  // View" arrow); false when opened straight from the row.
  const [editFromView, setEditFromView]       = React.useState(false);
  const [confirmUpload, setConfirmUpload]     = React.useState(false);
  const [recon, setRecon]                     = React.useState(null);   // { missing: [] }
  const [selectedFile, setSelectedFile]       = React.useState(null);
  const [searchQuery, setSearchQuery]         = React.useState('');
  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [selectedFaculty, setSelectedFaculty] = React.useState(null);
  const [roleFilter, setRoleFilter]           = React.useState(null);
  const [roleMenuOpen, setRoleMenuOpen]       = React.useState(false);
  const [faculty, setFaculty]                 = React.useState([]);
  const [uploading, setUploading]             = React.useState(false);
  const [uploadError, setUploadError]         = React.useState(null);
  const fileInputRef = React.useRef(null);

  const refresh = React.useCallback(() => {
    if (!periodId) { setFaculty([]); return; }
    FacultyAPI.list(periodId)
      .then((rows) => setFaculty(Array.isArray(rows) ? rows : []))
      .catch(() => setFaculty([]));
  }, [periodId]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const showTable = faculty.length > 0;

  const handleViewFaculty = (f) => {
    setSelectedFaculty(f);
    setShowDetailModal(true);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) { alert('Please choose a file first'); return; }
    if (!periodId)     { alert('Select an academic period first'); return; }
    setUploading(true); setUploadError(null);
    try {
      const result = await FacultyAPI.upload(selectedFile, periodId);
      await refresh();
      setShowModal(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Smart-sync: if anyone already in the DB wasn't in the new file,
      // open the reconciliation modal to decide who to retire.
      if (result && Array.isArray(result.missing) && result.missing.length > 0) {
        setRecon({ missing: result.missing });
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Reconciliation: mark the chosen missing faculty as Inactive (archived).
  const onReconConfirm = async (idsToInactivate) => {
    if (idsToInactivate.length > 0) {
      await FacultyAPI.inactivateMany(idsToInactivate);
      await refresh();
    }
    setRecon(null);
  };

  const onAddFaculty = async (record) => {
    await FacultyAPI.create(record, periodId);
    await refresh();
  };

  const onSaveEdit = async (patch) => {
    setFaculty((prev) => prev.map((r) => r.id === editingFaculty.id ? { ...r, ...patch } : r));
    try {
      const saved = await FacultyAPI.update(editingFaculty.id, patch);
      setFaculty((prev) => prev.map((r) => r.id === editingFaculty.id ? { ...r, ...saved } : r));
    } catch (err) {
      await refresh();
      throw err;
    }
  };


  // Edit-status handler for the faculty archive (Active or On Leave).
  const onEditStatus = React.useCallback(async (row, newStatus) => {
    await FacultyAPI.update(row.id, { status: newStatus });
    await refresh();
  }, [refresh]);

  // "⋯" menu → pick the archive status to move the row to the Archive.
  const onArchiveRow = React.useCallback(
    (row, status) => onEditStatus(row, status),
    [onEditStatus],
  );

  const visibleFaculty = React.useMemo(() => {
    const rows = faculty.filter((f) =>
      (!roleFilter || f.role === roleFilter) &&
      (!searchQuery
        || (f.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        || (f.department || '').toLowerCase().includes(searchQuery.toLowerCase()))
    );
    // Sorting is handled by the table's column headers; here we only filter
    // and drop archived statuses (Emeritus / Inactive) to the global Archive.
    return partitionByArchive(rows, 'faculty').main;
  }, [faculty, roleFilter, searchQuery]);

  return (
    <div style={{ padding: 20, background: '#FFFFFF', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Faculty</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <ActionBtn variant="white" onClick={() => { if (faculty.length > 0) { setConfirmUpload(true); } else { setShowModal(true); } }} disabled={!periodId || !isCurrentTermActive} icon={<Upload size={18} color="#374151" />} label="Upload Faculty List" />
          {showTable && isCurrentTermActive && <ActionBtn onClick={() => setShowAddModal(true)} icon={<Plus size={18} color="#FFFFFF" />} label="Add Faculty" />}
        </div>
      </div>

      {!isCurrentTermActive && currentPeriod && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, color: '#92400E', fontSize: 13, lineHeight: '1.4' }}>
          <strong>Read-only:</strong> {currentPeriod.label} is closed. Switch to an Active term to make changes.
        </div>
      )}

      {/* Top toolbar — Current Term (left), View Archived (far right). */}
      <div className={syllabusStyles.header} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PeriodSelector prominent />
        <ViewArchivedButton moduleType="faculty" onEditStatus={onEditStatus} />
      </div>

      {/* Filter bar — search beside the role filter, left-aligned. */}
      {showTable && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className={syllabusStyles['section-select']} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', height: 40, borderRadius: 9999, background: 'transparent', border: '1px solid #D1D5DB', flex: '0 1 360px', minWidth: 220, maxWidth: 420 }}>
            <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or department" style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', fontSize: 14 }} />
          </div>
          {/* Role filter — pill dropdown matching the year-filter look. */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setRoleMenuOpen((v) => !v)}
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234,18,18,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 9999, border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: 14, cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap' }}
            >
              <Users size={16} color="#6B7280" />
              <span style={{ color: '#6B7280', fontWeight: 500 }}>Role:</span>
              <span style={{ color: '#111827', fontWeight: 600 }}>{roleFilter || 'All Roles'}</span>
              <ChevronDown size={16} color="#6B7280" style={{ marginLeft: 2 }} />
            </button>
            {roleMenuOpen && (
              <>
                <div onClick={() => setRoleMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 220, background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, zIndex: 5 }}>
                  {['', 'Dean', 'Program Head', 'Professor', 'Associate Professor', 'Assistant Professor', 'Instructor'].map((r) => {
                    const active = (roleFilter || '') === r;
                    return (
                      <button
                        key={r || 'all'}
                        type="button"
                        onClick={() => { setRoleFilter(r || null); setRoleMenuOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', textAlign: 'left', border: 'none', borderRadius: 6, padding: '8px 10px', outline: 'none', cursor: 'pointer', background: active ? '#EA1212' : 'transparent', color: active ? '#FFFFFF' : '#374151', fontSize: 14, fontWeight: active ? 600 : 500 }}
                      >
                        <span>{r || 'All Roles'}</span>
                        {active && <Check size={15} color="#FFFFFF" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showTable && (
        <FacultyTable
          faculty={visibleFaculty}
          onView={handleViewFaculty}
          onEdit={isCurrentTermActive ? (f) => { setEditFromView(false); setEditingFaculty(f); } : undefined}
          onArchive={isCurrentTermActive ? onArchiveRow : undefined}
          hideDepartment={true}
        />
      )}

      {!showTable && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 100, height: 100, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clipboard size={48} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No faculty yet</div>
          <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420, fontSize: 14, lineHeight: '1.5' }}>{periodId ? ('Upload a faculty list for ' + (currentPeriod ? currentPeriod.label : 'this period') + ' to get started.') : 'Select an academic period to begin.'}</div>
        </div>
      )}

      {showAddModal && (
        // Reuses EditEntityModal so "Add Faculty" shares the exact 2-column
        // layout as "Edit Faculty" (two fields per row).
        <EditEntityModal
          title="Add Faculty"
          columns={2}
          width="min(640px, 94vw)"
          fields={[
            { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Maria Santos', colSpan: 1 },
            { key: 'role', label: 'Role', required: true, type: 'select', options: ['Dean', 'Program Head', 'Professor', 'Associate Professor', 'Assistant Professor', 'Instructor'], colSpan: 1 },
            { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS.faculty, colSpan: 1 },
            { key: 'sex', label: 'Sex', type: 'segmented', options: ['Female', 'Male'], colSpan: 1 },
            { key: 'birthdate', label: 'Birthdate', type: 'date', colSpan: 1 },
            { key: 'email', label: 'Email Address', type: 'email', placeholder: 'e.g. msantos@uc.edu.ph', colSpan: 1 },
            { key: 'contact_number', label: 'Contact Number', placeholder: 'e.g. 0917 123 4567', colSpan: 1 },
          ]}
          record={{}}
          onSave={onAddFaculty}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={() => !uploading && setShowModal(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, padding: 24, background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Faculty List</div>
            <div onClick={() => fileInputRef.current && fileInputRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setSelectedFile(f); }} style={{ border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Upload size={36} color="#9CA3AF" />
              <div style={{ fontWeight: 600, color: '#111827' }}>{selectedFile ? selectedFile.name : 'Drag & drop file here'}</div>
              <div style={{ color: '#6B7280', fontSize: 13 }}>Upload .xlsx, .xls or .csv</div>
              <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setSelectedFile(f); }} style={{ display: 'none' }} />
            </div>
            {uploadError && <div style={{ color: '#B91C1C', fontSize: 13 }}>{uploadError}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={uploading} onClick={() => { setSelectedFile(null); setShowModal(false); }} style={{ flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 500 }}>Cancel</button>
              <button disabled={uploading} onClick={handleConfirmUpload} style={{ flex: 1, height: 40, background: '#2C3744', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: uploading ? 0.7 : 1 }}>{uploading ? 'Uploading…' : 'Upload'}</button>
            </div>
          </div>
        </>
      )}

      {showDetailModal && selectedFaculty && selectedFaculty.id && (
        <FacultyDetailModal
          facultyId={selectedFaculty.id}
          fallback={selectedFaculty}
          canEdit={isCurrentTermActive}
          onEdit={(full) => { setShowDetailModal(false); setEditFromView(true); setEditingFaculty(full || selectedFaculty); }}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {editingFaculty && (
        <EditEntityModal
          key={'faculty-edit-' + editingFaculty.id}
          title="Edit faculty"
          termLabel={currentPeriod ? currentPeriod.label : undefined}
          columns={2}
          width="min(640px, 94vw)"
          fields={[
            { key: 'name', label: 'Name', required: true, colSpan: 1 },
            { key: 'role', label: 'Role', required: true, type: 'select', options: ['Dean', 'Program Head', 'Professor', 'Associate Professor', 'Assistant Professor', 'Instructor'], colSpan: 1 },
            { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS.faculty, colSpan: 1 },
            { key: 'sex', label: 'Sex', type: 'segmented', options: ['Female', 'Male'], colSpan: 1 },
            { key: 'birthdate', label: 'Birthdate', type: 'date', colSpan: 1 },
            { key: 'email', label: 'Email Address', type: 'email', colSpan: 1 },
            { key: 'contact_number', label: 'Contact Number', colSpan: 1 },
          ]}
          record={editingFaculty}
          onSave={onSaveEdit}
          onBack={editFromView
            ? () => { setSelectedFaculty(editingFaculty); setShowDetailModal(true); setEditingFaculty(null); setEditFromView(false); }
            : undefined}
          onClose={() => { setEditingFaculty(null); setEditFromView(false); }}
        />
      )}

      <ConfirmModal
        open={confirmUpload}
        title="Update faculty data?"
        message={'Uploading this file will update existing faculty and add new ones for ' + (currentPeriod ? currentPeriod.label : 'this period') + '. Anyone already listed but not in the new file will be flagged for reconciliation. Proceed?'}
        confirmLabel="Continue to upload"
        onConfirm={() => { setConfirmUpload(false); setShowModal(true); }}
        onCancel={() => setConfirmUpload(false)}
      />

      {recon && (
        <ReconciliationModal
          title="Reconcile Faculty"
          noun="faculty"
          archiveLabel="Inactive"
          keepLabel="Active"
          renderMeta={(r) => 'Role: ' + (r.role || '—') + ' · Currently: ' + (r.status || 'Active')}
          missing={recon.missing}
          onConfirm={onReconConfirm}
          onKeepAll={() => setRecon(null)}
          onClose={() => setRecon(null)}
        />
      )}
    </div>
  );
};

export default DeanFaculty;
