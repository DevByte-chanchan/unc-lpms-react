import React from 'react';
import CoreShell from '../../shared/CoreShell.jsx';
import { ScopedPeriodProvider } from './services/period.jsx';
import DeanFaculty from './pages/DeanFaculty.jsx';

export default function DeanFacultyPage() {
  return (
    <CoreShell scope="course-assignment">
      <ScopedPeriodProvider>
        <DeanFaculty />
      </ScopedPeriodProvider>
    </CoreShell>
  );
}
