import React from 'react';
import CoreShell from '../../shared/CoreShell.jsx';
import { ScopedPeriodProvider } from './services/period.jsx';
import UserAccounts from './pages/UserAccounts.jsx';

export default function UserAccountsPage() {
  return (
    <CoreShell scope="course-assignment">
      <ScopedPeriodProvider>
        <UserAccounts />
      </ScopedPeriodProvider>
    </CoreShell>
  );
}
