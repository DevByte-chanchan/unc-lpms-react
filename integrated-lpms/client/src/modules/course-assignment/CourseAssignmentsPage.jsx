import React from 'react';
import { ScopedPeriodProvider } from './services/period.jsx';
import ProgramHeadCourseAssignment from './pages/ProgramHeadCourseAssignment.jsx';

export default function CourseAssignmentsPage() {
  return (
    <ScopedPeriodProvider>
      <ProgramHeadCourseAssignment />
    </ScopedPeriodProvider>
  );
}
