/**
 * Shared pieces of the two VMGO pages — University VMGO (OVPAA) and
 * Department Vision & Mission (Dean). Both upload a PDF, review the extracted fields
 * beside the current version, save a new version, and browse / restore old
 * ones; only the fields differ. The state machine lives in useVmgoVersions.js.
 */
import React from 'react';
import {
  Upload, X, Check, AlertTriangle, ChevronLeft, ChevronUp, ChevronDown, Trash2, Plus,
  FileText, Eye, RotateCcw, Info,
} from 'react-feather';
import DialogShell from '../DialogShell.jsx';
import ConfirmModal from '../ConfirmModal.jsx';
import { Stepper } from '../UploadPreviewFlow.jsx';
import flow from '../../styles/UploadPreviewFlow.module.sass';
import styles from '../../styles/VmgoStatements.module.sass';
import { cx, fmtDate, sameItem, versionMeta, withKeys } from './vmgoUtils.js';

// Same look as the department/faculty pages' header buttons.
export const ActionBtn = ({ onClick, icon, label, disabled, variant }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 20px', gap: 8, minWidth: 240, height: 40, boxSizing: 'border-box', background: variant === 'white' ? '#FFFFFF' : (disabled ? '#9CA3AF' : '#18191A'), borderRadius: 6, color: variant === 'white' ? '#374151' : '#fff', border: variant === 'white' ? '1px solid #D1D5DB' : 'none', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? (variant === 'white' ? 0.6 : 0.7) : 1 }}>
    <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    {label}
  </button>
);

// ---------------------------------------------------------------------------
// Notices and warnings
// ---------------------------------------------------------------------------

/** Small inline warning under a field. */
export const Warn = ({ children }) => (
  <div className={styles.warn}>
    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>{children}</span>
  </div>
);

