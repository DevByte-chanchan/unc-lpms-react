import {Link} from "react-router-dom";
import {Check, CheckCircle, ChevronLeft} from "react-feather";
import React from "react";
import styles from "../styles/FormNavigation.module.sass";

const FormNavigation = ({ goBack, onSave }) => { // 1. Add onSave prop

    const goBackHandler = (e) => { goBack() }

    return (
        <div className={styles.navi}>
            <div onClick={goBackHandler} className={styles.return}>
                <ChevronLeft size={20} />
            </div>
            <div className={'fill'}></div>

            <div className={styles.save} onClick={onSave} style={{cursor: 'pointer'}}>
                <CheckCircle size={20}/> &nbsp; Save
            </div>
        </div>
    )
}

export default FormNavigation;