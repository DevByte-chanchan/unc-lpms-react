import React from 'react';
import CoreShell from '../../shared/CoreShell.jsx';
import { ScopedPeriodProvider } from './services/period.jsx';
import { useCurrentUser } from './services/currentUser.jsx';
import DeanDepartmentStatements from './pages/DeanDepartmentStatements.jsx';

export default function DepartmentVisionMissionPage() {
  const { name, user } = useCurrentUser();
  const departmentCode = user?.departmentCode || 'SCIS';
  return (
    <CoreShell scope="course-assignment">
      <ScopedPeriodProvider>
        <DeanDepartmentStatements userName={name} departmentCode={departmentCode} />
      </ScopedPeriodProvider>
    </CoreShell>
  );
}
