import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Book,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Clipboard,
  FileText,
  Folder,
  Layers,
  LayoutGrid,
  LogOut,
  PanelLeft,
  UserCheck,
  Users,
} from 'lucide-react';
import unclogo from '../../assets/unclogo.png';
import { useAuth } from '../AuthContext.jsx';
import { SIDEBAR_ITEMS } from '../navConfig.js';
import { useNav } from './NavContext.js';
import SignOutDialog from './SignOutDialog.jsx';
import styles from './CoreSideNavigation.module.sass';

const ICONS = {
  award: Award,
  book: Book,
  bookOpen: BookOpen,
  briefcase: Briefcase,
  building: Building2,
  calendar: Calendar,
  clipboard: Clipboard,
  fileText: FileText,
  folder: Folder,
  grid: LayoutGrid,
  layers: Layers,
  userCheck: UserCheck,
  users: Users,
};

const CoreSideNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRole, logout } = useAuth();
  const nav = useNav();

  const [showSignOut, setShowSignOut] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const navRef = useRef(null);

  const items = SIDEBAR_ITEMS[activeRole] || [];

  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return undefined;
    let ro;
    try {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setIsExpanded(entry.contentRect.width > 120);
        }
      });
      ro.observe(navElement);
    } catch {
      // ignore ResizeObserver errors
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, []);

  const activateWithKeyboard = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const confirmLogout = async () => {
    setShowSignOut(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const isSelected = (item) => {
    const paths = item.matchPaths || [item.path];
    return paths.some(
      (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
    );
  };

  return (
    <div ref={navRef} className={styles.container}>
      <div className={styles.logo}>
        <img src={unclogo} alt="University Of Nueva Caceres Logo" />
        {nav.available && (
          <button
            type="button"
            className={styles.navToggle}
            onClick={nav.toggle}
            aria-label={nav.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!nav.collapsed}
            title={nav.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className={styles.lpms}>
          Learning Plan
          <br />
          Management System
        </div>
      )}

      <div className={styles['nav-list']}>
        {items.map((item) => {
          const Icon = ICONS[item.icon] || FileText;
          const active = isSelected(item);
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`${styles.list} ${active ? styles.selected : ''}`}
              role="link"
              tabIndex={0}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onKeyDown={(event) => activateWithKeyboard(event, () => navigate(item.path))}
            >
              <Icon size={18} />
              <span className={styles.listText}>{item.label}</span>
            </div>
          );
        })}

        <div className={styles.logoutWrapper}>
          <div
            className={styles.listB}
            onClick={() => setShowSignOut(true)}
            role="button"
            tabIndex={0}
            title="Log Out"
            aria-label="Log Out"
            onKeyDown={(event) => activateWithKeyboard(event, () => setShowSignOut(true))}
          >
            <LogOut size={18} />
            <span className={styles.listText}>Log Out</span>
          </div>
        </div>

        <SignOutDialog
          open={showSignOut}
          onConfirm={confirmLogout}
          onCancel={() => setShowSignOut(false)}
        />
      </div>
    </div>
  );
};

export default CoreSideNavigation;
