/**
 * LogoUploadModal — Change a department's logo.
 *
 * The grid is a single, consistent set of square tiles:
 *   • None     — first tile; clears the department's logo.
 *   • System   — built-in department logos (bundled assets). Permanent:
 *                marked with a lock badge, never deletable.
 *   • Uploaded — user-supplied images. Deletable from the library via a
 *                trash icon (OVPAA-only action in the real flow).
 *
 * Clicking a tile assigns it to the current department; the active tile
 * is shown with an accent border + checkmark. Uploading a new image adds
 * it to the library and assigns it immediately.
 *
 * The library is stored client-side via deptLogos.js (localStorage),
 * which lets the mock flow round-trip without a backend.
 */
import React from 'react';
import { X, UploadCloud, Trash2, Lock, Check } from 'react-feather';
import {
  getLogoLibrary, getBundledLogos, addToLogoLibrary, removeFromLogoLibrary,
  assignLogoToDept, removeDeptLogo, getCurrentLogoKey, getUsedLogoKeys,
} from '../services/deptLogos.js';

const ACCENT     = '#B91C1C';
const SLATE_900  = '#0F172A';
const SLATE_700  = '#334155';
const SLATE_500  = '#64748B';
const SLATE_400  = '#94A3B8';
const SLATE_300  = '#CBD5E1';
const SLATE_200  = '#E2E8F0';
const SLATE_100  = '#F1F5F9';
const SLATE_50   = '#F8FAFC';

const MAX_BYTES = 2 * 1024 * 1024;  // 2 MB cap on logo uploads

const fileToDataUrl = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload  = () => res(fr.result);
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(file);
});

