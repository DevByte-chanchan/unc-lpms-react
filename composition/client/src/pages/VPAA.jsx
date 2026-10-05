import React from 'react'
import SkeletonA from '../layouts/SkeletonA.jsx'
import HeaderA from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import ApprovalCoursesTable from '../components/ApprovalCoursesTable.jsx'
import vpaaStyles from '../styles/VPAA.module.scss'

const VPAA = () => {
  return (
    <>
      <SkeletonA
        header={<HeaderA role="VPAA" />}
        nav={<SideNavigation mode="vpaa" />}
        content={
          <div className={vpaaStyles.container}>
            <ApprovalCoursesTable
              role="vpaa"
              styleHooks={{
                root: vpaaStyles.courseList,
                header: vpaaStyles.courseHeader,
                filters: vpaaStyles.courseFilters,
              }}
            />
          </div>
        }
      />
    </>
  )
}

export default VPAA
