import React, { useState, useMemo } from 'react'
import SkeletonA from '../layouts/SkeletonA.jsx'
import HeaderA from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import ApprovalCoursesTable from '../components/ApprovalCoursesTable.jsx'
import oicStyles from '../styles/OICOVPAA.module.scss'
import tableStyles from '../styles/CoursesTable.module.sass'
import { Package, Layers, Calendar } from 'react-feather'
import { getWorkflow } from '../utils/workflowHelpers'
import { syllabiData } from '../data/syllabiData.js'

const OICOVPAA = () => {
  const [tick, setTick] = useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(interval)
  }, [])

  const approvedCourses = useMemo(() => {
    return syllabiData.filter(s => getWorkflow(s.code).currentStage === 'approved')
  }, [tick])

  const stats = {
    total: approvedCourses.length,
    bySemester: { '1st': approvedCourses.length, '2nd': 0 }
  }

  return (
    <>
      <SkeletonA
        header={<HeaderA role="OIC-OVPAA" name="GARCIA, CARLOS" />}
        nav={<SideNavigation mode="oic-ovpaa" />}
        content={
          <div className={oicStyles.container}>
            <div className={oicStyles.statsGrid}>
              <div className={oicStyles.statCard}>
                <div className={`${oicStyles.statIconWrap} ${oicStyles.statIconBlue}`}>
                  <Package size={20} />
                </div>
                <div className={oicStyles.statContent}>
                  <div className={oicStyles.statValue}>{stats.total}</div>
                  <div className={oicStyles.statLabel}>Total Approved</div>
                </div>
              </div>
              <div className={oicStyles.statCard}>
                <div className={`${oicStyles.statIconWrap} ${oicStyles.statIconGreen}`}>
                  <Layers size={20} />
                </div>
                <div className={oicStyles.statContent}>
                  <div className={oicStyles.statValue}>{stats.bySemester['1st']}</div>
                  <div className={oicStyles.statLabel}>1st Semester</div>
                </div>
              </div>
              <div className={oicStyles.statCard}>
                <div className={`${oicStyles.statIconWrap} ${oicStyles.statIconTeal}`}>
                  <Calendar size={20} />
                </div>
                <div className={oicStyles.statContent}>
                  <div className={oicStyles.statValue}>{stats.bySemester['2nd']}</div>
                  <div className={oicStyles.statLabel}>2nd Semester</div>
                </div>
              </div>
            </div>

            <ApprovalCoursesTable role="oic-ovpaa" />
          </div>
        }
      />
    </>
  )
}

export default OICOVPAA
