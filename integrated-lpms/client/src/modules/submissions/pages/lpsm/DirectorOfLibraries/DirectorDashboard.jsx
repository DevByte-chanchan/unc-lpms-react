import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { Bone } from '../../../components/LoadingSkeleton.jsx';
import styles from '../../../styles/DirectorDashboard.module.sass';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
import { loadLibrary, loadReferenceTypes } from '../../../utils/referenceStore.js';
import { typeLabel, getCatalogSettings, refreshCatalogSettings } from '../../../utils/referenceCatalog.js';
import { healthSummary } from '../../../utils/referenceHealth.js';

// The Director of Libraries' dashboard (approver plan 4.1): the plans waiting on them, every term, longest first
// (server: GET /api/assignments/waiting-on-me, the same rule as the "waiting for your review" reminders), and the
// state of the Reference Library: how many titles of each type, and how many need attention and why.

const CURRENT_YEAR = new Date().getFullYear();
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const reviewPath = (plan) => `/role/director-of-libraries/courses/${encodeURIComponent(plan.courseCode)}?status=pending&fromStatus=pending&pcId=${plan.offeringId}`;

const DirectorDashboard = () => {
  const [waiting, setWaiting] = useState({ loading: true, error: '', plans: [] });
  const [library, setLibrary] = useState({ loading: true, error: '', records: [] });
  const [rules, setRules] = useState(getCatalogSettings);

  useEffect(() => {
    let on = true;
    fetchJson('/api/assignments/waiting-on-me')
      .then(data => { if (on) setWaiting({ loading: false, error: '', plans: data?.plans || [] }); })
      .catch(err => { if (on) setWaiting({ loading: false, error: apiErrorMessage(err, 'The plans waiting on you could not be loaded.'), plans: [] }); });
    loadReferenceTypes().then(loadLibrary)
      .then(records => { if (on) setLibrary({ loading: false, error: '', records }); })
      .catch(err => { if (on) setLibrary({ loading: false, error: apiErrorMessage(err, 'The Reference Library could not be loaded.'), records: [] }); });
    refreshCatalogSettings(fetchJson).then(latest => { if (on) setRules(latest); });
    return () => { on = false; };
  }, []);

  const active = useMemo(() => library.records.filter(r => !r.archived), [library.records]);
  const health = useMemo(() => healthSummary(active, { years: rules.recencyYears, currentYear: CURRENT_YEAR }), [active, rules.recencyYears]);
  const byType = useMemo(() => {
    const counts = new Map();
    active.forEach(r => { const label = typeLabel(r.type); counts.set(label, (counts.get(label) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [active]);
  const reasons = [
    [health.unavailable, 'not available (lost, withdrawn or no copies)'],
    [health.outdated, `published ${rules.recencyYears} or more years ago`],
    [health.noYear, 'no publication year'],
    [health.noIsbn, 'textbooks with no ISBN'],
    [health.badIsbn, 'ISBN not valid'],
    [health.noLink, 'no link'],
  ].filter(([count]) => count > 0);

  const content = (
    <div className={styles.page}>
      <h1 className="app-page-title">Dashboard</h1>

      <section className={styles.card} aria-labelledby="waiting-title">
        <div className={styles.cardHead}>
          <h2 id="waiting-title">Waiting for your review</h2>
          {!waiting.loading && !waiting.error && <span className={styles.count}>{plural(waiting.plans.length, 'plan')}</span>}
        </div>
        {waiting.loading ? <Bone h={88} />
          : waiting.error ? <p role="alert" className={styles.error}>{waiting.error}</p>
            : waiting.plans.length === 0 ? <EmptyState title="Nothing is waiting on you" hint="A plan appears here when an instructor submits it." />
              : (
                <ul className={styles.list}>
                  {waiting.plans.map(plan => (
                    <li key={plan.offeringId}>
                      <Link to={reviewPath(plan)} className={styles.planRow}>
                        <span className={styles.planCode}>{plan.courseCode}</span>
                        <span className={styles.planTitle}>{plan.courseTitle}<small>{[plan.programName, plan.schoolYear, plan.semester && `${plan.semester} sem`].filter(Boolean).join(' · ')}</small></span>
                        <span className={plan.waitedDays >= 3 ? styles.waitLong : styles.wait}>
                          {plan.waitedDays <= 0 ? 'since today' : `${plural(plan.waitedDays, 'day')} waiting`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
      </section>

      <section className={styles.card} aria-labelledby="library-title">
        <div className={styles.cardHead}>
          <h2 id="library-title">Reference Library</h2>
          <Link to="/role/director-of-libraries/reference-library" className={styles.more}>Open the library</Link>
        </div>
        {library.loading ? <Bone h={88} />
          : library.error ? <p role="alert" className={styles.error}>{library.error}</p>
            : (
              <div className={styles.libraryGrid}>
                <div>
                  <p className={styles.big}>{active.length}<small> active titles</small></p>
                  <ul className={styles.types}>
                    {byType.map(([label, count]) => <li key={label}><span>{label}</span><strong>{count}</strong></li>)}
                  </ul>
                </div>
                <div>
                  <p className={styles.big}>{health.needAttention}<small> need attention</small></p>
                  {reasons.length === 0 ? <p className={styles.ok}>All titles are available, recent and complete.</p> : (
                    <ul className={styles.types}>
                      {reasons.map(([count, why]) => <li key={why}><span>{why}</span><strong>{count}</strong></li>)}
                    </ul>
                  )}
                </div>
              </div>
            )}
      </section>
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role="Director of Libraries" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={content}
    />
  );
};

export default DirectorDashboard;
