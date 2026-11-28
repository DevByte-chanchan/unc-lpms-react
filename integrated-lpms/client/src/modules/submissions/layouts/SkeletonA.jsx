import React from 'react';
import CoreShell from '../../../shared/CoreShell.jsx';

/**
 * Unified Shell Adapter for verbatim Submissions Management pages.
 * Renders page content directly inside the single Phase 3 authentic light CoreShell.
 */
const SkeletonA = ({ content, children }) => (
  <CoreShell scope="submissions">
    {content !== undefined ? content : children}
  </CoreShell>
);

export default SkeletonA;
