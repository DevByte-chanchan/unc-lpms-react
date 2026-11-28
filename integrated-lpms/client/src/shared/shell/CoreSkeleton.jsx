import { useCallback, useMemo, useState } from 'react';
import styles from './CoreSkeleton.module.sass';
import { NavContext } from './NavContext.js';
import { readCollapsed, writeCollapsed } from './navPreference.js';

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

const CoreSkeleton = ({ nav, header, content, scopeClass = '' }) => {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storage()));
  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      writeCollapsed(storage(), !previous);
      return !previous;
    });
  }, []);
  const value = useMemo(() => ({ collapsed, toggle, available: true }), [collapsed, toggle]);

  return (
    <NavContext.Provider value={value}>
      <div
        className={`${styles['main-layout']} lpms-core-scope ${scopeClass}`.trim()}
        data-layout-shell
      >
        <div
          className={styles.left}
          data-layout-nav
          data-nav-collapsed={collapsed ? 'true' : 'false'}
        >
          {nav}
        </div>
        <div className={styles.right}>
          <div className={styles.up} data-layout-header>
            {header}
          </div>
          <div className={styles.down} data-layout-content>
            {content}
          </div>
        </div>
      </div>
    </NavContext.Provider>
  );
};

export default CoreSkeleton;
