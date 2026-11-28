import React from 'react';
import CoreShell from '../../shared/CoreShell.jsx';
import { ScopedPeriodProvider } from './services/period.jsx';
import HRStaff from './pages/HRStaff.jsx';

export default function DepartmentsPage() {
  return (
    <CoreShell scope="course-assignment">
      <ScopedPeriodProvider>
        <HRStaff />
      </ScopedPeriodProvider>
    </CoreShell>
  );
}