const LogoUploadModal = ({ dept, departments, onClose, onSaved }) => {
  const [library, setLibrary]   = React.useState(() => getLogoLibrary());
  // Key of the tile this department currently resolves to (a library id or
  // 'bundled:<CODE>'), or null when it has no logo (the "None" tile).
  const [currentKey, setCurrentKey] = React.useState(() => getCurrentLogoKey(dept && dept.code));
  const [busy, setBusy]         = React.useState(false);
  const [err,  setErr]          = React.useState(null);
  // Tile pending deletion — drives the delete confirmation dialog.
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const inputRef = React.useRef(null);

  // Bundled (system) logos — re-read on refresh for consistency.
  const [bundled, setBundled] = React.useState(() => getBundledLogos());

  // Logo keys already assigned to OTHER departments — locked here so the
  // same logo can't be used by two departments. Excludes this dept, and
  // recomputes when its selection (currentKey) or the library changes.
  const usedElsewhere = React.useMemo(
    () => getUsedLogoKeys(departments, dept && dept.code),
    [departments, dept, currentKey, library, bundled]
  );

  // Map each logo key → the code of a department that actually uses it.
  // Drives the code badge so it shows the REAL owning department, not the
  // code a logo happened to be tagged with at upload time.
  const usageByKey = React.useMemo(() => {
    const m = {};
    (departments || []).forEach((d) => {
      if (!d || !d.code) return;
      const key = getCurrentLogoKey(d.code);
      if (key && !m[key]) m[key] = d.code;   // first department wins
    });
    return m;
  }, [departments, currentKey, library, bundled]);


  // Unified tile list, in display order:
  //   None → System (bundled) → Uploaded (custom). Every tile shares the
  //   same square footprint so the grid stays consistent.
  const tiles = React.useMemo(() => ([
    { kind: 'none', key: '__none__', name: 'None' },
    ...bundled.map((b) => ({ kind: 'system', key: 'bundled:' + b.code, src: b.url, name: b.file || b.code, code: b.code })),
    ...library.map((e) => ({ kind: 'uploaded', key: e.id, src: e.dataUrl, name: e.name, code: e.code, id: e.id })),
  ]), [bundled, library]);

  // Close on Escape.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const refresh = () => { setLibrary(getLogoLibrary()); setBundled(getBundledLogos()); };

  const handleFiles = async (files) => {
    setErr(null);
    if (!files || !files[0]) return;
    const f = files[0];
    if (!/^image\//.test(f.type)) { setErr('Please select an image file (PNG, JPG, SVG, or WebP).'); return; }
    if (f.size > MAX_BYTES) { setErr('Logo must be 2 MB or smaller.'); return; }
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(f);
      // Tag the upload with this department's code so it auto-matches
      // other same-code departments, and assign it here explicitly.
      // Keep the full file name (extension included) as the logo's label.
      const entry = addToLogoLibrary(f.name, dataUrl, dept.code);
      assignLogoToDept(dept.code, entry.id);
      setCurrentKey(entry.id);
      refresh();
      onSaved && onSaved();
    } catch (e) {
      setErr(e && e.message || 'Could not read the file.');
    } finally {
      setBusy(false);
    }
  };

  // Select a tile. The "None" tile clears the department's logo; any other
  // tile assigns it. Re-selecting the active tile is a no-op.
  const pickTile = (tile) => {
    if (tile.kind === 'none') {
      if (currentKey === null) return;
      removeDeptLogo(dept.code);
      setCurrentKey(null);
    } else {
      // Locked: re-selecting the active tile, or one already used by
      // another department.
      if (tile.key === currentKey || usedElsewhere.has(tile.key)) return;
      assignLogoToDept(dept.code, tile.key);
      setCurrentKey(tile.key);
    }
    onSaved && onSaved();
  };

  // Permanently delete a USER-UPLOADED logo from the library. System
  // (bundled) logos are never deletable, so this only handles uploads.
  // If the deleted logo was assigned here, fall back to whatever resolves
  // next (auto-matched bundled asset, or None).
  const deleteUpload = (tile) => {
    removeFromLogoLibrary(tile.id);
    if (currentKey === tile.key) setCurrentKey(getCurrentLogoKey(dept.code));
    refresh();
    onSaved && onSaved();
  };

  return (
    <>
      <div onClick={() => !busy && onClose()}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(720px, 94vw)', maxHeight: '88vh',
        background: '#FFFFFF', borderRadius: 14, zIndex: 101,
        boxShadow: '0 24px 60px rgba(15,23,42,0.30)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid ' + SLATE_200,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: SLATE_500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Insert Logo
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: SLATE_900, marginTop: 2, letterSpacing: '-0.01em' }}>
              {dept ? (dept.code + ' · ' + dept.name) : 'Department'}
            </div>
          </div>
          <button onClick={onClose} disabled={busy}
            style={{
              width: 36, height: 36, borderRadius: 8, background: 'transparent',
              border: '1px solid ' + SLATE_200, color: SLATE_500, cursor: busy ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Upload dropzone */}
          <div
            onClick={() => inputRef.current && inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            style={{
              border: '2px dashed ' + SLATE_300, borderRadius: 12,
              padding: 22, display: 'flex', alignItems: 'center', gap: 14,
              cursor: busy ? 'wait' : 'pointer', background: SLATE_50,
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.background = '#FEF2F2'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = SLATE_300; e.currentTarget.style.background = SLATE_50; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#FFFFFF',
              border: '1px solid ' + SLATE_200, color: ACCENT,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <UploadCloud size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: SLATE_900 }}>
                Upload a new logo
              </div>
              <div style={{ fontSize: 12, color: SLATE_500, marginTop: 2 }}>
                Drop a PNG, JPG, SVG, or WebP file here, or click to browse. Max 2 MB.
              </div>
            </div>
            <input ref={inputRef} type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {err && (
            <div style={{ fontSize: 12, color: ACCENT, background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px 12px', borderRadius: 10 }}>
              {err}
            </div>
          )}

          {/* Library grid */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: SLATE_900 }}>Logo library</div>
              <div style={{ fontSize: 12, color: SLATE_500, marginTop: 2 }}>
                Click a tile to assign it. Select <strong>None</strong> to remove the logo.
                Greyed-out logos are already used by another department; system logos
                are permanent, while your uploads can be deleted.
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12,
            }}>
              {tiles.map((t) => {
                const isNone     = t.kind === 'none';
                const isSystem   = t.kind === 'system';
                const isUploaded = t.kind === 'uploaded';
                const isSelected = isNone ? currentKey === null : t.key === currentKey;
                // Locked: already assigned to ANOTHER department (never the
                // None tile or this dept's own selection).
                const isLocked   = !isNone && !isSelected && usedElsewhere.has(t.key);
                // Restore color when a hover ends, by tile kind.
                const restColor  = isNone ? SLATE_300 : SLATE_200;
                const title = isNone
                  ? 'No logo'
                  : isLocked
                    ? (t.name + ' — already used by another department')
                    : (isSystem ? (t.name + ' — system logo (permanent)') : ('Use ' + t.name));
                return (
                  <div key={t.key} style={{ position: 'relative' }}>
                    <button onClick={() => pickTile(t)} title={title} disabled={isLocked}
                      style={{
                        width: '100%', aspectRatio: '1 / 1',
                        background: isLocked ? SLATE_100 : (isNone ? SLATE_50 : '#FFFFFF'),
                        border: isSelected
                          ? '2px solid ' + ACCENT
                          : (isNone ? '2px dashed ' + SLATE_300 : '1px solid ' + SLATE_200),
                        boxShadow: isSelected ? '0 0 0 3px rgba(24,25,26,0.12)' : 'none',
                        borderRadius: 12, cursor: isLocked ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 12, overflow: 'hidden', position: 'relative',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isSelected && !isLocked) e.currentTarget.style.borderColor = ACCENT; }}
                      onMouseLeave={(e) => { if (!isSelected && !isLocked) e.currentTarget.style.borderColor = restColor; }}
                    >
                      {isNone ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: SLATE_400, letterSpacing: '0.02em' }}>
                          No logo
                        </span>
                      ) : (
                        <img src={t.src} alt={t.name}
                          style={{
                            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                            filter: isLocked ? 'grayscale(1)' : 'none',
                            opacity: isLocked ? 0.45 : 1,
                          }} />
                      )}

                      {/* Selected check — top-left, all tile kinds. */}
                      {isSelected && (
                        <span style={{
                          position: 'absolute', top: 6, left: 6,
                          width: 20, height: 20, borderRadius: 9999,
                          background: ACCENT, color: '#FFFFFF',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(15,23,42,0.25)',
                        }} title="Currently selected">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}

                      {/* Top-right lock badge:
                          • used by another department → dark "locked" lock
                          • otherwise a system asset    → subtle permanent lock */}
                      {isLocked ? (
                        <span style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 20, height: 20, borderRadius: 9999,
                          background: SLATE_700, color: '#FFFFFF',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(15,23,42,0.25)',
                        }} title="Used by another department">
                          <Lock size={11} />
                        </span>
                      ) : isSystem && (
                        <span style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 20, height: 20, borderRadius: 9999,
                          background: SLATE_100, color: SLATE_500, border: '1px solid ' + SLATE_200,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }} title="System logo — permanent">
                          <Lock size={11} />
                        </span>
                      )}
                    </button>

                    {/* Delete — ONLY user-uploaded logos that aren't in use
                        by another department. Stops propagation so it
                        doesn't also select the tile. */}
                    {isUploaded && !isLocked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(t); }}
                        title="Delete from library"
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 26, height: 26, borderRadius: 9999,
                          background: '#FFFFFF', color: ACCENT,
                          border: '1px solid #FECACA', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(15,23,42,0.18)', padding: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#FFFFFF'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = ACCENT; }}
                      >
                        <Trash2 size={14} strokeWidth={2.25} />
                      </button>
                    )}

                    <div style={{
                      marginTop: 6, fontSize: 11, color: isSelected ? SLATE_900 : SLATE_500,
                      fontWeight: isSelected ? 600 : 400,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'center',
                    }} title={t.name}>{t.name}</div>
                    {/* Code badge shows the department that ACTUALLY uses this
                        logo — the current dept if selected here, otherwise the
                        other department that owns it — not the upload tag. */}
                    {(() => {
                      const usingCode = isSelected ? (dept && dept.code) : usageByKey[t.key];
                      if (isNone || !usingCode) return null;
                      return (
                        <div style={{ marginTop: 2, textAlign: 'center' }}
                          title={'In use by department ' + usingCode}>
                          <span style={{
                            display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                            color: ACCENT, background: '#FEF2F2', border: '1px solid #FECACA',
                            borderRadius: 9999, padding: '1px 8px',
                          }}>{usingCode}</span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid ' + SLATE_200, display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} disabled={busy}
            style={{
              height: 40, padding: '0 18px', borderRadius: 8,
              background: '#FFFFFF', color: SLATE_700, border: '1px solid ' + SLATE_200, cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 500, fontSize: 13,
            }}
          >
            Done
          </button>
        </div>
      </div>

      {/* Delete confirmation — sits above this modal (zIndex > 101). */}
      {pendingDelete && (
        <>
          <div onClick={() => setPendingDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 110 }} />
          <div role="dialog" aria-modal="true"
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 'min(420px, 92vw)', padding: 24, background: '#FFFFFF', borderRadius: 12,
              display: 'flex', flexDirection: 'column', gap: 16, zIndex: 111,
              boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22, background: '#FEE2E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Trash2 size={22} color={ACCENT} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: SLATE_900 }}>Delete logo?</div>
            </div>
            <div style={{ fontSize: 14, color: SLATE_700, lineHeight: '1.5' }}>
              Permanently delete <strong>{pendingDelete.name}</strong> from the logo library?
              This can’t be undone.
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button onClick={() => setPendingDelete(null)}
                style={{
                  flex: 1, height: 40, background: '#FFFFFF', border: '1px solid ' + SLATE_900,
                  borderRadius: 8, color: SLATE_900, cursor: 'pointer', fontWeight: 500,
                }}>
                Cancel
              </button>
              <button onClick={() => { deleteUpload(pendingDelete); setPendingDelete(null); }}
                style={{
                  flex: 1, height: 40, background: ACCENT, border: 'none',
                  borderRadius: 8, color: '#FFFFFF', cursor: 'pointer', fontWeight: 500,
                }}>
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default LogoUploadModal;
