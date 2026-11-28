import React from 'react';
import CoreSkeleton from './shell/CoreSkeleton.jsx';
import CoreSideNavigation from './shell/CoreSideNavigation.jsx';
import CoreHeader from './shell/CoreHeader.jsx';

/**
 * ONE unified authentic light layout shell shared by all non-Instructor roles
 * (VPAA, Dean, Program Head, Director of Libraries, Industry Consultant).
 *
 * Pass `scope="course-assignment"` (adds `lpms-ca-scope`) or
 * `scope="submissions"` (adds `lpms-submissions-scope`) so each module's
 * zero-specificity base rules stay cleanly isolated.
 */
export default function CoreShell({
  department = '',
  scope = '',
  padded = false,
  title = '',
  subtitle = '',
  actions = null,
  children,
}) {
  const scopeClass =
    scope === 'course-assignment'
      ? 'lpms-ca-scope'
      : scope === 'submissions'
        ? 'lpms-submissions-scope'
        : '';

  const content = padded ? (
    <div style={{ padding: '20px 30px', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <div>
            {title && <h1 className="app-page-title">{title}</h1>}
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-muted)' }}>{subtitle}</p>
            )}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  ) : (
    children
  );

  return (
    <CoreSkeleton
      scopeClass={scopeClass}
      nav={<CoreSideNavigation />}
      header={<CoreHeader department={department} />}
      content={content}
    />
  );
}
