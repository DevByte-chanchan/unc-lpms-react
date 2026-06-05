/**
 * ViewArchivedButton — a clearly-labelled filter-bar control that opens the
 * page-scoped Archive view (PageArchive) for one module.
 *
 * Replaces the old floating bottom-right FAB (FloatingArchiveButton). It
 * lives in the filter bar next to Search, so archived records are reachable
 * from an obvious, labelled affordance rather than a mystery-meat circle.
 * Archiving an individual record is done from that row's "⋯" actions menu.
 *
 * Mounted by each module page with its own `moduleType` + `onEditStatus`
 * (the same restore callback the archive view uses).
 */
import React from 'react';
import { Archive } from 'react-feather';
import PageArchive from './PageArchive.jsx';

const ViewArchivedButton = ({ moduleType, onEditStatus, label = 'View Archived' }) => {
  const [open, setOpen] = React.useState(false);

  if (!moduleType) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          height: 40, padding: '0 16px',
          background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 9999,
          color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <Archive size={16} color="#374151" />
        {label}
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

export default ViewArchivedButton;
