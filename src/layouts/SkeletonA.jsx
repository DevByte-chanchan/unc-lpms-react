import styles from '../styles/SkeletonA.module.sass'
import {useState} from "react";

const SkeletonA = ({ nav, header, content }) => {
    // const [formVisibility, setFormVisibility] = useState(false)
    //
    // const handleFormVisibilityChange = (event) => {
    //
    // }

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
                {/*{formVisibility === true &&*/}
                {/*    <div className={styles.popup}>*/}
                {/*        <div className={styles.form}>*/}
                {/*            {form}*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*}*/}

            </div>
        </div>
    )
}

export default SkeletonA;