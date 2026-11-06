import React from 'react'
import { useSearchParams } from 'react-router-dom'
import PoPeoAlignment from './PoPeoAlignment.jsx'
import CoPoAlignment from './CoPoAlignment.jsx'
import styles from '../../../styles/OutcomesAlignment.module.sass'
import pill from '../../../styles/CoursesTable.module.sass'

const TABS = [
  { key: 'program', label: 'PO and PEO' },
  { key: 'course', label: 'CO and PO' },
]

// One page for both alignments: the program's POs against its PEOs, and a course's COs against the POs.
// The tab is kept in the address (?tab=course), so links and the back button land on the right one.
const OutcomesAlignment = () => {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'course' ? 'course' : 'program'
  const header = (
    <div className={styles.head}>
      <h2 className="app-page-title">Outcomes Alignment</h2>
      {/* The same pill buttons as Pending / Returned / Approved on the course list. */}
      <div role="tablist" aria-label="Alignment" className={pill.pillTabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${pill.pillTab} ${tab === t.key ? pill.pillTabActive : ''}`}
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
