import React from 'react';
import CoreShell from '../../shared/CoreShell.jsx';
import { ScopedPeriodProvider } from './services/period.jsx';
import { useCurrentUser } from './services/currentUser.jsx';
import OVPAAUniversityStatements from './pages/OVPAAUniversityStatements.jsx';

export default function UniversityVmgoPage() {
  const { name } = useCurrentUser();
  return (
    <CoreShell scope="course-assignment">
      <ScopedPeriodProvider>
        <OVPAAUniversityStatements userName={name} />
      </ScopedPeriodProvider>
    </CoreShell>
  );
}
