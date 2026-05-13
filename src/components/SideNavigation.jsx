import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png';
import {FileText} from "react-feather";
import {useNavigate, useLocation} from "react-router-dom";
import {LogOut} from "react-feather";

const SideNavigation = () => {


    const navigate = useNavigate();
    const location = useLocation();

    let selected = 'Syllabus';

    if (location.pathname.startsWith('/assignedtos')) {
        selected = 'TOS';
    }
    else if (location.pathname.startsWith('/tos')) {
        selected = 'TOS';
    }

    const handlePageChange = (page) => {
        if (page === 'TOS') navigate('/assignedtos');
        else navigate('/');
    };

    return(
        <div className={styles.container}>
            <div className={styles.logo}>
                <img src={unclogo} alt=""/>
            </div>
            <div className={styles['nav-list']}>
                <div onClick={() => handlePageChange('Syllabus')} className={`${styles.list} ${selected === 'Syllabus' ? styles.selected: ''}`}>
                    <FileText size={24}/> Syllabus
                </div>
                <div onClick={() => handlePageChange('TOS')}  className={`${styles.list} ${selected === 'TOS' ? styles.selected: ''}`}>
                    <FileText size={24}/> TOS
                </div>



                <div className={styles.listB}>
                    <LogOut size={24} color={'#F94545'}/> Log Out
                </div>
            </div>
        </div>
    )
}

export default SideNavigation