import styles from '../styles/Skeleton.module.sass';

const Skeleton = ({ nav, header, content }) => {
  return (
    <div className={`${styles['main-layout']} lpms-composition-scope`}>
      <div className={styles.left} data-layout-nav>
        {nav}
      </div>
      <div className={styles.right}>
        <div className={styles.up} data-layout-header>
          {header}
        </div>
        <div className={styles.down}>
          {content}
        </div>
      </div>
    </div>
  );
};

export default Skeleton;