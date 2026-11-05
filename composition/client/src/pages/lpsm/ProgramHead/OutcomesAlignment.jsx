import React from 'react'
import { useSearchParams } from 'react-router-dom'
import PoPeoAlignment from './PoPeoAlignment.jsx'
import CoPoAlignment from './CoPoAlignment.jsx'
import styles from '../../../styles/OutcomesAlignment.module.sass'

const TABS = [
  { key: 'program', label: 'Program · PO and PEO' },
  { key: 'course', label: 'Course · CO and PO' },
]

// One page for both alignments: the program's POs against its PEOs, and a course's COs against the POs.
// The tab is kept in the address (?tab=course), so links and the back button land on the right one.
const OutcomesAlignment = () => {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'course' ? 'course' : 'program'
  const header = (
    <div className={styles.head}>
      <h2 className="app-page-title">Outcomes Alignment</h2>
      <div role="tablist" aria-label="Alignment" className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setParams(t.key === 'program' ? {} : { tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
  return tab === 'course' ? <CoPoAlignment tabs={header} /> : <PoPeoAlignment tabs={header} />
}

export default OutcomesAlignment
