import React from 'react';
import { ScopedPeriodProvider } from './services/period.jsx';
import ProgramHeadIndustryConsultant from './pages/ProgramHeadIndustryConsultant.jsx';

export default function IndustryConsultantsPage() {
  return (
    <ScopedPeriodProvider>
      <ProgramHeadIndustryConsultant />
    </ScopedPeriodProvider>
  );
}
