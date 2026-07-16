import styles from '../styles/HeaderA.module.sass'

const LpmsHeader = ({ role, name }) => {
    return (
        <div className={styles.header}>
            <div className={styles.department}></div>
            <div className={styles.info}>
                <div className={styles.name}>{name || 'User'}</div>
                <div className={styles.role}>{role}</div>
            </div>
        </div>
    )
}

export default LpmsHeader
