/**
 * FloatingArchiveButton — a fixed bottom-right FAB that opens the
 * page-scoped Archive view (PageArchive) for one module.
 *
 * Mounted by each module page with its own `moduleType` so the FAB
 * only ever surfaces that page's archive history.
 */
import React from 'react';
import { Archive } from 'react-feather';
import PageArchive from './PageArchive.jsx';

const FloatingArchiveButton = ({ moduleType, onEditStatus }) => {
  const [open, setOpen] = React.useState(false);

  if (!moduleType) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View Archive"
        aria-label="View Archive"
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 50,
          width: 56, height: 56, borderRadius: 28,
          background: '#18191A', color: '#FFFFFF', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        }}
      >
        <Archive size={24} color="#FFFFFF" />
      </button>
      {open && (
        <PageArchive
          moduleType={moduleType}
          onEditStatus={onEditStatus}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default FloatingArchiveButton;
