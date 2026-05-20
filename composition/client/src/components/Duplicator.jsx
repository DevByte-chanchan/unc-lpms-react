import styles from '../styles/Duplicator.module.sass';
import {Plus} from "react-feather";
import {useState} from "react";

const Duplicator = ({name, onAdd}) => {

    return(
        <div className={styles.container}>
                <div onClick={onAdd} className={styles.duplicator}>
                    <Plus size={16} />
                    Add Another {name}
                </div>
        </div>
    )
}

export default Duplicator