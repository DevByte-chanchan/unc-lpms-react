/**
 * Table of Specifications (TOS) Management — OVPAA sub-page.
 *
 * Mirror of OVPAALearningPlan.jsx, bound to the mock approved-TOS
 * dataset. Hosted by OVPAA.jsx under ?page=TOS.
 */
import React from 'react';
import OVPAARepository from './OVPAARepository.jsx';
import { mockTOS } from '../data/mockApprovedSubmissions.js';

const OVPAATOS = () => (
  <OVPAARepository kind="Table of Specifications" dataset={mockTOS} />
);

export default OVPAATOS;
