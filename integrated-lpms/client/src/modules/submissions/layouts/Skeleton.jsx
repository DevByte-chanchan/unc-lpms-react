import React from 'react';
import CoreShell from '../../../shared/CoreShell.jsx';

/**
 * Unified Shell Adapter for verbatim Submissions Management detail/review pages.
 */
const Skeleton = ({ content, children }) => (
  <CoreShell scope="submissions">
    {content !== undefined ? content : children}
  </CoreShell>
);

export default Skeleton;
