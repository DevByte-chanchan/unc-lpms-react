import React from "react";
import FacultyTable from "../components/FacultyTable.jsx";
import FacultyDetailModal from "../components/FacultyDetailModal.jsx";
import PeriodSelector from "../components/PeriodSelector.jsx";
import EditEntityModal from "../components/EditEntityModal.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import ReconciliationModal from "../components/ReconciliationModal.jsx";
import ViewArchivedButton from "../components/ViewArchivedButton.jsx";
import UndoUploadButton from "../components/UndoUploadButton.jsx";
import UploadPreviewFlow from "../components/UploadPreviewFlow.jsx";
import DialogShell from "../components/DialogShell.jsx";
import { Search, Upload, Plus, Clipboard, ChevronDown, Check, Users, Send, X } from "react-feather";
import styles from '../styles/CoursesTable.module.sass';
import syllabusStyles from '../styles/SyllabusSections.module.sass';
import { FacultyAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import { STATUS_OPTIONS, partitionByArchive } from '../services/statusPolicy.js';

const ActionBtn = ({ onClick, icon, label, disabled, variant, width = 240 }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 18px', gap: 8, width, height: 40, background: variant === 'white' ? '#FFFFFF' : (disabled ? '#9CA3AF' : '#18191A'), borderRadius: 6, color: variant === 'white' ? '#374151' : '#fff', border: variant === 'white' ? '1px solid #D1D5DB' : 'none', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? (variant === 'white' ? 0.6 : 0.7) : 1 }}>
    <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    {label}
  </button>
);

// The upload's own line under the success toast: how many accounts are
// parked until they have a course (nothing is emailed yet).
const uploadNote = (result) => {
  const n = result && result.invitations ? Number(result.invitations.waiting) || 0 : 0;
  if (!n) return null;
  return n + (n === 1 ? ' account ready. They\'ll be invited when they\'re assigned a course.' : ' accounts ready. They\'ll be invited when they\'re assigned a course.');
};

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
  // The file under review in the Preview & Confirm overlay. Nothing is written
  // while this is set — the commit only happens on "Confirm & Import".
  const [pendingFile, setPendingFile]         = React.useState(null);
  const [searchQuery, setSearchQuery]         = React.useState('');
  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [selectedFaculty, setSelectedFaculty] = React.useState(null);
  const [roleFilter, setRoleFilter]           = React.useState(null);
  const [roleMenuOpen, setRoleMenuOpen]       = React.useState(false);
  const [faculty, setFaculty]                 = React.useState([]);
  // Bumped on every successful upload so the Undo button re-reads its batch.
  const [uploadCount, setUploadCount]         = React.useState(0);
  // Invite now / Resend: the row being sent, the confirm for "Invite all", and
  // the result line ("Invitation sent to …" / "Not sent: …").
  const [invitingId, setInvitingId]           = React.useState(null);
  const [confirmInviteAll, setConfirmInviteAll] = React.useState(false);
  const [notice, setNotice]                   = React.useState(null);   // { text, tone: 'ok' | 'warn' | 'error' }
  const fileInputRef = React.useRef(null);

  // Drop whatever is in the picker, so re-opening it never shows a stale file
  // name from a run the user already abandoned.
  const clearPicker = React.useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const refresh = React.useCallback(() => {
    if (!periodId) { setFaculty([]); return; }
    FacultyAPI.list(periodId)
      .then((rows) => setFaculty(Array.isArray(rows) ? rows : []))
      .catch(() => setFaculty([]));
  }, [periodId]);

  React.useEffect(() => { refresh(); }, [refresh]);

  // The result line goes away on its own.
  React.useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(id);
  }, [notice]);

  const showTable = faculty.length > 0;

  const handleViewFaculty = (f) => {
    setSelectedFaculty(f);
    setShowDetailModal(true);
  };

  // Picking a file no longer uploads it — it hands it to the Preview & Confirm
  // overlay. The write happens there, on "Confirm & Import", and not before.
  const handleReviewFile = () => {
    if (!selectedFile) { alert('Please choose a file first'); return; }
    if (!periodId)     { alert('Select an academic period first'); return; }
    setShowModal(false);
    setPendingFile(selectedFile);
  };

  // "Confirm & Import" succeeded — the rows are in. Everything the old
  // handleConfirmUpload did after a successful upload happens here instead.
  const onUploadCommitted = async (result) => {
    // Reconciliation opens FIRST, synchronously — Preview & Confirm calls this at
    // the end of its exit and unmounts as soon as it returns, so a dialog raised
    // after an `await` would mount a round-trip later, with the shared backdrop
    // already fading. Set the incoming dialog's state before anything async.
    // Smart-sync: anyone already in the DB but not in the new file gets retired.
    if (result && Array.isArray(result.missing) && result.missing.length > 0) {
      setRecon({ missing: result.missing });
    }
    clearPicker();
    await refresh();
    setUploadCount((n) => n + 1);
  };

  // Undone — put the user back where they can pick the RIGHT file.
  const onUploadUndone = async () => {
    await refresh();
    setUploadCount((n) => n + 1);
    setRecon(null);
    setPendingFile(null);
    clearPicker();
    setShowModal(true);
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
    setUploadCount((n) => n + 1);   // a manual add is undoable too
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

  // Invite now / Resend for one row. 409 = already has a password.
  const onInvite = async (row) => {
    if (invitingId) return;
    setInvitingId(row.id);
    try {
      const r = await FacultyAPI.invite(row.id);
      setNotice({ text: r.message, tone: r.skipped ? 'warn' : 'ok' });
      if (r.access) setFaculty((prev) => prev.map((f) => (f.id === row.id ? { ...f, access: { ...f.access, ...r.access, label: r.access.status === 'sent' ? 'Invited' : f.access.label } } : f)));
      await refresh();
    } catch (err) {
      setNotice({ text: err.message || 'Could not send the invitation.', tone: err.status === 409 ? 'warn' : 'error' });
    } finally {
      setInvitingId(null);
    }
  };

  const notInvited = React.useMemo(() => faculty.filter((f) => f.access && f.access.status === 'waiting'), [faculty]);

  const onInviteAll = async () => {
    setConfirmInviteAll(false);
    try {
      const r = await FacultyAPI.inviteAll(periodId);
      const parts = [r.sent + (r.sent === 1 ? ' invitation sent' : ' invitations sent')];
      if (r.skipped) parts.push(r.skipped + ' not sent');
      if (r.failed) parts.push(r.failed + ' failed');
      setNotice({ text: parts.join(', ') + '.', tone: r.failed ? 'error' : (r.skipped ? 'warn' : 'ok') });
      await refresh();
    } catch (err) {
      setNotice({ text: err.message || 'Could not send the invitations.', tone: 'error' });
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

  const noticeStyle = notice && notice.tone === 'error'
    ? { background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }
    : notice && notice.tone === 'warn'
      ? { background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E' }
      : { background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' };

  return (
    <div style={{ padding: 20, background: '#FFFFFF', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Faculty</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <UndoUploadButton entity="faculty" periodId={periodId} disabled={!periodId || !isCurrentTermActive} refreshKey={uploadCount} onUndone={refresh} />
          {showTable && isCurrentTermActive && notInvited.length > 0 && (
            <ActionBtn variant="white" onClick={() => setConfirmInviteAll(true)} icon={<Send size={18} color="#374151" />} label={'Invite all not yet invited (' + notInvited.length + ')'} width={280} />
          )}
          <ActionBtn variant="white" onClick={() => { if (faculty.length > 0) { setConfirmUpload(true); } else { setShowModal(true); } }} disabled={!periodId || !isCurrentTermActive} icon={<Upload size={18} color="#374151" />} label="Upload Faculty List" />
          {showTable && isCurrentTermActive && <ActionBtn onClick={() => setShowAddModal(true)} icon={<Plus size={18} color="#FFFFFF" />} label="Add Faculty" />}
        </div>
      </div>

      {!isCurrentTermActive && currentPeriod && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, color: '#92400E', fontSize: 13, lineHeight: '1.4' }}>
          <strong>Read-only:</strong> {currentPeriod.label} is not the current term. Switch to the current term to make changes.
        </div>
      )}

      {notice && (
        <div role="status" style={{ ...noticeStyle, marginBottom: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: '1.4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}><X size={14} /></button>
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
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,25,26,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 9999, border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: 14, cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap' }}
            >
              <Users size={16} color="#6B7280" />
              <span style={{ color: '#6B7280', fontWeight: 500 }}>Role:</span>
              <span style={{ color: '#18191A', fontWeight: 600 }}>{roleFilter || 'All Roles'}</span>
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
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', textAlign: 'left', border: 'none', borderRadius: 6, padding: '8px 10px', outline: 'none', cursor: 'pointer', background: active ? '#18191A' : 'transparent', color: active ? '#FFFFFF' : '#374151', fontSize: 14, fontWeight: active ? 600 : 500 }}
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
          onInvite={isCurrentTermActive ? onInvite : undefined}
          invitingId={invitingId}
          showAccess
          hideDepartment={true}
        />
      )}

      {!showTable && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 100, height: 100, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clipboard size={48} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#18191A' }}>No faculty yet</div>
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

      <DialogShell
        open={showModal}
        onBackdropClick={() => setShowModal(false)}
        ariaLabel="Upload Faculty List"
        panelStyle={{ width: 600, maxWidth: '94vw', padding: 24, background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
      >
            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Faculty List</div>
            <div onClick={() => fileInputRef.current && fileInputRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setSelectedFile(f); }} style={{ border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Upload size={36} color="#9CA3AF" />
              <div style={{ fontWeight: 600, color: '#18191A' }}>{selectedFile ? selectedFile.name : 'Drag & drop file here'}</div>
              <div style={{ color: '#6B7280', fontSize: 13 }}>Upload .xlsx, .xls or .csv</div>
              <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setSelectedFile(f); }} style={{ display: 'none' }} />
            </div>
            <div style={{ color: '#6B7280', fontSize: 13 }}>
              You'll see exactly what's in the file — and what would fail — before anything is saved.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { clearPicker(); setShowModal(false); }} style={{ flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #18191A', borderRadius: 8, color: '#18191A', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button disabled={!selectedFile} onClick={handleReviewFile} style={{ flex: 1, height: 40, background: '#18191A', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: selectedFile ? 'pointer' : 'not-allowed', fontWeight: 500, opacity: selectedFile ? 1 : 0.6 }}>Review file</button>
            </div>
      </DialogShell>

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
        message={'Uploading a file will update existing faculty and add new ones for ' + (currentPeriod ? currentPeriod.label : 'this period') + '. Anyone already listed but not in the new file will be flagged for reconciliation. You\'ll review the file before anything is saved. Proceed?'}
        confirmLabel="Continue to upload"
        onConfirm={() => { setConfirmUpload(false); setShowModal(true); }}
        onCancel={() => setConfirmUpload(false)}
      />

      <ConfirmModal
        open={confirmInviteAll}
        title="Invite everyone not yet invited?"
        message={'This sends a set-password invitation right now to ' + notInvited.length + (notInvited.length === 1 ? ' person' : ' people') + ' whose Access says "Not invited yet". People who already have an invitation, or a password, are not affected.'}
        confirmLabel={'Send ' + notInvited.length + (notInvited.length === 1 ? ' invitation' : ' invitations')}
        onConfirm={onInviteAll}
        onCancel={() => setConfirmInviteAll(false)}
      />

      {/* Preview & Confirm, then the 30-second undo toast. Mounted here so the
          toast outlives the overlay it was launched from. */}
      <UploadPreviewFlow
        file={pendingFile}
        entity="faculty"
        periodId={periodId}
        title="Upload Faculty List"
        preview={(f) => FacultyAPI.uploadPreview(f, periodId)}
        commit={(f) => FacultyAPI.upload(f, periodId)}
        toastNote={uploadNote}
        onBack={() => { setPendingFile(null); setShowModal(true); }}
        onCancel={() => { setPendingFile(null); clearPicker(); }}
        onCommitted={onUploadCommitted}
        onUndone={onUploadUndone}
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
