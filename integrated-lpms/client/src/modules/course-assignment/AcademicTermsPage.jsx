import React from 'react';
import CoreShell from '../../shared/CoreShell.jsx';
import { ScopedPeriodProvider } from './services/period.jsx';
import AcademicTerms from './pages/AcademicTerms.jsx';

export default function AcademicTermsPage() {
  return (
    <CoreShell scope="course-assignment">
      <ScopedPeriodProvider>
        <AcademicTerms />
      </ScopedPeriodProvider>
    </CoreShell>
  );
}
