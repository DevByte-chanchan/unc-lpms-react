/**
 * Shown on Course Offerings / Course Assignment while the current term has no
 * dates yet: it opened by itself when the previous semester ended, and it is
 * fully editable — the dates are the OVPAA's to add later.
 */
import React from 'react';
import { Info } from 'react-feather';
import { usePeriod } from '../services/period.jsx';
import { prettifyLabel, termDatesPending } from '../services/periodLabel.js';

const TermOpenNote = ({ what }) => {
  const { currentPeriod, isCurrentTermActive } = usePeriod();
  if (!currentPeriod || !isCurrentTermActive || !termDatesPending(currentPeriod)) return null;
  return (
    <div role="status" style={{ marginBottom: 12, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, color: '#1E3A8A', fontSize: 13, lineHeight: 1.45, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>
        <strong>{prettifyLabel(currentPeriod.label)} is open.</strong> It opened when the last semester ended.
        The OVPAA hasn&apos;t set its dates yet, but you can already add and update {what}.
      </span>
    </div>
  );
};

export default TermOpenNote;
