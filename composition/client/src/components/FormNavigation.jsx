import { CheckCircle, ChevronLeft, ChevronRight } from "react-feather";
import React from "react";
import styles from "../styles/FormNavigation.module.sass";

const FormNavigation = ({ goBack, onSave, currentStep, setStep, steps }) => {
    // If steps is not provided, it falls back to the old UI layout
    if (!steps) {
        return (
            <div className={styles.navi}>
                <div onClick={goBack} className={styles.return} title="Return">
                    <ChevronLeft size={20} />
                </div>
                <div className={'fill'}></div>
                <div className={styles.save} onClick={onSave} style={{cursor: 'pointer'}}>
                    <CheckCircle size={20}/> &nbsp; Save
                </div>
            </div>
        )
    }

    return (
        <div className={styles.navi}>
            <div onClick={goBack} className={styles.return} title="Return to Section">
                <ChevronLeft size={20} />
            </div>
            
            <div className={styles.progressCenter}>
               <button 
                  disabled={currentStep === 0} 
                  onClick={() => setStep(currentStep - 1)}
                  className={styles.pNav}
               >
                   <ChevronLeft size={16} />
               </button>
               
               <div className={styles.progressTrack}>
                   {steps.map((step, idx) => (
                       <React.Fragment key={idx}>
                           <div 
                               className={`${styles.stepNode} ${idx === currentStep ? styles.activeNode : (idx < currentStep ? styles.completedNode : '')}`}
                               onClick={() => setStep(idx)}
                           >
                               {step}
                           </div>
                           {idx < steps.length - 1 && <div className={styles.stepConnector} />}
                       </React.Fragment>
                   ))}
               </div>
               
               <button 
                  disabled={currentStep === steps.length - 1} 
                  onClick={() => setStep(currentStep + 1)}
                  className={styles.pNav}
               >
                   <ChevronRight size={16} />
               </button>
            </div>

            <div className={styles.save} onClick={onSave} style={{cursor: 'pointer'}}>
                <CheckCircle size={20}/> &nbsp; Save
            </div>
        </div>
    )
}
export default FormNavigation;