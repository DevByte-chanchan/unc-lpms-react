import React from 'react';
import CoreShell from '../../shared/CoreShell.jsx';
import { ScopedPeriodProvider } from './services/period.jsx';
import DeanPrograms from './pages/DeanPrograms.jsx';

export default function DeanProgramsPage() {
  return (
    <CoreShell scope="course-assignment">
      <ScopedPeriodProvider>
        <DeanPrograms />
      </ScopedPeriodProvider>
    </CoreShell>
  );
}
