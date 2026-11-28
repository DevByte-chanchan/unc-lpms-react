import React from 'react';
import CoreShell from '../../../shared/CoreShell.jsx';

/**
 * Unified Shell Adapter for verbatim Course Assignment pages.
 * Renders page content directly inside the single Phase 3 authentic light CoreShell
 * (no duplicate sidebar or header).
 */
const SkeletonA = ({ content, children }) => (
  <CoreShell scope="course-assignment">
    {content !== undefined ? content : children}
  </CoreShell>
);

export default SkeletonA;