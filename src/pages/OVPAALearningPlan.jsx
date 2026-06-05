/**
 * Learning Plan Management — OVPAA sub-page.
 *
 * Thin wrapper over the shared OVPAARepository shell; binds the mock
 * approved-Learning-Plan dataset and the document kind string.
 *
 * Hosted by OVPAA.jsx under ?page=Learning%20Plan and rendered inside
 * the existing SkeletonA layout (header + side nav), so we export
 * content-only.
 */
import React from 'react';
import OVPAARepository from './OVPAARepository.jsx';
import { mockLearningPlans } from '../data/mockApprovedSubmissions.js';

const OVPAALearningPlan = () => (
  <OVPAARepository kind="Learning Plan" dataset={mockLearningPlans} />
);

export default OVPAALearningPlan;
