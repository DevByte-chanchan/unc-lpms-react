import React from 'react';
import { useAuth } from '../../shared/AuthContext.jsx';
import VPAA from './pages/VPAA.jsx';
import Dean from './pages/Dean.jsx';
import ProgramHead from './pages/ProgramHead.jsx';
import DirectorOfLibraries from './pages/DirectorOfLibraries.jsx';
import SkeletonA from './layouts/SkeletonA.jsx';
import ApprovalCoursesTable from './components/ApprovalCoursesTable.jsx';

export default function SubmissionsQueuePage({ roleOverride }) {
  const { activeRole } = useAuth();
  const effectiveRole = roleOverride || activeRole || '';
  const r = String(effectiveRole).toLowerCase();

  if (r.includes('vpaa')) return <VPAA />;
  if (r.includes('dean')) return <Dean />;
  if (r.includes('librar')) return <DirectorOfLibraries />;
  if (r.includes('consultant')) {
    return (
      <SkeletonA
        content={
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <ApprovalCoursesTable role="industry-consultant" />
          </div>
        }
      />
    );
  }
  return <ProgramHead />;
}
