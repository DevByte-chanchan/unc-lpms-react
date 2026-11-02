import { useEffect, useState } from 'react';
import styles from '../styles/Header.module.sass';

const Header = ({department, name: propName, role: propRole}) => {
    const [user, setUser] = useState({ name: propName || 'NORTON, MONICA', role: propRole || 'Instructor' });

    useEffect(() => {
        try {
            const userData = localStorage.getItem('user');
            if(userData) {
                const parsed = JSON.parse(userData);
                setUser({ 
                    name: `${parsed.first_name || ''} ${parsed.last_name || ''}`.trim() || parsed.stakeholder_id,
                    role: parsed.role || propRole || 'Instructor' 
                });
            }
        } catch(e){
            console.error(e);
        }
    }, [propName, propRole]);

    return (
        <div className={styles.header}>
            <div className={styles.department}>
                {department}
            </div>
            <div className={styles.info}>
                <div className={styles.name}> {user.name} </div>
                <div className={styles.role}> {user.role} </div>
            </div>
        </div>
    )
}

export default Header;
