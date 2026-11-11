import styles from '../styles/Header.module.sass';
import { useCurrentUser } from '../services/currentUser.jsx';
import { ROLE_DISPLAY } from '../services/roles.js';
import NotificationBell from './NotificationBell.jsx';

const Header = ({ department, name: propName, role: propRole }) => {
    const { user, activeRole } = useCurrentUser();

    const meta = (activeRole && ROLE_DISPLAY[activeRole]) || {};
    const displayName = user
        ? user.lastName && user.firstName
            ? `${user.lastName.toUpperCase()}, ${user.firstName.toUpperCase()}`
            : (user.name || user.email || 'USER').toUpperCase()
        : propName || 'NORTON, MONICA';

    const displayRole = activeRole ? meta.title || activeRole : propRole || 'Instructor';

    return (
        <div className={styles.header}>
            <div className={styles.department}>
                {department}
            </div>
            <div className={styles.userSection}>
                <div className={styles.info}>
                    <div className={styles.name}> {displayName} </div>
                    <div className={styles.role}> {displayRole} </div>
                </div>
                <NotificationBell />
            </div>
        </div>
    );
};

export default Header;
