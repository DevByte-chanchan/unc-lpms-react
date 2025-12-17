
import styles from '../styles/HeaderA.module.sass'

const HeaderA = ({department, name, role}) => {
    return (
        <div className={styles.header}>
            <div className={styles.department}>

            </div>
            <div className={styles.info}>
                <div className={styles.name}> {name} </div>
                <div className={styles.role}> {role} </div>
            </div>

        </div>
    )
}

export default HeaderA