/** Full-width notice at the top of the review form. `info` is the blue style. */
export const Notice = ({ info, icon, children }) => (
  <div className={cx(styles.notice, info && styles.noticeInfo)}>
    {icon || (info ? <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />)}
    <span>{children}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Editable lists
// ---------------------------------------------------------------------------

/**
 * Editable rows with add / remove / move; every row needs a title.
 */
export const ListEditor = ({ section, items, current, onChange }) => {
  const update = (idx, patch) => onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const move = (idx, dir) => {
    const next = items.slice();
    const [it] = next.splice(idx, 1);
    next.splice(idx + dir, 0, it);
    onChange(next);
  };
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, ...withKeys([{ title: '', description: '' }])]);

  return (
    <>
      {items.map((it, i) => {
        const missingTitle = !it.title.trim();
        const changed = current && !sameItem(it, current[i]);
        return (
          <div key={it._key} className={cx(styles.item, changed && styles.itemChanged)}>
            <div className={styles.itemNum}>{section.numbered ? (i + 1) + '.' : '•'}</div>
            <div className={styles.itemFields}>
              <input
                className={cx(styles.input, missingTitle && styles.inputInvalid)}
                value={it.title}
                placeholder="Title (required)"
                aria-label={section.noun + ' ' + (i + 1) + ' title'}
                onChange={(e) => update(i, { title: e.target.value })}
                style={{ fontWeight: 600 }}
              />
              <textarea
                className={styles.textarea}
                value={it.description}
                placeholder="Description"
                aria-label={section.noun + ' ' + (i + 1) + ' description'}
                rows={2}
                onChange={(e) => update(i, { description: e.target.value })}
                style={{ minHeight: 56 }}
              />
              {it._warning && <Warn>{it._warning}</Warn>}
              {missingTitle && !it._warning && <span className={styles.fieldError}>Every {section.noun} needs a title.</span>}
            </div>
            <div className={styles.itemActions}>
              <button className={styles.iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up"><ChevronUp size={16} /></button>
              <button className={styles.iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" title="Move down"><ChevronDown size={16} /></button>
              <button className={styles.iconBtn} onClick={() => remove(i)} aria-label="Remove" title="Remove"><Trash2 size={14} color="#B91C1C" /></button>
            </div>
          </div>
        );
      })}
      <button className={cx(styles.smallBtn, styles.addBtn)} onClick={add}>
        <Plus size={14} /> Add {section.noun}
      </button>
    </>
  );
};

// ---------------------------------------------------------------------------
// "Current version" column of the side-by-side review
// ---------------------------------------------------------------------------

export const CurrentText = ({ value }) => (
  <div>
    <div className={styles.currentLabel}>Current</div>
    <div className={styles.current}>{value || <span className={styles.docEmpty}>Not provided</span>}</div>
  </div>
);

export const CurrentList = ({ section, items }) => (
  <div>
    <div className={styles.currentLabel}>Current</div>
    <div className={styles.current}>
      {(!items || items.length === 0) ? <span className={styles.docEmpty}>None</span> : (
        <ol className={cx(styles.docList, !section.numbered && styles.docListPlain)}>
          {items.map((it, i) => <li key={i}><strong>{it.title}</strong> {it.description}</li>)}
        </ol>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Page-level pieces
// ---------------------------------------------------------------------------

export const EmptyState = ({ title, children, onUpload }) => (
  <div className={styles.empty}>
    <div className={styles.emptyIcon}><Upload size={48} color="#9CA3AF" /></div>
    <div style={{ fontSize: 18, fontWeight: 600, color: '#18191A' }}>{title}</div>
    <div style={{ color: '#6B7280', maxWidth: 460, fontSize: 14, lineHeight: '1.5' }}>{children}</div>
    <ActionBtn onClick={onUpload} icon={<Upload size={18} color="#FFFFFF" />} label="Upload PDF" />
  </div>
);

export const HistoryPanel = ({ history, restoreError, toRestore, onView, onRestore }) => (
  <aside className={styles.side}>
    <div className={styles.sideTitle}>Previous versions</div>
    {restoreError && !toRestore && <span className={styles.fieldError}>{restoreError}</span>}
    {history.length <= 1 && <div className={styles.versionMeta}>No earlier versions yet.</div>}
    {history.map((v) => (
      <div key={v.id} className={styles.version}>
        <div className={styles.versionTop}>
          <span>{fmtDate(v.createdAt)}</span>
          <span className={cx(styles.badge, v.status !== 'Active' && styles.badgeMuted)}>{v.status}</span>
        </div>
        <div className={styles.versionMeta}>
          {[v.uploaded_by, v.source_filename].filter(Boolean).join(' · ') || '—'}
        </div>
        <div className={styles.versionActions}>
          <button className={styles.smallBtn} onClick={() => onView(v)}><Eye size={14} /> View</button>
          {v.status !== 'Active' && (
            <button className={styles.smallBtn} onClick={() => onRestore(v)}>
              <RotateCcw size={14} /> Restore
            </button>
          )}
        </div>
      </div>
    ))}
  </aside>
);

/** Step 1: pick the PDF. `vm` is the useVmgoVersions() result. */
export const PickerDialog = ({ vm, title }) => {
  const { showPicker, setShowPicker, selectedFile, fileInputRef, pickFile, clearPicker, startReview } = vm;
  const ok = !!selectedFile && /\.pdf$/i.test(selectedFile.name);
  return (
    <DialogShell
      open={showPicker}
      onBackdropClick={() => setShowPicker(false)}
      ariaLabel={title}
      panelStyle={{ width: 600, maxWidth: '94vw', padding: 24, background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
    >
      <div style={{ fontSize: 20, fontWeight: 600 }}>{title}</div>
      <Stepper active={0} />
      <div
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
        style={{ border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <Upload size={36} color="#9CA3AF" />
        <div style={{ fontWeight: 600, color: '#18191A' }}>{selectedFile ? selectedFile.name : 'Drag & drop file here'}</div>
        <div style={{ color: '#6B7280', fontSize: 13 }}>Upload a .pdf (max 10 MB)</div>
        <input type="file" ref={fileInputRef} accept=".pdf,application/pdf" onChange={(e) => pickFile(e.target.files && e.target.files[0])} style={{ display: 'none' }} />
      </div>
      {selectedFile && !/\.pdf$/i.test(selectedFile.name) && (
        <div className={styles.fieldError}>Only PDF files can be read here.</div>
      )}
      <div style={{ color: '#6B7280', fontSize: 13 }}>
        Nothing is saved until you've reviewed what was read from the PDF and pressed Confirm & Save.
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => { clearPicker(); setShowPicker(false); }} style={{ flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #18191A', borderRadius: 8, color: '#18191A', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
        <button disabled={!ok} onClick={startReview} style={{ flex: 1, height: 40, background: '#18191A', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: ok ? 'pointer' : 'not-allowed', fontWeight: 500, opacity: ok ? 1 : 0.6 }}>Review file</button>
      </div>
    </DialogShell>
  );
};

/**
 * Steps 2 and 3: the review frame (header, stepper, file name, footer) around
 * the page's own form (`children`), then the "saved" screen.
 */
export const ReviewDialog = ({ vm, title, ariaLabel, canSave, invalidHint, doneTitle, children }) => {
  const { reviewFile, saved, saving, extracting, extractError, form, extracted, history, closeReview, backToPicker, doSave, saveError } = vm;
  const step = saved ? 2 : 1;
  return (
    <DialogShell open={!!reviewFile} panelClassName={flow.panel} ariaLabel={ariaLabel}>
      <div className={flow.header}>
        <div className={flow.headerTop}>
          <h2 className={flow.title}>{title}</h2>
          <button className={flow.closeBtn} onClick={closeReview} disabled={saving} aria-label="Close">
            <X size={22} color="#18191A" />
          </button>
        </div>
        <Stepper active={step} />
        {!saved && (
          <div className={flow.filename} title={reviewFile ? reviewFile.name : ''}>
            <FileText size={18} color="#6B7280" />
            <span className={flow.filenameText}>{reviewFile ? reviewFile.name : ''}</span>
            <span className={flow.filenameHint}>— not the right file? Use Back.</span>
          </div>
        )}
      </div>

      {saved ? (
        <div className={styles.done}>
          <div className={styles.doneIcon}><Check size={32} color="#047857" /></div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{doneTitle}</div>
          <div style={{ color: '#6B7280', fontSize: 14, maxWidth: 460, lineHeight: 1.5 }}>
            This is now the current version.
            {history.length > 1 ? ' The previous one is kept under Previous versions and can be restored.' : ''}
          </div>
        </div>
      ) : (
        <div className={styles.reviewBody}>
          {extracting && <div className={flow.empty}>Reading {reviewFile ? reviewFile.name : 'file'}…</div>}

          {!extracting && extractError && (
            <div className={flow.empty}>
              <div className={flow.reasonError} style={{ justifyContent: 'center', marginBottom: 8, maxWidth: 560, margin: '0 auto 8px' }}>{extractError}</div>
              Use Back to choose a different file.
            </div>
          )}

          {!extracting && form && extracted && children}
        </div>
      )}

      <div className={flow.footer}>
        {saved ? <span /> : (
          <button className={cx(flow.btn, flow.btnGhost)} onClick={backToPicker} disabled={saving}>
            <ChevronLeft size={18} color="#374151" /> Back
          </button>
        )}
        <div className={flow.footerRight}>
          {saveError && <span className={flow.error}>{saveError}</span>}
          {!saved && form && !canSave && !saving && (
            <span className={flow.error}>{invalidHint}</span>
          )}
          {saved ? (
            <button className={cx(flow.btn, flow.btnPrimary)} onClick={closeReview}>Done</button>
          ) : (
            <>
              <button className={cx(flow.btn, flow.btnOutline)} onClick={closeReview} disabled={saving}>Cancel</button>
              <button className={cx(flow.btn, flow.btnPrimary)} onClick={() => doSave(canSave)} disabled={!canSave || saving}>
                {saving ? 'Saving…' : 'Confirm & Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </DialogShell>
  );
};

/** The "Current version / From this PDF" column headings. */
export const ColumnHeads = () => (
  <div className={cx(styles.colHeads, styles.twoCol)}>
    <span>From this PDF (editable)</span>
    <span>Current version</span>
  </div>
);

/** A past version in a dialog, rendered by the page's own `renderDocument`. */
export const VersionDialog = ({ vm, renderDocument }) => {
  const { viewing, setViewing, askRestore } = vm;
  return (
    <DialogShell
      open={!!viewing}
      onBackdropClick={() => setViewing(null)}
      ariaLabel="View version"
      panelStyle={{ width: 900, maxWidth: '94vw', maxHeight: '88vh', padding: 24, background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
    >
      {viewing && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                Version of {fmtDate(viewing.createdAt)}{' '}
                <span className={cx(styles.badge, viewing.status !== 'Active' && styles.badgeMuted)} style={{ verticalAlign: 'middle' }}>{viewing.status}</span>
              </div>
              <div className={styles.meta}>{versionMeta(viewing)}</div>
            </div>
            <button className={flow.closeBtn} onClick={() => setViewing(null)} aria-label="Close"><X size={22} color="#18191A" /></button>
          </div>
          <div style={{ overflow: 'auto' }}>{renderDocument(viewing)}</div>
          {viewing.status !== 'Active' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className={cx(flow.btn, flow.btnPrimary)} onClick={() => askRestore(viewing)}>
                <RotateCcw size={16} color="#FFFFFF" /> Restore this version
              </button>
            </div>
          )}
        </>
      )}
    </DialogShell>
  );
};

/** "Restore this version?" — `subject` completes "will become the current …". */
export const RestoreConfirm = ({ vm, subject }) => {
  const { toRestore, restoring, restoreError, doRestore, cancelRestore } = vm;
  return (
    <ConfirmModal
      open={!!toRestore}
      title="Restore this version?"
      busy={restoring}
      confirmLabel={restoring ? 'Restoring…' : 'Restore'}
      message={
        <span>
          The version from {toRestore ? fmtDate(toRestore.createdAt) : ''} will become the current
          {' '}{subject}. It is copied as a new version, so the one in use now stays in the history
          and can be restored again.
          {restoreError && <><br /><br /><span style={{ color: '#B91C1C' }}>{restoreError}</span></>}
        </span>
      }
      onConfirm={doRestore}
      onCancel={cancelRestore}
    />
  );
};
