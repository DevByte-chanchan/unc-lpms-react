import React from 'react'
import Skeleton from "../layouts/Skeleton.jsx"
import Header from "../components/Header.jsx"
import SideNavigation from "../components/SideNavigation.jsx"
import SyllabusRevisionsSections from "../components/SyllabusRevisionsSections.jsx"

const SyllabusRevisions = () => {
  return (
    <Skeleton
      header={<Header role="Instructor" name="NORTON, MONICA" />}
      content={<SyllabusRevisionsSections />}
      nav={<SideNavigation />}
    />
  )
}

export default SyllabusRevisions
