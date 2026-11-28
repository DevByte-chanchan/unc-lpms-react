import React from 'react';
import CoreShell from './CoreShell.jsx';
import './UnifiedShell.css';

/**
 * Compatibility bridge for existing M1/M3 pages during Phases 3–6.
 * Renders inside the authentic light CoreShell (zero dark wrapper, zero module badges)
 * while keeping existing page helper classes (.lpms-card, .lpms-table, etc.) intact
 * until Phases 5 & 6 transplant the original Course Assignment & Submissions pages verbatim.
 */
export default function UnifiedShell({ title, subtitle, actions, fullBleed = false, children }) {
  return (
    <CoreShell padded={!fullBleed} title={title} subtitle={subtitle} actions={actions}>
      {children}
    </CoreShell>
  );
}
