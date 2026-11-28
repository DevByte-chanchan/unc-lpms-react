import styles from '../styles/SideNavigation.module.sass';
import unclogo from '../assets/unclogo.png';
import { LayoutDashboard, NotebookPen, LogOut } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '../services/currentUser.jsx';
import ConfirmModal from './ConfirmModal.jsx';

const SideNavigation = ({ mode = 'instructor' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useCurrentUser();

  let selected = searchParams.get('page');

  if (!selected) {
    if (
      location.pathname === '/' ||
      location.pathname === '/dashboard' ||
      location.pathname.startsWith('/instructor/dashboard')
    ) {
      selected = 'Dashboard';
    } else if (
      location.pathname.startsWith('/instructor/assigned-courses') ||
      location.pathname.startsWith('/assigned-courses') ||
      location.pathname.startsWith('/courses')
    ) {
      selected = 'Learning Plans';
    } else {
      selected = mode === 'instructor' ? 'Dashboard' : 'Learning Plans';
    }
  } else if (selected === 'Syllabus') {
    selected = 'Learning Plans';
  }

  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const logoutRef = useRef(null);
  const navRef = useRef(null);
  const [pinned, setPinned] = useState(false);

  const handlePageChange = (page) => {
    if (page === 'Dashboard') {
      navigate('/instructor/dashboard');
    } else if (page === 'Learning Plans' || page === 'Syllabus') {
      navigate('/instructor/assigned-courses');
    } else {
      setSearchParams({ page });
    }
  };

  const onLogoutClick = () => setConfirmLogoutOpen(true);

  const handleConfirmLogout = async () => {
    setConfirmLogoutOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!navRef.current) return;
    let ro;
    try {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          setIsExpanded(w > 120);
        }
      });
      ro.observe(navRef.current);
    } catch {
      // ignore ResizeObserver errors
    }
    return () => {
      if (ro && navRef.current) ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const findSidebarAncestor = (node) => {
      let n = node.parentElement;
      while (n && n !== document.body) {
        try {
          const w = window.getComputedStyle(n).width;
          const num = parseFloat(w);
          if (!isNaN(num) && num <= 110) return n;
        } catch {
          // ignore
        }
        n = n.parentElement;
      }
      return null;
    };
    const target = findSidebarAncestor(el) || el.parentElement;
    const enter = () => {
      if (target && !pinned) {
        target.classList.add('expanded');
        target.classList.add('expanded-left');
      }
    };
    const leave = () => {
      if (target && !pinned) {
        target.classList.remove('expanded');
        target.classList.remove('expanded-left');
      }
    };
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
      if (target) {
        target.classList.remove('expanded');
        target.classList.remove('expanded-left');
      }
    };
  }, [pinned]);

  return (
    <div ref={navRef} className={styles.container}>
      <div className={styles.logo}>
        <img
          src={unclogo}
          alt="University Of Nueva Caceres Logo"
          onClick={() => {
            setPinned((p) => !p);
            const target = navRef.current ? navRef.current.parentElement : null;
            if (target) {
              target.classList.toggle('expanded');
              target.classList.toggle('expanded-left');
            }
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div className={styles.lpms}>
        {isExpanded ? (
          <>
            Learning Plan
            <br />
            Management System
          </>
        ) : (
          'LPMS'
        )}
      </div>

      <div className={styles['nav-list']}>
        <div
          onClick={() => handlePageChange('Dashboard')}
          className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'Dashboard' ? styles.selected : ''}`}
          title="Dashboard"
          aria-label="Dashboard"
        >
          <LayoutDashboard size={20} strokeWidth={2} className={styles.navIcon} />
          {isExpanded && <span className={styles.listText}>Dashboard</span>}
        </div>

        <div
          onClick={() => handlePageChange('Learning Plans')}
          className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${(selected === 'Learning Plans' || selected === 'Syllabus') ? styles.selected : ''}`}
          title="Learning Plans"
          aria-label="Learning Plans"
        >
          <NotebookPen size={20} strokeWidth={2} className={styles.navIcon} />
          {isExpanded && <span className={styles.listText}>Learning Plans</span>}
        </div>

        <div className={styles.logoutWrapper} ref={logoutRef}>
          <div
            className={`${styles.listB} ${!isExpanded ? styles.collapsed : ''}`}
            onClick={onLogoutClick}
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut size={20} strokeWidth={2} color={'#F94545'} />
            {isExpanded && <span className={styles.listText}>Log Out</span>}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmLogoutOpen}
        title="Sign out of LPMS?"
        message={`You are currently signed in as ${user?.name || user?.email || 'this account'}. Do you want to end your session?`}
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        danger={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </div>
  );
};

export default SideNavigation;