import styles from '../styles/Skeleton.module.sass'

const Skeleton = ({ nav, header, content }) => {

    return(
        <div className={styles['main-layout']}>
            <div  className={styles.left}>
                {nav}
            </div>
            <div className={styles.right}>
                <div className={styles.up}>
                    {header}
                </div>
                <div className={styles.down}>
                    {content}
                </div>


            </div>
        </div>
    )
}

export default Skeleton;