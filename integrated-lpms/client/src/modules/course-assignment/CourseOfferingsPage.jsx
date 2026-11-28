import React from 'react';
import { ScopedPeriodProvider } from './services/period.jsx';
import ProgramHeadCourses from './pages/ProgramHeadCourses.jsx';

export default function CourseOfferingsPage() {
  return (
    <ScopedPeriodProvider>
      <ProgramHeadCourses />
    </ScopedPeriodProvider>
  );
}
