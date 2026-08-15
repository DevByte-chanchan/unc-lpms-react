import styles from '../styles/SkeletonA.module.sass'

const SkeletonA = ({ nav, header, content }) => {
    return(
        <div className={styles['main-layout']} data-layout-shell>
            <div className={styles.left} data-layout-nav>
                {nav}
            </div>
            <div className={styles.right}>
                <div className={styles.up}>
                    {header}
                </div>
                <div className={styles.down} data-layout-content>
                    {content}
                </div>
            </div>
        </div>
    )
}

export default SkeletonA;
