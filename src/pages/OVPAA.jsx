/**
 * OVPAA — Office of the Vice President for Academic Affairs.
 *
 * Wrapper page that hosts the OVPAA sub-views, selected via `?page=`:
 *   - "Dashboard"        → AcademicTerms (default)
 *   - "Department List"  → HRStaff
 *   - "Learning Plan"    → OVPAALearningPlan  (repository of approved LPs)
 *   - "TOS"              → OVPAATOS           (repository of approved TOS)
 *
 * Mirrors the structure of Dean.jsx — SkeletonA outside, the inner
 * sub-page swaps based on the search param.
 */
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import SkeletonA from '../layouts/SkeletonA.jsx';
import HeaderA from '../components/HeaderA.jsx';
import SideNavigation from '../components/SideNavigation.jsx';
import AcademicTerms from './AcademicTerms.jsx';
import HRStaff from './HRStaff.jsx';
import OVPAALearningPlan from './OVPAALearningPlan.jsx';
import OVPAATOS from './OVPAATOS.jsx';

const OVPAA = () => {
  const [searchParams] = useSearchParams();
  const page = searchParams.get('page') || 'Dashboard';

  const renderContent = () => {
    switch (page) {
      case 'Department List':
        return <HRStaff key="department-list" />;
      case 'Learning Plan':
        return <OVPAALearningPlan key="learning-plan" />;
      case 'TOS':
        return <OVPAATOS key="tos" />;
      case 'Dashboard':
      // Back-compat: old links may still say "Academic Term".
      case 'Academic Term':
      default:
        return <AcademicTerms key="dashboard" />;
    }
  };

  return (
    <SkeletonA
      header={<HeaderA role="OIC-OVPAA" name="NORTON, MONICA" />}
      nav={<SideNavigation mode="ovpaa" />}
      content={renderContent()}
    />
  );
};

export default OVPAA;
