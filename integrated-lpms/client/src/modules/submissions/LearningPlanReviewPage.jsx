import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext.jsx';
import ApprovalSyllabus from './pages/ApprovalSyllabus.jsx';
import Skeleton from './layouts/Skeleton.jsx';
import ApprovalSyllabusSections from './components/ApprovalSyllabusSections.jsx';
import { fetchJson } from './utils/api.js';
import pageStyles from './styles/ApprovalSyllabus.module.sass';

function roleToKey(role) {
  const s = String(role || '').toLowerCase();
  if (s.includes('vpaa')) return 'vpaa';
  if (s.includes('dean')) return 'dean';
  if (s.includes('program')) return 'program-head';
  if (s.includes('librar')) return 'director-of-libraries';
  if (s.includes('consultant')) return 'industry-consultant';
  if (s.includes('instructor')) return 'instructor';
  return 'program-head';
}

export default function LearningPlanReviewPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { activeRole } = useAuth();

  // If opened on the native Submissions route (/role/:approver/courses/:code), render verbatim ApprovalSyllabus directly.
  if (params.approver && params.code) {
    return <ApprovalSyllabus />;
  }

  // Otherwise opened via unified /submissions/review/:pcId — resolve courseCode & revNum from workflow endpoint.
  const pcId = params.pcId || searchParams.get('pcId') || '';
  const queryCode = searchParams.get('code') || '';
  const queryRev = searchParams.get('revNum') || '';
  const [meta, setMeta] = useState({
    loading: Boolean(pcId && !queryCode),
    code: queryCode,
    revNum: queryRev,
  });

  useEffect(() => {
    if (!pcId || queryCode) return undefined;
    let alive = true;
    fetchJson(`/api/assignments/offering/${encodeURIComponent(pcId)}`)
      .then((res) => {
        if (!alive) return;
        setMeta({
          loading: false,
          code: res?.plan?.code || res?.offering?.course?.course_no || res?.assignment?.course_code || '',
          revNum: String(res?.plan?.revision || res?.offering?.revision_number || queryRev || 1),
        });
      })
      .catch(() => {
        if (alive) setMeta((prev) => ({ ...prev, loading: false }));
      });
    return () => { alive = false; };
  }, [pcId, queryCode, queryRev]);

  const roleKey = roleToKey(activeRole);

  if (meta.loading) {
    return (
      <Skeleton
        content={
          <div style={{ padding: 32, color: '#6b7280', fontSize: 14 }}>
            Loading learning plan review…
          </div>
        }
      />
    );
  }

  return (
    <Skeleton
      content={
        <div className={pageStyles.page}>
          <ApprovalSyllabusSections
            currentRole={roleKey}
            courseCode={meta.code}
            pcId={pcId}
            revNum={meta.revNum || queryRev}
          />
        </div>
      }
    />
  );
}
