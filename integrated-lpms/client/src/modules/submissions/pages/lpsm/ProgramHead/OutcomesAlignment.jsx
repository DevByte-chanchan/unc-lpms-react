import React from 'react'
import { useSearchParams } from 'react-router-dom'
import PoPeoAlignment from './PoPeoAlignment.jsx'
import CoPoAlignment from './CoPoAlignment.jsx'
import COAEPView from './COAEPView.jsx'
import styles from '../../../styles/OutcomesAlignment.module.sass'
import pill from '../../../styles/CoursesTable.module.sass'

const TABS = [
  { key: 'front', label: 'Front pages' },
  { key: 'program', label: 'PO and PEO' },
  { key: 'course', label: 'CO and PO' },
  { key: 'coaep', label: 'COAEP' },
]

// Program Documents: every paper the Program Head keeps in one place. Per program: the uploaded first three syllabus
// pages and the PO / PEO alignment. Per course: the CO / PO alignment and the COAEP, each generated from the plan or
// replaced by the Program Head's own upload. The tab is kept in the address (?tab=coaep), so links and the back
// button land on the right one.
const ProgramDocuments = () => {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'front'
  const header = (
    <div className={styles.head}>
      <h2 className="app-page-title">Program Documents</h2>
      {/* The same grey toggle as Draft / Pending / Returned / Approved on the course list. */}
      <div className={pill['filter-container']}>
      <div role="tablist" aria-label="Program documents" className={pill['segmented-control']}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${pill['control-item']} ${tab === t.key ? pill.active : ''}`}
            onClick={() => setParams(t.key === 'front' ? {} : { tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>
      </div>
    </div>
  )
  if (tab === 'course') return <CoPoAlignment tabs={header} />
  if (tab === 'coaep') return <COAEPView tabs={header} />
  return <PoPeoAlignment tabs={header} view={tab === 'front' ? 'front' : 'outcomes'} />
}

export default ProgramDocuments
